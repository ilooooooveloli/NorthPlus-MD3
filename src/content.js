(() => {
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
  // 凛+ 跟随系统切换或改设置时会重新加上该类
  new MutationObserver(syncRinspDark).observe(root, { attributes: true, attributeFilter: ['class'] });

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

  /* ------------------------------------------------------------------
     页头：导航栏移出 #header 以便全程吸顶；品牌；横幅
     ------------------------------------------------------------------ */
  function enhanceHeader() {
    const nav = document.getElementById('mainNav');
    const header = document.getElementById('header');
    const wrap = document.getElementById('wrapA');
    if (!nav || !header) return;

    if (wrap && nav.parentElement === header) {
      wrap.insertBefore(nav, header);
    }

    if (!nav.querySelector('.np-brand')) {
      const brand = el('a', { class: 'np-brand', href: '/', title: '论坛首页' }, [
        el('span', { class: 'np-brand__icon' }),
        document.createTextNode('South+')
      ]);
      nav.prepend(brand);
    }

    enhanceInfobox();

    [...header.children].forEach((child) => {
      if (child.id || child.classList.contains('c') || child.classList.contains('menu')) return;
      if (child.querySelector(':scope > a > img')) child.classList.add('np-ads');
    });

    // 横幅被拦截或未加载时收起空白
    const checkAds = () =>
      document.querySelectorAll('.np-ads').forEach((ad) => {
        const visible = [...ad.querySelectorAll('img')].some((img) => img.offsetHeight > 0);
        ad.classList.toggle('np-ads--empty', !visible);
      });
    checkAds();
    window.addEventListener('load', checkAds, { once: true });
  }

  /* ------------------------------------------------------------------
     用户信息卡：等级/帖子数拆成徽章，链接变 Chip
     ------------------------------------------------------------------ */
  function enhanceInfobox() {
    const info = document.getElementById('user_info');
    if (!info || info.dataset.np) return;
    info.dataset.np = '1';
    document.getElementById('infobox')?.classList.add('np-infobox');

    const line = info.querySelector('div.gray2 > span.fl');
    if (line) {
      line.classList.add('np-info-line');
      const text = line.textContent || '';
      const level = text.match(/等级[:：]\s*([^,，\s]+)/)?.[1];
      const posts = text.match(/帖子[:：]\s*(\d+)/)?.[1];
      [...line.childNodes].forEach((n) => {
        if (n.nodeType === Node.TEXT_NODE) n.remove();
      });
      const lead = [];
      if (level) lead.push(el('span', { class: 'np-level', title: '用户等级', text: level }));
      if (posts) {
        lead.push(
          el('span', { class: 'np-info-stat' }, [el('b', { text: posts }), document.createTextNode(' 帖子')])
        );
      }
      line.prepend(...lead);
      const links = line.querySelectorAll(':scope > a');
      links.forEach((a, i) => a.classList.add('np-chip', i === 0 ? 'np-chip--topics' : 'np-chip--replies'));
    }

    const more = info.querySelector('#td_u');
    if (more) {
      more.classList.add('np-info-more');
      more.title = '更多';
      more.setAttribute('aria-label', '更多');
    }

    const row = info.querySelector('div.gray2')?.parentElement;
    if (row) {
      const honor = [...row.children].find((c) => c.tagName === 'SPAN' && !c.className);
      const edit = row.querySelector(':scope > a.gray2');
      if (honor) {
        honor.classList.add('np-honor');
        if (/说点什么吧/.test(honor.textContent || '')) honor.classList.add('np-honor--empty');
      }
      if (edit) {
        edit.classList.add('np-honor-edit');
        edit.title = '编辑签名';
        edit.setAttribute('aria-label', '编辑签名');
      }
      if (honor || edit) {
        const wrap = el('div', { class: 'np-honor-row' });
        (honor || edit).before(wrap);
        if (honor) wrap.append(honor);
        if (edit) wrap.append(edit);
      }
    }
  }

  /* ------------------------------------------------------------------
     首页：版块图标与今日发帖徽章
     ------------------------------------------------------------------ */
  function enhanceIndex() {
    document.querySelectorAll('tr[id^="fid_"]').forEach((row) => {
      const iconTd = row.querySelector('td.icon');
      const img = iconTd?.querySelector('img');
      if (iconTd && img) {
        const src = img.getAttribute('src') || '';
        const kind = /lock/.test(src) ? 'lock' : /new/.test(src) ? 'new' : 'old';
        iconTd.classList.add('np-ficon', `np-ficon--${kind}`);
        const a = iconTd.querySelector('a');
        if (a) a.setAttribute('aria-label', kind === 'new' ? '有新帖' : '版块');
      }

      const count = row.querySelector(':scope > th > span.s3');
      if (count && !count.dataset.np) {
        count.dataset.np = '1';
        const n = parseInt((count.textContent || '').replace(/[^\d]/g, ''), 10) || 0;
        if (n > 0) {
          count.classList.add('np-badge');
          count.textContent = n > 999 ? '999+' : String(n);
          count.title = `今日 ${n} 帖`;
        } else {
          count.classList.add('np-zero');
        }
      }
    });
  }

  /* ------------------------------------------------------------------
     帖子列表：回复 / 人气拆成图标数字
     ------------------------------------------------------------------ */
  function formatCount(n) {
    if (n >= 10000) return `${(n / 10000).toFixed(1).replace(/\.0$/, '')}万`;
    return String(n);
  }

  function enhanceThreadList() {
    const table = document.getElementById('ajaxtable');
    if (!table) return;
    table.querySelectorAll('tr.tr2').forEach((tr) => {
      if (tr.cells.length === 1) tr.classList.add('np-divider-row');
    });
    table.querySelectorAll('tr.tr3 > td.f10').forEach((td) => {
      if (td.dataset.np) return;
      const m = (td.textContent || '').trim().match(/^(\d+)\s*\/\s*(\d+)$/);
      if (!m) return;
      td.dataset.np = '1';
      const replies = Number(m[1]);
      const views = Number(m[2]);
      const wrap = el('span', { class: 'np-stats' }, [
        el('span', {
          class: `np-stat np-stat--reply${replies >= 100 ? ' np-stat--hot' : ''}`,
          title: `${replies} 回复`,
          text: formatCount(replies)
        }),
        el('span', { class: 'np-stat np-stat--view', title: `${views} 人气`, text: formatCount(views) })
      ]);
      td.dataset.npOriginal = td.innerHTML;
      td.replaceChildren(wrap);
    });
  }

  /* ------------------------------------------------------------------
     发帖 / 回复 位图按钮 → MD3 按钮
     ------------------------------------------------------------------ */
  function upgradeButtons(selector, modifier, label, iconName) {
    document.querySelectorAll(selector).forEach((img) => {
      if (img.closest('table.js-post, div.tipad, div.tiptop, .readbot')) return;
      const link = img.closest('a');
      if (!link || link.dataset.npEnhanced) return;
      link.dataset.npEnhanced = '1';
      link.classList.add('np-action-btn', modifier);
      const inner = el('span', { class: 'np-action-btn__inner' }, [icon(iconName, 18), el('span', { text: label })]);
      link.appendChild(inner);
    });
  }

  function enhanceActionButtons() {
    upgradeButtons(
      'img#td_post, img[id^="td_post"], a[href*="post.php?fid"] > img[src*="post"]',
      'np-action-btn--primary',
      '发新帖',
      'edit'
    );
    upgradeButtons(
      'a[href*="action-reply"] > img[src*="reply"], img[src*="reply.png"]',
      'np-action-btn--reply',
      '回复',
      'reply'
    );
  }

  function enhanceToolbars() {
    document.querySelectorAll('div.t3').forEach((bar) => {
      if (bar.dataset.npT3) return;
      bar.dataset.npT3 = '1';
      const rights = bar.querySelectorAll(':scope > .fr');
      if (!rights.length) return;
      rights[rights.length - 1].classList.add('np-t3-push-right');
      rights.forEach((node, idx) => {
        node.style.setProperty('order', String(10 + (rights.length - 1 - idx)), 'important');
      });
    });
  }

  /* ------------------------------------------------------------------
     快速回复：单栏重排，选项变 Chip，表情 / 附件收进按钮
     ------------------------------------------------------------------ */
  function enhanceQuickReply() {
    if (!prefs.modernUI) return;
    const form = document.querySelector('form[name="FORM"]');
    const box = form?.querySelector(':scope > div.t5');
    const textarea = box?.querySelector('textarea');
    if (!box || !textarea || box.dataset.np) return;
    const row = textarea.closest('tr');
    const mainTd = textarea.closest('td');
    if (!row || !mainTd) return;
    box.dataset.np = '1';
    box.classList.add('np-qr');

    const cells = [...row.children];
    const optsTd = cells.find((c) => c !== mainTd && c.querySelector('input[type="checkbox"]'));
    const fieldset = row.querySelector('fieldset');
    const emojiTd = fieldset?.closest('td');

    /* 选项 → Chip */
    const opts = el('div', { class: 'np-qr-opts', role: 'group', 'aria-label': '发帖选项' });
    if (optsTd) {
      const nodes = [...optsTd.childNodes];
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (!(n instanceof HTMLInputElement) || n.type !== 'checkbox') continue;
        const label = el('label', { class: 'np-opt' });
        const text = [];
        let j = i + 1;
        while (j < nodes.length && nodes[j].nodeType === Node.TEXT_NODE) text.push(nodes[j++].textContent.trim());
        label.append(n, el('span', { text: text.join('') }));
        const extras = [];
        while (j < nodes.length && nodes[j].nodeName !== 'BR') {
          if (nodes[j].nodeType === Node.ELEMENT_NODE) extras.push(nodes[j]);
          j++;
        }
        if (extras.length) {
          const group = el('span', { class: 'np-opt-group' }, [label]);
          extras.forEach((x) => {
            if (x.tagName === 'INPUT') {
              x.setAttribute('inputmode', 'numeric');
              x.setAttribute('aria-label', `${text.join('')}数额`);
            }
            group.append(x);
          });
          opts.append(group);
        } else {
          opts.append(label);
        }
        i = j - 1;
      }
      optsTd.classList.add('np-qr-hidden');
    }

    /* 底部操作栏 */
    const actions = [...mainTd.children].find((c) => c.querySelector('a.abtn') && c.querySelector('input[type="submit"]'));
    actions?.classList.add('np-qr-actions');
    const hint = actions && [...actions.children].find((c) => /Ctrl/.test(c.textContent || ''));
    hint?.classList.add('np-qr-hint');
    if (hint) hint.textContent = 'Ctrl + Enter 发送';
    actions?.querySelector(':scope > div:has(a.abtn)')?.classList.add('np-qr-tools');

    const toolbar = el('div', { class: 'np-qr-toolbar' });

    /* 表情：输入框下方按钮，直接打开多分类表情弹窗 */
    const faceBtn = facePickerButton(fieldset, () => textarea.focus());
    if (faceBtn) {
      toolbar.append(faceBtn);
      emojiTd?.classList.add('np-qr-hidden');
    }

    /* 附件：折叠 */
    const attachTable = mainTd.querySelector(':scope > table');
    if (attachTable) {
      const attachBox = el('div', { class: 'np-qr-attach' });
      attachTable.before(attachBox);
      attachBox.append(attachTable);
      toolbar.append(attachToggle(attachBox));
    }

    textarea.after(toolbar);
    toolbar.after(opts);
    if (!opts.children.length) opts.remove();

    // Ctrl/⌘ + Enter 发送（站点自带仅限部分浏览器）
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        const submit = actions?.querySelector('input[type="submit"]');
        if (submit) {
          e.preventDefault();
          submit.click();
        }
      }
    });
  }

  /* ------------------------------------------------------------------
     表情按钮：发帖 / 回帖共用。
     站点自带的「更多」(#td_face, onclick=showDefault) 会生成多分类表情弹窗
     (read.menu，body 的第一个子元素)。内容脚本拿不到页面全局函数，
     所以通过点击原链接触发，再把弹窗挪到按钮旁边；插入表情仍走站点 addsmile。
     ------------------------------------------------------------------ */
  function faceMenu() {
    const m = document.querySelector('body > .menu:has(> #buttons)');
    return m && m.style.display !== 'none' && m.style.visibility !== 'hidden' ? m : null;
  }

  function placeFaceMenu(menu, btn) {
    const r = btn.getBoundingClientRect();
    const w = menu.offsetWidth;
    const h = menu.offsetHeight;
    const gap = 8;
    const vw = document.documentElement.clientWidth;
    let left = Math.min(Math.max(8, r.left), Math.max(8, vw - w - 8));
    // 优先在按钮上方展开（与输入框贴近），空间不够再放下方
    let top = r.top - h - gap >= 64 ? r.top - h - gap : r.bottom + gap;
    menu.style.setProperty('position', 'absolute', 'important');
    menu.style.setProperty('left', `${left + window.scrollX}px`, 'important');
    menu.style.setProperty('top', `${top + window.scrollY}px`, 'important');
    menu.style.setProperty('opacity', '1');
  }

  // 附件：工具条上的开关按钮，控制折叠的附件区
  function attachToggle(box, open = false) {
    box.hidden = !open;
    const btn = el('button', { type: 'button', class: 'np-qr-btn', 'aria-expanded': String(open) }, [
      icon('attach', 18),
      el('span', { text: '附件' })
    ]);
    btn.addEventListener('click', () => {
      box.hidden = !box.hidden;
      btn.setAttribute('aria-expanded', String(!box.hidden));
    });
    return btn;
  }

  function facePickerButton(scope, refocus) {
    const trigger = (scope || document).querySelector('#td_face');
    if (!trigger) return null;
    const btn = el('button', { type: 'button', class: 'np-qr-btn np-face-btn', 'aria-expanded': 'false', 'aria-haspopup': 'dialog' }, [
      icon('mood', 18),
      el('span', { text: '表情' })
    ]);
    const sync = () => btn.setAttribute('aria-expanded', String(!!faceMenu()));
    const close = () => {
      const m = faceMenu();
      if (m) m.style.display = 'none';
      sync();
    };
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (faceMenu()) return close();
      // 链接若是 href="#"，阻止跳到页顶；javascript: 链接本身就是动作，不拦
      if (!/^\s*javascript:/i.test(trigger.getAttribute('href') || '')) {
        trigger.addEventListener('click', (ev) => ev.preventDefault(), { once: true });
      }
      trigger.click();
      const m = document.querySelector('body > .menu:has(> #buttons)');
      if (m) {
        m.classList.add('np-face-menu');
        placeFaceMenu(m, btn);
        // 站点自己的关闭（✕ / closep）也要同步按钮状态
        if (!m.dataset.npFaceObs) {
          m.dataset.npFaceObs = '1';
          new MutationObserver(() => document.dispatchEvent(new Event('np-face-sync'))).observe(m, {
            attributes: true,
            attributeFilter: ['style', 'class']
          });
        }
      }
      sync();
    });
    document.addEventListener('click', (e) => {
      const m = faceMenu();
      // trigger.click() 冒泡上来的那次点击不算「点外面」
      if (!m || btn.contains(e.target) || trigger.contains(e.target)) return;
      if (m.contains(e.target)) {
        if (e.target instanceof HTMLImageElement && e.target.closest('#showface')) setTimeout(refocus, 0);
        return;
      }
      close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && faceMenu()) close();
    });
    document.addEventListener('np-face-sync', sync);
    return btn;
  }

  /* ------------------------------------------------------------------
     版块公告：默认折叠，按版块记忆
     ------------------------------------------------------------------ */
  function currentFid() {
    const m = location.href.match(/fid[-=](\d+)/);
    return m ? m[1] : 'x';
  }

  function enhanceNotice() {
    const box = document.querySelector('.gonggao');
    const content = document.getElementById('cate_thread');
    if (!box || !content || box.querySelector('.np-notice-toggle')) return;
    if (getComputedStyle(content).display === 'none') return;

    const key = `__np_notice_open_${currentFid()}`;
    let open = false;
    try {
      open = localStorage.getItem(key) === '1';
    } catch (_) {}

    const btn = el('button', { type: 'button', class: 'np-notice-toggle' });
    const render = () => {
      content.classList.toggle('np-collapsed', !open);
      btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? '收起公告' : '展开公告';
    };
    btn.addEventListener('click', () => {
      open = !open;
      try {
        localStorage.setItem(key, open ? '1' : '0');
      } catch (_) {}
      render();
      if (!open) box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
    content.after(btn);
    render();
  }

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

  /* ------------------------------------------------------------------
     发帖页编辑器：所见即所得模式是一个 iframe，外部样式进不去，
     需要把配色写进 iframe 文档；编辑器切换模式时会重建/显隐 iframe，用观察器补上
     ------------------------------------------------------------------ */
  function enhanceEditor() {
    const box = document.querySelector('#editor-content .wysiwyg');
    if (!box || box.dataset.np) return;
    box.dataset.np = '1';
    root.classList.add('np-has-editor');
    new MutationObserver(syncEditorFrame).observe(box, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style']
    });
    // iframe 的 load 不冒泡，用捕获监听
    box.addEventListener('load', syncEditorFrame, true);
    syncEditorFrame();

    // 编辑器底部工具条（表情 / 附件），与快速回复一致；左侧表情框收起
    const smilie = document.getElementById('smiliebox');
    if (prefs.modernUI) {
      const faceBtn = smilie
        ? facePickerButton(smilie, () => {
            const frame = box.querySelector('iframe');
            const ta = box.querySelector('textarea');
            (frame && frame.style.display !== 'none' ? frame.contentWindow : ta)?.focus();
          })
        : null;
      const toolbar = el('div', { class: 'np-qr-toolbar np-editor-toolbar' });
      box.after(toolbar);
      root.classList.add('np-editor-facebar');
      if (faceBtn) toolbar.append(faceBtn);

      // 附件：整段（隐藏附件 / 批量上传 / 上传表格 / 文件类型说明）收进折叠区，与快速回复一致
      const attachRow = [...document.querySelectorAll('#main form .editor-mwidth > div')].find((d) =>
        d.querySelector('input[type="file"]')
      );
      if (attachRow) {
        const attachBox = el('div', { class: 'np-qr-attach np-editor-attach' });
        attachBox.append(...attachRow.childNodes);
        toolbar.after(attachBox);
        // 编辑旧帖时若已有附件（多出的勾选框），默认展开
        const hasExisting = attachBox.querySelectorAll('input[type="checkbox"]').length > 1;
        toolbar.append(attachToggle(attachBox, hasExisting));
        (attachRow.closest('tr') || attachRow).classList.add('np-post-hidden');
      }

      if (faceBtn) {
        smilie.classList.add('np-post-hidden');
        // 侧栏若只剩表情框，就整栏收起，编辑器单栏铺满
        const side = document.getElementById('editor-side');
        const visible = (n) => n.getClientRects().length > 0;
        if (
          side &&
          !side.innerText.trim() &&
          ![...side.querySelectorAll('img, input, select, textarea, iframe')].some(visible)
        ) {
          root.classList.add('np-no-side');
        }
      }
    }

    // 发帖选项的文字是 <span> 不是 <label>，点文字也能勾选
    document.querySelectorAll('#post-option .editor-mwidth > div > span').forEach((span) => {
      const input = span.querySelector('input[type="checkbox"]');
      if (!input) return;
      span.addEventListener('click', (e) => {
        if (e.target !== input) input.click();
      });
    });
  }

  // 帖子预览页（job.php?action=preview）：正文单元格套用帖子正文样式
  function enhancePreview() {
    if (PAGE !== 'preview') return;
    const body = document.querySelector('#main div.t table tr.tr1 > th');
    if (body) body.classList.add('tpc_content', 'np-preview-body');
  }

  function editorFrameCss() {
    const cs = getComputedStyle(root);
    const v = (name) => cs.getPropertyValue(name).trim();
    const dark = root.classList.contains('np-dark');
    return `
:root { color-scheme: ${dark ? 'dark' : 'light'}; }
html, body {
  margin: 0 !important;
  background: ${v('--np-editor-bg')} !important;
}
body {
  box-sizing: border-box;
  min-height: 100vh;
  padding: 14px 18px !important;
  color: ${v('--md-on-surface')} !important;
  caret-color: ${v('--md-primary')};
  font-family: ${v('--md-font')} !important;
  font-size: 15px !important;
  line-height: 1.7 !important;
  word-break: break-word;
}
a { color: ${v('--md-primary')} !important; }
img { max-width: 100%; height: auto; }
::selection { background: ${v('--md-primary-container')}; color: ${v('--md-on-primary-container')}; }
.t, .t td { border-color: ${v('--md-outline-variant')} !important; }
blockquote {
  margin: 8px 0; padding: 8px 14px;
  border-left: 3px solid ${v('--md-primary')};
  background: ${v('--md-surface-container-high')};
  border-radius: 4px;
}
hr { border: none; border-top: 1px solid ${v('--md-outline-variant')}; }
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-thumb { background: ${v('--md-outline-variant')}; border-radius: 10px; border: 2px solid transparent; background-clip: content-box; }
`;
  }

  function syncEditorFrame() {
    if (!document.body) return;
    const frames = document.querySelectorAll('#editor-content .wysiwyg iframe');
    if (!frames.length) return;
    const css = prefs.modernUI ? editorFrameCss() : '';
    frames.forEach((frame) => {
      let doc;
      try {
        doc = frame.contentDocument;
      } catch (_) {
        return;
      }
      if (!doc || !doc.documentElement) return;
      let style = doc.getElementById('np-frame-style');
      if (!css) {
        style?.remove();
        return;
      }
      if (!style) {
        style = doc.createElement('style');
        style.id = 'np-frame-style';
        (doc.head || doc.documentElement).appendChild(style);
      } else if (style !== (doc.head || doc.documentElement).lastElementChild) {
        // 保证排在编辑器自带样式之后
        (doc.head || doc.documentElement).appendChild(style);
      }
      if (style.textContent !== css) style.textContent = css;
    });
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
})();
