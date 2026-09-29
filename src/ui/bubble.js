/** 媒体气泡工具条：选中图片/视频后浮出的快捷操作 */
import { h } from '../core/utils.js'
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
    this.position()
  }

  hide() {
    this.el.hidden = true
    this.node = null
  }

  position() {
    if (!this.node || this.el.hidden) return
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

  imageActions(node) {
    const img = node.querySelector('img')
    const align = currentAlign(img)
    const radius = img && parseFloat(getComputedStyle(img).borderRadius) > 0
    return [
      btn('alignLeft', '左对齐', () => setAlign(img, 'left'), align === 'left'),
      btn('alignCenter', '居中', () => setAlign(img, 'center'), align === 'center'),
      btn('alignRight', '右对齐', () => setAlign(img, 'right'), align === 'right'),
      sep(),
      textBtn('30%', '宽度 30%', () => setSize(img, '30%')),
      textBtn('60%', '宽度 60%', () => setSize(img, '60%')),
      textBtn('100%', '宽度 100%', () => setSize(img, '100%')),
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

function currentAlign(img) {
  if (!img) return 'left'
  const ml = img.style.marginLeft
  const mr = img.style.marginRight
  if (ml === 'auto' && mr === 'auto') return 'center'
  if (ml === 'auto') return 'right'
  return 'left'
}

function setAlign(img, align) {
  if (!img) return
  const width = img.style.width || '100%'
  img.style.width = width
  img.style.maxWidth = '100%'
  if (align === 'center') {
    img.style.marginLeft = 'auto'
    img.style.marginRight = 'auto'
  } else if (align === 'right') {
    img.style.marginLeft = 'auto'
    img.style.marginRight = '0'
  } else {
    img.style.marginLeft = '0'
    img.style.marginRight = 'auto'
  }
  img.parentElement?.dispatchEvent(new Event('change', { bubbles: true }))
}

function setSize(img, width) {
  if (!img) return
  img.style.width = width
  img.style.maxWidth = '100%'
  setAlign(img, currentAlign(img))
  img.dispatchEvent(new Event('change', { bubbles: true }))
}

function toggleRadius(img, node) {
  if (!img) return
  const has = parseFloat(getComputedStyle(img).borderRadius) > 0
  img.style.borderRadius = has ? '0' : '10px'
  node.dispatchEvent(new Event('change', { bubbles: true }))
}

function previewImage(img) {
  if (img) lightbox(img.src)
}
