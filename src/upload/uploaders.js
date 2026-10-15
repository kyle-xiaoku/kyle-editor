/**
 * 上传链路（两条，互相独立）
 * - SimpleUploader 普通上传：整个文件一次请求，不切片
 * - ChunkUploader  分片上传：切片 + 并发 + 重试，适配器响应里出现非空 url 即代表该文件上传成功
 * 对外接口一致：upload(file, { signal, onProgress, onChunk }) => { url, chunks, size, name, ... }
 * 与具体服务端解耦：普通上传只要 adapter.upload()，分片上传只要 adapter.put()（init? / complete? 可选）
 */
import { createFingerprint } from './fingerprint.js'

export const MB = 1024 * 1024

/**
 * 普通上传：文件整包发出，一次请求完成
 * adapter.upload(file, { signal, onProgress }) => string | { url, key? }
 */
export class SimpleUploader {
  constructor(adapter, options = {}) {
    if (!adapter || typeof adapter.upload !== 'function') {
      throw new Error('[KEditor] 普通上传的 uploader 需要提供 upload() 方法（或直接给一个接口地址 / 上传函数），参见 docs/upload-adapter.md')
    }
    this.adapter = adapter
    this.mode = 'normal'
    this.options = options
  }

  /**
   * @param {File|Blob} file
   * @param {{onProgress?,signal?}} handlers
   * @returns {Promise<{url:string, chunks:number, size:number, name:string, mode:string}>}
   */
  async upload(file, handlers = {}) {
    const { onProgress, signal } = handlers
    const startedAt = Date.now()
    const report = (ratio, loaded) => {
      const elapsed = (Date.now() - startedAt) / 1000
      onProgress?.(ratio, {
        percent: Math.round(ratio * 100),
        loaded,
        total: file.size,
        chunks: 1,
        uploadedChunks: ratio >= 1 ? 1 : 0,
        speed: elapsed > 0 ? loaded / elapsed : 0,
        mode: 'normal',
      })
    }
    report(0, 0)
    // 一次请求发完整包：进度只在「开始 / 结束」两处上报（需要精细进度请改用分片上传）
    const result = await this.adapter.upload(file, {
      signal,
      onProgress: (loaded, total) => report(total ? Math.min(1, loaded / total) : 0, loaded),
    })
    const url = typeof result === 'string' ? result : result?.url
    if (!url) throw new Error('[KEditor] 普通上传接口未返回 url：期望响应形如 { "url": "https://…" }')
    report(1, file.size)
    return {
      url,
      chunks: 1,
      mode: 'normal',
      size: file.size,
      name: file.name,
      key: typeof result === 'object' ? result.key : undefined,
      raw: result,
    }
  }

  destroy() {
    this.adapter.destroy?.()
  }
}

/**
 * 分片上传调度器
 * 职责：切片 → 并发上传 → 失败重试 → 进度回调
 * 适配器实现 put() 即可；另可选的 init() 用于秒传 / 断点续传，complete() 用于收尾拿地址
 */
export class ChunkUploader {
  constructor(adapter, options = {}) {
    if (!adapter || (typeof adapter.put !== 'function' && typeof adapter.upload !== 'function')) {
      throw new Error('[KEditor] 分片上传的 uploader 需要提供 put() 方法，参见 docs/upload-adapter.md')
    }
    this.adapter = adapter
    // 只有 upload()（不实现切片）的适配器自动退化为普通上传
    this.simple = typeof adapter.put === 'function' ? null : new SimpleUploader(adapter, options)
    this.mode = 'chunk'
    this.chunkSize = Math.max(64 * 1024, options.chunkSize || MB)
    this.concurrency = Math.max(1, options.concurrency || 3)
    this.retries = options.retries === undefined ? 2 : Math.max(0, options.retries)
    this.retryDelay = options.retryDelay ?? 600
    this.fingerprint = createFingerprint(options.fingerprint || 'fast')
    this.slice = options.slice
    // 默认：适配器声明「响应带 url 即为成功」时，拿到 url 就收工，不再等 complete
    this.completeOnUrl = options.completeOnUrl === undefined ? Boolean(adapter.completeOnUrl) : Boolean(options.completeOnUrl)
  }

  /**
   * @param {File|Blob} file
   * @param {{onProgress?,onChunk?,onInfo?,signal?}} handlers
   * @returns {Promise<{url:string, instant?:boolean, chunks:number, size:number, name:string, mode:string}>}
   */
  async upload(file, handlers = {}) {
    if (this.simple) return this.simple.upload(file, handlers)
    const { onProgress, onChunk, signal } = handlers
    const total = Math.max(1, Math.ceil(file.size / this.chunkSize))
    const meta = {
      name: file.name || 'blob',
      size: file.size,
      type: file.type || guessType(file.name),
      lastModified: file.lastModified || 0,
      fingerprint: await this.fingerprint(file),
      chunkSize: this.chunkSize,
      totalChunks: total,
    }

    // 1. 初始化：服务端可返回 uploadId / 已传分片（断点续传）/ 秒传 url
    const init = (await this.adapter.init?.(meta, { signal })) || {}
    if (init.url) {
      onProgress?.(1, { percent: 100, loaded: file.size, total: file.size, chunks: total, instant: true, mode: 'chunk' })
      return { url: init.url, instant: true, chunks: 0, mode: 'chunk', size: file.size, name: meta.name, key: init.key }
    }
    const uploadId = init.uploadId || meta.fingerprint
    const uploaded = new Set((init.uploadedChunks || init.uploaded || []).map(Number))

    // 2. 并发上传未完成的分片
    let loadedBytes = 0
    for (const index of uploaded) loadedBytes += Math.min(this.chunkSize, file.size - index * this.chunkSize)
    const queue = []
    for (let i = 0; i < total; i += 1) if (!uploaded.has(i)) queue.push(i)

    const chunkResults = new Array(total)
    let doneChunks = uploaded.size
    let finishedUrl = '' // 任一响应带回非空 url 即为上传成功
    const startedAt = Date.now()
    const report = () => {
      const elapsed = (Date.now() - startedAt) / 1000
      onProgress?.(file.size ? loadedBytes / file.size : 1, {
        percent: Math.min(100, Math.round((loadedBytes / Math.max(1, file.size)) * 100)),
        loaded: loadedBytes,
        total: file.size,
        chunks: total,
        uploadedChunks: doneChunks,
        speed: elapsed > 0 ? loadedBytes / elapsed : 0,
        mode: 'chunk',
      })
    }
    report()

    let cursor = 0
    const worker = async () => {
      while (cursor < queue.length && !finishedUrl) {
        if (signal?.aborted) throw new DOMException('已取消上传', 'AbortError')
        const index = queue[cursor++]
        const blob = this.slice ? this.slice(file, index, this.chunkSize) : file.slice(index * this.chunkSize, (index + 1) * this.chunkSize)
        let attempt = 0
        for (;;) {
          try {
            const res = await this.adapter.put({
              uploadId,
              index,
              total,
              chunkSize: this.chunkSize,
              blob,
              file,
              meta,
              signal,
              size: blob.size,
            })
            if (res?.url) chunkResults[index] = res
            if (res?.url && this.completeOnUrl) {
              finishedUrl = res.url
              doneChunks = total
              loadedBytes = file.size
              report()
              break
            }
            loadedBytes += blob.size
            doneChunks += 1
            onChunk?.({ index, total, size: blob.size })
            report()
            break
          } catch (error) {
            if (error?.name === 'AbortError') throw error
            attempt += 1
            if (attempt > this.retries) {
              throw new Error(`分片 ${index + 1}/${total} 上传失败：${error?.message || error}`)
            }
            await sleep(this.retryDelay * attempt, signal)
          }
        }
      }
    }

    const workers = Array.from({ length: Math.max(1, Math.min(this.concurrency, queue.length)) }, worker)
    const settled = await Promise.allSettled(workers)
    // 已经拿到 url 就属于成功，忽略其余在途分片的报错
    const failure = finishedUrl ? null : settled.find((item) => item.status === 'rejected')
    if (failure) {
      await this.adapter.abort?.({ uploadId, meta, error: failure.reason }).catch(() => {})
      throw failure.reason
    }

    // 3. url 已在分片响应里拿到就直接用，否则问适配器要收尾结果
    const done = finishedUrl ? { url: finishedUrl } : (await this.adapter.complete?.({ uploadId, meta, total, uploaded: doneChunks, chunkResults, file })) || {}
    const url = done.url
    if (!url) {
      throw new Error(
        this.completeOnUrl
          ? '[KEditor] 上传结束但接口未返回 url：分片上传要求接口在处理分片时返回 { "url": "…" }'
          : '[KEditor] uploader.complete() 未返回 url',
      )
    }
    return { url, chunks: total, mode: 'chunk', size: file.size, name: meta.name, key: done.key, poster: done.poster, duration: done.duration, raw: done }
  }

  destroy() {
    this.simple?.destroy()
    this.adapter.destroy?.()
  }
}

const sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(new DOMException('已取消上传', 'AbortError'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })

/** 供 adapter 内部使用的进度上报辅助 */
export function reportProgress(handler, loaded, total) {
  handler?.(total ? loaded / total : 1, { loaded, total })
}

export function guessType(name = '') {
  const ext = String(name).split('.').pop()?.toLowerCase()
  const map = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', m4v: 'video/x-m4v' }
  return map[ext] || 'application/octet-stream'
}

/**
 * 把「一个文件一次请求」的上传函数包装成普通上传适配器（不切片，直传）
 * fn(file, {signal, onProgress}) => Promise<string | {url}>
 */
export function simpleAdapter(fn) {
  return {
    simple: true,
    async upload(file, ctx = {}) {
      const res = await fn(toFile(file), ctx)
      return typeof res === 'string' ? { url: res } : res
    },
  }
}

function toFile(blob, name = 'blob', type = blob.type) {
  if (blob instanceof File) return blob
  return new File([blob], name, { type })
}
