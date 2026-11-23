export interface Cfg {
  nLayer: number;
  C: number;
  nHead: number;
  vocab: number;
  block: number;
}

/** Exact parameter count of a GPT-2 style model (pre-norm, biases, tied lm_head). */
export function count(cfg: Cfg) {
  const { C, vocab, block, nLayer } = cfg;
  const wte = vocab * C;
  const wpe = block * C;
  const ln = 2 * C;
  const cAttn = C * 3 * C + 3 * C;
  const attnProj = C * C + C;
  const cFc = C * 4 * C + 4 * C;
  const mlpProj = 4 * C * C + C;
  const perBlock = ln + cAttn + attnProj + ln + cFc + mlpProj;
  const blocks = nLayer * perBlock;
  const lnF = 2 * C;
  const total = wte + wpe + blocks + lnF;
  return {
    wte,
    wpe,
    ln,
    cAttn,
    attnProj,
    cFc,
    mlpProj,
    perBlock,
    blocks,
    lnF,
    total,
    attn: nLayer * (cAttn + attnProj),
    mlp: nLayer * (cFc + mlpProj),
    norms: nLayer * 2 * ln + lnF,
    untied: total + wte,
  };
}

export const SMALL: Cfg = { nLayer: 12, C: 768, nHead: 12, vocab: 50257, block: 1024 };

export const PRESETS: { id: string; label: string; name: string; cfg: Cfg }[] = [
  { id: "small", label: "124M", name: "GPT-2 small", cfg: SMALL },
  { id: "medium", label: "350M", name: "GPT-2 medium", cfg: { nLayer: 24, C: 1024, nHead: 16, vocab: 50257, block: 1024 } },
  { id: "large", label: "774M", name: "GPT-2 large", cfg: { nLayer: 36, C: 1280, nHead: 20, vocab: 50257, block: 1024 } },
  { id: "xl", label: "1.5B", name: "GPT-2 XL", cfg: { nLayer: 48, C: 1600, nHead: 25, vocab: 50257, block: 1024 } },
  { id: "gpt3", label: "175B", name: "GPT-3", cfg: { nLayer: 96, C: 12288, nHead: 96, vocab: 50257, block: 2048 } },
];

export const commas = (n: number) => Math.round(n).toLocaleString("en-US");

export function short(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(n >= 1e11 ? 1 : 2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e8 ? 1 : 2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return `${n}`;
}

/** Decimal units, like disk sizes: 1 GB = 1e9 bytes. */
export function bytes(n: number) {
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)} TB`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(n >= 1e11 ? 0 : 2)} GB`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e8 ? 0 : 1)} MB`;
  return `${(n / 1e3).toFixed(0)} KB`;
}

export const pct = (part: number, whole: number, digits = 1) => {
  const v = (part / whole) * 100;
  return v > 0 && v < 10 ** -digits ? `<${10 ** -digits}%` : `${v.toFixed(digits)}%`;
};
