"use client";

import { motion } from "motion/react";
import { useState, type ReactNode } from "react";
import { Slider, StageOverlay } from "@/components/viz/controls";
import { Appear, Arrow, Box, Cells, EASE, Label, Packet, Pill, Svg } from "@/components/viz/svg";
import { seededVector } from "@/lib/color";
import type { StageProps } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* The function and its plot.                                         */
/* ------------------------------------------------------------------ */

export const f = (x: number) => 3 * x * x - 4 * x + 5;
export const df = (x: number) => 6 * x - 4;
const H = 0.001;
export const numSlope = (x: number) => (f(x + H) - f(x)) / H;

const X0 = -2;
const X1 = 4;
const Y0 = 0;
const Y1 = 40;
const PX0 = 80;
const PX1 = 560;
const PY0 = 96;
const PY1 = 470;
const sx = (x: number) => PX0 + ((x - X0) / (X1 - X0)) * (PX1 - PX0);
const sy = (y: number) => PY1 - ((y - Y0) / (Y1 - Y0)) * (PY1 - PY0);

const CURVE = (() => {
  const pts: string[] = [];
  for (let i = 0; i <= 120; i++) {
    const x = X0 + ((X1 - X0) * i) / 120;
    pts.push(`${i === 0 ? "M" : "L"} ${sx(x).toFixed(1)} ${sy(f(x)).toFixed(1)}`);
  }
  return pts.join(" ");
})();

const slopeColor = (s: number) => (Math.abs(s) < 0.15 ? "var(--ink)" : s < 0 ? "var(--neg)" : "var(--pos)");
const n2 = (v: number) => (Math.abs(v) < 0.005 ? "0.00" : v.toFixed(2));

/* ------------------------------------------------------------------ */
/* Where am I.                                                        */
/* ------------------------------------------------------------------ */

const MAP = ["One input", "Many inputs", "The loss"];
const STATION_OF_STEP = [0, 0, 0, 0, 0, 1, 1, 1, 2, 3];

function StationMap({ step }: { step: number }) {
  const at = STATION_OF_STEP[step] ?? 0;
  const dx = 170;
  const x0 = 480 - dx;
  return (
    <g>
      {MAP.map((m, i) => {
        const active = i === at;
        const done = i < at;
        const x = x0 + i * dx;
        return (
          <g key={m}>
            {i > 0 && (
              <line
                x1={x - dx + 66}
                y1={40}
                x2={x - 70}
                y2={40}
                stroke={done || active ? "var(--ink)" : "var(--rule-strong)"}
                strokeWidth={1.4}
                markerEnd={done || active ? "url(#arrow-ink)" : "url(#arrow-muted)"}
              />
            )}
            {active && <rect x={x - 64} y={26} width={128} height={30} rx={8} fill="var(--ink)" />}
            <rect
              x={x - 64}
              y={23}
              width={128}
              height={30}
              rx={8}
              fill={active ? "var(--mark)" : done ? "var(--card)" : "var(--card-2)"}
              stroke={active || done ? "var(--ink)" : "var(--rule-strong)"}
              strokeWidth={active ? 1.7 : 1.1}
            />
            <text x={x} y={42.5} textAnchor="middle" fontSize={13} fontWeight={active ? 700 : 600} fill={active || done ? "var(--ink)" : "var(--ink-3)"}>
              {m}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function Card({ x, y, w, h, tone = "ink" }: { x: number; y: number; w: number; h: number; tone?: "ink" | "violet" | "ok" | "mark" }) {
  const stroke = tone === "ink" ? "var(--rule-strong)" : `var(--${tone})`;
  const fill = tone === "ink" ? "var(--card)" : `var(--${tone}-soft)`;
  return <rect x={x} y={y} width={w} height={h} rx={14} fill={fill} stroke={stroke} strokeWidth={1.3} />;
}

function Lines({ x, y, lines, size = 14, gap = 24, color = "var(--ink-2)", mono = false }: { x: number; y: number; lines: string[]; size?: number; gap?: number; color?: string; mono?: boolean }) {
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
/* Plot pieces.                                                       */
/* ------------------------------------------------------------------ */

function Axes({ labels = true }: { labels?: boolean }) {
  const xt = [-2, -1, 0, 1, 2, 3, 4];
  const yt = [10, 20, 30, 40];
  return (
    <g>
      <defs>
        <clipPath id="dv-plot">
          <rect x={PX0} y={PY0} width={PX1 - PX0} height={PY1 - PY0} />
        </clipPath>
      </defs>
      <line x1={PX0} y1={sy(0)} x2={PX1 + 8} y2={sy(0)} stroke="var(--ink-3)" strokeWidth={1.3} />
      <line x1={sx(0)} y1={PY1} x2={sx(0)} y2={PY0 - 6} stroke="var(--ink-3)" strokeWidth={1.3} />
      {xt.map((t) => (
        <g key={t}>
          <line x1={sx(t)} y1={sy(0)} x2={sx(t)} y2={sy(0) + 5} stroke="var(--ink-3)" />
          {labels && (
            <text x={sx(t)} y={sy(0) + 20} textAnchor="middle" fontSize={12} className="mono" fill="var(--ink-3)">
              {t}
            </text>
          )}
        </g>
      ))}
      {yt.map((t) => (
        <g key={t}>
          <line x1={sx(0) - 5} y1={sy(t)} x2={sx(0)} y2={sy(t)} stroke="var(--ink-3)" />
          {labels && (
            <text x={sx(0) - 9} y={sy(t) + 4} textAnchor="end" fontSize={12} className="mono" fill="var(--ink-3)">
              {t}
            </text>
          )}
        </g>
      ))}
      {labels && (
        <text x={PX1 + 12} y={sy(0) + 4} fontSize={13} className="mono" fill="var(--ink-2)">
          x
        </text>
      )}
    </g>
  );
}

function Curve({ draw = false }: { draw?: boolean }) {
  return (
    <motion.path
      d={CURVE}
      fill="none"
      stroke="var(--ink)"
      strokeWidth={2.4}
      clipPath="url(#dv-plot)"
      initial={draw ? { pathLength: 0 } : false}
      animate={{ pathLength: 1 }}
      transition={{ duration: 1.1, ease: EASE }}
    />
  );
}

function Formula() {
  return (
    <g>
      <rect x={96} y={104} width={196} height={32} rx={8} fill="var(--card)" stroke="var(--rule-strong)" />
      <text x={194} y={125} textAnchor="middle" fontSize={14.5} className="mono" fontWeight={600}>
        f(x) = 3x² - 4x + 5
      </text>
    </g>
  );
}

function Dot({ x, color = "var(--mark)", r = 6, delay = 0 }: { x: number; color?: string; r?: number; delay?: number }) {
  return (
    <motion.circle
      cx={sx(x)}
      cy={sy(f(x))}
      r={r}
      fill={color}
      stroke="var(--ink)"
      strokeWidth={1.6}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay, duration: 0.35, ease: EASE }}
      style={{ transformBox: "fill-box", transformOrigin: "center" }}
    />
  );
}

/** A straight line through (x0, f(x0)) with the given slope, clipped to the plot. */
function LineThrough({ x0, slope, span = 1.6, color, width = 2, dashed = false, delay = 0, opacity = 1 }: { x0: number; slope: number; span?: number; color: string; width?: number; dashed?: boolean; delay?: number; opacity?: number }) {
  const y0 = f(x0);
  return (
    <motion.line
      x1={sx(x0 - span)}
      y1={sy(y0 - slope * span)}
      x2={sx(x0 + span)}
      y2={sy(y0 + slope * span)}
      stroke={color}
      strokeWidth={width}
      strokeDasharray={dashed ? "6 5" : undefined}
      strokeLinecap="round"
      clipPath="url(#dv-plot)"
      initial={{ opacity: 0 }}
      animate={{ opacity }}
      transition={{ delay, duration: 0.5 }}
    />
  );
}

function Plot({ draw = false, children }: { draw?: boolean; children?: ReactNode }) {
  return (
    <g>
      <Axes />
      <Curve draw={draw} />
      <Formula />
      {children}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Steps 1 to 5: one input.                                           */
/* ------------------------------------------------------------------ */

function Nudge() {
  return (
    <g>
      <Plot draw>
        <Dot x={3} delay={0.9} />
        <Appear delay={1.1}>
          <line x1={sx(3)} y1={sy(20)} x2={sx(3)} y2={sy(0)} stroke="var(--mark)" strokeDasharray="4 4" />
          <line x1={sx(0)} y1={sy(20)} x2={sx(3)} y2={sy(20)} stroke="var(--mark)" strokeDasharray="4 4" />
          <Pill x={sx(3) - 62} y={sy(20) - 22} text="f(3) = 20" tone="mark" fontSize={13} strong />
        </Appear>
        <Appear delay={1.5}>
          <line x1={sx(3)} y1={sy(0) - 14} x2={sx(3.32)} y2={sy(0) - 14} stroke="var(--ink)" strokeWidth={2} markerEnd="url(#arrow-ink)" />
          <text x={sx(3.16)} y={sy(0) - 22} textAnchor="middle" fontSize={13} className="mono" fontWeight={650}>
            + h
          </text>
        </Appear>
      </Plot>
      <Appear delay={0.4}>
        <Card x={604} y={112} w={326} h={216} />
        <text x={624} y={144} fontSize={15} fontWeight={650}>
          The question
        </text>
        <Lines x={624} y={174} lines={["At x = 3 the function gives 20.", "Push x a tiny bit to the right.", "How far does f move, and which", "way, per unit of push?"]} />
        <text x={624} y={306} fontSize={13.5} fill="var(--accent)" fontWeight={650}>
          That ratio is the derivative.
        </text>
      </Appear>
      <Appear delay={1.8}>
        <Card x={604} y={348} w={326} h={110} tone="violet" />
        <Lines x={624} y={380} lines={["Later, x will be a weight and f", "will be the loss. Same question:", "which way should this weight move?"]} color="var(--ink)" />
      </Appear>
    </g>
  );
}

const SECANTS = [1, 0.5, 0.1];
const TABLE = [1, 0.1, 0.01, 0.001];

function RiseOverRun() {
  return (
    <g>
      <Plot>
        {SECANTS.map((h, i) => {
          const s = (f(3 + h) - f(3)) / h;
          return (
            <g key={h}>
              <LineThrough x0={3} slope={s} span={1.3} color="var(--accent)" width={1.8} delay={0.3 + i * 0.6} opacity={i === SECANTS.length - 1 ? 1 : 0.45} />
              <motion.circle cx={sx(3 + h)} cy={sy(f(3 + h))} r={4.5} fill="var(--accent)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.6 }} />
            </g>
          );
        })}
        <Appear delay={0.5}>
          <line x1={sx(3)} y1={sy(20)} x2={sx(4)} y2={sy(20)} stroke="var(--ink-2)" strokeWidth={1.4} strokeDasharray="4 3" />
          <line x1={sx(4)} y1={sy(20)} x2={sx(4)} y2={sy(37)} stroke="var(--ink-2)" strokeWidth={1.4} strokeDasharray="4 3" />
          <text x={sx(3.5)} y={sy(20) + 18} textAnchor="middle" fontSize={12.5} className="mono" fill="var(--ink-2)">
            h = 1
          </text>
          <text x={sx(4) + 8} y={sy(28.5)} fontSize={12.5} className="mono" fill="var(--ink-2)">
            17
          </text>
        </Appear>
        <Dot x={3} />
      </Plot>
      <Appear delay={0.2}>
        <Card x={604} y={112} w={326} h={226} />
        <text x={624} y={142} fontSize={14} fontWeight={650}>
          Shrink the nudge
        </text>
        <text x={624} y={172} fontSize={12.5} className="mono" fill="var(--ink-3)">
          h
        </text>
        <text x={780} y={172} textAnchor="end" fontSize={12.5} className="mono" fill="var(--ink-3)">
          f(3 + h)
        </text>
        <text x={906} y={172} textAnchor="end" fontSize={12.5} className="mono" fill="var(--ink-3)">
          rise / h
        </text>
        <line x1={624} y1={182} x2={910} y2={182} stroke="var(--rule)" />
      </Appear>
      {TABLE.map((h, i) => {
        const y = 210 + i * 32;
        const last = i === TABLE.length - 1;
        const fv = f(3 + h);
        return (
          <Appear key={h} delay={0.5 + i * 0.4}>
            {last && <rect x={614} y={y - 20} width={306} height={30} rx={7} fill="var(--mark-soft)" />}
            <text x={624} y={y} fontSize={14} className="mono">
              {String(h)}
            </text>
            <text x={780} y={y} textAnchor="end" fontSize={14} className="mono">
              {fv.toFixed(h < 0.01 ? 6 : h < 0.1 ? 4 : 2).replace(/0+$/, "").replace(/\.$/, "")}
            </text>
            <text x={906} y={y} textAnchor="end" fontSize={14} className="mono" fontWeight={last ? 700 : 500}>
              {((fv - 20) / h).toFixed(h < 0.01 ? 3 : h < 0.1 ? 2 : 1)}
            </text>
          </Appear>
        );
      })}
      <Appear delay={2.2}>
        <rect x={604} y={358} width={326} height={46} rx={12} fill="var(--card)" stroke="var(--ink)" strokeWidth={1.4} />
        <text x={767} y={386} textAnchor="middle" fontSize={14} className="mono" fontWeight={600}>
          slope ≈ (f(x + h) - f(x)) / h
        </text>
        <Lines x={612} y={432} lines={["The blue lines are secants. As h", "shrinks they settle on one slope."]} size={13.5} gap={22} />
      </Appear>
    </g>
  );
}

function Tangent() {
  return (
    <g>
      <Plot>
        <LineThrough x0={3} slope={(f(3.1) - 20) / 0.1} span={1.3} color="var(--accent)" width={1.4} opacity={0.35} />
        <LineThrough x0={3} slope={14} span={1.35} color="var(--pos)" width={3} delay={0.3} />
        <Dot x={3} />
        <Appear delay={0.8}>
          <Pill x={sx(3) + 44} y={sy(20) + 30} text="slope 14" tone="mark" fontSize={13} strong />
        </Appear>
      </Plot>
      <Appear delay={0.4}>
        <Card x={604} y={112} w={326} h={150} />
        <text x={624} y={144} fontSize={15} fontWeight={650}>
          The tangent line
        </text>
        <Lines x={624} y={174} lines={["Let h go to 0. The secant becomes", "the line that just touches the", "curve at x = 3. Its slope is f'(3)."]} />
      </Appear>
      <Appear delay={1}>
        <Card x={604} y={280} w={326} h={130} tone="violet" />
        <text x={624} y={312} fontSize={14} fontWeight={650}>
          Calculus agrees
        </text>
        <Lines x={624} y={344} lines={["f'(x) = 6x - 4", "f'(3) = 18 - 4 = 14"]} mono size={14.5} gap={26} color="var(--ink)" />
      </Appear>
      <Label x={767} y={440} size={13} delay={1.4}>
        14.003 from the nudge, 14 exactly. Close enough.
      </Label>
    </g>
  );
}

function TryX({ step }: { step: number }) {
  const [x, setX] = useState(3);
  const s = df(x);
  const ns = numSlope(x);
  const word = Math.abs(s) < 0.15 ? "flat: this is the bottom" : s < 0 ? "negative: f falls as x grows" : "positive: f rises as x grows";
  return (
    <>
      <Svg label="Drag x and watch the tangent slope">
        <StationMap step={step} />
        <Plot>
          <line x1={sx(x)} y1={sy(f(x))} x2={sx(x)} y2={sy(0)} stroke="var(--mark)" strokeDasharray="4 4" />
          <LineThrough x0={x} slope={s} span={1.3} color={slopeColor(s)} width={3} />
          <circle cx={sx(x)} cy={sy(f(x))} r={6.5} fill="var(--mark)" stroke="var(--ink)" strokeWidth={1.6} />
        </Plot>
        <Card x={604} y={112} w={326} h={276} />
        <text x={624} y={144} fontSize={15} fontWeight={650}>
          Live readings
        </text>
        {[
          ["x", x.toFixed(2)],
          ["f(x)", f(x).toFixed(2)],
          ["nudge slope, h = 0.001", ns.toFixed(3)],
          ["exact: 6x - 4", n2(s)],
        ].map(([k, v], i) => (
          <g key={k}>
            <text x={624} y={182 + i * 34} fontSize={13.5} fill="var(--ink-2)">
              {k}
            </text>
            <text x={910} y={182 + i * 34} textAnchor="end" fontSize={15} className="mono" fontWeight={i === 3 ? 700 : 500} fill={i === 3 ? slopeColor(s) : "var(--ink)"}>
              {v}
            </text>
          </g>
        ))}
        <line x1={624} y1={310} x2={910} y2={310} stroke="var(--rule)" />
        <text x={624} y={340} fontSize={14} fontWeight={650} fill={slopeColor(s)}>
          {word}
        </text>
        <text x={624} y={366} fontSize={13} fill="var(--ink-2)">
          Find where the slope is exactly 0.
        </text>
      </Svg>
      <StageOverlay position="bottom-right" className="w-[300px]">
        <Slider label="x" value={x} min={-2} max={4} step={0.01} onChange={setX} format={(v) => v.toFixed(2)} hint="Drag across the whole curve." />
      </StageOverlay>
    </>
  );
}

function Downhill() {
  const pts = [
    { x: -1, dir: 1, pill: "slope -10", px: -48, py: 36 },
    { x: 2 / 3, dir: 0, pill: "slope 0", px: 0, py: -26 },
    { x: 3, dir: -1, pill: "slope 14", px: 42, py: 30 },
  ];
  return (
    <g>
      <Plot>
        {pts.map((p, i) => {
          const s = df(p.x);
          const y = sy(f(p.x));
          return (
            <g key={i}>
              <LineThrough x0={p.x} slope={s} span={0.55} color={slopeColor(s)} width={3} delay={0.2 + i * 0.3} />
              <Dot x={p.x} delay={0.2 + i * 0.3} />
              {p.dir !== 0 && <Arrow x1={sx(p.x) + p.dir * 4} y1={y - 26} x2={sx(p.x) + p.dir * 60} y2={y - 26} tone="ok" width={2.4} delay={0.6 + i * 0.3} />}
              <Appear delay={0.5 + i * 0.3} y={0}>
                <Pill x={sx(p.x) + p.px} y={y + p.py} text={p.pill} fontSize={12.5} strong />
              </Appear>
            </g>
          );
        })}
      </Plot>
      <Appear delay={0.6}>
        <Card x={604} y={112} w={326} h={176} />
        <text x={624} y={144} fontSize={15} fontWeight={650}>
          To make f smaller
        </text>
        <Lines
          x={624}
          y={174}
          lines={["Slope -10: going right lowers f.", "Slope 14: going left lowers f.", "Slope 0: no direction helps.", "Steeper slope, bigger payoff."]}
          gap={26}
        />
      </Appear>
      <Appear delay={1.2}>
        <Card x={604} y={306} w={326} h={150} tone="ok" />
        <text x={767} y={338} textAnchor="middle" fontSize={15} className="mono" fontWeight={650}>
          x ← x - lr × slope
        </text>
        <Lines x={624} y={372} lines={["x = 3, slope 14, lr = 0.01", "x = 3 - 0.14 = 2.86", "f: 20 → 18.10"]} mono size={13.5} gap={25} color="var(--ink)" />
      </Appear>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Steps 6 to 8: many inputs.                                         */
/* ------------------------------------------------------------------ */

const NODE_W = 116;
const NODE_H = 50;
const POS = {
  a: { x: 100, y: 170 },
  b: { x: 100, y: 310 },
  mul: { x: 218, y: 240 },
  e: { x: 330, y: 240 },
  c: { x: 330, y: 380 },
  add: { x: 448, y: 310 },
  d: { x: 560, y: 310 },
};

function ValueNode({ x, y, name, value, active = false, dim = false, tone = "ink" }: { x: number; y: number; name: string; value: number; active?: boolean; dim?: boolean; tone?: "ink" | "mark" }) {
  const stroke = active ? "var(--mark)" : "var(--ink)";
  return (
    <motion.g animate={{ opacity: dim ? 0.4 : 1 }} transition={{ duration: 0.3 }}>
      <rect x={x - NODE_W / 2} y={y - NODE_H / 2 + 3} width={NODE_W} height={NODE_H} rx={12} fill={stroke} />
      <rect
        x={x - NODE_W / 2}
        y={y - NODE_H / 2}
        width={NODE_W}
        height={NODE_H}
        rx={12}
        fill={tone === "mark" ? "var(--mark-soft)" : "var(--card)"}
        stroke={stroke}
        strokeWidth={active ? 2.2 : 1.6}
      />
      <line x1={x - NODE_W / 2 + 34} y1={y - NODE_H / 2 + 8} x2={x - NODE_W / 2 + 34} y2={y + NODE_H / 2 - 8} stroke="var(--rule-strong)" />
      <text x={x - NODE_W / 2 + 17} y={y + 6} textAnchor="middle" fontSize={17} fontWeight={700} fontStyle="italic">
        {name}
      </text>
      <text x={x + 17} y={y + 5.5} textAnchor="middle" fontSize={15} className="mono" fontWeight={600}>
        {n2(value).replace(/\.00$/, ".0")}
      </text>
    </motion.g>
  );
}

function OpNode({ x, y, op }: { x: number; y: number; op: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={18} fill="var(--card-2)" stroke="var(--ink-2)" strokeWidth={1.4} />
      <text x={x} y={y + 6} textAnchor="middle" fontSize={19} fontWeight={700} fill="var(--ink-2)">
        {op === "*" ? "×" : op}
      </text>
    </g>
  );
}

function Edge({ from, to, toOp = false, fromOp = false }: { from: { x: number; y: number }; to: { x: number; y: number }; toOp?: boolean; fromOp?: boolean }) {
  const x1 = from.x + (fromOp ? 18 : NODE_W / 2);
  const x2 = to.x - (toOp ? 20 : NODE_W / 2 + 2);
  return <line x1={x1} y1={from.y} x2={x2} y2={to.y} stroke="var(--ink-2)" strokeWidth={1.5} markerEnd="url(#arrow-ink)" />;
}

function PartialPill({ x, y, text, delay = 0 }: { x: number; y: number; text: string; delay?: number }) {
  return (
    <Appear delay={delay} y={-6}>
      <Pill x={x} y={y} text={text} tone="violet" fontSize={12.5} strong />
    </Appear>
  );
}

function GraphD({ a, b, c, partials = false, flowing = false, playing = true, nudged }: { a: number; b: number; c: number; partials?: boolean; flowing?: boolean; playing?: boolean; nudged?: "a" | "b" | "c" }) {
  const e = a * b;
  const d = e + c;
  return (
    <g>
      <Edge from={POS.a} to={POS.mul} toOp />
      <Edge from={POS.b} to={POS.mul} toOp />
      <Edge from={POS.mul} to={POS.e} fromOp />
      <Edge from={POS.e} to={POS.add} toOp />
      <Edge from={POS.c} to={POS.add} toOp />
      <Edge from={POS.add} to={POS.d} fromOp />
      <OpNode {...POS.mul} op="*" />
      <OpNode {...POS.add} op="+" />
      <ValueNode {...POS.a} name="a" value={a} active={nudged === "a"} />
      <ValueNode {...POS.b} name="b" value={b} active={nudged === "b"} />
      <ValueNode {...POS.c} name="c" value={c} active={nudged === "c"} />
      <ValueNode {...POS.e} name="e" value={e} />
      <ValueNode {...POS.d} name="d" value={d} tone="mark" />
      {flowing && (
        <g>
          <Packet from={[POS.a.x + 58, POS.a.y]} to={[POS.mul.x - 18, POS.mul.y]} tone="accent" playing={playing} duration={0.9} />
          <Packet from={[POS.b.x + 58, POS.b.y]} to={[POS.mul.x - 18, POS.mul.y]} tone="accent" playing={playing} duration={0.9} />
          <Packet from={[POS.e.x + 58, POS.e.y]} to={[POS.add.x - 18, POS.add.y]} tone="accent" playing={playing} duration={0.9} delay={0.9} />
          <Packet from={[POS.c.x + 58, POS.c.y]} to={[POS.add.x - 18, POS.add.y]} tone="accent" playing={playing} duration={0.9} delay={0.9} />
        </g>
      )}
      {partials && (
        <g>
          <PartialPill x={POS.a.x} y={POS.a.y - 44} text={`∂d/∂a = ${n2(b)}`} delay={0.6} />
          <PartialPill x={POS.b.x} y={POS.b.y + 44} text={`∂d/∂b = ${n2(a)}`} delay={1.1} />
          <PartialPill x={POS.c.x} y={POS.c.y + 44} text="∂d/∂c = 1.00" delay={1.6} />
        </g>
      )}
    </g>
  );
}

function ThreeInputs({ playing }: { playing: boolean }) {
  return (
    <g>
      <GraphD a={2} b={-3} c={10} flowing playing={playing} />
      <Appear delay={0.3}>
        <Card x={650} y={112} w={280} h={210} />
        <text x={670} y={144} fontSize={15} fontWeight={650}>
          Forward
        </text>
        <Lines x={670} y={180} lines={["e = a × b", "  = 2 × (-3) = -6", "d = e + c", "  = -6 + 10 = 4"]} mono size={14} gap={27} color="var(--ink)" />
      </Appear>
      <Appear delay={1}>
        <Card x={650} y={340} w={280} h={120} tone="violet" />
        <Lines x={670} y={372} lines={["Three knobs, one output. Nudge", "one knob, hold the others still,", "and read how much d moves."]} color="var(--ink)" size={13.5} />
      </Appear>
    </g>
  );
}

const NUDGES: { v: "a" | "b" | "c"; expr: string; d: string; slope: string; why: string }[] = [
  { v: "a", expr: "a: 2 → 2.001", d: "d = 3.997", slope: "-3.0", why: "= b" },
  { v: "b", expr: "b: -3 → -2.999", d: "d = 4.002", slope: "2.0", why: "= a" },
  { v: "c", expr: "c: 10 → 10.001", d: "d = 4.001", slope: "1.0", why: "always" },
];

function Partials() {
  return (
    <g>
      <GraphD a={2} b={-3} c={10} partials />
      <Appear delay={0.1}>
        <Card x={650} y={112} w={280} h={300} />
        <text x={670} y={144} fontSize={15} fontWeight={650}>
          Nudge each by h = 0.001
        </text>
      </Appear>
      {NUDGES.map((n, i) => {
        const y = 186 + i * 76;
        return (
          <Appear key={n.v} delay={0.5 + i * 0.5}>
            <text x={670} y={y} fontSize={13.5} className="mono">
              {n.expr}
            </text>
            <text x={670} y={y + 24} fontSize={13.5} className="mono" fill="var(--ink-2)">
              {n.d}
            </text>
            <text x={910} y={y + 24} textAnchor="end" fontSize={14} className="mono" fontWeight={700} fill="var(--violet)">
              {`${n.slope} ${n.why}`}
            </text>
            {i < 2 && <line x1={670} y1={y + 44} x2={910} y2={y + 44} stroke="var(--rule)" />}
          </Appear>
        );
      })}
      <Label x={790} y={448} size={13} color="var(--ink)" delay={2.2}>
        In a·b, each input&apos;s slope is the other input.
      </Label>
    </g>
  );
}

function TryValues({ step }: { step: number }) {
  const [a, setA] = useState(2);
  const [b, setB] = useState(-3);
  const c = 10;
  const d = a * b + c;
  return (
    <>
      <Svg label="Change a and b and watch each partial derivative">
        <StationMap step={step} />
        <GraphD a={a} b={b} c={c} />
        <Pill x={POS.a.x} y={POS.a.y - 44} text={`∂d/∂a = ${n2(b)}`} tone="violet" fontSize={12.5} strong />
        <Pill x={POS.b.x} y={POS.b.y + 44} text={`∂d/∂b = ${n2(a)}`} tone="violet" fontSize={12.5} strong />
        <Pill x={POS.c.x} y={POS.c.y + 44} text="∂d/∂c = 1.00" tone="violet" fontSize={12.5} strong />
        <Card x={650} y={112} w={280} h={190} />
        <text x={670} y={144} fontSize={15} fontWeight={650}>
          Live
        </text>
        <Lines x={670} y={178} lines={[`d = ${n2(a)} × ${n2(b)} + 10`, `  = ${n2(d)}`]} mono size={14} gap={26} color="var(--ink)" />
        <line x1={670} y1={222} x2={910} y2={222} stroke="var(--rule)" />
        <Lines x={670} y={250} lines={["∂d/∂a follows b, ∂d/∂b follows a.", "∂d/∂c never changes."]} size={13.5} />
      </Svg>
      <StageOverlay position="bottom-right" className="w-[280px] space-y-3">
        <Slider label="a" value={a} min={-4} max={4} step={0.1} onChange={setA} format={(v) => v.toFixed(1)} />
        <Slider label="b" value={b} min={-4} max={4} step={0.1} onChange={setB} format={(v) => v.toFixed(1)} />
      </StageOverlay>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Step 9: why we care.                                               */
/* ------------------------------------------------------------------ */

function TheLoss({ playing }: { playing: boolean }) {
  const w = seededVector(2024, 28).map((v) => v * 0.9);
  const g = seededVector(77, 28).map((v) => v * 0.8);
  return (
    <g>
      <Label x={60} y={112} size={13} anchor="start" weight={650} color="var(--ink-2)">
        weights w: GPT-2 small has 124,000,000 of them (28 drawn)
      </Label>
      <Cells x={60} y={126} values={w} cell={16} gap={3} />
      <Arrow x1={320} y1={152} x2={320} y2={206} delay={0.3} />
      <Box x={320} y={240} w={250} h={60} title="forward pass" sub="the whole network" tone="ink" />
      <Arrow x1={447} y1={240} x2={540} y2={240} delay={0.6} />
      <Appear delay={0.8}>
        <Box x={620} y={240} w={150} h={60} title="loss" sub="one number" tone="mark" />
      </Appear>
      <Appear delay={1.2}>
        <motion.path
          d="M 620 272 C 620 340, 560 362, 486 364"
          fill="none"
          stroke="var(--violet)"
          strokeWidth={2}
          strokeDasharray="6 5"
          markerEnd="url(#arrow-violet)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: 1.2, ease: EASE }}
        />
        <Pill x={572} y={412} text="backprop (next lesson)" tone="violet" fontSize={12} />
      </Appear>
      <Appear delay={1.6}>
        <Cells x={60} y={374} values={g} cell={16} gap={3} />
        <Label x={60} y={418} size={13} anchor="start" weight={650} color="var(--violet)">
          gradient: ∂loss/∂w for every weight, same shape as w
        </Label>
      </Appear>
      {playing && <Packet from={[620, 274]} to={[488, 364]} tone="violet" playing={playing} duration={1.2} delay={2} />}
      <Appear delay={2}>
        <Card x={712} y={112} w={218} h={330} tone="violet" />
        <text x={730} y={144} fontSize={14.5} fontWeight={650}>
          Why this matters
        </text>
        <Lines
          x={730}
          y={174}
          lines={["The loss is a function", "of every weight.", "", "Nudging one weight at a", "time: 124M + 1 forward", "passes per update.", "", "Backprop: all 124M", "partials from one forward", "and one backward pass."]}
          size={13.5}
          gap={24}
          color="var(--ink)"
        />
      </Appear>
      <Label x={360} y={470} size={13.5} color="var(--ink)" delay={2.3}>
        Each cell in the gradient answers the derivative question for one weight.
      </Label>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Step 10: recap.                                                    */
/* ------------------------------------------------------------------ */

function Recap() {
  return (
    <g>
      <g transform="translate(20 40) scale(0.62)">
        <Axes labels={false} />
        <Curve />
        <LineThrough x0={3} slope={14} span={1.3} color="var(--pos)" width={3.5} />
        <LineThrough x0={-1} slope={-10} span={0.7} color="var(--neg)" width={3.5} />
        <circle cx={sx(3)} cy={sy(20)} r={8} fill="var(--mark)" stroke="var(--ink)" strokeWidth={2} />
        <circle cx={sx(-1)} cy={sy(12)} r={8} fill="var(--mark)" stroke="var(--ink)" strokeWidth={2} />
      </g>
      <g transform="translate(370 20) scale(0.9)">
        <GraphD a={2} b={-3} c={10} />
        <Pill x={POS.a.x} y={POS.a.y - 44} text="∂d/∂a = -3.00" tone="violet" fontSize={12.5} strong />
        <Pill x={POS.b.x} y={POS.b.y + 44} text="∂d/∂b = 2.00" tone="violet" fontSize={12.5} strong />
        <Pill x={POS.c.x} y={POS.c.y + 44} text="∂d/∂c = 1.00" tone="violet" fontSize={12.5} strong />
      </g>
      <Appear delay={0.4}>
        <rect x={40} y={420} width={880} height={96} rx={14} fill="var(--card)" stroke="var(--ink)" strokeWidth={1.4} />
        <text x={64} y={452} fontSize={14} className="mono" fontWeight={600}>
          derivative = (f(x + h) - f(x)) / h, as h → 0
        </text>
        <text x={64} y={480} fontSize={14} fill="var(--ink-2)">
          Sign: which way the output moves. Size: how sensitive it is.
        </text>
        <text x={64} y={504} fontSize={14} fill="var(--ink-2)">
          Many inputs: one partial each. All of them together is the gradient. Step against it to lower the loss.
        </text>
      </Appear>
    </g>
  );
}

/* ------------------------------------------------------------------ */

export function Stage({ step, playing }: StageProps) {
  if (step === 3) return <TryX step={step} />;
  if (step === 7) return <TryValues step={step} />;
  return (
    <Svg label="Derivatives as nudges, on a curve and on a small graph">
      <StationMap step={step} />
      {step === 0 && <Nudge />}
      {step === 1 && <RiseOverRun />}
      {step === 2 && <Tangent />}
      {step === 4 && <Downhill />}
      {step === 5 && <ThreeInputs playing={playing} />}
      {step === 6 && <Partials />}
      {step === 8 && <TheLoss playing={playing} />}
      {step === 9 && <Recap />}
    </Svg>
  );
}
