/**
 * 上传适配器集合
 * - mockAdapter：零后端，浏览器内模拟传输，产出 blob: 预览地址（开发/演示默认）
 *     同时实现 put()（分片链路）与 upload()（普通上传链路）
 * - httpAdapter：真实后端适配器，只认一个地址，两种链路共用
 *     · 普通上传：upload() 整个文件一次请求，响应里 url 非空即成功
 *     · 分片上传：put() 分片并发，响应里 url 非空即代表整份文件上传成功（服务端收齐分片后返回）
 * - simpleAdapter：把「一个文件一次请求」的函数包装成普通上传适配器
 * 自定义 adapter 实现 upload()（普通）或 put()（分片）即可，见 docs/upload-adapter.md
 */
import { ChunkUploader, SimpleUploader, simpleAdapter } from './uploaders.js'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const jitter = (base, ratio = 0.4) => base * (1 - ratio + Math.random() * ratio * 2)

/** 默认演示用：不请求任何服务，把文件“传完”后生成 objectURL */
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

  const urlFor = (file, meta) => {
    let url = objectUrls.get(meta.fingerprint)
    if (!url || !reuseObjectUrl) {
      // 生成与业务无关的本地地址，编辑器直接可预览
      const blob = file instanceof File ? file : new File([file], meta.name, { type: meta.type })
      url = URL.createObjectURL(blob)
      objectUrls.set(meta.fingerprint, url)
    }
    return url
  }
  const remember = (meta, url) => finished.set(meta.fingerprint, { url, name: meta.name, size: meta.size, type: meta.type })

  return {
    name: 'mock',
    /* ---------------- 分片上传链路 ---------------- */
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
      const url = urlFor(file, meta)
      remember(meta, url)
      sessions.delete(uploadId)
      emit('complete', { name: meta.name, url, chunks: meta.totalChunks, size: meta.size })
      return { url, key: meta.fingerprint }
    },
    /* ---------------- 普通上传链路 ---------------- */
    async upload(file, ctx = {}) {
      const meta = {
        name: file.name || 'blob',
        size: file.size,
        type: file.type || 'application/octet-stream',
        // 不做哈希：演示用「文件名 + 大小 + 修改时间」即可识别同一份文件
        fingerprint: `${file.name || 'blob'}|${file.size}|${file.lastModified || 0}`,
      }
      const hit = finished.get(meta.fingerprint)
      if (hit) {
        ctx.onProgress?.(file.size, file.size)
        emit('instant', { name: meta.name, url: hit.url })
        return { url: hit.url, key: meta.fingerprint, instant: true }
      }
      const cost = Math.max(140, jitter(latency * 2 + file.size / (speed * 1024 / 8) / 6, 0.3))
      const steps = 6
      for (let i = 1; i <= steps; i += 1) {
        await sleep(cost / steps)
        ctx.onProgress?.(Math.round((file.size * i) / steps), file.size)
      }
      const url = urlFor(file, meta)
      remember(meta, url)
      emit('upload', { name: meta.name, url, size: meta.size })
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

/** 从接口响应里取上传成功地址：只要拿到非空 url 就认为成功 */
function pickUrlOf(payload) {
  if (!payload || typeof payload !== 'object') return ''
  const value = payload.url || payload.fileUrl || payload.src
  return typeof value === 'string' ? value.trim() : ''
}

/** 已移除的三接口模式字段：配到就报错，避免旧配置静默失效 */
const LEGACY_FIELDS = ['initUrl', 'chunkUrl', 'completeUrl', 'abortUrl']

/**
 * 真实后端适配器：只配一个接口地址
 *
 * httpAdapter({ url: '/api/upload' })
 *   普通上传（SimpleUploader 调用 upload()）→ 整个文件一次请求
 *   分片上传（ChunkUploader 调用 put()）    → 每个分片一次请求，响应带 url 即整份成功
 *
 * 可配：mode('formdata'|'raw')、method、headers、withCredentials、fieldName、
 *       parse（解开外层包装）、pickUrl（自定义取 url 规则）、chunkUrlFor（动态分片地址）
 */
export function httpAdapter(config = {}) {
  const { url, fieldName = 'file', headers = {}, withCredentials = false, parse = (json) => json?.data || json || {}, pickUrl = pickUrlOf, chunkUrlFor } = config
  const legacy = LEGACY_FIELDS.filter((key) => config[key])
  if (legacy.length) {
    throw new Error(
      `[KEditor] 分片上传已改为「单接口」模式：请删除 httpAdapter 的 ${legacy.join(' / ')}，只保留 url。` +
        '服务端在处理分片时返回 { "url": "…" } 即代表上传成功。',
    )
  }
  if (!url) throw new Error('[KEditor] httpAdapter 缺少接口地址：httpAdapter({ url: "/api/upload" })')
  const mode = config.mode || 'formdata'
  const httpMethod = config.method || (mode === 'formdata' ? 'POST' : 'PUT')
  // 响应里的 url 提取出来交给调度器判断成功
  const withUrl = (payload) => {
    const found = (typeof pickUrl === 'function' ? pickUrl(payload) : '') || ''
    return found ? { ...(payload && typeof payload === 'object' ? payload : {}), url: found } : payload || {}
  }
  const headerOf = () => (typeof headers === 'function' ? headers() || {} : headers || {})

  const request = async (target, init = {}) => {
    const res = await fetch(target, { credentials: withCredentials ? 'include' : 'same-origin', ...init })
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
    const text = await res.text()
    if (!text) return {}
    try {
      return parse(JSON.parse(text))
    } catch {
      throw new Error(`服务端返回非 JSON 数据：${text.slice(0, 80)}`)
    }
  }

  const withQuery = (target, pairs) => `${target}${target.includes('?') ? '&' : '?'}${pairs.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`

  /** 普通上传发整文件，分片上传发单个分片，字段命名保持一致 */
  const send = async ({ target, body, name, index, total, meta, signal }) => {
    if (mode === 'formdata') {
      const form = new FormData()
      form.append(fieldName, body, index === undefined ? name : `${name}.part${index}`)
      form.append('filename', name)
      form.append('fileSize', String(meta.size))
      if (meta.identifier) form.append('identifier', meta.identifier)
      if (index !== undefined) {
        form.append('index', String(index))
        form.append('total', String(total))
        form.append('chunkSize', String(meta.chunkSize))
      }
      return withUrl(await request(target, { method: httpMethod, body: form, signal, headers: headerOf() }))
    }
    // 裸 body：服务端按 identifier + index 落盘
    const query = index === undefined ? [['filename', name], ['fileSize', meta.size]] : [['identifier', meta.identifier], ['index', index], ['total', total], ['filename', name]]
    const headersOut = index === undefined ? { 'Content-Type': 'application/octet-stream' } : { 'Content-Type': 'application/octet-stream', 'X-Chunk-Index': String(index) }
    return withUrl(await request(withQuery(target, query), { method: httpMethod, body, signal, headers: { ...headersOut, ...headerOf() } }))
  }

  return {
    name: 'http',
    /** 响应带非空 url 即代表上传成功（分片链路据此提前收工） */
    completeOnUrl: true,
    url,
    /** 普通上传：整个文件一次请求 */
    async upload(file, ctx = {}) {
      return send({ target: url, body: file, name: file.name || 'file', meta: { size: file.size, identifier: '' }, signal: ctx.signal })
    },
    /** 分片上传：一个分片一次请求 */
    async put({ index, total, blob, meta, signal }) {
      const target = typeof chunkUrlFor === 'function' ? chunkUrlFor({ index, total }) : url
      return send({ target, body: blob, name: meta.name, index, total, meta: { size: meta.size, chunkSize: meta.chunkSize, identifier: meta.fingerprint }, signal })
    },
  }
}

export { ChunkUploader, SimpleUploader, simpleAdapter }
