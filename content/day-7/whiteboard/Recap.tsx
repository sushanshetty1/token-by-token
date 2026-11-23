"use client";

import { ArrowRight, Check, PencilLine, RotateCcw, X } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { DAYS } from "@/content/curriculum";
import { useProgress } from "@/lib/progress";
import { roundStatus } from "./RoundHeader";
import { STATIONS, TICK, allQuestions, dayForStation, drillTally, gradeOf, resetTest } from "./state";

const ROUND_NAMES = ["Forward pass order", "Training loop order", "Tensor shapes", "Explain every box", "Interview drill"];

export function Recap({ goTo }: { goTo?: (step: number) => void }) {
  const p = useProgress();
  const [arming, setArming] = useState(false);
  const status = roundStatus(p);
  const done = status.filter((s) => s.done).length;
  const tally = drillTally(p);

  const reasons = new Map<number, string[]>();
  const add = (d: number, r: string) => reasons.set(d, [...(reasons.get(d) ?? []), r]);
  if (!p.ticks[TICK.forward]) add(1, "the forward pass order");
  if (!p.ticks[TICK.train]) add(2, "the training loop order");
  if (!p.ticks[TICK.shapes]) add(5, "tensor shapes");
  const unsaid = new Map<number, string[]>();
  for (const s of STATIONS.filter((x) => !p.ticks[TICK.flip(x.id)])) {
    const d = dayForStation(s.id);
    unsaid.set(d, [...(unsaid.get(d) ?? []), s.label === s.label.toUpperCase() ? s.label : s.label.toLowerCase()]);
  }
  for (const [d, labels] of unsaid) add(d, `explain ${labels.join(", ")}`);
  const weak = new Map<number, number>();
  for (const q of allQuestions()) {
    const g = gradeOf(p, q.d, q.i);
    if (g === "shaky" || g === "missed") weak.set(q.d, (weak.get(q.d) ?? 0) + 1);
  }
  for (const [d, n] of weak) add(d, `${n} drill ${n === 1 ? "answer" : "answers"} to redo`);
  const revisit = [...reasons.entries()].sort((a, b) => a[0] - b[0]).slice(0, 4);

  const headline =
    done === 5 ? "You can draw the whole path." : done >= 3 ? "Nearly there." : done > 0 ? "A good start." : "Take the test first.";

  return (
    <div className="flex h-full gap-5">
      <section className="flex w-[300px] max-w-full shrink-0 flex-col">
        <div className="font-mono text-[11.5px] font-semibold text-ink-3">Your whiteboard score</div>
        <div className="mt-1 flex items-end gap-3">
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="font-display text-[56px] font-bold leading-none text-ink"
          >
            {done}
            <span className="text-[28px] text-ink-3">/5</span>
          </motion.span>
          <span className="mb-1.5 text-[14px] font-semibold leading-tight text-ink">
            rounds
            <br />
            complete
          </span>
        </div>
        <p className="mt-1 text-[14px] font-semibold text-ink">{headline}</p>
        <ul className="mt-3 grid grid-cols-1 gap-1.5">
          {ROUND_NAMES.map((name, i) => (
            <li key={name}>
              <button
                type="button"
                onClick={() => goTo?.(i + 1)}
                className="flex w-full items-center gap-2.5 rounded-lg border border-rule bg-card px-2.5 py-1.5 text-left hover:border-ink"
              >
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${status[i].done ? "bg-ok text-card" : "border-[1.5px] border-rule-strong text-ink-3"}`}
                >
                  {status[i].done ? <Check size={12} strokeWidth={3.2} /> : <X size={11} strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">{name}</span>
                <span className="shrink-0 font-mono text-[11.5px] text-ink-2">{status[i].note}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-3 text-[12px] text-ink-2">
          Drill: <strong className="text-ink">{tally.got}</strong> got it, <strong className="text-ink">{tally.shaky}</strong> shaky,{" "}
          <strong className="text-ink">{tally.missed}</strong> missed, of {tally.total}.
        </div>
          <div className="mt-auto flex pt-2">
            <button
              type="button"
              className={`btn !py-1 !text-[12.5px] ${arming ? "!border-bad !bg-bad-soft" : "btn-ghost"}`}
              onClick={() => {
                if (arming) {
                  resetTest(p);
                  setArming(false);
                } else setArming(true);
              }}
              onBlur={() => setArming(false)}
            >
              <RotateCcw size={13} /> {arming ? "Click again to clear every result" : "Reset the test"}
            </button>
          </div>

      </section>

      <section className="flex min-w-0 flex-1 flex-col">
        <h3 className="font-display text-[19px] font-bold text-ink">{revisit.length ? "Revisit these days" : "Nothing left to revisit"}</h3>
        {revisit.length ? (
          <ul className="mt-2 grid grid-cols-1 gap-1.5">
            {revisit.map(([d, rs], i) => {
              const day = DAYS.find((x) => x.n === d);
              return (
                <motion.li key={d} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.06 }}>
                  <Link
                    href={`/day/${d}/`}
                    className="group flex items-center gap-3 rounded-xl border-[1.5px] border-ink bg-card px-2.5 py-1.5 shadow-[0_2px_0_var(--ink)] hover:bg-card-2"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-mark font-mono text-[12.5px] font-bold text-ink">{d}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold leading-tight text-ink">{day?.title ?? `Day ${d}`}</span>
                      <span className="block truncate text-[11.5px] leading-tight text-ink-2">{rs.join("; ")}</span>
                    </span>
                    <ArrowRight size={15} className="shrink-0 text-ink-3 group-hover:text-ink" />
                  </Link>
                </motion.li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-[13.5px] text-ink-2">Every round is complete and no drill answer is shaky. You are ready.</p>
        )}
        <div className="mt-auto pt-3">
          <div className="flex items-start gap-2.5 rounded-xl border border-mark bg-mark-soft p-3 text-[13px] leading-snug text-ink">
            <PencilLine size={16} className="mt-[1px] shrink-0" />
            <span>
              Last step, on paper: draw the whole path from text to updated weights, with a shape on every arrow. Compare it with your Day
              1 drawing.
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
