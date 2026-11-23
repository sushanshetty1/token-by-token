"use client";

/**
 * HTML controls for interactive stages. Place them inside <StageOverlay> so
 * they float over the graph paper, or anywhere in a stage that renders HTML.
 */

import { createPortal } from "react-dom";
import { useSyncExternalStore, type ReactNode } from "react";

const PHONE = "(max-width: 767px)";

function usePhone() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(PHONE);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(PHONE).matches,
    () => false,
  );
}

export function StageOverlay({
  children,
  position = "top-right",
  className = "",
}: {
  children: ReactNode;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "top" | "bottom";
  className?: string;
}) {
  const pos: Record<string, string> = {
    "top-left": "left-3 top-3",
    "top-right": "right-3 top-3",
    "bottom-left": "left-3 bottom-3",
    "bottom-right": "right-3 bottom-3",
    top: "left-1/2 top-3 -translate-x-1/2",
    bottom: "left-1/2 bottom-3 -translate-x-1/2",
  };
  const phone = usePhone();
  // On phones the stage pans sideways, so controls move below it where a thumb can reach them.
  const slot = phone && typeof document !== "undefined" ? document.getElementById("stage-controls-slot") : null;
  if (slot) {
    return createPortal(
      <div className={`rounded-xl border border-rule bg-card p-3 ${className.replace(/\bw-\[[^\]]+\]/g, "")}`}>{children}</div>,
      slot,
    );
  }
  return (
    <div
      className={`absolute z-10 rounded-xl border border-rule bg-card/95 p-3 shadow-[var(--shadow-2)] backdrop-blur ${pos[position]} ${className}`}
    >
      {children}
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
  format = (v: number) => v.toFixed(2),
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  hint?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="block min-w-[180px]">
      <span className="flex items-baseline justify-between gap-3 text-[13px] font-semibold text-ink">
        {label}
        <span className="tabular font-mono text-[12.5px] text-ink-2">{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="tbt-range mt-1.5 w-full"
        style={{ ["--pct" as string]: `${pct}%` }}
      />
      {hint && <span className="mt-1 block text-[12px] text-ink-3">{hint}</span>}
    </label>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-lg px-1 py-1 text-left"
    >
      <span>
        <span className="block text-[13.5px] font-semibold text-ink">{label}</span>
        {hint && <span className="block text-[12px] text-ink-3">{hint}</span>}
      </span>
      <span
        className={`relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full border-[1.5px] transition-colors ${
          checked ? "border-ink bg-accent" : "border-rule-strong bg-paper-2"
        }`}
      >
        <span
          className={`absolute h-[14px] w-[14px] rounded-full transition-transform ${
            checked ? "translate-x-[19px] bg-accent-ink" : "translate-x-[3px] bg-ink-3"
          }`}
        />
      </span>
    </button>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-[10px] border border-rule-strong bg-paper-2 p-0.5">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`rounded-[8px] px-2.5 py-1 text-[12.5px] font-semibold transition-colors ${
              on ? "bg-card text-ink shadow-[var(--shadow-1)]" : "text-ink-2 hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
