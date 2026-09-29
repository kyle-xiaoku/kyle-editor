/** 粘贴 / 拖拽：截图与文件直传、Word 内容净化、外链图片可选本地化 */
import { sanitizeHtml, isWordHtml, cleanWordHtml } from './sanitize.js'
import { escapeHtml } from './sanitize.js'

export function attachPaste(editor) {
  editor.root.addEventListener('paste', async (event) => {
    if (editor.readOnly || !editor.options.paste.enabled) return
    const dt = event.clipboardData
    if (!dt) return
    event.preventDefault()

    const files = filesFromDataTransfer(dt)
    if (files.length) {
      if (editor.options.paste.uploadFiles) {
        await editor.media.addFiles(files)
        editor.toast.show(`已上传 ${files.length} 个文件`)
      } else {
        editor.toast.warn('当前配置不允许粘贴上传文件')
      }
      return
    }

    const html = dt.getData('text/html')
    const text = dt.getData('text/plain')

    if (html && editor.options.paste.clean) {
      let clean = isWordHtml(html) ? cleanWordHtml(html) : html
      clean = sanitizeHtml(clean, { allowEmpty: true })
      if (editor.options.paste.localizeImages) clean = await localizeImages(editor, clean)
      editor.commands.insertHTML(clean, { clean: false })
      if (isWordHtml(html)) editor.toast.show('已清理 Word/WPS 格式')
    } else if (text) {
      const htmlText = text
        .split(/\r?\n/)
        .map((line) => `<p>${escapeHtml(line) || '<br>'}</p>`)
        .join('')
      editor.commands.insertHTML(htmlText, { clean: false })
    }
  })
}

export function filesFromDataTransfer(dt) {
  const out = []
  if (dt.items?.length) {
    for (const item of dt.items) {
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file) out.push(normalizePastedFile(file, out.length))
      }
    }
  }
  if (!out.length && dt.files?.length) out.push(...Array.from(dt.files).map((file, i) => normalizePastedFile(file, i)))
  return out
}

/** 截图粘贴得到的 File 通常没有文件名，补一个便于展示 */
function normalizePastedFile(file, index) {
  if (file.name && file.name !== 'image.png') return file
  const ext = (file.type.split('/')[1] || 'png').replace('jpeg', 'jpg').replace('+xml', '')
  const stamp = new Date().toISOString().slice(11, 19).replace(/:/g, '')
  return new File([file], `pasted-${stamp}-${index}.${ext}`, { type: file.type, lastModified: file.lastModified })
}

/** 拖拽上传：把光标移到落点后插入 */
export function attachDrop(editor) {
  const zone = editor.root
  let depth = 0

  const hasFiles = (event) => Array.from(event.dataTransfer?.types || []).includes('Files')

  zone.addEventListener('dragenter', (event) => {
    if (!hasFiles(event) || editor.readOnly) return
    event.preventDefault()
    depth += 1
    editor.el.classList.add('ke-is-dragover')
  })
  zone.addEventListener('dragover', (event) => {
    if (!hasFiles(event) || editor.readOnly) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  })
  zone.addEventListener('dragleave', (event) => {
    if (!hasFiles(event)) return
    depth = Math.max(0, depth - 1)
    if (depth === 0) editor.el.classList.remove('ke-is-dragover')
  })
  zone.addEventListener('drop', async (event) => {
    if (!hasFiles(event) || editor.readOnly) return
    event.preventDefault()
    depth = 0
    editor.el.classList.remove('ke-is-dragover')
    placeCaretAtPoint(editor, event)
    const files = [...(event.dataTransfer.files || [])]
    if (!files.length) return
    if (editor.options.paste.uploadFiles) {
      const count = await editor.media.addFiles(files)
      if (count) editor.toast.show(`已上传 ${count} 个文件`)
    }
  })
}

function placeCaretAtPoint(editor, event) {
  let range = null
  if (document.caretRangeFromPoint) range = document.caretRangeFromPoint(event.clientX, event.clientY)
  else if (document.caretPositionFromPoint) {
    const pos = document.caretPositionFromPoint(event.clientX, event.clientY)
    if (pos) {
      range = document.createRange()
      range.setStart(pos.offsetNode, pos.offset)
      range.collapse(true)
    }
  }
  if (range && editor.root.contains(range.commonAncestorContainer)) {
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
  } else {
    editor.focus()
  }
}

/** 外链图片 → 下载后走同一套分片上传（默认关闭，避免跨域噪音） */
async function localizeImages(editor, html) {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const imgs = [...doc.body.querySelectorAll('img')].filter((img) => /^https?:/i.test(img.getAttribute('src') || ''))
  for (const img of imgs) {
    try {
      const res = await fetch(img.src, { mode: 'cors' })
      if (!res.ok) continue
      const blob = await res.blob()
      const file = new File([blob], img.alt || `remote-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' })
      const result = await editor.media.upload(file, 'image')
      img.remove()
      if (result?.url) editor.toast.show('外链图片已本地化')
    } catch {
      /* 跨域失败则保留原始地址 */
    }
  }
  return doc.body.innerHTML.trim()
}
