import type { ReactNode } from "react";
import type { Chapter, Resource } from "@/lib/types";

export const fmtHours = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} h${m ? ` ${m} min` : ""}` : `${m} min`;
};

const toSeconds = (at: string) => at.split(":").map(Number).reduce((acc, n) => acc * 60 + n, 0);

export const withTime = (url: string, at: string) => (url.includes("youtube.com/watch") ? `${url}&t=${toSeconds(at)}s` : url);

export const displayUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

export const BLOCK_COLORS = ["var(--accent)", "var(--mark)", "var(--v)", "var(--violet)", "var(--k)", "var(--ink-3)"];

/** One printed page on screen: a card. On paper the card dissolves into the page. */
export function Sheet({
  id,
  children,
  breakBefore = true,
  className = "",
}: {
  id?: string;
  children: ReactNode;
  breakBefore?: boolean;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`plan-sheet panel scroll-mt-[112px] p-5 shadow-[var(--shadow-1)] sm:p-9 md:scroll-mt-[128px] print:rounded-none print:border-0 print:bg-transparent print:p-0 print:shadow-none ${
        breakBefore ? "print:break-before-page" : ""
      } ${className}`}
    >
      {children}
    </section>
  );
}

export function SheetHead({ eyebrow, title, intro }: { eyebrow: string; title: string; intro?: ReactNode }) {
  return (
    <header className="plan-keep">
      <p className="font-mono text-[12.5px] font-semibold text-ink-3">{eyebrow}</p>
      <h2 className="font-display mt-1 text-[clamp(1.6rem,3.4vw,2.15rem)] font-bold leading-[1.08] text-ink">{title}</h2>
      {intro && <p className="mt-2 max-w-[64ch] text-[15.5px] leading-relaxed text-ink-2">{intro}</p>}
    </header>
  );
}

/** Sub-heading inside a day: a numbered step of the daily loop. */
export function StepHead({ n, title, note }: { n?: number; title: string; note?: ReactNode }) {
  return (
    <div className="plan-keep flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
      <h3 className="flex items-center gap-2.5 text-[16.5px] font-bold text-ink">
        {n !== undefined && (
          <span className="grid h-6 w-6 place-items-center rounded-md bg-ink font-mono text-[12px] font-bold text-card">{n}</span>
        )}
        {title}
      </h3>
      {note && <span className="text-[13.5px] text-ink-3">{note}</span>}
    </div>
  );
}

const KIND: Record<Resource["kind"], { label: string; cls: string }> = {
  video: { label: "Video", cls: "border-bad/40 bg-bad-soft text-bad" },
  code: { label: "Code", cls: "border-accent/40 bg-accent-soft text-accent" },
  read: { label: "Read", cls: "border-v/40 bg-v-soft text-v" },
};

export function KindChip({ kind }: { kind: Resource["kind"] }) {
  return (
    <span className={`inline-block shrink-0 rounded-md border px-1.5 py-px text-[11.5px] font-semibold ${KIND[kind].cls}`}>
      {KIND[kind].label}
    </span>
  );
}

const PACE: Record<Chapter["pace"], { label: string; cls: string }> = {
  watch: { label: "Watch", cls: "border-ink bg-mark text-ink" },
  skim: { label: "Skim", cls: "border-rule-strong bg-card text-ink-2" },
  skip: { label: "Skip", cls: "border-rule bg-paper-2 text-ink-3 line-through" },
};

export function PaceChip({ pace }: { pace: Chapter["pace"] }) {
  return (
    <span className={`inline-block w-[52px] shrink-0 rounded-md border py-px text-center text-[11.5px] font-semibold ${PACE[pace].cls}`}>
      {PACE[pace].label}
    </span>
  );
}

export function DayRefs({ days }: { days: number[] }) {
  return (
    <span className="ml-2 inline-block whitespace-nowrap rounded-md border border-rule bg-card-2 px-1.5 py-px align-[1px] font-mono text-[11.5px] font-semibold text-ink-3 print:bg-transparent">
      {days.length > 1 ? `Days ${days.join(", ")}` : `Day ${days[0]}`}
    </span>
  );
}
