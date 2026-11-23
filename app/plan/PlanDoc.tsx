"use client";

import type { ReactNode } from "react";
import { usePref } from "@/lib/prefs";

export const PLAN_VIEW_KEY = "tbt:plan-view";
export type PlanView = "one" | "two";

export function usePlanView() {
  const [view, setView] = usePref(PLAN_VIEW_KEY, "two");
  return [view === "one" ? "one" : "two", setView] as [PlanView, (v: PlanView) => void];
}

/**
 * The plan's pages. On wide screens the two-page view lays the sheets out in
 * spreads, like a PDF reader: each pair shares a row and the shorter page
 * stretches to match. Below xl, and on paper, it is always one column.
 */
export function PlanDoc({ children }: { children: ReactNode }) {
  const [view] = usePlanView();
  return (
    <main
      data-view={view}
      className={`plan-doc mx-auto flex max-w-[880px] flex-col gap-6 px-3 pb-24 pt-6 sm:px-6 sm:pt-8 print:block print:max-w-none print:px-0 print:pb-0 print:pt-0 ${
        view === "two" ? "xl:grid xl:max-w-[1760px] xl:grid-cols-2 xl:items-stretch" : ""
      }`}
    >
      {children}
    </main>
  );
}
