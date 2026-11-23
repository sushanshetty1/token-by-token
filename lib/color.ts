/**
 * Color helpers for data. Every number drawn as a cell uses these, so a value
 * looks the same in every lesson: negative leans ultramarine, positive leans
 * saffron, zero is blank paper.
 */

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** Diverging fill for a signed value. `max` is the magnitude that saturates. */
export function diverging(v: number, max = 1): string {
  const t = clamp(v / (max || 1), -1, 1);
  const pct = Math.round(Math.abs(t) * 92);
  const end = t < 0 ? "var(--neg)" : "var(--pos)";
  return `color-mix(in oklab, ${end} ${pct}%, var(--cell-zero))`;
}

/** Sequential fill for 0..1 values such as probabilities or attention weights. */
export function sequential(p: number, color = "var(--accent)"): string {
  const pct = Math.round(clamp(p, 0, 1) * 92);
  return `color-mix(in oklab, ${color} ${pct}%, var(--cell-zero))`;
}

/**
 * Text color that stays readable on top of diverging()/sequential() fills.
 * Saffron is light in both themes, so strong positive cells take dark text;
 * strong ultramarine (and sequential) cells take the theme's contrasting text.
 */
export function inkOn(strength: number, sequentialFill = false): string {
  if (Math.abs(strength) <= 0.58) return "var(--ink)";
  if (sequentialFill) return "var(--on-neg)";
  return strength > 0 ? "var(--on-pos)" : "var(--on-neg)";
}

const TOKEN_HUES = [
  "#2f52d0",
  "#c8405a",
  "#2a8a57",
  "#d98a1c",
  "#6b4fd0",
  "#0f8b9c",
  "#b4561f",
  "#8a7300",
];

/** Fill and stroke for a token chip, stable per index. Works in both themes. */
export function tokenTint(i: number) {
  const hue = TOKEN_HUES[((i % TOKEN_HUES.length) + TOKEN_HUES.length) % TOKEN_HUES.length];
  return {
    hue,
    fill: `color-mix(in oklab, ${hue} 18%, var(--card))`,
    stroke: `color-mix(in oklab, ${hue} 60%, var(--card))`,
    text: `color-mix(in oklab, ${hue} 70%, var(--ink))`,
  };
}

/** Small deterministic PRNG so "random" vectors are identical on every render. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A fake but stable embedding: values in [-1, 1]. */
export function seededVector(seed: number | string, n: number) {
  const rand = mulberry32(typeof seed === "number" ? seed : hashString(seed));
  return Array.from({ length: n }, () => Math.round((rand() * 2 - 1) * 100) / 100);
}

export function softmax(xs: number[], temperature = 1) {
  const t = Math.max(1e-6, temperature);
  const m = Math.max(...xs);
  const e = xs.map((x) => Math.exp((x - m) / t));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / s);
}

export const fmt = (x: number, digits = 2) =>
  Number.isFinite(x) ? x.toFixed(digits).replace(/^-0\.00$/, "0.00") : x > 0 ? "∞" : "-∞";
