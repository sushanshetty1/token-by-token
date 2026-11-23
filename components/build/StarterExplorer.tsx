"use client";

import { useState } from "react";
import { CodeDock } from "@/components/player/CodeDock";

export interface StarterPart {
  id: string;
  label: string;
  what: string;
  ranges: [number, number][];
}

/** The starter file with a list of its parts; picking a part lights up its lines. */
export function StarterExplorer({ source, parts }: { source: string; parts: StarterPart[] }) {
  const [active, setActive] = useState(parts[1]?.id ?? parts[0].id);
  const [open, setOpen] = useState(true);
  const part = parts.find((p) => p.id === active) ?? parts[0];
  const lines = source.split("\n").length;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      <ol className="grid content-start gap-1.5" aria-label="Parts of tiny_gpt.py">
        {parts.map((p) => {
          const on = p.id === active;
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  setActive(p.id);
                  setOpen(true);
                }}
                aria-pressed={on}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
                  on ? "border-ink bg-card shadow-[var(--press)]" : "border-transparent hover:border-rule hover:bg-card"
                }`}
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className={`text-[15px] font-bold ${on ? "text-ink" : "text-ink-2"}`}>{p.label}</span>
                  <span className="tabular font-mono text-[11.5px] text-ink-3">
                    {p.ranges.map(([a, b]) => (a === b ? `${a}` : `${a}–${b}`)).join(", ")}
                  </span>
                </span>
                <span className={`mt-1 block text-[13.5px] leading-snug text-ink-2 ${on ? "" : "max-lg:hidden"}`}>{p.what}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <CodeDock
        filename="tiny_gpt.py"
        source={source}
        ranges={part.ranges}
        caption={`${lines} lines. ${part.label} is lit.`}
        open={open}
        onToggle={() => setOpen((o) => !o)}
        maxHeight={600}
      />
    </div>
  );
}
