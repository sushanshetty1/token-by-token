"use client";

import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { setTick, useProgress } from "@/lib/progress";

/**
 * A checklist row. Ids match the day page (d1:check:0, d1:build:2, ...) so a tick
 * made here shows up there, and the other way round. Prints as an empty box.
 */
export function Tick({ id, children, size = "md" }: { id: string; children: ReactNode; size?: "sm" | "md" }) {
  const progress = useProgress();
  const on = !!progress.ticks[id];
  return (
    <li className="break-inside-avoid">
      <button
        type="button"
        onClick={() => setTick(id, !on)}
        aria-pressed={on}
        className="flex w-full items-start gap-3 rounded-lg px-1 py-1 text-left hover:bg-paper-2 print:px-0 print:py-0.5 print:hover:bg-transparent"
      >
        <span
          className={`mt-[3px] grid h-[17px] w-[17px] shrink-0 place-items-center rounded-[5px] border-[1.5px] ${
            on ? "border-ok bg-ok text-card" : "border-ink-3 bg-card print:bg-transparent"
          }`}
        >
          {on && <Check size={12} strokeWidth={3.2} />}
        </span>
        <span className={`min-w-0 flex-1 leading-snug ${size === "sm" ? "text-[14px]" : "text-[15px]"} ${on ? "text-ink-3" : "text-ink"}`}>
          {children}
        </span>
      </button>
    </li>
  );
}
