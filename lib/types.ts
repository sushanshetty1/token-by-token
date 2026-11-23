import type { ComponentType, ReactNode } from "react";

/* ------------------------------------------------------------------ */
/* Day content: plain data, safe to import from server components.     */
/* ------------------------------------------------------------------ */

export type Level = "Beginner" | "Core" | "Deep";

export interface LessonMeta {
  slug: string;
  title: string;
  /** One sentence: what you will understand after this lesson. */
  promise: string;
  minutes: number;
  level: Level;
}

export interface Chapter {
  /** "1:02:00" style timestamp, or null when the whole thing applies. */
  at: string;
  title: string;
  /** How to treat this part. */
  pace: "watch" | "skim" | "skip";
}

export interface Resource {
  kind: "video" | "code" | "read";
  title: string;
  by: string;
  url: string;
  minutes?: number;
  why: string;
  chapters?: Chapter[];
}

export interface Experiment {
  title: string;
  /** Ask yourself this first and write the guess down. */
  predict: string;
  how: string;
  expect: string;
}

export interface CheckQuestion {
  q: string;
  /** Model answer, two to five sentences. Interview length. */
  a: string;
}

export interface TimeBlock {
  label: string;
  minutes: number;
}

export interface DayContent {
  n: number;
  title: string;
  /** Short line under the title. */
  tagline: string;
  /** What you can do at the end of the day. */
  outcome: string;
  /** Which stations of the model pipeline this day lights up (ids from PIPELINE). */
  stations: string[];
  schedule: TimeBlock[];
  lessons: LessonMeta[];
  watch: Resource[];
  /** The hands-on part: what to have AI write and what you must explain. */
  build: string[];
  aiPrompts: string[];
  experiments: Experiment[];
  checks: CheckQuestion[];
  /** Lines you should be able to say out loud before moving on. */
  explainOutLoud: string[];
}

/* ------------------------------------------------------------------ */
/* Lessons: client modules with an animated stage.                     */
/* ------------------------------------------------------------------ */

export type StepKind =
  | "intuition"
  | "problem"
  | "mechanism"
  | "insight"
  | "try"
  | "recap";

export interface Predict {
  question: ReactNode;
  options: string[];
  /** Index into options. */
  answer: number;
  explain: ReactNode;
}

export interface LessonStep {
  /** One or two words for the stepper. */
  label: string;
  kind: StepKind;
  title: string;
  body: ReactNode;
  keyIdea?: ReactNode;
  /** Short bullets for "What changed" on this step. */
  changed?: ReactNode[];
  predict?: Predict;
  /** Lines of lesson.code to highlight (1-based, inclusive ranges). */
  code?: { ranges: [number, number][]; caption?: ReactNode };
  /** Values for rail slots, merged cumulatively from step 0 to the current step. */
  rail?: Record<string, string>;
  /** Indices into lesson.learn ticked once this step has been seen. */
  learns?: number[];
}

export interface StageProps {
  /** Zero-based current step. */
  step: number;
  /** False while the learner has paused. Loops should halt. */
  playing: boolean;
  /** Increments on Replay. Use as a React key to restart entrance animations. */
  runId: number;
  /** Lets an interactive stage move the lesson forward (rarely needed). */
  goTo?: (step: number) => void;
}

export interface RailSlot {
  id: string;
  label: string;
}

export interface LegendItem {
  label: string;
  /** Any CSS color, usually a var(--token). */
  color: string;
  shape?: "dot" | "square" | "line";
}

export interface LessonModule {
  rail?: RailSlot[];
  learn: string[];
  legend?: LegendItem[];
  code?: { filename: string; source: string; note?: string };
  steps: LessonStep[];
  Stage: ComponentType<StageProps>;
}
