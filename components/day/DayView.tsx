"use client";

import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Clipboard,
  Code2,
  Eye,
  FlaskConical,
  MessageSquareQuote,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { lessonKey } from "@/content/curriculum";
import { PIPELINE } from "@/lib/pipeline";
import { lessonFraction, setTick, useProgress } from "@/lib/progress";
import type { Chapter, DayContent, Resource } from "@/lib/types";

const toSeconds = (at: string) =>
  at.split(":").map(Number).reduce((acc, n) => acc * 60 + n, 0);

const withTime = (url: string, at: string) => {
  if (!url.includes("youtube.com/watch")) return url;
  return `${url}&t=${toSeconds(at)}s`;
};

const fmtHours = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} h${m ? ` ${m} min` : ""}` : `${m} min`;
};

const BLOCK_COLORS = ["var(--accent)", "var(--mark)", "var(--v)", "var(--violet)", "var(--k)", "var(--ink-3)"];

function SectionTitle({ n, title, sub, id }: { n: number; title: string; sub: string; id?: string }) {
  return (
    <div id={id} className="scroll-mt-24">
      <div className="flex items-center gap-3">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-ink font-mono text-[13px] font-bold text-card">{n}</span>
        <h2 className="font-display text-[1.45rem] font-bold text-ink">{title}</h2>
      </div>
      <p className="ml-10 mt-0.5 max-w-[70ch] text-[14.5px] text-ink-2">{sub}</p>
    </div>
  );
}

export function DayView({ day, prev, next }: { day: DayContent; prev?: DayContent; next?: DayContent }) {
  const progress = useProgress();
  const total = day.schedule.reduce((s, b) => s + b.minutes, 0);
  const lit = new Set(day.stations);

  return (
    <div className="mx-auto max-w-[1180px] space-y-10 pb-24">
      {/* Hero */}
      <section className="panel relative overflow-hidden">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-display text-[4.5rem] font-extrabold leading-[0.8] text-ink [font-variation-settings:'wdth'_75]">
                {day.n}
              </span>
              <span className="text-[14px] font-semibold leading-tight text-ink-3">
                Day {day.n}
                <br />
                of 7
              </span>
            </div>
            <h1 className="font-display mt-4 text-[clamp(2rem,4vw,2.9rem)] font-bold leading-[1.05] text-ink">{day.title}</h1>
            <p className="mt-2 max-w-[56ch] text-[17px] text-ink-2">{day.tagline}</p>
            <p className="mt-5 flex max-w-[60ch] items-start gap-2.5 rounded-xl border border-rule bg-card-2 p-3.5 text-[14.5px] text-ink">
              <Check size={18} className="mt-0.5 shrink-0 text-ok" strokeWidth={3} />
              <span>
                <strong className="font-semibold">By tonight: </strong>
                {day.outcome}
              </span>
            </p>
          </div>
          <div className="space-y-5">
            <div>
              <div className="flex items-baseline justify-between">
                <h3 className="text-[14px] font-bold text-ink">Today&apos;s time</h3>
                <span className="tabular font-mono text-[14px] font-semibold text-ink">{fmtHours(total)}</span>
              </div>
              <div className="mt-2 flex h-3 overflow-hidden rounded-full border border-rule">
                {day.schedule.map((b, i) => (
                  <span key={b.label} style={{ width: `${(b.minutes / total) * 100}%`, background: BLOCK_COLORS[i % BLOCK_COLORS.length] }} />
                ))}
              </div>
              <ul className="mt-3 space-y-1.5">
                {day.schedule.map((b, i) => (
                  <li key={b.label} className="flex items-center gap-2 text-[13.5px]">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: BLOCK_COLORS[i % BLOCK_COLORS.length] }} />
                    <span className="flex-1 text-ink-2">{b.label}</span>
                    <span className="tabular font-mono text-[12.5px] text-ink-3">{b.minutes} min</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-ink">Where today sits on the path</h3>
              <ol className="mt-2 flex flex-wrap gap-1">
                {PIPELINE.map((s) => (
                  <li
                    key={s.id}
                    className={`rounded-md border px-1.5 py-0.5 text-[12px] font-semibold ${
                      lit.has(s.id) ? "border-ink bg-mark text-ink" : "border-rule bg-card-2 text-ink-3"
                    }`}
                  >
                    {s.label}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* 1. Lessons */}
      <section className="space-y-4">
        <SectionTitle n={1} title="Learn it here first" sub="Animated lessons that build the picture in your head before you see the code." />
        <div className={`grid gap-3 md:grid-cols-2 ${day.lessons.length === 3 ? "xl:grid-cols-3" : ""}`}>
          {day.lessons.map((l, i) => {
            const frac = lessonFraction(progress, lessonKey(day.n, l.slug));
            return (
              <Link
                key={l.slug}
                href={`/day/${day.n}/${l.slug}/`}
                className="panel group flex flex-col p-5 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[var(--shadow-2)]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[12.5px] font-semibold text-ink-3">Lesson {i + 1}</span>
                  <span className="text-[12.5px] text-ink-3">
                    {l.minutes} min, {l.level.toLowerCase()}
                  </span>
                </div>
                <h3 className="font-display mt-2 text-[1.25rem] font-bold leading-tight text-ink">{l.title}</h3>
                <p className="mt-1.5 flex-1 text-[14px] text-ink-2">{l.promise}</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-2">
                    <div className="h-full rounded-full bg-ok" style={{ width: `${frac * 100}%` }} />
                  </div>
                  <span className="flex items-center gap-1 text-[13.5px] font-semibold text-accent">
                    {frac >= 1 ? "Review" : frac > 0 ? "Continue" : "Start"}
                    <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 2. Watch and build */}
      <section className="space-y-4">
        <SectionTitle n={2} title="Then watch and build" sub="Karpathy and 3Blue1Brown do the hands-on part. Watch the marked parts, then have AI write the code while you explain it." />
        <div className="grid gap-3">
          {day.watch.map((r) => (
            <ResourceCard key={r.url + r.title} r={r} />
          ))}
        </div>
        {day.build.length > 0 && (
          <div className="panel p-5">
            <h3 className="flex items-center gap-2 text-[15px] font-bold text-ink">
              <Code2 size={17} className="text-accent" /> Build with AI, explain it yourself
            </h3>
            <ul className="mt-3 space-y-2">
              {day.build.map((b, i) => (
                <TickRow key={i} id={`d${day.n}:build:${i}`} text={b} />
              ))}
            </ul>
          </div>
        )}
        {day.aiPrompts.length > 0 && (
          <div className="panel p-5">
            <h3 className="flex items-center gap-2 text-[15px] font-bold text-ink">
              <Sparkles size={17} className="text-violet" /> Prompts worth pasting into your AI
            </h3>
            <ul className="mt-3 grid gap-2">
              {day.aiPrompts.map((p, i) => (
                <PromptRow key={i} text={p} />
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* 3. Experiments */}
      {day.experiments.length > 0 && (
        <section className="space-y-4">
          <SectionTitle n={3} title="Predict, then break it" sub="Write your guess down first. Being wrong is where the learning happens." />
          <div className="grid gap-3 md:grid-cols-2">
            {day.experiments.map((e) => (
              <ExperimentCard key={e.title} e={e} />
            ))}
          </div>
        </section>
      )}

      {/* 4. Check */}
      <section className="space-y-4">
        <SectionTitle
          id="check"
          n={day.experiments.length > 0 ? 4 : 3}
          title="Check yourself"
          sub="Answer out loud before revealing. These are the questions interviewers ask."
        />
        {day.checks.length > 0 ? (
          <div className="grid gap-3">
            {day.checks.map((c, i) => (
              <CheckCard key={i} id={`d${day.n}:check:${i}`} n={i + 1} q={c.q} a={c.a} />
            ))}
          </div>
        ) : (
          <p className="text-[14px] text-ink-3">Questions for this day are being written.</p>
        )}
        {day.explainOutLoud.length > 0 && (
          <div className="panel p-5">
            <h3 className="flex items-center gap-2 text-[15px] font-bold text-ink">
              <MessageSquareQuote size={17} className="text-mark" /> Say these out loud before moving on
            </h3>
            <ul className="mt-3 space-y-2">
              {day.explainOutLoud.map((t, i) => (
                <TickRow key={i} id={`d${day.n}:say:${i}`} text={t} />
              ))}
            </ul>
          </div>
        )}
      </section>

      <nav className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-6" aria-label="Days">
        {prev ? (
          <Link href={`/day/${prev.n}/`} className="btn btn-ghost">
            <ArrowLeft size={15} /> Day {prev.n}: {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/day/${next.n}/`} className="btn btn-primary">
            Day {next.n}: {next.title} <ArrowRight size={15} />
          </Link>
        ) : (
          <Link href="/day/7/whiteboard/" className="btn btn-primary">
            Take the whiteboard test <ArrowRight size={15} />
          </Link>
        )}
      </nav>
    </div>
  );
}

function ResourceCard({ r }: { r: Resource }) {
  const Icon = r.kind === "video" ? PlayCircle : r.kind === "code" ? Code2 : BookOpen;
  return (
    <article className="panel p-5">
      <div className="flex flex-wrap items-start gap-4">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${
            r.kind === "video" ? "border-bad/40 bg-bad-soft text-bad" : r.kind === "code" ? "border-accent/40 bg-accent-soft text-accent" : "border-v/40 bg-v-soft text-v"
          }`}
        >
          <Icon size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <a href={r.url} target="_blank" rel="noreferrer" className="font-display text-[1.1rem] font-bold leading-snug text-ink underline-offset-4 hover:underline">
            {r.title}
          </a>
          <p className="mt-0.5 text-[13px] text-ink-3">
            {r.by}
            {r.minutes ? `, about ${r.minutes} min of it today` : ""}
          </p>
          <p className="mt-1.5 text-[14px] text-ink-2">{r.why}</p>
        </div>
        <a href={r.url} target="_blank" rel="noreferrer" className="btn btn-ghost shrink-0">
          Open
        </a>
      </div>
      {r.chapters && r.chapters.length > 0 && <Chapters chapters={r.chapters} url={r.url} />}
    </article>
  );
}

const PACE: Record<Chapter["pace"], { label: string; cls: string }> = {
  watch: { label: "Watch", cls: "border-ink bg-mark text-ink" },
  skim: { label: "Skim", cls: "border-rule-strong bg-card text-ink-2" },
  skip: { label: "Skip", cls: "border-rule bg-paper-2 text-ink-3 line-through" },
};

function Chapters({ chapters, url }: { chapters: Chapter[]; url: string }) {
  return (
    <ol className="mt-4 grid gap-1 border-t border-rule pt-3 sm:grid-cols-2">
      {chapters.map((c) => (
        <li key={c.at + c.title}>
          <a
            href={withTime(url, c.at)}
            target="_blank"
            rel="noreferrer"
            className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13.5px] hover:bg-paper-2 ${c.pace === "skip" ? "opacity-60" : ""}`}
          >
            <span className="tabular w-[58px] shrink-0 font-mono text-[12.5px] text-accent">{c.at}</span>
            <span className="min-w-0 flex-1 text-ink">{c.title}</span>
            <span className={`shrink-0 rounded-md border px-1.5 py-px text-[11px] font-semibold ${PACE[c.pace].cls}`}>{PACE[c.pace].label}</span>
          </a>
        </li>
      ))}
    </ol>
  );
}

function TickRow({ id, text }: { id: string; text: string }) {
  const progress = useProgress();
  const on = !!progress.ticks[id];
  return (
    <li>
      <button type="button" onClick={() => setTick(id, !on)} className="flex w-full items-start gap-3 rounded-lg p-1 text-left hover:bg-paper-2">
        <span
          className={`mt-[2px] grid h-5 w-5 shrink-0 place-items-center rounded-[6px] border-[1.5px] ${on ? "border-ok bg-ok text-card" : "border-rule-strong bg-card"}`}
        >
          {on && <Check size={13} strokeWidth={3.2} />}
        </span>
        <span className={`text-[14.5px] leading-snug ${on ? "text-ink-3 line-through decoration-ink-3/50" : "text-ink"}`}>{text}</span>
      </button>
    </li>
  );
}

function PromptRow({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <li className="flex items-start gap-3 rounded-xl border border-rule bg-card-2 p-3">
      <p className="flex-1 font-mono text-[13px] leading-relaxed text-ink">{text}</p>
      <button
        type="button"
        className="btn btn-ghost shrink-0 !px-2 !py-1 !text-[12px]"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          } catch {
            /* ignore */
          }
        }}
      >
        {copied ? <Check size={13} /> : <Clipboard size={13} />} {copied ? "Copied" : "Copy"}
      </button>
    </li>
  );
}

function ExperimentCard({ e }: { e: DayContent["experiments"][number] }) {
  const [shown, setShown] = useState(false);
  return (
    <article className="panel flex flex-col p-5">
      <h3 className="flex items-center gap-2 font-display text-[1.1rem] font-bold text-ink">
        <FlaskConical size={18} className="text-v" /> {e.title}
      </h3>
      <p className="mt-3 rounded-lg border-[1.5px] border-dashed border-mark bg-mark-soft/50 p-3 text-[14px] text-ink">
        <span className="font-semibold">Predict: </span>
        {e.predict}
      </p>
      <p className="mt-3 text-[14px] text-ink-2">
        <span className="font-semibold text-ink">How: </span>
        {e.how}
      </p>
      <div className="mt-auto pt-3">
        {shown ? (
          <p className="rounded-lg bg-ok-soft p-3 text-[14px] text-ink">
            <span className="font-semibold">What you should see: </span>
            {e.expect}
          </p>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={() => setShown(true)}>
            <Eye size={15} /> I made my guess, show me
          </button>
        )}
      </div>
    </article>
  );
}

function CheckCard({ id, n, q, a }: { id: string; n: number; q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const progress = useProgress();
  const got = !!progress.ticks[id];
  return (
    <article className={`panel p-5 ${got ? "border-ok/50" : ""}`}>
      <div className="flex items-start gap-3">
        <span className="tabular mt-0.5 font-mono text-[13px] font-bold text-ink-3">Q{n}</span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[16px] font-semibold leading-snug text-ink">{q}</h3>
          {open && <p className="mt-3 border-l-[3px] border-accent pl-3 text-[14.5px] leading-relaxed text-ink-2">{a}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn btn-ghost !py-1.5" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              <Eye size={15} /> {open ? "Hide the answer" : "Show the answer"}
            </button>
            <button
              type="button"
              className={`btn !py-1.5 ${got ? "!border-ok !bg-ok-soft" : "btn-ghost"}`}
              onClick={() => setTick(id, !got)}
              aria-pressed={got}
            >
              <Check size={15} /> {got ? "I can answer this" : "Mark as answered"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
