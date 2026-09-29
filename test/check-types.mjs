/**
 * 类型声明语法校验：不依赖 tsc，用仓库内已有的 esbuild 解析 .d.ts
 * 用法：node test/check-types.mjs
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const files = ['types/index.d.ts', 'types/vue.d.ts']

let esbuild
try {
  esbuild = (await import('esbuild')).default || (await import('esbuild'))
} catch {
  console.log('  未安装 esbuild，跳过 .d.ts 语法校验')
  process.exit(0)
}

let failed = 0
for (const file of files) {
  const source = readFileSync(join(root, file), 'utf8')
  try {
    await esbuild.transform(source, { loader: 'ts', sourcefile: file })
    console.log(`OK   ${file}  (${source.split('\n').length} 行)`)
  } catch (error) {
    failed += 1
    console.log(`FAIL ${file}`)
    for (const item of error.errors || []) console.log(`     ${item.text} @ line ${item.location?.line}`)
  }
}

console.log(failed ? `\n${failed} 个类型文件存在问题` : '\n类型声明语法校验通过')
process.exit(failed ? 1 : 0)
