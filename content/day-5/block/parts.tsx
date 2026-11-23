"use client";

import { motion } from "motion/react";
import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { textWidth, toneColor, type Tone } from "@/components/viz/svg";
import { diverging, inkOn } from "@/lib/color";

/** Tiny strip at the top of the stage: where in the whole GPT you are. */
export function MiniMap({ focus, y = 40 }: { focus: "block" | "all"; y?: number }) {
  const items = ["tokens", "wte + wpe", "block 1", "block 2", "...", "block 12", "ln_f", "lm_head", "logits"];
  const fs = 11.5;
  const widths = items.map((t) => (t === "..." ? 22 : textWidth(t, fs, true) + 16));
  const gap = 12;
  const total = widths.reduce((a, b) => a + b, 0) + gap * (items.length - 1);
  let x = 480 - total / 2;
  const boxes = items.map((t, i) => {
    const b = { t, x, w: widths[i] };
    x += widths[i] + gap;
    return b;
  });
  const isBlock = (t: string) => t.startsWith("block") || t === "...";
  const blockStart = boxes[2].x;
  const blockEnd = boxes[5].x + boxes[5].w;
  return (
    <g>
      {focus === "block" && (
        <rect x={blockStart - 6} y={y - 17} width={blockEnd - blockStart + 12} height={34} rx={10} fill="var(--mark-soft)" stroke="var(--mark)" strokeWidth={1.4} />
      )}
      {boxes.map((b, i) => (
        <g key={i}>
          {i > 0 && <line x1={boxes[i - 1].x + boxes[i - 1].w} y1={y} x2={b.x} y2={y} stroke="var(--rule-strong)" strokeWidth={1.4} />}
          {b.t === "..." ? (
            <text x={b.x + b.w / 2} y={y + 4} textAnchor="middle" fontSize={12} fill="var(--ink-3)">
              ...
            </text>
          ) : (
            <>
              <rect
                x={b.x}
                y={y - 11}
                width={b.w}
                height={22}
                rx={6}
                fill={focus === "all" || isBlock(b.t) ? "var(--card)" : "var(--card-2)"}
                stroke={focus === "block" && isBlock(b.t) ? "var(--ink)" : "var(--rule-strong)"}
                strokeWidth={1.2}
              />
              <text x={b.x + b.w / 2} y={y + 4} textAnchor="middle" fontSize={fs} className="mono" fill={focus === "block" && !isBlock(b.t) ? "var(--ink-3)" : "var(--ink)"}>
                {b.t}
              </text>
            </>
          )}
        </g>
      ))}
    </g>
  );
}

/** A row of big numbered cells with two decimals (Cells only shows one). */
export function NumCells({
  x,
  y,
  values,
  w = 64,
  h = 40,
  gap = 8,
  max = 2,
  delay = 0,
  digits = 2,
  fontSize = 14,
}: {
  x: number;
  y: number;
  values: number[];
  w?: number;
  h?: number;
  gap?: number;
  max?: number;
  delay?: number;
  digits?: number;
  fontSize?: number;
}) {
  return (
    <g>
      {values.map((v, i) => {
        const cx = x + i * (w + gap);
        return (
          <motion.g key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: delay + i * 0.05 }}>
            <rect x={cx} y={y} width={w} height={h} rx={7} fill={diverging(v, max)} stroke="var(--rule)" strokeWidth={0.8} />
            <text x={cx + w / 2} y={y + h / 2 + fontSize * 0.36} textAnchor="middle" fontSize={fontSize} className="mono" fill={inkOn(v / max)} fontWeight={600}>
              {(Math.abs(v) < 0.005 ? 0 : v).toFixed(digits)}
            </text>
          </motion.g>
        );
      })}
    </g>
  );
}

/** A dot that follows a polyline (straight segments), looping while playing. */
export function PolyPacket({
  points,
  tone = "mark",
  playing,
  duration = 2,
  delay = 0,
  r = 6,
  repeat = true,
}: {
  points: [number, number][];
  tone?: Tone;
  playing: boolean;
  duration?: number;
  delay?: number;
  r?: number;
  repeat?: boolean;
}) {
  if (!playing) return null;
  const lens = [0];
  for (let i = 1; i < points.length; i++) {
    lens.push(lens[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  }
  const total = lens[lens.length - 1] || 1;
  const times = lens.map((l) => l / total);
  const color = toneColor(tone);
  return (
    <motion.circle
      r={r}
      fill={color}
      stroke="var(--card)"
      strokeWidth={2}
      initial={{ cx: points[0][0], cy: points[0][1], opacity: 0 }}
      animate={{ cx: points.map((p) => p[0]), cy: points.map((p) => p[1]), opacity: [0, 1, 1, 0] }}
      transition={{
        cx: { duration, delay, times, ease: "linear", repeat: repeat ? Infinity : 0, repeatDelay: 0.4 },
        cy: { duration, delay, times, ease: "linear", repeat: repeat ? Infinity : 0, repeatDelay: 0.4 },
        opacity: { duration, delay, times: [0, 0.06, 0.94, 1], repeat: repeat ? Infinity : 0, repeatDelay: 0.4 },
      }}
    />
  );
}

/** The residual stream: a wide band that every sublayer reads from and writes to. */
export function Band({
  x1,
  x2,
  y,
  h = 26,
  label,
  tone = "muted",
  broken,
}: {
  x1: number;
  x2: number;
  y: number;
  h?: number;
  label?: string;
  tone?: "muted" | "ok" | "bad";
  broken?: number[];
}) {
  const stroke = tone === "ok" ? "var(--ok)" : tone === "bad" ? "var(--bad)" : "var(--rule-strong)";
  const fill = tone === "ok" ? "var(--ok-soft)" : tone === "bad" ? "var(--bad-soft)" : "var(--paper-2)";
  if (broken && broken.length) {
    const cuts = [x1, ...broken.flatMap((b) => [b - 8, b + 8]), x2];
    const segs: [number, number][] = [];
    for (let i = 0; i < cuts.length; i += 2) segs.push([cuts[i], cuts[i + 1]]);
    return (
      <g>
        {segs.map(([a, b], i) => (
          <rect key={i} x={a} y={y - h / 2} width={Math.max(0, b - a)} height={h} rx={6} fill={fill} stroke={stroke} strokeWidth={1.4} strokeDasharray="4 4" />
        ))}
      </g>
    );
  }
  return (
    <g>
      <rect x={x1} y={y - h / 2} width={x2 - x1} height={h} rx={h / 2} fill={fill} stroke={stroke} strokeWidth={1.4} />
      {label && (
        <text x={(x1 + x2) / 2} y={y + 4} textAnchor="middle" fontSize={12} className="mono" fill="var(--ink-2)">
          {label}
        </text>
      )}
    </g>
  );
}

/** The plus where a sublayer's output is added back into the stream. */
export function Plus({ x, y, r = 13, tone = "ink" }: { x: number; y: number; r?: number; tone?: Tone }) {
  const c = tone === "ink" ? "var(--ink)" : toneColor(tone);
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="var(--card)" stroke={c} strokeWidth={1.8} />
      <line x1={x - r * 0.5} y1={y} x2={x + r * 0.5} y2={y} stroke={c} strokeWidth={2} />
      <line x1={x} y1={y - r * 0.5} x2={x} y2={y + r * 0.5} stroke={c} strokeWidth={2} />
    </g>
  );
}

/** A plain polyline that draws itself, optionally with an arrow head. */
export function Wire({
  points,
  tone = "ink",
  width = 1.8,
  delay = 0,
  arrow = false,
  dashed = false,
}: {
  points: [number, number][];
  tone?: Tone;
  width?: number;
  delay?: number;
  arrow?: boolean;
  dashed?: boolean;
}) {
  const d = points.map((p, i) => `${i ? "L" : "M"} ${p[0]} ${p[1]}`).join(" ");
  const stroke = tone === "ink" ? "var(--ink)" : toneColor(tone);
  return (
    <motion.path
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={width}
      strokeLinejoin="round"
      strokeDasharray={dashed ? "5 5" : undefined}
      markerEnd={arrow ? `url(#arrow-${tone})` : undefined}
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    />
  );
}

const PHONE = "(max-width: 767px)";

function usePhone() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(PHONE);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(PHONE).matches,
    () => false,
  );
}

/**
 * Interactive steps: drawing on the left, controls in a side panel. On phones the
 * stage pans sideways, so the controls move into the player's slot under the stage,
 * the same way StageOverlay does it.
 */
export function TryLayout({ svg, controls }: { svg: ReactNode; controls: ReactNode }) {
  const phone = usePhone();
  const slot = phone && typeof document !== "undefined" ? document.getElementById("stage-controls-slot") : null;
  if (slot) {
    return (
      <>
        <div className="absolute inset-0">{svg}</div>
        {createPortal(<div className="rounded-xl border border-rule bg-card p-3">{controls}</div>, slot)}
      </>
    );
  }
  return (
    <div className="absolute inset-0 flex">
      <div className="relative min-h-0 min-w-0 flex-1">{svg}</div>
      <div className="scrollbar-thin w-[290px] shrink-0 overflow-y-auto border-l border-rule bg-card/95 p-4">{controls}</div>
    </div>
  );
}

export function Readout({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "ok" | "bad" | "mark" }) {
  const color = tone === "ok" ? "text-ok" : tone === "bad" ? "text-bad" : "text-ink";
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-rule py-1.5 last:border-b-0">
      <span className="text-[12.5px] text-ink-2">{label}</span>
      <span className="text-right">
        <span className={`tabular font-mono text-[14px] font-semibold ${color}`}>{value}</span>
        {sub && <span className="block text-[11.5px] text-ink-3">{sub}</span>}
      </span>
    </div>
  );
}
