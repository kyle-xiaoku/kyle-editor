/** 工具栏弹层：颜色面板、段落样式、字号、表格规格、链接表单、图片/视频插入、Markdown 导入 */
import { h, formatSize } from '../core/utils.js'
import { icon } from '../core/icons.js'
import { readMarkdownFile } from '../core/markdown.js'
import { highlightCodeBlocks } from '../core/code.js'

/* 颜色：分组 + 中文名称，hover 有 tooltip */
const THEME_COLORS = [
  ['#07c160', '微信绿'], ['#2f6fed', '科技蓝'], ['#7c3aed', '极光紫'], ['#d53880', '品红'],
  ['#e53e3e', '中国红'], ['#ed8936', '暮橙'], ['#f6c344', '明黄'], ['#0f766e', '松石绿'],
]
const STANDARD_COLORS = [
  ['#1f2329', '墨黑'], ['#6b7280', '深灰'], ['#b8bec7', '浅灰'], ['#f2f3f5', '云灰'], ['#ffffff', '纯白'],
  ['#c00000', '深红'], ['#ff0000', '正红'], ['#ffc000', '琥珀'],
  ['#ffff00', '柠黄'], ['#00b050', '草绿'], ['#00b0f0', '天蓝'], ['#0070c0', '海蓝'],
  ['#7030a0', '葡萄紫'], ['#ff69b4', '桃花粉'],
]
const BG_COLORS = [
  ['#fef08a', '柠檬底'], ['#dcfce7', '薄荷底'], ['#e0f2fe', '天空底'], ['#ede9fe', '薰衣底'],
  ['#ffe4e6', '樱花底'], ['#fff4e6', '奶茶底'], ['#f2f3f5', '纸张灰'], ['#1f2329', '夜墨'],
]

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

export class Popover {
  constructor(root) {
    this.root = root
    this.el = h('div.ke-pop', { hidden: true })
    this.anchor = null
    this.onClose = null
    root.appendChild(this.el)
    // 面板内的非输入控件不应抢焦点 / 破坏正文选区
    this.el.addEventListener('mousedown', (event) => {
      if (!/^(input|textarea|select)$/i.test(event.target.tagName)) event.preventDefault()
    })
    this.docHandler = (event) => {
      if (this.el.hidden) return
      if (this.el.contains(event.target)) return
      if (event.target.closest?.('.ke-btn[data-k-pop]')) return // 由按钮自身负责开合
      this.close()
    }
    document.addEventListener('mousedown', this.docHandler, true)
    this.keyHandler = (event) => {
      if (event.key === 'Escape') this.close()
    }
    document.addEventListener('keydown', this.keyHandler)
    // 视口尺寸变化后重新夹紧（否则窗口变大时面板还维持旧的高度上限）
    this.resizeHandler = () => {
      if (!this.el.hidden) this.place()
    }
    window.addEventListener('resize', this.resizeHandler)
  }

  open(anchor, build, { align = 'start', onClose } = {}) {
    this.el.textContent = ''
    const content = build((node) => this.el.appendChild(node))
    if (content) this.el.appendChild(content)
    this.el.hidden = false
    this.anchor = anchor
    this.align = align
    this.onClose = onClose
    this.place()
    // 重新触发一次入场动画
    this.el.classList.remove('ke-pop-in')
    void this.el.offsetWidth
    this.el.classList.add('ke-pop-in')
    const first = [...this.el.querySelectorAll('[data-k-autofocus]')].find((node) => node.offsetParent !== null)
    first?.focus?.()
  }

  /** 定位 + 高度夹紧：面板可以内部滚动，但底部按钮必须留在可视区内 */
  place() {
    const anchor = this.anchor
    if (!anchor) return
    this.el.style.removeProperty('--ke-pop-max')
    const align = this.align
    const rootBox = this.root.getBoundingClientRect()
    const box = anchor.getBoundingClientRect()
    // 可视带：自适应高度时 root 比视口高得多，按 root 高度判断会永不翻转
    const visTop = Math.max(0, -rootBox.top)
    const visBottom = Math.min(rootBox.height, window.innerHeight - rootBox.top)
    // 先渲染再定位，宽度依赖内容
    const popBox = this.el.getBoundingClientRect()
    let left = box.left - rootBox.left
    if (align === 'center') left = box.left - rootBox.left + box.width / 2 - popBox.width / 2
    if (align === 'end') left = box.right - rootBox.left - popBox.width
    left = Math.max(8, Math.min(left, rootBox.width - popBox.width - 8))
    const below = box.top - rootBox.top + box.height + 8
    const aboveTop = box.top - rootBox.top - 8
    const band = Math.max(0, visBottom - visTop - 16)
    const roomBelow = visBottom - 8 - below
    const roomAbove = aboveTop - visTop
    // 下方空间足够（≥320）优先贴按钮下方；否则整条可视带，避免面板被压得太矮
    const room = roomBelow >= 320 ? Math.min(roomBelow, band) : band
    const height = Math.max(180, Math.min(popBox.height, room))
    if (height < popBox.height) this.el.style.setProperty('--ke-pop-max', `${Math.round(height)}px`)
    let top
    if (height <= roomBelow) top = below
    else if (roomAbove > roomBelow && height <= roomAbove) top = aboveTop - height
    else top = visBottom - 8 - height
    top = Math.max(visTop, Math.min(top, Math.max(visTop, visBottom - 8 - height)))
    this.el.style.left = `${left}px`
    this.el.style.top = `${top}px`
  }

  close() {
    if (this.el.hidden) return
    this.el.hidden = true
    this.el.classList.remove('ke-pop-in')
    this.el.textContent = ''
    this.anchor = null
    const cb = this.onClose
    this.onClose = null
    cb?.()
  }

  get isOpen() {
    return !this.el.hidden
  }

  destroy() {
    document.removeEventListener('mousedown', this.docHandler, true)
    document.removeEventListener('keydown', this.keyHandler)
    window.removeEventListener('resize', this.resizeHandler)
    this.el.remove()
  }
}

/* ---------------------------- 面板骨架 ---------------------------- */

function panel(title, right) {
  const head = h('div.ke-panel-head', {}, [h('span.ke-panel-title', { text: title })])
  if (right) head.appendChild(right)
  const wrap = h('div.ke-panel', {}, [head])
  return wrap
}

function section(label) {
  return h('div.ke-panel-sect', { text: label })
}

function divider() {
  return h('div.ke-panel-divider')
}

/* ---------------------------- 代码块语言面板 ---------------------------- */

/** 语言选择：列表可搜索，回车选第一项；已选语言带勾选态 */
export function codePanel({ languages, value, editing, onPick }) {
  const wrap = panel(editing ? '代码块语言' : '插入代码块')
  wrap.classList.add('ke-panel-wide', 'ke-code-panel')
  const note = h('span.ke-panel-note')
  wrap.querySelector('.ke-panel-head').appendChild(note)

  const search = h('input.ke-input.ke-sel-search', {
    type: 'search',
    placeholder: '搜索语言，如 js / python',
    'data-k-autofocus': '',
  })
  wrap.appendChild(search)
  const body = h('div.ke-code-list')
  wrap.appendChild(body)
  wrap.appendChild(h('div.ke-panel-hint', {
    text: editing ? '切换后会立即重新高亮当前代码块' : '插入后点「代码块」按钮可随时切换语言',
  }))

  let visible = languages

  function render() {
    const keyword = search.value.trim().toLowerCase()
    visible = keyword
      ? languages.filter((item) => `${item.label} ${item.hint} ${item.value}`.toLowerCase().includes(keyword))
      : languages
    note.textContent = keyword ? `${visible.length} / ${languages.length} 种` : `${languages.length} 种语言`
    body.textContent = ''
    if (!visible.length) {
      body.appendChild(h('div.ke-sel-tip', {}, [h('span.ke-sel-tip-text', { text: `没有匹配「${search.value.trim()}」的语言` })]))
      return
    }
    visible.forEach((item) => {
      const row = h('button.ke-sel-row', {
        type: 'button',
        dataset: { kLang: item.value },
        onclick: () => onPick(item.value),
      }, [
        h('span.ke-sel-main', {}, [
          h('span.ke-sel-label', { text: item.label }),
          h('span.ke-sel-desc', { text: item.hint }),
        ]),
      ])
      if (item.value === value) {
        row.classList.add('ke-is-active')
        row.appendChild(h('span.ke-sel-check', { html: icon('check') }))
      }
      body.appendChild(row)
    })
  }

  search.addEventListener('input', render)
  search.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    if (visible.length) onPick(visible[0].value)
  })
  render()
  return wrap
}

/* ---------------------------- Markdown 导入面板 ---------------------------- */

/**
 * Markdown 导入：选文件 / 粘贴文本 → 预览 → 按落点导入
 * @param {{ insertMode?:string, accept?:string, maxText?:string, highlight?:boolean,
 *           onConvert:(text:string)=>{html:string,summary:object},
 *           onImport:(payload:{text:string,name:string,mode:string})=>Promise<boolean>|boolean }} config
 */
export function markdownPanel({ insertMode = 'replace', accept = '', maxText = '', highlight = true, onConvert, onImport }) {
  const wrap = panel('导入 Markdown')
  wrap.classList.add('ke-panel-wide', 'ke-md-panel')
  const note = h('span.ke-panel-note', { text: '尚未选择文件' })
  wrap.querySelector('.ke-panel-head').appendChild(note)

  const state = { text: '', name: '', mode: insertMode, picked: false }

  /* —— 顶部页签 —— */
  const local = h('div.ke-tab-body')
  const pasteBody = h('div.ke-tab-body', { hidden: true })
  const tabs = h('div.ke-tabs', {}, [
    h('button.ke-tab', { type: 'button', text: '选择文件' }),
    h('button.ke-tab', { type: 'button', text: '粘贴文本' }),
  ])
  const show = (index) => {
    ;[...tabs.children].forEach((tab, i) => tab.classList.toggle('ke-is-active', i === index))
    local.hidden = index !== 0
    pasteBody.hidden = index !== 1
    if (index === 1) textarea.focus()
  }
  tabs.children[0].addEventListener('click', () => show(0))
  tabs.children[1].addEventListener('click', () => show(1))

  /* —— 选文件 —— */
  const input = h('input', { type: 'file', accept, hidden: true, style: { display: 'none' } })
  const fileRow = h('div.ke-md-file', { hidden: true })
  const drop = h('div.ke-drop', {}, [
    h('span.ke-drop-ico', { html: icon('upload') }),
    h('div.ke-drop-title', { text: '点击选择 .md 文件，或拖拽到此处' }),
    h('div.ke-drop-sub', { text: [maxText, '支持 .md / .markdown / .txt，自动识别 UTF-8 与 GBK'].filter(Boolean).join(' · ') }),
  ])
  drop.addEventListener('click', () => input.click())
  drop.addEventListener('dragover', (event) => {
    event.preventDefault()
    drop.classList.add('ke-is-over')
  })
  drop.addEventListener('dragleave', () => drop.classList.remove('ke-is-over'))
  drop.addEventListener('drop', (event) => {
    event.preventDefault()
    drop.classList.remove('ke-is-over')
    const file = event.dataTransfer?.files?.[0]
    if (file) loadFile(file)
  })
  input.addEventListener('change', () => {
    const file = input.files?.[0]
    input.value = ''
    if (file) loadFile(file)
  })

  async function loadFile(file) {
    try {
      const text = await readMarkdownFile(file)
      state.text = text
      state.name = file.name || ''
      state.picked = true
      fileRow.hidden = false
      fileRow.textContent = ''
      fileRow.append(
        h('b', { text: file.name || '未命名' }),
        h('span', { text: `${formatSize(file.size)} · ${text.length} 字符` }),
      )
      schedule()
    } catch (error) {
      state.text = ''
      fileRow.hidden = false
      fileRow.textContent = ''
      fileRow.appendChild(h('span.ke-md-error', { text: `读取失败：${error.message}` }))
      render()
    }
  }
  local.append(drop, input, fileRow)

  /* —— 粘贴文本 —— */
  const textarea = h('textarea.ke-md-text', {
    placeholder: '# 标题\n\n正文段落，支持 **加粗**、列表、表格、```js 代码块 ...',
    spellcheck: 'false',
  })
  pasteBody.appendChild(textarea)

  /* —— 落点模式 —— */
  const MODES = [
    ['replace', '替换全文'],
    ['append', '追加文末'],
    ['cursor', '插入光标'],
  ]
  const modeRow = h('div.ke-md-modes')
  const modeText = { replace: '清空正文后导入（可撤销）', append: '保留正文，追加到末尾', cursor: '插入到当前光标位置' }
  MODES.forEach(([value, label]) => {
    const button = h('button.ke-md-mode', { type: 'button', title: modeText[value], text: label })
    button.classList.toggle('ke-is-active', value === state.mode)
    button.addEventListener('click', () => {
      state.mode = value
      ;[...modeRow.children].forEach((node) => node.classList.toggle('ke-is-active', node === button))
    })
    modeRow.appendChild(button)
  })

  /* —— 预览 —— */
  const preview = h('div.ke-md-preview.ke-content')
  const stats = h('div.ke-md-stats')
  const importer = h('button.ke-btn-primary', { type: 'button', text: '导入到正文', disabled: true })

  let converted = { html: '', summary: null }
  let timer = null

  function schedule() {
    clearTimeout(timer)
    timer = setTimeout(render, 180)
  }

  function convert() {
    const text = state.text
    if (!text.trim()) return { html: '', summary: null }
    try {
      return onConvert(text) || { html: '', summary: null }
    } catch (error) {
      return { html: '', summary: null, error }
    }
  }

  function render() {
    const result = convert()
    converted = result
    const empty = !state.text.trim()
    importer.disabled = empty || !result.html || !!result.error
    note.textContent = empty ? '尚未选择文件' : `${state.text.length} 字符`
    preview.textContent = ''
    stats.textContent = ''
    if (result.error) {
      preview.appendChild(h('div.ke-md-empty', { text: `转换失败：${result.error.message}` }))
      return
    }
    if (empty) {
      preview.appendChild(h('div.ke-md-empty', { text: '选择文件或粘贴 Markdown 后，这里会显示转换预览' }))
      return
    }
    preview.innerHTML = result.html
    if (highlight) highlightCodeBlocks(preview, { highlight: true })
    const summary = result.summary || {}
    const items = [
      ['标题', summary.headings],
      ['段落', summary.paragraphs],
      ['列表', summary.lists],
      ['代码块', summary.codeBlocks],
      ['引用', summary.quotes],
      ['表格', summary.tables],
      ['图片', summary.images],
      ['链接', summary.links],
    ].filter(([, count]) => count)
    items.forEach(([label, count]) => {
      stats.appendChild(h('span.ke-md-stat', {}, [h('b', { text: String(count) }), ` ${label}`]))
    })
    if (!items.length) stats.appendChild(h('span.ke-md-stat', { text: '未识别到块级结构，将按纯文本导入' }))
  }

  textarea.addEventListener('input', () => {
    state.text = textarea.value
    state.name = ''
    schedule()
  })

  importer.addEventListener('click', async () => {
    if (importer.disabled) return
    importer.disabled = true
    importer.textContent = '导入中…'
    try {
      await onImport({ text: state.text, name: state.name, mode: state.mode })
    } finally {
      importer.textContent = '导入到正文'
      importer.disabled = !state.text.trim()
    }
  })

  wrap.append(
    tabs,
    h('div.ke-md-body', {}, [
      local,
      pasteBody,
      h('div.ke-panel-sect', { text: '导入位置' }),
      modeRow,
      h('div.ke-panel-sect', { text: '转换预览' }),
      preview,
      stats,
    ]),
    h('div.ke-panel-foot', {}, [importer, h('span.ke-panel-hint', { text: '转换后为可直接编辑的 HTML' })]),
  )
  show(0)
  render()
  return wrap
}

/* ---------------------------- 颜色面板 ---------------------------- */

/**
 * 颜色面板：主题色 + 标准色 + 最近使用 + 自定义取色
 * onPick(color) — color 为 null 表示恢复默认 / 清除
 */
export function colorPanel({ title, kind, colors, value, recents = [], onPick, onClear }) {
  const isBg = kind === 'bg'
  const reset = h('button.ke-panel-reset', {
    type: 'button',
    title: isBg ? '清除高亮' : '恢复默认文字色',
    text: isBg ? '清除高亮' : '恢复默认',
    onclick: () => onClear ? onClear() : onPick(null),
  })
  const wrap = panel(title, reset)

  if (recents.length) {
    wrap.appendChild(section('最近使用'))
    wrap.appendChild(swatches(recents.slice(0, 8), value, onPick))
  }

  if (!isBg) {
    wrap.appendChild(section('主题颜色'))
    wrap.appendChild(swatches(THEME_COLORS, value, onPick))
    wrap.appendChild(section('标准颜色'))
    wrap.appendChild(swatches(STANDARD_COLORS, value, onPick))
  } else {
    wrap.appendChild(section('推荐底色'))
    wrap.appendChild(swatches(BG_COLORS.map(([c, n]) => [c, n]), value, onPick))
    wrap.appendChild(section('主题颜色'))
    wrap.appendChild(swatches(THEME_COLORS, value, onPick))
  }

  wrap.appendChild(divider())
  wrap.appendChild(customRow(value, onPick))
  return wrap
}

function swatches(list, value, onPick) {
  const grid = h('div.ke-sw-grid')
  list.forEach(([color, name]) => {
    const btn = h('button.ke-sw', {
      type: 'button',
      title: `${name} ${color}`,
      'aria-label': name,
      style: { background: color },
    })
    if (value && HEX.test(value) && color.toLowerCase() === String(value).toLowerCase()) {
      btn.classList.add('ke-is-active')
      btn.appendChild(h('span.ke-sw-check', { html: icon('checkLight') }))
    }
    btn.addEventListener('click', () => onPick(color))
    grid.appendChild(btn)
  })
  return grid
}

function customRow(value, onPick) {
  const hex = HEX.test(value || '') ? value : '#07c160'
  const picker = h('input.ke-sw-picker', { type: 'color', value: hex, title: '自定义颜色' })
  const input = h('input.ke-input.ke-sw-hex', { type: 'text', value: hex, placeholder: '#000000', maxlength: 7 })
  const apply = h('button.ke-btn-primary', { type: 'button', text: '应用' })
  const commit = () => {
    const raw = input.value.trim()
    const next = raw.startsWith('#') ? raw : `#${raw}`
    if (!HEX.test(next)) {
      input.classList.add('ke-is-invalid')
      return
    }
    input.classList.remove('ke-is-invalid')
    onPick(next)
  }
  picker.addEventListener('input', () => {
    input.value = picker.value
  })
  picker.addEventListener('change', commit)
  apply.addEventListener('click', commit)
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      commit()
    }
  })
  return h('div.ke-panel-foot', {}, [
    picker,
    input,
    apply,
  ])
}

/* ---------------------------- 段落样式面板 ---------------------------- */

/** items: [{value, label, desc, sampleClass}] */
export function headingPanel(items, { value, onPick }) {
  const wrap = panel('段落样式')
  wrap.classList.add('ke-panel-wide')
  items.forEach((item) => {
    const row = h('button.ke-hd-row', {
      type: 'button',
      dataset: { kValue: item.value },
      onclick: () => onPick(item.value),
    }, [
      h('span.ke-hd-sample', { class: item.sampleClass || '', text: item.sample || item.label }),
      h('span.ke-hd-meta', {}, [
        h('span.ke-hd-label', { text: item.label }),
        h('span.ke-hd-desc', { text: item.desc }),
      ]),
    ])
    if (item.value === value) row.classList.add('ke-is-active')
    wrap.appendChild(row)
  })
  return wrap
}

/* ---------------------------- 字号面板 ---------------------------- */

export function fontSizePanel(sizes, { value, onPick }) {
  const wrap = panel('字号', h('span.ke-panel-note', { text: value ? `${value}px` : '默认 17px' }))
  wrap.classList.add('ke-panel-wide')
  const grid = h('div.ke-size-grid')
  sizes.forEach((size) => {
    const btn = h('button.ke-size-cell', { type: 'button', text: String(size), onclick: () => onPick(size) })
    btn.style.fontSize = `${Math.min(20, 10 + size / 6)}px`
    if (Number(value) === size) btn.classList.add('ke-is-active')
    grid.appendChild(btn)
  })
  wrap.appendChild(grid)
  wrap.appendChild(divider())
  wrap.appendChild(h('div.ke-panel-hint', { text: '仅作用于选中的文字；未选中时对新输入的文字生效' }))
  return wrap
}

export const colorPresets = { text: THEME_COLORS.map((x) => x[0]), bg: BG_COLORS.map((x) => x[0]) }

/* ---------------------------- 表格规格 ---------------------------- */

export function tablePanel(onPick, { cols = 10, rows = 8 } = {}) {
  const wrap = panel('插入表格', h('span.ke-panel-note', { text: '最大 10×8' }))
  const grid = h('div.ke-table-grid', { style: { gridTemplateColumns: `repeat(${cols}, 18px)` } })
  const cells = []
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const cell = h('span.ke-table-cell')
      cell.dataset.r = String(r)
      cell.dataset.c = String(c)
      cells.push(cell)
      grid.appendChild(cell)
    }
  }
  wrap.appendChild(grid)
  const sizeText = h('div.ke-panel-hint', { text: '1 列 × 1 行' })
  wrap.appendChild(sizeText)
  const mark = (maxR, maxC) => {
    cells.forEach((cell) => {
      const on = Number(cell.dataset.r) <= maxR && Number(cell.dataset.c) <= maxC
      cell.classList.toggle('ke-is-on', on)
    })
    sizeText.textContent = `${maxC + 1} 列 × ${maxR + 1} 行`
  }
  grid.addEventListener('mousemove', (event) => {
    const cell = event.target.closest('.ke-table-cell')
    if (cell) mark(Number(cell.dataset.r), Number(cell.dataset.c))
  })
  grid.addEventListener('click', (event) => {
    const cell = event.target.closest('.ke-table-cell')
    if (cell) onPick(Number(cell.dataset.c) + 1, Number(cell.dataset.r) + 1)
  })
  grid.addEventListener('mouseenter', () => mark(0, 0))
  mark(0, 0)
  return wrap
}

/* ---------------------------- 图片 / 视频插入面板 ---------------------------- */

/**
 * 本地上传 + 网络链接两种入口合一
 * onFiles(FileList|File[]) / onUrl({url, name})
 */
export function mediaPanel(kind, { onFiles, onUrl, multiple, hint, maxText }) {
  const isImage = kind === 'image'
  const wrap = panel(isImage ? '插入图片' : '插入视频')
  wrap.classList.add('ke-panel-wide', 'ke-panel-media')

  const local = h('div.ke-tab-body')
  const net = h('div.ke-tab-body', { hidden: true })

  /* —— 本地上传 —— */
  const drop = h('div.ke-drop', {}, [
    h('span.ke-drop-ico', { html: icon('upload') }),
    h('div.ke-drop-title', { text: isImage ? '点击选择图片，或拖拽到此处' : '点击选择视频，或拖拽到此处' }),
    h('div.ke-drop-sub', { text: [maxText, hint].filter(Boolean).join(' · ') }),
  ])
  const pickBtn = h('button.ke-btn-primary', {
    type: 'button',
    text: isImage ? '选择图片' : '选择视频',
    onclick: () => onFiles(null),
  })
  drop.addEventListener('click', () => onFiles(null))
  drop.addEventListener('dragover', (event) => {
    event.preventDefault()
    drop.classList.add('ke-is-over')
  })
  drop.addEventListener('dragleave', () => drop.classList.remove('ke-is-over'))
  drop.addEventListener('drop', (event) => {
    event.preventDefault()
    drop.classList.remove('ke-is-over')
    if (event.dataTransfer?.files?.length) onFiles(event.dataTransfer.files)
  })
  local.append(drop, h('div.ke-panel-foot', {}, [pickBtn, h('span.ke-panel-hint', { text: multiple ? '可一次插入多张' : '单文件大文件将自动分片上传' })]))

  /* —— 网络链接 —— */
  const urlInput = h('input.ke-input', {
    type: 'url',
    placeholder: isImage ? 'https://example.com/photo.jpg' : 'https://example.com/video.mp4',
    'data-k-autofocus': '',
  })
  const nameInput = h('input.ke-input', { type: 'text', placeholder: isImage ? '图片描述（可选，作为 alt）' : '视频标题（可选）' })
  const status = h('div.ke-link-status', { text: '粘贴链接后自动校验可访问性' })
  const insertBtn = h('button.ke-btn-primary', { type: 'button', text: '插入', disabled: true })
  let timer = null
  let token = 0
  const check = () => {
    token += 1
    const mine = token
    clearTimeout(timer)
    const url = normalizeUrl(urlInput.value)
    insertBtn.disabled = !url
    status.className = 'ke-link-status'
    if (!url) {
      status.textContent = '请输入 http(s) 开头的链接'
      return
    }
    status.className = 'ke-link-status ke-is-checking'
    status.textContent = '正在校验…'
    timer = setTimeout(() => probe(kind, url, (ok) => {
      if (mine !== token) return
      if (ok) {
        status.className = 'ke-link-status ke-is-ok'
        status.textContent = isImage ? '图片可访问 ✓' : '视频可播放 ✓'
      } else {
        status.className = 'ke-link-status ke-is-bad'
        status.textContent = '未能自动加载（可能限制热链），不阻塞插入，发布前请自行确认'
      }
    }), 350)
  }
  urlInput.addEventListener('input', check)
  urlInput.addEventListener('paste', () => setTimeout(check, 0))
  const submit = () => {
    const url = normalizeUrl(urlInput.value)
    if (!url) {
      urlInput.classList.add('ke-is-invalid')
      urlInput.focus()
      return
    }
    onUrl({ url, name: nameInput.value.trim() })
  }
  insertBtn.addEventListener('click', submit)
  net.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      submit()
    }
  })
  net.append(
    h('div.ke-field', {}, [h('span.ke-field-label', { text: '地址' }), urlInput]),
    h('div.ke-field', {}, [h('span.ke-field-label', { text: isImage ? '描述' : '标题' }), nameInput]),
    status,
    h('div.ke-panel-foot', {}, [insertBtn, h('span.ke-panel-hint', { text: '外链由源站提供，不占用上传配额' })]),
  )

  const tabs = h('div.ke-tabs', {}, [
    h('button.ke-tab', { type: 'button', text: '本地上传' }),
    h('button.ke-tab', { type: 'button', text: '网络链接' }),
  ])
  const show = (index) => {
    [...tabs.children].forEach((tab, i) => tab.classList.toggle('ke-is-active', i === index))
    local.hidden = index !== 0
    net.hidden = index !== 1
    if (index === 1) urlInput.focus()
  }
  tabs.children[0].addEventListener('click', () => show(0))
  tabs.children[1].addEventListener('click', () => show(1))
  show(0)

  wrap.append(tabs, local, net)
  return wrap
}

/** 用 Image / video 元素探测远程地址是否可用 */
function probe(kind, url, done) {
  let settled = false
  const finish = (ok) => {
    if (settled) return
    settled = true
    done(ok)
  }
  try {
    if (kind === 'image') {
      const img = new Image()
      img.onload = () => finish(true)
      img.onerror = () => finish(false)
      img.referrerPolicy = 'no-referrer'
      img.src = url
    } else {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.muted = true
      video.onloadedmetadata = () => finish(video.videoHeight > 0 || video.duration > 0 || Number.isFinite(video.duration))
      video.onerror = () => finish(false)
      video.src = url
    }
  } catch {
    finish(false)
  }
}

/* ---------------------------- 链接表单 ---------------------------- */

export function linkPanel({ url = '', text = '', target = false, onSubmit, onCancel, onRemove }) {
  const urlInput = h('input.ke-input', { type: 'url', placeholder: 'https://mp.weixin.qq.com/...', value: url, 'data-k-autofocus': '' })
  const textInput = h('input.ke-input', { type: 'text', placeholder: '链接文字（留空使用 URL）', value: text })
  const check = h('input', { type: 'checkbox' })
  check.checked = !!target
  const wrap = panel(url ? '编辑链接' : '插入链接')
  wrap.classList.add('ke-panel-wide')
  const body = h('div', {}, [
    h('div.ke-field', {}, [h('span.ke-field-label', { text: '文字' }), textInput]),
    h('div.ke-field', {}, [h('span.ke-field-label', { text: '地址' }), urlInput]),
    h('label.ke-check', {}, [check, '新窗口打开']),
    h('div.ke-panel-foot', {}, [
      onRemove ? h('button.ke-btn-ghost', { type: 'button', text: '移除链接', style: { marginRight: 'auto', color: '#e53e3e' }, onclick: onRemove }) : null,
      h('button.ke-btn-ghost', { type: 'button', text: '取消', onclick: onCancel }),
      h('button.ke-btn-primary', { type: 'button', text: '确定', onclick: () => submit() }),
    ]),
  ])
  const submit = () => {
    const href = normalizeUrl(urlInput.value)
    if (!href) {
      urlInput.classList.add('ke-is-invalid')
      urlInput.focus()
      return
    }
    onSubmit({ url: href, text: textInput.value.trim(), target: check.checked })
  }
  body.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      submit()
    }
  })
  wrap.appendChild(body)
  return wrap
}

/* ---------------------------- 自定义下拉选择面板 ---------------------------- */

/** 链接提示：只显示域名，避免长 URL 撑破面板 */
function hostOf(url) {
  try {
    return new URL(url, window.location.href).host
  } catch {
    return String(url).slice(0, 40)
  }
}

/**
 * 下拉选择面板：支持异步数据（加载 / 失败重试 / 空态）、搜索过滤、分组、跳转链接提示
 * @param {object} opts
 * @param {() => Promise<Array>} opts.load   取数据（内部已做缓存与并发去重）
 * @param {() => Promise<Array>} opts.reload 强制重新取数
 * @param {(item) => object|null} opts.linkOf 该项对应的跳转链接（用于展示提示）
 * @param {(item) => void} opts.onPick
 */
export function selectPanel({ title, note, searchable, width, remote, value, load, reload, linkOf, onPick, emptyText }) {
  const wrap = panel(title)
  wrap.classList.add('ke-panel-wide', 'ke-panel-select')
  if (width) wrap.style.width = `${Math.min(420, Math.max(200, Number(width)))}px`

  const head = wrap.querySelector('.ke-panel-head')
  const countEl = h('span.ke-panel-note', { text: note || '' })
  if (remote) {
    head.appendChild(h('button.ke-panel-icon', {
      type: 'button',
      title: '重新加载数据',
      html: icon('retry'),
      onclick: () => run(reload || load, true),
    }))
  }
  head.appendChild(countEl)

  const body = h('div.ke-sel-body')
  wrap.appendChild(body)

  let items = []
  let keyword = ''
  let generation = 0

  if (searchable) {
    const search = h('input.ke-input.ke-sel-search', {
      type: 'search',
      placeholder: '搜索…',
      'data-k-autofocus': '',
    })
    search.addEventListener('input', () => {
      keyword = search.value.trim().toLowerCase()
      renderRows()
    })
    wrap.insertBefore(search, body)
  }

  function setState(kind, message) {
    body.textContent = ''
    body.dataset.state = kind
    if (kind === 'loading') {
      for (let i = 0; i < 3; i += 1) body.appendChild(h('div.ke-sel-skel'))
      body.insertBefore(h('div.ke-sel-loading', {}, [h('span.ke-spinner'), '数据加载中…']), body.firstChild)
    } else if (kind === 'error') {
      body.appendChild(
        h('div.ke-sel-tip', {}, [
          h('span.ke-sel-tip-text', { text: message || '数据加载失败' }),
          h('button.ke-btn-primary', { type: 'button', text: '重试', onclick: () => run(reload || load, true) }),
        ]),
      )
    } else {
      body.appendChild(h('div.ke-sel-tip', {}, [h('span.ke-sel-tip-text', { text: message || emptyText || '暂无数据' })]))
    }
  }

  function renderRows() {
    const list = keyword
      ? items.filter((item) => `${item.label} ${item.desc} ${item.value} ${item.group}`.toLowerCase().includes(keyword))
      : items
    countEl.textContent = note || (keyword ? `${list.length} / ${items.length} 项` : `${items.length} 项`)
    body.textContent = ''
    delete body.dataset.state
    if (!list.length) {
      setState('empty', keyword ? `没有匹配「${keyword}」的选项` : emptyText || '暂无数据')
      return
    }
    let group = null
    list.forEach((item) => {
      if (item.group && item.group !== group) {
        group = item.group
        body.appendChild(h('div.ke-panel-sect', { text: group }))
      }
      body.appendChild(row(item))
    })
  }

  function row(item) {
    const link = linkOf ? linkOf(item) : null
    const el = h('button.ke-sel-row', {
      type: 'button',
      disabled: item.disabled || undefined,
      dataset: { kValue: item.value },
      title: item.disabled ? '该项不可用' : link && link.mode === 'open' ? `打开 ${link.url}` : link ? `插入链接：${link.url}` : item.title || '',
      onclick: () => {
        if (item.disabled) return
        onPick(item)
      },
    })
    el.appendChild(h('span.ke-sel-main', {}, [
      h('span.ke-sel-label', { text: item.label }),
      item.desc ? h('span.ke-sel-desc', { text: item.desc }) : null,
      link ? h('span.ke-sel-link', { html: `${icon('link')}<i>${hostOf(link.url)}</i>` }) : null,
    ]))
    if (value && String(value) === String(item.value)) {
      el.classList.add('ke-is-active')
      el.appendChild(h('span.ke-sel-check', { html: icon('check') }))
    }
    if (link) el.classList.add('ke-has-link')
    return el
  }

  function run(task, force) {
    generation += 1
    const mine = generation
    setState('loading')
    Promise.resolve()
      .then(() => task({ force }))
      .then((result) => {
        if (mine !== generation || !wrap.isConnected) return // 面板已关闭或已被新请求取代
        items = Array.isArray(result) ? result : []
        if (!items.length) setState('empty')
        else renderRows()
      })
      .catch((error) => {
        if (mine !== generation || !wrap.isConnected) return
        setState('error', error && error.message ? error.message : '数据加载失败')
      })
  }

  run(load)
  return wrap
}

export function normalizeUrl(url) {
  const value = String(url || '').trim()
  if (!value) return ''
  if (/^(https?:|mailto:|tel:|#|\/)/i.test(value)) return value
  if (/^[\w-]+(\.[\w-]+)+/.test(value)) return `https://${value}`
  return ''
}

/* ---------------------------- 通用输入确认面板 ---------------------------- */

export function formPanel({ fields, onSubmit, onCancel, submitText = '确定' }) {
  const inputs = {}
  const body = h('div.ke-panel', {})
  fields.forEach((field) => {
    const input = field.type === 'textarea' ? h('textarea.ke-textarea', { rows: field.rows || 5, placeholder: field.placeholder || '' }) : h(field.type === 'checkbox' ? 'input' : 'input', { type: field.type || 'text', placeholder: field.placeholder || '' })
    if (field.value) {
      if (field.type === 'checkbox') input.checked = true
      else input.value = field.value
    }
    inputs[field.name] = input
    body.appendChild(h('div.ke-field', {}, [h('span.ke-field-label', { text: field.label }), input]))
  })
  body.appendChild(
    h('div.ke-panel-foot', {}, [
      h('button.ke-btn-ghost', { type: 'button', text: '取消', onclick: onCancel }),
      h('button.ke-btn-primary', {
        type: 'button',
        text: submitText,
        onclick: () => {
          const values = {}
          for (const [key, input] of Object.entries(inputs)) values[key] = input.type === 'checkbox' ? input.checked : input.value
          onSubmit(values)
        },
      }),
    ]),
  )
  return body
}
