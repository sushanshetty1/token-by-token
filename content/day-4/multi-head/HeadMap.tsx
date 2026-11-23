"use client";

import { Mat, WCOLOR, cellY, num, type Mat as M } from "../averaging/kit";
import { TOKS } from "./data";

/** Heatmap of one head's weights with rotated column labels. */
export function HeadMap({
  x,
  y,
  wei,
  cell = 28,
  gap = 2,
  rowLabels = false,
  highlightRow,
  colLabels = true,
  delay = 0,
}: {
  x: number;
  y: number;
  wei: M;
  cell?: number;
  gap?: number;
  rowLabels?: boolean;
  highlightRow?: number;
  colLabels?: boolean;
  delay?: number;
}) {
  return (
    <g>
      {colLabels &&
        TOKS.map((t, j) => {
          const cx = x + j * (cell + gap) + cell / 2 + 3;
          return (
            <text key={t} x={cx} y={y - 7} fontSize={11} className="mono" fill="var(--ink-3)" transform={`rotate(-45 ${cx} ${y - 7})`}>
              {t}
            </text>
          );
        })}
      {rowLabels &&
        TOKS.map((t, i) => (
          <text
            key={t}
            x={x - 8}
            y={cellY(y, i, cell, gap) + cell / 2 + 4}
            textAnchor="end"
            fontSize={11.5}
            className="mono"
            fill={i === highlightRow ? "var(--ink)" : "var(--ink-3)"}
            fontWeight={i === highlightRow ? 700 : 500}
          >
            {t}
          </text>
        ))}
      <Mat
        x={x}
        y={y}
        values={wei}
        cell={cell}
        gap={gap}
        mode="sequential"
        color={WCOLOR}
        masked={(r, c) => c > r}
        showValues={cell >= 32}
        format={(v) => (v < 0.005 ? "" : num(v, 2).replace(/^0/, ""))}
        highlightRow={highlightRow}
        delay={delay}
        stagger={0.004}
      />
    </g>
  );
}
