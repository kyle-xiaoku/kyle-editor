/**
 * KEditor — 微信公众号风格富文本编辑器（纯前端）
 * 支持 <script> 直接引入（全局 KEditor）与 ESM / Vue3 安装
 */
import { KEditor, exportHtml, defaults } from './core/editor.js'

export const version = '1.0.0'

/** 创建一个编辑器实例，target 可为选择器 / DOM / Vue ref */
export function create(target, options = {}) {
  return new KEditor(target, options)
}

/** 语法糖：与 create 相同，便于 `KEditor.mount('#el')` 这类调用 */
export const mount = create

/** 销毁并替换目标节点上的旧实例 */
export function replace(target, options = {}) {
  const el = typeof target === 'string' ? document.querySelector(target) : target
  if (el?.__keditor__) el.__keditor__.destroy()
  return create(el, options)
}

export { KEditor, defaults, exportHtml }
export { DEFAULT_TOOLBAR } from './core/toolbar.js'
export { sanitizeHtml, escapeHtml, isSafeUrl, cleanWordHtml } from './core/sanitize.js'
export { formatHtml } from './core/format.js'
export { ChunkUploader, simpleAdapter } from './upload/chunk-uploader.js'
export { createUploader, mockAdapter, httpAdapter } from './upload/adapters.js'
export { fastFingerprint, strongFingerprint } from './upload/fingerprint.js'
export { maybeCompress } from './media/media.js'

export default KEditor
