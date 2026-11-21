const STORAGE_KEY = 'np_ext_prefs';
const FULL_WIDTH_SLIDER = 1900;

const DEFAULT_PREFS = {
  theme: 'auto',
  seed: '#39c5bb',
  modernUI: true,
  wide: true,
  maxWidth: 1400,
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
const themeButtons = document.querySelectorAll('#theme-group button');
const toggles = document.querySelectorAll('input[data-pref]');
const widthRange = document.getElementById('width-range');
const widthValue = document.getElementById('width-value');
const seedButtons = document.querySelectorAll('#seed-group button');
const seedCustom = document.getElementById('seed-custom');
const seedCustomLabel = seedCustom.closest('.swatch-custom');
const seedValue = document.getElementById('seed-value');

// 弹窗自身也跟随种子色（只覆盖弹窗用到的角色色）
const POPUP_ROLES = [
  'primary', 'on-primary', 'primary-container', 'on-primary-container', 'secondary',
  'secondary-container', 'on-secondary-container', 'surface', 'on-surface', 'on-surface-variant',
  'surface-container-low', 'surface-container', 'surface-container-high', 'surface-container-highest',
  'outline', 'outline-variant'
];

function applySeed(dark) {
  const style = document.documentElement.style;
  const seed = npColor.normalize(prefs.seed);
  if (seed === npColor.DEFAULT_SEED) {
    POPUP_ROLES.forEach((role) => style.removeProperty(`--md-${role}`));
    return;
  }
  const scheme = npColor.scheme(seed, dark);
  POPUP_ROLES.forEach((role) => style.setProperty(`--md-${role}`, scheme[role]));
}

function render() {
  const dark = prefs.theme === 'dark' || (prefs.theme === 'auto' && darkQuery.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  applySeed(dark);

  const seed = npColor.normalize(prefs.seed);
  let preset = false;
  seedButtons.forEach((btn) => {
    btn.style.setProperty('--sw', btn.dataset.seed);
    const on = btn.dataset.seed === seed;
    if (on) preset = true;
    btn.setAttribute('aria-checked', String(on));
  });
  seedCustomLabel.setAttribute('aria-checked', String(!preset));
  seedCustomLabel.style.setProperty('--sw', seed);
  if (seedCustom.value !== seed) seedCustom.value = seed;
  seedValue.textContent = seed.toUpperCase();

  themeButtons.forEach((btn) => {
    btn.setAttribute('aria-checked', String(btn.dataset.theme === prefs.theme));
  });

  toggles.forEach((input) => {
    input.checked = Boolean(prefs[input.dataset.pref]);
  });

  document.querySelectorAll('[data-requires]').forEach((node) => {
    node.classList.toggle('is-disabled', !prefs[node.dataset.requires]);
  });

  const sliderVal = prefs.maxWidth === 0 ? FULL_WIDTH_SLIDER : prefs.maxWidth;
  widthRange.value = String(sliderVal);
  const pct = ((sliderVal - widthRange.min) / (widthRange.max - widthRange.min)) * 100;
  widthRange.style.setProperty('--fill', `${pct}%`);
  widthValue.textContent = prefs.maxWidth === 0 ? '全宽' : `${prefs.maxWidth}px`;
}

function save(patch) {
  prefs = { ...prefs, ...patch };
  render();
  chrome.storage.sync.set({ [STORAGE_KEY]: prefs });
}

chrome.storage.sync.get(STORAGE_KEY, (res) => {
  if (res && res[STORAGE_KEY]) prefs = { ...DEFAULT_PREFS, ...res[STORAGE_KEY] };
  render();
});

darkQuery.addEventListener('change', render);

themeButtons.forEach((btn) => {
  btn.addEventListener('click', () => save({ theme: btn.dataset.theme }));
});

seedButtons.forEach((btn) => {
  btn.addEventListener('click', () => save({ seed: btn.dataset.seed }));
});

// 拖动取色时只预览，松手（change）再写入存储，避免频繁写 sync
seedCustom.addEventListener('input', () => {
  prefs = { ...prefs, seed: npColor.normalize(seedCustom.value) };
  render();
});
seedCustom.addEventListener('change', () => save({ seed: npColor.normalize(seedCustom.value) }));

toggles.forEach((input) => {
  input.addEventListener('change', () => save({ [input.dataset.pref]: input.checked }));
});

widthRange.addEventListener('input', () => {
  const val = Number(widthRange.value);
  save({ maxWidth: val >= FULL_WIDTH_SLIDER ? 0 : val });
});

document.getElementById('reset').addEventListener('click', () => save({ ...DEFAULT_PREFS }));

document.getElementById('version').textContent = `v${chrome.runtime.getManifest().version}`;

// ---- 更新检测 ----
const updateBanner = document.getElementById('update-banner');
const updateTitle = document.getElementById('update-title');
const checkBtn = document.getElementById('check-update');

function showUpdate(result) {
  updateBanner.hidden = !result.hasUpdate;
  if (result.hasUpdate) {
    updateTitle.textContent = `发现新版本 v${result.latest}`;
    updateBanner.href = result.url;
  }
}

async function runUpdateCheck(force) {
  checkBtn.disabled = true;
  if (force) checkBtn.textContent = '检查中…';
  try {
    const result = await npCheckForUpdate({ force });
    showUpdate(result);
    if (force) checkBtn.textContent = result.hasUpdate ? '有新版本' : '已是最新';
  } catch (_) {
    if (force) checkBtn.textContent = '检查失败';
  } finally {
    checkBtn.disabled = false;
    if (force) setTimeout(() => (checkBtn.textContent = '检查更新'), 2500);
  }
}

checkBtn.addEventListener('click', () => runUpdateCheck(true));
runUpdateCheck(false);
