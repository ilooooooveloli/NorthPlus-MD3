/* ==========================================================================
   North+ 体验助手 — 悬浮工具栏、回顶 FAB、滚动进度、Snackbar
   内容脚本按 manifest 顺序加载、共享同一个顶层作用域：
   只做声明，由 99-main.js 的 onReady / applyPrefs 调用。
   ========================================================================== */
'use strict';

/* ------------------------------------------------------------------
   悬浮工具栏 + 回顶 FAB
   ------------------------------------------------------------------ */
function syncFloating() {
  if (!document.body) return;
  let host = document.getElementById('np-floating');

  if (!prefs.floatingBar) {
    host?.remove();
    return;
  }

  if (!host) {
    const themeBtn = el('button', { type: 'button', class: 'np-icon-btn', 'data-action': 'theme' });
    themeBtn.addEventListener('click', () => {
      if (!prefs.modernUI) {
        savePrefs({ modernUI: true });
        return;
      }
      const nextDark = !isDark();
      savePrefs({ theme: nextDark ? 'dark' : 'light' });
      snackbar(nextDark ? '已切换到深色模式' : '已切换到浅色模式', '跟随系统', () =>
        savePrefs({ theme: 'auto' })
      );
    });

    const wideBtn = el('button', { type: 'button', class: 'np-icon-btn', 'data-action': 'wide' });
    wideBtn.addEventListener('click', () => savePrefs({ wide: !prefs.wide }));

    const tools = [themeBtn, wideBtn];

    if (document.querySelector('form[name="FORM"] textarea')) {
      const replyBtn = el('button', {
        type: 'button',
        class: 'np-icon-btn',
        'data-tip': '快速回复 (R)',
        'aria-label': '快速回复'
      });
      replyBtn.append(icon('chat'));
      replyBtn.addEventListener('click', focusQuickReply);
      tools.push(replyBtn);
    }

    const bottomBtn = el('button', {
      type: 'button',
      class: 'np-icon-btn',
      'data-tip': '到底部',
      'aria-label': '到底部'
    });
    bottomBtn.append(icon('down'));
    bottomBtn.addEventListener('click', () =>
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
    );
    tools.push(bottomBtn);

    const toolbar = el('div', { id: 'np-toolbar', role: 'toolbar', 'aria-label': 'North+ 快捷操作' }, tools);

    const fab = el('button', { type: 'button', id: 'np-fab-top', 'data-tip': '回到顶部 (T)', 'aria-label': '回到顶部' });
    fab.append(icon('up'));
    fab.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    host = el('div', { id: 'np-floating' }, [toolbar, fab]);
    document.body.appendChild(host);
    updateFab();
  }

  const themeBtn = host.querySelector('[data-action="theme"]');
  if (themeBtn) {
    const dark = prefs.modernUI && isDark();
    const tip = !prefs.modernUI ? '启用 MD3 界面' : dark ? '切换到浅色' : '切换到深色';
    themeBtn.dataset.tip = tip;
    themeBtn.setAttribute('aria-label', tip);
    themeBtn.replaceChildren(icon(dark ? 'light' : 'dark'));
  }

  const wideBtn = host.querySelector('[data-action="wide"]');
  if (wideBtn) {
    const tip = prefs.wide ? '恢复原版宽度' : '宽屏适配';
    wideBtn.dataset.tip = tip;
    wideBtn.setAttribute('aria-label', tip);
    wideBtn.setAttribute('aria-pressed', String(Boolean(prefs.wide)));
    wideBtn.replaceChildren(icon(prefs.wide ? 'collapse' : 'expand'));
  }
}

function updateFab() {
  const fab = document.getElementById('np-fab-top');
  if (fab) fab.classList.toggle('np-show', window.scrollY > 480);
}

/* ------------------------------------------------------------------
   滚动：应用栏抬升、FAB 显隐、阅读进度
   ------------------------------------------------------------------ */
function setupScroll() {
  let bar = null;
  if (PAGE === 'read' && document.querySelector('table.js-post')) {
    bar = el('div', { id: 'np-progress', 'aria-hidden': 'true' }, [el('span')]);
    document.body.appendChild(bar);
  }

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      root.classList.toggle('np-scrolled', window.scrollY > 4);
      updateFab();
      if (bar) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const ratio = max > 0 ? Math.min(1, window.scrollY / max) : 0;
        bar.firstChild.style.transform = `scaleX(${ratio})`;
        bar.style.display = prefs.modernUI ? '' : 'none';
      }
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ------------------------------------------------------------------
   Snackbar
   ------------------------------------------------------------------ */
let snackTimer = 0;
function snackbar(text, actionLabel, action) {
  if (!document.body) return;
  let bar = document.getElementById('np-snackbar');
  if (!bar) {
    bar = el('div', { id: 'np-snackbar', role: 'status', 'aria-live': 'polite' });
    document.body.appendChild(bar);
  }
  const children = [el('span', { class: 'np-snackbar__text', text })];
  if (actionLabel && action) {
    children.push(
      el('button', {
        type: 'button',
        class: 'np-snack-action',
        text: actionLabel,
        onclick: () => {
          action();
          bar.classList.remove('np-show');
        }
      })
    );
  }
  bar.replaceChildren(...children);
  requestAnimationFrame(() => bar.classList.add('np-show'));
  clearTimeout(snackTimer);
  snackTimer = setTimeout(() => bar.classList.remove('np-show'), 4000);
}
