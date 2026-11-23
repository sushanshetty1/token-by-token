/**
 * The training loop, independent of where it runs (Web Worker, node test).
 * One step = get_batch, forward, loss, zero_grad, backward, AdamW step.
 */

import { CharData, getBatch } from "./data";
import { AdamW, DEFAULT_ADAMW, DEFAULT_SWITCHES, GPT, type AdamWConfig, type ModelConfig, type Switches, type Workspace } from "./model";
import { Rng } from "./rng";

export type SizePreset = "tiny" | "small" | "medium";

export const SIZE_PRESETS: Record<SizePreset, { nEmbd: number; nHead: number; nLayer: number }> = {
  tiny: { nEmbd: 32, nHead: 4, nLayer: 1 },
  small: { nEmbd: 48, nHead: 4, nLayer: 2 },
  medium: { nEmbd: 64, nHead: 4, nLayer: 4 },
};

export interface RunConfig {
  nEmbd: number;
  nHead: number;
  nLayer: number;
  blockSize: number;
  batchSize: number;
  lr: number;
  seed: number;
  /** Use only the first N characters of the training split (0 = all of it). */
  trainChars: number;
  /** Batches per split when estimating loss. */
  evalIters: number;
  switches: Switches;
}

export const DEFAULT_RUN: RunConfig = {
  ...SIZE_PRESETS.small,
  blockSize: 32,
  batchSize: 16,
  lr: 3e-3,
  seed: 1337,
  trainChars: 0,
  evalIters: 4,
  switches: DEFAULT_SWITCHES,
};

export class Trainer {
  readonly data: CharData;
  readonly run: RunConfig;
  readonly model: GPT;
  readonly opt: AdamW;
  readonly trainData: Uint8Array;
  step = 0;
  lastGradNorm = 0;
  private readonly rng: Rng;
  private readonly ws: Workspace;
  private inferWs: Workspace | null = null;
  private readonly x: Int32Array;
  private readonly y: Int32Array;
  /** Fixed evaluation batches so the curves are not noisy from batch choice. */
  private readonly evalBatches: { split: "train" | "val"; x: Int32Array; y: Int32Array }[] = [];

  constructor(data: CharData, run: Partial<RunConfig> = {}, opt: Partial<AdamWConfig> = {}) {
    this.data = data;
    this.run = { ...DEFAULT_RUN, ...run, switches: { ...DEFAULT_RUN.switches, ...run.switches } };
    const r = this.run;
    const cfg: ModelConfig = {
      vocabSize: data.vocabSize,
      nEmbd: r.nEmbd,
      nHead: r.nHead,
      nLayer: r.nLayer,
      blockSize: r.blockSize,
    };
    this.model = new GPT(cfg, r.seed, r.switches);
    this.opt = new AdamW(this.model, { ...DEFAULT_ADAMW, lr: r.lr, ...opt });
    this.rng = new Rng(r.seed + 1);
    this.ws = this.model.workspace(r.batchSize);
    this.x = new Int32Array(r.batchSize * r.blockSize);
    this.y = new Int32Array(r.batchSize * r.blockSize);
    this.trainData = r.trainChars > 0 ? data.train.subarray(0, Math.min(r.trainChars, data.train.length)) : data.train;
    const evalRng = new Rng(r.seed + 2);
    for (const split of ["train", "val"] as const) {
      const src = split === "train" ? this.trainData : data.val;
      for (let k = 0; k < r.evalIters; k++) {
        const x = new Int32Array(r.batchSize * r.blockSize);
        const y = new Int32Array(r.batchSize * r.blockSize);
        getBatch(src, r.batchSize, r.blockSize, evalRng, x, y);
        this.evalBatches.push({ split, x, y });
      }
    }
  }

  setSwitches(sw: Partial<Switches>) {
    Object.assign(this.run.switches, sw);
    this.model.sw = { ...this.run.switches };
  }

  setLr(lr: number) {
    this.run.lr = lr;
    this.opt.cfg.lr = lr;
  }

  /** One optimization step. Returns the training loss on this batch. */
  trainStep(): number {
    const { batchSize: B, blockSize: T } = this.run;
    getBatch(this.trainData, B, T, this.rng, this.x, this.y);
    const loss = this.model.forward(this.ws, this.x, this.y, B, T);
    this.model.zeroGrad();
    this.model.backward(this.ws, this.x, this.y);
    this.lastGradNorm = this.opt.step(this.model);
    this.step++;
    return loss;
  }

  /** Mean loss over the fixed evaluation batches of each split. */
  estimateLoss(): { train: number; val: number } {
    const { batchSize: B, blockSize: T } = this.run;
    const sums = { train: 0, val: 0 };
    for (const e of this.evalBatches) sums[e.split] += this.model.forward(this.ws, e.x, e.y, B, T);
    return { train: sums.train / this.run.evalIters, val: sums.val / this.run.evalIters };
  }

  private infer() {
    if (!this.inferWs) this.inferWs = this.model.workspace(1);
    return this.inferWs;
  }

  sample(prompt: string, n: number, temperature: number, seed: number): string {
    const ctx = Array.from(this.data.encode(prompt));
    const ids = this.model.generate(this.infer(), ctx, n, temperature, new Rng(seed));
    return this.data.decode(ids);
  }

  /** Attention weights for a short prompt: [layer][head][query][key]. */
  attention(prompt: string): { tokens: string[]; maps: number[][][][] } {
    const text = prompt.slice(-this.run.blockSize);
    const ids = Array.from(this.data.encode(text));
    const ws = this.infer();
    this.model.forward(ws, ids, null, 1, ids.length);
    return { tokens: [...text], maps: this.model.attentionMaps(ws) };
  }
}
