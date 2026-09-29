import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
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
