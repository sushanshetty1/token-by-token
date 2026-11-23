import { matmul, softmaxRow, tril, type Mat } from "./kit";

export const TOK8 = ["the", "river", "bank", "flooded", "after", "heavy", "spring", "rain"];
/** Next token for each position of the 8-token window. */
export const NEXT8 = ["river", "bank", "flooded", "after", "heavy", "spring", "rain", "?"];

/** x for the worked example: small numbers whose running means are whole. */
export const X8: Mat = [
  [3, 0],
  [1, 2],
  [-1, 1],
  [1, -3],
  [-1, 2],
  [2, 1],
  [0, -2],
  [-2, 0],
];

export const T = 4;
export const TOK = TOK8.slice(0, T);
export const X = X8.slice(0, T);

export const TRIL = tril(T);
export const SUMS = matmul(TRIL, X);
export const WEI = TRIL.map((row) => {
  const s = row.reduce((a, b) => a + b, 0);
  return row.map((v) => v / s);
});
export const XBOW = matmul(WEI, X);

/** Row bank (index 2) computed three ways, for the "fixed weights" step. */
export const BANK = 2;
export const ZERO_FILL = [0, 0, 0, 0];
export const INF_FILL = [0, 0, 0, -Infinity];
export const CONTENT = [-1, 2, 0.5, -Infinity];
export const rowOut = (w: number[]) => [0, 1].map((c) => w.reduce((s, wi, j) => s + wi * X[j][c], 0));
export const THREE_WAYS = [ZERO_FILL, INF_FILL, CONTENT].map((scores) => {
  const w = softmaxRow(scores);
  return { scores, w, out: rowOut(w) };
});
