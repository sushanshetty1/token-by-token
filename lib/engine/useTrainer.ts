"use client";

import { useEffect, useSyncExternalStore } from "react";
import { getTrainer, type TrainerClient, type TrainerSnapshot } from "./client";
import type { ResetOptions } from "./protocol";

/**
 * Subscribe a lesson stage to the shared trainer `name`. Pass the stage's
 * `playing` prop so the lesson player's pause also pauses training.
 */
export function useTrainer(
  name: string,
  { defaults, playing = true, tag }: { defaults?: ResetOptions; playing?: boolean; tag?: string } = {},
): [TrainerSnapshot, TrainerClient] {
  const client = getTrainer(name, defaults, tag);
  const snap = useSyncExternalStore(client.subscribe, client.getSnapshot, client.getServerSnapshot);
  useEffect(() => {
    client.setHeld(!playing);
  }, [client, playing]);
  return [snap, client];
}

/** Exponential moving average of the raw per-step losses, for a readable curve. */
export function smoothLosses(losses: [number, number][], alpha = 0.05, every = 1): [number, number][] {
  const out: [number, number][] = [];
  let ema = NaN;
  for (const [step, loss] of losses) {
    if (!Number.isFinite(loss)) {
      out.push([step, loss]);
      continue;
    }
    ema = Number.isNaN(ema) ? loss : ema * (1 - alpha) + loss * alpha;
    if (step % every === 0 || step === 1) out.push([step, ema]);
  }
  return out;
}
