import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

// 版本号单一来源：package.json，构建期注入，避免与 KEditor.version 漂移
const pkg = JSON.parse(readFileSync(resolve(import.meta.dirname, 'package.json'), 'utf8'))

export default defineConfig({
  define: { __KEDITOR_VERSION__: JSON.stringify(pkg.version) },
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.js'),
      name: 'KEditor',
      formats: ['es', 'cjs', 'umd'],
      fileName: (format) => (format === 'cjs' ? 'keditor.cjs' : `keditor.${format}.js`),
    },
    rollupOptions: {
      output: { exports: 'named' },
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    minify: false,
    cssCodeSplit: false,
  },
})
