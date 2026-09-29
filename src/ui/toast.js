/** 轻量 toast + 图片查看器（挂在 body 上，跟随编辑器实例销毁） */
import { h } from '../core/utils.js'

export class Toast {
  constructor(owner = null) {
    this.owner = owner
    this.el = null
  }

  show(message, type = '', duration = 2600) {
    if (typeof document === 'undefined') return
    if (!this.el) {
      this.el = h('div.ke-toasts')
      document.body.appendChild(this.el)
    }
    const item = h(`span.ke-toast${type ? `.ke-is-${type}` : ''}`, { text: message })
    this.el.appendChild(item)
    setTimeout(() => {
      item.style.opacity = '0'
      item.style.transition = 'opacity .2s'
      setTimeout(() => item.remove(), 220)
    }, duration)
  }

  error(msg) {
    this.show(msg, 'error', 3600)
  }

  warn(msg) {
    this.show(msg, 'warn', 3000)
  }

  ok(msg) {
    this.show(msg, 'ok', 2200)
  }

  destroy() {
    if (this.el && !this.el.childElementCount) this.el.remove()
    this.el = null
  }
}

export function lightbox(src, ownerDocument = document) {
  const box = h('div.ke-lightbox', { tabindex: '-1' }, [h('img', { src, alt: '' })])
  const close = () => {
    box.remove()
    document.removeEventListener('keydown', onKey)
  }
  const onKey = (event) => {
    if (event.key === 'Escape') close()
  }
  box.addEventListener('click', close)
  document.addEventListener('keydown', onKey)
  ownerDocument.body.appendChild(box)
  return close
}
