"use client";

/**
 * SVG building blocks shared by every lesson stage.
 *
 * Coordinates live in the Svg's viewBox (960 x 540 by default), so a stage is
 * laid out once and scales to any screen. Positions are centers unless a prop
 * says otherwise.
 */

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { diverging, inkOn, sequential, tokenTint } from "@/lib/color";

export const EASE = [0.22, 1, 0.36, 1] as const;

export type Tone = "ink" | "accent" | "mark" | "q" | "k" | "v" | "ok" | "bad" | "violet" | "muted";

const TONE: Record<Tone, { stroke: string; fill: string; text: string }> = {
  ink: { stroke: "var(--ink)", fill: "var(--card)", text: "var(--ink)" },
  accent: { stroke: "var(--accent)", fill: "var(--accent-soft)", text: "var(--ink)" },
  mark: { stroke: "var(--mark)", fill: "var(--mark-soft)", text: "var(--ink)" },
  q: { stroke: "var(--q)", fill: "var(--q-soft)", text: "var(--ink)" },
  k: { stroke: "var(--k)", fill: "var(--k-soft)", text: "var(--ink)" },
  v: { stroke: "var(--v)", fill: "var(--v-soft)", text: "var(--ink)" },
  ok: { stroke: "var(--ok)", fill: "var(--ok-soft)", text: "var(--ink)" },
  bad: { stroke: "var(--bad)", fill: "var(--bad-soft)", text: "var(--ink)" },
  violet: { stroke: "var(--violet)", fill: "var(--violet-soft)", text: "var(--ink)" },
  muted: { stroke: "var(--rule-strong)", fill: "var(--card-2)", text: "var(--ink-3)" },
};

export const toneColor = (t: Tone) => TONE[t].stroke;

/** Rough text width so chips and pills can size themselves. */
export function textWidth(text: string, size: number, mono = false) {
  return text.length * size * (mono ? 0.61 : 0.54);
}

export function Svg({
  w = 960,
  h = 540,
  children,
  label,
}: {
  w?: number;
  h?: number;
  children: ReactNode;
  label?: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="stage-svg block h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={label}
    >
      <defs>
        <marker id="arrow-ink" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--ink)" />
        </marker>
        {(["accent", "mark", "q", "k", "v", "ok", "bad", "violet", "muted"] as Tone[]).map((t) => (
          <marker key={t} id={`arrow-${t}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={TONE[t].stroke} />
          </marker>
        ))}
        <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="var(--paper-2)" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--rule-strong)" strokeWidth="2" />
        </pattern>
      </defs>
      {children}
    </svg>
  );
}

/** Fade + rise in, with an optional delay. Wrap groups that should enter together. */
export function Appear({
  children,
  delay = 0,
  y = 8,
  duration = 0.5,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  duration?: number;
}) {
  return (
    <motion.g
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </motion.g>
  );
}

/** A labelled station: the boxes on a diagram. */
export function Box({
  x,
  y,
  w = 150,
  h = 64,
  title,
  sub,
  tone = "ink",
  active = false,
  dim = false,
  radius = 14,
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  title: string;
  sub?: string;
  tone?: Tone;
  active?: boolean;
  dim?: boolean;
  radius?: number;
}) {
  const t = TONE[tone];
  return (
    <motion.g animate={{ opacity: dim ? 0.35 : 1 }} transition={{ duration: 0.4 }}>
      {active && (
        <motion.rect
          x={x - w / 2 - 6}
          y={y - h / 2 - 6}
          width={w + 12}
          height={h + 12}
          rx={radius + 5}
          fill="none"
          stroke={t.stroke}
          strokeWidth={2}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.2, 0.7, 0.2] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <rect x={x - w / 2} y={y - h / 2 + 3} width={w} height={h} rx={radius} fill={t.stroke} opacity={0.9} />
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={radius} fill={t.fill} stroke={t.stroke} strokeWidth={1.6} />
      <text x={x} y={sub ? y - 4 : y + 5} textAnchor="middle" fontSize={15} fontWeight={650} fill={t.text}>
        {title}
      </text>
      {sub && (
        <text x={x} y={y + 15} textAnchor="middle" fontSize={11.5} className="mono" fill="var(--ink-2)">
          {sub}
        </text>
      )}
    </motion.g>
  );
}

/** A token chip: text on top, optional id below. */
export function Chip({
  x,
  y,
  text,
  id,
  index = 0,
  h = 34,
  fontSize = 15,
  delay = 0,
  highlight = false,
  showSpace = true,
}: {
  x: number;
  y: number;
  text: string;
  id?: number | string;
  index?: number;
  h?: number;
  fontSize?: number;
  delay?: number;
  highlight?: boolean;
  showSpace?: boolean;
}) {
  const tint = tokenTint(index);
  const shown = showSpace ? text.replace(/ /g, "·") : text;
  const w = Math.max(30, textWidth(shown, fontSize, true) + 18);
  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, delay, ease: EASE }}
      style={{ transformOrigin: `${x}px ${y}px`, transformBox: "view-box" }}
    >
      <rect
        x={x - w / 2}
        y={y - h / 2}
        width={w}
        height={h}
        rx={8}
        fill={tint.fill}
        stroke={highlight ? "var(--ink)" : tint.stroke}
        strokeWidth={highlight ? 2 : 1.4}
      />
      <text x={x} y={y + fontSize * 0.35} textAnchor="middle" fontSize={fontSize} className="mono" fill={tint.text} fontWeight={600}>
        {shown}
      </text>
      {id !== undefined && (
        <text x={x} y={y + h / 2 + 15} textAnchor="middle" fontSize={11} className="mono" fill="var(--ink-3)">
          {id}
        </text>
      )}
    </motion.g>
  );
}

export function chipWidth(text: string, fontSize = 15) {
  return Math.max(30, textWidth(text.replace(/ /g, "·"), fontSize, true) + 18);
}

/** A row (or column) of colored cells: one vector. */
export function Cells({
  x,
  y,
  values,
  cell = 14,
  gap = 2,
  vertical = false,
  max = 1,
  delay = 0,
  stagger = 0.02,
  mode = "diverging",
  color,
  outline = false,
  showValues = false,
}: {
  /** Top-left corner. */
  x: number;
  y: number;
  values: number[];
  cell?: number;
  gap?: number;
  vertical?: boolean;
  max?: number;
  delay?: number;
  stagger?: number;
  mode?: "diverging" | "sequential";
  color?: string;
  outline?: boolean;
  showValues?: boolean;
}) {
  const n = values.length;
  const len = n * cell + (n - 1) * gap;
  return (
    <g>
      {outline && (
        <rect
          x={x - 3}
          y={y - 3}
          width={(vertical ? cell : len) + 6}
          height={(vertical ? len : cell) + 6}
          rx={5}
          fill="none"
          stroke="var(--rule-strong)"
        />
      )}
      {values.map((v, i) => {
        const cx = vertical ? x : x + i * (cell + gap);
        const cy = vertical ? y + i * (cell + gap) : y;
        const fill = mode === "diverging" ? diverging(v, max) : sequential(v / max, color);
        const strength = mode === "diverging" ? v / max : v / max;
        return (
          <motion.g
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25, delay: delay + i * stagger }}
          >
            <rect x={cx} y={cy} width={cell} height={cell} rx={Math.min(4, cell / 4)} fill={fill} stroke="var(--rule)" strokeWidth={0.6} />
            {showValues && (
              <text
                x={cx + cell / 2}
                y={cy + cell / 2 + cell * 0.14}
                textAnchor="middle"
                fontSize={cell * 0.36}
                className="mono"
                fill={inkOn(strength)}
              >
                {Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(1)}
              </text>
            )}
          </motion.g>
        );
      })}
    </g>
  );
}

export const cellsLength = (n: number, cell = 14, gap = 2) => n * cell + (n - 1) * gap;

/** A matrix of cells with optional labels, numbers, highlight and masking. */
export function Matrix({
  x,
  y,
  values,
  cell = 30,
  gap = 2,
  max = 1,
  mode = "diverging",
  color,
  rowLabels,
  colLabels,
  showValues = true,
  digits = 1,
  masked,
  highlightRow,
  highlightCol,
  delay = 0,
  stagger = 0.012,
  title,
}: {
  /** Top-left corner of the cell grid. */
  x: number;
  y: number;
  values: number[][];
  cell?: number;
  gap?: number;
  max?: number;
  mode?: "diverging" | "sequential";
  color?: string;
  rowLabels?: string[];
  colLabels?: string[];
  showValues?: boolean;
  digits?: number;
  /** (r, c) => true draws a hatched "not allowed" cell. */
  masked?: (r: number, c: number) => boolean;
  highlightRow?: number;
  highlightCol?: number;
  delay?: number;
  stagger?: number;
  title?: string;
}) {
  const rows = values.length;
  const cols = values[0]?.length ?? 0;
  const W = cols * cell + (cols - 1) * gap;
  const H = rows * cell + (rows - 1) * gap;
  return (
    <g>
      {title && (
        <text x={x + W / 2} y={y - (colLabels ? 30 : 12)} textAnchor="middle" fontSize={13} fontWeight={650} fill="var(--ink-2)">
          {title}
        </text>
      )}
      {colLabels?.map((l, c) => (
        <text key={`c${c}`} x={x + c * (cell + gap) + cell / 2} y={y - 8} textAnchor="middle" fontSize={11} className="mono" fill="var(--ink-3)">
          {l}
        </text>
      ))}
      {rowLabels?.map((l, r) => (
        <text key={`r${r}`} x={x - 8} y={y + r * (cell + gap) + cell / 2 + 4} textAnchor="end" fontSize={11} className="mono" fill="var(--ink-3)">
          {l}
        </text>
      ))}
      {values.map((row, r) =>
        row.map((v, c) => {
          const cx = x + c * (cell + gap);
          const cy = y + r * (cell + gap);
          const isMasked = masked?.(r, c) ?? false;
          const strength = v / (max || 1);
          const fill = isMasked
            ? "url(#hatch)"
            : mode === "diverging"
              ? diverging(v, max)
              : sequential(strength, color);
          return (
            <motion.g
              key={`${r}-${c}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25, delay: delay + (r * cols + c) * stagger }}
            >
              <rect x={cx} y={cy} width={cell} height={cell} rx={Math.min(5, cell / 5)} fill={fill} stroke="var(--rule)" strokeWidth={0.7} />
              {showValues && !isMasked && (
                <text
                  x={cx + cell / 2}
                  y={cy + cell / 2 + cell * 0.13}
                  textAnchor="middle"
                  fontSize={Math.max(8, cell * 0.33)}
                  className="mono"
                  fill={inkOn(mode === "diverging" ? strength : strength * 1.1)}
                >
                  {Number.isFinite(v) ? v.toFixed(digits) : v > 0 ? "∞" : "-∞"}
                </text>
              )}
            </motion.g>
          );
        }),
      )}
      {highlightRow !== undefined && (
        <rect
          x={x - 4}
          y={y + highlightRow * (cell + gap) - 4}
          width={W + 8}
          height={cell + 8}
          rx={7}
          fill="none"
          stroke="var(--ink)"
          strokeWidth={2}
        />
      )}
      {highlightCol !== undefined && (
        <rect
          x={x + highlightCol * (cell + gap) - 4}
          y={y - 4}
          width={cell + 8}
          height={H + 8}
          rx={7}
          fill="none"
          stroke="var(--mark)"
          strokeWidth={2}
        />
      )}
    </g>
  );
}

export const matrixSize = (rows: number, cols: number, cell = 30, gap = 2) => ({
  w: cols * cell + (cols - 1) * gap,
  h: rows * cell + (rows - 1) * gap,
});

/** An arrow that draws itself. Pass `bend` for a gentle curve. */
export function Arrow({
  x1,
  y1,
  x2,
  y2,
  tone = "ink",
  bend = 0,
  delay = 0,
  dashed = false,
  label,
  width = 1.8,
  duration = 0.6,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  tone?: Tone;
  bend?: number;
  delay?: number;
  dashed?: boolean;
  label?: string;
  width?: number;
  duration?: number;
}) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const cx = mx - (dy / len) * bend;
  const cy = my + (dx / len) * bend;
  const d = bend ? `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}` : `M ${x1} ${y1} L ${x2} ${y2}`;
  const stroke = tone === "ink" ? "var(--ink)" : TONE[tone].stroke;
  const lx = bend ? (mx + cx) / 2 : mx;
  const ly = bend ? (my + cy) / 2 : my;
  return (
    <g>
      <motion.path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={width}
        strokeDasharray={dashed ? "5 5" : undefined}
        markerEnd={`url(#arrow-${tone})`}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration, delay, ease: EASE }}
      />
      {label && (
        <Appear delay={delay + duration * 0.6} y={0}>
          <Pill x={lx} y={ly} text={label} />
        </Appear>
      )}
    </g>
  );
}

/** A small rounded label, centered on (x, y). */
export function Pill({
  x,
  y,
  text,
  tone = "ink",
  fontSize = 12,
  mono = true,
  strong = false,
}: {
  x: number;
  y: number;
  text: string;
  tone?: Tone;
  fontSize?: number;
  mono?: boolean;
  strong?: boolean;
}) {
  const w = textWidth(text, fontSize, mono) + 16;
  const h = fontSize + 12;
  const t = TONE[tone];
  return (
    <g>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={h / 2} fill={tone === "ink" ? "var(--card)" : t.fill} stroke={t.stroke} strokeWidth={1.2} />
      <text
        x={x}
        y={y + fontSize * 0.36}
        textAnchor="middle"
        fontSize={fontSize}
        className={mono ? "mono" : undefined}
        fontWeight={strong ? 650 : 500}
        fill="var(--ink)"
      >
        {text}
      </text>
    </g>
  );
}

/** A dot that travels from one point to another, on repeat while playing. */
export function Packet({
  from,
  to,
  tone = "mark",
  playing = true,
  duration = 1.4,
  delay = 0,
  r = 6,
  repeat = true,
}: {
  from: [number, number];
  to: [number, number];
  tone?: Tone;
  playing?: boolean;
  duration?: number;
  delay?: number;
  r?: number;
  repeat?: boolean;
}) {
  const color = TONE[tone].stroke;
  if (!playing) {
    return <circle cx={to[0]} cy={to[1]} r={r} fill={color} opacity={0} />;
  }
  return (
    <motion.circle
      r={r}
      fill={color}
      stroke="var(--card)"
      strokeWidth={2}
      initial={{ cx: from[0], cy: from[1], opacity: 0 }}
      animate={{ cx: [from[0], to[0]], cy: [from[1], to[1]], opacity: [0, 1, 1, 0] }}
      transition={{
        duration,
        delay,
        ease: "easeInOut",
        repeat: repeat ? Infinity : 0,
        repeatDelay: 0.5,
        times: [0, 1],
        opacity: { duration, delay, times: [0, 0.15, 0.85, 1], repeat: repeat ? Infinity : 0, repeatDelay: 0.5 },
      }}
    />
  );
}

/** Plain text helper with sensible defaults. */
export function Label({
  x,
  y,
  children,
  size = 13,
  anchor = "middle",
  weight = 500,
  color = "var(--ink-2)",
  mono = false,
  delay,
}: {
  x: number;
  y: number;
  children: ReactNode;
  size?: number;
  anchor?: "start" | "middle" | "end";
  weight?: number;
  color?: string;
  mono?: boolean;
  delay?: number;
}) {
  const node = (
    <text x={x} y={y} textAnchor={anchor} fontSize={size} fontWeight={weight} fill={color} className={mono ? "mono" : undefined}>
      {children}
    </text>
  );
  return delay === undefined ? node : <Appear delay={delay} y={4}>{node}</Appear>;
}

/** Horizontal bar chart for a probability distribution. */
export function Bars({
  x,
  y,
  labels,
  values,
  width = 220,
  row = 24,
  color = "var(--accent)",
  highlight,
  delay = 0,
  format = (v: number) => `${(v * 100).toFixed(1)}%`,
  max,
}: {
  x: number;
  y: number;
  labels: string[];
  values: number[];
  width?: number;
  row?: number;
  color?: string;
  highlight?: number;
  delay?: number;
  format?: (v: number) => string;
  max?: number;
}) {
  const m = max ?? Math.max(...values, 1e-9);
  return (
    <g>
      {values.map((v, i) => {
        const w = Math.max(2, (v / m) * width);
        const yy = y + i * row;
        const hl = highlight === i;
        return (
          <g key={i}>
            <text x={x - 10} y={yy + row / 2 + 1} textAnchor="end" fontSize={13} className="mono" fill={hl ? "var(--ink)" : "var(--ink-2)"} fontWeight={hl ? 700 : 500}>
              {labels[i]}
            </text>
            <rect x={x} y={yy + 4} width={width} height={row - 8} rx={4} fill="var(--paper-2)" />
            <motion.rect
              x={x}
              y={yy + 4}
              height={row - 8}
              rx={4}
              fill={hl ? "var(--mark)" : color}
              initial={{ width: 0 }}
              animate={{ width: w }}
              transition={{ duration: 0.6, delay: delay + i * 0.04, ease: EASE }}
            />
            <text x={x + width + 8} y={yy + row / 2 + 1} fontSize={12} className="mono" fill="var(--ink-2)">
              {format(v)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/** A big bracket used to group things, e.g. "x 12 layers". */
export function Bracket({
  x,
  y1,
  y2,
  label,
  side = "right",
}: {
  x: number;
  y1: number;
  y2: number;
  label?: string;
  side?: "left" | "right";
}) {
  const d = side === "right" ? 10 : -10;
  return (
    <g>
      <path d={`M ${x} ${y1} q ${d} 0 ${d} 10 L ${x + d} ${y2 - 10} q 0 10 ${-d} 10`} fill="none" stroke="var(--ink-3)" strokeWidth={1.4} />
      {label && (
        <text x={x + d * 1.8} y={(y1 + y2) / 2 + 4} textAnchor={side === "right" ? "start" : "end"} fontSize={13} className="mono" fill="var(--ink-2)">
          {label}
        </text>
      )}
    </g>
  );
}
