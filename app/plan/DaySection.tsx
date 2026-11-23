import Link from "next/link";
import { PIPELINE } from "@/lib/pipeline";
import type { DayContent, Resource } from "@/lib/types";
import { BLOCK_COLORS, KindChip, PaceChip, Sheet, StepHead, displayUrl, fmtHours, withTime } from "./parts";
import { Tick } from "./Tick";

export function DaySection({ day }: { day: DayContent }) {
  const total = day.schedule.reduce((s, b) => s + b.minutes, 0);
  const lit = new Set(day.stations);
  const dayPath = `/day/${day.n}/`;

  return (
    <Sheet id={`day-${day.n}`}>
      {/* Header */}
      <header className="plan-keep grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="flex items-start gap-4">
          <span className="font-display text-[4.6rem] font-extrabold leading-[0.78] text-ink [font-variation-settings:'wdth'_75]">
            {day.n}
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[12.5px] font-semibold text-ink-3">Day {day.n} of 7</p>
            <h2 className="font-display text-[clamp(1.7rem,3.6vw,2.3rem)] font-bold leading-[1.05] text-ink text-balance">{day.title}</h2>
            <p className="mt-1.5 max-w-[52ch] text-[15.5px] leading-snug text-ink-2">{day.tagline}</p>
          </div>
        </div>
        <div className="sm:text-right">
          <p className="text-[12.5px] text-ink-3">Time today</p>
          <p className="tabular font-display text-[1.6rem] font-bold leading-none text-ink">{fmtHours(total)}</p>
        </div>
      </header>

      <ol className="plan-keep mt-5 flex flex-wrap gap-1" aria-label="Stations of the path this day covers">
        {PIPELINE.map((s) => (
          <li
            key={s.id}
            className={`rounded-md border px-1.5 py-0.5 text-[12px] font-semibold ${
              lit.has(s.id) ? "border-ink bg-mark text-ink" : "border-rule bg-card-2 text-ink-3 print:bg-transparent"
            }`}
          >
            {s.label}
          </li>
        ))}
      </ol>

      <div className="plan-keep mt-5 grid gap-5 border-y border-rule py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <p className="text-[13px] font-bold text-ink">By the end of the day</p>
          <p className="mt-1 text-[15px] leading-snug text-ink">{day.outcome}</p>
        </div>
        <div>
          <div className="flex h-2.5 overflow-hidden rounded-full border border-rule">
            {day.schedule.map((b, i) => (
              <span key={b.label} style={{ width: `${(b.minutes / total) * 100}%`, background: BLOCK_COLORS[i % BLOCK_COLORS.length] }} />
            ))}
          </div>
          <ul className="mt-2.5 space-y-1">
            {day.schedule.map((b, i) => (
              <li key={b.label} className="flex items-center gap-2 text-[13.5px]">
                <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: BLOCK_COLORS[i % BLOCK_COLORS.length] }} />
                <span className="flex-1 leading-snug text-ink-2">{b.label}</span>
                <span className="tabular shrink-0 font-mono text-[12.5px] text-ink-3">{b.minutes} min</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 1. Lessons */}
      <div className="mt-7 print:mt-5">
        <StepHead n={1} title="Learn it in the app" note="Make every prediction before you read on." />
        <ol className="mt-3 divide-y divide-rule rounded-xl border border-rule">
          {day.lessons.map((l, i) => {
            const href = `/day/${day.n}/${l.slug}/`;
            return (
              <li key={l.slug} className="grid break-inside-avoid grid-cols-[auto_minmax(0,1fr)] gap-x-3 px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
                <span className="tabular pt-0.5 font-mono text-[12.5px] font-semibold text-ink-3">{i + 1}</span>
                <div className="min-w-0">
                  <Link href={href} className="text-[15.5px] font-bold leading-snug text-ink underline-offset-4 hover:underline print:hidden">
                    {l.title}
                  </Link>
                  <span className="hidden text-[15.5px] font-bold leading-snug text-ink print:inline">{l.title}</span>
                  <p className="mt-0.5 text-[14px] leading-snug text-ink-2">{l.promise}</p>
                  <p className="mt-1 font-mono text-[12.5px] text-accent">{href}</p>
                </div>
                <span className="col-start-2 mt-1 text-[12.5px] text-ink-3 sm:col-start-3 sm:mt-0 sm:pt-0.5 sm:text-right">
                  {l.minutes} min, {l.level.toLowerCase()}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {/* 2. Watch */}
      {day.watch.length > 0 && (
        <div className="mt-7 print:mt-5">
          <StepHead n={2} title="Watch and read" note="Watch the marked chapters, skim the rest at 2x." />
          <div className="mt-3 grid gap-3">
            {day.watch.map((r) => (
              <ResourceBlock key={r.url + r.title} r={r} />
            ))}
          </div>
        </div>
      )}

      {/* 3. Build */}
      {(day.build.length > 0 || day.experiments.length > 0) && (
        <div className="mt-7 print:mt-5">
          <StepHead n={3} title="Build with AI, explain it yourself" />
          {day.build.length > 0 && (
            <ul className="mt-2.5 space-y-0.5">
              {day.build.map((b, i) => (
                <Tick key={i} id={`d${day.n}:build:${i}`}>
                  {b}
                </Tick>
              ))}
            </ul>
          )}
          {day.aiPrompts.length > 0 && (
            <p className="mt-2 pl-8 text-[13.5px] text-ink-3 print:pl-7">
              {day.aiPrompts.length === 1 ? "One copy-ready prompt" : `${day.aiPrompts.length} copy-ready prompts`} for this build are on the day page,{" "}
              <span className="font-mono text-accent">{dayPath}</span>.
            </p>
          )}
          {day.experiments.length > 0 && (
            <div className="mt-4">
              <p className="plan-keep text-[14px] font-bold text-ink">Predict, then break it</p>
              <div className={`mt-2 grid gap-2.5 sm:grid-cols-2 ${day.experiments.length >= 3 ? "print:grid-cols-3" : ""}`}>
                {day.experiments.map((e, i) => (
                  <article key={i} className="break-inside-avoid rounded-xl border border-rule bg-card-2 p-3.5 print:bg-transparent">
                    <h4 className="text-[14.5px] font-bold leading-snug text-ink">{e.title}</h4>
                    <p className="mt-1.5 rounded-lg border border-dashed border-mark bg-mark-soft/60 px-2.5 py-1.5 text-[13.5px] leading-snug text-ink print:bg-transparent">
                      <span className="font-semibold">Predict: </span>
                      {e.predict}
                    </p>
                    <p className="mt-1.5 text-[13.5px] leading-snug text-ink-2">
                      <span className="font-semibold text-ink">How: </span>
                      {e.how}
                    </p>
                    <p className="mt-2.5 hidden border-b border-dashed border-ink-3 pb-3 text-[12px] text-ink-3 print:block">Your guess</p>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Check */}
      <div className="mt-7 print:mt-5">
        <StepHead
          n={4}
          title="Check yourself"
          note={
            <>
              Out loud first. Model answers:{" "}
              <Link href={`${dayPath}#check`} className="font-mono text-accent underline-offset-4 hover:underline">
                {dayPath}
              </Link>
            </>
          }
        />
        {day.checks.length > 0 ? (
          <ol className="mt-2.5 space-y-0.5">
            {day.checks.map((c, i) => (
              <Tick key={i} id={`d${day.n}:check:${i}`}>
                <span className="tabular mr-1.5 font-mono text-[12.5px] font-semibold text-ink-3">Q{i + 1}</span>
                {c.q}
              </Tick>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-[14px] text-ink-3">This day&apos;s questions are on the day page.</p>
        )}
        {day.explainOutLoud.length > 0 && (
          <div className="mt-4">
            <p className="plan-keep text-[14px] font-bold text-ink">Say these out loud before you move on</p>
            <ul className="mt-1.5 space-y-0.5">
              {day.explainOutLoud.map((t, i) => (
                <Tick key={i} id={`d${day.n}:say:${i}`} size="sm">
                  {t}
                </Tick>
              ))}
            </ul>
          </div>
        )}
        <p className="mt-4 rounded-lg bg-card-2 px-3 py-2 text-[13.5px] text-ink-2 print:hidden">
          The day page has the model answers and what each experiment should show. Ticks you make here show up there too.
        </p>
      </div>
    </Sheet>
  );
}

function ResourceBlock({ r }: { r: Resource }) {
  const chapters = r.chapters ?? [];
  return (
    <article className="break-inside-avoid rounded-xl border border-rule p-4">
      <div className="flex items-start gap-2.5">
        <span className="pt-[3px]">
          <KindChip kind={r.kind} />
        </span>
        <div className="min-w-0 flex-1">
          <a href={r.url} target="_blank" rel="noreferrer" className="text-[15.5px] font-bold leading-snug text-ink underline-offset-4 hover:underline">
            {r.title}
          </a>
          <p className="mt-0.5 text-[13px] text-ink-3">
            {r.by}
            {r.minutes ? `, about ${r.minutes} min of it today` : ""}
          </p>
          <p className="mt-1 text-[14px] leading-snug text-ink-2">{r.why}</p>
          <p className="mt-1 hidden break-all font-mono text-[12px] text-accent print:block">{displayUrl(r.url)}</p>
        </div>
      </div>
      {chapters.length > 0 && (
        <ol className="mt-3 border-t border-rule pt-2">
          {chapters.map((c) => (
            <li key={c.at + c.title} className={`flex items-center gap-3 py-[3px] text-[13.5px] ${c.pace === "skip" ? "opacity-60" : ""}`}>
              <a
                href={withTime(r.url, c.at)}
                target="_blank"
                rel="noreferrer"
                className="tabular w-[58px] shrink-0 font-mono text-[12.5px] text-accent underline-offset-4 hover:underline"
              >
                {c.at}
              </a>
              <span className="min-w-0 flex-1 leading-snug text-ink">{c.title}</span>
              <PaceChip pace={c.pace} />
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}
