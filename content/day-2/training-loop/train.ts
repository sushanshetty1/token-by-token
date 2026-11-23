/**
 * A real 3-4-4-1 MLP (tanh hidden layers, linear output) trained in the
 * browser on micrograd's four examples. Everything is deterministic: the
 * weights come from a seeded PRNG, so every learner sees the same run.
 */

import { mulberry32 } from "@/lib/color";

export const XS = [
  [2, 3, -1],
  [3, -1, 0.5],
  [0.5, 1, 1],
  [1, 1, -1],
];
export const YS = [1, -1, -1, 1];
export const SIZES = [3, 4, 4, 1];
export const LR = 0.1;
export const STEPS = 100;

interface Layer {
  W: number[][];
  b: number[];
}
export type Net = Layer[];

/** Same distribution as nn.Linear: uniform in ±1/sqrt(fan_in). */
export function initNet(seed = 42): Net {
  const r = mulberry32(seed);
  const net: Net = [];
  for (let l = 0; l < SIZES.length - 1; l++) {
    const nin = SIZES[l];
    const nout = SIZES[l + 1];
    const k = 1 / Math.sqrt(nin);
    const W: number[][] = [];
    const b: number[] = [];
    for (let j = 0; j < nout; j++) {
      W.push(Array.from({ length: nin }, () => (r() * 2 - 1) * k));
      b.push((r() * 2 - 1) * k);
    }
    net.push({ W, b });
  }
  return net;
}

const clone = (net: Net): Net => net.map((L) => ({ W: L.W.map((row) => [...row]), b: [...L.b] }));
const zerosLike = (net: Net): Net => net.map((L) => ({ W: L.W.map((row) => row.map(() => 0)), b: L.b.map(() => 0) }));

function forward(net: Net, x: number[]) {
  const acts = [x];
  let h = x;
  net.forEach(({ W, b }, l) => {
    const last = l === net.length - 1;
    h = W.map((row, j) => {
      const z = row.reduce((s, w, i) => s + w * h[i], b[j]);
      return last ? z : Math.tanh(z);
    });
    acts.push(h);
  });
  return acts;
}

/** Mean squared error over the 4 examples, and d loss / d p for every parameter. */
export function lossAndGrad(net: Net) {
  const g = zerosLike(net);
  const preds: number[] = [];
  let loss = 0;
  const n = XS.length;
  for (let k = 0; k < n; k++) {
    const acts = forward(net, XS[k]);
    const y = acts[acts.length - 1][0];
    preds.push(y);
    loss += (y - YS[k]) ** 2 / n;
    let delta = [(2 * (y - YS[k])) / n];
    for (let l = net.length - 1; l >= 0; l--) {
      const out = acts[l + 1];
      const inp = acts[l];
      const last = l === net.length - 1;
      const dz = delta.map((d, j) => (last ? d : d * (1 - out[j] ** 2)));
      dz.forEach((d, j) => {
        g[l].b[j] += d;
        inp.forEach((v, i) => (g[l].W[j][i] += d * v));
      });
      delta = inp.map((_, i) => dz.reduce((s, d, j) => s + d * net[l].W[j][i], 0));
    }
  }
  return { loss, preds, grad: g };
}

/** Parameters in PyTorch order: W1, b1, W2, b2, W3, b3 (41 numbers). */
export const flatten = (net: Net) => net.flatMap((L) => [...L.W.flat(), ...L.b]);
export const PARAM_GROUPS = [
  { label: "W1", n: 12 },
  { label: "b1", n: 4 },
  { label: "W2", n: 16 },
  { label: "b2", n: 4 },
  { label: "W3", n: 4 },
  { label: "b3", n: 1 },
];

export interface Run {
  losses: number[];
  preds: number[][];
  params: number[][];
}

export function train(steps: number, lr: number, zeroGrad = true, seed = 42): Run {
  const net = clone(initNet(seed));
  let acc = zerosLike(net);
  const run: Run = { losses: [], preds: [], params: [] };
  for (let t = 0; t <= steps; t++) {
    const { loss, preds, grad } = lossAndGrad(net);
    run.losses.push(loss);
    run.preds.push(preds);
    run.params.push(flatten(net));
    if (t === steps) break;
    acc = zeroGrad
      ? grad
      : acc.map((L, l) => ({ W: L.W.map((row, j) => row.map((v, i) => v + grad[l].W[j][i])), b: L.b.map((v, j) => v + grad[l].b[j]) }));
    net.forEach((L, l) => {
      L.W.forEach((row, j) => row.forEach((_, i) => (row[i] -= lr * acc[l].W[j][i])));
      L.b.forEach((_, j) => (L.b[j] -= lr * acc[l].b[j]));
    });
  }
  return run;
}

/* Computed once, when the lesson loads. */
export const INIT = initNet(42);
export const FIRST = lossAndGrad(INIT);
export const GRAD0 = flatten(FIRST.grad);
export const PARAMS0 = flatten(INIT);
export const RUN = train(STEPS, LR, true);
export const RUN_NOZERO = train(STEPS, LR, false);

/** The parameter with the largest gradient at step 0: the one we follow by hand. */
export const BIG = GRAD0.reduce((best, v, i) => (Math.abs(v) > Math.abs(GRAD0[best]) ? i : best), 0);

/* The 1-D loss bowl used for the learning-rate steps: L(w) = (w - 2)^2. */
export const W_STAR = 2;
export const W_START = -1;
export const bowl = (w: number) => (w - W_STAR) ** 2;
export const bowlGrad = (w: number) => 2 * (w - W_STAR);

export function descend(lr: number, steps: number, zeroGrad = true) {
  const ws = [W_START];
  let w = W_START;
  let acc = 0;
  for (let t = 0; t < steps; t++) {
    const g = bowlGrad(w);
    acc = zeroGrad ? g : acc + g;
    w -= lr * acc;
    ws.push(w);
    if (!Number.isFinite(w) || Math.abs(w) > 1e6) break;
  }
  return ws;
}
