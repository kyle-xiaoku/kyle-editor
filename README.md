# KEditor

轻量、美观的**微信公众号风格富文本编辑器**。纯前端实现，无任何后端依赖：图片/视频走**分片上传**（并发、重试、取消、秒传、断点续传），随时切换 **HTML 源码模式**查看或改写产物。支持 `<script>` 直接引入与 Vue 3 安装集成。

- 体积：`dist/keditor.umd.js` 约 139 KB（gzip 37 KB），零运行时依赖，样式随 JS 注入
- 版式：677px 正文版心、17px/1.75 行距，与公众号观感一致
- 安全：标签/属性白名单净化，拦截 `on*`、`javascript:`、`script/iframe`

## 功能

| 分类 | 能力 |
|------|------|
| 排版 | 段落样式面板（正文/标题一/标题二/标题三，带真实字号预览与用途说明）、字号面板（12–32px）、字体颜色与背景高亮（主题色 + 标准色 + 最近使用 + 自定义取色）、粗斜下删、四种对齐、有序/无序列表、引用、表格（网格选择）、代码块、分割线、链接、清除格式 |
| 媒体 | 图片/视频**本地上传**（点击、拖拽、粘贴截图）或**直接填网络链接**插入（自动校验可访问性）；分片进度与速度、取消、失败重试、多图多选、大图自动压缩、双击看原图、气泡工具条（对齐/宽度/圆角/替换/删除） |
| 上传 | `chunkSize / concurrency / retries / fingerprint` 可配；内置 mock、http、simple 适配器，也可自定义 `init/put/complete` |
| 源码 | 工具栏右侧常驻「源码」按钮（`⌘/Ctrl+Shift+K`），进入后正文按钮置灰；格式化缩进、复制、直接编辑并应用（回填自动净化） |
| 其他 | 实时字数/词数/图片视频统计、预览（手机/平板/电脑屏宽）、全屏编辑、撤销重做（保留光标位置）、只读、窄屏工具栏单行滚动且「源码/预览/全屏」固定右端 |

## 安装

```bash
npm install kyle-editor
# 使用 Vue 组件的项目
npm install kyle-editor vue@^3
```

或直接用 CDN（无需安装）：

```html
<script src="https://unpkg.com/kyle-editor/dist/keditor.umd.js"></script>
```

> 零运行时依赖；样式随 JS 注入，**不需要额外引入 CSS**。Vue 是可选 peerDependency，只用核心 API 的项目不会被强制安装。

## 快速开始

### 方式一：`<script>` 引入（零构建）

```html
<div id="editor"></div>
<script src="https://unpkg.com/kyle-editor/dist/keditor.umd.js"></script>
<!-- 本地开发时也可用相对路径：<script src="dist/keditor.umd.js"></script> -->
<script>
  const editor = KEditor.create('#editor', {
    placeholder: '开始撰写内容，支持拖拽 / 粘贴图片与视频…',
    height: 460,
  })
  editor.on('change', ({ html }) => console.log(html))
</script>
```

### 方式二：ESM / 打包器

```js
import KEditor from 'kyle-editor'

const editor = KEditor.create('#editor', { height: 460 })
```

### 方式三：Vue 3 安装集成

```js
// main.js
import { createApp } from 'vue'
import KEditorVue from 'kyle-editor/vue'

createApp(App).use(KEditorVue).mount('#app')
```

```vue
<template>
  <k-editor v-model="form.content" :options="options" :disabled="saving" @upload="onUpload" />
</template>

<script setup>
import { ref } from 'vue'

const form = ref({ content: '' })
const options = {
  height: 420,
  // 无后端时保持默认 'mock'；上线时换成下面这行即可
  uploader: { type: 'http', initUrl: '/api/upload/init', chunkUrl: '/api/upload/chunk', completeUrl: '/api/upload/complete' },
  upload: { chunkSize: 5 * 1024 * 1024, concurrency: 4 },
}
const onUpload = (payload) => console.log(payload.stage, payload.percent)
</script>
```

> ESM / Webpack / Vite / React 用法见 [docs/integration.md](docs/integration.md)。

## 本地运行

```bash
npm install
npm run build          # 产出 dist/（es + cjs + umd，含 Vue 版本）
npm run dev            # 静态服务 http://127.0.0.1:5178
```

打开：

- `index.html` — 说明首页
- `demo/script.html` — UMD 引入 + 分片日志面板
- `demo/esm.html` — 自定义上传适配器演示
- `demo/vue.html` — Vue 3 组件 + `v-model`
- `test/smoke.html` — 40 条内置冒烟用例（可视化结果）

## 验证

```bash
npm run build
npm run dev &                                    # 启动静态服务
node test/run-headless.mjs                       # 冒烟用例（需本机 Chrome）
node test/check-page.mjs                         # 三个 demo 页面健康检查
```

当前状态：`40/40` 用例通过，demo 页面无控制台报错。

## 文档

| 文档 | 内容 |
|------|------|
| [docs/integration.md](docs/integration.md) | Script / ESM / Vue3 / React / Nuxt 集成，常见问题 |
| [docs/api.md](docs/api.md) | 全部配置项、实例方法与事件、工具栏自定义 |
| [docs/upload-adapter.md](docs/upload-adapter.md) | 分片上传流程、后端接口约定、自定义适配器 |

## 目录结构

```
src/
├── index.js              # 入口（导出 create/KEditor/适配器/工具函数）
├── core/                 # 编辑器内核
│   ├── editor.js         # 组装 DOM、事件、状态、对外 API
│   ├── toolbar.js        # 工具栏声明式配置
│   ├── commands.js       # 富文本指令（字号/颜色/对齐/列表/表格/链接…）
│   ├── sanitize.js       # HTML 白名单净化 + Word 粘贴清洗
│   ├── paste.js          # 粘贴/拖拽（截图直传、外链图片本地化）
│   ├── history.js        # 快照式撤销栈（保留光标）
│   ├── selection.js      # 选区与光标工具
│   ├── format.js         # HTML 美化输出
│   └── icons.js          # 内置 SVG 图标
├── upload/               # 分片上传
│   ├── chunk-uploader.js # 切片、并发、重试、进度、取消
│   ├── adapters.js       # mock / http / simple 适配器
│   └── fingerprint.js    # 秒传与断点续传指纹
├── media/media.js        # 图片视频插入、占位块、压缩、替换
├── ui/                   # 样式注入、弹层、源码面板、预览、气泡工具条、toast
└── vue/index.js          # Vue 3 插件 + 组件 + useKEditor

types/                    # 手写 TypeScript 声明（核心 + Vue）
docs/                     # 集成文档（index / integration / api / upload-adapter / npm-publish）
demo/                     # script / esm / vue 三种集成示例页
test/                     # 无头冒烟用例、页面健康检查、发布配置校验、视觉截图
```

## 开发与验证

```bash
python3 -m http.server 5178 --bind 127.0.0.1   # 或 npm run dev

npm run build          # 产出 dist/：keditor.{es.js,cjs,umd.js} + keditor-vue.{es.js,cjs,umd.js}
npm test               # 无头 Chrome 跑 66 项功能冒烟（test/smoke.html）
npm run test:pages     # 4 个 demo 页面健康检查（挂载/控制台错误）
npm run test:types     # .d.ts 语法校验（无需 tsc）
npm run test:package   # 63 项发布配置校验（包名/exports/.cjs 后缀/裸说明符）
npm run verify         # 上述全部一次跑完
npm run test:visual    # 9 个关键界面截图到 test/screenshots/
```

当前状态：构建通过，**66/66 冒烟用例通过**，4 个 demo 页面零控制台错误，63 项发布配置校验通过。覆盖范围包括：输入与统计、全部工具栏指令、列表嵌套、表格与行列增删、颜色面板（选色/最近使用/自定义）、段落样式面板、字号面板、图片与视频的网络链接插入、链接校验、粘贴净化（含 XSS 拦截）、拖拽上传、分片进度与取消、历史撤销重做、源码模式双向同步与按钮态、预览、只读、Vue 插件与 v-model、UMD 全局挂载。

## 发布到 npm

包名 `kyle-editor`（`keditor` 已被占用）。发布配置、本地验证、版本管理、私有源与 CI 自动发布全流程见 **[docs/npm-publish.md](docs/npm-publish.md)**。

```bash
npm login              # 登录（浏览器授权）
npm run release        # 构建 + 全量验证 + npm publish --access public
```

已实测：从 tarball 全新安装后，CJS / ESM × 核心 / `kyle-editor/vue` 四个入口均能正确解析并拿到完整导出。

## 已知限制

- 依赖浏览器 `contenteditable` + `document.execCommand`（主流浏览器均支持，Chrome/Safari/Edge/Firefox 已验证）；不兼容 IE。
- 表格支持插入与行列增删，未内置单元格合并；需要时可自行扩展 `commands.js`。
- 默认适配器产生的 `blob:` 地址仅当前会话有效，正式环境请配置真实 `uploader`（见文档）。
- 强指纹（`fingerprint: 'strong'`）依赖 `crypto.subtle`，需 HTTPS 或 localhost 环境。

## License

MIT
