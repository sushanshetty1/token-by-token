import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/shell/Brand";
import { ALL_LESSONS, DAYS, TOTAL_MINUTES } from "@/content/curriculum";
import {
  BACKUP,
  DAILY_LOOP,
  DRILL,
  FINAL_NEW,
  FINAL_ORIGINAL,
  GLANCE,
  NAPKIN,
  NEXT_STEP,
  PROJECT,
  RESUME_LINE,
  RULES,
  SETUP,
  SKIP,
  STORY,
  type FinalCheck,
} from "./content";
import { DaySection } from "./DaySection";
import { PlanDoc } from "./PlanDoc";
import { FinishLine } from "./FinishLine";
import { DayRefs, Sheet, SheetHead, displayUrl, fmtHours } from "./parts";
import { PlanToolbar } from "./PlanToolbar";
import { Tick } from "./Tick";

export const metadata: Metadata = {
  title: "The 7-day plan",
  description: "Build an LLM from scratch in 7 days: what to learn, watch, build and check each day, as a page and a printable PDF.",
};

/* Print rules that Tailwind variants cannot express. Scoped to the plan. */
const PRINT_CSS = `
@page { size: A4; margin: 14mm 14mm 16mm; }
@media print {
  .plan-doc { font-size: 15px; }
  .plan-doc .plan-keep { break-inside: avoid; break-after: avoid; }
  .plan-doc a { text-decoration: none; }
  .plan-doc .plan-sheet + .plan-sheet { margin-top: 0; }
  .plan-doc svg { break-inside: avoid; }
  nextjs-portal { display: none !important; }
}
.plan-doc { counter-reset: sheet; }
.plan-doc .plan-sheet { counter-increment: sheet; }
@media screen {
  .plan-doc .plan-sheet::after {
    content: counter(sheet);
    position: absolute;
    right: 20px;
    bottom: 14px;
    font: 600 11.5px/1 var(--font-mono);
    color: var(--ink-3);
  }
}
`;

const allFinal: FinalCheck[] = [...FINAL_ORIGINAL, ...FINAL_NEW];

export default function PlanPage() {
  const hours = Math.round(TOTAL_MINUTES / 60);
  const dayQuestions = DAYS.reduce((s, d) => s + d.checks.length, 0);
  const videos = new Set(DAYS.flatMap((d) => d.watch.filter((r) => r.kind === "video").map((r) => r.url))).size;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      <PlanToolbar />
      <PlanDoc>
        <Cover hours={hours} videos={videos} questions={dayQuestions + allFinal.length + NAPKIN.length} />
        <HowToLearn hours={hours} />
        <Week />
        {DAYS.map((d) => (
          <DaySection key={d.n} day={d} />
        ))}
        <SelfCheck />
        <Project />
        <SafeToSkip />
        <Resources />
      </PlanDoc>
    </>
  );
}

function Cover({ hours, videos, questions }: { hours: number; videos: number; questions: number }) {
  const stats = [
    { k: "Days", v: "7" },
    { k: "Lessons", v: String(ALL_LESSONS.length) },
    { k: "Hours", v: String(hours) },
    { k: "Videos", v: String(videos) },
    { k: "Questions", v: String(questions) },
  ];
  return (
    <Sheet breakBefore={false} className="overflow-hidden">
      <div className="flex items-center gap-2.5">
        <BrandMark size={26} />
        <span className="font-display text-[1.05rem] font-bold text-ink">Token by Token</span>
        <span className="ml-auto font-mono text-[12.5px] font-semibold text-ink-3">The study plan</span>
      </div>

      <h1 className="font-display mt-10 text-[clamp(2.5rem,7vw,4.4rem)] font-extrabold leading-[0.95] text-ink text-balance [font-variation-settings:'wdth'_80] print:mt-14 print:text-[4.2rem]">
        Build an LLM from scratch in 7 days
      </h1>
      <p className="mt-5 max-w-[56ch] text-[clamp(1.05rem,2vw,1.2rem)] leading-relaxed text-ink-2">
        About {hours} hours over seven days. AI writes the code; you own the understanding. Each day pairs animated lessons in
        this app with Karpathy&apos;s and 3Blue1Brown&apos;s videos, a build you explain line by line, and a self-check.
      </p>

      <dl className="mt-7 grid grid-cols-3 gap-x-4 gap-y-3 border-y border-rule py-4 sm:grid-cols-5">
        {stats.map((s) => (
          <div key={s.k}>
            <dt className="text-[12px] leading-tight text-ink-3">{s.k}</dt>
            <dd className="tabular font-display mt-0.5 text-[1.55rem] font-bold leading-none text-ink">{s.v}</dd>
          </div>
        ))}
      </dl>

      <div className="plan-keep mt-7 grid gap-x-8 gap-y-3 rounded-2xl border-[1.5px] border-ink bg-mark-soft p-5 shadow-[var(--press)] sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] sm:items-center sm:p-6 print:shadow-none">
        <div>
          <p className="font-mono text-[12.5px] font-semibold text-ink-2">The one rule</p>
          <p className="font-display mt-1.5 text-[clamp(1.35rem,2.6vw,1.6rem)] font-bold leading-[1.12] text-ink">
            Let AI type. You must be able to explain every line.
          </p>
        </div>
        <p className="text-[14.5px] leading-snug text-ink-2">
          Typing code is cheap now. Understanding is the skill. If you cannot explain a line out loud, you do not own it yet: ask,
          read and rerun until you can.
        </p>
      </div>

      <div className="mt-8 grid items-start gap-6 sm:grid-cols-[minmax(0,0.74fr)_minmax(0,1.26fr)] sm:gap-8">
        <div className="sm:pt-2">
          <p className="font-mono text-[12.5px] font-semibold text-ink-3">The finish line</p>
          <p className="font-display mt-1.5 text-[1.3rem] font-bold leading-snug text-ink text-balance">
            Draw this path on a whiteboard from memory, and say what flows along every arrow.
          </p>
          <p className="mt-2.5 text-[14.5px] leading-snug text-ink-2">
            Text becomes tokens, tokens become vectors, attention and MLP blocks refine them, and logits score every possible next
            token. In training, the loss is backpropagated and every weight gets a little better. Day 7 ends with this exact test.
          </p>
          <ul className="mt-4 space-y-1.5 text-[13.5px] text-ink-2">
            <li className="flex items-center gap-2.5">
              <span className="h-[2px] w-6 shrink-0 bg-ink" /> Every time the model reads
            </li>
            <li className="flex items-center gap-2.5">
              <span className="h-[2px] w-6 shrink-0 bg-accent" /> Generating, one token at a time
            </li>
            <li className="flex items-center gap-2.5">
              <span className="h-0 w-6 shrink-0 border-t-2 border-dashed border-ink" /> Training only
            </li>
          </ul>
        </div>
        <figure className="graph-paper overflow-x-auto rounded-2xl border border-rule p-3 sm:p-4 print:overflow-visible">
          <div className="min-w-[430px] sm:min-w-0 print:min-w-0">
            <FinishLine />
          </div>
        </figure>
      </div>
    </Sheet>
  );
}

function HowToLearn({ hours }: { hours: number }) {
  return (
    <Sheet id="how">
      <SheetHead
        eyebrow="Before you start"
        title="How to learn fast with AI"
        intro={`About ${hours} hours is enough if you spend them on understanding instead of typing. Every day runs the same four-step loop, and each day section below follows it.`}
      />
      <ol className="mt-6 grid gap-3 sm:grid-cols-2">
        {DAILY_LOOP.map((s, i) => (
          <li key={s.title} className="break-inside-avoid rounded-xl border border-rule bg-card-2 p-4 print:bg-transparent">
            <div className="flex items-center gap-2.5">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-ink font-mono text-[13px] font-bold text-card">{i + 1}</span>
              <h3 className="text-[16px] font-bold text-ink">{s.title}</h3>
            </div>
            <p className="mt-2 text-[14px] leading-snug text-ink-2">{s.body}</p>
          </li>
        ))}
      </ol>

      <h3 className="plan-keep mt-8 text-[17px] font-bold text-ink">Seven habits that make it fast</h3>
      <ol className="mt-3 grid gap-x-7 gap-y-4 sm:grid-cols-2">
        {RULES.map((r, i) => (
          <li key={r.lead} className="flex break-inside-avoid gap-3">
            <span className="tabular w-5 shrink-0 pt-px font-mono text-[13px] font-bold text-mark">{i + 1}</span>
            <p className="text-[14.5px] leading-snug text-ink-2">
              <strong className="font-semibold text-ink">{r.lead}</strong> {r.body}
            </p>
          </li>
        ))}
      </ol>

      <div className="mt-8 break-inside-avoid rounded-xl border border-dashed border-rule-strong p-4 sm:p-5">
        <h3 className="text-[16px] font-bold text-ink">Set up once, before Day 1</h3>
        <ul className="mt-2 grid gap-x-6 gap-y-0.5 sm:grid-cols-2">
          {SETUP.map((t, i) => (
            <Tick key={t} id={`plan:setup:${i}`} size="sm">
              {t}
            </Tick>
          ))}
        </ul>
      </div>
    </Sheet>
  );
}

function Week() {
  const rows = DAYS.map((d) => ({
    d,
    mins: d.schedule.reduce((s, b) => s + b.minutes, 0),
    g: GLANCE[d.n],
  }));
  return (
    <Sheet id="week">
      <SheetHead
        eyebrow="The week"
        title="The week at a glance"
        intro={`Seven days, ${ALL_LESSONS.length} lessons, about ${fmtHours(TOTAL_MINUTES)} in total. Each day is two to three hours, so it fits after work.`}
      />

      {/* Table on wide screens and paper. */}
      <table className="mt-6 hidden w-full border-collapse text-left sm:table print:table">
        <thead>
          <tr className="border-b-[1.5px] border-ink text-[12.5px] text-ink-3">
            <th className="w-[44px] py-2 pr-2 font-semibold">Day</th>
            <th className="py-2 pr-3 font-semibold">Learn in the app</th>
            <th className="py-2 pr-3 font-semibold">Watch, then build</th>
            <th className="w-[96px] whitespace-nowrap py-2 text-right font-semibold">Time</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ d, mins, g }) => (
            <tr key={d.n} className="break-inside-avoid border-b border-rule align-top">
              <td className="py-3 pr-2">
                <a href={`#day-${d.n}`} className="font-display text-[1.7rem] font-extrabold leading-none text-ink [font-variation-settings:'wdth'_75]">
                  {d.n}
                </a>
              </td>
              <td className="py-3 pr-4">
                <p className="text-[15px] font-bold leading-snug text-ink">{d.title}</p>
                <ul className="mt-1 space-y-0.5">
                  {d.lessons.map((l) => (
                    <li key={l.slug} className="text-[13.5px] leading-snug text-ink-2">
                      {l.title}
                    </li>
                  ))}
                </ul>
              </td>
              <td className="py-3 pr-3 text-[13.5px] leading-snug">
                <p className="text-ink">{g?.watch}</p>
                <p className="mt-1 text-ink-2">
                  <span className="font-semibold text-ink">Build: </span>
                  {g?.build}
                </p>
              </td>
              <td className="tabular whitespace-nowrap py-3 text-right font-mono text-[13px] text-ink">{fmtHours(mins)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="pt-3 text-[13.5px] font-semibold text-ink">
              Total
            </td>
            <td className="tabular whitespace-nowrap pt-3 text-right font-mono text-[13px] font-bold text-ink">{fmtHours(TOTAL_MINUTES)}</td>
          </tr>
        </tfoot>
      </table>

      {/* Stacked cards on a phone. */}
      <ol className="mt-5 space-y-2.5 sm:hidden print:hidden">
        {rows.map(({ d, mins, g }) => (
          <li key={d.n}>
            <a href={`#day-${d.n}`} className="flex gap-3 rounded-xl border border-rule bg-card-2 p-3.5">
              <span className="font-display text-[1.9rem] font-extrabold leading-[0.85] text-ink [font-variation-settings:'wdth'_75]">{d.n}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-[15px] font-bold leading-snug text-ink">{d.title}</span>
                  <span className="tabular shrink-0 font-mono text-[12.5px] text-ink-3">{fmtHours(mins)}</span>
                </span>
                <span className="mt-1 block text-[13px] leading-snug text-ink-2">{d.lessons.map((l) => l.title).join(", ")}</span>
                <span className="mt-1 block text-[13px] leading-snug text-ink">{g?.watch}</span>
              </span>
            </a>
          </li>
        ))}
      </ol>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { t: "New: inference", d: "Day 6 covers prefill and decode, the KV cache, and sampling with temperature, top-k and top-p." },
          { t: "New: modern models", d: "Day 7 covers what changed since GPT-2: RoPE, RMSNorm, SwiGLU, grouped-query attention and mixture of experts." },
          { t: "New: napkin math and a drill", d: "Count parameters, estimate compute and memory, then face a timed interview drill on Day 7." },
        ].map((n) => (
          <div key={n.t} className="break-inside-avoid rounded-xl border border-dashed border-rule-strong p-3.5">
            <p className="text-[14px] font-bold text-ink">{n.t}</p>
            <p className="mt-1 text-[13.5px] leading-snug text-ink-2">{n.d}</p>
          </div>
        ))}
      </div>
    </Sheet>
  );
}

function SelfCheck() {
  return (
    <Sheet id="self-check">
      <SheetHead
        eyebrow="The final check"
        title="Self-check: you are done when you can answer these"
        intro="Answer each one out loud in two to five sentences, as if an interviewer asked. No notes. If you stall, go back to the day in the tag."
      />

      <h3 className="plan-keep mt-6 text-[15px] font-bold text-ink">The core</h3>
      <ol className="mt-2 space-y-1">
        {FINAL_ORIGINAL.map((c, i) => (
          <Tick key={c.q} id={`plan:final:${i}`}>
            <span className="tabular mr-1.5 font-mono text-[12.5px] font-semibold text-ink-3">{i + 1}</span>
            {c.q}
            <DayRefs days={c.days} />
          </Tick>
        ))}
      </ol>

      <h3 className="plan-keep mt-6 text-[15px] font-bold text-ink">Inference and post-training</h3>
      <ol className="mt-2 space-y-1">
        {FINAL_NEW.map((c, i) => (
          <Tick key={c.q} id={`plan:final:${FINAL_ORIGINAL.length + i}`}>
            <span className="tabular mr-1.5 font-mono text-[12.5px] font-semibold text-ink-3">{FINAL_ORIGINAL.length + i + 1}</span>
            {c.q}
            <DayRefs days={c.days} />
          </Tick>
        ))}
      </ol>

      <h3 className="plan-keep mt-6 text-[15px] font-bold text-ink">Napkin math, on paper</h3>
      <ol className="mt-2 space-y-1">
        {NAPKIN.map((c, i) => (
          <Tick key={c.q} id={`plan:napkin:${i}`}>
            <span className="tabular mr-1.5 font-mono text-[12.5px] font-semibold text-ink-3">{allFinal.length + i + 1}</span>
            {c.q}
            <DayRefs days={c.days} />
          </Tick>
        ))}
      </ol>

      <div className="mt-8 break-inside-avoid rounded-2xl border-[1.5px] border-ink p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-display text-[1.3rem] font-bold text-ink">The interview drill</h3>
          <span className="text-[13px] text-ink-3">Day 7, about 30 minutes</span>
        </div>
        <ol className="mt-3 grid gap-3 sm:grid-cols-3">
          {DRILL.map((s, i) => (
            <li key={s.title}>
              <p className="flex items-center gap-2 text-[14.5px] font-bold text-ink">
                <span className="tabular font-mono text-[13px] text-mark">{i + 1}</span>
                {s.title}
              </p>
              <p className="mt-1 text-[13.5px] leading-snug text-ink-2">{s.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 border-t border-rule pt-3 text-[13.5px] text-ink-2">
          Anything that scores under 7 goes into your confusion log. Redo that lesson the next morning, then try the question again.
          The in-app version is at{" "}
          <Link href="/day/7/whiteboard/" className="font-mono text-accent underline-offset-4 hover:underline print:no-underline">
            /day/7/whiteboard/
          </Link>
          .
        </p>
      </div>
    </Sheet>
  );
}

function Project() {
  return (
    <Sheet id="project">
      <SheetHead
        eyebrow="After Day 7"
        title="Mini project: your own small GPT"
        intro="This turns the week into a resume line and an interview story. Budget a weekend, about 6 to 10 hours. Ship all eight pieces."
      />
      <ol className="mt-6 grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {PROJECT.map((p, i) => (
          <Tick key={p.title} id={`plan:project:${i}`} size="sm">
            <strong className="font-semibold">{p.title}.</strong> <span className="text-ink-2">{p.body}</span>
          </Tick>
        ))}
      </ol>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="break-inside-avoid rounded-xl border border-rule bg-card-2 p-4 print:bg-transparent">
          <p className="font-mono text-[12.5px] font-semibold text-ink-3">The resume line, once it is true</p>
          <p className="mt-1.5 text-[14.5px] leading-snug text-ink">{RESUME_LINE}</p>
        </div>
        <div className="break-inside-avoid rounded-xl border border-rule bg-card-2 p-4 print:bg-transparent">
          <p className="font-mono text-[12.5px] font-semibold text-ink-3">The interview story</p>
          <p className="font-display mt-1.5 text-[1.15rem] font-bold leading-snug text-ink">&ldquo;{STORY}&rdquo;</p>
        </div>
      </div>
    </Sheet>
  );
}

function SafeToSkip() {
  return (
    <Sheet id="skip" breakBefore={false}>
      <div className="print:mt-10 print:border-t print:border-rule print:pt-6">
        <SheetHead eyebrow="Leave for later" title="Safe to skip for now" />
        <ul className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {SKIP.map((s) => (
            <li key={s.title} className="break-inside-avoid border-l-2 border-rule-strong pl-3">
              <p className="text-[14.5px] font-bold leading-snug text-ink">{s.title}</p>
              <p className="mt-0.5 text-[13.5px] leading-snug text-ink-2">{s.why}</p>
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  );
}

function Resources() {
  return (
    <Sheet id="resources">
      <SheetHead eyebrow="Only if you are stuck" title="Backup resources" />
      <ul className="mt-4 divide-y divide-rule rounded-xl border border-rule">
        {BACKUP.map((b) => (
          <li key={b.title} className="grid break-inside-avoid gap-x-4 gap-y-0.5 px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0">
              <p className="text-[14.5px] leading-snug text-ink">
                <a href={b.url} target="_blank" rel="noreferrer" className="font-bold underline-offset-4 hover:underline">
                  {b.title}
                </a>
                <span className="text-ink-3">, {b.by}</span>
              </p>
              <p className="text-[13.5px] leading-snug text-ink-2">{b.why}</p>
            </div>
            <a
              href={b.url}
              target="_blank"
              rel="noreferrer"
              className="self-start break-all font-mono text-[12.5px] text-accent underline-offset-4 hover:underline sm:pt-0.5 sm:text-right"
            >
              {displayUrl(b.url)}
            </a>
          </li>
        ))}
      </ul>

      <div className="mt-8 break-inside-avoid rounded-2xl border-[1.5px] border-ink bg-accent-soft p-5 shadow-[var(--press)] print:shadow-none">
        <p className="font-mono text-[12.5px] font-semibold text-ink-2">Next step</p>
        <h2 className="font-display mt-1 text-[1.5rem] font-bold leading-tight text-ink">{NEXT_STEP.title}</h2>
        {NEXT_STEP.body.map((p) => (
          <p key={p} className="mt-2 max-w-[68ch] text-[14.5px] leading-snug text-ink-2">
            {p}
          </p>
        ))}
      </div>
    </Sheet>
  );
}
