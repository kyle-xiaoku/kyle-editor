/** 工具栏：声明式配置，可整体替换或裁剪（options.toolbar），支持自定义下拉按钮（options.customButtons） */
import { h, formatSize } from '../core/utils.js'
import { icon } from '../core/icons.js'
import { colorPanel, headingPanel, fontSizePanel, tablePanel, linkPanel, mediaPanel, selectPanel, codePanel, markdownPanel, normalizeUrl } from '../ui/popover.js'
import { codeBlockAt, languageOf } from './code.js'
import { markdownToHtml, markdownSummary, MARKDOWN_ACCEPT, normalizeInsertMode } from './markdown.js'
import {
  normalizeCustomButton,
  normalizePosition,
  createButtonRuntime,
  loadItems,
  setRuntimeItems,
  abortRuntime,
  applySelection,
  resolveLink,
} from './custom-button.js'

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
  ':tail', 'markdown', 'source', 'fullscreen',
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
  code: { icon: 'code', title: '代码块（选择语言并语法高亮）', run: (e) => e.toolbar.openCode(), active: (s) => s.inCode, toggles: true },
  markdown: { icon: 'markdown', text: '导入MD', title: '导入 Markdown 文件 / 粘贴 Markdown 文本，转为 HTML 显示（.md / .txt）', run: (e) => e.toolbar.openMarkdown(), toggles: true },
  hr: { icon: 'hr', title: '分割线', run: (e) => e.commands.insertDivider() },
  clear: { icon: 'clear', title: '清除格式', run: (e) => e.commands.clearFormat() },
  source: { icon: 'source', title: '查看 / 编辑 HTML 源码（⌘/Ctrl+Shift+K）', text: '源码', run: (e) => e.toggleSource(), active: (s) => s.source },
  preview: { icon: 'preview', title: '预览效果（手机 / 平板 / 电脑宽度）', text: '预览', run: (e) => e.togglePreview(), active: (s) => s.preview }, // 默认工具栏已不包含，可用 toolbar / position 显式摆放
  fullscreen: { icon: 'expand', title: '全屏编辑', text: '全屏', run: (e) => e.toggleFullscreen(), active: (s) => s.fullscreen },
  foreColor: { pop: 'fore', title: '字体颜色', toggles: true, swatch: 'fore' },
  backColor: { pop: 'back', title: '背景高亮色', toggles: true, swatch: 'back' },
}

export class Toolbar {
  constructor(editor, items = DEFAULT_TOOLBAR, customButtons = []) {
    this.editor = editor
    this.buttons = new Map()
    /** 自定义按钮：name -> {spec, rt, button} */
    this.custom = new Map()
    this.colorState = { foreColor: '#3f3f3f', backColor: '#f6c344' }
    this.recent = { foreColor: [], backColor: [] }
    this.el = editor.tbEl
    for (const spec of customButtons) this.registerCustom(spec)
    this.build(items)
    this.setupScrollHints()
  }

  build(items) {
    const group = h('div.ke-tb-group')
    this.el.appendChild(group)
    this.groupEl = group
    this.tailEl = null
    const target = () => this.tailEl || group
    for (const key of items) {
      if (key === '|') {
        target().appendChild(h('span.ke-tb-sep'))
        continue
      }
      if (key === ':tail') {
        this.tailEl = h('div.ke-tb-tail')
        this.el.appendChild(this.tailEl)
        continue
      }
      if (this.custom.has(key)) {
        const entry = this.custom.get(key)
        entry.button = this.buildCustomButton(entry)
        target().appendChild(entry.button)
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
    // toolbar 数组里没列到的自定义按钮：按 position 补位（配置漏写 / 外部直接 new Toolbar 时的兜底）
    for (const [name, entry] of this.custom) {
      if (entry.button) continue
      entry.button = this.buildCustomButton(entry)
      this.insertButton(entry.button, entry.spec.position)
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

  /* ---------------- 自定义按钮 ---------------- */

  /** 登记一个自定义按钮规格；统一在此规范化，保证配置与 addButton 两条路径行为一致 */
  registerCustom(raw) {
    const spec = normalizeCustomButton(raw)
    if (!spec) return null
    const prev = this.custom.get(spec.name)
    const entry = { spec, rt: prev ? prev.rt : createButtonRuntime(), button: prev ? prev.button : null }
    this.custom.set(spec.name, entry)
    return entry
  }

  buildCustomButton(entry) {
    const { spec } = entry
    const isSelect = spec.type === 'select'
    const button = h('button.ke-btn', {
      type: 'button',
      class: isSelect ? 'ke-btn-label ke-btn-custom' : 'ke-btn-custom',
      title: spec.title,
      'data-k-item': spec.name,
      dataset: { kPop: spec.name, kCustom: spec.name },
      onclick: (event) => {
        event.preventDefault()
        if (isSelect) this.openCustom(spec.name)
        else this.runCustomButton(spec)
      },
    })
    if (spec.icon) button.innerHTML = /</.test(spec.icon) ? spec.icon : icon(spec.icon)
    if (isSelect) {
      button.appendChild(h('span.ke-btn-text', { text: spec.text || spec.placeholder }))
      button.insertAdjacentHTML('beforeend', CARET)
    } else if (spec.text) {
      button.appendChild(h('span.ke-btn-text', { text: spec.text }))
    }
    this.syncCustomLabel(spec.name, button) // 此时 entry.button 尚未赋值，显式传入
    return button
  }

  /** 按钮文案跟随当前选中项（与段落样式 / 字号按钮一致） */
  syncCustomLabel(name, node) {
    const entry = this.custom.get(name)
    const button = node || entry?.button
    if (!entry || !button) return
    const { spec, rt } = entry
    if (spec.type !== 'select') return
    const label = button.querySelector('.ke-btn-text')
    if (!label) return
    const picked = rt.value
    label.textContent = picked ? picked.label : spec.text || spec.placeholder
    button.title = picked ? `${spec.title}：${picked.label}` : spec.title
    button.classList.toggle('ke-has-value', !!picked)
  }

  /** 打开下拉面板：数据异步加载，带缓存 / 重试 / 搜索 */
  openCustom(name) {
    const entry = this.custom.get(name)
    if (!entry) return
    this.revealButton(entry.button) // 溢出时先滚进可视区，避免面板锚在看不见的按钮上
    const { spec, rt } = entry
    const remote = !!(spec.load || spec.url)
    const fetcher = ({ force } = {}) => loadItems(spec, this.editor, rt, { force })
    this.togglePop(name, entry.button, () =>
      selectPanel({
        title: spec.title,
        note: spec.note || '',
        searchable: spec.searchable,
        width: spec.width,
        remote,
        value: rt.value ? rt.value.value : '',
        emptyText: spec.emptyText,
        load: fetcher,
        reload: fetcher,
        linkOf: (item) => resolveLink(spec, item, this.editor),
        onPick: (item) => this.pickCustom(name, item),
      }))
  }

  async pickCustom(name, item) {
    const entry = this.custom.get(name)
    if (!entry) return
    this.editor.popover.close()
    try {
      await applySelection(this.editor, entry.spec, entry.rt, item)
    } catch (error) {
      this.editor.reportError('custombutton', error)
    }
    this.syncCustomLabel(name)
    this.editor.refresh()
  }

  /** type:'button' 的简单自定义按钮 */
  async runCustomButton(spec) {
    this.editor.popover.close()
    try {
      if (spec.onClick) await spec.onClick({ editor: this.editor, name: spec.name })
      this.editor.emit('customclick', { name: spec.name, editor: this.editor })
    } catch (error) {
      this.editor.reportError('custombutton', error)
    }
    this.editor.refresh()
  }

  /** 运行时新增自定义按钮；位置取 options.at ?? spec.position（默认追加到主分组末尾） */
  addButton(spec, options = {}) {
    const entry = this.registerCustom(spec)
    if (!entry) return null
    if (entry.button) entry.button.remove()
    entry.button = this.buildCustomButton(entry)
    const where = options.at !== undefined ? options.at : (normalizePosition(options) ?? entry.spec.position)
    this.insertButton(entry.button, where, { withSep: where == null })
    this.revealButton(entry.button) // 新按钮可能被 sticky 尾栏遮住，滚进可视区让用户看到
    this.syncScrollHints?.()
    return entry.button
  }

  /** 工具栏内可定位的节点（主区 → 尾区的视觉顺序，不含分隔符） */
  buttonNodes() {
    const list = []
    for (const host of [this.groupEl, this.tailEl]) {
      if (!host) continue
      for (const node of host.children) if (node.dataset && node.dataset.kItem) list.push(node)
    }
    return list
  }

  /** 位置描述 → {parent, ref}，ref 为 null 表示追加到 parent 末尾 */
  slotOf(where) {
    const mainEnd = { parent: this.groupEl || this.el, ref: null }
    if (where === 'tail') return { parent: this.tailEl || this.groupEl || this.el, ref: null }
    if (where == null || where === 'end') return mainEnd
    if (where === 'start') {
      const first = this.buttonNodes()[0]
      return first ? { parent: first.parentElement, ref: first } : mainEnd
    }
    const nodes = this.buttonNodes()
    if (typeof where === 'number') {
      const ref = nodes[Math.max(0, Math.floor(where))]
      if (ref) return { parent: ref.parentElement, ref }
      const last = nodes[nodes.length - 1] // 索引越界：追加到最后一个节点所在区域
      return last ? { parent: last.parentElement, ref: null } : mainEnd
    }
    const after = !!(where && typeof where === 'object' && where.after)
    const name = typeof where === 'string' ? where : String((after ? where.after : where.before) || '')
    const anchor = nodes.find((node) => node.dataset.kItem === name)
    if (!anchor) return mainEnd
    return { parent: anchor.parentElement, ref: after ? anchor.nextElementSibling || null : anchor }
  }

  insertButton(button, where, { withSep } = {}) {
    const { parent, ref } = this.slotOf(where)
    if (!parent || !button) return
    if (withSep && !ref) parent.appendChild(h('span.ke-tb-sep'))
    parent.insertBefore(button, ref || null)
  }

  /** 运行时把任意按钮（内置或自定义）移到指定位置 */
  moveButton(name, where) {
    const node = this.buttonNodes().find((item) => item.dataset.kItem === String(name))
    if (!node) return false
    node.remove()
    this.insertButton(node, where === undefined ? this.custom.get(String(name))?.spec.position ?? null : where)
    this.revealButton(node)
    this.syncScrollHints?.()
    return true
  }

  /** 工具栏溢出时把按钮滚进可视区（避开 sticky 尾栏的遮挡） */
  revealButton(button) {
    const tb = this.el
    if (!tb || !button || !button.isConnected) return
    const max = tb.scrollWidth - tb.clientWidth
    if (max <= 1) return
    const tailW = this.tailEl ? this.tailEl.offsetWidth : 0
    const left = button.offsetLeft
    const right = left + button.offsetWidth
    const viewR = tb.scrollLeft + tb.clientWidth - tailW
    if (right > viewR - 4) tb.scrollLeft = Math.min(max, right - tb.clientWidth + tailW + 10)
    else if (left < tb.scrollLeft + 4) tb.scrollLeft = Math.max(0, left - 10)
  }

  /** 移除自定义按钮并中断其未完成的请求 */
  removeButton(name) {
    const entry = this.custom.get(name)
    if (!entry) return false
    abortRuntime(entry.rt)
    if (this.editor.popover.anchor === entry.button) this.editor.popover.close()
    const prev = entry.button?.previousElementSibling
    const next = entry.button?.nextElementSibling
    entry.button?.remove()
    // 顺手清掉随它插入的空隔符，避免留下双分隔线
    if (prev && prev.classList.contains('ke-tb-sep') && (!next || next.classList.contains('ke-tb-sep'))) prev.remove()
    this.buttons.delete(name)
    this.custom.delete(name)
    this.syncScrollHints?.()
    return true
  }

  /** 外部灌入下拉数据（接口在编辑器之外请求时用），并刷新已打开的面板 */
  setButtonOptions(name, items) {
    const entry = this.custom.get(name)
    if (!entry) return null
    const list = setRuntimeItems(entry.rt, items)
    if (this.editor.popover.isOpen && this.editor.popover.anchor === entry.button) {
      this.editor.popover.close()
      this.openCustom(name)
    }
    return list
  }

  /** 读取按钮当前选中项 */
  getButtonValue(name) {
    const entry = this.custom.get(name)
    return entry ? entry.rt.value : null
  }

  setButtonValue(name, value) {
    const entry = this.custom.get(name)
    if (!entry) return null
    const items = entry.rt.items || []
    const match = items.find((item) => String(item.value) === String(value)) || null
    entry.rt.value = match
    this.syncCustomLabel(name)
    return match
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

  /**
   * 代码块：光标不在代码块里 = 选语言后插入；在代码块里 = 换语言并重新高亮
   * （代码块对象在打开面板时就锁定，避免面板抢焦点后选区丢失）
   */
  openCode() {
    const button = this.buttons.get('code')
    const block = codeBlockAt(this.editor.root)
    this.togglePop('code', button, () =>
      codePanel({
        languages: this.editor.codeLanguages(),
        value: block ? languageOf(block) || 'plaintext' : this.editor.lastCodeLang,
        editing: !!block,
        onPick: (lang) => {
          this.editor.lastCodeLang = lang
          this.editor.popover.close()
          this.editor.restoreSelection()
          if (block) this.editor.commands.setCodeLanguage(lang, block)
          else this.editor.commands.insertCodeBlock('', lang)
          this.editor.refresh()
        },
      }))
  }

  /**
   * 打开 Markdown 导入面板：选文件 / 粘贴文本 → 预览 → 按落点导入
   * （转换与落点模式都复用 options.markdown，保证面板与 API 行为一致）
   */
  openMarkdown() {
    const button = this.buttons.get('markdown')
    const editor = this.editor
    const config = editor.options.markdown
    this.togglePop('markdown', button, () =>
      markdownPanel({
        insertMode: normalizeInsertMode(config.insertMode),
        accept: MARKDOWN_ACCEPT,
        maxText: config.maxSize ? `单个文件上限 ${formatSize(config.maxSize)}` : '',
        highlight: editor.options.code.highlight !== false,
        onConvert: (text) => {
          const html = markdownToHtml(text, config)
          return { html, summary: markdownSummary(html) }
        },
        onImport: async ({ text, mode }) => {
          editor.popover.close()
          const result = await editor.importMarkdown(text, { mode })
          return result.ok
        },
      }))
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
    for (const [name, entry] of this.custom) {
      const { spec, button } = entry
      if (!button) continue
      if (spec.active) button.classList.toggle('ke-is-active', !!spec.active(state, this.editor))
      if (spec.enabled) button.disabled = !spec.enabled(state, this.editor)
      if (spec.type === 'select') this.syncCustomLabel(name)
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
    for (const entry of this.custom.values()) abortRuntime(entry.rt) // 中断未完成的接口请求
    this.custom.clear()
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
