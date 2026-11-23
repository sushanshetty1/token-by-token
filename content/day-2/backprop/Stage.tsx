"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { Slider, StageOverlay } from "@/components/viz/controls";
import { Appear, Arrow, EASE, Label, Packet, Pill, Svg } from "@/components/viz/svg";
import type { StageProps } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Shared drawing pieces.                                             */
/* ------------------------------------------------------------------ */

type Pt = { x: number; y: number };

const fmtV = (v: number, digits = 1) => {
  const s = Math.abs(v) < 0.00005 ? (0).toFixed(digits) : v.toFixed(digits);
  return s === "-0.0" ? "0.0" : s;
};

function Node({
  x,
  y,
  name,
  data,
  grad,
  w = 140,
  h = 60,
  hot = false,
  active = false,
  dim = false,
  digits = 1,
  gradDigits = 1,
  gradDelay = 0,
  bad = false,
  compact = false,
}: {
  x: number;
  y: number;
  name: string;
  data: number;
  grad: number | null;
  w?: number;
  h?: number;
  hot?: boolean;
  active?: boolean;
  dim?: boolean;
  digits?: number;
  gradDigits?: number;
  gradDelay?: number;
  bad?: boolean;
  compact?: boolean;
}) {
  const nameW = name.length > 2 ? 46 : 32;
  const left = x - w / 2;
  const top = y - h / 2;
  const cx = left + nameW + (w - nameW) / 2;
  const edge = active ? "var(--mark)" : "var(--ink)";
  return (
    <motion.g animate={{ opacity: dim ? 0.35 : 1 }} transition={{ duration: 0.35 }}>
      {active && (
        <motion.rect
          x={left - 6}
          y={top - 6}
          width={w + 12}
          height={h + 12}
          rx={16}
          fill="none"
          stroke="var(--mark)"
          strokeWidth={2.2}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.25, 0.9, 0.25] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <rect x={left} y={top + 3} width={w} height={h} rx={12} fill={edge} />
      <rect x={left} y={top} width={w} height={h} rx={12} fill="var(--card)" stroke={edge} strokeWidth={active ? 2.2 : 1.6} />
      {grad !== null && (
        <motion.rect
          x={left + nameW + 4}
          y={y + 2}
          width={w - nameW - 8}
          height={h / 2 - 6}
          rx={6}
          fill={bad ? "var(--bad-soft)" : "var(--violet-soft)"}
          initial={{ opacity: hot ? 0 : 1 }}
          animate={{ opacity: 1 }}
          transition={{ delay: gradDelay, duration: 0.4 }}
        />
      )}
      <line x1={left + nameW} y1={top + 7} x2={left + nameW} y2={top + h - 7} stroke="var(--rule-strong)" />
      <text x={left + nameW / 2} y={y + 6} textAnchor="middle" fontSize={name.length > 2 ? 14 : 17} fontWeight={700} fontStyle="italic">
        {name}
      </text>
      <text x={cx} y={y - 7} textAnchor="middle" fontSize={13.5} className="mono">
        {!compact && <tspan fill="var(--ink-3)">data </tspan>}
        <tspan fontWeight={650}>{fmtV(data, digits)}</tspan>
      </text>
      {grad === null ? (
        <text x={cx} y={y + 19} textAnchor="middle" fontSize={13.5} className="mono" fill="var(--ink-3)">
          {compact ? "?" : "grad ?"}
        </text>
      ) : (
        <motion.text
          x={cx}
          y={y + 19}
          textAnchor="middle"
          fontSize={13.5}
          className="mono"
          fontWeight={700}
          fill={bad ? "var(--bad)" : "var(--violet)"}
          initial={{ opacity: hot ? 0 : 1 }}
          animate={{ opacity: 1 }}
          transition={{ delay: gradDelay, duration: 0.4 }}
        >
          {compact ? fmtV(grad, gradDigits) : `grad ${fmtV(grad, gradDigits)}`}
        </motion.text>
      )}
    </motion.g>
  );
}

function Op({ x, y, op, active = false, r = 18 }: Pt & { op: string; active?: boolean; r?: number }) {
  const label = op === "*" ? "×" : op;
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={active ? "var(--mark-soft)" : "var(--card-2)"} stroke={active ? "var(--mark)" : "var(--ink-2)"} strokeWidth={active ? 2 : 1.4} />
      <text x={x} y={y + (label.length > 1 ? 4.5 : 6)} textAnchor="middle" fontSize={label.length > 1 ? 12 : 19} fontWeight={700} fill="var(--ink-2)" className={label.length > 1 ? "mono" : undefined}>
        {label}
      </text>
    </g>
  );
}

/** Forward edge: a node's right edge to an op, or an op to a node's left edge. */
function Fwd({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--ink-2)" strokeWidth={1.4} markerEnd="url(#arrow-ink)" />;
}

/** Backward edge: violet, drawn right to left, with a gradient packet riding it. */
function Back({ from, to, delay = 0, playing, label, bend = 16 }: { from: Pt; to: Pt; delay?: number; playing: boolean; label?: string; bend?: number }) {
  return (
    <g>
      <Arrow x1={from.x} y1={from.y} x2={to.x} y2={to.y} tone="violet" dashed bend={bend} delay={delay} width={2} label={label} />
      <Packet from={[from.x, from.y]} to={[to.x, to.y]} tone="violet" playing={playing} delay={delay + 0.6} duration={1.1} r={5} />
    </g>
  );
}

function Card({ x, y, w, h, tone = "ink" }: { x: number; y: number; w: number; h: number; tone?: "ink" | "violet" | "ok" | "bad" | "mark" }) {
  const stroke = tone === "ink" ? "var(--rule-strong)" : `var(--${tone})`;
  const fill = tone === "ink" ? "var(--card)" : `var(--${tone}-soft)`;
  return <rect x={x} y={y} width={w} height={h} rx={14} fill={fill} stroke={stroke} strokeWidth={1.3} />;
}

function Lines({ x, y, lines, size = 14, gap = 24, color = "var(--ink)", mono = false, anchor = "start" }: { x: number; y: number; lines: string[]; size?: number; gap?: number; color?: string; mono?: boolean; anchor?: "start" | "middle" }) {
  return (
    <g>
      {lines.map((l, i) => (
        <text key={i} x={x} y={y + i * gap} fontSize={size} fill={color} className={mono ? "mono" : undefined} textAnchor={anchor} style={{ whiteSpace: "pre" }}>
          {l}
        </text>
      ))}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Graph A: L = (a * b + c) * f                                        */
/* ------------------------------------------------------------------ */

const NW = 140;
const NH = 60;
type AKey = "a" | "b" | "c" | "e" | "d" | "f" | "L";
const A_POS: Record<AKey, Pt> = {
  a: { x: 100, y: 130 },
  b: { x: 100, y: 250 },
  e: { x: 332, y: 190 },
  c: { x: 332, y: 320 },
  d: { x: 562, y: 255 },
  f: { x: 562, y: 385 },
  L: { x: 802, y: 320 },
};
const A_OPS = {
  m1: { x: 216, y: 190, op: "*", ins: ["a", "b"] as AKey[], out: "e" as AKey },
  p1: { x: 448, y: 255, op: "+", ins: ["e", "c"] as AKey[], out: "d" as AKey },
  m2: { x: 680, y: 320, op: "*", ins: ["d", "f"] as AKey[], out: "L" as AKey },
};
type OpKey = keyof typeof A_OPS;

function forwardA(a: number, b: number, c: number, f: number) {
  const e = a * b;
  const d = e + c;
  const L = d * f;
  const data: Record<AKey, number> = { a, b, c, e, d, f, L };
  const grad: Record<AKey, number> = { L: 1, d: f, f: d, e: f, c: f, a: b * f, b: a * f };
  return { data, grad };
}

const BASE = forwardA(2, -3, 10, -2);

const rightOf = (p: Pt): Pt => ({ x: p.x + NW / 2, y: p.y });
const leftOf = (p: Pt): Pt => ({ x: p.x - NW / 2, y: p.y });

function GraphA({
  known,
  hotOp,
  values = BASE,
  playing,
  flowForward = false,
  showBack = true,
  dimExcept,
}: {
  known: AKey[];
  hotOp?: OpKey;
  values?: ReturnType<typeof forwardA>;
  playing: boolean;
  flowForward?: boolean;
  showBack?: boolean;
  dimExcept?: AKey[];
}) {
  const hot = hotOp ? A_OPS[hotOp] : undefined;
  return (
    <g>
      {(Object.keys(A_OPS) as OpKey[]).map((k) => {
        const o = A_OPS[k];
        const out = A_POS[o.out];
        return (
          <g key={k}>
            {o.ins.map((i) => {
              const p = rightOf(A_POS[i]);
              return <Fwd key={i} x1={p.x} y1={p.y} x2={o.x - 20} y2={o.y + (A_POS[i].y < o.y ? -6 : A_POS[i].y > o.y ? 6 : 0)} />;
            })}
            <Fwd x1={o.x + 18} y1={o.y} x2={leftOf(out).x - 2} y2={out.y} />
            <Op x={o.x} y={o.y} op={o.op} active={hotOp === k} />
          </g>
        );
      })}
      {(Object.keys(A_POS) as AKey[]).map((k) => (
        <Node
          key={k}
          {...A_POS[k]}
          name={k}
          data={values.data[k]}
          grad={known.includes(k) ? values.grad[k] : null}
          hot={!!hot && hot.ins.includes(k)}
          gradDelay={hot && hot.ins.includes(k) ? 0.9 + hot.ins.indexOf(k) * 0.25 : 0}
          active={!!hot && hot.ins.includes(k)}
          dim={dimExcept ? !dimExcept.includes(k) : false}
        />
      ))}
      {flowForward && (
        <g>
          {(Object.keys(A_OPS) as OpKey[]).map((k, j) => {
            const o = A_OPS[k];
            return o.ins.map((i) => (
              <Packet key={`${k}${i}`} from={[rightOf(A_POS[i]).x, A_POS[i].y]} to={[o.x - 18, o.y]} tone="accent" playing={playing} delay={j * 0.8} duration={0.8} r={5} />
            ));
          })}
        </g>
      )}
      {hot && showBack && (
        <g>
          <Back from={leftOf(A_POS[hot.out])} to={{ x: hot.x + 20, y: hot.y + 2 }} playing={playing} delay={0.1} bend={0} />
          {hot.ins.map((i, j) => (
            <Back key={i} from={{ x: hot.x - 18, y: hot.y + 8 }} to={{ x: rightOf(A_POS[i]).x + 4, y: A_POS[i].y + 16 }} playing={playing} delay={0.5 + j * 0.25} bend={A_POS[i].y < hot.y ? -22 : 22} />
          ))}
        </g>
      )}
    </g>
  );
}

function RuleCard({ title, lines, delay = 0.8, tone = "ink" }: { title: string; lines: string[]; delay?: number; tone?: "ink" | "violet" }) {
  return (
    <Appear delay={delay}>
      <Card x={36} y={404} w={428} h={116} tone={tone} />
      <text x={56} y={432} fontSize={14.5} fontWeight={650}>
        {title}
      </text>
      <Lines x={56} y={458} lines={lines} mono size={13} gap={22} />
    </Appear>
  );
}

/* ------------------------------------------------------------------ */
/* Steps 1 to 5.                                                      */
/* ------------------------------------------------------------------ */

function Forward({ playing }: { playing: boolean }) {
  return (
    <g>
      <GraphA known={[]} playing={playing} flowForward />
      <RuleCard title="Forward pass, left to right" lines={["e = a × b = 2 × (-3) = -6", "d = e + c = -6 + 10 = 4", "L = d × f = 4 × (-2) = -8"]} delay={0.4} />
      <Appear delay={1}>
        <Card x={640} y={88} w={290} h={128} tone="violet" />
        <text x={660} y={118} fontSize={14.5} fontWeight={650}>
          Goal
        </text>
        <Lines x={660} y={144} lines={["Fill in every grad: how much L", "moves per nudge of that value.", "One sweep, right to left."]} size={13.5} gap={22} />
      </Appear>
    </g>
  );
}

function Seed({ playing }: { playing: boolean }) {
  return (
    <g>
      <GraphA known={["L"]} playing={playing} />
      <Appear delay={0.2}>
        <motion.rect
          x={A_POS.L.x - NW / 2 - 6}
          y={A_POS.L.y - NH / 2 - 6}
          width={NW + 12}
          height={NH + 12}
          rx={16}
          fill="none"
          stroke="var(--violet)"
          strokeWidth={2.2}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <Pill x={A_POS.L.x} y={A_POS.L.y + 58} text="L.grad = 1.0" tone="violet" fontSize={13} strong />
      </Appear>
      <RuleCard title="Start at the output" lines={["L.grad = dL/dL = 1.0", "Nudge L by h and L moves by h.", "Every other grad starts at 0."]} />
    </g>
  );
}

function TimesRule({ playing }: { playing: boolean }) {
  return (
    <g>
      <GraphA known={["L", "d", "f"]} hotOp="m2" playing={playing} />
      <RuleCard title="Multiply: out = x × y" lines={["d.grad += f.data × L.grad = -2 × 1", "f.grad += d.data × L.grad =  4 × 1", "each input gets the other input"]} tone="violet" />
    </g>
  );
}

function PlusRule({ playing }: { playing: boolean }) {
  return (
    <g>
      <GraphA known={["L", "d", "f", "e", "c"]} hotOp="p1" playing={playing} />
      <RuleCard title="Add: out = x + y" lines={["e.grad += 1.0 × d.grad = -2", "c.grad += 1.0 × d.grad = -2", "+ copies the gradient to both"]} tone="violet" />
    </g>
  );
}

function ChainRule({ playing }: { playing: boolean }) {
  return (
    <g>
      <GraphA known={["L", "d", "f", "e", "c", "a", "b"]} hotOp="m1" playing={playing} />
      <RuleCard title="Chain rule: local × upstream" lines={["a.grad += b.data × e.grad = (-3)(-2) = 6", "b.grad += a.data × e.grad = (2)(-2) = -4", "dL/da = dL/de × de/da"]} tone="violet" />
    </g>
  );
}

function TryGraph({ step }: { step: number }) {
  const [a, setA] = useState(2);
  const [f, setF] = useState(-2);
  const vals = forwardA(a, -3, 10, f);
  const h = 0.01;
  const moved = forwardA(a + h, -3, 10, f).data.L - vals.data.L;
  return (
    <>
      <Svg label="Change a and f and watch every gradient update">
        <Header step={step} />
        <GraphA known={["L", "d", "f", "e", "c", "a", "b"]} values={vals} playing={false} />
        <Card x={640} y={84} w={290} h={176} />
        <text x={660} y={112} fontSize={14.5} fontWeight={650}>
          Check a.grad by nudging
        </text>
        <Lines
          x={660}
          y={140}
          lines={["a → a + 0.01, then rerun forward:", `L moves by ${moved.toFixed(4)}`, `a.grad × 0.01 = ${(vals.grad.a * h).toFixed(4)}`]}
          size={13}
          gap={24}
          mono
        />
        <text x={660} y={238} fontSize={12.5} fill="var(--ink-2)">
          Equal here: L is a straight line in a.
        </text>
      </Svg>
      <StageOverlay position="bottom-left" className="w-[270px] space-y-3">
        <Slider label="a" value={a} min={-4} max={4} step={0.1} onChange={setA} format={(v) => v.toFixed(1)} />
        <Slider label="f" value={f} min={-4} max={4} step={0.1} onChange={setF} format={(v) => v.toFixed(1)} hint="Set f to 0 and watch every grad except f's vanish." />
      </StageOverlay>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Step 7: a neuron.                                                  */
/* ------------------------------------------------------------------ */

const B_VAL = 6.881373587019543;
const N_VAL = -6 + B_VAL;
const O_VAL = Math.tanh(N_VAL);
const LOCAL = 1 - O_VAL * O_VAL;

type NKey = "x1" | "w1" | "x2" | "w2" | "x1w1" | "x2w2" | "s" | "b" | "n" | "o";
const NW2 = 112;
const NH2 = 56;
const N_POS: Record<NKey, Pt> = {
  x1: { x: 84, y: 104 },
  w1: { x: 84, y: 188 },
  x2: { x: 84, y: 290 },
  w2: { x: 84, y: 374 },
  x1w1: { x: 284, y: 146 },
  x2w2: { x: 284, y: 332 },
  s: { x: 476, y: 239 },
  b: { x: 476, y: 380 },
  n: { x: 664, y: 310 },
  o: { x: 862, y: 310 },
};
const N_DATA: Record<NKey, number> = { x1: 2, w1: -3, x2: 0, w2: 1, x1w1: -6, x2w2: 0, s: -6, b: B_VAL, n: N_VAL, o: O_VAL };
const N_GRAD: Record<NKey, number> = {
  o: 1,
  n: LOCAL,
  s: LOCAL,
  b: LOCAL,
  x1w1: LOCAL,
  x2w2: LOCAL,
  x1: -3 * LOCAL,
  w1: 2 * LOCAL,
  x2: 1 * LOCAL,
  w2: 0 * LOCAL,
};
const N_WAVE: Record<NKey, number> = { o: 0, n: 1, s: 2, b: 2, x1w1: 3, x2w2: 3, x1: 4, w1: 4, x2: 4, w2: 4 };
const N_OPS = [
  { x: 186, y: 146, op: "*", ins: ["x1", "w1"] as NKey[], out: "x1w1" as NKey, wave: 3 },
  { x: 186, y: 332, op: "*", ins: ["x2", "w2"] as NKey[], out: "x2w2" as NKey, wave: 3 },
  { x: 382, y: 239, op: "+", ins: ["x1w1", "x2w2"] as NKey[], out: "s" as NKey, wave: 2 },
  { x: 570, y: 310, op: "+", ins: ["s", "b"] as NKey[], out: "n" as NKey, wave: 1 },
  { x: 764, y: 310, op: "tanh", ins: ["n"] as NKey[], out: "o" as NKey, wave: 0 },
];
const WAVE_T = 0.75;

function Neuron({ playing }: { playing: boolean }) {
  return (
    <g>
      {N_OPS.map((o, k) => {
        const out = N_POS[o.out];
        return (
          <g key={k}>
            {o.ins.map((i) => (
              <Fwd key={i} x1={N_POS[i].x + NW2 / 2} y1={N_POS[i].y} x2={o.x - (o.op === "tanh" ? 24 : 20)} y2={o.y + (N_POS[i].y < o.y - 4 ? -6 : N_POS[i].y > o.y + 4 ? 6 : 0)} />
            ))}
            <Fwd x1={o.x + (o.op === "tanh" ? 23 : 18)} y1={o.y} x2={out.x - NW2 / 2 - 2} y2={out.y} />
            <Op x={o.x} y={o.y} op={o.op} r={o.op === "tanh" ? 22 : 18} />
            {o.ins.map((i) => (
              <Packet
                key={`p${i}`}
                from={[o.x - 16, o.y + 6]}
                to={[N_POS[i].x + NW2 / 2, N_POS[i].y + 12]}
                tone="violet"
                playing={playing}
                delay={0.4 + o.wave * WAVE_T}
                duration={0.7}
                r={4.5}
                repeat={false}
              />
            ))}
          </g>
        );
      })}
      {(Object.keys(N_POS) as NKey[]).map((k) => (
        <Node
          key={k}
          {...N_POS[k]}
          w={NW2}
          h={NH2}
          name={k}
          data={N_DATA[k]}
          grad={N_GRAD[k]}
          hot
          gradDelay={0.3 + N_WAVE[k] * WAVE_T}
          digits={k === "b" || k === "n" || k === "o" ? 4 : 1}
          gradDigits={k === "x1" || k === "w1" || k === "x2" || k === "w2" ? 1 : 2}
          compact
        />
      ))}
      <Appear delay={0.3 + 4 * WAVE_T + 0.4}>
        <path d={`M ${N_POS.w2.x + 30} ${N_POS.w2.y + 34} L ${N_POS.w2.x + 30} ${N_POS.w2.y + 56} L 196 ${N_POS.w2.y + 56}`} fill="none" stroke="var(--mark)" strokeWidth={1.5} />
        <text x={204} y={N_POS.w2.y + 61} fontSize={13} fill="var(--ink)">
          x2 = 0, so w2 learns nothing from this example
        </text>
      </Appear>
      <g>
        <rect x={28} y={448} width={150} height={44} rx={9} fill="var(--card)" stroke="var(--rule-strong)" />
        <text x={40} y={466} fontSize={12} className="mono" fill="var(--ink)">
          top: data
        </text>
        <text x={40} y={483} fontSize={12} className="mono" fill="var(--violet)" fontWeight={650}>
          bottom: grad
        </text>
      </g>
      <Appear delay={0.6}>
        <Card x={604} y={90} w={326} h={150} tone="violet" />
        <text x={624} y={118} fontSize={14.5} fontWeight={650}>
          New rule: tanh
        </text>
        <Lines x={624} y={146} lines={["o = tanh(n), do/dn = 1 - o²", "n.grad = (1 - 0.7071²) × 1", "       = 0.5 × 1 = 0.5"]} mono size={13} gap={22} />
        <text x={624} y={222} fontSize={12.5} fill="var(--ink-2)">
          Then × and + exactly as before.
        </text>
      </Appear>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Steps 8 and 9: a value used twice.                                 */
/* ------------------------------------------------------------------ */

function TwiceGraph({ aGrad, bad = false, playing }: { aGrad: number | null; bad?: boolean; playing: boolean }) {
  const a = { x: 330, y: 168 };
  const op = { x: 480, y: 168 };
  const b = { x: 630, y: 168 };
  return (
    <g>
      <path d={`M ${a.x + 70} ${a.y - 10} Q ${(a.x + op.x) / 2 + 20} ${a.y - 52} ${op.x - 16} ${op.y - 10}`} fill="none" stroke="var(--ink-2)" strokeWidth={1.4} markerEnd="url(#arrow-ink)" />
      <path d={`M ${a.x + 70} ${a.y + 10} Q ${(a.x + op.x) / 2 + 20} ${a.y + 52} ${op.x - 16} ${op.y + 10}`} fill="none" stroke="var(--ink-2)" strokeWidth={1.4} markerEnd="url(#arrow-ink)" />
      <text x={(a.x + op.x) / 2 + 22} y={a.y - 36} textAnchor="middle" fontSize={12} className="mono" fill="var(--ink-3)">
        self
      </text>
      <text x={(a.x + op.x) / 2 + 22} y={a.y + 48} textAnchor="middle" fontSize={12} className="mono" fill="var(--ink-3)">
        other
      </text>
      <Fwd x1={op.x + 18} y1={op.y} x2={b.x - 72} y2={b.y} />
      <Op x={op.x} y={op.y} op="+" />
      <Node x={a.x} y={a.y} name="a" data={3} grad={aGrad} bad={bad} hot gradDelay={0.5} />
      <Node x={b.x} y={b.y} name="b" data={6} grad={1} />
      {aGrad !== null && (
        <>
          <Packet from={[op.x - 14, op.y - 12]} to={[a.x + 72, a.y - 14]} tone="violet" playing={playing} duration={0.9} />
          <Packet from={[op.x - 14, op.y + 12]} to={[a.x + 72, a.y + 14]} tone="violet" playing={playing} duration={0.9} delay={0.45} />
        </>
      )}
      <text x={480} y={244} textAnchor="middle" fontSize={13.5} className="mono" fill="var(--ink-2)">
        b = a + a = 2a, so the true db/da is 2
      </text>
    </g>
  );
}

function UsedTwice({ playing }: { playing: boolean }) {
  return (
    <g>
      <TwiceGraph aGrad={null} playing={playing} />
      <Appear delay={0.4}>
        <Card x={210} y={290} w={540} h={196} />
        <text x={232} y={322} fontSize={14.5} fontWeight={650}>
          A first draft of __add__&apos;s backward, with = instead of +=
        </text>
        <rect x={232} y={340} width={496} height={76} rx={8} fill="var(--paper-2)" />
        <Lines x={250} y={370} lines={["self.grad  = 1.0 * out.grad", "other.grad = 1.0 * out.grad"]} mono size={14} gap={28} />
        <text x={232} y={448} fontSize={13.5} fill="var(--ink-2)">
          In b = a + a, self and other are the same object: a.
        </text>
        <text x={232} y={472} fontSize={13.5} fill="var(--ink-2)">
          Both lines write to a.grad. What does it end up as?
        </text>
      </Appear>
    </g>
  );
}

function Accumulate({ playing }: { playing: boolean }) {
  return (
    <g>
      <TwiceGraph aGrad={2} playing={playing} />
      <Appear delay={0.3}>
        <Card x={60} y={282} w={400} h={214} tone="bad" />
        <text x={80} y={312} fontSize={14.5} fontWeight={650}>
          With =, the second write wins
        </text>
        <Lines x={80} y={346} lines={["a.grad  = 1.0 × 1.0   → 1.0", "a.grad  = 1.0 × 1.0   → 1.0"]} mono size={13.5} gap={28} />
        <text x={80} y={420} fontSize={15} className="mono" fontWeight={700} fill="var(--bad)">
          a.grad = 1.0, wrong
        </text>
        <text x={80} y={450} fontSize={13} fill="var(--ink-2)">
          One path&apos;s contribution is lost.
        </text>
        <text x={80} y={474} fontSize={13} fill="var(--ink-2)">
          No error, just a silently wrong gradient.
        </text>
      </Appear>
      <Appear delay={0.9}>
        <Card x={500} y={282} w={400} h={214} tone="ok" />
        <text x={520} y={312} fontSize={14.5} fontWeight={650}>
          With +=, every path adds
        </text>
        <Lines x={520} y={346} lines={["a.grad += 1.0 × 1.0   → 1.0", "a.grad += 1.0 × 1.0   → 2.0"]} mono size={13.5} gap={28} />
        <text x={520} y={420} fontSize={15} className="mono" fontWeight={700} fill="var(--ok)">
          a.grad = 2.0, right
        </text>
        <text x={520} y={450} fontSize={13} fill="var(--ink-2)">
          A value used in k places gets the
        </text>
        <text x={520} y={474} fontSize={13} fill="var(--ink-2)">
          sum of k contributions.
        </text>
      </Appear>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Step 10: topological order.                                        */
/* ------------------------------------------------------------------ */

const TOPO: AKey[] = ["a", "b", "e", "c", "d", "f", "L"];
const TOPO_EDGES: [AKey, AKey][] = [
  ["a", "e"],
  ["b", "e"],
  ["e", "d"],
  ["c", "d"],
  ["d", "L"],
  ["f", "L"],
];

function Topo({ playing }: { playing: boolean }) {
  const tx = (k: AKey) => 96 + TOPO.indexOf(k) * 128;
  const y = 270;
  const w = 118;
  const step = 0.4;
  return (
    <g>
      <Label x={60} y={104} size={13.5} anchor="start" weight={650} color="var(--ink-2)">
        build_topo(L): one valid order. Every forward arrow points right.
      </Label>
      {TOPO_EDGES.map(([s, t], i) => {
        const x1 = tx(s);
        const x2 = tx(t);
        const hgt = 34 + (x2 - x1) * 0.22;
        return (
          <motion.path
            key={i}
            d={`M ${x1 + 10} ${y - 32} C ${x1 + 10} ${y - 32 - hgt}, ${x2 - 10} ${y - 32 - hgt}, ${x2 - 10} ${y - 34}`}
            fill="none"
            stroke="var(--ink-3)"
            strokeWidth={1.4}
            markerEnd="url(#arrow-muted)"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, delay: i * 0.08, ease: EASE }}
          />
        );
      })}
      {TOPO.map((k, i) => {
        const order = TOPO.length - i;
        const at = 0.8 + (order - 1) * step;
        return (
          <g key={k}>
            <Node x={tx(k)} y={y} w={w} h={NH} name={k} data={BASE.data[k]} grad={BASE.grad[k]} hot gradDelay={at} />
            <Appear delay={at} y={-4}>
              <circle cx={tx(k)} cy={y + 56} r={13} fill="var(--mark)" stroke="var(--ink)" strokeWidth={1.4} />
              <text x={tx(k)} y={y + 61} textAnchor="middle" fontSize={13} fontWeight={700}>
                {order}
              </text>
            </Appear>
          </g>
        );
      })}
      <Arrow x1={tx("L") + 20} y1={y + 92} x2={tx("a") - 20} y2={y + 92} tone="violet" width={2.2} delay={0.6} duration={TOPO.length * step} />
      <Label x={480} y={y + 116} size={13.5} color="var(--violet)" weight={650} delay={0.8}>
        backward runs in reversed(topo): L, f, d, c, e, b, a
      </Label>
      {playing && <Packet from={[tx("L"), y + 92]} to={[tx("a"), y + 92]} tone="violet" playing={playing} duration={TOPO.length * step} delay={0.8} />}
      <Appear delay={1 + TOPO.length * step}>
        <Card x={120} y={430} w={720} h={86} tone="violet" />
        <text x={480} y={462} textAnchor="middle" fontSize={14} fontWeight={650}>
          When a node runs its _backward, everything that uses it has already added to its grad.
        </text>
        <text x={480} y={490} textAnchor="middle" fontSize={13.5} fill="var(--ink-2)">
          Run e before d and e.grad is still 0, so a and b would get 0 too.
        </text>
      </Appear>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Step 11: recap.                                                    */
/* ------------------------------------------------------------------ */

function Recap() {
  return (
    <g>
      <GraphA known={["L", "d", "f", "e", "c", "a", "b"]} playing={false} />
      <Appear delay={0.3}>
        <Card x={36} y={404} w={430} h={116} tone="violet" />
        <text x={56} y={432} fontSize={14.5} fontWeight={650}>
          Three local rules
        </text>
        <Lines x={56} y={458} lines={["×     input += other.data × out.grad", "+     input += out.grad", "tanh  input += (1 - t²) × out.grad"]} mono size={13} gap={21} />
      </Appear>
      <Appear delay={0.7}>
        <Card x={650} y={404} w={280} h={116} />
        <text x={670} y={432} fontSize={14.5} fontWeight={650}>
          Bookkeeping
        </text>
        <Lines x={670} y={458} lines={["Seed the output with 1.0.", "Walk reversed topo order.", "Always +=, never =."]} size={13.5} gap={21} />
      </Appear>
    </g>
  );
}

/* ------------------------------------------------------------------ */

const MAP = ["Forward", "Rules", "Neuron", "Twice", "Order"];
const STATION_OF_STEP = [0, 1, 1, 1, 1, 1, 2, 3, 3, 4, 5];

function Header({ step }: { step: number }) {
  const at = STATION_OF_STEP[step] ?? 0;
  const dx = 120;
  const x0 = 480 - dx * 2;
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
                x1={x - dx + 46}
                y1={40}
                x2={x - 50}
                y2={40}
                stroke={done || active ? "var(--ink)" : "var(--rule-strong)"}
                strokeWidth={1.4}
                markerEnd={done || active ? "url(#arrow-ink)" : "url(#arrow-muted)"}
              />
            )}
            {active && <rect x={x - 44} y={26} width={88} height={30} rx={8} fill="var(--ink)" />}
            <rect
              x={x - 44}
              y={23}
              width={88}
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

export function Stage({ step, playing }: StageProps) {
  if (step === 5) return <TryGraph step={step} />;
  return (
    <Svg label="Backpropagation through a small expression graph">
      <Header step={step} />
      {step === 0 && <Forward playing={playing} />}
      {step === 1 && <Seed playing={playing} />}
      {step === 2 && <TimesRule playing={playing} />}
      {step === 3 && <PlusRule playing={playing} />}
      {step === 4 && <ChainRule playing={playing} />}
      {step === 6 && <Neuron playing={playing} />}
      {step === 7 && <UsedTwice playing={playing} />}
      {step === 8 && <Accumulate playing={playing} />}
      {step === 9 && <Topo playing={playing} />}
      {step === 10 && <Recap />}
    </Svg>
  );
}
