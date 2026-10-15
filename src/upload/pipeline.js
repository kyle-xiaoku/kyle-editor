/**
 * 上传入口装配
 * - uploader       普通上传：整个文件一次请求（小文件）
 * - chunkUploader  分片上传：切片并发（大文件）
 * 两者互不影响，各自接受同一种写法：'mock' | 接口地址 | {url,…} | {type:'mock'|'http',…} | adapter | fn | 上传器实例
 * - upload.mode     'auto'（按体积自动选）| 'normal'（只走普通）| 'chunk'（只走分片）
 * - upload.chunkThreshold  auto 模式下达到该体积才走分片
 */
import { ChunkUploader, SimpleUploader, simpleAdapter } from './uploaders.js'
import { mockAdapter, httpAdapter } from './adapters.js'

/** 与 uploader 对象写法同名的调度参数：以对象上的为准 */
const CARRY = ['chunkSize', 'concurrency', 'retries', 'retryDelay', 'fingerprint', 'completeOnUrl', 'slice']

const isUploader = (value) => value instanceof SimpleUploader || value instanceof ChunkUploader

/** 归一化配置为 adapter */
function toAdapter(option, label) {
  if (option === undefined || option === null || option === 'mock') return mockAdapter({})
  if (typeof option === 'string') {
    if (!/^(https?:)?\/\//.test(option) && !option.startsWith('/')) {
      throw new Error(`[KEditor] 无法识别的${label}配置：${option}（接口地址请以 / 或 http(s):// 开头）`)
    }
    return httpAdapter({ url: option })
  }
  if (typeof option === 'function') return simpleAdapter(option)
  if (typeof option === 'object') {
    // 已经是 adapter（自带上传方法）就直接用
    if (typeof option.upload === 'function' || typeof option.put === 'function') return option
    if (option.type === 'mock') return mockAdapter(option)
    return httpAdapter(option)
  }
  throw new Error(`[KEditor] 无法识别的${label}配置：${typeof option}`)
}

function carry(config, option) {
  const out = { ...(config || {}) }
  if (option && typeof option === 'object') for (const key of CARRY) if (option[key] !== undefined) out[key] = option[key]
  return out
}

/** 普通上传链路 */
export function createSimpleUploader(option, config = {}) {
  if (isUploader(option)) return option
  return new SimpleUploader(toAdapter(option, '普通上传'), carry(config, option))
}

/** 分片上传链路 */
export function createChunkUploader(option, config = {}) {
  if (isUploader(option)) return option
  return new ChunkUploader(toAdapter(option, '分片上传'), carry(config, option))
}

/** 按配置在两条链路之间选路 */
export class UploadPipeline {
  constructor(normal, chunk, options = {}) {
    this.normal = normal || null
    this.chunk = chunk || null
    this.mode = ['auto', 'normal', 'chunk'].includes(options.mode) ? options.mode : 'auto'
    this.chunkThreshold = Math.max(0, Number(options.chunkThreshold ?? 5 * 1024 * 1024) || 0)
    if (options.mode === 'chunk' && !this.chunk) console.warn('[KEditor] upload.mode = "chunk" 但未配置 chunkUploader，已回退为普通上传')
  }

  /** 该文件走哪条链路：'normal' | 'chunk' */
  pick(file) {
    if (!this.chunk) return 'normal'
    if (!this.normal) return 'chunk'
    if (this.mode === 'normal') return 'normal'
    if (this.mode === 'chunk') return 'chunk'
    return (file?.size || 0) >= this.chunkThreshold ? 'chunk' : 'normal'
  }

  uploaderFor(file) {
    return this.pick(file) === 'chunk' ? this.chunk : this.normal
  }

  async upload(file, handlers = {}) {
    const target = this.uploaderFor(file)
    if (!target) throw new Error('[KEditor] 未配置上传接口：请设置 uploader（普通上传）或 chunkUploader（分片上传）')
    const result = await target.upload(file, handlers)
    return { ...result, mode: target.mode }
  }

  destroy() {
    this.normal?.destroy()
    this.chunk?.destroy()
  }
}

/** 编辑器内部：按 options 装配两条链路 + 选路器 */
export function createUploaders(options = {}) {
  const upload = options.upload || {}
  const normal = createSimpleUploader(options.uploader, upload)
  const chunk = options.chunkUploader ? createChunkUploader(options.chunkUploader, upload) : null
  return { normal, chunk, pipeline: new UploadPipeline(normal, chunk, upload) }
}

export { ChunkUploader, SimpleUploader, simpleAdapter }
