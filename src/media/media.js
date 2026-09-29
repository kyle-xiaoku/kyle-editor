/**
 * 图片 / 视频上传与插入
 * - 拖拽、粘贴、点击三种入口共用 upload(file)
 * - 上传中在文档内插入占位块，显示分片进度，可取消、失败可重试
 * - 图片支持上传前压缩（options.image.compress）
 */
import { formatSize, h, uid } from '../core/utils.js'
import { insertNode, ensureEditableTail } from '../core/selection.js'
import { lightbox } from '../ui/toast.js'

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp|svg|avif)$/i
const VIDEO_EXT = /\.(mp4|mov|webm|m4v|ogv|avi|mkv)$/i

export class MediaManager {
  constructor(editor) {
    this.editor = editor
    this.options = editor.options
    this.tasks = new Map()
    this.input = null
  }

  kindOf(file) {
    const type = String(file.type || '')
    const name = String(file.name || '')
    if (type.startsWith('image/') || IMAGE_EXT.test(name)) return 'image'
    if (type.startsWith('video/') || VIDEO_EXT.test(name)) return 'video'
    return null
  }

  check(file, kind) {
    if (!kind) return `不支持的文件类型：${file.name || '剪贴板内容'}`
    const limit = kind === 'image' ? this.options.maxImageSize : this.options.maxVideoSize
    if (limit && file.size > limit) return `${file.name} 超出大小限制（${formatSize(limit)}）`
    return null
  }

  pickFiles(kind) {
    if (!this.input) {
      this.input = h('input', { type: 'file', multiple: true, style: { display: 'none' } })
      this.input.addEventListener('change', () => {
        const files = [...(this.input.files || [])]
        this.input.value = ''
        this.addFiles(files)
      })
      document.body.appendChild(this.input)
    }
    this.input.accept = kind === 'image' ? this.options.imageAccept : this.options.videoAccept
    this.input.multiple = kind === 'image'
    this.input.click()
  }

  async addFiles(files) {
    const accepted = []
    for (const file of files) {
      const kind = this.kindOf(file)
      const error = this.check(file, kind)
      if (error) this.editor.toast.warn(error)
      else accepted.push({ file, kind })
    }
    for (const item of accepted) await this.upload(item.file, item.kind)
    return accepted.length
  }

  /** 插入占位并上传，返回结果（失败/取消返回 null） */
  async upload(file, kind) {
    const holder = kind === 'image' ? this.createImageHolder() : this.createVideoHolder()
    this.editor.focus()
    insertNode(this.editor.root, holder)
    const task = {
      id: holder.dataset.kId,
      file,
      kind,
      holder,
      ctrl: new AbortController(),
      previewUrl: URL.createObjectURL(file),
    }
    this.tasks.set(task.id, task)
    this.decorateHolder(task)
    const thumb = holder.querySelector('[data-k-preview]')
    if (thumb) thumb.src = task.previewUrl
    return this.runUpload(task)
  }

  /** 真正的上传流可重试（复用同一个占位块，保证位置不变） */
  async runUpload(task) {
    const editor = this.editor
    const { holder, file, kind } = task
    editor.emit('uploadstart', { file, kind })
    editor.refreshStatus()

    let target = file
    try {
      if (kind === 'image') target = await maybeCompress(file, this.options.image)
      const result = await editor.uploader.upload(target, {
        signal: task.ctrl.signal,
        onProgress: (ratio, info) => this.updateProgress(holder, ratio, info, target, task),
      })
      const url = typeof result === 'string' ? { url: result } : result
      if (!url?.url) throw new Error('上传结果缺少 url')
      this.finish(task, { ...url, size: target.size })
      editor.emit('uploaddone', { file, kind, url: url.url })
      return url
    } catch (error) {
      if (error?.name === 'AbortError') {
        this.remove(task)
        editor.emit('uploadcancel', { file, kind })
        return null
      }
      this.fail(task, error)
      editor.emit('uploaderror', { file, kind, error })
      editor.toast.error(error?.message || '上传失败')
      return null
    } finally {
      ensureEditableTail(editor.root)
      editor.commitHistory()
      editor.refreshStatus()
    }
  }

  createImageHolder() {
    const figure = h('figure', { 'data-k-media': 'image', 'data-k-id': uid('m'), 'data-k-state': 'uploading', contenteditable: 'false' })
    const holder = h('div.ke-media-holder', {}, [
      h('img', { 'data-k-preview': '', alt: '', style: { display: 'none' } }),
      h('div.ke-media-name', { text: '图片上传中…' }),
      progressRow(),
    ])
    holder.appendChild(this.actionRow())
    figure.appendChild(holder)
    return figure
  }

  createVideoHolder() {
    const card = h('div.ke-video-card', { 'data-k-media': 'video', 'data-k-id': uid('m'), 'data-k-state': 'uploading', contenteditable: 'false' })
    const body = h('div.ke-video-body', {}, [
      h('div.ke-video-head', {}, [h('span', { text: '视频上传中…' }), h('span.ke-video-size', { text: '' })]),
      progressRow(),
    ])
    body.appendChild(this.actionRow())
    card.appendChild(body)
    return card
  }

  actionRow() {
    const self = this
    return h('div', {
      'data-k-actions': '',
      style: { display: 'flex', alignItems: 'center', gap: '8px', width: '100%', marginTop: '2px' },
      onclick: (event) => {
        const holder = event.target.closest('[data-k-id]')
        const task = holder && self.tasks.get(holder.dataset.kId)
        if (!task) return
        if (event.target.matches('.ke-media-cancel')) {
          task.ctrl.abort()
          self.remove(task)
        } else if (event.target.matches('.ke-media-retry')) {
          task.ctrl = new AbortController()
          self.resetHolder(task)
          self.runUpload(task)
        }
      },
    }, [h('button.ke-media-cancel', { type: 'button', text: '取消' })])
  }

  /** 文件名 / 大小 / 预览图 */
  decorateHolder(task) {
    const { holder, file } = task
    const name = holder.querySelector('.ke-media-name')
    if (name) name.textContent = `${file.name || '未命名'}（${formatSize(file.size)}）`
    const size = holder.querySelector('.ke-video-size')
    if (size) size.textContent = formatSize(file.size)
    const head = holder.querySelector('.ke-video-head span')
    if (head && task.kind === 'video') head.textContent = `${file.name || '视频'} 上传中…`
  }

  resetHolder(task) {
    const holder = task.holder
    holder.dataset.kState = 'uploading'
    const bar = holder.querySelector('.ke-progress i')
    if (bar) {
      bar.style.width = '0%'
      bar.style.background = ''
    }
    const pct = holder.querySelector('.ke-media-pct')
    if (pct) pct.textContent = '0%'
    const actions = holder.querySelector('[data-k-actions]')
    if (actions) actions.innerHTML = '<button class="ke-media-cancel" type="button">取消</button>'
    this.decorateHolder(task)
  }

  updateProgress(holder, ratio, info, file, task) {
    const percent = Math.max(0, Math.min(100, Math.round((ratio || 0) * 100)))
    const bar = holder.querySelector('.ke-progress i')
    if (bar) bar.style.width = `${percent}%`
    const pct = holder.querySelector('.ke-media-pct')
    if (pct) pct.textContent = `${percent}%`
    if (task) this.editor.emit('uploadprogress', { file: task.file, kind: task.kind, percent, info })
    const meta = holder.querySelector('.ke-media-meta')
    if (!meta) return
    let label = meta.querySelector('[data-k-chunks]')
    if (!label) {
      label = h('span', { 'data-k-chunks': '', style: { color: '#8a8f99', fontSize: '12px' } })
      meta.insertBefore(label, meta.firstChild)
    }
    if (info?.chunks > 1) label.textContent = `${info.chunks} 片 · ${formatSize(info.loaded)}/${formatSize(info.total || file.size)}`
    else if (info?.speed) label.textContent = `${formatSize(info.speed)}/s`
  }

  finish(task, result) {
    const { holder, kind, file } = task
    const url = result.url
    holder.dataset.kState = 'done'
    holder.dataset.kUrl = url
    holder.innerHTML = ''
    if (kind === 'image') {
      const img = h('img', { src: url, alt: altOf(file), 'data-k-name': file.name || '', draggable: 'false' })
      img.addEventListener('dblclick', () => lightbox(img.src))
      holder.appendChild(img)
    } else {
      const video = h('video', { src: url, controls: '', playsinline: '', preload: 'metadata', 'data-k-name': file.name || '' })
      const body = h('div.ke-video-body', {}, [
        h('div.ke-video-head', {}, [h('span', { text: file.name || '视频' }), h('span.ke-video-size', { text: formatSize(result.size || file.size) })]),
        video,
      ])
      holder.appendChild(body)
    }
    if (task.previewUrl) URL.revokeObjectURL(task.previewUrl)
    this.tasks.delete(task.id)
    this.editor.refreshStatus()
  }

  fail(task, error) {
    const holder = task.holder
    holder.dataset.kState = 'error'
    const bar = holder.querySelector('.ke-progress i')
    if (bar) bar.style.background = '#e53e3e'
    const actions = holder.querySelector('[data-k-actions]')
    if (actions) {
      actions.innerHTML = ''
      actions.appendChild(h('span.ke-media-error', { text: error?.message || '上传失败', style: { marginRight: 'auto', fontSize: '12px' } }))
      actions.appendChild(h('button.ke-media-retry', { type: 'button', text: '重试' }))
      actions.appendChild(h('button.ke-media-cancel', { type: 'button', text: '移除' }))
    }
  }

  remove(task) {
    task.holder?.remove()
    if (task.previewUrl) URL.revokeObjectURL(task.previewUrl)
    this.tasks.delete(task.id)
    ensureEditableTail(this.editor.root)
    this.editor.refreshStatus()
  }

  /** 从 DOM 节点找到对应任务（用于气泡工具条删除） */
  taskFromNode(node) {
    const holder = node?.closest?.('[data-k-id]')
    return holder ? this.tasks.get(holder.dataset.kId) : null
  }

  cancelAll() {
    for (const task of [...this.tasks.values()]) {
      task.ctrl.abort()
      this.remove(task)
    }
  }

  /** 从网络链接插入（工具栏「网络链接」入口） */
  insertFromUrl(kind, url, name = '') {
    const node = kind === 'image' ? this.insertImageUrl(url, name) : this.insertVideoUrl(url, name || '网络视频')
    this.editor.toast.ok(kind === 'image' ? '已插入网络图片' : '已插入网络视频')
    this.editor.emit('insertmedia', { kind, url, node })
    return node
  }

  insertImageUrl(url, alt = '') {
    const img = h('img', { src: url, alt: alt || '', draggable: 'false' })
    img.addEventListener('dblclick', () => lightbox(img.src))
    const figure = h('figure', { 'data-k-media': 'image', 'data-k-state': 'done', 'data-k-url': url, contenteditable: 'false' }, [img])
    insertNode(this.editor.root, figure)
    this.editor.commitHistory()
    return figure
  }

  insertVideoUrl(url, label = '视频') {
    const video = h('video', { src: url, controls: '', playsinline: '', preload: 'metadata' })
    const card = h('div.ke-video-card', { 'data-k-media': 'video', 'data-k-state': 'done', 'data-k-url': url, contenteditable: 'false' }, [
      h('div.ke-video-body', {}, [h('div.ke-video-head', {}, [h('span', { text: label })]), video]),
    ])
    insertNode(this.editor.root, card)
    this.editor.commitHistory()
    return card
  }

  destroy() {
    this.cancelAll()
    this.input?.remove()
    this.input = null
  }
}

function altOf(file) {
  return String(file.name || '').replace(/\.[^.]+$/, '')
}

function progressRow() {
  return h('div.ke-media-meta', {}, [h('div.ke-progress', {}, [h('i', { style: { width: '0%' } })]), h('span.ke-media-pct', { text: '0%' })])
}

/** 大图压缩：超过 maxWidth 时等比缩放，失败则原样返回 */
export async function maybeCompress(file, options = {}) {
  const compress = options?.compress
  if (!compress || !/^image\/(jpeg|jpg|png|webp)$/i.test(file.type)) return file
  const { maxWidth = 1440, quality = 0.85, minSize = 300 * 1024 } = typeof compress === 'object' ? compress : {}
  if (file.size < minSize) return file
  try {
    const bitmap = await createImageBitmap(file)
    if (bitmap.width <= maxWidth) {
      bitmap.close?.()
      return file
    }
    const canvas = document.createElement('canvas')
    canvas.width = maxWidth
    canvas.height = Math.round((bitmap.height * maxWidth) / bitmap.width)
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close?.()
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob || blob.size >= file.size) return file
    return new File([blob], String(file.name).replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg', lastModified: file.lastModified })
  } catch {
    return file
  }
}
