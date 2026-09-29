/** 选区 / 光标工具 */

/** 当前选区是否落在 root 内 */
export function getRange(root) {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return null
  const range = sel.getRangeAt(0)
  if (!root.contains(range.commonAncestorContainer)) return null
  return range
}

export function hasSelection(root) {
  const range = getRange(root)
  return !!(range && !range.collapsed && range.toString().trim() !== '')
}

export function saveRanges(root) {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return null
  const range = sel.getRangeAt(0)
  if (!root.contains(range.commonAncestorContainer)) return null
  return { start: range.startOffset, end: range.endOffset, node: range.commonAncestorContainer }
}

/** 用「纯文本偏移」记录光标，便于 undo/redo 后恢复位置 */
export function caretOffset(root) {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return null
  const range = sel.getRangeAt(0)
  if (!root.contains(range.startContainer)) return null
  let offset = 0
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (node === range.startContainer) return NodeFilter.FILTER_ACCEPT
      offset += node.textContent.length
      return NodeFilter.FILTER_SKIP
    },
  })
  const found = walker.nextNode()
  if (!found) return range.startContainer === root ? 0 : null
  return offset + range.startOffset
}

export function setCaretOffset(root, offset) {
  if (offset === null || offset === undefined) return
  const sel = window.getSelection()
  let remaining = Math.max(0, offset)
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()
  let last = null
  while (node) {
    const len = node.textContent.length
    if (remaining <= len) {
      try {
        sel.setBaseAndExtent(node, remaining, node, remaining)
      } catch {
        /* ignore */
      }
      return
    }
    remaining -= len
    last = node
    node = walker.nextNode()
  }
  if (last) {
    try {
      sel.setBaseAndExtent(last, last.textContent.length, last, last.textContent.length)
    } catch {
      /* ignore */
    }
  }
}

/**
 * 在光标处插入节点
 * - inline: 行内节点（链接等），直接在选区处插入
 * - 默认块级：媒体/表格/代码块等始终作为独立块插入，不会嵌套进标题/列表/引用
 */
export function insertNode(root, node, { inline = false, selectAfter = true } = {}) {
  root.focus()
  const range = getRange(root)
  if (!range) {
    root.appendChild(node)
    ensureEditableTail(root)
    return node
  }
  if (!range.collapsed) range.deleteContents()

  if (inline) {
    range.insertNode(node)
  } else {
    const block = closestBlock(range.startContainer, root)
    if (!block || block === root) root.appendChild(node)
    else block.after(node)
  }

  const after = document.createRange()
  after.setStartAfter(node)
  after.collapse(true)
  const sel = window.getSelection()
  sel.removeAllRanges()
  sel.addRange(after)
  ensureEditableTail(root)
  if (selectAfter && sel.rangeCount === 0) root.focus()
  return node
}

/** contenteditable 末尾若为媒体节点，补一个空段落方便继续输入 */
export function ensureEditableTail(root) {
  const last = root.lastElementChild
  if (!last) {
    root.appendChild(document.createElement('p'))
    return
  }
  if (/^(IMG|VIDEO|IFRAME)$/.test(last.tagName) || last.dataset.kmedia !== undefined) {
    const p = document.createElement('p')
    p.appendChild(document.createElement('br'))
    root.appendChild(p)
  }
}

export function closestBlock(node, root) {
  let current = node
  while (current && current !== root) {
    if (current.nodeType === 1 && /^(P|DIV|H[1-6]|LI|BLOCKQUOTE|PRE|SECTION|TD|TH)$/.test(current.tagName)) return current
    current = current.parentNode
  }
  return null
}
