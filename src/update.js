// 更新检测：读取 update 分支上的 version.json，与当前扩展版本比较。
// 走 raw.githubusercontent.com（CDN，无 API 限流，允许跨域），不调用 GitHub API。
// 被 background.js（importScripts）和 popup.html（<script>）共用。
const NP_REPO = 'ilooooooveloli/NorthPlus-MD3';
const NP_VERSION_URL = `https://raw.githubusercontent.com/${NP_REPO}/update/version.json`;
const NP_RELEASES_URL = `https://github.com/${NP_REPO}/releases/latest`;
const NP_UPDATE_KEY = 'np_update';
const NP_UPDATE_TTL = 6 * 60 * 60 * 1000; // 缓存 6 小时

function npParseVersion(v) {
  return String(v || '')
    .trim()
    .replace(/^v/i, '')
    .split(/[.+-]/)
    .slice(0, 3)
    .map((n) => parseInt(n, 10) || 0);
}

function npIsNewer(remote, local) {
  const a = npParseVersion(remote);
  const b = npParseVersion(local);
  for (let i = 0; i < 3; i++) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
  }
  return false;
}

async function npCheckForUpdate({ force = false } = {}) {
  const current = chrome.runtime.getManifest().version;
  const stored = (await chrome.storage.local.get(NP_UPDATE_KEY))[NP_UPDATE_KEY];

  let info = stored;
  if (force || !stored || Date.now() - stored.checkedAt > NP_UPDATE_TTL) {
    // 不加随机参数，让请求命中 CDN 缓存（约 5 分钟），只跳过浏览器本地缓存
    const res = await fetch(NP_VERSION_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    info = {
      checkedAt: Date.now(),
      latest: String(data.version || '').replace(/^v/i, ''),
      url: data.url || NP_RELEASES_URL
    };
    await chrome.storage.local.set({ [NP_UPDATE_KEY]: info });
  }

  const hasUpdate = Boolean(info.latest) && npIsNewer(info.latest, current);
  await npSetBadge(hasUpdate);
  return { current, latest: info.latest, url: info.url || NP_RELEASES_URL, checkedAt: info.checkedAt, hasUpdate };
}

async function npSetBadge(hasUpdate) {
  try {
    await chrome.action.setBadgeText({ text: hasUpdate ? 'NEW' : '' });
    if (hasUpdate) await chrome.action.setBadgeBackgroundColor({ color: '#006a64' });
  } catch (_) {
    /* 非扩展环境下忽略 */
  }
}
