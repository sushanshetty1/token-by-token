import type { TrainerSnapshot } from "@/lib/engine/client";
import type { Switches } from "@/lib/engine/model";
import type { EvalPoint, ResetOptions } from "@/lib/engine/protocol";
import { DEFAULT_RUN, type RunConfig } from "@/lib/engine/trainer";
import recorded from "./recorded.json";

export const BREAK_IT = "break-it";
export const STEPS = 400;
export const SMOOTH = 0.1;

export type ExpId = "baseline" | "nomask" | "nopos" | "noresid" | "noln" | "lr10x";

export interface Experiment {
  id: ExpId;
  /** What was changed, for headings and the table. */
  name: string;
  run: Partial<RunConfig>;
}

const sw = (s: Partial<Switches>) => ({ switches: { ...DEFAULT_RUN.switches, ...s } });

export const EXPERIMENTS: Record<ExpId, Experiment> = {
  baseline: { id: "baseline", name: "Baseline", run: {} },
  nomask: { id: "nomask", name: "No causal mask", run: sw({ causal: false }) },
  nopos: { id: "nopos", name: "No position embeddings", run: sw({ positions: false }) },
  noresid: { id: "noresid", name: "No residual connections", run: sw({ residual: false }) },
  noln: { id: "noln", name: "No LayerNorm", run: sw({ layerNorm: false }) },
  lr10x: { id: "lr10x", name: "Learning rate x10", run: { lr: 0.03 } },
};

/** Worker options for a run. sampleEvery = STEPS makes the final sample match the recorded one. */
export function optionsFor(run: Partial<RunConfig>): ResetOptions {
  return { run, evalEvery: 25, sampleEvery: STEPS, sampleLen: 160, sampleTemperature: 0.8 };
}

export interface RunResult {
  /** Raw training loss per step: [step, loss]. */
  losses: [number, number][];
  evals: EvalPoint[];
  sample: string | null;
  maxGrad: number;
  source: "live" | "recorded";
}

interface RecordedRun {
  losses: number[];
  evals: EvalPoint[];
  sample: string;
  maxGrad: number;
  attention?: { tokens: string[]; maps: number[][][][] };
}

const REC = recorded as Record<ExpId, RecordedRun>;

export function recordedResult(id: ExpId): RunResult {
  const r = REC[id];
  return { losses: r.losses.map((l, i) => [i + 1, l]), evals: r.evals, sample: r.sample, maxGrad: r.maxGrad, source: "recorded" };
}

export function recordedAttention(id: "baseline" | "nomask") {
  return REC[id].attention!;
}

export const finalVal = (r: RunResult) => (r.evals.length ? r.evals[r.evals.length - 1].val : NaN);

/* ------------------------------------------------------------------ */
/* Results of runs the learner finished, kept for the whole visit.     */
/* ------------------------------------------------------------------ */

const results = new Map<string, RunResult>();
let version = 0;
const listeners = new Set<() => void>();

export const resultsStore = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  getVersion: () => version,
  get: (tag: string) => results.get(tag),
};

/** Copy a finished run out of the worker snapshot, once. */
export function captureResult(snap: TrainerSnapshot) {
  if (snap.phase !== "done" || snap.step < STEPS || !snap.tag) return;
  const prev = results.get(snap.tag);
  if (prev && prev.losses.length === snap.losses.length && prev.evals.length === snap.evals.length) return;
  const sample = snap.samples.find((s) => s.step === STEPS)?.text ?? null;
  results.set(snap.tag, { losses: snap.losses, evals: snap.evals, sample, maxGrad: snap.maxGradNorm, source: "live" });
  version++;
  for (const fn of listeners) fn();
}

/** Turns the live snapshot into a result while it runs. */
export function liveResult(snap: TrainerSnapshot): RunResult {
  return {
    losses: snap.losses,
    evals: snap.evals,
    sample: snap.samples.find((s) => s.step === STEPS)?.text ?? null,
    maxGrad: snap.maxGradNorm,
    source: "live",
  };
}
