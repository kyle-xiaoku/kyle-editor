/** 通用小工具 */

export const uid = (prefix = 'k') => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

export function debounce(fn, wait = 300) {
  let timer = null
  const wrapped = (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), wait)
  }
  wrapped.cancel = () => clearTimeout(timer)
  wrapped.flush = (...args) => {
    clearTimeout(timer)
    fn(...args)
  }
  return wrapped
}

export const clamp = (num, min, max) => Math.min(Math.max(num, min), max)

export function formatSize(bytes) {
  if (!bytes && bytes !== 0) return '-'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let value = bytes
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i += 1
  }
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)}${units[i]}`
}

/** 极简 DOM 构造器：h('div.k-btn', {title}, [child, '文本']) */
export function h(spec, attrs = {}, children = []) {
  let tag = 'div'
  let className = ''
  const parts = String(spec).split('.')
  tag = parts[0] || 'div'
  className = parts.slice(1).join(' ')
  const node = document.createElement(tag)
  if (className) node.className = className
  for (const [key, val] of Object.entries(attrs || {})) {
    if (val === undefined || val === null || val === false) continue
    if (key === 'class') node.className = `${node.className} ${val}`.trim()
    else if (key === 'style' && typeof val === 'object') Object.assign(node.style, val)
    else if (key === 'html') node.innerHTML = val
    else if (key === 'text') node.textContent = val
    else if (key === 'dataset') Object.assign(node.dataset, val)
    else if (key.startsWith('on') && typeof val === 'function') node.addEventListener(key.slice(2).toLowerCase(), val)
    else node.setAttribute(key, val === true ? '' : String(val))
  }
  const list = Array.isArray(children) ? children : [children]
  for (const child of list) {
    if (child === null || child === undefined || child === false) continue
    node.appendChild(typeof child === 'string' || typeof child === 'number' ? document.createTextNode(String(child)) : child)
  }
  return node
}

export function on(root, selector, type, handler) {
  root.addEventListener(type, (event) => {
    const target = event.target.closest(selector)
    if (target && root.contains(target)) handler(event, target)
  })
}

export const isFunction = (val) => typeof val === 'function'

/**
 * 媒体（图片）对齐：正文里的 img 是 display:block，居中等对齐靠 margin:auto 实现。
 * 工具栏命令与气泡工具条共用同一套逻辑，保证两条入口行为一致。
 */
export function getMediaAlign(img) {
  if (!img) return 'left'
  const ml = img.style.marginLeft
  const mr = img.style.marginRight
  if (ml === 'auto' && mr === 'auto') return 'center'
  if (ml === 'auto') return 'right'
  return 'left'
}

export function setMediaAlign(img, align) {
  if (!img) return
  img.style.maxWidth = '100%'
  if (align === 'center') {
    img.style.marginLeft = 'auto'
    img.style.marginRight = 'auto'
  } else if (align === 'right') {
    img.style.marginLeft = 'auto'
    img.style.marginRight = '0'
  } else {
    img.style.marginLeft = '0'
    img.style.marginRight = 'auto'
  }
}
