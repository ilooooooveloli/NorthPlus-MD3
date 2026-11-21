/* ==========================================================================
   North+ 体验助手 — 核心：偏好默认值、页面类型、图标与 DOM 工具
   内容脚本按 manifest 顺序加载、共享同一个顶层作用域：
   最先加载，只做声明；其余文件都依赖这里的 prefs / root / PAGE / el / icon。
   ========================================================================== */
'use strict';

const STORAGE_KEY = 'np_ext_prefs';
const CACHE_KEY = '__np_ext_prefs_cache';

const DEFAULT_PREFS = {
  theme: 'auto', // 'auto' | 'dark' | 'light'
  seed: '#39c5bb', // 种子色
  modernUI: true, // MD3 界面
  wide: true,
  maxWidth: 1400, // 0 = 全宽
  compactHeader: true,
  collapseNotice: true,
  readable: true,
  lightbox: true,
  stayOnPurchase: true,
  floatingBar: true,
  shortcuts: true,
  rowClick: true
};

let prefs = { ...DEFAULT_PREFS };
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
const root = document.documentElement;

const PAGE = (() => {
  const p = location.pathname;
  if (/\/read\.php/.test(p)) return 'read';
  if (/\/thread\.php/.test(p)) return 'thread';
  if (/\/post\.php/.test(p)) return 'post';
  if (/\/job\.php/.test(p) && /action=preview/.test(location.search)) return 'preview';
  if (/^\/?$|index\.php/.test(p)) return 'index';
  return 'other';
})();

/* ------------------------------------------------------------------
   图标（Material Symbols，fill）
   ------------------------------------------------------------------ */
const ICONS = {
  dark: 'M12 21q-3.75 0-6.375-2.625T3 12q0-3.75 2.625-6.375T12 3q.35 0 .688.025t.662.075q-1.025.725-1.638 1.888T11.1 7.5q0 2.25 1.575 3.825T16.5 12.9q1.375 0 2.525-.613T20.9 10.65q.05.325.075.662T21 12q0 3.75-2.625 6.375T12 21Z',
  light: 'M12 17q-2.075 0-3.537-1.463T7 12q0-2.075 1.463-3.537T12 7q2.075 0 3.538 1.463T17 12q0 2.075-1.463 3.538T12 17ZM2 13q-.425 0-.712-.288T1 12q0-.425.288-.712T2 11h2q.425 0 .713.288T5 12q0 .425-.288.713T4 13H2Zm18 0q-.425 0-.712-.288T19 12q0-.425.288-.712T20 11h2q.425 0 .713.288T23 12q0 .425-.288.713T22 13h-2Zm-8-8q-.425 0-.712-.288T11 4V2q0-.425.288-.712T12 1q.425 0 .713.288T13 2v2q0 .425-.288.713T12 5Zm0 18q-.425 0-.712-.288T11 22v-2q0-.425.288-.712T12 19q.425 0 .713.288T13 20v2q0 .425-.288.713T12 23ZM5.65 7.05 4.575 6q-.3-.275-.288-.7t.288-.725q.3-.3.725-.3t.7.3L7.05 5.65q.275.3.275.7t-.275.7q-.275.3-.687.288T5.65 7.05ZM18 19.425l-1.05-1.075q-.275-.3-.275-.712t.275-.688q.275-.3.688-.287t.712.287L19.425 18q.3.275.288.7t-.288.725q-.3.3-.725.3t-.7-.3ZM16.95 7.05q-.3-.275-.288-.687t.288-.713L18 4.575q.275-.3.7-.288t.725.288q.3.3.3.725t-.3.7L18.35 7.05q-.3.275-.7.275t-.7-.275ZM4.575 19.425q-.3-.3-.3-.725t.3-.7l1.075-1.05q.3-.275.712-.275t.688.275q.3.275.288.688t-.288.712L6 19.425q-.275.3-.7.288t-.725-.288Z',
  up: 'M11 20V7.825l-5.6 5.6L4 12l8-8 8 8-1.4 1.425-5.6-5.6V20h-2Z',
  down: 'M11 4v12.175l-5.6-5.6L4 12l8 8 8-8-1.4-1.425-5.6 5.6V4h-2Z',
  expand: 'M3 21v-8h2v4.6L17.6 5H13V3h8v8h-2V6.4L6.4 19H11v2H3Z',
  collapse: 'M3.4 22 2 20.6 8.6 14H4v-2h8v8h-2v-4.6L3.4 22ZM12 12V4h2v4.6L20.6 2 22 3.4 15.4 10H20v2h-8Z',
  reply: 'M19 19v-4q0-1.25-.875-2.125T16 12H6.825l3.6 3.6L9 17l-6-6 6-6 1.425 1.4-3.6 3.6H16q2.075 0 3.538 1.463T21 15v4h-2Z',
  edit: 'M5 19h1.425L16.2 9.225 14.775 7.8 5 17.575V19Zm-2 2v-4.25L16.2 3.575q.3-.275.663-.425t.762-.15q.4 0 .775.15t.65.45L20.425 5q.3.275.437.65T21 6.4q0 .4-.138.763t-.437.662L7.25 21H3ZM15.475 8.525l-.7-.725L16.2 9.225l-.725-.7Z',
  chat: 'M6 14h8v-2H6v2Zm0-3h12V9H6v2Zm0-3h12V6H6v2ZM2 22V4q0-.825.588-1.412T4 2h16q.825 0 1.413.588T22 4v12q0 .825-.588 1.413T20 18H6l-4 4Zm3.15-6H20V4H4v13.125L5.15 16Z',
  close: 'M6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5l5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19Z',
  left: 'm14 18-6-6 6-6 1.4 1.4-4.6 4.6 4.6 4.6L14 18Z',
  right: 'M12.6 12 8 7.4 9.4 6l6 6-6 6L8 16.6l4.6-4.6Z',
  openNew: 'M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h7v2H5v14h14v-7h2v7q0 .825-.587 1.413T19 21H5Zm4.7-5.3-1.4-1.4L17.6 5H14V3h7v7h-2V6.4l-9.3 9.3Z',
  mood: 'M15.5 11q.625 0 1.063-.437T17 9.5q0-.625-.437-1.062T15.5 8q-.625 0-1.062.438T14 9.5q0 .625.438 1.063T15.5 11Zm-7 0q.625 0 1.063-.437T10 9.5q0-.625-.437-1.062T8.5 8q-.625 0-1.062.438T7 9.5q0 .625.438 1.063T8.5 11Zm3.5 6.5q1.7 0 3.088-.962T17.1 14h-1.65q-.55.925-1.462 1.463T12 16q-1.075 0-1.988-.537T8.55 14H6.9q.625 1.575 2.013 2.538T12 17.5Zm0 4.5q-2.075 0-3.9-.788t-3.175-2.137q-1.35-1.35-2.137-3.175T2 12q0-2.075.788-3.9t2.137-3.175q1.35-1.35 3.175-2.137T12 2q2.075 0 3.9.788t3.175 2.137q1.35 1.35 2.138 3.175T22 12q0 2.075-.788 3.9t-2.137 3.175q-1.35 1.35-3.175 2.138T12 22Zm0-2q3.35 0 5.675-2.325T20 12q0-3.35-2.325-5.675T12 4Q8.65 4 6.325 6.325T4 12q0 3.35 2.325 5.675T12 20Z',
  attach: 'M18 15.75q0 2.6-1.825 4.425T11.75 22q-2.6 0-4.425-1.825T5.5 15.75V6.5q0-1.875 1.313-3.187T10 2q1.875 0 3.188 1.313T14.5 6.5v8.75q0 1.15-.8 1.95t-1.95.8q-1.15 0-1.95-.8t-.8-1.95V6h2v9.25q0 .325.213.538t.537.212q.325 0 .538-.213t.212-.537V6.5q-.025-1.05-.737-1.775T10 4q-1.05 0-1.775.725T7.5 6.5v9.25q-.025 1.775 1.225 3.013T11.75 20q1.75 0 2.975-1.237T16 15.75V6h2v9.75Z',
  keyboard: 'M4 19q-.825 0-1.412-.587T2 17V7q0-.825.588-1.412T4 5h16q.825 0 1.413.588T22 7v10q0 .825-.587 1.413T20 19H4Zm0-2h16V7H4v10Zm4-1h8v-2H8v2Zm-3-3h2v-2H5v2Zm3 0h2v-2H8v2Zm3 0h2v-2h-2v2Zm3 0h2v-2h-2v2Zm3 0h2v-2h-2v2ZM5 10h2V8H5v2Zm3 0h2V8H8v2Zm3 0h2V8h-2v2Zm3 0h2V8h-2v2Zm3 0h2V8h-2v2Z'
};

function icon(name, size = 24) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', ICONS[name]);
  svg.appendChild(path);
  return svg;
}

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  });
  children.forEach((c) => c && node.append(c));
  return node;
}
