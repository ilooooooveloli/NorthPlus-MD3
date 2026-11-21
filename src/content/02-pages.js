/* ==========================================================================
   North+ 体验助手 — 页面增强：页头、用户信息卡、首页、帖子列表、按钮、版块公告
   内容脚本按 manifest 顺序加载、共享同一个顶层作用域：
   只做声明，由 99-main.js 的 onReady 调用。
   ========================================================================== */
'use strict';

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
