/** KEditor Vue 3 集成类型（kyle-editor/vue） */
import type { App, ComponentOptionsMixin, ComponentPublicInstance, DefineComponent, Ref } from 'vue'
import type {
  ButtonPlaceOptions,
  CustomButtonOption,
  CustomButtonSpec,
  EditorCounts,
  EditorEventMap,
  KEditor,
  KEditorOptions,
  MarkdownImportResult,
  MarkdownInsertMode,
  MarkdownSource,
  UploadHookPayload,
} from './index'

export interface KEditorVueProps {
  /** v-model 绑定的 HTML */
  modelValue?: string
  /** 其余编辑器配置，与 props 冲突时以 options 为准 */
  options?: KEditorOptions
  /** 只读 */
  disabled?: boolean
  /** 内容区高度(px)：优先级高于 options.height；不传 / 'auto' = 随内容自动撑开 */
  height?: number | 'auto'
}

export interface KEditorVueEmits {
  (e: 'update:modelValue', html: string): void
  (e: 'change', html: string): void
  (e: 'ready', editor: KEditor): void
  (e: 'upload', payload: UploadHookPayload): void
  (e: 'error', error: { type: string; error: Error; message: string }): void
  (e: 'save', payload: { html: string }): void
  (e: 'blur'): void
  (e: 'focus'): void
}

/** ref 上可访问的实例成员（与组件 expose 一致，等价于 KEditor 实例的公开 API） */
export interface KEditorVueExposed {
  /** 原始 KEditor 实例，用于 expose 未覆盖的能力 */
  readonly editor: KEditor | null
  /** 正文 contenteditable 节点 */
  readonly root: HTMLElement | null
  /* 读取 */
  getHTML(options?: { clean?: boolean | 'preview' }): string
  getText(): string
  getJSON(): { html: string; text: string; counts: EditorCounts } | null
  counts(): EditorCounts | null
  markdownOptions(): { insertMode: 'replace' | 'append' | 'cursor'; maxSize: number; auto: boolean } | null
  /* 内容 */
  setContent(html: string, options?: { sanitize?: boolean; silent?: boolean }): void
  clear(): void
  focus(): void
  blur(): void
  undo(): void
  redo(): void
  setReadOnly(value: boolean): void
  /* Markdown 导入（等价于 editor.importMarkdown 等） */
  importMarkdown(source: MarkdownSource, options?: { mode?: MarkdownInsertMode; silent?: boolean }): Promise<MarkdownImportResult> | undefined
  setMarkdown(source: MarkdownSource, options?: { silent?: boolean }): Promise<MarkdownImportResult> | undefined
  insertMarkdown(source: MarkdownSource, options?: { silent?: boolean }): Promise<MarkdownImportResult> | undefined
  appendMarkdown(source: MarkdownSource, options?: { silent?: boolean }): Promise<MarkdownImportResult> | undefined
  moveCaretToEnd(): void
  /* 插入 / 上传 */
  appendHTML(html: string): void
  insertImage(url: string, alt?: string): HTMLElement | undefined
  insertVideo(url: string, label?: string): HTMLElement | undefined
  insertCode(code?: string, lang?: string): HTMLElement | undefined
  codeLanguages(): { value: string; label: string }[]
  highlightCode(): void
  upload(file: File, kind?: 'image' | 'video'): Promise<unknown>
  cancelUploads(): void
  /* 工具栏按钮 */
  addButton(spec: CustomButtonSpec, options?: ButtonPlaceOptions): HTMLElement | null | undefined
  removeButton(name: string): boolean | undefined
  moveButton(name: string, position: ButtonPlaceOptions): boolean | undefined
  setButtonOptions(name: string, items: CustomButtonOption[] | string[]): CustomButtonOption[] | undefined
  getButtonValue(name: string): CustomButtonOption | null | undefined
  setButtonValue(name: string, value: string | number): CustomButtonOption | null | undefined
  /* 视图 */
  enterSource(): void
  openPreview(): void
  setHeight(value: number | 'auto'): number | undefined
  setPaper(config?: { width?: number; mode?: 'fluid' | 'fixed'; gap?: number; maxWidth?: number }): unknown
  /* 事件 */
  on(name: string, handler: (payload: any) => void): void
  off(name: string, handler?: (payload: any) => void): void
}

export declare const KEditorVue: DefineComponent<
  KEditorVueProps,
  {},
  {},
  {},
  {},
  ComponentOptionsMixin,
  ComponentOptionsMixin,
  KEditorVueEmits,
  'update:modelValue' | 'change' | 'ready' | 'upload' | 'error' | 'save' | 'blur' | 'focus'
>

export declare const KEditorPlugin: {
  install(app: App, opts?: { name?: string }): void
}

/** 组合式用法：const { host, editor } = useKEditor(options) */
export declare function useKEditor(options?: KEditorOptions): {
  host: Ref<HTMLElement | null>
  editor: Ref<KEditor | null>
}

export type KEditorVueInstance = ComponentPublicInstance & KEditorVueExposed
export { KEditorVue as KEditorComponent }

/**
 * 默认导出 = 组件本身，并自带 `install`：
 * - `app.use(KEditorVue)` → 全局注册 `<k-editor>`
 * - `<KEditorVue />` / `import KEditorVue from 'kyle-editor/vue'` 直接当组件用
 */
declare const KEditorVueWithInstall: typeof KEditorVue & {
  install(app: App, opts?: { name?: string }): void
}
export default KEditorVueWithInstall
export type { KEditor, KEditorOptions, EditorCounts, EditorEventMap }
