/**
 * Web Worker that owns one Trainer. Trains in ~80 ms chunks, then yields so
 * control messages (pause, sample, attention) are handled between chunks.
 */

import { CharData } from "./data";
import type { FromWorker, ResetOptions, ToWorker } from "./protocol";
import { Trainer } from "./trainer";

interface Scope {
  postMessage(message: FromWorker): void;
  onmessage: ((e: MessageEvent<ToWorker>) => void) | null;
}

const scope = self as unknown as Scope;
const post = (m: FromWorker) => scope.postMessage(m);

const DEFAULTS: Required<ResetOptions> = {
  run: {},
  evalEvery: 50,
  sampleEvery: 100,
  sampleLen: 160,
  sampleTemperature: 0.8,
};

let dataPromise: Promise<CharData> | null = null;
let trainer: Trainer | null = null;
let opts: Required<ResetOptions> = DEFAULTS;
let running = false;
let maxSteps = Infinity;
let stepsPerSec = 0;
let scheduled = false;

function data(): Promise<CharData> {
  if (!dataPromise) throw new Error("worker not initialised");
  return dataPromise;
}

function status(done = false) {
  post({ type: "status", running, step: trainer?.step ?? 0, done });
}

function sampleNow(t: Trainer) {
  const text = t.sample("\n", opts.sampleLen, opts.sampleTemperature, t.run.seed * 7919 + t.step);
  post({ type: "sample", point: { step: t.step, text } });
}

async function reset(options: ResetOptions) {
  const d = await data();
  running = false;
  opts = { ...DEFAULTS, ...options, run: { ...options.run } };
  trainer = new Trainer(d, opts.run);
  stepsPerSec = 0;
  post({
    type: "ready",
    run: trainer.run,
    params: trainer.model.numParams,
    vocab: d.chars,
    trainChars: trainer.trainData.length,
    valChars: d.val.length,
  });
  post({ type: "eval", point: { step: 0, ...trainer.estimateLoss() } });
  if (opts.sampleEvery > 0) sampleNow(trainer);
  status();
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  setTimeout(loop, 0);
}

function loop() {
  scheduled = false;
  const t = trainer;
  if (!running || !t) return;
  const chunkStart = performance.now();
  const losses: [number, number][] = [];
  let trainMs = 0;
  let steps = 0;
  let diverged = false;
  const flush = () => {
    if (losses.length) post({ type: "progress", step: t.step, losses: losses.splice(0), stepsPerSec, gradNorm: t.lastGradNorm });
  };
  while (performance.now() - chunkStart < 80 && t.step < maxSteps) {
    const s0 = performance.now();
    const loss = t.trainStep();
    trainMs += performance.now() - s0;
    steps++;
    losses.push([t.step, loss]);
    if (!Number.isFinite(loss)) {
      diverged = true;
      break;
    }
    if (t.step % opts.evalEvery === 0 || t.step === maxSteps) {
      flush();
      post({ type: "eval", point: { step: t.step, ...t.estimateLoss() } });
    }
    if (opts.sampleEvery > 0 && t.step % opts.sampleEvery === 0) sampleNow(t);
  }
  if (steps > 0 && trainMs > 0) {
    const rate = (steps * 1000) / trainMs;
    stepsPerSec = stepsPerSec === 0 ? rate : stepsPerSec * 0.8 + rate * 0.2;
  }
  flush();
  if (diverged || t.step >= maxSteps) {
    running = false;
    status(true);
    return;
  }
  schedule();
}

async function handle(m: ToWorker) {
  try {
    switch (m.type) {
      case "init":
        if (!dataPromise) {
          dataPromise = fetch(m.dataUrl)
            .then((r) => {
              if (!r.ok) throw new Error(`could not load ${m.dataUrl} (${r.status})`);
              return r.text();
            })
            .then((text) => new CharData(text));
        }
        await dataPromise;
        break;
      case "reset":
        await reset(m.options);
        break;
      case "start":
        if (!trainer) await reset({});
        maxSteps = m.maxSteps ?? Infinity;
        if (trainer!.step >= maxSteps) {
          status(true);
          break;
        }
        running = true;
        status();
        schedule();
        break;
      case "pause":
        running = false;
        status();
        break;
      case "setSwitches":
        trainer?.setSwitches(m.switches);
        break;
      case "setLr":
        trainer?.setLr(m.lr);
        break;
      case "sample": {
        if (!trainer) await reset({});
        const t = trainer!;
        const text = t.sample(m.prompt, m.n, m.temperature, m.id * 31 + t.step);
        post({ type: "sampleResult", id: m.id, text, step: t.step });
        break;
      }
      case "attention": {
        if (!trainer) await reset({});
        const t = trainer!;
        const { tokens, maps } = t.attention(m.prompt);
        post({ type: "attentionResult", id: m.id, tokens, maps, step: t.step });
        break;
      }
    }
  } catch (err) {
    running = false;
    post({ type: "error", message: err instanceof Error ? err.message : String(err) });
  }
}

// Messages are handled one at a time, in order, so a reset can never race a start.
let queue: Promise<void> = Promise.resolve();
scope.onmessage = (e) => {
  queue = queue.then(() => handle(e.data));
};
