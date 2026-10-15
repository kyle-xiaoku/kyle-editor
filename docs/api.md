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
| `height` | `number \| 'auto'` | `0` | 内容区高度：`0` / `'auto'` / 不写 = **随内容自动撑开**（整页滚动）；填 px 才固定高度并内部滚动 |
| `minHeight` | `number` | `320` | 纸张最小高度 |
| `paperWidth` | `number` | `677` | 版心基准宽度（与公众号一致）；`fluid` 模式下它是最小宽度 |
| `paperMode` | `'fluid' \| 'fixed'` | `'fluid'` | 宽屏时版心随容器生长（两侧留白恒定）/ 恒定 `paperWidth + 64` |
| `paperGap` | `number` | `24` | `fluid` 模式下单侧留白（px） |
| `paperMaxWidth` | `number` | `0` | `fluid` 模式下版心最大宽度，`0` = 不限 |
| `primaryColor` | `string` | `'#07c160'` | 主题色（CSS 变量 `--ke-primary`） |
| `toolbar` | `string[] \| false` | `DEFAULT_TOOLBAR` | 工具栏项，见下表；`false` 隐藏 |
| `customButtons` | `CustomButtonSpec[]` | `[]` | 自定义工具栏按钮（下拉选择 + 跳转链接），见下文 |
| `hideToolbar` | `boolean` | `false` | 隐藏工具栏 |
| `hideStatusbar` | `boolean` | `false` | 隐藏底部状态栏 |
| `readOnly` | `boolean` | `false` | 只读 |
| `autofocus` | `boolean` | `false` | 创建后自动聚焦 |
| `maxLength` | `number` | `0` | 超出后提示（软限制，不截断输入） |
| `wordCount` | `boolean` | `true` | 底部字数/媒体统计 |
| `sanitize` | `boolean` | `true` | 初始化与 `setContent` 时净化 HTML |
| `historyLimit` | `number` | `60` | 撤销栈深度 |
| `uploader` | `string \| object \| fn \| SimpleUploader` | `'mock'` | **普通上传**（整个文件一次请求）：直接给接口地址（如 `'/api/upload'`）即可；也可 `{type:'http', url}` / 自定义 adapter / 函数，见 [upload-adapter.md](upload-adapter.md)。只配本项时不启用分片上传 |
| `chunkUploader` | `string \| object \| fn \| ChunkUploader` | `'mock'` | **分片上传**（切片并发，只打一个接口，响应里 `url` 非空即成功）；`null` 表示不启用分片。与 `uploader` 都配置时按 `upload.mode` 选路；只配本项时 `mode` 自动为 `'chunk'` |
| `upload` | `object` | `{mode:'auto', chunkThreshold:5MB, chunkSize:1MB, concurrency:3, retries:2, fingerprint:'fast'}` | 链路与分片参数；`mode` 为 `'auto'`（按体积）/ `'normal'`（只普通）/ `'chunk'`（只分片），另支持 `completeOnUrl` 覆盖「响应带 url 即成功」判定 |
| `image.compress` | `object\|false` | `{maxWidth:1440, quality:0.85, minSize:300KB}` | 上传前大图压缩 |
| `maxImageSize` | `number` | `20MB` | 图片体积上限，超限拦截 |
| `maxVideoSize` | `number` | `512MB` | 视频体积上限 |
| `imageAccept` / `videoAccept` | `string` | 常见图/视频类型 | 文件选择器 `accept` |
| `code.languages` | `string[]` | `[]` | 代码块可选语言（主名或别名，如 `['js','mysql','yml']`）；留空 = 全部 20 种 |
| `code.defaultLanguage` | `string` | `'plaintext'` | 新建代码块的默认语言；不在 `languages` 内会落到清单第一项 |
| `code.highlight` | `boolean` | `true` | 是否语法高亮；`false` 时只保留纯文本（语言标记照写） |
| `markdown.insertMode` | `'replace'\|'append'\|'cursor'` | `'replace'` | Markdown 导入默认落点：替换全文 / 追加文末 / 插入光标（面板里可临时改） |
| `markdown.maxSize` | `number` | `5MB` | 单个 Markdown 文件体积上限（字节），`0` = 不限制 |
| `markdown.gfm` | `boolean` | `true` | GFM 扩展：表格 / 删除线 / 任务列表 / 裸链接 |
| `markdown.breaks` | `boolean` | `false` | 段落内单换行是否转 `<br>` |
| `markdown.linkTarget` | `boolean\|string` | `false` | 外链自动加 `target` + `rel="noopener noreferrer"` |
| `markdown.frontMatter` | `boolean` | `true` | 丢弃开头的 YAML front matter |
| `paste.enabled` | `boolean` | `true` | 接管粘贴 |
| `paste.clean` | `boolean` | `true` | 粘贴内容净化（Word/WPS 自动清洗） |
| `paste.uploadFiles` | `boolean` | `true` | 粘贴截图/文件即上传 |
| `paste.localizeImages` | `boolean` | `false` | 尝试把外链图片下载后本地化 |

### 工具栏项

`undo` `redo` `heading` `fontsize` `bold` `italic` `underline` `strike` `foreColor` `backColor`
`alignLeft` `alignCenter` `alignRight` `alignJustify` `ul` `ol` `quote` `link` `image` `video`
`table` `code` `markdown` `hr` `clear` `source` `preview` `fullscreen`；分隔符 `'|'`，右对齐标记 `':tail'`。

> `preview` **不在默认工具栏里**（默认尾栏为「导入MD / 源码 / 全屏」），需要时手动写回 `toolbar`，或直接调 `editor.openPreview()`。
>
> `code` 按钮点击展开**语言面板**（见下方面板一览与「代码块」一节），不再直接插入空代码块。

此外可放入 `customButtons` 里定义的**按钮 `name`**（如 `toolbar: ['bold', '|', 'tpl']`）。
**未传 `toolbar` 时，自定义按钮会自动插入工具栏**：写了 `position` 按 `position` 放，没写则追加到主区末尾（插在 `:tail` 之前）。

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

鼠标还可**直接按住拖动**平移工具栏（光标变为抓握状）；触屏沿用系统原生滑动。`:tail` 之后的「导入MD / 源码 / 全屏」（以及 `position:'tail'` 的自定义按钮）始终吸附在右端可见。

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
| `code` | 展开「插入代码块 / 代码块语言」面板 | 20 种语言列表（含一句话说明），支持按名称/别名搜索（`js`、`mysql`、`yml`…）与键盘回车；**光标不在代码块内**=插入新块，**光标在块内**=改写该块语言 |
| `markdown` | 展开「导入 Markdown」面板（按钮文案：导入MD） | 两个页签：**选择文件**（点击或拖拽到虚线区，`.md/.markdown/.txt`，自动识别编码）/ **粘贴文本**；下方为三种落点（替换全文 / 追加文末 / 插入光标）+ **实时转换预览**与结构统计；标题栏显示字符数，底部「导入到正文」 |

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

### 自定义工具栏按钮

一个 `customButtons` 条目 = 一个工具栏按钮。`type: 'select'`（默认，下拉选择）或 `type: 'button'`（普通按钮）。

#### CustomButtonSpec

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `name` | `string` | — | **必填**，唯一标识；在 `toolbar` 数组里用它定位，也是事件载荷的 `name` |
| `position` | `number \| 'start' \| 'end' \| 'tail' \| string \| {before} \| {after}` | `'end'` | 按钮在工具栏中的位置，见下表（别名：`at` / `before` / `after` / `index`） |
| `type` | `'select' \| 'button'` | `'select'` | 下拉选择 / 普通按钮 |
| `title` | `string` | `text` | 按钮 tooltip，同时作为面板标题 |
| `text` | `string` | `''` | 按钮文字；下拉按钮选中后会换成选项文字 |
| `placeholder` | `string` | `text` | 未选中时的按钮文字 |
| `icon` | `string` | `''` | 内置图标名（`link`/`image`/`plus`…）或原始 SVG 字符串 |
| `width` | `number` | 自适应 | 面板宽度 px（限定 200–420） |
| `searchable` | `boolean` | `false` | 面板内搜索框（对 label/desc/value/group 客户端过滤） |
| `note` | `string` | `''` | 面板右上角说明文字（未搜索时显示） |
| `emptyText` | `string` | `'暂无数据'` | 空数据提示 |
| `cache` | `boolean` | `true` | 缓存接口结果；面板右上角刷新按钮可强制重拉 |
| `keepValue` | `boolean` | `true` | 记住选中项并回显到按钮文字 |
| `options` | `Option[]` | — | **数据源①** 静态配置 |
| `load` | `(editor) => Option[] \| Promise` | — | **数据源②** 自定义函数（优先级最高） |
| `url` | `string` | — | **数据源③** 接口地址，内部 `fetch` |
| `fetchOptions` | `object` | `{}` | `{method, headers, body, credentials, timeout, fetch, parser}`；`timeout` 默认 10000ms |
| `pick` | `(payload, editor) => any[]` | 自动 | 从响应里提取数组 |
| `link` | `\|` | — | 跳转链接配置，见下表 |
| `insert` | `'auto' \| 'link' \| 'html' \| 'text' \| false` | `'auto'` | 插入方式；`auto` = 链接 > `item.html` > 纯文本；`false` 不改正文 |
| `onSelect` | `(item, ctx) => any` | — | 选中回调；**返回 `false` 则跳过默认插入** |
| `onClick` | `({editor, name}) => any` | — | `type:'button'` 的点击回调 |
| `active` / `enabled` | `(state, editor) => boolean` | — | 按钮高亮 / 可用条件 |

**数据源优先级：`load` > `url` > `options`**。同时配置多项时只生效优先级最高的那个。

#### 按钮位置 `position`

| 写法 | 效果 |
|------|------|
| 不写 / `'end'` | 主区末尾，插在右侧吸附尾栏之前（多个未定位按钮共用一个分隔符） |
| `'start'` | 工具栏第一位 |
| `'tail'` | 尾栏末尾（与「导入MD / 源码 / 全屏」同区；未启用 `:tail` 时回退主区末尾） |
| `number` | 第 n 个按钮之前（0 起，按视觉顺序，分隔符不计数） |
| `'image'` 等按钮名 | 插到该按钮之前 |
| `{ before: name }` / `{ after: name }` | 显式锚点；锚点可以是内置按钮，也可以是另一个自定义按钮 |

规则：
- 锚点找不到 → 自动回退主区末尾，不报错、不丢按钮。
- `toolbar` 数组里已写过该 `name` → 以数组位置为准（`position` 忽略）；数组里没写的自定义按钮会按 `position` 自动补位。
- 显式定位不插入额外分隔符；仅默认追加时会带一个 `\|`。
- 运行时可用 `editor.moveButton(name, where)` 移动**任意**按钮（包括内置按钮）。

#### 选项对象

字段自动归一，接口原始结构一般无需转换：

| 字段 | 别名（自动识别） | 说明 |
|------|------|------|
| `value` | `id` `key` `val` `code` | 唯一值，用于占位符与 `setButtonValue` |
| `label` | `text` `name` `title` | 主标题 |
| `desc` | `description` `sub` `subtitle` `tip` | 副标题说明 |
| `url` | `href` `link` `jumpUrl` `jump` | 该项自带地址（`link: true` 时使用） |
| `group` | — | 分组名，同组归到一个小标题下 |
| `html` | — | 选中后直接插入的 HTML（`insert: 'html'`） |
| `disabled` | — | 置灰不可选 |

也支持纯字符串数组：`options: ['开场白', '结束语']`。

#### link 写法

| 写法 | 效果 |
|------|------|
| `link: true` | 用每项自带地址（`url`/`href` 字段） |
| `link: 'https://x.com/{value}'` | 地址模板 |
| `link: { url, text, target, mode, title }` | 完整配置 |
| `link: (item, editor) => ({ url, text, target })` | 完全动态 |

- `mode: 'insert'`（默认）在光标处插入 `<a>`；`target: '_blank'`（默认）时自动加 `rel="noopener noreferrer"`
- `mode: 'open'` 直接 `window.open(url, '_blank', 'noopener,noreferrer')`，不改动正文
- 模板占位符 `{value}` `{label}` 以及选项的**任意字段**都会被替换（取自原始对象）
- **安全**：地址经白名单校验，`javascript:` / `vbscript:` / `file:` / 危险 `data:` 一律不生成链接（退化为插入纯文本）

#### onSelect 的 ctx

```js
onSelect: (item, ctx) => {
  ctx.editor      // 编辑器实例
  ctx.item        // 选中项（归一后）
  ctx.link        // 解析后的链接，无链接时为 null
  ctx.insertLink(override)   // 插入链接（可覆盖字段）
  ctx.insertHtml(html)       // 插入 HTML
  ctx.insertText(text)       // 插入纯文本
  ctx.open(url, target)      // 新窗口打开
  return false    // 已自行处理，跳过默认插入
}
```

#### 实例方法

```ts
editor.addButton(spec, { at? })   // 运行时新增；位置同 position（at / before / after / index），返回按钮 DOM
editor.moveButton(name, where)    // 移动任意按钮（含内置），where 同 position 写法
editor.removeButton(name)         // 移除并中断未完成的接口请求（随行分隔符一并清掉）
editor.setButtonOptions(name, items) // 外部灌入数据（成为权威数据，不被旧请求覆盖）
editor.getButtonValue(name)       // 当前选中项
editor.setButtonValue(name, value)// 设置选中项，按钮文案同步
editor.toolbar.openCustom(name)   // 代码打开面板
editor.toolbar.openCode()         // 打开代码块语言面板（等同点击工具栏「代码块」）
editor.toolbar.buttonNodes()      // 当前工具栏按钮节点（按视觉顺序，不含分隔符）

editor.setPaper({ width, mode, gap, maxWidth })  // 运行时改版心
editor.paperOptions()                            // 读当前版心配置
editor.setHeight(600)                            // 运行时固定高度；setHeight(0) / setHeight('auto') 回到自适应
editor.heightOptions()                           // { height: 0, auto: true }
```

#### 示例

```js
KEditor.create('#editor', {
  customButtons: [
    { name: 'column', text: '栏目', searchable: true, url: '/api/columns', link: true, insert: 'link' },
    {
      name: 'tpl', text: '模板', icon: 'plus',
      options: [{ value: 'opening', label: '开场白', desc: '问候 + 导读', group: '通用' }],
      link: { url: 'https://mp.weixin.qq.com/s/tpl-{value}', text: '【{label}】' },
      onSelect: (item) => track('tpl', item.value),
    },
    { name: 'date', type: 'button', text: '日期', onClick: ({ editor }) => editor.commands.insertHTML('<p>2026-10-13</p>') },
  ],
})
```

### 代码块（语言 + 语法高亮）

内置 20 种语言（`plaintext` `javascript` `typescript` `html` `css` `json` `python` `java` `go` `rust` `c` `csharp` `php` `ruby` `sql` `bash` `yaml` `ini` `markdown` `diff`），并支持别名（`js` `ts` `py` `golang` `yml` `sh` `md` `c++` `cs` `mysql` `toml` …）。

```js
// 插入（lang 可省，用 options.code.defaultLanguage）
editor.insertCode('const a = 1', 'js')      // => <pre data-k-lang="javascript"><code class="language-javascript">…</code></pre>

// 改写光标所在块的语言（返回生效语言；不在代码块内返回 null）
editor.setCodeLanguage('sql')
editor.getCodeLanguage()                    // 'sql'；不在块内为 ''

editor.codeLanguages()                      // [{ value, label, hint }, …]（受 options.code.languages 裁剪）
editor.highlightCode()                      // 手动重跑全量高亮，返回处理的代码块数量
editor.lastCodeLang                         // 最近一次选择的语言（下次插入默认沿用）
editor.getState().inCode                    // 光标是否在代码块内
```

标记与产物约定：

- 语言同时写在 `<pre data-k-lang="javascript">` 与 `<code class="language-javascript">`；外部 HTML 只带 `class="language-xxx"` 也能识别并补上标记
- 块右上角显示语言角标（`data-k-lang`，`plaintext` 不显示），纯 CSS 实现，不进入 `getHTML()`
- **高亮只在编辑器/预览里显示**：`getHTML()`、源码模式、复制出去的 HTML 都是不含 token `<span>` 的干净代码，重新导入会自动重新高亮；预览面板走 `getHTML({ clean: 'preview' })`（同样清理内部属性，但保留高亮）
- 在块内打字会（防抖 140ms）重新高亮并保持块内光标；输入法组字期间跳过；单块超过 60 KB 退化为纯文本
- 样式类名 `ke-tok-{kw,str,com,num,typ,fn,op,var,tag,attr,sel,prop,key,bool,meta,ins,del}`，作用域限定在 `.ke-content` 内，宿主可覆盖配色

### 导入 Markdown

尾栏「导入MD」按钮打开导入面板（选文件 / 粘文本 + 实时预览 + 结构统计 + 三种落点）；把 `.md` / `.markdown` / `.txt` 文件拖进正文也会自动转换（默认替换全文）。转换产物就是正文规范里的普通 HTML，围栅代码块会带上 `data-k-lang` 并高亮。

```js
// 纯函数（不依赖实例）
markdownToHtml('# 标题\n\n正文', { gfm: true })  // => '<h1>标题</h1>\n<p>正文</p>'
markdownSummary(html)                            // => { headings, paragraphs, lists, items, codeBlocks, quotes, tables, images, links }
isMarkdownFile({ name: 'a.md', type: '' })       // => true（按 MIME + 扩展名，.txt 也算）
readMarkdownFile(file)                           // => 文本（严格 UTF-8 失败时回退 gb18030 / gbk / big5）
normalizeInsertMode('append')                    // => 'append'（非法值 => 'replace'）
```

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
editor.uploader               // UploadPipeline：按 upload.mode / 体积自动选路（.pick(file) 可查询）
editor.uploaders              // { normal: SimpleUploader, chunk: ChunkUploader | null }
editor.history                // 撤销栈
editor.readOnly / sourceMode / previewMode / fullscreen
editor.lastCodeLang           // 最近选择的代码块语言
```

| 方法 | 说明 |
|------|------|
| `getHTML({clean?})` | 取当前 HTML，默认剔除编辑器内部属性、未完成占位块；`clean: false` 取原始 HTML（调试用），`clean: 'preview'` 保留代码高亮 |
| `getText()` | 纯文本 |
| `getJSON()` | `{html, text, counts}` |
| `setContent(html, {sanitize?, silent?})` | 覆盖内容 |
| `appendHTML(html)` | 在光标处插入 |
| `clear()` | 清空并取消所有上传 |
| `focus()` / `blur()` | 聚焦/失焦 |
| `setReadOnly(bool)` | 切换只读 |
| `undo()` / `redo()` | 撤销/重做（含光标位置恢复） |
| `insertImage(url, alt?)` / `insertVideo(url, label?)` | 按地址插入媒体（等同工具栏「网络链接」页签） |
| `insertCode(code?, lang?)` | 插入代码块，光标落在块内（`lang` 省则用 `options.code.defaultLanguage`） |
| `setCodeLanguage(lang, target?)` | 改写代码块语言并重新高亮（`target` 省则取光标所在块）；返回生效语言，未命中返回 `null` |
| `getCodeLanguage()` | 光标所在代码块的语言，不在块内返回 `''` |
| `codeLanguages()` | 语言清单 `[{value,label,hint}]`（受 `options.code.languages` 裁剪） |
| `highlightCode()` | 手动重跑正文全量高亮，返回处理的代码块数量 |
| `importMarkdown(source, {mode?, silent?})` | 导入 Markdown（`source` 可为文本 / `File` / `{name,content}`）并转为 HTML，返回 `{ok, html, summary, mode, chars, name}`；失败为 `{ok:false, reason:'readonly'\|'error'}` |
| `setMarkdown(source)` / `insertMarkdown(source)` / `appendMarkdown(source)` | 导入并分别替换全文 / 插入光标处 / 追加文末（等价于 `importMarkdown` + 指定 `mode`），均可 `await` |
| `markdownOptions()` | 当前导入配置 `{insertMode, maxSize, auto}` |
| `moveCaretToEnd()` | 光标 / 选区移到正文末尾（追加导入前的落点） |
| `upload(file, kind?)` | 手动触发一次上传（自动判断图片/视频） |
| `cancelUploads()` | 取消全部进行中任务 |
| `counts()` | `{chars, words, images, videos, uploading}` |
| `enterSource()` / `exitSource()` / `toggleSource()` | 源码模式 |
| `openPreview()` / `closePreview()` / `togglePreview()` | 预览模式（默认工具栏已无预览按钮，走 API 或自行配置 `toolbar`） |
| `toggleFullscreen()` | 全屏编辑 |
| `addButton(spec, place?)` / `moveButton(name, where)` / `removeButton(name)` | 工具栏按钮增 / 移 / 删（详见自定义工具栏按钮） |
| `setPaper({width?, mode?, gap?, maxWidth?})` / `paperOptions()` | 运行时改版心（宽屏留白策略） |
| `setHeight(px \| 0 \| 'auto')` / `heightOptions()` | 运行时切换内容区高度（固定 / 自适应） |
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
| `customselect` | `{name, item, link, action, editor}` | 自定义下拉按钮选中一项；`action` 为 `'link'\|'html'\|'text'\|'open'\|'none'` |
| `customclick` | `{name, editor}` | `type:'button'` 自定义按钮被点击 |
| `markdownimport` | `{mode, name, summary, chars}` | Markdown 导入成功（`mode` 为实际落点，`name` 为文件名/空串） |
| `error` | `{type, error, message}` | 内部异常（如自定义按钮 `onSelect` 抛错），同时走 `onError` |

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
editor.commands.insertCodeBlock('const a = 1', 'js')   // 第二参为语言（可省）
editor.commands.setCodeLanguage('python')             // 改写光标所在块语言
editor.commands.currentCodeLang()                     // 光标所在块语言（''=不在块内）
editor.commands.insertDivider()
editor.commands.insertHTML('<p>富文本片段</p>')
editor.commands.clearFormat()
editor.getState()                   // 当前选区状态（工具栏高亮用）
```

## 五、独立可用的工具函数

```js
import { sanitizeHtml, formatHtml, escapeHtml, isSafeUrl, cleanWordHtml, mockAdapter, httpAdapter, simpleAdapter, ChunkUploader } from 'kyle-editor'
import { highlightCode, listLanguages, normalizeLang, languageLabel, isCodeBlock, LANGUAGES } from 'kyle-editor'

sanitizeHtml(dirtyHtml)      // 白名单净化，返回安全 HTML
formatHtml(html)             // 缩进美化（编辑器源码模式同款）
cleanWordHtml(wordHtml)      // 粘贴前的 Word/WPS 清洗
isSafeUrl('javascript:1')    // => false

highlightCode('const a = 1', 'js')  // => '<span class="ke-tok-kw">const</span> a <span class="ke-tok-op">=</span> …'（已转义，可直接 innerHTML）
listLanguages(['js', 'mysql'])      // => [{ value:'javascript', … }, { value:'sql', … }]
normalizeLang('MySQL')              // => 'sql'（未知语言 => 'plaintext'）
languageLabel('js')                 // => 'JavaScript'
isCodeBlock(preElement)             // => true（<pre> 且带 data-k-lang 或内含 <code>）

markdownToHtml(md, options)         // Markdown → 正文规范 HTML（默认再过一遍白名单净化）
markdownSummary(html)               // 统计标题/段落/列表/代码块/引用/表格/图片/链接数量
isMarkdownFile(file)                // 按 MIME + 扩展名判断（.md/.markdown/.txt）
readMarkdownFile(file)              // 读文件文本（UTF-8 → gb18030/gbk/big5 回退）
normalizeInsertMode('cursor')       // => 'cursor'（非法值 => 'replace'）
MARKDOWN_ACCEPT                     // <input accept> 用：'.md,.markdown,.txt,text/markdown,text/plain'
```

UMD / 默认导出上也挂了一批静态成员，`<script>` 引入时直接可用：

```js
KEditor.version                 // '1.0.7'
KEditor.sanitizeHtml(html)      // 白名单净化
KEditor.formatHtml(html)        // 源码美化
KEditor.cleanWordHtml(html)     // Word 清洗
KEditor.mockAdapter({speed})    // 内置模拟适配器（分片 put() + 整包 upload() 都支持）
KEditor.httpAdapter(config)     // 真实后端适配器（只认一个 url，两条链路共用）
KEditor.simpleAdapter(fn)       // 把「一个文件一次请求」的函数包成普通上传适配器
KEditor.createSimpleUploader(option, uploadOptions) // 造一个 SimpleUploader（普通上传）
KEditor.createChunkUploader(option, uploadOptions)  // 造一个 ChunkUploader（分片上传）
KEditor.SimpleUploader / KEditor.ChunkUploader / KEditor.UploadPipeline // 对应类
KEditor.highlightCode(code, lang)   // 代码高亮（纯字符串进、HTML 片段出）
KEditor.listLanguages(only?)        // 语言清单，可按主名/别名裁剪
KEditor.normalizeLang / KEditor.languageLabel / KEditor.isCodeBlock
KEditor.LANGUAGES                   // 全部内置语言（value/label/aliases/hint）
KEditor.markdownToHtml / KEditor.markdownSummary
KEditor.isMarkdownFile / KEditor.readMarkdownFile / KEditor.normalizeInsertMode / KEditor.MARKDOWN_ACCEPT
KEditor.utils                   // { uid, escapeHtml }
KEditor.create(el, options)     // 工厂方法，等价于 new KEditor(...)
KEditor.plugin                  // Vue 3 插件（仅 keditor-vue.umd.js）
```

> TypeScript：包内自带 `types/index.d.ts` 与 `types/vue.d.ts`，`import KEditor from 'kyle-editor'` 即有完整提示，无需额外安装。

## 六、安全说明

- 所有进入编辑器的外部 HTML（`value`、`setContent`、粘贴）都会经过 `sanitizeHtml`：标签/属性双白名单、`on*` 事件属性剔除、`javascript:`/`vbscript:`/`file:`/非法 `data:` 协议拦截、`style` 声明逐条过滤（丢弃 `expression`、`behavior` 等）。
- `getHTML({clean: false})` 会返回含编辑器内部属性的原始 HTML，请仅在调试时使用；入库前建议再跑一次 `sanitizeHtml`。
