"use client";

import { ArrowLeft, ArrowRight, Clock, Gauge, ListOrdered, Move, Pause, Play, RotateCcw } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LESSON_LOADERS } from "@/content/lessons";
import type { LessonRef } from "@/content/curriculum";
import { markStep, useProgress } from "@/lib/progress";
import type { LessonModule } from "@/lib/types";
import { CodeDock } from "./CodeDock";
import { Changed, KeyIdea, KindTag, LearnList, Legend, PredictCard, Rail, Stepper } from "./parts";

interface Props {
  lesson: LessonRef;
  dayTitle: string;
  lessonsInDay: number;
  next?: LessonRef;
}

export function LessonPlayer({ lesson, dayTitle, lessonsInDay, next }: Props) {
  const key = `${lesson.day}/${lesson.slug}`;
  const [mod, setMod] = useState<LessonModule | null>(null);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [runId, setRunId] = useState(0);
  const [codeOpen, setCodeOpen] = useState(true);
  const progress = useProgress();
  const seen = progress.lessons[key]?.seen ?? -1;

  useEffect(() => {
    let live = true;
    LESSON_LOADERS[key]?.().then((m) => {
      if (!live) return;
      setMod(m.default);
      const fromHash = Number(window.location.hash.replace("#", ""));
      if (fromHash >= 1 && fromHash <= m.default.steps.length) setStep(fromHash - 1);
    });
    return () => {
      live = false;
    };
  }, [key]);

  const total = mod?.steps.length ?? 0;

  const go = useCallback(
    (i: number) => {
      if (!mod) return;
      const n = Math.max(0, Math.min(mod.steps.length - 1, i));
      setStep(n);
      setPlaying(true);
    },
    [mod],
  );

  useEffect(() => {
    if (!mod) return;
    markStep(key, step, mod.steps.length);
    const url = `${window.location.pathname}${window.location.search}#${step + 1}`;
    window.history.replaceState(window.history.state, "", url);
  }, [key, mod, step]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        go(step + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(step - 1);
      } else if (e.key === "r" || e.key === "R") {
        setRunId((r) => r + 1);
        setPlaying(true);
      } else if (e.key === " ") {
        if (el && el.tagName === "BUTTON") return;
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === "c" || e.key === "C") {
        setCodeOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, step]);

  const railValues = useMemo(() => {
    const out: Record<string, string> = {};
    mod?.steps.slice(0, step + 1).forEach((s) => Object.assign(out, s.rail));
    return out;
  }, [mod, step]);

  const ticked = useMemo(() => {
    const set = new Set<number>();
    const upto = Math.max(step, seen);
    mod?.steps.slice(0, upto + 1).forEach((s) => s.learns?.forEach((i) => set.add(i)));
    if (progress.lessons[key]?.done) mod?.learn.forEach((_, i) => set.add(i));
    return set;
  }, [mod, step, seen, progress.lessons, key]);

  const Stage = mod?.Stage;
  const narrative = (
    <Narrative mod={mod} step={step} lessonKey={key} lesson={lesson} next={next} go={go} />
  );

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px]">
      {/* Centre column */}
      <div className="min-w-0 space-y-4">
        <header className="panel px-5 py-4">
          <nav className="flex flex-wrap items-center gap-1.5 text-[13px] text-ink-3" aria-label="Breadcrumb">
            <Link href={`/day/${lesson.day}/`} className="font-medium text-ink-2 hover:text-ink">
              Day {lesson.day}: {dayTitle}
            </Link>
            <span aria-hidden>/</span>
            <span>
              Lesson {lesson.index + 1} of {lessonsInDay}
            </span>
          </nav>
          <div className="mt-1.5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div className="min-w-0">
              <h1 className="font-display text-[clamp(1.6rem,2.6vw,2.15rem)] font-bold leading-[1.1] text-ink">{lesson.title}</h1>
              <p className="mt-1.5 max-w-[62ch] text-[15px] text-ink-2">{lesson.promise}</p>
            </div>
            <ul className="flex flex-wrap gap-1.5 text-[12.5px] font-semibold">
              <li className="flex items-center gap-1.5 rounded-full border border-rule bg-card-2 px-2.5 py-1 text-ink-2">
                <Clock size={13} /> {lesson.minutes} min
              </li>
              <li className="flex items-center gap-1.5 rounded-full border border-rule bg-card-2 px-2.5 py-1 text-ink-2">
                <Gauge size={13} /> {lesson.level}
              </li>
              {total > 0 && (
                <li className="flex items-center gap-1.5 rounded-full border border-rule bg-card-2 px-2.5 py-1 text-ink-2">
                  <ListOrdered size={13} /> {total} steps
                </li>
              )}
            </ul>
          </div>
        </header>

        <section className="panel overflow-hidden" aria-label="Animated stage">
          <div className="flex flex-wrap items-center gap-3 border-b border-rule px-3 py-3 sm:px-4">
            <div className="min-w-0 flex-1 basis-full sm:basis-0">{mod?.rail && <Rail slots={mod.rail} values={railValues} />}</div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setRunId((r) => r + 1);
                  setPlaying(true);
                }}
              >
                <RotateCcw size={15} /> Replay
              </button>
              <button type="button" className="btn" onClick={() => setPlaying((p) => !p)} aria-pressed={!playing}>
                {playing ? <Pause size={15} /> : <Play size={15} />} {playing ? "Pause" : "Play"}
              </button>
            </div>
          </div>
          {/* On phones the stage keeps a readable size and pans sideways. */}
          <div className="scrollbar-thin overflow-x-auto">
            <div className="graph-paper relative aspect-[16/9] w-full min-w-[720px] md:min-w-0">
              {Stage ? (
                <Stage key={`${step}-${runId}`} step={step} playing={playing} runId={runId} goTo={go} />
              ) : (
                <div className="grid h-full place-items-center text-[14px] text-ink-3">Loading the stage…</div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-rule px-4 py-2.5">
            {mod?.legend && <Legend items={mod.legend} />}
            <span className="ml-auto flex items-center gap-1 text-[12px] text-ink-3 md:hidden">
              <Move size={12} /> Drag sideways to see the whole stage
            </span>
          </div>
        </section>

        <div className="xl:hidden">{narrative}</div>

        {mod && (
          <section className="panel px-3 pb-2 pt-3 sm:px-4" aria-label="Steps in this lesson">
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 className="text-[13.5px] font-bold text-ink">In this lesson</h2>
              <span className="text-[12.5px] text-ink-3">
                Step {step + 1} of {total}
              </span>
            </div>
            <Stepper steps={mod.steps} current={step} seen={seen} onSelect={go} />
          </section>
        )}

        {mod?.code && (
          <CodeDock
            filename={mod.code.filename}
            source={mod.code.source}
            note={mod.code.note}
            ranges={mod.steps[step]?.code?.ranges ?? []}
            caption={mod.steps[step]?.code?.caption}
            open={codeOpen}
            onToggle={() => setCodeOpen((o) => !o)}
          />
        )}

        <div className="xl:hidden">{mod && <LearnList items={mod.learn} ticked={ticked} />}</div>
      </div>

      {/* Right column on wide screens */}
      <aside className="scrollbar-thin hidden min-w-0 space-y-4 xl:sticky xl:top-[76px] xl:block xl:max-h-[calc(100vh-92px)] xl:self-start xl:overflow-y-auto xl:pb-2">
        {narrative}
        {mod && <LearnList items={mod.learn} ticked={ticked} />}
      </aside>
    </div>
  );
}

function Narrative({
  mod,
  step,
  lessonKey,
  lesson,
  next,
  go,
}: {
  mod: LessonModule | null;
  step: number;
  lessonKey: string;
  lesson: LessonRef;
  next?: LessonRef;
  go: (i: number) => void;
}) {
  const s = mod?.steps[step];
  const total = mod?.steps.length ?? 0;
  const isLast = mod ? step === total - 1 : false;
  return (
    <section className="panel flex flex-col p-5" aria-live="polite">
      {s ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[12.5px] font-semibold text-ink-2">
              Step {step + 1} / {total}
            </span>
            <KindTag kind={s.kind} />
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22 }}
            >
              <h2 className="font-display mt-3 text-[1.35rem] font-bold leading-tight text-ink">{s.title}</h2>
              <div className="prose-lesson mt-2.5">{s.body}</div>
              {s.predict && <PredictCard key={`${lessonKey}:${step}`} predict={s.predict} />}
              {s.keyIdea && <KeyIdea>{s.keyIdea}</KeyIdea>}
              {s.changed && <Changed items={s.changed} />}
            </motion.div>
          </AnimatePresence>
          <div className="mt-6 flex items-stretch gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => go(step - 1)} disabled={step === 0}>
              <ArrowLeft size={15} /> Back
            </button>
            {!isLast ? (
              <button type="button" className="btn btn-primary min-w-0 flex-1 justify-between" onClick={() => go(step + 1)}>
                <span className="truncate">Next: {mod?.steps[step + 1]?.label}</span>
                <ArrowRight size={16} className="shrink-0" />
              </button>
            ) : next ? (
              <Link href={`/day/${next.day}/${next.slug}/`} className="btn btn-primary min-w-0 flex-1 justify-between">
                <span className="truncate">
                  {next.day === lesson.day ? "Next lesson" : `Day ${next.day}`}: {next.title}
                </span>
                <ArrowRight size={16} className="shrink-0" />
              </Link>
            ) : (
              <Link href="/" className="btn btn-primary min-w-0 flex-1 justify-between">
                <span>Back to the course map</span>
                <ArrowRight size={16} className="shrink-0" />
              </Link>
            )}
          </div>
          {isLast && (
            <Link
              href={`/day/${lesson.day}/#check`}
              className="mt-2 text-center text-[13px] font-medium text-accent underline underline-offset-4"
            >
              Then test yourself on Day {lesson.day}
            </Link>
          )}
          <p className="mt-3 hidden flex-wrap items-center justify-center gap-1.5 text-[12px] text-ink-3 sm:flex">
            <span className="kbd">←</span>
            <span className="kbd">→</span> step
            <span className="kbd ml-2">R</span> replay
            <span className="kbd ml-2">Space</span> pause
            {mod?.code && (
              <>
                <span className="kbd ml-2">C</span> code
              </>
            )}
          </p>
        </>
      ) : (
        <div className="h-48 animate-pulse rounded-lg bg-paper-2" />
      )}
    </section>
  );
}
