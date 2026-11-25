/**
 * Masked fabric recolouring (runs in the browser, no external service).
 *
 * Only pixels inside the fabric mask change. For each of them the lightness of
 * the cream base photo is kept as *relative* light and shadow around the new
 * colour (so yarn texture, stitch detail, highlights and shadows survive),
 * while the hue comes from the chosen palette colour. Mask edges are blended
 * with the original photo by the mask's soft alpha. Background, hardware and
 * the tag patch are outside the mask and stay exactly as photographed.
 *
 * This is an approximation: real dyed yarn reflects light differently from a
 * recoloured cream photo, especially for very dark or saturated shades.
 */

export interface PreparedBase {
  width: number;
  height: number;
  /** Indices (pixel number) of pixels with mask alpha > 0. */
  index: Uint32Array;
  /** Mask alpha (0–255) for each indexed pixel. */
  alpha: Uint8Array;
  /** CIE L* (0–100) of the base photo for each indexed pixel. */
  lightness: Float32Array;
  /** Median L* of the fully-masked fabric: the "cream" reference level. */
  referenceL: number;
}

const SRGB_TO_LINEAR = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  SRGB_TO_LINEAR[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
const LINEAR_STEPS = 4096;
const LINEAR_TO_SRGB = new Uint8ClampedArray(LINEAR_STEPS + 1);
for (let i = 0; i <= LINEAR_STEPS; i++) {
  const c = i / LINEAR_STEPS;
  const s = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  LINEAR_TO_SRGB[i] = Math.round(s * 255);
}

const XN = 0.95047;
const ZN = 1.08883;
const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
const finv = (t: number) => (t > 0.206893 ? t * t * t : (t - 16 / 116) / 7.787);

export function srgbToLab(r: number, g: number, b: number): [number, number, number] {
  const R = SRGB_TO_LINEAR[r], G = SRGB_TO_LINEAR[g], B = SRGB_TO_LINEAR[b];
  const x = (0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / XN;
  const y = 0.2126729 * R + 0.7151522 * G + 0.072175 * B;
  const z = (0.0193339 * R + 0.119192 * G + 0.9503041 * B) / ZN;
  const fx = f(x), fy = f(y), fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function toByte(linear: number): number {
  if (linear <= 0) return 0;
  if (linear >= 1) return 255;
  return LINEAR_TO_SRGB[Math.round(linear * LINEAR_STEPS)];
}

export function labToSrgb(L: number, a: number, b: number): [number, number, number] {
  const fy = (L + 16) / 116;
  const x = finv(fy + a / 500) * XN;
  const y = finv(fy);
  const z = finv(fy - b / 200) * ZN;
  const R = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z;
  const G = -0.969266 * x + 1.8760108 * y + 0.041556 * z;
  const B = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z;
  return [toByte(R), toByte(G), toByte(B)];
}

export function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m) throw new Error(`Not a colour: ${hex}`);
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

/** Reads the base photo and mask pixels once; reused for every colour. */
export function prepareBase(base: Uint8ClampedArray, mask: Uint8ClampedArray, width: number, height: number): PreparedBase {
  const n = width * height;
  let count = 0;
  for (let i = 0; i < n; i++) if (mask[i * 4] > 0) count++;
  const index = new Uint32Array(count);
  const alpha = new Uint8Array(count);
  const lightness = new Float32Array(count);
  const full: number[] = [];
  let k = 0;
  for (let i = 0; i < n; i++) {
    const m = mask[i * 4];
    if (m === 0) continue;
    const p = i * 4;
    const L = srgbToLab(base[p], base[p + 1], base[p + 2])[0];
    index[k] = i;
    alpha[k] = m;
    lightness[k] = L;
    if (m === 255 && (k & 7) === 0) full.push(L);
    k++;
  }
  full.sort((x, y) => x - y);
  const referenceL = full.length ? full[Math.floor(full.length / 2)] : 80;
  return { width, height, index, alpha, lightness, referenceL };
}

/**
 * Returns a recoloured copy of `base`. `texture` scales the photo's light and
 * shadow around the new colour (see src/config/palette.ts).
 */
export function recolor(
  prep: PreparedBase,
  base: Uint8ClampedArray,
  hex: string,
  texture = 1,
): Uint8ClampedArray<ArrayBuffer> {
  const out = new Uint8ClampedArray(base.length);
  out.set(base);
  const [tr, tg, tb] = hexToRgb(hex);
  const [Lt, at, bt] = srgbToLab(tr, tg, tb);
  const { index, alpha, lightness, referenceL } = prep;
  for (let k = 0; k < index.length; k++) {
    let L = Lt + (lightness[k] - referenceL) * texture;
    // Soft limits keep detail in the brightest highlights and deepest shadows.
    if (L > 96) L = 96 + (L - 96) * 0.25;
    else if (L < 4) L = 4 + (L - 4) * 0.25;
    let sat = 0.7 + (0.3 * L) / Math.max(Lt, 1);
    if (sat < 0.5) sat = 0.5;
    else if (sat > 1.15) sat = 1.15;
    const [r, g, b] = labToSrgb(L, at * sat, bt * sat);
    const p = index[k] * 4;
    const w = alpha[k] / 255;
    out[p] = r * w + base[p] * (1 - w);
    out[p + 1] = g * w + base[p + 1] * (1 - w);
    out[p + 2] = b * w + base[p + 2] * (1 - w);
  }
  return out;
}
