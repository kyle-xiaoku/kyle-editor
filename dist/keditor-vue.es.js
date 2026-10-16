import { ref, shallowRef, onMounted, onBeforeUnmount, watch, h } from "vue";
import { KEditor, defaults } from "kyle-editor";
import { KEditor as KEditor2 } from "kyle-editor";
const KEditorVue = {
  name: "KEditor",
  props: {
    // 不给默认值：v-model 未绑定 / 被赋 undefined 时必须保持 undefined，
    // 否则会被兜成 '' 进而把正文清空（区分「空字符串 = 清空」与「undefined = 没给值」）
    modelValue: { type: String },
    options: { type: Object, default: () => ({}) },
    disabled: { type: Boolean, default: false },
    // 内容区高度：不传 = 自适应内容；传 px 固定；'auto' 同不传
    height: { type: [Number, String], default: null }
  },
  emits: ["update:modelValue", "ready", "change", "upload", "error", "save", "blur", "focus"],
  setup(props, { emit, expose }) {
    const host = ref(null);
    const instance = shallowRef(null);
    let warnedModel = false;
    const buildOptions = () => {
      const opts = { ...props.options };
      const model = typeof props.modelValue === "string" ? props.modelValue : "";
      opts.value = model || opts.value || "";
      if (props.height !== null && props.height !== "" && props.height !== void 0) opts.height = props.height;
      opts.onChange = (html) => {
        emit("update:modelValue", html);
        emit("change", html);
      };
      opts.onReady = (editor) => emit("ready", editor);
      opts.onError = (error) => emit("error", error);
      opts.onUpload = (payload) => emit("upload", payload);
      return opts;
    };
    expose({
      get editor() {
        return instance.value;
      },
      get root() {
        var _a;
        return ((_a = instance.value) == null ? void 0 : _a.root) || null;
      },
      /* 读取 */
      getHTML: (options) => {
        var _a;
        return ((_a = instance.value) == null ? void 0 : _a.getHTML(options)) ?? "";
      },
      getText: () => {
        var _a;
        return ((_a = instance.value) == null ? void 0 : _a.getText()) ?? "";
      },
      getJSON: () => {
        var _a;
        return ((_a = instance.value) == null ? void 0 : _a.getJSON()) ?? null;
      },
      counts: () => {
        var _a;
        return ((_a = instance.value) == null ? void 0 : _a.counts()) ?? null;
      },
      markdownOptions: () => {
        var _a;
        return ((_a = instance.value) == null ? void 0 : _a.markdownOptions()) ?? null;
      },
      /* 内容 */
      setContent: (html, options) => {
        var _a;
        return (_a = instance.value) == null ? void 0 : _a.setContent(html, options);
      },
      clear: () => {
        var _a;
        return (_a = instance.value) == null ? void 0 : _a.clear();
      },
      focus: () => {
        var _a;
        return (_a = instance.value) == null ? void 0 : _a.focus();
      },
      blur: () => {
        var _a;
        return (_a = instance.value) == null ? void 0 : _a.blur();
      },
      undo: () => {
        var _a;
        return (_a = instance.value) == null ? void 0 : _a.undo();
      },
      redo: () => {
        var _a;
        return (_a = instance.value) == null ? void 0 : _a.redo();
      },
      setReadOnly: (value) => {
        var _a;
        return (_a = instance.value) == null ? void 0 : _a.setReadOnly(value);
      },
      /* Markdown 导入 */
      importMarkdown: (source, options) => {
        var _a;
        return (_a = instance.value) == null ? void 0 : _a.importMarkdown(source, options);
      },
      setMarkdown: (source, options) => {
        var _a;
        return (_a = instance.value) == null ? void 0 : _a.setMarkdown(source, options);
      },
      insertMarkdown: (source, options) => {
        var _a;
        return (_a = instance.value) == null ? void 0 : _a.insertMarkdown(source, options);
      },
      appendMarkdown: (source, options) => {
        var _a;
        return (_a = instance.value) == null ? void 0 : _a.appendMarkdown(source, options);
      },
      moveCaretToEnd: () => {
        var _a;
        return (_a = instance.value) == null ? void 0 : _a.moveCaretToEnd();
      },
      /* 插入 */
      appendHTML: (html) => {
        var _a;
        return (_a = instance.value) == null ? void 0 : _a.appendHTML(html);
      },
      insertImage: (url, alt) => {
        var _a;
        return (_a = instance.value) == null ? void 0 : _a.insertImage(url, alt);
      },
      insertVideo: (url, label) => {
        var _a;
        return (_a = instance.value) == null ? void 0 : _a.insertVideo(url, label);
      },
      insertCode: (code, lang) => {
        var _a;
        return (_a = instance.value) == null ? void 0 : _a.insertCode(code, lang);
      },
      codeLanguages: () => {
        var _a;
        return ((_a = instance.value) == null ? void 0 : _a.codeLanguages()) ?? [];
      },
      highlightCode: () => {
        var _a;
        return (_a = instance.value) == null ? void 0 : _a.highlightCode();
      },
      upload: (file, kind) => {
        var _a;
        return (_a = instance.value) == null ? void 0 : _a.upload(file, kind);
      },
      cancelUploads: () => {
        var _a;
        return (_a = instance.value) == null ? void 0 : _a.cancelUploads();
      },
      /* 按钮 */
      addButton: (button) => {
        var _a;
        return (_a = instance.value) == null ? void 0 : _a.addButton(button);
      },
      removeButton: (name) => {
        var _a;
        return (_a = instance.value) == null ? void 0 : _a.removeButton(name);
      },
      moveButton: (name, position) => {
        var _a;
        return (_a = instance.value) == null ? void 0 : _a.moveButton(name, position);
      },
      setButtonOptions: (name, items) => {
        var _a;
        return (_a = instance.value) == null ? void 0 : _a.setButtonOptions(name, items);
      },
      getButtonValue: (name) => {
        var _a;
        return (_a = instance.value) == null ? void 0 : _a.getButtonValue(name);
      },
      setButtonValue: (name, value) => {
        var _a;
        return (_a = instance.value) == null ? void 0 : _a.setButtonValue(name, value);
      },
      /* 视图 */
      enterSource: () => {
        var _a;
        return (_a = instance.value) == null ? void 0 : _a.enterSource();
      },
      openPreview: () => {
        var _a;
        return (_a = instance.value) == null ? void 0 : _a.openPreview();
      },
      setHeight: (height) => {
        var _a;
        return (_a = instance.value) == null ? void 0 : _a.setHeight(height);
      },
      setPaper: (paper) => {
        var _a;
        return (_a = instance.value) == null ? void 0 : _a.setPaper(paper);
      },
      /* 事件 */
      on: (name, handler) => {
        var _a;
        return (_a = instance.value) == null ? void 0 : _a.on(name, handler);
      },
      off: (name, handler) => {
        var _a;
        return (_a = instance.value) == null ? void 0 : _a.off(name, handler);
      }
    });
    onMounted(() => {
      instance.value = new KEditor(host.value, buildOptions());
      instance.value.on("save", (payload) => emit("save", payload));
      instance.value.on("blur", () => emit("blur"));
      instance.value.on("focus", () => emit("focus"));
      host.value.__keditor__ = instance.value;
    });
    onBeforeUnmount(() => {
      var _a;
      host.value.__keditor__ = null;
      (_a = instance.value) == null ? void 0 : _a.destroy();
      instance.value = null;
    });
    watch(
      () => props.modelValue,
      (value) => {
        const editor = instance.value;
        if (!editor || editor.sourceMode) return;
        if (typeof value !== "string") {
          if (value != null && !warnedModel) {
            warnedModel = true;
            console.warn("[KEditor] v-model 只接受 HTML 字符串，本次非字符串赋值已忽略：", value);
          }
          return;
        }
        if (value === editor.getHTML()) return;
        editor.setContent(value, { silent: true });
      }
    );
    watch(
      () => props.disabled,
      (value) => {
        var _a;
        return (_a = instance.value) == null ? void 0 : _a.setReadOnly(value);
      }
    );
    return () => h("div", { ref: host, class: "ke-vue-host" });
  }
};
const KEditorPlugin = {
  install(app, { name = "KEditor" } = {}) {
    app.component(name, KEditorVue);
    app.config.globalProperties.$keditor = { KEditor, defaults };
  }
};
function useKEditor(options = {}) {
  const host = ref(null);
  const instance = shallowRef(null);
  onMounted(() => {
    instance.value = new KEditor(host.value, options);
  });
  onBeforeUnmount(() => {
    var _a;
    return (_a = instance.value) == null ? void 0 : _a.destroy();
  });
  return { host, editor: instance };
}
KEditorVue.install = (app, options) => KEditorPlugin.install(app, options);
export {
  KEditor2 as KEditor,
  KEditorPlugin,
  KEditorVue,
  KEditorVue as default,
  useKEditor
};
