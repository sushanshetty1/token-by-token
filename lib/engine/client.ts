/**
 * Main-thread side of the training worker. One TrainerClient per name lives
 * at module level, so the worker and the run's history survive the lesson
 * Stage remounting on every step change.
 *
 * The worker trains only while all of these hold: the learner pressed start,
 * at least one component is subscribed (with a short grace period so a
 * remount does not pause it), the lesson player is not paused, and the tab is
 * visible.
 */

import type { EvalPoint, FromWorker, ResetOptions, SamplePoint, ToWorker } from "./protocol";
import type { RunConfig } from "./trainer";

export type Phase = "idle" | "loading" | "ready" | "running" | "paused" | "done" | "error";

export interface TrainerSnapshot {
  phase: Phase;
  /** Free-form label set by reset(), so a stage can tell which run is loaded. */
  tag: string;
  run: RunConfig | null;
  params: number;
  step: number;
  maxSteps: number | null;
  /** Raw training loss per step: [step, loss]. */
  losses: [number, number][];
  evals: EvalPoint[];
  samples: SamplePoint[];
  stepsPerSec: number;
  gradNorm: number;
  /** Largest gradient norm (before clipping) seen in this run. */
  maxGradNorm: number;
  diverged: boolean;
  error: string | null;
}

const EMPTY: TrainerSnapshot = {
  phase: "idle",
  tag: "",
  run: null,
  params: 0,
  step: 0,
  maxSteps: null,
  losses: [],
  evals: [],
  samples: [],
  stepsPerSec: 0,
  gradNorm: 0,
  maxGradNorm: 0,
  diverged: false,
  error: null,
};

type Pending = { resolve: (v: never) => void; reject: (e: Error) => void };

export interface AttentionResult {
  tokens: string[];
  maps: number[][][][];
  step: number;
}

export class TrainerClient {
  private worker: Worker | null = null;
  private snap: TrainerSnapshot = EMPTY;
  private listeners = new Set<() => void>();
  private subscribers = 0;
  private graceTimer: ReturnType<typeof setTimeout> | null = null;
  private wantRunning = false;
  private holds = new Set<string>();
  private hidden = false;
  private sentRunning = false;
  private ready = false;
  private done = false;
  private reqId = 0;
  private pending = new Map<number, Pending>();
  private readonly defaults: ResetOptions;
  private defaultTag: string;

  constructor(defaults: ResetOptions = {}, tag = "default") {
    this.defaults = defaults;
    this.defaultTag = tag;
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    this.subscribers++;
    if (this.graceTimer) {
      clearTimeout(this.graceTimer);
      this.graceTimer = null;
    }
    this.ensureWorker();
    this.sync();
    return () => {
      this.listeners.delete(fn);
      this.subscribers--;
      if (this.subscribers === 0) {
        this.graceTimer = setTimeout(() => {
          this.graceTimer = null;
          this.sync();
        }, 1500);
      }
    };
  };

  getSnapshot = () => this.snap;
  getServerSnapshot = () => EMPTY;

  get snapshot() {
    return this.snap;
  }

  /** Start (or resume) training, optionally stopping at maxSteps. */
  start(maxSteps?: number) {
    if (maxSteps !== undefined) this.set({ maxSteps });
    // An explicit start on the stage outranks the lesson player's pause.
    this.holds.delete("player");
    this.wantRunning = true;
    this.done = false;
    this.sync(true);
  }

  pause() {
    this.wantRunning = false;
    this.sync();
  }

  /** Hold training while the lesson player is paused. */
  setHeld(held: boolean) {
    this.hold("player", held);
  }

  /** Named holds: training runs only when no hold is on. */
  hold(reason: string, on: boolean) {
    if (on === this.holds.has(reason)) return;
    if (on) this.holds.add(reason);
    else this.holds.delete(reason);
    this.sync();
  }

  reset(options: ResetOptions = this.defaults, tag = "default") {
    this.ensureWorker();
    this.wantRunning = false;
    this.sentRunning = false;
    this.ready = false;
    this.done = false;
    this.snap = { ...EMPTY, phase: "loading", tag };
    this.send({ type: "reset", options });
    this.emit();
  }

  setSwitches(switches: Partial<RunConfig["switches"]>) {
    this.send({ type: "setSwitches", switches });
  }

  setLr(lr: number) {
    this.send({ type: "setLr", lr });
  }

  sample(prompt: string, n: number, temperature: number): Promise<{ text: string; step: number }> {
    return this.request((id) => ({ type: "sample", id, prompt, n, temperature }));
  }

  attention(prompt: string): Promise<AttentionResult> {
    return this.request((id) => ({ type: "attention", id, prompt }));
  }

  private request<R>(make: (id: number) => ToWorker): Promise<R> {
    this.ensureWorker();
    const id = ++this.reqId;
    return new Promise<R>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: never) => void, reject });
      this.send(make(id));
    });
  }

  private ensureWorker() {
    if (this.worker || typeof window === "undefined") return;
    this.worker = new Worker(new URL("./train.worker.ts", import.meta.url), { type: "module" });
    this.worker.onmessage = (e: MessageEvent<FromWorker>) => this.receive(e.data);
    this.worker.onerror = (e) => this.set({ phase: "error", error: e.message || "the training worker crashed" });
    const dataUrl = new URL("/data/tinyshakespeare.txt", window.location.origin).toString();
    this.worker.postMessage({ type: "init", dataUrl } satisfies ToWorker);
    document.addEventListener("visibilitychange", () => {
      this.hidden = document.visibilityState === "hidden";
      this.sync();
    });
    this.snap = { ...EMPTY, phase: "loading", tag: this.defaultTag };
    this.send({ type: "reset", options: this.defaults });
  }

  private send(m: ToWorker) {
    this.worker?.postMessage(m);
  }

  private shouldRun() {
    return this.ready && this.wantRunning && !this.done && this.holds.size === 0 && !this.hidden && (this.subscribers > 0 || this.graceTimer !== null);
  }

  private sync(force = false) {
    const should = this.shouldRun();
    if (should && (!this.sentRunning || force)) {
      this.sentRunning = true;
      this.send({ type: "start", maxSteps: this.snap.maxSteps ?? undefined });
    } else if (!should && this.sentRunning) {
      this.sentRunning = false;
      this.send({ type: "pause" });
    }
    const phase = this.phase();
    if (phase !== this.snap.phase) this.set({ phase });
  }

  private phase(): Phase {
    if (this.snap.error) return "error";
    if (!this.ready) return this.worker ? "loading" : "idle";
    if (this.sentRunning) return "running";
    if (this.done) return "done";
    if (this.wantRunning) return "paused";
    return this.snap.step > 0 ? "paused" : "ready";
  }

  private receive(m: FromWorker) {
    // Messages are ordered: anything before "ready" belongs to the run a reset replaced.
    if (!this.ready && (m.type === "progress" || m.type === "eval" || m.type === "sample" || m.type === "status")) return;
    switch (m.type) {
      case "ready":
        this.ready = true;
        this.set({ run: m.run, params: m.params, phase: "ready" });
        this.sync();
        break;
      case "progress": {
        const last = m.losses[m.losses.length - 1];
        const diverged = this.snap.diverged || (last !== undefined && !Number.isFinite(last[1]));
        this.set({
          step: m.step,
          losses: this.snap.losses.concat(m.losses),
          stepsPerSec: m.stepsPerSec || this.snap.stepsPerSec,
          gradNorm: m.gradNorm,
          maxGradNorm: m.maxGradNorm,
          diverged,
        });
        break;
      }
      case "eval":
        this.set({ evals: this.snap.evals.filter((e) => e.step !== m.point.step).concat(m.point) });
        break;
      case "sample":
        this.set({ samples: this.snap.samples.concat(m.point) });
        break;
      case "status":
        if (m.done) {
          this.done = true;
          this.wantRunning = false;
          this.sentRunning = false;
        }
        this.set({ step: m.step, phase: this.phase() });
        break;
      case "sampleResult":
      case "attentionResult": {
        const p = this.pending.get(m.id);
        this.pending.delete(m.id);
        if (m.type === "sampleResult") p?.resolve({ text: m.text, step: m.step } as never);
        else p?.resolve({ tokens: m.tokens, maps: m.maps, step: m.step } as never);
        break;
      }
      case "error":
        this.set({ phase: "error", error: m.message });
        for (const p of this.pending.values()) p.reject(new Error(m.message));
        this.pending.clear();
        break;
    }
  }

  private set(patch: Partial<TrainerSnapshot>) {
    this.snap = { ...this.snap, ...patch };
    this.emit();
  }

  private emit() {
    for (const fn of this.listeners) fn();
  }
}

const clients = new Map<string, TrainerClient>();

/** The shared client for `name`, created on first use with these reset options. */
export function getTrainer(name: string, defaults: ResetOptions = {}, tag = "default"): TrainerClient {
  let c = clients.get(name);
  if (!c) {
    c = new TrainerClient(defaults, tag);
    clients.set(name, c);
  }
  return c;
}
