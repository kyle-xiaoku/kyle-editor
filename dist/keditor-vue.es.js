import { ref, shallowRef, onMounted, onBeforeUnmount, watch, h } from "vue";
import { KEditor, defaults } from "kyle-editor";
import { KEditor as KEditor2 } from "kyle-editor";
const KEditorVue = {
  name: "KEditor",
  props: {
    modelValue: { type: String, default: "" },
    options: { type: Object, default: () => ({}) },
    disabled: { type: Boolean, default: false },
    height: { type: Number, default: null }
  },
  emits: ["update:modelValue", "ready", "change", "upload", "error", "save", "blur", "focus"],
  setup(props, { emit, expose }) {
    const host = ref(null);
    const instance = shallowRef(null);
    const buildOptions = () => {
      const opts = { ...defaults, ...props.options, value: props.modelValue || "" };
      if (props.height) opts.height = props.height;
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
      getHTML: () => {
        var _a;
        return ((_a = instance.value) == null ? void 0 : _a.getHTML()) || "";
      },
      getText: () => {
        var _a;
        return ((_a = instance.value) == null ? void 0 : _a.getText()) || "";
      },
      counts: () => {
        var _a;
        return ((_a = instance.value) == null ? void 0 : _a.counts()) || null;
      },
      focus: () => {
        var _a;
        return (_a = instance.value) == null ? void 0 : _a.focus();
      },
      setContent: (html) => {
        var _a;
        return (_a = instance.value) == null ? void 0 : _a.setContent(html);
      },
      enterSource: () => {
        var _a;
        return (_a = instance.value) == null ? void 0 : _a.enterSource();
      },
      openPreview: () => {
        var _a;
        return (_a = instance.value) == null ? void 0 : _a.openPreview();
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
        if (value === editor.getHTML()) return;
        editor.setContent(value || "", { silent: true });
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
export {
  KEditor2 as KEditor,
  KEditorPlugin,
  KEditorVue,
  KEditorPlugin as default,
  useKEditor
};
