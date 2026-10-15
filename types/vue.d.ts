/** KEditor Vue 3 集成类型（kyle-editor/vue） */
import type { App, ComponentOptionsMixin, ComponentPublicInstance, DefineComponent, Ref } from 'vue'
import type { EditorCounts, EditorEventMap, KEditor, KEditorOptions, UploadHookPayload } from './index'

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

/** ref 上可访问的实例方法 */
export interface KEditorVueExposed {
  readonly editor: KEditor | null
  getHTML(): string
  getText(): string
  counts(): EditorCounts | null
  focus(): void
  setContent(html: string): void
  enterSource(): void
  openPreview(): void
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
