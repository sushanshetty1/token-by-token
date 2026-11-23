"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Appear, Arrow, Box, Cells, Chip, Label, Pill, Svg, EASE, chipWidth } from "@/components/viz/svg";
import { Segmented, Slider } from "@/components/viz/controls";
import { sequential } from "@/lib/color";
import type { StageProps } from "@/lib/types";
import { Readout, TryLayout, Wire } from "@/content/day-5/block/parts";
import {
  A100_BF16,
  attend,
  bytes,
  CANDIDATES,
  commas,
  GENERATED,
  GPT2_KV,
  GQA_7B_8K,
  HBM_BW,
  kVec,
  kvBytes,
  LLAMA2_7B_8K,
  LLAMA2_7B_PARAMS,
  PROMPT,
  qVec,
  sampleFilter,
  vVec,
  type KvCfg,
} from "./math";

export function Stage({ step, playing }: StageProps) {
  switch (step) {
    case 0:
      return <LoopScene />;
    case 1:
      return <PrefillScene />;
    case 2:
      return <NaiveScene />;
    case 3:
      return <CacheScene playing={playing} />;
    case 4:
      return <ExactScene />;
    case 5:
      return <MemoryScene />;
    case 6:
      return <KvTryScene />;
    case 7:
      return <BoundScene />;
    case 8:
      return <SamplingScene />;
    case 9:
      return <StreamScene />;
    default:
      return <RecapScene />;
  }
}

function useTicker(n: number, ms: number, playing: boolean) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!playing || tick >= n) return;
    const id = setTimeout(() => setTick((t) => t + 1), ms);
    return () => clearTimeout(id);
  }, [playing, tick, n, ms]);
  return tick;
}

/** Lay chips out in a row centered on cx; returns centers. */
function rowCenters(tokens: string[], cx: number, gap = 8, fs = 15) {
  const ws = tokens.map((t) => chipWidth(t, fs));
  const total = ws.reduce((a, b) => a + b, 0) + gap * (tokens.length - 1);
  let x = cx - total / 2;
  return ws.map((w) => {
    const c = x + w / 2;
    x += w + gap;
    return c;
  });
}

/* ---------------------------------------------------------------- */
/* Step 1: generation is a loop                                       */
/* ---------------------------------------------------------------- */

function LoopScene() {
  const all = [...PROMPT, ...GENERATED];
  const xs = rowCenters(all, 480);
  const first = xs[0] - chipWidth(all[0]) / 2;
  const lastPrompt = xs[PROMPT.length - 1] + chipWidth(PROMPT[PROMPT.length - 1]) / 2;
  const firstGen = xs[PROMPT.length] - chipWidth(all[PROMPT.length]) / 2;
  const last = xs[all.length - 1] + chipWidth(all[all.length - 1]) / 2;
  return (
    <Svg label="The prompt goes through the model once, then the model produces one token at a time, each appended to the input">
      <Label x={480} y={74} size={13}>
        You send a prompt; the model sends back one token at a time.
      </Label>
      {all.map((t, i) => {
        const gen = i >= PROMPT.length;
        return <Chip key={i} x={xs[i]} y={140} text={t} index={i} delay={gen ? 1.4 + (i - PROMPT.length) * 0.9 : i * 0.06} highlight={gen} />;
      })}
      <path d={`M ${first} 172 v 8 H ${lastPrompt} v -8`} fill="none" stroke="var(--accent)" strokeWidth={1.6} />
      <Label x={(first + lastPrompt) / 2} y={200} size={12.5} color="var(--accent)" weight={650}>
        prefill: the whole prompt, once
      </Label>
      <Appear delay={1.4}>
        <path d={`M ${firstGen} 172 v 8 H ${last} v -8`} fill="none" stroke="var(--mark)" strokeWidth={1.6} />
        <Label x={(firstGen + last) / 2} y={200} size={12.5} color="color-mix(in oklab, var(--mark) 70%, var(--ink))" weight={650}>
          decode: one token per step
        </Label>
      </Appear>

      <Arrow x1={480} y1={216} x2={480} y2={280} />
      <Label x={490} y={252} anchor="start" size={12}>
        all tokens so far
      </Label>
      <Box x={480} y={322} w={280} h={76} title="GPT-2 forward pass" sub="logits for the next token" tone="ink" />
      <Arrow x1={622} y1={322} x2={700} y2={322} tone="mark" />
      <Pill x={752} y={322} text="sample" tone="mark" mono={false} fontSize={13} strong />
      <path d={`M 752 304 C 760 230, ${last + 40} 200, ${last + 8} 158`} fill="none" stroke="var(--mark)" strokeWidth={1.8} strokeDasharray="5 4" markerEnd="url(#arrow-mark)" />
      <Label x={790} y={262} anchor="start" size={12}>
        append
      </Label>
      <Label x={790} y={278} anchor="start" size={12}>
        and repeat
      </Label>

      <Appear delay={0.6}>
        <rect x={150} y={410} width={660} height={84} rx={14} fill="var(--card)" stroke="var(--rule-strong)" />
        <Label x={480} y={442} size={13.5} color="var(--ink)" weight={600}>
          Every new token costs a forward pass. What you get back becomes part of the next input.
        </Label>
        <Label x={480} y={468} size={12.5}>
          The loop stops at an end-of-text token or at a length limit.
        </Label>
      </Appear>
    </Svg>
  );
}

/* ---------------------------------------------------------------- */
/* Token x layer grids                                                */
/* ---------------------------------------------------------------- */

type CellState = "prefill" | "new" | "cached" | "waste";

const CELL_STYLE: Record<CellState, { fill: string; stroke: string }> = {
  prefill: { fill: "var(--accent-soft)", stroke: "var(--accent)" },
  new: { fill: "var(--mark-soft)", stroke: "var(--mark)" },
  cached: { fill: "var(--ok-soft)", stroke: "var(--ok)" },
  waste: { fill: "var(--bad-soft)", stroke: "var(--bad)" },
};

const LAYER_Y = [390, 320, 250, 180];
const LAYER_LABEL = ["layer 1", "layer 2", "...", "layer 12"];

function Grid({
  tokens,
  x0,
  dx,
  states,
  rowDelay = 0,
  kv = true,
  outline,
}: {
  tokens: string[];
  x0: number;
  dx: number;
  states: CellState[];
  rowDelay?: number;
  kv?: boolean;
  outline?: (col: number, row: number) => boolean;
}) {
  const w = dx - 14;
  const h = 40;
  return (
    <g>
      {LAYER_Y.map((y, r) => (
        <Label key={r} x={x0 - dx / 2 - 6} y={y + 4} anchor="end" size={12} mono color="var(--ink-3)">
          {LAYER_LABEL[r]}
        </Label>
      ))}
      {tokens.map((t, c) => (
        <Chip key={c} x={x0 + c * dx} y={452} text={t} index={c} h={30} fontSize={13} />
      ))}
      {LAYER_Y.map((y, r) =>
        tokens.map((_, c) => {
          const st = CELL_STYLE[states[c]];
          const cx = x0 + c * dx;
          const dots = r === 2;
          return (
            <motion.g key={`${r}-${c}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: rowDelay * r, duration: 0.3 }}>
              <rect
                x={cx - w / 2}
                y={y - h / 2}
                width={w}
                height={h}
                rx={8}
                fill={dots ? "none" : st.fill}
                stroke={st.stroke}
                strokeWidth={outline?.(c, r) ? 2.6 : 1.3}
                strokeDasharray={dots ? "3 4" : undefined}
              />
              {kv && !dots && (
                <>
                  <rect x={cx + w / 2 - 22} y={y + h / 2 - 12} width={8} height={8} rx={2} fill="var(--k)" />
                  <rect x={cx + w / 2 - 12} y={y + h / 2 - 12} width={8} height={8} rx={2} fill="var(--v)" />
                </>
              )}
            </motion.g>
          );
        }),
      )}
    </g>
  );
}

/* ---------------------------------------------------------------- */
/* Step 2: prefill                                                    */
/* ---------------------------------------------------------------- */

function PrefillScene() {
  const x0 = 210;
  const dx = 92;
  const lastX = x0 + 4 * dx;
  return (
    <Svg label="Prefill: every prompt token goes through every layer in one pass, filling the KV cache, and only the last position's logits are used">
      <Label x={x0 + 2 * dx} y={66} size={14} weight={700} color="var(--ink)">
        One pass, all 5 positions at once, layer by layer
      </Label>
      <Grid tokens={PROMPT} x0={x0} dx={dx} states={PROMPT.map(() => "prefill")} rowDelay={0.4} />
      <Appear delay={1.7}>
        <Arrow x1={lastX} y1={158} x2={lastX} y2={118} tone="mark" />
        <Chip x={lastX} y={100} text=" mat" index={5} highlight />
        <Label x={lastX - 48} y={106} anchor="end" size={12}>
          last position&apos;s logits: sample the first new token
        </Label>
      </Appear>

      <Appear delay={1.2}>
        <rect x={668} y={150} width={252} height={268} rx={14} fill="var(--card)" stroke="var(--rule-strong)" />
        <Label x={794} y={178} size={14} weight={700} color="var(--ink)">
          KV cache after prefill
        </Label>
        {["layer 1", "layer 2", "...", "layer 12"].map((l, r) => (
          <g key={l}>
            <Label x={700} y={216 + r * 46} anchor="start" size={11.5} mono color="var(--ink-3)">
              {l}
            </Label>
            {l !== "..." &&
              PROMPT.map((_, c) => (
                <g key={c}>
                  <rect x={762 + c * 28} y={204 + r * 46} width={11} height={16} rx={2} fill="var(--k)" />
                  <rect x={775 + c * 28} y={204 + r * 46} width={11} height={16} rx={2} fill="var(--v)" />
                </g>
              ))}
          </g>
        ))}
        <Label x={794} y={398} size={12}>
          K and V for 5 tokens in every layer
        </Label>
      </Appear>
      <Label x={480} y={504} size={12.5}>
        Big matrix multiplies over all positions: prefill is compute-bound.
      </Label>
    </Svg>
  );
}

/* ---------------------------------------------------------------- */
/* Step 3: decoding without a cache                                   */
/* ---------------------------------------------------------------- */

function NaiveScene() {
  const toks = [...PROMPT, GENERATED[0]];
  const states: CellState[] = toks.map((_, i) => (i === toks.length - 1 ? "new" : "waste"));
  const steps = ["prefill", "1", "2", "3", "4", "5"];
  const naive = [5, 6, 7, 8, 9, 10];
  const cached = [5, 1, 1, 1, 1, 1];
  const base = 400;
  const scale = 22;
  return (
    <Svg label="Without a cache, every decode step reruns every earlier position through every layer just to get one new token">
      <Label x={130 + 2.5 * 82} y={66} size={14} weight={700} color="var(--ink)">
        Decode step 1, no cache: rerun everything
      </Label>
      <Label x={130 + 2.5 * 82} y={88} size={12.5}>
        5 old positions recomputed (rose) for 1 new one (saffron)
      </Label>
      <Grid tokens={toks} x0={130} dx={82} states={states} kv={false} />

      <Appear delay={0.6}>
        <Label x={786} y={130} size={14} weight={700} color="var(--ink)">
          Positions computed per step
        </Label>
        <line x1={650} x2={920} y1={base} y2={base} stroke="var(--ink-3)" />
        {steps.map((s, i) => {
          const gx = 664 + i * 44;
          return (
            <g key={s}>
              <motion.rect x={gx} width={16} rx={3} fill="var(--bad)" initial={{ y: base, height: 0 }} animate={{ y: base - naive[i] * scale, height: naive[i] * scale }} transition={{ delay: 0.8 + i * 0.12, duration: 0.5, ease: EASE }} />
              <motion.rect x={gx + 18} width={16} rx={3} fill="var(--ok)" initial={{ y: base, height: 0 }} animate={{ y: base - cached[i] * scale, height: cached[i] * scale }} transition={{ delay: 0.8 + i * 0.12, duration: 0.5, ease: EASE }} />
              <Label x={gx + 17} y={base + 18} size={11} mono color="var(--ink-3)">
                {s}
              </Label>
            </g>
          );
        })}
        <rect x={668} y={430} width={12} height={12} rx={2} fill="var(--bad)" />
        <Label x={686} y={441} anchor="start" size={12}>
          no cache
        </Label>
        <rect x={768} y={430} width={12} height={12} rx={2} fill="var(--ok)" />
        <Label x={786} y={441} anchor="start" size={12}>
          with a KV cache
        </Label>
      </Appear>
      <Label x={480} y={506} size={12.5}>
        Without a cache, the work per step grows with the length of the text so far.
      </Label>
    </Svg>
  );
}

/* ---------------------------------------------------------------- */
/* Step 4: the KV cache, growing                                      */
/* ---------------------------------------------------------------- */

function CacheScene({ playing }: { playing: boolean }) {
  const t = useTicker(GENERATED.length - 1, 2600, playing);
  const tok = GENERATED[t];
  const rows = [...PROMPT, ...GENERATED.slice(0, t + 1)];
  const keys = rows.map(kVec);
  const vals = rows.map(vVec);
  const q = qVec(tok);
  const w = attend(q, keys);
  const out = vals[0].map((_, j) => vals.reduce((s, v, i) => s + w[i] * v[j], 0));
  const y0 = 104;
  const rh = 30;
  const newY = y0 + (rows.length - 1) * rh;
  const mid = y0 + ((rows.length - 1) * rh) / 2 + 12;
  const KX = 404;
  const VX = 604;
  const vecW = 6 * 18 + 5 * 3;
  const frame = (x: number, y: number, color: string) => <rect x={x - 4} y={y - 4} width={vecW + 8} height={26} rx={6} fill="none" stroke={color} strokeWidth={1.6} />;
  return (
    <Svg label="The KV cache for one layer: each decode step computes q, k and v for the new token only, appends k and v, and attends over every cached row">
      <Label x={40} y={84} anchor="start" size={14} weight={700} color="var(--ink)">
        {`Decode step ${t + 1}`}
      </Label>
      <Chip key={`chip-${t}`} x={92} y={128} text={tok} index={PROMPT.length + t} highlight />
      <Label x={128} y={133} anchor="start" size={12}>
        new token in
      </Label>
      <Label x={40} y={170} anchor="start" size={11.5}>
        computed for this token only:
      </Label>
      <g key={`qkv-${t}`}>
        <Label x={140} y={203} anchor="end" size={14} mono weight={700} color="var(--q)">
          q
        </Label>
        {frame(150, 190, "var(--q)")}
        <Cells x={150} y={190} values={q} cell={18} gap={3} />
        <Label x={140} y={253} anchor="end" size={14} mono weight={700} color="var(--k)">
          k
        </Label>
        {frame(150, 240, "var(--k)")}
        <Cells x={150} y={240} values={keys[keys.length - 1]} cell={18} gap={3} delay={0.1} />
        <Label x={140} y={303} anchor="end" size={14} mono weight={700} color="var(--v)">
          v
        </Label>
        {frame(150, 290, "var(--v)")}
        <Cells x={150} y={290} values={vals[vals.length - 1]} cell={18} gap={3} delay={0.2} />
      </g>

      <Label x={KX + vecW / 2} y={88} size={13} weight={700} color="var(--k)">
        K cache
      </Label>
      <Label x={560} y={80} size={12} weight={650} color="var(--ink)">
        weights
      </Label>
      <Label x={560} y={95} size={11} mono>
        softmax(q·k)
      </Label>
      <Label x={VX + vecW / 2} y={88} size={13} weight={700} color="var(--v)">
        V cache
      </Label>
      {rows.map((r, i) => {
        const y = y0 + i * rh;
        const isNew = i === rows.length - 1;
        return (
          <motion.g key={`${t}-${i}`} initial={isNew ? { opacity: 0, x: -24 } : false} animate={{ opacity: 1, x: 0 }} transition={{ delay: isNew ? 0.6 : 0, duration: 0.5, ease: EASE }}>
            <Label x={KX - 10} y={y + 16} anchor="end" size={12} mono color={isNew ? "var(--ink)" : "var(--ink-2)"} weight={isNew ? 700 : 500}>
              {r.replace(/ /g, "·")}
            </Label>
            <Cells x={KX} y={y + 3} values={keys[i]} cell={18} gap={3} stagger={0} />
            <Cells x={VX} y={y + 3} values={vals[i]} cell={18} gap={3} stagger={0} />
            {isNew && (
              <>
                <rect x={KX - 4} y={y - 1} width={vecW + 8} height={26} rx={6} fill="none" stroke="var(--mark)" strokeWidth={2} />
                <rect x={VX - 4} y={y - 1} width={vecW + 8} height={26} rx={6} fill="none" stroke="var(--mark)" strokeWidth={2} />
              </>
            )}
          </motion.g>
        );
      })}
      <g key={`w-${t}`}>
        {w.map((p, i) => (
          <motion.rect
            key={i}
            x={548}
            y={y0 + i * rh + 3}
            width={24}
            height={18}
            rx={4}
            fill={sequential(p / Math.max(...w), "var(--q)")}
            stroke="var(--rule)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 + i * 0.03 }}
          />
        ))}
      </g>
      <Wire key={`kw-${t}`} points={[[278, 249], [316, 249], [316, newY + 42], [KX + vecW / 2, newY + 42], [KX + vecW / 2, newY + 30]]} tone="k" arrow delay={0.3} />
      <Wire key={`vw-${t}`} points={[[278, 299], [298, 299], [298, newY + 56], [VX + vecW / 2, newY + 56], [VX + vecW / 2, newY + 30]]} tone="v" arrow delay={0.4} />
      <Label x={40} y={350} anchor="start" size={11.5} color="var(--q)" weight={650}>
        q is scored against every cached k:
      </Label>
      <Label x={40} y={366} anchor="start" size={11.5} color="var(--q)" weight={650}>
        those scores are the weights column
      </Label>

      <g key={`out-${t}`}>
        <Arrow x1={VX + vecW + 8} y1={mid} x2={784} y2={mid} tone="ink" delay={1.4} />
        <Appear delay={1.6}>
          <Cells x={792} y={mid - 10} values={out} cell={18} gap={3} max={0.8} />
          <Label x={792 + vecW / 2} y={mid - 22} size={12} weight={650} color="var(--ink)">
            output
          </Label>
          <Label x={792 + vecW / 2} y={mid + 30} size={11} mono>
            Σ weight × v
          </Label>
        </Appear>
      </g>

      <Label x={480} y={452} size={13} color="var(--ink)" weight={600}>
        {`Cache: ${rows.length} rows in this layer. Old rows are reused, never recomputed.`}
      </Label>
      <Label x={480} y={476} size={12.5}>
        One layer and one head shown; each of the 12 layers keeps its own K and V for all 12 heads.
      </Label>
      <Label x={480} y={500} size={12}>
        Numbers are illustrative stand-ins, with C cut to 6.
      </Label>
    </Svg>
  );
}

/* ---------------------------------------------------------------- */
/* Step 5: why the cache is exact                                     */
/* ---------------------------------------------------------------- */

function ExactScene() {
  const toks = [...PROMPT, GENERATED[0], GENERATED[1]];
  const n = toks.length;
  const states: CellState[] = toks.map((_, i) => (i === n - 1 ? "new" : "cached"));
  const x0 = 140;
  const dx = 78;
  const focus = 2;
  const m = 22;
  const mx = 724;
  const my = 160;
  return (
    <Svg label="A token's values at every layer depend only on itself and earlier tokens, so its cached keys and values never change">
      <Label x={x0 + 3 * dx} y={66} size={14} weight={700} color="var(--ink)">
        A new token arrives: do the old columns change?
      </Label>
      <Grid tokens={toks} x0={x0} dx={dx} states={states} outline={(c, r) => c <= focus && r !== 2} />
      <Appear delay={0.5}>
        {[0, 1, 2].map((c) => (
          <Arrow key={c} x1={x0 + c * dx} y1={LAYER_Y[0] - 22} x2={x0 + focus * dx - (focus - c) * 8} y2={LAYER_Y[1] + 22} tone="violet" width={1.6} delay={0.5 + c * 0.1} />
        ))}
        <Label x={x0 + focus * dx + 44} y={359} anchor="start" size={12} color="var(--violet)" weight={650}>
          ·sat at layer 2 reads only The, ·cat and ·sat from layer 1
        </Label>
      </Appear>

      <Appear delay={1}>
        <Label x={mx + (7 * (m + 2)) / 2} y={124} size={13} weight={700} color="var(--ink)">
          The causal mask
        </Label>
        {toks.map((_, r) =>
          toks.map((__, c) => (
            <rect
              key={`${r}-${c}`}
              x={mx + c * (m + 2)}
              y={my + r * (m + 2)}
              width={m}
              height={m}
              rx={4}
              fill={c > r ? "url(#hatch)" : r === focus ? "var(--violet-soft)" : "var(--card-2)"}
              stroke={r === focus && c <= r ? "var(--violet)" : "var(--rule)"}
            />
          )),
        )}
        <Label x={mx - 8} y={my + focus * (m + 2) + 15} anchor="end" size={11.5} mono color="var(--violet)">
          ·sat
        </Label>
        <Label x={mx + (7 * (m + 2)) / 2} y={my + 7 * (m + 2) + 20} size={11.5}>
          row: who reads; column: who is read
        </Label>
      </Appear>
      <Label x={480} y={506} size={12.5}>
        Information only flows forward in time, so a token&apos;s K and V are final once computed.
      </Label>
    </Svg>
  );
}

/* ---------------------------------------------------------------- */
/* Step 6: cache memory                                               */
/* ---------------------------------------------------------------- */

function MemoryScene() {
  const gpt2 = kvBytes(GPT2_KV);
  const one = kvBytes(LLAMA2_7B_8K);
  const gqa = kvBytes(GQA_7B_8K);
  const weights = LLAMA2_7B_PARAMS * 2;
  const bars = [
    { label: "weights, bf16", v: weights, color: "var(--ink-3)" },
    { label: "KV cache, 1 sequence", v: one, color: "var(--k)" },
    { label: "KV cache, batch of 16", v: one * 16, color: "var(--k)" },
    { label: "batch of 16 with GQA (8 KV heads)", v: gqa * 16, color: "var(--ok)" },
  ];
  const max = one * 16;
  return (
    <Svg label="KV cache memory: 37.7 MB for GPT-2 small at 1024 tokens, and gigabytes per sequence for a 7B model at 8,192 tokens">
      <Label x={480} y={70} size={18} mono weight={700} color="var(--ink)">
        bytes = 2 × n_layer × n_kv_heads × head_size × T × bytes_per_number
      </Label>
      <Label x={480} y={94} size={12.5}>
        2 because both K and V are stored; per sequence
      </Label>

      <Appear delay={0.3}>
        <rect x={60} y={116} width={840} height={64} rx={12} fill="var(--card)" stroke="var(--rule-strong)" />
        <Label x={80} y={142} anchor="start" size={13.5} weight={700} color="var(--ink)">
          GPT-2 small, 1,024 tokens, bf16
        </Label>
        <Label x={80} y={164} anchor="start" size={12}>
          {`weights: ${bytes(124.44e6 * 2)}`}
        </Label>
        <Label x={880} y={154} anchor="end" size={15} mono weight={650} color="var(--ink)">
          {`2 × 12 × 12 × 64 × 1,024 × 2 = ${bytes(gpt2)}`}
        </Label>
      </Appear>

      <Appear delay={0.8}>
        <Label x={60} y={220} anchor="start" size={13.5} weight={700} color="var(--ink)">
          A 7B model shaped like Llama 2 7B (32 layers, 32 heads of 128), 8,192 tokens, bf16
        </Label>
        <Label x={60} y={244} anchor="start" size={15} mono weight={650} color="var(--ink)">
          {`2 × 32 × 32 × 128 × 8,192 × 2 = ${bytes(one)} per sequence`}
        </Label>
        {bars.map((b, i) => {
          const y = 286 + i * 44;
          const w = Math.max(3, (b.v / max) * 400);
          return (
            <g key={b.label}>
              <Label x={330} y={y + 4} anchor="end" size={12.5} color="var(--ink)">
                {b.label}
              </Label>
              <rect x={344} y={y - 10} width={400} height={18} rx={4} fill="var(--paper-2)" />
              <motion.rect x={344} y={y - 10} height={18} rx={4} fill={b.color} initial={{ width: 0 }} animate={{ width: w }} transition={{ delay: 1 + i * 0.2, duration: 0.7, ease: EASE }} />
              <Label x={344 + w + 10} y={y + 4} anchor="start" size={13} mono weight={650} color="var(--ink)">
                {bytes(b.v)}
              </Label>
            </g>
          );
        })}
      </Appear>
      <Label x={480} y={482} size={12.5} color="var(--ink)">
        The cache grows with every token and every sequence in the batch. At long context it outweighs the model.
      </Label>
      <Label x={480} y={504} size={12}>
        Grouped-query attention (Day 7) shares each K and V head across several query heads: 4 times smaller here.
      </Label>
    </Svg>
  );
}

/* ---------------------------------------------------------------- */
/* Step 7: KV calculator                                              */
/* ---------------------------------------------------------------- */

const KV_PRESETS: { id: string; label: string; cfg: KvCfg }[] = [
  { id: "gpt2", label: "GPT-2 small", cfg: GPT2_KV },
  { id: "l2", label: "Llama 2 7B", cfg: { nLayer: 32, nKvHeads: 32, headSize: 128, T: 4096, bytes: 2 } },
  { id: "l3", label: "Llama 3 8B", cfg: { nLayer: 32, nKvHeads: 8, headSize: 128, T: 8192, bytes: 2 } },
  { id: "l70", label: "Llama 3 70B", cfg: { nLayer: 80, nKvHeads: 8, headSize: 128, T: 8192, bytes: 2 } },
];

function KvTryScene() {
  const [cfg, setCfg] = useState<KvCfg>(GPT2_KV);
  const [logBatch, setLogBatch] = useState(0);
  const batch = 2 ** logBatch;
  const perToken = kvBytes({ ...cfg, T: 1 });
  const perSeq = kvBytes(cfg);
  const total = perSeq * batch;
  const gpu = 80e9;
  const fits = Math.floor(gpu / perSeq);
  const W = 660;
  const set = (k: keyof KvCfg) => (v: number) => setCfg((c) => ({ ...c, [k]: v }));
  const preset = KV_PRESETS.find((p) => JSON.stringify(p.cfg) === JSON.stringify(cfg));
  const scaleMax = Math.max(total, gpu);
  const barW = 520;
  const tw = (total / scaleMax) * barW;
  const gw = (gpu / scaleMax) * barW;

  const svg = (
    <Svg w={W} h={540} label="KV cache size for the chosen model shape, context length and batch, against an 80 GB GPU">
      <Label x={W / 2} y={50} size={15} weight={700} color="var(--ink)">
        {preset ? preset.label : "Your model"}
      </Label>
      <Label x={W / 2} y={84} size={15} mono weight={650} color="var(--ink)">
        {`2 × ${cfg.nLayer} × ${cfg.nKvHeads} × ${cfg.headSize} × ${commas(cfg.T)} × ${cfg.bytes} B`}
      </Label>
      <Label x={W / 2} y={106} size={12}>
        2 × n_layer × n_kv_heads × head_size × T × bytes
      </Label>

      {[
        { label: "per token", v: perToken },
        { label: "per sequence", v: perSeq },
        { label: `whole batch (${batch})`, v: total },
      ].map((r, i) => (
        <g key={r.label}>
          <Label x={70 + i * 200} y={156} size={12.5}>
            {r.label}
          </Label>
          <Label x={70 + i * 200} y={186} size={20} mono weight={700} color={i === 2 ? "var(--k)" : "var(--ink)"}>
            {bytes(r.v)}
          </Label>
        </g>
      ))}

      <Label x={70} y={262} anchor="start" size={13} weight={650} color="var(--ink)">
        Against one 80 GB GPU
      </Label>
      <rect x={70} y={280} width={barW} height={30} rx={6} fill="var(--paper-2)" />
      <motion.rect x={70} y={280} height={30} rx={6} fill="var(--k)" initial={false} animate={{ width: Math.max(2, tw) }} transition={{ duration: 0.3 }} />
      <line x1={70 + gw} x2={70 + gw} y1={270} y2={320} stroke="var(--ink)" strokeWidth={2} strokeDasharray="4 3" />
      <Label x={70 + gw} y={338} anchor={gw > barW - 40 ? "end" : "middle"} size={11.5} mono color="var(--ink)">
        80 GB
      </Label>
      <Label x={W / 2} y={384} size={13} color={total > gpu ? "var(--bad)" : "var(--ink)"} weight={600}>
        {total > gpu ? `The cache alone needs ${(total / gpu).toFixed(1)} GPUs' worth of memory.` : `The cache uses ${((total / gpu) * 100).toFixed(total / gpu < 0.01 ? 2 : 1)}% of the GPU.`}
      </Label>
      <Label x={W / 2} y={410} size={12.5}>
        {`At this context, ${commas(fits)} sequence${fits === 1 ? "" : "s"} fit in 80 GB, before the weights.`}
      </Label>
      <Label x={W / 2} y={470} size={12}>
        Halve n_kv_heads, the context or the bytes, and the cache halves.
      </Label>
      <Label x={W / 2} y={490} size={12}>
        That is exactly what GQA, shorter windows and fp8 caches do.
      </Label>
    </Svg>
  );

  const controls = (
    <div className="grid gap-2">
      <div>
        <div className="mb-1.5 text-[13px] font-semibold text-ink">Presets</div>
        <div className="flex flex-wrap gap-1.5">
          {KV_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setCfg(p.cfg)}
              aria-pressed={preset?.id === p.id}
              className={`rounded-lg border px-1.5 py-1 text-[12px] font-semibold transition-colors ${
                preset?.id === p.id ? "border-ink bg-mark-soft text-ink" : "border-rule-strong bg-card text-ink-2 hover:border-ink"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <Slider label="n_layer" value={cfg.nLayer} min={1} max={96} step={1} onChange={set("nLayer")} format={(v) => `${v}`} />
      <Slider label="n_kv_heads" value={cfg.nKvHeads} min={1} max={64} step={1} onChange={set("nKvHeads")} format={(v) => `${v}`} />
      <Slider label="head_size" value={cfg.headSize} min={32} max={256} step={32} onChange={set("headSize")} format={(v) => `${v}`} />
      <Slider label="Context T" value={Math.log2(cfg.T)} min={7} max={17} step={1} onChange={(v) => set("T")(2 ** v)} format={() => commas(cfg.T)} />
      <Slider label="Batch" value={logBatch} min={0} max={8} step={1} onChange={setLogBatch} format={() => `${batch}`} />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-ink">Bytes</span>
        <Segmented
          label="Bytes per number"
          value={String(cfg.bytes)}
          onChange={(v) => set("bytes")(Number(v))}
          options={[
            { value: "4", label: "fp32" },
            { value: "2", label: "bf16" },
            { value: "1", label: "fp8" },
          ]}
        />
      </div>
      <div>
        <Readout label="Per token" value={bytes(perToken)} />
        <Readout label="Per sequence" value={bytes(perSeq)} />
      </div>
    </div>
  );
  return <TryLayout svg={svg} controls={controls} />;
}

/* ---------------------------------------------------------------- */
/* Step 8: prefill is compute-bound, decode is memory-bound           */
/* ---------------------------------------------------------------- */

function BoundScene() {
  const wBytes = LLAMA2_7B_PARAMS * 2;
  const readMs = (wBytes / HBM_BW) * 1e3;
  const prefillMs = ((2 * LLAMA2_7B_PARAMS * 1000) / A100_BF16) * 1e3;
  const decodeMs = ((2 * LLAMA2_7B_PARAMS) / A100_BF16) * 1e3;
  const max = prefillMs;
  const W = 420;
  const rows = [
    { title: "Prefill: 1,000-token prompt", read: readMs, math: prefillMs, verdict: "compute-bound", tone: "accent" as const, y: 150 },
    { title: "Decode: 1 new token (batch 1)", read: readMs, math: decodeMs, verdict: "memory-bound", tone: "bad" as const, y: 320 },
  ];
  return (
    <Svg label="For a 7B model, prefill spends more time on arithmetic than on reading weights; decode spends almost all its time reading weights">
      <Label x={480} y={68} size={14} weight={700} color="var(--ink)">
        {`7B model in bf16 (${bytes(wBytes)} of weights) on one A100: ideal time per forward pass`}
      </Label>
      <Label x={480} y={90} size={12}>
        Every forward pass streams all the weights from HBM (about 2 TB/s) and does 2 FLOPs per weight per token (312 TFLOPS).
      </Label>
      {rows.map((r) => (
        <g key={r.title}>
          <Label x={60} y={r.y - 24} anchor="start" size={14} weight={700} color="var(--ink)">
            {r.title}
          </Label>
          <Pill x={860} y={r.y - 28} text={r.verdict} tone={r.tone} mono={false} fontSize={13} strong />
          {[
            { label: "read weights", v: r.read, color: "var(--ink-3)" },
            { label: "do the math", v: r.math, color: r.tone === "bad" ? "var(--bad)" : "var(--accent)" },
          ].map((b, i) => {
            const y = r.y + i * 40;
            const w = Math.max(2, (b.v / max) * W);
            return (
              <g key={b.label}>
                <Label x={240} y={y + 14} anchor="end" size={12.5} color="var(--ink)">
                  {b.label}
                </Label>
                <rect x={256} y={y} width={W} height={20} rx={4} fill="var(--paper-2)" />
                <motion.rect x={256} y={y} height={20} rx={4} fill={b.color} initial={{ width: 0 }} animate={{ width: w }} transition={{ delay: 0.3 + i * 0.25, duration: 0.7, ease: EASE }} />
                <Label x={256 + w + 10} y={y + 15} anchor="start" size={13} mono weight={650} color="var(--ink)">
                  {b.v >= 1 ? `${b.v.toFixed(1)} ms` : `${b.v.toFixed(3)} ms`}
                </Label>
              </g>
            );
          })}
        </g>
      ))}
      <Appear delay={1}>
        <rect x={90} y={430} width={780} height={74} rx={12} fill="var(--mark-soft)" stroke="var(--mark)" />
        <Label x={480} y={458} size={13.5} color="var(--ink)" weight={600}>
          {`Decode at batch 1 is capped by bandwidth: at most about ${Math.round(1000 / readMs)} tokens per second.`}
        </Label>
        <Label x={480} y={482} size={12.5}>
          Batching 32 sequences shares one weight read across 32 tokens. That is why servers batch.
        </Label>
      </Appear>
    </Svg>
  );
}

/* ---------------------------------------------------------------- */
/* Step 9: temperature, top-k, top-p                                  */
/* ---------------------------------------------------------------- */

function SamplingScene() {
  const [temp, setTemp] = useState(1);
  const [topK, setTopK] = useState(CANDIDATES.length);
  const [topP, setTopP] = useState(1);
  const [drawn, setDrawn] = useState<number | null>(null);
  const r = sampleFilter(temp, topK, topP);
  const W = 660;
  const y0 = 96;
  const rh = 29;
  const maxP = Math.max(...r.probs, ...r.final);
  const bw = 200;
  const draw = () => {
    let u = Math.random();
    let pick = 0;
    for (let i = 0; i < r.final.length; i++) {
      u -= r.final[i];
      if (u <= 0) {
        pick = i;
        break;
      }
    }
    setDrawn(pick);
  };

  const svg = (
    <Svg w={W} h={540} label="Next-token probabilities after temperature, with tokens cut by top-k or top-p hatched and the kept ones renormalized">
      <Label x={W / 2} y={44} size={14} weight={700} color="var(--ink)">
        Next token after &quot;The cat sat on the&quot;
      </Label>
      <Label x={250} y={78} size={12} weight={650} color="var(--ink-2)">
        after temperature
      </Label>
      <Label x={510} y={78} size={12} weight={650} color="var(--ink-2)">
        after the cuts, renormalized
      </Label>
      {CANDIDATES.map((c, i) => {
        const y = y0 + i * rh;
        const cut = r.reason[i] !== "kept";
        const w1 = Math.max(1.5, (r.probs[i] / maxP) * bw);
        const w2 = Math.max(0, (r.final[i] / maxP) * 130);
        return (
          <g key={c.t} opacity={cut ? 0.75 : 1}>
            <Label x={140} y={y + 15} anchor="end" size={13} mono color={drawn === i ? "var(--ink)" : "var(--ink-2)"} weight={drawn === i ? 700 : 500}>
              {c.t.replace(/ /g, "·")}
            </Label>
            <motion.rect x={150} y={y + 3} height={16} rx={3} fill={cut ? "url(#hatch)" : "var(--accent)"} stroke={cut ? "var(--rule-strong)" : "none"} initial={false} animate={{ width: w1 }} transition={{ duration: 0.25 }} />
            <Label x={150 + w1 + 6} y={y + 15} anchor="start" size={11} mono color="var(--ink-3)">
              {`${(r.probs[i] * 100).toFixed(1)}%`}
            </Label>
            {cut ? (
              <Label x={450} y={y + 15} anchor="start" size={11.5} color="var(--bad)">
                {r.reason[i] === "k" ? "cut by top-k" : "cut by top-p"}
              </Label>
            ) : (
              <>
                <motion.rect x={450} y={y + 3} height={16} rx={3} fill={drawn === i ? "var(--mark)" : "var(--ok)"} initial={false} animate={{ width: Math.max(1.5, w2) }} transition={{ duration: 0.25 }} />
                <Label x={450 + w2 + 6} y={y + 15} anchor="start" size={11} mono color="var(--ink)">
                  {`${(r.final[i] * 100).toFixed(1)}%`}
                </Label>
              </>
            )}
          </g>
        );
      })}
      <line x1={430} x2={430} y1={y0} y2={y0 + CANDIDATES.length * rh} stroke="var(--rule)" />
      <Label x={W / 2} y={466} size={13} color="var(--ink)" weight={600}>
        {`${r.kept} of ${CANDIDATES.length} kept, holding ${(r.keptMass * 100).toFixed(1)}% of the probability before renormalizing`}
      </Label>
      <Label x={W / 2} y={490} size={12}>
        Showing the 12 likeliest of 50,257 tokens, renormalized over these 12 for the picture.
      </Label>
      {drawn !== null && (
        <Label x={W / 2} y={514} size={12.5} color="var(--ink)" weight={650}>
          {`Sampled: ${CANDIDATES[drawn].t.replace(/ /g, "·")}`}
        </Label>
      )}
    </Svg>
  );

  const controls = (
    <div className="grid gap-3">
      <div className="text-[13px] font-semibold text-ink">Applied in this order</div>
      <Slider label="1. Temperature" value={temp} min={0.05} max={2} step={0.05} onChange={setTemp} format={(v) => v.toFixed(2)} hint="Divides the logits. Low: sharper. High: flatter." />
      <Slider label="2. Top-k" value={topK} min={1} max={CANDIDATES.length} step={1} onChange={setTopK} format={(v) => (v === CANDIDATES.length ? "off" : `${v}`)} hint="Keep the k likeliest tokens." />
      <Slider label="3. Top-p" value={topP} min={0.05} max={1} step={0.01} onChange={setTopP} format={(v) => (v >= 1 ? "off" : v.toFixed(2))} hint="Keep the smallest set whose probability reaches p." />
      <button type="button" className="btn btn-primary justify-center" onClick={draw}>
        Sample a token
      </button>
      <button
        type="button"
        className="btn btn-ghost justify-center !py-1 !text-[12.5px]"
        onClick={() => {
          setTemp(1);
          setTopK(CANDIDATES.length);
          setTopP(1);
          setDrawn(null);
        }}
      >
        Reset
      </button>
    </div>
  );
  return <TryLayout svg={svg} controls={controls} />;
}

/* ---------------------------------------------------------------- */
/* Step 10: stop conditions and streaming                             */
/* ---------------------------------------------------------------- */

function StreamScene() {
  const toks = [...GENERATED, "<|endoftext|>"];
  const prefillEnd = 250;
  const tickX = (i: number) => prefillEnd + 40 + i * 104;
  const t0 = 1.2;
  const dt = 0.75;
  const pieces = [...PROMPT, ...GENERATED];
  const charW = 17 * 0.61;
  const startX = 480 - (pieces.join("").length * charW) / 2;
  const offsets = pieces.map((_, i) => startX + pieces.slice(0, i).join("").length * charW);
  return (
    <Svg label="A timeline: prefill takes the time to first token, then each decode step produces one token that is streamed to the user until the end-of-text token">
      <Label x={60} y={74} anchor="start" size={13.5} weight={700} color="var(--ink)">
        Server
      </Label>
      <line x1={80} x2={900} y1={150} y2={150} stroke="var(--ink-3)" />
      <motion.rect x={80} y={128} height={44} rx={8} fill="var(--accent-soft)" stroke="var(--accent)" initial={{ width: 0 }} animate={{ width: prefillEnd - 80 }} transition={{ duration: 1, ease: EASE }} />
      <Label x={(80 + prefillEnd) / 2} y={155} size={13} weight={650} color="var(--ink)">
        prefill: 5 tokens
      </Label>
      {toks.map((t, i) => {
        const end = i === toks.length - 1;
        return (
          <Appear key={i} delay={t0 + i * dt} y={0}>
            <rect x={tickX(i) - 26} y={136} width={52} height={28} rx={6} fill={end ? "var(--bad-soft)" : "var(--mark-soft)"} stroke={end ? "var(--bad)" : "var(--mark)"} />
            <Label x={tickX(i)} y={155} size={11} mono color="var(--ink)">
              {`step ${i + 1}`}
            </Label>
            <Label x={tickX(i)} y={112} size={12.5} mono weight={650} color={end ? "var(--bad)" : "var(--ink)"}>
              {t.replace(/ /g, "·")}
            </Label>
            {!end && <Arrow x1={tickX(i)} y1={168} x2={tickX(i)} y2={286} tone="mark" duration={0.4} />}
          </Appear>
        );
      })}
      <path d={`M 80 188 v 8 H ${prefillEnd} v -8`} fill="none" stroke="var(--accent)" strokeWidth={1.4} />
      <Label x={(80 + prefillEnd) / 2} y={214} size={12} color="var(--accent)" weight={650}>
        time to first token
      </Label>
      <Label x={(80 + prefillEnd) / 2} y={230} size={11.5}>
        queueing + prefill
      </Label>
      <Appear delay={t0 + dt}>
        <path d={`M ${tickX(0)} 188 v 8 H ${tickX(1)} v -8`} fill="none" stroke="var(--mark)" strokeWidth={1.4} />
        <Label x={(tickX(0) + tickX(1)) / 2} y={214} size={12} color="color-mix(in oklab, var(--mark) 70%, var(--ink))" weight={650}>
          time per output token
        </Label>
        <Label x={(tickX(0) + tickX(1)) / 2} y={230} size={11.5}>
          tokens/s = 1 / this
        </Label>
      </Appear>
      <Appear delay={t0 + 4 * dt}>
        <Label x={tickX(4)} y={192} size={11.5} color="var(--bad)" weight={650}>
          stop: id 50256
        </Label>
        <Label x={tickX(4)} y={208} size={11.5}>
          or max_new_tokens
        </Label>
      </Appear>

      <Label x={60} y={300} anchor="start" size={13.5} weight={700} color="var(--ink)">
        What the user sees
      </Label>
      <rect x={60} y={316} width={840} height={70} rx={12} fill="var(--card)" stroke="var(--rule-strong)" />
      {[...PROMPT, ...GENERATED].map((t, i) => {
        const gen = i >= PROMPT.length;
        return (
          <Appear key={i} delay={gen ? t0 + (i - PROMPT.length) * dt + 0.35 : 0} y={0}>
            <text x={offsets[i]} y={358} fontSize={17} className="mono" fill={gen ? "var(--ink)" : "var(--ink-3)"} fontWeight={gen ? 650 : 400} style={{ whiteSpace: "pre" }}>
              {t}
            </text>
          </Appear>
        );
      })}
      <Appear delay={1.6}>
        <Label x={480} y={432} size={13} color="var(--ink)" weight={600}>
          Each token is detokenized and sent the moment it is sampled (for example over server-sent events).
        </Label>
        <Label x={480} y={456} size={12.5}>
          A token can end halfway through a multi-byte character, so streamers hold back incomplete bytes.
        </Label>
        <Label x={480} y={480} size={12.5}>
          The end-of-text token itself is never shown. Timings here are illustrative.
        </Label>
      </Appear>
    </Svg>
  );
}

/* ---------------------------------------------------------------- */
/* Step 11: recap                                                     */
/* ---------------------------------------------------------------- */

function RecapScene() {
  const loop = [
    { t: "1 new token in", s: "q, k, v for it only" },
    { t: "attend over cache", s: "append k, v" },
    { t: "logits / temperature", s: "then top-k, top-p" },
    { t: "sample", s: "stream it out" },
  ];
  const xs = [306, 480, 654, 828];
  const Y = 300;
  return (
    <Svg label="Summary: prefill the prompt once to fill the cache, then loop: one token in, attend over the cache, sample, stream, until a stop condition">
      <Box x={116} y={Y} w={150} h={76} title="prefill" sub="whole prompt, once" tone="accent" />
      <Label x={116} y={Y + 58} size={11.5}>
        compute-bound
      </Label>
      <Arrow x1={193} y1={Y} x2={224} y2={Y} />
      {loop.map((b, i) => (
        <g key={b.t}>
          <Box x={xs[i]} y={Y} w={150} h={62} title={b.t} sub={b.s} tone="mark" />
          {i < loop.length - 1 && <Arrow x1={xs[i] + 78} y1={Y} x2={xs[i + 1] - 80} y2={Y} delay={0.1 * i} />}
        </g>
      ))}
      <path d={`M ${xs[3]} ${Y - 33} C ${xs[3]} 200, ${xs[0]} 200, ${xs[0]} ${Y - 33}`} fill="none" stroke="var(--mark)" strokeWidth={1.8} strokeDasharray="5 4" markerEnd="url(#arrow-mark)" />
      <Pill x={555} y={212} text="decode loop: memory-bound" tone="mark" mono={false} fontSize={12.5} />
      <Arrow x1={xs[3]} y1={Y + 33} x2={xs[3]} y2={Y + 84} tone="bad" />
      <Pill x={xs[3]} y={Y + 100} text="end token or max_new_tokens: stop" tone="bad" mono={false} fontSize={12} />

      <rect x={60} y={86} width={360} height={70} rx={12} fill="var(--k-soft)" stroke="var(--k)" />
      <Label x={240} y={114} size={13} weight={700} color="var(--ink)">
        KV cache
      </Label>
      <Label x={240} y={138} size={12} mono color="var(--ink)">
        2 × n_layer × n_kv_heads × head_size × T × bytes
      </Label>
      <rect x={480} y={86} width={420} height={70} rx={12} fill="var(--card)" stroke="var(--rule-strong)" />
      <Label x={690} y={114} size={13} weight={700} color="var(--ink)">
        Latency
      </Label>
      <Label x={690} y={138} size={12}>
        time to first token = queue + prefill; then 1 / tokens per second
      </Label>
      <Label x={480} y={470} size={13} color="var(--ink)" weight={600}>
        Cached K and V are exact: the causal mask means old positions never change.
      </Label>
      <Label x={480} y={494} size={12.5}>
        Temperature reshapes the distribution; top-k and top-p cut its tail; the rest is renormalized and sampled.
      </Label>
    </Svg>
  );
}
