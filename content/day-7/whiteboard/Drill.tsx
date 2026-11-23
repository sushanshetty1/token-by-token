"use client";

import { ArrowRight, Check, CircleHelp, Eye, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useProgress } from "@/lib/progress";
import { RoundHeader } from "./RoundHeader";
import { allQuestions, recall, remember, drillTally, gradeOf, seededIndex, setGrade, type Grade } from "./state";


const GRADE_UI: Record<Grade, { label: string; cls: string; on: string; Icon: typeof Check }> = {
  got: { label: "Got it", cls: "hover:border-ok", on: "border-ok bg-ok-soft", Icon: Check },
  shaky: { label: "Shaky", cls: "hover:border-mark", on: "border-mark bg-mark-soft", Icon: CircleHelp },
  missed: { label: "Missed", cls: "hover:border-bad", on: "border-bad bg-bad-soft", Icon: X },
};

export function Drill({ goTo }: { goTo?: (step: number) => void }) {
  const progress = useProgress();
  const questions = allQuestions();
  const [key, setKey] = useState<string | undefined>(() => {
    const saved = recall<string>("drill");
    if (saved) return saved;
    const pool = questions.filter((q) => gradeOf(progress, q.d, q.i) !== "got");
    const from = pool.length ? pool : questions;
    return from[seededIndex(from.length, 5)]?.key;
  });
  const [open, setOpen] = useState(false);
  const tally = drillTally(progress);
  const q = questions.find((x) => x.key === key) ?? questions[0];

  if (!q) {
    return (
      <div className="flex h-full flex-col">
        <RoundHeader round={5} title="Interview drill" goTo={goTo} />
        <p className="mt-6 text-[14px] text-ink-2">The self-check questions are still being written. Come back once the days are filled in.</p>
      </div>
    );
  }

  const grade = gradeOf(progress, q.d, q.i);
  const next = () => {
    const pool = questions.filter((x) => x.key !== q.key && gradeOf(progress, x.d, x.i) !== "got");
    const from = pool.length ? pool : questions.filter((x) => x.key !== q.key);
    const pick = from[Math.floor(Math.random() * from.length)] ?? q;
    remember("drill", pick.key);
    setKey(pick.key);
    setOpen(false);
  };
  const seg = (n: number) => `${(100 * n) / Math.max(1, tally.total)}%`;

  return (
    <div className="flex h-full flex-col">
      <RoundHeader round={5} title="Interview drill" goTo={goTo} />
      <AnimatePresence mode="wait">
        <motion.article
          key={q.key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="mt-3 flex min-h-0 flex-1 flex-col rounded-2xl border-[1.5px] border-ink bg-card p-4 shadow-[0_3px_0_var(--ink)]"
        >
          <div className="flex flex-wrap items-center gap-2 text-[11.5px] font-semibold">
            <span className="rounded-full border border-ink bg-mark px-2 py-[2px] text-ink">Day {q.d}</span>
            <span className="text-ink-2">{q.day}</span>
            <span className="ml-auto font-mono text-ink-3">
              Q{q.i + 1} of day {q.d}
            </span>
          </div>
          <h4 className="font-display mt-2 text-[18px] font-bold leading-snug text-ink">{q.q}</h4>
          <div className="scrollbar-thin mt-2 min-h-0 flex-1 overflow-y-auto pr-1">
            {open ? (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border-l-[3px] border-accent pl-3 text-[13.5px] leading-relaxed text-ink"
              >
                {q.a}
              </motion.p>
            ) : (
              <p className="text-[13px] text-ink-3">Answer out loud first, as you would in an interview. Then reveal the model answer.</p>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            {open ? (
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="How did you do?">
                {(Object.keys(GRADE_UI) as Grade[]).map((g) => {
                  const ui = GRADE_UI[g];
                  const on = grade === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setGrade(q.d, q.i, g)}
                      className={`flex items-center gap-1.5 rounded-lg border-[1.5px] px-2.5 py-1.5 text-[13px] font-semibold text-ink transition-colors ${
                        on ? ui.on : `border-rule-strong bg-card ${ui.cls}`
                      }`}
                    >
                      <ui.Icon size={14} strokeWidth={2.6} /> {ui.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <button type="button" className="btn btn-primary !py-1.5 !text-[13px]" onClick={() => setOpen(true)}>
                <Eye size={14} /> Reveal the model answer
              </button>
            )}
            <button type="button" className={`btn !py-1.5 !text-[13px] ${open && grade ? "btn-primary" : "btn-ghost"}`} onClick={next}>
              {open && grade ? "Next question" : "Skip"} <ArrowRight size={14} />
            </button>
          </div>
        </motion.article>
      </AnimatePresence>
      <div className="mt-3">
        <div className="flex h-2.5 overflow-hidden rounded-full border border-rule bg-paper-2" aria-hidden>
          <span className="bg-ok" style={{ width: seg(tally.got) }} />
          <span className="bg-mark" style={{ width: seg(tally.shaky) }} />
          <span className="bg-bad" style={{ width: seg(tally.missed) }} />
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-4 text-[12px] text-ink-2">
          <span>
            <strong className="text-ink">{tally.got}</strong> got it
          </span>
          <span>
            <strong className="text-ink">{tally.shaky}</strong> shaky
          </span>
          <span>
            <strong className="text-ink">{tally.missed}</strong> missed
          </span>
          <span className="ml-auto text-ink-3">
            {tally.total - tally.answered} of {tally.total} questions not graded yet
          </span>
        </div>
      </div>
    </div>
  );
}
