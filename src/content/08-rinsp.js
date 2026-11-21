/* ==========================================================================
   North+ 体验助手 — 兼容「南加北加论坛强化脚本(凛+)」
   内容脚本按 manifest 顺序加载、共享同一个顶层作用域：
   只做声明，由 99-main.js 调用。
   与凛+ 重复的功能以凛+ 为准，多数在 CSS（styles/21-rinsp.css 等）里按凛+ 留下的类名让位：
     - 快速搜索栏：保留凛+ 的「任务」缩写，搜索框换 MD3 外观
     - 回到顶部：凛+ 的按钮在时隐藏扩展的回顶 FAB
     - 默认折叠版块公告：公告被论坛折叠按钮收起时隐藏扩展的展开按钮
     - 页面字体大小：凛+ 放大内容字号时不再固定正文 16px
     - 购买免刷新：凛+ 的替身购买按钮开着该项时自己后台购买，不会触发原按钮；
       关闭或失败时它才点原按钮，正好落到 07-purchase.js 的拦截上，无需额外处理
     - 列表内链接新窗口打开：06-navigation.js 的整行点击 / Enter 遵守链接的 target
   ========================================================================== */
'use strict';

// 凛+ 快捷菜单（⚙️）里的「开启/关闭暗黑模式」：MD3 开启时改为切换 MD3 深浅色。
// 凛+ 用 mousedown 处理，这里在捕获阶段先拦下，免得它改自己的设置后又被 syncRinspDark 摘掉。
function setupRinspDarkToggle() {
  document.addEventListener(
    'mousedown',
    (e) => {
      if (!prefs.modernUI || e.button !== 0) return;
      const t = e.target;
      if (!(t instanceof Element) || !t.closest('.rinsp-quick-action.rinsp-dark-mode-toggle')) return;
      e.stopImmediatePropagation();
      e.preventDefault();
      const nextDark = !isDark();
      savePrefs({ theme: nextDark ? 'dark' : 'light' });
      snackbar(nextDark ? '已切换到深色模式' : '已切换到浅色模式', '跟随系统', () => savePrefs({ theme: 'auto' }));
      t.closest('.rinsp-quick-action-overlay')?.blur();
    },
    true
  );
}
