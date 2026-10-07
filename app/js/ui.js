// Jasette — small shared pieces: the DOM helper, icons, bottom sheets, toasts
// and a history-aware router (so Android's back gesture goes back a screen
// instead of out of the app).

export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
  return el;
}

// Typographic apostrophes for display; the data keeps the straight one.
export const typo = (s) => String(s ?? '').replace(/'/g, '’');

const P = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
export const ICON = {
  home: P('<path d="M3.5 11.2 12 4l8.5 7.2"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>'),
  path: P('<circle cx="6" cy="5.5" r="2.3"/><circle cx="18" cy="12" r="2.3"/><circle cx="6" cy="18.5" r="2.3"/><path d="M6 7.8v3.4c0 1.5 1 2.2 2.6 2.7l6.9-1.6M6 16.2v-.9"/>'),
  book: P('<path d="M4 5.2A2 2 0 0 1 6 3.5h12.5V18H6a2 2 0 0 0-2 2z"/><path d="M4 20a2 2 0 0 0 2 0.5h12.5"/><path d="M9 8h6M9 11.5h4"/>'),
  chart: P('<path d="M4 20V11M10 20V5M16 20v-7M21 20H3"/>'),
  gear: P('<circle cx="12" cy="12" r="3"/><path d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.5-2-3.4-2.3.9a7.6 7.6 0 0 0-1.7-1L15 2.5H9.9l-.4 2.5a7.6 7.6 0 0 0-1.7 1l-2.3-.9-2 3.4L5.5 11a7.6 7.6 0 0 0 0 2l-2 1.5 2 3.4 2.3-.9a7.6 7.6 0 0 0 1.7 1l.4 2.5H15l.4-2.5a7.6 7.6 0 0 0 1.7-1l2.3.9 2-3.4Z"/>'),
  speaker: P('<path d="M11 5 6.5 9H3.5v6h3L11 19z" fill="currentColor"/><path d="M15 9a4.2 4.2 0 0 1 0 6"/><path d="M17.8 6.2a8 8 0 0 1 0 11.6"/>'),
  play: P('<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>'),
  mic: P('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3"/>'),
  close: P('<path d="M6 6l12 12M18 6 6 18"/>'),
  check: P('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  cross: P('<path d="M6 6l12 12M18 6 6 18"/>'),
  chev: P('<path d="m9 5.5 6.5 6.5L9 18.5"/>'),
  back: P('<path d="m15 5.5-6.5 6.5L15 18.5"/>'),
  search: P('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>'),
  download: P('<path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19.5h14"/>'),
  info: P('<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.2"/>'),
  ear: P('<path d="M7 9.5a5 5 0 0 1 10 0c0 2.4-1.4 3.2-2.4 4.3-.8.9-.6 2.2-1.6 3.2a2.7 2.7 0 0 1-4.6-1.4"/><path d="M10 9.5a2 2 0 0 1 4 0"/>'),
  eye: P('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>'),
  pen: P('<path d="M4 20l1-4.2L16.4 4.4a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8L8.2 19z"/><path d="m14.5 6.3 3.2 3.2"/>'),
  puzzle: P('<path d="M9.5 4.5a2 2 0 0 1 4 0V6H18v4.5h-1.5a2 2 0 0 0 0 4H18V19H13.5v-1.5a2 2 0 0 0-4 0V19H5v-4.5h1.5a2 2 0 0 0 0-4H5V6h4.5z"/>'),
  spark: P('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>'),
  flame: P('<path d="M12 3c.5 3-2.5 4.6-2.5 7.6A2.7 2.7 0 0 0 12 13.3c0-1.3 1-2 1.7-2.8C15.8 12 17 13.7 17 15.6a5 5 0 0 1-10 0C7 11 11 9.5 12 3z"/>'),
  plus: P('<path d="M12 5v14M5 12h14"/>'),
  trash: P('<path d="M4.5 7h15M10 7V4.5h4V7M7 7l.8 12.5h8.4L17 7"/>'),
  repeat: P('<path d="M4 12a8 8 0 0 1 13.5-5.8L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 0 1-13.5 5.8L4 15.5M4 20v-4.5h4.5"/>'),
  sound: P('<path d="M5 14v-4M9 17V7M13 20V4M17 17V7M21 14v-4"/>'),
  moon: P('<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>'),
  fleur: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 1.6c2 2.3 3 4.5 3 6.5 0 1.6-.7 3-3 4.5-2.3-1.5-3-2.9-3-4.5 0-2 1-4.2 3-6.5z"/><path d="M7.4 6.6C4.8 7.3 3.2 9 3.2 11.4c0 2.2 1.6 3.8 4 3.8 1.3 0 2.3-.4 3.1-1.1-2-.3-3.3-1.4-3.6-3.3-.2-1.6.2-3 .7-4.2z"/><path d="M16.6 6.6c2.6.7 4.2 2.4 4.2 4.8 0 2.2-1.6 3.8-4 3.8-1.3 0-2.3-.4-3.1-1.1 2-.3 3.3-1.4 3.6-3.3.2-1.6-.2-3-.7-4.2z"/><rect x="7.6" y="15.5" width="8.8" height="1.9" rx=".7"/><path d="M12 17.8c1.6 1 2.7 2.5 2.9 4.6-1-.7-1.9-1-2.9-1s-1.9.3-2.9 1c.2-2.1 1.3-3.6 2.9-4.6z"/></svg>',
  flagfr: '<svg viewBox="0 0 24 16" aria-hidden="true"><rect width="8" height="16" fill="#0055A4"/><rect x="8" width="8" height="16" fill="#F4F4F4"/><rect x="16" width="8" height="16" fill="#EF4135"/></svg>',
  sparkle: P('<path d="M12 4v4M12 16v4M4 12h4M16 12h4"/>'),
};

export const iconBtn = (icon, label, onclick, cls = 'icon') => h('button', { class: cls, type: 'button', 'aria-label': label, title: label, html: ICON[icon], onclick });

// ── bottom sheet ──────────────────────────────────────────────────────
let openSheet = null;
export function sheet(...kids) {
  closeSheet();
  const scrim = h('div', { class: 'scrim', onclick: closeSheet });
  const box = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'grip' }), ...kids);
  document.body.append(scrim, box);
  openSheet = { scrim, box, onKey: (e) => { if (e.key === 'Escape') closeSheet(); } };
  document.addEventListener('keydown', openSheet.onKey);
  return box;
}
export function closeSheet() {
  if (!openSheet) return;
  openSheet.scrim.remove(); openSheet.box.remove();
  document.removeEventListener('keydown', openSheet.onKey);
  openSheet = null;
}

let toastTimer = null;
export function toast(text, ms = 2600) {
  document.querySelector('.toast')?.remove();
  const el = h('div', { class: 'toast', role: 'status' }, text);
  document.body.append(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), ms);
}

// A soft wash over the whole screen when an answer lands. Reinforcement, never
// the signal: the tick or cross, the words and the marked option each carry
// the verdict on their own.
export function flash(kind) {
  const el = h('div', { class: 'flash ' + kind, 'aria-hidden': 'true' });
  document.body.append(el);
  setTimeout(() => el.remove(), 520);
}

// ── screens and the back button ───────────────────────────────────────
const $app = document.getElementById('app');
let current = null;
let guard = null;                 // () => boolean: return true to block leaving
let onPaint = null;
export function setLeaveGuard(fn) { guard = fn; }
export function onScreen(fn) { onPaint = fn; }
const routes = new Map();
export function route(name, render, { tabs = true } = {}) { routes.set(name, { render, tabs }); }
export function show(name, arg = null, { replace = false } = {}) {
  const r = routes.get(name);
  if (!r) throw new Error('no such screen: ' + name);
  closeSheet();
  current = { name, arg };
  const state = { name, arg: typeof arg === 'object' ? null : arg };
  try { replace || !history.state ? history.replaceState(state, '') : history.pushState(state, ''); } catch { /* sandboxed */ }
  paint();
}
function paint() {
  const r = routes.get(current.name);
  const kids = r.render(current.arg);
  $app.replaceChildren(...[].concat(kids).filter(Boolean));
  document.body.classList.toggle('no-tabs', !r.tabs);
  window.scrollTo(0, 0);
  onPaint?.(current.name, r.tabs);
}
window.addEventListener('popstate', (e) => {
  if (guard && guard()) { try { history.pushState(history.state, ''); } catch { /* ignore */ } return; }
  const st = e.state;
  if (st && routes.has(st.name)) { closeSheet(); current = { name: st.name, arg: st.arg }; paint(); }
});
export const back = () => { try { history.back(); } catch { /* ignore */ } };
export const currentScreen = () => current?.name || null;
export const repaint = () => { if (current) paint(); };

export function disclosure(label, ...kids) {
  return h('details', { class: 'more' }, h('summary', {}, label), ...kids.flat(Infinity).filter(Boolean));
}
