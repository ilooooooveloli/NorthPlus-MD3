const STORAGE_KEY = 'np_ext_prefs';
const FULL_WIDTH_SLIDER = 1900;

const DEFAULT_PREFS = {
  theme: 'auto',
  wide: true,
  maxWidth: 1400,
  modernUI: true,
  readable: true,
  floatingBar: true,
  stayOnPurchase: true
};

let prefs = { ...DEFAULT_PREFS };

const themeButtons = document.querySelectorAll('#theme-group button');
const wideToggle = document.getElementById('wide-toggle');
const widthControl = document.getElementById('width-control');
const widthRange = document.getElementById('width-range');
const widthValue = document.getElementById('width-value');
const modernToggle = document.getElementById('modern-toggle');
const readableToggle = document.getElementById('readable-toggle');
const purchaseToggle = document.getElementById('purchase-toggle');
const floatingToggle = document.getElementById('floating-toggle');

function render() {
  themeButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.theme === prefs.theme);
  });

  wideToggle.checked = Boolean(prefs.wide);
  widthControl.classList.toggle('disabled', !prefs.wide);

  const sliderVal = prefs.maxWidth === 0 ? FULL_WIDTH_SLIDER : prefs.maxWidth;
  widthRange.value = String(sliderVal);
  widthValue.textContent = prefs.maxWidth === 0 ? '全宽 (96%)' : `${prefs.maxWidth}px`;

  modernToggle.checked = Boolean(prefs.modernUI);
  readableToggle.checked = Boolean(prefs.readable);
  purchaseToggle.checked = Boolean(prefs.stayOnPurchase);
  floatingToggle.checked = Boolean(prefs.floatingBar);
}

function save(patch) {
  prefs = { ...prefs, ...patch };
  render();
  chrome.storage.sync.set({ [STORAGE_KEY]: prefs });
}

chrome.storage.sync.get(STORAGE_KEY, (res) => {
  if (res && res[STORAGE_KEY]) {
    prefs = { ...DEFAULT_PREFS, ...res[STORAGE_KEY] };
  }
  render();
});

themeButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    save({ theme: btn.dataset.theme });
  });
});

wideToggle.addEventListener('change', () => {
  save({ wide: wideToggle.checked });
});

widthRange.addEventListener('input', () => {
  const val = Number(widthRange.value);
  const maxWidth = val >= FULL_WIDTH_SLIDER ? 0 : val;
  save({ maxWidth });
});

modernToggle.addEventListener('change', () => {
  save({ modernUI: modernToggle.checked });
});

readableToggle.addEventListener('change', () => {
  save({ readable: readableToggle.checked });
});

purchaseToggle.addEventListener('change', () => {
  save({ stayOnPurchase: purchaseToggle.checked });
});

floatingToggle.addEventListener('change', () => {
  save({ floatingBar: floatingToggle.checked });
});
