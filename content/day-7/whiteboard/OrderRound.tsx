"use client";

import { Check, ChevronRight, Eye, RotateCcw, Shuffle, X, type LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode } from "react";
import { setTick, useProgress } from "@/lib/progress";
import { RoundHeader } from "./RoundHeader";
import { recall, remember, shuffled } from "./state";

export interface OrderCard {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Shown under the slot once the order is right. */
  reveal?: string;
  /** Shown when this card is in a wrong place. */
  hint: string;
}

interface Memory {
  slots: (string | null)[];
  tray: string[];
  checked: boolean;
  fails: number;
  revealed: boolean;
}


function fresh(cards: OrderCard[], salt: number): Memory {
  return { slots: cards.map(() => null), tray: shuffled(cards.map((c) => c.id), salt), checked: false, fails: 0, revealed: false };
}

export function OrderRound({
  memoryKey,
  tick,
  round,
  title,
  instructions,
  cards,
  grade,
  success,
  solvedExtra,
  loopLabel,
  goTo,
  salt,
}: {
  memoryKey: string;
  tick: string;
  round: number;
  title: string;
  instructions: ReactNode;
  /** In the correct order. */
  cards: OrderCard[];
  /** True per slot when the card there is acceptable. */
  grade: (order: string[]) => boolean[];
  success: ReactNode;
  solvedExtra?: ReactNode;
  loopLabel?: string;
  goTo?: (step: number) => void;
  salt: number;
}) {
  const progress = useProgress();
  const solvedBefore = !!progress.ticks[tick];
  const [mem, setMem] = useState<Memory>(() => {
    const saved = recall<Memory>(memoryKey);
    if (saved) return saved;
    if (solvedBefore) return { slots: cards.map((c) => c.id), tray: [], checked: true, fails: 0, revealed: false };
    return fresh(cards, salt);
  });
  const byId = Object.fromEntries(cards.map((c) => [c.id, c]));

  const update = (next: Memory) => {
    remember(memoryKey, next);
    setMem(next);
  };

  const full = mem.slots.every(Boolean);
  const order = mem.slots.filter(Boolean) as string[];
  const marks = full ? grade(order) : [];
  const allRight = full && marks.every(Boolean);
  const showMarks = mem.checked && full;
  const firstWrong = showMarks ? mem.slots.findIndex((_, i) => !marks[i]) : -1;
  const nextEmpty = mem.slots.findIndex((s) => s === null);

  const place = (id: string) => {
    if (nextEmpty < 0) return;
    const slots = [...mem.slots];
    slots[nextEmpty] = id;
    update({ ...mem, slots, tray: mem.tray.filter((t) => t !== id), checked: false });
  };
  const unplace = (i: number) => {
    const id = mem.slots[i];
    if (!id) return;
    const slots = [...mem.slots];
    slots[i] = null;
    update({ ...mem, slots, tray: [...mem.tray, id], checked: false, revealed: false });
  };
  const check = () => {
    const ok = grade(order).every(Boolean);
    if (ok && !mem.revealed) setTick(tick, true);
    update({ ...mem, checked: true, fails: ok ? mem.fails : mem.fails + 1 });
  };
  const reveal = () => {
    setTick(tick, false);
    update({ slots: cards.map((c) => c.id), tray: [], checked: true, fails: mem.fails, revealed: true });
  };
  const restart = () => update(fresh(cards, salt + mem.fails + 17));

  return (
    <div className="flex h-full flex-col">
      <RoundHeader round={round} title={title} goTo={goTo} />
      <p className="mt-1.5 text-[13px] leading-snug text-ink-2">{instructions}</p>

      <div className="relative mt-4">
        <ol className="flex items-stretch" aria-label="Your order">
          {mem.slots.map((id, i) => {
            const card = id ? byId[id] : null;
            const state = !showMarks || !card ? "idle" : marks[i] ? "ok" : "bad";
            const Icon = card?.icon;
            return (
              <li key={i} className="flex min-w-0 flex-1 items-center">
                {card && Icon ? (
                  <motion.button
                    type="button"
                    onClick={() => unplace(i)}
                    initial={{ opacity: 0, scale: 0.85, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: showMarks && allRight ? i * 0.07 : 0 }}
                    aria-label={`Slot ${i + 1}: ${card.label}${state === "bad" ? ", wrong place" : state === "ok" ? ", right" : ""}. Press to send back.`}
                    className={`relative flex h-[66px] w-full min-w-0 flex-col items-center justify-center gap-1 rounded-xl border-[1.5px] px-1 text-center transition-colors ${
                      state === "ok"
                        ? "border-ok bg-ok-soft"
                        : state === "bad"
                          ? "border-bad bg-bad-soft"
                          : "border-ink bg-card hover:bg-card-2"
                    }`}
                  >
                    <span className="absolute left-1.5 top-1 font-mono text-[10px] font-bold text-ink-3">{i + 1}</span>
                    {state !== "idle" && (
                      <span
                        className={`absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full ${state === "ok" ? "bg-ok text-card" : "bg-bad text-card"}`}
                      >
                        {state === "ok" ? <Check size={10} strokeWidth={3.5} /> : <X size={10} strokeWidth={3.5} />}
                      </span>
                    )}
                    <Icon size={17} className="text-ink-2" />
                    <span className="max-w-full px-0.5 text-[12px] font-semibold leading-tight tracking-[-0.01em] text-ink">{card.label}</span>
                  </motion.button>
                ) : (
                  <div
                    className={`grid h-[66px] w-full place-items-center rounded-xl border-[1.5px] border-dashed font-mono text-[13px] font-bold ${
                      i === nextEmpty ? "border-mark bg-mark-soft/60 text-ink" : "border-rule-strong text-ink-3"
                    }`}
                  >
                    {i + 1}
                  </div>
                )}
                {i < mem.slots.length - 1 && <ChevronRight size={14} className="mx-[1px] shrink-0 text-ink-3" />}
              </li>
            );
          })}
        </ol>
        {loopLabel && (
          <div className="relative mt-1 flex items-end gap-2 px-[7%] text-[11.5px] text-ink-3" aria-hidden>
            <span className="absolute left-[7%] top-[-3px] h-0 w-0 -translate-x-[4px] border-x-[5px] border-b-[7px] border-x-transparent border-b-ink-3" />
            <span className="h-4 flex-1 rounded-bl-xl border-b-[1.5px] border-l-[1.5px] border-dashed border-ink-3" />
            <span className="shrink-0 translate-y-[7px] bg-card px-1 font-medium">{loopLabel}</span>
            <span className="h-4 flex-1 rounded-br-xl border-b-[1.5px] border-r-[1.5px] border-dashed border-ink-3" />
          </div>
        )}
        {allRight && showMarks && mem.slots.some((s) => s && byId[s].reveal) && (
          <ol className="mt-1.5 flex">
            {mem.slots.map((id, i) => (
              <li key={i} className="min-w-0 flex-1 pr-[16px] last:pr-0">
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.07 }}
                  className="text-center font-mono text-[10.5px] leading-tight text-ink-2"
                >
                  {id ? byId[id].reveal : ""}
                </motion.div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="mt-4 min-h-[64px]">
        {mem.tray.length > 0 ? (
          <>
            <div className="mb-2 text-[11.5px] font-semibold text-ink-3">Cards, shuffled. Click to place in the next slot.</div>
            <ul className="flex flex-wrap gap-2" aria-label="Cards to place">
              <AnimatePresence initial={false}>
                {mem.tray.map((id) => {
                  const c = byId[id];
                  const Icon = c.icon;
                  return (
                    <motion.li
                      key={id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                    >
                      <button
                        type="button"
                        onClick={() => place(id)}
                        className="flex items-center gap-1.5 rounded-xl border-[1.5px] border-ink bg-card px-3 py-2 text-[13px] font-semibold text-ink shadow-[var(--press)] transition-transform hover:bg-card-2 active:translate-y-[2px] active:shadow-none"
                      >
                        <Icon size={15} className="text-ink-2" />
                        {c.label}
                      </button>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          </>
        ) : (
          allRight && showMarks && solvedExtra
        )}
      </div>

      <footer className="mt-auto flex items-center gap-4 border-t border-rule pt-3">
        <div className="flex shrink-0 gap-2">
          {showMarks && allRight ? (
            <button type="button" className="btn btn-ghost !py-1.5 !text-[13px]" onClick={restart}>
              <Shuffle size={14} /> Shuffle and redo
            </button>
          ) : (
            <>
              <button type="button" className="btn btn-primary !py-1.5 !text-[13px]" onClick={check} disabled={!full || mem.checked}>
                <Check size={14} /> Check
              </button>
              <button type="button" className="btn btn-ghost !py-1.5 !text-[13px]" onClick={restart} disabled={mem.tray.length === cards.length}>
                <RotateCcw size={14} /> Reset
              </button>
              {mem.fails >= 2 && (
                <button type="button" className="btn btn-ghost !py-1.5 !text-[13px]" onClick={reveal}>
                  <Eye size={14} /> Show me
                </button>
              )}
            </>
          )}
        </div>
        <div className="flex min-h-[40px] min-w-0 flex-1 items-center text-[13px] leading-snug" aria-live="polite">
          {!full && <span className="text-ink-3">{nextEmpty === 0 ? "Start with what comes first." : `${mem.slots.length - nextEmpty} left to place.`}</span>}
          {full && !mem.checked && <span className="text-ink-2">All placed. Check your order.</span>}
          {showMarks && allRight && (
            <span className="flex items-start gap-2 text-ink">
              <span className="mt-[1px] grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ok text-card">
                <Check size={13} strokeWidth={3.2} />
              </span>
              <span>{mem.revealed ? "That is the right order. Shuffle and do it from memory to count it." : success}</span>
            </span>
          )}
          {showMarks && !allRight && (
            <span className="flex items-start gap-2 text-ink">
              <span className="mt-[1px] grid h-5 w-5 shrink-0 place-items-center rounded-full bg-bad text-card">
                <X size={13} strokeWidth={3.2} />
              </span>
              <span>
                <strong>
                  {marks.filter(Boolean).length} of {marks.length} in the right place.
                </strong>{" "}
                {firstWrong >= 0 && mem.slots[firstWrong] ? byId[mem.slots[firstWrong] as string].hint : null} Click a red card to send it back.
              </span>
            </span>
          )}
        </div>
      </footer>
    </div>
  );
}
