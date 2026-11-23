"use client";

import { ArrowRight, Check, Clock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ALL_LESSONS, DAYS, TOTAL_MINUTES, lessonKey } from "@/content/curriculum";
import { PIPELINE } from "@/lib/pipeline";
import { useProgress } from "@/lib/progress";
import { TokenizerPlayground } from "@/components/viz/TokenizerPlayground";

const PRESETS = [
  { label: "English", text: "The cat sat on the mat because it was tired." },
  { label: "Strawberry", text: "How many r's are in the word strawberry?" },
  { label: "Arithmetic", text: "What is 123456 + 654321? It is 777777." },
  { label: "Kannada", text: "ನನಗೆ ಸ್ಟ್ರಾಬೆರಿ ಇಷ್ಟ" },
  { label: "Code", text: "def forward(self, x):\n    return self.head(x)" },
];

export function Home() {
  const progress = useProgress();
  const nextUp = ALL_LESSONS.find((l) => !progress.lessons[lessonKey(l.day, l.slug)]?.done);
  const started = ALL_LESSONS.some((l) => progress.lessons[lessonKey(l.day, l.slug)]);
  const [hoverDay, setHoverDay] = useState<number | null>(null);
  const litStations = hoverDay ? new Set(DAYS[hoverDay - 1].stations) : null;

  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-24 sm:px-6">
      {/* Hero */}
      <section className="grid items-stretch gap-8 pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)] lg:pt-16">
        <div className="flex flex-col justify-center">
          <p className="text-[15px] font-semibold text-ink-2">Build an LLM from scratch in seven days</p>
          <h1 className="font-display mt-3 text-[clamp(2.4rem,5.4vw,4.1rem)] font-extrabold leading-[0.98] text-ink">
            Learn how a language model thinks, one token at a time.
          </h1>
          <p className="mt-5 max-w-[54ch] text-[17px] leading-relaxed text-ink-2">
            Animated lessons build the picture in your head. Karpathy&apos;s videos make you build it in code. A check at the end
            of every day makes sure you can explain it in an interview.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            {nextUp && (
              <Link href={`/day/${nextUp.day}/${nextUp.slug}/`} className="btn btn-primary !px-5 !py-3 !text-[15px]">
                {started ? `Continue: ${nextUp.title}` : "Start Day 1"} <ArrowRight size={17} />
              </Link>
            )}
            <Link href="/plan/" className="btn btn-ghost !px-4 !py-3 !text-[15px]">
              See the 7-day plan
            </Link>
          </div>
          <dl className="mt-9 grid max-w-[480px] grid-cols-3 gap-4 border-t border-rule pt-5">
            <div>
              <dt className="text-[12.5px] text-ink-3">Lessons</dt>
              <dd className="font-display text-[1.6rem] font-bold text-ink">{ALL_LESSONS.length}</dd>
            </div>
            <div>
              <dt className="text-[12.5px] text-ink-3">Total time</dt>
              <dd className="font-display text-[1.6rem] font-bold text-ink">{Math.round(TOTAL_MINUTES / 60)} h</dd>
            </div>
            <div>
              <dt className="text-[12.5px] text-ink-3">Interview questions</dt>
              <dd className="font-display text-[1.6rem] font-bold text-ink">{DAYS.reduce((s, d) => s + d.checks.length, 0)}</dd>
            </div>
          </dl>
        </div>

        <div className="panel flex flex-col overflow-hidden shadow-[var(--shadow-2)]">
          <div className="border-b border-rule px-5 py-3.5">
            <h2 className="font-display text-[1.1rem] font-bold text-ink">What the model actually sees</h2>
            <p className="text-[13.5px] text-ink-2">
              Type anything. It becomes tokens, each token an integer, each integer a row of numbers.
            </p>
          </div>
          <div className="graph-paper min-h-[360px] flex-1 p-4">
            <TokenizerPlayground presets={PRESETS} />
          </div>
        </div>
      </section>

      {/* The path */}
      <section className="mt-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-[clamp(1.6rem,3vw,2.2rem)] font-bold text-ink">The path you will draw from memory</h2>
            <p className="mt-1 max-w-[64ch] text-[15.5px] text-ink-2">
              This is the finish line. By Day 7 you can draw every box and say what flows along every arrow. Point at a day to
              see which part of the path it teaches.
            </p>
          </div>
        </div>

        <div className="panel graph-paper mt-6 overflow-x-auto p-5 sm:p-7">
          <PathDiagram lit={litStations} />
        </div>

        <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {DAYS.map((d) => {
            const keys = d.lessons.map((l) => lessonKey(d.n, l.slug));
            const done = keys.filter((k) => progress.lessons[k]?.done).length;
            const mins = d.schedule.reduce((s, b) => s + b.minutes, 0);
            return (
              <li key={d.n} onMouseEnter={() => setHoverDay(d.n)} onMouseLeave={() => setHoverDay(null)}>
                <Link
                  href={`/day/${d.n}/`}
                  onFocus={() => setHoverDay(d.n)}
                  onBlur={() => setHoverDay(null)}
                  className={`panel group flex h-full flex-col p-5 transition-[transform,box-shadow,border-color] hover:-translate-y-0.5 hover:border-ink hover:shadow-[var(--shadow-2)] ${
                    hoverDay === d.n ? "border-ink" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="font-display text-[2.6rem] font-extrabold leading-[0.85] text-ink [font-variation-settings:'wdth'_75]">
                      {d.n}
                    </span>
                    {done === keys.length ? (
                      <span className="flex items-center gap-1 rounded-full bg-ok-soft px-2 py-0.5 text-[12px] font-semibold text-ok">
                        <Check size={12} strokeWidth={3} /> Done
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[12.5px] text-ink-3">
                        <Clock size={12} /> {(mins / 60).toFixed(1)} h
                      </span>
                    )}
                  </div>
                  <h3 className="font-display mt-3 text-[1.2rem] font-bold leading-tight text-ink">{d.title}</h3>
                  <p className="mt-1.5 flex-1 text-[13.5px] leading-snug text-ink-2">{d.tagline}</p>
                  <div className="mt-4 flex items-center gap-2">
                    {keys.map((k) => (
                      <span
                        key={k}
                        className={`h-1.5 flex-1 rounded-full ${progress.lessons[k]?.done ? "bg-ok" : progress.lessons[k] ? "bg-mark" : "bg-paper-2"}`}
                      />
                    ))}
                  </div>
                </Link>
              </li>
            );
          })}
          <li>
            <Link
              href="/day/7/whiteboard/"
              className="flex h-full flex-col justify-between rounded-2xl border-[1.5px] border-dashed border-ink p-5 text-ink hover:bg-card"
            >
              <span className="font-display text-[1.2rem] font-bold leading-tight">The whiteboard test</span>
              <span className="mt-2 text-[13.5px] text-ink-2">Rebuild the whole path from memory, then face the interview drill.</span>
              <span className="mt-4 flex items-center gap-1 text-[13.5px] font-semibold text-accent">
                Try it now <ArrowRight size={15} />
              </span>
            </Link>
          </li>
        </ol>
      </section>

      {/* How a day works */}
      <section className="mt-20 grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div>
          <h2 className="font-display text-[clamp(1.5rem,2.6vw,2rem)] font-bold leading-tight text-ink">How every day works</h2>
          <p className="mt-2 text-[15px] text-ink-2">
            The rule from your plan still holds: let AI type, but you must be able to explain every line.
          </p>
        </div>
        <ol className="grid gap-3 md:grid-cols-3">
          {[
            {
              t: "Learn it here",
              d: "Step through an animated lesson. Guess before each reveal. Read the real PyTorch lines that match each step.",
            },
            {
              t: "Watch and build",
              d: "Watch only the marked chapters of Karpathy's video at 1.5x. Have AI write the code, then explain it out loud.",
            },
            {
              t: "Check yourself",
              d: "Answer the interview questions out loud before revealing. Break something on purpose and predict what happens.",
            },
          ].map((s, i) => (
            <li key={s.t} className="panel p-5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink font-mono text-[14px] font-bold text-card">{i + 1}</span>
              <h3 className="font-display mt-3 text-[1.15rem] font-bold text-ink">{s.t}</h3>
              <p className="mt-1.5 text-[14px] text-ink-2">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

function PathDiagram({ lit }: { lit: Set<string> | null }) {
  const fwd = PIPELINE.filter((s) => s.phase === "forward");
  const train = PIPELINE.filter((s) => s.phase === "training");
  const W = 1140;
  const bw = 128;
  const gap = (W - fwd.length * bw) / (fwd.length - 1);
  const xOf = (i: number) => i * (bw + gap);
  const on = (id: string) => !lit || lit.has(id);
  const trainX = [xOf(5), xOf(3), xOf(1)];

  return (
    <svg viewBox={`-10 -10 ${W + 20} 316`} className="stage-svg block w-full min-w-[860px]" role="img" aria-label="The path from text to next token, and the training loop">
      <defs>
        <marker id="pd-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--ink)" />
        </marker>
      </defs>
      <text x={0} y={6} fontSize={13} fontWeight={650} fill="var(--ink-3)">
        Forward pass: what happens every time the model reads
      </text>
      {fwd.map((s, i) => (
        <g key={s.id} style={{ opacity: on(s.id) ? 1 : 0.28, transition: "opacity 250ms" }}>
          {i > 0 && (
            <line x1={xOf(i - 1) + bw + 4} y1={62} x2={xOf(i) - 6} y2={62} stroke="var(--ink)" strokeWidth={1.6} markerEnd="url(#pd-arrow)" />
          )}
          <rect x={xOf(i)} y={30 + 3} width={bw} height={64} rx={12} fill="var(--ink)" />
          <rect
            x={xOf(i)}
            y={30}
            width={bw}
            height={64}
            rx={12}
            fill={lit?.has(s.id) ? "var(--mark)" : "var(--card)"}
            stroke="var(--ink)"
            strokeWidth={1.6}
          />
          <text x={xOf(i) + bw / 2} y={58} textAnchor="middle" fontSize={15} fontWeight={700}>
            {s.label}
          </text>
          <text x={xOf(i) + bw / 2} y={78} textAnchor="middle" fontSize={11.5} className="mono" fill="var(--ink-2)">
            {s.out}
          </text>
        </g>
      ))}
      <text x={0} y={290} fontSize={13} fontWeight={650} fill="var(--ink-3)">
        Training loop: how the weights get good
      </text>
      <path
        d={`M ${xOf(5) + bw / 2} 98 L ${xOf(5) + bw / 2} 186`}
        stroke="var(--ink)"
        strokeWidth={1.6}
        strokeDasharray="5 5"
        fill="none"
        markerEnd="url(#pd-arrow)"
        style={{ opacity: on("loss") ? 1 : 0.28 }}
      />
      {train.map((s, i) => (
        <g key={s.id} style={{ opacity: on(s.id) ? 1 : 0.28, transition: "opacity 250ms" }}>
          {i > 0 && (
            <line x1={trainX[i - 1] - 6} y1={222} x2={trainX[i] + bw + 6} y2={222} stroke="var(--ink)" strokeWidth={1.6} markerEnd="url(#pd-arrow)" />
          )}
          <rect x={trainX[i]} y={190 + 3} width={bw} height={64} rx={12} fill="var(--ink)" />
          <rect
            x={trainX[i]}
            y={190}
            width={bw}
            height={64}
            rx={12}
            fill={lit?.has(s.id) ? "var(--mark)" : "var(--card-2)"}
            stroke="var(--ink)"
            strokeWidth={1.6}
            strokeDasharray={lit?.has(s.id) ? undefined : "0"}
          />
          <text x={trainX[i] + bw / 2} y={218} textAnchor="middle" fontSize={15} fontWeight={700}>
            {s.label}
          </text>
          <text x={trainX[i] + bw / 2} y={238} textAnchor="middle" fontSize={11.5} className="mono" fill="var(--ink-2)">
            {s.out}
          </text>
        </g>
      ))}
      <path
        d={`M ${trainX[2] + bw / 2} 188 C ${trainX[2] + bw / 2} 140, ${xOf(3) + bw / 2} 150, ${xOf(3) + bw / 2} 100`}
        stroke="var(--ink)"
        strokeWidth={1.6}
        strokeDasharray="5 5"
        fill="none"
        markerEnd="url(#pd-arrow)"
        style={{ opacity: on("update") ? 1 : 0.28 }}
      />
      <text x={xOf(3) + bw / 2 + 14} y={134} fontSize={12} className="mono" fill="var(--ink-2)" style={{ opacity: on("update") ? 1 : 0.28 }}>
        new weights for every layer
      </text>
      <text x={xOf(5) + bw / 2 + 10} y={146} fontSize={12} className="mono" fill="var(--ink-2)" style={{ opacity: on("loss") ? 1 : 0.28 }}>
        compare with the real next token
      </text>
    </svg>
  );
}
