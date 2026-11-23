import { mulberry32 } from "@/lib/color";

export const gelu = (x: number) => 0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x ** 3)));

const round2 = (x: number) => Math.round(x * 100) / 100;

function gaussian(rand: () => number) {
  const u = Math.max(1e-9, rand());
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** A tiny MLP with C = 8 and hidden 4C = 32, run on one token's vector. */
export function mlpDemo() {
  const rand = mulberry32(5150);
  const C = 8;
  const H = 4 * C;
  const x = Array.from({ length: C }, () => round2(gaussian(rand)));
  const W1 = Array.from({ length: C }, () => Array.from({ length: H }, () => gaussian(rand) / Math.sqrt(C)));
  const W2 = Array.from({ length: H }, () => Array.from({ length: C }, () => gaussian(rand) / Math.sqrt(H)));
  const h = Array.from({ length: H }, (_, j) => x.reduce((s, xi, i) => s + xi * W1[i][j], 0));
  const g = h.map(gelu);
  const out = Array.from({ length: C }, (_, i) => round2(g.reduce((s, gj, j) => s + gj * W2[j][i], 0) * 2));
  return { x, h, g, out };
}

/** LayerNorm on one 6-number token vector, with learned scale and shift. */
export function layerNormDemo() {
  const x = [2.0, -1.0, 0.5, 3.5, -2.0, 1.0];
  const n = x.length;
  const mean = x.reduce((a, b) => a + b, 0) / n;
  const centered = x.map((v) => v - mean);
  const variance = centered.reduce((a, b) => a + b * b, 0) / n;
  const eps = 1e-5;
  const std = Math.sqrt(variance + eps);
  const xhat = centered.map((v) => v / std);
  const gamma = [1.2, 0.8, 1.0, 1.5, 0.6, 1.0];
  const beta = [0.1, 0.0, -0.2, 0.3, 0.0, 0.1];
  const y = xhat.map((v, i) => gamma[i] * v + beta[i]);
  const stats = (v: number[]) => {
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    const s = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length);
    return { mean: m, std: s };
  };
  return { x, mean, centered, variance, std, xhat, gamma, beta, y, stats };
}

export const GPT2 = { vocab: 50257, block: 1024, C: 768, nHead: 12, nLayer: 12 };

/** Parameters of one pre-norm GPT-2 block: 12C^2 + 13C. */
export const blockParams = (C: number) => 2 * C + (3 * C * C + 3 * C) + (C * C + C) + 2 * C + (4 * C * C + 4 * C) + (4 * C * C + C);

export function gptParams(nLayer: number, C = GPT2.C, vocab = GPT2.vocab, block = GPT2.block) {
  return vocab * C + block * C + nLayer * blockParams(C) + 2 * C;
}

export function short(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return `${n}`;
}

export const commas = (n: number) => Math.round(n).toLocaleString("en-US");
