/**
 * 上传适配器集合
 * - mockAdapter：零后端，浏览器内模拟分片传输，产出 blob: 预览地址（开发/演示默认）
 * - httpAdapter：标准分片接口参考实现（init / chunk / complete / abort），对接真实后端只需给 URL
 * - simpleAdapter：单次直传接口包装
 * 自定义 adapter 只要实现 init?/put/complete? 三个方法即可，见 docs/upload-adapter.md
 */
import { ChunkUploader, simpleAdapter } from './chunk-uploader.js'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const jitter = (base, ratio = 0.4) => base * (1 - ratio + Math.random() * ratio * 2)

/** 默认演示用：不请求任何服务，把文件切片“传完”后生成 objectURL */
export function mockAdapter(options = {}) {
  const {
    latency = 160, // 每个分片的固定网络往返（ms）
    speed = 12, // 模拟带宽 MB/s
    onEvent = null, // (type, payload) => void，演示面板可打印日志
    reuseObjectUrl = true,
    failFirstChunk = false, // 打开后可直观看到自动重试效果
  } = options
  /** fingerprint -> { url, name, size, type } */
  const finished = new Map()
  /** uploadId -> Set<index> */
  const sessions = new Map()
  const objectUrls = new Map()
  let failOnce = failFirstChunk

  const emit = (type, payload) => onEvent?.(type, { ...payload, at: Date.now() })

  return {
    name: 'mock',
    async init(meta) {
      emit('init', meta)
      await sleep(120)
      const hit = finished.get(meta.fingerprint)
      if (hit) {
        emit('instant', { name: meta.name, url: hit.url })
        return { url: hit.url, key: meta.fingerprint, instant: true }
      }
      const session = sessions.get(meta.fingerprint) || new Set()
      sessions.set(meta.fingerprint, session)
      return { uploadId: meta.fingerprint, uploadedChunks: [...session] }
    },
    async put({ uploadId, index, total, size, blob }) {
      if (failOnce && index === 0) {
        failOnce = false
        emit('chunk-error', { index, total, message: 'mock: 模拟首个分片网络异常' })
        const error = new Error('mock: 模拟首个分片网络异常')
        error.retryable = true
        throw error
      }
      const cost = Math.max(40, jitter(latency + (size / (speed * 1024 / 8) / 8), 0.35))
      await sleep(cost)
      const session = sessions.get(uploadId) || new Set()
      session.add(index)
      sessions.set(uploadId, session)
      emit('chunk', { index, total, size, blobSize: blob?.size })
      return { etag: `${uploadId}-${index}` }
    },
    async complete({ uploadId, meta, file }) {
      await sleep(140)
      let url = objectUrls.get(meta.fingerprint)
      if (!url || !reuseObjectUrl) {
        // 生成与业务无关的本地地址，编辑器直接可预览
        const blob = file instanceof File ? file : new File([file], meta.name, { type: meta.type })
        url = URL.createObjectURL(blob)
        objectUrls.set(meta.fingerprint, url)
      }
      finished.set(meta.fingerprint, { url, name: meta.name, size: meta.size, type: meta.type })
      sessions.delete(uploadId)
      emit('complete', { name: meta.name, url, chunks: meta.totalChunks, size: meta.size })
      return { url, key: meta.fingerprint }
    },
    async abort({ uploadId }) {
      emit('abort', { uploadId })
    },
    /** 已完成的上传记录（演示用） */
    list: () => [...finished.entries()].map(([key, value]) => ({ key, ...value })),
    reset: () => {
      finished.clear()
      sessions.clear()
    },
  }
}

/**
 * 真实后端参考实现
 * config = {
 *   initUrl, chunkUrl, completeUrl, abortUrl,
 *   mode: 'raw' | 'formdata',        // 分片是裸 body 还是 multipart
 *   headers: () => ({}) | object,    // 鉴权
 *   withCredentials, fieldName, parse: (json) => ({url, ...})
 * }
 */
export function httpAdapter(config = {}) {
  const {
    initUrl,
    chunkUrl,
    completeUrl,
    abortUrl,
    mode = 'raw',
    fieldName = 'file',
    headers = {},
    withCredentials = false,
    parse = (json) => json?.data || json || {},
    chunkUrlFor,
  } = config

  const headerOf = () => (typeof headers === 'function' ? headers() || {} : headers || {})
  const request = async (url, init = {}) => {
    const res = await fetch(url, { credentials: withCredentials ? 'include' : 'same-origin', ...init })
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
    const text = await res.text()
    if (!text) return {}
    try {
      return parse(JSON.parse(text))
    } catch {
      throw new Error(`服务端返回非 JSON 数据：${text.slice(0, 80)}`)
    }
  }

  return {
    name: 'http',
    async init(meta, { signal }) {
      if (!initUrl) throw new Error('[KEditor] httpAdapter 缺少 initUrl')
      return request(
        initUrl,
        {
          method: 'POST',
          signal,
          headers: { 'Content-Type': 'application/json', ...headerOf() },
          body: JSON.stringify({
            fileName: meta.name,
            fileSize: meta.size,
            fileType: meta.type,
            lastModified: meta.lastModified,
            identifier: meta.fingerprint,
            chunkSize: meta.chunkSize,
            totalChunks: meta.totalChunks,
          }),
        },
      )
    },
    async put({ uploadId, index, total, blob, meta, signal }) {
      if (!chunkUrl) throw new Error('[KEditor] httpAdapter 缺少 chunkUrl')
      const url = typeof chunkUrlFor === 'function' ? chunkUrlFor({ uploadId, index }) : chunkUrl
      if (mode === 'formdata') {
        const form = new FormData()
        form.append(fieldName, blob, `${meta.name}.part${index}`)
        form.append('uploadId', uploadId)
        form.append('identifier', meta.fingerprint)
        form.append('index', String(index))
        form.append('total', String(total))
        form.append('filename', meta.name)
        return request(url, { method: 'POST', body: form, signal, headers: headerOf() })
      }
      // 裸 body：服务端按 uploadId + index 落盘
      const joiner = url.includes('?') ? '&' : '?'
      const target = `${url}${joiner}uploadId=${encodeURIComponent(uploadId)}&index=${index}&total=${total}&filename=${encodeURIComponent(meta.name)}`
      return request(target, {
        method: 'PUT',
        body: blob,
        signal,
        headers: { 'Content-Type': 'application/octet-stream', 'X-Chunk-Index': String(index), ...headerOf() },
      })
    },
    async complete({ uploadId, meta, total }) {
      if (!completeUrl) throw new Error('[KEditor] httpAdapter 缺少 completeUrl')
      return request(
        completeUrl,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headerOf() },
          body: JSON.stringify({ uploadId, identifier: meta.fingerprint, fileName: meta.name, fileSize: meta.size, fileType: meta.type, chunkSize: meta.chunkSize, totalChunks: total }),
        },
      )
    },
    async abort({ uploadId }) {
      if (!abortUrl) return
      await request(abortUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headerOf() }, body: JSON.stringify({ uploadId }) }).catch(() => {})
    },
  }
}

/**
 * 归一化用户传入的 uploader 配置，返回 ChunkUploader 实例
 * 支持：undefined('mock') | 'mock' | {type:'mock'|'http', ...} | adapter 对象 | (file)=>url 函数 | ChunkUploader
 */
export function createUploader(option = 'mock', config = {}) {
  if (option instanceof ChunkUploader) return option
  if (typeof option === 'function' && !option.put) return new ChunkUploader(simpleAdapter(option), config)
  if (option && typeof option === 'object' && !(option instanceof ChunkUploader)) {
    if (typeof option.put === 'function' || typeof option.upload === 'function') return new ChunkUploader(option, { ...config, ...pick(option) })
    if (option.type === 'http') return new ChunkUploader(httpAdapter(option), { ...config, ...pick(option) })
  }
  return new ChunkUploader(mockAdapter(typeof option === 'object' ? option : {}), config)
}

const pick = (obj) => {
  const out = {}
  for (const key of ['chunkSize', 'concurrency', 'retries', 'fingerprint']) if (obj[key] !== undefined) out[key] = obj[key]
  return out
}

export { ChunkUploader, simpleAdapter }
