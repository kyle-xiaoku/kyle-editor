/** 文件指纹：用于秒传 / 断点续传的任务标识 */

export function fastFingerprint(file) {
  return `${sizeHex(file.size)}-${stampHex(file.lastModified)}-${safeName(file.name)}`
}

/**
 * 强指纹：对首尾各 256KB + 文件大小做 SHA-256（大文件也只需读取极少量数据）
 * 需要 crypto.subtle（HTTPS 或 localhost 环境）
 */
export async function strongFingerprint(file) {
  if (!globalThis.crypto?.subtle) return fastFingerprint(file)
  const span = 256 * 1024
  const parts = [file.slice(0, span)]
  if (file.size > span) parts.push(file.slice(file.size - span))
  const buf = new Uint8Array(parts.reduce((sum, blob) => sum + blob.size, 0))
  let offset = 0
  for (const blob of parts) {
    const chunk = new Uint8Array(await blob.arrayBuffer())
    buf.set(chunk, offset)
    offset += chunk.length
  }
  const digest = await crypto.subtle.digest('SHA-256', buf)
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return `${hex.slice(0, 24)}-${sizeHex(file.size)}`
}

const sizeHex = (size) => Number(size).toString(16)
const stampHex = (ts) => Number(ts || 0).toString(16)
const safeName = (name) => String(name).replace(/[^\w.-]/g, '').slice(0, 24)

export function createFingerprint(mode = 'fast') {
  if (mode === 'strong' || mode === 'sha256') return strongFingerprint
  if (typeof mode === 'function') return mode
  return async (file) => fastFingerprint(file)
}
