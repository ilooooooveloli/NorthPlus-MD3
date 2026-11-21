/* ==========================================================================
   North+ 体验助手 — 种子色 → Material 3 配色（tonal spot 近似）
   以 CIELAB L* 作为 tone（与 HCT 的 tone 定义一致），LCh 色相 / 彩度近似 HCT，
   超出 sRGB 色域时降低彩度。content script 与弹窗共用，挂在 globalThis 上。
   ========================================================================== */
(() => {
  'use strict';

  const DEFAULT_SEED = '#39c5bb';

  // ---- sRGB <-> CIELAB (D65) ----
  const WHITE = [95.047, 100, 108.883];

  function toLinear(c) {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  function fromLinear(c) {
    const v = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    return v * 255;
  }

  function hexToRgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function rgbToHex(rgb) {
    return '#' + rgb.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('');
  }

  function rgbToLch(rgb) {
    const [r, g, b] = rgb.map(toLinear);
    const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) * 100;
    const y = (r * 0.2126729 + g * 0.7151522 + b * 0.072175) * 100;
    const z = (r * 0.0193339 + g * 0.119192 + b * 0.9503041) * 100;
    const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
    const fx = f(x / WHITE[0]);
    const fy = f(y / WHITE[1]);
    const fz = f(z / WHITE[2]);
    const L = 116 * fy - 16;
    const A = 500 * (fx - fy);
    const B = 200 * (fy - fz);
    const h = ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
    return { l: L, c: Math.hypot(A, B), h };
  }

  // 返回线性 sRGB（可能越界）
  function lchToLinear(l, c, h) {
    const hr = (h * Math.PI) / 180;
    const A = c * Math.cos(hr);
    const B = c * Math.sin(hr);
    const fy = (l + 16) / 116;
    const fx = fy + A / 500;
    const fz = fy - B / 200;
    const inv = (t) => (t * t * t > 216 / 24389 ? t * t * t : (116 * t - 16) / (24389 / 27));
    const x = (inv(fx) * WHITE[0]) / 100;
    const y = (inv(fy) * WHITE[1]) / 100;
    const z = (inv(fz) * WHITE[2]) / 100;
    return [
      x * 3.2404542 + y * -1.5371385 + z * -0.4985314,
      x * -0.969266 + y * 1.8760108 + z * 0.041556,
      x * 0.0556434 + y * -0.2040259 + z * 1.0572252
    ];
  }

  const inGamut = (lin) => lin.every((v) => v >= -1e-4 && v <= 1 + 1e-4);

  // 指定 tone/彩度/色相取色，越界时二分降低彩度
  function tone(h, c, t) {
    if (t >= 100) return '#ffffff';
    if (t <= 0) return '#000000';
    let lin = lchToLinear(t, c, h);
    if (!inGamut(lin)) {
      let lo = 0;
      let hi = c;
      for (let i = 0; i < 18; i++) {
        const mid = (lo + hi) / 2;
        if (inGamut(lchToLinear(t, mid, h))) lo = mid;
        else hi = mid;
      }
      lin = lchToLinear(t, lo, h);
    }
    return rgbToHex(lin.map((v) => fromLinear(Math.min(1, Math.max(0, v)))));
  }

  /**
   * 由种子色生成一套 MD3 角色色。
   * @returns {Record<string,string>} 键为不带前缀的角色名（primary、on-primary…）
   */
  function scheme(seedHex, dark) {
    const rgb = hexToRgb(seedHex) || hexToRgb(DEFAULT_SEED);
    const { h } = rgbToLch(rgb);
    const P = (t) => tone(h, 32, t);
    const S = (t) => tone(h, 10, t);
    const T = (t) => tone((h + 60) % 360, 18, t);
    const N = (t) => tone(h, 3, t);
    const NV = (t) => tone(h, 4.5, t);
    const E = (t) => tone(32, 60, t);

    if (!dark) {
      return {
        primary: P(40), 'on-primary': P(100), 'primary-container': P(90), 'on-primary-container': P(30),
        secondary: S(40), 'on-secondary': S(100), 'secondary-container': S(90), 'on-secondary-container': S(30),
        tertiary: T(40), 'on-tertiary': T(100), 'tertiary-container': T(90), 'on-tertiary-container': T(30),
        error: E(40), 'on-error': '#ffffff', 'error-container': E(90), 'on-error-container': E(30),
        surface: N(98), 'on-surface': N(10), 'on-surface-variant': NV(30),
        'surface-container-lowest': '#ffffff', 'surface-container-low': N(96), 'surface-container': N(94),
        'surface-container-high': N(92), 'surface-container-highest': N(90),
        outline: NV(50), 'outline-variant': NV(80),
        'inverse-surface': N(20), 'inverse-on-surface': N(95), 'inverse-primary': P(80)
      };
    }
    return {
      primary: P(80), 'on-primary': P(20), 'primary-container': P(30), 'on-primary-container': P(90),
      secondary: S(80), 'on-secondary': S(20), 'secondary-container': S(30), 'on-secondary-container': S(90),
      tertiary: T(80), 'on-tertiary': T(20), 'tertiary-container': T(30), 'on-tertiary-container': T(90),
      error: E(80), 'on-error': E(20), 'error-container': E(30), 'on-error-container': E(90),
      surface: N(6), 'on-surface': N(90), 'on-surface-variant': NV(80),
      'surface-container-lowest': N(4), 'surface-container-low': N(10), 'surface-container': N(12),
      'surface-container-high': N(17), 'surface-container-highest': N(22),
      outline: NV(60), 'outline-variant': NV(30),
      'inverse-surface': N(90), 'inverse-on-surface': N(20), 'inverse-primary': P(40)
    };
  }

  function normalize(hex) {
    const rgb = hexToRgb(hex);
    return rgb ? rgbToHex(rgb) : DEFAULT_SEED;
  }

  globalThis.npColor = { DEFAULT_SEED, scheme, normalize };
})();
