/**
 * KEditor — 微信公众号风格富文本编辑器（纯前端）
 * 支持 <script> 直接引入（全局 KEditor）与 ESM / Vue3 安装
 */
import { KEditor, exportHtml, defaults } from './core/editor.js'

export const version = typeof __KEDITOR_VERSION__ !== 'undefined' ? __KEDITOR_VERSION__ : '0.0.0-dev'

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
export { normalizeCustomButtons, normalizePosition, normalizeItems } from './core/custom-button.js'
export { sanitizeHtml, escapeHtml, isSafeUrl, cleanWordHtml } from './core/sanitize.js'
export { formatHtml } from './core/format.js'
export { LANGUAGES, highlightCode, normalizeLang, languageLabel, listLanguages, isCodeBlock } from './core/code.js'
export {
  markdownToHtml,
  markdownSummary,
  isMarkdownFile,
  readMarkdownFile,
  normalizeInsertMode,
  MARKDOWN_ACCEPT,
} from './core/markdown.js'
export { ChunkUploader, SimpleUploader, simpleAdapter } from './upload/uploaders.js'
export { UploadPipeline, createSimpleUploader, createChunkUploader } from './upload/pipeline.js'
export { mockAdapter, httpAdapter } from './upload/adapters.js'
export { fastFingerprint, strongFingerprint } from './upload/fingerprint.js'
export { maybeCompress } from './media/media.js'

export default KEditor
