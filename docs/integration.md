# 集成指南

KEditor 是**纯前端**编辑器，不依赖任何后端接口。三种集成方式任选其一。

| 方式 | 适用场景 | 引入文件 |
|------|----------|----------|
| Script（UMD） | 静态页、jQuery/Vue2 老项目、快速原型 | `dist/keditor.umd.js` |
| ESM / 打包器 | Vite、Webpack、Rollup、Next/Nuxt（客户端组件） | `import { KEditor } from 'kyle-editor'` |
| Vue 3 组件 | Vue 3 项目，`v-model` 双向绑定 | `import KEditorVue from 'kyle-editor/vue'` |

样式随 JS 自动注入（`<style data-keditor-style>`），**无需单独引入 CSS**。

---

## 1. Script 引入（零构建）

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <div id="editor"></div>

    <script src="dist/keditor.umd.js"></script>
    <script>
      const editor = KEditor.create('#editor', {
        placeholder: '开始撰写内容…',
        height: 460,
      })

      editor.on('change', ({ html }) => console.log(html))
      document.querySelector('#save').onclick = () => submit(editor.getHTML())
    </script>
  </body></html>
```

UMD 全局对象 `KEditor` 上的可用成员：

```js
KEditor.create(target, options)   // 返回实例（推荐）
KEditor.mount(...)                // create 的别名
KEditor.KEditor                   // 类本体，new KEditor(target, options)
KEditor.mockAdapter(options)      // 无后端演示适配器
KEditor.httpAdapter(config)       // 真实后端适配器
KEditor.simpleAdapter(fn)         // 单次直传接口包装
KEditor.sanitizeHtml(html)        // 独立使用的 HTML 净化
KEditor.formatHtml(html)          // 独立使用的 HTML 格式化
KEditor.version
```

> 本地预览：仓库根目录已内置静态服务脚本 `npm run dev`（127.0.0.1:5178），打开 `demo/script.html`。

---

## 2. ESM / 打包工具引入

```bash
npm i kyle-editor            # 或将本仓库 dist/ 拷贝进项目
```

```js
import { KEditor, create, mockAdapter } from 'kyle-editor'

const editor = create('#editor', {
  value: '<p>hello</p>',
  uploader: mockAdapter({ speed: 8 }),          // 演示：不请求后端
  upload: { chunkSize: 256 * 1024, concurrency: 3 },
})

// 组件卸载时务必销毁
window.addEventListener('beforeunload', () => editor.destroy())
```

按需引入（tree-shaking 友好）：

```js
import { formatHtml } from 'kyle-editor'            // 源码格式化
import { sanitizeHtml } from 'kyle-editor'          // 粘贴/回填净化
import { ChunkUploader, httpAdapter } from 'kyle-editor' // 只用上传能力
```

### 在 React 中使用

```jsx
import { useEffect, useRef } from 'react'
import { KEditor } from 'kyle-editor'

export function Editor({ value, onChange }) {
  const host = useRef(null)
  const editor = useRef(null)

  useEffect(() => {
    editor.current = new KEditor(host.current, { value, onChange: (html) => onChange(html) })
    return () => editor.current?.destroy()
  }, [])

  useEffect(() => {
    if (editor.current && value !== editor.current.getHTML()) editor.current.setContent(value)
  }, [value])

  return <div ref={host} />
}
```

---

## 3. Vue 3 安装集成

### 3.1 全局注册（推荐）

```js
// main.js
import { createApp } from 'vue'
import App from './App.vue'
import KEditorVue from 'kyle-editor/vue'      // 默认导出是组件（自带 install）

createApp(App).use(KEditorVue).mount('#app')
```

```vue
<template>
  <k-editor v-model="form.content" :options="editorOptions" :disabled="readonly" @upload="onUpload" @ready="onReady" />
  <button @click="submit">保存</button>
</template>

<script setup>
import { ref } from 'vue'

const form = ref({ content: '<p>初始内容</p>' })
const readonly = ref(false)
const editorOptions = {
  placeholder: '支持拖拽 / 粘贴上传…',
  height: 420,
  uploader: { type: 'http', initUrl: '/api/upload/init', chunkUrl: '/api/upload/chunk', completeUrl: '/api/upload/complete' },
  upload: { chunkSize: 1024 * 1024, concurrency: 3, retries: 2 },
}
const onUpload = (payload) => console.log(payload.stage, payload.percent)
const onReady = (editor) => console.log('编辑器实例', editor)
</script>
```

也可指定注册名：

```js
app.use(KEditorVue, { name: 'RichEditor' }) // <rich-editor />
```

### 3.2 局部引入组件

```vue
<script setup>
import { KEditorVue } from 'kyle-editor/vue'
</script>

<template>
  <KEditorVue v-model="html" />
</template>
```

> 默认导出与具名导出 `KEditorVue` 是同一个组件（默认导出额外带了 `install`），
> 所以 `import KEditorVue from 'kyle-editor/vue'` 后直接 `<KEditorVue v-model="html" />` 也能正常渲染。
> 若只想全局注册，用 `import { KEditorPlugin } from 'kyle-editor/vue'` 语义更清楚。

### 3.3 组合式 API

```js
import { useKEditor } from 'kyle-editor/vue'

const { host, editor } = useKEditor({ height: 400 })
// <div ref="host"></div>，editor.value 为 KEditor 实例
```

### 3.4 组件 Props / Emits

| Prop | 类型 | 说明 |
|------|------|------|
| `modelValue` | `string` | HTML 字符串，`v-model` 绑定；外部变更会同步进编辑器 |
| `options` | `object` | 与 `new KEditor(el, options)` 完全一致的配置 |
| `disabled` | `boolean` | 只读模式 |
| `height` | `number` | 覆盖 `options.height` |

| Emit | 载荷 | 说明 |
|------|------|------|
| `update:modelValue` | `html: string` | 内容变化（自动去内部属性） |
| `change` | `{html, text, counts}` | 内容变化（防抖后） |
| `ready` | `editor` | 实例创建完成 |
| `upload` | `{state, kind, name, size, progress, result, error, node}` | 上传生命周期，`state` 为 `start/progress/success/error/cancel` |
| `error` | `{type, error, message}` | 内部异常（上传失败、净化失败、源码解析失败） |
| `save` | `{html, text, counts}` | 编辑器内按下 ⌘/Ctrl+S |
| `focus` / `blur` | — | 焦点变化 |

通过 `ref` 拿到原生实例做进阶操作：

```vue
<k-editor ref="editorRef" v-model="html" />
<script setup>
const editorRef = ref()
editorRef.value.editor.setContent('<p>来自父组件</p>')   // KEditor 实例
editorRef.value.getHTML()
</script>
```

### 3.5 SSR 框架（Nuxt 3 / Next.js）

> ❗ 编辑器依赖 `document`、`DOMParser`、`contenteditable`，**只能在浏览器运行**。在服务端渲染阶段引入会报 `document is not defined` / `DOMParser is not defined`，必须做成客户端专属。

**Nuxt 3**：插件文件名带 `.client` 后缀即只在客户端加载

```ts
// plugins/keditor.client.ts
import KEditorVue from 'kyle-editor/vue'
export default defineNuxtPlugin((nuxtApp) => nuxtApp.vueApp.use(KEditorVue))
```

```vue
<template>
  <ClientOnly>
    <k-editor v-model="html" />
  </ClientOnly>
</template>
```

**Next.js（App Router）**：组件顶部标 `'use client'`，并用 `next/dynamic` 关闭 SSR

```tsx
// app/editor-page.tsx
'use client'
import dynamic from 'next/dynamic'

const KEditor = dynamic(() => import('kyle-editor/vue').then((m) => m.KEditorVue), { ssr: false })

export default function Page() {
  return <KEditor modelValue="" />
}
```

若需在服务端做 HTML 消毒（例如入库前过滤），不要直接用本包的 `sanitizeHtml`（依赖 DOM），请改用 `isomorphic-dompurify` 等同构方案；`escapeHtml` / `isSafeUrl` 是纯函数，Node 下可直接用。

---

### 3.6 TypeScript

包内自带声明（`package.json` 的 `types` 与 `exports.types`），无需安装 `@types`：

```ts
import KEditor, { type KEditorOptions, type UploadAdapter, type UploadResult } from 'kyle-editor'

const options: KEditorOptions = {
  height: 480,
  upload: { chunkSize: 2 * 1024 * 1024, concurrency: 4 },
  uploader: myAdapter,          // 满足 UploadAdapter 接口即可
}

const editor = KEditor.create('#editor', options)
const html: string = editor.getHTML()
const counts = editor.counts()
```

Vue 3：`import KEditorVue from 'kyle-editor/vue'` 即带 props/emits 提示；`ref` 取出的实例上 `editor`、`getHTML()`、`focus()` 等均已声明。

UMD 方式（无构建）下若需提示，可 `/// <reference types="kyle-editor/types" />` 或直接使用 `KEditor.create`。

---

## 4. 常见问题

**Q：不需要后端，怎么让图片真的显示出来？**
默认 `uploader: 'mock'` 会在浏览器内完成切片并生成 `blob:` 地址，页面内可直接预览。保存草稿时把 `getHTML()` 存下来即可；正式上线时换成 `httpAdapter` 就会得到 CDN 地址。

**Q：`blob:` 地址提交到服务器会失效，怎么办？**
在提交前调用 `editor.getHTML()`，把 `data-k-url` 为 `blob:` 的资源先上传（`beforeUpload` 里做映射），或直接配置真实 `uploader`。

**Q：如何精简工具栏？**
```js
KEditor.create('#editor', { toolbar: ['undo', 'redo', '|', 'bold', 'image', 'video', ':tail', 'source'] })
```

`'|'` 为分隔符，`':tail'` 之后的按钮靠右对齐（窄屏下吸附在右端不会被滚走），`toolbar: false` 隐藏工具栏。工具栏放不下时可左右滑动，并有滚动条、边缘渐隐、首次引导气泡等提示，详见 [api.md](api.md#工具栏项)。

可用项：`undo` `redo` `heading` `fontsize` `bold` `italic` `underline` `strike` `foreColor` `backColor` `alignLeft` `alignCenter` `alignRight` `alignJustify` `ul` `ol` `quote` `link` `image` `video` `table` `code` `hr` `clear` `source` `preview` `fullscreen`，详见 [api.md](api.md#工具栏项)。

**Q：怎么往工具栏加自己的按钮（比如下拉选模板、选中后插链接）？**
用 `customButtons`，无需改源码。数据可以静态配置，也可以从接口读：

```js
KEditor.create('#editor', {
  customButtons: [
    { name: 'column', text: '栏目', searchable: true, url: '/api/columns', link: true, insert: 'link' },
    {
      name: 'tpl', text: '模板',
      options: [{ value: 'opening', label: '开场白', desc: '问候 + 本期导读' }],
      link: { url: 'https://mp.weixin.qq.com/s/tpl-{value}', text: '【{label}】' },
    },
  ],
})
```

没传 `toolbar` 时会自动追加到工具栏末尾；传了就用名字定位：`toolbar: ['bold', '|', 'tpl']`。
完整字段（缓存/强制刷新/分组/搜索/失败重试/`mode:'open'` 直接开窗/`onSelect` 接管）见 [api.md](api.md#自定义工具栏按钮)。

**Vue 里更常见的写法是在组件里自己请求接口，再灌给按钮：**

```vue
<template>
  <k-editor ref="ed" v-model="html" :options="options" />
</template>

<script setup>
import { ref, onMounted } from 'vue'

const ed = ref(null)
const html = ref('')
const options = {
  customButtons: [
    { name: 'column', text: '栏目', options: [], emptyText: '加载中…', link: { url: 'https://x.com/{value}', text: '{label}' } },
  ],
}

onMounted(async () => {
  const list = await fetch('/api/columns').then((r) => r.json())
  ed.value.editor.setButtonOptions('column', list)   // 数据就绪后刷新下拉
})
</script>
```

> `k-editor` 组件的 `options` 是普通对象，`customButtons` 里的 `load` / `onSelect` 可以直接闭包引用组件里的 axios 实例、埋点函数等。

**Q：不想上传，只想直接贴图片/视频链接？**
点工具栏的图片或视频按钮 → 切到「网络链接」页签 → 粘贴地址即可插入（会同时提示该地址能否加载）。代码层面等价于：
```js
editor.insertImage('https://cdn.example.com/a.png', '图注')
editor.insertVideo('https://cdn.example.com/clip.mp4', '宣传片')
```

**Q：怎么禁止上传大视频？**
`maxVideoSize: 100 * 1024 * 1024`，超限会在插入前提示并拦截。

**Q：内容里的脚本安全吗？**
初始化、粘贴、源码模式回填都会走白名单净化（`sanitize.js`）：剔除 `script/iframe/on*/javascript:` 等，`style` 声明逐条过滤。
