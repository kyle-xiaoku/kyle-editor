/** 编辑器样式：随 JS 注入，单文件 <script> 引入即可拥有完整外观 */

export const CSS = `
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
/* 自适应高度（未配 height）：整页滚动；overflow:clip 不建立滚动容器，
   工具栏的 sticky 才能相对视口生效（旧浏览器忽略 clip，退回 hidden 行为） */
.ke.ke-is-auto { overflow: clip; }

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
.ke-code-panel .ke-sel-search { margin-bottom: 8px; }
.ke-code-list { display: flex; flex-direction: column; max-height: 252px; overflow-y: auto; overscroll-behavior: contain; margin: 0 -4px; padding: 0 4px; }
.ke-code-panel .ke-panel-hint { margin-top: 10px; }

/* ---------------- Markdown 导入面板 ---------------- */
/* 固定宽度：预览里的表格 / 长链接不再把弹层撑宽 */
.ke-md-panel {
  width: 372px; max-width: calc(100vw - 24px);
  display: flex; flex-direction: column; padding-bottom: 0;
  max-height: var(--ke-pop-max, 480px);
}
.ke-md-panel .ke-panel-head, .ke-md-panel .ke-tabs { flex: none; }
.ke-md-panel .ke-tabs { margin-bottom: 0; }
/* 中间区滚动、底部按钮常驻：窗口再矮也能点到「导入到正文」 */
.ke-md-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; margin: 0 -14px; padding: 12px 14px 0; }
.ke-md-panel .ke-panel-foot { flex: none; margin: 10px 0 30px; }
.ke-md-text {
  width: 100%; min-height: 118px; max-height: 190px; padding: 10px 11px; border: 1px solid var(--ke-line);
  border-radius: 8px; background: #fbfcfd; color: #1f2329; font-size: 12.5px; line-height: 1.7; resize: vertical;
  font-family: 'SFMono-Regular', Consolas, Menlo, Monaco, monospace; outline: none;
}
.ke-md-text:focus { border-color: var(--ke-primary); background: #fff; }
.ke-md-file { display: flex; align-items: center; gap: 8px; margin-top: 8px; font-size: 12px; color: var(--ke-muted); }
.ke-md-file b { flex: 1 1 auto; min-width: 0; color: #1f2329; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ke-md-file > span { flex: none; }
.ke-drop-title, .ke-drop-sub { overflow-wrap: anywhere; }
.ke-md-file[hidden] { display: none; }
.ke-md-error { color: #e53e3e; }
.ke-md-modes { display: flex; gap: 6px; }
.ke-md-mode { flex: 1; height: 28px; border: 1px solid var(--ke-line); border-radius: 7px; background: #fff; color: #4b5158; font-size: 12px; cursor: pointer; }
.ke-md-mode:hover { border-color: var(--ke-primary); color: var(--ke-primary); }
.ke-md-mode.ke-is-active { border-color: var(--ke-primary); background: var(--ke-primary-weak); color: var(--ke-primary); font-weight: 600; }
/* 预览复用正文样式（ke-content），只是尺寸更紧凑 */
.ke-md-preview {
  max-height: 216px; overflow: auto; overscroll-behavior: contain;
  padding: 10px 12px; border: 1px solid var(--ke-line-weak); border-radius: 8px; background: #fff;
  font-size: 14px; line-height: 1.7; overflow-wrap: anywhere;
}
.ke-md-preview > *:last-child { margin-bottom: 0; }
.ke-md-preview h1, .ke-md-preview h2, .ke-md-preview h3, .ke-md-preview h4 { margin: 12px 0 8px; font-size: 16px; }
.ke-md-preview p { margin: 0 0 8px; }
.ke-md-preview ul, .ke-md-preview ol { margin: 0 0 8px; padding-left: 20px; }
.ke-md-preview blockquote { margin: 0 0 8px; padding: 1px 12px; }
.ke-md-preview pre { margin: 0 0 8px; padding: 9px 11px; font-size: 12px; }
.ke-md-preview table { font-size: 13px; }
.ke-md-preview th, .ke-md-preview td { padding: 4px 7px; }
.ke-md-empty { color: #b8bec7; font-size: 12.5px; }
.ke-md-stats { display: flex; flex-wrap: wrap; gap: 3px 10px; margin-top: 8px; font-size: 11.5px; color: #a2a8b3; }
.ke-md-stat b { color: #4b5158; font-weight: 600; }
.ke-md-panel .ke-panel-hint { margin-top: 0; }
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
  position: relative;
  background: #282c34; color: #e6e6e6; padding: 14px 16px; border-radius: 8px; overflow-x: auto;
  font-size: 13px; line-height: 1.7; margin: 0 0 16px; font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
}
.ke-content pre code { background: none; color: inherit; padding: 0; font-size: inherit; }
/* 右上角语言角标：纯 CSS（::before）不进入正文 DOM，导出到公众号时自然消失 */
.ke-content pre[data-k-lang]:not([data-k-lang='plaintext'])::before {
  content: attr(data-k-lang); position: absolute; top: 6px; right: 8px;
  padding: 1px 6px; border-radius: 4px; background: rgba(255, 255, 255, .09); color: #8b93a1;
  font-size: 10.5px; letter-spacing: .04em; text-transform: uppercase; pointer-events: none; user-select: none;
}
/* 代码高亮 token（One Dark 配色，与深色底一致） */
.ke-content .ke-tok-com { color: #7f848e; font-style: italic; }
.ke-content .ke-tok-str { color: #98c379; }
.ke-content .ke-tok-num { color: #d19a66; }
.ke-content .ke-tok-kw { color: #c678dd; }
.ke-content .ke-tok-typ { color: #e5c07b; }
.ke-content .ke-tok-fn { color: #61afef; }
.ke-content .ke-tok-var { color: #e06c75; }
.ke-content .ke-tok-op { color: #56b6c2; }
.ke-content .ke-tok-punc { color: #abb2bf; }
.ke-content .ke-tok-tag { color: #e06c75; }
.ke-content .ke-tok-attr { color: #d19a66; }
.ke-content .ke-tok-sel { color: #e06c75; }
.ke-content .ke-tok-prop { color: #61afef; }
.ke-content .ke-tok-key { color: #e06c75; }
.ke-content .ke-tok-bool { color: #d19a66; }
.ke-content .ke-tok-meta { color: #c678dd; }
.ke-content .ke-tok-ins { color: #98c379; }
.ke-content .ke-tok-del { color: #e06c75; text-decoration: line-through; }
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
`

let injected = false

export function injectStyle() {
  if (injected || typeof document === 'undefined') return
  const style = document.createElement('style')
  style.setAttribute('data-keditor-style', '')
  style.textContent = CSS
  document.head.appendChild(style)
  injected = true
}
