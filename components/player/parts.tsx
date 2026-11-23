"use client";

import { Check, Lightbulb, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { LegendItem, LessonStep, Predict, RailSlot, StepKind } from "@/lib/types";

export const KIND: Record<StepKind, { label: string; fg: string; bg: string }> = {
  intuition: { label: "Intuition", fg: "var(--violet)", bg: "var(--violet-soft)" },
  problem: { label: "Problem", fg: "var(--bad)", bg: "var(--bad-soft)" },
  mechanism: { label: "How it works", fg: "var(--accent)", bg: "var(--accent-soft)" },
  insight: { label: "Insight", fg: "color-mix(in oklab, var(--mark) 70%, var(--ink))", bg: "var(--mark-soft)" },
  try: { label: "Try it", fg: "var(--ok)", bg: "var(--ok-soft)" },
  recap: { label: "Recap", fg: "var(--ink)", bg: "var(--paper-2)" },
};

export function KindTag({ kind }: { kind: StepKind }) {
  const k = KIND[kind];
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[12px] font-semibold"
      style={{ color: k.fg, background: k.bg, borderColor: `color-mix(in oklab, ${k.fg} 35%, transparent)` }}
    >
      {k.label}
    </span>
  );
}

/** The strip of live readings above the stage. */
export function Rail({ slots, values }: { slots: RailSlot[]; values: Record<string, string> }) {
  return (
    <div className="scrollbar-thin flex gap-2 overflow-x-auto">
      {slots.map((s) => (
        <RailCell key={s.id} label={s.label} value={values[s.id]} />
      ))}
    </div>
  );
}

function RailCell({ label, value }: { label: string; value?: string }) {
  const [flash, setFlash] = useState(false);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current !== value && value !== undefined) {
      prev.current = value;
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 900);
      return () => clearTimeout(t);
    }
    prev.current = value;
  }, [value]);
  return (
    <div
      className={`min-w-[116px] shrink-0 rounded-xl border px-3 py-2 transition-colors duration-700 ${
        flash ? "border-mark bg-mark-soft" : "border-rule bg-card"
      }`}
    >
      <div className="text-[11.5px] font-medium text-ink-3">{label}</div>
      <div className="tabular mt-0.5 truncate font-mono text-[14.5px] font-semibold text-ink">{value ?? "–"}</div>
    </div>
  );
}

export function Legend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5 text-[12.5px] text-ink-2">
          {it.shape === "line" ? (
            <span className="h-[3px] w-4 rounded-full" style={{ background: it.color }} />
          ) : (
            <span
              className={`h-2.5 w-2.5 ${it.shape === "square" ? "rounded-[3px]" : "rounded-full"}`}
              style={{ background: it.color }}
            />
          )}
          {it.label}
        </li>
      ))}
    </ul>
  );
}

/** Numbered stops along the bottom of the stage. */
export function Stepper({
  steps,
  current,
  seen,
  onSelect,
}: {
  steps: LessonStep[];
  current: number;
  seen: number;
  onSelect: (i: number) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = scroller.current;
    const el = box?.querySelector<HTMLElement>(`[data-step="${current}"]`);
    if (!box || !el) return;
    box.scrollTo({ left: el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2, behavior: "smooth" });
  }, [current]);
  return (
    <div ref={scroller} className="scrollbar-thin relative overflow-x-auto">
      <ol className="relative flex min-w-max items-start px-1 pb-1">
        {steps.map((s, i) => {
          const done = i < current || i <= seen;
          const on = i === current;
          return (
            <li key={i} data-step={i} className="relative flex w-[92px] shrink-0 flex-col items-center">
              {i > 0 && (
                <span
                  className="absolute right-1/2 top-[15px] h-[2px] w-full -translate-x-[15px]"
                  style={{ background: i <= Math.max(current, seen) ? "var(--ink)" : "var(--rule-strong)" }}
                  aria-hidden
                />
              )}
              <button
                type="button"
                onClick={() => onSelect(i)}
                aria-current={on ? "step" : undefined}
                aria-label={`Step ${i + 1}: ${s.label}`}
                className={`relative z-[1] grid h-[32px] w-[32px] place-items-center rounded-full border-[1.5px] font-mono text-[12.5px] font-semibold transition-all ${
                  on
                    ? "scale-110 border-ink bg-mark text-ink shadow-[0_2px_0_var(--ink)]"
                    : done
                      ? "border-ink bg-ink text-card"
                      : "border-rule-strong bg-card text-ink-3 hover:border-ink hover:text-ink"
                }`}
              >
                {done && !on ? <Check size={14} strokeWidth={3} /> : i + 1}
              </button>
              <span
                className={`mt-1.5 max-w-[88px] text-center text-[12px] leading-tight ${
                  on ? "font-semibold text-ink" : "text-ink-3"
                }`}
              >
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Keyed by the player per step, so the pick resets when the step changes. */
export function PredictCard({ predict }: { predict: Predict }) {
  const [pick, setPick] = useState<number | null>(null);
  const answered = pick !== null;
  const right = pick === predict.answer;
  return (
    <div className="mt-4 rounded-xl border-[1.5px] border-dashed border-mark bg-mark-soft/50 p-3.5">
      <div className="text-[12.5px] font-semibold text-[color-mix(in_oklab,var(--mark)_70%,var(--ink))]">Guess before you look</div>
      <div className="mt-1 text-[14.5px] font-medium leading-snug text-ink">{predict.question}</div>
      <div className="mt-2.5 grid gap-1.5">
        {predict.options.map((o, i) => {
          const isAns = i === predict.answer;
          const chosen = pick === i;
          const state = !answered ? "idle" : isAns ? "right" : chosen ? "wrong" : "idle";
          return (
            <button
              key={i}
              type="button"
              disabled={answered}
              onClick={() => setPick(i)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-[13.5px] transition-colors ${
                state === "right"
                  ? "border-ok bg-ok-soft font-semibold"
                  : state === "wrong"
                    ? "border-bad bg-bad-soft"
                    : "border-rule bg-card hover:border-ink disabled:hover:border-rule"
              } ${answered && state === "idle" ? "opacity-55" : ""}`}
            >
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-rule-strong font-mono text-[11px] text-ink-2">
                {state === "right" ? <Check size={12} strokeWidth={3} className="text-ok" /> : state === "wrong" ? <X size={12} strokeWidth={3} className="text-bad" /> : String.fromCharCode(65 + i)}
              </span>
              <span className="text-ink">{o}</span>
            </button>
          );
        })}
      </div>
      <AnimatePresence>
        {answered && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <p className="pt-2.5 text-[13.5px] leading-relaxed text-ink">
              <strong className={right ? "text-ok" : "text-bad"}>{right ? "Right. " : "Not quite. "}</strong>
              {predict.explain}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function KeyIdea({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 flex gap-3 rounded-xl border border-[color-mix(in_oklab,var(--violet)_30%,transparent)] bg-violet-soft p-3.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[color-mix(in_oklab,var(--violet)_40%,transparent)] bg-card text-violet">
        <Lightbulb size={16} />
      </span>
      <div>
        <div className="text-[12.5px] font-semibold text-violet">Key idea</div>
        <div className="mt-0.5 text-[14px] leading-relaxed text-ink">{children}</div>
      </div>
    </div>
  );
}

export function Changed({ items }: { items: React.ReactNode[] }) {
  return (
    <div className="mt-4">
      <div className="text-[12.5px] font-semibold text-ink-3">What changed</div>
      <ul className="mt-1.5 grid gap-1">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-2 text-[13.5px] text-ink">
            <Plus size={14} className="mt-[3px] shrink-0 text-ok" strokeWidth={3} />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LearnList({ items, ticked }: { items: string[]; ticked: Set<number> }) {
  return (
    <section className="panel p-4">
      <h3 className="text-[14px] font-bold text-ink">You will be able to</h3>
      <ul className="mt-2.5 grid gap-2">
        {items.map((it, i) => {
          const on = ticked.has(i);
          return (
            <li key={i} className="flex items-start gap-2.5 text-[13.5px] leading-snug">
              <span
                className={`mt-[1px] grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border-[1.5px] transition-colors ${
                  on ? "border-ok bg-ok text-card" : "border-rule-strong bg-card"
                }`}
              >
                {on && <Check size={12} strokeWidth={3.2} />}
              </span>
              <span className={on ? "text-ink" : "text-ink-2"}>{it}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
