import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/vue/index.js'),
      name: 'KEditorVue',
      formats: ['es', 'cjs', 'umd'],
      fileName: (format) => (format === 'cjs' ? 'keditor-vue.cjs' : `keditor-vue.${format}.js`),
    },
    rollupOptions: {
      external: ['vue', 'kyle-editor'],
      output: {
        globals: {
          vue: 'Vue',
          'kyle-editor': 'KEditor',
        },
      },
    },
    outDir: 'dist',
    emptyOutDir: false,
    minify: false,
    cssCodeSplit: false,
  },
})
