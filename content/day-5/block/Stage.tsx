"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { Appear, Arrow, Box, Bracket, Cells, Chip, Label, Pill, Svg, EASE } from "@/components/viz/svg";
import { Slider, Toggle } from "@/components/viz/controls";
import { seededVector } from "@/lib/color";
import type { StageProps } from "@/lib/types";
import { Band, MiniMap, NumCells, Plus, PolyPacket, Readout, TryLayout, Wire } from "./parts";
import { blockParams, commas, gelu, gptParams, layerNormDemo, mlpDemo, short } from "./math";

export function Stage({ step, playing }: StageProps) {
  switch (step) {
    case 0:
      return <LanesScene />;
    case 1:
      return <MlpScene />;
    case 2:
      return <HighwayScene playing={playing} />;
    case 3:
      return <DeepStackScene playing={playing} />;
    case 4:
      return <GradientHighwayScene playing={playing} />;
    case 5:
      return <LayerNormScene />;
    case 6:
      return <PrePostScene playing={playing} />;
    case 7:
      return <ForwardScene playing={playing} />;
    case 8:
      return <TryScene />;
    default:
      return <HighwayScene playing={playing} recap />;
  }
}

/* ---------------------------------------------------------------- */
/* Step 1: communicate, then compute                                  */
/* ---------------------------------------------------------------- */

function LanesScene() {
  const lanes = [176, 256, 336, 416];
  const toks = ["The", " cat", " sat", " on"];
  const focus = 3;
  return (
    <Svg label="Four tokens pass through attention, which mixes them, then through an MLP that treats each token alone">
      <MiniMap focus="block" />

      <rect x={238} y={128} width={224} height={330} rx={16} fill="var(--violet-soft)" stroke="var(--violet)" strokeWidth={1.4} opacity={0.9} />
      <Label x={350} y={96} size={15} weight={700} color="var(--ink)">
        Attention: communicate
      </Label>
      <Label x={350} y={115} size={12.5}>
        each token reads from earlier tokens
      </Label>

      <rect x={522} y={128} width={240} height={330} rx={16} fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth={1.4} opacity={0.9} />
      <Label x={642} y={96} size={15} weight={700} color="var(--ink)">
        MLP: compute
      </Label>
      <Label x={642} y={115} size={12.5}>
        each token alone, same weights
      </Label>

      {lanes.map((y, i) => (
        <g key={i}>
          <line x1={208} y1={y} x2={262} y2={y} stroke="var(--rule-strong)" strokeWidth={1.4} />
          <line x1={438} y1={y} x2={577} y2={y} stroke="var(--rule-strong)" strokeWidth={1.4} />
          <line x1={707} y1={y} x2={800} y2={y} stroke="var(--rule-strong)" strokeWidth={1.4} />
          <Chip x={70} y={y} text={toks[i]} index={i} delay={i * 0.05} />
          <Cells x={112} y={y - 7} values={seededVector(`blk-in-${i}`, 6)} cell={14} gap={2} delay={0.1} />
          <Cells x={804} y={y - 7} values={seededVector(`blk-out-${i}`, 6)} cell={14} gap={2} delay={1.6} />
        </g>
      ))}

      {lanes.flatMap((yj, j) =>
        lanes.slice(0, j + 1).map((yi, i) => {
          const hot = j === focus;
          return (
            <motion.path
              key={`${i}-${j}`}
              d={`M 262 ${yi} C 352 ${yi} 348 ${yj} 438 ${yj}`}
              fill="none"
              stroke="var(--violet)"
              strokeWidth={hot ? 2.4 : 1.2}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: hot ? 1 : 0.35 }}
              transition={{ duration: 0.7, delay: 0.3 + (hot ? 0.5 : 0) + i * 0.08, ease: EASE }}
            />
          );
        }),
      )}
      {lanes.map((y, i) => (
        <g key={`dots-${i}`}>
          <circle cx={262} cy={y} r={3.5} fill="var(--violet)" />
          <circle cx={438} cy={y} r={3.5} fill="var(--violet)" />
        </g>
      ))}

      {lanes.map((y, i) => (
        <Appear key={`mlp-${i}`} delay={1.1 + i * 0.08}>
          <Box x={642} y={y} w={130} h={40} title="MLP" tone="accent" />
        </Appear>
      ))}

      <Label x={159} y={474} size={12} mono>
        in: (B, T, C)
      </Label>
      <Label x={851} y={474} size={12} mono>
        out: (B, T, C)
      </Label>
      <Label x={500} y={496} size={13} delay={1.8}>
        Same shape in and out, so blocks can be stacked as deep as you like.
      </Label>
    </Svg>
  );
}

/* ---------------------------------------------------------------- */
/* Step 2: the MLP up close                                           */
/* ---------------------------------------------------------------- */

function MlpScene() {
  const { x, h, g, out } = mlpDemo();
  const hmax = Math.max(...h.map(Math.abs));
  const A = { x0: 274, y: 88, cell: 28, gap: 4 };
  const B = { x0: 145, y: 196, cell: 14, gap: 2 };
  const Cy = 290;
  const D = { x0: 274, y: 384 };
  const ax = (i: number) => A.x0 + i * (A.cell + A.gap) + A.cell / 2;
  const bx = (j: number) => B.x0 + j * (B.cell + B.gap) + B.cell / 2;

  const curve = Array.from({ length: 61 }, (_, i) => {
    const v = -3 + i * 0.1;
    const px = 788 + ((v + 3) / 6) * 126;
    const py = 300 - ((gelu(v) + 0.5) / 3.5) * 118;
    return `${i ? "L" : "M"} ${px.toFixed(1)} ${py.toFixed(1)}`;
  }).join(" ");

  return (
    <Svg label="The MLP: a vector of 8 numbers expands to 32, passes through GELU one number at a time, and is projected back to 8">
      <MiniMap focus="block" />

      <Appear delay={0.3} y={0}>
        <g opacity={0.16}>
          {x.map((_, i) => h.map((__, j) => <line key={`a${i}-${j}`} x1={ax(i)} y1={A.y + A.cell} x2={bx(j)} y2={B.y} stroke="var(--ink)" strokeWidth={0.8} />))}
        </g>
      </Appear>
      <Appear delay={0.9} y={0}>
        <g opacity={0.35}>
          {h.map((_, j) => (
            <line key={`e${j}`} x1={bx(j)} y1={B.y + B.cell} x2={bx(j)} y2={Cy} stroke="var(--ink-3)" strokeWidth={1} strokeDasharray="2 3" />
          ))}
        </g>
      </Appear>
      <Appear delay={1.5} y={0}>
        <g opacity={0.16}>
          {g.map((_, j) => out.map((__, i) => <line key={`c${j}-${i}`} x1={bx(j)} y1={Cy + B.cell} x2={ax(i)} y2={D.y} stroke="var(--ink)" strokeWidth={0.8} />))}
        </g>
      </Appear>

      <Cells x={A.x0} y={A.y} values={x} cell={A.cell} gap={A.gap} max={2} showValues />
      <Cells x={B.x0} y={B.y} values={h} cell={B.cell} gap={B.gap} max={hmax} delay={0.6} stagger={0.01} />
      <Cells x={B.x0} y={Cy} values={g} cell={B.cell} gap={B.gap} max={hmax} delay={1.2} stagger={0.01} />
      <Cells x={D.x0} y={D.y} values={out} cell={A.cell} gap={A.gap} max={2} delay={1.8} showValues />

      <Label x={262} y={107} anchor="end" size={14} weight={650} mono color="var(--ink)">
        x
      </Label>
      <Label x={205} y={152} anchor="end" size={13} weight={650} mono color="var(--ink)">
        c_fc
      </Label>
      <Label x={205} y={169} anchor="end" size={11.5} mono>
        Linear(768, 3072)
      </Label>
      <Label x={133} y={207} anchor="end" size={14} weight={650} mono color="var(--ink)">
        h
      </Label>
      <Label x={133} y={248} anchor="end" size={13} weight={650} color="var(--ink)">
        GELU
      </Label>
      <Label x={133} y={265} anchor="end" size={11.5}>
        one number at a time
      </Label>
      <Label x={133} y={301} anchor="end" size={13} weight={650} mono color="var(--ink)">
        gelu(h)
      </Label>
      <Label x={205} y={340} anchor="end" size={13} weight={650} mono color="var(--ink)">
        c_proj
      </Label>
      <Label x={205} y={357} anchor="end" size={11.5} mono>
        Linear(3072, 768)
      </Label>
      <Label x={262} y={403} anchor="end" size={14} weight={650} mono color="var(--ink)">
        out
      </Label>

      {[
        [107, "(B, T, 768)"],
        [207, "(B, T, 3072)"],
        [301, "(B, T, 3072)"],
        [403, "(B, T, 768)"],
      ].map(([y, t]) => (
        <Label key={y as number} x={672} y={y as number} anchor="start" size={12} mono>
          {t}
        </Label>
      ))}

      <Appear delay={1.1}>
        <Label x={851} y={160} size={13} weight={650} color="var(--ink)">
          GELU(x)
        </Label>
        <rect x={776} y={170} width={150} height={150} rx={10} fill="var(--card)" stroke="var(--rule-strong)" />
        <line x1={788} y1={300 - (0.5 / 3.5) * 118} x2={914} y2={300 - (0.5 / 3.5) * 118} stroke="var(--rule-strong)" />
        <line x1={851} y1={180} x2={851} y2={310} stroke="var(--rule-strong)" />
        <path d={curve} fill="none" stroke="var(--accent)" strokeWidth={2.4} />
        <Label x={851} y={340} size={11.5}>
          negatives pushed to about 0
        </Label>
      </Appear>

      <Label x={400} y={462} size={12.5}>
        Drawn with C = 8 and 4C = 32. GPT-2 small: C = 768, 4C = 3072.
      </Label>
      <Label x={400} y={484} size={12.5}>
        The colors are real: each cell is computed from the cells above it.
      </Label>
    </Svg>
  );
}

/* ---------------------------------------------------------------- */
/* Step 3 and recap: the residual stream as a highway                 */
/* ---------------------------------------------------------------- */

function HighwayScene({ playing, recap = false }: { playing: boolean; recap?: boolean }) {
  const Y = 330;
  return (
    <Svg label="The residual stream runs left to right. Attention and the MLP each read a normalized copy and add their result back.">
      <MiniMap focus="block" />

      <Band x1={40} x2={920} y={Y} />
      <Label x={48} y={Y - 22} anchor="start" size={12.5} mono weight={650} color="var(--ink)">
        x in
      </Label>
      <Label x={912} y={Y - 22} anchor="end" size={12.5} mono weight={650} color="var(--ink)">
        x out
      </Label>

      <Wire points={[[110, Y - 13], [110, 200], [135, 200]]} tone="violet" arrow delay={0.2} />
      <Box x={185} y={200} w={96} h={42} title="ln_1" tone="muted" />
      <Wire points={[[233, 200], [253, 200]]} tone="violet" arrow delay={0.4} />
      <Box x={330} y={200} w={150} h={56} title="attention" sub="(B, T, C)" tone="violet" />
      <Wire points={[[405, 200], [450, 200], [450, Y - 15]]} tone="violet" arrow delay={0.6} />
      <Plus x={450} y={Y} tone="violet" />

      <Wire points={[[520, Y - 13], [520, 200], [545, 200]]} tone="accent" arrow delay={0.9} />
      <Box x={595} y={200} w={96} h={42} title="ln_2" tone="muted" />
      <Wire points={[[643, 200], [663, 200]]} tone="accent" arrow delay={1.1} />
      <Box x={740} y={200} w={150} h={56} title="MLP" sub="(B, T, C)" tone="accent" />
      <Wire points={[[815, 200], [860, 200], [860, Y - 15]]} tone="accent" arrow delay={1.3} />
      <Plus x={860} y={Y} tone="accent" />

      <Appear delay={0.2}>
        <Pill x={330} y={142} text="communicate" tone="violet" mono={false} fontSize={13} />
        <Pill x={740} y={142} text="compute" tone="accent" mono={false} fontSize={13} />
      </Appear>

      <Label x={480} y={Y + 38} size={12.5}>
        the residual stream x, shape (B, T, C)
      </Label>
      <Appear delay={1.5}>
        <Label x={280} y={418} size={15} mono weight={600} color="var(--ink)">
          x = x + attn(ln_1(x))
        </Label>
        <Label x={690} y={418} size={15} mono weight={600} color="var(--ink)">
          x = x + mlp(ln_2(x))
        </Label>
      </Appear>

      {recap ? (
        <Appear delay={1.8}>
          <Label x={280} y={444} size={12.5}>
            read a normalized copy, add a change
          </Label>
          <Label x={690} y={444} size={12.5}>
            same pattern, each token alone
          </Label>
          <rect x={150} y={466} width={660} height={40} rx={12} fill="var(--mark-soft)" stroke="var(--mark)" />
          <Label x={480} y={491} size={13.5} color="var(--ink)" weight={600}>
            Stack 12 of these, then ln_f and lm_head turn x into logits.
          </Label>
        </Appear>
      ) : (
        <Appear delay={1.8}>
          <Label x={480} y={470} size={13}>
            Nothing ever replaces x. Every sublayer reads it and adds a small change.
          </Label>
        </Appear>
      )}

      <PolyPacket points={[[40, Y], [920, Y]]} tone="mark" playing={playing} duration={3.4} r={7} />
      <PolyPacket points={[[110, Y - 13], [110, 200], [450, 200], [450, Y - 13]]} tone="violet" playing={playing} duration={2.2} delay={0.4} r={5} />
      <PolyPacket points={[[520, Y - 13], [520, 200], [860, 200], [860, Y - 13]]} tone="accent" playing={playing} duration={2.2} delay={1.6} r={5} />
    </Svg>
  );
}

/* ---------------------------------------------------------------- */
/* Step 4: a deep stack with no shortcut                              */
/* ---------------------------------------------------------------- */

const SUBS = 24;
const subX = (k: number) => 120 + k * 30;

function DeepStackScene({ playing }: { playing: boolean }) {
  const Y = 270;
  return (
    <Svg label="24 sublayers chained one after another, with the gradient travelling back from the loss through every one">
      <Label x={480} y={74} size={16} weight={700} color="var(--ink)">
        12 blocks with the residual connections removed
      </Label>
      <Label x={480} y={98} size={13}>
        x = attn(ln_1(x)), then x = mlp(ln_2(x)): each output replaces its input
      </Label>

      <line x1={84} y1={Y} x2={842} y2={Y} stroke="var(--ink-3)" strokeWidth={1.6} />
      <Pill x={62} y={Y} text="x" strong />
      {Array.from({ length: SUBS }, (_, k) => (
        <motion.g key={k} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: k * 0.03, duration: 0.3 }}>
          <rect x={subX(k) - 11} y={Y - 28} width={22} height={56} rx={6} fill={k % 2 ? "var(--accent-soft)" : "var(--violet-soft)"} stroke={k % 2 ? "var(--accent)" : "var(--violet)"} strokeWidth={1.4} />
        </motion.g>
      ))}
      {Array.from({ length: 12 }, (_, b) => (
        <Label key={b} x={(subX(2 * b) + subX(2 * b + 1)) / 2} y={Y + 48} size={11} mono color="var(--ink-3)">
          {b + 1}
        </Label>
      ))}
      <Box x={882} y={Y} w={68} h={44} title="loss" tone="bad" />

      <path d={`M 108 ${Y + 62} v 8 H 822 v -8`} fill="none" stroke="var(--ink-3)" strokeWidth={1.4} />
      <Label x={465} y={Y + 92} size={13}>
        block number: each block is an attention sublayer and an MLP sublayer
      </Label>

      <Appear delay={0.8}>
        <Pill x={150} y={176} text="how much gradient arrives here?" tone="mark" mono={false} fontSize={13} />
        <Arrow x1={120} y1={190} x2={120} y2={Y - 34} tone="mark" />
        <Label x={700} y={176} size={13}>
          backward pass: from the loss, right to left
        </Label>
        <Arrow x1={840} y1={196} x2={560} y2={196} tone="mark" />
      </Appear>

      <Appear delay={1.2}>
        <rect x={190} y={408} width={580} height={70} rx={12} fill="var(--card)" stroke="var(--rule-strong)" />
        <Label x={480} y={436} size={13.5} color="var(--ink)" weight={600}>
          Toy model: each sublayer passes back 0.7 of the gradient it receives.
        </Label>
        <Label x={480} y={460} size={12.5}>
          Real sublayers multiply by a Jacobian matrix; 0.7 stands in for its size.
        </Label>
      </Appear>

      <PolyPacket points={[[860, Y], [62, Y]]} tone="mark" playing={playing} duration={3.6} r={7} />
    </Svg>
  );
}

/* ---------------------------------------------------------------- */
/* Step 5: the gradient highway                                       */
/* ---------------------------------------------------------------- */

function GradientHighwayScene({ playing }: { playing: boolean }) {
  const Y = 316;
  const without = Math.pow(0.7, SUBS);
  return (
    <Svg label="With residual connections the gradient has a straight path along the stream from the loss back to the first block">
      <Label x={480} y={70} size={21} mono weight={650} color="var(--ink)">
        d(x + f(x)) / dx = 1 + f′(x)
      </Label>
      <Label x={480} y={98} size={13}>
        The 1 is a straight path back through every addition. Addition hands its gradient to both inputs unchanged.
      </Label>

      <Band x1={84} x2={846} y={Y} tone="ok" />
      <Pill x={56} y={Y} text="x" strong />
      {Array.from({ length: SUBS }, (_, k) => {
        const cx = subX(k);
        const c = k % 2 ? "var(--accent)" : "var(--violet)";
        return (
          <motion.g key={k} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: k * 0.03 }}>
            <line x1={cx - 6} y1={Y - 13} x2={cx - 6} y2={250} stroke={c} strokeWidth={1.2} />
            <line x1={cx + 6} y1={250} x2={cx + 6} y2={Y - 13} stroke={c} strokeWidth={1.2} />
            <rect x={cx - 11} y={204} width={22} height={46} rx={6} fill={k % 2 ? "var(--accent-soft)" : "var(--violet-soft)"} stroke={c} strokeWidth={1.4} />
          </motion.g>
        );
      })}
      <Box x={884} y={Y} w={64} h={44} title="loss" tone="bad" />
      <Label x={465} y={Y + 40} size={12.5} color="var(--ok)" weight={650}>
        the stream: one addition per sublayer, no multiplications on the way back
      </Label>

      <Appear delay={0.9}>
        <Label x={330} y={414} anchor="end" size={13} color="var(--ink)">
          without residuals: 0.7^24
        </Label>
        <rect x={344} y={402} width={400} height={18} rx={4} fill="var(--paper-2)" />
        <rect x={344} y={402} width={Math.max(2, without * 400)} height={18} rx={2} fill="var(--bad)" />
        <Label x={754} y={416} anchor="start" size={13} mono color="var(--bad)" weight={650}>
          {without.toFixed(4)}
        </Label>

        <Label x={330} y={452} anchor="end" size={13} color="var(--ink)">
          with residuals, direct path
        </Label>
        <rect x={344} y={440} width={400} height={18} rx={4} fill="var(--paper-2)" />
        <motion.rect x={344} y={440} height={18} rx={4} fill="var(--ok)" initial={{ width: 0 }} animate={{ width: 400 }} transition={{ delay: 1.2, duration: 0.8, ease: EASE }} />
        <Label x={754} y={454} anchor="start" size={13} mono color="var(--ok)" weight={650}>
          1.0
        </Label>
        <Label x={480} y={492} size={12.5}>
          gradient reaching block 1, same toy numbers; the branches add their own terms on top
        </Label>
      </Appear>

      <PolyPacket points={[[846, Y], [84, Y]]} tone="mark" playing={playing} duration={2.4} r={7} />
      <PolyPacket points={[[subX(17) + 6, Y - 13], [subX(17) + 6, 250]]} tone="mark" playing={playing} duration={0.8} delay={1.1} r={4} />
      <PolyPacket points={[[subX(6) + 6, Y - 13], [subX(6) + 6, 250]]} tone="mark" playing={playing} duration={0.8} delay={1.8} r={4} />
    </Svg>
  );
}

/* ---------------------------------------------------------------- */
/* Step 6: LayerNorm with real numbers                                */
/* ---------------------------------------------------------------- */

function LayerNormScene() {
  const d = layerNormDemo();
  const rows = [
    { label: "x", sub: "one token, C = 6 here", values: d.x, stat: d.stats(d.x) },
    { label: "x − mean", sub: `mean = ${d.mean.toFixed(2)}`, values: d.centered, stat: d.stats(d.centered) },
    { label: "x̂ = (x − mean) / std", sub: `std = ${d.std.toFixed(2)}`, values: d.xhat, stat: d.stats(d.xhat) },
    { label: "y = γ · x̂ + β", sub: "γ, β learned per channel", values: d.y, stat: d.stats(d.y) },
  ];
  const ys = [86, 180, 274, 368];
  return (
    <Svg label="LayerNorm on one token's vector: subtract the mean, divide by the standard deviation, then scale and shift">
      <MiniMap focus="block" />
      {rows.map((r, i) => (
        <Appear key={i} delay={i * 0.55}>
          <Label x={228} y={ys[i] + 20} anchor="end" size={14} weight={650} mono color="var(--ink)">
            {r.label}
          </Label>
          <Label x={228} y={ys[i] + 38} anchor="end" size={11.5}>
            {r.sub}
          </Label>
          <NumCells x={245} y={ys[i]} values={r.values} w={70} h={44} max={3.5} delay={i * 0.55} />
          <Label x={728} y={ys[i] + 20} anchor="start" size={13} mono color="var(--ink)">
            {`mean ${fmt0(r.stat.mean)}`}
          </Label>
          <Label x={728} y={ys[i] + 38} anchor="start" size={13} mono color="var(--ink)">
            {`std  ${fmt0(r.stat.std)}`}
          </Label>
          {i > 0 && i < 3 && <Arrow x1={475} y1={ys[i] - 48} x2={475} y2={ys[i] - 6} tone="muted" />}
          {i === 3 && <Arrow x1={475} y1={ys[i] - 48} x2={475} y2={ys[i] - 6} tone="mark" />}
        </Appear>
      ))}
      <Appear delay={2.2}>
        <Label x={480} y={446} size={12} mono>
          {`γ = [${d.gamma.map((v) => v.toFixed(1)).join(", ")}]    β = [${d.beta.map((v) => fmt0(v, 1)).join(", ")}]`}
        </Label>
        <Label x={480} y={476} size={12.5}>
          GPT-2 does this over C = 768 numbers, for every token separately. γ starts at 1, β at 0.
        </Label>
        <Label x={480} y={498} size={12.5}>
          Tokens are never mixed: LayerNorm looks only along C.
        </Label>
      </Appear>
    </Svg>
  );
}

const fmt0 = (v: number, digits = 2) => (Math.abs(v) < 0.5 * 10 ** -digits ? 0 : v).toFixed(digits).replace("-", "−");

/* ---------------------------------------------------------------- */
/* Step 7: pre-norm vs post-norm                                      */
/* ---------------------------------------------------------------- */

function PrePostScene({ playing }: { playing: boolean }) {
  const top = 176;
  const bot = 388;
  return (
    <Svg label="Post-norm puts LayerNorm on the stream after each addition. Pre-norm puts it on the branch, leaving the stream clean.">
      <Label x={60} y={78} anchor="start" size={15} weight={700} color="var(--ink)">
        Post-norm (original transformer, 2017)
      </Label>
      <Label x={900} y={78} anchor="end" size={14} mono color="var(--ink)">
        x = LN(x + f(x))
      </Label>
      <Band x1={60} x2={900} y={top} h={22} />
      <Wire points={[[110, top - 11], [110, 124], [148, 124]]} tone="violet" arrow />
      <Box x={200} y={124} w={100} h={34} title="attn" tone="violet" radius={10} />
      <Wire points={[[250, 124], [300, 124], [300, top - 12]]} tone="violet" arrow />
      <Plus x={300} y={top} r={11} tone="violet" />
      <Box x={374} y={top} w={64} h={30} title="LN" tone="bad" radius={8} />
      <Wire points={[[450, top - 11], [450, 124], [488, 124]]} tone="accent" arrow />
      <Box x={540} y={124} w={100} h={34} title="MLP" tone="accent" radius={10} />
      <Wire points={[[590, 124], [640, 124], [640, top - 12]]} tone="accent" arrow />
      <Plus x={640} y={top} r={11} tone="accent" />
      <Box x={714} y={top} w={64} h={30} title="LN" tone="bad" radius={8} />
      <Label x={480} y={top + 44} size={13} color="var(--bad)" weight={600}>
        The gradient must cross two LayerNorms per block on its way back. Deep stacks need careful warmup.
      </Label>

      <line x1={60} y1={262} x2={900} y2={262} stroke="var(--rule)" strokeDasharray="4 6" />

      <Label x={60} y={300} anchor="start" size={15} weight={700} color="var(--ink)">
        Pre-norm (GPT-2 and almost every model since)
      </Label>
      <Label x={900} y={300} anchor="end" size={14} mono color="var(--ink)">
        x = x + f(LN(x))
      </Label>
      <Band x1={60} x2={900} y={bot} h={22} tone="ok" />
      <Wire points={[[100, bot - 11], [100, 336], [128, 336]]} tone="violet" arrow />
      <Box x={160} y={336} w={60} h={30} title="LN" tone="muted" radius={8} />
      <Wire points={[[190, 336], [210, 336]]} tone="violet" arrow />
      <Box x={260} y={336} w={96} h={34} title="attn" tone="violet" radius={10} />
      <Wire points={[[308, 336], [348, 336], [348, bot - 12]]} tone="violet" arrow />
      <Plus x={348} y={bot} r={11} tone="violet" />
      <Wire points={[[410, bot - 11], [410, 336], [438, 336]]} tone="accent" arrow />
      <Box x={470} y={336} w={60} h={30} title="LN" tone="muted" radius={8} />
      <Wire points={[[500, 336], [520, 336]]} tone="accent" arrow />
      <Box x={570} y={336} w={96} h={34} title="MLP" tone="accent" radius={10} />
      <Wire points={[[618, 336], [658, 336], [658, bot - 12]]} tone="accent" arrow />
      <Plus x={658} y={bot} r={11} tone="accent" />
      <Label x={735} y={bot + 4} size={11} mono color="var(--ok)">
        11 more blocks
      </Label>
      <Box x={828} y={bot} w={72} h={30} title="ln_f" tone="muted" radius={8} />
      <Label x={828} y={bot - 26} size={11.5}>
        once, at the end
      </Label>
      <Label x={480} y={bot + 44} size={13} color="var(--ok)" weight={600}>
        The stream itself is never normalized: a clean path from the loss to the embeddings.
      </Label>
      <Label x={480} y={bot + 68} size={12.5}>
        Because the stream is left raw, GPT-2 adds one final LayerNorm, ln_f, before lm_head.
      </Label>

      <PolyPacket points={[[900, top], [60, top]]} tone="mark" playing={playing} duration={3} r={6} />
      <PolyPacket points={[[790, bot], [60, bot]]} tone="mark" playing={playing} duration={2.4} r={6} />
    </Svg>
  );
}

/* ---------------------------------------------------------------- */
/* Step 8: the whole forward pass, shape by shape                     */
/* ---------------------------------------------------------------- */

function ForwardScene({ playing }: { playing: boolean }) {
  const X = 330;
  const rows: { y: number; shape: string; note?: string }[] = [
    { y: 58, shape: "(B, T) = (4, 1024)", note: "token ids" },
    { y: 118, shape: "(B, T, C) = (4, 1024, 768)", note: "look up and add" },
    { y: 178, shape: "(B, T, C) = (4, 1024, 768)" },
    { y: 226, shape: "(B, T, C) = (4, 1024, 768)" },
    { y: 310, shape: "(B, T, C) = (4, 1024, 768)" },
    { y: 370, shape: "(B, T, C) = (4, 1024, 768)", note: "final LayerNorm" },
    { y: 430, shape: "(B, T, vocab_size) = (4, 1024, 50257)", note: "Linear(768, 50257)" },
    { y: 490, shape: "one score per possible next token", note: "" },
  ];
  const toks = ["The", " cat", " sat", " on"];
  return (
    <Svg label="The GPT forward pass from token ids to logits, with the tensor shape after every stage">
      <rect x={X - 12} y={150} width={24} height={186} rx={8} fill="var(--paper-2)" stroke="var(--rule-strong)" />
      {toks.map((t, i) => (
        <Chip key={i} x={246 + i * 56} y={58} text={t} index={i} h={28} fontSize={13} delay={i * 0.05} />
      ))}
      <Box x={X} y={118} w={230} h={38} title="wte(idx) + wpe(pos)" tone="ink" />
      <Box x={X} y={178} w={230} h={34} title="block 1" tone="accent" />
      <Box x={X} y={226} w={230} h={34} title="block 2" tone="accent" />
      <Label x={X} y={274} size={18} color="var(--ink-3)">
        ...
      </Label>
      <Box x={X} y={310} w={230} h={34} title="block 12" tone="accent" />
      <Box x={X} y={370} w={230} h={38} title="ln_f" tone="muted" />
      <Box x={X} y={430} w={230} h={38} title="lm_head" tone="ink" />
      <Box x={X} y={490} w={230} h={38} title="logits" tone="mark" />
      {[
        [73, 97],
        [137, 159],
        [195, 207],
        [327, 349],
        [389, 409],
        [449, 469],
      ].map(([a, b], i) => (
        <Arrow key={i} x1={X} y1={a} x2={X} y2={b} delay={0.1 * i} duration={0.3} />
      ))}
      <Bracket x={208} y1={161} y2={327} side="left" label="× 12 blocks" />
      {rows.map((r, i) => (
        <Appear key={i} delay={0.15 + i * 0.12}>
          <Label x={470} y={r.y + 5} anchor="start" size={13} mono color={i === 6 || i === 7 ? "var(--ink)" : "var(--ink-2)"} weight={i === 6 ? 650 : 500}>
            {r.shape}
          </Label>
          {r.note && (
            <Label x={196} y={r.y + 5} anchor="end" size={12.5}>
              {r.note}
            </Label>
          )}
        </Appear>
      ))}
      <Label x={350} y={278} anchor="start" size={11.5} color="var(--ink-3)">
        residual stream
      </Label>
      <PolyPacket points={[[X, 72], [X, 476]]} tone="mark" playing={playing} duration={3.2} r={6} />
    </Svg>
  );
}

/* ---------------------------------------------------------------- */
/* Step 9: stack it yourself                                          */
/* ---------------------------------------------------------------- */

function TryScene() {
  const [n, setN] = useState(12);
  const [residual, setResidual] = useState(true);
  const W = 660;
  const x0 = 70;
  const x1 = 560;
  const slot = (x1 - x0) / n;
  const bandY = 190;
  const grads = Array.from({ length: n }, (_, l) => (residual ? 1 : Math.pow(0.7, 2 * (n - l))));
  const g1 = residual ? 1 : Math.pow(0.7, 2 * n);
  const params = gptParams(n);
  const boxW = Math.max(3, Math.min(36, slot * 0.62));
  const showLines = slot >= 9;

  const svg = (
    <Svg w={W} h={540} label="A stack of blocks on the residual stream, with the gradient each block receives">
      <Label x={W / 2} y={52} size={15} weight={700} color="var(--ink)">
        {`${n} block${n > 1 ? "s" : ""}, ${residual ? "with" : "without"} residual connections`}
      </Label>
      <Label x={W / 2} y={74} size={12.5}>
        C = 768, vocab 50,257, context 1,024
      </Label>

      {residual ? (
        <Band x1={x0 - 14} x2={x1 + 14} y={bandY} h={20} tone="ok" />
      ) : (
        <line x1={x0 - 14} y1={bandY - 50} x2={x1 + 14} y2={bandY - 50} stroke="var(--bad)" strokeWidth={1.6} />
      )}
      <Pill x={x0 - 34} y={residual ? bandY : bandY - 50} text="x" strong />
      <Box x={x1 + 52} y={residual ? bandY : bandY - 50} w={56} h={34} title="loss" tone="bad" radius={9} />

      {Array.from({ length: n }, (_, l) => {
        const cx = x0 + slot * (l + 0.5);
        return (
          <g key={l}>
            {residual && showLines && (
              <>
                <line x1={cx - boxW * 0.3} y1={bandY - 10} x2={cx - boxW * 0.3} y2={bandY - 34} stroke="var(--accent)" strokeWidth={1.2} />
                <line x1={cx + boxW * 0.3} y1={bandY - 34} x2={cx + boxW * 0.3} y2={bandY - 10} stroke="var(--accent)" strokeWidth={1.2} />
              </>
            )}
            <rect x={cx - boxW / 2} y={bandY - 70} width={boxW} height={36} rx={Math.min(6, boxW / 3)} fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth={1.2} />
          </g>
        );
      })}

      <Label x={W / 2} y={262} size={13} weight={650} color="var(--ink)">
        Gradient reaching each block
      </Label>
      <Label x={W / 2} y={281} size={11.5}>
        toy: each sublayer passes 0.7 of the gradient back through itself
      </Label>
      <line x1={x0} y1={440} x2={x1} y2={440} stroke="var(--rule-strong)" />
      <line x1={x0} y1={300} x2={x1} y2={300} stroke="var(--rule)" strokeDasharray="3 4" />
      <Label x={x0 - 8} y={304} anchor="end" size={11} mono color="var(--ink-3)">
        1.0
      </Label>
      <Label x={x0 - 8} y={444} anchor="end" size={11} mono color="var(--ink-3)">
        0
      </Label>
      {grads.map((g, l) => {
        const cx = x0 + slot * (l + 0.5);
        const hgt = Math.max(1, g * 140);
        return (
          <motion.rect
            key={l}
            x={cx - Math.max(2, slot * 0.32)}
            width={Math.max(4, slot * 0.64)}
            rx={2}
            fill={residual ? "var(--ok)" : "var(--bad)"}
            initial={false}
            animate={{ y: 440 - hgt, height: hgt }}
            transition={{ duration: 0.35, ease: EASE }}
          />
        );
      })}
      <Label x={x0} y={462} anchor="start" size={11.5} mono color="var(--ink-3)">
        block 1
      </Label>
      <Label x={x1} y={462} anchor="end" size={11.5} mono color="var(--ink-3)">
        {`block ${n}`}
      </Label>
      <Label x={W / 2} y={500} size={12.5} color={residual ? "var(--ok)" : "var(--bad)"} weight={600}>
        {residual ? "Every block hears the loss clearly, however deep the stack." : "Early blocks barely learn: their gradient has almost vanished."}
      </Label>
    </Svg>
  );

  const controls = (
    <div className="grid gap-3">
      <div className="text-[13px] font-semibold text-ink">Build a stack</div>
      <Slider label="Blocks (n_layer)" value={n} min={1} max={48} step={1} onChange={setN} format={(v) => `${v}`} />
      <Toggle label="Residual connections" checked={residual} onChange={setResidual} hint="x = x + f(x) instead of x = f(x)" />
      <div className="mt-1">
        <Readout label="Parameters" value={short(params)} sub={commas(params)} />
        <Readout label="Per block" value={`${(blockParams(768) / 1e6).toFixed(2)}M`} sub="12C² + 13C" />
        <Readout label="Depth" value={`${2 * n} sublayers`} />
        <Readout label="Shortest gradient path" value={residual ? "0 sublayers" : `${2 * n} sublayers`} tone={residual ? "ok" : "bad"} />
        <Readout label="Gradient at block 1" value={g1 >= 0.01 ? g1.toFixed(2) : g1.toExponential(1)} tone={residual ? "ok" : "bad"} sub="toy number" />
      </div>
    </div>
  );

  return <TryLayout svg={svg} controls={controls} />;
}

