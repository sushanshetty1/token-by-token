"use client";

import { BookOpen, Download, Printer, RectangleVertical } from "lucide-react";
import { useEffect } from "react";
import { usePlanView, type PlanView } from "./PlanDoc";

const PDF_PATH = "/LLM_From_Scratch_7_Days.pdf";

const JUMPS = [
  { href: "#how", label: "Method" },
  { href: "#week", label: "Week" },
  ...[1, 2, 3, 4, 5, 6, 7].map((n) => ({ href: `#day-${n}`, label: `Day ${n}` })),
  { href: "#self-check", label: "Self-check" },
  { href: "#project", label: "Project" },
];

/** Paper is white: print in the light theme even if the screen is dark, then switch back. */
function usePrintInLight() {
  useEffect(() => {
    const root = document.documentElement;
    let restore: string | null = null;
    const before = () => {
      if (root.dataset.theme === "dark") {
        restore = "dark";
        root.dataset.theme = "light";
      }
    };
    const after = () => {
      if (restore) root.dataset.theme = restore;
      restore = null;
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);
}

const VIEWS: { value: PlanView; label: string; Icon: typeof BookOpen }[] = [
  { value: "one", label: "One page", Icon: RectangleVertical },
  { value: "two", label: "Two pages", Icon: BookOpen },
];

function ViewSwitch() {
  const [view, setView] = usePlanView();
  return (
    <div role="radiogroup" aria-label="Page layout" className="hidden rounded-[10px] border border-rule-strong bg-paper-2 p-0.5 xl:inline-flex">
      {VIEWS.map(({ value, label, Icon }) => {
        const on = view === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setView(value)}
            className={`flex items-center gap-1.5 rounded-[8px] px-2.5 py-1 text-[12.5px] font-semibold transition-colors ${
              on ? "bg-card text-ink shadow-[var(--shadow-1)]" : "text-ink-2 hover:text-ink"
            }`}
          >
            <Icon size={14} strokeWidth={2.2} /> {label}
          </button>
        );
      })}
    </div>
  );
}

export function PlanToolbar() {
  usePrintInLight();
  const [view] = usePlanView();
  return (
    <div className="z-30 border-b border-rule bg-paper/90 backdrop-blur md:sticky md:top-[61px] print:hidden">
      <div
        className={`mx-auto flex max-w-[1060px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6 ${
          view === "two" ? "xl:max-w-[1760px]" : "xl:max-w-[1240px]"
        }`}
      >
        <nav aria-label="Sections of the plan" className="order-2 -mx-1 flex w-full min-w-0 gap-0.5 overflow-x-auto px-1 sm:order-none sm:w-auto sm:flex-1">
          {JUMPS.map((j) => (
            <a
              key={j.href}
              href={j.href}
              className="shrink-0 rounded-lg px-2 py-1 text-[13px] font-semibold text-ink-2 hover:bg-paper-2 hover:text-ink"
            >
              {j.label}
            </a>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <ViewSwitch />
          <button type="button" className="btn btn-ghost !py-1.5 !text-[13.5px]" onClick={() => window.print()}>
            <Printer size={15} /> Print
          </button>
          <a href={PDF_PATH} download className="btn btn-primary !py-1.5 !text-[13.5px]">
            <Download size={15} /> Download PDF
          </a>
        </div>
      </div>
    </div>
  );
}
