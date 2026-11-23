"use client";

import { Download, Printer } from "lucide-react";
import { useEffect } from "react";

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

export function PlanToolbar() {
  usePrintInLight();
  return (
    <div className="z-30 border-b border-rule bg-paper/90 backdrop-blur md:sticky md:top-[61px] print:hidden">
      <div className="mx-auto flex max-w-[1060px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
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
