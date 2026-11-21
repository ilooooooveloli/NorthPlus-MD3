/* ==========================================================================
   North+ 体验助手 — 快速回复与发帖编辑器：表情、附件、所见即所得配色
   内容脚本按 manifest 顺序加载、共享同一个顶层作用域：
   只做声明，由 99-main.js 的 onReady / applyPrefs 调用。
   ========================================================================== */
'use strict';

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
