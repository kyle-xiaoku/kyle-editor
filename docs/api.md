# API 参考

## 一、创建实例

```js
import { KEditor } from 'kyle-editor'

const editor = new KEditor('#editor', { /* options */ })
// 或
const editor = KEditor.create(el, options)   // el: 选择器 / HTMLElement / Vue ref.$el
```

---

## 二、配置项 options

| 配置 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `value` | `string` | `''` | 初始 HTML；留空时取挂载节点的 `innerHTML` |
| `placeholder` | `string` | `'开始撰写内容…'` | 空内容占位文案 |
| `height` | `number` | `460` | 编辑区可视高度（px），`0` 为自适应内容高度 |
| `minHeight` | `number` | `320` | 纸张最小高度 |
| `paperWidth` | `number` | `677` | 正文版心宽度（与公众号一致） |
| `primaryColor` | `string` | `'#07c160'` | 主题色（CSS 变量 `--ke-primary`） |
| `toolbar` | `string[] \| false` | `DEFAULT_TOOLBAR` | 工具栏项，见下表；`false` 隐藏 |
| `hideToolbar` | `boolean` | `false` | 隐藏工具栏 |
| `hideStatusbar` | `boolean` | `false` | 隐藏底部状态栏 |
| `readOnly` | `boolean` | `false` | 只读 |
| `autofocus` | `boolean` | `false` | 创建后自动聚焦 |
| `maxLength` | `number` | `0` | 超出后提示（软限制，不截断输入） |
| `wordCount` | `boolean` | `true` | 底部字数/媒体统计 |
| `sanitize` | `boolean` | `true` | 初始化与 `setContent` 时净化 HTML |
| `historyLimit` | `number` | `60` | 撤销栈深度 |
| `uploader` | `'mock' \| object \| fn \| ChunkUploader` | `'mock'` | 上传适配器，见 [upload-adapter.md](upload-adapter.md) |
| `upload` | `object` | `{chunkSize:1MB, concurrency:3, retries:2, fingerprint:'fast'}` | 分片参数 |
| `image.compress` | `object\|false` | `{maxWidth:1440, quality:0.85, minSize:300KB}` | 上传前大图压缩 |
| `maxImageSize` | `number` | `20MB` | 图片体积上限，超限拦截 |
| `maxVideoSize` | `number` | `512MB` | 视频体积上限 |
| `imageAccept` / `videoAccept` | `string` | 常见图/视频类型 | 文件选择器 `accept` |
| `paste.enabled` | `boolean` | `true` | 接管粘贴 |
| `paste.clean` | `boolean` | `true` | 粘贴内容净化（Word/WPS 自动清洗） |
| `paste.uploadFiles` | `boolean` | `true` | 粘贴截图/文件即上传 |
| `paste.localizeImages` | `boolean` | `false` | 尝试把外链图片下载后本地化 |

### 工具栏项

`undo` `redo` `heading` `fontsize` `bold` `italic` `underline` `strike` `foreColor` `backColor`
`alignLeft` `alignCenter` `alignRight` `alignJustify` `ul` `ol` `quote` `link` `image` `video`
`table` `code` `hr` `clear` `source` `preview` `fullscreen`；分隔符 `'|'`，右对齐标记 `':tail'`。

```js
toolbar: ['undo', 'redo', '|', 'bold', 'italic', '|', 'image', 'video', ':tail', 'source']
```

工具栏始终单行显示，放不下时可**左右滑动**，并有四重提示保证可发现性：

| 提示 | 作用 |
| --- | --- |
| 常显滚动条 | 静止时也能从滑块长度看出「还有更多工具」 |
| 尾部左缘渐隐 + 阴影 | 明确表达「有工具正藏在这块底下」，滑到最右自动消失 |
| 左缘渐隐 | 已向右滑出时提示左边还有内容 |
| 首次引导气泡 | 「工具栏可左右滑动」，3.8s 后或首次滑动后消失，`localStorage` 记忆不重复弹 |

鼠标还可**直接按住拖动**平移工具栏（光标变为抓握状）；触屏沿用系统原生滑动。`:tail` 之后的「源码 / 预览 / 全屏」始终吸附在右端可见。

#### 下拉面板一览

| 按钮 | 点击行为 | 面板内容 |
|------|----------|----------|
| `heading` | 展开「段落样式」面板 | 正文 / 标题一 / 标题二 / 标题三，每档给出**真实字号预览 + 用途说明**（如「标题一 · 大标题 · 22px 加粗，全文主标题（建议只用一次）」），按钮文案跟随当前段落 |
| `fontsize` | 展开「字号」面板 | 12–32px 网格，当前字号高亮 |
| `foreColor` | **一次点击直接展开颜色面板** | 最近使用（本次会话）+ 主题颜色 + 标准颜色，色块带中文名称 tooltip，底部为取色器 + HEX 输入 + 应用；右上角「恢复默认」清除上色 |
| `backColor` | 同上（底色） | 推荐底色 + 主题颜色 + 自定义；按钮上的「A」用当前底色做高亮示意 |
| `image` / `video` | 展开插入面板 | 两个页签：**本地上传**（点击或拖拽到虚线区）/ **网络链接**（粘贴地址即可插入，附带可访问性校验提示） |
| `table` | 展开网格 | 10×8 规格选择，实时显示「N 列 × M 行」 |
| `link` | 展开表单 | 文字 / 地址 / 新窗口打开，已链接时提供「移除链接」 |

面板统一样式：圆角卡片 + 标题栏 + 分区小标题 + 入场动画；打开时会自动记录正文选区，操作后还原，因此**先选文字再点颜色**一定生效。

#### 图片缩放

点击正文中的图片会浮出气泡工具条（对齐 / 宽度 30%·60%·100% / 圆角 / 查看大图 / 替换 / 删除），同时图片**右下角出现圆形拖拽把手**：

- 按住把手左右拖动，实时按**容器宽度百分比**等比缩放，顶部浮层显示当前宽度（如 `58%`）
- 范围限制 15%–100%，不会拖出正文版心；松开即写入撤销栈，可 `⌘/Ctrl+Z` 回退
- 把手与浮层挂在编辑器容器上，**不进入内容区**，不会污染 `getHTML()` 导出与历史快照
- 视频卡片不支持拖拽缩放（保持固定比例），可用气泡工具条的「窄版 / 宽版」切换

#### 图片对齐

选中图片后，**工具栏的「左对齐 / 居中 / 右对齐」与气泡工具条的对齐按钮效果完全一致**——都作用于图片本身（`img` 为块级元素，靠 `margin:auto` 定位），而非所在段落：

- 图片宽度为 100% 时居中无视觉差异，**先缩小（拖拽把手或宽度按钮）再居中**即可看到图片在正文中水平居中
- 对齐写入撤销栈，可 `⌘/Ctrl+Z` 回退；工具栏对齐按钮会随选中图片的对齐状态高亮

#### 快捷键

| 快捷键 | 作用 |
|--------|------|
| `⌘/Ctrl + B / I / U` | 加粗 / 斜体 / 下划线 |
| `⌘/Ctrl + K` | 插入链接 |
| `⌘/Ctrl + Shift + K` | 切换 HTML 源码模式 |
| `⌘/Ctrl + Z` / `Shift + Z` / `Y` | 撤销 / 重做 |
| `⌘/Ctrl + S` | 触发 `save` 事件 |
| `Esc` | 关闭面板 / 退出预览 |

### 回调

| 回调 | 签名 | 说明 |
|------|------|------|
| `onChange(html, editor)` | | 内容变化（160ms 防抖） |
| `onReady(editor)` | | 实例可用 |
| `onError(error)` | | 内部异常 |
| `onUpload({stage, file, kind, url, percent, info})` | | `uploadstart/uploaddone/uploaderror/uploadcancel` |
| `beforeUpload(file, kind)` | 返回 `File` 改写、`false` 拦截 | 上传前钩子（加水印、二次校验等） |

---

## 三、实例属性与方法

```ts
editor.id                     // 实例 id
editor.el                     // 最外层容器
editor.root                   // contenteditable 节点
editor.options                // 合并后的配置
editor.commands               // 指令集（可程序化调用）
editor.media                  // 上传/媒体管理
editor.uploader               // ChunkUploader 实例
editor.history                // 撤销栈
editor.readOnly / sourceMode / previewMode / fullscreen
```

| 方法 | 说明 |
|------|------|
| `getHTML({clean?})` | 取当前 HTML，默认剔除编辑器内部属性、未完成占位块 |
| `getText()` | 纯文本 |
| `getJSON()` | `{html, text, counts}` |
| `setContent(html, {sanitize?, silent?})` | 覆盖内容 |
| `appendHTML(html)` | 在光标处插入 |
| `clear()` | 清空并取消所有上传 |
| `focus()` / `blur()` | 聚焦/失焦 |
| `setReadOnly(bool)` | 切换只读 |
| `undo()` / `redo()` | 撤销/重做（含光标位置恢复） |
| `insertImage(url, alt?)` / `insertVideo(url, label?)` | 按地址插入媒体（等同工具栏「网络链接」页签） |
| `upload(file, kind?)` | 手动触发一次上传（自动判断图片/视频） |
| `cancelUploads()` | 取消全部进行中任务 |
| `counts()` | `{chars, words, images, videos, uploading}` |
| `enterSource()` / `exitSource()` / `toggleSource()` | 源码模式 |
| `openPreview()` / `closePreview()` / `togglePreview()` | 预览模式 |
| `toggleFullscreen()` | 全屏编辑 |
| `on(type, fn)` / `off(type, fn)` | 事件订阅，返回取消函数 |
| `destroy()` | 卸载实例、清理监听与临时 URL |

### 事件

| 事件 | 载荷 | 触发时机 |
|------|------|----------|
| `ready` | `{editor}` | 实例挂载完成 |
| `change` | `{html, text}` | 内容变化 |
| `focus` / `blur` | | 编辑区聚焦/失焦 |
| `save` | `{html}` | ⌘/Ctrl + S |
| `uploadstart` | `{file, kind}` | 开始上传 |
| `uploaddone` | `{file, kind, url}` | 上传完成 |
| `uploaderror` | `{file, kind, error}` | 失败（已重试后） |
| `uploadcancel` | `{file, kind}` | 取消 |
| `insertmedia` | `{kind, url, node}` | 通过「网络链接」页签插入图片/视频 |
| `sourcechange` | `{mode: 'source'\|'visual'}` | 源码模式切换 |

---

## 四、指令集 commands

```js
editor.commands.toggleMark('bold' | 'italic' | 'underline' | 'strike')
editor.commands.setFontSize(18)
editor.commands.setColor('fore' | 'back', '#07c160')       // color=null 恢复默认
editor.commands.setAlign('left' | 'center' | 'right' | 'justify')
editor.commands.toggleList('ordered' | 'unordered')
editor.commands.setHeading('p' | 'h1' | 'h2' | 'h3')
editor.commands.toggleBlockquote()
editor.commands.createLink({ url, text, target })
editor.commands.removeLink()
editor.commands.insertTable(3, 2)          // 列, 行
editor.commands.insertCodeBlock('const a = 1')
editor.commands.insertDivider()
editor.commands.insertHTML('<p>富文本片段</p>')
editor.commands.clearFormat()
editor.getState()                   // 当前选区状态（工具栏高亮用）
```

## 五、独立可用的工具函数

```js
import { sanitizeHtml, formatHtml, escapeHtml, isSafeUrl, cleanWordHtml, mockAdapter, httpAdapter, simpleAdapter, ChunkUploader } from 'kyle-editor'

sanitizeHtml(dirtyHtml)      // 白名单净化，返回安全 HTML
formatHtml(html)             // 缩进美化（编辑器源码模式同款）
cleanWordHtml(wordHtml)      // 粘贴前的 Word/WPS 清洗
isSafeUrl('javascript:1')    // => false
```

UMD / 默认导出上也挂了一批静态成员，`<script>` 引入时直接可用：

```js
KEditor.version                 // '1.0.0'
KEditor.sanitizeHtml(html)      // 白名单净化
KEditor.formatHtml(html)        // 源码美化
KEditor.cleanWordHtml(html)     // Word 清洗
KEditor.mockAdapter({speed})    // 内置分片模拟适配器
KEditor.httpAdapter(config)     // 真实后端适配器
KEditor.simpleAdapter(fn)       // 单次直传适配器
KEditor.chunkUploader(file, adapter, opts) // 分片调度器
KEditor.utils                   // { uid, escapeHtml }
KEditor.create(el, options)     // 工厂方法，等价于 new KEditor(...)
KEditor.plugin                  // Vue 3 插件（仅 keditor-vue.umd.js）
```

> TypeScript：包内自带 `types/index.d.ts` 与 `types/vue.d.ts`，`import KEditor from 'kyle-editor'` 即有完整提示，无需额外安装。

## 六、安全说明

- 所有进入编辑器的外部 HTML（`value`、`setContent`、粘贴）都会经过 `sanitizeHtml`：标签/属性双白名单、`on*` 事件属性剔除、`javascript:`/`vbscript:`/`file:`/非法 `data:` 协议拦截、`style` 声明逐条过滤（丢弃 `expression`、`behavior` 等）。
- `getHTML({clean: false})` 会返回含编辑器内部属性的原始 HTML，请仅在调试时使用；入库前建议再跑一次 `sanitizeHtml`。
