/**
 * 分片上传调度器
 * 职责：切片 → 并发上传 → 失败重试 → 进度回调 → 合并通知
 * 与具体服务端解耦，只需实现 adapter 的三个方法
 */
import { createFingerprint } from './fingerprint.js'

export const MB = 1024 * 1024

export class ChunkUploader {
  constructor(adapter, options = {}) {
    if (!adapter || typeof adapter.put !== 'function') {
      throw new Error('[KEditor] uploader 需要提供 put() 方法，参见 docs/upload-adapter.md')
    }
    this.adapter = adapter
    this.chunkSize = Math.max(64 * 1024, options.chunkSize || MB)
    this.concurrency = Math.max(1, options.concurrency || 3)
    this.retries = options.retries === undefined ? 2 : Math.max(0, options.retries)
    this.retryDelay = options.retryDelay ?? 600
    this.fingerprint = createFingerprint(options.fingerprint || 'fast')
    this.slice = options.slice
  }

  /**
   * @param {File|Blob} file
   * @param {{onProgress?,onChunk?,onInfo?,signal?}} handlers
   * @returns {Promise<{url:string, instant?:boolean, chunks:number, size:number, name:string}>}
   */
  async upload(file, handlers = {}) {
    const { onProgress, onChunk, signal } = handlers
    if (this.adapter.simple) return this.uploadSimple(file, handlers)
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
      onProgress?.(1, { percent: 100, loaded: file.size, total: file.size, chunks: total, instant: true })
      return { url: init.url, instant: true, chunks: 0, size: file.size, name: meta.name, key: init.key }
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
      })
    }
    report()

    let cursor = 0
    let firstError = null
    const worker = async () => {
      while (cursor < queue.length) {
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
            loadedBytes += blob.size
            doneChunks += 1
            onChunk?.({ index, total, size: blob.size })
            report()
            break
          } catch (error) {
            if (error?.name === 'AbortError') throw error
            attempt += 1
            if (attempt > this.retries) {
              firstError = error
              throw new Error(`分片 ${index + 1}/${total} 上传失败：${error?.message || error}`)
            }
            await sleep(this.retryDelay * attempt, signal)
          }
        }
      }
    }

    const workers = Array.from({ length: Math.max(1, Math.min(this.concurrency, queue.length)) }, worker)
    try {
      await Promise.all(workers)
    } catch (error) {
      await this.adapter.abort?.({ uploadId, meta, error }).catch(() => {})
      throw error
    }
    if (firstError) throw firstError

    // 3. 通知服务端合并（或本地生成可访问地址）
    const done = (await this.adapter.complete?.({ uploadId, meta, total, uploaded: doneChunks, chunkResults, file })) || {}
    const url = done.url
    if (!url) throw new Error('[KEditor] uploader.complete() 未返回 url')
    return { url, chunks: total, size: file.size, name: meta.name, key: done.key, poster: done.poster, duration: done.duration, raw: done }
  }

  /** 单请求直传（不切片），供对接已有单次上传接口时使用 */
  async uploadSimple(file, handlers = {}) {
    const { onProgress, signal } = handlers
    const startedAt = Date.now()
    const result = await this.adapter.upload(file, {
      signal,
      onProgress: (loaded, total) => {
        const ratio = total ? loaded / total : 0
        const elapsed = (Date.now() - startedAt) / 1000
        onProgress?.(ratio, { percent: Math.round(ratio * 100), loaded, total: total || file.size, chunks: 1, uploadedChunks: ratio >= 1 ? 1 : 0, speed: elapsed > 0 ? loaded / elapsed : 0 })
      },
    })
    const url = typeof result === 'string' ? result : result?.url
    if (!url) throw new Error('[KEditor] uploader.upload() 未返回 url')
    return { url, chunks: 1, size: file.size, name: file.name, key: typeof result === 'object' ? result.key : undefined, raw: result }
  }

  destroy() {
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

function guessType(name = '') {
  const ext = String(name).split('.').pop()?.toLowerCase()
  const map = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', m4v: 'video/x-m4v' }
  return map[ext] || 'application/octet-stream'
}

/**
 * 把「一个文件一次请求」的上传函数包装成 adapter（不切片，直传）
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
