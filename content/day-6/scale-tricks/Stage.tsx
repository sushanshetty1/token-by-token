"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Appear, Arrow, Box, Label, Pill, Svg, EASE } from "@/components/viz/svg";
import { Segmented, Slider } from "@/components/viz/controls";
import type { StageProps } from "@/lib/types";
import { PolyPacket, Readout, TryLayout } from "@/content/day-5/block/parts";
import { commas, duration, getLr, GPT2_SCHEDULE, GRAD_ACCUM, MICRO_B, momentumSeries, napkin, normSeries, sci, short, T, TOTAL_BATCH, type Schedule } from "./math";

export function Stage({ step, playing }: StageProps) {
  switch (step) {
    case 0:
      return <BatchScene />;
    case 1:
      return <AccumScene playing={playing} />;
    case 2:
      return <DivideScene />;
    case 3:
      return <AdamScene />;
    case 4:
      return <LrScene />;
    case 5:
      return <ClipScene />;
    case 6:
      return <PrecisionScene />;
    case 7:
      return <FlashScene />;
    case 8:
      return <FlopsScene />;
    case 9:
      return <NapkinScene />;
    default:
      return <LoopScene playing={playing} />;
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

/* ---------------------------------------------------------------- */
/* Step 1: half a million tokens per step                             */
/* ---------------------------------------------------------------- */

function MiniBatch({ x, y, w = 110, h = 70, tone = "muted", delay = 0 }: { x: number; y: number; w?: number; h?: number; tone?: "muted" | "mark" | "ok"; delay?: number }) {
  const stroke = tone === "mark" ? "var(--mark)" : tone === "ok" ? "var(--ok)" : "var(--rule-strong)";
  const fill = tone === "mark" ? "var(--mark-soft)" : tone === "ok" ? "var(--ok-soft)" : "var(--card)";
  return (
    <motion.g initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay, duration: 0.35 }} style={{ transformOrigin: `${x + w / 2}px ${y + h / 2}px`, transformBox: "view-box" }}>
      <rect x={x} y={y} width={w} height={h} rx={8} fill={fill} stroke={stroke} strokeWidth={1.4} />
      {Array.from({ length: 6 }, (_, r) => (
        <line key={r} x1={x + 8} x2={x + w - 8} y1={y + 12 + r * ((h - 24) / 5)} y2={y + 12 + r * ((h - 24) / 5)} stroke={stroke} strokeWidth={2} strokeDasharray="3 2" opacity={0.7} />
      ))}
    </motion.g>
  );
}

function BatchScene() {
  const tiles = Array.from({ length: GRAD_ACCUM }, (_, i) => ({ x: 60 + (i % 4) * 124, y: 150 + Math.floor(i / 4) * 92 }));
  return (
    <Svg label="One optimizer step of GPT-2 uses 524,288 tokens, eight times more than one GPU can process at once">
      <Label x={298} y={92} size={16} weight={700} color="var(--ink)">
        One optimizer step: {commas(TOTAL_BATCH)} tokens
      </Label>
      <Label x={298} y={116} size={12.5}>
        2^19, about 0.5M, the batch size GPT-2 small trained with
      </Label>
      {tiles.map((t, i) => (
        <g key={i}>
          <MiniBatch x={t.x} y={t.y} delay={i * 0.06} />
          <Label x={t.x + 55} y={t.y + 88} size={11.5} mono color="var(--ink-3)">
            {`${MICRO_B} × ${commas(T)}`}
          </Label>
        </g>
      ))}

      <Appear delay={0.7}>
        <rect x={640} y={130} width={270} height={220} rx={16} fill="var(--card)" stroke="var(--ink)" strokeWidth={1.6} />
        <rect x={640} y={133} width={270} height={220} rx={16} fill="none" stroke="var(--ink)" strokeWidth={1} opacity={0.3} />
        <Label x={775} y={162} size={15} weight={700} color="var(--ink)">
          One GPU
        </Label>
        <Label x={775} y={182} size={12}>
          memory fits one micro-batch
        </Label>
        <MiniBatch x={720} y={204} tone="mark" delay={0.9} />
        <Label x={775} y={300} size={13} mono color="var(--ink)">
          {`B = ${MICRO_B}, T = ${commas(T)}`}
        </Label>
        <Label x={775} y={320} size={12.5} mono>
          {`${commas(MICRO_B * T)} tokens per pass`}
        </Label>
        <Arrow x1={540} y1={240} x2={630} y2={240} tone="mark" />
      </Appear>

      <Appear delay={1.2}>
        <rect x={150} y={410} width={660} height={74} rx={12} fill="var(--mark-soft)" stroke="var(--mark)" />
        <Label x={480} y={440} size={15} mono weight={650} color="var(--ink)">
          {`${commas(TOTAL_BATCH)} / ${commas(MICRO_B * T)} = ${GRAD_ACCUM} passes per optimizer step`}
        </Label>
        <Label x={480} y={466} size={12.5}>
          A smaller GPU fits B = 16: then it is 32 passes. The update must come out the same.
        </Label>
      </Appear>
    </Svg>
  );
}

/* ---------------------------------------------------------------- */
/* Step 2: gradient accumulation, animated                            */
/* ---------------------------------------------------------------- */

function AccumScene({ playing }: { playing: boolean }) {
  const tick = useTicker(GRAD_ACCUM + 1, 950, playing);
  const active = tick >= 1 && tick <= GRAD_ACCUM ? tick - 1 : -1;
  const done = Math.min(tick, GRAD_ACCUM);
  const unit = 38;
  const bucket = { x: 700, y: 128, w: 84, h: unit * GRAD_ACCUM + 8 };
  const bottom = bucket.y + bucket.h;
  const tileY = (k: number) => 92 + k * 50;
  return (
    <Svg label="Eight micro-batches each run forward and backward on the GPU, and their gradients pile up in .grad before one optimizer step">
      {Array.from({ length: GRAD_ACCUM }, (_, k) => {
        const tone = k === active ? "mark" : k < done ? "ok" : "muted";
        const stroke = tone === "mark" ? "var(--mark)" : tone === "ok" ? "var(--ok)" : "var(--rule-strong)";
        const fill = tone === "mark" ? "var(--mark-soft)" : tone === "ok" ? "var(--ok-soft)" : "var(--card)";
        return (
          <g key={k}>
            <rect x={56} y={tileY(k)} width={176} height={38} rx={9} fill={fill} stroke={stroke} strokeWidth={1.4} />
            <text x={70} y={tileY(k) + 16} fontSize={13} fontWeight={650} fill="var(--ink)">
              {`micro-batch ${k + 1}`}
            </text>
            <text x={70} y={tileY(k) + 31} fontSize={11.5} className="mono" fill="var(--ink-2)">
              {`${MICRO_B} × ${commas(T)} tokens`}
            </text>
          </g>
        );
      })}

      <Box x={440} y={290} w={210} h={110} title="GPU: forward + backward" sub="loss = mean over 65,536 tokens" tone={active >= 0 ? "mark" : "ink"} active={active >= 0} />
      <Label x={440} y={376} size={13} mono color="var(--ink)">
        loss.backward()
      </Label>
      <Label x={440} y={396} size={12}>
        adds this micro-batch&apos;s gradient into .grad
      </Label>

      <Label x={bucket.x + bucket.w / 2} y={98} size={13.5} mono weight={650} color="var(--ink)">
        .grad
      </Label>
      <Label x={bucket.x + bucket.w / 2} y={116} size={11.5}>
        for one weight
      </Label>
      <rect x={bucket.x} y={bucket.y} width={bucket.w} height={bucket.h} rx={10} fill="var(--card)" stroke="var(--ink)" strokeWidth={1.6} />
      {Array.from({ length: GRAD_ACCUM - 1 }, (_, i) => (
        <line key={i} x1={bucket.x} x2={bucket.x + 10} y1={bottom - 4 - (i + 1) * unit} y2={bottom - 4 - (i + 1) * unit} stroke="var(--rule-strong)" />
      ))}
      <motion.rect
        x={bucket.x + 4}
        width={bucket.w - 8}
        rx={6}
        fill="var(--violet)"
        initial={false}
        animate={{ y: bottom - 4 - done * unit, height: done * unit }}
        transition={{ duration: 0.45, ease: EASE }}
      />

      <Label x={440} y={130} size={15} weight={700} color="var(--ink)">
        {tick === 0 ? "Ready" : tick <= GRAD_ACCUM ? `Micro step ${tick} of ${GRAD_ACCUM}` : "All 8 done"}
      </Label>
      <Label x={440} y={152} size={12.5}>
        no optimizer step yet: gradients just pile up
      </Label>

      {active >= 0 && (
        <g key={tick}>
          <PolyPacket points={[[232, tileY(active) + 19], [335, 290]]} tone="mark" playing={playing} duration={0.45} repeat={false} />
          <PolyPacket points={[[545, 290], [bucket.x, bottom - done * unit]]} tone="violet" playing={playing} duration={0.45} delay={0.45} repeat={false} />
        </g>
      )}

      {tick > GRAD_ACCUM && (
        <Appear>
          <Pill x={bucket.x + bucket.w / 2} y={472} text="optimizer.step()" tone="ok" fontSize={13} strong />
          <Label x={bucket.x + bucket.w / 2} y={502} size={12}>
            one update, then zero_grad()
          </Label>
        </Appear>
      )}
    </Svg>
  );
}

/* ---------------------------------------------------------------- */
/* Step 3: divide the loss by the number of micro steps               */
/* ---------------------------------------------------------------- */

function DivideScene() {
  const unit = 36;
  const top = 132;
  const h = unit * 8 + 8;
  const bottom = top + h;
  const ref = bottom - 4 - unit;
  const buckets = [
    { x: 250, fill: 8, tone: "var(--bad)", code: "loss.backward()", note: "8 × too big" },
    { x: 626, fill: 1, tone: "var(--ok)", code: "(loss / 8).backward()", note: "equals the big batch" },
  ];
  return (
    <Svg label="Without dividing, the accumulated gradient is eight times the big-batch gradient. Dividing each loss by eight makes them equal.">
      <Label x={480} y={74} size={17} mono weight={650} color="var(--ink)">
        mean over 524,288 = (1/8) × (mean₁ + mean₂ + ... + mean₈)
      </Label>
      <Label x={480} y={100} size={12.5}>
        each mean is over one micro-batch of 65,536 tokens
      </Label>

      <line x1={180} x2={780} y1={ref} y2={ref} stroke="var(--ink)" strokeWidth={1.4} strokeDasharray="6 5" />
      <Label x={480} y={ref - 8} size={12} color="var(--ink)" weight={600}>
        gradient of one big 524,288-token batch
      </Label>

      {buckets.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={top} width={84} height={h} rx={10} fill="var(--card)" stroke="var(--ink)" strokeWidth={1.6} />
          <motion.rect
            x={b.x + 4}
            width={76}
            rx={6}
            fill={b.tone}
            initial={{ y: bottom - 4, height: 0 }}
            animate={{ y: bottom - 4 - b.fill * unit, height: b.fill * unit }}
            transition={{ duration: 0.9, delay: 0.3 + i * 0.4, ease: EASE }}
          />
          <Label x={b.x + 42} y={bottom + 30} size={14} mono weight={650} color="var(--ink)">
            {b.code}
          </Label>
          <Label x={b.x + 42} y={bottom + 52} size={13} weight={650} color={b.tone}>
            {b.note}
          </Label>
        </g>
      ))}
      <Appear delay={1.3}>
        <Label x={236} y={250} anchor="end" size={13}>
          8 micro-batch means,
        </Label>
        <Label x={236} y={268} anchor="end" size={13}>
          summed into .grad
        </Label>
        <Label x={724} y={ref - 40} anchor="start" size={13}>
          8 × (mean / 8)
        </Label>
        <Label x={724} y={ref - 22} anchor="start" size={13}>
          = one mean
        </Label>
      </Appear>
      <Label x={480} y={508} size={12.5}>
        Exact, because gradients add. Each token counts once, as in one big batch: only slower.
      </Label>
    </Svg>
  );
}

/* ---------------------------------------------------------------- */
/* Step 4: AdamW in one picture                                       */
/* ---------------------------------------------------------------- */

function AdamScene() {
  const { g, m } = momentumSeries();
  const px = (i: number) => 58 + (i * 240) / (g.length - 1);
  const py = (v: number) => 360 - ((v + 1.5) / 5) * 210;
  const mPath = m.map((v, i) => `${i ? "L" : "M"} ${px(i).toFixed(1)} ${py(v).toFixed(1)}`).join(" ");
  const lr = 6e-4;
  const steps = [
    { label: "A, g ≈ 8", sgd: lr * 8, adam: lr * (8 / (8 + 1e-8)) },
    { label: "B, g ≈ 0.02", sgd: lr * 0.02, adam: lr * (0.02 / (0.02 + 1e-8)) },
  ];
  const max = lr * 8;
  const bar = (v: number) => Math.max(1.5, (v / max) * 110);
  const panels = [36, 340, 644];
  return (
    <Svg label="AdamW: momentum smooths the gradient, dividing by its running size gives every weight a similar step, and weight decay is applied separately">
      {panels.map((x, i) => (
        <rect key={i} x={x} y={66} width={280} height={330} rx={14} fill="var(--card)" stroke="var(--rule-strong)" />
      ))}
      <Label x={176} y={92} size={14} weight={700} color="var(--ink)">
        1. Momentum: m
      </Label>
      <Label x={176} y={110} size={12}>
        a running mean of the gradient
      </Label>
      <line x1={58} x2={298} y1={py(0)} y2={py(0)} stroke="var(--rule-strong)" strokeDasharray="3 4" />
      {g.map((v, i) => (
        <motion.circle key={i} cx={px(i)} cy={py(v)} r={2.8} fill="var(--ink-3)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.015 }} />
      ))}
      <motion.path d={mPath} fill="none" stroke="var(--accent)" strokeWidth={2.6} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, delay: 0.4 }} />
      <Label x={176} y={378} size={11.5}>
        dots: raw g each step · line: m, β1 = 0.9
      </Label>

      <Appear delay={0.6}>
        <Label x={480} y={92} size={14} weight={700} color="var(--ink)">
          2. Adaptive step: ÷ √v
        </Label>
        <Label x={480} y={110} size={12}>
          v is a running mean of g²
        </Label>
        <Label x={480} y={142} size={12.5} weight={650} color="var(--ink)">
          plain SGD step: lr × g
        </Label>
        <Label x={480} y={240} size={12.5} weight={650} color="var(--ink)">
          Adam step: lr × m_hat / √v_hat
        </Label>
        {steps.map((s, i) => (
          <g key={s.label}>
            <Label x={436} y={168 + i * 30} anchor="end" size={12} mono>
              {s.label}
            </Label>
            <rect x={444} y={157 + i * 30} width={bar(s.sgd)} height={14} rx={3} fill="var(--ink-3)" />
            <Label x={450 + bar(s.sgd)} y={168 + i * 30} anchor="start" size={11.5} mono color="var(--ink)">
              {sci(s.sgd)}
            </Label>
            <Label x={436} y={266 + i * 30} anchor="end" size={12} mono>
              {s.label}
            </Label>
            <rect x={444} y={255 + i * 30} width={bar(s.adam)} height={14} rx={3} fill="var(--accent)" />
            <Label x={450 + bar(s.adam)} y={266 + i * 30} anchor="start" size={11.5} mono color="var(--ink)">
              {sci(s.adam)}
            </Label>
          </g>
        ))}
        <Label x={480} y={350} size={12}>
          dividing by the gradient&apos;s own size:
        </Label>
        <Label x={480} y={368} size={12}>
          every weight moves about lr per step
        </Label>
      </Appear>

      <Appear delay={1.2}>
        <Label x={784} y={92} size={14} weight={700} color="var(--ink)">
          3. Decoupled weight decay
        </Label>
        <Label x={784} y={110} size={12}>
          the W in AdamW
        </Label>
        <Label x={664} y={146} anchor="start" size={13} weight={700} color="var(--ink)">
          Adam + L2
        </Label>
        <Label x={664} y={168} anchor="start" size={12.5} mono color="var(--ink)">
          g = g + λθ
        </Label>
        <Label x={664} y={188} anchor="start" size={12.5} mono color="var(--ink)">
          θ −= lr × m_hat / √v_hat
        </Label>
        <Label x={664} y={210} anchor="start" size={11.5} color="var(--bad)">
          the decay is divided by √v_hat too,
        </Label>
        <Label x={664} y={226} anchor="start" size={11.5} color="var(--bad)">
          so big-gradient weights barely decay
        </Label>
        <line x1={664} x2={904} y1={246} y2={246} stroke="var(--rule)" />
        <Label x={664} y={272} anchor="start" size={13} weight={700} color="var(--ink)">
          AdamW
        </Label>
        <Label x={664} y={294} anchor="start" size={12.5} mono color="var(--ink)">
          θ −= lr × m_hat / √v_hat
        </Label>
        <Label x={664} y={314} anchor="start" size={12.5} mono color="var(--ink)">
          θ −= lr × λ × θ
        </Label>
        <Label x={664} y={336} anchor="start" size={11.5} color="var(--ok)">
          every weight shrinks by lr × λ = 6e-5
        </Label>
        <Label x={664} y={352} anchor="start" size={11.5} color="var(--ok)">
          of itself per step, whatever its gradient
        </Label>
      </Appear>

      <Appear delay={1.6}>
        <rect x={36} y={414} width={888} height={92} rx={12} fill="var(--mark-soft)" stroke="var(--mark)" />
        <Label x={168} y={446} size={14} mono weight={600} color="var(--ink)">
          m = β1·m + (1 − β1)·g
        </Label>
        <Label x={410} y={446} size={14} mono weight={600} color="var(--ink)">
          v = β2·v + (1 − β2)·g²
        </Label>
        <Label x={712} y={446} size={14} mono weight={600} color="var(--ink)">
          θ −= lr·(m_hat / (√v_hat + ε) + λ·θ)
        </Label>
        <Label x={480} y={474} size={12.5}>
          m_hat and v_hat are m and v divided by (1 − β to the power t), which corrects their start at zero.
        </Label>
        <Label x={480} y={494} size={12.5}>
          GPT-3 paper settings, reused by the GPT-2 reproduction: β1 = 0.9, β2 = 0.95, ε = 1e-8, λ = 0.1, peak lr 6e-4 at 124M.
        </Label>
      </Appear>
    </Svg>
  );
}

/* ---------------------------------------------------------------- */
/* Step 5: warmup and cosine decay (interactive)                      */
/* ---------------------------------------------------------------- */

function LrScene() {
  const [s, setS] = useState<Schedule>(GPT2_SCHEDULE);
  const W = 660;
  const P = { x0: 84, x1: 620, y0: 104, y1: 400 };
  const sched = { ...s, warmup: Math.min(s.warmup, s.maxSteps - 1) };
  const topLr = 1.2e-3;
  const xs = (it: number) => P.x0 + (it / sched.maxSteps) * (P.x1 - P.x0);
  const ys = (lr: number) => P.y1 - (lr / topLr) * (P.y1 - P.y0);
  const N = 240;
  const path = Array.from({ length: N + 1 }, (_, i) => {
    const it = (i / N) * sched.maxSteps;
    return `${i ? "L" : "M"} ${xs(it).toFixed(1)} ${ys(getLr(it, sched)).toFixed(1)}`;
  }).join(" ");
  const tokens = sched.maxSteps * TOTAL_BATCH;
  const minLr = sched.maxLr * 0.1;

  const svg = (
    <Svg w={W} h={540} label="Learning rate against training step: a linear warmup, then a cosine decay to a tenth of the peak">
      <Label x={W / 2} y={52} size={15} weight={700} color="var(--ink)">
        Learning rate over training
      </Label>
      <Label x={W / 2} y={74} size={12.5} mono>
        get_lr(step)
      </Label>
      <rect x={P.x0} y={P.y0} width={Math.max(1, xs(sched.warmup) - P.x0)} height={P.y1 - P.y0} fill="var(--mark-soft)" opacity={0.8} />
      {[0, 3e-4, 6e-4, 9e-4, 1.2e-3].map((v) => (
        <g key={v}>
          <line x1={P.x0} x2={P.x1} y1={ys(v)} y2={ys(v)} stroke="var(--rule)" />
          <Label x={P.x0 - 8} y={ys(v) + 4} anchor="end" size={11} mono color="var(--ink-3)">
            {v === 0 ? "0" : sci(v)}
          </Label>
        </g>
      ))}
      <line x1={P.x0} x2={P.x1} y1={ys(minLr)} y2={ys(minLr)} stroke="var(--ink-3)" strokeDasharray="4 4" />
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2.8} />
      <circle cx={xs(sched.warmup)} cy={ys(sched.maxLr)} r={5} fill="var(--mark)" stroke="var(--card)" strokeWidth={2} />
      <Label x={xs(sched.warmup) + 10} y={ys(sched.maxLr) < P.y0 + 40 ? ys(sched.maxLr) + 22 : ys(sched.maxLr) - 10} anchor="start" size={12} mono color="var(--ink)">
        {`peak ${sci(sched.maxLr)} at step ${commas(sched.warmup)}`}
      </Label>
      <Label
        x={xs(sched.warmup) - P.x0 > 150 ? xs(sched.warmup) - 6 : xs(sched.warmup) + 6}
        y={P.y1 - 38}
        anchor={xs(sched.warmup) - P.x0 > 150 ? "end" : "start"}
        size={12}
        weight={650}
        color="color-mix(in oklab, var(--mark) 70%, var(--ink))"
      >
        {`warmup: ${commas(sched.warmup)} steps`}
      </Label>
      <Label x={(P.x0 + P.x1) / 2 + 40} y={ys(minLr) - 8} anchor="middle" size={11.5}>
        min_lr = 10% of the peak
      </Label>
      <line x1={P.x0} x2={P.x1} y1={P.y1} y2={P.y1} stroke="var(--ink-3)" />
      <Label x={P.x0} y={P.y1 + 20} anchor="start" size={11} mono color="var(--ink-3)">
        0
      </Label>
      <Label x={P.x1} y={P.y1 + 20} anchor="end" size={11} mono color="var(--ink-3)">
        {`step ${commas(sched.maxSteps)}`}
      </Label>
      <Label x={W / 2} y={P.y1 + 20} size={11.5}>
        training step
      </Label>
      <Label x={W / 2} y={462} size={13} color="var(--ink)">
        {`Tokens seen: ${commas(sched.maxSteps)} steps × 524,288 = ${short(tokens)}`}
      </Label>
      <Label x={W / 2} y={488} size={12.5}>
        {`First step uses lr = ${sci(getLr(0, sched))}: the ramp starts near zero.`}
      </Label>
    </Svg>
  );

  const controls = (
    <div className="grid gap-3">
      <div className="text-[13px] font-semibold text-ink">Shape the schedule</div>
      <Slider label="Peak lr (max_lr)" value={s.maxLr} min={1e-4} max={1.2e-3} step={1e-5} onChange={(v) => setS((o) => ({ ...o, maxLr: v }))} format={(v) => sci(v)} />
      <Slider label="Warmup steps" value={s.warmup} min={0} max={4000} step={5} onChange={(v) => setS((o) => ({ ...o, warmup: v }))} format={(v) => commas(v)} />
      <Slider label="Total steps (max_steps)" value={s.maxSteps} min={2000} max={40000} step={1} onChange={(v) => setS((o) => ({ ...o, maxSteps: v }))} format={(v) => commas(v)} />
      <button type="button" className="btn btn-ghost justify-center !py-1 !text-[12.5px]" onClick={() => setS(GPT2_SCHEDULE)}>
        Reset to GPT-2
      </button>
      <div>
        <Readout label="lr at step 0" value={sci(getLr(0, sched))} />
        <Readout label="Peak" value={sci(sched.maxLr)} sub={`at step ${commas(sched.warmup)}`} />
        <Readout label="lr at the last step" value={sci(getLr(sched.maxSteps, sched))} />
        <Readout label="Halfway through decay" value={sci(getLr((sched.warmup + sched.maxSteps) / 2, sched))} sub="exactly the midpoint of peak and min" />
      </div>
    </div>
  );
  return <TryLayout svg={svg} controls={controls} />;
}

/* ---------------------------------------------------------------- */
/* Step 6: gradient clipping                                          */
/* ---------------------------------------------------------------- */

function ClipScene() {
  const g = [2.4, 1.6];
  const n = Math.hypot(g[0], g[1]);
  const c = [g[0] / n, g[1] / n];
  const O = { x: 230, y: 300 };
  const s = 72;
  const norms = normSeries();
  const nx = (i: number) => 540 + (i * 360) / (norms.length - 1);
  const ny = (v: number) => 380 - (Math.min(v, 4) / 4) * 230;
  const raw = norms.map((v, i) => `${i ? "L" : "M"} ${nx(i).toFixed(1)} ${ny(v).toFixed(1)}`).join(" ");
  const clipped = norms.map((v, i) => `${i ? "L" : "M"} ${nx(i).toFixed(1)} ${ny(Math.min(v, 1)).toFixed(1)}`).join(" ");
  return (
    <Svg label="Gradient clipping rescales a gradient whose norm exceeds 1.0 back onto the unit circle, keeping its direction">
      <Label x={230} y={84} size={15} weight={700} color="var(--ink)">
        One gradient, two of its 124M numbers
      </Label>
      <line x1={80} x2={440} y1={O.y} y2={O.y} stroke="var(--rule-strong)" />
      <line x1={O.x} x2={O.x} y1={130} y2={440} stroke="var(--rule-strong)" />
      <circle cx={O.x} cy={O.y} r={s} fill="var(--ok-soft)" stroke="var(--ok)" strokeWidth={1.6} strokeDasharray="5 4" />
      <Label x={O.x} y={O.y + s + 20} size={12} mono color="var(--ok)">
        norm 1.0
      </Label>
      <Arrow x1={O.x} y1={O.y} x2={O.x + g[0] * s} y2={O.y - g[1] * s} tone="bad" width={2.4} />
      <Label x={O.x + g[0] * s + 6} y={O.y - g[1] * s - 10} anchor="middle" size={13} mono color="var(--bad)" weight={650}>
        {`g: norm ${n.toFixed(2)}`}
      </Label>
      <Appear delay={0.8}>
        <Arrow x1={O.x} y1={O.y} x2={O.x + c[0] * s} y2={O.y - c[1] * s} tone="ok" width={3} />
        <Label x={O.x + c[0] * s + 18} y={O.y - c[1] * s + 34} anchor="start" size={13} mono color="var(--ok)" weight={650}>
          {`clipped: × ${(1 / n).toFixed(2)}`}
        </Label>
        <Label x={260} y={466} size={12.5}>
          same direction, length capped at 1.0
        </Label>
      </Appear>

      <Appear delay={0.4}>
        <Label x={720} y={84} size={15} weight={700} color="var(--ink)">
          Gradient norm, step by step
        </Label>
        <line x1={540} x2={900} y1={380} y2={380} stroke="var(--rule-strong)" />
        <line x1={540} x2={900} y1={ny(1)} y2={ny(1)} stroke="var(--ok)" strokeDasharray="5 4" />
        <Label x={534} y={ny(1) + 4} anchor="end" size={11} mono color="var(--ok)">
          1.0
        </Label>
        <path d={raw} fill="none" stroke="var(--bad)" strokeWidth={1.6} opacity={0.75} />
        <motion.path d={clipped} fill="none" stroke="var(--ok)" strokeWidth={2.6} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, delay: 0.8 }} />
        <Label x={720} y={404} size={11.5}>
          early training and bad batches spike (rose); clipped norm (green) never passes 1.0
        </Label>
      </Appear>

      <Appear delay={1.2}>
        <rect x={500} y={430} width={424} height={74} rx={12} fill="var(--mark-soft)" stroke="var(--mark)" />
        <Label x={712} y={458} size={13.5} mono weight={650} color="var(--ink)">
          if ‖g‖ &gt; 1.0:  g = g × 1.0 / ‖g‖
        </Label>
        <Label x={712} y={484} size={12}>
          ‖g‖ = √(Σ gᵢ²) over all parameters at once
        </Label>
      </Appear>
    </Svg>
  );
}

/* ---------------------------------------------------------------- */
/* Step 7: number formats                                             */
/* ---------------------------------------------------------------- */

function PrecisionScene() {
  const formats = [
    { name: "fp32", bits: [1, 8, 23], note: "range to 3.4e38, about 7 decimal digits", tone: "var(--ink)" },
    { name: "tf32", bits: [1, 8, 10], note: "fp32's range, about 3 digits; a tensor-core matmul mode (19 bits used)", tone: "var(--ink)" },
    { name: "bf16", bits: [1, 8, 7], note: "fp32's range, about 2 to 3 digits: tiny gradients survive", tone: "var(--ok)" },
    { name: "fp16", bits: [1, 5, 10], note: "max 65,504, smallest normal 6e-5: tiny gradients underflow to 0", tone: "var(--bad)" },
  ];
  const cw = 21;
  const gap = 2.6;
  const x0 = 172;
  const colors = [
    { fill: "var(--violet-soft)", stroke: "var(--violet)" },
    { fill: "var(--mark-soft)", stroke: "var(--mark)" },
    { fill: "var(--accent-soft)", stroke: "var(--accent)" },
  ];
  return (
    <Svg label="Bit layouts of fp32, tf32, bf16 and fp16: sign, exponent and mantissa bits">
      <Label x={x0 + 10} y={78} anchor="start" size={12} weight={650} color="var(--violet)">
        sign
      </Label>
      <Label x={x0 + 1 * (cw + gap) + 4 * (cw + gap)} y={78} size={12} weight={650} color="color-mix(in oklab, var(--mark) 70%, var(--ink))">
        exponent: range
      </Label>
      <Label x={x0 + 9 * (cw + gap) + 11.5 * (cw + gap)} y={78} size={12} weight={650} color="var(--accent)">
        mantissa: precision
      </Label>
      {formats.map((f, r) => {
        const y = 96 + r * 92;
        let k = 0;
        return (
          <Appear key={f.name} delay={r * 0.25}>
            <Label x={60} y={y + 17} anchor="start" size={16} weight={700} mono color="var(--ink)">
              {f.name}
            </Label>
            <Label x={60} y={y + 35} anchor="start" size={11.5} mono>
              {`${f.bits[0]} + ${f.bits[1]} + ${f.bits[2]}`}
            </Label>
            {f.bits.map((nb, part) =>
              Array.from({ length: nb }, () => {
                const i = k++;
                const xx = x0 + i * (cw + gap) + (part >= 1 ? 4 : 0) + (part === 2 ? 4 : 0);
                return <rect key={`${part}-${i}`} x={xx} y={y} width={cw} height={26} rx={4} fill={colors[part].fill} stroke={colors[part].stroke} strokeWidth={1.2} />;
              }),
            )}
            <Label x={x0} y={y + 50} anchor="start" size={12.5} color={f.tone} weight={f.tone === "var(--ink)" ? 500 : 650}>
              {f.note}
            </Label>
          </Appear>
        );
      })}
      <Appear delay={1.2}>
        <rect x={60} y={460} width={840} height={52} rx={12} fill="var(--mark-soft)" stroke="var(--mark)" />
        <Label x={480} y={482} size={13} color="var(--ink)" weight={600}>
          A100: 312 TFLOPS in bf16, 156 in tf32, 19.5 in plain fp32. Same exponent, so bf16 needs no loss scaling.
        </Label>
        <Label x={480} y={502} size={12}>
          autocast runs matmuls in bf16 and keeps weights, softmax, LayerNorm and the loss in fp32.
        </Label>
      </Appear>
    </Svg>
  );
}

/* ---------------------------------------------------------------- */
/* Step 8: flash attention and torch.compile                          */
/* ---------------------------------------------------------------- */

function FlashScene() {
  const lanes = (yc: number, yh: number) => (
    <g>
      <line x1={300} x2={920} y1={yc} y2={yc} stroke="var(--rule)" strokeDasharray="2 5" />
      <line x1={300} x2={920} y1={yh} y2={yh} stroke="var(--rule)" strokeDasharray="2 5" />
      <Label x={40} y={yc + 2} anchor="start" size={13} weight={650} color="var(--ink)">
        on-chip SRAM
      </Label>
      <Label x={40} y={yc + 19} anchor="start" size={11.5}>
        about 20 MB, about 19 TB/s
      </Label>
      <Label x={40} y={yh + 2} anchor="start" size={13} weight={650} color="var(--ink)">
        HBM (GPU memory)
      </Label>
      <Label x={40} y={yh + 19} anchor="start" size={11.5}>
        40 to 80 GB, about 2 TB/s
      </Label>
    </g>
  );
  const scores = 64 * 12 * 1024 * 1024;
  const C1 = 142;
  const H1 = 218;
  const C2 = 340;
  const H2 = 416;
  return (
    <Svg label="Standard attention writes the T by T score matrix to slow GPU memory and reads it back; flash attention keeps it on chip">
      <Label x={40} y={90} anchor="start" size={15} weight={700} color="var(--ink)">
        Standard attention
      </Label>
      {lanes(C1, H1)}
      <Box x={400} y={C1} w={90} h={34} title="QKᵀ" tone="ink" radius={9} />
      <Box x={590} y={C1} w={100} h={34} title="softmax" tone="ink" radius={9} />
      <Box x={780} y={C1} w={90} h={34} title="× V" tone="ink" radius={9} />
      <Pill x={340} y={H1} text="Q, K" />
      <Pill x={495} y={H1} text="S: T × T" tone="bad" />
      <Pill x={685} y={H1} text="P: T × T" tone="bad" />
      <Pill x={870} y={H1} text="O" />
      <Arrow x1={346} y1={H1 - 13} x2={380} y2={C1 + 19} tone="muted" delay={0.1} />
      <Arrow x1={430} y1={C1 + 19} x2={485} y2={H1 - 13} tone="bad" delay={0.3} />
      <Arrow x1={505} y1={H1 - 13} x2={560} y2={C1 + 19} tone="bad" delay={0.5} />
      <Arrow x1={620} y1={C1 + 19} x2={675} y2={H1 - 13} tone="bad" delay={0.7} />
      <Arrow x1={695} y1={H1 - 13} x2={750} y2={C1 + 19} tone="bad" delay={0.9} />
      <Arrow x1={810} y1={C1 + 19} x2={862} y2={H1 - 13} tone="muted" delay={1.1} />
      <Label x={610} y={H1 + 34} size={12.5} color="var(--bad)" weight={600}>
        the T × T matrix crosses to HBM 4 times: write S, read S, write P, read P
      </Label>

      <line x1={40} x2={920} y1={278} y2={278} stroke="var(--rule)" />
      <Label x={40} y={306} anchor="start" size={15} weight={700} color="var(--ink)">
        Flash attention
      </Label>
      {lanes(C2, H2)}
      <Box x={605} y={C2} w={380} h={40} title="one fused kernel, tile by tile" sub="QKᵀ, online softmax, × V" tone="ok" radius={10} />
      <Pill x={340} y={H2} text="Q, K, V" />
      <Pill x={870} y={H2} text="O" />
      <Arrow x1={350} y1={H2 - 13} x2={410} y2={C2 + 21} tone="muted" delay={0.4} />
      <Arrow x1={800} y1={C2 + 21} x2={862} y2={H2 - 13} tone="muted" delay={0.6} />
      <Label x={605} y={H2 + 34} size={12.5} color="var(--ok)" weight={600}>
        scores never leave SRAM; only O is written. Same exact result.
      </Label>

      <Appear delay={1.2}>
        <Label x={480} y={486} size={12.5} color="var(--ink)">
          {`B = 64, 12 heads, T = 1024: the scores are ${short(scores)} numbers (${(scores * 2 / 1e9).toFixed(2)} GB in bf16) per layer, never written.`}
        </Label>
        <Label x={480} y={508} size={12}>
          torch.compile applies the same idea to chains of elementwise ops: one fused kernel, one trip through HBM.
        </Label>
      </Appear>
    </Svg>
  );
}

/* ---------------------------------------------------------------- */
/* Step 9: 6ND                                                        */
/* ---------------------------------------------------------------- */

function FlopsScene() {
  const r = napkin(124e6, 10e9, 8, 312e12, 0.4);
  return (
    <Svg label="Training compute is about 6 times parameters times tokens, which for GPT-2 small on 10 billion tokens is about 16 A100-hours">
      <Label x={480} y={84} size={26} mono weight={700} color="var(--ink)">
        training FLOPs ≈ 6 × N × D
      </Label>
      <Label x={480} y={110} size={12.5}>
        N parameters, D training tokens
      </Label>
      <Appear delay={0.3}>
        <rect x={150} y={134} width={300} height={72} rx={12} fill="var(--accent-soft)" stroke="var(--accent)" />
        <Label x={300} y={162} size={14} weight={700} color="var(--ink)">
          forward: 2 per parameter per token
        </Label>
        <Label x={300} y={184} size={12}>
          one multiply and one add per weight
        </Label>
        <rect x={510} y={134} width={300} height={72} rx={12} fill="var(--violet-soft)" stroke="var(--violet)" />
        <Label x={660} y={162} size={14} weight={700} color="var(--ink)">
          backward: 4
        </Label>
        <Label x={660} y={184} size={12}>
          gradients for inputs and for weights
        </Label>
      </Appear>

      <Appear delay={0.8}>
        <Label x={480} y={258} size={20} mono weight={650} color="var(--ink)">
          {`6 × 124M × 10B = ${sci(r.flops, 2)} FLOPs`}
        </Label>
      </Appear>
      <Appear delay={1.2}>
        <Label x={480} y={304} size={15} mono color="var(--ink)">
          {`one A100: 312e12 FLOP/s in bf16 × 40% utilization = ${sci(312e12 * 0.4, 3)} FLOP/s`}
        </Label>
        <Arrow x1={480} y1={318} x2={480} y2={346} tone="mark" />
      </Appear>
      <Appear delay={1.6}>
        <rect x={210} y={356} width={540} height={84} rx={14} fill="var(--mark-soft)" stroke="var(--mark)" strokeWidth={1.6} />
        <Label x={480} y={390} size={20} mono weight={700} color="var(--ink)">
          {`${commas(r.gpuHours * 3600)} s ≈ ${r.gpuHours.toFixed(1)} GPU-hours`}
        </Label>
        <Label x={480} y={420} size={14} mono color="var(--ink)">
          {`on 8 A100s: about ${r.wallHours.toFixed(1)} hours`}
        </Label>
      </Appear>
      <Appear delay={2}>
        <Label x={480} y={476} size={12.5}>
          40% is a realistic utilization (MFU). Attention adds under 10% on top at this size and context.
        </Label>
        <Label x={480} y={498} size={12.5}>
          This is why Karpathy&apos;s GPT-2 reproduction takes about an hour or two on one 8-GPU node.
        </Label>
      </Appear>
    </Svg>
  );
}

/* ---------------------------------------------------------------- */
/* Step 10: the napkin calculator                                     */
/* ---------------------------------------------------------------- */

const RUNS = [
  { id: "gpt2", label: "GPT-2 124M, 10B", N: 124e6, D: 10e9 },
  { id: "gpt3", label: "GPT-3 175B, 300B", N: 175e9, D: 300e9 },
  { id: "chin", label: "Chinchilla 70B, 1.4T", N: 70e9, D: 1.4e12 },
  { id: "llama", label: "Llama 3 8B, 15T", N: 8e9, D: 15e12 },
];

function NapkinScene() {
  const [logN, setLogN] = useState(Math.log10(124e6));
  const [logD, setLogD] = useState(10);
  const [gpus, setGpus] = useState(3);
  const [mfu, setMfu] = useState(0.4);
  const [gpu, setGpu] = useState<"a100" | "h100">("a100");
  const N = 10 ** logN;
  const D = 10 ** logD;
  const G = 2 ** gpus;
  const peak = gpu === "a100" ? 312e12 : 989e12;
  const r = napkin(N, D, G, peak, mfu);
  const W = 660;
  const ax = { x0: 60, x1: 600, y: 360 };
  const lx = (ratio: number) => ax.x0 + (Math.log10(Math.min(Math.max(ratio, 1), 1e4)) / 4) * (ax.x1 - ax.x0);
  const marks = [
    { label: "GPT-3", ratio: 300e9 / 175e9, up: true },
    { label: "Chinchilla", ratio: 20, up: false },
    { label: "GPT-2 run", ratio: 10e9 / 124e6, up: true },
    { label: "Llama 3 8B", ratio: 15e12 / 8e9, up: false },
  ];
  const verdict = r.ratio < 15 ? "Fewer than 20 tokens per parameter: the model is undertrained for this compute." : r.ratio <= 30 ? "About 20 tokens per parameter: Chinchilla compute-optimal." : "More tokens than compute-optimal: a smaller model, cheaper to serve.";

  const svg = (
    <Svg w={W} h={540} label="Training compute and time for the chosen model size and token count, and where it sits against 20 tokens per parameter">
      <Label x={W / 2} y={56} size={19} mono weight={700} color="var(--ink)">
        {`6 × ${short(N)} × ${short(D)} = ${sci(r.flops, 2)} FLOPs`}
      </Label>
      <Label x={W / 2} y={90} size={13} mono>
        {`÷ (${gpu === "a100" ? "312" : "989"} TFLOPS × ${Math.round(mfu * 100)}%) per GPU`}
      </Label>
      <rect x={110} y={110} width={440} height={96} rx={14} fill="var(--mark-soft)" stroke="var(--mark)" strokeWidth={1.6} />
      <Label x={W / 2} y={146} size={22} mono weight={700} color="var(--ink)">
        {`${r.gpuHours < 100 ? r.gpuHours.toFixed(1) : commas(r.gpuHours)} GPU-hours`}
      </Label>
      <Label x={W / 2} y={180} size={14} mono color="var(--ink)">
        {`on ${commas(G)} GPU${G > 1 ? "s" : ""}: ${duration(r.wallHours)}`}
      </Label>

      <Label x={W / 2} y={262} size={14} weight={700} color="var(--ink)">
        Training tokens per parameter
      </Label>
      <Label x={W / 2} y={282} size={12}>
        {`yours: ${r.ratio < 100 ? r.ratio.toFixed(1) : commas(r.ratio)}  ·  Chinchilla rule of thumb: about 20`}
      </Label>
      <rect x={lx(15)} y={ax.y - 16} width={lx(30) - lx(15)} height={32} rx={6} fill="var(--ok-soft)" stroke="var(--ok)" />
      <line x1={ax.x0} x2={ax.x1} y1={ax.y} y2={ax.y} stroke="var(--ink-3)" strokeWidth={1.4} />
      {[1, 10, 100, 1000, 10000].map((t) => (
        <g key={t}>
          <line x1={lx(t)} x2={lx(t)} y1={ax.y - 5} y2={ax.y + 5} stroke="var(--ink-3)" />
          <Label x={lx(t)} y={ax.y + 46} size={11} mono color="var(--ink-3)">
            {commas(t)}
          </Label>
        </g>
      ))}
      {marks.map((m) => (
        <g key={m.label}>
          <circle cx={lx(m.ratio)} cy={ax.y} r={4} fill="var(--ink-2)" />
          <Label x={lx(m.ratio)} y={m.up ? ax.y - 24 : ax.y + 28} size={11.5} color="var(--ink-2)">
            {m.label}
          </Label>
        </g>
      ))}
      <motion.g initial={false} animate={{ x: lx(r.ratio) }} transition={{ duration: 0.3, ease: EASE }}>
        <path d={`M 0 ${ax.y - 4} l -8 -16 h 16 z`} fill="var(--mark)" stroke="var(--ink)" strokeWidth={1.2} />
      </motion.g>
      <Label x={W / 2} y={460} size={12.5} color="var(--ink)" weight={600}>
        {verdict}
      </Label>
      <Label x={W / 2} y={486} size={12}>
        Chinchilla-optimal: for a fixed compute budget, grow N and D together, D ≈ 20N.
      </Label>
      <Label x={W / 2} y={506} size={12}>
        {`For ${short(N)} parameters that is ${short(r.chinchilla)} tokens.`}
      </Label>
    </Svg>
  );

  const controls = (
    <div className="grid gap-2.5">
      <div>
        <div className="mb-1.5 text-[13px] font-semibold text-ink">Real runs</div>
        <div className="flex flex-wrap gap-1.5">
          {RUNS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setLogN(Math.log10(p.N));
                setLogD(Math.log10(p.D));
              }}
              className="rounded-lg border border-rule-strong bg-card px-2 py-1 text-[12px] font-semibold text-ink-2 transition-colors hover:border-ink hover:text-ink"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <Slider label="Parameters (N)" value={logN} min={7} max={12} step={0.01} onChange={setLogN} format={() => short(N)} />
      <Slider label="Training tokens (D)" value={logD} min={8} max={13.3} step={0.01} onChange={setLogD} format={() => short(D)} />
      <Slider label="GPUs" value={gpus} min={0} max={14} step={1} onChange={setGpus} format={() => commas(G)} />
      <Slider label="Utilization (MFU)" value={mfu} min={0.1} max={0.7} step={0.01} onChange={setMfu} format={(v) => `${Math.round(v * 100)}%`} />
      <div className="grid gap-1.5">
        <span className="text-[13px] font-semibold text-ink">GPU, bf16 peak</span>
        <Segmented
          label="GPU"
          value={gpu}
          onChange={setGpu}
          options={[
            { value: "a100", label: "A100 312T" },
            { value: "h100", label: "H100 989T" },
          ]}
        />
      </div>
      <div>
        <Readout label="Compute" value={`${sci(r.flops, 2)} FLOPs`} />
        <Readout label="Chinchilla tokens for this N" value={short(r.chinchilla)} sub="20 × N" />
      </div>
    </div>
  );
  return <TryLayout svg={svg} controls={controls} />;
}

/* ---------------------------------------------------------------- */
/* Step 11: the whole loop                                            */
/* ---------------------------------------------------------------- */

function LoopScene({ playing }: { playing: boolean }) {
  const inner = [
    { t: "next micro-batch", s: "x, y: (64, 1024)" },
    { t: "forward in bf16", s: "autocast" },
    { t: "loss / 8", s: "grad_accum = 8" },
    { t: "backward", s: ".grad += ..." },
  ];
  const outer = [
    { t: "clip to 1.0", s: "global norm" },
    { t: "set lr", s: "warmup, cosine" },
    { t: "AdamW step", s: "β = (0.9, 0.95)" },
    { t: "zero_grad", s: "next step" },
  ];
  const xs = [150, 370, 590, 810];
  const run = napkin(124e6, 10e9, 8, 312e12, 0.4);
  const Y1 = 150;
  const Y2 = 330;
  return (
    <Svg label="The training loop: eight micro-batches of forward, scaled loss and backward, then clipping, the learning rate, the AdamW step and zero_grad">
      <Label x={60} y={92} anchor="start" size={14} weight={700} color="var(--ink)">
        8 times per step
      </Label>
      {inner.map((b, i) => (
        <g key={b.t}>
          <Box x={xs[i]} y={Y1} w={180} h={58} title={b.t} sub={b.s} tone="accent" />
          {i < 3 && <Arrow x1={xs[i] + 94} y1={Y1} x2={xs[i + 1] - 96} y2={Y1} delay={0.1 * i} />}
        </g>
      ))}
      <path d={`M ${xs[3]} ${Y1 - 33} C ${xs[3]} 76, ${xs[0]} 76, ${xs[0]} ${Y1 - 33}`} fill="none" stroke="var(--accent)" strokeWidth={1.6} strokeDasharray="5 4" markerEnd="url(#arrow-accent)" />
      <Pill x={480} y={84} text="repeat for 8 micro-batches" tone="accent" mono={false} />

      <Arrow x1={xs[3]} y1={Y1 + 33} x2={xs[3]} y2={Y2 - 35} tone="ink" />
      <Label x={60} y={Y2 - 52} anchor="start" size={14} weight={700} color="var(--ink)">
        once per step
      </Label>
      {[...outer].reverse().map((b, i) => (
        <g key={b.t}>
          <Box x={xs[i]} y={Y2} w={180} h={58} title={outer[3 - i].t} sub={outer[3 - i].s} tone="violet" />
          {i < 3 && <Arrow x1={xs[i + 1] - 94} y1={Y2} x2={xs[i] + 96} y2={Y2} delay={0.1 * i} />}
        </g>
      ))}
      <path d={`M ${xs[0] - 92} ${Y2} C 20 ${Y2}, 20 ${Y1}, ${xs[0] - 94} ${Y1}`} fill="none" stroke="var(--violet)" strokeWidth={1.6} markerEnd="url(#arrow-violet)" />

      <PolyPacket points={[[xs[0], Y1], [xs[3], Y1]]} tone="mark" playing={playing} duration={1.6} r={6} />

      <Appear delay={0.6}>
        <rect x={110} y={414} width={740} height={92} rx={14} fill="var(--mark-soft)" stroke="var(--mark)" />
        <Label x={480} y={444} size={14} weight={650} color="var(--ink)">
          524,288 tokens per update · lr peak 6e-4 after 715 warmup steps · 19,073 steps = 10B tokens
        </Label>
        <Label x={480} y={470} size={13} mono color="var(--ink)">
          {`6ND = ${sci(run.flops, 2)} FLOPs ≈ ${run.gpuHours.toFixed(1)} A100-hours at 40% · Chinchilla: about 20 tokens per parameter`}
        </Label>
        <Label x={480} y={494} size={12}>
          bf16 trades a little precision for speed; flash attention and torch.compile compute the same math with less data movement.
        </Label>
      </Appear>
    </Svg>
  );
}
