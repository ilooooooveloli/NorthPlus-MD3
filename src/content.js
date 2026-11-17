(() => {
  const STORAGE_KEY = 'np_ext_prefs';
  const CACHE_KEY = '__np_ext_prefs_cache';

  const DEFAULT_PREFS = {
    theme: 'auto', // 'auto' | 'dark' | 'light'
    wide: true,
    maxWidth: 1400, // 0 表示全宽 (96vw)
    modernUI: true,
    readable: true,
    floatingBar: true,
    stayOnPurchase: true
  };

  let currentPrefs = { ...DEFAULT_PREFS };
  const darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  function resolveDark(theme) {
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    return darkMediaQuery.matches;
  }

  function applyPrefs(prefs) {
    currentPrefs = { ...DEFAULT_PREFS, ...prefs };
    const root = document.documentElement;
    if (!root) return;

    root.classList.toggle('np-dark', resolveDark(currentPrefs.theme));
    root.classList.toggle('np-wide', Boolean(currentPrefs.wide));
    root.classList.toggle('np-modern', Boolean(currentPrefs.modernUI));
    root.classList.toggle('np-readable', Boolean(currentPrefs.readable));

    if (currentPrefs.maxWidth === 0) {
      root.style.setProperty('--np-width-vw', '96vw');
      root.style.setProperty('--np-max-width', 'none');
    } else {
      root.style.setProperty('--np-width-vw', '92vw');
      root.style.setProperty('--np-max-width', `${currentPrefs.maxWidth}px`);
    }

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(currentPrefs));
    } catch (_) {
      // 忽略无痕模式或禁用存储时的异常
    }

    syncFloatingBar();
  }

  // 1. 尽早从 localStorage 同步读取缓存，避免页面闪烁
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      applyPrefs(JSON.parse(cached));
    } else {
      applyPrefs(DEFAULT_PREFS);
    }
  } catch (_) {
    applyPrefs(DEFAULT_PREFS);
  }

  // 2. 从 chrome.storage.sync 同步最新配置
  if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
    chrome.storage.sync.get(STORAGE_KEY, (res) => {
      if (res && res[STORAGE_KEY]) {
        applyPrefs(res[STORAGE_KEY]);
      } else {
        chrome.storage.sync.set({ [STORAGE_KEY]: currentPrefs });
      }
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && changes[STORAGE_KEY]?.newValue) {
        applyPrefs(changes[STORAGE_KEY].newValue);
      }
    });
  }

  // 3. 监听系统深色模式变化
  darkMediaQuery.addEventListener('change', () => {
    if (currentPrefs.theme === 'auto') {
      applyPrefs(currentPrefs);
    }
  });

  function savePrefs(patch) {
    const next = { ...currentPrefs, ...patch };
    applyPrefs(next);
    if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
      chrome.storage.sync.set({ [STORAGE_KEY]: next });
    }
  }

  // 4. 悬浮快捷工具栏
  function createIconSvg(paths) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '18');
    svg.setAttribute('height', '18');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.innerHTML = paths;
    return svg;
  }

  function syncFloatingBar() {
    const existing = document.getElementById('np-floating-bar');
    if (!currentPrefs.floatingBar) {
      if (existing) existing.remove();
      return;
    }

    if (!document.body) return;

    let bar = existing;
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'np-floating-bar';

      const themeBtn = document.createElement('button');
      themeBtn.type = 'button';
      themeBtn.dataset.action = 'theme';
      themeBtn.addEventListener('click', () => {
        const isDarkNow = resolveDark(currentPrefs.theme);
        savePrefs({ theme: isDarkNow ? 'light' : 'dark' });
      });

      const wideBtn = document.createElement('button');
      wideBtn.type = 'button';
      wideBtn.dataset.action = 'wide';
      wideBtn.addEventListener('click', () => {
        savePrefs({ wide: !currentPrefs.wide });
      });

      const topBtn = document.createElement('button');
      topBtn.type = 'button';
      topBtn.dataset.action = 'top';
      topBtn.title = '回到顶部';
      topBtn.appendChild(
        createIconSvg('<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>')
      );
      topBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });

      bar.append(themeBtn, wideBtn, topBtn);
      document.body.appendChild(bar);
    }

    const themeBtn = bar.querySelector('[data-action="theme"]');
    if (themeBtn) {
      const isDark = resolveDark(currentPrefs.theme);
      themeBtn.title = isDark ? '切换到浅色模式' : '切换到深色模式';
      themeBtn.replaceChildren(
        createIconSvg(
          isDark
            ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>'
            : '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>'
        )
      );
    }

    const wideBtn = bar.querySelector('[data-action="wide"]');
    if (wideBtn) {
      wideBtn.title = currentPrefs.wide ? '恢复原版窄屏' : '开启宽屏适配';
      wideBtn.replaceChildren(
        createIconSvg(
          currentPrefs.wide
            ? '<path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/>'
            : '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>'
        )
      );
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady, { once: true });
  } else {
    onReady();
  }

  function onReady() {
    syncFloatingBar();
    enhanceModernUI();
    restoreScrollAfterPurchase();
  }

  // 4.5 现代化按钮与工具栏增强（非破坏性，保留原链接与事件）
  function enhanceActionButtons(selector, modifierClass, label, iconPaths) {
    document.querySelectorAll(selector).forEach((img) => {
      // 跳过帖子楼层内的操作栏，避免误替换每层楼的回复/引用等按钮
      if (img.closest('table.js-post, div.tipad, div.tiptop, .readbot')) return;
      const link = img.closest('a');
      if (!link || link.dataset.npEnhanced) return;
      link.dataset.npEnhanced = '1';
      link.classList.add('np-action-btn', modifierClass);

      const inner = document.createElement('span');
      inner.className = 'np-action-btn__inner';
      const svg = createIconSvg(iconPaths);
      svg.setAttribute('width', '15');
      svg.setAttribute('height', '15');
      const text = document.createElement('span');
      text.textContent = label;
      inner.append(svg, text);
      link.appendChild(inner);
    });
  }

  function enhanceModernUI() {
    if (!document.body) return;

    enhanceActionButtons(
      'img#td_post, img#td_post1, a[href*="post.php?fid"] > img[src*="post"]',
      'np-action-btn--primary',
      '发新帖',
      '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>'
    );

    enhanceActionButtons(
      'a[href*="action-reply"] > img[src*="reply"], img[src*="reply.png"]',
      'np-action-btn--reply',
      '回复主题',
      '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'
    );

    document.querySelectorAll('div.t3').forEach((bar) => {
      if (bar.dataset.npT3Enhanced) return;
      bar.dataset.npT3Enhanced = '1';
      const rights = bar.querySelectorAll(':scope > .fr');
      if (rights.length === 1) {
        rights[0].classList.add('np-t3-push-right');
      } else if (rights.length > 1) {
        rights[rights.length - 1].classList.add('np-t3-push-right');
        rights.forEach((el, idx) => {
          el.style.order = String(10 + (rights.length - 1 - idx));
        });
      }
    });
  }

  function restoreScrollAfterPurchase() {
    try {
      const savedY = sessionStorage.getItem('__np_scroll_y');
      if (savedY !== null) {
        sessionStorage.removeItem('__np_scroll_y');
        const y = Number(savedY);
        if (!Number.isNaN(y)) {
          requestAnimationFrame(() => window.scrollTo(0, y));
        }
      }
    } catch (_) {}
  }

  // 5. 拦截楼层购买按钮：后台完成购买后原地刷新，避免跳回帖子首页
  document.addEventListener(
    'click',
    async (e) => {
      if (!currentPrefs.stayOnPurchase) return;
      const target = e.target;
      if (!(target instanceof Element)) return;

      const btn = target.closest('input[type="button"][onclick*="action=buytopic"]');
      if (!btn) return;

      const onclickAttr = btn.getAttribute('onclick') || '';
      const match = onclickAttr.match(/location\.href\s*=\s*['"]([^'"]+)['"]/);
      if (!match) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const buyUrl = new URL(match[1].replace(/&amp;/g, '&'), window.location.href).href;
      const origValue = btn.value;
      btn.disabled = true;
      btn.value = '购买中...';

      try {
        const res = await fetch(buyUrl, { credentials: 'include' });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const buf = await res.arrayBuffer();
        const ct = res.headers.get('content-type') || '';
        const charsetMatch = ct.match(/charset=([^\s;]+)/i);
        const charset = charsetMatch ? charsetMatch[1] : 'utf-8';
        let html = '';
        try {
          html = new TextDecoder(charset).decode(buf);
        } catch (_) {
          html = new TextDecoder('utf-8').decode(buf);
        }

        if (html.includes('操作完成') || html.includes('已经购买')) {
          try {
            sessionStorage.setItem('__np_scroll_y', String(window.scrollY));
          } catch (_) {}
          window.location.reload();
        } else {
          window.location.href = buyUrl;
        }
      } catch (_) {
        btn.disabled = false;
        btn.value = origValue;
        window.location.href = buyUrl;
      }
    },
    true
  );
})();
