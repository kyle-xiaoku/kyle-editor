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
  extra?: Record<string, unknown>
}

export interface UploadProgressInfo {
  loaded: number
  total: number
  chunks: number
  index?: number
  speed?: number
  instant?: boolean
}

export interface UploadProgressEvent {
  ratio: number
  info: UploadProgressInfo
}

/** 分片上传适配器协议，详见 docs/upload-adapter.md */
export interface UploadAdapter {
  name?: string
  /** 初始化：返回 uploadId / 分片数 / 是否秒传 */
  init?: (file: File, ctx: { chunkSize: number; signal: AbortSignal; fingerprint: string }) => Promise<{
    uploadId?: string
    totalChunks?: number
    uploadedChunks?: number[]
    instant?: UploadResult | false
    chunkSize?: number
  }>
  /** 上传单个分片 */
  put?: (chunk: Blob, meta: { index: number; total: number; uploadId?: string; file: File; signal: AbortSignal }) => Promise<unknown>
  /** 合并并返回最终地址 */
  complete?: (meta: { uploadId?: string; file: File; total: number; signal: AbortSignal }) => Promise<UploadResult | string>
  /** 单次直传（无分片） */
  upload?: (file: File, ctx: { onProgress: (loaded: number, total: number) => void; signal: AbortSignal }) => Promise<UploadResult | string>
}

export interface UploadOptions {
  /** 分片大小，默认 1MB */
  chunkSize?: number
  /** 并发分片数，默认 3 */
  concurrency?: number
  /** 单片失败重试次数，默认 2 */
  retries?: number
  /** 指纹算法：'none' | 'fast' | 'strong' */
  fingerprint?: 'none' | 'fast' | 'strong'
}

export interface HttpAdapterConfig extends Partial<UploadOptions> {
  type: 'http'
  initUrl?: string
  chunkUrl?: string
  completeUrl?: string
  queryUrl?: string
  headers?: Record<string, string>
  fetchImpl?: typeof fetch
  extra?: ((file: File) => Record<string, unknown>) | Record<string, unknown>
  pickResult?: (json: unknown) => UploadResult
}

export type UploaderOption = 'mock' | UploadAdapter | HttpAdapterConfig | ChunkUploader | ((
  file: File,
  onProgress: (loaded: number, total: number) => void,
  signal?: AbortSignal,
) => Promise<UploadResult | string>)

export class ChunkUploader {
  constructor(adapter: UploadAdapter, options?: UploadOptions)
  upload(file: File, opts?: { signal?: AbortSignal; onProgress?: (ratio: number, info: UploadProgressInfo) => void }): Promise<UploadResult | string>
  abort(): void
}

export declare function mockAdapter(opts?: {
  speed?: number
  latency?: number
  failRate?: number
  chunkSize?: number
}): UploadAdapter

export declare function httpAdapter(config: HttpAdapterConfig): UploadAdapter

export declare function simpleAdapter(
  fn: (file: File, onProgress: (loaded: number, total: number) => void, signal?: AbortSignal) => Promise<UploadResult | string>,
): UploadAdapter

export declare function createUploader(option: UploaderOption, config?: UploadOptions): ChunkUploader

/* ------------------------------ 配置 ------------------------------ */

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
  | 'link' | 'image' | 'video' | 'table' | 'code' | 'hr' | 'clear'
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
  /** 编辑区可视高度(px)，0 = 自适应，默认 460 */
  height?: number
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
  uploader?: UploaderOption
  upload?: UploadOptions
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
  insertCodeBlock(code?: string): HTMLElement
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
  readonly uploader: ChunkUploader
  readonly toolbar: {
    el: HTMLElement
    buttons: Map<string, HTMLElement>
    custom: Map<string, { spec: CustomButtonSpec; button: HTMLElement | null }>
    openLink(): void
    openMedia(kind: 'image' | 'video'): void
    openTable(): void
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
