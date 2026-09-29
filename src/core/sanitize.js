/** HTML 净化：白名单标签/属性，剔除脚本、事件属性与危险协议 */

const ALLOWED_TAGS = new Set([
  'a', 'abbr', 'b', 'blockquote', 'br', 'code', 'col', 'colgroup', 'dd', 'del', 'div', 'dl', 'dt',
  'em', 'figcaption', 'figure', 'font', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'ins',
  'kbd', 'li', 'mark', 'ol', 'p', 'pre', 's', 'samp', 'section', 'small', 'span', 'strong', 'sub',
  'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'u', 'ul', 'video', 'source',
])

/** 标签级属性白名单（* 表示所有标签通用） */
const GLOBAL_ATTRS = new Set(['style', 'class'])
const TAG_ATTRS = {
  A: ['href', 'title', 'target', 'rel'],
  IMG: ['src', 'alt', 'title', 'width', 'height'],
  VIDEO: ['src', 'poster', 'controls', 'loop', 'muted', 'playsinline', 'preload', 'width', 'height'],
  SOURCE: ['src', 'type'],
  FONT: ['size', 'color'],
  TD: ['colspan', 'rowspan'],
  TH: ['colspan', 'rowspan'],
  OL: ['start'],
  LI: ['value'],
}
/** 允许透传的自定义数据属性前缀 */
const DATA_PREFIX = ['data-k-', 'data-keditor-']

const SAFE_URL_RE = /^(?:https?:|mailto:|tel:|blob:|\/|#|\.{1,2}\/|[^:]*$)/i
const SAFE_DATA_RE = /^data:image\/(?:png|jpe?g|gif|webp|svg\+xml);/i

export function isSafeUrl(url) {
  if (!url) return false
  const value = String(url).trim().replace(/\s+/g, '')
  if (/^(javascript|vbscript|file|about):/i.test(value)) return false
  if (value.startsWith('data:')) return SAFE_DATA_RE.test(value)
  return SAFE_URL_RE.test(value)
}

/** 逐条清洗 style 声明，丢弃 expression / url(javascript:) 等 */
function sanitizeStyle(value) {
  const out = []
  for (const decl of String(value).split(';')) {
    const idx = decl.indexOf(':')
    if (idx < 0) continue
    const prop = decl.slice(0, idx).trim().toLowerCase()
    const val = decl.slice(idx + 1).trim()
    if (!prop || !val) continue
    if (!/^[a-z-]+$/.test(prop)) continue
    if (prop.startsWith('mso-') || prop.startsWith('-mso-')) continue
    if (/expression|javascript:|behavior:|url\(\s*['"]?\s*(javascript|data):/i.test(val)) continue
    out.push(`${prop}:${val}`)
  }
  return out.join(';')
}

/** class 只保留安全字符，避免与外部样式选择器冲突时引入意外结构 */
function sanitizeClass(value) {
  return String(value)
    .split(/\s+/)
    .filter((name) => /^[\w-]+$/.test(name) && !/^(script|javascript)/i.test(name))
    .join(' ')
}

function keepAttribute(tagName, attrName, attrValue) {
  const name = attrName.toLowerCase()
  if (name.startsWith('on')) return false
  if (GLOBAL_ATTRS.has(name)) return true
  if (DATA_PREFIX.some((prefix) => name.startsWith(prefix))) return true
  const list = TAG_ATTRS[tagName] || []
  return list.includes(name)
}

export function sanitizeHtml(html, { allowEmpty = false } = {}) {
  if (!html) return allowEmpty ? '' : '<p><br></p>'
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const root = doc.body.firstChild
  walk(root)
  const result = root.innerHTML.trim()
  if (!result && !allowEmpty) return '<p><br></p>'
  return result
}

function walk(node) {
  const children = Array.from(node.childNodes)
  for (const child of children) {
    if (child.nodeType === 8) {
      child.remove() // 注释
      continue
    }
    if (child.nodeType === 3) continue
    if (child.nodeType !== 1) {
      child.remove()
      continue
    }
    const tagName = child.tagName
    if (!ALLOWED_TAGS.has(tagName.toLowerCase())) {
      // 未授权标签：保留其文本内容（拆解），危险标签整体丢弃
      if (tagName === 'SCRIPT' || tagName === 'STYLE' || tagName === 'IFRAME' || tagName === 'OBJECT' || tagName === 'EMBED' || tagName === 'FORM' || tagName === 'LINK' || tagName === 'META') {
        child.remove()
        continue
      }
      const parent = child.parentNode
      while (child.firstChild) parent.insertBefore(child.firstChild, child)
      parent.removeChild(child)
      continue
    }
    for (const attr of Array.from(child.attributes)) {
      if (!keepAttribute(tagName, attr.name, attr.value)) {
        child.removeAttribute(attr.name)
        continue
      }
      const lower = attr.name.toLowerCase()
      if (lower === 'style') child.setAttribute('style', sanitizeStyle(attr.value))
      else if (lower === 'class') {
        const cls = sanitizeClass(attr.value)
        if (cls) child.setAttribute('class', cls)
        else child.removeAttribute('class')
      } else if (lower === 'href' || lower === 'src' || lower === 'poster') {
        if (!isSafeUrl(attr.value)) child.removeAttribute(attr.name)
      }
    }
    if (tagName === 'A' && child.getAttribute('target') === '_blank') child.setAttribute('rel', 'noopener noreferrer')
    if (child.getAttribute('href') === '' || !child.getAttribute('href')) {
      if (tagName === 'A') child.removeAttribute('href')
    }
    walk(child)
  }
}

/** Word / WPS 粘贴清洗：去 office 专有节点，font 尺寸转 px */
const WORD_FONT_SIZES = { 1: 10, 2: 13, 3: 16, 4: 18, 5: 24, 6: 32, 7: 48 }

export function isWordHtml(html) {
  return /urn:schemas-microsoft-com|class=["']?Mso|ProgID|w:val=/i.test(html)
}

export function cleanWordHtml(html) {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const root = doc.body.firstChild
  root.querySelectorAll('*').forEach((node) => {
    const tag = node.tagName.toLowerCase()
    if (tag.startsWith('o:') || tag.startsWith('w:') || tag === 'style' || tag === 'script' || tag === 'link' || tag === 'meta') {
      node.remove()
      return
    }
    if (tag === 'img') {
      // 丢弃 office 图标类占位图（宽或高 <= 2px）
      const width = Number(node.getAttribute('width') || 0)
      const height = Number(node.getAttribute('height') || 0)
      if ((width && width <= 3) || (height && height <= 3)) node.remove()
      return
    }
    if (tag === 'font') {
      const size = WORD_FONT_SIZES[Number(node.getAttribute('size'))]
      const span = doc.createElement('span')
      const styles = []
      if (size) styles.push(`font-size:${size}px`)
      if (node.color) styles.push(`color:${node.color}`)
      if (styles.length) span.setAttribute('style', styles.join(';'))
      while (node.firstChild) span.appendChild(node.firstChild)
      node.replaceWith(span)
      return
    }
    for (const attr of Array.from(node.attributes)) {
      const name = attr.name.toLowerCase()
      if (name.startsWith('mso-') || name === 'class' || name.startsWith('_') || name.startsWith('w:') || name.startsWith('o:') || name === 'lang' || name === 'dir') {
        node.removeAttribute(attr.name)
      }
    }
  })
  return root.innerHTML
}

export function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch])
}

/** 纯文本（用于字数统计与 getData('text')） */
export function toPlainText(html) {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  doc.body.querySelectorAll('style,script').forEach((n) => n.remove())
  doc.body.innerHTML = doc.body.innerHTML.replace(/<\/(p|div|h[1-6]|li|blockquote|pre|tr)>/gi, '\n')
  return doc.body.textContent.replace(/\u00a0/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}
