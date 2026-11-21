/* ==========================================================================
   North+ 体验助手 — 楼层购买：后台完成后原地刷新并定位
   内容脚本按 manifest 顺序加载、共享同一个顶层作用域：
   只做声明，由 99-main.js 调用。
   ========================================================================== */
'use strict';

/* ------------------------------------------------------------------
   楼层购买：后台完成后原地刷新并定位
   ------------------------------------------------------------------ */
function restoreAfterPurchase() {
  try {
    const y = sessionStorage.getItem('__np_scroll_y');
    if (y !== null) {
      sessionStorage.removeItem('__np_scroll_y');
      const n = Number(y);
      if (!Number.isNaN(n)) requestAnimationFrame(() => window.scrollTo(0, n));
      setTimeout(() => snackbar('购买成功，已回到原来的位置'), 300);
    }
  } catch (_) {}
}

// 拦截购买按钮：后台请求购买，成功后原地刷新（setupPurchase 在 document_start 时注册）
function setupPurchase() {
  document.addEventListener(
    'click',
    async (e) => {
      if (!prefs.stayOnPurchase) return;
      const t = e.target;
      if (!(t instanceof Element)) return;
      const btn = t.closest('input[type="button"][onclick*="action=buytopic"]');
      if (!btn) return;

      const match = (btn.getAttribute('onclick') || '').match(/location\.href\s*=\s*['"]([^'"]+)['"]/);
      if (!match) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const buyUrl = new URL(match[1].replace(/&amp;/g, '&'), location.href).href;
      const original = btn.value;
      btn.disabled = true;
      btn.value = '购买中…';

      try {
        const res = await fetch(buyUrl, { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = await res.arrayBuffer();
        const charset = (res.headers.get('content-type') || '').match(/charset=([^\s;]+)/i)?.[1] || 'utf-8';
        let html;
        try {
          html = new TextDecoder(charset).decode(buf);
        } catch (_) {
          html = new TextDecoder('utf-8').decode(buf);
        }
        if (html.includes('操作完成') || html.includes('已经购买')) {
          try {
            sessionStorage.setItem('__np_scroll_y', String(window.scrollY));
          } catch (_) {}
          location.reload();
        } else {
          location.href = buyUrl;
        }
      } catch (_) {
        btn.disabled = false;
        btn.value = original;
        location.href = buyUrl;
      }
    },
    true
  );
}
