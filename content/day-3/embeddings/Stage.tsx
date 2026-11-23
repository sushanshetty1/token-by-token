"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { StageOverlay } from "@/components/viz/controls";
import { Appear, Arrow, Box, Cells, Chip, chipWidth, EASE, Label, Matrix, Pill, Svg } from "@/components/viz/svg";
import { seededVector } from "@/lib/color";
import type { StageProps } from "@/lib/types";
import { Track } from "../tokenization/Track";
import { BLOCK, POS, SENTENCE, TOK, VOCAB, xAt } from "./data";

const TRACK = ["token ids", "token table", "position table", "x = tok + pos", "blocks"];
const TRACK_AT: number[][] = [[0, 1], [1], [1], [1, 4], [2], [3], [2], [0, 1, 2, 3], [0, 1, 2, 3, 4]];

const PITCH = 36;
const CELL = 34;
const TX = 430;
const TY = 136;

function rowXs(texts: string[], x0: number, gap: number, fs: number) {
  const out: number[] = [];
  let c = x0;
  for (const t of texts) {
    const w = chipWidth(t, fs);
    out.push(c + w / 2);
    c += w + gap;
  }
  return out;
}

function Sentence({ ids, x0, y, hl, delay = 0 }: { ids: number[]; x0: number; y: number; hl?: number; delay?: number }) {
  const xs = rowXs(ids.map((i) => VOCAB[i]), x0, 10, 15);
  return (
    <g>
      {ids.map((id, i) => (
        <Chip key={i} x={xs[i]} y={y} text={VOCAB[id]} id={id} index={id} highlight={hl === i} delay={delay + i * 0.06} />
      ))}
    </g>
  );
}

function TokenTable({ x = TX, labelGap = 52, dimExcept, title = true }: { x?: number; labelGap?: number; dimExcept?: number[]; title?: boolean }) {
  const W = 6 * PITCH - 2;
  return (
    <g>
      {title && (
        <text x={x + W / 2} y={TY - 30} textAnchor="middle" fontSize={13} fill="var(--ink-2)">
          <tspan className="mono" fontWeight={650} fill="var(--accent)">
            token_embedding_table
          </tspan>
          <tspan className="mono"> (8, 6)</tspan>
        </text>
      )}
      {VOCAB.map((w, r) => (
        <text key={w} x={x - labelGap} y={TY + r * PITCH + 22} textAnchor="end" fontSize={12.5} className="mono" fill="var(--ink-2)">
          <tspan fill="var(--ink-3)">{r}</tspan> {w}
        </text>
      ))}
      <Matrix x={x} y={TY} values={TOK} cell={CELL} gap={2} colLabels={["0", "1", "2", "3", "4", "5"]} stagger={0.004} />
      {dimExcept &&
        VOCAB.map((_, r) =>
          dimExcept.includes(r) ? null : (
            <motion.rect
              key={r}
              x={x - 2}
              y={TY + r * PITCH - 2}
              width={W + 4}
              height={CELL + 4}
              fill="var(--card)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.72 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            />
          ),
        )}
    </g>
  );
}

function RowBox({ x, y, w, h, tone = "var(--ink)", delay = 0 }: { x: number; y: number; w: number; h: number; tone?: string; delay?: number }) {
  return (
    <motion.rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={7}
      fill="none"
      stroke={tone}
      strokeWidth={2.2}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, delay }}
    />
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

/* Step 1: an id picks a row */
function Lookup() {
  const W = 6 * PITCH - 2;
  const ry = TY + 2 * PITCH;
  return (
    <g>
      <Label x={60} y={86} size={13} anchor="start" color="var(--ink-3)">
        input ids (B = 1, T = 3)
      </Label>
      <Sentence ids={SENTENCE} x0={60} y={114} hl={0} />
      <TokenTable />
      <text x={TX + W / 2} y={TY + 8 * PITCH + 18} textAnchor="middle" fontSize={12.5} className="mono" fill="var(--ink-2)">
        8 rows = vocab_size, 6 columns = n_embd
      </text>
      <RowBox x={TX - 4} y={ry - 4} w={W + 8} h={CELL + 8} delay={0.5} />
      <Arrow x1={88} y1={150} x2={318} y2={ry + 17} tone="mark" bend={-24} delay={0.3} label="id 2: take row 2" />
      <motion.g
        initial={{ x: TX - 700, opacity: 0.2 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.9, delay: 1, ease: EASE }}
      >
        <Cells x={700} y={ry} values={TOK[2]} cell={CELL} gap={2} showValues stagger={0} />
      </motion.g>
      <Appear delay={1.6}>
        <text x={700 + W / 2} y={ry - 14} textAnchor="middle" fontSize={14} fontWeight={650} fill="var(--ink)">
          the vector for &quot;dog&quot;
        </text>
        <text x={700 + W / 2} y={ry + CELL + 24} textAnchor="middle" fontSize={12.5} className="mono" fill="var(--ink-3)">
          n_embd = 6 numbers
        </text>
      </Appear>
      <Label x={480} y={490} size={13.5} color="var(--ink-2)" delay={1.9}>
        Nothing is computed. The id is a row number, and the row is the token&apos;s vector.
      </Label>
    </g>
  );
}

/* Step 2: the same thing as one-hot times the table */
function OneHot() {
  const W = 6 * PITCH - 2;
  const ry = TY + 2 * PITCH;
  const hot = VOCAB.map((_, i) => (i === 2 ? 1 : 0));
  return (
    <g>
      <TokenTable dimExcept={[2]} labelGap={58} />
      <Appear delay={0.2}>
        <text x={TX - 27} y={TY - 10} textAnchor="middle" fontSize={11.5} className="mono" fill="var(--ink-2)">
          one_hot
        </text>
      </Appear>
      {hot.map((v, i) => (
        <motion.g key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.05 }}>
          <rect
            x={TX - 44}
            y={TY + i * PITCH}
            width={CELL}
            height={CELL}
            rx={6}
            fill={v ? "var(--mark)" : "var(--cell-zero)"}
            stroke={v ? "var(--mark)" : "var(--rule)"}
          />
          <text x={TX - 27} y={TY + i * PITCH + 22} textAnchor="middle" fontSize={14} className="mono" fontWeight={650} fill={v ? "var(--card)" : "var(--ink-3)"}>
            {v}
          </text>
        </motion.g>
      ))}
      <Label x={60} y={86} size={13} anchor="start" color="var(--ink-3)">
        input ids (B = 1, T = 3)
      </Label>
      <Sentence ids={SENTENCE} x0={60} y={114} hl={0} />
      <Arrow x1={88} y1={150} x2={TX - 52} y2={TY + 2 * PITCH + 17} tone="mark" bend={-24} delay={0.2} label="id 2 as one-hot" />
      <RowBox x={TX - 48} y={ry - 4} w={W + 52} h={CELL + 8} delay={0.8} tone="var(--mark)" />
      <Appear delay={1.1}>
        <text x={672} y={ry + 23} fontSize={18} fill="var(--ink-2)">
          =
        </text>
        <Cells x={700} y={ry} values={TOK[2]} cell={CELL} gap={2} showValues stagger={0} />
        <text x={700 + W / 2} y={ry - 14} textAnchor="middle" fontSize={14} fontWeight={650} fill="var(--ink)">
          row 2, unchanged
        </text>
      </Appear>
      <Lines
        x={807}
        y={300}
        anchor="middle"
        lines={["Each row is multiplied by its", "one-hot entry and the rows are", "summed. The zeros wipe out", "every row except row 2."]}
        size={12.5}
        gap={18}
        color="var(--ink-3)"
        delay={1.4}
      />
      <Appear delay={1.7}>
        <text x={480} y={462} textAnchor="middle" fontSize={15} className="mono" fill="var(--ink)">
          one_hot(2) @ W = W[2]
        </text>
        <text x={480} y={486} textAnchor="middle" fontSize={13} className="mono" fill="var(--ink-3)">
          (1, 8) @ (8, 6) = (1, 6)
        </text>
      </Appear>
    </g>
  );
}

/* Step 3: after training, similar tokens sit close together */
const PLOT = { cx: 690, cy: 268, s: 160 };
const CLUSTERS = [
  { label: "articles", cx: 590, cy: 148, rx: 64, ry: 48, lx: 590, ly: 216 },
  { label: "nouns", cx: 776, cy: 176, rx: 84, ry: 62, lx: 776, ly: 258 },
  { label: "verbs", cx: 726, cy: 392, rx: 70, ry: 46, lx: 826, ly: 430 },
];

function Meaning() {
  const x2 = 150;
  const W = 6 * PITCH - 2;
  const { cx, cy, s } = PLOT;
  return (
    <g>
      <motion.g initial={{ x: TX - x2 }} animate={{ x: 0 }} transition={{ duration: 0.8, ease: EASE }}>
        <TokenTable x={x2} />
        <RowBox x={x2 - 4} y={TY - 4} w={2 * PITCH + 6} h={8 * PITCH + 6} tone="var(--mark)" delay={0.8} />
      </motion.g>
      <Label x={x2 + 34} y={TY + 8 * PITCH + 22} size={12.5} color="var(--ink-3)" delay={1}>
        columns 0 and 1, plotted
      </Label>
      <Appear delay={0.9}>
        <line x1={cx - s - 10} x2={cx + s + 10} y1={cy} y2={cy} stroke="var(--rule-strong)" strokeWidth={1.2} />
        <line x1={cx} x2={cx} y1={cy - s - 10} y2={cy + s + 10} stroke="var(--rule-strong)" strokeWidth={1.2} />
        <text x={cx + s + 14} y={cy + 4} fontSize={12} className="mono" fill="var(--ink-3)">
          dim 0
        </text>
        <text x={cx + 8} y={cy - s - 2} fontSize={12} className="mono" fill="var(--ink-3)">
          dim 1
        </text>
        <text x={cx - 0.6 * s} y={cy + 0.5 * s + 36} textAnchor="middle" fontSize={12.5} fontWeight={600} fill="var(--ink-3)">
          punctuation
        </text>
        {CLUSTERS.map((c) => (
          <g key={c.label}>
            <ellipse cx={c.cx} cy={c.cy} rx={c.rx} ry={c.ry} fill="var(--mark-soft)" stroke="var(--mark)" strokeDasharray="4 4" opacity={0.75} />
            <text x={c.lx} y={c.ly} textAnchor="middle" fontSize={12.5} fontWeight={600} fill="var(--ink-2)">
              {c.label}
            </text>
          </g>
        ))}
      </Appear>
      {VOCAB.map((w, i) => (
        <Chip key={w} x={cx + TOK[i][0] * s} y={cy - TOK[i][1] * s} text={w} index={i} fontSize={13} h={28} delay={1.2 + i * 0.07} />
      ))}
      <Label x={480} y={488} size={12.5} color="var(--ink-3)" delay={1.8}>
        Simplified: real tables have hundreds of columns, and these numbers are made up to show the idea.
      </Label>
      <text x={x2 + W / 2} y={TY + 8 * PITCH + 40} textAnchor="middle" fontSize={12.5} fill="var(--ink-3)" />
    </g>
  );
}

/* Step 4: without positions, order is invisible */
function Order() {
  const xs = [130, 262, 394];
  const rows = [
    { name: "A", ids: [2, 5, 4], y: 128 },
    { name: "B", ids: [4, 5, 2], y: 318 },
  ];
  return (
    <g>
      {rows.map((r, ri) => (
        <g key={r.name}>
          <text x={52} y={r.y + 6} fontSize={18} fontWeight={700} fill="var(--ink-3)">
            {r.name}
          </text>
          {r.ids.map((id, i) => (
            <g key={i}>
              <Chip x={xs[i]} y={r.y} text={VOCAB[id]} index={id} delay={ri * 0.3 + i * 0.06} />
              <Cells x={xs[i] - 56} y={r.y + 30} values={TOK[id]} cell={18} gap={2} delay={ri * 0.3 + 0.2} stagger={0.01} />
            </g>
          ))}
        </g>
      ))}
      <Appear delay={0.7}>
        <rect x={596} y={136} width={304} height={252} rx={18} fill="var(--card)" stroke="var(--ink-2)" strokeWidth={1.4} strokeDasharray="6 5" />
        <text x={748} y={124} textAnchor="middle" fontSize={14} fontWeight={650} fill="var(--ink)">
          what attention receives
        </text>
        {[2, 5, 4].map((id, i) => (
          <g key={id}>
            <text x={684} y={i * 66 + 197} textAnchor="end" fontSize={14} className="mono" fill="var(--ink-2)">
              {VOCAB[id]}
            </text>
            <Cells x={698} y={i * 66 + 180} values={TOK[id]} cell={24} gap={2} stagger={0} />
          </g>
        ))}
      </Appear>
      <Arrow x1={462} y1={168} x2={588} y2={220} delay={1} />
      <Arrow x1={462} y1={356} x2={588} y2={306} delay={1.1} />
      <Label x={748} y={414} size={13} color="var(--ink-3)" delay={1.3}>
        the same set of three vectors
      </Label>
      <Label x={480} y={476} size={13.5} color="var(--ink-2)" delay={1.6}>
        A and B mean opposite things, yet the model gets identical inputs, only reordered.
      </Label>
    </g>
  );
}

/* Step 5: a second table, indexed by position */
function Positions() {
  const PX = 600;
  const PY = 150;
  const small = 26;
  const W = 6 * PITCH - 2;
  return (
    <g>
      <Sentence ids={SENTENCE} x0={70} y={88} />
      <text x={70} y={TY + 12} fontSize={12.5} fill="var(--ink-2)">
        <tspan className="mono" fontWeight={650} fill="var(--accent)">
          token table
        </tspan>
        <tspan className="mono"> (8, 6)</tspan>
      </text>
      <Matrix x={110} y={TY + 26} values={TOK} cell={small - 2} gap={2} showValues={false} stagger={0.003} />
      {VOCAB.map((w, r) => (
        <text key={w} x={102} y={TY + 26 + r * small + 16} textAnchor="end" fontSize={11} className="mono" fill="var(--ink-3)">
          {w}
        </text>
      ))}
      {[2, 5, 4].map((r, i) => (
        <RowBox key={r} x={108} y={TY + 24 + r * small} w={6 * small + 2} h={small + 2} tone="var(--accent)" delay={0.2 + i * 0.1} />
      ))}

      <text x={PX + W / 2} y={PY - 30} textAnchor="middle" fontSize={13} fill="var(--ink-2)">
        <tspan className="mono" fontWeight={650} fill="var(--violet)">
          position_embedding_table
        </tspan>
        <tspan className="mono"> (6, 6)</tspan>
      </text>
      {POS.map((_, r) => (
        <text key={r} x={PX - 10} y={PY + r * PITCH + 22} textAnchor="end" fontSize={12.5} className="mono" fill="var(--ink-2)">
          pos {r}
        </text>
      ))}
      <Matrix x={PX} y={PY} values={POS} cell={CELL} gap={2} colLabels={["0", "1", "2", "3", "4", "5"]} delay={0.3} stagger={0.006} />
      {[3, 4, 5].map((r) => (
        <motion.rect
          key={r}
          x={PX - 2}
          y={PY + r * PITCH - 2}
          width={W + 4}
          height={CELL + 4}
          fill="var(--card)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.72 }}
          transition={{ duration: 0.5, delay: 1.2 }}
        />
      ))}
      <RowBox x={PX - 4} y={PY - 4} w={W + 8} h={3 * PITCH + 6} tone="var(--violet)" delay={1.2} />

      <Appear delay={0.8}>
        <text x={452} y={PY - 10} textAnchor="middle" fontSize={12} className="mono" fill="var(--ink-2)">
          torch.arange(3)
        </text>
      </Appear>
      {[0, 1, 2].map((t) => (
        <g key={t}>
          <Chip x={452} y={PY + t * PITCH + 17} text={String(t)} index={4} fontSize={14} h={28} delay={0.9 + t * 0.12} />
          <Arrow x1={472} y1={PY + t * PITCH + 17} x2={540} y2={PY + t * PITCH + 17} tone="violet" delay={1 + t * 0.12} duration={0.4} />
        </g>
      ))}
      <Lines
        x={PX + W / 2}
        y={PY + 6 * PITCH + 26}
        anchor="middle"
        lines={["block_size = 6 rows: the longest", "context this model can read."]}
        size={12.5}
        gap={18}
        color="var(--ink-3)"
        delay={1.4}
      />
      <Appear delay={1.6}>
        <Pill x={264} y={462} text="tok_emb (1, 3, 6)" tone="accent" fontSize={13} />
        <text x={364} y={467} textAnchor="middle" fontSize={18} fill="var(--ink-2)">
          +
        </text>
        <Pill x={454} y={462} text="pos_emb (3, 6)" tone="violet" fontSize={13} />
        <text x={538} y={467} textAnchor="middle" fontSize={18} fill="var(--ink-2)">
          =
        </text>
        <Pill x={600} y={462} text="x ?" tone="mark" fontSize={13} strong />
      </Appear>
    </g>
  );
}

/* Step 6: x = tok_emb + pos_emb */
const COLS = [320, 545, 770];
const VEC_W = 6 * 34 - 2;
const ROWS_Y = { chip: 92, tok: 140, pos: 204, x: 268 };

function Sum() {
  return (
    <g>
      {[
        { y: ROWS_Y.tok, name: "tok_emb", shape: "(1, 3, 6)", color: "var(--accent)" },
        { y: ROWS_Y.pos, name: "pos_emb", shape: "(3, 6)", color: "var(--violet)" },
        { y: ROWS_Y.x, name: "x", shape: "(1, 3, 6)", color: "var(--mark)" },
      ].map((r, i) => (
        <Appear key={r.name} delay={i * 0.5}>
          <text x={48} y={r.y + 14} fontSize={14} className="mono" fontWeight={650} fill={r.color}>
            {r.name}
          </text>
          <text x={48} y={r.y + 32} fontSize={12} className="mono" fill="var(--ink-3)">
            {r.shape}
          </text>
        </Appear>
      ))}
      <Label x={196} y={ROWS_Y.pos + 22} size={20} color="var(--ink-3)" delay={0.5}>
        +
      </Label>
      <Label x={196} y={ROWS_Y.x + 22} size={20} color="var(--ink-3)" delay={1}>
        =
      </Label>
      {SENTENCE.map((id, t) => (
        <g key={t}>
          <Chip x={COLS[t]} y={ROWS_Y.chip} text={VOCAB[id]} index={id} delay={t * 0.05} />
          <Label x={COLS[t]} y={ROWS_Y.chip + 32} size={12} mono color="var(--violet)">
            position {t}
          </Label>
          <Cells x={COLS[t] - VEC_W / 2} y={ROWS_Y.tok} values={TOK[id]} cell={32} gap={2} showValues stagger={0} delay={0.1} />
          <Cells x={COLS[t] - VEC_W / 2} y={ROWS_Y.pos} values={POS[t]} cell={32} gap={2} showValues stagger={0} delay={0.6} />
          <Cells x={COLS[t] - VEC_W / 2} y={ROWS_Y.x} values={xAt(id, t)} cell={32} gap={2} max={1.4} showValues delay={1.1} stagger={0.03} />
        </g>
      ))}

      <line x1={48} x2={912} y1={336} y2={336} stroke="var(--rule)" />
      <Appear delay={1.6}>
        <text x={48} y={372} fontSize={13.5} fill="var(--ink-2)">
          <tspan fontWeight={650} fill="var(--ink)">dog</tspan> in &quot;dog bites man&quot;, position 0
        </text>
        <Cells x={420} y={356} values={xAt(2, 0)} cell={24} gap={2} max={1.4} stagger={0} />
        <text x={48} y={424} fontSize={13.5} fill="var(--ink-2)">
          <tspan fontWeight={650} fill="var(--ink)">dog</tspan> in &quot;man bites dog&quot;, position 2
        </text>
        <Cells x={420} y={408} values={xAt(2, 2)} cell={24} gap={2} max={1.4} stagger={0} />
        <path d="M 586 362 q 12 0 12 12 L 598 418 q 0 12 -12 12" fill="none" stroke="var(--mark)" strokeWidth={1.6} />
        <text x={612} y={393} fontSize={13.5} fontWeight={650} fill="var(--ink)">
          different x
        </text>
        <text x={612} y={412} fontSize={12.5} fill="var(--ink-3)">
          same token, different place
        </text>
      </Appear>
      <Label x={480} y={482} size={13} color="var(--ink-3)" delay={2}>
        pos_emb is (T, C). PyTorch broadcasts it over the batch, so x keeps the shape (B, T, C).
      </Label>
    </g>
  );
}

/* Step 7: three ways to encode position */
function Variants() {
  const panels = [48, 344, 640];
  const w = 272;
  const sines = [1, 0.45, 0.2, 0.09];
  return (
    <g>
      {panels.map((px, i) => (
        <Appear key={px} delay={i * 0.25}>
          <rect x={px} y={74} width={w} height={370} rx={16} fill="var(--card)" stroke={i === 0 ? "var(--violet)" : "var(--rule-strong)"} strokeWidth={i === 0 ? 1.8 : 1.2} />
        </Appear>
      ))}

      <Appear delay={0.1}>
        <text x={68} y={108} fontSize={17} fontWeight={650} fill="var(--ink)">
          Learned
        </text>
        <text x={68} y={130} fontSize={12.5} fill="var(--ink-3)">
          GPT-2, and this lesson
        </text>
        {Array.from({ length: 6 }, (_, r) => (
          <Cells key={r} x={96} y={156 + r * 22} values={seededVector(`wpe${r}`, 8)} cell={20} gap={2} stagger={0} />
        ))}
        <text x={84} y={170} textAnchor="end" fontSize={11} className="mono" fill="var(--ink-3)">
          0
        </text>
        <text x={84} y={280} textAnchor="end" fontSize={11} className="mono" fill="var(--ink-3)">
          5
        </text>
        <Lines x={68} y={320} lines={["One trained row per position,", "exactly like the token table.", "GPT-2: 1,024 x 768 = 786,432", "numbers. There is no row for", "position 1,024 or beyond."]} size={13} gap={20} />
      </Appear>

      <Appear delay={0.35}>
        <text x={364} y={108} fontSize={17} fontWeight={650} fill="var(--ink)">
          Sinusoidal
        </text>
        <text x={364} y={130} fontSize={12.5} fill="var(--ink-3)">
          the original transformer, 2017
        </text>
        {sines.map((f, d) => {
          const y0 = 168 + d * 34;
          const pts = Array.from({ length: 61 }, (_, k) => {
            const x = 372 + k * 3.6;
            const y = y0 - Math.sin(k * f * 0.55) * 12;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          }).join(" ");
          return (
            <g key={d}>
              <polyline points={pts} fill="none" stroke="var(--violet)" strokeWidth={1.8} />
            </g>
          );
        })}
        <text x={372} y={300} fontSize={11.5} className="mono" fill="var(--ink-3)">
          position 0 to 60, four dimensions
        </text>
        <Lines x={364} y={340} lines={["A fixed formula: sines and", "cosines at different speeds.", "Zero parameters. Each position", "gets its own pattern of values."]} size={13} gap={20} />
      </Appear>

      <Label x={480} y={482} size={13.5} color="var(--ink-2)" delay={0.9}>
        All three answer the same question: how does the model tell position 0 from position 5?
      </Label>
      <Appear delay={0.6}>
        <text x={660} y={108} fontSize={17} fontWeight={650} fill="var(--ink)">
          Rotary (RoPE)
        </text>
        <text x={660} y={130} fontSize={12.5} fill="var(--ink-3)">
          Llama and most new models, Day 7
        </text>
        <circle cx={776} cy={222} r={62} fill="none" stroke="var(--rule-strong)" strokeDasharray="3 4" />
        <path d="M 807 204 A 36 36 0 0 0 767 187" fill="none" stroke="var(--mark)" strokeWidth={2} />
        <line x1={776} y1={222} x2={827} y2={193} stroke="var(--q)" strokeWidth={2.4} markerEnd="url(#arrow-q)" />
        <line x1={776} y1={222} x2={761} y2={166} stroke="var(--k)" strokeWidth={2.4} markerEnd="url(#arrow-k)" />
        <text x={836} y={196} fontSize={13} className="mono" fontWeight={650} fill="var(--q)">
          q
        </text>
        <text x={746} y={162} fontSize={13} className="mono" fontWeight={650} fill="var(--k)">
          k
        </text>
        <text x={776} y={306} textAnchor="middle" fontSize={12} fill="var(--ink-3)">
          their angle gap tracks token distance
        </text>
        <Lines x={660} y={340} lines={["Rotates q and k inside attention", "instead of adding to x. Their", "dot product then depends only", "on how far apart the tokens are."]} size={13} gap={20} />
      </Appear>
    </g>
  );
}

/* Step 8: build a sentence and watch x */
const PRESETS: { label: string; ids: number[] }[] = [
  { label: "dog bites man", ids: [2, 5, 4] },
  { label: "man bites dog", ids: [4, 5, 2] },
  { label: "the dog sees the cat", ids: [0, 2, 6, 0, 3] },
];
const T_COL0 = 128;
const T_COLW = 134;
const T_CELL = 18;

function TryIt() {
  const [ids, setIds] = useState<number[]>([0, 2, 6, 0, 3]);
  const counts = new Map<number, number[]>();
  ids.forEach((id, t) => counts.set(id, [...(counts.get(id) ?? []), t]));
  const repeated = [...counts.entries()].find(([, ts]) => ts.length > 1);
  const message = repeated
    ? `"${VOCAB[repeated[0]]}" sits at positions ${repeated[1].join(" and ")}: identical token rows, different x.`
    : ids.length === 0
      ? "Click words below to build a sentence (up to 6 tokens, the block_size)."
      : "Each x is its token row plus its position row. Try a sentence with a repeated word.";
  const rows = [
    { y: 138, name: "token", color: "var(--accent)" },
    { y: 218, name: "+ pos", color: "var(--violet)" },
    { y: 298, name: "= x", color: "var(--mark)" },
  ];
  return (
    <>
      <Svg label="Token vectors, position vectors and their sum">
        {rows.map((r) => (
          <text key={r.name} x={40} y={r.y + 14} fontSize={13.5} className="mono" fontWeight={650} fill={r.color}>
            {r.name}
          </text>
        ))}
        {ids.map((id, t) => {
          const vw = 6 * (T_CELL + 2) - 2;
          const cx = T_COL0 + t * T_COLW + vw / 2;
          const rep = repeated && repeated[0] === id;
          return (
            <g key={`${t}-${id}`}>
              <Chip x={cx} y={66} text={VOCAB[id]} index={id} fontSize={14} h={30} highlight={!!rep} />
              <text x={cx} y={100} textAnchor="middle" fontSize={11.5} className="mono" fill="var(--violet)">
                pos {t}
              </text>
              <Cells x={cx - vw / 2} y={rows[0].y} values={TOK[id]} cell={T_CELL} gap={2} stagger={0} />
              <Cells x={cx - vw / 2} y={rows[1].y} values={POS[t]} cell={T_CELL} gap={2} stagger={0} />
              <Cells x={cx - vw / 2} y={rows[2].y} values={xAt(id, t)} cell={T_CELL} gap={2} max={1.4} stagger={0.02} />
              {rep && <rect x={cx - vw / 2 - 4} y={rows[2].y - 4} width={vw + 8} height={T_CELL + 8} rx={6} fill="none" stroke="var(--mark)" strokeWidth={2} />}
            </g>
          );
        })}
        {ids.length === 0 && (
          <text x={480} y={180} textAnchor="middle" fontSize={14} fill="var(--ink-3)">
            No tokens yet.
          </text>
        )}
        <text x={40} y={370} fontSize={14} fill="var(--ink)">
          {message}
        </text>
      </Svg>
      <StageOverlay position="bottom" className="w-[calc(100%-24px)] max-w-[680px] !p-2.5 sm:!p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {VOCAB.map((w, i) => (
            <button
              key={w}
              type="button"
              disabled={ids.length >= BLOCK}
              onClick={() => setIds((s) => (s.length >= BLOCK ? s : [...s, i]))}
              className="rounded-md border border-rule-strong bg-card px-2 py-0.5 font-mono text-[12.5px] font-semibold text-ink hover:border-ink disabled:opacity-40"
            >
              {w}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-rule-strong" aria-hidden />
          <button
            type="button"
            onClick={() => setIds((s) => s.slice(0, -1))}
            className="rounded-md px-1.5 py-0.5 text-[12.5px] font-medium text-ink-2 hover:text-ink"
          >
            Undo
          </button>
          <button type="button" onClick={() => setIds([])} className="rounded-md px-1.5 py-0.5 text-[12.5px] font-medium text-ink-2 hover:text-ink">
            Clear
          </button>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[12px] text-ink-3">Try:</span>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setIds(p.ids)}
              className="rounded-full border border-rule-strong bg-card px-2.5 py-0.5 text-[12px] font-medium text-ink-2 hover:border-ink hover:text-ink"
            >
              {p.label}
            </button>
          ))}
          <span className="ml-auto hidden font-mono text-[12px] text-ink-3 sm:inline">
            T = {ids.length} of block_size {BLOCK}
          </span>
        </div>
      </StageOverlay>
    </>
  );
}

/* Step 9: recap */
function Recap() {
  return (
    <g>
      <Pill x={96} y={120} text="idx (1, 3)" />
      <Arrow x1={140} y1={120} x2={196} y2={120} delay={0.1} />
      <Box x={290} y={120} w={170} h={58} title="token table" sub="(vocab_size, C)" tone="accent" />
      <Arrow x1={378} y1={120} x2={432} y2={120} delay={0.2} />
      <Pill x={510} y={120} text="tok_emb (1, 3, 6)" tone="accent" />

      <Pill x={96} y={236} text="arange(3)" />
      <Arrow x1={140} y1={236} x2={196} y2={236} delay={0.3} />
      <Box x={290} y={236} w={170} h={58} title="position table" sub="(block_size, C)" tone="violet" />
      <Arrow x1={378} y1={236} x2={444} y2={236} delay={0.4} />
      <Pill x={510} y={236} text="pos_emb (3, 6)" tone="violet" />

      <Arrow x1={588} y1={128} x2={660} y2={170} delay={0.6} />
      <Arrow x1={576} y1={228} x2={660} y2={190} delay={0.6} />
      <Appear delay={0.8}>
        <circle cx={680} cy={180} r={18} fill="var(--card)" stroke="var(--ink)" strokeWidth={1.6} />
        <text x={680} y={187} textAnchor="middle" fontSize={20} fill="var(--ink)">
          +
        </text>
      </Appear>
      <Arrow x1={700} y1={180} x2={746} y2={180} delay={0.9} />
      <Appear delay={1}>
        <Pill x={808} y={180} text="x (1, 3, 6)" tone="mark" strong />
        <text x={808} y={214} textAnchor="middle" fontSize={12.5} fill="var(--ink-3)">
          into the blocks, Day 4
        </text>
      </Appear>

      <line x1={48} x2={912} y1={300} y2={300} stroke="var(--rule)" />
      {[
        "A lookup is one-hot times a matrix, so each row learns by gradient descent.",
        "Attention alone sees a set. Position vectors make word order visible.",
        "x = tok_emb + pos_emb broadcasts (T, C) over the batch to give (B, T, C).",
      ].map((t, i) => (
        <Appear key={t} delay={1.2 + i * 0.2}>
          <circle cx={84} cy={344 + i * 46} r={5} fill="var(--mark)" />
          <text x={100} y={349 + i * 46} fontSize={15} fill="var(--ink)">
            {t}
          </text>
        </Appear>
      ))}
    </g>
  );
}

export function Stage({ step }: StageProps) {
  if (step === 7) return <TryIt />;
  return (
    <Svg label="Embeddings and positions">
      <Track items={TRACK} at={TRACK_AT[step] ?? []} />
      {step === 0 && <Lookup />}
      {step === 1 && <OneHot />}
      {step === 2 && <Meaning />}
      {step === 3 && <Order />}
      {step === 4 && <Positions />}
      {step === 5 && <Sum />}
      {step === 6 && <Variants />}
      {step === 8 && <Recap />}
    </Svg>
  );
}
