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
