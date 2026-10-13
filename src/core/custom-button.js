/**
 * 自定义工具栏按钮
 * 类型 select（下拉选择）：数据可静态配置（options）或从接口读取（load / url），
 * 选中后按 link 配置插入跳转链接或直接打开。
 */
import { escapeHtml, isSafeUrl } from './sanitize.js'
import { normalizeUrl } from '../ui/popover.js'

const DEFAULT_TIMEOUT = 10000

/* ---------------------------- 数据规范化 ---------------------------- */

/** 从常见接口响应结构里取出数组 */
function pickArray(raw) {
  if (Array.isArray(raw)) return raw
  if (!raw || typeof raw !== 'object') return []
  for (const key of ['items', 'list', 'data', 'rows', 'records', 'result']) {
    const value = raw[key]
    if (Array.isArray(value)) return value
    if (value && typeof value === 'object') {
      const nested = pickArray(value)
      if (nested.length) return nested
    }
  }
  return []
}

function first(entry, keys) {
  for (const key of keys) {
    const value = entry[key]
    if (value !== undefined && value !== null) return value
  }
  return undefined
}

/** 统一 item 结构：{value,label,desc,url,group,html,disabled,raw} */
function normalizeItem(entry, index) {
  if (entry === undefined || entry === null) return null
  if (typeof entry === 'string' || typeof entry === 'number') {
    const text = String(entry)
    return { value: text, label: text, desc: '', url: '', group: '', html: '', disabled: false, raw: entry }
  }
  if (typeof entry !== 'object') return null
  const value = first(entry, ['value', 'id', 'key', 'val', 'code'])
  const label = first(entry, ['label', 'text', 'name', 'title'])
  return {
    value: value === undefined ? String(index) : String(value),
    label: label === undefined || label === '' ? (value === undefined ? String(index) : String(value)) : String(label),
    desc: String(first(entry, ['desc', 'description', 'sub', 'subtitle', 'tip']) ?? ''),
    url: String(first(entry, ['url', 'href', 'link', 'jumpUrl', 'jump']) ?? ''),
    group: String(entry.group ?? ''),
    html: String(entry.html ?? ''),
    disabled: !!entry.disabled,
    raw: entry,
  }
}

export function normalizeItems(raw) {
  return pickArray(raw).map(normalizeItem).filter(Boolean)
}

/** 规范化用户配置，非法项返回 null（不渲染，避免脏配置导致运行时报错） */
export function normalizeCustomButton(spec) {
  if (!spec || typeof spec !== 'object') return null
  const name = String(spec.name || '').trim()
  if (!name) return null
  return {
    name,
    type: spec.type === 'button' ? 'button' : 'select',
    title: spec.title || spec.text || name,
    text: spec.text || '',
    placeholder: spec.placeholder || spec.text || '请选择',
    icon: spec.icon || '',
    width: Number(spec.width) > 0 ? Number(spec.width) : 0,
    searchable: !!spec.searchable,
    note: spec.note ? String(spec.note) : '',
    emptyText: spec.emptyText ? String(spec.emptyText) : '',
    cache: spec.cache !== false,
    keepValue: spec.keepValue !== false,
    multiple: false,
    options: spec.options ?? null,
    load: typeof spec.load === 'function' ? spec.load : null,
    url: spec.url ? String(spec.url) : '',
    fetchOptions: spec.fetchOptions && typeof spec.fetchOptions === 'object' ? spec.fetchOptions : {},
    pick: typeof spec.pick === 'function' ? spec.pick : null,
    link: spec.link ?? null,
    insert: spec.insert === undefined ? 'auto' : spec.insert,
    onSelect: typeof spec.onSelect === 'function' ? spec.onSelect : null,
    onClick: typeof spec.onClick === 'function' ? spec.onClick : null,
    active: typeof spec.active === 'function' ? spec.active : null,
    enabled: typeof spec.enabled === 'function' ? spec.enabled : null,
  }
}

export function normalizeCustomButtons(list) {
  if (!Array.isArray(list)) return []
  return list.map(normalizeCustomButton).filter(Boolean)
}

/* ---------------------------- 数据加载 ---------------------------- */

/** 每个编辑器实例一份运行时状态：缓存 / 并发去重 / 请求取消 */
export function createButtonRuntime() {
  // gen 用于作废进行中的请求结果，external 标记数据由 setButtonOptions 外部灌入
  return { items: null, loaded: false, loading: null, value: null, controller: null, error: '', gen: 0, external: false }
}

/** 数据源优先级：load 函数 > url 接口 > options 静态配置 */
async function fetchItems(spec, editor, rt) {
  if (spec.load) return normalizeItems(await spec.load(editor))
  if (spec.url) return normalizeItems(await httpFetch(spec, editor, rt))
  return normalizeItems(spec.options)
}

async function httpFetch(spec, editor, rt) {
  const cfg = spec.fetchOptions
  const impl = cfg.fetch || (typeof fetch === 'function' ? fetch.bind(globalThis) : null)
  if (!impl) throw new Error('当前环境无 fetch，请改用 load 函数提供数据')

  rt.controller?.abort()
  const controller = typeof AbortController === 'function' ? new AbortController() : null
  rt.controller = controller
  const timeout = Number(cfg.timeout) > 0 ? Number(cfg.timeout) : DEFAULT_TIMEOUT
  const timer = setTimeout(() => controller?.abort(), timeout)
  try {
    const res = await impl(spec.url, {
      method: cfg.method || 'GET',
      headers: cfg.headers,
      body: cfg.body,
      credentials: cfg.credentials,
      signal: controller ? controller.signal : undefined,
    })
    if (!res || res.ok === false) throw new Error(`接口返回 ${res && res.status ? res.status : '异常'}`)
    const payload = cfg.parser ? await cfg.parser(res) : await res.json()
    return spec.pick ? spec.pick(payload, editor) : payload
  } catch (error) {
    if (error && error.name === 'AbortError') throw new Error(`请求超时（${timeout}ms）或被取消`)
    throw error
  } finally {
    clearTimeout(timer)
    if (rt.controller === controller) rt.controller = null
  }
}

/** 读取下拉数据；同一按钮并发请求自动去重，force 跳过缓存 */
export function loadItems(spec, editor, rt, { force = false } = {}) {
  // 外部灌入的数据优先（即使 cache:false），只有手动刷新才重新请求
  if (!force && rt.external && rt.items) return Promise.resolve(rt.items)
  if (!force && spec.cache && rt.items) return Promise.resolve(rt.items)
  if (!force && rt.loading) return rt.loading
  const gen = rt.gen
  const task = fetchItems(spec, editor, rt)
    .then((items) => {
      if (gen !== rt.gen) return rt.items // 期间被 setButtonOptions / 新请求作废
      rt.items = items
      rt.loaded = true
      rt.error = ''
      return items
    })
    .catch((error) => {
      if (gen !== rt.gen) return rt.items
      rt.error = error && error.message ? error.message : String(error)
      throw error
    })
    .finally(() => {
      if (rt.loading === task) rt.loading = null
    })
  rt.loading = task
  return task
}

/** 供 editor.setButtonOptions 使用：外部灌入数据并刷新面板 */
export function setRuntimeItems(rt, raw) {
  rt.gen += 1 // 作废进行中的请求，避免旧响应覆盖新数据
  rt.items = normalizeItems(raw)
  rt.loaded = true
  rt.error = ''
  rt.external = true
  abortRuntime(rt)
  rt.loading = null
  return rt.items
}

export function abortRuntime(rt) {
  rt.controller?.abort()
  rt.controller = null
}

/* ---------------------------- 跳转链接 ---------------------------- */

/** 模板占位符：{value} {label} 以及 item 的任意字段 */
function fill(template, item) {
  return String(template).replace(/\{(\w+)\}/g, (match, key) => {
    if (item[key] !== undefined && item[key] !== null) return String(item[key])
    const fromRaw = item.raw && item.raw[key]
    return fromRaw === undefined || fromRaw === null ? match : String(fromRaw)
  })
}

function pick(raw, item, editor) {
  return typeof raw === 'function' ? raw(item, editor) : raw
}

/**
 * 解析选中项对应的跳转链接
 * link 可为 true / 字符串模板 / 对象 / 函数；数据自带 url 时默认可跳转。
 * 返回 {mode:'insert'|'open', url, text, target, title} 或 null（无链接）
 */
export function resolveLink(spec, item, editor) {
  const conf = spec.link
  let raw = null
  if (typeof conf === 'function') raw = conf(item, editor)
  else if (typeof conf === 'string') raw = { url: conf }
  else if (conf && typeof conf === 'object') raw = conf
  else if (conf === true || item.url) raw = { url: item.url }
  if (!raw) return null
  if (typeof raw === 'string') raw = { url: raw }

  const url = normalizeUrl(fill(String(pick(raw.url, item, editor) ?? ''), item))
  if (!url || !isSafeUrl(url)) return null // 危险协议 / 非法地址一律拒绝

  const text = pick(raw.text, item, editor)
  const title = pick(raw.title, item, editor)
  const mode = raw.mode === 'open' ? 'open' : 'insert'
  const target = raw.target === '_self' || raw.target === false ? '_self' : '_blank'
  return {
    mode,
    url,
    text: text === undefined || text === null || text === '' ? item.label : fill(String(text), item),
    target,
    title: title ? fill(String(title), item) : '',
  }
}

/* ---------------------------- 选中后动作 ---------------------------- */

function insertText(editor, text) {
  editor.commands.insertHTML(escapeHtml(text))
}

/**
 * 执行选中动作
 * @returns {Promise<{handled:boolean, link:object|null, action:string}>}
 */
export async function applySelection(editor, spec, rt, item) {
  editor.restoreSelection()
  const link = resolveLink(spec, item, editor)
  const ctx = {
    editor,
    item,
    link,
    insertLink: (override) => insertLink(editor, { ...link, ...override }),
    insertHtml: (html) => editor.commands.insertHTML(String(html)),
    insertText: (text) => insertText(editor, text),
    open: (url, target) => openUrl(url || (link && link.url), target || (link && link.target)),
  }

  let action = 'none'
  let handled = false
  if (spec.onSelect) {
    // 返回 false 表示「我自己处理了，别改正文」
    handled = (await spec.onSelect(item, ctx)) === false
  }
  if (!handled) action = doDefaultInsert(editor, spec, item, link)

  if (spec.keepValue) rt.value = item
  const payload = { name: spec.name, item, link, action, editor }
  editor.emit('customselect', payload)
  return payload
}

function doDefaultInsert(editor, spec, item, link) {
  const mode = spec.insert
  if (mode === false || mode === 'none') return 'none'
  if (link && link.mode === 'open') {
    openUrl(link.url, link.target)
    return 'open'
  }
  if (mode === 'link' || (mode === 'auto' && link)) {
    if (!link) return 'none'
    insertLink(editor, link)
    return 'link'
  }
  if (mode === 'html' || (mode === 'auto' && item.html)) {
    if (!item.html) return 'none'
    editor.commands.insertHTML(item.html)
    return 'html'
  }
  insertText(editor, item.label)
  return 'text'
}

function insertLink(editor, link) {
  editor.commands.createLink({
    url: link.url,
    text: link.text,
    target: link.target !== '_self',
  })
}

function openUrl(url, target = '_blank') {
  if (!url || !isSafeUrl(url)) return
  // noopener 防反向 tabnabbing；_self 时走当前页跳转
  if (target === '_self') window.location.href = url
  else window.open(url, '_blank', 'noopener,noreferrer')
}
