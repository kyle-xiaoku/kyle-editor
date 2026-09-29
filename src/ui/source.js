/** HTML 源码模式：查看 / 直接编辑，返回可视化时自动生效 */
import { h } from '../core/utils.js'
import { formatHtml } from '../core/format.js'
import { icon } from '../core/icons.js'

export class SourcePanel {
  constructor(editor) {
    this.editor = editor
    this.open = false
    this.el = h('div.ke-source', { hidden: true }, [
      h('div.ke-source-bar', {}, [
        h('span.ke-source-title', { text: 'HTML 源码' }),
        h('span.ke-source-tip', { text: '可直接编辑，点击「应用」或退出源码模式即生效' }),
        h('span.ke-source-tail', {}, [
          h('button.ke-btn', { type: 'button', title: '格式化', html: icon('format') + '<span>格式化</span>', onclick: () => this.format() }),
          h('button.ke-btn', { type: 'button', title: '复制全部', html: icon('copy') + '<span>复制</span>', onclick: () => this.copy() }),
          h('button.ke-btn', { type: 'button', title: '应用修改', html: icon('check') + '<span>应用</span>', onclick: () => this.apply() }),
          h('button.ke-btn', { type: 'button', title: '退出源码模式', html: icon('close'), onclick: () => editor.exitSource() }),
        ]),
      ]),
      (() => {
        this.code = h('pre.ke-source-code', { contenteditable: 'true', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', wrap: 'off' })
        this.code.addEventListener('keydown', (event) => {
          if (event.key === 'Tab') {
            event.preventDefault()
            document.execCommand('insertText', false, '  ')
          }
          if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
            event.preventDefault()
            this.apply()
          }
          event.stopPropagation()
        })
        return this.code
      })(),
    ])
  }

  get value() {
    return this.code.textContent
  }

  set value(text) {
    this.code.textContent = text
    this.code.scrollTop = 0
  }

  show(html) {
    this.value = formatHtml(html)
    this.el.hidden = false
    this.open = true
    this.editor.scrollEl.hidden = true
  }

  hide() {
    this.el.hidden = true
    this.open = false
    this.editor.scrollEl.hidden = false
  }

  format() {
    this.value = formatHtml(this.value)
    this.editor.toast.show('已格式化')
  }

  async copy() {
    const text = this.value
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else {
        this.code.focus()
        document.execCommand('selectAll')
        document.execCommand('copy')
      }
      this.editor.toast.show('源码已复制到剪贴板')
    } catch {
      this.editor.toast.error('复制失败，请手动选择复制')
    }
  }

  /** 应用当前源码到编辑区（做净化） */
  apply({ silent = false } = {}) {
    const html = this.value
    try {
      this.editor.setContent(html, { sanitize: true, silent: false })
      if (!silent) this.editor.toast.show('源码已应用')
      return true
    } catch (error) {
      this.editor.toast.error(`源码解析失败：${error.message}`)
      return false
    }
  }

  destroy() {
    this.el.remove()
  }
}
