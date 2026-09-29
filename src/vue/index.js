/**
 * Vue 3 集成：<k-editor v-model="html" :options="{...}" />
 * 组件用 render 函数实现，无需 SFC 编译器，可直接被 Vite / Webpack / CDN 使用
 */
import { h, ref, watch, onMounted, onBeforeUnmount, shallowRef } from 'vue'
import { KEditor, defaults } from 'kyle-editor'

export const KEditorVue = {
  name: 'KEditor',
  props: {
    modelValue: { type: String, default: '' },
    options: { type: Object, default: () => ({}) },
    disabled: { type: Boolean, default: false },
    height: { type: Number, default: null },
  },
  emits: ['update:modelValue', 'ready', 'change', 'upload', 'error', 'save', 'blur', 'focus'],
  setup(props, { emit, expose }) {
    const host = ref(null)
    const instance = shallowRef(null)

    const buildOptions = () => {
      const opts = { ...defaults, ...props.options, value: props.modelValue || '' }
      if (props.height) opts.height = props.height
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
    expose({
      get editor() {
        return instance.value
      },
      getHTML: () => instance.value?.getHTML() || '',
      getText: () => instance.value?.getText() || '',
      counts: () => instance.value?.counts() || null,
      focus: () => instance.value?.focus(),
      setContent: (html) => instance.value?.setContent(html),
      enterSource: () => instance.value?.enterSource(),
      openPreview: () => instance.value?.openPreview(),
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
        if (value === editor.getHTML()) return
        editor.setContent(value || '', { silent: true })
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

export default KEditorPlugin
export { KEditor }
