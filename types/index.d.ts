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

/** 工具栏项名称 */
export type ToolbarItem =
  | 'undo' | 'redo' | 'heading' | 'fontsize'
  | 'bold' | 'italic' | 'underline' | 'strike'
  | 'foreColor' | 'backColor'
  | 'alignLeft' | 'alignCenter' | 'alignRight' | 'alignJustify'
  | 'ul' | 'ol' | 'quote'
  | 'link' | 'image' | 'video' | 'table' | 'code' | 'hr' | 'clear'
  | 'source' | 'preview' | 'fullscreen'
  | '|' | ':tail'

export interface KEditorOptions {
  value?: string
  placeholder?: string
  /** 编辑区可视高度(px)，0 = 自适应，默认 460 */
  height?: number
  minHeight?: number
  /** 主题色，默认微信绿 #07c160 */
  primaryColor?: string
  /** 正文版心宽度，默认 677（公众号） */
  paperWidth?: number
  /** 工具栏配置；false 隐藏 */
  toolbar?: ToolbarItem[] | boolean
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
  readonly toolbar: { el: HTMLElement; buttons: Map<string, HTMLElement>; openLink(): void; openMedia(kind: 'image' | 'video'): void; openTable(): void }
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
