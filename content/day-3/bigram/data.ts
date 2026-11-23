import { mulberry32 } from "@/lib/color";

/** The toy corpus. 37 characters, 36 adjacent pairs, 11 distinct characters. */
export const TEXT = "she sells sea shells by the sea shore";
export const CHARS = [...new Set(TEXT)].sort();
export const V = CHARS.length;
export const stoi = (c: string) => CHARS.indexOf(c);
export const show = (c: string) => (c === " " ? "·" : c === "\n" ? "↵" : c);

export const PAIRS: [string, string][] = [...TEXT].slice(0, -1).map((c, i) => [c, TEXT[i + 1]]);

/** counts[i][j] = how often CHARS[j] follows CHARS[i]. */
export const COUNTS: number[][] = CHARS.map(() => CHARS.map(() => 0));
for (const [a, b] of PAIRS) COUNTS[stoi(a)][stoi(b)] += 1;

export const ROW_TOTALS = COUNTS.map((r) => r.reduce((a, b) => a + b, 0));
export const NONZERO = COUNTS.flat().filter((v) => v > 0).length;

export const prob = (a: string, b: string) => COUNTS[stoi(a)][stoi(b)] / ROW_TOTALS[stoi(a)];

/** Next-character distribution for row i, with temperature and optional add-one smoothing. */
export function rowProbs(i: number, temperature: number, smooth: boolean) {
  const w = COUNTS[i].map((c) => {
    const n = c + (smooth ? 1 : 0);
    return n === 0 ? 0 : Math.pow(n, 1 / Math.max(0.05, temperature));
  });
  const s = w.reduce((a, b) => a + b, 0);
  return w.map((x) => (s ? x / s : 0));
}

/** Sample n characters, starting after `start`, from the count table. */
export function generate(start: string, n: number, temperature: number, smooth: boolean, seed: number) {
  const rand = mulberry32(seed);
  let cur = stoi(start);
  let out = start;
  for (let k = 0; k < n; k++) {
    const p = rowProbs(cur, temperature, smooth);
    const u = rand();
    let acc = 0;
    let next = p.length - 1;
    for (let j = 0; j < p.length; j++) {
      acc += p[j];
      if (u < acc) {
        next = j;
        break;
      }
    }
    out += CHARS[next];
    cur = next;
  }
  return out;
}

/** The first 8 predictions in "she sells", with the count-table probability of the true next character. */
export const LOSS_ROWS = PAIRS.slice(0, 8).map(([a, b]) => {
  const p = prob(a, b);
  return { a, b, p, loss: -Math.log(p) };
});
export const LOSS_MEAN_8 = LOSS_ROWS.reduce((s, r) => s + r.loss, 0) / LOSS_ROWS.length;
export const LOSS_MEAN_ALL = PAIRS.reduce((s, [a, b]) => s - Math.log(prob(a, b)), 0) / PAIRS.length;

/** The 65 characters of tiny Shakespeare. */
export const SHAKESPEARE = "\n !$&',-.3:;?ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
