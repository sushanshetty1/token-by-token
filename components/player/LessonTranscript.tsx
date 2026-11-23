"use client";

import { ChevronDown, FileText } from "lucide-react";
import { Suspense, use } from "react";
import { LESSON_LOADERS } from "@/content/lessons";
import type { LessonModule } from "@/lib/types";
import { KIND } from "./parts";

const cache = new Map<string, Promise<LessonModule | null>>();

function load(key: string) {
  let p = cache.get(key);
  if (!p) {
    p = LESSON_LOADERS[key]?.().then((m) => m.default) ?? Promise.resolve(null);
    cache.set(key, p);
  }
  return p;
}

/**
 * Every step of the lesson as plain reading, for revision and for anyone who
 * cannot watch the stage. It suspends on the lesson module, so the static
 * export prerenders the full text into the page's HTML.
 */
export function LessonTranscript({ lessonKey, title }: { lessonKey: string; title: string }) {
  return (
    <Suspense fallback={null}>
      <Transcript lessonKey={lessonKey} title={title} />
    </Suspense>
  );
}

function Transcript({ lessonKey, title }: { lessonKey: string; title: string }) {
  const mod = use(load(lessonKey));
  if (!mod) return null;
  return (
    <details className="group panel mt-4 overflow-hidden" id="transcript">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 hover:bg-card-2 [&::-webkit-details-marker]:hidden">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-rule bg-card-2 text-ink-2">
          <FileText size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold text-ink">Read the whole lesson as text</span>
          <span className="block text-[13px] text-ink-3">
            All {mod.steps.length} steps of {title} on one page, for revision without the animation.
          </span>
        </span>
        <ChevronDown size={18} className="shrink-0 text-ink-3 transition-transform group-open:rotate-180" />
      </summary>

      <article className="border-t border-rule px-5 pb-8 pt-6 sm:px-8">
        <div className="mx-auto max-w-[70ch]">
          <h2 className="font-display text-[1.5rem] font-bold leading-tight text-ink">{title}, step by step</h2>
          <h3 className="mt-5 text-[14px] font-bold text-ink">You will be able to</h3>
          <ul className="prose-lesson mt-1">
            {mod.learn.map((it) => (
              <li key={it}>{it}</li>
            ))}
          </ul>

          <ol className="mt-8 space-y-9">
            {mod.steps.map((s, i) => (
              <li key={i} id={`text-${i + 1}`} className="scroll-mt-24">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-[12.5px] font-semibold text-ink-3">Step {i + 1}</span>
                  <span className="text-[12.5px] font-semibold" style={{ color: KIND[s.kind].fg }}>
                    {KIND[s.kind].label}
                  </span>
                </div>
                <h3 className="font-display mt-1 text-[1.2rem] font-bold leading-snug text-ink">{s.title}</h3>
                <div className="prose-lesson mt-2">{s.body}</div>
                {s.predict && (
                  <div className="mt-3 rounded-xl border border-dashed border-mark bg-mark-soft/40 p-3.5 text-[14px]">
                    <p className="font-semibold text-ink">{s.predict.question}</p>
                    <ol className="mt-1.5 list-[upper-alpha] pl-5 text-ink-2">
                      {s.predict.options.map((o) => (
                        <li key={o}>{o}</li>
                      ))}
                    </ol>
                    <p className="mt-2 text-ink">
                      <strong>Answer: {s.predict.options[s.predict.answer]}.</strong> {s.predict.explain}
                    </p>
                  </div>
                )}
                {s.keyIdea && (
                  <p className="mt-3 border-l-[3px] border-violet pl-3 text-[14.5px] leading-relaxed text-ink">
                    <strong className="text-violet">Key idea. </strong>
                    {s.keyIdea}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>
      </article>
    </details>
  );
}
