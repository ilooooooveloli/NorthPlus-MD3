/* ==========================================================================
   North+ 体验助手 — 图片查看器
   内容脚本按 manifest 顺序加载、共享同一个顶层作用域：
   只做声明，由 99-main.js 的 onReady 调用。
   ========================================================================== */
'use strict';

/* ------------------------------------------------------------------
   图片查看器
   ------------------------------------------------------------------ */
const lb = { node: null, imgs: [], index: 0 };

function isZoomable(img) {
  if (!img.closest('.tpc_content') || img.closest('a')) return false;
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  return w >= 160 || h >= 160;
}

function markZoomable() {
  const mark = (img) => {
    if (isZoomable(img)) img.classList.add('np-zoomable');
  };
  document.querySelectorAll('.tpc_content img:not([data-np-zoom])').forEach((img) => {
    img.dataset.npZoom = '1';
    if (img.complete) mark(img);
    else img.addEventListener('load', () => mark(img), { once: true });
  });
}

function enhanceLightbox() {
  markZoomable();

  document.addEventListener(
    'click',
    (e) => {
      if (!prefs.lightbox) return;
      const img = e.target instanceof Element ? e.target.closest('.tpc_content img') : null;
      if (!img || !isZoomable(img)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const scope = img.closest('.tpc_content');
      const imgs = [...scope.querySelectorAll('img')].filter(isZoomable);
      openLightbox(imgs, Math.max(0, imgs.indexOf(img)));
    },
    true
  );
}

function buildLightbox() {
  const img = el('img', { alt: '' });
  const count = el('span', { class: 'np-lb-count' });
  const openBtn = el('button', { type: 'button', class: 'np-icon-btn', 'aria-label': '在新标签页打开原图' }, [
    icon('openNew')
  ]);
  const closeBtn = el('button', { type: 'button', class: 'np-icon-btn', 'aria-label': '关闭' }, [icon('close')]);
  const prev = el('button', { type: 'button', class: 'np-icon-btn np-lb-nav np-lb-prev', 'aria-label': '上一张' }, [
    icon('left')
  ]);
  const next = el('button', { type: 'button', class: 'np-icon-btn np-lb-nav np-lb-next', 'aria-label': '下一张' }, [
    icon('right')
  ]);
  const node = el('div', { id: 'np-lightbox', role: 'dialog', 'aria-modal': 'true', 'aria-label': '图片查看' }, [
    el('div', { class: 'np-lb-bar' }, [count, openBtn, closeBtn]),
    prev,
    img,
    next
  ]);

  node.addEventListener('click', (e) => {
    if (e.target === node || e.target === img) closeLightbox();
  });
  closeBtn.addEventListener('click', closeLightbox);
  openBtn.addEventListener('click', () => window.open(lb.imgs[lb.index]?.src, '_blank', 'noopener'));
  prev.addEventListener('click', () => stepLightbox(-1));
  next.addEventListener('click', () => stepLightbox(1));
  document.body.appendChild(node);
  lb.node = node;
}

function renderLightbox() {
  const { node, imgs, index } = lb;
  node.querySelector('img').src = imgs[index].src;
  node.querySelector('.np-lb-count').textContent = imgs.length > 1 ? `${index + 1} / ${imgs.length}` : '';
  node.querySelector('.np-lb-prev').hidden = index === 0;
  node.querySelector('.np-lb-next').hidden = index >= imgs.length - 1;
}

function openLightbox(imgs, index) {
  if (!lb.node) buildLightbox();
  lb.imgs = imgs;
  lb.index = index;
  renderLightbox();
  lb.node.classList.add('np-show');
  document.documentElement.style.overflow = 'hidden';
}

function stepLightbox(delta) {
  const next = lb.index + delta;
  if (next < 0 || next >= lb.imgs.length) return;
  lb.index = next;
  renderLightbox();
}

function closeLightbox() {
  if (!lb.node) return;
  lb.node.classList.remove('np-show');
  document.documentElement.style.overflow = '';
}

const lightboxOpen = () => lb.node?.classList.contains('np-show');
