/** 快照式撤销/重做栈，配合文本偏移恢复光标 */
import { caretOffset, setCaretOffset } from './selection.js'

export class History {
  constructor(root, { limit = 60, delay = 400 } = {}) {
    this.root = root
    this.limit = limit
    this.delay = delay
    this.stack = []
    this.index = -1
    this.timer = null
    this.locked = false
    this.lastHtml = root.innerHTML
  }

  /** 记录当前状态（首个快照不触发 change） */
  snapshot(immediate = false) {
    clearTimeout(this.timer)
    const push = () => {
      const html = this.root.innerHTML
      if (html === this.lastHtml) return
      this.lastHtml = html
      const point = { html, offset: caretOffset(this.root) }
      this.stack = this.stack.slice(0, this.index + 1)
      this.stack.push(point)
      if (this.stack.length > this.limit) this.stack.shift()
      this.index = this.stack.length - 1
    }
    if (immediate) push()
    else this.timer = setTimeout(push, this.delay)
  }

  /** 立即落盘挂起的快照 */
  flush() {
    clearTimeout(this.timer)
    this.snapshot(true)
  }

  /** 恢复内容但不产生新快照（用于 undo/redo 自身、源码模式应用） */
  apply(html, offset) {
    this.locked = true
    this.root.innerHTML = html
    this.lastHtml = html
    if (offset !== undefined && offset !== null) setCaretOffset(this.root, offset)
    this.locked = false
  }

  canUndo() {
    return this.index > 0
  }

  canRedo() {
    return this.index >= 0 && this.index < this.stack.length - 1
  }

  undo() {
    if (!this.canUndo()) return false
    clearTimeout(this.timer)
    this.index -= 1
    const point = this.stack[this.index]
    this.apply(point.html, this.currentOffset(point, 'undo'))
    this.lastHtml = point.html
    return true
  }

  redo() {
    if (!this.canRedo()) return false
    const point = this.stack[this.index + 1]
    this.index += 1
    this.apply(point.html, this.currentOffset(point, 'redo'))
    this.lastHtml = point.html
    return true
  }

  currentOffset(point) {
    // 若当前文档能算出偏移，优先沿用它，否则用快照里记录的
    const now = caretOffset(this.root)
    return now === null ? point.offset : point.offset
  }

  reset(html) {
    clearTimeout(this.timer)
    this.stack = [{ html, offset: 0 }]
    this.index = 0
    this.lastHtml = html
  }

  destroy() {
    clearTimeout(this.timer)
    this.stack = []
  }
}
