# KEditor

轻量、美观的**微信公众号风格富文本编辑器**。纯前端实现，无任何后端依赖：图片/视频走**上传（普通整包 + 大文件分片）**（并发、重试、取消、秒传、断点续传），**代码块可选 20 种语言并语法高亮**，**一键导入 Markdown 文件/文本转成可编辑 HTML**，随时切换 **HTML 源码模式**查看或改写产物。支持 `<script>` 直接引入与 Vue 3 安装集成。

- 体积：`dist/keditor.umd.min.js` 约 192 KB（gzip 61 KB），未压缩版 300 KB（gzip 78 KB），零运行时依赖（含内置高亮器与 Markdown 转换器），样式随 JS 注入
- 版式：677px 正文版心、17px/1.75 行距，与公众号观感一致；**宽屏下版心自动生长**，两侧留白恒定，不会留出一大块空白
- 安全：标签/属性白名单净化，拦截 `on*`、`javascript:`、`script/iframe`

## 功能

| 分类 | 能力 |
|------|------|
| 排版 | 段落样式面板（正文/标题一/标题二/标题三，带真实字号预览与用途说明）、字号面板（12–32px）、字体颜色与背景高亮（主题色 + 标准色 + 最近使用 + 自定义取色）、粗斜下删、四种对齐、有序/无序列表、引用、表格（网格选择）、代码块（**20 种语言可选 + 语法高亮**）、分割线、链接、清除格式 |
| 媒体 | 图片/视频**本地上传**（点击、拖拽、粘贴截图）或**直接填网络链接**插入（自动校验可访问性）；上传进度与速度、取消、失败重试、多图多选、大图自动压缩、双击看原图、气泡工具条（对齐/宽度/圆角/替换/删除）、**选中图片后拖拽右下角把手实时缩放** |
| 上传 | **普通上传与分片上传各自独立配置**：`uploader`（整个文件一次请求）+ `chunkUploader`（切片并发，只需一个接口，响应里 `url` 非空即成功）；`upload.mode` 可选 `auto`（按体积自动选，默认 5MB 阀值）/ `normal` / `chunk`，`chunkSize / concurrency / retries / fingerprint` 可配；内置 mock、simple 适配器，也可自定义 `upload/put` 适配器 |
| 源码 | 工具栏右侧常驻「源码」按钮（`⌘/Ctrl+Shift+K`），进入后正文按钮置灰；格式化缩进、复制、直接编辑并应用（回填自动净化） |
| **Markdown 导入** | 尾栏「**导入MD**」按钮打开导入面板：**选文件 / 拖文件 / 粘文本**，实时预览 + 结构统计，三种落点（替换全文 / 追加文末 / 插入光标）；把 `.md` 拖进正文即可转换；围栅代码块**语言保留并高亮**；未知语言、超大文件、只读、GBK 编码都有兜底 |
| 其他 | 实时字数/词数/图片视频统计、预览（手机/平板/电脑屏宽，API 与可选项）、全屏编辑、撤销重做（保留光标位置）、只读、**宽屏版心自适应**（两侧留白恒定，不随屏宽放大）、**内容区高度默认随内容自动撑开**（配了 `height` 才固定并内部滚动）、窄屏工具栏可左右滑动（常显滚动条 + 边缘渐隐 + 首次引导气泡 + 鼠标拖拽平移）且「导入MD/源码/全屏」固定右端 |
| **自定义按钮** | `customButtons` 往工具栏加**下拉选择**按钮：数据可**静态配置**或**从接口读取**（`url` / `load`），选中后按配置**插入跳转链接**或直接打开；面板支持搜索、分组、加载/失败重试/空态、缓存与强制刷新；`position` 可把它放到**工具栏任意位置**（含右侧吸附尾栏）；也可运行时 `addButton` / `moveButton` / `removeButton` / `setButtonOptions` |

## 安装

```bash
npm install kyle-editor
# 使用 Vue 组件的项目
npm install kyle-editor vue@^3
```

或直接用 CDN（无需安装）：

```html
<!-- unpkg / jsdelivr 默认入口就是压缩版，下面两种写法等价 -->
<script src="https://unpkg.com/kyle-editor"></script>
<script src="https://unpkg.com/kyle-editor/dist/keditor.umd.min.js"></script>
```

> 零运行时依赖；样式随 JS 注入，**不需要额外引入 CSS**。Vue 是可选 peerDependency，只用核心 API 的项目不会被强制安装。

## 快速开始

### 方式一：`<script>` 引入（零构建）

```html
<div id="editor"></div>
<script src="https://unpkg.com/kyle-editor/dist/keditor.umd.min.js"></script>
<!-- 本地开发时也可用相对路径：<script src="dist/keditor.umd.min.js"></script>
     调试想看未压缩代码就换成 dist/keditor.umd.js（全局变量、API 完全一致） -->
<script>
  const editor = KEditor.create('#editor', {
    placeholder: '开始撰写内容，支持拖拽 / 粘贴图片与视频…',
    // 高度默认随内容自动撑开；想要固定高度 + 内部滚动就写上 height: 460
  })
  editor.on('change', ({ html }) => console.log(html))
</script>
```

### 方式二：ESM / 打包器

```js
import KEditor from 'kyle-editor'

const editor = KEditor.create('#editor') // 高度默认自适应内容
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
  // 不写 height 就是自适应内容高度；写了则固定高度、内容超出时编辑区内部滚动
  height: 420,
  // 无后端时保持默认 'mock'；上线时换成下面两行即可
  uploader: '/api/upload',                      // 普通上传：整个文件一次请求
  chunkUploader: '/api/chunk-upload',           // 分片上传：大文件自动切片（>=5MB）
  upload: { mode: 'auto', chunkSize: 5 * 1024 * 1024, concurrency: 4 },
}
const onUpload = (payload) => console.log(payload.stage, payload.percent)
</script>
```

> `kyle-editor/vue` 的默认导出是**组件本身（自带 `install`）**，所以上面两种写法等价：
> `app.use(KEditorVue)` 后模板里用全局标签 `<k-editor>`；也可以 `import KEditorVue from 'kyle-editor/vue'` 直接当组件用 `<KEditorVue v-model="html" />`。
> 只想显式拿插件时用 `import { KEditorPlugin } from 'kyle-editor/vue'`。
>
> ESM / Webpack / Vite / React 用法见 [docs/integration.md](docs/integration.md)。

## 上传配置：普通上传 / 分片上传，各自独立配置

上传分两条链路，**互不影响**，可以只配一条，也可以都配：

| 链路 | 适用 | 行为 |
|------|------|------|
| **普通上传** `uploader` | 小文件（图片为主） | 整个文件**一次请求**发完，返回 `url` 即成功 |
| **分片上传** `chunkUploader` | 大文件（视频为主） | 切片 → 并发 → 重试，**只需一个接口**，响应里 `url` 非空即成功 |

```js
KEditor.create('#editor', {
  uploader: '/api/upload',                        // 普通上传（整个文件一次请求）
  chunkUploader: '/api/chunk-upload',             // 分片上传（切片并发）
  upload: {
    mode: 'auto',                                 // 'auto' 按体积自动选（默认）| 'normal' 只走普通 | 'chunk' 只走分片
    chunkThreshold: 5 * 1024 * 1024,              // auto：达到该体积才走分片（默认 5MB）
    chunkSize: 1024 * 1024,                       // 分片大小
    concurrency: 4,                               // 并发分片数
    retries: 2,                                   // 单片失败重试次数
  },
})
```

| 你配了什么 | 实际行为 |
|------|------|
| 两条都配 | `mode: 'auto'`：小于 `chunkThreshold` 走普通，否则走分片 |
| 只配 `uploader` | **全部走普通上传**（分片不启用，不会静默用 mock） |
| 只配 `chunkUploader` | **全部走分片上传**（`mode` 默认变 `'chunk'`） |
| 两条都不配 | 默认两条都是 `'mock'`：小文件普通、大文件分片（开箱演示） |

> 只配一条链路时，另一条不会被默认 `mock` 顶上 —— 否则真实后端只接了一半，另一半会静默产生 `blob:` 假地址。

- `mode: 'chunk'` 但未配置 `chunkUploader`：控制台告警并回退为普通上传，不会静默失败。
- 想手动指定阈值/模式，显式写 `upload: { mode, chunkThreshold }` 即可（显式配置优先于上面的默认规则）。

### 普通上传约定

整包 `POST` 到 `uploader`，`multipart/form-data`：

| 方向 | 内容 |
|------|------|
| 请求 | `file` 整个文件（字段名可用 `fieldName` 改）、`filename`、`fileSize` |
| 响应 | `{ "url": "https://cdn/a.png" }`（也支持 `{ code: 0, data: { url } }`，用 `parse` 解开） |
| 没返回 `url` | 视为**失败**，占位块转错误态并提供「重试 / 移除」 |

> 一次请求无法拿到逐字节进度，普通上传只上报「开始 / 结束」；需要精细进度条就用分片上传。

### 分片上传约定

**每个分片都 POST 到 `chunkUploader` 这一个地址**，**只要某个响应里返回了非空 `url`，就代表这个文件上传成功** —— 编辑器立刻用该地址替换占位块，剩余分片不再上传（服务端秒传、或收齐最后一片时返回都可以）。

| 方向 | 内容 |
|------|------|
| 请求（`multipart/form-data`） | `file` 分片二进制（字段名可用 `fieldName` 改）、`identifier` 同一文件恒定（指纹）、`index` 从 0 起、`total` 总片数、`filename`、`fileSize`、`chunkSize` |
| 响应 | `{ "url": "https://cdn/a.png" }`，也可写成 `{ code: 0, data: { url } }`（外层包装用 `parse` 解开）；`key` / `poster` / `duration` 会被透传 |
| 没返回 `url` | 视为**失败**，占位块转错误态并提供「重试 / 移除」，不会静默当成功 |

```js
// 需要鉴权、自定义字段名、自定义取地址字段时（两条链路写法相同）
KEditor.create('#editor', {
  chunkUploader: {
    type: 'http',
    url: '/api/chunk-upload',
    fieldName: 'chunk',                                    // 默认 'file'
    headers: () => ({ Authorization: `Bearer ${getToken()}` }), // 传函数则每次请求实时取值
    withCredentials: true,
    parse: (json) => json.data,                            // 默认 json.data ?? json
    pickUrl: (json) => json?.payload?.filePath || '',       // 地址字段不叫 url 时自定义（默认认 url / fileUrl / src）
    mode: 'formdata',                                      // 默认 formdata；可用 'raw' 走裸 body + 查询串
  },
})
```

> 分片上传现在是**单接口**：`httpAdapter` 不再接受 `initUrl` / `chunkUrl` / `completeUrl` / `abortUrl`，配了会直接报错提示迁移。
> 需要 `init` / `complete` 这类自定义流程时，自己写一个适配器（实现 `put()`，可选 `init()` / `complete()`）传给 `chunkUploader` 即可，见 [docs/upload-adapter.md](docs/upload-adapter.md)。

### 其他写法（两条链路通用）

```js
uploader: '/api/upload'                                 // 字符串地址（等价于 { type:'http', url }）
uploader: { type: 'http', url: '/api/upload' }          // 显式写法
uploader: KEditor.httpAdapter({ url: '/api/upload' })   // 自己造适配器（交给 createSimpleUploader / createChunkUploader 装配）
uploader: KEditor.simpleAdapter(async (file) => myUpload(file)) // 函数包装：一个文件一次请求
uploader: async (file) => (await myUpload(file)).url    // 直接给函数也行
uploader: 'mock'                                        // 默认：零后端，生成 blob: 地址（仅当前会话有效）
uploader: KEditor.mockAdapter({ speed: 8 })             // mock 可调速度 / 延迟 / 失败率
```

进度/速度/取消/重试，以及完整适配器协议与后端实现建议见 [docs/upload-adapter.md](docs/upload-adapter.md)。

## 自定义工具栏按钮（下拉选择）

不想改源码就能往工具栏加业务按钮。典型场景：插入公司模板、关联栏目、跳转后台页面。

```js
const editor = KEditor.create('#editor', {
  customButtons: [
    // ① 数据从接口读取
    {
      name: 'column',
      text: '栏目',
      title: '插入栏目链接',
      searchable: true,               // 面板内搜索
      url: '/api/columns',            // 内部 fetch；自动识别 items/list/data/rows/records 结构
      link: true,                     // 直接用每项自带的地址（url / href / link 字段）
      insert: 'link',
    },
    // ② 数据静态配置
    {
      name: 'tpl',
      text: '模板',
      title: '插入模板',
      options: [
        { value: 'opening', label: '开场白', desc: '问候 + 本期导读', group: '通用' },
        { value: 'ending', label: '结束语', desc: '引导关注与转发', group: '通用' },
      ],
      // 链接模板：{value} / {label} 以及选项任意字段都可作占位符
      link: { url: 'https://mp.weixin.qq.com/s/tpl-{value}', text: '【{label}】', target: '_blank' },
    },
  ],
})

editor.on('customselect', ({ name, item, link, action }) => {
  console.log(name, item.label, '→', link?.url, '（插入方式：' + action + '）')
})
```

> 没传 `toolbar` 时，自定义按钮会**自动追加**到默认工具栏末尾；传了 `toolbar` 数组则按名字定位：`toolbar: ['bold', '|', 'tpl', 'column']`。
> 想换位置？写 `position`（见下）即可，不需要重抄整份工具栏。

### 按钮位置（可放在工具栏任意位置）

```js
customButtons: [
  { name: 'tpl',    text: '模板',   position: 'start' },              // 工具栏最前
  { name: 'column', text: '栏目',   position: { after: 'link' } },     // 紧跟「链接」之后
  { name: 'emoji',  text: '表情',   position: { before: 'image' } },   // 插在「图片」之前
  { name: 'ad',     text: '头图',   position: 2 },                     // 第 3 个按钮之前（0 起）
  { name: 'stats',  text: '数据',   position: 'tail' },                // 右侧吸附尾栏（与 导入MD/源码/全屏 同区）
  { name: 'draft',  text: '草稿' },                                    // 缺省：主区末尾（尾栏之前）
]
```

| `position` 写法 | 含义 |
| --- | --- |
| `'start'` | 工具栏第一位 |
| `'end'` / 不写 | 主区末尾、右侧吸附尾栏之前 |
| `'tail'` | 右侧吸附尾栏末尾（无尾栏时回退主区末尾） |
| `number` | 第 n 个按钮之前（按视觉顺序，分隔符不计数） |
| `'link'` 等按钮名 | 插到该按钮之前 |
| `{ before: name }` / `{ after: name }` | 显式锚点；`name` 可以是内置按钮，也可以是另一个自定义按钮 |

- 错到不存在的锚点 → 自动回退主区末尾，不报错、不丢按钮。
- `toolbar` 数组里**已经写过**的自定义按钮名字以数组位置为准（`position` 被忽略），所以两种方式可以混用。
- 运行时移位（内置按钮也能移）：

```js
editor.moveButton('column', 'tail')            // 移到右侧尾栏
editor.moveButton('tpl', { after: 'image' })   // 插到图片按钮之后
editor.moveButton('hr', 0)                     // 移到第一位
```

### 数据源（优先级 `load` > `url` > `options`）

```js
// 方式 A：静态数组（也支持纯字符串、或接口原始对象，字段自动归一）
{ options: [{ value: 'a', label: '选项 A', desc: '说明', url: 'https://x.com/a' }] }
{ options: ['选项 A', '选项 B'] }

// 方式 B：自定义函数（可异步，能用编辑器实例与闭包里的 axios / 鉴权头）
{ load: async () => (await fetch('/api/tags').then((r) => r.json())).map((t) => ({ value: t.id, label: t.name })) }

// 方式 C：直接给接口地址
{
  url: '/api/columns',
  fetchOptions: { method: 'POST', headers: { Authorization: 'Bearer x' }, body: '{}', timeout: 8000 },
  pick: (json) => json.result.records,   // 结构特殊时手动提取数组
}
```

- **缓存**：默认只请求一次，面板右上角的刷新按钮可强制重新拉取；`cache: false` 则每次打开都请求
- **加载态**：面板自动显示 spinner + 骨架屏；**失败**时显示错误文案与「重试」按钮；**空数据**可用 `emptyText` 自定义提示
- **在编辑器外部拿数据**（Vue / React 里自己请求）：`editor.setButtonOptions('column', list)`

### 跳转链接配置

```js
{ link: true }                                  // 用每项自带地址
{ link: 'https://x.com/{value}' }                // 地址模板
{ link: { url: '...', text: '【{label}】', target: '_blank' } }
{ link: { mode: 'open', url: 'https://x.com/{value}' } }   // 不写正文，直接新窗口打开
{ link: (item) => ({ url: item.raw.href, text: item.label }) }  // 完全动态
```

- `mode: 'insert'`（默认）在光标处插入 `<a>`，`target: '_blank'` 时自动带 `rel="noopener noreferrer"`
- `mode: 'open'` 直接 `window.open(url, '_blank', 'noopener,noreferrer')`，不改动正文
- **安全**：地址经白名单校验，`javascript:` / `vbscript:` / `data:` 等一律不会变成链接

### 接管选中行为

```js
{
  name: 'tpl',
  options: [/* ... */],
  link: 'https://x.com/{value}',
  insert: 'link',            // 'auto'(默认) | 'link' | 'html' | 'text' | false
  onSelect: (item, ctx) => {
    analytics.track('insert_tpl', item.value)   // 埋点，不阻断默认插入
  },
}

// 完全自己处理：返回 false 则不改正文
{ onSelect: (item, ctx) => { ctx.insertHtml(item.raw.html); return false } }
```

### 运行时增删

```js
editor.addButton({ name: 'season', text: '节气', options: [...], link: 'https://x.com/{value}' })
editor.addButton(spec, { at: 0 })                    // 第 1 个按钮之前
editor.addButton(spec, { at: 'tail' })               // 右侧吸附尾栏
editor.addButton(spec, { before: 'image' })          // 或 { after: 'link' } / { position: 'start' }
editor.moveButton('season', { after: 'link' })       // 移位（内置按钮同样可用）
editor.removeButton('season')                        // 移除并中断未完成的接口请求（附带清掉随行分隔符）
editor.setButtonOptions('season', list)               // 外部灌入数据
editor.getButtonValue('column')                       // 读当前选中项
editor.setButtonValue('column', 'tech')               // 设置选中项（按钮文案同步）
```

### 普通按钮（非下拉）

```js
{ name: 'date', type: 'button', text: '插入日期', icon: 'plus', onClick: ({ editor }) => editor.commands.insertHTML('<p>2026-10-13</p>') }
```

## 代码块（可选语言 + 语法高亮）

工具栏「代码块」按钮点开就是一个**语言面板**（20 种内置语言，支持按名称或别名搜索，如 `js` / `mysql` / `yml`）：

- 选好语言后插入代码块，光标直接落在块内，可以**边写边高亮**
- 光标已在某个代码块里时，同一个面板变成「代码块语言」，选一项即**改写当前块的语言**并重新着色
- 语言写入 `data-k-lang`（编辑器识别）与 `class="language-x"`（通用约定），块右上角显示语言角标，`plaintext` 不显示
- **高亮只是编辑/预览时的显示效果**：`getHTML()`、源码模式、复制出去的内容都是**不带 `<span>` 的干净代码**，再次导入会自动重新高亮

```js
KEditor.create('#editor', {
  code: {
    languages: ['js', 'python', 'go', 'sql'], // 只留几种（主名或别名都认）；不写 = 全部 20 种
    defaultLanguage: 'python',                // 新建代码块默认语言（不在清单内会落到第一项）
    highlight: true,                          // false = 只保留纯文本，语言标记照写
  },
})

// 运行时
editor.codeLanguages()                      // [{ value:'javascript', label:'JavaScript', hint:'前端与 Node 脚本' }, …]
editor.insertCode('const a = 1', 'js')      // 插入代码块（语言可省，用 defaultLanguage）
editor.setCodeLanguage('sql')               // 改写光标所在块的语言（返回生效语言；不在块内返回 null）
editor.getCodeLanguage()                    // 光标所在块的语言，不在块内返回 ''
editor.getState().inCode                    // 光标是否在代码块内（工具栏按钮据此高亮）
editor.highlightCode()                      // 手动重跑全量高亮，返回处理的块数
KEditor.highlightCode(code, 'python')       // 纯函数：把源码转成带 token 的 HTML 片段（已转义）
KEditor.listLanguages()                     // 语言清单；normalizeLang('MySQL') === 'sql'
```

| 内置语言 | |
| --- | --- |
| `plaintext` `javascript` `typescript` `html` `css` `json` `python` `java` `go` `rust` | `c` `csharp` `php` `ruby` `sql` `bash` `yaml` `ini` `markdown` `diff` |

别名同样可用：`js`/`ts`/`py`/`golang`/`yml`/`sh`/`md`/`c++`/`cs`/`mysql`/`postgres`/`toml`/`patch` …

> 高亮器是内置的极简 tokenizer（零依赖，约 13 KB gzip），正则规则带长度保护：**单块超过 60 KB 的代码按纯文本处理**，避免长文档卡顿。样式沿用 One Dark 配色，作用域限定在 `.ke-content` 内，不会影响宿主页面。

## 导入 Markdown（.md / 粘贴文本 → 可编辑 HTML）

工具栏尾栏的 **导入MD** 按钮打开导入面板：选文件、拖文件，或直接粘文本，**实时预览**转换结果与结构统计，再选落点导入。把 `.md` / `.markdown` / `.txt` 文件**拖进正文**也能直接转换。

```js
KEditor.create('#editor', {
  markdown: {
    insertMode: 'replace', // 默认落点：replace 替换全文 / append 追加文末 / cursor 插入光标
    maxSize: 5 * 1024 * 1024, // 单文件上限（字节），0 = 不限制
    gfm: true,             // 表格 / 删除线 / 任务列表 / 裸链接
    breaks: false,         // true = 段落内单换行也当硬换行
    linkTarget: false,     // true 或 '_blank' = 外链自动加 target + rel="noopener noreferrer"
    frontMatter: true,     // 丢弃开头的 YAML front matter
  },
})

// 运行时（source 支持 文本 / File / { name, content }）
await editor.importMarkdown(mdText)                  // 按 options.markdown.insertMode 落点
await editor.importMarkdown(file, { mode: 'append' }) // 临时指定落点
await editor.setMarkdown(mdText)                     // 替换全文
await editor.insertMarkdown(mdText)                  // 插入光标处
await editor.appendMarkdown(mdText)                  // 追加到文末
editor.markdownOptions()                             // { insertMode:'replace', maxSize:5242880, auto:true }

// 纯函数（不依赖实例，Node 端也能用）
KEditor.markdownToHtml('# 标题\n\n正文', { gfm: true })
KEditor.markdownSummary(html)                        // { headings, paragraphs, lists, items, codeBlocks, quotes, tables, images, links }
KEditor.isMarkdownFile({ name: 'a.md', type: '' })    // 按 MIME + 扩展名判断
KEditor.normalizeInsertMode('append')                // 非法值回落 'replace'
KEditor.MARKDOWN_ACCEPT                              // <input accept> 用
```

导入返回值 `{ ok, html, summary, mode, chars, name }`；只读模式返回 `{ ok: false, reason: 'readonly' }`，超限或读文件失败返回 `{ ok: false, reason: 'error' }`。导入成功后会触发 `markdownimport` 事件（`editor.on('markdownimport', fn)`）。

> 手边没文件？demo 里带了一份示例：`demo/assets/sample.md`（含标题 / 表格 / 任务列表 / 多语言代码块），拖进 demo 的正文就能看到完整效果。

| 支持 | 说明 |
| --- | --- |
| 标题 | `#` ~ `######` 与 setext（`===` / `---`） |
| 列表 | 有序 / 无序 / 嵌套 / 松散段落 / 任务列表（`- [x]` → ☑） |
| 表格 | GFM 表格，列对齐写入 `style="text-align:…"` |
| 代码块 | 围栅与缩进，**语言保留并高亮**（`data-k-lang` + `class="language-x"`），未知语言退化纯文本 |
| 行内 | 粗体 / 斜体 / 删除线 / 行内代码 / 转义 / 硬换行 / 引用式与自动链接 / 图片 |
| 其他 | 引用（含嵌套与懒续行）、分隔线、YAML front matter 丢弃、内联 HTML 与 HTML 块 |

> 转换产物就是编辑器正文规范里的普通 HTML（`<p>` `<h1-6>` `<ul>` `<ol>` `<table>` `<blockquote>` `<pre data-k-lang>` …），默认再过一遍白名单净化：`<script>`、`on*`、`javascript:` 等会被清掉或转义。导入是**单次快照**，之后就能用所有排版功能继续改，`getHTML()` 导出的内容可再次导入。
>
> 转换器同样是内置的零依赖实现（约 9 KB gzip），不上传任何内容到远端；单文件默认 5 MB 上限，`markdown.maxSize` 可调。

## 内容区高度（默认自适应，配了才固定）

不配置 `height` 时，内容区**随内容自动撑开**（整页滚动，工具栏尽量吸附在视口顶部）；配置了 `height` 才固定高度，内容超出时在编辑区内部滚动。

```js
KEditor.create('#editor', {})                  // 自适应：默认行为
KEditor.create('#editor', { height: 460 })     // 固定 460px，内部滚动
KEditor.create('#editor', { minHeight: 200 })  // 只控最小高度

// 运行时切换
editor.setHeight(600)      // 固定 600px
editor.setHeight(0)        // 回到自适应（也接受 'auto'）
editor.heightOptions()     // { height: 0, auto: true }
```

| 配置 | 效果 |
| --- | --- |
| 不写 `height` | 自适应内容高度，整页滚动；工具栏尽量吸附视口顶部 |
| `height: 460` | 固定 460px，内容超出时编辑区内部滚动 |
| `height: 0` / `'auto'` | 同「不写」，用于显式声明 |
| `minHeight: 320` | 内容区最小高度（两种模式下都生效，默认 320） |

> 自适应模式下工具栏会吸附在视口顶部（`.ke` 用 `overflow: clip` 而非 `hidden`，否则 sticky 会被自己的裁剪层拦住）；但若**宿主容器**带 `overflow: hidden` 之类的裁剪，浏览器会以该容器为参照，吸附失效（工具栏随页面滚走，其余行为不变）。视觉验证页与 demo 的 `.card` 就属于后者。

## 版心宽度与宽屏适配

宽屏下如果版心固定 677px，编辑器两侧会出现大片空白。默认采用 **fluid 版心**：版心不小于 `paperWidth`，宽屏时随容器生长，两侧留白恒定为 `paperGap`（不再随屏宽放大）。

```js
KEditor.create('#editor', {
  paperWidth: 677,     // 版心基准宽（公众号）；fluid 模式下它是最小宽度
  paperMode: 'fluid',  // 'fluid'（默认）| 'fixed'（恒定 paperWidth + 64）
  paperGap: 24,        // fluid 模式下单侧留白
  paperMaxWidth: 0,    // fluid 模式下的版心上限，0 = 不限
})

// 运行时调整（侧栏折叠、布局变化时）
editor.setPaper({ mode: 'fixed' })
editor.setPaper({ gap: 40, maxWidth: 1000 })
editor.paperOptions()  // { width, mode, gap, maxWidth }
```

| 需求 | 配置 |
| --- | --- |
| 永远像公众号那样居中一栏 | `paperMode: 'fixed'` |
| 宽屏也想多写点字 | 默认 fluid（不限上限） |
| 宽屏但可读性优先 | fluid + `paperMaxWidth: 1000` |

> **预览按钮变更**：`preview` 已从默认工具栏移除（常驻尾栏为「导入MD / 源码 / 全屏」），预览能力不变：`editor.openPreview()` / `closePreview()` / `togglePreview()`。需要按钮时把它写回工具栏：
>
> ```js
> toolbar: [...KEditor.DEFAULT_TOOLBAR.slice(0, -1), 'preview', 'fullscreen']
> // 或直接指定尾栏：toolbar: ['bold', '|', ':tail', 'source', 'preview', 'fullscreen']
> ```

## 本地运行

```bash
npm install
npm run build          # 产出 dist/（es + cjs + umd + umd.min，含 Vue 版本）
npm run build:min      # 只重建压缩版 dist/keditor.umd.min.js
npm run dev            # 静态服务 http://127.0.0.1:5178
```

### 构建产物

| 文件 | 用途 | 体积 |
| --- | --- | --- |
| `dist/keditor.umd.min.js` | **CDN / `<script>` 默认入口**（`unpkg`、`jsdelivr` 均指向它） | 192 KB / gzip 61 KB |
| `dist/keditor.umd.js` | 同上但未压缩，便于断点调试 | 300 KB / gzip 78 KB |
| `dist/keditor.es.js` | ESM（`exports.import`，打包器走这个） | 288 KB |
| `dist/keditor.cjs` | CommonJS（`exports.require`） | 288 KB |
| `dist/keditor-vue.{es,cjs,umd}.js` | Vue 组件/插件，外部化 `vue` 与本包 | 各约 4 KB |

两份 UMD 产物由 `vite.config.core.js`（未压缩）与 `vite.config.min.js`（`minify: 'esbuild'`）从同一入口分别构建，全局变量都是 `window.KEditor`，API 完全一致。

## 验证

```bash
npm run dev &          # 先启动静态服务（测试页面走 http://127.0.0.1:5178）

npm run verify         # build + 冒烟(未压缩) + 冒烟(压缩) + 页面检查 + 类型 + 发布配置
npm test               # 324 项冒烟，跑 dist/keditor.umd.js
npm run test:min       # 同一套 324 项冒烟，跑 dist/keditor.umd.min.js
npm run test:pages     # demo / 首页零控制台错误 + 真实交互探针
npm run test:install   # npm pack → 隔离安装（129 项：Node 26 + 浏览器 103）
npm run test:visual    # 24 张关键状态截图（test/screenshots/）
```

> `test` 与 `test:min` 复用同一个 `test/smoke.html`，靠 `?bundle=min` 切换被测产物 —— 压缩版任何行为差异都会在这里暴露；`test:install` 还会对比两份 UMD 的导出清单，防止 minify 丢导出。
>
> `test:visual` 里的 `scroll` 状态拍的是工具栏引导气泡的动画帧，本身不稳定（连续两次渲染也会不一致），不要把它当像素基准。

## 已知限制

- 依赖浏览器 `contenteditable` + `document.execCommand`（主流浏览器均支持，Chrome/Safari/Edge/Firefox 已验证）；不兼容 IE。
- 表格支持插入与行列增删，未内置单元格合并；需要时可自行扩展 `commands.js`。
- 默认适配器产生的 `blob:` 地址仅当前会话有效，正式环境请配置真实上传接口（见[上传配置](#上传配置普通上传--分片上传各自独立配置)）。
- 强指纹（`fingerprint: 'strong'`）依赖 `crypto.subtle`，需 HTTPS 或 localhost 环境。
- 代码块高亮是**编辑器/预览里的显示效果**，产物本身是纯 `<pre><code>`（不含 token span）。若把产物贴到自己的页面，请保证 `pre` 保留默认的 `white-space: pre`（本编辑器会注入，宿主页面可自行为 `.ke-content pre` 定义主题）；`plaintext` 语言不做着色。
- 单个代码块超过 60 KB 时按纯文本显示（避免长文卡顿），语言标记与导出不受影响。
- Markdown 导入是 **GFM 子集**：不支持脚注、目录（TOC）、数学公式与自定义容器（callout）；这些语法会按普通段落渲染。导入是**单次快照**，不会与源 `.md` 保持双向同步。
- 导入时本地相对路径的图片（`![](./img/a.png)`）只保留路径文本，不会自动上传；需要上传请先转入编辑器后替换图源。
- 文件编码先按严格 UTF-8 解码，失败回退 `gb18030` / `gbk` / `big5`；其他编码（如 UTF-16）需自行转成 UTF-8。

## License

MIT
