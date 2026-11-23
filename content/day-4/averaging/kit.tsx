"use client";

/**
 * Small helpers shared by the three Day 4 lessons: exact tensor math for the
 * worked examples, a Matrix wrapper whose numbers always fit their cells, and
 * a ticker for step-by-step animations.
 */

import { motion } from "motion/react";
import { useEffect, useState, type PointerEvent, type ReactNode } from "react";
import { Chip, EASE, Matrix, chipWidth, matrixSize } from "@/components/viz/svg";
import { inkOn } from "@/lib/color";

export type Mat = number[][];

/** Attention weights and probabilities: kept apart from the blue of negatives and queries. */
export const WCOLOR = "var(--violet)";

export const matmul = (A: Mat, B: Mat): Mat =>
  A.map((row) => B[0].map((_, j) => row.reduce((s, a, k) => s + a * B[k][j], 0)));

export const transpose = (A: Mat): Mat => A[0].map((_, j) => A.map((row) => row[j]));

export const scale = (A: Mat, s: number): Mat => A.map((row) => row.map((v) => v * s));

export const tril = (T: number): Mat =>
  Array.from({ length: T }, (_, r) => Array.from({ length: T }, (_, c) => (c <= r ? 1 : 0)));

/** Row softmax that treats -Infinity as "weight exactly 0". */
export function softmaxRow(xs: number[]): number[] {
  const finite = xs.filter((x) => Number.isFinite(x));
  if (finite.length === 0) return xs.map(() => 0);
  const m = Math.max(...finite);
  const e = xs.map((x) => (Number.isFinite(x) ? Math.exp(x - m) : 0));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
}

export const causalFill = (S: Mat): Mat => S.map((row, r) => row.map((v, c) => (c > r ? -Infinity : v)));

export const softmaxRows = (S: Mat): Mat => S.map(softmaxRow);

export const round = (v: number, d = 2) => {
  const p = 10 ** d;
  const out = Math.round(v * p) / p;
  return Object.is(out, -0) ? 0 : out;
};

/** "1.50" style number with no "-0.00". */
export const num = (v: number, d = 2) => {
  if (!Number.isFinite(v)) return v > 0 ? "∞" : "-∞";
  const r = round(v, d);
  return r.toFixed(d);
};

/** Compact number: integers without decimals, otherwise d digits. */
export const short = (v: number, d = 2) => {
  if (!Number.isFinite(v)) return v > 0 ? "∞" : "-∞";
  const r = round(v, d);
  return Number.isInteger(r) ? String(r) : r.toFixed(d);
};

export const vec = (xs: number[], d = 2) => `[${xs.map((x) => short(x, d)).join(", ")}]`;

/** Find the 1-based line range of a code string between two markers. */
export function linesOf(code: string, from: string, to?: string): [number, number] {
  const ls = code.split("\n");
  const a = ls.findIndex((l) => l.includes(from));
  if (a < 0) throw new Error(`marker not found: ${from}`);
  if (!to) return [a + 1, a + 1];
  const b = ls.findIndex((l, i) => i >= a && l.includes(to));
  if (b < 0) throw new Error(`marker not found: ${to}`);
  return [a + 1, b + 1];
}

/** Steps an index from 0 to count - 1, pausing while the lesson is paused. */
export function useTicker(count: number, ms: number, playing: boolean, startDelay = 0) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!playing || i >= count - 1) return;
    const t = setTimeout(() => setI((n) => n + 1), i === 0 ? ms + startDelay : ms);
    return () => clearTimeout(t);
  }, [i, playing, count, ms, startDelay]);
  return i;
}

export const cellX = (x: number, c: number, cell: number, gap: number) => x + c * (cell + gap);
export const cellY = (y: number, r: number, cell: number, gap: number) => y + r * (cell + gap);

/**
 * Matrix with numbers sized to fit. Uses the shared Matrix for cells, masks
 * and highlights, then writes the values on top so 5-character numbers like
 * "-2.12" never spill out of a cell.
 */
export function Mat({
  x,
  y,
  values,
  cell = 44,
  gap = 4,
  max = 1,
  mode = "diverging",
  color,
  format = (v: number) => short(v),
  masked,
  showInf = false,
  highlightRow,
  highlightCol,
  focus,
  dimRows,
  hidden,
  delay = 0,
  stagger = 0.01,
  colLabels,
  title,
  fontScale = 1,
  showValues = true,
}: {
  x: number;
  y: number;
  values: Mat;
  cell?: number;
  gap?: number;
  max?: number;
  mode?: "diverging" | "sequential";
  color?: string;
  format?: (v: number) => string;
  masked?: (r: number, c: number) => boolean;
  /** Write "-∞" on masked cells. */
  showInf?: boolean;
  highlightRow?: number;
  highlightCol?: number;
  /** One cell to ring in the "you are here" color. */
  focus?: [number, number];
  dimRows?: (r: number) => boolean;
  /** Cells not computed yet: drawn as empty outlines. */
  hidden?: (r: number, c: number) => boolean;
  delay?: number;
  stagger?: number;
  colLabels?: string[];
  title?: string;
  fontScale?: number;
  showValues?: boolean;
}) {
  const rows = values.length;
  const cols = values[0]?.length ?? 0;
  const texts = values.map((row) => row.map((v) => format(v)));
  const longest = Math.max(1, ...texts.flat().map((t) => t.length));
  const fs = Math.min(cell * 0.36, (cell - 7) / (longest * 0.62)) * fontScale;
  const shown = values.map((row, r) => row.map((v, c) => (hidden?.(r, c) ? 0 : v)));
  const { w, h } = matrixSize(rows, cols, cell, gap);
  return (
    <g>
      <Matrix
        x={x}
        y={y}
        values={shown}
        cell={cell}
        gap={gap}
        max={max}
        mode={mode}
        color={color}
        masked={masked}
        showValues={false}
        delay={delay}
        stagger={stagger}
        colLabels={colLabels}
        title={title}
      />
      <g pointerEvents="none">
        {values.map((row, r) =>
          row.map((v, c) => {
            const cx = cellX(x, c, cell, gap) + cell / 2;
            const cy = cellY(y, r, cell, gap) + cell / 2;
            const isMasked = masked?.(r, c) ?? false;
            if (hidden?.(r, c)) {
              return (
                <rect
                  key={`h${r}-${c}`}
                  x={cx - cell / 2}
                  y={cy - cell / 2}
                  width={cell}
                  height={cell}
                  rx={Math.min(5, cell / 5)}
                  fill="var(--card)"
                  stroke="var(--rule-strong)"
                  strokeDasharray="3 3"
                />
              );
            }
            if (isMasked ? !showInf : !showValues) return null;
            const strength = mode === "diverging" ? v / (max || 1) : (v / (max || 1)) * 1.1;
            return (
              <motion.text
                key={`t${r}-${c}`}
                x={cx}
                y={cy + fs * 0.36}
                textAnchor="middle"
                fontSize={isMasked ? fs * 1.05 : fs}
                className="mono"
                fontWeight={isMasked ? 600 : 500}
                fill={isMasked ? "var(--ink-2)" : inkOn(strength, mode !== "diverging")}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25, delay: delay + (r * cols + c) * stagger }}
              >
                {isMasked ? "-∞" : texts[r][c]}
              </motion.text>
            );
          }),
        )}
        {dimRows &&
          values.map((_, r) =>
            dimRows(r) ? (
              <rect
                key={`d${r}`}
                x={x - 2}
                y={cellY(y, r, cell, gap) - 2}
                width={w + 4}
                height={cell + 4}
                fill="var(--card)"
                opacity={0.62}
              />
            ) : null,
          )}
        {highlightRow !== undefined && (
          <motion.rect
            x={0}
            y={0}
            width={w + 8}
            height={cell + 8}
            rx={7}
            fill="none"
            stroke="var(--ink)"
            strokeWidth={2}
            initial={false}
            animate={{ x: x - 4, y: cellY(y, highlightRow, cell, gap) - 4 }}
            transition={{ duration: 0.3, ease: EASE }}
          />
        )}
        {highlightCol !== undefined && (
          <motion.rect
            x={0}
            y={0}
            width={cell + 8}
            height={h + 8}
            rx={7}
            fill="none"
            stroke="var(--mark)"
            strokeWidth={2.4}
            initial={false}
            animate={{ x: cellX(x, highlightCol, cell, gap) - 4, y: y - 4 }}
            transition={{ duration: 0.3, ease: EASE }}
          />
        )}
        {focus && (
          <motion.rect
            x={0}
            y={0}
            width={cell + 6}
            height={cell + 6}
            rx={7}
            fill="none"
            stroke="var(--mark)"
            strokeWidth={3}
            initial={false}
            animate={{ x: cellX(x, focus[1], cell, gap) - 3, y: cellY(y, focus[0], cell, gap) - 3 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </g>
    </g>
  );
}

/** Token chips used as row labels, right-aligned to `right`. */
export function RowChips({
  right,
  y,
  tokens,
  cell,
  gap,
  fontSize = 13,
  h = 28,
  highlight,
  startIndex = 0,
  delay = 0,
}: {
  right: number;
  y: number;
  tokens: string[];
  cell: number;
  gap: number;
  fontSize?: number;
  h?: number;
  highlight?: number;
  startIndex?: number;
  delay?: number;
}) {
  return (
    <g>
      {tokens.map((t, i) => {
        const w = chipWidth(t, fontSize);
        return (
          <Chip
            key={i}
            x={right - w / 2}
            y={cellY(y, i, cell, gap) + cell / 2}
            text={t}
            index={startIndex + i}
            h={h}
            fontSize={fontSize}
            highlight={highlight === i}
            delay={delay}
          />
        );
      })}
    </g>
  );
}

/** Token labels above matrix columns. */
export function ColTokens({
  x,
  y,
  tokens,
  cell,
  gap,
  size = 12,
  highlight,
}: {
  x: number;
  y: number;
  tokens: string[];
  cell: number;
  gap: number;
  size?: number;
  highlight?: number;
}) {
  return (
    <g>
      {tokens.map((t, c) => (
        <text
          key={c}
          x={cellX(x, c, cell, gap) + cell / 2}
          y={y}
          textAnchor="middle"
          fontSize={size}
          className="mono"
          fontWeight={highlight === c ? 700 : 500}
          fill={highlight === c ? "var(--ink)" : "var(--ink-3)"}
        >
          {t}
        </text>
      ))}
    </g>
  );
}

/** A rounded card drawn in SVG, for side notes on the stage. */
export function Card({
  x,
  y,
  w,
  h,
  tone,
  children,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  tone?: "q" | "k" | "v" | "mark" | "accent" | "violet" | "bad" | "ok";
  children?: ReactNode;
}) {
  const stroke = tone ? `var(--${tone})` : "var(--rule-strong)";
  const fill = tone ? `var(--${tone}-soft)` : "var(--card)";
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={12} fill={fill} stroke={stroke} strokeWidth={1.3} />
      {children}
    </g>
  );
}

/** Convert a pointer event to viewBox coordinates of its SVG. */
export function svgPoint(e: PointerEvent<SVGElement>) {
  const svg = (e.currentTarget as SVGElement).ownerSVGElement ?? (e.currentTarget as unknown as SVGSVGElement);
  const m = svg.getScreenCTM();
  if (!m) return { x: 0, y: 0 };
  const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
  return { x: p.x, y: p.y };
}
