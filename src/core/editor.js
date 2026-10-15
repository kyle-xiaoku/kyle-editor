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
import { normalizeCustomButtons } from './custom-button.js'
import { Commands } from './commands.js'
import { History } from './history.js'
import { MediaManager } from '../media/media.js'
import { createUploaders } from '../upload/pipeline.js'
import { attachDrop, attachPaste } from './paste.js'
import { sanitizeHtml, toPlainText } from './sanitize.js'
import { highlightCodeBlocks, stripHighlight, refreshCodeBlock, codeBlockAt, listLanguages, normalizeLang } from './code.js'
import { markdownToHtml, markdownSummary, readMarkdownFile, normalizeInsertMode } from './markdown.js'
import { caretOffset, getRange, closestBlock } from './selection.js'
import { debounce, h, clamp, getMediaAlign, formatSize } from './utils.js'

/** 初始语言：defaultLanguage 不在裁剪后的清单里时落到清单第一项 */
function initialCodeLang(code) {
  const list = listLanguages(code.languages)
  const wanted = normalizeLang(code.defaultLanguage)
  return list.some((item) => item.value === wanted) ? wanted : list[0].value
}

const KB = 1024
const MB = 1024 * KB

export const defaults = {
  value: '',
  placeholder: '开始撰写内容，支持拖拽 / 粘贴图片与视频…',
  height: 0, // 编辑区可视高度（px）：默认 0 = 随内容自动撑开；填了才固定高度并内部滚动
  minHeight: 320, // 内容区最小高度（px），自适应模式下也生效
  /** 代码块：可选语言列表、默认语言、是否语法高亮 */
  code: { languages: [], defaultLanguage: 'plaintext', highlight: true },
  /** Markdown 导入：落点模式（replace 替换全文 | append 追加文末 | cursor 光标处）/ 文件体积上限 / 转换选项 */
  markdown: { insertMode: 'replace', maxSize: 5 * MB, gfm: true, breaks: false, linkTarget: false, frontMatter: true },
  primaryColor: '#07c160',
  paperWidth: 677, // 版心基准宽度：窄屏上限、宽屏最小宽度
  /** 版心宽度模式：'fluid' 宽屏随容器生长（两侧留白恒定）| 'fixed' 恒定版心 */
  paperMode: 'fluid',
  paperGap: 24, // fluid 模式下单侧留白（px）
  paperMaxWidth: 0, // fluid 模式下版心最大宽度，0 = 不限
  toolbar: DEFAULT_TOOLBAR,
  /** 自定义工具栏按钮（下拉选择，数据可静态配置或从接口读取） */
  customButtons: [],
  hideToolbar: false,
  hideStatusbar: false,
  readOnly: false,
  autofocus: false,
  maxLength: 0, // 0 表示不限制
  wordCount: true,
  sanitize: true,
  historyLimit: 60,
  /** 普通上传（整个文件一次请求）：'mock' | 接口地址 | {url,…} | adapter | fn */
  uploader: 'mock',
  /** 分片上传（切片并发，接口返回 url 即成功）：同上；null 表示不启用分片 */
  chunkUploader: 'mock',
  upload: {
    /** 'auto' 按体积自动选链路 | 'normal' 只走普通上传 | 'chunk' 只走分片上传 */
    mode: 'auto',
    /** auto 模式下达到该体积才走分片上传 */
    chunkThreshold: 5 * MB,
    chunkSize: MB,
    concurrency: 3,
    retries: 2,
    fingerprint: 'fast',
  },
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
    /** 上一次选过的代码语言：下次插入代码块时默认选中 */
    this.lastCodeLang = initialCodeLang(this.options.code)
    this.el = resolveTarget(target, this.id)
    // 宿主节点反向引用：KEditor.replace() 靠它销毁旧实例，避免同一容器上叠加实例与监听泄漏
    this.el.__keditor__ = this
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
    const uploads = createUploaders(this.options)
    /** 两条链路：{ normal, chunk } */
    this.uploaders = { normal: uploads.normal, chunk: uploads.chunk }
    /** 统一入口：按 upload.mode / 文件体积自动选路 */
    this.uploader = uploads.pipeline
    this.media = createMedia(this)
    this.history = new History(this.root, { limit: this.options.historyLimit })
    this.toolbar = new Toolbar(this, this.options.toolbar, this.options.customButtons)
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

    this.paperEl.style.setProperty('--ke-min-height', `${this.options.minHeight}px`)
    this.applyHeight()
    this.applyPaper()
  }

  /**
   * 内容区高度：height 未配置（0）时随内容自动撑开，整页滚动；
   * 配置了 height 才固定高度，内容超出时在编辑区内部滚动
   */
  applyHeight() {
    const height = normalizeHeight(this.options.height)
    if (height > 0) {
      this.scrollEl.style.height = `${height}px`
      this.scrollEl.style.maxHeight = `${height}px`
    } else {
      this.scrollEl.style.height = ''
      this.scrollEl.style.maxHeight = ''
    }
    this.el.classList.toggle('ke-is-auto', height === 0)
    return height
  }

  /** 运行时切换内容区高度：传 px 固定，传 0 / 'auto' 恢复自适应 */
  setHeight(value) {
    this.options.height = normalizeHeight(value)
    return this.applyHeight()
  }

  /** 当前内容区高度配置：0 表示自适应 */
  heightOptions() {
    return { height: normalizeHeight(this.options.height), auto: normalizeHeight(this.options.height) === 0 }
  }

  /** 版心尺寸：宽屏下默认让版心随容器生长，两侧只保留固定留白 */
  applyPaper() {
    const { paperWidth, paperMode, paperGap, paperMaxWidth } = this.options
    this.paperEl.style.setProperty('--ke-paper', `${paperWidth}px`)
    this.paperEl.style.setProperty('--ke-paper-gap', `${paperGap}px`)
    if (paperMaxWidth > 0) this.paperEl.style.setProperty('--ke-paper-max', `${paperMaxWidth}px`)
    else this.paperEl.style.removeProperty('--ke-paper-max')
    this.paperEl.classList.toggle('ke-is-fluid', paperMode !== 'fixed')
  }

  /** 运行时调整版心：{width, mode, gap, maxWidth}（mode: 'fluid' | 'fixed'） */
  setPaper(config = {}) {
    if (config.width !== undefined) this.options.paperWidth = clamp(Number(config.width) || 0, 200, 8000)
    if (config.mode !== undefined) this.options.paperMode = config.mode === 'fixed' ? 'fixed' : 'fluid'
    if (config.gap !== undefined) this.options.paperGap = clamp(Number(config.gap) || 0, 0, 600)
    if (config.maxWidth !== undefined) this.options.paperMaxWidth = Math.max(0, Number(config.maxWidth) || 0)
    this.applyPaper()
    return { ...this.paperOptions() }
  }

  paperOptions() {
    const { paperWidth, paperMode, paperGap, paperMaxWidth } = this.options
    return { width: paperWidth, mode: paperMode, gap: paperGap, maxWidth: paperMaxWidth }
  }

  applyTheme() {
    if (this.options.primaryColor) this.el.style.setProperty('--ke-primary', this.options.primaryColor)
  }

  /* ------------------------------ 事件 ------------------------------ */

  bindEvents() {
    const debouncedChange = debounce(() => this.emitChange(), 160)

    this.bind(this.root, 'input', (event) => {
      this.history.snapshot()
      this.refreshStatus()
      this.togglePlaceholder()
      this.queueCodeHighlight(event)
      debouncedChange()
      this.enforceMaxLength()
    })
    // 输入法组字期间不能重渲染，否则会打断中文候选
    this.bind(this.root, 'compositionstart', () => { this.composing = true })
    this.bind(this.root, 'compositionend', (event) => {
      this.composing = false
      this.queueCodeHighlight(event)
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
      inCode: !!codeBlockAt(this.root),
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
    if (clean === false) return html
    // clean: 'preview' 与导出同样清理内部属性，但保留高亮 span（预览面板复用编辑器样式）
    return exportHtml(html, { keepHighlight: clean === 'preview' })
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
    this.highlightCode()
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

  /* ------------------------------ 代码块 ------------------------------ */

  /** 可选语言清单（可用 options.code.languages 裁剪） */
  codeLanguages() {
    return listLanguages(this.options.code.languages)
  }

  /** 高亮正文中所有代码块（内容整体替换后调用） */
  highlightCode() {
    return highlightCodeBlocks(this.root, { highlight: this.options.code.highlight !== false })
  }

  /** 插入代码块：code 为源码，lang 缺省用 code.defaultLanguage */
  insertCode(code = '', lang) {
    return this.commands.insertCodeBlock(code, lang)
  }

  /** 切换代码块语言并重新高亮；不传目标时取光标所在代码块，返回 null 表示不在代码块中 */
  setCodeLanguage(lang, target) {
    return this.commands.setCodeLanguage(lang, target)
  }

  /** 光标所在代码块的语言；不在代码块中返回空串 */
  getCodeLanguage() {
    return this.commands.currentCodeLang()
  }

  /** 在代码块内输入时重新高亮（保持块内光标）；输入法组字期间跳过 */
  queueCodeHighlight(event) {
    if (event?.isComposing || this.composing) return
    const block = codeBlockAt(this.root)
    if (!block) return
    clearTimeout(this.codeTimer)
    this.codeTimer = setTimeout(() => {
      this.codeTimer = null
      if (!this.destroyed) refreshCodeBlock(block, { caret: true })
    }, 140)
  }

  /* ------------------------------ 导入 Markdown ------------------------------ */

  /** 落点模式：replace 替换全文（默认）| append 追加到文末 | cursor 插入到光标处 */
  markdownOptions() {
    const { insertMode, maxSize } = this.options.markdown
    return { insertMode: normalizeInsertMode(insertMode), maxSize, auto: insertMode === 'replace' }
  }

  /**
   * 导入 Markdown 并转为 HTML：source 可为字符串或 File/Blob（.md / .txt）
   * 返回 { ok, html, summary, mode, chars, name }；失败时 ok=false
   */
  async importMarkdown(source, { mode = this.options.markdown.insertMode, silent = false } = {}) {
    if (this.readOnly) {
      this.toast.warn('只读模式不能导入内容')
      return { ok: false, reason: 'readonly' }
    }
    const place = normalizeInsertMode(mode)
    let text = ''
    let name = ''
    try {
      if (typeof source === 'string') {
        text = source
      } else if (source && typeof source.arrayBuffer === 'function') {
        name = source.name || ''
        const limit = this.options.markdown.maxSize
        if (limit && source.size > limit) throw new Error(`${name || '文件'} 超出大小限制（${formatSize(limit)}）`)
        text = await readMarkdownFile(source)
      } else if (source && typeof source.content === 'string') {
        text = source.content
        name = source.name || ''
      } else {
        throw new Error('导入内容必须是 Markdown 文本或文件')
      }
      const html = markdownToHtml(text, this.options.markdown)
      if (!html.trim()) throw new Error('没有解析到可用内容')
      if (place === 'replace') this.setContent(html)
      else {
        if (place === 'append') this.moveCaretToEnd()
        this.commands.insertHTML(html)
        this.highlightCode()
      }
      this.focus()
      this.history.snapshot(true)
      const summary = markdownSummary(html)
      if (!silent) this.toast.show(`已导入${name ? ` ${name}` : ' Markdown'}（${summary.paragraphs + summary.headings} 个段落）`)
      this.emit('markdownimport', { mode: place, name, summary, chars: text.length })
      return { ok: true, html, summary, mode: place, chars: text.length, name }
    } catch (error) {
      this.reportError('markdown', error)
      return { ok: false, reason: 'error', error, name }
    }
  }

  /** 导入并替换全文 */
  setMarkdown(source, options = {}) {
    return this.importMarkdown(source, { mode: 'replace', ...options })
  }

  /** 导入并插入到光标处 */
  insertMarkdown(source, options = {}) {
    return this.importMarkdown(source, { mode: 'cursor', ...options })
  }

  /** 导入并追加到文末 */
  appendMarkdown(source, options = {}) {
    return this.importMarkdown(source, { mode: 'append', ...options })
  }

  /** 光标 / 选区移到正文末尾（追加导入用） */
  moveCaretToEnd() {
    const range = document.createRange()
    range.selectNodeContents(this.root)
    range.collapse(false)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
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

  /* ------------------------------ 自定义工具栏按钮 ------------------------------ */

  /** 运行时新增自定义按钮（下拉选择 / 普通按钮），返回按钮 DOM */
  addButton(spec, options) {
    return this.toolbar.addButton(spec, options)
  }

  /** 运行时移动任意按钮位置（内置或自定义）；where 同 spec.position 语义 */
  moveButton(name, where) {
    return this.toolbar.moveButton(name, where)
  }

  /** 移除自定义按钮，并中断其未完成的接口请求 */
  removeButton(name) {
    return this.toolbar.removeButton(name)
  }

  /** 外部灌入下拉数据（接口在编辑器之外请求时使用），返回规范化后的列表 */
  setButtonOptions(name, items) {
    return this.toolbar.setButtonOptions(name, items)
  }

  /** 读取 / 设置下拉按钮当前选中项 */
  getButtonValue(name) {
    return this.toolbar.getButtonValue(name)
  }

  setButtonValue(name, value) {
    return this.toolbar.setButtonValue(name, value)
  }

  /** 统一错误上报：toast 提示 + emit('error') + options.onError */
  reportError(type, error) {
    const message = error && error.message ? error.message : String(error)
    const payload = { type, error: error instanceof Error ? error : new Error(message), message }
    this.toast?.error(message)
    this.emit('error', payload)
    this.options.onError?.(payload)
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
    // 预览与编辑视图一样保留语法高亮（导出才还原成纯代码）
    this.previewPanel.show(previewHtml(this.getHTML({ clean: 'preview' })))
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
    this.uploader?.destroy()
    clearTimeout(this.codeTimer)
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
    if (this.el.__keditor__ === this) this.el.__keditor__ = null
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

/** 内容区高度归一化：缺失 / 'auto' / null → 0（自适应） */
export function normalizeHeight(value) {
  if (value === '' || value === null || value === undefined || value === 'auto') return 0
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return 0
  return clamp(Math.round(num), 0, 4000)
}

function mergeOptions(options) {
  const out = { ...defaults, ...options }
  out.image = { ...defaults.image, ...(options.image || {}) }
  out.paste = { ...defaults.paste, ...(options.paste || {}) }
  out.upload = { ...defaults.upload, ...(options.upload || {}) }
  // 只配了一条链路时，不要让另一条继续用默认 mock（否则小文件/大文件会静默拿到 blob: 假地址）
  const explicitNormal = options.uploader !== undefined
  const explicitChunk = options.chunkUploader !== undefined
  if (explicitNormal && !explicitChunk) out.chunkUploader = null // 只配普通上传 → 不启用分片
  if (!explicitNormal && explicitChunk && options.upload?.mode === undefined) out.upload.mode = 'chunk' // 只配分片上传 → 全部走分片
  out.code = { ...defaults.code, ...(options.code || {}) }
  out.markdown = { ...defaults.markdown, ...(options.markdown || {}) }
  out.markdown.insertMode = normalizeInsertMode(out.markdown.insertMode)
  out.markdown.maxSize = Math.max(0, Number(out.markdown.maxSize) || 0)
  out.customButtons = normalizeCustomButtons(options.customButtons)
  if (Array.isArray(options.toolbar)) out.toolbar = options.toolbar
  if (options.toolbar === false) out.toolbar = []
  if (options.toolbar === true) out.toolbar = DEFAULT_TOOLBAR
  // 自定义按钮按 position 摆进工具栏；toolbar 里已写过的名字以用户摆放的位置为准
  if (out.customButtons.length && options.toolbar !== false) {
    out.toolbar = placeCustomNames(out.toolbar, out.customButtons)
  }
  out.height = normalizeHeight(out.height)
  out.paperWidth = clamp(Number(out.paperWidth) || defaults.paperWidth, 200, 8000)
  out.paperMode = out.paperMode === 'fixed' ? 'fixed' : 'fluid'
  out.paperGap = Number.isFinite(Number(out.paperGap)) ? clamp(Number(out.paperGap), 0, 600) : defaults.paperGap
  out.paperMaxWidth = Math.max(0, Number(out.paperMaxWidth) || 0)
  return out
}

/** 工具栏数组里的「按钮」项（排除分隔符与尾区标记） */
const isButtonItem = (key) => key !== '|' && key !== ':tail'

/** 把自定义按钮按 position 插进 toolbar 数组 */
function placeCustomNames(items, specs) {
  const out = [...items]
  const loose = []
  for (const spec of specs) {
    if (out.includes(spec.name)) continue
    if (spec.position == null) { loose.push(spec.name); continue }
    out.splice(arrIndexOf(out, spec.position), 0, spec.name)
  }
  if (loose.length) out.splice(arrIndexOf(out, null), 0, '|', ...loose) // 无位置：主区末尾加一段
  return out
}

/** 位置描述 → toolbar 数组插入下标（找不到锚点时回退主区末尾） */
function arrIndexOf(items, where) {
  const mainEnd = (() => {
    const at = items.indexOf(':tail')
    return at < 0 ? items.length : at
  })()
  if (where == null || where === 'end') return mainEnd
  if (where === 'start') return 0
  if (where === 'tail') return items.length
  if (typeof where === 'number') {
    let seen = 0
    for (let i = 0; i < items.length; i++) {
      if (!isButtonItem(items[i])) continue
      if (seen === Math.max(0, Math.floor(where))) return i
      seen++
    }
    return mainEnd
  }
  const after = !!(where && typeof where === 'object' && where.after)
  const name = String(typeof where === 'string' ? where : (after ? where.after : where.before) || '')
  const at = items.indexOf(name)
  if (at < 0) return mainEnd
  return after ? at + 1 : at
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
export function exportHtml(html, { keepHighlight = false } = {}) {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const root = doc.body.firstChild
  root.querySelectorAll('[contenteditable]').forEach((n) => n.removeAttribute('contenteditable'))
  root.querySelectorAll('[data-k-id]').forEach((n) => n.removeAttribute('data-k-id'))
  root.querySelectorAll('[data-k-state]').forEach((n) => n.removeAttribute('data-k-state'))
  root.querySelectorAll('[data-ke-marker]').forEach((n) => n.removeAttribute('data-ke-marker'))
  root.querySelectorAll('[data-placeholder]').forEach((n) => n.removeAttribute('data-placeholder'))
  root.querySelectorAll('.ke-is-selected-media').forEach((n) => n.classList.remove('ke-is-selected-media'))
  // 语法高亮只用于编辑与预览视图：导出时还原为纯代码，只留 data-k-lang 与 class="language-x"
  if (!keepHighlight) stripHighlight(root)
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
