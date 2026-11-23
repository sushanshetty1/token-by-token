"use client";

import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Slider, StageOverlay, Toggle } from "@/components/viz/controls";
import { Appear, Arrow, Bars, Box, EASE, Label, Pill, Svg } from "@/components/viz/svg";
import { inkOn, seededVector, sequential, tokenTint } from "@/lib/color";
import type { StageProps } from "@/lib/types";
import {
  CHARS,
  COUNTS,
  generate,
  LOSS_MEAN_8,
  LOSS_ROWS,
  NONZERO,
  PAIRS,
  ROW_TOTALS,
  rowProbs,
  SHAKESPEARE,
  show,
  stoi,
  TEXT,
  V,
} from "./data";

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

function useTicker(playing: boolean, max: number, ms: number, startDelay = 0) {
  const [k, setK] = useState(0);
  useEffect(() => {
    if (!playing || k >= max) return;
    const t = setTimeout(() => setK((v) => Math.min(max, v + 1)), k === 0 ? startDelay + ms : ms);
    return () => clearTimeout(t);
  }, [playing, k, max, ms, startDelay]);
  return k;
}

const STRIP = { x0: 55, y: 44, w: 21, pitch: 23 };

/** The corpus as a strip of character cells. */
function Corpus({ hl = [], dim = false }: { hl?: number[]; dim?: boolean }) {
  return (
    <motion.g animate={{ opacity: dim ? 0.35 : 1 }} transition={{ duration: 0.4 }}>
      {[...TEXT].map((c, i) => {
        const x = STRIP.x0 + i * STRIP.pitch;
        const on = hl.includes(i);
        return (
          <g key={i}>
            <rect
              x={x}
              y={STRIP.y - 14}
              width={STRIP.w}
              height={28}
              rx={5}
              fill={on ? "var(--mark-soft)" : "var(--card)"}
              stroke={on ? "var(--mark)" : "var(--rule-strong)"}
              strokeWidth={on ? 1.6 : 1}
            />
            <text
              x={x + STRIP.w / 2}
              y={STRIP.y + 5}
              textAnchor="middle"
              fontSize={14}
              className="mono"
              fontWeight={600}
              fill={c === " " ? "var(--ink-3)" : "var(--ink)"}
            >
              {show(c)}
            </text>
          </g>
        );
      })}
    </motion.g>
  );
}

const H = { x: 96, y: 140, cell: 30, pitch: 32 };
const CMAX = 5;

/** The 11 x 11 count table. */
function Heatmap({
  focusRow,
  focusCell,
  dimOthers = false,
  totals = false,
  title = "counts: row = this character, column = the next one",
  delay = 0,
  x = H.x,
  y = H.y,
  logits = false,
}: {
  logits?: boolean;
  focusRow?: number;
  focusCell?: [number, number];
  dimOthers?: boolean;
  totals?: boolean;
  title?: string;
  delay?: number;
  x?: number;
  y?: number;
}) {
  const W = V * H.pitch - 2;
  return (
    <g>
      <text x={x + W / 2} y={y - 34} textAnchor="middle" fontSize={13} fontWeight={650} fill="var(--ink-2)">
        {title}
      </text>
      {CHARS.map((c, i) => (
        <g key={c}>
          <text x={x + i * H.pitch + H.cell / 2} y={y - 10} textAnchor="middle" fontSize={13} className="mono" fill="var(--ink-3)">
            {show(c)}
          </text>
          <text
            x={x - 10}
            y={y + i * H.pitch + H.cell / 2 + 5}
            textAnchor="end"
            fontSize={13}
            className="mono"
            fontWeight={focusRow === i ? 700 : 500}
            fill={focusRow === i ? "var(--ink)" : "var(--ink-3)"}
          >
            {show(c)}
          </text>
        </g>
      ))}
      {COUNTS.map((row, r) =>
        row.map((v, c) => {
          const cx = x + c * H.pitch;
          const cy = y + r * H.pitch;
          const faded = dimOthers && focusRow !== undefined && r !== focusRow;
          return (
            <motion.g
              key={`${r}-${c}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: faded ? 0.25 : 1 }}
              transition={{ duration: 0.3, delay: delay + (r * V + c) * 0.003 }}
            >
              <rect
                x={cx}
                y={cy}
                width={H.cell}
                height={H.cell}
                rx={5}
                fill={logits ? (v > 0 ? sequential(Math.log(v) / 1.7, "var(--pos)") : "url(#hatch)") : sequential(v / CMAX)}
                stroke="var(--rule)"
                strokeWidth={0.7}
              />
              {v > 0 && (
                <text
                  x={cx + H.cell / 2}
                  y={cy + H.cell / 2 + 4.5}
                  textAnchor="middle"
                  fontSize={logits ? 11.5 : 13}
                  className="mono"
                  fontWeight={650}
                  fill={inkOn(logits ? Math.log(v) / 1.7 : v / CMAX)}
                >
                  {logits ? Math.log(v).toFixed(1) : v}
                </text>
              )}
            </motion.g>
          );
        }),
      )}
      {totals &&
        ROW_TOTALS.map((t, r) => (
          <text key={r} x={x + W + 14} y={y + r * H.pitch + H.cell / 2 + 5} fontSize={12.5} className="mono" fill="var(--ink-3)">
            {t}
          </text>
        ))}
      {totals && (
        <text x={x + W + 10} y={y - 10} fontSize={11.5} fill="var(--ink-3)">
          total
        </text>
      )}
      {focusRow !== undefined && (
        <rect x={x - 4} y={y + focusRow * H.pitch - 4} width={W + 8} height={H.cell + 8} rx={8} fill="none" stroke="var(--ink)" strokeWidth={2} />
      )}
      {focusCell && (
        <rect
          x={x + focusCell[1] * H.pitch - 4}
          y={y + focusCell[0] * H.pitch - 4}
          width={H.cell + 8}
          height={H.cell + 8}
          rx={8}
          fill="none"
          stroke="var(--mark)"
          strokeWidth={2.4}
        />
      )}
    </g>
  );
}

/** A row of value cells with custom text, used for logits and probabilities. */
function ValueRow({
  x,
  y,
  values,
  kind,
  delay = 0,
  labels = false,
}: {
  x: number;
  y: number;
  values: number[];
  kind: "logit" | "prob";
  delay?: number;
  labels?: boolean;
}) {
  const cell = 34;
  const pitch = 36;
  return (
    <g>
      {values.map((v, i) => {
        const cx = x + i * pitch;
        const ninf = !Number.isFinite(v);
        const fill = ninf ? "url(#hatch)" : kind === "prob" ? sequential(v) : sequential(v / 1.2, "var(--pos)");
        const strength = kind === "prob" ? v : v / 1.2;
        return (
          <motion.g key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25, delay: delay + i * 0.03 }}>
            {labels && (
              <text x={cx + cell / 2} y={y - 9} textAnchor="middle" fontSize={13} className="mono" fill="var(--ink-3)">
                {show(CHARS[i])}
              </text>
            )}
            <rect x={cx} y={y} width={cell} height={cell} rx={5} fill={fill} stroke="var(--rule)" strokeWidth={0.7} />
            <text
              x={cx + cell / 2}
              y={y + cell / 2 + 4.5}
              textAnchor="middle"
              fontSize={kind === "prob" ? 11.5 : 12}
              className="mono"
              fontWeight={600}
              fill={ninf ? "var(--ink-3)" : inkOn(strength)}
            >
              {ninf ? "-∞" : kind === "prob" ? (v === 0 ? "0" : v.toFixed(2).replace(/^0/, "")) : v.toFixed(2)}
            </text>
          </motion.g>
        );
      })}
    </g>
  );
}

function Lines({ x, y, lines, size = 13, gap = 19, color = "var(--ink-2)", anchor = "start", delay }: {
  x: number;
  y: number;
  lines: string[];
  size?: number;
  gap?: number;
  color?: string;
  anchor?: "start" | "middle" | "end";
  delay?: number;
}) {
  const node = (
    <text x={x} y={y} fontSize={size} fill={color} textAnchor={anchor}>
      {lines.map((l, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : gap}>
          {l || "\u00a0"}
        </tspan>
      ))}
    </text>
  );
  return delay === undefined ? node : <Appear delay={delay} y={4}>{node}</Appear>;
}

function CharTile({ x, y, c, label, tone }: { x: number; y: number; c: string; label: string; tone: "ink" | "mark" }) {
  return (
    <g>
      <rect
        x={x - 36}
        y={y - 36}
        width={72}
        height={72}
        rx={14}
        fill={tone === "mark" ? "var(--mark-soft)" : "var(--card)"}
        stroke={tone === "mark" ? "var(--mark)" : "var(--ink)"}
        strokeWidth={1.8}
      />
      <text x={x} y={y + 13} textAnchor="middle" fontSize={36} className="mono" fontWeight={650} fill="var(--ink)">
        {show(c)}
      </text>
      <text x={x} y={y + 58} textAnchor="middle" fontSize={13} fill="var(--ink-2)">
        {label}
      </text>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Step 1: pairs                                                       */
/* ------------------------------------------------------------------ */

function Idea({ playing }: { playing: boolean }) {
  const k = useTicker(playing, PAIRS.length - 1, 260, 400);
  const [a, b] = PAIRS[k];
  const cols = 6;
  return (
    <g>
      <Corpus hl={[k, k + 1]} />
      <CharTile x={170} y={210} c={a} label="this character" tone="ink" />
      <Arrow x1={214} y1={210} x2={300} y2={210} tone="mark" width={2.4} />
      <CharTile x={350} y={210} c={b} label="predicts the next" tone="mark" />
      <text x={260} y={318} textAnchor="middle" fontSize={14} className="mono" fill="var(--ink-2)">
        pair {k + 1} of {PAIRS.length}
      </text>
      <Lines
        x={260}
        y={370}
        anchor="middle"
        lines={["No other context. Only the one", "character right before."]}
        size={14}
        gap={21}
        color="var(--ink-3)"
      />

      <text x={500} y={104} fontSize={14} fontWeight={650} fill="var(--ink)">
        Every adjacent pair is one training example
      </text>
      {PAIRS.map(([p, q], i) => {
        if (i > k) return null;
        const x = 500 + (i % cols) * 70;
        const y = 124 + Math.floor(i / cols) * 46;
        const on = i === k;
        return (
          <g key={i}>
            <rect x={x} y={y} width={62} height={34} rx={8} fill={on ? "var(--mark-soft)" : "var(--card)"} stroke={on ? "var(--mark)" : "var(--rule-strong)"} strokeWidth={on ? 1.6 : 1} />
            <text x={x + 31} y={y + 22} textAnchor="middle" fontSize={14} className="mono" fill="var(--ink)">
              {show(p)} → {show(q)}
            </text>
          </g>
        );
      })}
      {k === PAIRS.length - 1 && (
        <Label x={710} y={420} size={13.5} color="var(--ink-2)" delay={0.2}>
          37 characters give 36 pairs.
        </Label>
      )}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Step 2: count table                                                 */
/* ------------------------------------------------------------------ */

function Counts() {
  const r = stoi(" ");
  const c = stoi("s");
  return (
    <g>
      <Corpus />
      <Heatmap focusCell={[r, c]} totals />
      <Appear delay={0.8}>
        <rect x={560} y={130} width={350} height={112} rx={14} fill="var(--card)" stroke="var(--mark)" strokeWidth={1.4} />
        <text x={580} y={162} fontSize={15} fontWeight={650} fill="var(--ink)">
          Row ·, column s holds 5
        </text>
        <Lines x={580} y={188} lines={["A space was followed by s five times:", "she, sells, sea, shells, sea, shore."]} size={13.5} gap={20} />
      </Appear>
      <Lines
        x={560}
        y={290}
        lines={[
          `36 pairs land in ${V} x ${V} = ${V * V} cells.`,
          `Only ${NONZERO} cells are nonzero: most pairs`,
          "never happen in this text.",
          "",
          "Each row is a histogram of what comes",
          "next. Its total is how often that",
          "character appears with something after it.",
        ]}
        size={13.5}
        gap={21}
        delay={1.3}
      />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Step 3: normalize a row and sample                                  */
/* ------------------------------------------------------------------ */

function Sample() {
  const h = stoi("h");
  const u = 0.62;
  const bx = 560;
  const bw = 330;
  return (
    <g>
      <Corpus />
      <Heatmap focusRow={h} dimOthers />
      <Appear delay={0.4}>
        <text x={560} y={120} fontSize={15} fontWeight={650} fill="var(--ink)">
          Row h: e 3 times, o once. Total 4.
        </text>
        <text x={560} y={142} fontSize={13} fill="var(--ink-3)">
          Divide by the total to get probabilities.
        </text>
      </Appear>
      <Bars
        x={600}
        y={160}
        labels={["e", "o"]}
        values={[0.75, 0.25]}
        width={240}
        row={32}
        delay={0.7}
        format={(v) => `${v.toFixed(2)}  (${Math.round(v * 4)}/4)`}
        max={1}
      />
      <Label x={560} y={262} size={13} anchor="start" color="var(--ink-3)" delay={1}>
        The other 9 characters get probability 0.
      </Label>

      <Appear delay={1.3}>
        <text x={560} y={290} fontSize={15} fontWeight={650} fill="var(--ink)">
          Sampling: draw a random number in [0, 1)
        </text>
        <rect x={bx} y={334} width={bw * 0.75} height={36} rx={6} fill="var(--accent-soft)" stroke="var(--accent)" />
        <rect x={bx + bw * 0.75} y={334} width={bw * 0.25} height={36} rx={6} fill="var(--violet-soft)" stroke="var(--violet)" />
        <text x={bx + (bw * 0.75) / 2} y={357} textAnchor="middle" fontSize={15} className="mono" fontWeight={650} fill="var(--ink)">
          e
        </text>
        <text x={bx + bw * 0.875} y={357} textAnchor="middle" fontSize={15} className="mono" fontWeight={650} fill="var(--ink)">
          o
        </text>
        <text x={bx} y={388} textAnchor="middle" fontSize={11.5} className="mono" fill="var(--ink-3)">
          0
        </text>
        <text x={bx + bw * 0.75} y={388} textAnchor="middle" fontSize={11.5} className="mono" fill="var(--ink-3)">
          0.75
        </text>
        <text x={bx + bw} y={388} textAnchor="middle" fontSize={11.5} className="mono" fill="var(--ink-3)">
          1
        </text>
      </Appear>
      <motion.g initial={{ x: 0, opacity: 0 }} animate={{ x: bw * u, opacity: 1 }} transition={{ duration: 1.2, delay: 1.8, ease: EASE }}>
        <path d={`M ${bx} 330 l -7 -12 l 14 0 z`} fill="var(--mark)" />
        <text x={bx} y={314} textAnchor="middle" fontSize={12.5} className="mono" fontWeight={650} fill="var(--ink)">
          u = 0.62
        </text>
      </motion.g>
      <Appear delay={3.1}>
        <text x={560} y={430} fontSize={14} fill="var(--ink)">
          0.62 lands in the e segment, so the model writes <tspan className="mono" fontWeight={700}>e</tspan>.
        </text>
        <text x={560} y={454} fontSize={13} fill="var(--ink-3)">
          Then row e decides the next one, and so on.
        </text>
      </Appear>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Step 4: the neural version                                          */
/* ------------------------------------------------------------------ */

function Neural() {
  const h = stoi("h");
  const logits = COUNTS[h].map((c) => (c > 0 ? Math.log(c) : -Infinity));
  const probs = COUNTS[h].map((c) => c / ROW_TOTALS[h]);
  const x0 = 500;
  return (
    <g>
      <Corpus dim />
      <Heatmap focusRow={h} dimOthers logits title="nn.Embedding(11, 11) holding ln(count)" />
      <Appear delay={0.3}>
        <rect x={x0} y={112} width={118} height={34} rx={9} fill="var(--card)" stroke="var(--ink)" strokeWidth={1.4} />
        <text x={x0 + 59} y={134} textAnchor="middle" fontSize={14} className="mono" fill="var(--ink)">
          idx = 4 (h)
        </text>
        <text x={x0 + 132} y={134} fontSize={13} fill="var(--ink-3)">
          selects row 4 of the table
        </text>
      </Appear>
      <Label x={x0} y={186} size={13} anchor="start" weight={650} color="var(--ink)" delay={0.6}>
        logits = ln(count)
      </Label>
      <ValueRow x={x0 - 30} y={222} values={logits} kind="logit" delay={0.7} labels />
      <Arrow x1={x0 + 160} y1={264} x2={x0 + 160} y2={304} delay={1.2} label="softmax" />
      <Label x={x0} y={330} size={13} anchor="start" weight={650} color="var(--ink)" delay={1.4}>
        probabilities
      </Label>
      <ValueRow x={x0 - 30} y={342} values={probs} kind="prob" delay={1.5} />
      <Lines
        x={x0 - 30}
        y={414}
        lines={[
          "e^1.10 = 3 and e^0 = 1, so softmax gives 3/4 and 1/4: the count table exactly.",
          "Gradient descent finds nearly this table by itself. It cannot reach -∞, so",
          "pairs it never saw get very negative logits instead.",
        ]}
        size={13}
        gap={20}
        delay={1.9}
      />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Step 5: cross-entropy                                               */
/* ------------------------------------------------------------------ */

function Loss() {
  const plot = { x: 590, y: 120, w: 300, h: 280 };
  const px = (p: number) => plot.x + p * plot.w;
  const py = (l: number) => plot.y + plot.h - (l / 4) * plot.h;
  const curve = Array.from({ length: 80 }, (_, i) => {
    const p = 0.02 + (i / 79) * 0.98;
    return `${px(p).toFixed(1)},${py(-Math.log(p)).toFixed(1)}`;
  }).join(" ");
  return (
    <g>
      <Corpus hl={[0, 1, 2, 3, 4, 5, 6, 7, 8]} />
      <text x={48} y={104} fontSize={12.5} fill="var(--ink-3)">
        <tspan x={60}>input</tspan>
        <tspan x={130}>target</tspan>
        <tspan x={210}>p(target)</tspan>
        <tspan x={410}>-ln p</tspan>
      </text>
      {LOSS_ROWS.map((r, i) => {
        const y = 128 + i * 38;
        return (
          <Appear key={i} delay={0.2 + i * 0.12} y={4}>
            <text x={76} y={y + 5} textAnchor="middle" fontSize={15} className="mono" fontWeight={650} fill="var(--ink)">
              {show(r.a)}
            </text>
            <text x={106} y={y + 5} textAnchor="middle" fontSize={13} fill="var(--ink-3)">
              →
            </text>
            <rect x={130} y={y - 14} width={30} height={28} rx={6} fill="var(--mark-soft)" stroke="var(--mark)" />
            <text x={145} y={y + 5} textAnchor="middle" fontSize={15} className="mono" fontWeight={650} fill="var(--ink)">
              {show(r.b)}
            </text>
            <rect x={210} y={y - 9} width={140} height={18} rx={4} fill="var(--paper-2)" />
            <rect x={210} y={y - 9} width={140 * r.p} height={18} rx={4} fill="var(--accent)" />
            <text x={358} y={y + 5} fontSize={12.5} className="mono" fill="var(--ink-2)">
              {r.p.toFixed(3)}
            </text>
            <text x={410} y={y + 5} fontSize={14} className="mono" fontWeight={650} fill="var(--ink)">
              {r.loss.toFixed(2)}
            </text>
          </Appear>
        );
      })}
      <Appear delay={1.3}>
        <line x1={60} x2={460} y1={432} y2={432} stroke="var(--rule-strong)" />
        <text x={60} y={458} fontSize={14} fill="var(--ink)">
          mean over these 8 predictions
        </text>
        <text x={410} y={458} fontSize={15} className="mono" fontWeight={700} fill="var(--ink)">
          {LOSS_MEAN_8.toFixed(2)}
        </text>
      </Appear>

      <Appear delay={0.6}>
        <line x1={plot.x} x2={plot.x + plot.w} y1={plot.y + plot.h} y2={plot.y + plot.h} stroke="var(--ink-3)" />
        <line x1={plot.x} x2={plot.x} y1={plot.y} y2={plot.y + plot.h} stroke="var(--ink-3)" />
        {[0, 1, 2, 3, 4].map((l) => (
          <text key={l} x={plot.x - 8} y={py(l) + 4} textAnchor="end" fontSize={11.5} className="mono" fill="var(--ink-3)">
            {l}
          </text>
        ))}
        {[0, 0.5, 1].map((p) => (
          <text key={p} x={px(p)} y={plot.y + plot.h + 18} textAnchor="middle" fontSize={11.5} className="mono" fill="var(--ink-3)">
            {p}
          </text>
        ))}
        <text x={plot.x + plot.w / 2} y={plot.y + plot.h + 38} textAnchor="middle" fontSize={12.5} fill="var(--ink-2)">
          probability given to the correct next character
        </text>
        <text x={plot.x + 10} y={plot.y + 4} fontSize={12.5} className="mono" fill="var(--ink-2)">
          loss = -ln p
        </text>
      </Appear>
      <motion.polyline
        points={curve}
        fill="none"
        stroke="var(--ink)"
        strokeWidth={2}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, delay: 0.8, ease: EASE }}
      />
      {LOSS_ROWS.map((r, i) => (
        <motion.circle
          key={i}
          cx={px(r.p)}
          cy={py(r.loss)}
          r={5.5}
          fill="var(--mark)"
          stroke="var(--card)"
          strokeWidth={1.5}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.6 + i * 0.06 }}
        />
      ))}
      <Lines
        x={plot.x + 74}
        y={plot.y + 64}
        lines={["p = 1 costs 0.", "p = 0.02 costs 3.9.", "Confidently wrong is expensive."]}
        size={12.5}
        gap={18}
        color="var(--ink-2)"
        delay={2}
      />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Step 6: an untrained model over 65 characters                       */
/* ------------------------------------------------------------------ */

const BAR_H = [...SHAKESPEARE].map((_, i) => Math.round(80 + (seededVector("init", SHAKESPEARE.length)[i] ?? 0) * 16));

function Untrained() {
  const n = SHAKESPEARE.length;
  const pitch = 13;
  const x0 = 480 - (n * pitch) / 2;
  return (
    <g>
      <Corpus dim />
      <Appear>
        <text x={480} y={118} textAnchor="middle" fontSize={16} fontWeight={650} fill="var(--ink)">
          Tiny Shakespeare: 65 distinct characters
        </text>
        <text x={480} y={140} textAnchor="middle" fontSize={13} fill="var(--ink-3)">
          An untrained model has no reason to prefer any of them.
        </text>
      </Appear>
      {[...SHAKESPEARE].map((c, i) => (
        <motion.g key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.012 }}>
          <motion.rect
            x={x0 + i * pitch + 1.5}
            width={10}
            rx={2}
            fill="var(--accent)"
            initial={{ y: 270, height: 0 }}
            animate={{ y: 270 - BAR_H[i], height: BAR_H[i] }}
            transition={{ duration: 0.5, delay: 0.3 + i * 0.012, ease: EASE }}
          />
          <text x={x0 + i * pitch + 6.5} y={290} textAnchor="middle" fontSize={11} className="mono" fill="var(--ink-3)">
            {show(c)}
          </text>
        </motion.g>
      ))}
      <Label x={480} y={320} size={12.5} color="var(--ink-3)" delay={1.1}>
        roughly equal bars: every character about equally likely
      </Label>
      <Appear delay={1.4}>
        <Pill x={480} y={372} text="loss = -ln(1/65) = ln 65 = 4.17" tone="mark" fontSize={16} strong />
      </Appear>
      <Lines
        x={480}
        y={424}
        anchor="middle"
        lines={[
          "Real runs start a little higher, about 4.7 to 4.9: random N(0, 1) logits are not perfectly flat.",
          "For the 11-character toy above, the same rule gives ln 11 = 2.40.",
        ]}
        size={13}
        gap={21}
        delay={1.8}
      />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Step 7: reshaping for F.cross_entropy                               */
/* ------------------------------------------------------------------ */

function Reshape() {
  const sheets = [0, 1, 2, 3];
  const sw = 150;
  const rowH = 7;
  const sh = 8 * rowH;
  return (
    <g>
      <Corpus dim />
      <Appear>
        <rect x={150} y={84} width={660} height={52} rx={12} fill="var(--mark-soft)" stroke="var(--mark)" />
        <text x={480} y={108} textAnchor="middle" fontSize={15} fontWeight={650} fill="var(--ink)">
          One batch makes B x T = 4 x 8 = 32 predictions
        </text>
        <text x={480} y={127} textAnchor="middle" fontSize={12.5} fill="var(--ink-2)">
          Each position predicts its own next character. The loss is the mean over all 32.
        </text>
      </Appear>

      <Label x={150} y={176} size={13} weight={650} color="var(--ink)" delay={0.4}>
        logits (B, T, C) = (4, 8, 65)
      </Label>
      {sheets
        .slice()
        .reverse()
        .map((b) => {
          const x = 70 + b * 14;
          const y = 200 + (3 - b) * 14;
          const tint = tokenTint(b);
          return (
            <Appear key={b} delay={0.5 + b * 0.1} y={0}>
              <rect x={x} y={y} width={sw} height={sh} rx={4} fill={tint.fill} stroke={tint.stroke} strokeWidth={1.2} />
              {Array.from({ length: 7 }, (_, r) => (
                <line key={r} x1={x} x2={x + sw} y1={y + (r + 1) * rowH} y2={y + (r + 1) * rowH} stroke={tint.stroke} strokeWidth={0.5} />
              ))}
            </Appear>
          );
        })}
      <Label x={150} y={312} size={12} mono color="var(--ink-3)" delay={0.9}>
        4 sequences, 8 positions each
      </Label>

      <Label x={150} y={358} size={13} weight={650} color="var(--ink)" delay={0.6}>
        targets (B, T) = (4, 8)
      </Label>
      {sheets.map((b) =>
        Array.from({ length: 8 }, (_, t) => (
          <Appear key={`${b}-${t}`} delay={0.7 + b * 0.05} y={0}>
            <rect x={86 + t * 16} y={372 + b * 16} width={14} height={14} rx={3} fill={tokenTint(b).fill} stroke={tokenTint(b).stroke} />
          </Appear>
        )),
      )}

      <Arrow x1={262} y1={250} x2={372} y2={250} delay={1.2} label="view(B*T, C)" />
      <Arrow x1={226} y1={404} x2={560} y2={392} delay={1.4} label="view(B*T)" bend={-16} />

      <Label x={470} y={176} size={13} weight={650} color="var(--ink)" delay={1.4}>
        (32, 65)
      </Label>
      <Lines x={588} y={208} lines={["one row per", "prediction"]} size={12} gap={16} color="var(--ink-3)" delay={2} />
      {sheets.map((b) => {
        const tint = tokenTint(b);
        return (
          <motion.g
            key={b}
            initial={{ opacity: 0, x: -60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 1.5 + b * 0.15, ease: EASE }}
          >
            <rect x={395} y={190 + b * 8 * 6} width={sw} height={8 * 6} fill={tint.fill} stroke={tint.stroke} strokeWidth={1} />
            {Array.from({ length: 7 }, (_, r) => (
              <line key={r} x1={395} x2={395 + sw} y1={190 + b * 48 + (r + 1) * 6} y2={190 + b * 48 + (r + 1) * 6} stroke={tint.stroke} strokeWidth={0.4} />
            ))}
            {Array.from({ length: 8 }, (_, r) => (
              <rect key={r} x={560} y={190 + b * 48 + r * 6} width={12} height={6} fill={tint.fill} stroke={tint.stroke} strokeWidth={0.6} />
            ))}
          </motion.g>
        );
      })}
      <Label x={566} y={176} size={13} weight={650} color="var(--ink)" delay={1.6}>
        (32,)
      </Label>

      <Arrow x1={590} y1={286} x2={680} y2={286} delay={2.1} />
      <Appear delay={2.2}>
        <Box x={780} y={286} w={190} h={64} title="F.cross_entropy" sub="wants (N, C) and (N,)" tone="accent" />
      </Appear>
      <Arrow x1={780} y1={322} x2={780} y2={372} delay={2.4} />
      <Appear delay={2.5}>
        <Pill x={780} y={394} text="loss: mean of 32 values" tone="mark" />
      </Appear>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Step 8: training plateaus                                           */
/* ------------------------------------------------------------------ */

function Train() {
  const plot = { x: 110, y: 100, w: 520, h: 320 };
  const sx = (s: number) => plot.x + (s / 10000) * plot.w;
  const sy = (l: number) => plot.y + plot.h - ((l - 2) / 3) * plot.h;
  const L = (s: number) => 2.47 + 2.4 * Math.exp(-s / 1300);
  const train = Array.from({ length: 101 }, (_, i) => {
    const s = i * 100;
    const wobble = Math.sin(i * 2.3) * 0.03 + Math.sin(i * 0.7) * 0.02;
    return `${sx(s).toFixed(1)},${sy(L(s) + wobble).toFixed(1)}`;
  }).join(" ");
  const val = Array.from({ length: 21 }, (_, i) => {
    const s = i * 500;
    return `${sx(s).toFixed(1)},${sy(L(s) + 0.03).toFixed(1)}`;
  }).join(" ");
  return (
    <g>
      <Appear>
        <line x1={plot.x} x2={plot.x + plot.w} y1={plot.y + plot.h} y2={plot.y + plot.h} stroke="var(--ink-3)" />
        <line x1={plot.x} x2={plot.x} y1={plot.y} y2={plot.y + plot.h} stroke="var(--ink-3)" />
        {[2, 3, 4, 5].map((l) => (
          <text key={l} x={plot.x - 10} y={sy(l) + 4} textAnchor="end" fontSize={12} className="mono" fill="var(--ink-3)">
            {l}.0
          </text>
        ))}
        {[0, 2500, 5000, 7500, 10000].map((s) => (
          <text key={s} x={sx(s)} y={plot.y + plot.h + 20} textAnchor="middle" fontSize={12} className="mono" fill="var(--ink-3)">
            {s.toLocaleString("en-US")}
          </text>
        ))}
        <text x={plot.x + plot.w / 2} y={plot.y + plot.h + 42} textAnchor="middle" fontSize={12.5} fill="var(--ink-2)">
          training steps, tiny Shakespeare, batch 32 x 8
        </text>
        <text x={plot.x} y={plot.y - 14} fontSize={12.5} fill="var(--ink-2)">
          loss
        </text>
        <line x1={plot.x} x2={plot.x + plot.w} y1={sy(4.17)} y2={sy(4.17)} stroke="var(--ink-3)" strokeDasharray="5 5" />
        <text x={plot.x + plot.w - 4} y={sy(4.17) - 8} textAnchor="end" fontSize={12.5} fill="var(--ink-2)">
          uniform guess: 4.17
        </text>
        <line x1={plot.x} x2={plot.x + plot.w} y1={sy(2.47)} y2={sy(2.47)} stroke="var(--mark)" strokeDasharray="5 5" />
        <text x={plot.x + plot.w - 4} y={sy(2.47) + 22} textAnchor="end" fontSize={12.5} fontWeight={650} fill="var(--ink)">
          bigram floor: about 2.5
        </text>
      </Appear>
      <motion.polyline
        points={train}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.8, delay: 0.4, ease: "easeOut" }}
      />
      <motion.polyline
        points={val}
        fill="none"
        stroke="var(--violet)"
        strokeWidth={2}
        strokeDasharray="2 4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 2 }}
      />
      <Appear delay={2.2}>
        <line x1={680} x2={706} y1={120} y2={120} stroke="var(--accent)" strokeWidth={2.4} />
        <text x={714} y={124} fontSize={13} fill="var(--ink-2)">
          train loss
        </text>
        <line x1={680} x2={706} y1={146} y2={146} stroke="var(--violet)" strokeWidth={2.4} strokeDasharray="2 4" />
        <text x={714} y={150} fontSize={13} fill="var(--ink-2)">
          val loss (held-out 10%)
        </text>
      </Appear>
      <Lines
        x={680}
        y={204}
        lines={["Starts near 4.8, ends near 2.5,", "and both curves stay together.", "", "e^2.5 is about 12: the model is", "as unsure as picking among 12", "characters at every step."]}
        size={13.5}
        gap={21}
        delay={2.4}
      />
      <Lines
        x={680}
        y={404}
        lines={["The curve is a sketch. Real runs print", "about 4.8 at the start and level off", "near 2.5, as drawn."]}
        size={12}
        gap={17}
        color="var(--ink-3)"
        delay={2.6}
      />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Step 9: generate live                                               */
/* ------------------------------------------------------------------ */

const GEN_LEN = 132;
const LINE = 38;

function TryIt({ playing }: { playing: boolean }) {
  const [temp, setTemp] = useState(1);
  const [smooth, setSmooth] = useState(false);
  const [seed, setSeed] = useState(7);
  const [k, setK] = useState(0);
  const text = useMemo(() => generate("s", GEN_LEN, temp, smooth, seed), [temp, smooth, seed]);

  useEffect(() => {
    if (!playing || k >= text.length) return;
    const t = setTimeout(() => setK((v) => v + 1), k === 0 ? 400 : 45);
    return () => clearTimeout(t);
  }, [playing, k, text.length]);

  const shown = text.slice(0, Math.max(1, k));
  const last = shown[shown.length - 1];
  const p = rowProbs(stoi(last), temp, smooth);
  const top = p
    .map((v, j) => ({ v, j }))
    .filter((d) => d.v > 0)
    .sort((a, b) => b.v - a.v)
    .slice(0, 4);
  const lines: string[] = [];
  for (let i = 0; i < shown.length; i += LINE) lines.push(shown.slice(i, i + LINE));

  const restart = (fn: () => void) => {
    fn();
    setK(0);
  };

  return (
    <>
      <Svg label="Sampling text from the bigram count table">
        <Heatmap focusRow={stoi(last)} y={128} title="the row of the last character decides the next" />
        <rect x={500} y={84} width={420} height={152} rx={14} fill="var(--card)" stroke="var(--ink)" strokeWidth={1.4} />
        <text x={516} y={106} fontSize={12} fill="var(--ink-3)">
          generated, one character at a time
        </text>
        {lines.map((l, i) => (
          <text key={i} x={516} y={136 + i * 25} fontSize={16} className="mono" fill="var(--ink)" style={{ whiteSpace: "pre" }}>
            {i === lines.length - 1 ? (
              <>
                {l.slice(0, -1)}
                <tspan fill="var(--mark)" fontWeight={800}>
                  {l.slice(-1) === " " ? "·" : l.slice(-1)}
                </tspan>
              </>
            ) : (
              l
            )}
          </text>
        ))}
        <text x={500} y={272} fontSize={13.5} fontWeight={650} fill="var(--ink)">
          next character after <tspan className="mono">{show(last)}</tspan>
        </text>
        <Bars
          x={540}
          y={284}
          labels={top.map((d) => show(CHARS[d.j]))}
          values={top.map((d) => d.v)}
          width={190}
          row={24}
          max={1}
          format={(v) => v.toFixed(2)}
        />
      </Svg>
      <StageOverlay position="bottom-right" className="w-[240px] !p-2.5 sm:w-[264px] sm:!p-3">
        <Slider
          label="Temperature"
          value={temp}
          min={0.2}
          max={2}
          step={0.1}
          format={(v) => v.toFixed(1)}
          onChange={(v) => restart(() => setTemp(v))}
        />
        <div className="mt-1.5">
          <Toggle label="Add 1 to every count" checked={smooth} onChange={(v) => restart(() => setSmooth(v))} />
        </div>
        <button type="button" className="btn btn-primary mt-2 w-full justify-center !py-1.5 text-[13px]" onClick={() => restart(() => setSeed((s) => s + 1))}>
          Sample again
        </button>
      </StageOverlay>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Step 10: one character of memory                                    */
/* ------------------------------------------------------------------ */

function Limit() {
  const e = stoi("e");
  const p = COUNTS[e].map((c) => c / ROW_TOTALS[e]);
  const nz = p.map((v, j) => ({ v, j })).filter((d) => d.v > 0);
  const cases = [
    { past: "by th", next: " ", note: "the" },
    { past: "she s", next: "l", note: "sells" },
    { past: "sells s", next: "a", note: "sea" },
  ];
  return (
    <g>
      <Corpus dim />
      <text x={48} y={104} fontSize={15} fontWeight={650} fill="var(--ink)">
        Three different pasts that end in e
      </text>
      {cases.map((c, i) => {
        const y = 150 + i * 70;
        return (
          <Appear key={i} delay={0.2 + i * 0.2}>
            <text x={60} y={y + 6} fontSize={20} className="mono" fill="var(--ink-3)" style={{ whiteSpace: "pre" }}>
              {c.past.replace(/ /g, "·")}
            </text>
            <rect x={60 + c.past.length * 12.2 + 10} y={y - 18} width={32} height={34} rx={7} fill="var(--mark-soft)" stroke="var(--mark)" strokeWidth={1.6} />
            <text x={60 + c.past.length * 12.2 + 26} y={y + 6} textAnchor="middle" fontSize={20} className="mono" fontWeight={700} fill="var(--ink)">
              e
            </text>
            <text x={60} y={y + 34} fontSize={12.5} fill="var(--ink-3)">
              as in &quot;{c.note}&quot;, next is <tspan className="mono" fill="var(--ink)">{show(c.next)}</tspan>
            </text>
          </Appear>
        );
      })}
      {cases.map((c, i) => (
        <Arrow key={i} x1={60 + c.past.length * 12.2 + 52} y1={146 + i * 70} x2={540} y2={222} delay={0.9 + i * 0.1} tone="muted" />
      ))}
      <Appear delay={1.2}>
        <rect x={552} y={150} width={330} height={150} rx={14} fill="var(--card)" stroke="var(--ink)" strokeWidth={1.4} />
        <text x={570} y={178} fontSize={13.5} fontWeight={650} fill="var(--ink)">
          The bigram&apos;s answer, every time
        </text>
      </Appear>
      <Bars x={610} y={192} labels={nz.map((d) => show(CHARS[d.j]))} values={nz.map((d) => d.v)} width={170} row={30} max={1} delay={1.3} format={(v) => v.toFixed(2)} />

      <line x1={48} x2={912} y1={354} y2={354} stroke="var(--rule)" />
      <Appear delay={1.7}>
        <text x={48} y={392} fontSize={15} fontWeight={650} fill="var(--ink)">
          Day 4: attention
        </text>
        <text x={48} y={414} fontSize={13} fill="var(--ink-3)">
          each position reads every earlier one
        </text>
      </Appear>
      {[..."the sea sho"].map((c, i) => {
        const x = 370 + i * 44;
        const last = i === 10;
        return (
          <Appear key={i} delay={1.8 + i * 0.03} y={0}>
            <rect x={x - 16} y={420} width={32} height={34} rx={7} fill={last ? "var(--mark-soft)" : "var(--card)"} stroke={last ? "var(--mark)" : "var(--rule-strong)"} strokeWidth={last ? 1.6 : 1} />
            <text x={x} y={443} textAnchor="middle" fontSize={16} className="mono" fill="var(--ink)">
              {show(c)}
            </text>
            {!last && (
              <motion.path
                d={`M ${x} 418 Q ${(x + 810) / 2} ${418 - 20 - (10 - i) * 4.5} 810 418`}
                fill="none"
                stroke="var(--q)"
                strokeWidth={1.2}
                opacity={0.6}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 2.1 + (10 - i) * 0.05 }}
              />
            )}
          </Appear>
        );
      })}
      <Label x={854} y={443} size={16} anchor="start" mono weight={700} color="var(--mark)" delay={2.6}>
        r?
      </Label>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Step 11: recap                                                      */
/* ------------------------------------------------------------------ */

const RECAP = [
  ["Bigram", "P(next | current) is one row of a (vocab, vocab) table."],
  ["Neural form", "nn.Embedding(vocab_size, vocab_size): row i is the logits."],
  ["Loss", "-ln p(correct next), averaged over every position."],
  ["At init", "ln(vocab_size): ln 65 = 4.17 for tiny Shakespeare."],
  ["Shapes", "F.cross_entropy wants (B*T, C) logits and (B*T,) targets."],
  ["Ceiling", "About 2.5: one character of context is not enough."],
];

function Recap() {
  return (
    <g>
      <Corpus dim />
      <g transform="scale(0.92)">
        <Heatmap title="the whole model, as counts" x={96} y={150} />
      </g>
      {RECAP.map(([k, v], i) => (
        <Appear key={k} delay={0.3 + i * 0.15}>
          <circle cx={442} cy={128 + i * 58} r={5} fill="var(--mark)" />
          <text x={458} y={133 + i * 58} fontSize={15} fontWeight={650} fill="var(--ink)">
            {k}
          </text>
          <text x={458} y={154 + i * 58} fontSize={13.5} fill="var(--ink-2)">
            {v}
          </text>
        </Appear>
      ))}
    </g>
  );
}

export function Stage({ step, playing }: StageProps) {
  if (step === 8) return <TryIt playing={playing} />;
  return (
    <Svg label="A bigram language model and its loss">
      {step === 0 && <Idea playing={playing} />}
      {step === 1 && <Counts />}
      {step === 2 && <Sample />}
      {step === 3 && <Neural />}
      {step === 4 && <Loss />}
      {step === 5 && <Untrained />}
      {step === 6 && <Reshape />}
      {step === 7 && <Train />}
      {step === 9 && <Limit />}
      {step === 10 && <Recap />}
    </Svg>
  );
}
