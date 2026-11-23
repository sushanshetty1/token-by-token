"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Segmented, Toggle } from "@/components/viz/controls";
import { Chip, Label } from "@/components/viz/svg";
import type { TrainerClient, TrainerSnapshot } from "@/lib/engine/client";
import { paramBreakdown, type Switches } from "@/lib/engine/model";
import { DEFAULT_RUN, SIZE_PRESETS, type RunConfig, type SizePreset } from "@/lib/engine/trainer";
import { smoothLosses, useTrainer } from "@/lib/engine/useTrainer";
import type { StageProps } from "@/lib/types";
import { AttentionGrid } from "../train-lab/AttentionScene";
import { Frame, Html, LossChart, Reading, SampleCard, StageButton, cq, fs, type Series } from "../train-lab/ui";
import {
  BREAK_IT,
  EXPERIMENTS,
  SMOOTH,
  STEPS,
  captureResult,
  finalVal,
  liveResult,
  optionsFor,
  recordedAttention,
  recordedResult,
  resultsStore,
  type ExpId,
  type RunResult,
} from "./experiments";

const ORDER: (ExpId | "cheat" | "lab" | "recap")[] = ["baseline", "nomask", "cheat", "nopos", "noresid", "noln", "lr10x", "lab", "recap"];

export function Stage({ step, playing }: StageProps) {
  const [snap, client] = useTrainer(BREAK_IT, { defaults: optionsFor({}), tag: "baseline", playing });
  useSyncExternalStore(resultsStore.subscribe, resultsStore.getVersion, () => 0);
  useEffect(() => captureResult(snap), [snap]);
  const id = ORDER[Math.min(step, ORDER.length - 1)];
  if (id === "cheat") return <CheatScene />;
  if (id === "lab") return <LabScene snap={snap} client={client} />;
  if (id === "recap") return <RecapScene />;
  return <ExperimentScene id={id} snap={snap} client={client} />;
}

const BASELINE = recordedResult("baseline");

/* ------------------------------------------------------------------ */

const CH = { x: 76, y: 100, w: 520, h: 286 };
const RIGHT = { x: 632, w: 304 };

function smoothed(r: RunResult | null) {
  return r ? smoothLosses(r.losses, SMOOTH, 2) : [];
}

function lastOf<T>(a: T[]) {
  return a.length ? a[a.length - 1] : undefined;
}

const fmt = (v: number | undefined, d = 2) => (v === undefined || !Number.isFinite(v) ? "..." : v.toFixed(d));

/** The five switches, with the changed ones marked. */
function SwitchRow({ run }: { run: Partial<RunConfig> }) {
  const s: Switches = { ...DEFAULT_RUN.switches, ...run.switches };
  const lr = run.lr ?? DEFAULT_RUN.lr;
  const changedSize = run.nLayer !== undefined && (run.nLayer !== DEFAULT_RUN.nLayer || run.nEmbd !== DEFAULT_RUN.nEmbd);
  const size = changedSize ? `${run.nLayer} block${run.nLayer === 1 ? "" : "s"}, n_embd ${run.nEmbd}` : null;
  const items: { label: string; on: boolean; text?: string; strike?: boolean }[] = [
    { label: "causal mask", on: s.causal, strike: true },
    { label: "positions", on: s.positions, strike: true },
    { label: "residuals", on: s.residual, strike: true },
    { label: "LayerNorm", on: s.layerNorm, strike: true },
    { label: "lr", on: lr === DEFAULT_RUN.lr, text: lr === DEFAULT_RUN.lr ? "3e-3" : lr.toExponential(0).replace("+", "") },
  ];
  return (
    <div className="flex flex-wrap items-center" style={{ gap: cq(8) }}>
      {items.map((it) => (
        <span
          key={it.label}
          className={`inline-flex items-center rounded-full border font-semibold ${it.on ? "border-rule-strong bg-card text-ink-2" : "border-bad bg-bad-soft text-ink"}`}
          style={{ fontSize: fs(12.5, 10), padding: `${cq(4)} ${cq(11)}`, gap: cq(6) }}
        >
          <span className={it.on || !it.strike ? "" : "line-through decoration-2"}>{it.label}</span>
          <span className="font-mono font-normal">{it.text ?? (it.on ? "on" : "off")}</span>
        </span>
      ))}
      {size && (
        <span className="rounded-full border border-mark bg-mark-soft font-semibold text-ink" style={{ fontSize: fs(12.5, 10), padding: `${cq(4)} ${cq(11)}` }}>
          {size}
        </span>
      )}
    </div>
  );
}

function RunControls({
  snap,
  client,
  tag,
  run,
  hasResult,
}: {
  snap: TrainerSnapshot;
  client: TrainerClient;
  tag: string;
  run: Partial<RunConfig>;
  hasResult: boolean;
}) {
  const mine = snap.tag === tag && snap.step > 0;
  const go = () => {
    client.reset(optionsFor(run), tag);
    client.start(STEPS);
  };
  if (snap.phase === "idle" || snap.phase === "loading") {
    return (
      <StageButton onClick={() => {}} disabled>
        Loading
      </StageButton>
    );
  }
  if (mine && snap.phase === "running") {
    return (
      <StageButton onClick={() => client.pause()}>
        <Pause size="1em" /> Pause
      </StageButton>
    );
  }
  if (mine && snap.phase === "paused") {
    return (
      <StageButton primary onClick={() => client.start(STEPS)}>
        <Play size="1em" /> Resume
      </StageButton>
    );
  }
  return (
    <StageButton primary onClick={go}>
      {hasResult ? <RotateCcw size="1em" /> : <Play size="1em" />} {hasResult ? "Run again" : `Run ${STEPS} steps`}
    </StageButton>
  );
}

function RunChart({ current, color, label }: { current: RunResult | null; color: string; label?: string }) {
  const base = useMemo(() => smoothed(BASELINE), []);
  const cur = useMemo(() => smoothed(current), [current]);
  const series: Series[] = [{ points: base, color: "var(--ink-3)", width: 2.2, opacity: 0.85 }];
  if (current) series.push({ points: cur, color, width: 2.6 });
  const end = lastOf(cur);
  const baseEnd = lastOf(base)!;
  return (
    <LossChart x={CH.x} y={CH.y} w={CH.w} h={CH.h} xMax={STEPS} yMin={0} yMax={4.5} series={series}>
      {(sx, sy) => (
        <>
          <text
            x={sx(STEPS) - 6}
            y={end && end[1] > baseEnd[1] && end[1] - baseEnd[1] < 0.6 ? sy(baseEnd[1]) + 20 : sy(baseEnd[1]) - 9}
            textAnchor="end"
            fontSize={12.5}
            fill="var(--ink-2)"
            stroke="var(--card)"
            strokeWidth={4}
            paintOrder="stroke"
          >
            baseline
          </text>
          {end && label && (
            <text
              x={Math.max(CH.x + 120, sx(end[0]) - 6)}
              y={Math.max(CH.y + 14, sy(end[1]) - 10)}
              textAnchor="end"
              fontSize={12.5}
              fontWeight={650}
              fill={color}
              stroke="var(--card)"
              strokeWidth={4}
              paintOrder="stroke"
            >
              {label}
            </text>
          )}
        </>
      )}
    </LossChart>
  );
}

function Readings({ current, step }: { current: RunResult | null; step: number }) {
  const last = current ? lastOf(smoothed(current)) : undefined;
  const ev = current ? lastOf(current.evals) : undefined;
  return (
    <div className="grid min-w-0 flex-1 grid-cols-4" style={{ gap: cq(10) }}>
      <Reading label="step" value={`${step}`} />
      <Reading label="train loss" value={fmt(last?.[1])} />
      <Reading label="val loss" value={fmt(ev?.val)} />
      <Reading label="max grad norm" value={current && current.maxGrad > 0 ? current.maxGrad.toFixed(1) : "..."} />
    </div>
  );
}

function Compare({ current, name, onRecorded }: { current: RunResult | null; name: string; onRecorded?: () => void }) {
  const done = current && lastOf(current.evals)?.step === STEPS;
  const v = current ? finalVal(current) : NaN;
  const b = finalVal(BASELINE);
  return (
    <div className="rounded-xl border border-rule bg-card/95 shadow-[var(--shadow-1)]" style={{ padding: cq(12), fontSize: fs(13, 10), lineHeight: 1.5 }}>
      <div className="font-semibold text-ink-2" style={{ fontSize: fs(12, 10) }}>
        {`Val loss at step ${STEPS}`}
      </div>
      <div className="mt-1 flex items-baseline justify-between">
        <span className="text-ink-2">baseline</span>
        <span className="tabular font-mono text-ink">{b.toFixed(3)}</span>
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-ink-2">{name.toLowerCase()}</span>
        <span className="tabular font-mono font-semibold text-ink">{done ? v.toFixed(3) : current ? "running" : "?"}</span>
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-ink-2">difference</span>
        <span className="tabular font-mono font-semibold" style={{ color: done ? (v > b ? "var(--bad)" : "var(--ok)") : "var(--ink-3)" }}>
          {done ? `${v - b >= 0 ? "+" : ""}${(v - b).toFixed(2)}` : "..."}
        </span>
      </div>
      {current && current.source === "recorded" && (
        <div className="mt-1 text-ink-3" style={{ fontSize: fs(11.5, 9) }}>
          recorded run, same seed as yours
        </div>
      )}
      {done && v < 1 && (
        <div className="mt-1 font-semibold text-bad" style={{ fontSize: fs(11.5, 9) }}>
          suspiciously low for 400 steps
        </div>
      )}
      {!current && onRecorded && (
        <button type="button" className="mt-1.5 font-semibold text-accent underline underline-offset-4" style={{ fontSize: fs(12, 10) }} onClick={onRecorded}>
          No time? Show the recorded run
        </button>
      )}
    </div>
  );
}

function ExperimentScene({ id, snap, client }: { id: ExpId; snap: TrainerSnapshot; client: TrainerClient }) {
  const exp = EXPERIMENTS[id];
  const [showRec, setShowRec] = useState(false);
  const cached = resultsStore.get(id);
  const live = snap.tag === id && snap.step > 0 ? liveResult(snap) : null;
  const current: RunResult | null = live ?? cached ?? (showRec ? recordedResult(id) : null);
  const isBase = id === "baseline";
  const color = isBase ? "var(--accent)" : "var(--bad)";
  const shownStep = live ? snap.step : current ? STEPS : 0;
  const sampleText = current?.sample ?? (isBase || !current ? BASELINE.sample : null);
  const sampleTitle = current ? (current.sample ? `${exp.name.toLowerCase()}, step ${STEPS}` : "sample arrives at step 400") : `baseline, step ${STEPS}`;
  return (
    <Frame
      label={`${exp.name}: training curve against the baseline`}
      svg={
        <>
          <RunChart current={current} color={color} label={isBase ? "your run" : exp.name.toLowerCase()} />
          {!current && !isBase && (
            <Label x={CH.x + CH.w / 2} y={CH.y + 70} size={13.5} color="var(--ink-3)">
              predict first, then run it: same seed, same batches as the baseline
            </Label>
          )}
          {isBase && !current && (
            <Label x={CH.x + CH.w / 2} y={CH.y + 70} size={13.5} color="var(--ink-3)">
              the gray line is the baseline, recorded; run it to reproduce it
            </Label>
          )}
        </>
      }
    >
      <Html x={CH.x} y={24} w={860} h={44}>
        <SwitchRow run={exp.run} />
      </Html>
      <Html x={CH.x} y={CH.y + CH.h + 40} w={CH.w} h={70}>
        <div className="flex h-full items-center" style={{ gap: cq(18) }}>
          <div className="shrink-0">
            <RunControls snap={snap} client={client} tag={id} run={exp.run} hasResult={!!cached} />
          </div>
          <Readings current={current} step={shownStep} />
        </div>
      </Html>
      <Html x={RIGHT.x} y={CH.y} w={RIGHT.w} h={CH.h + 110}>
        <div className="flex h-full flex-col" style={{ gap: cq(10) }}>
          <Compare current={current} name={isBase ? "your run" : exp.name} onRecorded={isBase ? undefined : () => setShowRec(true)} />
          {current && !isBase ? (
            <>
              <div className="min-h-0 flex-1">
                <SampleCard title={<span>{sampleTitle}</span>} text={current.sample ? visible(current.sample) : null} tone="bad" size={12} />
              </div>
              <div className="min-h-0 flex-1">
                <SampleCard title={<span>{`baseline, step ${STEPS}`}</span>} text={BASELINE.sample} size={12} />
              </div>
            </>
          ) : (
            <div className="min-h-0 flex-1">
              <SampleCard title={<span>{sampleTitle}</span>} text={sampleText ? visible(sampleText) : null} size={12.5} />
            </div>
          )}
        </div>
      </Html>
    </Frame>
  );
}

/** Show runs of newlines as ↵ so an all-newline sample is visibly broken. */
function visible(text: string) {
  return text.replace(/\n{3,}/g, (m) => "↵".repeat(m.length) + "\n");
}

/* ------------------------------------------------------------------ */

function CheatScene() {
  const nm = recordedAttention("nomask");
  const base = recordedAttention("baseline");
  const T = nm.tokens.length;
  const nmSample = recordedResult("nomask").sample ?? "";
  const newlines = (nmSample.match(/\n/g) ?? []).length;
  const gx = 92;
  const gy = 118;
  const cell = 13;
  const bx = 540;
  const by = 118;
  return (
    <Frame
      label="Why the unmasked model cheats: its attention copies the next character"
      svg={
        <>
          <Label x={gx} y={52} size={16} weight={700} color="var(--ink)" anchor="start">
            No mask, layer 1, head 2
          </Label>
          <Label x={gx} y={74} size={12.5} anchor="start">
            {`outlined: the next character, the one each row must predict`}
          </Label>
          <AttentionGrid x={gx} y={gy} cell={cell} tokens={nm.tokens} m={nm.maps[0][1]} hatchFuture={false} outlineNext />
          <Label x={gx + (T * (cell + 1)) / 2} y={gy + T * (cell + 1) + 24} size={12.5}>
            0.97 of this head&apos;s attention sits on the answer
          </Label>

          <Label x={bx} y={52} size={16} weight={700} color="var(--ink)" anchor="start">
            Masked baseline, same head
          </Label>
          <Label x={bx} y={74} size={12.5} anchor="start">
            the future is hatched: it cannot look there
          </Label>
          <AttentionGrid x={bx} y={by} cell={7} tokens={base.tokens} m={base.maps[0][1]} labels={false} />

          <Label x={bx + 204} y={140} size={13} weight={650} color="var(--ink)" anchor="start">
            At generation time
          </Label>
          {["R", "o", "m", "e", "o"].map((c, i) => (
            <Chip key={i} x={bx + 220 + i * 30} y={174} text={c} index={i} h={28} fontSize={13} delay={0.2 + i * 0.05} />
          ))}
          <rect x={bx + 205 + 5 * 30} y={160} width={30} height={28} rx={7} fill="url(#hatch)" stroke="var(--bad)" strokeWidth={1.4} />
          <Label x={bx + 220 + 5 * 30} y={179} size={14} weight={700} color="var(--bad)">
            ?
          </Label>
          {["the next character does", "not exist yet, so the", "copying head has", "nothing to copy"].map((line, i) => (
            <Label key={line} x={bx + 204} y={216 + i * 18} size={12.5} anchor="start">
              {line}
            </Label>
          ))}
        </>
      }
    >
      <Html x={bx} y={300} w={396} h={210}>
        <div className="flex h-full flex-col" style={{ gap: cq(10) }}>
          <div className="grid grid-cols-2" style={{ gap: cq(10) }}>
            <div className="rounded-xl border border-ok bg-ok-soft" style={{ padding: cq(10) }}>
              <Reading label="val loss at step 400" value="0.092" />
              <div className="text-ink-2" style={{ fontSize: fs(11.5, 9) }}>
                looks nearly perfect
              </div>
            </div>
            <div className="rounded-xl border border-bad bg-bad-soft" style={{ padding: cq(10) }}>
              <Reading label="newlines in 160 chars" value={`${newlines}`} />
              <div className="text-ink-2" style={{ fontSize: fs(11.5, 9) }}>
                what it actually writes
              </div>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <SampleCard title="sample from the unmasked model (↵ = newline)" text={nmSample.replace(/\n/g, "↵")} tone="bad" size={12} />
          </div>
        </div>
      </Html>
    </Frame>
  );
}

/* ------------------------------------------------------------------ */

const LRS = ["0.001", "0.003", "0.01", "0.03"] as const;
const LR_LABEL: Record<(typeof LRS)[number], string> = { "0.001": "1e-3", "0.003": "3e-3", "0.01": "1e-2", "0.03": "3e-2" };

type LabState = { switches: Switches; lr: (typeof LRS)[number]; size: SizePreset };

/** Survives the stage remounting, so the learner's choices stay put between steps. */
const labMemory: { current: LabState } = {
  current: { switches: { ...DEFAULT_RUN.switches }, lr: "0.003", size: "small" },
};

function LabScene({ snap, client }: { snap: TrainerSnapshot; client: TrainerClient }) {
  const [state, setState] = useState(labMemory.current);
  useEffect(() => {
    labMemory.current = state;
  }, [state]);
  const update = (patch: Partial<LabState>) => setState((s) => ({ ...s, ...patch }));
  const run: Partial<RunConfig> = { switches: state.switches, lr: Number(state.lr), ...SIZE_PRESETS[state.size] };
  const tag = `lab:${JSON.stringify(run)}`;
  const cached = resultsStore.get(tag);
  const live = snap.tag === tag && snap.step > 0 ? liveResult(snap) : null;
  const current = live ?? cached ?? null;
  const params = (p: SizePreset) => paramBreakdown({ vocabSize: 65, blockSize: 32, ...SIZE_PRESETS[p] }).total;
  const sw = state.switches;
  const setSw = (k: keyof Switches) => (v: boolean) => update({ switches: { ...sw, [k]: v } });
  return (
    <Frame
      label="Free lab: combine switches and run"
      svg={<RunChart current={current} color="var(--violet)" label="your mix" />}
    >
      <Html x={CH.x} y={24} w={860} h={44}>
        <SwitchRow run={run} />
      </Html>
      <Html x={CH.x} y={CH.y + CH.h + 40} w={CH.w} h={70}>
        <div className="flex h-full items-center" style={{ gap: cq(18) }}>
          <div className="shrink-0">
            <RunControls snap={snap} client={client} tag={tag} run={run} hasResult={!!cached} />
          </div>
          <Readings current={current} step={live ? snap.step : current ? STEPS : 0} />
        </div>
      </Html>
      <Html x={RIGHT.x} y={CH.y - 8} w={RIGHT.w} h={CH.h + 118}>
        <div className="flex h-full flex-col rounded-xl border border-rule bg-card/95 shadow-[var(--shadow-1)]" style={{ padding: cq(10), gap: cq(2) }}>
          <Toggle label="Causal mask" checked={sw.causal} onChange={setSw("causal")} />
          <Toggle label="Position embeddings" checked={sw.positions} onChange={setSw("positions")} />
          <Toggle label="Residual connections" checked={sw.residual} onChange={setSw("residual")} />
          <Toggle label="LayerNorm" checked={sw.layerNorm} onChange={setSw("layerNorm")} />
          <div className="mt-1 text-[13px] font-semibold text-ink">Learning rate</div>
          <Segmented label="Learning rate" value={state.lr} onChange={(v) => update({ lr: v })} options={LRS.map((v) => ({ value: v, label: LR_LABEL[v] }))} />
          <div className="mt-1.5 text-[13px] font-semibold text-ink">Model size</div>
          <Segmented
            label="Model size"
            value={state.size}
            onChange={(v) => update({ size: v })}
            options={(["tiny", "small", "medium"] as SizePreset[]).map((p) => ({ value: p, label: `${p} ${Math.round(params(p) / 1000)}k` }))}
          />
          <div className="mt-auto text-ink-3" style={{ fontSize: fs(11.5, 9) }}>
            {state.size === "small" ? "Gray line: the recorded baseline, same size." : "Gray line: the small baseline, so size changes are not like for like."}
          </div>
          {current && current.sample && (
            <div className="truncate font-mono text-ink" style={{ fontSize: fs(11.5, 9) }}>
              {current.sample.replace(/\n/g, "↵").slice(0, 60)}
            </div>
          )}
        </div>
      </Html>
    </Frame>
  );
}

/* ------------------------------------------------------------------ */

const ROWS: { id: ExpId; what: string; color: string }[] = [
  { id: "baseline", what: "reference: every switch on, lr 3e-3", color: "var(--ink-3)" },
  { id: "nomask", what: "copies the next character; writes only newlines", color: "var(--bad)" },
  { id: "nopos", what: "a bag of characters: no sense of distance", color: "var(--ink)" },
  { id: "noresid", what: "stuck at the frequency-only level (3.31)", color: "var(--mark)" },
  { id: "noln", what: "slower start; gradient norm up to 5.7 (vs 2.8)", color: "var(--accent)" },
  { id: "lr10x", what: "overshoots, bounces, stalls", color: "var(--ok)" },
];

function RecapScene() {
  const b = finalVal(BASELINE);
  const curves = useMemo(() => ROWS.map((r) => ({ ...r, points: smoothed(recordedResult(r.id)) })), []);
  return (
    <Frame
      label="Recap: what each change did after 400 steps"
      svg={
        <LossChart
          x={92}
          y={338}
          w={560}
          h={132}
          xMax={STEPS}
          yMin={0}
          yMax={4.5}
          yStep={1.5}
          series={curves.map((c) => ({ points: c.points, color: c.color, width: c.id === "baseline" ? 2.6 : 2 }))}
        />
      }
    >
      <Html x={48} y={18} w={864} h={292}>
        <div className="flex h-full flex-col rounded-xl border border-rule bg-card/95 shadow-[var(--shadow-1)]" style={{ padding: `${cq(12)} ${cq(16)}` }}>
          <div className="font-bold text-ink" style={{ fontSize: fs(16, 12) }}>
            {`Same model, same seed, same batches, ${STEPS} steps, one change each`}
          </div>
          <table className="mt-1 w-full border-collapse text-left" style={{ fontSize: fs(12.5, 9.5) }}>
            <thead>
              <tr className="border-b border-rule-strong text-ink-3">
                <th className="py-[0.4em] pr-3 font-semibold">change</th>
                <th className="py-[0.4em] pr-3 text-right font-semibold">val loss</th>
                <th className="py-[0.4em] pr-3 text-right font-semibold">vs baseline</th>
                <th className="py-[0.4em] pr-3 text-right font-semibold">your run</th>
                <th className="py-[0.4em] font-semibold">what happened</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map(({ id, what, color }) => {
                const v = finalVal(recordedResult(id));
                const mine = resultsStore.get(id);
                const d = v - b;
                return (
                  <tr key={id} className="border-b border-rule last:border-0">
                    <td className="py-[0.42em] pr-3 font-semibold text-ink">
                      <span className="mr-[0.5em] inline-block h-[3px] w-[1.2em] rounded-full align-middle" style={{ background: color }} />
                      {EXPERIMENTS[id].name}
                    </td>
                    <td className="tabular py-[0.42em] pr-3 text-right font-mono text-ink">{v.toFixed(2)}</td>
                    <td className="tabular py-[0.42em] pr-3 text-right font-mono" style={{ color: id === "baseline" ? "var(--ink-3)" : d > 0 ? "var(--bad)" : "var(--ok)" }}>
                      {id === "baseline" ? "" : `${d >= 0 ? "+" : ""}${d.toFixed(2)}`}
                    </td>
                    <td className="tabular py-[0.42em] pr-3 text-right font-mono text-ink-2">{mine ? finalVal(mine).toFixed(2) : "not run"}</td>
                    <td className="py-[0.42em] text-ink-2">{what}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Html>
      <Html x={684} y={330} w={252} h={150}>
        <div className="flex h-full flex-col justify-center text-ink-2" style={{ fontSize: fs(12.5, 10), lineHeight: 1.45, gap: cq(8) }}>
          <div className="font-semibold text-ink">All six curves, recorded</div>
          <div>The red cliff is the cheat. The saffron line never leaves the frequency level.</div>
          <div className="text-ink-3">The lowest number in the table belongs to the only model that cannot write a word.</div>
        </div>
      </Html>
    </Frame>
  );
}
