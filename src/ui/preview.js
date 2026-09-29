/** 阅读预览：按公众号正文版式渲染，可切换屏宽 */
import { h } from '../core/utils.js'
import { icon } from '../core/icons.js'

const DEVICES = [
  { key: 'mobile', label: '手机', width: 375 },
  { key: 'pad', label: '平板', width: 540 },
  { key: 'pc', label: '电脑', width: 677 },
]

export class PreviewOverlay {
  constructor(editor) {
    this.editor = editor
    this.device = 'pc'
    this.el = h('div.ke-preview', { hidden: true }, [
      h('div.ke-preview-bar', {}, [
        h('span', { text: '预览' }),
        h('span.ke-source-tip', { text: '仅用于查看排版效果，内容不可编辑' }),
        h('span.ke-status-tail', {}, DEVICES.map((device) =>
          h('button.ke-btn', {
            type: 'button',
            'data-k-device': device.key,
            text: device.label,
            onclick: () => this.setDevice(device.key),
          }),
        ).concat([h('span.ke-tb-sep'), h('button.ke-btn', { type: 'button', title: '关闭预览', html: icon('close'), onclick: () => editor.closePreview() })])),
      ]),
      (() => {
        this.body = h('div.ke-preview-body', {}, [h('div.ke-preview-frame', { style: { maxWidth: '677px' } }, [h('div.ke-content.ke-preview-content')])])
        this.frame = this.body.firstChild
        this.content = this.frame.firstChild
        return this.body
      })(),
    ])
  }

  setDevice(key) {
    this.device = key
    const device = DEVICES.find((d) => d.key === key) || DEVICES[2]
    this.frame.style.maxWidth = `${device.width}px`
    this.frame.style.width = key === 'mobile' ? `${device.width}px` : '100%'
    this.el.querySelectorAll('[data-k-device]').forEach((btn) => btn.classList.toggle('ke-is-active', btn.dataset.kDevice === key))
  }

  show(html) {
    this.content.innerHTML = html
    this.el.hidden = false
    this.setDevice(this.device)
  }

  hide() {
    this.el.hidden = true
    this.content.innerHTML = ''
  }

  destroy() {
    this.el.remove()
  }
}
