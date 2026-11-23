"use client";

import { useSyncExternalStore } from "react";

export interface LessonProgress {
  /** Highest step index reached. */
  seen: number;
  total: number;
  done: boolean;
}

export interface ProgressState {
  lessons: Record<string, LessonProgress>;
  /** Free-form ticks: self-check answers, experiments, explain-out-loud lines. */
  ticks: Record<string, boolean>;
}

const KEY = "tbt:progress:v1";
const EMPTY: ProgressState = { lessons: {}, ticks: {} };

let state: ProgressState = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ProgressState>;
      state = { lessons: parsed.lessons ?? {}, ticks: parsed.ticks ?? {} };
    }
  } catch {
    state = EMPTY;
  }
}

function save() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage can be unavailable in private windows; progress just won't persist */
  }
}

function set(next: ProgressState) {
  state = next;
  save();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    loaded = false;
    load();
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  load();
  return state;
}

function getServerSnapshot() {
  return EMPTY;
}

export function useProgress(): ProgressState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function markStep(key: string, step: number, total: number) {
  load();
  const prev = state.lessons[key];
  const seen = Math.max(prev?.seen ?? -1, step);
  const done = prev?.done || seen >= total - 1;
  if (prev && prev.seen === seen && prev.done === done && prev.total === total) return;
  set({ ...state, lessons: { ...state.lessons, [key]: { seen, total, done } } });
}

export function setTick(id: string, value: boolean) {
  load();
  if (!!state.ticks[id] === value) return;
  set({ ...state, ticks: { ...state.ticks, [id]: value } });
}

export function resetProgress() {
  set(EMPTY);
}

export function lessonFraction(p: ProgressState, key: string) {
  const l = p.lessons[key];
  if (!l) return 0;
  if (l.done) return 1;
  return Math.min(1, (l.seen + 1) / Math.max(1, l.total));
}
