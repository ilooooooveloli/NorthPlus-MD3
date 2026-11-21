const STORAGE_KEY = 'np_ext_prefs';
const FULL_WIDTH_SLIDER = 1900;

const DEFAULT_PREFS = {
  theme: 'auto',
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

function render() {
  const dark = prefs.theme === 'dark' || (prefs.theme === 'auto' && darkQuery.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';

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

toggles.forEach((input) => {
  input.addEventListener('change', () => save({ [input.dataset.pref]: input.checked }));
});

widthRange.addEventListener('input', () => {
  const val = Number(widthRange.value);
  save({ maxWidth: val >= FULL_WIDTH_SLIDER ? 0 : val });
});

document.getElementById('reset').addEventListener('click', () => save({ ...DEFAULT_PREFS }));

document.getElementById('version').textContent = `v${chrome.runtime.getManifest().version}`;
