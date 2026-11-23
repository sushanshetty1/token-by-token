"use client";

import { DAYS } from "@/content/curriculum";
import { PIPELINE } from "@/lib/pipeline";
import { setTick, type ProgressState } from "@/lib/progress";

/** Every result of the test lives in progress ticks, so it survives step changes and reloads. */
export const TICK = {
  forward: "wb:forward",
  train: "wb:train",
  shapes: "wb:shapes",
  flip: (id: string) => `wb:flip:${id}`,
  grade: (d: number, i: number, g: Grade) => `wb:drill:${d}:${i}:${g}`,
};

export type Grade = "got" | "shaky" | "missed";
export const GRADES: Grade[] = ["got", "shaky", "missed"];

export function gradeOf(p: ProgressState, d: number, i: number): Grade | null {
  for (const g of GRADES) if (p.ticks[TICK.grade(d, i, g)]) return g;
  return null;
}

export function setGrade(d: number, i: number, g: Grade) {
  for (const x of GRADES) setTick(TICK.grade(d, i, x), x === g);
  // Keep the day page's "I can answer this" tick in step with the self-grade.
  setTick(`d${d}:check:${i}`, g === "got");
}

export interface DrillQuestion {
  key: string;
  d: number;
  i: number;
  day: string;
  q: string;
  a: string;
}

export function allQuestions(): DrillQuestion[] {
  return DAYS.flatMap((day) => day.checks.map((c, i) => ({ key: `${day.n}:${i}`, d: day.n, i, day: day.title, q: c.q, a: c.a })));
}

export const STATIONS = PIPELINE;

/** The most focused day (fewest stations) that teaches this station: where to revisit it. */
export function dayForStation(id: string) {
  const hits = DAYS.filter((d) => d.n < 7 && d.stations.includes(id)).sort((a, b) => a.stations.length - b.stations.length || a.n - b.n);
  return hits[0]?.n ?? 1;
}

export function drillTally(p: ProgressState) {
  const qs = allQuestions();
  let got = 0;
  let shaky = 0;
  let missed = 0;
  for (const q of qs) {
    const g = gradeOf(p, q.d, q.i);
    if (g === "got") got++;
    else if (g === "shaky") shaky++;
    else if (g === "missed") missed++;
  }
  return { total: qs.length, got, shaky, missed, answered: got + shaky + missed };
}

/** In-progress answers per round. Module scope, so it survives the stage remounting on step changes. */
const ROUND_MEMORY = new Map<string, unknown>();

export function recall<T>(key: string): T | undefined {
  return ROUND_MEMORY.get(key) as T | undefined;
}

export function remember<T>(key: string, value: T) {
  ROUND_MEMORY.set(key, value);
}

export function resetTest(p: ProgressState) {
  for (const key of Object.keys(p.ticks)) if (key.startsWith("wb:") && p.ticks[key]) setTick(key, false);
  ROUND_MEMORY.clear();
}

/* ------------------------------------------------------------------ */
/* Deterministic shuffles, seeded once per page load.                  */
/* ------------------------------------------------------------------ */

const SEED = Math.floor(Math.random() * 2 ** 31);

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffled<T>(items: T[], salt: number): T[] {
  const r = rng(SEED + salt * 7919);
  for (let attempt = 0; attempt < 8; attempt++) {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    if (out.some((x, i) => x !== items[i])) return out;
  }
  return [...items].reverse();
}

export function seededIndex(n: number, salt: number) {
  return Math.floor(rng(SEED + salt * 104729)() * Math.max(1, n));
}
