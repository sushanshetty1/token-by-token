"use client";

/**
 * Stage pieces shared by the two Day 5 training lessons (train-lab and
 * break-it): a 16:9 frame where HTML can be placed in viewBox units, a loss
 * chart, and a sample panel.
 */

import { motion } from "motion/react";
import { useId, type CSSProperties, type ReactNode } from "react";
import { Svg } from "@/components/viz/svg";

/** viewBox units (960 wide) to container-query width units. */
export const cq = (units: number) => `${units / 9.6}cqw`;
/** Font size in viewBox units with a floor so it stays legible on phones. */
export const fs = (units: number, floor = 9) => `max(${floor}px, ${cq(units)})`;

/** A 16:9 box centered in the stage. SVG and HTML children share one coordinate space. */
export function Frame({ label, svg, children }: { label: string; svg: ReactNode; children?: ReactNode }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="relative aspect-[16/9] max-h-full w-full [container-type:inline-size]">
        <Svg label={label}>{svg}</Svg>
        {children}
      </div>
    </div>
  );
}

/** An HTML box placed in viewBox units (top-left corner, width, optional height). */
export function Html({
  x,
  y,
  w,
  h,
  children,
  className = "",
  style,
}: {
  x: number;
  y: number;
  w: number;
  h?: number;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`absolute ${className}`}
      style={{
        left: `${(x / 960) * 100}%`,
        top: `${(y / 540) * 100}%`,
        width: `${(w / 960) * 100}%`,
        height: h === undefined ? undefined : `${(h / 540) * 100}%`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** An ink button from the system, scaled with the stage. */
export function StageButton({
  children,
  onClick,
  primary = false,
  disabled = false,
  size = 14,
}: {
  children: ReactNode;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
  size?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`btn ${primary ? "btn-primary" : ""} whitespace-nowrap`}
      style={{ fontSize: fs(size, 11), padding: "0.42em 0.85em", gap: "0.45em" }}
    >
      {children}
    </button>
  );
}

export interface Series {
  points: [number, number][];
  color: string;
  width?: number;
  dashed?: boolean;
  opacity?: number;
  dots?: boolean;
}

export interface RefLine {
  y: number;
  label: string;
}

const NICE = [100, 200, 300, 500, 1000, 1500, 2000, 3000, 5000, 10000, 20000, 50000];

/** Smallest "nice" step count that fits `step`, for a chart that grows as training runs. */
export function niceMax(step: number, min = 500) {
  return NICE.find((n) => n >= Math.max(step, min)) ?? Math.ceil(step / 10000) * 10000;
}

function ticks(max: number) {
  const target = max / 5;
  const pow = Math.pow(10, Math.floor(Math.log10(target)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= target) ?? pow * 10;
  const out: number[] = [];
  for (let v = 0; v <= max + 1e-9; v += step) out.push(Math.round(v));
  return out;
}

const fmtStep = (n: number) => (n >= 1000 ? `${n / 1000}k` : String(n));

/** Loss vs step. Lines are clipped to the plot; values above yMax hug the top edge. */
export function LossChart({
  x,
  y,
  w,
  h,
  xMax,
  yMin,
  yMax,
  yStep = 0.5,
  series,
  refs = [],
  children,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  xMax: number;
  yMin: number;
  yMax: number;
  yStep?: number;
  series: Series[];
  refs?: RefLine[];
  children?: (sx: (s: number) => number, sy: (l: number) => number) => ReactNode;
}) {
  const clip = useId().replace(/:/g, "");
  const sx = (s: number) => x + (Math.min(s, xMax) / xMax) * w;
  const sy = (l: number) => y + h - ((Math.min(Math.max(l, yMin - 0.05), yMax + 0.08) - yMin) / (yMax - yMin)) * h;
  const yt: number[] = [];
  for (let v = yMin; v <= yMax + 1e-9; v += yStep) yt.push(Math.round(v * 100) / 100);
  const path = (pts: [number, number][]) => {
    const step = Math.max(1, Math.floor(pts.length / 700));
    let d = "";
    let pen = false;
    for (let i = 0; i < pts.length; i += step) {
      const [s, l] = pts[i];
      if (!Number.isFinite(l)) {
        pen = false;
        continue;
      }
      d += `${pen ? "L" : "M"}${sx(s).toFixed(1)} ${sy(l).toFixed(1)}`;
      pen = true;
    }
    const lastPt = pts[pts.length - 1];
    if (lastPt && step > 1 && Number.isFinite(lastPt[1])) d += `L${sx(lastPt[0]).toFixed(1)} ${sy(lastPt[1]).toFixed(1)}`;
    return d;
  };
  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <rect x={x} y={y - 4} width={w + 4} height={h + 8} />
        </clipPath>
      </defs>
      <rect x={x} y={y} width={w} height={h} fill="var(--card)" stroke="var(--rule)" rx={6} />
      {yt.map((v) => (
        <g key={`y${v}`}>
          <line x1={x} x2={x + w} y1={sy(v)} y2={sy(v)} stroke="var(--rule)" strokeWidth={0.8} />
          <text x={x - 8} y={sy(v) + 4} textAnchor="end" fontSize={11.5} className="mono" fill="var(--ink-3)">
            {v.toFixed(1)}
          </text>
        </g>
      ))}
      {ticks(xMax).map((s) => (
        <text key={`x${s}`} x={sx(s)} y={y + h + 17} textAnchor="middle" fontSize={11.5} className="mono" fill="var(--ink-3)">
          {fmtStep(s)}
        </text>
      ))}
      <text x={x - 8} y={y + h + 17} textAnchor="end" fontSize={11.5} fill="var(--ink-3)">
        step
      </text>
      <text x={x - 8} y={y - 14} textAnchor="end" fontSize={11.5} fill="var(--ink-3)">
        loss
      </text>
      {refs.map((r) => (
        <g key={r.label}>
          <line x1={x} x2={x + w} y1={sy(r.y)} y2={sy(r.y)} stroke="var(--ink-3)" strokeWidth={1.2} strokeDasharray="2 4" />
          <text x={x + w - 8} y={sy(r.y) - 6} textAnchor="end" fontSize={12} fill="var(--ink-2)">
            {r.label}
          </text>
        </g>
      ))}
      <g clipPath={`url(#${clip})`}>
        {series.map((s, i) => (
          <g key={i} opacity={s.opacity ?? 1}>
            <path
              d={path(s.points)}
              fill="none"
              stroke={s.color}
              strokeWidth={s.width ?? 2}
              strokeDasharray={s.dashed ? "6 5" : undefined}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {s.dots &&
              s.points.map(([st, l]) =>
                Number.isFinite(l) ? <circle key={st} cx={sx(st)} cy={sy(l)} r={3} fill="var(--card)" stroke={s.color} strokeWidth={1.8} /> : null,
              )}
          </g>
        ))}
      </g>
      {children?.(sx, sy)}
    </g>
  );
}

/** A sample of generated text, newlines kept, in a card. */
export function SampleCard({
  title,
  text,
  note,
  tone = "ink",
  size = 13,
  className = "",
}: {
  title: ReactNode;
  text: string | null;
  note?: ReactNode;
  tone?: "ink" | "bad" | "ok";
  size?: number;
  className?: string;
}) {
  const border = tone === "bad" ? "border-bad" : tone === "ok" ? "border-ok" : "border-rule";
  return (
    <div className={`flex h-full flex-col rounded-xl border bg-card/95 shadow-[var(--shadow-1)] ${border} ${className}`} style={{ padding: cq(12) }}>
      <div className="flex items-baseline justify-between gap-2 font-semibold text-ink-2" style={{ fontSize: fs(12, 10) }}>
        {title}
      </div>
      <motion.pre
        key={text ?? ""}
        initial={{ opacity: 0.35 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="mt-1 min-h-0 flex-1 overflow-hidden whitespace-pre-wrap break-words font-mono leading-snug text-ink [mask-image:linear-gradient(to_bottom,black_82%,transparent)]"
        style={{ fontSize: fs(size, 9) }}
      >
        {text ?? "..."}
      </motion.pre>
      {note && (
        <div className="mt-1 text-ink-3" style={{ fontSize: fs(11.5, 9) }}>
          {note}
        </div>
      )}
    </div>
  );
}

/** A small reading: label over a big mono number. */
export function Reading({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-ink-3" style={{ fontSize: fs(11.5, 9) }}>
        {label}
      </div>
      <div className="tabular truncate font-mono font-semibold" style={{ fontSize: fs(18, 11), color: color ?? "var(--ink)" }}>
        {value}
      </div>
    </div>
  );
}
