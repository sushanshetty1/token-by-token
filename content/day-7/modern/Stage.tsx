"use client";

import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect, useState } from "react";
import { Appear, Arrow, Box, Cells, Chip, EASE, Label, Pill, Svg, type Tone } from "@/components/viz/svg";
import { Slider, StageOverlay } from "@/components/viz/controls";
import { tokenTint } from "@/lib/color";
import type { StageProps } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* The mini map on the left: where in the model this change lives.     */
/* ------------------------------------------------------------------ */

const MAP = [
  { id: "tok", label: "Token embedding", y: 106 },
  { id: "pos", label: "Positions", y: 148 },
  { id: "norm1", label: "Norm", y: 204 },
  { id: "attn", label: "Attention", y: 246 },
  { id: "norm2", label: "Norm", y: 300 },
  { id: "mlp", label: "MLP", y: 342 },
  { id: "normf", label: "Final norm", y: 412 },
  { id: "head", label: "LM head", y: 454 },
];

const MAP_ON: Record<number, string[]> = {
  1: ["pos", "attn"],
  2: ["norm1", "norm2", "normf"],
  3: ["mlp"],
  4: ["attn"],
  5: ["attn"],
  6: ["mlp"],
  7: ["tok", "attn", "head"],
};

function MiniMap({ step }: { step: number }) {
  const on = MAP_ON[step] ?? [];
  return (
    <g>
      <Label x={96} y={78} size={12} color="var(--ink-3)">
        Where in the model
      </Label>
      <line x1={96} y1={106} x2={96} y2={454} stroke="var(--rule-strong)" strokeWidth={1.4} />
      <rect x={22} y={182} width={148} height={184} rx={12} fill="none" stroke="var(--rule-strong)" strokeDasharray="4 4" />
      <Label x={96} y={384} size={11.5} mono color="var(--ink-3)">
        x n_layer
      </Label>
      {MAP.map((m) => {
        const hit = on.includes(m.id);
        return (
          <motion.g key={m.id} initial={false} animate={{ opacity: hit ? 1 : 0.55 }}>
            <rect
              x={32}
              y={m.y - 16}
              width={128}
              height={32}
              rx={9}
              fill={hit ? "var(--mark-soft)" : "var(--card)"}
              stroke={hit ? "var(--mark)" : "var(--rule-strong)"}
              strokeWidth={hit ? 2 : 1.2}
            />
            <text x={96} y={m.y + 4.5} textAnchor="middle" fontSize={13} fontWeight={hit ? 700 : 500} fill="var(--ink)">
              {m.label}
            </text>
          </motion.g>
        );
      })}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Shared before / after frame.                                        */
/* ------------------------------------------------------------------ */

const BX = 222;
const AX = 592;
const PW = 344;

function Frame({ before = "GPT-2 (2019)", after = "Now", why }: { before?: string; after?: string; why: [string, string] }) {
  return (
    <g>
      <rect x={BX} y={100} width={PW} height={336} rx={14} fill="var(--card)" stroke="var(--rule-strong)" />
      <rect x={AX} y={100} width={PW} height={336} rx={14} fill="var(--card)" stroke="var(--mark)" strokeWidth={1.6} />
      <Pill x={BX + PW / 2} y={100} text={before} tone="muted" fontSize={12.5} mono={false} strong />
      <Pill x={AX + PW / 2} y={100} text={after} tone="mark" fontSize={12.5} mono={false} strong />
      <Arrow x1={BX + PW + 4} y1={268} x2={AX - 4} y2={268} tone="mark" delay={0.3} duration={0.4} />
      <Appear delay={0.6}>
        <rect x={BX} y={450} width={AX + PW - BX} height={60} rx={12} fill="var(--mark-soft)" stroke="var(--mark)" />
        <Label x={BX + 18} y={474} anchor="start" size={13.5} weight={650} color="var(--ink)">
          {why[0]}
        </Label>
        <Label x={BX + 18} y={496} anchor="start" size={13} color="var(--ink-2)">
          {why[1]}
        </Label>
      </Appear>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Step 1: the same skeleton with swapped parts.                       */
/* ------------------------------------------------------------------ */

const OLD_BLOCK = ["Token + learned position embedding", "LayerNorm", "Multi-head attention", "LayerNorm", "GELU MLP, 4C hidden", "LayerNorm", "LM head, tied to embedding"];
const NEW_BLOCK = [
  "Token embedding only",
  "RMSNorm",
  "Grouped-query attention, RoPE",
  "RMSNorm",
  "SwiGLU MLP, or mixture of experts",
  "RMSNorm",
  "LM head, untied",
];
const ROW_Y = [130, 192, 236, 288, 332, 398, 444];

function Intro() {
  const col = (x: number, rows: string[], changed: boolean, title: string, tone: Tone, delay: number) => (
    <Appear delay={delay}>
      <Label x={x} y={92} size={15} weight={700} color="var(--ink)">
        {title}
      </Label>
      <rect x={x - 176} y={168} width={352} height={186} rx={14} fill="none" stroke="var(--rule-strong)" strokeDasharray="5 5" />
      <Label x={x + 168} y={372} anchor="end" size={11.5} mono color="var(--ink-3)">
        x n_layer, pre-norm residual
      </Label>
      {rows.map((r, i) => (
        <Box key={r + i} x={x} y={ROW_Y[i]} w={320} h={34} radius={10} title={r} tone={changed ? tone : "ink"} />
      ))}
    </Appear>
  );
  return (
    <g>
      {col(250, OLD_BLOCK, false, "GPT-2 (2019)", "ink", 0.1)}
      {col(710, NEW_BLOCK, true, "A typical open model today", "mark", 0.5)}
      {ROW_Y.map((y, i) => (
        <Arrow key={y} x1={420} y1={y} x2={536} y2={y} tone="muted" delay={0.9 + i * 0.08} duration={0.35} />
      ))}
      <Appear delay={1.5}>
        <Label x={480} y={500} size={14} weight={650} color="var(--ink)">
          Same plan: embed, then pre-norm blocks of attention and MLP, then logits. The parts were swapped.
        </Label>
      </Appear>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Step 2: RoPE.                                                       */
/* ------------------------------------------------------------------ */

const DEG = Math.PI / 180;
const RC = { x: 704, y: 264, r: 96 };
const Q0 = 30;
const K0 = 75;
const STEP_DEG = 20;
const SHIFT = 3;

const polar = (a: number, r = RC.r) => ({ x: RC.x + r * Math.cos(a * DEG), y: RC.y - r * Math.sin(a * DEG) });

function arcPath(a1: number, a2: number, r: number) {
  const p1 = polar(a1, r);
  const p2 = polar(a2, r);
  return `M ${p1.x} ${p1.y} A ${r} ${r} 0 0 0 ${p2.x} ${p2.y}`;
}

function RopeDial() {
  const s = useMotionValue(0);
  useEffect(() => {
    const c = animate(s, SHIFT * STEP_DEG, { duration: 2.2, delay: 1.4, ease: EASE });
    return () => c.stop();
  }, [s]);
  const qx = useTransform(s, (v) => polar(Q0 + v).x);
  const qy = useTransform(s, (v) => polar(Q0 + v).y);
  const kx = useTransform(s, (v) => polar(K0 + v).x);
  const ky = useTransform(s, (v) => polar(K0 + v).y);
  const qlx = useTransform(s, (v) => polar(Q0 + v, RC.r + 16).x);
  const qly = useTransform(s, (v) => polar(Q0 + v, RC.r + 16).y + 5);
  const klx = useTransform(s, (v) => polar(K0 + v, RC.r + 16).x);
  const kly = useTransform(s, (v) => polar(K0 + v, RC.r + 16).y + 5);
  const arc = useTransform(s, (v) => arcPath(Q0 + v, K0 + v, 40));
  const posText = useTransform(s, (v) => `m = ${4 + Math.round(v / STEP_DEG)},  n = ${2 + Math.round(v / STEP_DEG)}`);
  return (
    <g>
      <circle cx={RC.x} cy={RC.y} r={RC.r} fill="none" stroke="var(--rule-strong)" />
      <line x1={RC.x - RC.r - 10} y1={RC.y} x2={RC.x + RC.r + 10} y2={RC.y} stroke="var(--rule)" />
      <line x1={RC.x} y1={RC.y - RC.r - 10} x2={RC.x} y2={RC.y + RC.r + 10} stroke="var(--rule)" />
      <line x1={RC.x} y1={RC.y} x2={polar(Q0).x} y2={polar(Q0).y} stroke="var(--q)" strokeWidth={1.4} strokeDasharray="4 4" opacity={0.6} />
      <line x1={RC.x} y1={RC.y} x2={polar(K0).x} y2={polar(K0).y} stroke="var(--k)" strokeWidth={1.4} strokeDasharray="4 4" opacity={0.6} />
      <motion.path d={arc} fill="none" stroke="var(--mark)" strokeWidth={3} />
      <motion.line x1={RC.x} y1={RC.y} x2={qx} y2={qy} stroke="var(--q)" strokeWidth={3} markerEnd="url(#arrow-q)" />
      <motion.line x1={RC.x} y1={RC.y} x2={kx} y2={ky} stroke="var(--k)" strokeWidth={3} markerEnd="url(#arrow-k)" />
      <motion.text x={qlx} y={qly} textAnchor="middle" fontSize={15} fontWeight={700} fill="var(--q)">
        q
      </motion.text>
      <motion.text x={klx} y={kly} textAnchor="middle" fontSize={15} fontWeight={700} fill="var(--k)">
        k
      </motion.text>
      <circle cx={RC.x} cy={RC.y} r={4} fill="var(--ink)" />
      <motion.text x={RC.x} y={RC.y + RC.r + 34} textAnchor="middle" fontSize={13} className="mono" fill="var(--ink)">
        {posText}
      </motion.text>
    </g>
  );
}

const TOK = [0.6, -0.3, 0.8, 0.1, -0.7, 0.4, -0.2, 0.5];
const WPE = [0.2, 0.5, -0.4, -0.6, 0.3, -0.1, 0.7, -0.3];

function Rope() {
  return (
    <g>
      <Frame
        why={[
          "Attention now depends on how far apart two tokens are, not where they sit.",
          "No position table to outgrow, so context can be stretched. Llama, Mistral, Qwen and nanochat use RoPE.",
        ]}
      />
      <Appear delay={0.2}>
        <Label x={BX + 20} y={140} anchor="start" size={13} weight={650} color="var(--ink)">
          A learned table, added once at the input
        </Label>
        <Label x={BX + 20} y={172} anchor="start" size={12} color="var(--ink-3)">
          token embedding
        </Label>
        <Cells x={BX + 20} y={180} values={TOK} cell={22} gap={3} />
        <Label x={BX + 20} y={226} anchor="start" size={12} color="var(--ink-3)">
          + wpe[5], a learned row
        </Label>
        <Cells x={BX + 20} y={234} values={WPE} cell={22} gap={3} delay={0.3} />
        <Label x={BX + 20} y={280} anchor="start" size={12} color="var(--ink-3)">
          = input to block 1
        </Label>
        <Cells x={BX + 20} y={288} values={TOK.map((v, i) => Math.max(-1, Math.min(1, v + WPE[i])))} cell={22} gap={3} delay={0.6} />
      </Appear>
      <Appear delay={0.5}>
        <Label x={BX + 290} y={170} size={12} mono color="var(--ink-3)">
          wpe
        </Label>
        {Array.from({ length: 12 }, (_, i) => (
          <rect
            key={i}
            x={BX + 262}
            y={180 + i * 12}
            width={56}
            height={10}
            rx={3}
            fill={i === 5 ? "var(--mark)" : "var(--paper-2)"}
            stroke="var(--rule-strong)"
            strokeWidth={0.6}
          />
        ))}
        <Label x={BX + 290} y={338} size={12} mono color="var(--ink-2)">
          1,024 rows
        </Label>
        <Label x={BX + 20} y={372} anchor="start" size={13} color="var(--ink)">
          Token 1,025 has no row: GPT-2 cannot go past
        </Label>
        <Label x={BX + 20} y={392} anchor="start" size={13} color="var(--ink)">
          its context length. Each position is learned
        </Label>
        <Label x={BX + 20} y={412} anchor="start" size={13} color="var(--ink)">
          separately, as an absolute place.
        </Label>
      </Appear>

      <Appear delay={0.6}>
        <Label x={AX + 20} y={140} anchor="start" size={13} weight={650} color="var(--ink)">
          Rotate q and k inside attention
        </Label>
      </Appear>
      <Appear delay={0.8}>
        <RopeDial />
      </Appear>
      <Appear delay={0.9}>
        {["q at position m", "turns by m x θ", "", "k at position n", "turns by n x θ"].map((l, i) =>
          l ? (
            <Label key={l} x={AX + 222} y={180 + i * 18} anchor="start" size={12} color={i < 2 ? "var(--q)" : "var(--k)"}>
              {l}
            </Label>
          ) : null,
        )}
      </Appear>
      <Appear delay={3.6}>
        {["Shift both by 3:", "the angle", "between them", "stays the same."].map((l, i) => (
          <Label key={l} x={AX + 222} y={292 + i * 18} anchor="start" size={12.5} weight={650} color="var(--ink)">
            {l}
          </Label>
        ))}
      </Appear>
      <Appear delay={1}>
        <Label x={AX + PW / 2} y={424} size={12} color="var(--ink-3)">
          One pair of dimensions, θ = 20 degrees. v is not rotated.
        </Label>
      </Appear>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Step 3: RMSNorm.                                                    */
/* ------------------------------------------------------------------ */

const XV = [1.8, 0.6, -0.4, 2.2, 1.0, -1.2, 0.4, 1.6];
const r2 = (v: number) => Math.round(v * 100) / 100;

function RmsNorm() {
  const n = XV.length;
  const mean = XV.reduce((a, b) => a + b, 0) / n;
  const centered = XV.map((v) => v - mean);
  const std = Math.sqrt(centered.reduce((a, b) => a + b * b, 0) / n);
  const ln = centered.map((v) => r2(v / std));
  const rms = Math.sqrt(XV.reduce((a, b) => a + b * b, 0) / n);
  const rn = XV.map((v) => r2(v / rms));
  const row = (x: number, y: number, label: string, values: number[], delay: number) => (
    <Appear delay={delay}>
      <Label x={x} y={y - 8} anchor="start" size={12} color="var(--ink-2)">
        {label}
      </Label>
      <Cells x={x} y={y} values={values} cell={32} gap={4} max={3.6} showValues />
    </Appear>
  );
  return (
    <g>
      <Frame
        why={[
          "Re-centering turned out not to matter; re-scaling does.",
          "RMSNorm skips the mean: one reduction instead of two, same quality. Llama, Mistral, Qwen, Gemma use it.",
        ]}
      />
      <Label x={BX + 20} y={140} anchor="start" size={13} weight={650} color="var(--ink)">
        LayerNorm
      </Label>
      {row(BX + 20, 172, "x", XV, 0.2)}
      {row(BX + 20, 236, `x - mean, mean = ${mean.toFixed(2)}`, centered.map(r2), 0.6)}
      {row(BX + 20, 300, `divide by std, std = ${std.toFixed(2)}`, ln, 1)}
      <Appear delay={1.4}>
        <Label x={BX + 20} y={364} anchor="start" size={13} mono color="var(--ink)">
          then x γ + β
        </Label>
        <Label x={BX + 20} y={390} anchor="start" size={12.5} color="var(--ink-2)">
          two passes over x, two learned vectors
        </Label>
      </Appear>

      <Label x={AX + 20} y={140} anchor="start" size={13} weight={650} color="var(--ink)">
        RMSNorm
      </Label>
      {row(AX + 20, 172, "x", XV, 0.4)}
      {row(AX + 20, 236, `divide by rms(x), rms = ${rms.toFixed(2)}`, rn, 1.2)}
      <Appear delay={1.6}>
        <Label x={AX + 20} y={300} anchor="start" size={13} mono color="var(--ink)">
          rms(x) = sqrt(mean(x²) + eps)
        </Label>
        <Label x={AX + 20} y={364} anchor="start" size={13} mono color="var(--ink)">
          then x γ
        </Label>
        <Label x={AX + 20} y={390} anchor="start" size={12.5} color="var(--ink-2)">
          one pass, one learned vector, no bias
        </Label>
      </Appear>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Step 4: SwiGLU.                                                     */
/* ------------------------------------------------------------------ */

function SwiGlu() {
  const bx = BX + PW / 2;
  return (
    <g>
      <Frame
        why={[
          "A gate decides, per hidden unit, how much of the up projection passes through.",
          "At equal parameter count it trains to a lower loss. Llama, Mistral, Qwen and PaLM use SwiGLU.",
        ]}
      />
      <Appear delay={0.2}>
        <Pill x={bx} y={134} text="x  (C)" fontSize={13} />
        <Arrow x1={bx} y1={148} x2={bx} y2={162} duration={0.3} delay={0.3} />
        <Box x={bx} y={186} w={170} h={44} title="Linear" sub="C to 4C" />
        <Arrow x1={bx} y1={210} x2={bx} y2={226} duration={0.3} delay={0.5} />
        <Box x={bx} y={248} w={170} h={38} title="GELU" tone="violet" />
        <Arrow x1={bx} y1={268} x2={bx} y2={284} duration={0.3} delay={0.7} />
        <Box x={bx} y={308} w={170} h={44} title="Linear" sub="4C to C" />
        <Arrow x1={bx} y1={332} x2={bx} y2={350} duration={0.3} delay={0.9} />
        <Pill x={bx} y={364} text="out  (C)" fontSize={13} />
        <Label x={bx} y={412} size={13} mono color="var(--ink)">
          2 matrices: 2 x C x 4C = 8C²
        </Label>
      </Appear>

      <Appear delay={0.7}>
        <Pill x={764} y={134} text="x  (C)" fontSize={13} />
        <Arrow x1={748} y1={146} x2={696} y2={162} duration={0.3} delay={0.9} />
        <Arrow x1={780} y1={146} x2={832} y2={162} duration={0.3} delay={0.9} />
        <Box x={686} y={184} w={150} h={44} title="gate" sub="Linear C to H" tone="mark" />
        <Box x={842} y={184} w={150} h={44} title="up" sub="Linear C to H" />
        <Arrow x1={686} y1={208} x2={686} y2={222} duration={0.3} delay={1.1} />
        <Box x={686} y={242} w={110} h={36} title="SiLU" tone="violet" />
        <Arrow x1={712} y1={262} x2={752} y2={284} duration={0.3} delay={1.3} />
        <Arrow x1={842} y1={208} x2={778} y2={284} duration={0.3} delay={1.3} />
        <circle cx={764} cy={296} r={15} fill="var(--card)" stroke="var(--ink)" strokeWidth={1.6} />
        <text x={764} y={302} textAnchor="middle" fontSize={17} fontWeight={700} fill="var(--ink)">
          ×
        </text>
        <Label x={786} y={300} anchor="start" size={11.5} color="var(--ink-3)">
          elementwise
        </Label>
        <Arrow x1={764} y1={312} x2={764} y2={322} duration={0.3} delay={1.5} />
        <Box x={764} y={342} w={150} h={40} title="down" sub="Linear H to C" />
        <Arrow x1={764} y1={364} x2={764} y2={374} duration={0.3} delay={1.6} />
        <Pill x={764} y={386} text="out  (C)" fontSize={13} />
        <Label x={764} y={420} size={13} mono color="var(--ink)">
          3 matrices: 3 x C x H, with H = ?
        </Label>
      </Appear>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Steps 5 and 6: grouped-query attention.                             */
/* ------------------------------------------------------------------ */

function HeadsDiagram({ cx, y, nq, nkv, w, delay }: { cx: number; y: number; nq: number; nkv: number; w: number; delay: number }) {
  const step = w / nq;
  const size = Math.min(18, step - 4);
  const qx = (i: number) => cx - w / 2 + step * (i + 0.5);
  const per = nq / nkv;
  const kvx = (g: number) => (qx(g * per) + qx(g * per + per - 1)) / 2;
  const kvY = y + 110;
  return (
    <g>
      {Array.from({ length: nkv }, (_, g) => (
        <rect
          key={`bg${g}`}
          x={qx(g * per) - step / 2 + 1}
          y={y - 16}
          width={step * per - 2}
          height={kvY - y + 44}
          rx={8}
          fill={g % 2 ? "var(--paper-2)" : "transparent"}
        />
      ))}
      {Array.from({ length: nq }, (_, i) => {
        const g = Math.floor(i / per);
        return (
          <motion.line
            key={`l${i}`}
            x1={qx(i)}
            y1={y + size / 2 + 2}
            x2={kvx(g)}
            y2={kvY - 14}
            stroke="var(--rule-strong)"
            strokeWidth={1.2}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: delay + 0.3 }}
          />
        );
      })}
      {Array.from({ length: nq }, (_, i) => (
        <rect key={`q${i}`} x={qx(i) - size / 2} y={y - size / 2} width={size} height={size} rx={4} fill="var(--q-soft)" stroke="var(--q)" strokeWidth={1.4} />
      ))}
      {Array.from({ length: nkv }, (_, g) => {
        const x = kvx(g);
        const s = Math.min(18, step * per - 6);
        return (
          <g key={`kv${g}`}>
            <rect x={x - s / 2} y={kvY - 13} width={s} height={13} rx={3} fill="var(--k-soft)" stroke="var(--k)" strokeWidth={1.3} />
            <rect x={x - s / 2} y={kvY} width={s} height={13} rx={3} fill="var(--v-soft)" stroke="var(--v)" strokeWidth={1.3} />
          </g>
        );
      })}
    </g>
  );
}

const GQA_COLS = [
  { title: "Multi-head", sub: "GPT-2: one K/V per query head", nkv: 8 },
  { title: "Grouped-query", sub: "Llama 3, Mistral: shared in groups", nkv: 2 },
  { title: "Multi-query", sub: "PaLM: one K/V for all", nkv: 1 },
];

function GqaMechanism() {
  return (
    <g>
      {GQA_COLS.map((c, i) => {
        const cx = 341 + i * 238;
        return (
          <Appear key={c.title} delay={0.1 + i * 0.4}>
            <rect
              x={cx - 112}
              y={92}
              width={224}
              height={344}
              rx={14}
              fill="var(--card)"
              stroke={i === 0 ? "var(--rule-strong)" : "var(--mark)"}
              strokeWidth={i === 0 ? 1 : 1.6}
            />
            <Label x={cx} y={120} size={15} weight={700} color="var(--ink)">
              {c.title}
            </Label>
            <Label x={cx} y={140} size={11.5} color="var(--ink-2)">
              {c.sub}
            </Label>
            <Label x={cx} y={170} size={11.5} color="var(--ink-3)">
              8 query heads
            </Label>
            <HeadsDiagram cx={cx} y={192} nq={8} nkv={c.nkv} w={196} delay={0.2 + i * 0.4} />
            <Label x={cx} y={340} size={11.5} color="var(--ink-3)">
              {c.nkv === 1 ? "1 K/V head" : `${c.nkv} K/V heads`}
            </Label>
            <Label x={cx - 96} y={376} anchor="start" size={11.5} color="var(--ink-2)">
              KV cache
            </Label>
            <rect x={cx - 96} y={386} width={192} height={14} rx={4} fill="var(--paper-2)" />
            <motion.rect
              x={cx - 96}
              y={386}
              height={14}
              rx={4}
              fill="var(--k)"
              initial={{ width: 0 }}
              animate={{ width: (192 * c.nkv) / 8 }}
              transition={{ duration: 0.7, delay: 0.8 + i * 0.4, ease: EASE }}
            />
            <Label x={cx} y={422} size={12.5} mono weight={650} color="var(--ink)">
              {c.nkv === 8 ? "1x" : `${8 / c.nkv}x smaller`}
            </Label>
          </Appear>
        );
      })}
      <Appear delay={1.6}>
        <rect x={BX} y={450} width={714} height={60} rx={12} fill="var(--mark-soft)" stroke="var(--mark)" />
        <Label x={BX + 18} y={474} anchor="start" size={13.5} weight={650} color="var(--ink)">
          While generating, every layer stores K and V for every past token: the KV cache.
        </Label>
        <Label x={BX + 18} y={496} anchor="start" size={13} color="var(--ink-2)">
          Sharing K/V across query heads shrinks it, and the memory you read per token, for a small quality cost.
        </Label>
      </Appear>
    </g>
  );
}

const KV_OPTIONS = [1, 2, 4, 8, 16, 32];

function fmtBytes(b: number) {
  const gib = b / 2 ** 30;
  if (gib >= 1) return `${gib.toFixed(gib >= 10 ? 0 : 1)} GiB`;
  return `${(b / 2 ** 20).toFixed(0)} MiB`;
}

function GqaTry() {
  const [idx, setIdx] = useState(3);
  const nkv = KV_OPTIONS[idx];
  const perToken = 2 * 32 * nkv * 128 * 2;
  const total = perToken * 8192;
  const full = 2 * 32 * 32 * 128 * 2 * 8192;
  return (
    <div className="absolute inset-0">
      <Svg label="Grouped-query attention: choose the number of K/V heads">
        <Label x={40} y={84} anchor="start" size={13} color="var(--ink-2)">
          Shaped like Llama 2 7B: 32 layers, 32 query heads of size 128, fp16, one 8,192-token sequence.
        </Label>
        <Label x={40} y={126} anchor="start" size={12} color="var(--ink-3)">
          32 query heads
        </Label>
        <HeadsDiagram key={nkv} cx={480} y={154} nq={32} nkv={nkv} w={880} delay={0} />
        <Label x={40} y={306} anchor="start" size={12.5} color="var(--ink-2)">
          {nkv === 1 ? "1 K/V head (multi-query)" : nkv === 32 ? "32 K/V heads (multi-head)" : `${nkv} K/V heads, ${32 / nkv} query heads each`}
        </Label>
        <Label x={40} y={344} anchor="start" size={13} weight={650} color="var(--ink)">
          KV cache for this sequence
        </Label>
        <Label x={920} y={344} anchor="end" size={15} mono weight={700} color="var(--ink)">
          {fmtBytes(total)}
        </Label>
        <rect x={40} y={354} width={880} height={20} rx={5} fill="var(--paper-2)" stroke="var(--rule)" />
        <motion.rect
          x={40}
          y={354}
          height={20}
          rx={5}
          fill="var(--k)"
          initial={false}
          animate={{ width: Math.max(6, (880 * total) / full) }}
          transition={{ duration: 0.45, ease: EASE }}
        />
        <Label x={520} y={420} anchor="start" size={13} mono color="var(--ink)">
          {`2 x 32 layers x ${nkv} x 128 x 2 bytes`}
        </Label>
        <Label x={520} y={444} anchor="start" size={13} mono color="var(--ink)">
          {`= ${perToken / 1024} KiB per token`}
        </Label>
        <Label x={520} y={480} anchor="start" size={13.5} weight={650} color="var(--ink)">
          {nkv === 32 ? "This is plain multi-head attention." : `${32 / nkv}x smaller than multi-head attention.`}
        </Label>
      </Svg>
      <StageOverlay position="bottom-left" className="w-[min(260px,46%)]">
        <Slider
          label="K/V heads"
          value={idx}
          min={0}
          max={KV_OPTIONS.length - 1}
          step={1}
          onChange={(v) => setIdx(Math.round(v))}
          format={(v) => String(KV_OPTIONS[Math.round(v)])}
          hint="32 is multi-head, 1 is multi-query"
        />
      </StageOverlay>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step 7: mixture of experts.                                         */
/* ------------------------------------------------------------------ */

const MOE_TOKENS = [" The", " cat", " sat"];
const ROUTES = [
  [
    [0, 0.6],
    [2, 0.4],
  ],
  [
    [2, 0.3],
    [5, 0.7],
  ],
  [
    [5, 0.45],
    [6, 0.55],
  ],
];

function Moe() {
  const ex = (e: number) => 530 + e * 53;
  const tx = [600, 716, 832];
  const used = new Set(ROUTES.flat().map((r) => r[0]));
  return (
    <g>
      <rect x={BX} y={100} width={240} height={336} rx={14} fill="var(--card)" stroke="var(--rule-strong)" />
      <rect x={486} y={100} width={450} height={336} rx={14} fill="var(--card)" stroke="var(--mark)" strokeWidth={1.6} />
      <Pill x={BX + 120} y={100} text="Dense (GPT-2)" tone="muted" fontSize={12.5} mono={false} strong />
      <Pill x={711} y={100} text="Mixture of experts" tone="mark" fontSize={12.5} mono={false} strong />
      <Arrow x1={466} y1={268} x2={482} y2={268} tone="mark" delay={0.3} duration={0.3} />

      <Appear delay={0.2}>
        {MOE_TOKENS.map((t, i) => (
          <Chip key={t} x={262 + i * 80} y={146} text={t} index={i} fontSize={13} h={30} />
        ))}
        {MOE_TOKENS.map((t, i) => (
          <Arrow key={`d${t}`} x1={262 + i * 80} y1={164} x2={262 + i * 80} y2={222} tone="muted" delay={0.4} duration={0.4} />
        ))}
        <Box x={342} y={268} w={200} h={84} title="One MLP" sub="every token, all weights" />
        <Label x={342} y={360} size={12.5} color="var(--ink-2)">
          total = active
        </Label>
        <Label x={342} y={392} size={13} weight={650} color="var(--ink)">
          compute grows with size
        </Label>
      </Appear>

      <Appear delay={0.6}>
        {MOE_TOKENS.map((t, i) => (
          <Chip key={t} x={tx[i]} y={140} text={t} index={i} fontSize={13} h={30} />
        ))}
        {tx.map((x) => (
          <Arrow key={x} x1={x} y1={157} x2={x} y2={176} tone="muted" delay={0.8} duration={0.3} />
        ))}
        <Box x={711} y={200} w={400} h={40} title="Router: softmax over 8 experts, keep the top 2" tone="accent" />
      </Appear>
      {ROUTES.map((r, i) =>
        r.map(([e, w]) => (
          <motion.line
            key={`${i}-${e}`}
            x1={tx[i]}
            y1={222}
            x2={ex(e)}
            y2={282}
            stroke={tokenTint(i).stroke}
            strokeWidth={1.5 + w * 4}
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.1 + i * 0.35, ease: EASE }}
          />
        )),
      )}
      {Array.from({ length: 8 }, (_, e) => (
        <motion.g key={e} initial={{ opacity: 0 }} animate={{ opacity: used.has(e) ? 1 : 0.45 }} transition={{ duration: 0.4, delay: 0.8 + e * 0.04 }}>
          <rect
            x={ex(e) - 22}
            y={284}
            width={44}
            height={60}
            rx={9}
            fill={used.has(e) ? "var(--mark-soft)" : "var(--card-2)"}
            stroke={used.has(e) ? "var(--mark)" : "var(--rule-strong)"}
            strokeWidth={1.4}
          />
          <text x={ex(e)} y={312} textAnchor="middle" fontSize={13} fontWeight={650} fill="var(--ink)">
            {`E${e + 1}`}
          </text>
          <text x={ex(e)} y={330} textAnchor="middle" fontSize={10.5} className="mono" fill="var(--ink-3)">
            MLP
          </text>
        </motion.g>
      ))}
      <Appear delay={2.3}>
        <Label x={711} y={368} size={12.5} color="var(--ink-2)">
          {"Each token's output is the gate-weighted sum of its 2 experts."}
        </Label>
        <Label x={711} y={386} size={12.5} color="var(--ink-2)">
          Line width shows the gate weight.
        </Label>
        <Label x={600} y={418} size={13.5} weight={700} color="var(--ink)">
          total: 8 experts
        </Label>
        <Label x={820} y={418} size={13.5} weight={700} color="var(--ink)">
          active per token: 2
        </Label>
      </Appear>

      <Appear delay={2.6}>
        <rect x={BX} y={450} width={714} height={60} rx={12} fill="var(--mark-soft)" stroke="var(--mark)" />
        <Label x={BX + 18} y={474} anchor="start" size={13.5} weight={650} color="var(--ink)">
          More parameters at the same compute per token. Mixtral 8x7B: about 47B total, 13B active.
        </Label>
        <Label x={BX + 18} y={496} anchor="start" size={13} color="var(--ink-2)">
          DeepSeek-V3: 671B total, 37B active. Cost: every expert sits in memory, and a balancing loss is needed.
        </Label>
      </Appear>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Step 8: the smaller changes.                                        */
/* ------------------------------------------------------------------ */

const SMALL = [
  {
    title: "No biases",
    before: "nn.Linear(C, C, bias=True)",
    after: "nn.Linear(C, C, bias=False)",
    why: ["PaLM reported better training stability at", "scale without them. Fewer parameters too."],
  },
  {
    title: "QK-norm",
    before: "att = q @ k.T / sqrt(hs)",
    after: "q, k = norm(q), norm(k) first",
    why: ["Stops attention logits from growing huge.", "Used in OLMo 2, Gemma 3, Qwen3, nanochat."],
  },
  {
    title: "Untied embeddings",
    before: "lm_head.weight = wte.weight",
    after: "separate wte and lm_head",
    why: ["Input and output roles can differ.", "Costs vocab_size x C weights. Small models tie."],
  },
  {
    title: "Longer context",
    before: "block_size = 1024",
    after: "128K tokens is common",
    why: ["RoPE scaling (position interpolation, YaRN)", "plus long-context training. Cost: KV cache."],
  },
];

function Small() {
  return (
    <g>
      {SMALL.map((c, i) => {
        const x0 = i % 2 ? 588 : BX;
        const y0 = i < 2 ? 92 : 304;
        return (
          <Appear key={c.title} delay={0.15 + i * 0.3}>
            <rect x={x0} y={y0} width={348} height={196} rx={14} fill="var(--card)" stroke="var(--ink)" strokeWidth={1.3} />
            <Label x={x0 + 18} y={y0 + 30} anchor="start" size={15.5} weight={700} color="var(--ink)">
              {c.title}
            </Label>
            <Pill x={x0 + 46} y={y0 + 64} text="GPT-2" tone="muted" fontSize={11.5} mono={false} />
            <Label x={x0 + 84} y={y0 + 68} anchor="start" size={12.5} mono color="var(--ink-2)">
              {c.before}
            </Label>
            <Pill x={x0 + 46} y={y0 + 100} text="now" tone="mark" fontSize={11.5} mono={false} />
            <Label x={x0 + 84} y={y0 + 104} anchor="start" size={12.5} mono weight={650} color="var(--ink)">
              {c.after}
            </Label>
            <line x1={x0 + 1} y1={y0 + 126} x2={x0 + 347} y2={y0 + 126} stroke="var(--rule)" />
            <Label x={x0 + 18} y={y0 + 154} anchor="start" size={12.5} color="var(--ink)">
              {c.why[0]}
            </Label>
            <Label x={x0 + 18} y={y0 + 175} anchor="start" size={12.5} color="var(--ink)">
              {c.why[1]}
            </Label>
          </Appear>
        );
      })}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Step 9: recap table.                                                */
/* ------------------------------------------------------------------ */

const TABLE = [
  ["Positions", "learned table at the input", "RoPE: rotate q and k", "relative distance, stretchable"],
  ["Norm", "LayerNorm", "RMSNorm", "cheaper, works as well"],
  ["MLP", "GELU, 4C hidden", "SwiGLU, about 8C/3 hidden", "gating, same parameter count"],
  ["Attention", "multi-head", "grouped-query", "smaller KV cache"],
  ["Scaling up", "dense MLP", "mixture of experts", "more parameters, same compute"],
  ["Biases", "in every Linear", "none", "stability at scale"],
  ["q and k", "raw dot product", "QK-norm", "stable attention logits"],
  ["Embeddings", "tied to the LM head", "often untied", "separate input and output roles"],
  ["Context", "1,024 tokens", "128K is common", "RoPE scaling, long training"],
];

function Recap() {
  const cols = [48, 196, 420, 664];
  return (
    <g>
      <Appear>
        {["Part", "GPT-2 (2019)", "Now", "Why"].map((h, i) => (
          <Label key={h} x={cols[i]} y={106} anchor="start" size={12.5} weight={650} color={i === 2 ? "var(--ink)" : "var(--ink-3)"}>
            {h}
          </Label>
        ))}
      </Appear>
      {TABLE.map((r, i) => {
        const y = 138 + i * 42;
        return (
          <Appear key={r[0]} delay={0.1 + i * 0.08} y={4}>
            <rect x={32} y={y - 18} width={896} height={36} rx={9} fill={i % 2 ? "var(--card)" : "var(--card-2)"} stroke="var(--rule)" />
            <rect x={408} y={y - 18} width={232} height={36} fill="var(--mark-soft)" opacity={0.7} />
            <Label x={cols[0]} y={y + 5} anchor="start" size={13.5} weight={700} color="var(--ink)">
              {r[0]}
            </Label>
            <Label x={cols[1]} y={y + 5} anchor="start" size={13} color="var(--ink-2)">
              {r[1]}
            </Label>
            <Label x={cols[2]} y={y + 5} anchor="start" size={13.5} weight={650} color="var(--ink)">
              {r[2]}
            </Label>
            <Label x={cols[3]} y={y + 5} anchor="start" size={13} color="var(--ink-2)">
              {r[3]}
            </Label>
          </Appear>
        );
      })}
    </g>
  );
}

export function Stage({ step }: StageProps) {
  if (step === 5) return <GqaTry />;
  return (
    <Svg label="What changed in transformers since GPT-2">
      {step > 0 && step < 8 && <MiniMap step={step} />}
      {step === 0 && <Intro />}
      {step === 1 && <Rope />}
      {step === 2 && <RmsNorm />}
      {step === 3 && <SwiGlu />}
      {step === 4 && <GqaMechanism />}
      {step === 6 && <Moe />}
      {step === 7 && <Small />}
      {step === 8 && <Recap />}
    </Svg>
  );
}
