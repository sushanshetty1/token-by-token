"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { Appear, Arrow, Cells, Chip, Label, Pill, Svg, EASE, textWidth } from "@/components/viz/svg";
import { Slider } from "@/components/viz/controls";
import { sequential, seededVector } from "@/lib/color";
import type { StageProps } from "@/lib/types";
import { Readout, TryLayout } from "@/content/day-5/block/parts";
import { bytes, commas, count, pct, PRESETS, short, SMALL, type Cfg } from "./count";

const S = count(SMALL);

export function Stage({ step }: StageProps) {
  if (step === 5) return <TyingScene />;
  if (step === 7) return <MemoryScene />;
  if (step === 8) return <TryScene />;
  return <TableScene step={step} />;
}

const EMB = "var(--accent)";
const EMB2 = "color-mix(in oklab, var(--accent) 45%, var(--card))";
const ATTN = "var(--violet)";
const MLP = "var(--ok)";
const NORM = "var(--ink-3)";

function ConfigChips({ cfg = SMALL, y = 46 }: { cfg?: Cfg; y?: number }) {
  const items = [
    `n_layer = ${cfg.nLayer}`,
    `n_embd = C = ${commas(cfg.C)}`,
    `n_head = ${cfg.nHead}`,
    `vocab_size = ${commas(cfg.vocab)}`,
    `block_size = ${commas(cfg.block)}`,
  ];
  const ws = items.map((t) => textWidth(t, 12, true) + 16);
  const gap = 10;
  let x = 480 - (ws.reduce((a, b) => a + b, 0) + gap * (items.length - 1)) / 2;
  return (
    <g>
      {items.map((t, i) => {
        const cx = x + ws[i] / 2;
        x += ws[i] + gap;
        return <Pill key={t} x={cx} y={y} text={t} />;
      })}
    </g>
  );
}

/* ---------------------------------------------------------------- */
/* The counting table: steps 1 to 5, 7 and the recap                  */
/* ---------------------------------------------------------------- */

type RowId = "wte" | "wpe" | "blocks" | "lnf" | "head";

function TableScene({ step }: { step: number }) {
  const expanded = step === 3;
  const shown: Record<RowId, boolean> = {
    wte: step >= 1,
    wpe: step >= 2,
    blocks: step >= 4,
    lnf: step >= 4,
    head: step >= 4,
  };
  const hot: RowId | null = step === 1 ? "wte" : step === 2 ? "wpe" : step === 4 ? "blocks" : null;
  const final = step === 6 || step === 9;
  const scale = 300 / S.blocks;
  const xName = 60;
  const xFormula = 158;
  const xValue = 560;
  const xBar = 584;

  const rows: { id: RowId; name: string; formula: string; value: number; y: number }[] = [
    { id: "wte", name: "wte", formula: "vocab_size × C = 50,257 × 768", value: S.wte, y: 118 },
    { id: "wpe", name: "wpe", formula: "block_size × C = 1,024 × 768", value: S.wpe, y: 172 },
    { id: "blocks", name: "blocks", formula: expanded ? "one block, opened up:" : step >= 4 ? `12 × (12C² + 13C) = 12 × ${commas(S.perBlock)}` : "n_layer × (one block)", value: S.blocks, y: 226 },
    { id: "lnf", name: "ln_f", formula: "2C (γ and β)", value: S.lnF, y: 280 },
    { id: "head", name: "lm_head", formula: step >= 4 ? "50,257 × 768, tied to wte" : "C × vocab_size", value: 0, y: 334 },
  ];
  const visibleRows = expanded ? rows.slice(0, 3) : rows;

  const sub = [
    { name: "ln_1", formula: "2C", value: S.ln, color: NORM },
    { name: "attn.c_attn", formula: "C × 3C + 3C", value: S.cAttn, color: ATTN },
    { name: "attn.c_proj", formula: "C × C + C", value: S.attnProj, color: ATTN },
    { name: "ln_2", formula: "2C", value: S.ln, color: NORM },
    { name: "mlp.c_fc", formula: "C × 4C + 4C", value: S.cFc, color: MLP },
    { name: "mlp.c_proj", formula: "4C × C + C", value: S.mlpProj, color: MLP },
  ];
  const subScale = 300 / S.cFc;

  return (
    <Svg label="A table of GPT-2 small's parameters by component, with bars to scale">
      <ConfigChips />

      {visibleRows.map((r) => {
        const on = shown[r.id] || (expanded && r.id === "blocks");
        const isHot = hot === r.id || (expanded && r.id === "blocks");
        return (
          <g key={r.id}>
            {isHot && (
              <motion.rect
                x={40}
                y={r.y - 22}
                width={880}
                height={36}
                rx={10}
                fill="var(--mark-soft)"
                stroke="var(--mark)"
                strokeWidth={1.4}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
              />
            )}
            <Label x={xName} y={r.y} anchor="start" size={15} weight={700} mono color="var(--ink)">
              {r.name}
            </Label>
            <Label x={xFormula} y={r.y} anchor="start" size={13} mono color="var(--ink-2)">
              {r.formula}
            </Label>
            {!expanded || r.id !== "blocks" ? (
              <Label x={xValue} y={r.y} anchor="end" size={15} mono weight={650} color={on ? "var(--ink)" : "var(--ink-3)"}>
                {on ? (r.id === "head" ? "0" : commas(r.value)) : "?"}
              </Label>
            ) : null}
            {on && r.id === "wte" && <Bar x={xBar} y={r.y} w={r.value * scale} color={EMB} />}
            {on && r.id === "wpe" && <Bar x={xBar} y={r.y} w={Math.max(2, r.value * scale)} color={EMB2} />}
            {on && r.id === "blocks" && !expanded && (
              <>
                <Bar x={xBar} y={r.y} w={S.attn * scale} color={ATTN} />
                <Bar x={xBar + S.attn * scale} y={r.y} w={S.mlp * scale} color={MLP} delay={0.2} />
              </>
            )}
            {on && r.id === "lnf" && <Bar x={xBar} y={r.y} w={2} color={NORM} />}
            {on && r.id === "head" && (
              <Appear delay={0.3} y={0}>
                <rect x={xBar} y={r.y - 11} width={S.wte * scale} height={14} rx={4} fill="none" stroke={EMB} strokeWidth={1.4} strokeDasharray="4 3" />
                <text x={xBar + S.wte * scale + 8} y={r.y + 1} fontSize={12} fill="var(--ink-2)">
                  shared with wte
                </text>
              </Appear>
            )}
            {on && r.id === "wpe" && (
              <text x={xBar + 10} y={r.y + 1} fontSize={12} fill="var(--ink-2)">
                0.6%: a sliver
              </text>
            )}
          </g>
        );
      })}

      {expanded && (
        <g>
          {sub.map((s, i) => {
            const y = 264 + i * 30;
            return (
              <Appear key={s.name} delay={0.15 + i * 0.12} y={4}>
                <Label x={84} y={y} anchor="start" size={13.5} mono color="var(--ink)">
                  {s.name}
                </Label>
                <Label x={xFormula + 56} y={y} anchor="start" size={12.5} mono color="var(--ink-2)">
                  {s.formula}
                </Label>
                <Label x={xValue} y={y} anchor="end" size={13.5} mono color="var(--ink)">
                  {commas(s.value)}
                </Label>
                <rect x={xBar} y={y - 10} width={Math.max(2, s.value * subScale)} height={12} rx={3} fill={s.color} />
              </Appear>
            );
          })}
          <Appear delay={1.0}>
            <line x1={84} y1={436} x2={xValue} y2={436} stroke="var(--rule-strong)" />
            <Label x={84} y={462} anchor="start" size={14} weight={700} color="var(--ink)">
              one block
            </Label>
            <Label x={xFormula + 56} y={462} anchor="start" size={13} mono color="var(--ink-2)">
              12C² + 13C
            </Label>
            <Label x={xValue} y={462} anchor="end" size={15} mono weight={700} color="var(--ink)">
              {commas(S.perBlock)}
            </Label>
            <Label x={xBar} y={462} anchor="start" size={12.5}>
              bars here: share of one block
            </Label>
            <Label x={480} y={504} size={12.5}>
              {`attention ${pct(S.cAttn + S.attnProj, S.perBlock)} · MLP ${pct(S.cFc + S.mlpProj, S.perBlock)} · LayerNorms ${pct(2 * S.ln, S.perBlock, 2)}. n_head appears nowhere.`}
            </Label>
          </Appear>
        </g>
      )}

      {!expanded && (
        <g>
          <line x1={xName} y1={364} x2={900} y2={364} stroke="var(--rule-strong)" />
          <Label x={xName} y={396} anchor="start" size={16} weight={700} color="var(--ink)">
            total
          </Label>
          <Label x={xFormula} y={396} anchor="start" size={13} mono color="var(--ink-2)">
            {final || step === 4 ? "wte + wpe + blocks + ln_f" : "about 124M, but where?"}
          </Label>
          <Label x={xValue} y={396} anchor="end" size={17} mono weight={700} color={final || step === 4 ? "var(--ink)" : "var(--ink-3)"}>
            {final || step === 4 ? commas(S.total) : "?"}
          </Label>
          <StackedBar reveal={final} />
        </g>
      )}
    </Svg>
  );
}

function Bar({ x, y, w, color, delay = 0 }: { x: number; y: number; w: number; color: string; delay?: number }) {
  return (
    <motion.rect
      x={x}
      y={y - 11}
      height={14}
      rx={3}
      fill={color}
      initial={{ width: 0 }}
      animate={{ width: w }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    />
  );
}

function StackedBar({ reveal }: { reveal: boolean }) {
  const x0 = 60;
  const W = 840;
  const y = 424;
  const h = 34;
  const parts = [
    { name: "wte", v: S.wte, color: EMB },
    { name: "wpe", v: S.wpe, color: EMB2 },
    { name: "attention ×12", v: S.attn, color: ATTN },
    { name: "MLP ×12", v: S.mlp, color: MLP },
    { name: "LayerNorms", v: S.norms, color: NORM },
  ];
  let acc = x0;
  const segs = parts.map((p) => {
    const w = (p.v / S.total) * W;
    const s = { ...p, x: acc, w };
    acc += w;
    return s;
  });
  return (
    <g>
      <rect x={x0} y={y} width={W} height={h} rx={8} fill="var(--paper-2)" stroke="var(--rule-strong)" />
      {!reveal && (
        <Label x={x0 + W / 2} y={y + h / 2 + 5} size={13} color="var(--ink-3)">
          124M parameters, grouped by job: fills in at the total
        </Label>
      )}
      {reveal &&
        segs.map((s, i) => (
          <motion.g key={s.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 + i * 0.15 }}>
            <rect x={s.x} y={y} width={Math.max(1, s.w)} height={h} fill={s.color} />
            {s.w > 120 && (
              <text x={s.x + s.w / 2} y={y + h / 2 + 5} textAnchor="middle" fontSize={13} fontWeight={650} fill="var(--card)">
                {`${s.name}: ${pct(s.v, S.total)}`}
              </text>
            )}
          </motion.g>
        ))}
      {reveal && (
        <Appear delay={1}>
          <line x1={segs[1].x + 2} y1={y + h} x2={segs[1].x + 2} y2={y + h + 14} stroke="var(--ink-3)" />
          <Label x={segs[1].x + 2} y={y + h + 30} size={12} mono>
            {`wpe ${pct(S.wpe, S.total)}`}
          </Label>
          <line x1={x0 + W - 1} y1={y + h} x2={x0 + W - 1} y2={y + h + 14} stroke="var(--ink-3)" />
          <Label x={x0 + W} y={y + h + 30} anchor="end" size={12} mono>
            {`25 LayerNorms ${pct(S.norms, S.total, 2)}`}
          </Label>
          <Label x={480} y={y + h + 56} size={12.5}>
            {`Sorted: MLPs ${short(S.mlp)}, wte ${short(S.wte)}, attention ${short(S.attn)}, wpe ${short(S.wpe)}, LayerNorms ${commas(S.norms)}.`}
          </Label>
        </Appear>
      )}
    </g>
  );
}

/* ---------------------------------------------------------------- */
/* Step 6: weight tying                                               */
/* ---------------------------------------------------------------- */

function TyingScene() {
  const M = { x: 380, y: 136, w: 200, h: 310 };
  const rowY = M.y + (M.h * 3797) / 50257;
  const cells = 25;
  const cellH = M.h / cells;
  const logits = seededVector("tie-logits", cells).map((v, i) => (i === 17 ? 1 : 0.15 + Math.abs(v) * 0.4));
  const peakY = M.y + 17 * cellH + cellH / 2;
  return (
    <Svg label="One matrix serves as the token embedding at the input and as the output layer that scores every token">
      <ConfigChips />
      <Label x={190} y={96} size={14} weight={700} color="var(--ink)">
        Input: look up one row
      </Label>
      <Label x={800} y={96} size={14} weight={700} color="var(--ink)">
        Output: score every row
      </Label>

      <rect x={M.x} y={M.y} width={M.w} height={M.h} rx={8} fill="color-mix(in oklab, var(--accent) 10%, var(--card))" stroke="var(--accent)" strokeWidth={1.6} />
      {Array.from({ length: 24 }, (_, i) => (
        <line key={i} x1={M.x + 4} x2={M.x + M.w - 4} y1={M.y + (i + 1) * cellH} y2={M.y + (i + 1) * cellH} stroke="var(--accent)" strokeOpacity={0.18} />
      ))}
      <Label x={M.x + M.w / 2} y={M.y + M.h / 2 + 2} size={15} weight={700} color="var(--ink)">
        W
      </Label>
      <Label x={M.x + M.w / 2} y={M.y + M.h / 2 + 20} size={12} mono>
        50,257 × 768
      </Label>

      <Chip x={110} y={168} text=" cat" id={3797} index={1} />
      <Arrow x1={142} y1={168} x2={M.x - 4} y2={rowY} tone="accent" delay={0.3} />
      <motion.rect x={M.x} y={rowY - 4} width={M.w} height={8} rx={3} fill="var(--mark)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} />
      <Label x={250} y={150} size={12} mono>
        row 3797
      </Label>
      <Appear delay={0.9}>
        <Arrow x1={M.x - 4} y1={rowY + 8} x2={210} y2={268} tone="accent" bend={-30} />
        <Cells x={60} y={262} values={seededVector("tie-cat", 8)} cell={16} gap={2} />
        <Label x={130} y={302} size={12.5} mono color="var(--ink)">
          x = W[3797]
        </Label>
        <Label x={130} y={320} size={12}>
          the input vector for ·cat
        </Label>
      </Appear>

      <Appear delay={1.3}>
        <Cells x={M.x + 8} y={106} values={seededVector("tie-final", 11)} cell={14} gap={4} />
        <Label x={M.x + M.w + 10} y={118} anchor="start" size={12.5} mono color="var(--ink)">
          final x (after ln_f)
        </Label>
        <Arrow x1={M.x + M.w + 4} y1={peakY} x2={636} y2={peakY} tone="mark" />
        {logits.map((p, i) => (
          <rect key={i} x={642} y={M.y + i * cellH} width={24} height={cellH - 1} rx={2} fill={sequential(p, "var(--mark)")} stroke="var(--rule)" strokeWidth={0.5} />
        ))}
        <Label x={680} y={M.y + 12} anchor="start" size={12.5} mono color="var(--ink)">
          logits = W x
        </Label>
        <Label x={680} y={M.y + 30} anchor="start" size={12}>
          one dot product per row
        </Label>
        <Chip x={720} y={peakY} text=" mat" index={3} />
        <Label x={758} y={peakY + 5} anchor="start" size={12}>
          points like x: high score
        </Label>
        <Label x={680} y={M.y + M.h - 6} anchor="start" size={11.5} color="var(--ink-3)">
          strip compressed: 50,257 scores
        </Label>
      </Appear>

      <Appear delay={1.8}>
        <Label x={480} y={478} size={13.5} color="var(--ink)" weight={600}>
          {`One matrix, used twice: lm_head.weight = wte.weight saves ${commas(S.wte)} parameters (${pct(S.wte, S.total)} of the model).`}
        </Label>
        <Label x={480} y={502} size={12.5}>
          The gradients from both uses add up in the same tensor.
        </Label>
      </Appear>
    </Svg>
  );
}

/* ---------------------------------------------------------------- */
/* Step 8: parameters times bytes                                     */
/* ---------------------------------------------------------------- */

function MemoryScene() {
  const rows = [
    { label: "fp32 weights", sub: "4 bytes each", v: S.total * 4, color: "var(--ink-3)" },
    { label: "bf16 weights", sub: "2 bytes each", v: S.total * 2, color: "var(--accent)" },
    { label: "training with AdamW", sub: "about 16 bytes each", v: S.total * 16, color: "var(--mark)" },
  ];
  const max = S.total * 16;
  const groups = [
    { n: 2, label: "bf16 weight" },
    { n: 2, label: "bf16 grad" },
    { n: 4, label: "fp32 master weight" },
    { n: 4, label: "Adam m (fp32)" },
    { n: 4, label: "Adam v (fp32)" },
  ];
  const cw = 44;
  const gx = 4;
  const x0 = 480 - (16 * cw + 15 * gx) / 2;
  let byte = 0;
  return (
    <Svg label="Memory for GPT-2 small: weights in fp32 and bf16, and the roughly 16 bytes per parameter that AdamW training needs">
      <Label x={480} y={72} size={22} mono weight={700} color="var(--ink)">
        {`${commas(S.total)} parameters`}
      </Label>
      {rows.map((r, i) => {
        const y = 130 + i * 52;
        const w = (r.v / max) * 520;
        return (
          <g key={r.label}>
            <Label x={60} y={y} anchor="start" size={14} weight={650} color="var(--ink)">
              {r.label}
            </Label>
            <Label x={60} y={y + 17} anchor="start" size={12}>
              {r.sub}
            </Label>
            <rect x={270} y={y - 13} width={520} height={20} rx={5} fill="var(--paper-2)" />
            <motion.rect x={270} y={y - 13} height={20} rx={5} fill={r.color} initial={{ width: 0 }} animate={{ width: w }} transition={{ duration: 0.8, delay: 0.2 + i * 0.25, ease: EASE }} />
            <Label x={270 + w + 10} y={y + 2} anchor="start" size={14} mono weight={650} color="var(--ink)">
              {bytes(r.v)}
            </Label>
          </g>
        );
      })}

      <Appear delay={1.1}>
        <Label x={480} y={308} size={14} weight={650} color="var(--ink)">
          Where the 16 bytes of one parameter go (mixed precision AdamW)
        </Label>
        {groups.map((g) => {
          const gx0 = x0 + byte * (cw + gx);
          const gw = g.n * cw + (g.n - 1) * gx;
          byte += g.n;
          return (
            <g key={g.label}>
              <rect x={gx0} y={326} width={gw} height={40} rx={8} fill="var(--card-2)" stroke="var(--ink)" strokeWidth={1.4} />
              {Array.from({ length: g.n - 1 }, (_, k) => {
                const lx = gx0 + (k + 1) * (cw + gx) - gx / 2;
                return (
                  <g key={k}>
                    <line x1={lx} x2={lx} y1={326} y2={333} stroke="var(--ink-3)" />
                    <line x1={lx} x2={lx} y1={359} y2={366} stroke="var(--ink-3)" />
                  </g>
                );
              })}
              <text x={gx0 + gw / 2} y={351} textAnchor="middle" fontSize={g.n === 2 ? 11.5 : 13} fontWeight={600} fill="var(--ink)">
                {g.label}
              </text>
            </g>
          );
        })}
        <Label x={x0} y={386} anchor="start" size={11.5} mono color="var(--ink-3)">
          1 cell = 1 byte
        </Label>
        <Label x={480} y={416} size={12.5}>
          Plain fp32 training also lands at 16: weight 4 + gradient 4 + m 4 + v 4.
        </Label>
      </Appear>

      <Appear delay={1.6}>
        <rect x={130} y={440} width={700} height={64} rx={12} fill="var(--mark-soft)" stroke="var(--mark)" />
        <Label x={480} y={466} size={13.5} color="var(--ink)" weight={600}>
          {`Scaled up at 16 bytes each: a 7B model needs ${bytes(7e9 * 16)}, GPT-3 needs ${bytes(count(PRESETS[4].cfg).total * 16)}.`}
        </Label>
        <Label x={480} y={489} size={12.5}>
          A rule of thumb before activations; sharding and optimizer choices change the exact number.
        </Label>
      </Appear>
    </Svg>
  );
}

/* ---------------------------------------------------------------- */
/* Step 9: the calculator                                             */
/* ---------------------------------------------------------------- */

function TryScene() {
  const [cfg, setCfg] = useState<Cfg>(SMALL);
  const r = count(cfg);
  const preset = PRESETS.find((p) => JSON.stringify(p.cfg) === JSON.stringify(cfg));
  const headOk = cfg.C % cfg.nHead === 0;
  const set = (k: keyof Cfg) => (v: number) => setCfg((c) => ({ ...c, [k]: v }));
  const piles = [
    { name: "wte", v: r.wte, color: EMB },
    { name: "wpe", v: r.wpe, color: EMB2 },
    { name: "attention", v: r.attn, color: ATTN },
    { name: "MLPs", v: r.mlp, color: MLP },
    { name: "LayerNorms", v: r.norms, color: NORM },
  ];
  const max = Math.max(...piles.map((p) => p.v));
  const W = 660;
  let acc = 36;

  const svg = (
    <Svg w={W} h={540} label="Live parameter breakdown for the chosen configuration">
      <Label x={W / 2} y={48} size={16} weight={700} color="var(--ink)">
        {preset ? preset.name : "Your model"}
      </Label>
      <Label x={W / 2} y={70} size={12.5} mono>
        {`C = ${commas(cfg.C)}, n_layer = ${cfg.nLayer}, head_size = ${headOk ? cfg.C / cfg.nHead : "not whole"}`}
      </Label>
      {piles.map((p, i) => {
        const y = 118 + i * 44;
        const w = Math.max(2, (p.v / max) * 250);
        return (
          <g key={p.name}>
            <Label x={36} y={y + 4} anchor="start" size={14} mono weight={650} color="var(--ink)">
              {p.name}
            </Label>
            <Label x={330} y={y + 4} anchor="end" size={13} mono color="var(--ink)">
              {commas(p.v)}
            </Label>
            <rect x={346} y={y - 8} width={250} height={16} rx={4} fill="var(--paper-2)" />
            <motion.rect x={346} y={y - 8} height={16} rx={4} fill={p.color} initial={false} animate={{ width: w }} transition={{ duration: 0.3, ease: EASE }} />
            <Label x={604} y={y + 4} anchor="start" size={11.5} mono>
              {pct(p.v, r.total, p.v / r.total < 0.001 ? 2 : 1)}
            </Label>
          </g>
        );
      })}
      <Label x={36} y={346} anchor="start" size={14} mono weight={650} color="var(--ink)">
        lm_head
      </Label>
      <Label x={330} y={346} anchor="end" size={13} mono color="var(--ink-2)">
        0 (tied)
      </Label>
      <line x1={36} y1={368} x2={624} y2={368} stroke="var(--rule-strong)" />
      <Label x={36} y={398} anchor="start" size={16} weight={700} color="var(--ink)">
        total
      </Label>
      <Label x={330} y={398} anchor="end" size={16} mono weight={700} color="var(--ink)">
        {commas(r.total)}
      </Label>
      <Label x={346} y={398} anchor="start" size={16} mono weight={700} color="var(--mark)">
        {short(r.total)}
      </Label>
      <rect x={36} y={424} width={588} height={26} rx={6} fill="var(--paper-2)" />
      {piles.map((p) => {
        const w = (p.v / r.total) * 588;
        const x = acc;
        acc += w;
        return <motion.rect key={p.name} y={424} height={26} fill={p.color} initial={false} animate={{ x, width: Math.max(0.5, w) }} transition={{ duration: 0.3 }} />;
      })}
      <Label x={W / 2} y={484} size={12.5}>
        {`Blocks hold ${pct(r.blocks, r.total)} of the parameters; the token embedding ${pct(r.wte, r.total)}.`}
      </Label>
      <Label x={W / 2} y={506} size={12} color={headOk ? "var(--ink-3)" : "var(--bad)"}>
        {headOk ? "Per block: 12C² + 13C. Heads split C; they never add weights." : "n_embd must be divisible by n_head for a real model."}
      </Label>
    </Svg>
  );

  const controls = (
    <div className="grid gap-2">
      <div>
        <div className="mb-1.5 text-[13px] font-semibold text-ink">Presets</div>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => {
            const on = preset?.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setCfg(p.cfg)}
                aria-pressed={on}
                className={`rounded-lg border px-1.5 py-1 font-mono text-[12px] font-semibold transition-colors ${
                  on ? "border-ink bg-mark-soft text-ink" : "border-rule-strong bg-card text-ink-2 hover:border-ink"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>
      <Slider label="n_layer" value={cfg.nLayer} min={1} max={96} step={1} onChange={set("nLayer")} format={(v) => `${v}`} />
      <Slider label="n_embd (C)" value={cfg.C} min={64} max={12288} step={64} onChange={set("C")} format={(v) => commas(v)} />
      <Slider label="n_head" value={cfg.nHead} min={1} max={128} step={1} onChange={set("nHead")} format={(v) => `${v}`} />
      <Slider label="vocab_size" value={cfg.vocab} min={1000} max={256000} step={1} onChange={set("vocab")} format={(v) => commas(v)} />
      <Slider label="block_size" value={cfg.block} min={128} max={8192} step={128} onChange={set("block")} format={(v) => commas(v)} />
      <div className="mt-1">
        <Readout label="Weights, bf16" value={bytes(r.total * 2)} />
        <Readout label="Weights, fp32" value={bytes(r.total * 4)} />
        <Readout label="AdamW training" value={bytes(r.total * 16)} sub="about 16 bytes per parameter" tone="mark" />
      </div>
    </div>
  );

  return <TryLayout svg={svg} controls={controls} />;
}
