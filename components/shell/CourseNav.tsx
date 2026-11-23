"use client";

import { Check, ChevronRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { DAYS, TOTAL_MINUTES, lessonKey } from "@/content/curriculum";
import { lessonFraction, useProgress } from "@/lib/progress";

function Ring({ frac }: { frac: number }) {
  if (frac >= 1)
    return (
      <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-ok text-card">
        <Check size={11} strokeWidth={3.4} />
      </span>
    );
  const r = 7;
  const c = 2 * Math.PI * r;
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" className="shrink-0" aria-hidden>
      <circle cx="9" cy="9" r={r} fill="none" stroke="var(--rule-strong)" strokeWidth="2" />
      {frac > 0 && (
        <circle
          cx="9"
          cy="9"
          r={r}
          fill="none"
          stroke="var(--mark)"
          strokeWidth="2.4"
          strokeDasharray={`${c * frac} ${c}`}
          strokeLinecap="round"
          transform="rotate(-90 9 9)"
        />
      )}
    </svg>
  );
}

function NavTree({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() ?? "";
  const progress = useProgress();
  const m = pathname.match(/^\/day\/(\d+)(?:\/([^/]+))?/);
  const activeDay = m ? Number(m[1]) : 1;
  const activeSlug = m?.[2];
  const [open, setOpen] = useState<Set<number>>(() => new Set([activeDay]));
  useEffect(() => {
    setOpen((o) => new Set(o).add(activeDay));
  }, [activeDay]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-baseline justify-between px-2">
        <h2 className="font-display text-[1.05rem] font-bold text-ink">Seven days</h2>
        <span className="text-[12.5px] text-ink-3">{Math.round(TOTAL_MINUTES / 60)} hours</span>
      </div>
      <ol className="mt-3 space-y-1">
        {DAYS.map((d) => {
          const keys = d.lessons.map((l) => lessonKey(d.n, l.slug));
          const doneCount = keys.filter((k) => progress.lessons[k]?.done).length;
          const isOpen = open.has(d.n);
          const isActive = activeDay === d.n;
          return (
            <li key={d.n}>
              <div
                className={`flex items-center gap-1 rounded-[10px] pr-2 ${
                  isActive && !activeSlug ? "bg-ink text-card" : "hover:bg-paper-2"
                }`}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-label={isOpen ? `Collapse day ${d.n}` : `Expand day ${d.n}`}
                  onClick={() =>
                    setOpen((o) => {
                      const n = new Set(o);
                      if (n.has(d.n)) n.delete(d.n);
                      else n.add(d.n);
                      return n;
                    })
                  }
                  className="grid h-8 w-7 shrink-0 place-items-center"
                >
                  <ChevronRight size={15} className={`transition-transform ${isOpen ? "rotate-90" : ""}`} />
                </button>
                <Link
                  href={`/day/${d.n}/`}
                  onClick={onNavigate}
                  className="flex min-w-0 flex-1 items-center gap-2.5 py-1.5"
                >
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-[7px] font-mono text-[12px] font-bold ${
                      isActive && !activeSlug ? "bg-card text-ink" : "bg-paper-2 text-ink"
                    }`}
                  >
                    {d.n}
                  </span>
                  <span className="truncate text-[14px] font-semibold">{d.title}</span>
                </Link>
                <span className={`tabular font-mono text-[11.5px] ${isActive && !activeSlug ? "text-card/70" : "text-ink-3"}`}>
                  {doneCount}/{keys.length}
                </span>
              </div>
              {isOpen && (
                <ol className="relative ml-[22px] mt-0.5 space-y-0.5 border-l border-rule pl-2.5">
                  {d.lessons.map((l) => {
                    const k = lessonKey(d.n, l.slug);
                    const on = isActive && activeSlug === l.slug;
                    return (
                      <li key={l.slug}>
                        <Link
                          href={`/day/${d.n}/${l.slug}/`}
                          onClick={onNavigate}
                          aria-current={on ? "page" : undefined}
                          className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13.5px] ${
                            on ? "bg-accent-soft font-semibold text-ink ring-1 ring-accent" : "text-ink-2 hover:bg-paper-2 hover:text-ink"
                          }`}
                        >
                          <Ring frac={lessonFraction(progress, k)} />
                          <span className="truncate">{l.title}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              )}
            </li>
          );
        })}
      </ol>
      <div className="mt-auto pt-6">
        <Link
          href="/plan/"
          onClick={onNavigate}
          className="block rounded-xl border border-rule bg-card-2 p-3 text-[13px] text-ink-2 hover:border-ink"
        >
          <span className="block font-semibold text-ink">The 7-day plan</span>
          What to watch, build and check each day, printable.
        </Link>
      </div>
    </div>
  );
}

export function CourseNav() {
  const [drawer, setDrawer] = useState(false);
  const pathname = usePathname();
  useEffect(() => setDrawer(false), [pathname]);
  return (
    <>
      <aside className="scrollbar-thin hidden w-[272px] shrink-0 overflow-y-auto border-r border-rule px-3 py-5 lg:sticky lg:top-[60px] lg:block lg:h-[calc(100vh-60px)]">
        <NavTree />
      </aside>
      <button
        type="button"
        onClick={() => setDrawer(true)}
        className="btn fixed bottom-4 left-4 z-30 lg:hidden print:hidden"
        aria-label="Open the course outline"
      >
        <Menu size={16} /> Course
      </button>
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Course outline">
          <button type="button" className="absolute inset-0 bg-ink/40" aria-label="Close" onClick={() => setDrawer(false)} />
          <div className="scrollbar-thin absolute inset-y-0 left-0 w-[300px] overflow-y-auto bg-paper px-3 py-4 shadow-[var(--shadow-2)]">
            <button type="button" onClick={() => setDrawer(false)} className="mb-2 ml-auto grid h-8 w-8 place-items-center rounded-lg hover:bg-paper-2" aria-label="Close the course outline">
              <X size={17} />
            </button>
            <NavTree onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}
    </>
  );
}
