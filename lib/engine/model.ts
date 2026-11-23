/**
 * A character-level GPT in plain TypeScript: token and position embeddings,
 * n_layer pre-LayerNorm blocks (causal multi-head attention, then a 4x MLP
 * with ReLU, each wrapped in a residual connection), a final LayerNorm and a
 * linear head. Forward and backward passes are written by hand, in the style
 * of llm.c, over flat typed arrays. Weight matrices are stored (out, in) like
 * PyTorch's nn.Linear.
 */

import { Rng } from "./rng";

export type Arr = Float32Array | Float64Array;
type ArrCtor = Float32ArrayConstructor | Float64ArrayConstructor;

export interface ModelConfig {
  vocabSize: number;
  nEmbd: number;
  nHead: number;
  nLayer: number;
  blockSize: number;
}

/** The "break it" switches. All true is a normal GPT. */
export interface Switches {
  causal: boolean;
  positions: boolean;
  residual: boolean;
  layerNorm: boolean;
}

export const DEFAULT_SWITCHES: Switches = { causal: true, positions: true, residual: true, layerNorm: true };

interface LayerParams {
  ln1g: Arr;
  ln1b: Arr;
  wqkv: Arr;
  wproj: Arr;
  bproj: Arr;
  ln2g: Arr;
  ln2b: Arr;
  wfc: Arr;
  bfc: Arr;
  wfc2: Arr;
  bfc2: Arr;
}

export interface ParamViews {
  wte: Arr;
  wpe: Arr;
  layers: LayerParams[];
  lnfg: Arr;
  lnfb: Arr;
  wlm: Arr;
  blm: Arr;
}

export interface TensorInfo {
  name: string;
  offset: number;
  size: number;
  /** Weight matrices and embeddings get weight decay; biases and LayerNorm do not. */
  decay: boolean;
}

/** Every tensor of the model with its size, in a fixed order. */
export function tensorLayout(cfg: ModelConfig): TensorInfo[] {
  const { vocabSize: V, nEmbd: C, nLayer: L, blockSize: T } = cfg;
  const list: [string, number, boolean][] = [
    ["wte", V * C, true],
    ["wpe", T * C, true],
  ];
  for (let l = 0; l < L; l++) {
    list.push(
      [`h${l}.ln1g`, C, false],
      [`h${l}.ln1b`, C, false],
      [`h${l}.wqkv`, 3 * C * C, true],
      [`h${l}.wproj`, C * C, true],
      [`h${l}.bproj`, C, false],
      [`h${l}.ln2g`, C, false],
      [`h${l}.ln2b`, C, false],
      [`h${l}.wfc`, 4 * C * C, true],
      [`h${l}.bfc`, 4 * C, false],
      [`h${l}.wfc2`, 4 * C * C, true],
      [`h${l}.bfc2`, C, false],
    );
  }
  list.push(["lnfg", C, false], ["lnfb", C, false], ["wlm", V * C, true], ["blm", V, false]);
  let offset = 0;
  return list.map(([name, size, decay]) => {
    const t = { name, offset, size, decay };
    offset += size;
    return t;
  });
}

/** Parameter counts grouped the way the lesson explains them. */
export function paramBreakdown(cfg: ModelConfig) {
  const { vocabSize: V, nEmbd: C, nLayer: L, blockSize: T } = cfg;
  const tokenEmbedding = V * C;
  const positionEmbedding = T * C;
  const attentionPerLayer = 3 * C * C + C * C + C;
  const mlpPerLayer = 4 * C * C + 4 * C + 4 * C * C + C;
  const layerNormPerLayer = 4 * C;
  const perLayer = attentionPerLayer + mlpPerLayer + layerNormPerLayer;
  const head = 2 * C + V * C + V;
  const total = tokenEmbedding + positionEmbedding + L * perLayer + head;
  return { tokenEmbedding, positionEmbedding, attentionPerLayer, mlpPerLayer, layerNormPerLayer, perLayer, head, total };
}

function views(buf: Arr, cfg: ModelConfig): ParamViews {
  const layout = tensorLayout(cfg);
  const get = (name: string) => {
    const t = layout.find((x) => x.name === name)!;
    return buf.subarray(t.offset, t.offset + t.size) as Arr;
  };
  const layers: LayerParams[] = [];
  for (let l = 0; l < cfg.nLayer; l++) {
    const p = (n: string) => get(`h${l}.${n}`);
    layers.push({
      ln1g: p("ln1g"),
      ln1b: p("ln1b"),
      wqkv: p("wqkv"),
      wproj: p("wproj"),
      bproj: p("bproj"),
      ln2g: p("ln2g"),
      ln2b: p("ln2b"),
      wfc: p("wfc"),
      bfc: p("bfc"),
      wfc2: p("wfc2"),
      bfc2: p("bfc2"),
    });
  }
  return { wte: get("wte"), wpe: get("wpe"), layers, lnfg: get("lnfg"), lnfb: get("lnfb"), wlm: get("wlm"), blm: get("blm") };
}

/* ------------------------------------------------------------------ */
/* Kernels                                                             */
/* ------------------------------------------------------------------ */

/** out[N, OC] = inp[N, IC] @ w[OC, IC]^T + b. Four output columns at a time. */
function matmulForward(out: Arr, inp: Arr, w: Arr, b: Arr | null, N: number, IC: number, OC: number) {
  const OC4 = OC - (OC % 4);
  for (let n = 0; n < N; n++) {
    const io = n * IC;
    const oo = n * OC;
    let o = 0;
    for (; o < OC4; o += 4) {
      const w0 = o * IC;
      const w1 = w0 + IC;
      const w2 = w1 + IC;
      const w3 = w2 + IC;
      let s0 = 0;
      let s1 = 0;
      let s2 = 0;
      let s3 = 0;
      for (let i = 0; i < IC; i++) {
        const x = inp[io + i];
        s0 += x * w[w0 + i];
        s1 += x * w[w1 + i];
        s2 += x * w[w2 + i];
        s3 += x * w[w3 + i];
      }
      if (b !== null) {
        s0 += b[o];
        s1 += b[o + 1];
        s2 += b[o + 2];
        s3 += b[o + 3];
      }
      out[oo + o] = s0;
      out[oo + o + 1] = s1;
      out[oo + o + 2] = s2;
      out[oo + o + 3] = s3;
    }
    for (; o < OC; o++) {
      const wo = o * IC;
      let s = b !== null ? b[o] : 0;
      for (let i = 0; i < IC; i++) s += inp[io + i] * w[wo + i];
      out[oo + o] = s;
    }
  }
}

/** Accumulates dinp += dout @ w, dw += dout^T @ inp, db += sum(dout). */
function matmulBackward(
  dinp: Arr | null,
  dw: Arr,
  db: Arr | null,
  dout: Arr,
  inp: Arr,
  w: Arr,
  N: number,
  IC: number,
  OC: number,
) {
  const OC4 = OC - (OC % 4);
  if (dinp !== null) {
    for (let n = 0; n < N; n++) {
      const io = n * IC;
      const oo = n * OC;
      let o = 0;
      for (; o < OC4; o += 4) {
        const d0 = dout[oo + o];
        const d1 = dout[oo + o + 1];
        const d2 = dout[oo + o + 2];
        const d3 = dout[oo + o + 3];
        const w0 = o * IC;
        const w1 = w0 + IC;
        const w2 = w1 + IC;
        const w3 = w2 + IC;
        for (let i = 0; i < IC; i++) {
          dinp[io + i] += d0 * w[w0 + i] + d1 * w[w1 + i] + d2 * w[w2 + i] + d3 * w[w3 + i];
        }
      }
      for (; o < OC; o++) {
        const d = dout[oo + o];
        const wo = o * IC;
        for (let i = 0; i < IC; i++) dinp[io + i] += d * w[wo + i];
      }
    }
  }
  const N4 = N - (N % 4);
  for (let o = 0; o < OC; o++) {
    const wo = o * IC;
    let n = 0;
    let bsum = 0;
    for (; n < N4; n += 4) {
      const d0 = dout[n * OC + o];
      const d1 = dout[(n + 1) * OC + o];
      const d2 = dout[(n + 2) * OC + o];
      const d3 = dout[(n + 3) * OC + o];
      bsum += d0 + d1 + d2 + d3;
      const i0 = n * IC;
      const i1 = i0 + IC;
      const i2 = i1 + IC;
      const i3 = i2 + IC;
      for (let i = 0; i < IC; i++) {
        dw[wo + i] += d0 * inp[i0 + i] + d1 * inp[i1 + i] + d2 * inp[i2 + i] + d3 * inp[i3 + i];
      }
    }
    for (; n < N; n++) {
      const d = dout[n * OC + o];
      bsum += d;
      const io = n * IC;
      for (let i = 0; i < IC; i++) dw[wo + i] += d * inp[io + i];
    }
    if (db !== null) db[o] += bsum;
  }
}

const LN_EPS = 1e-5;

function layerNormForward(out: Arr, mean: Arr, rstd: Arr, inp: Arr, g: Arr, b: Arr, N: number, C: number, on: boolean) {
  if (!on) {
    for (let k = 0; k < N * C; k++) out[k] = inp[k];
    return;
  }
  for (let n = 0; n < N; n++) {
    const o = n * C;
    let m = 0;
    for (let i = 0; i < C; i++) m += inp[o + i];
    m /= C;
    let v = 0;
    for (let i = 0; i < C; i++) {
      const d = inp[o + i] - m;
      v += d * d;
    }
    v /= C;
    const r = 1 / Math.sqrt(v + LN_EPS);
    mean[n] = m;
    rstd[n] = r;
    for (let i = 0; i < C; i++) out[o + i] = (inp[o + i] - m) * r * g[i] + b[i];
  }
}

function layerNormBackward(
  dinp: Arr,
  dg: Arr,
  db: Arr,
  dout: Arr,
  inp: Arr,
  mean: Arr,
  rstd: Arr,
  g: Arr,
  N: number,
  C: number,
  on: boolean,
) {
  if (!on) {
    for (let k = 0; k < N * C; k++) dinp[k] += dout[k];
    return;
  }
  for (let n = 0; n < N; n++) {
    const o = n * C;
    const m = mean[n];
    const r = rstd[n];
    let s1 = 0;
    let s2 = 0;
    for (let i = 0; i < C; i++) {
      const norm = (inp[o + i] - m) * r;
      const dn = dout[o + i] * g[i];
      s1 += dn;
      s2 += dn * norm;
    }
    s1 /= C;
    s2 /= C;
    for (let i = 0; i < C; i++) {
      const norm = (inp[o + i] - m) * r;
      const dn = dout[o + i] * g[i];
      dg[i] += dout[o + i] * norm;
      db[i] += dout[o + i];
      dinp[o + i] += r * (dn - s1 - norm * s2);
    }
  }
}

/** Causal (or full) multi-head attention over a packed qkv buffer of shape (B, T, 3C). */
function attentionForward(y: Arr, att: Arr, qkv: Arr, B: number, T: number, C: number, H: number, causal: boolean) {
  const hs = C / H;
  const C3 = 3 * C;
  const scale = 1 / Math.sqrt(hs);
  for (let b = 0; b < B; b++) {
    for (let h = 0; h < H; h++) {
      for (let i = 0; i < T; i++) {
        const qo = (b * T + i) * C3 + h * hs;
        const ao = ((b * H + h) * T + i) * T;
        const lim = causal ? i + 1 : T;
        let mx = -Infinity;
        for (let j = 0; j < lim; j++) {
          const ko = (b * T + j) * C3 + C + h * hs;
          let s = 0;
          for (let d = 0; d < hs; d++) s += qkv[qo + d] * qkv[ko + d];
          s *= scale;
          att[ao + j] = s;
          if (s > mx) mx = s;
        }
        let sum = 0;
        for (let j = 0; j < lim; j++) {
          const e = Math.exp(att[ao + j] - mx);
          att[ao + j] = e;
          sum += e;
        }
        const inv = 1 / sum;
        for (let j = 0; j < lim; j++) att[ao + j] *= inv;
        for (let j = lim; j < T; j++) att[ao + j] = 0;
        const yo = (b * T + i) * C + h * hs;
        for (let d = 0; d < hs; d++) y[yo + d] = 0;
        for (let j = 0; j < lim; j++) {
          const p = att[ao + j];
          const vo = (b * T + j) * C3 + 2 * C + h * hs;
          for (let d = 0; d < hs; d++) y[yo + d] += p * qkv[vo + d];
        }
      }
    }
  }
}

/** Accumulates into dqkv (which must start at zero). `tmp` needs length >= T. */
function attentionBackward(
  dqkv: Arr,
  dy: Arr,
  att: Arr,
  qkv: Arr,
  tmp: Arr,
  B: number,
  T: number,
  C: number,
  H: number,
  causal: boolean,
) {
  const hs = C / H;
  const C3 = 3 * C;
  const scale = 1 / Math.sqrt(hs);
  for (let b = 0; b < B; b++) {
    for (let h = 0; h < H; h++) {
      for (let i = 0; i < T; i++) {
        const qo = (b * T + i) * C3 + h * hs;
        const ao = ((b * H + h) * T + i) * T;
        const yo = (b * T + i) * C + h * hs;
        const lim = causal ? i + 1 : T;
        let sdp = 0;
        for (let j = 0; j < lim; j++) {
          const vo = (b * T + j) * C3 + 2 * C + h * hs;
          const p = att[ao + j];
          let dp = 0;
          for (let d = 0; d < hs; d++) {
            dp += dy[yo + d] * qkv[vo + d];
            dqkv[vo + d] += p * dy[yo + d];
          }
          tmp[j] = dp;
          sdp += p * dp;
        }
        for (let j = 0; j < lim; j++) {
          const ds = att[ao + j] * (tmp[j] - sdp) * scale;
          if (ds === 0) continue;
          const ko = (b * T + j) * C3 + C + h * hs;
          for (let d = 0; d < hs; d++) {
            dqkv[qo + d] += ds * qkv[ko + d];
            dqkv[ko + d] += ds * qkv[qo + d];
          }
        }
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Activations                                                         */
/* ------------------------------------------------------------------ */

interface LayerActs {
  ln1: Arr;
  ln1m: Arr;
  ln1r: Arr;
  qkv: Arr;
  att: Arr;
  y: Arr;
  xmid: Arr;
  ln2: Arr;
  ln2m: Arr;
  ln2r: Arr;
  h: Arr;
  a: Arr;
}

/** Buffers for one batch shape. Sized for (maxB, maxT); any smaller T reuses them. */
export class Workspace {
  readonly maxB: number;
  readonly maxT: number;
  readonly resid: Arr[];
  readonly layers: LayerActs[];
  readonly lnf: Arr;
  readonly lnfm: Arr;
  readonly lnfr: Arr;
  readonly logits: Arr;
  readonly probs: Arr;
  readonly dres: Arr;
  readonly dln: Arr;
  readonly dqkv: Arr;
  readonly dy: Arr;
  readonly dh: Arr;
  readonly dlogits: Arr;
  readonly tmp: Arr;
  /** Shape of the last forward pass. */
  B = 0;
  T = 0;

  constructor(cfg: ModelConfig, maxB: number, maxT: number, A: ArrCtor) {
    const { nEmbd: C, nHead: H, nLayer: L, vocabSize: V } = cfg;
    const N = maxB * maxT;
    this.maxB = maxB;
    this.maxT = maxT;
    this.resid = Array.from({ length: L + 1 }, () => new A(N * C));
    this.layers = Array.from({ length: L }, () => ({
      ln1: new A(N * C),
      ln1m: new A(N),
      ln1r: new A(N),
      qkv: new A(N * 3 * C),
      att: new A(maxB * H * maxT * maxT),
      y: new A(N * C),
      xmid: new A(N * C),
      ln2: new A(N * C),
      ln2m: new A(N),
      ln2r: new A(N),
      h: new A(N * 4 * C),
      a: new A(N * 4 * C),
    }));
    this.lnf = new A(N * C);
    this.lnfm = new A(N);
    this.lnfr = new A(N);
    this.logits = new A(N * V);
    this.probs = new A(N * V);
    this.dres = new A(N * C);
    this.dln = new A(N * C);
    this.dqkv = new A(N * 3 * C);
    this.dy = new A(N * C);
    this.dh = new A(N * 4 * C);
    this.dlogits = new A(N * V);
    this.tmp = new A(maxT);
  }
}

/* ------------------------------------------------------------------ */
/* Model                                                               */
/* ------------------------------------------------------------------ */

export class GPT {
  readonly cfg: ModelConfig;
  sw: Switches;
  readonly A: ArrCtor;
  readonly params: Arr;
  readonly grads: Arr;
  readonly layout: TensorInfo[];
  readonly P: ParamViews;
  readonly G: ParamViews;

  constructor(cfg: ModelConfig, seed = 1337, switches: Switches = DEFAULT_SWITCHES, A: ArrCtor = Float32Array) {
    if (cfg.nEmbd % cfg.nHead !== 0) throw new Error("nEmbd must be divisible by nHead");
    this.cfg = { ...cfg };
    this.sw = { ...switches };
    this.A = A;
    this.layout = tensorLayout(cfg);
    const total = this.layout.reduce((s, t) => s + t.size, 0);
    this.params = new A(total);
    this.grads = new A(total);
    this.P = views(this.params, cfg);
    this.G = views(this.grads, cfg);
    this.init(seed);
  }

  get numParams() {
    return this.params.length;
  }

  /** GPT-2 style init: N(0, 0.02), output projections scaled by 1/sqrt(2 * n_layer). */
  private init(seed: number) {
    const rng = new Rng(seed);
    const fill = (a: Arr, std: number) => {
      for (let i = 0; i < a.length; i++) a[i] = rng.normal() * std;
    };
    const proj = 0.02 / Math.sqrt(2 * this.cfg.nLayer);
    fill(this.P.wte, 0.02);
    fill(this.P.wpe, 0.02);
    for (const l of this.P.layers) {
      l.ln1g.fill(1);
      l.ln2g.fill(1);
      fill(l.wqkv, 0.02);
      fill(l.wproj, proj);
      fill(l.wfc, 0.02);
      fill(l.wfc2, proj);
    }
    this.P.lnfg.fill(1);
    fill(this.P.wlm, 0.02);
  }

  workspace(maxB: number, maxT = this.cfg.blockSize) {
    return new Workspace(this.cfg, maxB, maxT, this.A);
  }

  /**
   * Runs the model on idx (B * T token ids). Returns the mean cross-entropy
   * loss when targets are given, otherwise NaN. Logits land in ws.logits.
   */
  forward(ws: Workspace, idx: ArrayLike<number>, targets: ArrayLike<number> | null, B: number, T: number): number {
    const { nEmbd: C, nHead: H, vocabSize: V } = this.cfg;
    const sw = this.sw;
    const N = B * T;
    if (B > ws.maxB || T > ws.maxT || T > this.cfg.blockSize) throw new Error("batch larger than workspace");
    ws.B = B;
    ws.T = T;
    const P = this.P;

    const x0 = ws.resid[0];
    for (let n = 0; n < N; n++) {
      const t = n % T;
      const to = idx[n] * C;
      const po = t * C;
      const o = n * C;
      if (sw.positions) for (let i = 0; i < C; i++) x0[o + i] = P.wte[to + i] + P.wpe[po + i];
      else for (let i = 0; i < C; i++) x0[o + i] = P.wte[to + i];
    }

    for (let l = 0; l < this.cfg.nLayer; l++) {
      const p = P.layers[l];
      const a = ws.layers[l];
      const xin = ws.resid[l];
      const xout = ws.resid[l + 1];
      layerNormForward(a.ln1, a.ln1m, a.ln1r, xin, p.ln1g, p.ln1b, N, C, sw.layerNorm);
      matmulForward(a.qkv, a.ln1, p.wqkv, null, N, C, 3 * C);
      attentionForward(a.y, a.att, a.qkv, B, T, C, H, sw.causal);
      matmulForward(a.xmid, a.y, p.wproj, p.bproj, N, C, C);
      if (sw.residual) for (let k = 0; k < N * C; k++) a.xmid[k] += xin[k];
      layerNormForward(a.ln2, a.ln2m, a.ln2r, a.xmid, p.ln2g, p.ln2b, N, C, sw.layerNorm);
      matmulForward(a.h, a.ln2, p.wfc, p.bfc, N, C, 4 * C);
      for (let k = 0; k < N * 4 * C; k++) a.a[k] = a.h[k] > 0 ? a.h[k] : 0;
      matmulForward(xout, a.a, p.wfc2, p.bfc2, N, 4 * C, C);
      if (sw.residual) for (let k = 0; k < N * C; k++) xout[k] += a.xmid[k];
    }

    const xL = ws.resid[this.cfg.nLayer];
    layerNormForward(ws.lnf, ws.lnfm, ws.lnfr, xL, P.lnfg, P.lnfb, N, C, sw.layerNorm);
    matmulForward(ws.logits, ws.lnf, P.wlm, P.blm, N, C, V);

    if (targets === null) return NaN;
    let loss = 0;
    const logits = ws.logits;
    const probs = ws.probs;
    for (let n = 0; n < N; n++) {
      const o = n * V;
      let mx = -Infinity;
      for (let v = 0; v < V; v++) if (logits[o + v] > mx) mx = logits[o + v];
      let sum = 0;
      for (let v = 0; v < V; v++) {
        const e = Math.exp(logits[o + v] - mx);
        probs[o + v] = e;
        sum += e;
      }
      const inv = 1 / sum;
      for (let v = 0; v < V; v++) probs[o + v] *= inv;
      loss -= Math.log(probs[o + targets[n]] + 1e-30);
    }
    return loss / N;
  }

  zeroGrad() {
    this.grads.fill(0);
  }

  /** Backward pass for the last forward on ws (which must have had targets). Accumulates into grads. */
  backward(ws: Workspace, idx: ArrayLike<number>, targets: ArrayLike<number>) {
    const { nEmbd: C, nHead: H, vocabSize: V, nLayer: L } = this.cfg;
    const sw = this.sw;
    const B = ws.B;
    const T = ws.T;
    const N = B * T;
    const P = this.P;
    const G = this.G;

    const dlogits = ws.dlogits;
    const invN = 1 / N;
    for (let n = 0; n < N; n++) {
      const o = n * V;
      for (let v = 0; v < V; v++) dlogits[o + v] = ws.probs[o + v] * invN;
      dlogits[o + targets[n]] -= invN;
    }

    const dres = ws.dres;
    const dln = ws.dln;
    dln.fill(0, 0, N * C);
    matmulBackward(dln, G.wlm, G.blm, dlogits, ws.lnf, P.wlm, N, C, V);
    dres.fill(0, 0, N * C);
    layerNormBackward(dres, G.lnfg, G.lnfb, dln, ws.resid[L], ws.lnfm, ws.lnfr, P.lnfg, N, C, sw.layerNorm);

    for (let l = L - 1; l >= 0; l--) {
      const p = P.layers[l];
      const g = G.layers[l];
      const a = ws.layers[l];
      const xin = ws.resid[l];

      // MLP branch: dres holds d(resid[l + 1]).
      const dh = ws.dh;
      dh.fill(0, 0, N * 4 * C);
      matmulBackward(dh, g.wfc2, g.bfc2, dres, a.a, p.wfc2, N, 4 * C, C);
      for (let k = 0; k < N * 4 * C; k++) if (a.h[k] <= 0) dh[k] = 0;
      dln.fill(0, 0, N * C);
      matmulBackward(dln, g.wfc, g.bfc, dh, a.ln2, p.wfc, N, C, 4 * C);
      if (!sw.residual) dres.fill(0, 0, N * C);
      layerNormBackward(dres, g.ln2g, g.ln2b, dln, a.xmid, a.ln2m, a.ln2r, p.ln2g, N, C, sw.layerNorm);

      // Attention branch: dres now holds d(xmid).
      const dy = ws.dy;
      dy.fill(0, 0, N * C);
      matmulBackward(dy, g.wproj, g.bproj, dres, a.y, p.wproj, N, C, C);
      const dqkv = ws.dqkv;
      dqkv.fill(0, 0, N * 3 * C);
      attentionBackward(dqkv, dy, a.att, a.qkv, ws.tmp, B, T, C, H, sw.causal);
      dln.fill(0, 0, N * C);
      matmulBackward(dln, g.wqkv, null, dqkv, a.ln1, p.wqkv, N, C, 3 * C);
      if (!sw.residual) dres.fill(0, 0, N * C);
      layerNormBackward(dres, g.ln1g, g.ln1b, dln, xin, a.ln1m, a.ln1r, p.ln1g, N, C, sw.layerNorm);
    }

    for (let n = 0; n < N; n++) {
      const t = n % T;
      const to = idx[n] * C;
      const po = t * C;
      const o = n * C;
      for (let i = 0; i < C; i++) G.wte[to + i] += dres[o + i];
      if (sw.positions) for (let i = 0; i < C; i++) G.wpe[po + i] += dres[o + i];
    }
  }

  /** Attention weights from the last forward on ws: [layer][head][query][key]. */
  attentionMaps(ws: Workspace, b = 0): number[][][][] {
    const { nHead: H, nLayer: L } = this.cfg;
    const T = ws.T;
    const out: number[][][][] = [];
    for (let l = 0; l < L; l++) {
      const att = ws.layers[l].att;
      const heads: number[][][] = [];
      for (let h = 0; h < H; h++) {
        const rows: number[][] = [];
        for (let i = 0; i < T; i++) {
          const ao = ((b * H + h) * T + i) * T;
          rows.push(Array.from(att.subarray(ao, ao + T)));
        }
        heads.push(rows);
      }
      out.push(heads);
    }
    return out;
  }

  /** Autoregressive sampling: crop to block_size, take the last logits, sample. */
  generate(ws: Workspace, context: number[], n: number, temperature: number, rng: Rng): number[] {
    const V = this.cfg.vocabSize;
    const T0 = this.cfg.blockSize;
    const ids = context.length ? [...context] : [0];
    const out: number[] = [];
    const probs = new Float64Array(V);
    for (let k = 0; k < n; k++) {
      const ctx = ids.slice(-T0);
      const T = ctx.length;
      this.forward(ws, ctx, null, 1, T);
      const o = (T - 1) * V;
      let mx = -Infinity;
      const temp = Math.max(1e-4, temperature);
      for (let v = 0; v < V; v++) mx = Math.max(mx, ws.logits[o + v] / temp);
      let sum = 0;
      for (let v = 0; v < V; v++) {
        probs[v] = Math.exp(ws.logits[o + v] / temp - mx);
        sum += probs[v];
      }
      let r = rng.next() * sum;
      let next = V - 1;
      for (let v = 0; v < V; v++) {
        r -= probs[v];
        if (r <= 0) {
          next = v;
          break;
        }
      }
      ids.push(next);
      out.push(next);
    }
    return out;
  }
}

/* ------------------------------------------------------------------ */
/* Optimizer                                                           */
/* ------------------------------------------------------------------ */

export interface AdamWConfig {
  lr: number;
  beta1: number;
  beta2: number;
  eps: number;
  weightDecay: number;
  /** Clip the global gradient norm to this value; 0 turns clipping off. */
  gradClip: number;
}

export const DEFAULT_ADAMW: AdamWConfig = { lr: 3e-3, beta1: 0.9, beta2: 0.99, eps: 1e-8, weightDecay: 0.01, gradClip: 1 };

export class AdamW {
  cfg: AdamWConfig;
  private m: Arr;
  private v: Arr;
  private t = 0;
  private decayMask: Uint8Array;

  constructor(model: GPT, cfg: AdamWConfig = DEFAULT_ADAMW) {
    this.cfg = { ...cfg };
    this.m = new model.A(model.numParams);
    this.v = new model.A(model.numParams);
    this.decayMask = new Uint8Array(model.numParams);
    for (const t of model.layout) if (t.decay) this.decayMask.fill(1, t.offset, t.offset + t.size);
  }

  /** Applies one update and returns the gradient norm before clipping. */
  step(model: GPT): number {
    const g = model.grads;
    const p = model.params;
    let sq = 0;
    for (let i = 0; i < g.length; i++) sq += g[i] * g[i];
    const norm = Math.sqrt(sq);
    const { lr, beta1, beta2, eps, weightDecay, gradClip } = this.cfg;
    const clip = gradClip > 0 && norm > gradClip ? gradClip / norm : 1;
    this.t++;
    const bc1 = 1 - Math.pow(beta1, this.t);
    const bc2 = 1 - Math.pow(beta2, this.t);
    const m = this.m;
    const v = this.v;
    const mask = this.decayMask;
    for (let i = 0; i < p.length; i++) {
      const gi = g[i] * clip;
      const mi = beta1 * m[i] + (1 - beta1) * gi;
      const vi = beta2 * v[i] + (1 - beta2) * gi * gi;
      m[i] = mi;
      v[i] = vi;
      let pi = p[i];
      if (mask[i] === 1) pi -= lr * weightDecay * pi;
      p[i] = pi - (lr * (mi / bc1)) / (Math.sqrt(vi / bc2) + eps);
    }
    return norm;
  }
}
