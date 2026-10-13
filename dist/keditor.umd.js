(function(global, factory) {
  typeof exports === "object" && typeof module !== "undefined" ? factory(exports) : typeof define === "function" && define.amd ? define(["exports"], factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, factory(global.KEditor = {}));
})(this, function(exports2) {
  "use strict";
  const CSS$1 = `
.ke, .ke * { box-sizing: border-box; }
.ke {
  --ke-primary: #07c160;
  --ke-primary-weak: #eafaf1;
  --ke-text: #3f3f3f;
  --ke-muted: #8a8f99;
  --ke-line: #e6e8eb;
  --ke-line-weak: #f0f1f3;
  --ke-bg: #f6f7f9;
  --ke-radius: 10px;
  --ke-paper: 677px;
  --ke-paper-gap: 24px;
  --ke-shadow: 0 1px 2px rgba(16, 24, 40, .04), 0 8px 24px rgba(16, 24, 40, .06);
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  color: var(--ke-text);
  background: var(--ke-bg);
  position: relative;
  border: 1px solid var(--ke-line);
  border-radius: var(--ke-radius);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  font-size: 14px;
  -webkit-font-smoothing: antialiased;
}
.ke[hidden] { display: none; }
.ke-is-fullscreen { position: fixed; inset: 0; z-index: 9998; border-radius: 0; }

/* ---------------- Toolbar ---------------- */
.ke-tb {
  position: sticky; top: 0; z-index: 5;
  display: flex; align-items: center; gap: 2px; flex-wrap: nowrap;
  padding: 6px 10px 5px;
  background: #fff;
  border-bottom: 1px solid var(--ke-line);
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
  /* 滚动条常显：静止时也能一眼看出「还有更多工具」 */
  scrollbar-width: thin;
  scrollbar-color: rgba(16, 24, 40, .28) rgba(16, 24, 40, .05);
}
.ke-tb::-webkit-scrollbar { height: 7px; }
.ke-tb::-webkit-scrollbar-track { background: rgba(16, 24, 40, .06); border-radius: 4px; }
.ke-tb::-webkit-scrollbar-thumb { background: rgba(16, 24, 40, .34); border-radius: 4px; }
.ke-tb:hover::-webkit-scrollbar-thumb { background: rgba(16, 24, 40, .48); }
.ke-tb::-webkit-scrollbar-thumb:active { background: var(--ke-primary); }
.ke-tb-group { display: flex; align-items: center; gap: 2px; flex: none; }
.ke-tb-sep { width: 1px; height: 18px; background: var(--ke-line); margin: 0 6px; flex: none; }
.ke-tb-tail {
  position: sticky; right: 0; margin-left: auto; display: flex; align-items: center; gap: 4px;
  flex: none; padding: 0 2px 0 12px; background: #fff;
  box-shadow: none; transition: box-shadow .2s;
}
/* 仅当右侧仍有被尾部遮住的工具时才显示，让阴影成为「可继续滑动」的信号 */
.ke.ke-tb-can-r .ke-tb-tail { box-shadow: -16px 0 14px -10px rgba(16, 24, 40, .55); }
/* 尾部左缘渐隐：明确表达「还有工具滑到这块底下」 */
.ke-tb-tail::before {
  content: ''; position: absolute; top: 0; bottom: 0; right: 100%; width: 30px;
  background: linear-gradient(to left, rgba(255, 255, 255, .99) 18%, rgba(255, 255, 255, 0));
  opacity: 0; transition: opacity .2s; pointer-events: none;
}
.ke.ke-tb-can-r .ke-tb-tail::before { opacity: 1; }
/* 遮住工具栏右侧 padding 区域，避免滚动内容从尾部后面露出 */
.ke-tb-tail::after { content: ''; position: absolute; top: 0; bottom: 0; right: -16px; width: 18px; background: #fff; }

/* ------- 可滑动提示：左侧渐隐 + 拖拽手势 + 首次引导气泡 ------- */
/* 高度避开底部 7px 滚动条，否则会把滚动条左端涂白 */
.ke-tb-fades { position: absolute; left: 0; right: 0; top: 0; height: calc(var(--ke-tb-h, 44px) - 8px); z-index: 6; pointer-events: none; overflow: hidden; }
.ke-tb-fade { position: absolute; top: 0; bottom: 0; width: 34px; opacity: 0; transition: opacity .2s; }
.ke-tb-fade-l { left: 0; background: linear-gradient(to right, rgba(255, 255, 255, .99) 26%, rgba(255, 255, 255, 0)); }
.ke.ke-tb-can-l .ke-tb-fade-l { opacity: 1; }
@media (hover: hover) and (pointer: fine) {
  .ke.ke-tb-scrollable .ke-tb { cursor: grab; }
  .ke.ke-tb-dragging .ke-tb, .ke.ke-tb-dragging .ke-tb .ke-btn { cursor: grabbing; }
}
.ke.ke-tb-dragging { user-select: none; -webkit-user-select: none; }
.ke-tb-hint {
  position: absolute; left: 50%; top: calc(var(--ke-tb-h, 44px) + 9px); z-index: 7;
  transform: translateX(-50%);
  display: inline-flex; align-items: center; gap: 7px;
  padding: 7px 13px; border-radius: 999px;
  background: rgba(31, 35, 41, .94); color: #fff;
  font-size: 12.5px; line-height: 1; white-space: nowrap; letter-spacing: .2px;
  box-shadow: 0 6px 20px rgba(16, 24, 40, .26);
  pointer-events: none;
  animation: ke-hint-in .3s cubic-bezier(.22, 1, .36, 1) both;
}
.ke-tb-hint::before {
  content: ''; position: absolute; top: -5px; left: 50%; margin-left: -5px;
  border: 5px solid transparent; border-top: 0; border-bottom-color: rgba(31, 35, 41, .94);
}
.ke-tb-hint-ico { display: flex; color: #7ee2a8; animation: ke-hint-slide 1.15s ease-in-out infinite; }
.ke-tb-hint-ico svg { width: 15px; height: 15px; display: block; }
.ke-tb-hint.ke-is-out { animation: ke-hint-out .24s ease-in both; }
@keyframes ke-hint-in {
  from { opacity: 0; transform: translateX(-50%) translateY(-8px) scale(.96); }
  to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}
@keyframes ke-hint-out {
  to { opacity: 0; transform: translateX(-50%) translateY(-8px) scale(.96); }
}
@keyframes ke-hint-slide {
  0%, 100% { transform: translateX(-2.5px); }
  50% { transform: translateX(2.5px); }
}
.ke-btn {
  position: relative; flex: none;
  height: 30px; min-width: 30px; padding: 0 6px;
  display: inline-flex; align-items: center; justify-content: center; gap: 4px;
  border: 0; border-radius: 6px; background: transparent; color: #4b5158;
  cursor: pointer; font-size: 13px; line-height: 1; transition: background .15s, color .15s;
}
.ke-btn:hover { background: #f2f3f5; color: #1f2329; }
.ke-btn:active { background: #e9eaec; }
.ke-btn.ke-is-active { background: var(--ke-primary-weak); color: var(--ke-primary); }
.ke-btn.ke-is-open { background: #eef0f2; color: #1f2329; }
.ke-btn-label { padding: 0 6px 0 8px; gap: 2px; min-width: 56px; justify-content: flex-start; }
.ke-btn-text { font-size: 12.5px; letter-spacing: .2px; }
.ke-btn:disabled { opacity: .38; cursor: not-allowed; }
.ke-btn:focus-visible { outline: 2px solid var(--ke-primary); outline-offset: 1px; }
.ke-ico { width: 17px; height: 17px; display: block; }
.ke-glyph { font-size: 14px; font-weight: 600; }
.ke-glyph-i { font-style: italic; font-family: Georgia, 'Times New Roman', serif; }
.ke-glyph-u { text-decoration: underline; }
.ke-glyph-s { text-decoration: line-through; }
.ke-glyph-h { font-weight: 700; font-size: 13px; }
.ke-dot { position: absolute; left: 4px; right: 4px; bottom: 3px; height: 3px; border-radius: 2px; background: var(--ke-fore, #1f2329); }
.ke-dot-bg { left: 3px; right: 3px; bottom: 2.5px; height: 4px; border-radius: 2px; background: var(--ke-back, #f6c344); }
.ke-glyph-a { font-size: 15px; font-weight: 700; letter-spacing: 0; line-height: 1; margin-bottom: 3px; }
.ke-glyph-hl { position: relative; margin-bottom: 0; padding: 0 3px; }
.ke-glyph-hl::before { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 11px; border-radius: 2px; background: var(--ke-back, #f6c344); }
.ke-glyph-hl > span { position: relative; z-index: 1; }
.ke-btn[data-k-pop] .ke-caret { width: 11px; height: 11px; opacity: .5; margin-left: -1px; }
.ke-select {
  height: 30px; border: 1px solid transparent; border-radius: 6px; background: transparent;
  color: #4b5158; font-size: 13px; padding: 0 4px; cursor: pointer; max-width: 92px;
}
.ke-select:hover { background: #f2f3f5; }
.ke-select:focus { outline: none; border-color: var(--ke-primary); }

/* ---------------- Popover ---------------- */
.ke-pop {
  position: absolute; z-index: 40; min-width: 236px; padding: 0;
  background: #fff; border: 1px solid rgba(31, 35, 41, .07); border-radius: 12px;
  box-shadow: 0 2px 4px rgba(16, 24, 40, .04), 0 12px 32px rgba(16, 24, 40, .14);
  font-size: 13px; color: var(--ke-text); overflow: hidden;
}
.ke-pop[hidden] { display: none; }
.ke-pop-in { animation: ke-pop-in .16s cubic-bezier(.22, 1, .36, 1); }
@keyframes ke-pop-in { from { opacity: 0; transform: translateY(-6px) scale(.985); } }
.ke-panel { padding: 12px 14px 14px; }
.ke-panel-wide { min-width: 268px; }
.ke-panel-head { display: flex; align-items: center; gap: 8px; margin: -12px -14px 12px; padding: 10px 14px; background: #f8f9fb; border-bottom: 1px solid var(--ke-line-weak); }
.ke-panel-title { font-size: 13px; font-weight: 600; color: #1f2329; }
.ke-panel-note { margin-left: auto; font-size: 12px; color: var(--ke-muted); }
.ke-panel-reset { margin-left: auto; height: 22px; padding: 0 8px; border: 1px solid var(--ke-line); border-radius: 11px; background: #fff; color: #6b7280; font-size: 12px; cursor: pointer; }
.ke-panel-reset:hover { border-color: var(--ke-primary); color: var(--ke-primary); }
.ke-panel-sect { margin: 10px 0 6px; font-size: 11px; color: #a2a8b3; letter-spacing: .3px; }
.ke-panel-sect:first-of-type { margin-top: 0; }
.ke-panel-divider { height: 1px; background: var(--ke-line-weak); margin: 12px -14px 10px; }
.ke-panel-hint { font-size: 11.5px; color: #a2a8b3; line-height: 1.5; }
.ke-panel-foot { display: flex; align-items: center; gap: 8px; margin-top: 10px; }

.ke-sw-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; }
.ke-sw {
  position: relative; width: 100%; aspect-ratio: 1 / 1; min-width: 22px; padding: 0;
  border: 1px solid rgba(0, 0, 0, .07); border-radius: 6px; cursor: pointer;
  transition: transform .12s ease, box-shadow .12s ease;
}
.ke-sw:hover { transform: translateY(-1px) scale(1.08); box-shadow: 0 2px 6px rgba(16, 24, 40, .18); z-index: 1; }
.ke-sw.ke-is-active { box-shadow: 0 0 0 2px #fff, 0 0 0 3.5px var(--ke-primary); }
.ke-sw-check { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
.ke-sw-check .ke-ico { width: 13px; height: 13px; filter: drop-shadow(0 1px 1px rgba(0, 0, 0, .35)); }
.ke-sw-picker { width: 30px; height: 30px; padding: 0; border: 1px solid var(--ke-line); border-radius: 7px; background: #fff; cursor: pointer; flex: none; }
.ke-sw-picker::-webkit-color-swatch-wrapper { padding: 3px; }
.ke-sw-picker::-webkit-color-swatch { border: 0; border-radius: 4px; }
.ke-sw-hex { flex: 1; font-family: 'SFMono-Regular', Consolas, Menlo, monospace; text-transform: uppercase; }

.ke-hd-row {
  display: flex; flex-direction: column; align-items: stretch; gap: 2px; width: 100%;
  padding: 8px 10px; margin-bottom: 4px; border: 1px solid transparent; border-radius: 8px;
  background: #fff; cursor: pointer; text-align: left; transition: background .14s, border-color .14s;
}
.ke-hd-row:last-child { margin-bottom: 0; }
.ke-hd-row:hover { background: #f7f8fa; }
.ke-hd-row.ke-is-active { border-color: var(--ke-primary); background: var(--ke-primary-weak); }
.ke-hd-sample { display: block; color: #1f2329; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.35; }
.ke-hd-meta { display: flex; align-items: baseline; gap: 6px; font-size: 11.5px; color: #a2a8b3; }
.ke-hd-label { color: #6b7280; }
.ke-hd-row .s-body { font-size: 15px; }
.ke-hd-row .s-h1 { font-size: 21px; font-weight: 700; }
.ke-hd-row .s-h2 { font-size: 18px; font-weight: 700; }
.ke-hd-row .s-h3 { font-size: 16px; font-weight: 600; }

.ke-size-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; }
.ke-size-cell { height: 32px; border: 1px solid var(--ke-line); border-radius: 7px; background: #fff; color: #4b5158; cursor: pointer; }
.ke-size-cell:hover { border-color: var(--ke-primary); color: var(--ke-primary); background: var(--ke-primary-weak); }
.ke-size-cell.ke-is-active { border-color: var(--ke-primary); background: var(--ke-primary); color: #fff; }

/* -------- 自定义下拉按钮 -------- */
.ke-btn-custom .ke-btn-text { max-width: 96px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ke-btn-custom.ke-has-value { color: var(--ke-primary); }
.ke-panel-icon { margin-left: auto; width: 22px; height: 22px; padding: 0; border: 1px solid var(--ke-line); border-radius: 50%; background: #fff; color: #6b7280; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
.ke-panel-icon:hover { border-color: var(--ke-primary); color: var(--ke-primary); }
.ke-panel-icon .ke-ico { width: 13px; height: 13px; }
.ke-panel-icon + .ke-panel-note { margin-left: 8px; }

.ke-panel-select .ke-sel-search { margin-bottom: 8px; }
.ke-sel-body { max-height: 268px; overflow-y: auto; overscroll-behavior: contain; margin: 0 -4px; padding: 0 4px; }
.ke-sel-row {
  display: flex; align-items: center; gap: 8px; width: 100%;
  padding: 7px 9px; margin-bottom: 3px; border: 1px solid transparent; border-radius: 8px;
  background: #fff; cursor: pointer; text-align: left; transition: background .14s, border-color .14s;
}
.ke-sel-row:last-child { margin-bottom: 0; }
.ke-sel-row:hover:not(:disabled) { background: #f7f8fa; }
.ke-sel-row:disabled { cursor: not-allowed; opacity: .45; }
.ke-sel-row.ke-is-active { border-color: var(--ke-primary); background: var(--ke-primary-weak); }
.ke-sel-main { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
.ke-sel-label { color: #1f2329; font-size: 13.5px; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ke-sel-row.ke-is-active .ke-sel-label { color: var(--ke-primary); font-weight: 600; }
.ke-sel-desc { color: #a2a8b3; font-size: 11.5px; line-height: 1.45; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ke-sel-link { display: inline-flex; align-items: center; gap: 3px; color: #2f6fed; font-size: 11px; }
.ke-sel-link .ke-ico { width: 11px; height: 11px; flex: none; }
.ke-sel-link i { font-style: normal; opacity: .8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 150px; }
.ke-sel-check { flex: none; width: 16px; height: 16px; color: var(--ke-primary); }
.ke-sel-check .ke-ico { width: 16px; height: 16px; }

.ke-sel-loading { display: flex; align-items: center; gap: 8px; padding: 4px 2px 10px; color: #6b7280; font-size: 12.5px; }
.ke-sel-loading .ke-spinner { width: 14px; height: 14px; }
.ke-sel-skel { height: 34px; margin-bottom: 6px; border-radius: 8px; background: linear-gradient(90deg, #f2f3f5 25%, #e9ebef 37%, #f2f3f5 63%); background-size: 400% 100%; animation: ke-skel 1.3s ease infinite; }
@keyframes ke-skel { from { background-position: 100% 50%; } to { background-position: 0 50%; } }
.ke-sel-tip { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 22px 12px; text-align: center; }
.ke-sel-tip-text { color: #a2a8b3; font-size: 12.5px; line-height: 1.6; word-break: break-all; }
.ke-sel-tip .ke-btn-primary { align-self: center; }

.ke-tabs { display: flex; gap: 4px; margin: -12px -14px 12px; padding: 0 14px; background: #f8f9fb; border-bottom: 1px solid var(--ke-line-weak); }
.ke-tab { height: 34px; padding: 0 4px; margin-right: 10px; border: 0; border-bottom: 2px solid transparent; background: transparent; color: #6b7280; font-size: 13px; cursor: pointer; }
.ke-tab:hover { color: #1f2329; }
.ke-tab.ke-is-active { color: var(--ke-primary); border-bottom-color: var(--ke-primary); font-weight: 600; }
.ke-tab-body[hidden] { display: none; }
.ke-drop {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
  padding: 20px 14px; border: 1.5px dashed #d6dade; border-radius: 10px; background: #fbfcfd;
  color: var(--ke-muted); cursor: pointer; text-align: center; transition: border-color .14s, background .14s;
}
.ke-drop:hover, .ke-drop.ke-is-over { border-color: var(--ke-primary); background: var(--ke-primary-weak); }
.ke-drop-ico .ke-ico { width: 24px; height: 24px; color: var(--ke-primary); }
.ke-drop-title { font-size: 13px; color: #4b5158; }
.ke-drop-sub { font-size: 11.5px; color: #a2a8b3; }
.ke-field { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.ke-field-label { flex: none; width: 34px; font-size: 12px; color: var(--ke-muted); }
.ke-check { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #4b5158; margin-bottom: 4px; }
.ke-link-status { min-height: 18px; font-size: 11.5px; color: #a2a8b3; }
.ke-link-status.ke-is-checking { color: #2f6fed; }
.ke-link-status.ke-is-ok { color: var(--ke-primary); }
.ke-link-status.ke-is-bad { color: #ed8936; }

.ke-input, .ke-textarea {
  width: 100%; height: 32px; padding: 0 10px; border: 1px solid var(--ke-line); border-radius: 7px;
  font-size: 13px; color: var(--ke-text); background: #fff; transition: border-color .14s, box-shadow .14s;
}
.ke-input:focus, .ke-textarea:focus { outline: none; border-color: var(--ke-primary); box-shadow: 0 0 0 3px rgba(7, 193, 96, .12); }
.ke-input.ke-is-invalid { border-color: #e53e3e; box-shadow: 0 0 0 3px rgba(229, 62, 62, .12); }
.ke-textarea { height: auto; padding: 8px 10px; resize: vertical; font-family: inherit; line-height: 1.6; }
.ke-btn-primary { height: 32px; padding: 0 16px; border-radius: 7px; background: var(--ke-primary); color: #fff; font-size: 13px; border: 0; cursor: pointer; flex: none; }
.ke-btn-primary:hover { background: #06b35a; }
.ke-btn-primary:disabled { opacity: .45; cursor: progress; }
.ke-btn-ghost { height: 32px; padding: 0 14px; border-radius: 7px; background: #fff; border: 1px solid var(--ke-line); color: #4b5158; font-size: 13px; cursor: pointer; flex: none; }
.ke-btn-ghost:hover { border-color: #cfd3d8; color: #1f2329; }
.ke-table-grid { display: grid; gap: 3px; }
.ke-table-cell { width: 18px; height: 18px; border: 1px solid #d6dade; border-radius: 3px; transition: background .1s; }
.ke-table-cell.ke-is-on { background: var(--ke-primary-weak); border-color: var(--ke-primary); }

/* ---------------- Paper / Content ---------------- */
.ke-main { flex: 1; min-height: 0; display: flex; flex-direction: column; position: relative; }
.ke-scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 22px 18px 28px; background: var(--ke-bg); scrollbar-width: thin; }
.ke-paper {
  width: min(100%, calc(var(--ke-paper) + 64px)); margin: 0 auto; background: #fff;
  border-radius: 8px; box-shadow: var(--ke-shadow); padding: 32px;
  min-height: var(--ke-min-height, 320px);
}
/* 宽屏：版心随容器生长，两侧留白恒定为 --ke-paper-gap，不再随屏宽放大 */
.ke-paper.ke-is-fluid {
  width: min(100%, max(calc(var(--ke-paper) + 64px), calc(100% - var(--ke-paper-gap) * 2)));
  max-width: var(--ke-paper-max, none);
}
.ke-content { outline: none; font-size: 17px; line-height: 1.75; color: var(--ke-text); word-break: break-word; }
.ke-content:empty::before,
.ke-content[data-placeholder].ke-is-empty::before {
  content: attr(data-placeholder); color: #b8bec7; pointer-events: none;
}
.ke-content > *:first-child { margin-top: 0; }
.ke-content p { margin: 0 0 16px; }
.ke-content h1, .ke-content h2, .ke-content h3, .ke-content h4, .ke-content h5, .ke-content h6 {
  margin: 24px 0 12px; font-weight: 600; line-height: 1.4; color: #1f2329;
}
.ke-content h1 { font-size: 22px; } .ke-content h2 { font-size: 20px; } .ke-content h3 { font-size: 18px; }
.ke-content h4, .ke-content h5, .ke-content h6 { font-size: 17px; }
.ke-content ul, .ke-content ol { margin: 0 0 16px; padding-left: 26px; }
.ke-content li { margin: 4px 0; }
.ke-content blockquote {
  margin: 0 0 16px; padding: 2px 16px; border-left: 3px solid var(--ke-primary);
  background: #f8f9fa; color: #6b7280; border-radius: 0 4px 4px 0;
}
.ke-content a { color: #576b95; text-decoration: none; border-bottom: 1px solid rgba(87,107,149,.35); }
.ke-content hr { border: 0; border-top: 1px solid var(--ke-line); margin: 24px 0; }
.ke-content code { background: #f2f3f5; border-radius: 4px; padding: 2px 6px; font-size: 14px; font-family: 'SFMono-Regular', Consolas, Menlo, monospace; color: #c7254e; }
.ke-content pre {
  background: #282c34; color: #e6e6e6; padding: 14px 16px; border-radius: 8px; overflow-x: auto;
  font-size: 13px; line-height: 1.7; margin: 0 0 16px; font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
}
.ke-content pre code { background: none; color: inherit; padding: 0; font-size: inherit; }
.ke-content img, .ke-content video { max-width: 100%; height: auto; display: block; }
.ke-content figure { margin: 0 0 16px; }
.ke-content figcaption { font-size: 13px; color: var(--ke-muted); text-align: center; margin-top: 6px; }
.ke-content table { border-collapse: collapse; width: 100%; margin: 0 0 16px; font-size: 15px; }
.ke-content th, .ke-content td { border: 1px solid #dfe2e6; padding: 8px 10px; min-width: 40px; }
.ke-content th { background: #f6f7f9; font-weight: 600; }
.ke-content section { margin: 0 0 16px; }
.ke-content .ke-is-selected-media { outline: 2px solid var(--ke-primary); outline-offset: 2px; border-radius: 4px; }

/* 上传中的媒体占位 */
.ke-media-box { position: relative; margin: 0 0 16px; }
.ke-media-holder {
  border: 1px dashed #cdd3da; border-radius: 8px; background: #fafbfc; color: var(--ke-muted);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
  min-height: 120px; padding: 16px; font-size: 13px; text-align: center;
}
.ke-media-holder img { max-width: 100%; max-height: 260px; border-radius: 6px; opacity: .9; }
.ke-media-name { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ke-progress { width: 100%; height: 6px; border-radius: 3px; background: #eceef1; overflow: hidden; }
.ke-progress i { display: block; height: 100%; width: 0; background: var(--ke-primary); border-radius: 3px; transition: width .2s ease; }
.ke-media-meta { display: flex; align-items: center; gap: 10px; width: 100%; }
.ke-media-pct { color: var(--ke-primary); font-weight: 600; min-width: 40px; text-align: right; }
.ke-media-error { color: #e53e3e; }
.ke-media-retry { border: 1px solid var(--ke-line); background: #fff; border-radius: 6px; padding: 4px 12px; cursor: pointer; font-size: 12px; color: #4b5158; }
.ke-media-retry:hover { border-color: var(--ke-primary); color: var(--ke-primary); }
.ke-media-cancel { border: 0; background: transparent; color: var(--ke-muted); cursor: pointer; font-size: 12px; }
.ke-spinner { width: 18px; height: 18px; border: 2px solid #dfe3e8; border-top-color: var(--ke-primary); border-radius: 50%; animation: ke-spin .8s linear infinite; }
@keyframes ke-spin { to { transform: rotate(360deg); } }

/* 视频卡片 */
.ke-video-card {
  position: relative; border: 1px solid var(--ke-line); border-radius: 10px; background: #0f1115;
  color: #e6e8eb; padding: 12px 14px; margin: 0 0 16px; display: flex; align-items: center; gap: 12px;
}
.ke-video-card video { width: 100%; border-radius: 6px; display: block; }
.ke-video-card .ke-video-body { flex: 1; min-width: 0; }
.ke-video-head { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.ke-video-size { color: var(--ke-muted); font-size: 12px; }
.ke-video-remove { border: 0; background: transparent; color: #9aa2ad; cursor: pointer; padding: 4px; border-radius: 6px; }
.ke-video-remove:hover { color: #e53e3e; background: rgba(255,255,255,.06); }
.ke-inline-video video { border-radius: 8px; }

/* ---------------- Status bar ---------------- */
.ke-status {
  display: flex; align-items: center; gap: 12px; padding: 6px 12px;
  background: #fff; border-top: 1px solid var(--ke-line); font-size: 12px; color: var(--ke-muted);
}
.ke-status b { color: var(--ke-primary); font-weight: 600; }
.ke-status-hint { margin-left: 8px; }
.ke-status-tail { margin-left: auto; display: flex; align-items: center; gap: 4px; }
.ke-chip { display: inline-flex; align-items: center; gap: 4px; height: 24px; padding: 0 8px; border-radius: 12px; background: #f2f3f5; color: #4b5158; font-size: 12px; }
.ke-chip[hidden] { display: none; }
.ke-chip.ke-is-busy { background: var(--ke-primary-weak); color: var(--ke-primary); }

/* ---------------- Source mode ---------------- */
.ke-source { display: flex; flex-direction: column; flex: 1; min-height: 0; background: #1b1f27; }
.ke-source[hidden] { display: none; }
.ke-source-bar { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #232833; color: #aeb6c2; font-size: 12px; }
.ke-source-title { font-weight: 600; color: #dfe4ea; }
.ke-source-bar .ke-btn { color: #aeb6c2; }
.ke-source-bar .ke-btn:hover { background: rgba(255,255,255,.08); color: #fff; }
.ke-source-tail { margin-left: auto; display: flex; gap: 8px; align-items: center; }
.ke-source-code {
  flex: 1; min-height: 240px; margin: 0; padding: 16px 18px; overflow: auto;
  color: #e6edf3; background: #1b1f27; font-size: 12.5px; line-height: 1.7; tab-size: 2;
  font-family: 'SFMono-Regular', Consolas, Menlo, Monaco, monospace; white-space: pre-wrap;
  word-break: break-all; outline: none; caret-color: #4ade80;
}
.ke-source-code[data-k-tag] { }
.ke-source-tip { color: #7d8794; }
.ke-source-actions button { height: 28px; padding: 0 12px; border-radius: 6px; border: 1px solid #39424f; background: transparent; color: #cfd6de; font-size: 12px; cursor: pointer; }
.ke-source-actions button:hover { border-color: var(--ke-primary); color: #fff; }
.ke-source-actions .ke-apply { background: var(--ke-primary); border-color: var(--ke-primary); color: #fff; }

/* ---------------- Bubble (图片/视频工具条) ---------------- */
.ke-bubble {
  position: absolute; z-index: 30; display: flex; align-items: center; gap: 2px; padding: 4px;
  background: rgba(28, 32, 38, .94); border-radius: 8px; box-shadow: 0 6px 20px rgba(0,0,0,.22);
  color: #fff; transform: translate(-50%, -100%); white-space: nowrap;
}
.ke-bubble.ke-is-below { transform: translate(-50%, 0); }
.ke-bubble[hidden] { display: none; }
.ke-bubble button { height: 28px; min-width: 28px; padding: 0 8px; border: 0; border-radius: 6px; background: transparent; color: #e6e8eb; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; gap: 4px; }
.ke-bubble button:hover { background: rgba(255,255,255,.14); }
.ke-bubble button.ke-is-active { background: var(--ke-primary); color: #fff; }
.ke-bubble .ke-sep { width: 1px; height: 16px; background: rgba(255,255,255,.18); margin: 0 3px; }

/* ---------------- 图片缩放把手（鼠标拖动调大小） ---------------- */
.ke-img-resize {
  position: absolute; z-index: 31; width: 18px; height: 18px; border-radius: 5px;
  background: #fff; border: 2px solid var(--ke-primary); color: var(--ke-primary);
  cursor: nwse-resize; box-shadow: 0 1px 5px rgba(0,0,0,.25);
  display: flex; align-items: center; justify-content: center;
  touch-action: none; transition: transform .12s ease, background .12s ease, color .12s ease;
}
.ke-img-resize svg { width: 10px; height: 10px; display: block; }
.ke-img-resize:hover { transform: scale(1.12); background: var(--ke-primary); color: #fff; }
.ke-img-resize[hidden] { display: none; }
.ke-img-resize-tip {
  position: absolute; z-index: 32; transform: translate(-50%, -100%);
  background: rgba(28,32,38,.9); color: #fff; font-size: 12px; line-height: 1;
  padding: 5px 8px; border-radius: 6px; pointer-events: none; white-space: nowrap;
}
.ke-img-resize-tip[hidden] { display: none; }

/* ---------------- Drop zone / Toast / Lightbox ---------------- */
.ke-dropzone {
  position: absolute; inset: 0; z-index: 20; display: none; align-items: center; justify-content: center;
  background: rgba(7, 193, 96, .08); backdrop-filter: blur(1px); border: 2px dashed var(--ke-primary);
  border-radius: var(--ke-radius); color: var(--ke-primary); font-size: 15px; font-weight: 600; pointer-events: none;
}
.ke-is-dragover .ke-dropzone { display: flex; }
.ke-toasts { position: fixed; top: 24px; left: 50%; transform: translateX(-50%); z-index: 10000; display: flex; flex-direction: column; gap: 8px; align-items: center; }
.ke-toast {
  padding: 8px 16px; border-radius: 8px; background: rgba(28,32,38,.92); color: #fff; font-size: 13px;
  box-shadow: 0 6px 20px rgba(0,0,0,.18); animation: ke-in .18s ease;
}
.ke-toast.ke-is-error { background: rgba(229, 62, 62, .95); }
.ke-toast.ke-is-warn { background: rgba(237, 137, 27, .95); }
@keyframes ke-in { from { opacity: 0; transform: translateY(-6px); } }
.ke-lightbox {
  position: fixed; inset: 0; z-index: 10001; background: rgba(0,0,0,.86); display: flex;
  align-items: center; justify-content: center; cursor: zoom-out; animation: ke-in .18s ease;
}
.ke-lightbox img { max-width: 92vw; max-height: 92vh; border-radius: 4px; }
.ke-lightbox-close { position: absolute; top: 18px; right: 22px; color: #fff; background: transparent; border: 0; cursor: pointer; }

/* ---------------- Preview overlay ---------------- */
.ke-preview { position: absolute; inset: 0; z-index: 25; background: #f2f3f5; display: flex; flex-direction: column; }
.ke-preview[hidden] { display: none; }
.ke-preview-bar { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #fff; border-bottom: 1px solid var(--ke-line); font-size: 12px; color: var(--ke-muted); }
.ke-preview-body { flex: 1; overflow: auto; padding: 20px; }
.ke-preview-frame { margin: 0 auto; background: #fff; border-radius: 10px; box-shadow: var(--ke-shadow); padding: 22px 20px; transition: width .2s ease; }
.ke-preview-frame .ke-content { font-size: 17px; line-height: 1.75; color: var(--ke-text); }
.ke-preview-frame { min-height: 120px; }

/* ---------------- ReadOnly / disabled ---------------- */
.ke-is-readonly .ke-tb .ke-btn, .ke-is-readonly .ke-tb .ke-select { pointer-events: none; opacity: .45; }
.ke-is-readonly .ke-content { cursor: default; }
/* 源码模式下正文类按钮置灰，仅保留源码/预览/全屏 */
.ke-is-source .ke-tb .ke-btn:not([data-k-item="source"]):not([data-k-item="preview"]):not([data-k-item="fullscreen"]),
.ke-is-source .ke-tb .ke-btn-label { pointer-events: none; opacity: .35; }
.ke-is-source .ke-tb .ke-tb-sep { opacity: .4; }
.ke-btn[data-k-item="source"].ke-is-active { background: var(--ke-primary); color: #fff; }
.ke-btn[data-k-item="source"].ke-is-active:hover { background: #06b35a; }

/* ---------------- Mobile ---------------- */
@media (max-width: 640px) {
  .ke-tb { padding: 4px 6px; gap: 0; }
  .ke-btn, .ke-select { height: 28px; min-width: 28px; }
  .ke-tb-sep { margin: 0 2px; }
  .ke-scroll { padding: 12px 8px 18px; }
  .ke-paper { padding: 16px 14px; border-radius: 6px; }
  .ke-content { font-size: 16px; }
  .ke-status { padding: 5px 8px; gap: 6px; }
  .ke-status-hint { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .ke * { animation-duration: .01ms !important; transition-duration: .01ms !important; }
}
`;
  let injected = false;
  function injectStyle() {
    if (injected || typeof document === "undefined") return;
    const style = document.createElement("style");
    style.setAttribute("data-keditor-style", "");
    style.textContent = CSS$1;
    document.head.appendChild(style);
    injected = true;
  }
  const uid = (prefix = "k") => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  function debounce(fn, wait = 300) {
    let timer = null;
    const wrapped = (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
    wrapped.cancel = () => clearTimeout(timer);
    wrapped.flush = (...args) => {
      clearTimeout(timer);
      fn(...args);
    };
    return wrapped;
  }
  const clamp$1 = (num, min, max) => Math.min(Math.max(num, min), max);
  function formatSize(bytes) {
    if (!bytes && bytes !== 0) return "-";
    const units = ["B", "KB", "MB", "GB"];
    let i = 0;
    let value = bytes;
    while (value >= 1024 && i < units.length - 1) {
      value /= 1024;
      i += 1;
    }
    return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)}${units[i]}`;
  }
  function h(spec, attrs = {}, children = []) {
    let tag = "div";
    let className = "";
    const parts = String(spec).split(".");
    tag = parts[0] || "div";
    className = parts.slice(1).join(" ");
    const node = document.createElement(tag);
    if (className) node.className = className;
    for (const [key, val] of Object.entries(attrs || {})) {
      if (val === void 0 || val === null || val === false) continue;
      if (key === "class") node.className = `${node.className} ${val}`.trim();
      else if (key === "style" && typeof val === "object") Object.assign(node.style, val);
      else if (key === "html") node.innerHTML = val;
      else if (key === "text") node.textContent = val;
      else if (key === "dataset") Object.assign(node.dataset, val);
      else if (key.startsWith("on") && typeof val === "function") node.addEventListener(key.slice(2).toLowerCase(), val);
      else node.setAttribute(key, val === true ? "" : String(val));
    }
    const list = Array.isArray(children) ? children : [children];
    for (const child of list) {
      if (child === null || child === void 0 || child === false) continue;
      node.appendChild(typeof child === "string" || typeof child === "number" ? document.createTextNode(String(child)) : child);
    }
    return node;
  }
  function getMediaAlign(img) {
    if (!img) return "left";
    const ml = img.style.marginLeft;
    const mr = img.style.marginRight;
    if (ml === "auto" && mr === "auto") return "center";
    if (ml === "auto") return "right";
    return "left";
  }
  function setMediaAlign(img, align) {
    if (!img) return;
    img.style.maxWidth = "100%";
    if (align === "center") {
      img.style.marginLeft = "auto";
      img.style.marginRight = "auto";
    } else if (align === "right") {
      img.style.marginLeft = "auto";
      img.style.marginRight = "0";
    } else {
      img.style.marginLeft = "0";
      img.style.marginRight = "auto";
    }
  }
  const S = (d) => `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
  const icons = {
    undo: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a5 5 0 0 1 0 10h-3"/></svg>`,
    redo: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m15 14 5-5-5-5"/><path d="M20 9H10a5 5 0 0 0 0 10h3"/></svg>`,
    bold: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 5h6.5a3.5 3.5 0 0 1 0 7H7zM7 12h7.5a3.5 3.5 0 0 1 0 7H7z"/></svg>`,
    italic: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M15 5h-5M14 19H9M14.5 5 10 19"/></svg>`,
    underline: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M7 4v8a5 5 0 0 0 10 0V4M5 20h14"/></svg>`,
    strike: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 12h16M16.5 7A4.5 4.5 0 0 0 12 5c-2.2 0-3.6 1-4.2 2.4M7.5 17A4.5 4.5 0 0 0 12 19c2.3 0 3.9-1.1 4.4-2.8"/></svg>`,
    foreColor: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17 9.5 5 14 17M6.8 13h5.9"/><rect x="4" y="19.5" width="11" height="2.2" rx="1" fill="currentColor" stroke="none"/></svg>`,
    backColor: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 20 4 16l7.5-7.5a2 2 0 0 1 2.8 0l3.2 3.2a2 2 0 0 1 0 2.8L13 20z" /><path d="M10 8.5 15.5 14"/></svg>`,
    alignLeft: S("M4 6h16M4 12h10M4 18h13"),
    alignCenter: S("M4 6h16M7 12h10M5.5 18h13"),
    alignRight: S("M4 6h16M10 12h10M7 18h13"),
    alignJustify: S("M4 6h16M4 12h16M4 18h16"),
    ul: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4.5" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1.2" fill="currentColor" stroke="none"/></svg>`,
    ol: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11"/><text x="1.6" y="8.2" font-size="7" font-family="inherit" fill="currentColor" stroke="none">1</text><text x="1.6" y="14.4" font-size="7" font-family="inherit" fill="currentColor" stroke="none">2</text><text x="1.6" y="20.6" font-size="7" font-family="inherit" fill="currentColor" stroke="none">3</text></svg>`,
    quote: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 5v14"/><path d="M10 8h9M10 12h9M10 16h5"/></svg>`,
    link: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
    unlink: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M9 14 4.5 18.5M14.5 5.5 19 10"/><path d="M10.5 13.5a4 4 0 0 0 5.6 0l2.4-2.4a4 4 0 0 0-5.6-5.6"/><path d="M13.5 10.5a4 4 0 0 0-5.6 0l-2.4 2.4a4 4 0 0 0 5.6 5.6"/><path d="m3 3 18 18"/></svg>`,
    image: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="15" rx="2.5"/><circle cx="8.5" cy="10" r="1.6"/><path d="m4 18 5-5 3.5 3.5L17 12l3 3"/></svg>`,
    video: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m10.5 9 4.5 3-4.5 3z"/></svg>`,
    table: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M3 15h18M9 5v14M15 5v14"/></svg>`,
    code: S("m9 7-5 5 5 5M15 7l5 5-5 5"),
    hr: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 12h16" stroke-width="2.4"/><path d="M6 7h12M6 17h12" opacity=".45"/></svg>`,
    clear: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 20 4 16l8-8 4 4-8 8z" /><path d="M12 8 16 4l4 4-4 4M6 20h12"/></svg>`,
    source: S("m8 7-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16"),
    preview: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>`,
    trash: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/></svg>`,
    close: S("m6 6 12 12M18 6 6 18"),
    copy: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 5H6a2 2 0 0 0-2 2v9"/></svg>`,
    format: S("M4 6h10M4 12h16M4 18h7M18 4v6m0 0 2.5-2.5M18 10l-2.5-2.5"),
    check: S("m5 13 4 4L19 7"),
    checkLight: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg>`,
    plus: S("M12 5v14M5 12h14"),
    minus: S("M5 12h14"),
    upload: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4m0 0-4 4m4-4 4 4"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>`,
    retry: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-3-6.2"/><path d="M20 4v5h-5"/></svg>`,
    rounded: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="6"/></svg>`,
    expand: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>`,
    compress: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>`
  };
  function icon(name) {
    return icons[name] || "";
  }
  const THEME_COLORS = [
    ["#07c160", "微信绿"],
    ["#2f6fed", "科技蓝"],
    ["#7c3aed", "极光紫"],
    ["#d53880", "品红"],
    ["#e53e3e", "中国红"],
    ["#ed8936", "暮橙"],
    ["#f6c344", "明黄"],
    ["#0f766e", "松石绿"]
  ];
  const STANDARD_COLORS = [
    ["#1f2329", "墨黑"],
    ["#6b7280", "深灰"],
    ["#b8bec7", "浅灰"],
    ["#f2f3f5", "云灰"],
    ["#ffffff", "纯白"],
    ["#c00000", "深红"],
    ["#ff0000", "正红"],
    ["#ffc000", "琥珀"],
    ["#ffff00", "柠黄"],
    ["#00b050", "草绿"],
    ["#00b0f0", "天蓝"],
    ["#0070c0", "海蓝"],
    ["#7030a0", "葡萄紫"],
    ["#ff69b4", "桃花粉"]
  ];
  const BG_COLORS = [
    ["#fef08a", "柠檬底"],
    ["#dcfce7", "薄荷底"],
    ["#e0f2fe", "天空底"],
    ["#ede9fe", "薰衣底"],
    ["#ffe4e6", "樱花底"],
    ["#fff4e6", "奶茶底"],
    ["#f2f3f5", "纸张灰"],
    ["#1f2329", "夜墨"]
  ];
  const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
  class Popover {
    constructor(root) {
      this.root = root;
      this.el = h("div.ke-pop", { hidden: true });
      this.anchor = null;
      this.onClose = null;
      root.appendChild(this.el);
      this.el.addEventListener("mousedown", (event) => {
        if (!/^(input|textarea|select)$/i.test(event.target.tagName)) event.preventDefault();
      });
      this.docHandler = (event) => {
        var _a, _b;
        if (this.el.hidden) return;
        if (this.el.contains(event.target)) return;
        if ((_b = (_a = event.target).closest) == null ? void 0 : _b.call(_a, ".ke-btn[data-k-pop]")) return;
        this.close();
      };
      document.addEventListener("mousedown", this.docHandler, true);
      this.keyHandler = (event) => {
        if (event.key === "Escape") this.close();
      };
      document.addEventListener("keydown", this.keyHandler);
    }
    open(anchor, build, { align = "start", onClose } = {}) {
      var _a;
      this.el.textContent = "";
      const content = build((node) => this.el.appendChild(node));
      if (content) this.el.appendChild(content);
      this.el.hidden = false;
      this.anchor = anchor;
      this.onClose = onClose;
      const rootBox = this.root.getBoundingClientRect();
      const box = anchor.getBoundingClientRect();
      const popBox = this.el.getBoundingClientRect();
      let left = box.left - rootBox.left;
      if (align === "center") left = box.left - rootBox.left + box.width / 2 - popBox.width / 2;
      if (align === "end") left = box.right - rootBox.left - popBox.width;
      left = Math.max(8, Math.min(left, rootBox.width - popBox.width - 8));
      let top = box.top - rootBox.top + box.height + 8;
      if (top + popBox.height > rootBox.height - 8 && box.top - rootBox.top - popBox.height - 8 > 0) {
        top = box.top - rootBox.top - popBox.height - 8;
      }
      this.el.style.left = `${left}px`;
      this.el.style.top = `${top}px`;
      this.el.classList.remove("ke-pop-in");
      void this.el.offsetWidth;
      this.el.classList.add("ke-pop-in");
      const first2 = [...this.el.querySelectorAll("[data-k-autofocus]")].find((node) => node.offsetParent !== null);
      (_a = first2 == null ? void 0 : first2.focus) == null ? void 0 : _a.call(first2);
    }
    close() {
      if (this.el.hidden) return;
      this.el.hidden = true;
      this.el.classList.remove("ke-pop-in");
      this.el.textContent = "";
      this.anchor = null;
      const cb = this.onClose;
      this.onClose = null;
      cb == null ? void 0 : cb();
    }
    get isOpen() {
      return !this.el.hidden;
    }
    destroy() {
      document.removeEventListener("mousedown", this.docHandler, true);
      document.removeEventListener("keydown", this.keyHandler);
      this.el.remove();
    }
  }
  function panel(title, right) {
    const head = h("div.ke-panel-head", {}, [h("span.ke-panel-title", { text: title })]);
    if (right) head.appendChild(right);
    const wrap = h("div.ke-panel", {}, [head]);
    return wrap;
  }
  function section(label) {
    return h("div.ke-panel-sect", { text: label });
  }
  function divider() {
    return h("div.ke-panel-divider");
  }
  function colorPanel({ title, kind, colors, value, recents = [], onPick, onClear }) {
    const isBg = kind === "bg";
    const reset = h("button.ke-panel-reset", {
      type: "button",
      title: isBg ? "清除高亮" : "恢复默认文字色",
      text: isBg ? "清除高亮" : "恢复默认",
      onclick: () => onClear ? onClear() : onPick(null)
    });
    const wrap = panel(title, reset);
    if (recents.length) {
      wrap.appendChild(section("最近使用"));
      wrap.appendChild(swatches(recents.slice(0, 8), value, onPick));
    }
    if (!isBg) {
      wrap.appendChild(section("主题颜色"));
      wrap.appendChild(swatches(THEME_COLORS, value, onPick));
      wrap.appendChild(section("标准颜色"));
      wrap.appendChild(swatches(STANDARD_COLORS, value, onPick));
    } else {
      wrap.appendChild(section("推荐底色"));
      wrap.appendChild(swatches(BG_COLORS.map(([c, n]) => [c, n]), value, onPick));
      wrap.appendChild(section("主题颜色"));
      wrap.appendChild(swatches(THEME_COLORS, value, onPick));
    }
    wrap.appendChild(divider());
    wrap.appendChild(customRow(value, onPick));
    return wrap;
  }
  function swatches(list, value, onPick) {
    const grid = h("div.ke-sw-grid");
    list.forEach(([color, name]) => {
      const btn2 = h("button.ke-sw", {
        type: "button",
        title: `${name} ${color}`,
        "aria-label": name,
        style: { background: color }
      });
      if (value && HEX.test(value) && color.toLowerCase() === String(value).toLowerCase()) {
        btn2.classList.add("ke-is-active");
        btn2.appendChild(h("span.ke-sw-check", { html: icon("checkLight") }));
      }
      btn2.addEventListener("click", () => onPick(color));
      grid.appendChild(btn2);
    });
    return grid;
  }
  function customRow(value, onPick) {
    const hex = HEX.test(value || "") ? value : "#07c160";
    const picker = h("input.ke-sw-picker", { type: "color", value: hex, title: "自定义颜色" });
    const input = h("input.ke-input.ke-sw-hex", { type: "text", value: hex, placeholder: "#000000", maxlength: 7 });
    const apply = h("button.ke-btn-primary", { type: "button", text: "应用" });
    const commit = () => {
      const raw = input.value.trim();
      const next = raw.startsWith("#") ? raw : `#${raw}`;
      if (!HEX.test(next)) {
        input.classList.add("ke-is-invalid");
        return;
      }
      input.classList.remove("ke-is-invalid");
      onPick(next);
    };
    picker.addEventListener("input", () => {
      input.value = picker.value;
    });
    picker.addEventListener("change", commit);
    apply.addEventListener("click", commit);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        commit();
      }
    });
    return h("div.ke-panel-foot", {}, [
      picker,
      input,
      apply
    ]);
  }
  function headingPanel(items, { value, onPick }) {
    const wrap = panel("段落样式");
    wrap.classList.add("ke-panel-wide");
    items.forEach((item) => {
      const row = h("button.ke-hd-row", {
        type: "button",
        dataset: { kValue: item.value },
        onclick: () => onPick(item.value)
      }, [
        h("span.ke-hd-sample", { class: item.sampleClass || "", text: item.sample || item.label }),
        h("span.ke-hd-meta", {}, [
          h("span.ke-hd-label", { text: item.label }),
          h("span.ke-hd-desc", { text: item.desc })
        ])
      ]);
      if (item.value === value) row.classList.add("ke-is-active");
      wrap.appendChild(row);
    });
    return wrap;
  }
  function fontSizePanel(sizes, { value, onPick }) {
    const wrap = panel("字号", h("span.ke-panel-note", { text: value ? `${value}px` : "默认 17px" }));
    wrap.classList.add("ke-panel-wide");
    const grid = h("div.ke-size-grid");
    sizes.forEach((size) => {
      const btn2 = h("button.ke-size-cell", { type: "button", text: String(size), onclick: () => onPick(size) });
      btn2.style.fontSize = `${Math.min(20, 10 + size / 6)}px`;
      if (Number(value) === size) btn2.classList.add("ke-is-active");
      grid.appendChild(btn2);
    });
    wrap.appendChild(grid);
    wrap.appendChild(divider());
    wrap.appendChild(h("div.ke-panel-hint", { text: "仅作用于选中的文字；未选中时对新输入的文字生效" }));
    return wrap;
  }
  ({ text: THEME_COLORS.map((x) => x[0]), bg: BG_COLORS.map((x) => x[0]) });
  function tablePanel(onPick, { cols = 10, rows = 8 } = {}) {
    const wrap = panel("插入表格", h("span.ke-panel-note", { text: "最大 10×8" }));
    const grid = h("div.ke-table-grid", { style: { gridTemplateColumns: `repeat(${cols}, 18px)` } });
    const cells = [];
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const cell = h("span.ke-table-cell");
        cell.dataset.r = String(r);
        cell.dataset.c = String(c);
        cells.push(cell);
        grid.appendChild(cell);
      }
    }
    wrap.appendChild(grid);
    const sizeText = h("div.ke-panel-hint", { text: "1 列 × 1 行" });
    wrap.appendChild(sizeText);
    const mark = (maxR, maxC) => {
      cells.forEach((cell) => {
        const on = Number(cell.dataset.r) <= maxR && Number(cell.dataset.c) <= maxC;
        cell.classList.toggle("ke-is-on", on);
      });
      sizeText.textContent = `${maxC + 1} 列 × ${maxR + 1} 行`;
    };
    grid.addEventListener("mousemove", (event) => {
      const cell = event.target.closest(".ke-table-cell");
      if (cell) mark(Number(cell.dataset.r), Number(cell.dataset.c));
    });
    grid.addEventListener("click", (event) => {
      const cell = event.target.closest(".ke-table-cell");
      if (cell) onPick(Number(cell.dataset.c) + 1, Number(cell.dataset.r) + 1);
    });
    grid.addEventListener("mouseenter", () => mark(0, 0));
    mark(0, 0);
    return wrap;
  }
  function mediaPanel(kind, { onFiles, onUrl, multiple, hint, maxText }) {
    const isImage = kind === "image";
    const wrap = panel(isImage ? "插入图片" : "插入视频");
    wrap.classList.add("ke-panel-wide", "ke-panel-media");
    const local = h("div.ke-tab-body");
    const net = h("div.ke-tab-body", { hidden: true });
    const drop = h("div.ke-drop", {}, [
      h("span.ke-drop-ico", { html: icon("upload") }),
      h("div.ke-drop-title", { text: isImage ? "点击选择图片，或拖拽到此处" : "点击选择视频，或拖拽到此处" }),
      h("div.ke-drop-sub", { text: [maxText, hint].filter(Boolean).join(" · ") })
    ]);
    const pickBtn = h("button.ke-btn-primary", {
      type: "button",
      text: isImage ? "选择图片" : "选择视频",
      onclick: () => onFiles(null)
    });
    drop.addEventListener("click", () => onFiles(null));
    drop.addEventListener("dragover", (event) => {
      event.preventDefault();
      drop.classList.add("ke-is-over");
    });
    drop.addEventListener("dragleave", () => drop.classList.remove("ke-is-over"));
    drop.addEventListener("drop", (event) => {
      var _a, _b;
      event.preventDefault();
      drop.classList.remove("ke-is-over");
      if ((_b = (_a = event.dataTransfer) == null ? void 0 : _a.files) == null ? void 0 : _b.length) onFiles(event.dataTransfer.files);
    });
    local.append(drop, h("div.ke-panel-foot", {}, [pickBtn, h("span.ke-panel-hint", { text: multiple ? "可一次插入多张" : "单文件大文件将自动分片上传" })]));
    const urlInput = h("input.ke-input", {
      type: "url",
      placeholder: isImage ? "https://example.com/photo.jpg" : "https://example.com/video.mp4",
      "data-k-autofocus": ""
    });
    const nameInput = h("input.ke-input", { type: "text", placeholder: isImage ? "图片描述（可选，作为 alt）" : "视频标题（可选）" });
    const status = h("div.ke-link-status", { text: "粘贴链接后自动校验可访问性" });
    const insertBtn = h("button.ke-btn-primary", { type: "button", text: "插入", disabled: true });
    let timer = null;
    let token = 0;
    const check = () => {
      token += 1;
      const mine = token;
      clearTimeout(timer);
      const url = normalizeUrl(urlInput.value);
      insertBtn.disabled = !url;
      status.className = "ke-link-status";
      if (!url) {
        status.textContent = "请输入 http(s) 开头的链接";
        return;
      }
      status.className = "ke-link-status ke-is-checking";
      status.textContent = "正在校验…";
      timer = setTimeout(() => probe(kind, url, (ok) => {
        if (mine !== token) return;
        if (ok) {
          status.className = "ke-link-status ke-is-ok";
          status.textContent = isImage ? "图片可访问 ✓" : "视频可播放 ✓";
        } else {
          status.className = "ke-link-status ke-is-bad";
          status.textContent = "未能自动加载（可能限制热链），不阻塞插入，发布前请自行确认";
        }
      }), 350);
    };
    urlInput.addEventListener("input", check);
    urlInput.addEventListener("paste", () => setTimeout(check, 0));
    const submit = () => {
      const url = normalizeUrl(urlInput.value);
      if (!url) {
        urlInput.classList.add("ke-is-invalid");
        urlInput.focus();
        return;
      }
      onUrl({ url, name: nameInput.value.trim() });
    };
    insertBtn.addEventListener("click", submit);
    net.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        submit();
      }
    });
    net.append(
      h("div.ke-field", {}, [h("span.ke-field-label", { text: "地址" }), urlInput]),
      h("div.ke-field", {}, [h("span.ke-field-label", { text: isImage ? "描述" : "标题" }), nameInput]),
      status,
      h("div.ke-panel-foot", {}, [insertBtn, h("span.ke-panel-hint", { text: "外链由源站提供，不占用上传配额" })])
    );
    const tabs = h("div.ke-tabs", {}, [
      h("button.ke-tab", { type: "button", text: "本地上传" }),
      h("button.ke-tab", { type: "button", text: "网络链接" })
    ]);
    const show = (index) => {
      [...tabs.children].forEach((tab, i) => tab.classList.toggle("ke-is-active", i === index));
      local.hidden = index !== 0;
      net.hidden = index !== 1;
      if (index === 1) urlInput.focus();
    };
    tabs.children[0].addEventListener("click", () => show(0));
    tabs.children[1].addEventListener("click", () => show(1));
    show(0);
    wrap.append(tabs, local, net);
    return wrap;
  }
  function probe(kind, url, done) {
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      done(ok);
    };
    try {
      if (kind === "image") {
        const img = new Image();
        img.onload = () => finish(true);
        img.onerror = () => finish(false);
        img.referrerPolicy = "no-referrer";
        img.src = url;
      } else {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.muted = true;
        video.onloadedmetadata = () => finish(video.videoHeight > 0 || video.duration > 0 || Number.isFinite(video.duration));
        video.onerror = () => finish(false);
        video.src = url;
      }
    } catch {
      finish(false);
    }
  }
  function linkPanel({ url = "", text = "", target = false, onSubmit, onCancel, onRemove }) {
    const urlInput = h("input.ke-input", { type: "url", placeholder: "https://mp.weixin.qq.com/...", value: url, "data-k-autofocus": "" });
    const textInput = h("input.ke-input", { type: "text", placeholder: "链接文字（留空使用 URL）", value: text });
    const check = h("input", { type: "checkbox" });
    check.checked = !!target;
    const wrap = panel(url ? "编辑链接" : "插入链接");
    wrap.classList.add("ke-panel-wide");
    const body = h("div", {}, [
      h("div.ke-field", {}, [h("span.ke-field-label", { text: "文字" }), textInput]),
      h("div.ke-field", {}, [h("span.ke-field-label", { text: "地址" }), urlInput]),
      h("label.ke-check", {}, [check, "新窗口打开"]),
      h("div.ke-panel-foot", {}, [
        onRemove ? h("button.ke-btn-ghost", { type: "button", text: "移除链接", style: { marginRight: "auto", color: "#e53e3e" }, onclick: onRemove }) : null,
        h("button.ke-btn-ghost", { type: "button", text: "取消", onclick: onCancel }),
        h("button.ke-btn-primary", { type: "button", text: "确定", onclick: () => submit() })
      ])
    ]);
    const submit = () => {
      const href = normalizeUrl(urlInput.value);
      if (!href) {
        urlInput.classList.add("ke-is-invalid");
        urlInput.focus();
        return;
      }
      onSubmit({ url: href, text: textInput.value.trim(), target: check.checked });
    };
    body.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        submit();
      }
    });
    wrap.appendChild(body);
    return wrap;
  }
  function hostOf(url) {
    try {
      return new URL(url, window.location.href).host;
    } catch {
      return String(url).slice(0, 40);
    }
  }
  function selectPanel({ title, note, searchable, width, remote, value, load, reload, linkOf, onPick, emptyText }) {
    const wrap = panel(title);
    wrap.classList.add("ke-panel-wide", "ke-panel-select");
    if (width) wrap.style.width = `${Math.min(420, Math.max(200, Number(width)))}px`;
    const head = wrap.querySelector(".ke-panel-head");
    const countEl = h("span.ke-panel-note", { text: note || "" });
    if (remote) {
      head.appendChild(h("button.ke-panel-icon", {
        type: "button",
        title: "重新加载数据",
        html: icon("retry"),
        onclick: () => run(reload || load, true)
      }));
    }
    head.appendChild(countEl);
    const body = h("div.ke-sel-body");
    wrap.appendChild(body);
    let items = [];
    let keyword = "";
    let generation = 0;
    if (searchable) {
      const search = h("input.ke-input.ke-sel-search", {
        type: "search",
        placeholder: "搜索…",
        "data-k-autofocus": ""
      });
      search.addEventListener("input", () => {
        keyword = search.value.trim().toLowerCase();
        renderRows();
      });
      wrap.insertBefore(search, body);
    }
    function setState(kind, message) {
      body.textContent = "";
      body.dataset.state = kind;
      if (kind === "loading") {
        for (let i = 0; i < 3; i += 1) body.appendChild(h("div.ke-sel-skel"));
        body.insertBefore(h("div.ke-sel-loading", {}, [h("span.ke-spinner"), "数据加载中…"]), body.firstChild);
      } else if (kind === "error") {
        body.appendChild(
          h("div.ke-sel-tip", {}, [
            h("span.ke-sel-tip-text", { text: message || "数据加载失败" }),
            h("button.ke-btn-primary", { type: "button", text: "重试", onclick: () => run(reload || load, true) })
          ])
        );
      } else {
        body.appendChild(h("div.ke-sel-tip", {}, [h("span.ke-sel-tip-text", { text: message || emptyText || "暂无数据" })]));
      }
    }
    function renderRows() {
      const list = keyword ? items.filter((item) => `${item.label} ${item.desc} ${item.value} ${item.group}`.toLowerCase().includes(keyword)) : items;
      countEl.textContent = note || (keyword ? `${list.length} / ${items.length} 项` : `${items.length} 项`);
      body.textContent = "";
      delete body.dataset.state;
      if (!list.length) {
        setState("empty", keyword ? `没有匹配「${keyword}」的选项` : emptyText || "暂无数据");
        return;
      }
      let group = null;
      list.forEach((item) => {
        if (item.group && item.group !== group) {
          group = item.group;
          body.appendChild(h("div.ke-panel-sect", { text: group }));
        }
        body.appendChild(row(item));
      });
    }
    function row(item) {
      const link = linkOf ? linkOf(item) : null;
      const el = h("button.ke-sel-row", {
        type: "button",
        disabled: item.disabled || void 0,
        dataset: { kValue: item.value },
        title: item.disabled ? "该项不可用" : link && link.mode === "open" ? `打开 ${link.url}` : link ? `插入链接：${link.url}` : item.title || "",
        onclick: () => {
          if (item.disabled) return;
          onPick(item);
        }
      });
      el.appendChild(h("span.ke-sel-main", {}, [
        h("span.ke-sel-label", { text: item.label }),
        item.desc ? h("span.ke-sel-desc", { text: item.desc }) : null,
        link ? h("span.ke-sel-link", { html: `${icon("link")}<i>${hostOf(link.url)}</i>` }) : null
      ]));
      if (value && String(value) === String(item.value)) {
        el.classList.add("ke-is-active");
        el.appendChild(h("span.ke-sel-check", { html: icon("check") }));
      }
      if (link) el.classList.add("ke-has-link");
      return el;
    }
    function run(task, force) {
      generation += 1;
      const mine = generation;
      setState("loading");
      Promise.resolve().then(() => task({ force })).then((result) => {
        if (mine !== generation || !wrap.isConnected) return;
        items = Array.isArray(result) ? result : [];
        if (!items.length) setState("empty");
        else renderRows();
      }).catch((error) => {
        if (mine !== generation || !wrap.isConnected) return;
        setState("error", error && error.message ? error.message : "数据加载失败");
      });
    }
    run(load);
    return wrap;
  }
  function normalizeUrl(url) {
    const value = String(url || "").trim();
    if (!value) return "";
    if (/^(https?:|mailto:|tel:|#|\/)/i.test(value)) return value;
    if (/^[\w-]+(\.[\w-]+)+/.test(value)) return `https://${value}`;
    return "";
  }
  const BLOCK_TAGS = /* @__PURE__ */ new Set(["p", "div", "section", "blockquote", "ul", "ol", "li", "table", "thead", "tbody", "tfoot", "tr", "td", "th", "figure", "figcaption", "pre", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "video"]);
  function formatHtml(html, { indent = "  " } = {}) {
    if (!html) return "";
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
    const root = doc.body.firstChild;
    const lines = [];
    const push = (depth, text) => {
      const value = text.replace(/\s+/g, " ").trim();
      if (!value) return;
      const last = lines[lines.length - 1];
      if (last && last.depth === depth && last.inlineRun) last.text += ` ${value}`;
      else lines.push({ depth, text: indent.repeat(depth) + value, inlineRun: true });
    };
    const walk2 = (parent, depth) => {
      const nodes = [...parent.childNodes];
      nodes.forEach((child) => {
        if (child.nodeType === 3) {
          const text = child.textContent.trim();
          if (text) push(depth, text);
          return;
        }
        if (child.nodeType !== 1) return;
        const tag = child.tagName.toLowerCase();
        if (!BLOCK_TAGS.has(tag)) {
          push(depth, child.outerHTML);
          return;
        }
        const hasBlockChild = [...child.querySelectorAll("*")].some((node) => BLOCK_TAGS.has(node.tagName.toLowerCase()));
        const keepOneLine = tag === "tr" || tag === "figure" || tag === "video";
        if (!hasBlockChild || keepOneLine) {
          lines.push({ depth, text: indent.repeat(depth) + collapse(child.outerHTML), inlineRun: false });
          return;
        }
        lines.push({ depth, text: indent.repeat(depth) + openTag(child), inlineRun: false });
        walk2(child, depth + 1);
        lines.push({ depth, text: indent.repeat(depth) + `</${tag}>`, inlineRun: false });
      });
    };
    walk2(root, 0);
    return lines.map((line) => line.text).join("\n").replace(/\n{3,}/g, "\n\n");
  }
  function collapse(markup) {
    return markup.replace(/\n\s+/g, " ").replace(/\s{2,}/g, " ").trim();
  }
  function openTag(element) {
    const attrs = [...element.attributes].map((attr) => `${attr.name}="${(attr.value || "").replace(/"/g, "&quot;")}"`);
    return `<${element.tagName.toLowerCase()}${attrs.length ? ` ${attrs.join(" ")}` : ""}>`;
  }
  class SourcePanel {
    constructor(editor) {
      this.editor = editor;
      this.open = false;
      this.el = h("div.ke-source", { hidden: true }, [
        h("div.ke-source-bar", {}, [
          h("span.ke-source-title", { text: "HTML 源码" }),
          h("span.ke-source-tip", { text: "可直接编辑，点击「应用」或退出源码模式即生效" }),
          h("span.ke-source-tail", {}, [
            h("button.ke-btn", { type: "button", title: "格式化", html: icon("format") + "<span>格式化</span>", onclick: () => this.format() }),
            h("button.ke-btn", { type: "button", title: "复制全部", html: icon("copy") + "<span>复制</span>", onclick: () => this.copy() }),
            h("button.ke-btn", { type: "button", title: "应用修改", html: icon("check") + "<span>应用</span>", onclick: () => this.apply() }),
            h("button.ke-btn", { type: "button", title: "退出源码模式", html: icon("close"), onclick: () => editor.exitSource() })
          ])
        ]),
        (() => {
          this.code = h("pre.ke-source-code", { contenteditable: "true", spellcheck: "false", autocapitalize: "off", autocomplete: "off", wrap: "off" });
          this.code.addEventListener("keydown", (event) => {
            if (event.key === "Tab") {
              event.preventDefault();
              document.execCommand("insertText", false, "  ");
            }
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
              event.preventDefault();
              this.apply();
            }
            event.stopPropagation();
          });
          return this.code;
        })()
      ]);
    }
    get value() {
      return this.code.textContent;
    }
    set value(text) {
      this.code.textContent = text;
      this.code.scrollTop = 0;
    }
    show(html) {
      this.value = formatHtml(html);
      this.el.hidden = false;
      this.open = true;
      this.editor.scrollEl.hidden = true;
    }
    hide() {
      this.el.hidden = true;
      this.open = false;
      this.editor.scrollEl.hidden = false;
    }
    format() {
      this.value = formatHtml(this.value);
      this.editor.toast.show("已格式化");
    }
    async copy() {
      var _a;
      const text = this.value;
      try {
        if ((_a = navigator.clipboard) == null ? void 0 : _a.writeText) await navigator.clipboard.writeText(text);
        else {
          this.code.focus();
          document.execCommand("selectAll");
          document.execCommand("copy");
        }
        this.editor.toast.show("源码已复制到剪贴板");
      } catch {
        this.editor.toast.error("复制失败，请手动选择复制");
      }
    }
    /** 应用当前源码到编辑区（做净化） */
    apply({ silent = false } = {}) {
      const html = this.value;
      try {
        this.editor.setContent(html, { sanitize: true, silent: false });
        if (!silent) this.editor.toast.show("源码已应用");
        return true;
      } catch (error) {
        this.editor.toast.error(`源码解析失败：${error.message}`);
        return false;
      }
    }
    destroy() {
      this.el.remove();
    }
  }
  const DEVICES = [
    { key: "mobile", label: "手机", width: 375 },
    { key: "pad", label: "平板", width: 540 },
    { key: "pc", label: "电脑", width: 677 }
  ];
  class PreviewOverlay {
    constructor(editor) {
      this.editor = editor;
      this.device = "pc";
      this.el = h("div.ke-preview", { hidden: true }, [
        h("div.ke-preview-bar", {}, [
          h("span", { text: "预览" }),
          h("span.ke-source-tip", { text: "仅用于查看排版效果，内容不可编辑" }),
          h("span.ke-status-tail", {}, DEVICES.map(
            (device) => h("button.ke-btn", {
              type: "button",
              "data-k-device": device.key,
              text: device.label,
              onclick: () => this.setDevice(device.key)
            })
          ).concat([h("span.ke-tb-sep"), h("button.ke-btn", { type: "button", title: "关闭预览", html: icon("close"), onclick: () => editor.closePreview() })]))
        ]),
        (() => {
          this.body = h("div.ke-preview-body", {}, [h("div.ke-preview-frame", { style: { maxWidth: "677px" } }, [h("div.ke-content.ke-preview-content")])]);
          this.frame = this.body.firstChild;
          this.content = this.frame.firstChild;
          return this.body;
        })()
      ]);
    }
    setDevice(key) {
      this.device = key;
      const device = DEVICES.find((d) => d.key === key) || DEVICES[2];
      this.frame.style.maxWidth = `${device.width}px`;
      this.frame.style.width = key === "mobile" ? `${device.width}px` : "100%";
      this.el.querySelectorAll("[data-k-device]").forEach((btn2) => btn2.classList.toggle("ke-is-active", btn2.dataset.kDevice === key));
    }
    show(html) {
      this.content.innerHTML = html;
      this.el.hidden = false;
      this.setDevice(this.device);
    }
    hide() {
      this.el.hidden = true;
      this.content.innerHTML = "";
    }
    destroy() {
      this.el.remove();
    }
  }
  class Toast {
    constructor(owner = null) {
      this.owner = owner;
      this.el = null;
    }
    show(message, type = "", duration = 2600) {
      if (typeof document === "undefined") return;
      if (!this.el) {
        this.el = h("div.ke-toasts");
        document.body.appendChild(this.el);
      }
      const item = h(`span.ke-toast${type ? `.ke-is-${type}` : ""}`, { text: message });
      this.el.appendChild(item);
      setTimeout(() => {
        item.style.opacity = "0";
        item.style.transition = "opacity .2s";
        setTimeout(() => item.remove(), 220);
      }, duration);
    }
    error(msg) {
      this.show(msg, "error", 3600);
    }
    warn(msg) {
      this.show(msg, "warn", 3e3);
    }
    ok(msg) {
      this.show(msg, "ok", 2200);
    }
    destroy() {
      if (this.el && !this.el.childElementCount) this.el.remove();
      this.el = null;
    }
  }
  function lightbox(src, ownerDocument = document) {
    const box = h("div.ke-lightbox", { tabindex: "-1" }, [h("img", { src, alt: "" })]);
    const close = () => {
      box.remove();
      document.removeEventListener("keydown", onKey);
    };
    const onKey = (event) => {
      if (event.key === "Escape") close();
    };
    box.addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    ownerDocument.body.appendChild(box);
    return close;
  }
  class MediaBubble {
    constructor(editor) {
      this.editor = editor;
      this.node = null;
      this.el = h("div.ke-bubble", { hidden: true, contenteditable: "false" });
      editor.el.appendChild(this.el);
      this.el.addEventListener("mousedown", (event) => event.preventDefault());
      this.el.addEventListener("click", (event) => this.onClick(event));
      this.replaceInput = h("input", { type: "file", style: { display: "none" } });
      this.replaceInput.addEventListener("change", () => {
        var _a;
        const file = (_a = this.replaceInput.files) == null ? void 0 : _a[0];
        this.replaceInput.value = "";
        if (file && this.node) this.editor.media.replaceNode(this.node, file);
      });
      editor.el.appendChild(this.replaceInput);
      this.resizeEl = h("div.ke-img-resize", {
        hidden: true,
        "aria-label": "拖动缩放图片",
        title: "拖动缩放图片",
        html: '<svg viewBox="0 0 10 10"><path d="M7 1 L9 3 M4 4 L6 6 M1 7 L3 9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
      });
      this.resizeTip = h("div.ke-img-resize-tip", { hidden: true });
      this.resizeEl.addEventListener("pointerdown", (event) => this.onResizePointerDown(event));
      editor.el.appendChild(this.resizeEl);
      editor.el.appendChild(this.resizeTip);
    }
    show(node) {
      this.node = node;
      const kind = node.dataset.kMedia === "video" ? "video" : "image";
      this.el.textContent = "";
      const actions = kind === "image" ? this.imageActions(node) : this.videoActions(node);
      for (const item of actions) {
        if (item) this.el.appendChild(item);
      }
      this.el.hidden = false;
      if (kind === "image") this.attachResize();
      this.position();
    }
    hide() {
      this.el.hidden = true;
      this.detachResize();
      this.node = null;
    }
    attachResize() {
      var _a;
      if (!((_a = this.node) == null ? void 0 : _a.querySelector("img"))) return;
      this.resizeEl.hidden = false;
      this.positionHandle();
    }
    detachResize() {
      this.resizeEl.hidden = true;
      this.resizeTip.hidden = true;
    }
    position() {
      if (!this.node) return;
      this.positionHandle();
      if (this.el.hidden) return;
      const rootBox = this.editor.el.getBoundingClientRect();
      const box = this.node.getBoundingClientRect();
      const view = this.editor.scrollEl.getBoundingClientRect();
      if (!box.height && !box.width) return this.hide();
      if (box.bottom < view.top || box.top > view.bottom) return this.hide();
      const popBox = this.el.getBoundingClientRect();
      const left = box.left - rootBox.left + box.width / 2;
      const spaceAbove = box.top - rootBox.top;
      const flip = spaceAbove < popBox.height + 18;
      const top = flip ? box.bottom - rootBox.top + 10 : box.top - rootBox.top - 10;
      this.el.classList.toggle("ke-is-below", flip);
      const halfWidth = popBox.width / 2;
      this.el.style.left = `${Math.min(Math.max(left, halfWidth + 8), Math.max(halfWidth + 8, rootBox.width - halfWidth - 8))}px`;
      this.el.style.top = `${Math.max(6, top)}px`;
    }
    positionHandle() {
      const node = this.node;
      if (!node || this.resizeEl.hidden) return;
      const img = node.querySelector("img");
      if (!img) return;
      const rootBox = this.editor.el.getBoundingClientRect();
      const box = img.getBoundingClientRect();
      if (!box.width && !box.height) return;
      const size = 18;
      const gap = 6;
      this.resizeEl.style.left = `${box.right - rootBox.left - size - gap}px`;
      this.resizeEl.style.top = `${box.bottom - rootBox.top - size - gap}px`;
    }
    updateResizeTip(pct) {
      var _a;
      if (this.resizeTip.hidden || !this.node) return;
      this.resizeTip.textContent = `${Math.round(pct)}%`;
      const rootBox = this.editor.el.getBoundingClientRect();
      const box = ((_a = this.node.querySelector("img")) == null ? void 0 : _a.getBoundingClientRect()) || this.node.getBoundingClientRect();
      this.resizeTip.style.left = `${box.left - rootBox.left + box.width / 2}px`;
      this.resizeTip.style.top = `${box.top - rootBox.top - 10}px`;
    }
    onResizePointerDown(event) {
      var _a;
      if (event.button != null && event.button !== 0) return;
      const img = (_a = this.node) == null ? void 0 : _a.querySelector("img");
      if (!img) return;
      event.preventDefault();
      event.stopPropagation();
      const figure = this.node;
      const figureWidth = figure.getBoundingClientRect().width;
      const startPct = clamp(currentWidthPercent(img, figureWidth), 15, 100);
      const startX = event.clientX;
      this.el.hidden = true;
      this.resizeTip.hidden = false;
      this.updateResizeTip(startPct);
      try {
        this.resizeEl.setPointerCapture(event.pointerId);
      } catch {
      }
      const move = (e) => {
        const dx = e.clientX - startX;
        const deltaPct = figureWidth ? dx / figureWidth * 100 : 0;
        const pct = clamp(Math.round(startPct + deltaPct), 15, 100);
        img.style.width = `${pct}%`;
        img.style.maxWidth = "100%";
        this.updateResizeTip(pct);
        this.positionHandle();
      };
      const up = () => {
        this.resizeEl.removeEventListener("pointermove", move);
        this.resizeEl.removeEventListener("pointerup", up);
        this.resizeEl.removeEventListener("pointercancel", up);
        this.resizeTip.hidden = true;
        this.editor.commitHistory();
        this.editor.refreshStatus();
        this.el.hidden = false;
        this.position();
      };
      this.resizeEl.addEventListener("pointermove", move);
      this.resizeEl.addEventListener("pointerup", up);
      this.resizeEl.addEventListener("pointercancel", up);
    }
    imageActions(node) {
      const img = node.querySelector("img");
      const align = getMediaAlign(img);
      const radius = img && parseFloat(getComputedStyle(img).borderRadius) > 0;
      const applyAlign = (a) => {
        setMediaAlign(img, a);
        this.editor.commitHistory();
        this.position();
      };
      const applySize = (w) => {
        img.style.width = w;
        setMediaAlign(img, getMediaAlign(img));
        this.editor.commitHistory();
        this.position();
      };
      return [
        btn("alignLeft", "左对齐", () => applyAlign("left"), align === "left"),
        btn("alignCenter", "居中", () => applyAlign("center"), align === "center"),
        btn("alignRight", "右对齐", () => applyAlign("right"), align === "right"),
        sep(),
        textBtn("30%", "宽度 30%", () => applySize("30%")),
        textBtn("60%", "宽度 60%", () => applySize("60%")),
        textBtn("100%", "宽度 100%", () => applySize("100%")),
        sep(),
        btn("rounded", "圆角", () => toggleRadius(img, node), radius),
        btn("preview", "查看大图", () => previewImage(img)),
        btn("upload", "替换图片", () => this.pick("image")),
        sep(),
        btn("trash", "删除", () => this.remove())
      ];
    }
    videoActions() {
      return [
        textBtn("小", "窄版", () => this.setVideoWidth("60%")),
        textBtn("大", "宽版", () => this.setVideoWidth("100%")),
        sep(),
        btn("upload", "替换视频", () => this.pick("video")),
        sep(),
        btn("trash", "删除", () => this.remove())
      ];
    }
    pick(kind) {
      this.replaceInput.accept = kind === "image" ? this.editor.options.imageAccept : this.editor.options.videoAccept;
      this.replaceInput.click();
    }
    setVideoWidth(width) {
      if (!this.node) return;
      this.node.style.width = width;
      this.editor.commitHistory();
      this.position();
    }
    remove() {
      if (!this.node) return;
      const task = this.editor.media.taskFromNode(this.node);
      if (task) this.editor.media.remove(task);
      else {
        const next = this.node.nextElementSibling;
        this.node.remove();
        if (next) this.editor.focus();
        this.editor.commitHistory();
      }
      this.hide();
      this.editor.refreshStatus();
    }
    onClick() {
    }
    destroy() {
      this.el.remove();
      this.replaceInput.remove();
      this.resizeEl.remove();
      this.resizeTip.remove();
    }
  }
  function btn(iconName, title, onclick, active = false) {
    const node = h("button", { type: "button", title, html: icon(iconName) });
    if (active) node.classList.add("ke-is-active");
    node.addEventListener("click", onclick);
    return node;
  }
  function textBtn(label, title, onclick) {
    const node = h("button", { type: "button", title, text: label });
    node.addEventListener("click", onclick);
    return node;
  }
  const sep = () => h("span.ke-sep");
  function toggleRadius(img, node) {
    if (!img) return;
    const has = parseFloat(getComputedStyle(img).borderRadius) > 0;
    img.style.borderRadius = has ? "0" : "10px";
    node.dispatchEvent(new Event("change", { bubbles: true }));
  }
  function previewImage(img) {
    if (img) lightbox(img.src);
  }
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
  function currentWidthPercent(img, figureWidth) {
    var _a, _b;
    if (!figureWidth) return 100;
    const match = (_b = (_a = img == null ? void 0 : img.style) == null ? void 0 : _a.width) == null ? void 0 : _b.match(/^([\d.]+)%$/);
    if (match) return parseFloat(match[1]);
    return img.getBoundingClientRect().width / figureWidth * 100;
  }
  const ALLOWED_TAGS = /* @__PURE__ */ new Set([
    "a",
    "abbr",
    "b",
    "blockquote",
    "br",
    "code",
    "col",
    "colgroup",
    "dd",
    "del",
    "div",
    "dl",
    "dt",
    "em",
    "figcaption",
    "figure",
    "font",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "i",
    "img",
    "ins",
    "kbd",
    "li",
    "mark",
    "ol",
    "p",
    "pre",
    "s",
    "samp",
    "section",
    "small",
    "span",
    "strong",
    "sub",
    "sup",
    "table",
    "tbody",
    "td",
    "tfoot",
    "th",
    "thead",
    "tr",
    "u",
    "ul",
    "video",
    "source"
  ]);
  const GLOBAL_ATTRS = /* @__PURE__ */ new Set(["style", "class"]);
  const TAG_ATTRS = {
    A: ["href", "title", "target", "rel"],
    IMG: ["src", "alt", "title", "width", "height"],
    VIDEO: ["src", "poster", "controls", "loop", "muted", "playsinline", "preload", "width", "height"],
    SOURCE: ["src", "type"],
    FONT: ["size", "color"],
    TD: ["colspan", "rowspan"],
    TH: ["colspan", "rowspan"],
    OL: ["start"],
    LI: ["value"]
  };
  const DATA_PREFIX = ["data-k-", "data-keditor-"];
  const SAFE_URL_RE = /^(?:https?:|mailto:|tel:|blob:|\/|#|\.{1,2}\/|[^:]*$)/i;
  const SAFE_DATA_RE = /^data:image\/(?:png|jpe?g|gif|webp|svg\+xml);/i;
  function isSafeUrl(url) {
    if (!url) return false;
    const value = String(url).trim().replace(/\s+/g, "");
    if (/^(javascript|vbscript|file|about):/i.test(value)) return false;
    if (value.startsWith("data:")) return SAFE_DATA_RE.test(value);
    return SAFE_URL_RE.test(value);
  }
  function sanitizeStyle(value) {
    const out = [];
    for (const decl of String(value).split(";")) {
      const idx = decl.indexOf(":");
      if (idx < 0) continue;
      const prop = decl.slice(0, idx).trim().toLowerCase();
      const val = decl.slice(idx + 1).trim();
      if (!prop || !val) continue;
      if (!/^[a-z-]+$/.test(prop)) continue;
      if (prop.startsWith("mso-") || prop.startsWith("-mso-")) continue;
      if (/expression|javascript:|behavior:|url\(\s*['"]?\s*(javascript|data):/i.test(val)) continue;
      out.push(`${prop}:${val}`);
    }
    return out.join(";");
  }
  function sanitizeClass(value) {
    return String(value).split(/\s+/).filter((name) => /^[\w-]+$/.test(name) && !/^(script|javascript)/i.test(name)).join(" ");
  }
  function keepAttribute(tagName, attrName, attrValue) {
    const name = attrName.toLowerCase();
    if (name.startsWith("on")) return false;
    if (GLOBAL_ATTRS.has(name)) return true;
    if (DATA_PREFIX.some((prefix) => name.startsWith(prefix))) return true;
    const list = TAG_ATTRS[tagName] || [];
    return list.includes(name);
  }
  function sanitizeHtml(html, { allowEmpty = false } = {}) {
    if (!html) return allowEmpty ? "" : "<p><br></p>";
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
    const root = doc.body.firstChild;
    walk(root);
    const result = root.innerHTML.trim();
    if (!result && !allowEmpty) return "<p><br></p>";
    return result;
  }
  function walk(node) {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === 8) {
        child.remove();
        continue;
      }
      if (child.nodeType === 3) continue;
      if (child.nodeType !== 1) {
        child.remove();
        continue;
      }
      const tagName = child.tagName;
      if (!ALLOWED_TAGS.has(tagName.toLowerCase())) {
        if (tagName === "SCRIPT" || tagName === "STYLE" || tagName === "IFRAME" || tagName === "OBJECT" || tagName === "EMBED" || tagName === "FORM" || tagName === "LINK" || tagName === "META") {
          child.remove();
          continue;
        }
        const parent = child.parentNode;
        while (child.firstChild) parent.insertBefore(child.firstChild, child);
        parent.removeChild(child);
        continue;
      }
      for (const attr of Array.from(child.attributes)) {
        if (!keepAttribute(tagName, attr.name, attr.value)) {
          child.removeAttribute(attr.name);
          continue;
        }
        const lower = attr.name.toLowerCase();
        if (lower === "style") child.setAttribute("style", sanitizeStyle(attr.value));
        else if (lower === "class") {
          const cls = sanitizeClass(attr.value);
          if (cls) child.setAttribute("class", cls);
          else child.removeAttribute("class");
        } else if (lower === "href" || lower === "src" || lower === "poster") {
          if (!isSafeUrl(attr.value)) child.removeAttribute(attr.name);
        }
      }
      if (tagName === "A" && child.getAttribute("target") === "_blank") child.setAttribute("rel", "noopener noreferrer");
      if (child.getAttribute("href") === "" || !child.getAttribute("href")) {
        if (tagName === "A") child.removeAttribute("href");
      }
      walk(child);
    }
  }
  const WORD_FONT_SIZES = { 1: 10, 2: 13, 3: 16, 4: 18, 5: 24, 6: 32, 7: 48 };
  function isWordHtml(html) {
    return /urn:schemas-microsoft-com|class=["']?Mso|ProgID|w:val=/i.test(html);
  }
  function cleanWordHtml(html) {
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
    const root = doc.body.firstChild;
    root.querySelectorAll("*").forEach((node) => {
      const tag = node.tagName.toLowerCase();
      if (tag.startsWith("o:") || tag.startsWith("w:") || tag === "style" || tag === "script" || tag === "link" || tag === "meta") {
        node.remove();
        return;
      }
      if (tag === "img") {
        const width = Number(node.getAttribute("width") || 0);
        const height = Number(node.getAttribute("height") || 0);
        if (width && width <= 3 || height && height <= 3) node.remove();
        return;
      }
      if (tag === "font") {
        const size = WORD_FONT_SIZES[Number(node.getAttribute("size"))];
        const span = doc.createElement("span");
        const styles = [];
        if (size) styles.push(`font-size:${size}px`);
        if (node.color) styles.push(`color:${node.color}`);
        if (styles.length) span.setAttribute("style", styles.join(";"));
        while (node.firstChild) span.appendChild(node.firstChild);
        node.replaceWith(span);
        return;
      }
      for (const attr of Array.from(node.attributes)) {
        const name = attr.name.toLowerCase();
        if (name.startsWith("mso-") || name === "class" || name.startsWith("_") || name.startsWith("w:") || name.startsWith("o:") || name === "lang" || name === "dir") {
          node.removeAttribute(attr.name);
        }
      }
    });
    return root.innerHTML;
  }
  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
  }
  function toPlainText(html) {
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
    doc.body.querySelectorAll("style,script").forEach((n) => n.remove());
    doc.body.innerHTML = doc.body.innerHTML.replace(/<\/(p|div|h[1-6]|li|blockquote|pre|tr)>/gi, "\n");
    return doc.body.textContent.replace(/\u00a0/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  }
  const DEFAULT_TIMEOUT = 1e4;
  function pickArray(raw) {
    if (Array.isArray(raw)) return raw;
    if (!raw || typeof raw !== "object") return [];
    for (const key of ["items", "list", "data", "rows", "records", "result"]) {
      const value = raw[key];
      if (Array.isArray(value)) return value;
      if (value && typeof value === "object") {
        const nested = pickArray(value);
        if (nested.length) return nested;
      }
    }
    return [];
  }
  function first(entry, keys) {
    for (const key of keys) {
      const value = entry[key];
      if (value !== void 0 && value !== null) return value;
    }
    return void 0;
  }
  function normalizeItem(entry, index) {
    if (entry === void 0 || entry === null) return null;
    if (typeof entry === "string" || typeof entry === "number") {
      const text = String(entry);
      return { value: text, label: text, desc: "", url: "", group: "", html: "", disabled: false, raw: entry };
    }
    if (typeof entry !== "object") return null;
    const value = first(entry, ["value", "id", "key", "val", "code"]);
    const label = first(entry, ["label", "text", "name", "title"]);
    return {
      value: value === void 0 ? String(index) : String(value),
      label: label === void 0 || label === "" ? value === void 0 ? String(index) : String(value) : String(label),
      desc: String(first(entry, ["desc", "description", "sub", "subtitle", "tip"]) ?? ""),
      url: String(first(entry, ["url", "href", "link", "jumpUrl", "jump"]) ?? ""),
      group: String(entry.group ?? ""),
      html: String(entry.html ?? ""),
      disabled: !!entry.disabled,
      raw: entry
    };
  }
  function normalizeItems(raw) {
    return pickArray(raw).map(normalizeItem).filter(Boolean);
  }
  function normalizePosition(spec = {}) {
    const raw = spec.position !== void 0 ? spec.position : spec.at;
    const num = (value) => Math.max(0, Math.floor(Number(value)));
    const named = (value) => typeof value === "object" && value ? value.before || value.after : value;
    if (typeof raw === "number" && Number.isFinite(raw)) return num(raw);
    if (typeof raw === "string" && raw) {
      const key = raw.toLowerCase();
      if (key === "start" || key === "begin" || key === "first") return "start";
      if (key === "end" || key === "last" || key === "main") return "end";
      if (key === "tail" || key === ":tail" || key === "right") return "tail";
      return { before: raw };
    }
    if (raw && typeof raw === "object") {
      if (raw.before) return { before: String(named(raw)) };
      if (raw.after) return { after: String(named(raw)) };
    }
    if (typeof spec.index === "number" && Number.isFinite(spec.index)) return num(spec.index);
    if (spec.before) return { before: String(spec.before) };
    if (spec.after) return { after: String(spec.after) };
    return null;
  }
  function normalizeCustomButton(spec) {
    if (!spec || typeof spec !== "object") return null;
    const name = String(spec.name || "").trim();
    if (!name) return null;
    return {
      name,
      /** 在工具栏里的位置（null = 默认追加到主区末尾） */
      position: normalizePosition(spec),
      type: spec.type === "button" ? "button" : "select",
      title: spec.title || spec.text || name,
      text: spec.text || "",
      placeholder: spec.placeholder || spec.text || "请选择",
      icon: spec.icon || "",
      width: Number(spec.width) > 0 ? Number(spec.width) : 0,
      searchable: !!spec.searchable,
      note: spec.note ? String(spec.note) : "",
      emptyText: spec.emptyText ? String(spec.emptyText) : "",
      cache: spec.cache !== false,
      keepValue: spec.keepValue !== false,
      multiple: false,
      options: spec.options ?? null,
      load: typeof spec.load === "function" ? spec.load : null,
      url: spec.url ? String(spec.url) : "",
      fetchOptions: spec.fetchOptions && typeof spec.fetchOptions === "object" ? spec.fetchOptions : {},
      pick: typeof spec.pick === "function" ? spec.pick : null,
      link: spec.link ?? null,
      insert: spec.insert === void 0 ? "auto" : spec.insert,
      onSelect: typeof spec.onSelect === "function" ? spec.onSelect : null,
      onClick: typeof spec.onClick === "function" ? spec.onClick : null,
      active: typeof spec.active === "function" ? spec.active : null,
      enabled: typeof spec.enabled === "function" ? spec.enabled : null
    };
  }
  function normalizeCustomButtons(list) {
    if (!Array.isArray(list)) return [];
    return list.map(normalizeCustomButton).filter(Boolean);
  }
  function createButtonRuntime() {
    return { items: null, loaded: false, loading: null, value: null, controller: null, error: "", gen: 0, external: false };
  }
  async function fetchItems(spec, editor, rt) {
    if (spec.load) return normalizeItems(await spec.load(editor));
    if (spec.url) return normalizeItems(await httpFetch(spec, editor, rt));
    return normalizeItems(spec.options);
  }
  async function httpFetch(spec, editor, rt) {
    var _a;
    const cfg = spec.fetchOptions;
    const impl = cfg.fetch || (typeof fetch === "function" ? fetch.bind(globalThis) : null);
    if (!impl) throw new Error("当前环境无 fetch，请改用 load 函数提供数据");
    (_a = rt.controller) == null ? void 0 : _a.abort();
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    rt.controller = controller;
    const timeout = Number(cfg.timeout) > 0 ? Number(cfg.timeout) : DEFAULT_TIMEOUT;
    const timer = setTimeout(() => controller == null ? void 0 : controller.abort(), timeout);
    try {
      const res = await impl(spec.url, {
        method: cfg.method || "GET",
        headers: cfg.headers,
        body: cfg.body,
        credentials: cfg.credentials,
        signal: controller ? controller.signal : void 0
      });
      if (!res || res.ok === false) throw new Error(`接口返回 ${res && res.status ? res.status : "异常"}`);
      const payload = cfg.parser ? await cfg.parser(res) : await res.json();
      return spec.pick ? spec.pick(payload, editor) : payload;
    } catch (error) {
      if (error && error.name === "AbortError") throw new Error(`请求超时（${timeout}ms）或被取消`);
      throw error;
    } finally {
      clearTimeout(timer);
      if (rt.controller === controller) rt.controller = null;
    }
  }
  function loadItems(spec, editor, rt, { force = false } = {}) {
    if (!force && rt.external && rt.items) return Promise.resolve(rt.items);
    if (!force && spec.cache && rt.items) return Promise.resolve(rt.items);
    if (!force && rt.loading) return rt.loading;
    const gen = rt.gen;
    const task = fetchItems(spec, editor, rt).then((items) => {
      if (gen !== rt.gen) return rt.items;
      rt.items = items;
      rt.loaded = true;
      rt.error = "";
      return items;
    }).catch((error) => {
      if (gen !== rt.gen) return rt.items;
      rt.error = error && error.message ? error.message : String(error);
      throw error;
    }).finally(() => {
      if (rt.loading === task) rt.loading = null;
    });
    rt.loading = task;
    return task;
  }
  function setRuntimeItems(rt, raw) {
    rt.gen += 1;
    rt.items = normalizeItems(raw);
    rt.loaded = true;
    rt.error = "";
    rt.external = true;
    abortRuntime(rt);
    rt.loading = null;
    return rt.items;
  }
  function abortRuntime(rt) {
    var _a;
    (_a = rt.controller) == null ? void 0 : _a.abort();
    rt.controller = null;
  }
  function fill(template, item) {
    return String(template).replace(/\{(\w+)\}/g, (match, key) => {
      if (item[key] !== void 0 && item[key] !== null) return String(item[key]);
      const fromRaw = item.raw && item.raw[key];
      return fromRaw === void 0 || fromRaw === null ? match : String(fromRaw);
    });
  }
  function pick$1(raw, item, editor) {
    return typeof raw === "function" ? raw(item, editor) : raw;
  }
  function resolveLink(spec, item, editor) {
    const conf = spec.link;
    let raw = null;
    if (typeof conf === "function") raw = conf(item, editor);
    else if (typeof conf === "string") raw = { url: conf };
    else if (conf && typeof conf === "object") raw = conf;
    else if (conf === true || item.url) raw = { url: item.url };
    if (!raw) return null;
    if (typeof raw === "string") raw = { url: raw };
    const url = normalizeUrl(fill(String(pick$1(raw.url, item, editor) ?? ""), item));
    if (!url || !isSafeUrl(url)) return null;
    const text = pick$1(raw.text, item, editor);
    const title = pick$1(raw.title, item, editor);
    const mode = raw.mode === "open" ? "open" : "insert";
    const target = raw.target === "_self" || raw.target === false ? "_self" : "_blank";
    return {
      mode,
      url,
      text: text === void 0 || text === null || text === "" ? item.label : fill(String(text), item),
      target,
      title: title ? fill(String(title), item) : ""
    };
  }
  function insertText(editor, text) {
    editor.commands.insertHTML(escapeHtml(text));
  }
  async function applySelection(editor, spec, rt, item) {
    editor.restoreSelection();
    const link = resolveLink(spec, item, editor);
    const ctx = {
      editor,
      item,
      link,
      insertLink: (override) => insertLink(editor, { ...link, ...override }),
      insertHtml: (html) => editor.commands.insertHTML(String(html)),
      insertText: (text) => insertText(editor, text),
      open: (url, target) => openUrl(url || link && link.url, target || link && link.target)
    };
    let action = "none";
    let handled = false;
    if (spec.onSelect) {
      handled = await spec.onSelect(item, ctx) === false;
    }
    if (!handled) action = doDefaultInsert(editor, spec, item, link);
    if (spec.keepValue) rt.value = item;
    const payload = { name: spec.name, item, link, action, editor };
    editor.emit("customselect", payload);
    return payload;
  }
  function doDefaultInsert(editor, spec, item, link) {
    const mode = spec.insert;
    if (mode === false || mode === "none") return "none";
    if (link && link.mode === "open") {
      openUrl(link.url, link.target);
      return "open";
    }
    if (mode === "link" || mode === "auto" && link) {
      if (!link) return "none";
      insertLink(editor, link);
      return "link";
    }
    if (mode === "html" || mode === "auto" && item.html) {
      if (!item.html) return "none";
      editor.commands.insertHTML(item.html);
      return "html";
    }
    insertText(editor, item.label);
    return "text";
  }
  function insertLink(editor, link) {
    editor.commands.createLink({
      url: link.url,
      text: link.text,
      target: link.target !== "_self"
    });
  }
  function openUrl(url, target = "_blank") {
    if (!url || !isSafeUrl(url)) return;
    if (target === "_self") window.location.href = url;
    else window.open(url, "_blank", "noopener,noreferrer");
  }
  const CARET = '<svg class="ke-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
  const SCROLL_HINT_KEY = "keditor.toolbarScrollHint";
  const SCROLL_HINT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7 4 12l4 5"/><path d="M16 7l4 5-4 5"/><path d="M4 12h16"/></svg>';
  const HEADINGS = [
    { value: "p", label: "正文", desc: "默认段落 · 17px，正文内容都用它", sample: "正文示例文字", sampleClass: "s-body" },
    { value: "h1", label: "标题一", desc: "大标题 · 22px 加粗，全文主标题（建议只用一次）", sample: "标题一示例", sampleClass: "s-h1" },
    { value: "h2", label: "标题二", desc: "章节标题 · 20px 加粗，划分小节", sample: "标题二示例", sampleClass: "s-h2" },
    { value: "h3", label: "标题三", desc: "小标题 · 18px 加粗，章节内的层级", sample: "标题三示例", sampleClass: "s-h3" }
  ];
  const FONT_SIZES = [12, 14, 15, 16, 17, 18, 20, 22, 24, 28, 32];
  const DEFAULT_TOOLBAR = [
    "undo",
    "redo",
    "|",
    "heading",
    "fontsize",
    "|",
    "bold",
    "italic",
    "underline",
    "strike",
    "|",
    "foreColor",
    "backColor",
    "|",
    "alignLeft",
    "alignCenter",
    "alignRight",
    "alignJustify",
    "|",
    "ul",
    "ol",
    "quote",
    "|",
    "link",
    "image",
    "video",
    "table",
    "code",
    "hr",
    "clear",
    ":tail",
    "source",
    "fullscreen"
  ];
  const ITEMS = {
    undo: { icon: "undo", title: "撤销 (⌘/Ctrl+Z)", run: (e) => e.undo(), active: (s) => !!s.canUndo, enabled: (s) => s.canUndo },
    redo: { icon: "redo", title: "重做 (⌘/Ctrl+Shift+Z)", run: (e) => e.redo(), active: (s) => !!s.canRedo, enabled: (s) => s.canRedo },
    bold: { glyph: ["B", "ke-glyph"], title: "加粗 (⌘/Ctrl+B)", cmd: "bold", active: (s) => s.bold },
    italic: { glyph: ["I", "ke-glyph ke-glyph-i"], title: "斜体 (⌘/Ctrl+I)", cmd: "italic", active: (s) => s.italic },
    underline: { glyph: ["U", "ke-glyph ke-glyph-u"], title: "下划线 (⌘/Ctrl+U)", cmd: "underline", active: (s) => s.underline },
    strike: { glyph: ["S", "ke-glyph ke-glyph-s"], title: "删除线", cmd: "strike", active: (s) => s.strikeThrough },
    alignLeft: { icon: "alignLeft", title: "左对齐", run: (e) => e.commands.setAlign("left"), active: (s) => s.align === "left" },
    alignCenter: { icon: "alignCenter", title: "居中", run: (e) => e.commands.setAlign("center"), active: (s) => s.align === "center" },
    alignRight: { icon: "alignRight", title: "右对齐", run: (e) => e.commands.setAlign("right"), active: (s) => s.align === "right" },
    alignJustify: { icon: "alignJustify", title: "两端对齐", run: (e) => e.commands.setAlign("justify"), active: (s) => s.align === "justify" },
    ul: { icon: "ul", title: "无序列表", run: (e) => e.commands.toggleList("unordered"), active: (s) => s.ul },
    ol: { icon: "ol", title: "有序列表", run: (e) => e.commands.toggleList("ordered"), active: (s) => s.ol },
    quote: { icon: "quote", title: "引用", run: (e) => e.commands.toggleBlockquote(), active: (s) => s.block === "blockquote" },
    link: { icon: "link", title: "插入链接", run: (e) => e.toolbar.openLink(), active: (s) => s.link, toggles: true },
    image: { icon: "image", title: "图片（本地上传 / 网络链接）", run: (e) => e.toolbar.openMedia("image"), toggles: true },
    video: { icon: "video", title: "视频（本地上传 / 网络链接，支持分片上传）", run: (e) => e.toolbar.openMedia("video"), toggles: true },
    table: { icon: "table", title: "插入表格", run: (e) => e.toolbar.openTable(), toggles: true },
    code: { icon: "code", title: "代码块", run: (e) => e.commands.insertCodeBlock() },
    hr: { icon: "hr", title: "分割线", run: (e) => e.commands.insertDivider() },
    clear: { icon: "clear", title: "清除格式", run: (e) => e.commands.clearFormat() },
    source: { icon: "source", title: "查看 / 编辑 HTML 源码（⌘/Ctrl+Shift+K）", text: "源码", run: (e) => e.toggleSource(), active: (s) => s.source },
    preview: { icon: "preview", title: "预览效果（手机 / 平板 / 电脑宽度）", text: "预览", run: (e) => e.togglePreview(), active: (s) => s.preview },
    // 默认工具栏已不包含，可用 toolbar / position 显式摆放
    fullscreen: { icon: "expand", title: "全屏编辑", text: "全屏", run: (e) => e.toggleFullscreen(), active: (s) => s.fullscreen },
    foreColor: { pop: "fore", title: "字体颜色", toggles: true, swatch: "fore" },
    backColor: { pop: "back", title: "背景高亮色", toggles: true, swatch: "back" }
  };
  class Toolbar {
    constructor(editor, items = DEFAULT_TOOLBAR, customButtons = []) {
      this.editor = editor;
      this.buttons = /* @__PURE__ */ new Map();
      this.custom = /* @__PURE__ */ new Map();
      this.colorState = { foreColor: "#3f3f3f", backColor: "#f6c344" };
      this.recent = { foreColor: [], backColor: [] };
      this.el = editor.tbEl;
      for (const spec of customButtons) this.registerCustom(spec);
      this.build(items);
      this.setupScrollHints();
    }
    build(items) {
      const group = h("div.ke-tb-group");
      this.el.appendChild(group);
      this.groupEl = group;
      this.tailEl = null;
      const target = () => this.tailEl || group;
      for (const key of items) {
        if (key === "|") {
          target().appendChild(h("span.ke-tb-sep"));
          continue;
        }
        if (key === ":tail") {
          this.tailEl = h("div.ke-tb-tail");
          this.el.appendChild(this.tailEl);
          continue;
        }
        if (this.custom.has(key)) {
          const entry = this.custom.get(key);
          entry.button = this.buildCustomButton(entry);
          target().appendChild(entry.button);
          continue;
        }
        if (key === "heading") {
          target().appendChild(this.buildHeading());
          continue;
        }
        if (key === "fontsize") {
          target().appendChild(this.buildFontSize());
          continue;
        }
        const spec = ITEMS[key];
        if (!spec) continue;
        target().appendChild(this.buildButton(key, spec));
      }
      for (const [name, entry] of this.custom) {
        if (entry.button) continue;
        entry.button = this.buildCustomButton(entry);
        this.insertButton(entry.button, entry.spec.position);
      }
    }
    buildButton(name, spec) {
      const button = h("button.ke-btn", {
        type: "button",
        title: spec.title,
        "data-k-item": name,
        onclick: (event) => {
          var _a;
          event.preventDefault();
          if (spec.pop) this.toggleColor(name, button);
          else if (spec.cmd) this.editor.commands.toggleMark(spec.cmd);
          else (_a = spec.run) == null ? void 0 : _a.call(spec, this.editor);
          if (!spec.toggles) this.editor.popover.close();
        }
      });
      if (spec.icon) button.innerHTML = icon(spec.icon);
      if (spec.text) button.appendChild(h("span.ke-btn-text", { text: spec.text }));
      if (spec.glyph) {
        const [text, cls] = spec.glyph;
        button.appendChild(h("span", { class: cls, text }));
      }
      if (spec.swatch) {
        const color = spec.swatch === "fore" ? this.colorState.foreColor : this.colorState.backColor;
        const face = h("span", { class: spec.swatch === "fore" ? "ke-glyph ke-glyph-a" : "ke-glyph ke-glyph-a ke-glyph-hl" });
        face.appendChild(h("span", { text: "A" }));
        button.appendChild(face);
        if (spec.swatch === "fore") button.appendChild(h("span", { class: "ke-dot" }));
        this.paintButton(button, spec.swatch, color);
        button.dataset.kPop = spec.swatch === "fore" ? "foreColor" : "backColor";
      }
      if (spec.toggles && !spec.swatch) button.dataset.kPop = name;
      this.buttons.set(name, button);
      return button;
    }
    paintButton(button, kind, color) {
      if (!button || !color) return;
      button.style.setProperty(kind === "fore" ? "--ke-fore" : "--ke-back", color);
    }
    /* ---------------- 下拉面板 ---------------- */
    openPop(anchor, builder, options = {}) {
      this.editor.saveSelection();
      this.editor.popover.open(anchor, builder, {
        align: "start",
        ...options,
        onClose: () => {
          var _a;
          anchor.classList.remove("ke-is-open");
          (_a = options.onClose) == null ? void 0 : _a.call(options);
        }
      });
      anchor.classList.add("ke-is-open");
    }
    /** 同一个按钮再次点击 = 关闭；颜色按钮点击直接展开面板 */
    togglePop(name, button, builder, options = {}) {
      const pop = this.editor.popover;
      if (pop.isOpen && pop.anchor === button) {
        pop.close();
        return;
      }
      this.openPop(button, builder, options);
    }
    buildHeading() {
      const current = HEADINGS[0];
      const button = h("button.ke-btn.ke-btn-label", {
        type: "button",
        title: "段落样式：正文 / 标题一 / 标题二 / 标题三",
        "data-k-item": "heading",
        dataset: { kPop: "heading" },
        onclick: (event) => {
          event.preventDefault();
          this.togglePop("heading", button, () => headingPanel(HEADINGS, {
            value: this.editor.getState().block,
            onPick: (value) => {
              this.editor.restoreSelection();
              this.editor.commands.setHeading(value);
              this.editor.popover.close();
              this.editor.refresh();
            }
          }));
        }
      });
      button.innerHTML = `<span class="ke-btn-text">${current.label}</span>${CARET}`;
      this.headingEl = button;
      this.buttons.set("heading", button);
      return button;
    }
    buildFontSize() {
      const button = h("button.ke-btn.ke-btn-label", {
        type: "button",
        title: "字号",
        "data-k-item": "fontsize",
        dataset: { kPop: "fontsize" },
        onclick: (event) => {
          event.preventDefault();
          this.togglePop("fontsize", button, () => fontSizePanel(FONT_SIZES, {
            value: this.editor.getState().fontSize,
            onPick: (size) => {
              this.editor.restoreSelection();
              this.editor.commands.setFontSize(Number(size));
              this.editor.popover.close();
              this.editor.refresh();
            }
          }));
        }
      });
      button.innerHTML = `<span class="ke-btn-text">字号</span>${CARET}`;
      this.fontSizeEl = button;
      this.buttons.set("fontsize", button);
      return button;
    }
    /* ---------------- 自定义按钮 ---------------- */
    /** 登记一个自定义按钮规格；统一在此规范化，保证配置与 addButton 两条路径行为一致 */
    registerCustom(raw) {
      const spec = normalizeCustomButton(raw);
      if (!spec) return null;
      const prev = this.custom.get(spec.name);
      const entry = { spec, rt: prev ? prev.rt : createButtonRuntime(), button: prev ? prev.button : null };
      this.custom.set(spec.name, entry);
      return entry;
    }
    buildCustomButton(entry) {
      const { spec } = entry;
      const isSelect = spec.type === "select";
      const button = h("button.ke-btn", {
        type: "button",
        class: isSelect ? "ke-btn-label ke-btn-custom" : "ke-btn-custom",
        title: spec.title,
        "data-k-item": spec.name,
        dataset: { kPop: spec.name, kCustom: spec.name },
        onclick: (event) => {
          event.preventDefault();
          if (isSelect) this.openCustom(spec.name);
          else this.runCustomButton(spec);
        }
      });
      if (spec.icon) button.innerHTML = /</.test(spec.icon) ? spec.icon : icon(spec.icon);
      if (isSelect) {
        button.appendChild(h("span.ke-btn-text", { text: spec.text || spec.placeholder }));
        button.insertAdjacentHTML("beforeend", CARET);
      } else if (spec.text) {
        button.appendChild(h("span.ke-btn-text", { text: spec.text }));
      }
      this.syncCustomLabel(spec.name, button);
      return button;
    }
    /** 按钮文案跟随当前选中项（与段落样式 / 字号按钮一致） */
    syncCustomLabel(name, node) {
      const entry = this.custom.get(name);
      const button = node || (entry == null ? void 0 : entry.button);
      if (!entry || !button) return;
      const { spec, rt } = entry;
      if (spec.type !== "select") return;
      const label = button.querySelector(".ke-btn-text");
      if (!label) return;
      const picked = rt.value;
      label.textContent = picked ? picked.label : spec.text || spec.placeholder;
      button.title = picked ? `${spec.title}：${picked.label}` : spec.title;
      button.classList.toggle("ke-has-value", !!picked);
    }
    /** 打开下拉面板：数据异步加载，带缓存 / 重试 / 搜索 */
    openCustom(name) {
      const entry = this.custom.get(name);
      if (!entry) return;
      this.revealButton(entry.button);
      const { spec, rt } = entry;
      const remote = !!(spec.load || spec.url);
      const fetcher = ({ force } = {}) => loadItems(spec, this.editor, rt, { force });
      this.togglePop(name, entry.button, () => selectPanel({
        title: spec.title,
        note: spec.note || "",
        searchable: spec.searchable,
        width: spec.width,
        remote,
        value: rt.value ? rt.value.value : "",
        emptyText: spec.emptyText,
        load: fetcher,
        reload: fetcher,
        linkOf: (item) => resolveLink(spec, item, this.editor),
        onPick: (item) => this.pickCustom(name, item)
      }));
    }
    async pickCustom(name, item) {
      const entry = this.custom.get(name);
      if (!entry) return;
      this.editor.popover.close();
      try {
        await applySelection(this.editor, entry.spec, entry.rt, item);
      } catch (error) {
        this.editor.reportError("custombutton", error);
      }
      this.syncCustomLabel(name);
      this.editor.refresh();
    }
    /** type:'button' 的简单自定义按钮 */
    async runCustomButton(spec) {
      this.editor.popover.close();
      try {
        if (spec.onClick) await spec.onClick({ editor: this.editor, name: spec.name });
        this.editor.emit("customclick", { name: spec.name, editor: this.editor });
      } catch (error) {
        this.editor.reportError("custombutton", error);
      }
      this.editor.refresh();
    }
    /** 运行时新增自定义按钮；位置取 options.at ?? spec.position（默认追加到主分组末尾） */
    addButton(spec, options = {}) {
      var _a;
      const entry = this.registerCustom(spec);
      if (!entry) return null;
      if (entry.button) entry.button.remove();
      entry.button = this.buildCustomButton(entry);
      const where = options.at !== void 0 ? options.at : normalizePosition(options) ?? entry.spec.position;
      this.insertButton(entry.button, where, { withSep: where == null });
      this.revealButton(entry.button);
      (_a = this.syncScrollHints) == null ? void 0 : _a.call(this);
      return entry.button;
    }
    /** 工具栏内可定位的节点（主区 → 尾区的视觉顺序，不含分隔符） */
    buttonNodes() {
      const list = [];
      for (const host of [this.groupEl, this.tailEl]) {
        if (!host) continue;
        for (const node of host.children) if (node.dataset && node.dataset.kItem) list.push(node);
      }
      return list;
    }
    /** 位置描述 → {parent, ref}，ref 为 null 表示追加到 parent 末尾 */
    slotOf(where) {
      const mainEnd = { parent: this.groupEl || this.el, ref: null };
      if (where === "tail") return { parent: this.tailEl || this.groupEl || this.el, ref: null };
      if (where == null || where === "end") return mainEnd;
      if (where === "start") {
        const first2 = this.buttonNodes()[0];
        return first2 ? { parent: first2.parentElement, ref: first2 } : mainEnd;
      }
      const nodes = this.buttonNodes();
      if (typeof where === "number") {
        const ref = nodes[Math.max(0, Math.floor(where))];
        if (ref) return { parent: ref.parentElement, ref };
        const last = nodes[nodes.length - 1];
        return last ? { parent: last.parentElement, ref: null } : mainEnd;
      }
      const after = !!(where && typeof where === "object" && where.after);
      const name = typeof where === "string" ? where : String((after ? where.after : where.before) || "");
      const anchor = nodes.find((node) => node.dataset.kItem === name);
      if (!anchor) return mainEnd;
      return { parent: anchor.parentElement, ref: after ? anchor.nextElementSibling || null : anchor };
    }
    insertButton(button, where, { withSep } = {}) {
      const { parent, ref } = this.slotOf(where);
      if (!parent || !button) return;
      if (withSep && !ref) parent.appendChild(h("span.ke-tb-sep"));
      parent.insertBefore(button, ref || null);
    }
    /** 运行时把任意按钮（内置或自定义）移到指定位置 */
    moveButton(name, where) {
      var _a, _b;
      const node = this.buttonNodes().find((item) => item.dataset.kItem === String(name));
      if (!node) return false;
      node.remove();
      this.insertButton(node, where === void 0 ? ((_a = this.custom.get(String(name))) == null ? void 0 : _a.spec.position) ?? null : where);
      this.revealButton(node);
      (_b = this.syncScrollHints) == null ? void 0 : _b.call(this);
      return true;
    }
    /** 工具栏溢出时把按钮滚进可视区（避开 sticky 尾栏的遮挡） */
    revealButton(button) {
      const tb = this.el;
      if (!tb || !button || !button.isConnected) return;
      const max = tb.scrollWidth - tb.clientWidth;
      if (max <= 1) return;
      const tailW = this.tailEl ? this.tailEl.offsetWidth : 0;
      const left = button.offsetLeft;
      const right = left + button.offsetWidth;
      const viewR = tb.scrollLeft + tb.clientWidth - tailW;
      if (right > viewR - 4) tb.scrollLeft = Math.min(max, right - tb.clientWidth + tailW + 10);
      else if (left < tb.scrollLeft + 4) tb.scrollLeft = Math.max(0, left - 10);
    }
    /** 移除自定义按钮并中断其未完成的请求 */
    removeButton(name) {
      var _a, _b, _c, _d;
      const entry = this.custom.get(name);
      if (!entry) return false;
      abortRuntime(entry.rt);
      if (this.editor.popover.anchor === entry.button) this.editor.popover.close();
      const prev = (_a = entry.button) == null ? void 0 : _a.previousElementSibling;
      const next = (_b = entry.button) == null ? void 0 : _b.nextElementSibling;
      (_c = entry.button) == null ? void 0 : _c.remove();
      if (prev && prev.classList.contains("ke-tb-sep") && (!next || next.classList.contains("ke-tb-sep"))) prev.remove();
      this.buttons.delete(name);
      this.custom.delete(name);
      (_d = this.syncScrollHints) == null ? void 0 : _d.call(this);
      return true;
    }
    /** 外部灌入下拉数据（接口在编辑器之外请求时用），并刷新已打开的面板 */
    setButtonOptions(name, items) {
      const entry = this.custom.get(name);
      if (!entry) return null;
      const list = setRuntimeItems(entry.rt, items);
      if (this.editor.popover.isOpen && this.editor.popover.anchor === entry.button) {
        this.editor.popover.close();
        this.openCustom(name);
      }
      return list;
    }
    /** 读取按钮当前选中项 */
    getButtonValue(name) {
      const entry = this.custom.get(name);
      return entry ? entry.rt.value : null;
    }
    setButtonValue(name, value) {
      const entry = this.custom.get(name);
      if (!entry) return null;
      const items = entry.rt.items || [];
      const match = items.find((item) => String(item.value) === String(value)) || null;
      entry.rt.value = match;
      this.syncCustomLabel(name);
      return match;
    }
    toggleColor(name, button) {
      const kind = name === "foreColor" ? "fore" : "back";
      this.togglePop(
        name,
        button,
        () => colorPanel({
          title: kind === "fore" ? "字体颜色" : "背景高亮色",
          kind,
          value: this.colorState[name],
          recents: this.recent[name],
          onPick: (color) => this.applyColor(name, kind, color, button),
          onClear: () => this.applyColor(name, kind, null, button)
        }),
        {
          onClose: () => button.classList.remove("ke-is-active")
        }
      );
    }
    applyColor(name, kind, color, button) {
      this.editor.restoreSelection();
      if (color) {
        this.colorState[name] = color;
        this.recent[name] = [color, ...this.recent[name].filter((x) => x.toLowerCase() !== color.toLowerCase())].slice(0, 8);
        this.paintButton(button, kind, color);
      }
      this.editor.commands.setColor(kind, color);
      this.editor.popover.close();
    }
    openTable() {
      const button = this.buttons.get("table");
      this.togglePop("table", button, () => tablePanel((cols, rows) => {
        this.editor.restoreSelection();
        this.editor.commands.insertTable(cols, rows);
        this.editor.popover.close();
      }));
    }
    openLink() {
      const button = this.buttons.get("link");
      const state = this.editor.getState();
      const existing = state.linkUrl;
      this.togglePop("link", button, () => linkPanel({
        url: existing || "",
        text: existing ? "" : state.selectionText || "",
        target: existing ? state.linkTarget : true,
        onCancel: () => this.editor.popover.close(),
        onRemove: existing ? () => {
          this.editor.restoreSelection();
          this.editor.commands.removeLink();
          this.editor.popover.close();
        } : null,
        onSubmit: ({ url, text, target }) => {
          this.editor.restoreSelection();
          this.editor.commands.createLink({ url: normalizeUrl(url), text, target });
          this.editor.popover.close();
        }
      }));
    }
    /** 图片 / 视频：本地上传 + 网络链接输入 */
    openMedia(kind) {
      const button = this.buttons.get(kind);
      const editor = this.editor;
      const options = editor.options;
      this.togglePop(kind, button, () => mediaPanel(kind, {
        multiple: kind === "image",
        maxText: `${kind === "image" ? "图片" : "视频"}上限 ${formatLimit(kind === "image" ? options.maxImageSize : options.maxVideoSize)}`,
        hint: kind === "image" ? "支持 PNG / JPG / GIF / WebP / SVG" : "支持 MP4 / MOV / WebM，大文件自动分片",
        onFiles: (files) => {
          editor.popover.close();
          if (files && files.length) editor.media.addFiles([...files]);
          else editor.media.pickFiles(kind);
        },
        onUrl: ({ url, name }) => {
          editor.popover.close();
          editor.restoreSelection();
          editor.media.insertFromUrl(kind, url, name);
        }
      }));
    }
    /** 根据编辑器状态同步按钮高亮 / 下拉值 / 禁用 */
    refresh(state) {
      var _a;
      for (const [name, button] of this.buttons) {
        const spec = ITEMS[name];
        if (!spec) continue;
        const active = ((_a = spec.active) == null ? void 0 : _a.call(spec, state)) || false;
        if (button.dataset.kPop || !spec.pop) button.classList.toggle("ke-is-active", active);
        if (spec.enabled) button.disabled = !spec.enabled(state);
      }
      for (const [name, entry] of this.custom) {
        const { spec, button } = entry;
        if (!button) continue;
        if (spec.active) button.classList.toggle("ke-is-active", !!spec.active(state, this.editor));
        if (spec.enabled) button.disabled = !spec.enabled(state, this.editor);
        if (spec.type === "select") this.syncCustomLabel(name);
      }
      if (this.headingEl) {
        const match = HEADINGS.find((x) => x.value === state.block);
        const label = this.headingEl.querySelector(".ke-btn-text");
        if (label) label.textContent = match ? match.label : "正文";
        this.headingEl.title = match ? `${match.label}：${match.desc}` : "段落样式";
      }
      if (this.fontSizeEl) {
        const label = this.fontSizeEl.querySelector(".ke-btn-text");
        if (label) label.textContent = state.fontSize ? `${state.fontSize}px` : "字号";
      }
      if (state.linkUrl) {
        const btn2 = this.buttons.get("link");
        btn2 == null ? void 0 : btn2.classList.add("ke-is-active");
      }
    }
    /* ---------------- 可滑动提示 ---------------- */
    /**
     * 工具栏溢出时给出四重可发现性提示：
     * 常显滚动条（CSS）、右侧被遮工具的动态阴影、左侧渐隐、鼠标拖拽，
     * 外加首次加载的引导气泡。
     */
    setupScrollHints() {
      const tb = this.el;
      const host = this.editor.el;
      if (!tb.isConnected) return;
      this.scrollFades = h("div.ke-tb-fades", { "aria-hidden": "true" }, [h("i.ke-tb-fade ke-tb-fade-l")]);
      tb.insertAdjacentElement("afterend", this.scrollFades);
      this.syncScrollHints = () => {
        if (!tb.isConnected || !host.isConnected) return;
        const max = tb.scrollWidth - tb.clientWidth;
        const overflow = max > 1;
        const left = tb.scrollLeft;
        host.classList.toggle("ke-tb-scrollable", overflow);
        host.classList.toggle("ke-tb-can-l", overflow && left > 1);
        host.classList.toggle("ke-tb-can-r", overflow && left < max - 1);
        host.style.setProperty("--ke-tb-h", `${tb.offsetHeight}px`);
        if (overflow && !this.hintSettled) this.showScrollHint();
      };
      this.onTbScroll = () => {
        this.syncScrollHints();
        this.hideScrollHint();
      };
      tb.addEventListener("scroll", this.onTbScroll, { passive: true });
      if (typeof ResizeObserver !== "undefined") {
        this.tbRO = new ResizeObserver(() => this.syncScrollHints());
        this.tbRO.observe(tb);
      }
      this.onTbPointerDown = (event) => {
        this.hideScrollHint();
        this.startDragScroll(event);
      };
      tb.addEventListener("pointerdown", this.onTbPointerDown);
      requestAnimationFrame(this.syncScrollHints);
    }
    /** 鼠标按住拖动平移工具栏（触屏已有原生滑动，不介入） */
    startDragScroll(event) {
      const tb = this.el;
      const host = this.editor.el;
      if (event.button !== 0 || event.pointerType !== "mouse") return;
      if (tb.scrollWidth <= tb.clientWidth + 1) return;
      if (event.target.closest("input, textarea, select")) return;
      const startX = event.clientX;
      const startLeft = tb.scrollLeft;
      let dragging = false;
      const move = (ev) => {
        var _a;
        const dx = ev.clientX - startX;
        if (!dragging) {
          if (Math.abs(dx) < 5) return;
          dragging = true;
          try {
            tb.setPointerCapture(event.pointerId);
          } catch {
          }
          host.classList.add("ke-tb-dragging");
          (_a = this.editor.popover) == null ? void 0 : _a.close();
        }
        ev.preventDefault();
        tb.scrollLeft = startLeft - dx;
      };
      const up = () => {
        tb.removeEventListener("pointermove", move);
        tb.removeEventListener("pointerup", up);
        tb.removeEventListener("pointercancel", up);
        host.classList.remove("ke-tb-dragging");
        if (!dragging) return;
        try {
          tb.releasePointerCapture(event.pointerId);
        } catch {
        }
        const stop = (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          release();
        };
        const release = () => {
          clearTimeout(fallback);
          tb.removeEventListener("click", stop, true);
        };
        const fallback = setTimeout(release, 400);
        tb.addEventListener("click", stop, true);
      };
      tb.addEventListener("pointermove", move);
      tb.addEventListener("pointerup", up);
      tb.addEventListener("pointercancel", up);
    }
    showScrollHint() {
      this.hintSettled = true;
      let seen = false;
      try {
        seen = localStorage.getItem(SCROLL_HINT_KEY) === "1";
      } catch {
      }
      if (seen) return;
      this.hintEl = h("div.ke-tb-hint", { "aria-hidden": "true" }, [
        h("span.ke-tb-hint-ico", { html: SCROLL_HINT_ICON }),
        h("span", { text: "工具栏可左右滑动" })
      ]);
      this.editor.el.appendChild(this.hintEl);
      this.hintTimer = setTimeout(() => this.hideScrollHint(), 3800);
    }
    hideScrollHint() {
      if (this.hintTimer) {
        clearTimeout(this.hintTimer);
        this.hintTimer = null;
      }
      const pill = this.hintEl;
      if (!pill) return;
      this.hintEl = null;
      try {
        localStorage.setItem(SCROLL_HINT_KEY, "1");
      } catch {
      }
      pill.classList.add("ke-is-out");
      setTimeout(() => pill.remove(), 260);
    }
    destroy() {
      var _a, _b, _c;
      const tb = this.el;
      if (this.tbRO) {
        this.tbRO.disconnect();
        this.tbRO = null;
      }
      if (this.hintTimer) {
        clearTimeout(this.hintTimer);
        this.hintTimer = null;
      }
      if (this.onTbScroll) tb.removeEventListener("scroll", this.onTbScroll);
      if (this.onTbPointerDown) tb.removeEventListener("pointerdown", this.onTbPointerDown);
      for (const entry of this.custom.values()) abortRuntime(entry.rt);
      this.custom.clear();
      (_a = this.scrollFades) == null ? void 0 : _a.remove();
      (_b = this.hintEl) == null ? void 0 : _b.remove();
      this.scrollFades = null;
      this.hintEl = null;
      const host = (_c = this.editor) == null ? void 0 : _c.el;
      if (host) {
        host.classList.remove("ke-tb-scrollable", "ke-tb-can-l", "ke-tb-can-r", "ke-tb-dragging");
        host.style.removeProperty("--ke-tb-h");
      }
      tb.innerHTML = "";
      this.buttons.clear();
    }
  }
  function formatLimit(bytes) {
    if (!bytes) return "不限";
    const mb = bytes / 1024 / 1024;
    return mb >= 1 ? `${Math.round(mb)}MB` : `${Math.round(bytes / 1024)}KB`;
  }
  function getRange(root) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) return null;
    return range;
  }
  function caretOffset(root) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    if (!root.contains(range.startContainer)) return null;
    let offset = 0;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (node === range.startContainer) return NodeFilter.FILTER_ACCEPT;
        offset += node.textContent.length;
        return NodeFilter.FILTER_SKIP;
      }
    });
    const found = walker.nextNode();
    if (!found) return range.startContainer === root ? 0 : null;
    return offset + range.startOffset;
  }
  function setCaretOffset(root, offset) {
    if (offset === null || offset === void 0) return;
    const sel = window.getSelection();
    let remaining = Math.max(0, offset);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    let last = null;
    while (node) {
      const len = node.textContent.length;
      if (remaining <= len) {
        try {
          sel.setBaseAndExtent(node, remaining, node, remaining);
        } catch {
        }
        return;
      }
      remaining -= len;
      last = node;
      node = walker.nextNode();
    }
    if (last) {
      try {
        sel.setBaseAndExtent(last, last.textContent.length, last, last.textContent.length);
      } catch {
      }
    }
  }
  function insertNode(root, node, { inline = false, selectAfter = true } = {}) {
    root.focus();
    const range = getRange(root);
    if (!range) {
      root.appendChild(node);
      ensureEditableTail(root);
      return node;
    }
    if (!range.collapsed) range.deleteContents();
    if (inline) {
      range.insertNode(node);
    } else {
      const block = closestBlock(range.startContainer, root);
      if (!block || block === root) root.appendChild(node);
      else block.after(node);
    }
    const after = document.createRange();
    after.setStartAfter(node);
    after.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(after);
    ensureEditableTail(root);
    if (selectAfter && sel.rangeCount === 0) root.focus();
    return node;
  }
  function ensureEditableTail(root) {
    const last = root.lastElementChild;
    if (!last) {
      root.appendChild(document.createElement("p"));
      return;
    }
    if (/^(IMG|VIDEO|IFRAME)$/.test(last.tagName) || last.dataset.kmedia !== void 0) {
      const p = document.createElement("p");
      p.appendChild(document.createElement("br"));
      root.appendChild(p);
    }
  }
  function closestBlock(node, root) {
    let current = node;
    while (current && current !== root) {
      if (current.nodeType === 1 && /^(P|DIV|H[1-6]|LI|BLOCKQUOTE|PRE|SECTION|TD|TH)$/.test(current.tagName)) return current;
      current = current.parentNode;
    }
    return null;
  }
  class Commands {
    constructor(editor) {
      this.editor = editor;
      this.root = editor.root;
    }
    /** 统一入口：确保聚焦 + 开启 styleWithCSS（输出 inline style，符合公众号粘贴习惯） */
    exec(command, value = null) {
      this.editor.focus();
      document.execCommand("styleWithCSS", false, true);
      document.execCommand("defaultParagraphSeparator", false, "p");
      const ok = document.execCommand(command, false, value);
      this.editor.afterEdit();
      return ok;
    }
    queryState(command) {
      try {
        return document.queryCommandState(command);
      } catch {
        return false;
      }
    }
    queryValue(command) {
      try {
        return document.queryCommandValue(command);
      } catch {
        return "";
      }
    }
    hasSelection() {
      const range = getRange(this.root);
      return !!(range && !range.collapsed);
    }
    toggleMark(name) {
      const map = { bold: "bold", italic: "italic", underline: "underline", strike: "strikeThrough" };
      const cmd = map[name];
      if (!cmd) return;
      this.exec(cmd);
      this.root.querySelectorAll('span[style=""]').forEach((n) => n.replaceWith(...n.childNodes));
    }
    /** 字号：用 fontSize=7 作为标记再改写成 font-size:px，避免浏览器字号档位限制 */
    setFontSize(px) {
      this.editor.focus();
      document.execCommand("styleWithCSS", false, false);
      const marker = `__ke_fs_${uid()}__`;
      this.root.setAttribute("data-ke-marker", marker);
      document.execCommand("fontSize", false, "7");
      this.root.removeAttribute("data-ke-marker");
      this.root.querySelectorAll('font[size="7"]').forEach((font) => {
        const span = document.createElement("span");
        span.style.fontSize = `${px}px`;
        while (font.firstChild) span.appendChild(font.firstChild);
        font.replaceWith(span);
      });
      this.root.querySelectorAll("span").forEach((span) => {
        if (/xx-large/i.test(span.style.fontSize)) span.style.fontSize = `${px}px`;
      });
      document.execCommand("styleWithCSS", false, true);
      this.editor.afterEdit();
    }
    setColor(mode, color) {
      this.editor.focus();
      document.execCommand("styleWithCSS", false, true);
      if (!color) color = mode === "fore" ? "#3f3f3f" : "transparent";
      const ok = document.execCommand(mode === "fore" ? "foreColor" : "hiliteColor", false, color);
      if (!ok) document.execCommand(mode === "fore" ? "foreColor" : "backColor", false, color);
      if (mode === "back" && color === "transparent") {
        this.root.querySelectorAll('[style*="background-color"]').forEach((node) => {
          if (/background-color:\s*transparent|rgba\(0, 0, 0, 0\)/i.test(node.getAttribute("style") || "")) {
            node.style.backgroundColor = "";
            if (!node.getAttribute("style").trim()) node.replaceWith(...node.childNodes);
          }
        });
      }
      this.editor.afterEdit();
    }
    setAlign(align) {
      var _a, _b;
      const media = (_a = this.editor.bubble) == null ? void 0 : _a.node;
      if (media && ((_b = media.dataset) == null ? void 0 : _b.kMedia) === "image" && align !== "justify") {
        const img = media.querySelector("img");
        if (img) {
          setMediaAlign(img, align);
          this.editor.commitHistory();
          this.editor.bubble.position();
          return;
        }
      }
      const map = { left: "justifyLeft", center: "justifyCenter", right: "justifyRight", justify: "justifyFull" };
      const cmd = map[align];
      if (!cmd) return;
      this.editor.focus();
      const range = getRange(this.root);
      const block = closestBlock((range == null ? void 0 : range.commonAncestorContainer) || this.root, this.root);
      document.execCommand("styleWithCSS", false, true);
      document.execCommand(cmd);
      const node = block || this.root.firstElementChild;
      if (node && /^(FIGURE|DIV|VIDEO)/.test(node.tagName || "")) node.style.textAlign = align;
      this.editor.afterEdit();
    }
    toggleList(kind) {
      this.exec(kind === "ordered" ? "insertOrderedList" : "insertUnorderedList");
    }
    setHeading(tag) {
      const value = tag ? `<${tag}>` : "<p>";
      this.exec("formatBlock", value);
    }
    toggleBlockquote() {
      const range = getRange(this.root);
      const block = closestBlock((range == null ? void 0 : range.commonAncestorContainer) || this.root, this.root);
      if (block && block.tagName === "BLOCKQUOTE") this.exec("formatBlock", "<p>");
      else this.exec("formatBlock", "<blockquote>");
    }
    /** 链接：有选区则包裹，无选区则插入完整 a 标签 */
    createLink({ url, text = "", target = false }) {
      var _a, _b;
      this.editor.focus();
      const range = getRange(this.root);
      const hasSel = range && !range.collapsed;
      const label = text || (hasSel ? range.toString() : url);
      if (hasSel) {
        document.execCommand("createLink", false, url);
        (_b = (_a = range.commonAncestorContainer.parentElement) == null ? void 0 : _a.closest) == null ? void 0 : _b.call(_a, "a");
        this.root.querySelectorAll(`a[href="${cssEscape(url)}"]`).forEach((a) => {
          if (target) {
            a.setAttribute("target", "_blank");
            a.setAttribute("rel", "noopener noreferrer");
          } else {
            a.removeAttribute("target");
          }
        });
      } else {
        const a = h("a", { href: url }, [label]);
        if (target) {
          a.setAttribute("target", "_blank");
          a.setAttribute("rel", "noopener noreferrer");
        }
        insertNode(this.root, a, { inline: true });
      }
      this.editor.afterEdit();
    }
    removeLink() {
      const range = getRange(this.root);
      const anchors = closestAnchors(range, this.root);
      anchors.forEach((node) => node.replaceWith(...node.childNodes));
      this.editor.afterEdit();
    }
    insertTable(cols, rows) {
      const table = document.createElement("table");
      const tbody = document.createElement("tbody");
      for (let r = 0; r < rows; r += 1) {
        const tr = document.createElement("tr");
        for (let c = 0; c < cols; c += 1) {
          const cell = document.createElement(r === 0 ? "th" : "td");
          cell.innerHTML = "<br>";
          tr.appendChild(cell);
        }
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      insertNode(this.root, table);
      this.exec("insertHTML", "");
      this.editor.afterEdit();
    }
    insertCodeBlock(code = "") {
      const pre = document.createElement("pre");
      const codeEl = document.createElement("code");
      codeEl.textContent = code || "// 在这里输入代码";
      pre.appendChild(codeEl);
      insertNode(this.root, pre);
      this.editor.afterEdit();
    }
    insertDivider() {
      const hr = document.createElement("hr");
      insertNode(this.root, hr);
      this.editor.afterEdit();
    }
    insertHTML(html, { clean = true } = {}) {
      const value = clean ? sanitizeHtml(html) : html;
      this.editor.focus();
      const range = getRange(this.root);
      if (range) {
        range.deleteContents();
        const tmp = document.createElement("div");
        tmp.innerHTML = value;
        const frag = document.createDocumentFragment();
        while (tmp.firstChild) frag.appendChild(tmp.firstChild);
        const last = frag.lastChild;
        range.insertNode(frag);
        if (last) {
          const after = document.createRange();
          after.setStartAfter(last.nodeType === 3 ? last : last.lastChild || last);
          after.collapse(true);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(after);
        }
      } else {
        this.root.insertAdjacentHTML("beforeend", value);
      }
      this.editor.afterEdit();
    }
    /** 清除格式：内联样式 + 行内标签 + 段落回归 p */
    clearFormat() {
      this.editor.focus();
      if (this.hasSelection()) {
        document.execCommand("removeFormat");
        document.execCommand("unlink");
        const range = getRange(this.root);
        const block = closestBlock(range == null ? void 0 : range.commonAncestorContainer, this.root);
        if (block && /^(H[1-6]|BLOCKQUOTE|PRE)$/.test(block.tagName)) this.exec("formatBlock", "<p>");
        this.stripInlineStylesInRange(range);
      } else {
        const range = getRange(this.root);
        const block = closestBlock((range == null ? void 0 : range.commonAncestorContainer) || this.root, this.root);
        if (block) {
          const html = block.innerHTML;
          const p = document.createElement("p");
          p.innerHTML = sanitizeHtml(html, { allowEmpty: true });
          p.innerHTML = p.innerHTML.replace(/<(?!br|img)[^>]+>/gi, "");
          block.replaceWith(p);
        }
      }
      this.editor.afterEdit();
    }
    stripInlineStylesInRange(range) {
      if (!range) return;
      const nodes = [];
      const walker = document.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_ELEMENT);
      let node = walker.currentNode;
      while (node) {
        if (range.intersectsNode(node) && node.nodeType === 1) nodes.push(node);
        node = walker.nextNode();
      }
      nodes.forEach((el) => {
        if (el === this.root) return;
        el.removeAttribute("style");
        if (/^(SPAN|FONT)$/.test(el.tagName) && !el.attributes.length) el.replaceWith(...el.childNodes);
      });
    }
    /** 标题 / 段落的当前状态（供工具栏高亮） */
    currentBlock() {
      var _a;
      const range = getRange(this.root);
      const block = closestBlock((range == null ? void 0 : range.commonAncestorContainer) || this.root, this.root);
      return ((_a = block == null ? void 0 : block.tagName) == null ? void 0 : _a.toLowerCase()) || "p";
    }
    currentFontSize() {
      const range = getRange(this.root);
      if (!range) return "";
      let node = range.startContainer;
      while (node && node !== this.root) {
        if (node.nodeType === 1 && node.style.fontSize) return node.style.fontSize.replace("px", "");
        node = node.parentNode;
      }
      return "";
    }
  }
  function closestAnchors(range, root) {
    var _a, _b, _c;
    if (!range) return [];
    const out = /* @__PURE__ */ new Set();
    const start = range.startContainer.nodeType === 1 ? ((_b = (_a = range.startContainer).querySelector) == null ? void 0 : _b.call(_a, "a")) || range.startContainer : range.startContainer;
    let node = start;
    while (node && node !== root) {
      if (node.tagName === "A") out.add(node);
      node = node.parentNode;
    }
    try {
      (_c = range.querySelectorAll) == null ? void 0 : _c.call(range, "a").forEach((a) => out.add(a));
    } catch {
    }
    const container = range.commonAncestorContainer;
    if (container.nodeType === 1) container.querySelectorAll("a").forEach((a) => range.intersectsNode(a) ? out.add(a) : null);
    return [...out];
  }
  function cssEscape(value) {
    var _a;
    return ((_a = window.CSS) == null ? void 0 : _a.escape) ? CSS.escape(value) : String(value).replace(/["\\]/g, "\\$&");
  }
  class History {
    constructor(root, { limit = 60, delay = 400 } = {}) {
      this.root = root;
      this.limit = limit;
      this.delay = delay;
      this.stack = [];
      this.index = -1;
      this.timer = null;
      this.locked = false;
      this.lastHtml = root.innerHTML;
    }
    /** 记录当前状态（首个快照不触发 change） */
    snapshot(immediate = false) {
      clearTimeout(this.timer);
      const push = () => {
        const html = this.root.innerHTML;
        if (html === this.lastHtml) return;
        this.lastHtml = html;
        const point = { html, offset: caretOffset(this.root) };
        this.stack = this.stack.slice(0, this.index + 1);
        this.stack.push(point);
        if (this.stack.length > this.limit) this.stack.shift();
        this.index = this.stack.length - 1;
      };
      if (immediate) push();
      else this.timer = setTimeout(push, this.delay);
    }
    /** 立即落盘挂起的快照 */
    flush() {
      clearTimeout(this.timer);
      this.snapshot(true);
    }
    /** 恢复内容但不产生新快照（用于 undo/redo 自身、源码模式应用） */
    apply(html, offset) {
      this.locked = true;
      this.root.innerHTML = html;
      this.lastHtml = html;
      if (offset !== void 0 && offset !== null) setCaretOffset(this.root, offset);
      this.locked = false;
    }
    canUndo() {
      return this.index > 0;
    }
    canRedo() {
      return this.index >= 0 && this.index < this.stack.length - 1;
    }
    undo() {
      if (!this.canUndo()) return false;
      clearTimeout(this.timer);
      this.index -= 1;
      const point = this.stack[this.index];
      this.apply(point.html, this.currentOffset(point, "undo"));
      this.lastHtml = point.html;
      return true;
    }
    redo() {
      if (!this.canRedo()) return false;
      const point = this.stack[this.index + 1];
      this.index += 1;
      this.apply(point.html, this.currentOffset(point, "redo"));
      this.lastHtml = point.html;
      return true;
    }
    currentOffset(point) {
      const now = caretOffset(this.root);
      return now === null ? point.offset : point.offset;
    }
    reset(html) {
      clearTimeout(this.timer);
      this.stack = [{ html, offset: 0 }];
      this.index = 0;
      this.lastHtml = html;
    }
    destroy() {
      clearTimeout(this.timer);
      this.stack = [];
    }
  }
  const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp|svg|avif)$/i;
  const VIDEO_EXT = /\.(mp4|mov|webm|m4v|ogv|avi|mkv)$/i;
  class MediaManager {
    constructor(editor) {
      this.editor = editor;
      this.options = editor.options;
      this.tasks = /* @__PURE__ */ new Map();
      this.input = null;
    }
    kindOf(file) {
      const type = String(file.type || "");
      const name = String(file.name || "");
      if (type.startsWith("image/") || IMAGE_EXT.test(name)) return "image";
      if (type.startsWith("video/") || VIDEO_EXT.test(name)) return "video";
      return null;
    }
    check(file, kind) {
      if (!kind) return `不支持的文件类型：${file.name || "剪贴板内容"}`;
      const limit = kind === "image" ? this.options.maxImageSize : this.options.maxVideoSize;
      if (limit && file.size > limit) return `${file.name} 超出大小限制（${formatSize(limit)}）`;
      return null;
    }
    pickFiles(kind) {
      if (!this.input) {
        this.input = h("input", { type: "file", multiple: true, style: { display: "none" } });
        this.input.addEventListener("change", () => {
          const files = [...this.input.files || []];
          this.input.value = "";
          this.addFiles(files);
        });
        document.body.appendChild(this.input);
      }
      this.input.accept = kind === "image" ? this.options.imageAccept : this.options.videoAccept;
      this.input.multiple = kind === "image";
      this.input.click();
    }
    async addFiles(files) {
      const accepted = [];
      for (const file of files) {
        const kind = this.kindOf(file);
        const error = this.check(file, kind);
        if (error) this.editor.toast.warn(error);
        else accepted.push({ file, kind });
      }
      for (const item of accepted) await this.upload(item.file, item.kind);
      return accepted.length;
    }
    /** 插入占位并上传，返回结果（失败/取消返回 null） */
    async upload(file, kind) {
      const holder = kind === "image" ? this.createImageHolder() : this.createVideoHolder();
      this.editor.focus();
      insertNode(this.editor.root, holder);
      const task = {
        id: holder.dataset.kId,
        file,
        kind,
        holder,
        ctrl: new AbortController(),
        previewUrl: URL.createObjectURL(file)
      };
      this.tasks.set(task.id, task);
      this.decorateHolder(task);
      const thumb = holder.querySelector("[data-k-preview]");
      if (thumb) thumb.src = task.previewUrl;
      return this.runUpload(task);
    }
    /** 真正的上传流可重试（复用同一个占位块，保证位置不变） */
    async runUpload(task) {
      const editor = this.editor;
      const { holder, file, kind } = task;
      editor.emit("uploadstart", { file, kind });
      editor.refreshStatus();
      let target = file;
      try {
        if (kind === "image") target = await maybeCompress(file, this.options.image);
        const result = await editor.uploader.upload(target, {
          signal: task.ctrl.signal,
          onProgress: (ratio, info) => this.updateProgress(holder, ratio, info, target, task)
        });
        const url = typeof result === "string" ? { url: result } : result;
        if (!(url == null ? void 0 : url.url)) throw new Error("上传结果缺少 url");
        this.finish(task, { ...url, size: target.size });
        editor.emit("uploaddone", { file, kind, url: url.url });
        return url;
      } catch (error) {
        if ((error == null ? void 0 : error.name) === "AbortError") {
          this.remove(task);
          editor.emit("uploadcancel", { file, kind });
          return null;
        }
        this.fail(task, error);
        editor.emit("uploaderror", { file, kind, error });
        editor.toast.error((error == null ? void 0 : error.message) || "上传失败");
        return null;
      } finally {
        ensureEditableTail(editor.root);
        editor.commitHistory();
        editor.refreshStatus();
      }
    }
    createImageHolder() {
      const figure = h("figure", { "data-k-media": "image", "data-k-id": uid("m"), "data-k-state": "uploading", contenteditable: "false" });
      const holder = h("div.ke-media-holder", {}, [
        h("img", { "data-k-preview": "", alt: "", style: { display: "none" } }),
        h("div.ke-media-name", { text: "图片上传中…" }),
        progressRow()
      ]);
      holder.appendChild(this.actionRow());
      figure.appendChild(holder);
      return figure;
    }
    createVideoHolder() {
      const card = h("div.ke-video-card", { "data-k-media": "video", "data-k-id": uid("m"), "data-k-state": "uploading", contenteditable: "false" });
      const body = h("div.ke-video-body", {}, [
        h("div.ke-video-head", {}, [h("span", { text: "视频上传中…" }), h("span.ke-video-size", { text: "" })]),
        progressRow()
      ]);
      body.appendChild(this.actionRow());
      card.appendChild(body);
      return card;
    }
    actionRow() {
      const self2 = this;
      return h("div", {
        "data-k-actions": "",
        style: { display: "flex", alignItems: "center", gap: "8px", width: "100%", marginTop: "2px" },
        onclick: (event) => {
          const holder = event.target.closest("[data-k-id]");
          const task = holder && self2.tasks.get(holder.dataset.kId);
          if (!task) return;
          if (event.target.matches(".ke-media-cancel")) {
            task.ctrl.abort();
            self2.remove(task);
          } else if (event.target.matches(".ke-media-retry")) {
            task.ctrl = new AbortController();
            self2.resetHolder(task);
            self2.runUpload(task);
          }
        }
      }, [h("button.ke-media-cancel", { type: "button", text: "取消" })]);
    }
    /** 文件名 / 大小 / 预览图 */
    decorateHolder(task) {
      const { holder, file } = task;
      const name = holder.querySelector(".ke-media-name");
      if (name) name.textContent = `${file.name || "未命名"}（${formatSize(file.size)}）`;
      const size = holder.querySelector(".ke-video-size");
      if (size) size.textContent = formatSize(file.size);
      const head = holder.querySelector(".ke-video-head span");
      if (head && task.kind === "video") head.textContent = `${file.name || "视频"} 上传中…`;
    }
    resetHolder(task) {
      const holder = task.holder;
      holder.dataset.kState = "uploading";
      const bar = holder.querySelector(".ke-progress i");
      if (bar) {
        bar.style.width = "0%";
        bar.style.background = "";
      }
      const pct = holder.querySelector(".ke-media-pct");
      if (pct) pct.textContent = "0%";
      const actions = holder.querySelector("[data-k-actions]");
      if (actions) actions.innerHTML = '<button class="ke-media-cancel" type="button">取消</button>';
      this.decorateHolder(task);
    }
    updateProgress(holder, ratio, info, file, task) {
      const percent = Math.max(0, Math.min(100, Math.round((ratio || 0) * 100)));
      const bar = holder.querySelector(".ke-progress i");
      if (bar) bar.style.width = `${percent}%`;
      const pct = holder.querySelector(".ke-media-pct");
      if (pct) pct.textContent = `${percent}%`;
      if (task) this.editor.emit("uploadprogress", { file: task.file, kind: task.kind, percent, info });
      const meta = holder.querySelector(".ke-media-meta");
      if (!meta) return;
      let label = meta.querySelector("[data-k-chunks]");
      if (!label) {
        label = h("span", { "data-k-chunks": "", style: { color: "#8a8f99", fontSize: "12px" } });
        meta.insertBefore(label, meta.firstChild);
      }
      if ((info == null ? void 0 : info.chunks) > 1) label.textContent = `${info.chunks} 片 · ${formatSize(info.loaded)}/${formatSize(info.total || file.size)}`;
      else if (info == null ? void 0 : info.speed) label.textContent = `${formatSize(info.speed)}/s`;
    }
    finish(task, result) {
      const { holder, kind, file } = task;
      const url = result.url;
      holder.dataset.kState = "done";
      holder.dataset.kUrl = url;
      holder.innerHTML = "";
      if (kind === "image") {
        const img = h("img", { src: url, alt: altOf(file), "data-k-name": file.name || "", draggable: "false" });
        img.addEventListener("dblclick", () => lightbox(img.src));
        holder.appendChild(img);
      } else {
        const video = h("video", { src: url, controls: "", playsinline: "", preload: "metadata", "data-k-name": file.name || "" });
        const body = h("div.ke-video-body", {}, [
          h("div.ke-video-head", {}, [h("span", { text: file.name || "视频" }), h("span.ke-video-size", { text: formatSize(result.size || file.size) })]),
          video
        ]);
        holder.appendChild(body);
      }
      if (task.previewUrl) URL.revokeObjectURL(task.previewUrl);
      this.tasks.delete(task.id);
      this.editor.refreshStatus();
    }
    fail(task, error) {
      const holder = task.holder;
      holder.dataset.kState = "error";
      const bar = holder.querySelector(".ke-progress i");
      if (bar) bar.style.background = "#e53e3e";
      const actions = holder.querySelector("[data-k-actions]");
      if (actions) {
        actions.innerHTML = "";
        actions.appendChild(h("span.ke-media-error", { text: (error == null ? void 0 : error.message) || "上传失败", style: { marginRight: "auto", fontSize: "12px" } }));
        actions.appendChild(h("button.ke-media-retry", { type: "button", text: "重试" }));
        actions.appendChild(h("button.ke-media-cancel", { type: "button", text: "移除" }));
      }
    }
    remove(task) {
      var _a;
      (_a = task.holder) == null ? void 0 : _a.remove();
      if (task.previewUrl) URL.revokeObjectURL(task.previewUrl);
      this.tasks.delete(task.id);
      ensureEditableTail(this.editor.root);
      this.editor.refreshStatus();
    }
    /** 从 DOM 节点找到对应任务（用于气泡工具条删除） */
    taskFromNode(node) {
      var _a;
      const holder = (_a = node == null ? void 0 : node.closest) == null ? void 0 : _a.call(node, "[data-k-id]");
      return holder ? this.tasks.get(holder.dataset.kId) : null;
    }
    cancelAll() {
      for (const task of [...this.tasks.values()]) {
        task.ctrl.abort();
        this.remove(task);
      }
    }
    /** 从网络链接插入（工具栏「网络链接」入口） */
    insertFromUrl(kind, url, name = "") {
      const node = kind === "image" ? this.insertImageUrl(url, name) : this.insertVideoUrl(url, name || "网络视频");
      this.editor.toast.ok(kind === "image" ? "已插入网络图片" : "已插入网络视频");
      this.editor.emit("insertmedia", { kind, url, node });
      return node;
    }
    insertImageUrl(url, alt = "") {
      const img = h("img", { src: url, alt: alt || "", draggable: "false" });
      img.addEventListener("dblclick", () => lightbox(img.src));
      const figure = h("figure", { "data-k-media": "image", "data-k-state": "done", "data-k-url": url, contenteditable: "false" }, [img]);
      insertNode(this.editor.root, figure);
      this.editor.commitHistory();
      return figure;
    }
    insertVideoUrl(url, label = "视频") {
      const video = h("video", { src: url, controls: "", playsinline: "", preload: "metadata" });
      const card = h("div.ke-video-card", { "data-k-media": "video", "data-k-state": "done", "data-k-url": url, contenteditable: "false" }, [
        h("div.ke-video-body", {}, [h("div.ke-video-head", {}, [h("span", { text: label })]), video])
      ]);
      insertNode(this.editor.root, card);
      this.editor.commitHistory();
      return card;
    }
    destroy() {
      var _a;
      this.cancelAll();
      (_a = this.input) == null ? void 0 : _a.remove();
      this.input = null;
    }
  }
  function altOf(file) {
    return String(file.name || "").replace(/\.[^.]+$/, "");
  }
  function progressRow() {
    return h("div.ke-media-meta", {}, [h("div.ke-progress", {}, [h("i", { style: { width: "0%" } })]), h("span.ke-media-pct", { text: "0%" })]);
  }
  async function maybeCompress(file, options = {}) {
    var _a, _b;
    const compress = options == null ? void 0 : options.compress;
    if (!compress || !/^image\/(jpeg|jpg|png|webp)$/i.test(file.type)) return file;
    const { maxWidth = 1440, quality = 0.85, minSize = 300 * 1024 } = typeof compress === "object" ? compress : {};
    if (file.size < minSize) return file;
    try {
      const bitmap = await createImageBitmap(file);
      if (bitmap.width <= maxWidth) {
        (_a = bitmap.close) == null ? void 0 : _a.call(bitmap);
        return file;
      }
      const canvas = document.createElement("canvas");
      canvas.width = maxWidth;
      canvas.height = Math.round(bitmap.height * maxWidth / bitmap.width);
      canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      (_b = bitmap.close) == null ? void 0 : _b.call(bitmap);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (!blob || blob.size >= file.size) return file;
      return new File([blob], String(file.name).replace(/\.\w+$/, ".jpg"), { type: "image/jpeg", lastModified: file.lastModified });
    } catch {
      return file;
    }
  }
  function fastFingerprint(file) {
    return `${sizeHex(file.size)}-${stampHex(file.lastModified)}-${safeName(file.name)}`;
  }
  async function strongFingerprint(file) {
    var _a;
    if (!((_a = globalThis.crypto) == null ? void 0 : _a.subtle)) return fastFingerprint(file);
    const span = 256 * 1024;
    const parts = [file.slice(0, span)];
    if (file.size > span) parts.push(file.slice(file.size - span));
    const buf = new Uint8Array(parts.reduce((sum, blob) => sum + blob.size, 0));
    let offset = 0;
    for (const blob of parts) {
      const chunk = new Uint8Array(await blob.arrayBuffer());
      buf.set(chunk, offset);
      offset += chunk.length;
    }
    const digest = await crypto.subtle.digest("SHA-256", buf);
    const hex = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 24)}-${sizeHex(file.size)}`;
  }
  const sizeHex = (size) => Number(size).toString(16);
  const stampHex = (ts) => Number(ts || 0).toString(16);
  const safeName = (name) => String(name).replace(/[^\w.-]/g, "").slice(0, 24);
  function createFingerprint(mode = "fast") {
    if (mode === "strong" || mode === "sha256") return strongFingerprint;
    if (typeof mode === "function") return mode;
    return async (file) => fastFingerprint(file);
  }
  const MB$1 = 1024 * 1024;
  class ChunkUploader {
    constructor(adapter, options = {}) {
      if (!adapter || typeof adapter.put !== "function") {
        throw new Error("[KEditor] uploader 需要提供 put() 方法，参见 docs/upload-adapter.md");
      }
      this.adapter = adapter;
      this.chunkSize = Math.max(64 * 1024, options.chunkSize || MB$1);
      this.concurrency = Math.max(1, options.concurrency || 3);
      this.retries = options.retries === void 0 ? 2 : Math.max(0, options.retries);
      this.retryDelay = options.retryDelay ?? 600;
      this.fingerprint = createFingerprint(options.fingerprint || "fast");
      this.slice = options.slice;
    }
    /**
     * @param {File|Blob} file
     * @param {{onProgress?,onChunk?,onInfo?,signal?}} handlers
     * @returns {Promise<{url:string, instant?:boolean, chunks:number, size:number, name:string}>}
     */
    async upload(file, handlers = {}) {
      var _a, _b, _c, _d, _e, _f;
      const { onProgress, onChunk, signal } = handlers;
      if (this.adapter.simple) return this.uploadSimple(file, handlers);
      const total = Math.max(1, Math.ceil(file.size / this.chunkSize));
      const meta = {
        name: file.name || "blob",
        size: file.size,
        type: file.type || guessType(file.name),
        lastModified: file.lastModified || 0,
        fingerprint: await this.fingerprint(file),
        chunkSize: this.chunkSize,
        totalChunks: total
      };
      const init = await ((_b = (_a = this.adapter).init) == null ? void 0 : _b.call(_a, meta, { signal })) || {};
      if (init.url) {
        onProgress == null ? void 0 : onProgress(1, { percent: 100, loaded: file.size, total: file.size, chunks: total, instant: true });
        return { url: init.url, instant: true, chunks: 0, size: file.size, name: meta.name, key: init.key };
      }
      const uploadId = init.uploadId || meta.fingerprint;
      const uploaded = new Set((init.uploadedChunks || init.uploaded || []).map(Number));
      let loadedBytes = 0;
      for (const index of uploaded) loadedBytes += Math.min(this.chunkSize, file.size - index * this.chunkSize);
      const queue = [];
      for (let i = 0; i < total; i += 1) if (!uploaded.has(i)) queue.push(i);
      const chunkResults = new Array(total);
      let doneChunks = uploaded.size;
      const startedAt = Date.now();
      const report = () => {
        const elapsed = (Date.now() - startedAt) / 1e3;
        onProgress == null ? void 0 : onProgress(file.size ? loadedBytes / file.size : 1, {
          percent: Math.min(100, Math.round(loadedBytes / Math.max(1, file.size) * 100)),
          loaded: loadedBytes,
          total: file.size,
          chunks: total,
          uploadedChunks: doneChunks,
          speed: elapsed > 0 ? loadedBytes / elapsed : 0
        });
      };
      report();
      let cursor = 0;
      let firstError = null;
      const worker = async () => {
        while (cursor < queue.length) {
          if (signal == null ? void 0 : signal.aborted) throw new DOMException("已取消上传", "AbortError");
          const index = queue[cursor++];
          const blob = this.slice ? this.slice(file, index, this.chunkSize) : file.slice(index * this.chunkSize, (index + 1) * this.chunkSize);
          let attempt = 0;
          for (; ; ) {
            try {
              const res = await this.adapter.put({
                uploadId,
                index,
                total,
                chunkSize: this.chunkSize,
                blob,
                file,
                meta,
                signal,
                size: blob.size
              });
              if (res == null ? void 0 : res.url) chunkResults[index] = res;
              loadedBytes += blob.size;
              doneChunks += 1;
              onChunk == null ? void 0 : onChunk({ index, total, size: blob.size });
              report();
              break;
            } catch (error) {
              if ((error == null ? void 0 : error.name) === "AbortError") throw error;
              attempt += 1;
              if (attempt > this.retries) {
                firstError = error;
                throw new Error(`分片 ${index + 1}/${total} 上传失败：${(error == null ? void 0 : error.message) || error}`);
              }
              await sleep$1(this.retryDelay * attempt, signal);
            }
          }
        }
      };
      const workers = Array.from({ length: Math.max(1, Math.min(this.concurrency, queue.length)) }, worker);
      try {
        await Promise.all(workers);
      } catch (error) {
        await ((_d = (_c = this.adapter).abort) == null ? void 0 : _d.call(_c, { uploadId, meta, error }).catch(() => {
        }));
        throw error;
      }
      if (firstError) throw firstError;
      const done = await ((_f = (_e = this.adapter).complete) == null ? void 0 : _f.call(_e, { uploadId, meta, total, uploaded: doneChunks, chunkResults, file })) || {};
      const url = done.url;
      if (!url) throw new Error("[KEditor] uploader.complete() 未返回 url");
      return { url, chunks: total, size: file.size, name: meta.name, key: done.key, poster: done.poster, duration: done.duration, raw: done };
    }
    /** 单请求直传（不切片），供对接已有单次上传接口时使用 */
    async uploadSimple(file, handlers = {}) {
      const { onProgress, signal } = handlers;
      const startedAt = Date.now();
      const result = await this.adapter.upload(file, {
        signal,
        onProgress: (loaded, total) => {
          const ratio = total ? loaded / total : 0;
          const elapsed = (Date.now() - startedAt) / 1e3;
          onProgress == null ? void 0 : onProgress(ratio, { percent: Math.round(ratio * 100), loaded, total: total || file.size, chunks: 1, uploadedChunks: ratio >= 1 ? 1 : 0, speed: elapsed > 0 ? loaded / elapsed : 0 });
        }
      });
      const url = typeof result === "string" ? result : result == null ? void 0 : result.url;
      if (!url) throw new Error("[KEditor] uploader.upload() 未返回 url");
      return { url, chunks: 1, size: file.size, name: file.name, key: typeof result === "object" ? result.key : void 0, raw: result };
    }
    destroy() {
      var _a, _b;
      (_b = (_a = this.adapter).destroy) == null ? void 0 : _b.call(_a);
    }
  }
  const sleep$1 = (ms, signal) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal == null ? void 0 : signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("已取消上传", "AbortError"));
    };
    signal == null ? void 0 : signal.addEventListener("abort", onAbort, { once: true });
  });
  function guessType(name = "") {
    var _a;
    const ext = (_a = String(name).split(".").pop()) == null ? void 0 : _a.toLowerCase();
    const map = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml", mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm", m4v: "video/x-m4v" };
    return map[ext] || "application/octet-stream";
  }
  function simpleAdapter(fn) {
    return {
      simple: true,
      async upload(file, ctx = {}) {
        const res = await fn(toFile(file), ctx);
        return typeof res === "string" ? { url: res } : res;
      }
    };
  }
  function toFile(blob, name = "blob", type = blob.type) {
    if (blob instanceof File) return blob;
    return new File([blob], name, { type });
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const jitter = (base, ratio = 0.4) => base * (1 - ratio + Math.random() * ratio * 2);
  function mockAdapter(options = {}) {
    const {
      latency = 160,
      // 每个分片的固定网络往返（ms）
      speed = 12,
      // 模拟带宽 MB/s
      onEvent = null,
      // (type, payload) => void，演示面板可打印日志
      reuseObjectUrl = true,
      failFirstChunk = false
      // 打开后可直观看到自动重试效果
    } = options;
    const finished = /* @__PURE__ */ new Map();
    const sessions = /* @__PURE__ */ new Map();
    const objectUrls = /* @__PURE__ */ new Map();
    let failOnce = failFirstChunk;
    const emit = (type, payload) => onEvent == null ? void 0 : onEvent(type, { ...payload, at: Date.now() });
    return {
      name: "mock",
      async init(meta) {
        emit("init", meta);
        await sleep(120);
        const hit = finished.get(meta.fingerprint);
        if (hit) {
          emit("instant", { name: meta.name, url: hit.url });
          return { url: hit.url, key: meta.fingerprint, instant: true };
        }
        const session = sessions.get(meta.fingerprint) || /* @__PURE__ */ new Set();
        sessions.set(meta.fingerprint, session);
        return { uploadId: meta.fingerprint, uploadedChunks: [...session] };
      },
      async put({ uploadId, index, total, size, blob }) {
        if (failOnce && index === 0) {
          failOnce = false;
          emit("chunk-error", { index, total, message: "mock: 模拟首个分片网络异常" });
          const error = new Error("mock: 模拟首个分片网络异常");
          error.retryable = true;
          throw error;
        }
        const cost = Math.max(40, jitter(latency + size / (speed * 1024 / 8) / 8, 0.35));
        await sleep(cost);
        const session = sessions.get(uploadId) || /* @__PURE__ */ new Set();
        session.add(index);
        sessions.set(uploadId, session);
        emit("chunk", { index, total, size, blobSize: blob == null ? void 0 : blob.size });
        return { etag: `${uploadId}-${index}` };
      },
      async complete({ uploadId, meta, file }) {
        await sleep(140);
        let url = objectUrls.get(meta.fingerprint);
        if (!url || !reuseObjectUrl) {
          const blob = file instanceof File ? file : new File([file], meta.name, { type: meta.type });
          url = URL.createObjectURL(blob);
          objectUrls.set(meta.fingerprint, url);
        }
        finished.set(meta.fingerprint, { url, name: meta.name, size: meta.size, type: meta.type });
        sessions.delete(uploadId);
        emit("complete", { name: meta.name, url, chunks: meta.totalChunks, size: meta.size });
        return { url, key: meta.fingerprint };
      },
      async abort({ uploadId }) {
        emit("abort", { uploadId });
      },
      /** 已完成的上传记录（演示用） */
      list: () => [...finished.entries()].map(([key, value]) => ({ key, ...value })),
      reset: () => {
        finished.clear();
        sessions.clear();
      }
    };
  }
  function httpAdapter(config = {}) {
    const {
      initUrl,
      chunkUrl,
      completeUrl,
      abortUrl,
      mode = "raw",
      fieldName = "file",
      headers = {},
      withCredentials = false,
      parse = (json) => (json == null ? void 0 : json.data) || json || {},
      chunkUrlFor
    } = config;
    const headerOf = () => typeof headers === "function" ? headers() || {} : headers || {};
    const request = async (url, init = {}) => {
      const res = await fetch(url, { credentials: withCredentials ? "include" : "same-origin", ...init });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const text = await res.text();
      if (!text) return {};
      try {
        return parse(JSON.parse(text));
      } catch {
        throw new Error(`服务端返回非 JSON 数据：${text.slice(0, 80)}`);
      }
    };
    return {
      name: "http",
      async init(meta, { signal }) {
        if (!initUrl) throw new Error("[KEditor] httpAdapter 缺少 initUrl");
        return request(
          initUrl,
          {
            method: "POST",
            signal,
            headers: { "Content-Type": "application/json", ...headerOf() },
            body: JSON.stringify({
              fileName: meta.name,
              fileSize: meta.size,
              fileType: meta.type,
              lastModified: meta.lastModified,
              identifier: meta.fingerprint,
              chunkSize: meta.chunkSize,
              totalChunks: meta.totalChunks
            })
          }
        );
      },
      async put({ uploadId, index, total, blob, meta, signal }) {
        if (!chunkUrl) throw new Error("[KEditor] httpAdapter 缺少 chunkUrl");
        const url = typeof chunkUrlFor === "function" ? chunkUrlFor({ uploadId, index }) : chunkUrl;
        if (mode === "formdata") {
          const form = new FormData();
          form.append(fieldName, blob, `${meta.name}.part${index}`);
          form.append("uploadId", uploadId);
          form.append("identifier", meta.fingerprint);
          form.append("index", String(index));
          form.append("total", String(total));
          form.append("filename", meta.name);
          return request(url, { method: "POST", body: form, signal, headers: headerOf() });
        }
        const joiner = url.includes("?") ? "&" : "?";
        const target = `${url}${joiner}uploadId=${encodeURIComponent(uploadId)}&index=${index}&total=${total}&filename=${encodeURIComponent(meta.name)}`;
        return request(target, {
          method: "PUT",
          body: blob,
          signal,
          headers: { "Content-Type": "application/octet-stream", "X-Chunk-Index": String(index), ...headerOf() }
        });
      },
      async complete({ uploadId, meta, total }) {
        if (!completeUrl) throw new Error("[KEditor] httpAdapter 缺少 completeUrl");
        return request(
          completeUrl,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", ...headerOf() },
            body: JSON.stringify({ uploadId, identifier: meta.fingerprint, fileName: meta.name, fileSize: meta.size, fileType: meta.type, chunkSize: meta.chunkSize, totalChunks: total })
          }
        );
      },
      async abort({ uploadId }) {
        if (!abortUrl) return;
        await request(abortUrl, { method: "POST", headers: { "Content-Type": "application/json", ...headerOf() }, body: JSON.stringify({ uploadId }) }).catch(() => {
        });
      }
    };
  }
  function createUploader(option = "mock", config = {}) {
    if (option instanceof ChunkUploader) return option;
    if (typeof option === "function" && !option.put) return new ChunkUploader(simpleAdapter(option), config);
    if (option && typeof option === "object" && !(option instanceof ChunkUploader)) {
      if (typeof option.put === "function" || typeof option.upload === "function") return new ChunkUploader(option, { ...config, ...pick(option) });
      if (option.type === "http") return new ChunkUploader(httpAdapter(option), { ...config, ...pick(option) });
    }
    return new ChunkUploader(mockAdapter(typeof option === "object" ? option : {}), config);
  }
  const pick = (obj) => {
    const out = {};
    for (const key of ["chunkSize", "concurrency", "retries", "fingerprint"]) if (obj[key] !== void 0) out[key] = obj[key];
    return out;
  };
  function attachPaste(editor) {
    editor.root.addEventListener("paste", async (event) => {
      if (editor.readOnly || !editor.options.paste.enabled) return;
      const dt = event.clipboardData;
      if (!dt) return;
      event.preventDefault();
      const files = filesFromDataTransfer(dt);
      if (files.length) {
        if (editor.options.paste.uploadFiles) {
          await editor.media.addFiles(files);
          editor.toast.show(`已上传 ${files.length} 个文件`);
        } else {
          editor.toast.warn("当前配置不允许粘贴上传文件");
        }
        return;
      }
      const html = dt.getData("text/html");
      const text = dt.getData("text/plain");
      if (html && editor.options.paste.clean) {
        let clean = isWordHtml(html) ? cleanWordHtml(html) : html;
        clean = sanitizeHtml(clean, { allowEmpty: true });
        if (editor.options.paste.localizeImages) clean = await localizeImages(editor, clean);
        editor.commands.insertHTML(clean, { clean: false });
        if (isWordHtml(html)) editor.toast.show("已清理 Word/WPS 格式");
      } else if (text) {
        const htmlText = text.split(/\r?\n/).map((line) => `<p>${escapeHtml(line) || "<br>"}</p>`).join("");
        editor.commands.insertHTML(htmlText, { clean: false });
      }
    });
  }
  function filesFromDataTransfer(dt) {
    var _a, _b;
    const out = [];
    if ((_a = dt.items) == null ? void 0 : _a.length) {
      for (const item of dt.items) {
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) out.push(normalizePastedFile(file, out.length));
        }
      }
    }
    if (!out.length && ((_b = dt.files) == null ? void 0 : _b.length)) out.push(...Array.from(dt.files).map((file, i) => normalizePastedFile(file, i)));
    return out;
  }
  function normalizePastedFile(file, index) {
    if (file.name && file.name !== "image.png") return file;
    const ext = (file.type.split("/")[1] || "png").replace("jpeg", "jpg").replace("+xml", "");
    const stamp = (/* @__PURE__ */ new Date()).toISOString().slice(11, 19).replace(/:/g, "");
    return new File([file], `pasted-${stamp}-${index}.${ext}`, { type: file.type, lastModified: file.lastModified });
  }
  function attachDrop(editor) {
    const zone = editor.root;
    let depth = 0;
    const hasFiles = (event) => {
      var _a;
      return Array.from(((_a = event.dataTransfer) == null ? void 0 : _a.types) || []).includes("Files");
    };
    zone.addEventListener("dragenter", (event) => {
      if (!hasFiles(event) || editor.readOnly) return;
      event.preventDefault();
      depth += 1;
      editor.el.classList.add("ke-is-dragover");
    });
    zone.addEventListener("dragover", (event) => {
      if (!hasFiles(event) || editor.readOnly) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    });
    zone.addEventListener("dragleave", (event) => {
      if (!hasFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) editor.el.classList.remove("ke-is-dragover");
    });
    zone.addEventListener("drop", async (event) => {
      if (!hasFiles(event) || editor.readOnly) return;
      event.preventDefault();
      depth = 0;
      editor.el.classList.remove("ke-is-dragover");
      placeCaretAtPoint(editor, event);
      const files = [...event.dataTransfer.files || []];
      if (!files.length) return;
      if (editor.options.paste.uploadFiles) {
        const count = await editor.media.addFiles(files);
        if (count) editor.toast.show(`已上传 ${count} 个文件`);
      }
    });
  }
  function placeCaretAtPoint(editor, event) {
    let range = null;
    if (document.caretRangeFromPoint) range = document.caretRangeFromPoint(event.clientX, event.clientY);
    else if (document.caretPositionFromPoint) {
      const pos = document.caretPositionFromPoint(event.clientX, event.clientY);
      if (pos) {
        range = document.createRange();
        range.setStart(pos.offsetNode, pos.offset);
        range.collapse(true);
      }
    }
    if (range && editor.root.contains(range.commonAncestorContainer)) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      editor.focus();
    }
  }
  async function localizeImages(editor, html) {
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
    const imgs = [...doc.body.querySelectorAll("img")].filter((img) => /^https?:/i.test(img.getAttribute("src") || ""));
    for (const img of imgs) {
      try {
        const res = await fetch(img.src, { mode: "cors" });
        if (!res.ok) continue;
        const blob = await res.blob();
        const file = new File([blob], img.alt || `remote-${Date.now()}.jpg`, { type: blob.type || "image/jpeg" });
        const result = await editor.media.upload(file, "image");
        img.remove();
        if (result == null ? void 0 : result.url) editor.toast.show("外链图片已本地化");
      } catch {
      }
    }
    return doc.body.innerHTML.trim();
  }
  const KB = 1024;
  const MB = 1024 * KB;
  const defaults = {
    value: "",
    placeholder: "开始撰写内容，支持拖拽 / 粘贴图片与视频…",
    height: 460,
    // 编辑区可视高度（px），0 = 自适应
    minHeight: 320,
    primaryColor: "#07c160",
    paperWidth: 677,
    // 版心基准宽度：窄屏上限、宽屏最小宽度
    /** 版心宽度模式：'fluid' 宽屏随容器生长（两侧留白恒定）| 'fixed' 恒定版心 */
    paperMode: "fluid",
    paperGap: 24,
    // fluid 模式下单侧留白（px）
    paperMaxWidth: 0,
    // fluid 模式下版心最大宽度，0 = 不限
    toolbar: DEFAULT_TOOLBAR,
    /** 自定义工具栏按钮（下拉选择，数据可静态配置或从接口读取） */
    customButtons: [],
    hideToolbar: false,
    hideStatusbar: false,
    readOnly: false,
    autofocus: false,
    maxLength: 0,
    // 0 表示不限制
    wordCount: true,
    sanitize: true,
    historyLimit: 60,
    uploader: "mock",
    // 'mock' | {type:'http', ...} | adapter | fn | ChunkUploader
    upload: { chunkSize: MB, concurrency: 3, retries: 2, fingerprint: "fast" },
    image: { compress: { maxWidth: 1440, quality: 0.85, minSize: 300 * KB } },
    maxImageSize: 20 * MB,
    maxVideoSize: 512 * MB,
    imageAccept: "image/png,image/jpeg,image/gif,image/webp,image/bmp,image/svg+xml,image/avif",
    videoAccept: "video/mp4,video/quicktime,video/webm,video/x-m4v,video/ogg",
    paste: { enabled: true, clean: true, uploadFiles: true, localizeImages: false },
    onChange: null,
    onReady: null,
    onError: null,
    onUpload: null,
    // ({stage, file, kind, url, percent, info}) => void
    beforeUpload: null,
    // (file, kind) => File | false
    toolbarFloat: false
  };
  let instanceSeq = 0;
  class KEditor {
    constructor(target, options = {}) {
      injectStyle();
      this.options = mergeOptions(options);
      this.id = `ke-${instanceSeq += 1}`;
      this.el = resolveTarget(target, this.id);
      this.el.__keditor__ = this;
      const hostHTML = this.el.innerHTML;
      this.emitters = /* @__PURE__ */ new Map();
      this.domListeners = [];
      this.destroyed = false;
      this.sourceMode = false;
      this.previewMode = false;
      this.fullscreen = false;
      this.readOnly = false;
      this.buildDOM();
      this.toast = new Toast();
      this.popover = new Popover(this.el);
      this.commands = new Commands(this);
      this.uploader = createUploader(this.options.uploader, this.options.upload);
      this.media = createMedia(this);
      this.history = new History(this.root, { limit: this.options.historyLimit });
      this.toolbar = new Toolbar(this, this.options.toolbar, this.options.customButtons);
      this.source = new SourcePanel(this);
      this.previewPanel = new PreviewOverlay(this);
      this.bubble = new MediaBubble(this);
      this.mainEl.append(this.source.el, this.previewPanel.el);
      this.applyTheme();
      this.setContent(this.options.value || hostHTML, { sanitize: this.options.sanitize, silent: true });
      this.bindEvents();
      this.setReadOnly(this.options.readOnly);
      this.refresh();
      this.refreshStatus();
      this.history.reset(this.root.innerHTML);
      queueMicrotask(() => {
        var _a, _b;
        if (this.destroyed) return;
        this.emit("ready", { editor: this });
        (_b = (_a = this.options).onReady) == null ? void 0 : _b.call(_a, this);
        if (this.options.autofocus) this.focus();
      });
    }
    /* ------------------------------ DOM ------------------------------ */
    buildDOM() {
      this.el.classList.add("ke");
      this.el.id = this.el.id || this.id;
      this.el.innerHTML = "";
      this.tbEl = h("div.ke-tb", { role: "toolbar", "aria-label": "编辑器工具栏" });
      this.scrollEl = h("div.ke-scroll");
      this.paperEl = h("div.ke-paper");
      this.root = h("div.ke-content", {
        contenteditable: this.readOnly ? "false" : "true",
        role: "textbox",
        "aria-multiline": "true",
        spellcheck: "false",
        "data-placeholder": this.options.placeholder,
        "data-ke-root": ""
      });
      this.root.style.minHeight = `${this.options.minHeight}px`;
      this.paperEl.appendChild(this.root);
      this.scrollEl.appendChild(this.paperEl);
      this.mainEl = h("div.ke-main", {}, [this.scrollEl]);
      this.statusEl = buildStatusbar(this);
      this.dropzoneEl = h("div.ke-dropzone", {}, [h("span", { text: "松开即可上传（分片传输）" })]);
      if (!this.options.hideToolbar) this.el.appendChild(this.tbEl);
      this.el.appendChild(this.mainEl);
      if (!this.options.hideStatusbar) this.el.appendChild(this.statusEl);
      this.el.appendChild(this.dropzoneEl);
      if (this.options.height) {
        this.scrollEl.style.height = `${this.options.height}px`;
        this.scrollEl.style.maxHeight = `${this.options.height}px`;
      }
      this.paperEl.style.setProperty("--ke-min-height", `${this.options.minHeight}px`);
      this.applyPaper();
    }
    /** 版心尺寸：宽屏下默认让版心随容器生长，两侧只保留固定留白 */
    applyPaper() {
      const { paperWidth, paperMode, paperGap, paperMaxWidth } = this.options;
      this.paperEl.style.setProperty("--ke-paper", `${paperWidth}px`);
      this.paperEl.style.setProperty("--ke-paper-gap", `${paperGap}px`);
      if (paperMaxWidth > 0) this.paperEl.style.setProperty("--ke-paper-max", `${paperMaxWidth}px`);
      else this.paperEl.style.removeProperty("--ke-paper-max");
      this.paperEl.classList.toggle("ke-is-fluid", paperMode !== "fixed");
    }
    /** 运行时调整版心：{width, mode, gap, maxWidth}（mode: 'fluid' | 'fixed'） */
    setPaper(config = {}) {
      if (config.width !== void 0) this.options.paperWidth = clamp$1(Number(config.width) || 0, 200, 8e3);
      if (config.mode !== void 0) this.options.paperMode = config.mode === "fixed" ? "fixed" : "fluid";
      if (config.gap !== void 0) this.options.paperGap = clamp$1(Number(config.gap) || 0, 0, 600);
      if (config.maxWidth !== void 0) this.options.paperMaxWidth = Math.max(0, Number(config.maxWidth) || 0);
      this.applyPaper();
      return { ...this.paperOptions() };
    }
    paperOptions() {
      const { paperWidth, paperMode, paperGap, paperMaxWidth } = this.options;
      return { width: paperWidth, mode: paperMode, gap: paperGap, maxWidth: paperMaxWidth };
    }
    applyTheme() {
      if (this.options.primaryColor) this.el.style.setProperty("--ke-primary", this.options.primaryColor);
    }
    /* ------------------------------ 事件 ------------------------------ */
    bindEvents() {
      const debouncedChange = debounce(() => this.emitChange(), 160);
      this.bind(this.root, "input", () => {
        this.history.snapshot();
        this.refreshStatus();
        this.togglePlaceholder();
        debouncedChange();
        this.enforceMaxLength();
      });
      this.bind(this.root, "keydown", (event) => this.handleKeydown(event));
      this.bind(this.root, "blur", () => {
        this.history.flush();
        this.el.classList.remove("ke-is-focus");
        this.emit("blur");
      });
      this.bind(this.root, "focus", () => {
        this.el.classList.add("ke-is-focus");
        this.emit("focus");
      });
      this.bind(this.root, "click", (event) => this.handleContentClick(event));
      this.bind(this.root, "dblclick", (event) => {
        const img = event.target.closest("img");
        if (img && this.root.contains(img)) lightbox(img.src);
      });
      attachPaste(this);
      attachDrop(this);
      this.selectionHandler = () => {
        if (!this.root.contains(document.activeElement) && document.activeElement !== this.root) return;
        this.refresh();
        this.syncBubble();
      };
      document.addEventListener("selectionchange", this.selectionHandler);
      this.scrollHandler = () => this.bubble.position();
      this.bind(this.scrollEl, "scroll", this.scrollHandler);
      window.addEventListener("resize", this.scrollHandler);
    }
    /** 内部 DOM 事件登记，便于 destroy 时统一清理 */
    bind(node, type, handler) {
      node.addEventListener(type, handler);
      this.domListeners.push({ node, type, handler });
      return handler;
    }
    handleKeydown(event) {
      const meta = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      if (meta && key === "z") {
        event.preventDefault();
        if (event.shiftKey) this.redo();
        else this.undo();
        return;
      }
      if (meta && key === "y") {
        event.preventDefault();
        this.redo();
        return;
      }
      if (meta && ["b", "i", "u"].includes(key)) {
        event.preventDefault();
        this.commands.toggleMark({ b: "bold", i: "italic", u: "underline" }[key]);
        this.refresh();
        return;
      }
      if (meta && event.shiftKey && key === "k") {
        event.preventDefault();
        this.toggleSource();
        return;
      }
      if (meta && key === "k") {
        event.preventDefault();
        this.toolbar.openLink();
        return;
      }
      if (meta && key === "s") {
        event.preventDefault();
        this.emit("save", { html: this.getHTML() });
        return;
      }
      if (event.key === "Escape") {
        this.popover.close();
        this.bubble.hide();
        if (this.previewMode) this.closePreview();
        return;
      }
      if (event.key === "Backspace" || event.key === "Delete") {
        const selected = this.bubble.node;
        if (selected) {
          event.preventDefault();
          this.bubble.remove();
        }
      }
    }
    handleContentClick(event) {
      const media = event.target.closest("[data-k-media]");
      if (media && this.root.contains(media)) {
        this.selectMedia(media);
        return;
      }
      this.clearMediaSelection();
      this.bubble.hide();
    }
    selectMedia(node) {
      this.clearMediaSelection();
      node.classList.add("ke-is-selected-media");
      this.bubble.show(node);
      this.refreshStatus();
    }
    clearMediaSelection() {
      this.root.querySelectorAll(".ke-is-selected-media").forEach((n) => n.classList.remove("ke-is-selected-media"));
      this.bubble.hide();
    }
    syncBubble() {
      if (!this.bubble.node || !this.root.contains(this.bubble.node)) this.bubble.hide();
      else this.bubble.position();
    }
    /* ------------------------------ 状态 ------------------------------ */
    getState() {
      var _a, _b, _c;
      const range = getRange(this.root);
      const block = closestBlock((range == null ? void 0 : range.commonAncestorContainer) || this.root, this.root);
      const anchor = range ? findAnchor(range, this.root) : null;
      const media = (_a = this.bubble) == null ? void 0 : _a.node;
      const mediaImg = media && ((_b = media.dataset) == null ? void 0 : _b.kMedia) === "image" ? media.querySelector("img") : null;
      const align = mediaImg ? getMediaAlign(mediaImg) : currentAlign(range, block);
      return {
        bold: this.queryState("bold"),
        italic: this.queryState("italic"),
        underline: this.queryState("underline"),
        strikeThrough: this.queryState("strikeThrough"),
        ul: this.queryState("insertUnorderedList"),
        ol: this.queryState("insertOrderedList"),
        align,
        block: ((_c = block == null ? void 0 : block.tagName) == null ? void 0 : _c.toLowerCase()) || "p",
        fontSize: this.commands.currentFontSize(),
        linkUrl: anchor ? anchor.getAttribute("href") : "",
        linkTarget: anchor ? anchor.getAttribute("target") === "_blank" : false,
        selectionText: range ? range.toString() : "",
        canUndo: this.history.canUndo(),
        canRedo: this.history.canRedo(),
        source: this.sourceMode,
        preview: this.previewMode,
        fullscreen: this.fullscreen,
        readOnly: this.readOnly
      };
    }
    queryState(command) {
      var _a;
      if (!this.root.contains(((_a = window.getSelection()) == null ? void 0 : _a.anchorNode) || null)) return false;
      try {
        return document.queryCommandState(command);
      } catch {
        return false;
      }
    }
    refresh() {
      if (this.destroyed) return;
      try {
        this.toolbar.refresh(this.getState());
      } catch {
      }
    }
    refreshStatus() {
      const api = this.statusApi;
      if (api) api.update(this.counts());
    }
    counts() {
      const text = toPlainText(this.root.innerHTML);
      return {
        chars: text.replace(/\s/g, "").length,
        words: countWords(text),
        images: this.root.querySelectorAll("img").length,
        videos: this.root.querySelectorAll('[data-k-media="video"] video, video').length,
        uploading: this.media ? this.media.tasks.size : 0
      };
    }
    togglePlaceholder() {
      const empty = !this.root.textContent.trim() && !this.root.querySelector("img,video,hr,table,iframe");
      this.root.classList.toggle("ke-is-empty", empty);
    }
    enforceMaxLength() {
      var _a, _b;
      const max = this.options.maxLength;
      if (!max) return;
      const { chars } = this.counts();
      if (chars > max) {
        this.toast.warn(`已超过建议字数 ${max}`);
        (_a = this.statusEl) == null ? void 0 : _a.classList.add("ke-is-over");
      } else {
        (_b = this.statusEl) == null ? void 0 : _b.classList.remove("ke-is-over");
      }
    }
    /* ------------------------------ 内容 API ------------------------------ */
    getHTML({ clean = true } = {}) {
      const html = this.root.innerHTML;
      if (!clean) return html;
      return exportHtml(html);
    }
    getText() {
      return toPlainText(this.root.innerHTML);
    }
    getJSON() {
      return { html: this.getHTML(), text: this.getText(), counts: this.counts() };
    }
    setContent(html, { sanitize = this.options.sanitize, silent = false } = {}) {
      const value = sanitizeHtml(html || "<p><br></p>", { allowEmpty: true });
      this.root.innerHTML = value || "<p><br></p>";
      this.afterEdit({ silent });
      if (!silent) this.history.snapshot(true);
      this.togglePlaceholder();
      return this;
    }
    appendHTML(html) {
      const range = document.createRange();
      range.selectNodeContents(this.root);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      this.commands.insertHTML(html);
      return this;
    }
    clear() {
      this.media.cancelAll();
      this.setContent("<p><br></p>");
      this.focus();
      return this;
    }
    afterEdit({ silent = false } = {}) {
      this.history.snapshot();
      this.refreshStatus();
      this.togglePlaceholder();
      if (!silent) this.emitChange();
    }
    commitHistory() {
      this.history.snapshot(true);
      this.refreshStatus();
      this.emitChange();
    }
    emitChange() {
      var _a, _b;
      this.emit("change", { html: this.getHTML(), text: this.getText() });
      (_b = (_a = this.options).onChange) == null ? void 0 : _b.call(_a, this.getHTML(), this);
    }
    focus() {
      if (this.readOnly || this.sourceMode) {
        if (this.sourceMode) this.source.code.focus();
        return this;
      }
      this.root.focus();
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || !this.root.contains(sel.anchorNode)) {
        const range = document.createRange();
        const first2 = this.root.firstElementChild || this.root;
        range.selectNodeContents(first2);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      return this;
    }
    blur() {
      this.root.blur();
      return this;
    }
    /** 打开面板前记录选区（面板内的输入框会抢走焦点） */
    saveSelection() {
      const range = getRange(this.root);
      this.savedRange = range ? range.cloneRange() : null;
      return this;
    }
    /** 执行面板动作前还原选区，无有效选区时退化为 focus() 的兜底 */
    restoreSelection() {
      this.root.focus();
      const sel = window.getSelection();
      if (this.savedRange && this.root.contains(this.savedRange.startContainer) && this.root.contains(this.savedRange.endContainer)) {
        sel.removeAllRanges();
        sel.addRange(this.savedRange);
        return this;
      }
      return this.focus();
    }
    setReadOnly(value) {
      this.readOnly = !!value;
      this.root.setAttribute("contenteditable", this.readOnly ? "false" : "true");
      this.el.classList.toggle("ke-is-readonly", this.readOnly);
      this.refresh();
      return this;
    }
    undo() {
      this.history.flush();
      if (!this.history.undo()) {
        this.toast.show("没有可撤销的操作");
        return this;
      }
      this.afterEdit({ silent: false });
      this.refresh();
      return this;
    }
    redo() {
      if (!this.history.redo()) {
        this.toast.show("没有可重做的操作");
        return this;
      }
      this.afterEdit();
      this.refresh();
      return this;
    }
    /* ------------------------------ 媒体快捷入口 ------------------------------ */
    /** 上传任意文件（自动识别图片/视频），等价于点击工具栏上传 */
    upload(file, kind = this.media.kindOf(file)) {
      if (!kind) throw new Error("[KEditor] 不支持的文件类型");
      return this.media.upload(file, kind);
    }
    /** 以 URL 插入图片 */
    insertImage(url, alt = "") {
      return this.media.insertImageUrl(url, alt);
    }
    /** 以 URL 插入视频 */
    insertVideo(url, label = "视频") {
      return this.media.insertVideoUrl(url, label);
    }
    /** 取消全部进行中的上传 */
    cancelUploads() {
      this.media.cancelAll();
      return this;
    }
    /* ------------------------------ 自定义工具栏按钮 ------------------------------ */
    /** 运行时新增自定义按钮（下拉选择 / 普通按钮），返回按钮 DOM */
    addButton(spec, options) {
      return this.toolbar.addButton(spec, options);
    }
    /** 运行时移动任意按钮位置（内置或自定义）；where 同 spec.position 语义 */
    moveButton(name, where) {
      return this.toolbar.moveButton(name, where);
    }
    /** 移除自定义按钮，并中断其未完成的接口请求 */
    removeButton(name) {
      return this.toolbar.removeButton(name);
    }
    /** 外部灌入下拉数据（接口在编辑器之外请求时使用），返回规范化后的列表 */
    setButtonOptions(name, items) {
      return this.toolbar.setButtonOptions(name, items);
    }
    /** 读取 / 设置下拉按钮当前选中项 */
    getButtonValue(name) {
      return this.toolbar.getButtonValue(name);
    }
    setButtonValue(name, value) {
      return this.toolbar.setButtonValue(name, value);
    }
    /** 统一错误上报：toast 提示 + emit('error') + options.onError */
    reportError(type, error) {
      var _a, _b, _c;
      const message = error && error.message ? error.message : String(error);
      const payload = { type, error: error instanceof Error ? error : new Error(message), message };
      (_a = this.toast) == null ? void 0 : _a.error(message);
      this.emit("error", payload);
      (_c = (_b = this.options).onError) == null ? void 0 : _c.call(_b, payload);
      return this;
    }
    /* ------------------------------ 面板 ------------------------------ */
    toggleSource() {
      if (this.sourceMode) this.exitSource();
      else this.enterSource();
      return this.sourceMode;
    }
    enterSource() {
      if (this.sourceMode) return;
      this.history.flush();
      this.sourceMode = true;
      this.el.classList.add("ke-is-source");
      this.clearMediaSelection();
      this.source.show(this.getHTML({ clean: true }));
      this.previewPanel.hide();
      this.previewMode = false;
      this.refresh();
      this.emit("sourcechange", { mode: "source" });
    }
    exitSource() {
      if (!this.sourceMode) return;
      this.source.apply({ silent: true });
      this.sourceMode = false;
      this.el.classList.remove("ke-is-source");
      this.source.hide();
      this.focus();
      this.refresh();
      this.emit("sourcechange", { mode: "visual" });
    }
    togglePreview() {
      if (this.previewMode) this.closePreview();
      else this.openPreview();
      return this.previewMode;
    }
    openPreview() {
      this.previewMode = true;
      this.previewPanel.show(previewHtml(this.getHTML()));
      this.refresh();
    }
    closePreview() {
      this.previewMode = false;
      this.previewPanel.hide();
      this.refresh();
    }
    toggleFullscreen() {
      this.fullscreen = !this.fullscreen;
      this.el.classList.toggle("ke-is-fullscreen", this.fullscreen);
      document.body.style.overflow = this.fullscreen ? "hidden" : "";
      this.refresh();
      return this.fullscreen;
    }
    /* ------------------------------ 事件总线 ------------------------------ */
    /** 订阅编辑器事件：ready / change / focus / blur / save / uploadstart / uploaddone / uploaderror / uploadcancel / sourcechange */
    on(type, handler) {
      return this.addListener(type, handler);
    }
    off(type, handler) {
      return this.removeListener(type, handler);
    }
    emit(type, payload = {}) {
      var _a, _b, _c, _d;
      const list = this.emitters.get(type) || [];
      for (const handler of list) {
        try {
          handler(payload);
        } catch (error) {
          (_b = (_a = this.options).onError) == null ? void 0 : _b.call(_a, error);
        }
      }
      if (type.startsWith("upload")) (_d = (_c = this.options).onUpload) == null ? void 0 : _d.call(_c, { stage: type, ...payload });
      return this;
    }
    addListener(type, handler) {
      if (!this.emitters.has(type)) this.emitters.set(type, []);
      this.emitters.get(type).push(handler);
      return () => this.removeListener(type, handler);
    }
    removeListener(type, handler) {
      const list = this.emitters.get(type) || [];
      const idx = list.indexOf(handler);
      if (idx >= 0) list.splice(idx, 1);
      return this;
    }
    /* 兼容别名 */
    get element() {
      return this.root;
    }
    get editorElement() {
      return this.el;
    }
    destroy() {
      if (this.destroyed) return;
      this.destroyed = true;
      this.media.destroy();
      this.history.destroy();
      this.popover.destroy();
      this.source.destroy();
      this.previewPanel.destroy();
      this.bubble.destroy();
      this.toolbar.destroy();
      this.toast.destroy();
      for (const { node, type, handler } of this.domListeners) node.removeEventListener(type, handler);
      document.removeEventListener("selectionchange", this.selectionHandler);
      this.scrollEl.removeEventListener("scroll", this.scrollHandler);
      window.removeEventListener("resize", this.scrollHandler);
      if (this.fullscreen) document.body.style.overflow = "";
      if (this.el.__keditor__ === this) this.el.__keditor__ = null;
      this.el.innerHTML = "";
      this.el.classList.remove("ke", "ke-is-fullscreen", "ke-is-readonly");
      this.el.removeAttribute("style");
      this.emitters.clear();
    }
    /** 便捷静态方法 */
    static create(target, options) {
      return new KEditor(target, options);
    }
  }
  function createMedia(editor) {
    const manager = new MediaManager(editor);
    const originalUpload = manager.upload.bind(manager);
    manager.upload = async (file, kind) => {
      const hook = editor.options.beforeUpload;
      let target = file;
      if (hook) {
        target = await hook(file, kind);
        if (target === false) return null;
      }
      return originalUpload(target, kind);
    };
    manager.replaceNode = async (node, file) => {
      const kind = node.dataset.kMedia === "video" ? "video" : "image";
      const range = document.createRange();
      range.setStartBefore(node);
      range.collapse(true);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      const result = await manager.upload(file, kind);
      node.remove();
      editor.commitHistory();
      return result;
    };
    return manager;
  }
  function resolveTarget(target, id) {
    if (typeof target === "string") {
      const el = document.querySelector(target);
      if (!el) throw new Error(`[KEditor] 找不到挂载节点：${target}`);
      return el;
    }
    if (target instanceof HTMLElement) return target;
    if ((target == null ? void 0 : target.$el) instanceof HTMLElement) return target.$el;
    throw new Error(`[KEditor] 无效的挂载目标（${typeof target}）`);
  }
  function mergeOptions(options) {
    const out = { ...defaults, ...options };
    out.image = { ...defaults.image, ...options.image || {} };
    out.paste = { ...defaults.paste, ...options.paste || {} };
    out.upload = { ...defaults.upload, ...options.upload || {} };
    out.customButtons = normalizeCustomButtons(options.customButtons);
    if (Array.isArray(options.toolbar)) out.toolbar = options.toolbar;
    if (options.toolbar === false) out.toolbar = [];
    if (options.toolbar === true) out.toolbar = DEFAULT_TOOLBAR;
    if (out.customButtons.length && options.toolbar !== false) {
      out.toolbar = placeCustomNames(out.toolbar, out.customButtons);
    }
    out.height = clamp$1(out.height ?? 460, 0, 4e3);
    out.paperWidth = clamp$1(Number(out.paperWidth) || defaults.paperWidth, 200, 8e3);
    out.paperMode = out.paperMode === "fixed" ? "fixed" : "fluid";
    out.paperGap = Number.isFinite(Number(out.paperGap)) ? clamp$1(Number(out.paperGap), 0, 600) : defaults.paperGap;
    out.paperMaxWidth = Math.max(0, Number(out.paperMaxWidth) || 0);
    return out;
  }
  const isButtonItem = (key) => key !== "|" && key !== ":tail";
  function placeCustomNames(items, specs) {
    const out = [...items];
    const loose = [];
    for (const spec of specs) {
      if (out.includes(spec.name)) continue;
      if (spec.position == null) {
        loose.push(spec.name);
        continue;
      }
      out.splice(arrIndexOf(out, spec.position), 0, spec.name);
    }
    if (loose.length) out.splice(arrIndexOf(out, null), 0, "|", ...loose);
    return out;
  }
  function arrIndexOf(items, where) {
    const mainEnd = (() => {
      const at2 = items.indexOf(":tail");
      return at2 < 0 ? items.length : at2;
    })();
    if (where == null || where === "end") return mainEnd;
    if (where === "start") return 0;
    if (where === "tail") return items.length;
    if (typeof where === "number") {
      let seen = 0;
      for (let i = 0; i < items.length; i++) {
        if (!isButtonItem(items[i])) continue;
        if (seen === Math.max(0, Math.floor(where))) return i;
        seen++;
      }
      return mainEnd;
    }
    const after = !!(where && typeof where === "object" && where.after);
    const name = String(typeof where === "string" ? where : (after ? where.after : where.before) || "");
    const at = items.indexOf(name);
    if (at < 0) return mainEnd;
    return after ? at + 1 : at;
  }
  function buildStatusbar(editor) {
    const chars = h("b", { text: "0" });
    const words = h("b", { text: "0" });
    const images = h("b", { text: "0" });
    const videos = h("b", { text: "0" });
    const chip = h("span.ke-chip", { hidden: true });
    const hint = h("span.ke-status-hint", { text: "支持拖拽 / 粘贴上传，Ctrl/⌘ + S 保存" });
    const tail = h("span.ke-status-tail");
    const el = h(
      "div.ke-status",
      {},
      [
        h("span", {}, ["字数 ", chars, "  ·  ", words, " 词"]),
        h("span", {}, ["图片 ", images, "  ·  视频 ", videos]),
        chip,
        hint,
        tail
      ]
    );
    const api = {
      update: (counts) => {
        chars.textContent = String(counts.chars);
        words.textContent = String(counts.words);
        images.textContent = String(counts.images);
        videos.textContent = String(counts.videos);
        if (counts.uploading > 0) {
          chip.hidden = false;
          chip.className = "ke-chip ke-is-busy";
          chip.textContent = `${counts.uploading} 个上传进行中`;
        } else {
          chip.hidden = true;
        }
      },
      addExtra: (node) => tail.appendChild(node)
    };
    editor.statusApi = api;
    if (!editor.options.wordCount) el.style.display = "none";
    return el;
  }
  function findAnchor(range, root) {
    var _a;
    let node = range == null ? void 0 : range.commonAncestorContainer;
    if (!node || !root.contains(node)) return null;
    if (node.nodeType === 3) node = node.parentElement;
    const anchor = (_a = node == null ? void 0 : node.closest) == null ? void 0 : _a.call(node, "a");
    return anchor && root.contains(anchor) ? anchor : null;
  }
  function currentAlign(range, block) {
    var _a, _b;
    const node = block || (range == null ? void 0 : range.commonAncestorContainer);
    const styles = [node, node == null ? void 0 : node.parentElement].filter((n) => n && n.nodeType === 1);
    for (const el of styles) {
      const align = (_a = el.style) == null ? void 0 : _a.textAlign;
      if (align) return align === "-webkit-justify" ? "justify" : align;
      const cs = (_b = el.getAttribute) == null ? void 0 : _b.call(el, "align");
      if (cs) return cs;
    }
    try {
      if (document.queryCommandState("justifyCenter")) return "center";
      if (document.queryCommandState("justifyRight")) return "right";
      if (document.queryCommandState("justifyFull")) return "justify";
    } catch {
    }
    return "left";
  }
  function countWords(text) {
    const cjk = (text.match(/[\u4e00-\u9fa5\u3040-\u30ff]/g) || []).length;
    const latin = (text.match(/[a-zA-Z0-9'’-]+/g) || []).length;
    return cjk + latin;
  }
  function exportHtml(html) {
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
    const root = doc.body.firstChild;
    root.querySelectorAll("[contenteditable]").forEach((n) => n.removeAttribute("contenteditable"));
    root.querySelectorAll("[data-k-id]").forEach((n) => n.removeAttribute("data-k-id"));
    root.querySelectorAll("[data-k-state]").forEach((n) => n.removeAttribute("data-k-state"));
    root.querySelectorAll("[data-ke-marker]").forEach((n) => n.removeAttribute("data-ke-marker"));
    root.querySelectorAll("[data-placeholder]").forEach((n) => n.removeAttribute("data-placeholder"));
    root.querySelectorAll(".ke-is-selected-media").forEach((n) => n.classList.remove("ke-is-selected-media"));
    root.querySelectorAll('[data-k-state="uploading"], [data-k-state="error"]').forEach((n) => n.remove());
    return root.innerHTML.trim();
  }
  function previewHtml(html) {
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
    const root = doc.body.firstChild;
    root.querySelectorAll("[data-k-media]").forEach((n) => {
      n.removeAttribute("data-k-media");
      n.removeAttribute("data-k-url");
    });
    return root.innerHTML;
  }
  const version = "1.0.2";
  function create(target, options = {}) {
    return new KEditor(target, options);
  }
  const mount = create;
  function replace(target, options = {}) {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (el == null ? void 0 : el.__keditor__) el.__keditor__.destroy();
    return create(el, options);
  }
  exports2.ChunkUploader = ChunkUploader;
  exports2.DEFAULT_TOOLBAR = DEFAULT_TOOLBAR;
  exports2.KEditor = KEditor;
  exports2.cleanWordHtml = cleanWordHtml;
  exports2.create = create;
  exports2.createUploader = createUploader;
  exports2.default = KEditor;
  exports2.defaults = defaults;
  exports2.escapeHtml = escapeHtml;
  exports2.exportHtml = exportHtml;
  exports2.fastFingerprint = fastFingerprint;
  exports2.formatHtml = formatHtml;
  exports2.httpAdapter = httpAdapter;
  exports2.isSafeUrl = isSafeUrl;
  exports2.maybeCompress = maybeCompress;
  exports2.mockAdapter = mockAdapter;
  exports2.mount = mount;
  exports2.normalizeCustomButtons = normalizeCustomButtons;
  exports2.normalizeItems = normalizeItems;
  exports2.normalizePosition = normalizePosition;
  exports2.replace = replace;
  exports2.sanitizeHtml = sanitizeHtml;
  exports2.simpleAdapter = simpleAdapter;
  exports2.strongFingerprint = strongFingerprint;
  exports2.version = version;
  Object.defineProperties(exports2, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
});
