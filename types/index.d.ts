/**
 * KEditor 类型声明（与 src/ 实现保持一致）
 * ESM：import KEditor, { create, mockAdapter } from 'kyle-editor'
 * UMD ：window.KEditor 为命名空间对象，使用 KEditor.create(...) / KEditor.KEditor 类
 */

/* ------------------------------ 上传 ------------------------------ */

export interface UploadResult {
  url: string
  poster?: string
  size?: number
  name?: string
  duration?: number
  /** 实际走的链路：'normal' 普通上传 | 'chunk' 分片上传 */
  mode?: 'normal' | 'chunk'
  /** 分片总数（普通上传恒为 1） */
  chunks?: number
  /** 命中已有文件（秒传）时为 true */
  instant?: boolean
  extra?: Record<string, unknown>
}

export interface UploadProgressInfo {
  loaded: number
  total: number
  chunks: number
  index?: number
  speed?: number
  instant?: boolean
  percent?: number
  uploadedChunks?: number
  /** 当前链路：'normal' | 'chunk' */
  mode?: 'normal' | 'chunk'
}

export interface UploadProgressEvent {
  ratio: number
  info: UploadProgressInfo
}

/** 分片上传适配器协议，详见 docs/upload-adapter.md */
export interface UploadAdapter {
  name?: string
  /** 单接口模式：任一 put 响应带回非空 url 即代表整份文件上传成功（不等 complete） */
  completeOnUrl?: boolean
  /** 初始化：返回 uploadId / 分片数 / 是否秒传 */
  init?: (file: File, ctx: { chunkSize: number; signal: AbortSignal; fingerprint: string }) => Promise<{
    uploadId?: string
    totalChunks?: number
    uploadedChunks?: number[]
    instant?: UploadResult | false
    chunkSize?: number
  }>
  /** 上传单个分片；返回 { url } 时表示该响应已可判定上传成功（配合 completeOnUrl） */
  put?: (chunk: Blob, meta: { index: number; total: number; uploadId?: string; file: File; signal: AbortSignal }) => Promise<unknown>
  /** 合并并返回最终地址 */
  complete?: (meta: { uploadId?: string; file: File; total: number; signal: AbortSignal }) => Promise<UploadResult | string>
  /** 单次直传（无分片） */
  upload?: (file: File, ctx: { onProgress: (loaded: number, total: number) => void; signal: AbortSignal }) => Promise<UploadResult | string>
}

/** 上传适配器协议：普通上传实现 upload()，分片上传实现 put()，详见 docs/upload-adapter.md */
export interface UploadAdapter {
  name?: string
  /** 响应带回非空 url 即代表上传成功（分片链路据此提前收工） */
  completeOnUrl?: boolean
  /** 初始化：返回 uploadId / 已传分片（断点续传）/ 秒传 url，可选 */
  init?: (file: File, ctx: { chunkSize: number; signal: AbortSignal; fingerprint: string }) => Promise<{
    uploadId?: string
    totalChunks?: number
    uploadedChunks?: number[]
    instant?: UploadResult | false
    chunkSize?: number
  }>
  /** 上传单个分片；返回 { url } 时表示该响应已可判定上传成功（配合 completeOnUrl） */
  put?: (chunk: Blob, meta: { index: number; total: number; uploadId?: string; file: File; signal: AbortSignal }) => Promise<unknown>
  /** 收尾拿最终地址，可选（分片响应里已有 url 时不会被调用） */
  complete?: (meta: { uploadId?: string; file: File; total: number; signal: AbortSignal }) => Promise<UploadResult | string>
  /** 普通上传：整个文件一次请求，返回 url 或 { url } */
  upload?: (file: File, ctx: { onProgress: (loaded: number, total: number) => void; signal: AbortSignal }) => Promise<UploadResult | string>
}

export interface UploadOptions {
  /** 链路选择：'auto' 按体积自动选 | 'normal' 只走普通上传 | 'chunk' 只走分片上传，默认 'auto' */
  mode?: 'auto' | 'normal' | 'chunk'
  /** auto 模式下达到该体积才走分片上传，默认 5MB */
  chunkThreshold?: number
  /** 分片大小，默认 1MB */
  chunkSize?: number
  /** 并发分片数，默认 3 */
  concurrency?: number
  /** 单片失败重试次数，默认 2 */
  retries?: number
  /** 重试退避基数（ms），默认 600 */
  retryDelay?: number
  /** 指纹算法：'none' | 'fast' | 'strong' */
  fingerprint?: 'none' | 'fast' | 'strong'
  /** 覆盖「响应带 url 即成功」判定，默认取 adapter.completeOnUrl */
  completeOnUrl?: boolean
}

/** 真实后端适配器：只认一个接口地址，两种链路共用 */
export interface HttpAdapterConfig extends Partial<UploadOptions> {
  type: 'http'
  /** 上传地址：分片与整包都打到它 */
  url: string
  /** 默认 'formdata'（multipart）| 'raw'（裸 body + 查询串） */
  mode?: 'formdata' | 'raw'
  /** 默认：'formdata' → POST，'raw' → PUT */
  method?: 'POST' | 'PUT'
  /** multipart 里的文件字段名，默认 'file' */
  fieldName?: string
  headers?: Record<string, string> | (() => Record<string, string>)
  withCredentials?: boolean
  /** 解开服务端响应外层包装，默认取 json.data */
  parse?: (json: unknown) => unknown
  /** 自定义从响应里取上传地址的规则，默认读 url / fileUrl / src */
  pickUrl?: (payload: unknown) => string
  /** 动态分片地址（如不同分片打不同节点） */
  chunkUrlFor?: (ctx: { index: number; total: number }) => string
}

export type UploaderOption =
  | 'mock'
  | null
  /** 接口地址，如 '/api/upload'（等价于 { type:'http', url }） */
  | (string & {})
  | UploadAdapter
  | HttpAdapterConfig
  | SimpleUploader
  | ChunkUploader
  | ((file: File, ctx: { onProgress: (loaded: number, total: number) => void; signal?: AbortSignal }) => Promise<UploadResult | string>)

/** 普通上传：整个文件一次请求 */
export class SimpleUploader {
  constructor(adapter: UploadAdapter, options?: UploadOptions)
  readonly mode: 'normal'
  upload(file: File, opts?: { signal?: AbortSignal; onProgress?: (ratio: number, info: UploadProgressInfo) => void }): Promise<UploadResult>
  destroy(): void
}

/** 分片上传：切片并发，响应带 url 即成功 */
export class ChunkUploader {
  constructor(adapter: UploadAdapter, options?: UploadOptions)
  readonly mode: 'chunk'
  /** 拿到响应里的 url 即结束（不再调用 complete） */
  completeOnUrl: boolean
  chunkSize: number
  concurrency: number
  retries: number
  upload(file: File, opts?: { signal?: AbortSignal; onProgress?: (ratio: number, info: UploadProgressInfo) => void }): Promise<UploadResult>
  destroy(): void
}

/** 选路器：按 upload.mode / 体积在两条链路之间选择 */
export class UploadPipeline {
  constructor(normal: SimpleUploader | null, chunk: ChunkUploader | null, options?: UploadOptions)
  readonly normal: SimpleUploader | null
  readonly chunk: ChunkUploader | null
  readonly mode: 'auto' | 'normal' | 'chunk'
  readonly chunkThreshold: number
  /** 该文件走哪条链路 */
  pick(file: File): 'normal' | 'chunk'
  uploaderFor(file: File): SimpleUploader | ChunkUploader | null
  upload(file: File, opts?: { signal?: AbortSignal; onProgress?: (ratio: number, info: UploadProgressInfo) => void }): Promise<UploadResult>
  destroy(): void
}

export declare function mockAdapter(opts?: {
  speed?: number
  latency?: number
  failRate?: number
  chunkSize?: number
}): UploadAdapter

export declare function httpAdapter(config: HttpAdapterConfig): UploadAdapter

export declare function simpleAdapter(
  fn: (file: File, ctx: { onProgress: (loaded: number, total: number) => void; signal?: AbortSignal }) => Promise<UploadResult | string>,
): UploadAdapter

/** 构造普通上传链路 */
export declare function createSimpleUploader(option: UploaderOption, config?: UploadOptions): SimpleUploader

/** 构造分片上传链路 */
export declare function createChunkUploader(option: UploaderOption, config?: UploadOptions): ChunkUploader

/* ------------------------------ 配置 ------------------------------ */

/** 代码块语言项（内置 20 种，可用 options.code.languages 裁剪） */
export interface CodeLanguage {
  /** 语言主名，如 'javascript' / 'python' / 'plaintext' */
  value: string
  /** 展示名，如 'JavaScript' */
  label: string
  /** 一句话说明 */
  hint: string
}

export interface CodeOptions {
  /**
   * 允许的语言：主名或别名（如 'js' / 'mysql' / 'yml'）；
   * 留空 = 全部内置语言；裁剪后 defaultLanguage 不在其中会自动回落到第一项
   */
  languages?: string[]
  /** 新建代码块的默认语言，默认 'plaintext' */
  defaultLanguage?: string
  /** 是否语法高亮（false = 只保留纯文本，语言标记仍然写入），默认 true */
  highlight?: boolean
}

/** Markdown 导入的落点：replace 替换全文（默认）| append 追加到文末 | cursor 插入到光标处 */
export type MarkdownInsertMode = 'replace' | 'append' | 'cursor'

export interface MarkdownOptions {
  /** 导入后内容落到哪里，默认 'replace'（面板里可临时改） */
  insertMode?: MarkdownInsertMode
  /** 单个文件体积上限（字节），默认 5MB，0 = 不限制 */
  maxSize?: number
  /** GFM 扩展：表格 / 删除线 / 任务列表 / 裸链接，默认 true */
  gfm?: boolean
  /** 段落内的单换行是否转成 <br>，默认 false（按空格处理） */
  breaks?: boolean
  /** 链接是否加 target="_blank" rel="noopener noreferrer"，默认 false */
  linkTarget?: boolean | string
  /** 是否丢弃开头的 YAML front matter，默认 true */
  frontMatter?: boolean
}

/** Markdown 转换结果的块级统计 */
export interface MarkdownSummary {
  headings: number
  paragraphs: number
  lists: number
  items: number
  codeBlocks: number
  quotes: number
  tables: number
  images: number
  links: number
}

export interface MarkdownImportResult {
  ok: boolean
  /** ok 为 true 时的转换结果 HTML */
  html?: string
  summary?: MarkdownSummary
  /** 实际使用的落点 */
  mode?: MarkdownInsertMode
  /** 源文本字符数 */
  chars?: number
  /** 文件名（导入文件时） */
  name?: string
  /** ok 为 false 时的原因 */
  reason?: 'readonly' | 'error'
  error?: Error
}

/** 可导入的 Markdown 源：文本、File/Blob，或 { name, content } */
export type MarkdownSource = string | Blob | { name?: string; content: string }

export interface ImageCompressOptions {
  maxWidth?: number
  quality?: number
  /** 小于该字节数不压缩 */
  minSize?: number
}

export interface ImageOptions {
  /** 上传前压缩，false 关闭 */
  compress?: boolean | ImageCompressOptions
}

export interface PasteOptions {
  enabled?: boolean
  clean?: boolean
  /** 粘贴截图/文件直接上传 */
  uploadFiles?: boolean
  localizeImages?: boolean
}

export interface UploadHookPayload {
  stage: 'uploadstart' | 'uploaddone' | 'uploaderror' | 'uploadcancel' | 'uploadprogress'
  file?: File
  kind?: 'image' | 'video'
  url?: string
  percent?: number
  info?: UploadProgressInfo
  error?: Error
}

/** 内置工具栏项名称 */
export type BuiltinToolbarItem =
  | 'undo' | 'redo' | 'heading' | 'fontsize'
  | 'bold' | 'italic' | 'underline' | 'strike'
  | 'foreColor' | 'backColor'
  | 'alignLeft' | 'alignCenter' | 'alignRight' | 'alignJustify'
  | 'ul' | 'ol' | 'quote'
  | 'link' | 'image' | 'video' | 'table' | 'code' | 'markdown' | 'hr' | 'clear'
  | 'source' | 'preview' | 'fullscreen'
  | '|' | ':tail'

/**
 * 工具栏项：内置名称、分隔符 `|`、`:tail`，或 customButtons 里定义的自定义按钮 name */
export type ToolbarItem = BuiltinToolbarItem | (string & {})

/**
 * 按钮在工具栏里的位置（自定义按钮的 `position`，addButton / moveButton 的目标位）：
 * - `number`：第 n 个按钮之前（0 起，按视觉顺序计数，分隔符不计数）
 * - `'start'`：工具栏最前
 * - `'end'`：主区末尾（尾栏之前，默认）
 * - `'tail'`：右侧吸附尾栏末尾
 * - `'link'` 等按钮名：插到该按钮之前
 * - `{ before: name }` / `{ after: name }`：显式锚点
 */
export type ButtonPosition = number | 'start' | 'end' | 'tail' | (string & {}) | { before: string } | { after: string }

/** addButton / moveButton 的位置参数（at 优先于 before / after / index） */
export interface ButtonPlaceOptions {
  at?: ButtonPosition
  before?: string
  after?: string
  index?: number
}

/* ------------------------------ 自定义工具栏按钮 ------------------------------ */

/** 下拉选项；也接受纯字符串或接口原始对象（自动识别 value/id/key、label/name/title 等常见字段） */
export interface CustomButtonOption {
  value?: string | number
  label?: string
  /** 副标题说明 */
  desc?: string
  /** 该项自带的跳转地址（link:true 时直接使用） */
  url?: string
  /** 分组名，同组选项会归到一个小标题下 */
  group?: string
  /** 选中后直接插入的 HTML（insert:'html' 或 auto 且无链接时使用） */
  html?: string
  disabled?: boolean
  [key: string]: unknown
}

/** 选中后的跳转链接配置；字符串模板支持 {value} {label} 及选项任意字段占位符 */
export type CustomButtonLink =
  | boolean
  | string
  | {
      /** insert = 插入到正文（默认）；open = 直接新窗口打开 */
      mode?: 'insert' | 'open'
      url?: string | ((item: CustomButtonOption, editor: KEditor) => string)
      text?: string | ((item: CustomButtonOption, editor: KEditor) => string)
      title?: string | ((item: CustomButtonOption, editor: KEditor) => string)
      target?: '_blank' | '_self' | boolean
    }
  | ((item: CustomButtonOption, editor: KEditor) => string | { mode?: 'insert' | 'open'; url?: string; text?: string; target?: '_blank' | '_self' } | null)

export interface CustomButtonFetchOptions {
  method?: string
  headers?: Record<string, string>
  body?: BodyInit | null
  credentials?: RequestCredentials
  /** 超时毫秒，默认 10000 */
  timeout?: number
  /** 自定义 fetch 实现（如 axios 包装） */
  fetch?: typeof fetch
  /** 自定义响应解析，默认 res.json() */
  parser?: (res: Response) => unknown | Promise<unknown>
}

export interface CustomButtonSpec {
  /** 唯一标识，用于在 toolbar 数组中定位；也作为事件载荷的 name */
  name: string
  /** select = 下拉选择（默认）；button = 普通按钮 */
  type?: 'select' | 'button'
  /** tooltip */
  title?: string
  /** 按钮文字；下拉按钮选中后会替换为选项文字 */
  text?: string
  /** 未选中时的占位文字，默认取 text */
  placeholder?: string
  /** 内置图标名或原始 SVG 字符串 */
  icon?: string
  /** 面板宽度 px（200–420） */
  width?: number
  /** 面板内显示搜索框（客户端过滤） */
  searchable?: boolean
  /** 面板右上角提示文字 */
  note?: string
  /** 空数据提示 */
  emptyText?: string
  /** 缓存接口结果，默认 true；面板内刷新按钮可强制重新请求 */
  cache?: boolean
  /** 记住选中项并在按钮上回显，默认 true */
  keepValue?: boolean

  /** 按钮在工具栏中的位置，默认追加到主区末尾（尾栏之前） */
  position?: ButtonPosition
  /** position 别名（与 addButton 的 options.at 同义） */
  at?: ButtonPosition
  /** 简写：插到某按钮之前 */
  before?: string
  /** 简写：插到某按钮之后 */
  after?: string
  /** 简写：第 n 个按钮之前 */
  index?: number

  /** 数据源①：静态配置 */
  options?: CustomButtonOption[] | string[]
  /** 数据源②：自定义加载函数（可返回 Promise） */
  load?: (editor: KEditor) => CustomButtonOption[] | Promise<CustomButtonOption[] | unknown> | unknown
  /** 数据源③：接口地址，内部 fetch；优先级 load > url > options */
  url?: string
  fetchOptions?: CustomButtonFetchOptions
  /** 从接口响应中提取数组；默认自动识别 items/list/data/rows/records/result（含一层嵌套） */
  pick?: (payload: unknown, editor: KEditor) => unknown

  /** 选中后的跳转链接配置 */
  link?: CustomButtonLink
  /** 插入方式：auto（默认，链接 > html > 纯文本）| link | html | text | false（不改正文） */
  insert?: 'auto' | 'link' | 'html' | 'text' | false | 'none'
  /** 自定义选中处理；返回 false 表示已自行处理，跳过默认插入 */
  onSelect?: (item: CustomButtonOption, ctx: {
    editor: KEditor
    item: CustomButtonOption
    link: { mode: 'insert' | 'open'; url: string; text: string; target: '_blank' | '_self'; title: string } | null
    insertLink: (override?: Record<string, unknown>) => void
    insertHtml: (html: string) => void
    insertText: (text: string) => void
    open: (url?: string, target?: string) => void
  }) => void | boolean | Promise<void | boolean>
  /** type:'button' 的点击处理 */
  onClick?: (ctx: { editor: KEditor; name: string }) => void | Promise<void>
  /** 高亮条件 */
  active?: (state: EditorState, editor: KEditor) => boolean
  /** 可用条件 */
  enabled?: (state: EditorState, editor: KEditor) => boolean
}

export interface KEditorOptions {
  value?: string
  placeholder?: string
  /**
   * 内容区高度：
   * - 不写 / `0` / `'auto'`：随内容自动撑开（整页滚动，工具栏吸附视口顶部）
   * - 填 px：固定高度，内容超出时编辑区内部滚动
   */
  height?: number | 'auto'
  /** 内容区最小高度（px），两种高度模式下都生效，默认 320 */
  minHeight?: number
  /** 主题色，默认微信绿 #07c160 */
  primaryColor?: string
  /** 版心基准宽度，默认 677（公众号）；fluid 模式下它是最小宽度 */
  paperWidth?: number
  /** 版心宽度模式：'fluid'（默认，宽屏版心随容器生长）| 'fixed'（恒定 paperWidth + 64） */
  paperMode?: 'fluid' | 'fixed'
  /** fluid 模式下单侧留白，默认 24 */
  paperGap?: number
  /** fluid 模式下载心最大宽度，0 = 不限 */
  paperMaxWidth?: number
  /** 工具栏配置；false 隐藏。留空且配置了 customButtons 时，自定义按钮自动追加到默认工具栏 */
  toolbar?: ToolbarItem[] | boolean
  /** 自定义工具栏按钮（下拉选择，数据可静态配置或从接口读取） */
  customButtons?: CustomButtonSpec[]
  hideToolbar?: boolean
  hideStatusbar?: boolean
  readOnly?: boolean
  autofocus?: boolean
  /** 最大字符数，0 不限 */
  maxLength?: number
  wordCount?: boolean
  /** 是否对输入内容做白名单净化，默认 true */
  sanitize?: boolean
  historyLimit?: number
  /** 普通上传（整个文件一次请求）：'mock' | 接口地址 | {url,…} | adapter | fn */
  uploader?: UploaderOption
  /** 分片上传（切片并发，接口返回 url 即成功）：写法同 uploader；不配置则不启用分片 */
  chunkUploader?: UploaderOption
  /** 上传链路参数（mode / chunkThreshold / chunkSize / concurrency / retries） */
  upload?: UploadOptions
  /** 代码块：可选语言清单 + 默认语言 + 是否语法高亮 */
  code?: CodeOptions
  /** Markdown 导入：默认落点 / 文件体积上限 / 转换选项 */
  markdown?: MarkdownOptions
  image?: ImageOptions
  maxImageSize?: number
  maxVideoSize?: number
  imageAccept?: string
  videoAccept?: string
  paste?: PasteOptions
  onChange?: (html: string, editor: KEditor) => void
  onReady?: (editor: KEditor) => void
  onError?: (error: { type: string; error: Error; message: string }) => void
  /** 上传各阶段统一回调 */
  onUpload?: (payload: UploadHookPayload) => void
  /** 上传前拦截：返回改写后的 File 或 false 取消 */
  beforeUpload?: (file: File, kind: 'image' | 'video') => File | false | Promise<File | false>
}

export interface EditorCounts {
  chars: number
  words: number
  images: number
  videos: number
  uploading: number
}

export interface EditorState {
  bold: boolean
  italic: boolean
  underline: boolean
  strikeThrough: boolean
  ul: boolean
  ol: boolean
  align: 'left' | 'center' | 'right' | 'justify'
  block: string
  fontSize: number | ''
  linkUrl: string
  linkTarget: boolean
  selectionText: string
  canUndo: boolean
  canRedo: boolean
  /** 光标是否落在代码块内 */
  inCode: boolean
  source: boolean
  preview: boolean
  fullscreen: boolean
  readOnly: boolean
}

export interface EditorEventMap {
  ready: [{ editor: KEditor }]
  change: [{ html: string; text: string }]
  focus: []
  blur: []
  save: [{ html: string }]
  error: [{ type: string; error: Error; message: string }]
  uploadstart: [{ file: File; kind: 'image' | 'video' }]
  uploadprogress: [{ file: File; kind: 'image' | 'video'; percent: number; info: UploadProgressInfo }]
  uploaddone: [{ file: File; kind: 'image' | 'video'; url: string }]
  uploaderror: [{ file: File; kind: 'image' | 'video'; error: Error }]
  uploadcancel: [{ file: File; kind: 'image' | 'video' }]
  insertmedia: [{ kind: 'image' | 'video'; url: string; node: HTMLElement }]
  sourcechange: [{ mode: 'source' | 'visual' }]
  customselect: [{ name: string; item: CustomButtonOption; link: { mode: 'insert' | 'open'; url: string; text: string; target: string; title: string } | null; action: 'link' | 'html' | 'text' | 'open' | 'none'; editor: KEditor }]
  customclick: [{ name: string; editor: KEditor }]
}

/* ------------------------------ 实例 ------------------------------ */

export declare class Commands {
  toggleMark(name: 'bold' | 'italic' | 'underline' | 'strike'): void
  setFontSize(px: number): void
  currentFontSize(): number | ''
  setColor(mode: 'fore' | 'back', color: string | null): void
  setAlign(value: 'left' | 'center' | 'right' | 'justify'): void
  toggleList(kind: 'ordered' | 'unordered'): void
  setHeading(tag: 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'blockquote' | ''): void
  toggleBlockquote(): void
  createLink(payload: { url: string; text?: string; target?: boolean }): void
  removeLink(): void
  insertTable(cols: number, rows: number): HTMLTableElement
  /** 插入代码块（code 为源码，lang 缺省用 code.defaultLanguage） */
  insertCodeBlock(code?: string, lang?: string): HTMLElement
  /** 切换代码块语言并重新高亮；target 缺省取光标所在块，返回 null = 不在代码块中 */
  setCodeLanguage(lang: string, target?: HTMLElement | null): string | null
  /** 光标所在代码块的语言；不在代码块中返回空串 */
  currentCodeLang(): string
  insertDivider(): HTMLElement
  insertHTML(html: string): void
  insertNode(node: Node): void
  clearFormat(): void
}

export declare class KEditor {
  constructor(target: HTMLElement | string, options?: KEditorOptions)

  static create(target: HTMLElement | string, options?: KEditorOptions): KEditor
  static plugin: { install(app: unknown, opts?: { name?: string }): void }

  readonly id: string
  readonly el: HTMLElement
  readonly root: HTMLElement
  readonly options: Required<KEditorOptions>
  readonly commands: Commands
  readonly media: {
    pickFiles(kind: 'image' | 'video'): void
    addFiles(files: File[]): Promise<number>
    upload(file: File, kind: 'image' | 'video'): Promise<UploadResult | null>
    insertFromUrl(kind: 'image' | 'video', url: string, name?: string): HTMLElement
    insertImageUrl(url: string, alt?: string): HTMLElement
    insertVideoUrl(url: string, label?: string): HTMLElement
    cancelAll(): void
    tasks: Map<string, unknown>
  }
  /** 选路器（按 upload.mode / 体积在普通与分片之间选择） */
  readonly uploader: UploadPipeline
  /** 两条原始链路：{ normal: SimpleUploader, chunk: ChunkUploader | null } */
  readonly uploaders: { normal: SimpleUploader; chunk: ChunkUploader | null }
  readonly toolbar: {
    el: HTMLElement
    buttons: Map<string, HTMLElement>
    custom: Map<string, { spec: CustomButtonSpec; button: HTMLElement | null }>
    openLink(): void
    openMedia(kind: 'image' | 'video'): void
    openTable(): void
    /** 打开代码块语言面板（插入新块或改写光标所在块） */
    openCode(): void
    openMarkdown(): void
    openCustom(name: string): void
    addButton(spec: CustomButtonSpec, options?: ButtonPlaceOptions): HTMLElement | null
    moveButton(name: string, where?: ButtonPosition): boolean
    buttonNodes(): HTMLElement[]
    removeButton(name: string): boolean
    setButtonOptions(name: string, items: unknown): CustomButtonOption[]
  }
  readonly popover: { el: HTMLElement; open: (...args: unknown[]) => void; close(): void; isOpen: boolean }
  readonly bubble: { el: HTMLElement; show(node: HTMLElement): void; hide(): void }
  readonly source: { el: HTMLElement; show(html: string): void; apply(opts?: { silent?: boolean }): void }
  readonly history: { reset(html: string): void; snapshot(force?: boolean): void; flush(): void }
  readonly sourceMode: boolean
  readonly previewMode: boolean
  readonly fullscreen: boolean
  readonly readOnly: boolean
  readonly destroyed: boolean
  /** 最近一次选择的代码块语言（下次插入默认沿用） */
  lastCodeLang: string

  get element(): HTMLElement
  get editorElement(): HTMLElement

  getHTML(opts?: { clean?: boolean }): string
  getText(): string
  getJSON(): { html: string; text: string; counts: EditorCounts }
  setContent(html: string, opts?: { sanitize?: boolean; silent?: boolean }): this
  appendHTML(html: string): this
  clear(): this
  counts(): EditorCounts
  getState(): EditorState
  refresh(): void

  focus(): this
  blur(): this
  saveSelection(): this
  restoreSelection(): this
  setReadOnly(value?: boolean): this

  undo(): this
  redo(): this

  upload(file: File, kind?: 'image' | 'video'): Promise<UploadResult | null>
  insertImage(url: string, alt?: string): HTMLElement
  insertVideo(url: string, label?: string): HTMLElement
  cancelUploads(): this

  /** 运行时新增自定义按钮，返回按钮 DOM */
  addButton(spec: CustomButtonSpec, options?: ButtonPlaceOptions): HTMLElement | null
  /** 移动任意按钮（内置或自定义）到指定位置 */
  moveButton(name: string, where?: ButtonPosition): boolean
  removeButton(name: string): boolean
  /** 运行时调整版心：{ width, mode, gap, maxWidth } */
  setPaper(config?: { width?: number; mode?: 'fluid' | 'fixed'; gap?: number; maxWidth?: number }): { width: number; mode: 'fluid' | 'fixed'; gap: number; maxWidth: number }
  paperOptions(): { width: number; mode: 'fluid' | 'fixed'; gap: number; maxWidth: number }
  /** 运行时切换内容区高度：传 px 固定，传 0 / 'auto' 恢复自适应；返回实际生效的高度（0 = 自适应） */
  setHeight(value: number | 'auto'): number
  heightOptions(): { height: number; auto: boolean }
  /** 可选语言清单（受 options.code.languages 裁剪） */
  codeLanguages(): CodeLanguage[]
  /** 重新高亮正文里所有代码块，返回处理的代码块数量 */
  highlightCode(): number
  /** 插入代码块：code 为源码，lang 缺省用 code.defaultLanguage */
  insertCode(code?: string, lang?: string): HTMLElement
  /** 切换代码块语言并重新高亮；target 缺省取光标所在块 */
  setCodeLanguage(lang: string, target?: HTMLElement | null): string | null
  /** 光标所在代码块的语言；不在代码块中返回空串 */
  getCodeLanguage(): string

  /* Markdown 导入 */

  /** 导入 Markdown（文本 / File / {name,content}）并转为 HTML，落点默认取 options.markdown.insertMode */
  importMarkdown(source: MarkdownSource, options?: { mode?: MarkdownInsertMode; silent?: boolean }): Promise<MarkdownImportResult>
  /** 导入并替换全文 */
  setMarkdown(source: MarkdownSource, options?: { silent?: boolean }): Promise<MarkdownImportResult>
  /** 导入并插入到光标处 */
  insertMarkdown(source: MarkdownSource, options?: { silent?: boolean }): Promise<MarkdownImportResult>
  /** 导入并追加到文末 */
  appendMarkdown(source: MarkdownSource, options?: { silent?: boolean }): Promise<MarkdownImportResult>
  /** 光标 / 选区移到正文末尾 */
  moveCaretToEnd(): this
  /** 当前 Markdown 导入配置 */
  markdownOptions(): { insertMode: MarkdownInsertMode; maxSize: number; auto: boolean }
  /** 外部灌入下拉数据（接口在编辑器之外请求时使用） */
  setButtonOptions(name: string, items: CustomButtonOption[] | string[]): CustomButtonOption[]
  getButtonValue(name: string): CustomButtonOption | null
  setButtonValue(name: string, value: string | number): CustomButtonOption | null
  reportError(type: string, error: unknown): this

  toggleSource(): boolean
  enterSource(): void
  exitSource(): void
  togglePreview(): boolean
  openPreview(): void
  closePreview(): void
  toggleFullscreen(): boolean

  on<K extends keyof EditorEventMap>(type: K, handler: (...args: EditorEventMap[K]) => void): () => void
  on(type: string, handler: (payload: any) => void): () => void
  off(type: string, handler: (...args: any[]) => void): this
  emit(type: string, payload?: unknown): this
  addListener(type: string, handler: (payload: any) => void): this
  removeListener(type: string, handler: (payload: any) => void): this
  destroy(): void
}

/* ------------------------------ 模块导出 ------------------------------ */

export declare const version: string
export declare function create(target: HTMLElement | string, options?: KEditorOptions): KEditor
export declare const mount: typeof create
export declare function replace(target: HTMLElement | string, options?: KEditorOptions): KEditor
export declare const defaults: KEditorOptions
export declare const DEFAULT_TOOLBAR: ToolbarItem[]
export declare function normalizeCustomButtons(list: unknown): CustomButtonSpec[]

/* ------------------------------ 代码块 ------------------------------ */

/** 内置语言清单（value / label / aliases / hint） */
export declare const LANGUAGES: Array<CodeLanguage & { aliases: string[] }>
/** 把代码文本渲染成带 ke-tok-* span 的 HTML 片段（内部转义，可直接赋值给 innerHTML） */
export declare function highlightCode(code: string, lang?: string): string
/** 别名/大小写归一为语言主名，未知语言回落 'plaintext' */
export declare function normalizeLang(lang?: string): string
/** 语言展示名 */
export declare function languageLabel(lang?: string): string
/** 语言清单（可按主名/别名裁剪，返回 { value, label, hint }） */
export declare function listLanguages(only?: string[]): CodeLanguage[]
/** 节点是否为代码块（<pre> 且带 data-k-lang 或内含 <code>） */
export declare function isCodeBlock(node: Node | null): boolean

/* ------------------------------ Markdown 导入 ------------------------------ */

/**
 * Markdown → HTML（零依赖，GFM 子集）
 * 产物已是编辑器正文规范（<p>/<h1-6>/<ul>/<table>/<pre data-k-lang>…），默认再过一遍白名单净化
 */
export declare function markdownToHtml(markdown: string, options?: MarkdownOptions & { sanitize?: boolean }): string
/** 统计 HTML 里的块级元素数量 */
export declare function markdownSummary(html: string): MarkdownSummary
/** 拖拽/粘贴的文件是否为 Markdown（按 MIME 与扩展名，含 .txt） */
export declare function isMarkdownFile(file: { name?: string; type?: string } | null | undefined): boolean
/** 读取 Markdown 文件文本：严格 UTF-8 优先，失败回退 gb18030 / gbk / big5 */
export declare function readMarkdownFile(file: Blob): Promise<string>
/** 落点模式归一，非法值回落 'replace' */
export declare function normalizeInsertMode(value?: string): MarkdownInsertMode
/** <input accept> 用：.md,.markdown,.txt,text/markdown,text/plain */
export declare const MARKDOWN_ACCEPT: string

export declare function normalizePosition(spec: unknown): ButtonPosition | null
export declare function normalizeItems(raw: unknown): CustomButtonOption[]
export declare function exportHtml(html: string): string

export declare function sanitizeHtml(html: string, opts?: { allowVideoCard?: boolean }): string
export declare function escapeHtml(text?: string): string
export declare function isSafeUrl(url?: string): boolean
export declare function cleanWordHtml(html: string): string
export declare function formatHtml(html: string, opts?: { indent?: string }): string
export declare function fastFingerprint(file: File): Promise<string>
export declare function strongFingerprint(file: File): Promise<string>
export declare function maybeCompress(file: File, options?: ImageOptions): Promise<File>

export default KEditor
