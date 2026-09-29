/** 编辑指令集：以最小可用为原则，优先使用浏览器原生命令，自定义指令保持输出干净的微信风格 HTML */
import { getRange, insertNode, closestBlock } from './selection.js'
import { sanitizeHtml } from './sanitize.js'
import { h, uid } from './utils.js'

const MARKS = { bold: 'bold', italic: 'italic', underline: 'underline', strikeThrough: 'strike', through: 'strikethrough' }

export class Commands {
  constructor(editor) {
    this.editor = editor
    this.root = editor.root
  }

  /** 统一入口：确保聚焦 + 开启 styleWithCSS（输出 inline style，符合公众号粘贴习惯） */
  exec(command, value = null) {
    this.editor.focus()
    document.execCommand('styleWithCSS', false, true)
    document.execCommand('defaultParagraphSeparator', false, 'p')
    const ok = document.execCommand(command, false, value)
    this.editor.afterEdit()
    return ok
  }

  queryState(command) {
    try {
      return document.queryCommandState(command)
    } catch {
      return false
    }
  }

  queryValue(command) {
    try {
      return document.queryCommandValue(command)
    } catch {
      return ''
    }
  }

  hasSelection() {
    const range = getRange(this.root)
    return !!(range && !range.collapsed)
  }

  toggleMark(name) {
    const map = { bold: 'bold', italic: 'italic', underline: 'underline', strike: 'strikeThrough' }
    const cmd = map[name]
    if (!cmd) return
    this.exec(cmd)
    // 原生命令在空段落上会产生无意义节点，做一次清理
    this.root.querySelectorAll('span[style=""]').forEach((n) => n.replaceWith(...n.childNodes))
  }

  /** 字号：用 fontSize=7 作为标记再改写成 font-size:px，避免浏览器字号档位限制 */
  setFontSize(px) {
    this.editor.focus()
    document.execCommand('styleWithCSS', false, false)
    const marker = `__ke_fs_${uid()}__`
    this.root.setAttribute('data-ke-marker', marker)
    document.execCommand('fontSize', false, '7')
    this.root.removeAttribute('data-ke-marker')
    this.root.querySelectorAll('font[size="7"]').forEach((font) => {
      const span = document.createElement('span')
      span.style.fontSize = `${px}px`
      while (font.firstChild) span.appendChild(font.firstChild)
      font.replaceWith(span)
    })
    // styleWithCSS 下浏览器可能生成 font-size:xx-large
    this.root.querySelectorAll('span').forEach((span) => {
      if (/xx-large/i.test(span.style.fontSize)) span.style.fontSize = `${px}px`
    })
    document.execCommand('styleWithCSS', false, true)
    this.editor.afterEdit()
  }

  setColor(mode, color) {
    this.editor.focus()
    document.execCommand('styleWithCSS', false, true)
    if (!color) color = mode === 'fore' ? '#3f3f3f' : 'transparent'
    const ok = document.execCommand(mode === 'fore' ? 'foreColor' : 'hiliteColor', false, color)
    if (!ok) document.execCommand(mode === 'fore' ? 'foreColor' : 'backColor', false, color)
    // 清掉 rgba 背景为 transparent 的冗余节点
    if (mode === 'back' && color === 'transparent') {
      this.root.querySelectorAll('[style*="background-color"]').forEach((node) => {
        if (/background-color:\s*transparent|rgba\(0, 0, 0, 0\)/i.test(node.getAttribute('style') || '')) {
          node.style.backgroundColor = ''
          if (!node.getAttribute('style').trim()) node.replaceWith(...node.childNodes)
        }
      })
    }
    this.editor.afterEdit()
  }

  setAlign(align) {
    const map = { left: 'justifyLeft', center: 'justifyCenter', right: 'justifyRight', justify: 'justifyFull' }
    const cmd = map[align]
    if (!cmd) return
    this.editor.focus()
    const range = getRange(this.root)
    const block = closestBlock(range?.commonAncestorContainer || this.root, this.root)
    document.execCommand('styleWithCSS', false, true)
    document.execCommand(cmd)
    // 媒体块（figure/video 卡片）直接改样式，浏览器命令对它们无效
    const node = block || this.root.firstElementChild
    if (node && /^(FIGURE|DIV|VIDEO)/.test(node.tagName || '')) node.style.textAlign = align
    this.editor.afterEdit()
  }

  toggleList(kind) {
    this.exec(kind === 'ordered' ? 'insertOrderedList' : 'insertUnorderedList')
  }

  setHeading(tag) {
    const value = tag ? `<${tag}>` : '<p>'
    this.exec('formatBlock', value)
  }

  toggleBlockquote() {
    const range = getRange(this.root)
    const block = closestBlock(range?.commonAncestorContainer || this.root, this.root)
    if (block && block.tagName === 'BLOCKQUOTE') this.exec('formatBlock', '<p>')
    else this.exec('formatBlock', '<blockquote>')
  }

  /** 链接：有选区则包裹，无选区则插入完整 a 标签 */
  createLink({ url, text = '', target = false }) {
    this.editor.focus()
    const range = getRange(this.root)
    const hasSel = range && !range.collapsed
    const label = text || (hasSel ? range.toString() : url)
    if (hasSel) {
      document.execCommand('createLink', false, url)
      range.commonAncestorContainer.parentElement?.closest?.('a')
      this.root.querySelectorAll(`a[href="${cssEscape(url)}"]`).forEach((a) => {
        if (target) {
          a.setAttribute('target', '_blank')
          a.setAttribute('rel', 'noopener noreferrer')
        } else {
          a.removeAttribute('target')
        }
      })
    } else {
      const a = h('a', { href: url }, [label])
      if (target) {
        a.setAttribute('target', '_blank')
        a.setAttribute('rel', 'noopener noreferrer')
      }
      insertNode(this.root, a, { inline: true })
    }
    this.editor.afterEdit()
  }

  removeLink() {
    const range = getRange(this.root)
    const anchors = closestAnchors(range, this.root)
    anchors.forEach((node) => node.replaceWith(...node.childNodes))
    this.editor.afterEdit()
  }

  insertTable(cols, rows) {
    const table = document.createElement('table')
    const tbody = document.createElement('tbody')
    for (let r = 0; r < rows; r += 1) {
      const tr = document.createElement('tr')
      for (let c = 0; c < cols; c += 1) {
        const cell = document.createElement(r === 0 ? 'th' : 'td')
        cell.innerHTML = '<br>'
        tr.appendChild(cell)
      }
      tbody.appendChild(tr)
    }
    table.appendChild(tbody)
    insertNode(this.root, table)
    this.exec('insertHTML', '')
    this.editor.afterEdit()
  }

  insertCodeBlock(code = '') {
    const pre = document.createElement('pre')
    const codeEl = document.createElement('code')
    codeEl.textContent = code || '// 在这里输入代码'
    pre.appendChild(codeEl)
    insertNode(this.root, pre)
    this.editor.afterEdit()
  }

  insertDivider() {
    const hr = document.createElement('hr')
    insertNode(this.root, hr)
    this.editor.afterEdit()
  }

  insertHTML(html, { clean = true } = {}) {
    const value = clean ? sanitizeHtml(html) : html
    this.editor.focus()
    const range = getRange(this.root)
    if (range) {
      range.deleteContents()
      const tmp = document.createElement('div')
      tmp.innerHTML = value
      const frag = document.createDocumentFragment()
      while (tmp.firstChild) frag.appendChild(tmp.firstChild)
      const last = frag.lastChild
      range.insertNode(frag)
      if (last) {
        const after = document.createRange()
        after.setStartAfter(last.nodeType === 3 ? last : last.lastChild || last)
        after.collapse(true)
        const sel = window.getSelection()
        sel.removeAllRanges()
        sel.addRange(after)
      }
    } else {
      this.root.insertAdjacentHTML('beforeend', value)
    }
    this.editor.afterEdit()
  }

  /** 清除格式：内联样式 + 行内标签 + 段落回归 p */
  clearFormat() {
    this.editor.focus()
    if (this.hasSelection()) {
      document.execCommand('removeFormat')
      document.execCommand('unlink')
      const range = getRange(this.root)
      const block = closestBlock(range?.commonAncestorContainer, this.root)
      if (block && /^(H[1-6]|BLOCKQUOTE|PRE)$/.test(block.tagName)) this.exec('formatBlock', '<p>')
      this.stripInlineStylesInRange(range)
    } else {
      const range = getRange(this.root)
      const block = closestBlock(range?.commonAncestorContainer || this.root, this.root)
      if (block) {
        const html = block.innerHTML
        const p = document.createElement('p')
        p.innerHTML = sanitizeHtml(html, { allowEmpty: true })
        p.innerHTML = p.innerHTML.replace(/<(?!br|img)[^>]+>/gi, '')
        block.replaceWith(p)
      }
    }
    this.editor.afterEdit()
  }

  stripInlineStylesInRange(range) {
    if (!range) return
    const nodes = []
    const walker = document.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_ELEMENT)
    let node = walker.currentNode
    while (node) {
      if (range.intersectsNode(node) && node.nodeType === 1) nodes.push(node)
      node = walker.nextNode()
    }
    nodes.forEach((el) => {
      if (el === this.root) return
      el.removeAttribute('style')
      if (/^(SPAN|FONT)$/.test(el.tagName) && !el.attributes.length) el.replaceWith(...el.childNodes)
    })
  }

  /** 标题 / 段落的当前状态（供工具栏高亮） */
  currentBlock() {
    const range = getRange(this.root)
    const block = closestBlock(range?.commonAncestorContainer || this.root, this.root)
    return block?.tagName?.toLowerCase() || 'p'
  }

  currentFontSize() {
    const range = getRange(this.root)
    if (!range) return ''
    let node = range.startContainer
    while (node && node !== this.root) {
      if (node.nodeType === 1 && node.style.fontSize) return node.style.fontSize.replace('px', '')
      node = node.parentNode
    }
    return ''
  }
}

function closestAnchors(range, root) {
  if (!range) return []
  const out = new Set()
  const start = range.startContainer.nodeType === 1 ? range.startContainer.querySelector?.('a') || range.startContainer : range.startContainer
  let node = start
  while (node && node !== root) {
    if (node.tagName === 'A') out.add(node)
    node = node.parentNode
  }
  try {
    range.querySelectorAll?.('a').forEach((a) => out.add(a))
  } catch {
    /* older browsers */
  }
  const container = range.commonAncestorContainer
  if (container.nodeType === 1) container.querySelectorAll('a').forEach((a) => (range.intersectsNode(a) ? out.add(a) : null))
  return [...out]
}

function cssEscape(value) {
  return window.CSS?.escape ? CSS.escape(value) : String(value).replace(/["\\]/g, '\\$&')
}
