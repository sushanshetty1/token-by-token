"use client";

import { textWidth } from "@/components/viz/svg";

/**
 * A thin "you are here" strip across the top of a stage: the stations of the
 * pipeline as pills, with the current ones in saffron. Shared by the Day 3 lessons.
 */
export function Track({ items, at, y = 34 }: { items: string[]; at: number[]; y?: number }) {
  const fs = 12.5;
  const widths = items.map((t) => textWidth(t, fs) + 26);
  const gap = 30;
  const total = widths.reduce((a, b) => a + b, 0) + gap * (items.length - 1);
  const xs: number[] = [];
  let cursor = 480 - total / 2;
  for (const w of widths) {
    xs.push(cursor + w / 2);
    cursor += w + gap;
  }
  return (
    <g aria-hidden>
      {items.map((t, i) => {
        const on = at.includes(i);
        const w = widths[i];
        return (
          <g key={t}>
            {i > 0 && (
              <line
                x1={xs[i - 1] + widths[i - 1] / 2 + 5}
                x2={xs[i] - w / 2 - 8}
                y1={y}
                y2={y}
                stroke="var(--rule-strong)"
                strokeWidth={1.4}
                markerEnd="url(#arrow-muted)"
              />
            )}
            <rect
              x={xs[i] - w / 2}
              y={y - 12}
              width={w}
              height={24}
              rx={12}
              fill={on ? "var(--mark-soft)" : "var(--card)"}
              stroke={on ? "var(--mark)" : "var(--rule-strong)"}
              strokeWidth={on ? 1.6 : 1}
            />
            <text
              x={xs[i]}
              y={y + 4.5}
              textAnchor="middle"
              fontSize={fs}
              fontWeight={on ? 650 : 500}
              fill={on ? "var(--ink)" : "var(--ink-3)"}
            >
              {t}
            </text>
          </g>
        );
      })}
    </g>
  );
}
