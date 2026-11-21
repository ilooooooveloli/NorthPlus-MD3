/* ==========================================================================
   North+ 体验助手 — 键盘快捷键与整行点击
   内容脚本按 manifest 顺序加载、共享同一个顶层作用域：
   只做声明，由 99-main.js 的 onReady 调用。
   ========================================================================== */
'use strict';

/* ------------------------------------------------------------------
   快捷键
   ------------------------------------------------------------------ */
let kbIndex = -1;

function navItems() {
  if (PAGE === 'read') return [...document.querySelectorAll('table.js-post')].map((t) => t.closest('.t5') || t);
  if (PAGE === 'thread') return [...document.querySelectorAll('#ajaxtable tr.tr3')].filter((r) => r.querySelector('h3 a'));
  return [...document.querySelectorAll('tr[id^="fid_"]')];
}

function moveFocus(delta) {
  const items = navItems();
  if (!items.length) return;
  if (kbIndex < 0) {
    // 从视口中第一个可见项开始
    const top = 90;
    kbIndex = items.findIndex((n) => n.getBoundingClientRect().bottom > top);
    if (kbIndex < 0) kbIndex = 0;
    if (delta < 0) kbIndex = Math.max(0, kbIndex - 1);
  } else {
    kbIndex = Math.min(items.length - 1, Math.max(0, kbIndex + delta));
  }
  items.forEach((n, i) => n.classList.toggle('np-kb-focus', i === kbIndex));
  const target = items[kbIndex];
  target.scrollIntoView({ block: PAGE === 'read' ? 'start' : 'center', behavior: 'smooth' });
}

function openFocused(newTab) {
  const items = navItems();
  const item = items[kbIndex];
  if (!item) return;
  const link = item.querySelector('h3 a[href]');
  if (!link) return;
  if (newTab) window.open(link.href, '_blank');
  else location.href = link.href;
}

function gotoPage(delta) {
  const current = document.querySelector('.pages ul li b');
  const li = current?.closest('li');
  if (!li) return;
  const sibling = delta > 0 ? li.nextElementSibling : li.previousElementSibling;
  const link = sibling?.querySelector('a[href]');
  if (link && /^\d+$/.test(link.textContent.trim())) location.href = link.href;
}

function focusQuickReply() {
  const ta = document.querySelector('form[name="FORM"] textarea');
  if (!ta) return;
  ta.closest('.t5')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  setTimeout(() => ta.focus({ preventScroll: true }), 300);
}

function showHelp() {
  let scrim = document.getElementById('np-dialog-scrim');
  if (!scrim) {
    const rows = [
      [['J'], '下一项（楼层 / 帖子 / 版块）'],
      [['K'], '上一项'],
      [['Enter'], '打开选中的帖子或版块'],
      [['Shift', 'Enter'], '在新标签页打开'],
      [['←'], '上一页'],
      [['→'], '下一页'],
      [['R'], '跳到快速回复'],
      [['T'], '回到顶部'],
      [['?'], '显示此帮助']
    ];
    const dl = el('dl');
    rows.forEach(([keys, desc]) => {
      dl.append(el('dt', {}, keys.map((k) => el('kbd', { text: k }))), el('dd', { text: desc }));
    });
    const closeBtn = el('button', { type: 'button', class: 'np-text-btn', text: '知道了' });
    const dialog = el('div', { class: 'np-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'np-help-title' }, [
      el('h2', { id: 'np-help-title', text: '键盘快捷键' }),
      dl,
      el('div', { class: 'np-dialog-actions' }, [closeBtn])
    ]);
    scrim = el('div', { id: 'np-dialog-scrim' }, [dialog]);
    scrim.addEventListener('click', (e) => {
      if (e.target === scrim) scrim.classList.remove('np-show');
    });
    closeBtn.addEventListener('click', () => scrim.classList.remove('np-show'));
    document.body.appendChild(scrim);
  }
  scrim.classList.add('np-show');
  scrim.querySelector('.np-text-btn').focus();
}

function setupKeyboard() {
  document.addEventListener('keydown', (e) => {
    const scrim = document.getElementById('np-dialog-scrim');
    if (e.key === 'Escape') {
      if (lightboxOpen()) closeLightbox();
      scrim?.classList.remove('np-show');
      return;
    }
    if (lightboxOpen()) {
      if (e.key === 'ArrowLeft') stepLightbox(-1);
      if (e.key === 'ArrowRight') stepLightbox(1);
      e.preventDefault();
      return;
    }
    if (!prefs.shortcuts || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
    const t = e.target;
    if (t instanceof Element && t.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) return;
    if (scrim?.classList.contains('np-show')) return;

    const key = e.shiftKey && e.code === 'Slash' ? '?' : e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (e.shiftKey && key !== '?' && key !== 'Enter') return;
    switch (key) {
      case 'j':
        moveFocus(1);
        break;
      case 'k':
        moveFocus(-1);
        break;
      case 'Enter':
        if (kbIndex < 0 || PAGE === 'read') return;
        openFocused(e.shiftKey);
        break;
      case 'ArrowLeft':
        gotoPage(-1);
        break;
      case 'ArrowRight':
        gotoPage(1);
        break;
      case 'r':
        focusQuickReply();
        break;
      case 't':
        window.scrollTo({ top: 0, behavior: 'smooth' });
        break;
      case '?':
        showHelp();
        break;
      default:
        return;
    }
    e.preventDefault();
  });
}

/* ------------------------------------------------------------------
   整行点击（帖子列表 / 首页版块）
   ------------------------------------------------------------------ */
function setupRowClick() {
  document.addEventListener('click', (e) => {
    if (!prefs.rowClick || e.button !== 0) return;
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest('a, button, input, select, textarea, label, .menu')) return;
    if (window.getSelection()?.toString()) return;
    const row = t.closest('#ajaxtable tr.tr3, tr[id^="fid_"]');
    if (!row) return;
    const link = row.querySelector('h3 a[href]');
    if (!link) return;
    if (e.ctrlKey || e.metaKey || e.shiftKey) window.open(link.href, '_blank');
    else location.href = link.href;
  });
}
