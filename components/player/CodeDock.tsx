"use client";

import { ChevronDown, Code2, Copy, Check } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { highlightPython, TOK_CLASS } from "./highlight";

export function CodeDock({
  filename,
  source,
  ranges,
  caption,
  note,
  open,
  onToggle,
  maxHeight = 340,
}: {
  filename: string;
  source: string;
  ranges: [number, number][];
  caption?: ReactNode;
  note?: string;
  open: boolean;
  onToggle: () => void;
  maxHeight?: number;
}) {
  const lines = useMemo(() => highlightPython(source.replace(/\n$/, "")), [source]);
  const scroller = useRef<HTMLDivElement>(null);
  const [focus, setFocus] = useState(true);
  const [copied, setCopied] = useState(false);

  const isOn = (n: number) => ranges.some(([a, b]) => n >= a && n <= b);
  const hasRanges = ranges.length > 0;
  const first = hasRanges ? Math.min(...ranges.map((r) => r[0])) : 0;

  useEffect(() => {
    const el = scroller.current;
    if (!el || !open || !hasRanges) return;
    const row = el.querySelector<HTMLElement>(`[data-line="${first}"]`);
    if (!row) return;
    const top = row.offsetTop - 40;
    el.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }, [first, open, hasRanges]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(source);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard can be blocked; nothing to do */
    }
  };

  return (
    <section className="panel overflow-hidden" aria-label="Code for this step">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-rule bg-card-2 px-4 py-2.5">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex items-center gap-2 text-[13.5px] font-semibold text-ink"
        >
          <Code2 size={16} className="text-accent" />
          <span className="font-mono text-[13px]">{filename}</span>
          <ChevronDown size={15} className={`text-ink-3 transition-transform ${open ? "" : "-rotate-90"}`} />
        </button>
        {open && caption && <span className="order-last min-w-0 basis-full text-[13px] text-ink-2 sm:order-none sm:flex-1 sm:basis-0">{caption}</span>}
        {open && (
          <div className="ml-auto flex items-center gap-1.5">
            {hasRanges && (
              <button type="button" onClick={() => setFocus((f) => !f)} className="btn btn-ghost !px-2 !py-1 !text-[12px]">
                {focus ? "Show all lines" : "Focus this step"}
              </button>
            )}
            <button type="button" onClick={copy} className="btn btn-ghost !px-2 !py-1 !text-[12px]" aria-label="Copy code">
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        )}
      </header>
      {open && (
        <div ref={scroller} className="relative overflow-auto bg-card py-2" style={{ maxHeight }}>
          <pre className="font-mono text-[12.75px] leading-[1.7]">
            {lines.map((toks, i) => {
              const n = i + 1;
              const on = isOn(n);
              const dim = focus && hasRanges && !on;
              return (
                <div
                  key={n}
                  data-line={n}
                  className={`flex border-l-[3px] pr-4 transition-[background,opacity] duration-300 ${
                    on ? "border-accent bg-accent-soft/70" : "border-transparent"
                  } ${dim ? "opacity-40" : "opacity-100"}`}
                >
                  <span className="w-11 shrink-0 select-none pr-3 text-right text-ink-3 tabular">{n}</span>
                  <code className="whitespace-pre">
                    {toks.length === 0 ? " " : toks.map((t, j) => (
                      <span key={j} className={TOK_CLASS[t.k]}>
                        {t.t}
                      </span>
                    ))}
                  </code>
                </div>
              );
            })}
          </pre>
          {note && <p className="border-t border-rule px-4 pt-2 text-[12px] text-ink-3">{note}</p>}
        </div>
      )}
    </section>
  );
}
