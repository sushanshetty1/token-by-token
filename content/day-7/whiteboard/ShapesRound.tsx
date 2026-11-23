"use client";

import { Check, RotateCcw, X } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { setTick, useProgress } from "@/lib/progress";
import { RoundHeader } from "./RoundHeader";
import { TICK, recall, remember } from "./state";

type ShapeId = "ids" | "vec" | "logits" | "scalar";

const SHAPES: { id: ShapeId; text: string; what: string }[] = [
  { id: "ids", text: "(T)", what: "token ids" },
  { id: "vec", text: "(T, C)", what: "vectors" },
  { id: "logits", text: "(T, vocab_size)", what: "logits" },
  { id: "scalar", text: "()", what: "scalar loss" },
];

const BOXES = [
  { label: "Tokenizer", sub: "text in" },
  { label: "Embedding tables", sub: "wte + wpe" },
  { label: "Blocks x n_layer", sub: "attention + MLP" },
  { label: "LM head", sub: "final norm, Linear" },
  { label: "Cross-entropy", sub: "vs targets" },
  { label: "loss.backward()", sub: "gradients" },
];

const ANSWER: ShapeId[] = ["ids", "vec", "vec", "logits", "scalar"];
const GPT2: string[] = ["(1024,)", "(1024, 768)", "(1024, 768)", "(1024, 50257)", "()"];

interface ShapesMemory {
  arrows: (ShapeId | null)[];
  checked: boolean;
}

export function ShapesRound({ goTo }: { goTo?: (step: number) => void }) {
  const progress = useProgress();
  const solvedBefore = !!progress.ticks[TICK.shapes];
  const [arrows, setArrows] = useState<(ShapeId | null)[]>(
    () => recall<ShapesMemory>("shapes")?.arrows ?? (solvedBefore ? [...ANSWER] : ANSWER.map(() => null)),
  );
  const [checked, setChecked] = useState(() => recall<ShapesMemory>("shapes")?.checked ?? solvedBefore);
  const [pick, setPick] = useState<ShapeId | null>("ids");

  const commit = (next: (ShapeId | null)[], nextChecked: boolean) => {
    remember<ShapesMemory>("shapes", { arrows: next, checked: nextChecked });
    setArrows(next);
    setChecked(nextChecked);
  };
  const assign = (i: number) => {
    const next = [...arrows];
    next[i] = pick && next[i] !== pick ? pick : null;
    commit(next, false);
  };
  const full = arrows.every(Boolean);
  const marks = arrows.map((a, i) => a === ANSWER[i]);
  const allRight = full && marks.every(Boolean);
  const check = () => {
    if (marks.every(Boolean)) setTick(TICK.shapes, true);
    commit(arrows, true);
  };
  const reset = () => commit(ANSWER.map(() => null), false);
  const shapeText = (id: ShapeId | null) => SHAPES.find((s) => s.id === id)?.text ?? "";

  const rowH = 58;
  const bh = 36;
  const mid = bh + (rowH - bh) / 2;

  return (
    <div className="flex h-full flex-col">
      <RoundHeader round={3} title="Match each arrow to its shape" goTo={goTo} />
      <div className="mt-3 flex min-h-0 flex-1 gap-6">
        <ol className="relative w-[340px] max-w-full shrink-0" aria-label="The pipeline">
          {BOXES.map((b, i) => (
            <li key={b.label} className="relative" style={{ height: i < BOXES.length - 1 ? rowH : bh }}>
              <div style={{ height: bh }} className="flex w-[170px] flex-col justify-center rounded-xl border-[1.5px] border-ink bg-card px-3 shadow-[0_2px_0_var(--ink)]">
                <span className="text-[13px] font-semibold leading-none text-ink">{b.label}</span>
                <span className="mt-1 font-mono text-[10.5px] leading-none text-ink-3">{b.sub}</span>
              </div>
              {i < BOXES.length - 1 && (
                <>
                  <span className="absolute left-[84px] w-[1.5px] bg-ink" style={{ top: bh + 2, height: rowH - bh - 8 }} />
                  <span
                    className="absolute left-[80px] h-0 w-0 border-x-[5px] border-t-[6px] border-x-transparent border-t-ink"
                    style={{ top: rowH - 6 }}
                  />
                  <span className="absolute left-[86px] w-[96px] border-t-[1.5px] border-dashed border-rule-strong" style={{ top: mid }} />
                  <button
                    type="button"
                    onClick={() => assign(i)}
                    aria-label={`Arrow ${i + 1}, from ${b.label} to ${BOXES[i + 1].label}: ${arrows[i] ? shapeText(arrows[i]) : "empty"}`}
                    className={`absolute left-[184px] flex h-[30px] min-w-[150px] items-center justify-center gap-1.5 whitespace-nowrap rounded-full border-[1.5px] px-3 font-mono text-[12.5px] font-semibold transition-colors ${
                      checked && arrows[i]
                        ? marks[i]
                          ? "border-ok bg-ok-soft text-ink"
                          : "border-bad bg-bad-soft text-ink"
                        : arrows[i]
                          ? "border-ink bg-card text-ink hover:bg-card-2"
                          : "border-dashed border-mark bg-mark-soft/50 text-ink-3 hover:border-ink"
                    }`}
                    style={{ top: mid - 15 }}
                  >
                    {checked && arrows[i] && (marks[i] ? <Check size={12} strokeWidth={3.2} /> : <X size={12} strokeWidth={3.2} />)}
                    {arrows[i] ? shapeText(arrows[i]) : "?"}
                  </button>
                </>
              )}
            </li>
          ))}
        </ol>

        <div className="flex min-w-0 flex-1 flex-col">
          <p className="text-[13px] leading-snug text-ink-2">
            Pick a shape, then click the arrow it flows along. Shapes are per sequence: the batch dimension B is left out.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Shapes">
            {SHAPES.map((s) => {
              const on = pick === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setPick(s.id)}
                  className={`flex flex-col items-start rounded-xl border-[1.5px] px-3 py-2 text-left transition-all ${
                    on ? "border-ink bg-mark-soft shadow-[0_2px_0_var(--ink)]" : "border-rule-strong bg-card hover:border-ink"
                  }`}
                >
                  <span className="font-mono text-[14px] font-bold text-ink">{s.text}</span>
                  <span className="text-[11.5px] text-ink-2">{s.what}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 min-h-[86px] text-[13px] leading-snug" aria-live="polite">
            {checked && allRight && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-ok bg-ok-soft px-3 py-2 text-ink">
                <div>
                  <strong>All five right.</strong> The blocks keep (T, C) in and out, which is why they stack.
                </div>
                <div className="mt-1 font-mono text-[11px] leading-snug text-ink-2">GPT-2 small, T = 1024: {GPT2.join(", ")}</div>
              </motion.div>
            )}
            {checked && !allRight && (
              <div className="rounded-xl border border-bad bg-bad-soft p-3 text-ink">
                <strong>
                  {marks.filter(Boolean).length} of {marks.length} right.
                </strong>{" "}
                {!marks[0]
                  ? "The tokenizer outputs one integer per token."
                  : !marks[1] || !marks[2]
                    ? "Every position carries a C-dimensional vector through the blocks, and a block does not change the shape."
                    : !marks[3]
                      ? "The LM head scores every vocabulary entry at every position."
                      : "Cross-entropy averages over all positions into one number."}
              </div>
            )}
            {!checked && <div className="text-ink-3">{full ? "All arrows filled. Check them." : `${arrows.filter((a) => !a).length} arrows left.`}</div>}
          </div>

          <div className="mt-auto flex gap-2 border-t border-rule pt-3">
            <button type="button" className="btn btn-primary !py-1.5 !text-[13px]" onClick={check} disabled={!full || checked}>
              <Check size={14} /> Check
            </button>
            <button type="button" className="btn btn-ghost !py-1.5 !text-[13px]" onClick={reset} disabled={arrows.every((a) => !a)}>
              <RotateCcw size={14} /> Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
