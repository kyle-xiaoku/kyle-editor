/** 媒体气泡工具条：选中图片/视频后浮出的快捷操作 */
import { h, getMediaAlign, setMediaAlign } from '../core/utils.js'
import { icon } from '../core/icons.js'
import { lightbox } from './toast.js'

export class MediaBubble {
  constructor(editor) {
    this.editor = editor
    this.node = null
    this.el = h('div.ke-bubble', { hidden: true, contenteditable: 'false' })
    editor.el.appendChild(this.el)
    this.el.addEventListener('mousedown', (event) => event.preventDefault())
    this.el.addEventListener('click', (event) => this.onClick(event))
    this.replaceInput = h('input', { type: 'file', style: { display: 'none' } })
    this.replaceInput.addEventListener('change', () => {
      const file = this.replaceInput.files?.[0]
      this.replaceInput.value = ''
      if (file && this.node) this.editor.media.replaceNode(this.node, file)
    })
    editor.el.appendChild(this.replaceInput)

    // 图片缩放把手（挂在编辑器根容器，不进入内容区，避免污染快照/导出）
    this.resizeEl = h('div.ke-img-resize', {
      hidden: true,
      'aria-label': '拖动缩放图片',
      title: '拖动缩放图片',
      html: '<svg viewBox="0 0 10 10"><path d="M7 1 L9 3 M4 4 L6 6 M1 7 L3 9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    })
    this.resizeTip = h('div.ke-img-resize-tip', { hidden: true })
    this.resizeEl.addEventListener('pointerdown', (event) => this.onResizePointerDown(event))
    editor.el.appendChild(this.resizeEl)
    editor.el.appendChild(this.resizeTip)
  }

  show(node) {
    this.node = node
    const kind = node.dataset.kMedia === 'video' ? 'video' : 'image'
    this.el.textContent = ''
    const actions = kind === 'image' ? this.imageActions(node) : this.videoActions(node)
    for (const item of actions) {
      if (item) this.el.appendChild(item)
    }
    this.el.hidden = false
    if (kind === 'image') this.attachResize()
    this.position()
  }

  hide() {
    this.el.hidden = true
    this.detachResize()
    this.node = null
  }

  attachResize() {
    if (!this.node?.querySelector('img')) return
    this.resizeEl.hidden = false
    this.positionHandle()
  }

  detachResize() {
    this.resizeEl.hidden = true
    this.resizeTip.hidden = true
  }

  position() {
    if (!this.node) return
    this.positionHandle()
    if (this.el.hidden) return
    const rootBox = this.editor.el.getBoundingClientRect()
    const box = this.node.getBoundingClientRect()
    const view = this.editor.scrollEl.getBoundingClientRect()
    if (!box.height && !box.width) return this.hide()
    // 媒体节点滚出可视区域时隐藏气泡
    if (box.bottom < view.top || box.top > view.bottom) return this.hide()
    const popBox = this.el.getBoundingClientRect()
    const left = box.left - rootBox.left + box.width / 2
    const spaceAbove = box.top - rootBox.top
    const flip = spaceAbove < popBox.height + 18
    const top = flip ? box.bottom - rootBox.top + 10 : box.top - rootBox.top - 10
    this.el.classList.toggle('ke-is-below', flip)
    const halfWidth = popBox.width / 2
    this.el.style.left = `${Math.min(Math.max(left, halfWidth + 8), Math.max(halfWidth + 8, rootBox.width - halfWidth - 8))}px`
    this.el.style.top = `${Math.max(6, top)}px`
  }

  positionHandle() {
    const node = this.node
    if (!node || this.resizeEl.hidden) return
    const img = node.querySelector('img')
    if (!img) return
    const rootBox = this.editor.el.getBoundingClientRect()
    const box = img.getBoundingClientRect()
    if (!box.width && !box.height) return
    const size = 18
    const gap = 6
    this.resizeEl.style.left = `${box.right - rootBox.left - size - gap}px`
    this.resizeEl.style.top = `${box.bottom - rootBox.top - size - gap}px`
  }

  updateResizeTip(pct) {
    if (this.resizeTip.hidden || !this.node) return
    this.resizeTip.textContent = `${Math.round(pct)}%`
    const rootBox = this.editor.el.getBoundingClientRect()
    const box = this.node.querySelector('img')?.getBoundingClientRect() || this.node.getBoundingClientRect()
    this.resizeTip.style.left = `${box.left - rootBox.left + box.width / 2}px`
    this.resizeTip.style.top = `${box.top - rootBox.top - 10}px`
  }

  onResizePointerDown(event) {
    if (event.button != null && event.button !== 0) return
    const img = this.node?.querySelector('img')
    if (!img) return
    event.preventDefault()
    event.stopPropagation()

    const figure = this.node
    const figureWidth = figure.getBoundingClientRect().width
    const startPct = clamp(currentWidthPercent(img, figureWidth), 15, 100)
    const startX = event.clientX

    // 拖拽期间隐藏气泡，结束后恢复
    this.el.hidden = true
    this.resizeTip.hidden = false
    this.updateResizeTip(startPct)
    try {
      this.resizeEl.setPointerCapture(event.pointerId)
    } catch {
      /* 模拟派发时可能无活动指针，忽略 */
    }

    const move = (e) => {
      const dx = e.clientX - startX
      const deltaPct = figureWidth ? (dx / figureWidth) * 100 : 0
      const pct = clamp(Math.round(startPct + deltaPct), 15, 100)
      img.style.width = `${pct}%`
      img.style.maxWidth = '100%'
      this.updateResizeTip(pct)
      this.positionHandle()
    }
    const up = () => {
      this.resizeEl.removeEventListener('pointermove', move)
      this.resizeEl.removeEventListener('pointerup', up)
      this.resizeEl.removeEventListener('pointercancel', up)
      this.resizeTip.hidden = true
      this.editor.commitHistory()
      this.editor.refreshStatus()
      this.el.hidden = false
      this.position()
    }
    this.resizeEl.addEventListener('pointermove', move)
    this.resizeEl.addEventListener('pointerup', up)
    this.resizeEl.addEventListener('pointercancel', up)
  }

  imageActions(node) {
    const img = node.querySelector('img')
    const align = getMediaAlign(img)
    const radius = img && parseFloat(getComputedStyle(img).borderRadius) > 0
    const applyAlign = (a) => {
      setMediaAlign(img, a)
      this.editor.commitHistory()
      this.position()
    }
    const applySize = (w) => {
      img.style.width = w
      setMediaAlign(img, getMediaAlign(img))
      this.editor.commitHistory()
      this.position()
    }
    return [
      btn('alignLeft', '左对齐', () => applyAlign('left'), align === 'left'),
      btn('alignCenter', '居中', () => applyAlign('center'), align === 'center'),
      btn('alignRight', '右对齐', () => applyAlign('right'), align === 'right'),
      sep(),
      textBtn('30%', '宽度 30%', () => applySize('30%')),
      textBtn('60%', '宽度 60%', () => applySize('60%')),
      textBtn('100%', '宽度 100%', () => applySize('100%')),
      sep(),
      btn('rounded', '圆角', () => toggleRadius(img, node), radius),
      btn('preview', '查看大图', () => previewImage(img)),
      btn('upload', '替换图片', () => this.pick('image')),
      sep(),
      btn('trash', '删除', () => this.remove()),
    ]
  }

  videoActions() {
    return [
      textBtn('小', '窄版', () => this.setVideoWidth('60%')),
      textBtn('大', '宽版', () => this.setVideoWidth('100%')),
      sep(),
      btn('upload', '替换视频', () => this.pick('video')),
      sep(),
      btn('trash', '删除', () => this.remove()),
    ]
  }
  pick(kind) {
    this.replaceInput.accept = kind === 'image' ? this.editor.options.imageAccept : this.editor.options.videoAccept
    this.replaceInput.click()
  }

  setVideoWidth(width) {
    if (!this.node) return
    this.node.style.width = width
    this.editor.commitHistory()
    this.position()
  }

  remove() {
    if (!this.node) return
    const task = this.editor.media.taskFromNode(this.node)
    if (task) this.editor.media.remove(task)
    else {
      const next = this.node.nextElementSibling
      this.node.remove()
      if (next) this.editor.focus()
      this.editor.commitHistory()
    }
    this.hide()
    this.editor.refreshStatus()
  }

  onClick() {
    /* 行为已在各按钮中处理 */
  }

  destroy() {
    this.el.remove()
    this.replaceInput.remove()
    this.resizeEl.remove()
    this.resizeTip.remove()
  }
}

function btn(iconName, title, onclick, active = false) {
  const node = h('button', { type: 'button', title, html: icon(iconName) })
  if (active) node.classList.add('ke-is-active')
  node.addEventListener('click', onclick)
  return node
}

function textBtn(label, title, onclick) {
  const node = h('button', { type: 'button', title, text: label })
  node.addEventListener('click', onclick)
  return node
}

const sep = () => h('span.ke-sep')

function toggleRadius(img, node) {
  if (!img) return
  const has = parseFloat(getComputedStyle(img).borderRadius) > 0
  img.style.borderRadius = has ? '0' : '10px'
  node.dispatchEvent(new Event('change', { bubbles: true }))
}

function previewImage(img) {
  if (img) lightbox(img.src)
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function currentWidthPercent(img, figureWidth) {
  if (!figureWidth) return 100
  const match = img?.style?.width?.match(/^([\d.]+)%$/)
  if (match) return parseFloat(match[1])
  return (img.getBoundingClientRect().width / figureWidth) * 100
}
