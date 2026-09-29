/** HTML 美化输出（源码模式使用）：含子块的容器展开，简单块保持一行 */

const BLOCK_TAGS = new Set(['p', 'div', 'section', 'blockquote', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'figure', 'figcaption', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'video'])

export function formatHtml(html, { indent = '  ' } = {}) {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const root = doc.body.firstChild
  const lines = []

  const push = (depth, text) => {
    const value = text.replace(/\s+/g, ' ').trim()
    if (!value) return
    const last = lines[lines.length - 1]
    // 同一层级的连续行内节点合并成一行，避免 <p>文字<strong>粗</strong></p> 被拆散
    if (last && last.depth === depth && last.inlineRun) last.text += ` ${value}`
    else lines.push({ depth, text: indent.repeat(depth) + value, inlineRun: true })
  }

  const walk = (parent, depth) => {
    let index = 0
    const nodes = [...parent.childNodes]
    nodes.forEach((child) => {
      if (child.nodeType === 3) {
        const text = child.textContent.trim()
        if (text) push(depth, text)
        return
      }
      if (child.nodeType !== 1) return
      const tag = child.tagName.toLowerCase()
      if (!BLOCK_TAGS.has(tag)) {
        push(depth, child.outerHTML)
        return
      }
      const hasBlockChild = [...child.querySelectorAll('*')].some((node) => BLOCK_TAGS.has(node.tagName.toLowerCase()))
      // 表格行/图片块/视频卡即使含子元素也保持单行，可读性更好
      const keepOneLine = tag === 'tr' || tag === 'figure' || tag === 'video'
      if (!hasBlockChild || keepOneLine) {
        // 简单块：整体一行
        lines.push({ depth, text: indent.repeat(depth) + collapse(child.outerHTML), inlineRun: false })
        return
      }
      lines.push({ depth, text: indent.repeat(depth) + openTag(child), inlineRun: false })
      walk(child, depth + 1)
      lines.push({ depth, text: indent.repeat(depth) + `</${tag}>`, inlineRun: false })
      index += 1
    })
    void index
  }

  walk(root, 0)
  return lines.map((line) => line.text).join('\n').replace(/\n{3,}/g, '\n\n')
}

/** 压缩多余空白（不改动文本内容中的单个空格） */
function collapse(markup) {
  return markup.replace(/\n\s+/g, ' ').replace(/\s{2,}/g, ' ').trim()
}

/** 只保留开始标签（含属性） */
function openTag(element) {
  const attrs = [...element.attributes].map((attr) => `${attr.name}="${(attr.value || '').replace(/"/g, '&quot;')}"`)
  return `<${element.tagName.toLowerCase()}${attrs.length ? ` ${attrs.join(' ')}` : ''}>`
}
