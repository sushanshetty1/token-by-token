import type { ResetOptions } from "@/lib/engine/protocol";
import { paramBreakdown } from "@/lib/engine/model";
import { DEFAULT_RUN } from "@/lib/engine/trainer";
import recorded from "./recorded.json";

export const TRAIN_LAB = "train-lab";
export const OVERFIT_LAB = "train-lab-overfit";

/** The live run. Must match the recorded run (scripts in lib/engine/experiments.test.ts). */
export const TRAIN_DEFAULTS: ResetOptions = {
  run: { evalIters: 6 },
  evalEvery: 50,
  sampleEvery: 100,
  sampleLen: 160,
  sampleTemperature: 0.8,
};

export const OVERFIT_CHARS = 10_000;
export const OVERFIT_STEPS = 1000;
export const OVERFIT_DEFAULTS: ResetOptions = {
  run: { evalIters: 4, trainChars: OVERFIT_CHARS },
  evalEvery: 50,
  sampleEvery: 0,
};

/** Cross-entropy of count-based models on the training split (computed offline). */
export const UNIGRAM = 3.31;
export const BIGRAM = 2.45;

export const VOCAB = 65;
export const TEXT_CHARS = 1_115_394;
export const TRAIN_CHARS = 1_003_854;
export const VAL_CHARS = 111_540;

export const CONFIG = {
  vocabSize: VOCAB,
  nEmbd: DEFAULT_RUN.nEmbd,
  nHead: DEFAULT_RUN.nHead,
  nLayer: DEFAULT_RUN.nLayer,
  blockSize: DEFAULT_RUN.blockSize,
};
export const BATCH = DEFAULT_RUN.batchSize;
export const LR = DEFAULT_RUN.lr;
export const PARAMS = paramBreakdown(CONFIG);

export const ATTN_PROMPT = "JULIET:\nO Romeo, Romeo!";

export interface Recorded {
  /** Smoothed train loss (same smoothing as the live chart), every 5 steps. */
  losses: [number, number][];
  evals: { step: number; train: number; val: number }[];
  samples: { step: number; text: string }[];
  attention: { tokens: string[]; maps: number[][][][] };
  overfit: { evals: { step: number; train: number; val: number }[] };
}

export const RECORDED = recorded as Recorded;

/** Smoothing used for every train-loss curve in this lesson. */
export const SMOOTH = 0.05;

export const fmtInt = (n: number) => n.toLocaleString("en-US");
