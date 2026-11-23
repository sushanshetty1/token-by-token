"use client";

import { Check, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { setTick, useProgress } from "@/lib/progress";
import { RoundHeader } from "./RoundHeader";
import { STATIONS, TICK } from "./state";
import { STATION_ICON } from "./icons";

export const MODEL_ANSWER: Record<string, string> = {
  text: "The raw prompt string. The model never reads characters; the tokenizer turns it into ids.",
  tokens: "BPE splits the text into known pieces and maps each to an integer id: T ids, shape (T).",
  embed: "Look up a learned C-dim row per id (wte) and add a row per position (wpe). Out: (T, C).",
  attention: "Each token makes q, k, v. Scaled q·k scores, mask the future, softmax, mix the v's.",
  mlp: "Per token: Linear to 4C, GELU, Linear back to C, added to the residual. Tokens think alone.",
  logits: "Final LayerNorm, then the LM head maps each C-vector to vocab_size scores: (T, vocab_size).",
  sample: "Softmax the last row (with temperature, top-k), draw one id, append it, run again.",
  loss: "Cross-entropy: -log of the probability given to the true next token, averaged. One number.",
  backprop: "loss.backward() runs the chain rule from the loss back through every op, filling each .grad.",
  update: "optimizer.step(): AdamW moves each weight a little against its gradient. Zero grads, repeat.",
};

function FlipCard({ index, id, label, out, said }: { index: number; id: string; label: string; out: string; said: boolean }) {
  const [flipped, setFlipped] = useState(false);
  const Icon = STATION_ICON[id];
  const flip = () => {
    if (!flipped) setTick(TICK.flip(id), true);
    setFlipped((f) => !f);
  };
  const training = index >= 7;
  return (
    <li className="h-full" style={{ perspective: 900 }}>
      <motion.button
        type="button"
        onClick={flip}
        aria-pressed={flipped}
        aria-label={flipped ? `${label}: ${MODEL_ANSWER[id]}` : `${label}. Say what it does, then press to flip.`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0, rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], opacity: { delay: index * 0.04 }, y: { delay: index * 0.04 } }}
        className="relative block h-full w-full text-left"
        style={{ transformStyle: "preserve-3d" }}
      >
        <span
          className={`absolute inset-0 flex flex-col rounded-xl border-[1.5px] border-ink p-2.5 shadow-[0_2px_0_var(--ink)] ${
            training ? "bg-violet-soft" : "bg-card"
          }`}
          style={{ backfaceVisibility: "hidden" }}
        >
          <span className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-bold text-ink-3">{index + 1}</span>
            {said && (
              <span className="grid h-4 w-4 place-items-center rounded-full bg-ok text-card" aria-hidden>
                <Check size={10} strokeWidth={3.5} />
              </span>
            )}
          </span>
          <span className="mt-1 grid flex-1 place-items-center">
            <span className="flex flex-col items-center gap-1.5">
              {Icon && <Icon size={22} className="text-ink-2" />}
              <span className="font-display text-[17px] font-bold text-ink">{label}</span>
            </span>
          </span>
          <span className="flex items-center justify-center gap-1 text-[11px] font-medium text-ink-3">
            <RefreshCw size={11} /> say it, then flip
          </span>
        </span>
        <span
          className="absolute inset-0 flex flex-col overflow-hidden rounded-xl border-[1.5px] border-ok bg-ok-soft px-2.5 py-2"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <span className="flex-1 text-[11.5px] leading-[1.32] text-ink">{MODEL_ANSWER[id]}</span>
          <span className="mt-1 max-w-full self-start truncate rounded-md border border-ok bg-card px-1.5 py-[1px] font-mono text-[10px] text-ink-2">
            out: {out}
          </span>
        </span>
      </motion.button>
    </li>
  );
}

export function FlipRound({ goTo }: { goTo?: (step: number) => void }) {
  const progress = useProgress();
  const said = STATIONS.filter((s) => progress.ticks[TICK.flip(s.id)]).length;
  return (
    <div className="flex h-full flex-col">
      <RoundHeader round={4} title="Explain every box out loud" goTo={goTo} />
      <p className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-4 text-[13px] leading-snug text-ink-2">
        <span>Say what each box does and what comes out of it. Then flip the card and compare.</span>
        <span className="font-mono text-[12px] font-semibold text-ink">
          {said} of {STATIONS.length} explained
        </span>
      </p>
      <ol className="mt-3 grid min-h-0 flex-1 grid-cols-5 grid-rows-2 gap-2.5">
        {STATIONS.map((s, i) => (
          <FlipCard key={s.id} index={i} id={s.id} label={s.label} out={s.out} said={!!progress.ticks[TICK.flip(s.id)]} />
        ))}
      </ol>
    </div>
  );
}
