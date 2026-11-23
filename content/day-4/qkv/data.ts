import { causalFill, matmul, scale, softmaxRows, transpose, type Mat } from "../averaging/kit";

export const TOK = ["the", "river", "bank", "flooded"];
export const T = 4;
export const C = 4;
export const HS = 2;
export const BANK = 2;

/**
 * x is (T, C) = (4, 4). The weights are made up so every number can be
 * checked by hand; in a real model all three matrices are learned.
 */
export const X: Mat = [
  [1, -0.5, 0, 0.5],
  [1, 1, -1, 0],
  [0.5, 1, 0.5, 0],
  [0.5, 1, -1.5, 1],
];

/** q = [x0 + x2, x1 + x3] */
export const WQ: Mat = [
  [1, 0],
  [0, 1],
  [1, 0],
  [0, 1],
];
/** k = [x0 - x2, x1 - x3] */
export const WK: Mat = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];
/** v = [x1 - x2, x0] */
export const WV: Mat = [
  [0, 1],
  [1, 0],
  [-1, 0],
  [0, 0],
];

export const Q = matmul(X, WQ);
export const K = matmul(X, WK);
export const V = matmul(X, WV);
export const KT = transpose(K);
export const S = matmul(Q, KT);
export const SCALE = 1 / Math.sqrt(HS);
export const SS = scale(S, SCALE);
export const MASKED = causalFill(SS);
export const WEI = softmaxRows(MASKED);
export const OUT = matmul(WEI, V);
/** Without the mask, for the try step and the experiments. */
export const WEI_NOMASK = softmaxRows(SS);
