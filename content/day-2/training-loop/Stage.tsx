"use client";

import { motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { Slider, StageOverlay } from "@/components/viz/controls";
import { Appear, EASE, Label, Matrix, Pill, Svg } from "@/components/viz/svg";
import { diverging } from "@/lib/color";
import type { StageProps } from "@/lib/types";
import {
  BIG,
  FIRST,
  GRAD0,
  LR,
  PARAM_GROUPS,
  PARAMS0,
  RUN,
  RUN_NOZERO,
  STEPS,
  W_START,
  W_STAR,
  XS,
  YS,
  bowl,
  bowlGrad,
  descend,
} from "./train";

const f2 = (v: number) => (Math.abs(v) < 0.005 ? "0.00" : v.toFixed(2));
const f3 = (v: number) => v.toFixed(3);

/* ------------------------------------------------------------------ */
/* The loop map across the top.                                       */
/* ------------------------------------------------------------------ */

const MAP = ["forward", "loss", "zero_grad", "backward", "update"];
/** -1: none yet, 5: all done. */
const STATION_OF_STEP = [-1, 0, 1, 3, 4, 5, 4, 4, 2, 5];

function LoopMap({ step }: { step: number }) {
  const at = STATION_OF_STEP[step] ?? -1;
  const dx = 146;
  const x0 = 170;
  return (
    <g>
      {MAP.map((m, i) => {
        const active = i === at || (step === 3 && i === 2);
        const done = at === 5 || (at >= 0 && i < at);
        const x = x0 + i * dx;
        return (
          <g key={m}>
            {i > 0 && (
              <line
                x1={x - dx + 58}
                y1={40}
                x2={x - 62}
                y2={40}
                stroke={done || active ? "var(--ink)" : "var(--rule-strong)"}
                strokeWidth={1.4}
                markerEnd={done || active ? "url(#arrow-ink)" : "url(#arrow-muted)"}
              />
            )}
            {active && <rect x={x - 56} y={26} width={112} height={30} rx={8} fill="var(--ink)" />}
            <rect
              x={x - 56}
              y={23}
              width={112}
              height={30}
              rx={8}
              fill={active ? "var(--mark)" : done ? "var(--card)" : "var(--card-2)"}
              stroke={active || done ? "var(--ink)" : "var(--rule-strong)"}
              strokeWidth={active ? 1.7 : 1.1}
            />
            <text x={x} y={42.5} textAnchor="middle" fontSize={13} className="mono" fontWeight={active ? 700 : 600} fill={active || done ? "var(--ink)" : "var(--ink-3)"}>
              {m}
            </text>
          </g>
        );
      })}
      <line x1={x0 + 4 * dx + 58} y1={40} x2={x0 + 4 * dx + 92} y2={40} stroke={at === 5 ? "var(--ink)" : "var(--rule-strong)"} strokeWidth={1.4} />
      <Pill x={x0 + 4 * dx + 128} y={40} text="↺ repeat" tone={at === 5 ? "mark" : "muted"} fontSize={12.5} />
    </g>
  );
}

function Card({ x, y, w, h, tone = "ink" }: { x: number; y: number; w: number; h: number; tone?: "ink" | "violet" | "ok" | "bad" | "mark" }) {
  const stroke = tone === "ink" ? "var(--rule-strong)" : `var(--${tone})`;
  const fill = tone === "ink" ? "var(--card)" : `var(--${tone}-soft)`;
  return <rect x={x} y={y} width={w} height={h} rx={14} fill={fill} stroke={stroke} strokeWidth={1.3} />;
}

function Lines({ x, y, lines, size = 14, gap = 24, color = "var(--ink)", mono = false }: { x: number; y: number; lines: string[]; size?: number; gap?: number; color?: string; mono?: boolean }) {
  return (
    <g>
      {lines.map((l, i) => (
        <text key={i} x={x} y={y + i * gap} fontSize={size} fill={color} className={mono ? "mono" : undefined} style={{ whiteSpace: "pre" }}>
          {l}
        </text>
      ))}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Data, network, predictions, loss curve.                            */
/* ------------------------------------------------------------------ */

const ROW_Y = [157, 194, 231, 268];

function Dataset() {
  return (
    <g>
      <text x={30} y={106} fontSize={13.5} fontWeight={650} fill="var(--ink-2)">
        data: 4 examples
      </text>
      <Matrix x={62} y={140} values={XS} cell={34} gap={3} max={3} rowLabels={["1", "2", "3", "4"]} colLabels={["x1", "x2", "x3"]} />
      <Matrix x={190} y={140} values={YS.map((v) => [v])} cell={34} gap={3} max={1.5} colLabels={["y"]} digits={0} />
    </g>
  );
}

const IN_X = 330;
const H1_X = 410;
const H2_X = 490;
const OUT_X = 566;
const IN_Y = [160, 215, 270];
const H_Y = [132, 187, 242, 297];
const OUT_Y = 215;

function Network({ params, highlight }: { params: number[]; highlight?: number }) {
  const edges: { x1: number; y1: number; x2: number; y2: number; w: number; idx: number }[] = [];
  for (let j = 0; j < 4; j++) for (let i = 0; i < 3; i++) edges.push({ x1: IN_X, y1: IN_Y[i], x2: H1_X, y2: H_Y[j], w: params[j * 3 + i], idx: j * 3 + i });
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) edges.push({ x1: H1_X, y1: H_Y[i], x2: H2_X, y2: H_Y[j], w: params[16 + j * 4 + i], idx: 16 + j * 4 + i });
  for (let i = 0; i < 4; i++) edges.push({ x1: H2_X, y1: H_Y[i], x2: OUT_X, y2: OUT_Y, w: params[36 + i], idx: 36 + i });
  const max = 0.9;
  return (
    <g>
      {edges.map((e) => (
        <line
          key={e.idx}
          x1={e.x1}
          y1={e.y1}
          x2={e.x2}
          y2={e.y2}
          stroke={diverging(e.w, max)}
          strokeWidth={1 + Math.min(1, Math.abs(e.w) / max) * 3}
          strokeLinecap="round"
        />
      ))}
      {highlight !== undefined &&
        edges
          .filter((e) => e.idx === highlight)
          .map((e) => (
            <motion.line
              key="hl"
              x1={e.x1}
              y1={e.y1}
              x2={e.x2}
              y2={e.y2}
              stroke="var(--mark)"
              strokeWidth={6}
              strokeLinecap="round"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.9, 0.3] }}
              transition={{ duration: 1.8, repeat: Infinity }}
            />
          ))}
      {IN_Y.map((y, i) => (
        <circle key={`i${i}`} cx={IN_X} cy={y} r={10} fill="var(--card)" stroke="var(--ink)" strokeWidth={1.5} />
      ))}
      {H_Y.map((y, i) => (
        <g key={`h${i}`}>
          <circle cx={H1_X} cy={y} r={10} fill="var(--card)" stroke="var(--ink)" strokeWidth={1.5} />
          <circle cx={H2_X} cy={y} r={10} fill="var(--card)" stroke="var(--ink)" strokeWidth={1.5} />
        </g>
      ))}
      <circle cx={OUT_X} cy={OUT_Y} r={12} fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth={1.8} />
      <text x={OUT_X} y={OUT_Y + 4.5} textAnchor="middle" fontSize={12} fontWeight={700}>
        ŷ
      </text>
      <text x={448} y={330} textAnchor="middle" fontSize={12.5} className="mono" fill="var(--ink-2)">
        3 → 4 → 4 → 1, tanh, 41 parameters
      </text>
    </g>
  );
}

const PX = (v: number) => 805 + Math.max(-1.6, Math.min(1.6, v)) * 66;

function Predictions({ preds, showPreds = true }: { preds: number[]; showPreds?: boolean }) {
  return (
    <g>
      <text x={606} y={106} fontSize={13.5} fontWeight={650} fill="var(--ink-2)">
        prediction ŷ against target y
      </text>
      {[-1, 0, 1].map((t) => (
        <g key={t}>
          <line x1={PX(t)} y1={140} x2={PX(t)} y2={284} stroke="var(--rule-strong)" strokeDasharray={t === 0 ? undefined : "3 4"} />
          <text x={PX(t)} y={302} textAnchor="middle" fontSize={11.5} className="mono" fill="var(--ink-3)">
            {t}
          </text>
        </g>
      ))}
      {ROW_Y.map((y, k) => {
        const p = preds[k];
        return (
          <g key={k}>
            <line x1={PX(-1.5)} y1={y} x2={PX(1.5)} y2={y} stroke="var(--rule)" />
            <path d={`M ${PX(YS[k])} ${y - 9} L ${PX(YS[k]) + 7} ${y} L ${PX(YS[k])} ${y + 9} L ${PX(YS[k]) - 7} ${y} Z`} fill="var(--ink)" />
            {showPreds && (
              <g>
                <line x1={PX(p)} y1={y} x2={PX(YS[k])} y2={y} stroke="var(--bad)" strokeWidth={2.5} opacity={0.75} />
                <circle cx={PX(p)} cy={y} r={7} fill="var(--accent)" stroke="var(--card)" strokeWidth={1.5} />
                <text x={694} y={y + 4.5} textAnchor="end" fontSize={12.5} className="mono" fill="var(--ink)">
                  {f2(p)}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
}

const LX0 = 646;
const LX1 = 916;
const LY0 = 356;
const LY1 = 486;
const lx = (t: number) => LX0 + (t / STEPS) * (LX1 - LX0);
const ly = (v: number, max = 1) => LY1 - (Math.min(v, max * 1.08) / max) * (LY1 - LY0);

function curvePath(losses: number[], upto: number, max = 1) {
  return losses
    .slice(0, upto + 1)
    .map((v, t) => `${t === 0 ? "M" : "L"} ${lx(t).toFixed(1)} ${ly(v, max).toFixed(1)}`)
    .join(" ");
}

function LossAxes({ title = "loss" }: { title?: string }) {
  return (
    <g>
      <text x={606} y={340} fontSize={13.5} fontWeight={650} fill="var(--ink-2)">
        {title}
      </text>
      <line x1={LX0} y1={LY0 - 4} x2={LX0} y2={LY1} stroke="var(--ink-3)" />
      <line x1={LX0} y1={LY1} x2={LX1 + 4} y2={LY1} stroke="var(--ink-3)" />
      {[0, 0.5, 1].map((v) => (
        <text key={v} x={LX0 - 8} y={ly(v) + 4} textAnchor="end" fontSize={11.5} className="mono" fill="var(--ink-3)">
          {v.toFixed(1)}
        </text>
      ))}
      {[0, 50, 100].map((t) => (
        <text key={t} x={lx(t)} y={LY1 + 17} textAnchor="middle" fontSize={11.5} className="mono" fill="var(--ink-3)">
          {t}
        </text>
      ))}
      <text x={LX1} y={LY1 + 32} textAnchor="end" fontSize={11.5} fill="var(--ink-3)">
        step
      </text>
    </g>
  );
}

function LossDots({ upto }: { upto: number }) {
  return (
    <g>
      {RUN.losses.slice(0, upto + 1).map((v, t) => (
        <circle key={t} cx={lx(t)} cy={ly(v)} r={4.5} fill="var(--mark)" stroke="var(--ink)" strokeWidth={1.2} />
      ))}
      <text x={lx(upto) + 10} y={ly(RUN.losses[upto]) + 4} fontSize={12.5} className="mono" fontWeight={650}>
        {upto === 0 ? f3(RUN.losses[0]) : `${f3(RUN.losses[0])} → ${f3(RUN.losses[upto])}`}
      </text>
    </g>
  );
}

function Scene({ preds, params, showPreds = true, highlight, children }: { preds: number[]; params: number[]; showPreds?: boolean; highlight?: number; children?: ReactNode }) {
  return (
    <g>
      <Dataset />
      <Network params={params} highlight={highlight} />
      <Predictions preds={preds} showPreds={showPreds} />
      <LossAxes />
      {children}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Steps 1 to 5: one turn of the loop.                                */
/* ------------------------------------------------------------------ */

function Setup() {
  return (
    <Scene preds={FIRST.preds} params={PARAMS0} showPreds={false}>
      <Appear delay={0.4}>
        <Card x={30} y={350} w={540} h={160} />
        <text x={50} y={380} fontSize={15} fontWeight={650}>
          The task
        </text>
        <Lines
          x={50}
          y={408}
          lines={["Output +1 for examples 1 and 4, and -1 for 2 and 3.", "The 41 weights start random (seeded). Edge color is", "the weight: saffron positive, ultramarine negative.", "Nothing has been learned yet."]}
          size={13.5}
          gap={23}
          color="var(--ink-2)"
        />
      </Appear>
    </Scene>
  );
}

function ForwardStep() {
  return (
    <Scene preds={FIRST.preds} params={PARAMS0}>
      <Appear delay={0.3}>
        <Card x={30} y={350} w={540} h={160} />
        <text x={50} y={380} fontSize={15} className="mono" fontWeight={650}>
          ypred = model(xs)
        </text>
        <Lines x={50} y={410} lines={[`→ [${FIRST.preds.map(f2).join(", ")}]`]} mono size={14} />
        <Lines
          x={50}
          y={444}
          lines={["All four guesses sit near 0. Example 2 is even on the", "wrong side: it should be -1, the network says +0.18."]}
          size={13.5}
          gap={23}
          color="var(--ink-2)"
        />
      </Appear>
    </Scene>
  );
}

function LossStep() {
  const sq = FIRST.preds.map((p, k) => (p - YS[k]) ** 2);
  return (
    <Scene preds={FIRST.preds} params={PARAMS0}>
      <Appear delay={0.3}>
        <Card x={30} y={350} w={540} h={160} />
        <text x={50} y={378} fontSize={14.5} fontWeight={650}>
          Squared error per example, then the mean
        </text>
      </Appear>
      {sq.map((v, k) => (
        <Appear key={k} delay={0.5 + k * 0.15}>
          <text x={50} y={406 + k * 24} fontSize={13} className="mono">
            {`(${f2(FIRST.preds[k])} ${YS[k] > 0 ? "- 1" : "+ 1"})²`}
          </text>
          <rect x={250} y={395 + k * 24} width={200} height={14} rx={3} fill="var(--paper-2)" />
          <motion.rect x={250} y={395 + k * 24} height={14} rx={3} fill="var(--bad)" opacity={0.8} initial={{ width: 0 }} animate={{ width: (v / 1.5) * 200 }} transition={{ duration: 0.5, delay: 0.6 + k * 0.15, ease: EASE }} />
          <text x={548} y={406 + k * 24} textAnchor="end" fontSize={13} className="mono">
            {f3(v)}
          </text>
        </Appear>
      ))}
      <Appear delay={1.3}>
        <line x1={460} y1={492} x2={550} y2={492} stroke="var(--ink-3)" />
        <text x={548} y={508} textAnchor="end" fontSize={13.5} className="mono" fontWeight={700}>
          {`mean ${f3(FIRST.loss)}`}
        </text>
        <LossDots upto={0} />
      </Appear>
    </Scene>
  );
}

const GROUPS = PARAM_GROUPS.map((g, gi) => ({ ...g, start: PARAM_GROUPS.slice(0, gi).reduce((a, b) => a + b.n, 0) }));

function BackwardStep() {
  const groups = GROUPS;
  const cell = 9.5;
  const gap = 1.5;
  const gx = (i: number, gi: number) => 50 + i * (cell + gap) + gi * 8;
  return (
    <Scene preds={FIRST.preds} params={PARAMS0}>
      <LossDots upto={0} />
      <Card x={30} y={350} w={540} h={160} tone="violet" />
      <text x={50} y={378} fontSize={14.5} fontWeight={650}>
        zero_grad, then loss.backward()
      </text>
      {groups.map((g, gi) => (
        <g key={g.label}>
          <text x={gx(g.start, gi) + (g.n * (cell + gap)) / 2 - 1} y={404} textAnchor="middle" fontSize={11.5} className="mono" fill="var(--ink-2)">
            {g.label}
          </text>
          {Array.from({ length: g.n }, (_, k) => {
            const i = g.start + k;
            return (
              <g key={i}>
                <rect x={gx(i, gi)} y={414} width={cell} height={cell * 2.4} rx={2.5} fill="var(--cell-zero)" stroke="var(--rule-strong)" strokeWidth={0.6} />
                <motion.rect
                  x={gx(i, gi)}
                  y={414}
                  width={cell}
                  height={cell * 2.4}
                  rx={2.5}
                  fill={diverging(GRAD0[i], 0.3)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2 + (40 - i) * 0.02, duration: 0.3 }}
                />
              </g>
            );
          })}
        </g>
      ))}
      <Appear delay={0.3}>
        <text x={50} y={464} fontSize={13} fill="var(--ink-2)">
          1. zero_grad: all 41 grads start at 0 (blank cells).
        </text>
      </Appear>
      <Appear delay={1.2}>
        <text x={50} y={486} fontSize={13} fill="var(--ink-2)">
          2. backward fills each with d loss / d p, from the output back.
        </text>
      </Appear>
    </Scene>
  );
}

function UpdateStep() {
  const w = PARAMS0[BIG];
  const g = GRAD0[BIG];
  return (
    <Scene preds={RUN.preds[1]} params={RUN.params[1]} highlight={BIG}>
      <LossDots upto={1} />
      <Card x={30} y={350} w={540} h={160} tone="ok" />
      <text x={50} y={378} fontSize={14.5} className="mono" fontWeight={650}>
        p.data -= lr * p.grad
      </text>
      <Appear delay={0.4}>
        <text x={50} y={408} fontSize={13.5} fill="var(--ink-2)">
          The highlighted weight (W2, first row, first column):
        </text>
        <Lines x={50} y={436} lines={[`${w.toFixed(4)} - ${LR} × (${g.toFixed(4)}) = ${(w - LR * g).toFixed(4)}`]} mono size={14} />
      </Appear>
      <Appear delay={0.9}>
        <Lines
          x={50}
          y={466}
          lines={["Its gradient is negative, so it goes up. All 41 move at once,", `each against its own gradient. Loss: ${f3(RUN.losses[0])} → ${f3(RUN.losses[1])}.`]}
          size={13}
          gap={21}
          color="var(--ink-2)"
        />
      </Appear>
    </Scene>
  );
}

function Repeat({ playing }: { playing: boolean }) {
  const [t, setT] = useState(1);
  useEffect(() => {
    if (!playing || t >= STEPS) return;
    const id = setTimeout(() => setT((k) => Math.min(STEPS, k + 1)), t < 30 ? 70 : 30);
    return () => clearTimeout(id);
  }, [t, playing]);
  return (
    <Scene preds={RUN.preds[t]} params={RUN.params[t]}>
      <path d={curvePath(RUN.losses, t)} fill="none" stroke="var(--mark)" strokeWidth={2.4} />
      <circle cx={lx(t)} cy={ly(RUN.losses[t])} r={5} fill="var(--mark)" stroke="var(--ink)" strokeWidth={1.2} />
      <Card x={30} y={350} w={540} h={160} />
      <text x={50} y={382} fontSize={14.5} fontWeight={650}>
        The same five lines, again and again
      </text>
      <text x={50} y={426} fontSize={26} className="mono" fontWeight={700}>
        {`step ${t}`}
      </text>
      <text x={300} y={426} fontSize={26} className="mono" fontWeight={700} fill="var(--mark)">
        {`loss ${f3(RUN.losses[t])}`}
      </text>
      <Lines
        x={50}
        y={462}
        lines={[t >= STEPS ? "Done. Every prediction sits on its target." : "Watch the dots slide onto the diamonds and the", t >= STEPS ? "Press R to replay the run." : "edges change color as the weights move."]}
        size={13.5}
        gap={22}
        color="var(--ink-2)"
      />
    </Scene>
  );
}

/* ------------------------------------------------------------------ */
/* Steps 7 and 8: the learning rate on a loss bowl.                   */
/* ------------------------------------------------------------------ */

const BW0 = -3;
const BW1 = 7;
const BL1 = 25;
const BPX0 = 70;
const BPX1 = 560;
const BPY0 = 96;
const BPY1 = 470;
const bx = (w: number) => BPX0 + ((w - BW0) / (BW1 - BW0)) * (BPX1 - BPX0);
const by = (l: number) => BPY1 - (Math.min(l, BL1 * 1.3) / BL1) * (BPY1 - BPY0);
const BOWL_PATH = Array.from({ length: 121 }, (_, i) => {
  const w = BW0 + ((BW1 - BW0) * i) / 120;
  return `${i === 0 ? "M" : "L"} ${bx(w).toFixed(1)} ${by(bowl(w)).toFixed(1)}`;
}).join(" ");

function Bowl({ children, bare = false }: { children?: ReactNode; bare?: boolean }) {
  return (
    <g>
      <defs>
        <clipPath id="tl-bowl">
          <rect x={BPX0} y={BPY0 - 10} width={BPX1 - BPX0} height={BPY1 - BPY0 + 10} />
        </clipPath>
      </defs>
      <line x1={BPX0} y1={BPY1} x2={BPX1 + 6} y2={BPY1} stroke="var(--ink-3)" />
      {!bare && [-2, 0, 2, 4, 6].map((w) => (
        <text key={w} x={bx(w)} y={BPY1 + 18} textAnchor="middle" fontSize={12} className="mono" fill="var(--ink-3)">
          {w}
        </text>
      ))}
      {!bare && (
        <text x={BPX1 + 10} y={BPY1 + 4} fontSize={13} className="mono" fill="var(--ink-2)">
          w
        </text>
      )}
      <path d={BOWL_PATH} fill="none" stroke="var(--ink)" strokeWidth={2.4} clipPath="url(#tl-bowl)" />
      {!bare && (
        <g>
          <rect x={bx(W_STAR) - 84} y={BPY0 + 6} width={168} height={30} rx={8} fill="var(--card)" stroke="var(--rule-strong)" />
          <text x={bx(W_STAR)} y={BPY0 + 26} textAnchor="middle" fontSize={14} className="mono" fontWeight={600}>
            L(w) = (w - 2)²
          </text>
        </g>
      )}
      <line x1={bx(W_STAR)} y1={BPY1} x2={bx(W_STAR)} y2={BPY1 - 8} stroke="var(--ok)" strokeWidth={2} />
      {children}
    </g>
  );
}

function Path({ ws, animate = false, color = "var(--accent)" }: { ws: number[]; animate?: boolean; color?: string }) {
  const pts = ws.map((w) => ({ x: bx(w), y: by(bowl(w)), out: w < BW0 || w > BW1 }));
  return (
    <g clipPath="url(#tl-bowl)">
      {pts.slice(1).map((p, i) => (
        <motion.line
          key={`l${i}`}
          x1={pts[i].x}
          y1={pts[i].y}
          x2={p.x}
          y2={p.y}
          stroke={color}
          strokeWidth={1.6}
          opacity={0.7}
          initial={animate ? { pathLength: 0, opacity: 0 } : false}
          animate={{ pathLength: 1, opacity: 0.7 }}
          transition={{ delay: animate ? 0.4 + i * 0.35 : 0, duration: 0.3 }}
        />
      ))}
      {pts.map((p, i) =>
        p.out ? null : (
          <motion.circle
            key={`c${i}`}
            cx={p.x}
            cy={p.y}
            r={i === 0 ? 7 : 5}
            fill={i === 0 ? "var(--mark)" : color}
            stroke="var(--ink)"
            strokeWidth={1.2}
            initial={animate ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={{ delay: animate ? 0.4 + i * 0.35 : 0, duration: 0.25 }}
          />
        ),
      )}
    </g>
  );
}

function BowlIntro() {
  const ws = descend(0.1, 3);
  return (
    <g>
      <Bowl>
        <line x1={bx(-2)} y1={by(bowl(-1) - bowlGrad(-1))} x2={bx(0)} y2={by(bowl(-1) + bowlGrad(-1))} stroke="var(--neg)" strokeWidth={2.4} clipPath="url(#tl-bowl)" />
        <Path ws={ws} animate />
      </Bowl>
      <Appear delay={0.3}>
        <Card x={604} y={100} w={326} h={150} />
        <text x={624} y={130} fontSize={15} fontWeight={650}>
          One weight, one bowl
        </text>
        <Lines
          x={624}
          y={160}
          lines={["Pretend the network had a single", "weight w, and the loss were this", "bowl. The gradient is the slope:", "2(w - 2). The minimum is at w = 2."]}
          size={13.5}
          gap={23}
          color="var(--ink-2)"
        />
      </Appear>
      <Appear delay={0.9}>
        <Card x={604} y={270} w={326} h={170} tone="ok" />
        <text x={624} y={300} fontSize={14} className="mono" fontWeight={650}>
          w ← w - lr × 2(w - 2), lr = 0.1
        </text>
        <Lines
          x={624}
          y={330}
          lines={["w = -1.00, slope -6.0, step +0.60", "w = -0.40, slope -4.8, step +0.48", "w =  0.08, slope -3.8, step +0.38", "w =  0.46 ..."]}
          mono
          size={13}
          gap={24}
        />
      </Appear>
      <Label x={315} y={515} size={13} delay={1.6}>
        Steps shrink by themselves: the slope flattens near the bottom.
      </Label>
    </g>
  );
}

function verdict(lr: number) {
  if (lr < 0.05) return { text: "crawling: 20 steps barely move", tone: "var(--ink-2)" };
  if (lr < 0.49) return { text: "converging smoothly", tone: "var(--ok)" };
  if (lr <= 0.51) return { text: "one step, straight to the bottom", tone: "var(--ok)" };
  if (lr < 0.95) return { text: "overshooting, but settling", tone: "var(--mark)" };
  if (lr < 0.995) return { text: "bouncing, barely settling", tone: "var(--mark)" };
  if (lr <= 1.005) return { text: "bouncing forever, -1 to 5", tone: "var(--bad)" };
  return { text: "diverging: every step overshoots more", tone: "var(--bad)" };
}

function TryLr({ step }: { step: number }) {
  const [lr, setLr] = useState(0.1);
  const ws = descend(lr, 20);
  const last = ws[ws.length - 1];
  const v = verdict(lr);
  const losses = ws.map(bowl);
  const barMax = bowl(W_START);
  return (
    <>
      <Svg label="Gradient descent on a loss bowl with an adjustable learning rate">
        <LoopMap step={step} />
        <Bowl>
          <Path ws={ws} />
        </Bowl>
        <Card x={604} y={100} w={326} h={252} />
        <text x={624} y={130} fontSize={14} fontWeight={650}>
          20 steps from w = -1
        </text>
        <text x={624} y={158} fontSize={14} fontWeight={700} fill={v.tone}>
          {v.text}
        </text>
        <text x={624} y={186} fontSize={13} className="mono" fill="var(--ink-2)">
          {`final w = ${Number.isFinite(last) && Math.abs(last) < 1e5 ? last.toFixed(3) : "huge"}`}
        </text>
        <text x={624} y={208} fontSize={13} className="mono" fill="var(--ink-2)">
          {`each step: error × ${(1 - 2 * lr).toFixed(2)}`}
        </text>
        <text x={624} y={236} fontSize={12} fill="var(--ink-3)">
          loss per step (capped at the start value)
        </text>
        {losses.slice(0, 21).map((l, i) => {
          const h = Math.min(1, l / barMax) * 80;
          const over = l > barMax * 1.001;
          return (
            <g key={i}>
              <rect x={628 + i * 14.5} y={336 - h} width={10} height={Math.max(1, h)} rx={2} fill={over ? "var(--bad)" : i === 0 ? "var(--mark)" : "var(--accent)"} />
            </g>
          );
        })}
        <line x1={624} y1={337} x2={926} y2={337} stroke="var(--ink-3)" />
      </Svg>
      <StageOverlay position="bottom-right" className="w-[300px]">
        <Slider label="Learning rate" value={lr} min={0.01} max={1.1} step={0.01} onChange={setLr} format={(x) => `lr = ${x.toFixed(2)}`} hint="Try 0.02, 0.3, 0.5, 0.9, 1.05." />
      </StageOverlay>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Step 9: forgetting zero_grad.                                      */
/* ------------------------------------------------------------------ */

const CX0 = 76;
const CX1 = 520;
const CY0 = 120;
const CY1 = 430;
const cx = (t: number) => CX0 + (t / STEPS) * (CX1 - CX0);
const cy = (v: number) => CY1 - (Math.min(v, 1.05) / 1) * (CY1 - CY0);
const cpath = (ls: number[]) => ls.map((v, t) => `${t === 0 ? "M" : "L"} ${cx(t).toFixed(1)} ${cy(v).toFixed(1)}`).join(" ");

function ForgotZeroGrad() {
  const tail = RUN_NOZERO.losses.slice(50);
  const lo = Math.min(...tail);
  const hi = Math.max(...tail);
  const nz = descend(0.1, 30, false);
  return (
    <g>
      <text x={CX0 - 40} y={104} fontSize={13.5} fontWeight={650} fill="var(--ink-2)">
        the real network, lr = 0.1, 100 steps
      </text>
      <line x1={CX0} y1={CY0} x2={CX0} y2={CY1} stroke="var(--ink-3)" />
      <line x1={CX0} y1={CY1} x2={CX1 + 4} y2={CY1} stroke="var(--ink-3)" />
      {[0, 0.5, 1].map((v) => (
        <text key={v} x={CX0 - 8} y={cy(v) + 4} textAnchor="end" fontSize={12} className="mono" fill="var(--ink-3)">
          {v.toFixed(1)}
        </text>
      ))}
      {[0, 50, 100].map((t) => (
        <text key={t} x={cx(t)} y={CY1 + 18} textAnchor="middle" fontSize={12} className="mono" fill="var(--ink-3)">
          {t}
        </text>
      ))}
      <motion.path d={cpath(RUN.losses)} fill="none" stroke="var(--ok)" strokeWidth={2.6} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.6, ease: "linear" }} />
      <motion.path d={cpath(RUN_NOZERO.losses)} fill="none" stroke="var(--bad)" strokeWidth={2.2} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.6, delay: 0.3, ease: "linear" }} />
      <Appear delay={1.8}>
        <rect x={CX1 - 214} y={CY0 + 4} width={210} height={56} rx={10} fill="var(--card)" stroke="var(--rule-strong)" />
        <line x1={CX1 - 200} y1={CY0 + 24} x2={CX1 - 176} y2={CY0 + 24} stroke="var(--ok)" strokeWidth={3} />
        <text x={CX1 - 168} y={CY0 + 28} fontSize={12.5}>
          {`with zero_grad: ${f3(RUN.losses[STEPS])}`}
        </text>
        <line x1={CX1 - 200} y1={CY0 + 46} x2={CX1 - 176} y2={CY0 + 46} stroke="var(--bad)" strokeWidth={3} />
        <text x={CX1 - 168} y={CY0 + 50} fontSize={12.5}>
          {`without: ${lo.toFixed(2)} to ${hi.toFixed(2)}`}
        </text>
      </Appear>
      <Label x={(CX0 + CX1) / 2} y={CY1 + 46} size={13} color="var(--ink)" delay={2}>
        Without zero_grad the loss never settles, even after 100 steps.
      </Label>

      <Appear delay={0.6}>
        <Card x={566} y={86} w={364} h={176} tone="bad" />
        <text x={586} y={116} fontSize={14.5} fontWeight={650}>
          What goes wrong
        </text>
        <Lines
          x={586}
          y={144}
          lines={["backward adds into .grad. Without a reset,", "step t moves by lr × (g1 + g2 + … + gt).", "Downhill the sum keeps growing, so steps", "grow and overshoot. At the bottom g is near", "0, but the sum is not: the weights keep going."]}
          size={13}
          gap={22}
          color="var(--ink)"
        />
      </Appear>
      <Appear delay={1.2}>
        <g transform="translate(548 236) scale(0.55)">
          <Bowl bare>
            <Path ws={nz} color="var(--bad)" />
          </Bowl>
        </g>
        <text x={748} y={514} textAnchor="middle" fontSize={12.5} fill="var(--ink-2)">
          Same bug on the bowl: w swings from -1 to 5, forever.
        </text>
      </Appear>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Step 10: recap.                                                    */
/* ------------------------------------------------------------------ */

const COMPARE = [
  ["", "this lesson", "GPT-2 small"],
  ["parameters", "41", "124 million"],
  ["data per step", "4 examples", "B × T tokens, ~0.5M"],
  ["forward", "3 small layers", "embeddings, 12 blocks"],
  ["loss", "mean squared error", "cross-entropy, next token"],
  ["update", "SGD, lr = 0.1", "AdamW, lr schedule"],
];

function Recap() {
  return (
    <g>
      <Appear delay={0.1}>
        <text x={480} y={100} textAnchor="middle" fontSize={15} fontWeight={650}>
          The loop does not change. Only the scale does.
        </text>
      </Appear>
      {COMPARE.map((row, r) => (
        <Appear key={r} delay={0.2 + r * 0.12}>
          {r > 0 && <line x1={110} y1={128 + r * 50 - 22} x2={850} y2={128 + r * 50 - 22} stroke="var(--rule)" />}
          {row.map((c, k) => (
            <text
              key={k}
              x={k === 0 ? 120 : k === 1 ? 420 : 660}
              y={128 + r * 50 + 6}
              textAnchor={k === 0 ? "start" : "middle"}
              fontSize={r === 0 ? 13.5 : 14.5}
              fontWeight={r === 0 || k === 0 ? 650 : 500}
              className={k > 0 && r > 0 ? "mono" : undefined}
              fill={r === 0 ? "var(--ink-2)" : "var(--ink)"}
            >
              {c}
            </text>
          ))}
        </Appear>
      ))}
      <Appear delay={1}>
        <rect x={110} y={420} width={740} height={84} rx={14} fill="var(--mark-soft)" stroke="var(--mark)" />
        <text x={480} y={452} textAnchor="middle" fontSize={15} className="mono" fontWeight={650}>
          forward → loss → zero_grad → backward → update
        </text>
        <text x={480} y={482} textAnchor="middle" fontSize={13.5} fill="var(--ink-2)">
          Same five lines for 41 parameters or 124 million. You will run it on a GPT on Day 5.
        </text>
      </Appear>
    </g>
  );
}

/* ------------------------------------------------------------------ */

export function Stage({ step, playing }: StageProps) {
  if (step === 7) return <TryLr step={step} />;
  return (
    <Svg label="The training loop on a tiny network">
      <LoopMap step={step} />
      {step === 0 && <Setup />}
      {step === 1 && <ForwardStep />}
      {step === 2 && <LossStep />}
      {step === 3 && <BackwardStep />}
      {step === 4 && <UpdateStep />}
      {step === 5 && <Repeat playing={playing} />}
      {step === 6 && <BowlIntro />}
      {step === 8 && <ForgotZeroGrad />}
      {step === 9 && <Recap />}
    </Svg>
  );
}
