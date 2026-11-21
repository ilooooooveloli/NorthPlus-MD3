/* ==========================================================================
   North+ 体验助手 — 偏好应用：深浅色、种子色、宽度变量、断点
   内容脚本按 manifest 顺序加载、共享同一个顶层作用域：
   只做声明；applyPrefs 会调用后面文件里的 syncFloating / syncEditorFrame。
   ========================================================================== */
'use strict';

/* ------------------------------------------------------------------
   偏好
   ------------------------------------------------------------------ */
function isDark() {
  if (prefs.theme === 'dark') return true;
  if (prefs.theme === 'light') return false;
  return darkQuery.matches;
}

let darkFixTimer = 0;
function scheduleDarkFix() {
  clearTimeout(darkFixTimer);
  darkFixTimer = setTimeout(fixLightSurfaces, 60);
}

// 深色兜底：找出仍是浅色底/浅色描边的老元素，换成 MD3 角色色
function fixLightSurfaces() {
  if (!root.classList.contains('np-dark') || !document.body) return;
  const scope = document.querySelectorAll(
    '#wrapA div, #wrapA td, #wrapA th, #wrapA table, #wrapA ul, #wrapA li, #wrapA span, #wrapA fieldset, #wrapA h2, #wrapA h3, #wrapA dl, #wrapA dd, #wrapA dt, #wrapA p, #wrapA form, #wrapA a, #footer div'
  );
  const isLight = (c) => {
    const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!m) return false;
    const a = m[4] === undefined ? 1 : Number(m[4]);
    return a > 0.5 && Number(m[1]) > 200 && Number(m[2]) > 200 && Number(m[3]) > 200;
  };
  let n = 0;
  for (const node of scope) {
    if (++n > 6000) break;
    if (node.closest('#np-floating, #np-lightbox, #np-dialog-scrim, .tpc_content img')) continue;
    const cs = getComputedStyle(node);
    if (isLight(cs.backgroundColor)) node.classList.add('np-auto-surface');
    const bw = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
    if (bw > 0 && (isLight(cs.borderTopColor) || isLight(cs.borderLeftColor) || isLight(cs.borderBottomColor))) {
      node.classList.add('np-auto-border');
    }
  }
}

function applyPrefs(next) {
  prefs = { ...DEFAULT_PREFS, ...next };
  const md = Boolean(prefs.modernUI);

  root.classList.add('np-ext', `np-p-${PAGE}`);
  root.classList.toggle('np-md', md);
  root.classList.toggle('np-dark', md && isDark());
  root.classList.toggle('np-wide', Boolean(prefs.wide));
  root.classList.toggle('np-compact', md && prefs.compactHeader);
  root.classList.toggle('np-collapse-notice', md && prefs.collapseNotice);
  root.classList.toggle('np-readable', Boolean(prefs.readable));
  root.classList.toggle('np-lightbox', Boolean(prefs.lightbox));
  root.classList.toggle('np-rowclick', Boolean(prefs.rowClick));
  root.classList.toggle('np-floatingbar', Boolean(prefs.floatingBar));

  applySeed(md);
  syncRinspDark();

  rootVars.width = prefs.maxWidth === 0
    ? { '--np-width-vw': '96vw', '--np-max-width': 'none', '--np-content-w': '96vw' }
    : {
        '--np-width-vw': '92vw',
        '--np-max-width': `${prefs.maxWidth}px`,
        '--np-content-w': `min(92vw, ${prefs.maxWidth}px)`
      };
  writeRootVars();

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(prefs));
  } catch (_) {}

  syncFloating();
  syncEditorFrame();
  if (document.readyState !== 'loading') scheduleDarkFix();
}

// 凛+ 自带深色模式（html.rinsp-dark-mode）会改写表格、链接、图片滤镜，与 MD3 互相打架。
// MD3 开启时摘掉它、由 MD3 深浅色统一接管；MD3 关闭后还给凛+。
let rinspDarkHeld = false;
function rinspWantsDark() {
  // 与凛+ 的 isDarkMode() 一致：设置存在页面 localStorage
  try {
    if (!localStorage.getItem('rinsp-dark-mode')) return false;
    return localStorage.getItem('rinsp-dark-mode-auto') ? darkQuery.matches : true;
  } catch (_) {
    return false;
  }
}
function syncRinspDark() {
  const md = root.classList.contains('np-md');
  if (md && root.classList.contains('rinsp-dark-mode')) {
    rinspDarkHeld = true;
    root.classList.remove('rinsp-dark-mode');
  } else if (!md && rinspDarkHeld) {
    rinspDarkHeld = false;
    if (rinspWantsDark()) root.classList.add('rinsp-dark-mode');
  }
}
// 运行时变量（宽度、种子色）写进独立的 <style>，而不是 <html> 的行内样式：
// 凛+ 等脚本会在加载过程中 removeAttribute('style')，行内变量会被一起清掉
const rootVars = { width: {}, seed: {} };
let rootVarsStyle = null;
function writeRootVars() {
  if (!rootVarsStyle || !rootVarsStyle.isConnected) {
    rootVarsStyle = rootVarsStyle || el('style', { id: 'np-root-vars' });
    (document.head || root).appendChild(rootVarsStyle);
  }
  const decls = Object.entries({ ...rootVars.width, ...rootVars.seed })
    .map(([k, v]) => `${k}: ${v} !important;`)
    .join(' ');
  rootVarsStyle.textContent = `:root { ${decls} }`;
}

// 种子色：非默认时生成整套角色色，覆盖 CSS 里的默认配色
function applySeed(md) {
  const color = globalThis.npColor;
  const seed = color ? color.normalize(prefs.seed) : '';
  rootVars.seed = {};
  if (!md || !color || seed === color.DEFAULT_SEED) return;
  const scheme = color.scheme(seed, isDark());
  Object.entries(scheme).forEach(([role, value]) => {
    rootVars.seed[`--md-${role}`] = value;
  });
}

function savePrefs(patch) {
  applyPrefs({ ...prefs, ...patch });
  if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
    chrome.storage.sync.set({ [STORAGE_KEY]: prefs });
  }
}

// 0) 断点：按窗口宽度给 <html> 打类，CSS 据此切换布局
function updateBreakpoint() {
  const w = window.innerWidth || document.documentElement.clientWidth;
  root.classList.toggle('np-bp-tablet', w < 1000);
  root.classList.toggle('np-bp-phone', w < 760);
}
