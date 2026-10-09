/** 工具栏：声明式配置，可整体替换或裁剪（options.toolbar） */
import { h } from '../core/utils.js'
import { icon } from '../core/icons.js'
import { colorPanel, headingPanel, fontSizePanel, tablePanel, linkPanel, mediaPanel, normalizeUrl } from '../ui/popover.js'

const CARET = '<svg class="ke-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>'

/** 首次引导：告知工具栏可左右滑动（localStorage 记忆，不重复打扰） */
const SCROLL_HINT_KEY = 'keditor.toolbarScrollHint'
const SCROLL_HINT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7 4 12l4 5"/><path d="M16 7l4 5-4 5"/><path d="M4 12h16"/></svg>'

/** 段落样式：label 是名称，desc 说明用途与字号，sample 用真实样式预览 */
export const HEADINGS = [
  { value: 'p', label: '正文', desc: '默认段落 · 17px，正文内容都用它', sample: '正文示例文字', sampleClass: 's-body' },
  { value: 'h1', label: '标题一', desc: '大标题 · 22px 加粗，全文主标题（建议只用一次）', sample: '标题一示例', sampleClass: 's-h1' },
  { value: 'h2', label: '标题二', desc: '章节标题 · 20px 加粗，划分小节', sample: '标题二示例', sampleClass: 's-h2' },
  { value: 'h3', label: '标题三', desc: '小标题 · 18px 加粗，章节内的层级', sample: '标题三示例', sampleClass: 's-h3' },
]
const FONT_SIZES = [12, 14, 15, 16, 17, 18, 20, 22, 24, 28, 32]

export const DEFAULT_TOOLBAR = [
  'undo', 'redo', '|',
  'heading', 'fontsize', '|',
  'bold', 'italic', 'underline', 'strike', '|',
  'foreColor', 'backColor', '|',
  'alignLeft', 'alignCenter', 'alignRight', 'alignJustify', '|',
  'ul', 'ol', 'quote', '|',
  'link', 'image', 'video', 'table', 'code', 'hr', 'clear',
  ':tail', 'source', 'preview', 'fullscreen',
]

const ITEMS = {
  undo: { icon: 'undo', title: '撤销 (⌘/Ctrl+Z)', run: (e) => e.undo(), active: (s) => !!s.canUndo, enabled: (s) => s.canUndo },
  redo: { icon: 'redo', title: '重做 (⌘/Ctrl+Shift+Z)', run: (e) => e.redo(), active: (s) => !!s.canRedo, enabled: (s) => s.canRedo },
  bold: { glyph: ['B', 'ke-glyph'], title: '加粗 (⌘/Ctrl+B)', cmd: 'bold', active: (s) => s.bold },
  italic: { glyph: ['I', 'ke-glyph ke-glyph-i'], title: '斜体 (⌘/Ctrl+I)', cmd: 'italic', active: (s) => s.italic },
  underline: { glyph: ['U', 'ke-glyph ke-glyph-u'], title: '下划线 (⌘/Ctrl+U)', cmd: 'underline', active: (s) => s.underline },
  strike: { glyph: ['S', 'ke-glyph ke-glyph-s'], title: '删除线', cmd: 'strike', active: (s) => s.strikeThrough },
  alignLeft: { icon: 'alignLeft', title: '左对齐', run: (e) => e.commands.setAlign('left'), active: (s) => s.align === 'left' },
  alignCenter: { icon: 'alignCenter', title: '居中', run: (e) => e.commands.setAlign('center'), active: (s) => s.align === 'center' },
  alignRight: { icon: 'alignRight', title: '右对齐', run: (e) => e.commands.setAlign('right'), active: (s) => s.align === 'right' },
  alignJustify: { icon: 'alignJustify', title: '两端对齐', run: (e) => e.commands.setAlign('justify'), active: (s) => s.align === 'justify' },
  ul: { icon: 'ul', title: '无序列表', run: (e) => e.commands.toggleList('unordered'), active: (s) => s.ul },
  ol: { icon: 'ol', title: '有序列表', run: (e) => e.commands.toggleList('ordered'), active: (s) => s.ol },
  quote: { icon: 'quote', title: '引用', run: (e) => e.commands.toggleBlockquote(), active: (s) => s.block === 'blockquote' },
  link: { icon: 'link', title: '插入链接', run: (e) => e.toolbar.openLink(), active: (s) => s.link, toggles: true },
  image: { icon: 'image', title: '图片（本地上传 / 网络链接）', run: (e) => e.toolbar.openMedia('image'), toggles: true },
  video: { icon: 'video', title: '视频（本地上传 / 网络链接，支持分片上传）', run: (e) => e.toolbar.openMedia('video'), toggles: true },
  table: { icon: 'table', title: '插入表格', run: (e) => e.toolbar.openTable(), toggles: true },
  code: { icon: 'code', title: '代码块', run: (e) => e.commands.insertCodeBlock() },
  hr: { icon: 'hr', title: '分割线', run: (e) => e.commands.insertDivider() },
  clear: { icon: 'clear', title: '清除格式', run: (e) => e.commands.clearFormat() },
  source: { icon: 'source', title: '查看 / 编辑 HTML 源码（⌘/Ctrl+Shift+K）', text: '源码', run: (e) => e.toggleSource(), active: (s) => s.source },
  preview: { icon: 'preview', title: '预览效果（手机 / 平板 / 电脑宽度）', text: '预览', run: (e) => e.togglePreview(), active: (s) => s.preview },
  fullscreen: { icon: 'expand', title: '全屏编辑', text: '全屏', run: (e) => e.toggleFullscreen(), active: (s) => s.fullscreen },
  foreColor: { pop: 'fore', title: '字体颜色', toggles: true, swatch: 'fore' },
  backColor: { pop: 'back', title: '背景高亮色', toggles: true, swatch: 'back' },
}

export class Toolbar {
  constructor(editor, items = DEFAULT_TOOLBAR) {
    this.editor = editor
    this.buttons = new Map()
    this.colorState = { foreColor: '#3f3f3f', backColor: '#f6c344' }
    this.recent = { foreColor: [], backColor: [] }
    this.el = editor.tbEl
    this.build(items)
    this.setupScrollHints()
  }

  build(items) {
    const group = h('div.ke-tb-group')
    this.el.appendChild(group)
    let tail = null
    const target = () => tail || group
    for (const key of items) {
      if (key === '|') {
        group.appendChild(h('span.ke-tb-sep'))
        continue
      }
      if (key === ':tail') {
        tail = h('div.ke-tb-tail')
        this.el.appendChild(tail)
        continue
      }
      if (key === 'heading') {
        target().appendChild(this.buildHeading())
        continue
      }
      if (key === 'fontsize') {
        target().appendChild(this.buildFontSize())
        continue
      }
      const spec = ITEMS[key]
      if (!spec) continue
      target().appendChild(this.buildButton(key, spec))
    }
  }

  buildButton(name, spec) {
    const button = h('button.ke-btn', {
      type: 'button',
      title: spec.title,
      'data-k-item': name,
      onclick: (event) => {
        event.preventDefault()
        if (spec.pop) this.toggleColor(name, button)
        else if (spec.cmd) this.editor.commands.toggleMark(spec.cmd)
        else spec.run?.(this.editor)
        if (!spec.toggles) this.editor.popover.close()
      },
    })
    if (spec.icon) button.innerHTML = icon(spec.icon)
    if (spec.text) button.appendChild(h('span.ke-btn-text', { text: spec.text }))
    if (spec.glyph) {
      const [text, cls] = spec.glyph
      button.appendChild(h('span', { class: cls, text }))
    }
    if (spec.swatch) {
      // 经典「A + 色条」（字体色）/「A + 高亮块」（底色），一眼可辨
      const color = spec.swatch === 'fore' ? this.colorState.foreColor : this.colorState.backColor
      const face = h('span', { class: spec.swatch === 'fore' ? 'ke-glyph ke-glyph-a' : 'ke-glyph ke-glyph-a ke-glyph-hl' })
      face.appendChild(h('span', { text: 'A' }))
      button.appendChild(face)
      if (spec.swatch === 'fore') button.appendChild(h('span', { class: 'ke-dot' }))
      this.paintButton(button, spec.swatch, color)
      button.dataset.kPop = spec.swatch === 'fore' ? 'foreColor' : 'backColor'
    }
    if (spec.toggles && !spec.swatch) button.dataset.kPop = name
    this.buttons.set(name, button)
    return button
  }

  paintButton(button, kind, color) {
    if (!button || !color) return
    button.style.setProperty(kind === 'fore' ? '--ke-fore' : '--ke-back', color)
  }

  /* ---------------- 下拉面板 ---------------- */

  openPop(anchor, builder, options = {}) {
    this.editor.saveSelection()
    this.editor.popover.open(anchor, builder, {
      align: 'start',
      ...options,
      onClose: () => {
        anchor.classList.remove('ke-is-open')
        options.onClose?.()
      },
    })
    anchor.classList.add('ke-is-open')
  }

  /** 同一个按钮再次点击 = 关闭；颜色按钮点击直接展开面板 */
  togglePop(name, button, builder, options = {}) {
    const pop = this.editor.popover
    if (pop.isOpen && pop.anchor === button) {
      pop.close()
      return
    }
    this.openPop(button, builder, options)
  }

  buildHeading() {
    const current = HEADINGS[0]
    const button = h('button.ke-btn.ke-btn-label', {
      type: 'button',
      title: '段落样式：正文 / 标题一 / 标题二 / 标题三',
      'data-k-item': 'heading',
      dataset: { kPop: 'heading' },
      onclick: (event) => {
        event.preventDefault()
        this.togglePop('heading', button, () =>
          headingPanel(HEADINGS, {
            value: this.editor.getState().block,
            onPick: (value) => {
              this.editor.restoreSelection()
              this.editor.commands.setHeading(value)
              this.editor.popover.close()
              this.editor.refresh()
            },
          }))
      },
    })
    button.innerHTML = `<span class="ke-btn-text">${current.label}</span>${CARET}`
    this.headingEl = button
    this.buttons.set('heading', button)
    return button
  }

  buildFontSize() {
    const button = h('button.ke-btn.ke-btn-label', {
      type: 'button',
      title: '字号',
      'data-k-item': 'fontsize',
      dataset: { kPop: 'fontsize' },
      onclick: (event) => {
        event.preventDefault()
        this.togglePop('fontsize', button, () =>
          fontSizePanel(FONT_SIZES, {
            value: this.editor.getState().fontSize,
            onPick: (size) => {
              this.editor.restoreSelection()
              this.editor.commands.setFontSize(Number(size))
              this.editor.popover.close()
              this.editor.refresh()
            },
          }))
      },
    })
    button.innerHTML = `<span class="ke-btn-text">字号</span>${CARET}`
    this.fontSizeEl = button
    this.buttons.set('fontsize', button)
    return button
  }

  toggleColor(name, button) {
    const kind = name === 'foreColor' ? 'fore' : 'back'
    this.togglePop(name, button, () =>
      colorPanel({
        title: kind === 'fore' ? '字体颜色' : '背景高亮色',
        kind,
        value: this.colorState[name],
        recents: this.recent[name],
        onPick: (color) => this.applyColor(name, kind, color, button),
        onClear: () => this.applyColor(name, kind, null, button),
      }),
      {
        onClose: () => button.classList.remove('ke-is-active'),
      },
    )
  }

  applyColor(name, kind, color, button) {
    this.editor.restoreSelection()
    const value = color || (kind === 'fore' ? '#3f3f3f' : 'transparent')
    if (color) {
      this.colorState[name] = color
      this.recent[name] = [color, ...this.recent[name].filter((x) => x.toLowerCase() !== color.toLowerCase())].slice(0, 8)
      this.paintButton(button, kind, color)
    }
    this.editor.commands.setColor(kind, color)
    this.editor.popover.close()
  }

  openTable() {
    const button = this.buttons.get('table')
    this.togglePop('table', button, () =>
      tablePanel((cols, rows) => {
        this.editor.restoreSelection()
        this.editor.commands.insertTable(cols, rows)
        this.editor.popover.close()
      }))
  }

  openLink() {
    const button = this.buttons.get('link')
    const state = this.editor.getState()
    const existing = state.linkUrl
    this.togglePop('link', button, () =>
      linkPanel({
        url: existing || '',
        text: existing ? '' : state.selectionText || '',
        target: existing ? state.linkTarget : true,
        onCancel: () => this.editor.popover.close(),
        onRemove: existing ? () => { this.editor.restoreSelection(); this.editor.commands.removeLink(); this.editor.popover.close() } : null,
        onSubmit: ({ url, text, target }) => {
          this.editor.restoreSelection()
          this.editor.commands.createLink({ url: normalizeUrl(url), text, target })
          this.editor.popover.close()
        },
      }))
  }

  /** 图片 / 视频：本地上传 + 网络链接输入 */
  openMedia(kind) {
    const button = this.buttons.get(kind)
    const editor = this.editor
    const options = editor.options
    this.togglePop(kind, button, () =>
      mediaPanel(kind, {
        multiple: kind === 'image',
        maxText: `${kind === 'image' ? '图片' : '视频'}上限 ${formatLimit(kind === 'image' ? options.maxImageSize : options.maxVideoSize)}`,
        hint: kind === 'image' ? '支持 PNG / JPG / GIF / WebP / SVG' : '支持 MP4 / MOV / WebM，大文件自动分片',
        onFiles: (files) => {
          editor.popover.close()
          if (files && files.length) editor.media.addFiles([...files])
          else editor.media.pickFiles(kind)
        },
        onUrl: ({ url, name }) => {
          editor.popover.close()
          editor.restoreSelection()
          editor.media.insertFromUrl(kind, url, name)
        },
      }))
  }

  /** 根据编辑器状态同步按钮高亮 / 下拉值 / 禁用 */
  refresh(state) {
    for (const [name, button] of this.buttons) {
      const spec = ITEMS[name]
      if (!spec) continue
      const active = spec.active?.(state) || false
      if (button.dataset.kPop || !spec.pop) button.classList.toggle('ke-is-active', active)
      if (spec.enabled) button.disabled = !spec.enabled(state)
    }
    if (this.headingEl) {
      const match = HEADINGS.find((x) => x.value === state.block)
      const label = this.headingEl.querySelector('.ke-btn-text')
      if (label) label.textContent = match ? match.label : '正文'
      this.headingEl.title = match ? `${match.label}：${match.desc}` : '段落样式'
    }
    if (this.fontSizeEl) {
      const label = this.fontSizeEl.querySelector('.ke-btn-text')
      if (label) label.textContent = state.fontSize ? `${state.fontSize}px` : '字号'
    }
    if (state.linkUrl) {
      const btn = this.buttons.get('link')
      btn?.classList.add('ke-is-active')
    }
  }

  /* ---------------- 可滑动提示 ---------------- */

  /**
   * 工具栏溢出时给出四重可发现性提示：
   * 常显滚动条（CSS）、右侧被遮工具的动态阴影、左侧渐隐、鼠标拖拽，
   * 外加首次加载的引导气泡。
   */
  setupScrollHints() {
    const tb = this.el
    const host = this.editor.el
    if (!tb.isConnected) return // hideToolbar：未挂载则无需提示

    // 渐隐层挂在 .ke 上（不随工具栏内容滚动）
    this.scrollFades = h('div.ke-tb-fades', { 'aria-hidden': 'true' }, [h('i.ke-tb-fade ke-tb-fade-l')])
    tb.insertAdjacentElement('afterend', this.scrollFades)

    this.syncScrollHints = () => {
      if (!tb.isConnected || !host.isConnected) return
      const max = tb.scrollWidth - tb.clientWidth
      const overflow = max > 1
      const left = tb.scrollLeft
      host.classList.toggle('ke-tb-scrollable', overflow)
      host.classList.toggle('ke-tb-can-l', overflow && left > 1)
      host.classList.toggle('ke-tb-can-r', overflow && left < max - 1)
      host.style.setProperty('--ke-tb-h', `${tb.offsetHeight}px`)
      if (overflow && !this.hintSettled) this.showScrollHint()
    }

    this.onTbScroll = () => {
      this.syncScrollHints()
      this.hideScrollHint()
    }
    tb.addEventListener('scroll', this.onTbScroll, { passive: true })

    if (typeof ResizeObserver !== 'undefined') {
      this.tbRO = new ResizeObserver(() => this.syncScrollHints())
      this.tbRO.observe(tb)
    }

    this.onTbPointerDown = (event) => {
      this.hideScrollHint()
      this.startDragScroll(event)
    }
    tb.addEventListener('pointerdown', this.onTbPointerDown)

    requestAnimationFrame(this.syncScrollHints)
  }

  /** 鼠标按住拖动平移工具栏（触屏已有原生滑动，不介入） */
  startDragScroll(event) {
    const tb = this.el
    const host = this.editor.el
    if (event.button !== 0 || event.pointerType !== 'mouse') return
    if (tb.scrollWidth <= tb.clientWidth + 1) return
    if (event.target.closest('input, textarea, select')) return

    const startX = event.clientX
    const startLeft = tb.scrollLeft
    let dragging = false

    const move = (ev) => {
      const dx = ev.clientX - startX
      if (!dragging) {
        if (Math.abs(dx) < 5) return // 小于阈值视为点击，不抢走按钮交互
        dragging = true
        try { tb.setPointerCapture(event.pointerId) } catch { /* 忽略 */ }
        host.classList.add('ke-tb-dragging')
        this.editor.popover?.close() // 面板定位会随滚动错位，拖拽时先关闭
      }
      ev.preventDefault()
      tb.scrollLeft = startLeft - dx
    }

    const up = () => {
      tb.removeEventListener('pointermove', move)
      tb.removeEventListener('pointerup', up)
      tb.removeEventListener('pointercancel', up)
      host.classList.remove('ke-tb-dragging')
      if (!dragging) return
      try { tb.releasePointerCapture(event.pointerId) } catch { /* 已释放 */ }
      // 吞掉拖拽结束时落下的那一次 click，避免误触发按钮
      const stop = (ev) => { ev.preventDefault(); ev.stopPropagation(); release() }
      const release = () => {
        clearTimeout(fallback)
        tb.removeEventListener('click', stop, true)
      }
      const fallback = setTimeout(release, 400)
      tb.addEventListener('click', stop, true)
    }

    tb.addEventListener('pointermove', move)
    tb.addEventListener('pointerup', up)
    tb.addEventListener('pointercancel', up)
  }

  showScrollHint() {
    this.hintSettled = true // 每个实例只尝试一次，避免 resize 反复弹
    let seen = false
    try { seen = localStorage.getItem(SCROLL_HINT_KEY) === '1' } catch { /* 隐私模式忽略 */ }
    if (seen) return
    this.hintEl = h('div.ke-tb-hint', { 'aria-hidden': 'true' }, [
      h('span.ke-tb-hint-ico', { html: SCROLL_HINT_ICON }),
      h('span', { text: '工具栏可左右滑动' }),
    ])
    this.editor.el.appendChild(this.hintEl)
    this.hintTimer = setTimeout(() => this.hideScrollHint(), 3800)
  }

  hideScrollHint() {
    if (this.hintTimer) { clearTimeout(this.hintTimer); this.hintTimer = null }
    const pill = this.hintEl
    if (!pill) return
    this.hintEl = null
    try { localStorage.setItem(SCROLL_HINT_KEY, '1') } catch { /* 忽略 */ }
    pill.classList.add('ke-is-out')
    setTimeout(() => pill.remove(), 260)
  }

  destroy() {
    const tb = this.el
    if (this.tbRO) { this.tbRO.disconnect(); this.tbRO = null }
    if (this.hintTimer) { clearTimeout(this.hintTimer); this.hintTimer = null }
    if (this.onTbScroll) tb.removeEventListener('scroll', this.onTbScroll)
    if (this.onTbPointerDown) tb.removeEventListener('pointerdown', this.onTbPointerDown)
    this.scrollFades?.remove()
    this.hintEl?.remove()
    this.scrollFades = null
    this.hintEl = null
    const host = this.editor?.el
    if (host) {
      host.classList.remove('ke-tb-scrollable', 'ke-tb-can-l', 'ke-tb-can-r', 'ke-tb-dragging')
      host.style.removeProperty('--ke-tb-h')
    }
    tb.innerHTML = ''
    this.buttons.clear()
  }
}

function formatLimit(bytes) {
  if (!bytes) return '不限'
  const mb = bytes / 1024 / 1024
  return mb >= 1 ? `${Math.round(mb)}MB` : `${Math.round(bytes / 1024)}KB`
}
