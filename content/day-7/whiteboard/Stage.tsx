"use client";

import { motion } from "motion/react";
import { Appear, Arrow, EASE, Label, Svg } from "@/components/viz/svg";
import { useProgress } from "@/lib/progress";
import type { StageProps } from "@/lib/types";
import { Drill } from "./Drill";
import { FitCanvas } from "./FitCanvas";
import { FlipRound } from "./FlipRound";
import { LOOP_ICON, STATION_ICON } from "./icons";
import { OrderRound, type OrderCard } from "./OrderRound";
import { Recap } from "./Recap";
import { roundStatus } from "./RoundHeader";
import { ShapesRound } from "./ShapesRound";
import { STATIONS, TICK } from "./state";

/* ------------------------------------------------------------------ */
/* Step 1: the blank whiteboard. It fills in as rounds are solved.     */
/* ------------------------------------------------------------------ */

const FWD_X = [84, 216, 348, 480, 612, 744, 876];
const TRAIN = [
  { id: "loss", x: 744 },
  { id: "backprop", x: 480 },
  { id: "update", x: 216 },
];

function Slot({ x, y, label, known, delay }: { x: number; y: number; label: string; known: boolean; delay: number }) {
  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, delay, ease: EASE }}
      style={{ transformOrigin: `${x}px ${y}px`, transformBox: "view-box" }}
    >
      <rect
        x={x - 54}
        y={y - 28}
        width={108}
        height={56}
        rx={12}
        fill={known ? "var(--ok-soft)" : "var(--card)"}
        stroke={known ? "var(--ok)" : "var(--ink-3)"}
        strokeWidth={1.6}
        strokeDasharray={known ? undefined : "6 5"}
      />
      <text x={x} y={y + (known ? 5 : 9)} textAnchor="middle" fontSize={known ? 14.5 : 26} fontWeight={700} fill={known ? "var(--ink)" : "var(--ink-3)"}>
        {known ? label : "?"}
      </text>
    </motion.g>
  );
}

function Intro() {
  const p = useProgress();
  const fwdKnown = !!p.ticks[TICK.forward];
  const trainKnown = !!p.ticks[TICK.train];
  const status = roundStatus(p);
  const label = (id: string) => STATIONS.find((s) => s.id === id)?.label ?? id;
  const rounds = [
    ["Forward pass", "put it in order"],
    ["Training step", "put it in order"],
    ["Shapes", "label every arrow"],
    ["Explain", "say each box aloud"],
    ["Drill", "interview questions"],
  ];
  return (
    <Svg label="The whiteboard test: fill in the whole path from memory">
      <Label x={40} y={84} anchor="start" size={13} weight={650} color="var(--ink-2)">
        Forward pass
      </Label>
      <path d="M 426 104 q 0 -10 10 -10 L 656 94 q 10 0 10 10" fill="none" stroke="var(--ink-3)" strokeWidth={1.4} />
      <Label x={546} y={86} size={12} mono color="var(--ink-2)">
        x n_layer
      </Label>
      {FWD_X.map((x, i) => (
        <g key={x}>
          <Slot x={x} y={146} label={label(STATIONS[i].id)} known={fwdKnown} delay={0.1 + i * 0.08} />
          {i < FWD_X.length - 1 && <Arrow x1={x + 56} y1={146} x2={FWD_X[i + 1] - 58} y2={146} delay={0.3 + i * 0.08} duration={0.3} />}
        </g>
      ))}
      <Arrow x1={744} y1={176} x2={744} y2={262} delay={1} duration={0.4} label="vs targets y" />
      {TRAIN.map((t, i) => (
        <g key={t.id}>
          <Slot x={t.x} y={292} label={label(t.id)} known={trainKnown} delay={1.1 + i * 0.12} />
          {i < TRAIN.length - 1 && <Arrow x1={t.x - 56} y1={292} x2={TRAIN[i + 1].x + 58} y2={292} delay={1.3 + i * 0.12} duration={0.4} />}
        </g>
      ))}
      <Arrow x1={232} y1={262} x2={330} y2={180} bend={-18} tone="mark" dashed delay={1.7} duration={0.6} />
      <Appear delay={1.9}>
        <Label x={302} y={244} anchor="start" size={12.5} weight={600} color="var(--ink-2)">
          updated weights, used on the next pass
        </Label>
      </Appear>
      <Label x={880} y={336} anchor="end" size={13} weight={650} color="var(--ink-2)">
        Training loop
      </Label>

      {rounds.map(([title, sub], i) => {
        const x0 = 40 + i * 180;
        const done = status[i].done;
        return (
          <Appear key={title} delay={2 + i * 0.1}>
            <rect
              x={x0}
              y={384}
              width={164}
              height={118}
              rx={14}
              fill={done ? "var(--ok-soft)" : "var(--card)"}
              stroke={done ? "var(--ok)" : "var(--ink)"}
              strokeWidth={1.4}
            />
            <circle cx={x0 + 28} cy={414} r={13} fill={done ? "var(--ok)" : "var(--mark)"} stroke="var(--ink)" strokeWidth={1.2} />
            <text x={x0 + 28} y={419} textAnchor="middle" fontSize={13} fontWeight={700} className="mono" fill={done ? "var(--card)" : "var(--ink)"}>
              {done ? "✓" : i + 1}
            </text>
            <Label x={x0 + 16} y={452} anchor="start" size={15} weight={700} color="var(--ink)">
              {title}
            </Label>
            <Label x={x0 + 16} y={470} anchor="start" size={12} color="var(--ink-2)">
              {sub}
            </Label>
            <Label x={x0 + 16} y={490} anchor="start" size={11.5} mono color={done ? "var(--ink)" : "var(--ink-3)"}>
              {status[i].note}
            </Label>
          </Appear>
        );
      })}
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* Round cards.                                                        */
/* ------------------------------------------------------------------ */

const FORWARD_HINT: Record<string, string> = {
  text: "Everything starts from the raw text.",
  tokens: "The tokenizer runs first, straight on the text.",
  embed: "Embeddings look up a vector per token id, so they need the tokens.",
  attention: "Attention mixes vectors across positions, so it needs the embeddings.",
  mlp: "In a block, attention (tokens talk) comes before the MLP (each token thinks).",
  logits: "Logits come out of the last block, through the LM head.",
  sample: "You can only sample once you have logits to turn into probabilities.",
};

const FORWARD_CARDS: OrderCard[] = STATIONS.filter((s) => s.phase === "forward").map((s) => ({
  id: s.id,
  label: s.label,
  icon: STATION_ICON[s.id],
  reveal: s.out,
  hint: FORWARD_HINT[s.id],
}));

const LOOP_CARDS: OrderCard[] = [
  { id: "batch", label: "Get a batch", icon: LOOP_ICON.batch, hint: "Each step starts with a batch of inputs x and targets y." },
  { id: "forward", label: "Forward pass", icon: LOOP_ICON.forward, hint: "The forward pass runs the model on the batch to get logits." },
  { id: "loss", label: "Loss", icon: LOOP_ICON.loss, hint: "The loss compares the logits with y, so the forward pass comes first." },
  {
    id: "zero",
    label: "Zero grads",
    icon: LOOP_ICON.zero,
    hint: "zero_grad can go anywhere except between backward() and step(), where it would erase the fresh gradients.",
  },
  { id: "backward", label: "Backward", icon: LOOP_ICON.backward, hint: "backward() starts from the loss, so the loss must exist first." },
  { id: "step", label: "Optimizer step", icon: LOOP_ICON.step, hint: "step() uses the gradients backward() just computed." },
];

const FORWARD_ORDER = FORWARD_CARDS.map((c) => c.id);
const gradeForward = (order: string[]) => order.map((id, i) => id === FORWARD_ORDER[i]);

const LOOP_REST = ["batch", "forward", "loss", "backward", "step"];
function gradeLoop(order: string[]) {
  const rest = order.filter((id) => id !== "zero");
  const restOk = new Map(rest.map((id, j) => [id, id === LOOP_REST[j]]));
  const zi = order.indexOf("zero");
  const zeroOk = !(order.indexOf("backward") < zi && zi < order.indexOf("step"));
  return order.map((id) => (id === "zero" ? zeroOk : !!restOk.get(id)));
}

const FORWARD_CODE = `x = wte(idx) + wpe(torch.arange(T))     # (B, T, C)
for block in blocks:                     # n_layer times
    x = x + block.attn(block.ln_1(x))    # tokens talk
    x = x + block.mlp(block.ln_2(x))     # each token thinks
logits = lm_head(ln_f(x))                # (B, T, vocab_size)
probs = F.softmax(logits[:, -1, :] / temperature, dim=-1)
idx_next = torch.multinomial(probs, num_samples=1)`;

const LOOP_CODE = `for step in range(max_steps):
    xb, yb = get_batch("train")
    logits, loss = model(xb, yb)      # forward pass + cross-entropy
    optimizer.zero_grad(set_to_none=True)
    loss.backward()                   # gradients for every weight
    optimizer.step()                  # nudge every weight`;

export function Stage({ step, goTo }: StageProps) {
  if (step === 0) return <Intro />;
  return (
    <FitCanvas>
      {step === 1 && (
        <OrderRound
          memoryKey="forward"
          tick={TICK.forward}
          round={1}
          title="Put the forward pass in order"
          instructions="From a prompt to the next token. Click the cards in the order the data flows; click a placed card to send it back."
          cards={FORWARD_CARDS}
          grade={gradeForward}
          success="Right. Attention and the MLP repeat n_layer times (12 in GPT-2 small), then the LM head makes logits."
          solvedExtra={
            <pre className="rounded-xl border border-rule bg-paper-2 px-3 py-2 font-mono text-[11.5px] leading-[1.5] text-ink">{FORWARD_CODE}</pre>
          }
          goTo={goTo}
          salt={1}
        />
      )}
      {step === 2 && (
        <OrderRound
          memoryKey="train"
          tick={TICK.train}
          round={2}
          title="Put one training step in order"
          instructions="One step of the loop that trains every weight. Several orders are fine for one card; the rest is strict."
          cards={LOOP_CARDS}
          grade={gradeLoop}
          loopLabel="repeat with the next batch"
          success="Right. zero_grad can sit anywhere except between backward() and step(); this is nanoGPT's order."
          solvedExtra={
            <pre className="rounded-xl border border-rule bg-paper-2 px-3 py-2 font-mono text-[11.5px] leading-[1.5] text-ink">{LOOP_CODE}</pre>
          }
          goTo={goTo}
          salt={2}
        />
      )}
      {step === 3 && <ShapesRound goTo={goTo} />}
      {step === 4 && <FlipRound goTo={goTo} />}
      {step === 5 && <Drill goTo={goTo} />}
      {step === 6 && <Recap goTo={goTo} />}
    </FitCanvas>
  );
}
