/** 内置图标（stroke 风格，24x24 viewBox，与 currentColor 联动） */

const S = (d) =>
  `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`

export const icons = {
  undo: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a5 5 0 0 1 0 10h-3"/></svg>`,
  redo: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m15 14 5-5-5-5"/><path d="M20 9H10a5 5 0 0 0 0 10h3"/></svg>`,
  bold: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 5h6.5a3.5 3.5 0 0 1 0 7H7zM7 12h7.5a3.5 3.5 0 0 1 0 7H7z"/></svg>`,
  italic: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M15 5h-5M14 19H9M14.5 5 10 19"/></svg>`,
  underline: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M7 4v8a5 5 0 0 0 10 0V4M5 20h14"/></svg>`,
  strike: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 12h16M16.5 7A4.5 4.5 0 0 0 12 5c-2.2 0-3.6 1-4.2 2.4M7.5 17A4.5 4.5 0 0 0 12 19c2.3 0 3.9-1.1 4.4-2.8"/></svg>`,
  foreColor: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17 9.5 5 14 17M6.8 13h5.9"/><rect x="4" y="19.5" width="11" height="2.2" rx="1" fill="currentColor" stroke="none"/></svg>`,
  backColor: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 20 4 16l7.5-7.5a2 2 0 0 1 2.8 0l3.2 3.2a2 2 0 0 1 0 2.8L13 20z" /><path d="M10 8.5 15.5 14"/></svg>`,
  alignLeft: S('M4 6h16M4 12h10M4 18h13'),
  alignCenter: S('M4 6h16M7 12h10M5.5 18h13'),
  alignRight: S('M4 6h16M10 12h10M7 18h13'),
  alignJustify: S('M4 6h16M4 12h16M4 18h16'),
  ul: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4.5" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1.2" fill="currentColor" stroke="none"/></svg>`,
  ol: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11"/><text x="1.6" y="8.2" font-size="7" font-family="inherit" fill="currentColor" stroke="none">1</text><text x="1.6" y="14.4" font-size="7" font-family="inherit" fill="currentColor" stroke="none">2</text><text x="1.6" y="20.6" font-size="7" font-family="inherit" fill="currentColor" stroke="none">3</text></svg>`,
  quote: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 5v14"/><path d="M10 8h9M10 12h9M10 16h5"/></svg>`,
  link: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  unlink: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M9 14 4.5 18.5M14.5 5.5 19 10"/><path d="M10.5 13.5a4 4 0 0 0 5.6 0l2.4-2.4a4 4 0 0 0-5.6-5.6"/><path d="M13.5 10.5a4 4 0 0 0-5.6 0l-2.4 2.4a4 4 0 0 0 5.6 5.6"/><path d="m3 3 18 18"/></svg>`,
  image: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="15" rx="2.5"/><circle cx="8.5" cy="10" r="1.6"/><path d="m4 18 5-5 3.5 3.5L17 12l3 3"/></svg>`,
  video: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m10.5 9 4.5 3-4.5 3z"/></svg>`,
  table: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M3 15h18M9 5v14M15 5v14"/></svg>`,
  code: S('m9 7-5 5 5 5M15 7l5 5-5 5'),
  // 导入托盘 + 下箭头：17px 下仍清晰，且不与相邻线性图标抢视线
  markdown: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.8v10.4m0 0-4.2-4.2M12 14.2l4.2-4.2"/><path d="M4.2 15.4v2.4a2 2 0 0 0 2 2h11.6a2 2 0 0 0 2-2v-2.4"/></svg>`,
  hr: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 12h16" stroke-width="2.4"/><path d="M6 7h12M6 17h12" opacity=".45"/></svg>`,
  clear: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 20 4 16l8-8 4 4-8 8z" /><path d="M12 8 16 4l4 4-4 4M6 20h12"/></svg>`,
  source: S('m8 7-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16'),
  preview: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>`,
  trash: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/></svg>`,
  close: S('m6 6 12 12M18 6 6 18'),
  copy: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 5H6a2 2 0 0 0-2 2v9"/></svg>`,
  format: S('M4 6h10M4 12h16M4 18h7M18 4v6m0 0 2.5-2.5M18 10l-2.5-2.5'),
  check: S('m5 13 4 4L19 7'),
  checkLight: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg>`,
  plus: S('M12 5v14M5 12h14'),
  minus: S('M5 12h14'),
  upload: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4m0 0-4 4m4-4 4 4"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>`,
  retry: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-3-6.2"/><path d="M20 4v5h-5"/></svg>`,
  rounded: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="6"/></svg>`,
  expand: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>`,
  compress: `<svg class="ke-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>`,
}

export function icon(name) {
  return icons[name] || ''
}
