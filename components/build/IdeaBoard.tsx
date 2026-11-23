"use client";

import { ChevronDown, FileCode2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { IDEAS, SIZES, TOPICS, type Idea, type Size, type Topic } from "@/content/build";
import { CopyButton } from "./CopyButton";

const SIZE_ORDER: Size[] = ["evening", "weekend", "week"];

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-full border px-3 py-1 text-[13.5px] font-semibold transition-colors ${
        on ? "border-ink bg-ink text-card" : "border-rule-strong bg-card text-ink-2 hover:border-ink hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

export function IdeaBoard() {
  const [size, setSize] = useState<Size | "all">("all");
  const [topic, setTopic] = useState<Topic | "all">("all");
  const shown = IDEAS.filter((i) => (size === "all" || i.size === size) && (topic === "all" || i.topics.includes(topic)));
  const groups = SIZE_ORDER.map((s) => ({ s, items: shown.filter((i) => i.size === s) })).filter((g) => g.items.length);

  return (
    <div>
      <div className="flex flex-col gap-3 rounded-2xl border border-rule bg-card-2 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 w-[7.5rem] text-[13px] font-semibold text-ink-3">Time you have</span>
          <Chip on={size === "all"} onClick={() => setSize("all")}>
            Any
          </Chip>
          {SIZE_ORDER.map((s) => (
            <Chip key={s} on={size === s} onClick={() => setSize(s)}>
              {SIZES[s].label}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 w-[7.5rem] text-[13px] font-semibold text-ink-3">Topic</span>
          <Chip on={topic === "all"} onClick={() => setTopic("all")}>
            Any
          </Chip>
          {(Object.keys(TOPICS) as Topic[]).map((t) => (
            <Chip key={t} on={topic === t} onClick={() => setTopic(t)}>
              {TOPICS[t]}
            </Chip>
          ))}
        </div>
        <p className="text-[13px] text-ink-3" aria-live="polite">
          {shown.length === IDEAS.length ? `All ${IDEAS.length} projects` : `${shown.length} of ${IDEAS.length} projects`}
        </p>
      </div>

      {groups.length === 0 && (
        <p className="mt-8 rounded-xl border border-dashed border-rule-strong p-6 text-[15px] text-ink-2">
          No project fits both filters yet. Set one of them back to Any.
        </p>
      )}

      {groups.map((g) => (
        <section key={g.s} className="mt-10" aria-labelledby={`size-${g.s}`}>
          <h3 id={`size-${g.s}`} className="flex flex-wrap items-baseline gap-x-3 font-display text-[1.35rem] font-bold text-ink">
            {SIZES[g.s].label}
            <span className="font-sans text-[14px] font-medium text-ink-3">{SIZES[g.s].hours}</span>
          </h3>
          <ul className="mt-4 grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
            {g.items.map((idea) => (
              <IdeaCard key={idea.id} idea={idea} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function IdeaCard({ idea }: { idea: Idea }) {
  const [open, setOpen] = useState(false);
  return (
    <li id={idea.id} className={`panel scroll-mt-24 flex flex-col p-5 transition-colors ${open ? "border-ink" : ""}`}>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] font-semibold text-ink-3">
        {idea.topics.map((t) => (
          <span key={t}>{TOPICS[t]}</span>
        ))}
        {idea.starter && (
          <span className="ml-auto flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-accent">
            <FileCode2 size={12} /> Starts from tiny_gpt.py
          </span>
        )}
      </p>
      <h4 className="mt-2 font-display text-[1.2rem] font-bold leading-tight text-ink">{idea.title}</h4>
      <p className="mt-2 text-[14.5px] leading-snug text-ink">{idea.make}</p>
      <p className="mt-2 text-[13.5px] leading-snug text-ink-2">{idea.why}</p>
      <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-ink-3">
        Uses
        {idea.days.map((d) => (
          <Link key={d} href={`/day/${d}/`} className="font-semibold text-accent underline-offset-4 hover:underline">
            Day {d}
          </Link>
        ))}
      </p>

      <details className="group mt-4 border-t border-rule pt-3" onToggle={(e) => setOpen(e.currentTarget.open)}>
        <summary className="flex cursor-pointer list-none items-center justify-between text-[14px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
          How to start
          <ChevronDown size={16} className="text-ink-3 transition-transform group-open:rotate-180" />
        </summary>
        <ol className="mt-3 grid gap-2.5">
          {idea.start.map((s, i) => (
            <li key={s} className="flex gap-2.5 text-[14px] leading-snug text-ink">
              <span className="tabular mt-[1px] grid h-5 w-5 shrink-0 place-items-center rounded-md bg-ink font-mono text-[11.5px] font-bold text-card">
                {i + 1}
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 rounded-lg bg-ok-soft px-3 py-2 text-[13.5px] leading-snug text-ink">
          <span className="font-semibold">Done when </span>
          {idea.done.charAt(0).toLowerCase() + idea.done.slice(1)}
        </p>
        <p className="mt-2 text-[13.5px] leading-snug text-ink-2">
          <span className="font-semibold text-ink">Go further. </span>
          {idea.further}
        </p>
        <div className="mt-3 rounded-xl border border-rule bg-card-2 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12.5px] font-semibold text-ink-3">Prompt for your AI assistant</span>
            <CopyButton text={idea.prompt} />
          </div>
          <p className="mt-1.5 font-mono text-[12.5px] leading-relaxed text-ink">{idea.prompt}</p>
        </div>
      </details>
    </li>
  );
}
