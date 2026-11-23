"use client";

import { Appear, Arrow, Box, Chip, Label, Pill, Svg } from "@/components/viz/svg";
import { tokenTint } from "@/lib/color";
import type { StageProps } from "@/lib/types";
import { useTrainer } from "@/lib/engine/useTrainer";
import { AttentionScene } from "./AttentionScene";
import { OverfitScene, TrainScene } from "./TrainScene";
import { BATCH, BIGRAM, CONFIG, PARAMS, RECORDED, TEXT_CHARS, TRAIN_CHARS, TRAIN_DEFAULTS, TRAIN_LAB, UNIGRAM, VAL_CHARS, VOCAB, fmtInt } from "./run";

export function Stage({ step, playing }: StageProps) {
  // Every scene keeps the shared trainer subscribed, so the worker loads early and keeps training across steps.
  const [snap] = useTrainer(TRAIN_LAB, { defaults: TRAIN_DEFAULTS, playing });
  switch (step) {
    case 0:
      return <ModelScene />;
    case 1:
      return <DataScene />;
    case 2:
      return <UniformScene />;
    case 3:
      return <TrainScene mode="start" playing={playing} />;
    case 4:
      return <TrainScene mode="drop" playing={playing} />;
    case 5:
      return <TrainScene mode="slow" playing={playing} />;
    case 6:
      return <TrainScene mode="hideval" playing={playing} />;
    case 7:
      return <TrainScene mode="gap" playing={playing} />;
    case 8:
      return <OverfitScene playing={playing} />;
    case 9:
      return <AttentionScene playing={playing} />;
    default:
      return <RecapScene step={snap.step} loss={lastLoss(snap.evals)} />;
  }
}

function lastLoss(evals: { step: number; val: number }[]) {
  return evals.length ? evals[evals.length - 1] : null;
}

/* ------------------------------------------------------------------ */

const pct = (n: number) => `${((n / PARAMS.total) * 100).toFixed(0)}%`;

function ModelScene() {
  const xs = [100, 262, 420, 572, 724, 872];
  const y = 176;
  const boxes = [
    { title: "input", sub: "(B, T) ids", tone: "muted" as const, w: 120 },
    { title: "embeddings", sub: "tok + pos", tone: "mark" as const, w: 150 },
    { title: "block 1", sub: fmtInt(PARAMS.perLayer), tone: "accent" as const, w: 132 },
    { title: "block 2", sub: fmtInt(PARAMS.perLayer), tone: "accent" as const, w: 132 },
    { title: "LN + head", sub: "48 to 65", tone: "violet" as const, w: 136 },
    { title: "loss", sub: "cross-entropy", tone: "ink" as const, w: 112 },
  ];

  const L = 60;
  const W = 840;
  const segs = [
    { label: "token emb", n: PARAMS.tokenEmbedding, fill: "var(--mark-soft)", stroke: "var(--mark)" },
    { label: "pos emb", n: PARAMS.positionEmbedding, fill: "var(--mark-soft)", stroke: "var(--mark)" },
    ...[1, 2].flatMap((b) => [
      { label: `attention ${b}`, n: PARAMS.attentionPerLayer, fill: "var(--q-soft)", stroke: "var(--q)" },
      { label: `MLP ${b}`, n: PARAMS.mlpPerLayer, fill: "var(--accent-soft)", stroke: "var(--accent)" },
      { label: `LN ${b}`, n: PARAMS.layerNormPerLayer, fill: "var(--card-2)", stroke: "var(--rule-strong)" },
    ]),
    { label: "head", n: PARAMS.head, fill: "var(--violet-soft)", stroke: "var(--violet)" },
  ];
  let acc = L;
  const placed = segs.map((s) => {
    const w = (s.n / PARAMS.total) * W;
    const out = { ...s, x: acc, w };
    acc += w;
    return out;
  });
  const labelled = placed.filter((s) => !s.label.startsWith("LN"));

  return (
    <Svg label="The model that is about to train, with its parameter counts">
      <Label x={480} y={56} size={21} weight={700} color="var(--ink)">
        {`A character-level GPT with ${fmtInt(PARAMS.total)} parameters`}
      </Label>
      <Label x={480} y={82} size={13} mono>
        {`n_embd ${CONFIG.nEmbd} · n_head ${CONFIG.nHead} · n_layer ${CONFIG.nLayer} · block_size ${CONFIG.blockSize} · vocab_size ${VOCAB}`}
      </Label>

      {boxes.map((b, i) => (
        <Appear key={b.title} delay={0.1 + i * 0.12}>
          <Box x={xs[i]} y={y} w={b.w} h={62} title={b.title} sub={b.sub} tone={b.tone} />
        </Appear>
      ))}
      {xs.slice(0, -1).map((x, i) => (
        <Arrow key={i} x1={x + boxes[i].w / 2 + 6} y1={y} x2={xs[i + 1] - boxes[i + 1].w / 2 - 8} y2={y} delay={0.25 + i * 0.12} duration={0.3} />
      ))}
      <Appear delay={0.9}>
        <Label x={262} y={236} size={12} mono>
          {`65 x 48 + 32 x 48`}
        </Label>
        <Label x={496} y={236} size={12} mono>
          {`each: LN, 4-head attention, LN, MLP`}
        </Label>
      </Appear>

      <Appear delay={1.1}>
        <Label x={L} y={300} size={14} weight={650} color="var(--ink)" anchor="start">
          Where the weights live
        </Label>
        {placed.map((s) => (
          <rect key={s.label} x={s.x} y={318} width={Math.max(1.5, s.w)} height={40} fill={s.fill} stroke={s.stroke} strokeWidth={1.2} />
        ))}
        {labelled
          .filter((s) => s.w > 90)
          .map((s) => (
            <g key={s.label}>
              <text x={s.x + s.w / 2} y={335} textAnchor="middle" fontSize={13} fontWeight={650}>
                {s.label}
              </text>
              <text x={s.x + s.w / 2} y={351} textAnchor="middle" fontSize={11.5} className="mono" fill="var(--ink-2)">
                {fmtInt(s.n)}
              </text>
            </g>
          ))}
        <line x1={L + 2} x2={L + 2} y1={360} y2={372} stroke="var(--ink-3)" />
        <text x={L} y={386} fontSize={11.5} className="mono" fill="var(--ink-2)">
          {`embeddings: tok ${fmtInt(PARAMS.tokenEmbedding)} + pos ${fmtInt(PARAMS.positionEmbedding)}`}
        </text>
        <line x1={L + W - 2} x2={L + W - 2} y1={360} y2={372} stroke="var(--ink-3)" />
        <text x={L + W} y={386} textAnchor="end" fontSize={11.5} className="mono" fill="var(--ink-2)">
          {`final LN + head ${fmtInt(PARAMS.head)}`}
        </text>
      </Appear>

      <Appear delay={1.4}>
        <Pill x={210} y={438} text={`MLPs: ${pct(2 * PARAMS.mlpPerLayer)} of the weights`} tone="accent" fontSize={13} />
        <Pill x={480} y={438} text={`attention: ${pct(2 * PARAMS.attentionPerLayer)}`} tone="q" fontSize={13} />
        <Pill x={740} y={438} text={`embeddings + head: ${pct(PARAMS.tokenEmbedding + PARAMS.positionEmbedding + PARAMS.head)}`} tone="violet" fontSize={13} />
        <Label x={480} y={490} size={13}>
          {`Each step reads a batch of ${BATCH} x ${CONFIG.blockSize} characters and takes one AdamW step at lr 3e-3.`}
        </Label>
      </Appear>
    </Svg>
  );
}

/* ------------------------------------------------------------------ */

const show = (c: string) => (c === "\n" ? "↵" : c);

function DataScene() {
  const xText = "hear me speak";
  const yText = "ear me speak.";
  const gap = 37;
  const x0 = 120;
  const focus = 4;
  const L = 60;
  const W = 840;
  const trainW = (TRAIN_CHARS / TEXT_CHARS) * W;
  const rows = 16;
  const cols = 32;
  const cell = 8;
  const gx = 640;
  const gy = 205;
  return (
    <Svg label="How a batch is cut from the text">
      <Label x={L} y={50} size={14} weight={650} color="var(--ink)" anchor="start">
        {`tinyshakespeare.txt: ${fmtInt(TEXT_CHARS)} characters, ${VOCAB} distinct`}
      </Label>
      <Appear delay={0.1}>
        <rect x={L} y={64} width={trainW} height={34} rx={6} fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth={1.2} />
        <rect x={L + trainW + 3} y={64} width={W - trainW - 3} height={34} rx={6} fill="var(--mark-soft)" stroke="var(--mark)" strokeWidth={1.2} />
        <Label x={L + trainW / 2} y={86} size={13} color="var(--ink)">
          {`train: first 90%, ${fmtInt(TRAIN_CHARS)} chars`}
        </Label>
        <Label x={L + trainW + (W - trainW) / 2 + 1} y={86} size={12} color="var(--ink)">
          {`val ${fmtInt(VAL_CHARS)}`}
        </Label>
      </Appear>

      <Label x={L} y={160} size={14} weight={650} color="var(--ink)" anchor="start">
        One window (drawn with T = 13; the lab uses T = 32)
      </Label>
      <Label x={x0 - 30} y={232} size={13} anchor="end" mono>
        x
      </Label>
      <Label x={x0 - 30} y={322} size={13} anchor="end" mono>
        y
      </Label>
      {[...xText].map((c, i) => (
        <Chip key={`x${i}`} x={x0 + i * gap} y={228} text={show(c)} index={i} delay={0.2 + i * 0.03} highlight={i === focus} />
      ))}
      {[...yText].map((c, i) => (
        <Chip key={`y${i}`} x={x0 + i * gap} y={318} text={show(c)} index={i + 1} delay={0.7 + i * 0.03} highlight={i === focus} />
      ))}
      {[...xText].map((_, i) => (
        <Arrow key={`a${i}`} x1={x0 + i * gap} y1={250} x2={x0 + i * gap} y2={294} tone={i === focus ? "mark" : "muted"} width={i === focus ? 2.2 : 1.2} delay={1.1 + i * 0.03} duration={0.3} />
      ))}
      <Appear delay={1.6}>
        <Label x={x0 - 18} y={380} size={13} anchor="start">
          {`At position ${focus}, the model sees "hear " and must predict "m".`}
        </Label>
        <Label x={x0 - 18} y={402} size={13} anchor="start">
          Every position is its own example, so one window holds T predictions.
        </Label>
      </Appear>

      <Label x={gx + (cols * (cell + 1)) / 2} y={160} size={14} weight={650} color="var(--ink)">
        One batch: x is (16, 32)
      </Label>
      <Label x={gx + (cols * (cell + 1)) / 2} y={190} size={12} mono>
        T = 32
      </Label>
      <Label x={gx - 10} y={gy + (rows * (cell + 1)) / 2 + 4} size={12} anchor="end" mono>
        B = 16
      </Label>
      <Appear delay={0.4}>
        {Array.from({ length: rows * cols }, (_, k) => {
          const r = Math.floor(k / cols);
          const c = k % cols;
          const tint = tokenTint((r * 7 + c * 3) % 8);
          return <rect key={k} x={gx + c * (cell + 1)} y={gy + r * (cell + 1)} width={cell} height={cell} rx={1.5} fill={tint.fill} stroke={tint.stroke} strokeWidth={0.5} />;
        })}
      </Appear>
      <Appear delay={1.2}>
        <Label x={gx + (cols * (cell + 1)) / 2} y={384} size={13}>
          16 random windows, stacked
        </Label>
        <Label x={gx + (cols * (cell + 1)) / 2} y={404} size={13}>
          y is the same grid shifted by one
        </Label>
      </Appear>

      <Appear delay={1.9}>
        <Pill x={480} y={462} text="every step scores 16 x 32 = 512 next-character guesses" tone="mark" fontSize={13.5} />
      </Appear>
    </Svg>
  );
}

/* ------------------------------------------------------------------ */

const VOCAB_CHARS = "\n !$&',-.3:;?ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function UniformScene() {
  const L = 70;
  const step = 12.5;
  const base = 340;
  const h = 200;
  return (
    <Svg label="An untrained model spreads probability evenly over 65 characters">
      <Label x={480} y={60} size={19} weight={700} color="var(--ink)">
        Before the first step, every character looks equally likely
      </Label>
      <Label x={480} y={86} size={13}>
        weights start near zero (normal, std 0.02), so all 65 logits are close to 0
      </Label>
      <Appear delay={0.1}>
        {[...VOCAB_CHARS].map((c, i) => (
          <g key={i}>
            <rect x={L + i * step} y={base - h} width={step - 3} height={h} rx={2} fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth={0.8} />
            <text x={L + i * step + (step - 3) / 2} y={base + 16} textAnchor="middle" fontSize={11} className="mono" fill="var(--ink-3)">
              {c === "\n" ? "↵" : c === " " ? "·" : c}
            </text>
          </g>
        ))}
        <line x1={L - 8} x2={L + 65 * step} y1={base} y2={base} stroke="var(--ink-3)" />
        <Label x={L - 14} y={base - h + 4} size={12} anchor="end" mono>
          1/65
        </Label>
      </Appear>
      <Appear delay={0.6}>
        <Pill x={480} y={410} text="p(any next char) = 1/65 = 0.0154" tone="accent" fontSize={15} />
      </Appear>
      <Appear delay={1}>
        <Pill x={480} y={458} text="loss = -ln p(correct next char) = ?" tone="mark" fontSize={17} strong />
      </Appear>
    </Svg>
  );
}

/* ------------------------------------------------------------------ */

function RecapScene({ step, loss }: { step: number; loss: { step: number; val: number } | null }) {
  const names = ["get_batch", "forward", "loss", "zero_grad", "backward", "step"];
  const subs = ["(B, T) x and y", "logits (B, T, 65)", "cross-entropy", "clear old grads", "dL/dw for all w", "AdamW update"];
  const cx = 480;
  const cy = 190;
  const rx = 330;
  const ry = 105;
  const pos = names.map((_, i) => {
    const a = -Math.PI + (i / names.length) * 2 * Math.PI;
    return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
  });
  const recordedEnd = RECORDED.evals[RECORDED.evals.length - 1];
  const yours = loss && step > 0 ? `${fmtInt(step)} steps, val ${loss.val.toFixed(2)}` : "not started yet";
  return (
    <Svg label="Recap: the training loop and the numbers to remember">
      <Label x={cx} y={cy - 6} size={16} weight={700} color="var(--ink)">
        one training step
      </Label>
      <Label x={cx} y={cy + 16} size={12.5}>
        repeat a few thousand times
      </Label>
      {pos.map((p, i) => {
        const q = pos[(i + 1) % pos.length];
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        // Leave each box through its edge (half sizes plus a small margin).
        const t = Math.min(84 / Math.abs(dx || 1e-9), 36 / Math.abs(dy || 1e-9));
        return (
          <Arrow
            key={`a${i}`}
            x1={p.x + dx * t}
            y1={p.y + dy * t}
            x2={q.x - dx * t}
            y2={q.y - dy * t}
            tone="muted"
            width={2}
            bend={-10}
            delay={0.2 + i * 0.1}
            duration={0.35}
          />
        );
      })}
      {pos.map((p, i) => (
        <Appear key={names[i]} delay={0.1 + i * 0.1}>
          <Box x={p.x} y={p.y} w={150} h={54} title={names[i]} sub={subs[i]} tone={i === 2 ? "mark" : i === 4 ? "accent" : "ink"} />
        </Appear>
      ))}
      <Appear delay={0.9}>
        <Label x={480} y={388} size={14} weight={650} color="var(--ink)">
          Numbers worth remembering for this model
        </Label>
        <Pill x={150} y={428} text="step 0: 4.17 = ln 65" tone="mark" fontSize={13} />
        <Pill x={352} y={428} text={`frequencies: ${UNIGRAM}`} fontSize={13} />
        <Pill x={540} y={428} text={`pairs: ${BIGRAM}`} fontSize={13} />
        <Pill x={772} y={428} text={`recorded: val ${recordedEnd.val.toFixed(2)} at ${fmtInt(recordedEnd.step)}`} tone="mark" fontSize={13} />
        <Pill x={480} y={478} text={`your run: ${yours}`} tone="accent" fontSize={13} />
      </Appear>
    </Svg>
  );
}
