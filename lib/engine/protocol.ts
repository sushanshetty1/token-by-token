import type { Switches } from "./model";
import type { RunConfig } from "./trainer";

export interface ResetOptions {
  run?: Partial<RunConfig>;
  /** Evaluate train and val loss every N steps. */
  evalEvery?: number;
  /** Generate a sample every N steps (0 = never). */
  sampleEvery?: number;
  sampleLen?: number;
  sampleTemperature?: number;
}

export type ToWorker =
  | { type: "init"; dataUrl: string }
  | { type: "reset"; options: ResetOptions }
  | { type: "start"; maxSteps?: number }
  | { type: "pause" }
  | { type: "setSwitches"; switches: Partial<Switches> }
  | { type: "setLr"; lr: number }
  | { type: "sample"; id: number; prompt: string; n: number; temperature: number }
  | { type: "attention"; id: number; prompt: string };

export interface EvalPoint {
  step: number;
  train: number;
  val: number;
}

export interface SamplePoint {
  step: number;
  text: string;
}

export type FromWorker =
  | { type: "ready"; run: RunConfig; params: number; vocab: string[]; trainChars: number; valChars: number }
  | { type: "progress"; step: number; losses: [number, number][]; stepsPerSec: number; gradNorm: number }
  | { type: "eval"; point: EvalPoint }
  | { type: "sample"; point: SamplePoint }
  | { type: "status"; running: boolean; step: number; done: boolean }
  | { type: "sampleResult"; id: number; text: string; step: number }
  | { type: "attentionResult"; id: number; tokens: string[]; maps: number[][][][]; step: number }
  | { type: "error"; message: string };
