"use client";

import { Check } from "lucide-react";
import { useProgress, type ProgressState } from "@/lib/progress";
import { STATIONS, TICK, drillTally } from "./state";

const ROUNDS = [
  { step: 1, label: "Order" },
  { step: 2, label: "Loop" },
  { step: 3, label: "Shapes" },
  { step: 4, label: "Explain" },
  { step: 5, label: "Drill" },
];

export function roundStatus(p: ProgressState) {
  const flipped = STATIONS.filter((s) => p.ticks[TICK.flip(s.id)]).length;
  const drill = drillTally(p);
  return [
    { done: !!p.ticks[TICK.forward], note: p.ticks[TICK.forward] ? "solved" : "to do" },
    { done: !!p.ticks[TICK.train], note: p.ticks[TICK.train] ? "solved" : "to do" },
    { done: !!p.ticks[TICK.shapes], note: p.ticks[TICK.shapes] ? "solved" : "to do" },
    { done: flipped === STATIONS.length, note: `${flipped} of ${STATIONS.length}` },
    { done: drill.answered >= 5, note: `${drill.answered} answered` },
  ];
}

export function RoundHeader({
  round,
  title,
  goTo,
  right,
}: {
  round: number;
  title: string;
  goTo?: (step: number) => void;
  right?: React.ReactNode;
}) {
  const p = useProgress();
  const status = roundStatus(p);
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="font-mono text-[11.5px] font-semibold text-ink-3">Round {round} of 5</div>
        <h3 className="font-display text-[21px] font-bold leading-tight text-ink">{title}</h3>
      </div>
      {right ?? (
        <nav aria-label="Rounds" className="flex shrink-0 gap-1">
          {ROUNDS.map((r, i) => {
            const on = r.step === round;
            const done = status[i].done;
            return (
              <button
                key={r.label}
                type="button"
                onClick={() => goTo?.(r.step)}
                aria-current={on ? "step" : undefined}
                className={`flex items-center gap-1 rounded-full border px-2 py-[3px] text-[11.5px] font-semibold transition-colors ${
                  on
                    ? "border-ink bg-mark text-ink"
                    : done
                      ? "border-ok bg-ok-soft text-ink"
                      : "border-rule-strong bg-card text-ink-3 hover:border-ink hover:text-ink"
                }`}
              >
                {done && <Check size={11} strokeWidth={3.2} />}
                {r.label}
              </button>
            );
          })}
        </nav>
      )}
    </header>
  );
}
