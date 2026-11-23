"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Label } from "@/components/viz/svg";
import type { TrainerClient, TrainerSnapshot } from "@/lib/engine/client";
import { smoothLosses, useTrainer } from "@/lib/engine/useTrainer";
import {
  BIGRAM,
  OVERFIT_CHARS,
  OVERFIT_DEFAULTS,
  OVERFIT_LAB,
  OVERFIT_STEPS,
  RECORDED,
  SMOOTH,
  TRAIN_DEFAULTS,
  TRAIN_LAB,
  UNIGRAM,
  fmtInt,
} from "./run";
import { Frame, Html, LossChart, Reading, SampleCard, StageButton, cq, fs, niceMax, type Series } from "./ui";

export type TrainMode = "start" | "drop" | "slow" | "hideval" | "gap";

const CH = { x: 76, y: 52, w: 520, h: 340 };
const RIGHT = { x: 632, w: 304 };

/** Start / pause / resume, with the loading and error states. */
export function RunButton({
  snap,
  client,
  startLabel = "Start training",
  maxSteps,
  size = 14,
}: {
  snap: TrainerSnapshot;
  client: TrainerClient;
  startLabel?: string;
  maxSteps?: number;
  size?: number;
}) {
  if (snap.phase === "idle" || snap.phase === "loading") {
    return (
      <StageButton onClick={() => {}} disabled size={size}>
        Loading Shakespeare
      </StageButton>
    );
  }
  if (snap.phase === "running") {
    return (
      <StageButton onClick={() => client.pause()} size={size}>
        <Pause size="1em" /> Pause
      </StageButton>
    );
  }
  if (snap.phase === "done") {
    return (
      <StageButton onClick={() => client.start(maxSteps)} disabled size={size}>
        Done
      </StageButton>
    );
  }
  return (
    <StageButton primary onClick={() => client.start(maxSteps)} size={size}>
      <Play size="1em" /> {snap.step > 0 ? "Resume" : startLabel}
    </StageButton>
  );
}

function lastSmoothed(points: [number, number][]) {
  return points.length ? points[points.length - 1][1] : NaN;
}

export function TrainScene({ mode, playing }: { mode: TrainMode; playing: boolean }) {
  const [snap, client] = useTrainer(TRAIN_LAB, { defaults: TRAIN_DEFAULTS, playing });
  const smooth = useMemo(() => smoothLosses(snap.losses, SMOOTH, 5), [snap.losses]);
  const xMax = niceMax(snap.step, mode === "gap" ? 1000 : 500);
  const ghost = useMemo(() => RECORDED.losses.filter(([s]) => s <= xMax), [xMax]);
  const showVal = mode === "gap";
  const lastEval = snap.evals.length ? snap.evals[snap.evals.length - 1] : null;
  const firstEval = snap.evals.find((e) => e.step === 0);
  const loss = lastSmoothed(smooth);

  const series: Series[] = [];
  if (showVal) {
    const rec = RECORDED.evals.filter((e) => e.step <= xMax);
    series.push({ points: rec.map((e) => [e.step, e.train]), color: "var(--accent)", width: 1.4, dashed: true, opacity: 0.5 });
    series.push({ points: rec.map((e) => [e.step, e.val]), color: "var(--mark)", width: 1.4, dashed: true, opacity: 0.6 });
    series.push({ points: snap.evals.map((e) => [e.step, e.train]), color: "var(--accent)", width: 2.2, dots: snap.evals.length < 25 });
    series.push({ points: snap.evals.map((e) => [e.step, e.val]), color: "var(--mark)", width: 2.4, dots: snap.evals.length < 25 });
  } else {
    series.push({ points: ghost, color: "var(--ink-3)", width: 1.6, dashed: true, opacity: 0.7 });
    series.push({ points: smooth, color: "var(--accent)", width: 2.4 });
  }
  const refs = mode === "drop" || mode === "slow" ? [
    { y: UNIGRAM, label: `character frequencies only: ${UNIGRAM}` },
    { y: BIGRAM, label: `previous character only: ${BIGRAM}` },
  ] : [];

  return (
    <Frame
      label="Live training: loss curve, readings and generated text"
      svg={
        <>
          <LossChart x={CH.x} y={CH.y} w={CH.w} h={CH.h} xMax={xMax} yMin={1.5} yMax={4.5} series={series} refs={refs}>
            {(sx, sy) => (
              <>
                {snap.step === 0 && (
                  <Label x={CH.x + CH.w / 2} y={CH.y + CH.h / 2} size={14} color="var(--ink-3)">
                    {snap.phase === "loading" || snap.phase === "idle" ? "loading 1.1 MB of text into the worker" : "press start: your curve draws here"}
                  </Label>
                )}
                {showVal && lastEval && lastEval.step > 0 && (
                  <GapMarker x={sx(lastEval.step)} y1={sy(lastEval.train)} y2={sy(lastEval.val)} gap={lastEval.val - lastEval.train} />
                )}
                {mode === "hideval" && (
                  <Label x={CH.x + 14} y={CH.y + 24} size={12.5} color="var(--ink-3)" anchor="start">
                    val loss hidden until you answer
                  </Label>
                )}
              </>
            )}
          </LossChart>
        </>
      }
    >
      <Html x={CH.x} y={CH.y + CH.h + 40} w={CH.w} h={70}>
        <div className="flex h-full items-center gap-[2.2cqw]">
          <div className="flex shrink-0 items-center gap-[0.8cqw]">
            <RunButton snap={snap} client={client} />
            {snap.step > 0 && snap.phase !== "running" && (
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: fs(12.5, 10), padding: "0.42em 0.7em" }}
                onClick={() => client.reset(TRAIN_DEFAULTS)}
                aria-label="Restart from step 0"
              >
                <RotateCcw size="1em" />
              </button>
            )}
          </div>
          <div className="grid min-w-0 flex-1 grid-cols-4 gap-[1.2cqw]">
            <Reading label="step" value={fmtInt(snap.step)} />
            <Reading
              label="train loss"
              value={showVal && lastEval ? lastEval.train.toFixed(3) : Number.isFinite(loss) ? loss.toFixed(3) : (firstEval?.train.toFixed(3) ?? "...")}
              color="var(--accent)"
            />
            <Reading label="val loss" value={showVal ? (lastEval ? lastEval.val.toFixed(3) : "...") : "hidden"} color={showVal ? "var(--mark)" : "var(--ink-3)"} />
            <Reading label="steps per sec" value={snap.stepsPerSec ? snap.stepsPerSec.toFixed(1) : "..."} />
          </div>
        </div>
      </Html>

      <Html x={RIGHT.x} y={CH.y} w={RIGHT.w} h={CH.h + 108}>
        <RightColumn mode={mode} snap={snap} firstEval={firstEval} />
      </Html>
    </Frame>
  );
}

function GapMarker({ x, y1, y2, gap }: { x: number; y1: number; y2: number; gap: number }) {
  const top = Math.min(y1, y2);
  const bot = Math.max(y1, y2);
  return (
    <g>
      <line x1={x + 10} x2={x + 10} y1={top} y2={bot} stroke="var(--ink)" strokeWidth={1.4} />
      <line x1={x + 6} x2={x + 14} y1={top} y2={top} stroke="var(--ink)" strokeWidth={1.4} />
      <line x1={x + 6} x2={x + 14} y1={bot} y2={bot} stroke="var(--ink)" strokeWidth={1.4} />
      <text x={x + 18} y={(top + bot) / 2 + 4} fontSize={12.5} className="mono" fill="var(--ink)" stroke="var(--card)" strokeWidth={4} paintOrder="stroke" fontWeight={650}>
        {`gap ${gap.toFixed(2)}`}
      </text>
    </g>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-rule bg-card/95 shadow-[var(--shadow-1)]" style={{ padding: cq(12) }}>
      <div className="font-semibold text-ink-2" style={{ fontSize: fs(12, 10) }}>
        {title}
      </div>
      <div className="mt-1 text-ink" style={{ fontSize: fs(13, 10), lineHeight: 1.45 }}>
        {children}
      </div>
    </div>
  );
}

function Row({ k, v, strong = false }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-ink-2">{k}</span>
      <span className={`tabular font-mono ${strong ? "font-semibold text-ink" : "text-ink"}`}>{v}</span>
    </div>
  );
}

function RightColumn({
  mode,
  snap,
  firstEval,
}: {
  mode: TrainMode;
  snap: TrainerSnapshot;
  firstEval?: { train: number; val: number };
}) {
  const latest = snap.samples.length ? snap.samples[snap.samples.length - 1] : null;
  const sample = (
    <SampleCard
      title={
        <>
          <span>{latest ? `sample at step ${fmtInt(latest.step)}` : "sample"}</span>
          <span className="font-normal text-ink-3">temperature 0.8</span>
        </>
      }
      text={latest?.text ?? null}
    />
  );

  if (mode === "slow") return <Timeline snap={snap} />;

  const gap = snap.evals.length ? snap.evals[snap.evals.length - 1] : null;
  return (
    <div className="flex h-full flex-col gap-[1.2cqw]">
      <div className="min-h-0 flex-1">{sample}</div>
      {mode === "start" && (
        <Card title="Your prediction, measured">
          <Row k="-ln(1/65)" v="4.174" />
          <Row k="train loss at step 0" v={firstEval ? firstEval.train.toFixed(3) : "..."} strong />
          <Row k="val loss at step 0" v={firstEval ? firstEval.val.toFixed(3) : "..."} strong />
        </Card>
      )}
      {mode === "drop" && (
        <Card title="What the first drop is made of">
          <Row k="start, uniform guess" v="4.17" />
          <Row k="learn frequencies" v={`${UNIGRAM}`} />
          <Row k="learn letter pairs" v={`${BIGRAM}`} />
          <Row k="you, now" v={snap.step ? lastSmoothed(smoothLosses(snap.losses.slice(-200), SMOOTH)).toFixed(2) : "..."} strong />
        </Card>
      )}
      {mode === "hideval" && (
        <Card title="Two losses, two texts">
          <div>Train loss: text the model trains on.</div>
          <div>Val loss: the last 10%, never trained on.</div>
        </Card>
      )}
      {mode === "gap" && (
        <Card title={gap && gap.step > 0 ? `At step ${fmtInt(gap.step)}` : "Train vs val"}>
          <Row k="train (6 fixed batches)" v={gap ? gap.train.toFixed(3) : "..."} />
          <Row k="val (6 fixed batches)" v={gap ? gap.val.toFixed(3) : "..."} />
          <Row k="gap" v={gap ? (gap.val - gap.train).toFixed(3) : "..."} strong />
        </Card>
      )}
    </div>
  );
}

const TIMELINE = [0, 100, 300, 1000, 2000];

function Timeline({ snap }: { snap: TrainerSnapshot }) {
  const latest = snap.samples.length ? snap.samples[snap.samples.length - 1] : null;
  const entries = TIMELINE.map((s) => {
    const live = snap.samples.find((x) => x.step === s);
    const rec = RECORDED.samples.find((x) => x.step === s);
    return { step: s, text: (live ?? rec)?.text ?? "", live: !!live };
  });
  if (latest && latest.step > 2000) entries.push({ step: latest.step, text: latest.text, live: true });
  else {
    const rec = RECORDED.samples[RECORDED.samples.length - 1];
    entries.push({ step: rec.step, text: rec.text, live: false });
  }
  return (
    <div className="flex h-full flex-col rounded-xl border border-rule bg-card/95 shadow-[var(--shadow-1)]" style={{ padding: cq(12), gap: cq(7) }}>
      <div className="font-semibold text-ink-2" style={{ fontSize: fs(12, 10) }}>
        Samples as it trains (first 2 lines each)
      </div>
      {entries.map((e) => (
        <div key={e.step} className="min-h-0 border-t border-rule" style={{ paddingTop: cq(5) }}>
          <div className="flex items-baseline justify-between text-ink-3" style={{ fontSize: fs(11, 9) }}>
            <span className="font-mono font-semibold text-ink-2">{`step ${fmtInt(e.step)}`}</span>
            <span>{e.live ? "your run" : "recorded run, same seed"}</span>
          </div>
          <pre className="overflow-hidden whitespace-pre-wrap break-words font-mono leading-snug text-ink" style={{ fontSize: fs(11.5, 9), maxHeight: "2.75em" }}>
            {e.text.replace(/^\n+/, "").split("\n").slice(0, 2).join("\n")}
          </pre>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function OverfitScene({ playing }: { playing: boolean }) {
  const [snap, client] = useTrainer(OVERFIT_LAB, { defaults: OVERFIT_DEFAULTS, playing });
  const [main, mainClient] = useTrainer(TRAIN_LAB, { defaults: TRAIN_DEFAULTS, playing });
  useEffect(() => {
    // One run at a time: the main run waits while this step is open.
    mainClient.hold("overfit", true);
    return () => mainClient.hold("overfit", false);
  }, [mainClient]);
  const smooth = useMemo(() => smoothLosses(snap.losses, SMOOTH, 5), [snap.losses]);
  const minVal = snap.evals.reduce((m, e) => (e.val < m.val ? e : m), { step: 0, val: Infinity, train: 0 });
  const lastEval = snap.evals.length ? snap.evals[snap.evals.length - 1] : null;
  const series: Series[] = [
    { points: RECORDED.overfit.evals.map((e) => [e.step, e.val]), color: "var(--mark)", width: 1.4, dashed: true, opacity: 0.45 },
    { points: RECORDED.overfit.evals.map((e) => [e.step, e.train]), color: "var(--accent)", width: 1.4, dashed: true, opacity: 0.45 },
    { points: smooth, color: "var(--accent)", width: 1.4, opacity: 0.35 },
    { points: snap.evals.map((e) => [e.step, e.train]), color: "var(--accent)", width: 2.2 },
    { points: snap.evals.map((e) => [e.step, e.val]), color: "var(--mark)", width: 2.4 },
  ];
  return (
    <Frame
      label="Overfitting: training on only 10,000 characters"
      svg={
        <LossChart x={CH.x} y={CH.y} w={CH.w} h={CH.h} xMax={OVERFIT_STEPS} yMin={1} yMax={4.5} series={series}>
          {(sx, sy) => (
            <>
              {minVal.step > 0 && snap.step > minVal.step + 100 && (
                <g>
                  <circle cx={sx(minVal.step)} cy={sy(minVal.val)} r={7} fill="none" stroke="var(--ink)" strokeWidth={2} />
                  <text x={sx(minVal.step)} y={sy(minVal.val) + 26} textAnchor="middle" fontSize={12.5} fill="var(--ink)" stroke="var(--card)" strokeWidth={4} paintOrder="stroke" fontWeight={650}>
                    {`best val ${minVal.val.toFixed(2)}`}
                  </text>
                </g>
              )}
              {lastEval && lastEval.step >= 300 && (
                <GapMarker x={sx(lastEval.step) - 4} y1={sy(lastEval.train)} y2={sy(lastEval.val)} gap={lastEval.val - lastEval.train} />
              )}
              {snap.step === 0 && (
                <Label x={CH.x + CH.w / 2 + 60} y={CH.y + 36} size={13.5} color="var(--ink-3)">
                  dashed: a recorded run of this experiment
                </Label>
              )}
            </>
          )}
        </LossChart>
      }
    >
      <Html x={CH.x} y={CH.y + CH.h + 40} w={CH.w} h={70}>
        <div className="flex h-full items-center gap-[2.2cqw]">
          <div className="shrink-0">
            <RunButton snap={snap} client={client} startLabel="Train on 10k chars" maxSteps={OVERFIT_STEPS} />
          </div>
          <div className="grid min-w-0 flex-1 grid-cols-3 gap-[1.2cqw]">
            <Reading label="step" value={`${fmtInt(snap.step)} / ${fmtInt(OVERFIT_STEPS)}`} />
            <Reading label="train loss" value={lastEval ? lastEval.train.toFixed(3) : "..."} color="var(--accent)" />
            <Reading label="val loss" value={lastEval ? lastEval.val.toFixed(3) : "..."} color="var(--mark)" />
          </div>
        </div>
      </Html>
      <Html x={RIGHT.x} y={CH.y} w={RIGHT.w} h={CH.h + 108}>
        <div className="flex h-full flex-col gap-[1.2cqw]">
          <Card title="The experiment">
            <Row k="training text" v={`${fmtInt(OVERFIT_CHARS)} chars`} />
            <Row k="that is" v="1% of the train split" />
            <Row k="parameters" v="64,193" />
            <Row k="val text" v="unchanged" />
          </Card>
          <Card title="What to watch">
            <div>Train keeps falling: the model learns these 10,000 characters by heart.</div>
            <div className="mt-1">Val stops improving, then rises: what it memorized does not carry over.</div>
          </Card>
          <Card title="Your main run">
            <Row k="waiting at step" v={fmtInt(main.step)} />
            <div className="text-ink-3" style={{ fontSize: fs(11.5, 9) }}>
              It carries on when you leave this step.
            </div>
          </Card>
        </div>
      </Html>
    </Frame>
  );
}
