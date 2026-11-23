"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ALL_LESSONS, lessonKey } from "@/content/curriculum";
import { useProgress } from "@/lib/progress";
import { Brand } from "./Brand";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { href: "/", label: "Course map", match: (p: string) => p === "/" },
  { href: "/day/1/", label: "Lessons", match: (p: string) => p.startsWith("/day/") && !p.includes("whiteboard") },
  { href: "/plan/", label: "7-day plan", match: (p: string) => p.startsWith("/plan") },
  { href: "/cheatsheet/", label: "Cheat sheet", match: (p: string) => p.startsWith("/cheatsheet") },
  { href: "/day/7/whiteboard/", label: "Whiteboard test", match: (p: string) => p.includes("whiteboard") },
  { href: "/build/", label: "Build next", match: (p: string) => p.startsWith("/build") },
];

export function AppHeader() {
  const pathname = usePathname() ?? "/";
  const progress = useProgress();
  const done = ALL_LESSONS.filter((l) => progress.lessons[lessonKey(l.day, l.slug)]?.done).length;
  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-paper/90 backdrop-blur print:hidden">
      <div className="mx-auto flex h-[60px] max-w-[1680px] items-center gap-4 px-4 sm:px-6">
        <Brand />
        <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.map((n) => {
            const on = n.match(pathname);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={on ? "page" : undefined}
                className={`rounded-[10px] px-3 py-1.5 text-[14px] font-semibold transition-colors ${
                  on ? "bg-ink text-card" : "text-ink-2 hover:bg-paper-2 hover:text-ink"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <div
            className="hidden items-center gap-2 rounded-[10px] border border-rule bg-card px-3 py-1.5 sm:flex"
            title="Lessons finished"
          >
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-paper-2">
              <div className="h-full rounded-full bg-ok transition-[width] duration-500" style={{ width: `${(done / ALL_LESSONS.length) * 100}%` }} />
            </div>
            <span className="tabular font-mono text-[12.5px] font-semibold text-ink-2">
              {done}/{ALL_LESSONS.length}
            </span>
          </div>
          <ThemeToggle />
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-t border-rule px-3 py-1.5 md:hidden" aria-label="Main">
        {NAV.map((n) => {
          const on = n.match(pathname);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`shrink-0 rounded-lg px-2.5 py-1 text-[13px] font-semibold ${on ? "bg-ink text-card" : "text-ink-2"}`}
            >
              {n.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
