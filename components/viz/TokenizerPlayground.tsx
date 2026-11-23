"use client";

import { motion } from "motion/react";
import { useDeferredValue, useState } from "react";
import { seededVector, tokenTint, diverging } from "@/lib/color";
import { ENCODING_LABEL, useTokens, type EncodingName } from "@/lib/tokenizer";
import { Segmented } from "./controls";

const show = (t: string) => t.replace(/ /g, "·").replace(/\n/g, "↵").replace(/\t/g, "→");

export function TokenizerPlayground({
  initial = "The cat sat on the mat because it was tired.",
  presets,
  showVectors = true,
  compact = false,
}: {
  initial?: string;
  presets?: { label: string; text: string }[];
  showVectors?: boolean;
  compact?: boolean;
}) {
  const [text, setText] = useState(initial);
  const [enc, setEnc] = useState<EncodingName>("o200k");
  const deferred = useDeferredValue(text);
  const result = useTokens(deferred, enc);
  const pieces = result?.pieces ?? [];
  const chars = [...deferred].length;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented
          label="Tokenizer"
          value={enc}
          onChange={setEnc}
          options={[
            { value: "o200k", label: "GPT-4o" },
            { value: "gpt2", label: "GPT-2" },
          ]}
        />
        <div className="tabular flex gap-3 font-mono text-[12.5px] text-ink-2">
          <span>
            <b className="text-ink">{chars}</b> chars
          </span>
          <span>
            <b className="text-ink">{pieces.length}</b> tokens
          </span>
          <span className="hidden sm:inline">
            <b className="text-ink">{pieces.length ? (chars / pieces.length).toFixed(1) : "0"}</b> chars/token
          </span>
        </div>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={compact ? 2 : 3}
        spellCheck={false}
        aria-label="Text to tokenize"
        className="w-full resize-none rounded-xl border-[1.5px] border-ink bg-card px-3.5 py-2.5 font-mono text-[14.5px] leading-relaxed text-ink shadow-[0_2px_0_var(--ink)] outline-none focus:border-accent"
      />
      {presets && (
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setText(p.text)}
              className="rounded-full border border-rule-strong bg-card px-2.5 py-0.5 text-[12.5px] font-medium text-ink-2 hover:border-ink hover:text-ink"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
      <div className="scrollbar-thin min-h-[64px] flex-1 overflow-y-auto">
        <ul className="flex flex-wrap gap-x-1.5 gap-y-2.5" aria-label={`Tokens using ${ENCODING_LABEL[enc]}`}>
          {pieces.map((p, i) => {
            const tint = tokenTint(i);
            return (
              <motion.li
                key={`${enc}-${i}-${p.id}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(i * 0.012, 0.4) }}
                className="flex flex-col items-center"
              >
                <span
                  className="rounded-md border px-1.5 py-0.5 font-mono text-[13.5px] font-semibold whitespace-pre"
                  style={{ background: tint.fill, borderColor: tint.stroke, color: tint.text }}
                  title={p.partial ? "Part of a multi-byte character" : undefined}
                >
                  {p.partial ? "◆" : show(p.text) || "∅"}
                </span>
                <span className="tabular mt-0.5 font-mono text-[10.5px] text-ink-3">{p.id}</span>
                {showVectors && i < 14 && (
                  <span className="mt-1 flex flex-col gap-[2px]" aria-hidden>
                    {seededVector(p.id, 6).map((v, j) => (
                      <span key={j} className="h-[7px] w-[18px] rounded-[2px] border border-rule" style={{ background: diverging(v) }} />
                    ))}
                  </span>
                )}
              </motion.li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
