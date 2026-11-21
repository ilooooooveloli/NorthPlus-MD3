/* ==========================================================================
   North+ 体验助手 — 启动：读取偏好、注册监听、DOM 就绪后依次增强
   内容脚本按 manifest 顺序加载、共享同一个顶层作用域：
   最后加载：前面文件里的函数与变量此时都已就绪，所有在加载时执行的代码只放在这里。
   ========================================================================== */
'use strict';

// 凛+ 跟随系统切换或改设置时会重新加上该类
new MutationObserver(syncRinspDark).observe(root, { attributes: true, attributeFilter: ['class'] });

updateBreakpoint();
window.addEventListener('resize', updateBreakpoint, { passive: true });

// 1) 同步读取本地缓存，避免闪烁
try {
  const cached = localStorage.getItem(CACHE_KEY);
  applyPrefs(cached ? JSON.parse(cached) : DEFAULT_PREFS);
} catch (_) {
  applyPrefs(DEFAULT_PREFS);
}

// 2) chrome.storage 为准
if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
  chrome.storage.sync.get(STORAGE_KEY, (res) => {
    if (res && res[STORAGE_KEY]) applyPrefs(res[STORAGE_KEY]);
    else chrome.storage.sync.set({ [STORAGE_KEY]: prefs });
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes[STORAGE_KEY]?.newValue) {
      applyPrefs(changes[STORAGE_KEY].newValue);
    }
  });
}

darkQuery.addEventListener('change', () => {
  if (prefs.theme === 'auto') applyPrefs(prefs);
});

/* ------------------------------------------------------------------
   DOM 就绪
   ------------------------------------------------------------------ */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', onReady, { once: true });
} else {
  onReady();
}

function ensureViewport() {
  if (!prefs.modernUI || document.querySelector('meta[name="viewport"]')) return;
  const meta = document.createElement('meta');
  meta.name = 'viewport';
  meta.content = 'width=device-width, initial-scale=1';
  document.head?.appendChild(meta);
  updateBreakpoint();
}

function onReady() {
  const steps = [
    ensureViewport,
    enhanceHeader,
    enhanceIndex,
    enhanceThreadList,
    enhanceActionButtons,
    enhanceToolbars,
    enhanceNotice,
    enhanceQuickReply,
    enhanceEditor,
    enhancePreview,
    enhanceLightbox,
    syncFloating,
    setupScroll,
    setupKeyboard,
    setupRowClick,
    restoreAfterPurchase,
    scheduleDarkFix,
    watchInsertedContent
  ];
  runSteps(steps);
}

function runSteps(steps) {
  steps.forEach((fn) => {
    try {
      fn();
    } catch (err) {
      console.warn('[North+]', fn.name, err);
    }
  });
}

// 凛+ 的无缝翻页 / 免刷新回复会往页面里插入新楼层、新帖子行：对新内容补跑逐节点增强（均可重复执行）
function watchInsertedContent() {
  const target = document.getElementById('main') || document.body;
  let timer = 0;
  new MutationObserver((records) => {
    if (!records.some((r) => r.addedNodes.length)) return;
    clearTimeout(timer);
    timer = setTimeout(() => runSteps([enhanceThreadList, enhanceToolbars, markZoomable, scheduleDarkFix]), 300);
  }).observe(target, { childList: true, subtree: true });
}

setupPurchase();
setupRinspDarkToggle();
