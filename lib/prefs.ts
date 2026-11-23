"use client";

import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

/** A tiny localStorage-backed preference that is safe during static rendering. */
export function usePref(key: string, fallback: string): [string, (v: string) => void] {
  const value = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => {
      try {
        return localStorage.getItem(key) ?? fallback;
      } catch {
        return fallback;
      }
    },
    () => fallback,
  );
  const set = (v: string) => {
    try {
      localStorage.setItem(key, v);
    } catch {
      /* ignore */
    }
    listeners.forEach((l) => l());
  };
  return [value, set];
}
