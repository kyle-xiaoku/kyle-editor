(function(global, factory) {
  typeof exports === "object" && typeof module !== "undefined" ? factory(exports, require("vue"), require("kyle-editor")) : typeof define === "function" && define.amd ? define(["exports", "vue", "kyle-editor"], factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, factory(global.KEditorVue = {}, global.Vue, global.KEditor));
})(this, function(exports2, vue, kyleEditor) {
  "use strict";
  const KEditorVue = {
    name: "KEditor",
    props: {
      modelValue: { type: String, default: "" },
      options: { type: Object, default: () => ({}) },
      disabled: { type: Boolean, default: false },
      // 内容区高度：不传 = 自适应内容；传 px 固定；'auto' 同不传
      height: { type: [Number, String], default: null }
    },
    emits: ["update:modelValue", "ready", "change", "upload", "error", "save", "blur", "focus"],
    setup(props, { emit, expose }) {
      const host = vue.ref(null);
      const instance = vue.shallowRef(null);
      const buildOptions = () => {
        const opts = { ...kyleEditor.defaults, ...props.options, value: props.modelValue || "" };
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
      vue.onMounted(() => {
        instance.value = new kyleEditor.KEditor(host.value, buildOptions());
        instance.value.on("save", (payload) => emit("save", payload));
        instance.value.on("blur", () => emit("blur"));
        instance.value.on("focus", () => emit("focus"));
        host.value.__keditor__ = instance.value;
      });
      vue.onBeforeUnmount(() => {
        var _a;
        host.value.__keditor__ = null;
        (_a = instance.value) == null ? void 0 : _a.destroy();
        instance.value = null;
      });
      vue.watch(
        () => props.modelValue,
        (value) => {
          const editor = instance.value;
          if (!editor || editor.sourceMode) return;
          if (value === editor.getHTML()) return;
          editor.setContent(value || "", { silent: true });
        }
      );
      vue.watch(
        () => props.disabled,
        (value) => {
          var _a;
          return (_a = instance.value) == null ? void 0 : _a.setReadOnly(value);
        }
      );
      return () => vue.h("div", { ref: host, class: "ke-vue-host" });
    }
  };
  const KEditorPlugin = {
    install(app, { name = "KEditor" } = {}) {
      app.component(name, KEditorVue);
      app.config.globalProperties.$keditor = { KEditor: kyleEditor.KEditor, defaults: kyleEditor.defaults };
    }
  };
  function useKEditor(options = {}) {
    const host = vue.ref(null);
    const instance = vue.shallowRef(null);
    vue.onMounted(() => {
      instance.value = new kyleEditor.KEditor(host.value, options);
    });
    vue.onBeforeUnmount(() => {
      var _a;
      return (_a = instance.value) == null ? void 0 : _a.destroy();
    });
    return { host, editor: instance };
  }
  KEditorVue.install = (app, options) => KEditorPlugin.install(app, options);
  Object.defineProperty(exports2, "KEditor", {
    enumerable: true,
    get: () => kyleEditor.KEditor
  });
  exports2.KEditorPlugin = KEditorPlugin;
  exports2.KEditorVue = KEditorVue;
  exports2.default = KEditorVue;
  exports2.useKEditor = useKEditor;
  Object.defineProperties(exports2, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
});
