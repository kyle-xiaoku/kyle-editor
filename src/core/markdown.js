/**
 * Markdown → HTML（零依赖，GFM 子集）
 *
 * 产物直接对齐编辑器正文规范：`<p> / <h1-6> / <blockquote> / <ul> <ol> / <table> /
 * <pre data-k-lang="x"><code class="language-x"> / <hr> / <img> / <a> / <strong> <em> <del> <code>`，
 * 所以导入后可以立刻继续编辑，也能整段复制进公众号。
 *
 * 支持：标题（ATX / setext）、围栏与缩进代码块（带语言，交给代码块高亮）、引用（可嵌套）、
 * 有序/无序列表（可嵌套、紧凑与松散、任务列表）、表格（含对齐）、分隔线、段落、
 * 链接（行内 / 引用式 / 自动）、图片、粗体、斜体、删除线、行内代码、转义、硬换行、
 * YAML front matter（忽略）、内联 HTML 与 HTML 块。
 *
 * 输出默认再走一遍 sanitizeHtml（白名单），因此即便源文件里塞了 <script> / javascript: 链接
 * 也不会带到正文里。需要纯字符串输出可传 { sanitize: false }。
 */
import { escapeHtml, isSafeUrl, sanitizeHtml } from './sanitize.js'
import { normalizeLang } from './code.js'

/* ------------------------------ 文件识别 ------------------------------ */

const MD_NAME_RE = /\.(md|markdown|mdown|mkd|mkdn|mdx|txt)$/i
const MD_TYPE_RE = /^text\/(markdown|x-markdown)$|^application\/(x-)?markdown$/i

/** 拖拽 / 粘贴进来的文件是否为 Markdown（含 .txt 纯文本） */
export function isMarkdownFile(file) {
  if (!file) return false
  const name = String(file.name || '')
  const type = String(file.type || '')
  if (MD_TYPE_RE.test(type)) return true
  if (type && !/^text\//i.test(type)) return false
  return MD_NAME_RE.test(name)
}

/** <input accept="..."> 用 */
export const MARKDOWN_ACCEPT = '.md,.markdown,.mdown,.mkd,.mkdn,.mdx,.txt,text/markdown,text/plain'

/** 落点模式归一：replace 替换全文（默认）| append 追加文末 | cursor 光标处 */
export function normalizeInsertMode(value) {
  return value === 'append' || value === 'cursor' ? value : 'replace'
}

/**
 * 读取 Markdown 文件文本：先按 UTF-8 严格解码，失败再退到 gb18030 / big5
 * （国内常见的 GBK 编码 .md / .txt 不会变成乱码）
 */
export async function readMarkdownFile(file) {
  if (!file) return ''
  if (typeof file.arrayBuffer !== 'function') return String(await file.text())
  const buffer = await file.arrayBuffer()
  try {
    return decode(buffer, 'utf-8', true)
  } catch {
    for (const charset of ['gb18030', 'gbk', 'big5']) {
      try {
        return decode(buffer, charset, true)
      } catch {
        /* 换下一个编码 */
      }
    }
    return decode(buffer, 'utf-8', false)
  }
}

function decode(buffer, charset, fatal) {
  return new TextDecoder(charset, { fatal }).decode(buffer)
}

/* ------------------------------ 正则表 ------------------------------ */

const ATX_RE = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*#*[ \t]*$/
const SETEXT_RE = /^ {0,3}(=+|-+)[ \t]*$/
const HR_RE = /^ {0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$/
const FENCE_RE = /^( {0,3})(`{3,}|~{3,})[ \t]*([^`\n]*)$/
const QUOTE_RE = /^ {0,3}>/
const REF_DEF_RE = /^ {0,3}\[([^\]]+)\]:[ \t]*<?([^\s>]+)>?(?:[ \t]+(?:"([^"]*)"|'([^']*)'|\(([^)]*)\)))?[ \t]*$/
const TABLE_DELIM_RE = /^ {0,3}\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/
const HTML_BLOCK_RE = /^ {0,3}<(\/?)([A-Za-z][\w-]*)(\s|\/?>|$)/

/** HTML 块可原样透传的标签（其余按普通文本转义，危险标签由此天然失效） */
const HTML_BLOCK_TAGS = new Set([
  'div', 'section', 'article', 'aside', 'header', 'footer', 'main', 'nav', 'center', 'font', 'span',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption', 'colgroup', 'col',
  'dl', 'dt', 'dd', 'figure', 'figcaption', 'details', 'summary', 'pre', 'hr', 'br', 'img', 'a',
  'video', 'source', 'p', 'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'em', 'b', 'i', 'u', 's', 'del', 'ins', 'mark', 'code', 'kbd', 'samp', 'small',
  'sub', 'sup', 'abbr', 'time',
])

/** 行内 HTML 允许透传的标签 */
const INLINE_HTML_TAGS = new Set([
  'a', 'img', 'br', 'wbr', 'em', 'i', 'strong', 'b', 'u', 's', 'del', 'ins', 'mark', 'sub', 'sup',
  'kbd', 'code', 'samp', 'var', 'span', 'small', 'abbr', 'cite', 'q', 'time', 'font', 'sup',
])

const INLINE_TAG_RE = /^<(\/?)([A-Za-z][A-Za-z0-9-]*)((?:\s+[^<>]*?)?)(\/?)>/
const AUTOLINK_RE = /^<([A-Za-z][A-Za-z0-9+.-]{1,31}:[^<>\s]*)>/
const EMAIL_RE = /^<([^\s<>@]+@[^\s<>@]+\.[^\s<>@]+)>/
const ESCAPABLE_RE = /[!-/:-@[-`{-~]/
const ASCII_PUNCT_RE = /[!-/:-@[-`{-~]/
const URL_RE = /(^|[\s(（[【>])((?:https?:\/\/|www\.)[^\s<>()"']*[^\s<>()"'.,;:!?、。，；：！？])/g

/* ------------------------------ 入口 ------------------------------ */

function normalizeOptions(options) {
  return {
    gfm: options.gfm !== false,
    breaks: !!options.breaks,
    linkTarget: options.linkTarget || false,
    frontMatter: options.frontMatter !== false,
    sanitize: options.sanitize !== false,
  }
}

/**
 * Markdown → HTML
 * @param {string} input Markdown 文本
 * @param {{gfm?:boolean, breaks?:boolean, linkTarget?:string|boolean, frontMatter?:boolean, sanitize?:boolean}} [options]
 * @returns {string} 编辑器可直接使用的 HTML
 */
export function markdownToHtml(input, options = {}) {
  if (input === null || input === undefined) return ''
  const opts = normalizeOptions(options)
  let text = String(input).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').replace(/\u0000/g, '')
  // CommonMark 把制表符按 4 列展开，代码块缩进与列表缩进都靠它
  text = text.replace(/\t/g, '    ')
  if (opts.frontMatter) text = stripFrontMatter(text)
  const refs = new Map()
  const nodes = parseBlocks(text.split('\n'), refs, opts, 0)
  const html = nodes.map((node) => renderBlock(node, refs, opts)).join('\n')
  if (!opts.sanitize) return html
  return sanitizeHtml(html, { allowEmpty: true })
}

/** 统计转换结果里的块级元素数量（导入面板的「命中统计」、toast 提示用） */
export function markdownSummary(html) {
  const count = (re) => (String(html || '').match(re) || []).length
  return {
    headings: count(/<h[1-6][\s>]/g),
    paragraphs: count(/<p[\s>]/g),
    lists: count(/<[uo]l[\s>]/g),
    items: count(/<li[\s>]/g),
    codeBlocks: count(/<pre[\s>]/g),
    quotes: count(/<blockquote[\s>]/g),
    tables: count(/<table[\s>]/g),
    images: count(/<img[\s>]/g),
    links: count(/<a\s[^>]*href=/g),
  }
}

function stripFrontMatter(text) {
  const matched = /^---[ \t]*\n([\s\S]*?)\n(?:---|\.\.\.)[ \t]*(?:\n|$)/.exec(text)
  return matched ? text.slice(matched[0].length) : text
}

/* ------------------------------ 块级解析 ------------------------------ */

const isBlank = (line) => !line || !line.trim()
const indentOf = (line) => line.length - line.replace(/^ +/, '').length

/** 列表标记：返回缩进 / 类型 / 内容起始列等信息（严格按 CommonMark 的「标记后需空格」） */
function matchList(line) {
  const matched = /^( *)([-+*]|\d{1,9}[.)])([ \t]*)([\s\S]*)$/.exec(line)
  if (!matched) return null
  const [, lead, marker, gap, rest] = matched
  if (gap.length === 0 && rest.length) return null // "…text" 不算列表
  if (rest.length === 0 && gap.length === 0 && !/^[-+*]$/.test(marker)) return null
  const ordered = /^\d/.test(marker)
  const pad = gap.length || 1
  return {
    indent: lead.length,
    marker,
    ordered,
    start: ordered ? parseInt(marker, 10) || 1 : 1,
    contentIndent: lead.length + marker.length + pad,
    text: rest,
  }
}

/** 该行是否会开启一个新的块（用于判断引用 / 列表的惰性续行） */
function startsNewBlock(line, opts) {
  return (
    ATX_RE.test(line) ||
    FENCE_RE.test(line) ||
    HR_RE.test(line) ||
    QUOTE_RE.test(line) ||
    HTML_BLOCK_RE.test(line) ||
    !!matchList(line) ||
    (opts.gfm && TABLE_DELIM_RE.test(line))
  )
}

function parseBlocks(lines, refs, opts, depth) {
  const nodes = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (isBlank(line)) {
      i += 1
      continue
    }

    // 1. 围栏代码块
    const fence = FENCE_RE.exec(line)
    if (fence) {
      const indent = fence[1].length
      const marker = fence[2]
      const info = fence[3].trim()
      const body = []
      i += 1
      while (i < lines.length) {
        const closing = FENCE_RE.exec(lines[i])
        if (closing && closing[2][0] === marker[0] && closing[2].length >= marker.length && !closing[3].trim()) break
        body.push(indent ? lines[i].slice(0, indent).trim() ? lines[i] : lines[i].slice(indent) : lines[i])
        i += 1
      }
      if (i < lines.length) i += 1 // 吃掉结束围栏
      nodes.push({ t: 'code', lang: firstWord(info), text: body.join('\n') })
      continue
    }

    // 2. 缩进代码块（4 空格）
    if (/^ {4}/.test(line) && !matchList(line.replace(/^ {4}/, ''))) {
      const body = []
      while (i < lines.length && (isBlank(lines[i]) ? hasCodeAfterBlank(lines, i) : /^ {4}/.test(lines[i]))) {
        body.push(lines[i].slice(4))
        i += 1
      }
      while (body.length && isBlank(body[body.length - 1])) body.pop()
      nodes.push({ t: 'code', lang: '', text: body.join('\n') })
      continue
    }

    // 3. ATX 标题
    const atx = ATX_RE.exec(line)
    if (atx) {
      nodes.push({ t: 'h', level: atx[1].length, raw: (atx[2] || '').replace(/[ \t]+#+[ \t]*$/, '').trim() })
      i += 1
      continue
    }

    // 4. 分隔线
    if (HR_RE.test(line)) {
      nodes.push({ t: 'hr' })
      i += 1
      continue
    }

    // 5. 引用（可嵌套，支持懒续行）
    if (QUOTE_RE.test(line)) {
      const inner = []
      while (i < lines.length) {
        const current = lines[i]
        if (QUOTE_RE.test(current)) {
          inner.push(current.replace(/^ {0,3}> ?/, ''))
          i += 1
          continue
        }
        if (isBlank(current)) break
        if (startsNewBlock(current, opts)) break
        inner.push(current) // 懒续行：引用内段落的续行
        i += 1
      }
      nodes.push({ t: 'quote', children: parseBlocks(inner, refs, opts, depth + 1) })
      continue
    }

    // 6. 列表
    const list = matchList(line)
    if (list) {
      const parsed = parseList(lines, i, list, refs, opts, depth)
      nodes.push(parsed.node)
      i = parsed.next
      continue
    }

    // 7. GFM 表格
    if (opts.gfm && line.includes('|') && i + 1 < lines.length && TABLE_DELIM_RE.test(lines[i + 1]) && lines[i + 1].includes('-')) {
      const parsed = parseTable(lines, i, refs, opts)
      nodes.push(parsed.node)
      i = parsed.next
      continue
    }

    // 8. HTML 块
    const htmlStart = HTML_BLOCK_RE.exec(line)
    if (htmlStart && HTML_BLOCK_TAGS.has(htmlStart[2].toLowerCase())) {
      const raw = []
      while (i < lines.length && !isBlank(lines[i])) {
        raw.push(lines[i])
        i += 1
      }
      nodes.push({ t: 'html', raw: raw.join('\n') })
      continue
    }

    // 9. 段落（含 setext 标题与引用式链接定义）
    const paragraph = []
    let setext = null
    while (i < lines.length && !isBlank(lines[i])) {
      const current = lines[i]
      // setext 下划线必须优先于分隔线判断：「标题 + ---」是二级标题而不是段落加横线
      if (paragraph.length === 1 && SETEXT_RE.test(current)) {
        setext = current.trim()[0] === '=' ? 1 : 2
        i += 1
        break
      }
      if (paragraph.length > 0 && startsNewBlock(current, opts)) break
      if (paragraph.length === 0) {
        const def = REF_DEF_RE.exec(current)
        if (def) {
          registerRef(refs, def)
          i += 1
          continue
        }
      }
      const hard = /(?: {2,}|\\)$/.test(current)
      paragraph.push(hard ? current.replace(/(?: +|\\)$/, '') : current)
      if (hard) paragraph[paragraph.length - 1] += '\u0001'
      i += 1
    }
    if (paragraph.length) {
      const raw = paragraph.join('\n').replace(/\u0001\n/g, '\u0001')
      if (setext) nodes.push({ t: 'h', level: setext, raw: raw.trim() })
      else nodes.push({ t: 'p', raw })
    }
  }
  return nodes
}

/** 缩进代码块中间的空行：后面还有缩进行才算块内空行 */
function hasCodeAfterBlank(lines, i) {
  let j = i
  while (j < lines.length && isBlank(lines[j])) j += 1
  return j < lines.length && /^ {4}/.test(lines[j])
}

function registerRef(refs, matched) {
  const key = normalizeLabel(matched[1])
  if (!key || refs.has(key)) return
  refs.set(key, { href: matched[2] || '', title: matched[3] ?? matched[4] ?? matched[5] ?? '' })
}

function normalizeLabel(label) {
  return String(label || '').trim().replace(/\s+/g, ' ').toLowerCase()
}

function firstWord(info) {
  const value = String(info || '').trim()
  if (!value) return ''
  return value.split(/\s+/)[0]
}

function parseList(lines, start, first, refs, opts, depth) {
  const type = first.ordered ? 'ol' : 'ul'
  const baseIndent = first.indent
  const items = []
  let loose = false
  let i = start

  while (i < lines.length) {
    const marker = matchList(lines[i])
    if (!marker || marker.indent !== baseIndent || marker.ordered !== first.ordered) break
    const contentIndent = marker.contentIndent
    const body = [marker.text]
    i += 1
    let blanks = 0
    while (i < lines.length) {
      const current = lines[i]
      if (isBlank(current)) {
        body.push('')
        blanks += 1
        i += 1
        continue
      }
      const lead = indentOf(current)
      const next = matchList(current)
      if (next && lead <= baseIndent) break
      if (lead >= contentIndent) {
        body.push(current.slice(contentIndent))
        if (blanks > 0) loose = true // 条目内部被空行断开
        blanks = 0
        i += 1
        continue
      }
      if (blanks > 0) break // 空行 + 缩进不足 → 该条目结束
      if (startsNewBlock(current, opts)) break
      body.push(current.replace(/^ {0,3}/, '')) // 懒续行
      i += 1
    }
    while (body.length && isBlank(body[body.length - 1])) body.pop()
    // 结尾的空行不算松散；只有「空行后还有同层新条目」才是
    if (blanks > 0) {
      const nextItem = i < lines.length ? matchList(lines[i]) : null
      if (nextItem && nextItem.indent === baseIndent && nextItem.ordered === first.ordered) loose = true
    }
    items.push(makeItem(body, type, refs, opts))
  }

  return { node: { t: type, start: first.start, loose, items }, next: i }
}

function makeItem(body, type, refs, opts) {
  let checked = null
  if (type === 'ul' && body.length) {
    const task = /^\[([ xX])\][ \t]+/.exec(body[0])
    if (task) {
      checked = task[1].toLowerCase() === 'x'
      body[0] = body[0].slice(task[0].length)
    }
  }
  return { checked, children: parseBlocks(body, refs, opts, 0) }
}

function parseTable(lines, start, refs, opts) {
  const header = splitRow(lines[start])
  const delims = splitRow(lines[start + 1]).map((cell) => {
    const value = cell.trim()
    if (/^:-+:$/.test(value)) return 'center'
    if (/^-+:$/.test(value)) return 'right'
    return 'left'
  })
  const rows = []
  let i = start + 2
  while (i < lines.length && !isBlank(lines[i]) && lines[i].includes('|') && !startsNewBlock(lines[i], opts)) {
    rows.push(splitRow(lines[i]))
    i += 1
  }
  const width = Math.max(header.length, delims.length)
  const pad = (cells) => {
    const out = cells.slice(0, width)
    while (out.length < width) out.push('')
    return out
  }
  return { node: { t: 'table', align: pad(delims), head: pad(header), rows: rows.map(pad) }, next: i }
}

/** 按未转义的 | 切分表格行 */
function splitRow(line) {
  let value = line.trim()
  if (value.startsWith('|')) value = value.slice(1)
  if (value.endsWith('|') && !value.endsWith('\\|')) value = value.slice(0, -1)
  const cells = []
  let buffer = ''
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i]
    if (ch === '\\' && value[i + 1] === '|') {
      buffer += '\\|'
      i += 1
      continue
    }
    if (ch === '|') {
      cells.push(buffer)
      buffer = ''
      continue
    }
    buffer += ch
  }
  cells.push(buffer)
  return cells.map((cell) => cell.trim())
}

/* ------------------------------ 行内解析 ------------------------------ */

function inline(text, refs, opts) {
  return serialize(inlineNodes(String(text || ''), refs, opts), refs, opts)
}

/** 行内节点 = 分词 + 强调配对（链接文字内部也走同一套） */
function inlineNodes(text, refs, opts, inLink = false) {
  return processEmphasis(tokenize(text, refs, opts, inLink))
}

function tokenize(text, refs, opts, inLink = false) {
  const nodes = []
  const pushText = (value) => {
    if (!value) return
    const last = nodes[nodes.length - 1]
    if (last && last.type === 'text' && last.bare) last.value += value
    else nodes.push({ type: 'text', value, bare: true })
  }
  let i = 0
  while (i < text.length) {
    const ch = text[i]

    // 反斜杠转义 / 硬换行
    if (ch === '\\') {
      const next = text[i + 1]
      if (next === '\n') {
        nodes.push({ type: 'br' })
        i += 2
        continue
      }
      if (next && ESCAPABLE_RE.test(next)) {
        pushText(next)
        i += 2
        continue
      }
      pushText('\\')
      i += 1
      continue
    }

    // 行内代码
    if (ch === '`') {
      const run = /^`+/.exec(text.slice(i))[0]
      const close = findCodeFence(text, i + run.length, run)
      if (close < 0) {
        pushText(run)
        i += run.length
        continue
      }
      let value = text.slice(i + run.length, close).replace(/\n/g, ' ')
      if (value.length > 2 && /^ .* $/.test(value) && /[^ ]/.test(value)) value = value.slice(1, -1)
      nodes.push({ type: 'code', value })
      i = close + run.length
      continue
    }

    // 图片 / 链接
    if (ch === '[' || (ch === '!' && text[i + 1] === '[')) {
      const image = ch === '!'
      const parsed = parseLink(text, image ? i + 1 : i, refs, opts, image)
      if (parsed) {
        nodes.push(parsed.node)
        i = parsed.next
        continue
      }
    }

    // 自动链接 / 行内 HTML
    if (ch === '<') {
      const auto = AUTOLINK_RE.exec(text.slice(i))
      if (auto) {
        nodes.push({ type: 'link', href: auto[1], title: '', children: [{ type: 'text', value: auto[1], bare: false }] })
        i += auto[0].length
        continue
      }
      const mail = EMAIL_RE.exec(text.slice(i))
      if (mail) {
        nodes.push({ type: 'link', href: `mailto:${mail[1]}`, title: '', children: [{ type: 'text', value: mail[1], bare: false }] })
        i += mail[0].length
        continue
      }
      const tag = INLINE_TAG_RE.exec(text.slice(i))
      if (tag && INLINE_HTML_TAGS.has(tag[2].toLowerCase())) {
        nodes.push({ type: 'html', value: scrubUrls(tag[0]) })
        i += tag[0].length
        continue
      }
      pushText('<')
      i += 1
      continue
    }

    // 换行
    if (ch === '\n') {
      const prev = nodes[nodes.length - 1]
      const hard = opts.breaks || (prev && prev.type === 'text' && / {2,}$/.test(prev.value))
      if (prev && prev.type === 'text') prev.value = prev.value.replace(/[ \t]+$/, '')
      if (hard) nodes.push({ type: 'br' })
      else pushText('\n')
      i += 1
      continue
    }

    // 强调 / 删除线分隔符
    if (ch === '*' || ch === '_' || (ch === '~' && opts.gfm)) {
      const run = new RegExp(`^\\${ch}+`).exec(text.slice(i))[0]
      const prev = text[i - 1] || ''
      const next = text[i + run.length] || ''
      const nodes2 = computeFlanking(ch, run, prev, next)
      nodes.push({ type: 'delim', char: ch, count: run.length, canOpen: nodes2.canOpen, canClose: nodes2.canClose })
      i += run.length
      continue
    }

    // 普通文本
    const plain = /^[^\\`[<!*_~\n]+/.exec(text.slice(i))
    const value = plain ? plain[0] : ch
    if (opts.gfm && !inLink) pushAutolinks(nodes, value)
    else pushText(value)
    i += value.length
  }
  return nodes
}

function findCodeFence(text, from, run) {
  let at = text.indexOf(run, from)
  while (at >= 0) {
    const before = text[at - 1]
    const after = text[at + run.length]
    if (before !== '`' && after !== '`') return at
    at = text.indexOf(run, at + 1)
  }
  return -1
}

/** 左右侧翼规则（CommonMark）：决定 * _ 能否开启 / 闭合强调 */
function computeFlanking(char, run, prev, next) {
  const prevChar = prev ? (prev === '\n' ? '\n' : prev) : ''
  const nextChar = next ? next : ''
  const prevWs = !prevChar || /\s/.test(prevChar)
  const nextWs = !nextChar || /\s/.test(nextChar)
  const prevPunct = !!prevChar && ASCII_PUNCT_RE.test(prevChar)
  const nextPunct = !!nextChar && ASCII_PUNCT_RE.test(nextChar)
  const leftFlanking = !nextWs && (!nextPunct || prevWs || prevPunct)
  const rightFlanking = !prevWs && (!prevPunct || nextWs || nextPunct)
  if (char === '_') {
    return {
      canOpen: leftFlanking && (!rightFlanking || prevPunct),
      canClose: rightFlanking && (!leftFlanking || nextPunct),
    }
  }
  void run
  return { canOpen: leftFlanking, canClose: rightFlanking }
}

/** 裸链接自动识别（GFM）：只处理文本节点，且不进入已有链接内部 */
function pushAutolinks(nodes, value) {
  let last = 0
  URL_RE.lastIndex = 0
  let matched
  while ((matched = URL_RE.exec(value))) {
    const start = matched.index + matched[1].length
    if (start > last) pushTextNode(nodes, value.slice(last, start))
    const href = /^www\./i.test(matched[2]) ? `http://${matched[2]}` : matched[2]
    nodes.push({ type: 'link', href, title: '', children: [{ type: 'text', value: matched[2], bare: false }] })
    last = start + matched[2].length
  }
  if (last < value.length) pushTextNode(nodes, value.slice(last))
}

function pushTextNode(nodes, value) {
  if (!value) return
  const last = nodes[nodes.length - 1]
  if (last && last.type === 'text' && last.bare) last.value += value
  else nodes.push({ type: 'text', value, bare: true })
}

/** [text](href "title") / [text][ref] / [ref] / ![alt](src) */
function parseLink(text, bracketAt, refs, opts, image) {
  const label = findBracketEnd(text, bracketAt)
  if (label < 0) return null
  const inner = text.slice(bracketAt + 1, label)
  let i = label + 1
  let href = null
  let title = ''

  if (text[i] === '(') {
    const dest = parseDestination(text, i)
    if (!dest) return null
    href = dest.href
    title = dest.title
    i = dest.next
  } else if (text[i] === '[') {
    const close = text.indexOf(']', i + 1)
    if (close < 0) return null
    const key = normalizeLabel(text.slice(i + 1, close) || inner)
    const ref = refs.get(key)
    if (!ref) return null
    href = ref.href
    title = ref.title
    i = close + 1
  } else {
    const ref = refs.get(normalizeLabel(inner))
    if (!ref) return null
    href = ref.href
    title = ref.title
  }

  if (image) {
    if (!isSafeUrl(href)) return { node: { type: 'text', value: `![${inner}]` }, next: i }
    return { node: { type: 'image', src: href, title, alt: plainOf(inner) }, next: i }
  }
  const children = inlineNodes(inner, refs, opts, true)
  return { node: { type: 'link', href, title, children }, next: i }
}

function plainOf(nodes) {
  if (typeof nodes === 'string') return nodes.replace(/[*_~`]/g, '')
  return ''
}

function findBracketEnd(text, open) {
  let depth = 0
  for (let i = open; i < text.length; i += 1) {
    const ch = text[i]
    if (ch === '\\') {
      i += 1
      continue
    }
    if (ch === '`') {
      const run = /^`+/.exec(text.slice(i))[0]
      const close = findCodeFence(text, i + run.length, run)
      i = close < 0 ? i + run.length - 1 : close + run.length - 1
      continue
    }
    if (ch === '[') depth += 1
    else if (ch === ']') {
      depth -= 1
      if (depth === 0) return i
    } else if (ch === '\n' && depth === 1 && text[i + 1] === '\n') return -1
  }
  return -1
}

/** 解析 (href "title")：href 可用 <> 包裹，可含转义与成对括号 */
function parseDestination(text, open) {
  let i = open + 1
  while (text[i] === ' ' || text[i] === '\n') i += 1
  let href = ''
  if (text[i] === '<') {
    const close = text.indexOf('>', i + 1)
    if (close < 0) return null
    href = text.slice(i + 1, close).replace(/\\([\\<>])/g, '$1')
    i = close + 1
  } else {
    let depth = 0
    let buffer = ''
    while (i < text.length) {
      const ch = text[i]
      if (ch === '\\' && text[i + 1]) {
        buffer += text[i + 1]
        i += 2
        continue
      }
      if (ch === '(') depth += 1
      if (ch === ')') {
        if (depth === 0) break
        depth -= 1
      }
      if (/\s/.test(ch) && depth === 0) break
      buffer += ch
      i += 1
    }
    href = buffer
  }
  while (text[i] === ' ' || text[i] === '\n') i += 1
  let title = ''
  const quote = text[i]
  if (quote === '"' || quote === "'" || quote === '(') {
    const closing = quote === '(' ? ')' : quote
    const close = text.indexOf(closing, i + 1)
    if (close < 0) return null
    title = text.slice(i + 1, close)
    i = close + 1
    while (text[i] === ' ' || text[i] === '\n') i += 1
  }
  if (text[i] !== ')') return null
  return { href: href.trim(), title, next: i + 1 }
}

/* ------------------------------ 强调配对 ------------------------------ */

function processEmphasis(nodes) {
  const out = []
  const stack = []
  for (const node of nodes) {
    if (node.type !== 'delim') {
      out.push(node)
      continue
    }
    const { char, canOpen, canClose } = node
    const textNode = { type: 'text', value: char.repeat(node.count), bare: false }
    out.push(textNode)
    if (char === '~' && node.count < 2) continue // 单个 ~ 不是删除线标记
    const entry = { char, count: node.count, canOpen, canClose, node: textNode }
    if (!canClose) {
      if (canOpen) stack.push(entry)
      continue
    }
    while (entry.count > 0) {
      const closerAt = out.indexOf(entry.node)
      if (closerAt < 0) break
      let openAt = -1
      for (let k = stack.length - 1; k >= 0; k -= 1) {
        const open = stack[k]
        if (open === entry || open.char !== char || !open.canOpen || open.count <= 0) continue
        if (char === '~' && open.count < 2) continue
        const at = out.indexOf(open.node)
        if (at < 0 || at >= closerAt) continue
        // 「规则三」：两侧都可开可闭时，不能让 3 的倍数被错误配对
        if (char !== '~' && (open.canClose || entry.canOpen)) {
          const sum = open.count + entry.count
          if (sum % 3 === 0 && !(open.count % 3 === 0 && entry.count % 3 === 0)) continue
        }
        openAt = k
        break
      }
      if (openAt < 0) break
      const open = stack[openAt]
      const use = char === '~' ? 2 : Math.min(open.count, entry.count) >= 3 ? 3 : Math.min(open.count, entry.count, 2)
      if (use <= 0) break
      const inner = out.slice(out.indexOf(open.node) + 1, closerAt)
      open.count -= use
      entry.count -= use
      open.node.value = char.repeat(open.count)
      entry.node.value = char.repeat(entry.count)
      const wrapper = wrapEmphasis(char, use, inner)
      out.splice(closerAt, 1) // 先摘掉 closer
      const openIdx = out.indexOf(open.node)
      if (open.node.value) out.splice(openIdx + 1, closerAt - openIdx - 1, wrapper)
      else out.splice(openIdx, closerAt - openIdx, wrapper) // 空 opener 一并替换掉
      // 位置已变，丢弃失效的栈项
      for (let k = stack.length - 1; k >= 0; k -= 1) {
        if (stack[k] !== open && (!stack[k].count || out.indexOf(stack[k].node) < 0)) stack.splice(k, 1)
      }
      if (open.count <= 0) {
        const at = stack.indexOf(open)
        if (at >= 0) stack.splice(at, 1)
      }
    }
    if (entry.count > 0 && entry.canOpen && out.indexOf(entry.node) >= 0) stack.push(entry)
  }
  return out
}

function wrapEmphasis(char, use, inner) {
  if (char === '~') return { type: 'del', children: inner }
  if (use >= 3) return { type: 'strong', children: [{ type: 'em', children: inner }] }
  if (use === 2) return { type: 'strong', children: inner }
  return { type: 'em', children: inner }
}

/* ------------------------------ 渲染 ------------------------------ */

function renderBlock(node, refs, opts) {
  switch (node.t) {
    case 'p':
      return `<p>${inline(node.raw, refs, opts)}</p>`
    case 'h':
      return `<h${node.level}>${inline(node.raw, refs, opts)}</h${node.level}>`
    case 'hr':
      return '<hr>'
    case 'code':
      return renderCode(node)
    case 'html':
      return stripDangerousBlocks(scrubUrls(node.raw))
    case 'quote':
      return `<blockquote>\n${node.children.map((child) => renderBlock(child, refs, opts)).join('\n')}\n</blockquote>`
    case 'ul':
    case 'ol': {
      const start = node.t === 'ol' && node.start !== 1 ? ` start="${node.start}"` : ''
      const items = node.items.map((item) => renderItem(item, node.loose, refs, opts)).join('\n')
      return `<${node.t}${start}>\n${items}\n</${node.t}>`
    }
    case 'table':
      return renderTable(node, refs, opts)
    default:
      return ''
  }
}

function renderCode(node) {
  const raw = firstWord(node.lang)
  const lang = raw ? normalizeLang(raw) : 'plaintext'
  const attr = lang === 'plaintext' ? '' : ` data-k-lang="${lang}"`
  const cls = lang === 'plaintext' ? '' : ` class="language-${lang}"`
  return `<pre${attr}><code${cls}>${escapeMdText(node.text)}</code></pre>`
}

function renderItem(item, loose, refs, opts) {
  let html
  const children = item.children
  if (!loose && children.length === 1 && children[0].t === 'p') {
    html = inline(children[0].raw, refs, opts)
  } else {
    html = children.map((child) => renderBlock(child, refs, opts)).join('\n')
    if (!loose) html = html.replace(/^<p>([\s\S]*?)<\/p>/, '$1')
  }
  if (item.checked === null || item.checked === undefined) return `<li>${html}</li>`
  return `<li>${item.checked ? '☑' : '☐'} ${html}</li>`
}

function renderTable(node, refs, opts) {
  const cell = (tag, value, index) => {
    const align = node.align[index]
    const style = align && align !== 'left' ? ` style="text-align:${align}"` : ''
    return `<${tag}${style}>${inline(value, refs, opts)}</${tag}>`
  }
  const head = `<tr>${node.head.map((value, index) => cell('th', value, index)).join('')}</tr>`
  const body = node.rows.map((row) => `<tr>${row.map((value, index) => cell('td', value, index)).join('')}</tr>`)
  if (!body.length) return `<table><thead>${head}</thead></table>`
  return `<table><thead>${head}</thead><tbody>${body.join('')}</tbody></table>`
}

function serialize(nodes, refs, opts) {
  return nodes.map((node) => serializeNode(node, refs, opts)).join('')
}

function serializeNode(node, refs, opts) {
  switch (node.type) {
    case 'text':
      return escapeMdText(node.value).replace(/\u0001/g, '<br>')
    case 'code':
      return `<code>${escapeMdText(node.value)}</code>`
    case 'br':
      return '<br>'
    case 'html':
      return node.value
    case 'em':
      return `<em>${serialize(node.children, refs, opts)}</em>`
    case 'strong':
      return `<strong>${serialize(node.children, refs, opts)}</strong>`
    case 'del':
      return `<del>${serialize(node.children, refs, opts)}</del>`
    case 'image': {
      const title = node.title ? ` title="${escapeAttr(node.title)}"` : ''
      return `<img src="${escapeAttr(node.src)}" alt="${escapeAttr(node.alt)}"${title}>`
    }
    case 'link': {
      const href = isSafeUrl(node.href) ? node.href : '#'
      const title = node.title ? ` title="${escapeAttr(node.title)}"` : ''
      const target = opts.linkTarget ? ' target="_blank" rel="noopener noreferrer"' : ''
      return `<a href="${escapeAttr(href)}"${title}${target}>${serialize(node.children, refs, opts)}</a>`
    }
    default:
      return ''
  }
}

/** HTML 块原样透传前的兜底：即使调用方关掉了 sanitize，也不会带出可执行节点 */
const DANGEROUS_BLOCK_RE = /<(script|style|iframe|object|embed|form|link|meta|base)\b[^>]*>[\s\S]*?<\/\1\s*>/gi
const DANGEROUS_TAG_RE = /<\/?(?:script|style|iframe|object|embed|form|link|meta|base)\b[^>]*>/gi

function stripDangerousBlocks(html) {
  return String(html).replace(DANGEROUS_BLOCK_RE, '').replace(DANGEROUS_TAG_RE, '')
}

/** HTML（行内标签或整块）里的 href/src 做一次协议校验：即使调用方关掉 sanitize 也安全 */
const URL_ATTR_RE = /\s(href|src)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi

function scrubUrls(html) {
  return String(html).replace(URL_ATTR_RE, (all, _name, _raw, dq, sq, bare) => {
    const value = dq ?? sq ?? bare ?? ''
    return isSafeUrl(value) ? all : ''
  })
}

/* ------------------------------ 文本转义 ------------------------------ */

// 已是合法实体的 & 不再二次转义（&amp; / &#39; / &#x27; 原样保留）
const ENTITY_RE = /&(?![a-zA-Z][a-zA-Z0-9]{1,31};|#\d{1,7};|#[xX][0-9a-fA-F]{1,6};)/g

function escapeMdText(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(ENTITY_RE, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeAttr(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
