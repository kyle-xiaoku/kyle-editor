/**
 * Vue 3 集成：<k-editor v-model="html" :options="{...}" />
 * 组件用 render 函数实现，无需 SFC 编译器，可直接被 Vite / Webpack / CDN 使用
 */
import { h, ref, watch, onMounted, onBeforeUnmount, shallowRef } from 'vue'
import { KEditor, defaults } from 'kyle-editor'

export const KEditorVue = {
  name: 'KEditor',
  props: {
    // 不给默认值：v-model 未绑定 / 被赋 undefined 时必须保持 undefined，
    // 否则会被兜成 '' 进而把正文清空（区分「空字符串 = 清空」与「undefined = 没给值」）
    modelValue: { type: String },
    options: { type: Object, default: () => ({}) },
    disabled: { type: Boolean, default: false },
    // 内容区高度：不传 = 自适应内容；传 px 固定；'auto' 同不传
    height: { type: [Number, String], default: null },
  },
  emits: ['update:modelValue', 'ready', 'change', 'upload', 'error', 'save', 'blur', 'focus'],
  setup(props, { emit, expose }) {
    const host = ref(null)
    const instance = shallowRef(null)
    let warnedModel = false

    const buildOptions = () => {
      // 不在这里展开 defaults：KEditor 内部 mergeOptions 已做默认值合并，
      // 提前展开会把 uploader / chunkUploader 变成「显式配置」，导致
      // 「只配了普通上传」时另一条链路仍走默认 mock（大文件拿到 blob: 假地址）
      const opts = { ...props.options }
      const model = typeof props.modelValue === 'string' ? props.modelValue : ''
      opts.value = model || opts.value || ''
      // 0 / '' / null 均视为自适应（默认）
      if (props.height !== null && props.height !== '' && props.height !== undefined) opts.height = props.height
      opts.onChange = (html) => {
        emit('update:modelValue', html)
        emit('change', html)
      }
      opts.onReady = (editor) => emit('ready', editor)
      opts.onError = (error) => emit('error', error)
      opts.onUpload = (payload) => emit('upload', payload)
      return opts
    }

    // expose 必须在 setup 同步阶段调用，实例字段用 getter 惰读取
    // 覆盖核心实例的公开 API，父组件用 ref 即可直接操作（含 Markdown 导入），
    // 不必再写 editorRef.value.editor.xxx
    expose({
      get editor() {
        return instance.value
      },
      get root() {
        return instance.value?.root || null
      },
      /* 读取 */
      getHTML: (options) => instance.value?.getHTML(options) ?? '',
      getText: () => instance.value?.getText() ?? '',
      getJSON: () => instance.value?.getJSON() ?? null,
      counts: () => instance.value?.counts() ?? null,
      markdownOptions: () => instance.value?.markdownOptions() ?? null,
      /* 内容 */
      setContent: (html, options) => instance.value?.setContent(html, options),
      clear: () => instance.value?.clear(),
      focus: () => instance.value?.focus(),
      blur: () => instance.value?.blur(),
      undo: () => instance.value?.undo(),
      redo: () => instance.value?.redo(),
      setReadOnly: (value) => instance.value?.setReadOnly(value),
      /* Markdown 导入 */
      importMarkdown: (source, options) => instance.value?.importMarkdown(source, options),
      setMarkdown: (source, options) => instance.value?.setMarkdown(source, options),
      insertMarkdown: (source, options) => instance.value?.insertMarkdown(source, options),
      appendMarkdown: (source, options) => instance.value?.appendMarkdown(source, options),
      moveCaretToEnd: () => instance.value?.moveCaretToEnd(),
      /* 插入 */
      appendHTML: (html) => instance.value?.appendHTML(html),
      insertImage: (url, alt) => instance.value?.insertImage(url, alt),
      insertVideo: (url, label) => instance.value?.insertVideo(url, label),
      insertCode: (code, lang) => instance.value?.insertCode(code, lang),
      codeLanguages: () => instance.value?.codeLanguages() ?? [],
      highlightCode: () => instance.value?.highlightCode(),
      upload: (file, kind) => instance.value?.upload(file, kind),
      cancelUploads: () => instance.value?.cancelUploads(),
      /* 按钮 */
      addButton: (button) => instance.value?.addButton(button),
      removeButton: (name) => instance.value?.removeButton(name),
      moveButton: (name, position) => instance.value?.moveButton(name, position),
      setButtonOptions: (name, items) => instance.value?.setButtonOptions(name, items),
      getButtonValue: (name) => instance.value?.getButtonValue(name),
      setButtonValue: (name, value) => instance.value?.setButtonValue(name, value),
      /* 视图 */
      enterSource: () => instance.value?.enterSource(),
      openPreview: () => instance.value?.openPreview(),
      setHeight: (height) => instance.value?.setHeight(height),
      setPaper: (paper) => instance.value?.setPaper(paper),
      /* 事件 */
      on: (name, handler) => instance.value?.on(name, handler),
      off: (name, handler) => instance.value?.off(name, handler),
    })

    onMounted(() => {
      instance.value = new KEditor(host.value, buildOptions())
      instance.value.on('save', (payload) => emit('save', payload))
      instance.value.on('blur', () => emit('blur'))
      instance.value.on('focus', () => emit('focus'))
      host.value.__keditor__ = instance.value
    })

    onBeforeUnmount(() => {
      host.value.__keditor__ = null
      instance.value?.destroy()
      instance.value = null
    })

    watch(
      () => props.modelValue,
      (value) => {
        const editor = instance.value
        if (!editor || editor.sourceMode) return
        // 只接受字符串回灌：v-model 被写入 undefined / null / 对象时（例如 change
        // 载荷用法写错）不能把正文清空成 <p><br></p> 或 [object Object]
        if (typeof value !== 'string') {
          if (value != null && !warnedModel) {
            warnedModel = true
            console.warn('[KEditor] v-model 只接受 HTML 字符串，本次非字符串赋值已忽略：', value)
          }
          return
        }
        if (value === editor.getHTML()) return
        editor.setContent(value, { silent: true })
      },
    )

    watch(
      () => props.disabled,
      (value) => instance.value?.setReadOnly(value),
    )

    return () => h('div', { ref: host, class: 'ke-vue-host' })
  },
}

export const KEditorPlugin = {
  install(app, { name = 'KEditor' } = {}) {
    app.component(name, KEditorVue)
    app.config.globalProperties.$keditor = { KEditor, defaults }
  },
}

/** 组合式用法：const { el, editor } = useKEditor(options) */
export function useKEditor(options = {}) {
  const host = ref(null)
  const instance = shallowRef(null)
  onMounted(() => {
    instance.value = new KEditor(host.value, options)
  })
  onBeforeUnmount(() => instance.value?.destroy())
  return { host, editor: instance }
}

// 组件自带 install：`app.use(KEditorVue)` 与 `<KEditorVue />` 两种写法都可用，
// 避免把默认导出当组件却渲染出空白（无任何报错）的陷阱
KEditorVue.install = (app, options) => KEditorPlugin.install(app, options)

export default KEditorVue
export { KEditor }
