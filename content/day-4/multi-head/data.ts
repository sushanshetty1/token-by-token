import { mulberry32 } from "@/lib/color";
import { causalFill, matmul, softmaxRow, softmaxRows, type Mat } from "../averaging/kit";

export const TOKS = ["the", "cat", "sat", "because", "it", "was", "tired"];
export const T = 7;
export const IT = 4;
export const CAT = 1;
export const C = 8;
export const NH = 4;
export const HS = C / NH;
/** Head colors: the categorical token palette, past the q/k/v hues. */
export const HEAD_TINT = [4, 5, 6, 7];

const grid = (f: (i: number, j: number) => number): Mat =>
  TOKS.map((_, i) => TOKS.map((__, j) => f(i, j)));

/**
 * Illustrative heads: the scores follow a rule, the weights are the real
 * causal softmax of those scores. Trained heads are learned and messier.
 */
const PRONOUN: Record<string, number> = { "2,1": 2, "3,2": 1.5, "4,1": 5, "5,4": 2.5, "6,1": 3.5 };
export const HEADS = [
  { name: "previous token", short: "previous", note: "every token looks one step back", scores: grid((i, j) => (j === i - 1 ? 4 : 0)) },
  { name: "first token", short: "first", note: "a resting place when nothing else matters", scores: grid((_, j) => (j === 0 ? 4 : 0)) },
  { name: "pronoun to noun", short: "pronoun", note: "it and tired both point at cat", scores: grid((i, j) => PRONOUN[`${i},${j}`] ?? (i === j ? 1 : 0)) },
  { name: "broad average", short: "average", note: "all scores equal: a plain running mean", scores: grid(() => 0) },
].map((h) => ({ ...h, wei: softmaxRows(causalFill(h.scores)) }));

/** One head forced to cover both jobs: it splits between cat and because. */
export const ONE_HEAD_SCORES = [0, 2.2, 0.3, 2.2, 1];
export const ONE_HEAD = softmaxRow(ONE_HEAD_SCORES);

function seeded(seed: number, rows: number, cols: number, s = 1): Mat {
  const r = mulberry32(seed);
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => Math.round((r() * 2 - 1) * s * 100) / 100));
}

/** A small real forward pass for the diagrams: x, per-head values, outputs, concat, projection. */
export const X = seeded(7, T, C);
export const WV = HEADS.map((_, h) => seeded(100 + h, C, HS, 0.6));
export const HEAD_OUT = HEADS.map((h, i) => matmul(h.wei, matmul(X, WV[i])));
export const CONCAT = X.map((_, t) => HEAD_OUT.flatMap((o) => o[t]));
export const WPROJ = seeded(300, C, C, 0.5);
export const PROJ = matmul(CONCAT, WPROJ);

export const GPT2_C = 768;
export const attnParams = (c: number) => 4 * c * c + 4 * c;
