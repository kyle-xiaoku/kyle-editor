/**
 * KEditor 核心：组装 DOM、事件、命令、上传与面板
 */
import { injectStyle } from '../ui/styles.js'
import { Popover } from '../ui/popover.js'
import { SourcePanel } from '../ui/source.js'
import { PreviewOverlay } from '../ui/preview.js'
import { MediaBubble } from '../ui/bubble.js'
import { Toast, lightbox } from '../ui/toast.js'
import { Toolbar, DEFAULT_TOOLBAR } from './toolbar.js'
import { Commands } from './commands.js'
import { History } from './history.js'
import { MediaManager } from '../media/media.js'
import { createUploader } from '../upload/adapters.js'
import { attachDrop, attachPaste } from './paste.js'
import { sanitizeHtml, toPlainText } from './sanitize.js'
import { caretOffset, getRange, closestBlock } from './selection.js'
import { debounce, h, clamp, getMediaAlign } from './utils.js'

const KB = 1024
const MB = 1024 * KB

export const defaults = {
  value: '',
  placeholder: '开始撰写内容，支持拖拽 / 粘贴图片与视频…',
  height: 460, // 编辑区可视高度（px），0 = 自适应
  minHeight: 320,
  primaryColor: '#07c160',
  paperWidth: 677,
  toolbar: DEFAULT_TOOLBAR,
  hideToolbar: false,
  hideStatusbar: false,
  readOnly: false,
  autofocus: false,
  maxLength: 0, // 0 表示不限制
  wordCount: true,
  sanitize: true,
  historyLimit: 60,
  uploader: 'mock', // 'mock' | {type:'http', ...} | adapter | fn | ChunkUploader
  upload: { chunkSize: MB, concurrency: 3, retries: 2, fingerprint: 'fast' },
  image: { compress: { maxWidth: 1440, quality: 0.85, minSize: 300 * KB } },
  maxImageSize: 20 * MB,
  maxVideoSize: 512 * MB,
  imageAccept: 'image/png,image/jpeg,image/gif,image/webp,image/bmp,image/svg+xml,image/avif',
  videoAccept: 'video/mp4,video/quicktime,video/webm,video/x-m4v,video/ogg',
  paste: { enabled: true, clean: true, uploadFiles: true, localizeImages: false },
  onChange: null,
  onReady: null,
  onError: null,
  onUpload: null, // ({stage, file, kind, url, percent, info}) => void
  beforeUpload: null, // (file, kind) => File | false
  toolbarFloat: false,
}

let instanceSeq = 0

export class KEditor {
  constructor(target, options = {}) {
    injectStyle()
    this.options = mergeOptions(options)
    this.id = `ke-${(instanceSeq += 1)}`
    this.el = resolveTarget(target, this.id)
    // 必须在 buildDOM() 之前捕获：buildDOM 会清空 this.el 并塞入编辑器自身 DOM，
    // 之后再读 this.el.innerHTML 取到的是工具栏/状态栏，会被当成正文内容（value 为空时触发）
    const hostHTML = this.el.innerHTML
    this.emitters = new Map()
    this.domListeners = []
    this.destroyed = false
    this.sourceMode = false
    this.previewMode = false
    this.fullscreen = false
    this.readOnly = false

    this.buildDOM()
    this.toast = new Toast()
    this.popover = new Popover(this.el)
    this.commands = new Commands(this)
    this.uploader = createUploader(this.options.uploader, this.options.upload)
    this.media = createMedia(this)
    this.history = new History(this.root, { limit: this.options.historyLimit })
    this.toolbar = new Toolbar(this, this.options.toolbar)
    this.source = new SourcePanel(this)
    this.previewPanel = new PreviewOverlay(this)
    this.bubble = new MediaBubble(this)
    this.mainEl.append(this.source.el, this.previewPanel.el)

    this.applyTheme()
    this.setContent(this.options.value || hostHTML, { sanitize: this.options.sanitize, silent: true })
    this.bindEvents()
    this.setReadOnly(this.options.readOnly)
    this.refresh()
    this.refreshStatus()
    this.history.reset(this.root.innerHTML)

    queueMicrotask(() => {
      if (this.destroyed) return
      this.emit('ready', { editor: this })
      this.options.onReady?.(this)
      if (this.options.autofocus) this.focus()
    })
  }

  /* ------------------------------ DOM ------------------------------ */

  buildDOM() {
    this.el.classList.add('ke')
    this.el.id = this.el.id || this.id
    this.el.innerHTML = ''

    this.tbEl = h('div.ke-tb', { role: 'toolbar', 'aria-label': '编辑器工具栏' })
    this.scrollEl = h('div.ke-scroll')
    this.paperEl = h('div.ke-paper')
    this.root = h('div.ke-content', {
      contenteditable: this.readOnly ? 'false' : 'true',
      role: 'textbox',
      'aria-multiline': 'true',
      spellcheck: 'false',
      'data-placeholder': this.options.placeholder,
      'data-ke-root': '',
    })
    this.root.style.minHeight = `${this.options.minHeight}px`
    this.paperEl.appendChild(this.root)
    this.scrollEl.appendChild(this.paperEl)

    this.mainEl = h('div.ke-main', {}, [this.scrollEl])
    this.statusEl = buildStatusbar(this)
    this.dropzoneEl = h('div.ke-dropzone', {}, [h('span', { text: '松开即可上传（分片传输）' })])

    if (!this.options.hideToolbar) this.el.appendChild(this.tbEl)
    this.el.appendChild(this.mainEl)
    if (!this.options.hideStatusbar) this.el.appendChild(this.statusEl)
    this.el.appendChild(this.dropzoneEl)

    if (this.options.height) {
      this.scrollEl.style.height = `${this.options.height}px`
      this.scrollEl.style.maxHeight = `${this.options.height}px`
    }
    this.paperEl.style.setProperty('--ke-paper', `${this.options.paperWidth}px`)
    this.paperEl.style.setProperty('--ke-min-height', `${this.options.minHeight}px`)
  }

  applyTheme() {
    if (this.options.primaryColor) this.el.style.setProperty('--ke-primary', this.options.primaryColor)
  }

  /* ------------------------------ 事件 ------------------------------ */

  bindEvents() {
    const debouncedChange = debounce(() => this.emitChange(), 160)

    this.bind(this.root, 'input', () => {
      this.history.snapshot()
      this.refreshStatus()
      this.togglePlaceholder()
      debouncedChange()
      this.enforceMaxLength()
    })

    this.bind(this.root, 'keydown', (event) => this.handleKeydown(event))
    this.bind(this.root, 'blur', () => {
      this.history.flush()
      this.el.classList.remove('ke-is-focus')
      this.emit('blur')
    })
    this.bind(this.root, 'focus', () => {
      this.el.classList.add('ke-is-focus')
      this.emit('focus')
    })
    this.bind(this.root, 'click', (event) => this.handleContentClick(event))
    this.bind(this.root, 'dblclick', (event) => {
      const img = event.target.closest('img')
      if (img && this.root.contains(img)) lightbox(img.src)
    })

    attachPaste(this)
    attachDrop(this)

    this.selectionHandler = () => {
      if (!this.root.contains(document.activeElement) && document.activeElement !== this.root) return
      this.refresh()
      this.syncBubble()
    }
    document.addEventListener('selectionchange', this.selectionHandler)

    this.scrollHandler = () => this.bubble.position()
    this.bind(this.scrollEl, 'scroll', this.scrollHandler)
    window.addEventListener('resize', this.scrollHandler)
  }

  /** 内部 DOM 事件登记，便于 destroy 时统一清理 */
  bind(node, type, handler) {
    node.addEventListener(type, handler)
    this.domListeners.push({ node, type, handler })
    return handler
  }

  handleKeydown(event) {
    const meta = event.metaKey || event.ctrlKey
    const key = event.key.toLowerCase()

    if (meta && key === 'z') {
      event.preventDefault()
      if (event.shiftKey) this.redo()
      else this.undo()
      return
    }
    if (meta && key === 'y') {
      event.preventDefault()
      this.redo()
      return
    }
    if (meta && ['b', 'i', 'u'].includes(key)) {
      event.preventDefault()
      this.commands.toggleMark({ b: 'bold', i: 'italic', u: 'underline' }[key])
      this.refresh()
      return
    }
    if (meta && event.shiftKey && key === 'k') {
      event.preventDefault()
      this.toggleSource()
      return
    }
    if (meta && key === 'k') {
      event.preventDefault()
      this.toolbar.openLink()
      return
    }
    if (meta && key === 's') {
      event.preventDefault()
      this.emit('save', { html: this.getHTML() })
      return
    }
    if (event.key === 'Escape') {
      this.popover.close()
      this.bubble.hide()
      if (this.previewMode) this.closePreview()
      return
    }
    if (event.key === 'Backspace' || event.key === 'Delete') {
      const selected = this.bubble.node
      if (selected) {
        event.preventDefault()
        this.bubble.remove()
      }
    }
  }

  handleContentClick(event) {
    const media = event.target.closest('[data-k-media]')
    if (media && this.root.contains(media)) {
      this.selectMedia(media)
      return
    }
    this.clearMediaSelection()
    this.bubble.hide()
  }

  selectMedia(node) {
    this.clearMediaSelection()
    node.classList.add('ke-is-selected-media')
    this.bubble.show(node)
    // 图片是 contenteditable=false，点击不触发 selectionchange，需手动刷新工具栏高亮
    this.refreshStatus()
  }

  clearMediaSelection() {
    this.root.querySelectorAll('.ke-is-selected-media').forEach((n) => n.classList.remove('ke-is-selected-media'))
    this.bubble.hide()
  }

  syncBubble() {
    if (!this.bubble.node || !this.root.contains(this.bubble.node)) this.bubble.hide()
    else this.bubble.position()
  }

  /* ------------------------------ 状态 ------------------------------ */

  getState() {
    const range = getRange(this.root)
    const block = closestBlock(range?.commonAncestorContainer || this.root, this.root)
    const anchor = range ? findAnchor(range, this.root) : null
    // 选中图片时，工具栏对齐按钮反映图片自身的对齐（margin auto），而非所在段落
    const media = this.bubble?.node
    const mediaImg = media && media.dataset?.kMedia === 'image' ? media.querySelector('img') : null
    const align = mediaImg ? getMediaAlign(mediaImg) : currentAlign(range, block)
    return {
      bold: this.queryState('bold'),
      italic: this.queryState('italic'),
      underline: this.queryState('underline'),
      strikeThrough: this.queryState('strikeThrough'),
      ul: this.queryState('insertUnorderedList'),
      ol: this.queryState('insertOrderedList'),
      align,
      block: block?.tagName?.toLowerCase() || 'p',
      fontSize: this.commands.currentFontSize(),
      linkUrl: anchor ? anchor.getAttribute('href') : '',
      linkTarget: anchor ? anchor.getAttribute('target') === '_blank' : false,
      selectionText: range ? range.toString() : '',
      canUndo: this.history.canUndo(),
      canRedo: this.history.canRedo(),
      source: this.sourceMode,
      preview: this.previewMode,
      fullscreen: this.fullscreen,
      readOnly: this.readOnly,
    }
  }

  queryState(command) {
    if (!this.root.contains(window.getSelection()?.anchorNode || null)) return false
    try {
      return document.queryCommandState(command)
    } catch {
      return false
    }
  }

  refresh() {
    if (this.destroyed) return
    try {
      this.toolbar.refresh(this.getState())
    } catch {
      /* 忽略状态刷新异常 */
    }
  }

  refreshStatus() {
    const api = this.statusApi
    if (api) api.update(this.counts())
  }

  counts() {
    const text = toPlainText(this.root.innerHTML)
    return {
      chars: text.replace(/\s/g, '').length,
      words: countWords(text),
      images: this.root.querySelectorAll('img').length,
      videos: this.root.querySelectorAll('[data-k-media="video"] video, video').length,
      uploading: this.media ? this.media.tasks.size : 0,
    }
  }

  togglePlaceholder() {
    const empty = !this.root.textContent.trim() && !this.root.querySelector('img,video,hr,table,iframe')
    this.root.classList.toggle('ke-is-empty', empty)
  }

  enforceMaxLength() {
    const max = this.options.maxLength
    if (!max) return
    const { chars } = this.counts()
    if (chars > max) {
      this.toast.warn(`已超过建议字数 ${max}`)
      this.statusEl?.classList.add('ke-is-over')
    } else {
      this.statusEl?.classList.remove('ke-is-over')
    }
  }

  /* ------------------------------ 内容 API ------------------------------ */

  getHTML({ clean = true } = {}) {
    const html = this.root.innerHTML
    if (!clean) return html
    return exportHtml(html)
  }

  getText() {
    return toPlainText(this.root.innerHTML)
  }

  getJSON() {
    return { html: this.getHTML(), text: this.getText(), counts: this.counts() }
  }

  setContent(html, { sanitize = this.options.sanitize, silent = false } = {}) {
    const value = sanitizeHtml(html || '<p><br></p>', { allowEmpty: true })
    this.root.innerHTML = value || '<p><br></p>'
    this.afterEdit({ silent })
    if (!silent) this.history.snapshot(true)
    this.togglePlaceholder()
    return this
  }

  appendHTML(html) {
    const range = document.createRange()
    range.selectNodeContents(this.root)
    range.collapse(false)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
    this.commands.insertHTML(html)
    return this
  }

  clear() {
    this.media.cancelAll()
    this.setContent('<p><br></p>')
    this.focus()
    return this
  }

  afterEdit({ silent = false } = {}) {
    this.history.snapshot()
    this.refreshStatus()
    this.togglePlaceholder()
    if (!silent) this.emitChange()
  }

  commitHistory() {
    this.history.snapshot(true)
    this.refreshStatus()
    this.emitChange()
  }

  emitChange() {
    this.emit('change', { html: this.getHTML(), text: this.getText() })
    this.options.onChange?.(this.getHTML(), this)
  }

  focus() {
    if (this.readOnly || this.sourceMode) {
      if (this.sourceMode) this.source.code.focus()
      return this
    }
    this.root.focus()
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || !this.root.contains(sel.anchorNode)) {
      const range = document.createRange()
      const first = this.root.firstElementChild || this.root
      range.selectNodeContents(first)
      range.collapse(false)
      sel.removeAllRanges()
      sel.addRange(range)
    }
    return this
  }

  blur() {
    this.root.blur()
    return this
  }

  /** 打开面板前记录选区（面板内的输入框会抢走焦点） */
  saveSelection() {
    const range = getRange(this.root)
    this.savedRange = range ? range.cloneRange() : null
    return this
  }

  /** 执行面板动作前还原选区，无有效选区时退化为 focus() 的兜底 */
  restoreSelection() {
    this.root.focus()
    const sel = window.getSelection()
    if (this.savedRange && this.root.contains(this.savedRange.startContainer) && this.root.contains(this.savedRange.endContainer)) {
      sel.removeAllRanges()
      sel.addRange(this.savedRange)
      return this
    }
    return this.focus()
  }

  setReadOnly(value) {
    this.readOnly = !!value
    this.root.setAttribute('contenteditable', this.readOnly ? 'false' : 'true')
    this.el.classList.toggle('ke-is-readonly', this.readOnly)
    this.refresh()
    return this
  }

  undo() {
    this.history.flush()
    if (!this.history.undo()) {
      this.toast.show('没有可撤销的操作')
      return this
    }
    this.afterEdit({ silent: false })
    this.refresh()
    return this
  }

  redo() {
    if (!this.history.redo()) {
      this.toast.show('没有可重做的操作')
      return this
    }
    this.afterEdit()
    this.refresh()
    return this
  }

  /* ------------------------------ 媒体快捷入口 ------------------------------ */

  /** 上传任意文件（自动识别图片/视频），等价于点击工具栏上传 */
  upload(file, kind = this.media.kindOf(file)) {
    if (!kind) throw new Error('[KEditor] 不支持的文件类型')
    return this.media.upload(file, kind)
  }

  /** 以 URL 插入图片 */
  insertImage(url, alt = '') {
    return this.media.insertImageUrl(url, alt)
  }

  /** 以 URL 插入视频 */
  insertVideo(url, label = '视频') {
    return this.media.insertVideoUrl(url, label)
  }

  /** 取消全部进行中的上传 */
  cancelUploads() {
    this.media.cancelAll()
    return this
  }

  /* ------------------------------ 面板 ------------------------------ */

  toggleSource() {
    if (this.sourceMode) this.exitSource()
    else this.enterSource()
    return this.sourceMode
  }

  enterSource() {
    if (this.sourceMode) return
    this.history.flush()
    this.sourceMode = true
    this.el.classList.add('ke-is-source')
    this.clearMediaSelection()
    this.source.show(this.getHTML({ clean: true }))
    this.previewPanel.hide()
    this.previewMode = false
    this.refresh()
    this.emit('sourcechange', { mode: 'source' })
  }

  exitSource() {
    if (!this.sourceMode) return
    this.source.apply({ silent: true })
    this.sourceMode = false
    this.el.classList.remove('ke-is-source')
    this.source.hide()
    this.focus()
    this.refresh()
    this.emit('sourcechange', { mode: 'visual' })
  }

  togglePreview() {
    if (this.previewMode) this.closePreview()
    else this.openPreview()
    return this.previewMode
  }

  openPreview() {
    this.previewMode = true
    this.previewPanel.show(previewHtml(this.getHTML()))
    this.refresh()
  }

  closePreview() {
    this.previewMode = false
    this.previewPanel.hide()
    this.refresh()
  }

  toggleFullscreen() {
    this.fullscreen = !this.fullscreen
    this.el.classList.toggle('ke-is-fullscreen', this.fullscreen)
    document.body.style.overflow = this.fullscreen ? 'hidden' : ''
    this.refresh()
    return this.fullscreen
  }

  /* ------------------------------ 事件总线 ------------------------------ */

  /** 订阅编辑器事件：ready / change / focus / blur / save / uploadstart / uploaddone / uploaderror / uploadcancel / sourcechange */
  on(type, handler) {
    return this.addListener(type, handler)
  }

  off(type, handler) {
    return this.removeListener(type, handler)
  }

  emit(type, payload = {}) {
    const list = this.emitters.get(type) || []
    for (const handler of list) {
      try {
        handler(payload)
      } catch (error) {
        this.options.onError?.(error)
      }
    }
    if (type.startsWith('upload')) this.options.onUpload?.({ stage: type, ...payload })
    return this
  }

  addListener(type, handler) {
    if (!this.emitters.has(type)) this.emitters.set(type, [])
    this.emitters.get(type).push(handler)
    return () => this.removeListener(type, handler)
  }

  removeListener(type, handler) {
    const list = this.emitters.get(type) || []
    const idx = list.indexOf(handler)
    if (idx >= 0) list.splice(idx, 1)
    return this
  }

  /* 兼容别名 */
  get element() {
    return this.root
  }

  get editorElement() {
    return this.el
  }

  destroy() {
    if (this.destroyed) return
    this.destroyed = true
    this.media.destroy()
    this.history.destroy()
    this.popover.destroy()
    this.source.destroy()
    this.previewPanel.destroy()
    this.bubble.destroy()
    this.toolbar.destroy()
    this.toast.destroy()
    for (const { node, type, handler } of this.domListeners) node.removeEventListener(type, handler)
    document.removeEventListener('selectionchange', this.selectionHandler)
    this.scrollEl.removeEventListener('scroll', this.scrollHandler)
    window.removeEventListener('resize', this.scrollHandler)
    if (this.fullscreen) document.body.style.overflow = ''
    this.el.innerHTML = ''
    this.el.classList.remove('ke', 'ke-is-fullscreen', 'ke-is-readonly')
    this.el.removeAttribute('style')
    this.emitters.clear()
  }

  /** 便捷静态方法 */
  static create(target, options) {
    return new KEditor(target, options)
  }
}

/* ------------------------------ helpers ------------------------------ */

function createMedia(editor) {
  const manager = new MediaManager(editor)
  const originalUpload = manager.upload.bind(manager)
  manager.upload = async (file, kind) => {
    const hook = editor.options.beforeUpload
    let target = file
    if (hook) {
      target = await hook(file, kind)
      if (target === false) return null
    }
    return originalUpload(target, kind)
  }
  /** 替换已有媒体节点（气泡工具条「替换」用） */
  manager.replaceNode = async (node, file) => {
    const kind = node.dataset.kMedia === 'video' ? 'video' : 'image'
    const range = document.createRange()
    range.setStartBefore(node)
    range.collapse(true)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
    const result = await manager.upload(file, kind)
    node.remove()
    editor.commitHistory()
    return result
  }
  return manager
}

function resolveTarget(target, id) {
  if (typeof target === 'string') {
    const el = document.querySelector(target)
    if (!el) throw new Error(`[KEditor] 找不到挂载节点：${target}`)
    return el
  }
  if (target instanceof HTMLElement) return target
  if (target?.$el instanceof HTMLElement) return target.$el
  throw new Error(`[KEditor] 无效的挂载目标（${typeof target}）`)
}

function mergeOptions(options) {
  const out = { ...defaults, ...options }
  out.image = { ...defaults.image, ...(options.image || {}) }
  out.paste = { ...defaults.paste, ...(options.paste || {}) }
  out.upload = { ...defaults.upload, ...(options.upload || {}) }
  if (Array.isArray(options.toolbar)) out.toolbar = options.toolbar
  if (options.toolbar === false) out.toolbar = []
  if (options.toolbar === true) out.toolbar = DEFAULT_TOOLBAR
  out.height = clamp(out.height ?? 460, 0, 4000)
  return out
}

function buildStatusbar(editor) {
  const chars = h('b', { text: '0' })
  const words = h('b', { text: '0' })
  const images = h('b', { text: '0' })
  const videos = h('b', { text: '0' })
  const chip = h('span.ke-chip', { hidden: true })
  const hint = h('span.ke-status-hint', { text: '支持拖拽 / 粘贴上传，Ctrl/⌘ + S 保存' })
  const tail = h('span.ke-status-tail')
  const el = h(
    'div.ke-status',
    {},
    [
      h('span', {}, ['字数 ', chars, '  ·  ', words, ' 词']),
      h('span', {}, ['图片 ', images, '  ·  视频 ', videos]),
      chip,
      hint,
      tail,
    ],
  )
  const api = {
    update: (counts) => {
      chars.textContent = String(counts.chars)
      words.textContent = String(counts.words)
      images.textContent = String(counts.images)
      videos.textContent = String(counts.videos)
      if (counts.uploading > 0) {
        chip.hidden = false
        chip.className = 'ke-chip ke-is-busy'
        chip.textContent = `${counts.uploading} 个上传进行中`
      } else {
        chip.hidden = true
      }
    },
    addExtra: (node) => tail.appendChild(node),
  }
  editor.statusApi = api
  if (!editor.options.wordCount) el.style.display = 'none'
  return el
}

function findAnchor(range, root) {
  let node = range?.commonAncestorContainer
  if (!node || !root.contains(node)) return null
  if (node.nodeType === 3) node = node.parentElement
  const anchor = node?.closest?.('a')
  return anchor && root.contains(anchor) ? anchor : null
}

function currentAlign(range, block) {
  const node = block || range?.commonAncestorContainer
  const styles = [node, node?.parentElement].filter((n) => n && n.nodeType === 1)
  for (const el of styles) {
    const align = el.style?.textAlign
    if (align) return align === '-webkit-justify' ? 'justify' : align
    const cs = el.getAttribute?.('align')
    if (cs) return cs
  }
  try {
    if (document.queryCommandState('justifyCenter')) return 'center'
    if (document.queryCommandState('justifyRight')) return 'right'
    if (document.queryCommandState('justifyFull')) return 'justify'
  } catch {
    /* ignore */
  }
  return 'left'
}

function countWords(text) {
  const cjk = (text.match(/[\u4e00-\u9fa5\u3040-\u30ff]/g) || []).length
  const latin = (text.match(/[a-zA-Z0-9'’-]+/g) || []).length
  return cjk + latin
}

/** 导出用净化：去掉编辑器内部属性，保留业务可读的结构与样式 */
export function exportHtml(html) {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const root = doc.body.firstChild
  root.querySelectorAll('[contenteditable]').forEach((n) => n.removeAttribute('contenteditable'))
  root.querySelectorAll('[data-k-id]').forEach((n) => n.removeAttribute('data-k-id'))
  root.querySelectorAll('[data-k-state]').forEach((n) => n.removeAttribute('data-k-state'))
  root.querySelectorAll('[data-ke-marker]').forEach((n) => n.removeAttribute('data-ke-marker'))
  root.querySelectorAll('[data-placeholder]').forEach((n) => n.removeAttribute('data-placeholder'))
  root.querySelectorAll('.ke-is-selected-media').forEach((n) => n.classList.remove('ke-is-selected-media'))
  // 上传中的占位块不进入导出结果
  root.querySelectorAll('[data-k-state="uploading"], [data-k-state="error"]').forEach((n) => n.remove())
  return root.innerHTML.trim()
}

/** 预览用：把内部占位/属性转成静态展示结构 */
function previewHtml(html) {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const root = doc.body.firstChild
  root.querySelectorAll('[data-k-media]').forEach((n) => {
    n.removeAttribute('data-k-media')
    n.removeAttribute('data-k-url')
  })
  return root.innerHTML
}
