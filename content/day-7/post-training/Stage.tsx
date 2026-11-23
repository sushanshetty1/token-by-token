"use client";

import { motion } from "motion/react";
import { useState, type KeyboardEvent } from "react";
import { Appear, Arrow, Box, EASE, Label, Pill, Svg, type Tone } from "@/components/viz/svg";
import type { StageProps } from "@/lib/types";
import { AE, AS, BOS, FlowText, OE, OS, PE, PS, TokenChip, UE, US, layoutRow, type Piece, type Tok } from "./tokens";

/* ------------------------------------------------------------------ */
/* The pipeline strip that stays on top of every step.                 */
/* ------------------------------------------------------------------ */

const PIPE = [
  { id: "pre", title: "Pretrain", sub: "base_train", x: 120 },
  { id: "mid", title: "Midtrain", sub: "mid_train", x: 300 },
  { id: "sft", title: "SFT", sub: "chat_sft", x: 480 },
  { id: "rl", title: "RL", sub: "chat_rl", x: 660 },
  { id: "chat", title: "Chat", sub: "chat_web", x: 840 },
];

const ACTIVE: (string[] | "all")[] = [
  ["pre"],
  ["pre"],
  ["mid"],
  ["mid", "sft"],
  ["sft"],
  ["rl"],
  ["rl"],
  ["rl"],
  "all",
  ["chat"],
  "all",
];

function Pipeline({ step }: { step: number }) {
  const act = ACTIVE[step] ?? "all";
  return (
    <g>
      {PIPE.slice(0, -1).map((p, i) => (
        <line
          key={p.id}
          x1={p.x + 74}
          y1={54}
          x2={PIPE[i + 1].x - 78}
          y2={54}
          stroke="var(--ink-3)"
          strokeWidth={1.6}
          markerEnd="url(#arrow-muted)"
        />
      ))}
      {PIPE.map((p) => {
        const on = act === "all" || act.includes(p.id);
        return (
          <Box
            key={p.id}
            x={p.x}
            y={54}
            w={146}
            h={50}
            title={p.title}
            sub={p.sub}
            tone={on && act !== "all" ? "mark" : "ink"}
            active={on && act !== "all"}
            dim={!on}
          />
        );
      })}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Step 1: a base model completes documents.                           */
/* ------------------------------------------------------------------ */

function Completer() {
  const lines = [
    "What is the capital of Germany?",
    "What is the capital of Italy?",
    "What is the capital of Spain?",
    "Answers are at the end of the page.",
  ];
  return (
    <g>
      <Appear>
        <rect x={40} y={112} width={390} height={80} rx={14} fill="var(--card)" stroke="var(--ink)" strokeWidth={1.6} />
        <Label x={60} y={138} anchor="start" size={12.5} color="var(--ink-3)">
          You type
        </Label>
        <Label x={60} y={170} anchor="start" size={16} mono weight={600} color="var(--ink)">
          What is the capital of France?
        </Label>
      </Appear>
      <Arrow x1={235} y1={198} x2={235} y2={240} delay={0.3} />
      <Appear delay={0.45}>
        <Box x={235} y={278} w={230} h={64} title="Base model" sub="pretrained, nothing else" />
      </Appear>
      <Arrow x1={352} y1={270} x2={494} y2={236} delay={0.9} />

      <Appear delay={0.7}>
        <rect x={500} y={112} width={420} height={262} rx={14} fill="var(--card)" stroke="var(--ink)" strokeWidth={1.6} />
        <path d="M 501 146 L 919 146" stroke="var(--rule)" />
        <circle cx={522} cy={129} r={4.5} fill="var(--rule-strong)" />
        <circle cx={538} cy={129} r={4.5} fill="var(--rule-strong)" />
        <circle cx={554} cy={129} r={4.5} fill="var(--rule-strong)" />
        <Label x={574} y={133} anchor="start" size={12} mono color="var(--ink-3)">
          geography-quiz.html
        </Label>
        <Label x={522} y={178} anchor="start" size={14} mono color="var(--ink)">
          What is the capital of France?
        </Label>
      </Appear>
      {lines.map((l, i) => (
        <motion.g
          key={l}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 1.5 + i * 0.6, ease: EASE }}
        >
          <rect x={512} y={194 + i * 40} width={396} height={30} rx={6} fill="var(--mark-soft)" />
          <Label x={522} y={214 + i * 40} anchor="start" size={14} mono color="var(--ink)">
            {l}
          </Label>
        </motion.g>
      ))}
      <Appear delay={1.4}>
        <rect x={500} y={388} width={12} height={12} rx={3} fill="var(--mark-soft)" stroke="var(--mark)" />
        <Label x={520} y={399} anchor="start" size={12.5} color="var(--ink-2)">
          written by the base model, one token at a time
        </Label>
      </Appear>

      <Appear delay={1.1}>
        <rect x={40} y={340} width={390} height={148} rx={14} fill="var(--card-2)" stroke="var(--rule-strong)" />
        <Label x={60} y={372} anchor="start" size={13} color="var(--ink-3)">
          Its only training goal
        </Label>
        <Label x={60} y={398} anchor="start" size={15} weight={650} color="var(--ink)">
          Predict the next token of a document.
        </Label>
        <Label x={60} y={432} anchor="start" size={13.5}>
          It has read billions of web pages. A page
        </Label>
        <Label x={60} y={454} anchor="start" size={13.5}>
          that starts with this line usually goes on
        </Label>
        <Label x={60} y={476} anchor="start" size={13.5}>
          like the one on the right.
        </Label>
      </Appear>

      <Appear delay={4.2}>
        <rect x={500} y={420} width={420} height={68} rx={14} fill="var(--card)" stroke="var(--accent)" strokeWidth={1.6} strokeDasharray="6 5" />
        <Label x={520} y={444} anchor="start" size={12.5} color="var(--ink-3)">
          What you wanted: an assistant
        </Label>
        <Label x={520} y={472} anchor="start" size={15} weight={600} color="var(--ink)">
          The capital of France is Paris.
        </Label>
      </Appear>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Step 2: pretraining.                                                */
/* ------------------------------------------------------------------ */

const PRE_IN = ["The", " capital", " of", " France", " is"];
const PRE_OUT = [" capital", " of", " France", " is", " Paris"];
const PRE_X = [400, 515, 630, 745, 860];

function LossCurve({ x, y, w, h, delay }: { x: number; y: number; w: number; h: number; delay: number }) {
  const pts = Array.from({ length: 40 }, (_, i) => {
    const t = i / 39;
    const v = 0.12 + 0.82 * Math.exp(-4.2 * t) + 0.03 * Math.sin(i * 1.7);
    return `${x + t * w},${y + (1 - v) * h}`;
  });
  return (
    <motion.polyline
      points={pts.join(" ")}
      fill="none"
      stroke="var(--accent)"
      strokeWidth={2}
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 1.6, delay, ease: EASE }}
    />
  );
}

function Pretrain() {
  return (
    <g>
      <Appear>
        {[0, 1, 2].map((i) => (
          <rect
            key={i}
            x={40 + i * 12}
            y={116 + i * 12}
            width={190}
            height={170}
            rx={12}
            fill="var(--card)"
            stroke={i === 2 ? "var(--ink)" : "var(--rule-strong)"}
            strokeWidth={i === 2 ? 1.6 : 1}
          />
        ))}
        <Label x={82} y={166} anchor="start" size={13} weight={650} color="var(--ink)">
          Photosynthesis
        </Label>
        {[0.9, 0.75, 0.85, 0.6, 0.8, 0.7, 0.5].map((f, i) => (
          <rect key={i} x={82} y={180 + i * 13} width={150 * f} height={6} rx={3} fill="var(--rule-strong)" />
        ))}
        <Label x={152} y={334} size={15} weight={650} color="var(--ink)">
          FineWeb-EDU
        </Label>
        <Label x={152} y={354} size={12.5}>
          educational web pages
        </Label>
      </Appear>
      <Arrow x1={264} y1={210} x2={296} y2={210} delay={0.4} />

      <Appear delay={0.5}>
        <Label x={350} y={165} anchor="end" size={12.5} color="var(--ink-3)">
          input
        </Label>
        <Label x={350} y={265} anchor="end" size={12.5} color="var(--ink-3)">
          target
        </Label>
      </Appear>
      {PRE_IN.map((t, i) => (
        <TokenChip key={`i${i}`} tok={{ t }} x={PRE_X[i]} y={160} index={i} fs={14} delay={0.5 + i * 0.08} />
      ))}
      {PRE_X.map((x, i) => (
        <Arrow key={`a${i}`} x1={x} y1={182} x2={x} y2={236} tone="muted" delay={1 + i * 0.12} duration={0.4} />
      ))}
      {PRE_OUT.map((t, i) => (
        <TokenChip key={`o${i}`} tok={{ t }} x={PRE_X[i]} y={260} index={i + 1} fs={14} delay={1.3 + i * 0.12} highlight={i === 4} />
      ))}
      <Appear delay={2.1}>
        <rect x={PRE_X[4] - 42} y={240} width={84} height={40} rx={10} fill="none" stroke="var(--mark)" strokeWidth={2} />
        <Label x={904} y={312} anchor="end" size={13} color="var(--ink)">
          To put probability on Paris here,
        </Label>
        <Label x={904} y={332} anchor="end" size={13} color="var(--ink)">
          the weights have to store the fact.
        </Label>
      </Appear>
      <Appear delay={1.8}>
        <Pill x={500} y={322} text="loss = mean of -log p(target), every position" fontSize={12.5} />
      </Appear>

      <Appear delay={2.4}>
        <rect x={40} y={392} width={260} height={104} rx={12} fill="var(--card)" stroke="var(--rule-strong)" />
        <Label x={58} y={418} anchor="start" size={12} color="var(--ink-3)">
          nanochat speedrun (first release)
        </Label>
        <Label x={58} y={448} anchor="start" size={17} weight={700} color="var(--ink)">
          561M parameters
        </Label>
        <Label x={58} y={474} anchor="start" size={13}>
          about 11B tokens, 20 per parameter
        </Label>

        <rect x={316} y={392} width={260} height={104} rx={12} fill="var(--card)" stroke="var(--rule-strong)" />
        <Label x={334} y={418} anchor="start" size={12} color="var(--ink-3)">
          Frontier models
        </Label>
        <Label x={334} y={448} anchor="start" size={17} weight={700} color="var(--ink)">
          trillions of tokens
        </Label>
        <Label x={334} y={474} anchor="start" size={13}>
          Llama 3 read over 15T
        </Label>

        <rect x={592} y={392} width={328} height={104} rx={12} fill="var(--card)" stroke="var(--rule-strong)" />
        <Label x={610} y={418} anchor="start" size={12} color="var(--ink-3)">
          Training loss
        </Label>
        <line x1={612} y1={484} x2={900} y2={484} stroke="var(--rule-strong)" />
        <line x1={612} y1={430} x2={612} y2={484} stroke="var(--rule-strong)" />
      </Appear>
      <LossCurve x={616} y={430} w={280} h={52} delay={2.8} />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Step 3: midtraining data.                                           */
/* ------------------------------------------------------------------ */

const MID_CARDS: { title: string; data: string; tone: Tone; teaches: string; pieces: Piece[] }[] = [
  {
    title: "Conversations",
    data: "SmolTalk",
    tone: "accent",
    teaches: "teaches: whose turn it is",
    pieces: [
      US,
      { t: "Suggest a name for my new cat." },
      UE,
      { t: "", br: true },
      AS,
      { t: "How about Miso? It is short and sweet." },
      AE,
    ],
  },
  {
    title: "Multiple choice",
    data: "MMLU auxiliary",
    tone: "violet",
    teaches: "teaches: answer with a letter",
    pieces: [
      US,
      { t: "Which gas do plants take in?" },
      { t: "", br: true },
      { t: "A. oxygen, B. carbon dioxide," },
      { t: "", br: true },
      { t: "C. nitrogen, D. helium" },
      UE,
      { t: "", br: true },
      AS,
      { t: "B", strong: true },
      AE,
    ],
  },
  {
    title: "Tool use",
    data: "GSM8K",
    tone: "ok",
    teaches: "teaches: call the calculator",
    pieces: [
      US,
      { t: "48 clips in April, half as many in May. Total?" },
      UE,
      { t: "", br: true },
      AS,
      { t: "In May:" },
      PS,
      { t: "48/2", strong: true },
      PE,
      OS,
      { t: "24", strong: true },
      OE,
      { t: "so 72 in total." },
      AE,
    ],
  },
];

function Midtrain() {
  return (
    <g>
      {MID_CARDS.map((c, i) => {
        const x0 = 40 + i * 300;
        return (
          <Appear key={c.title} delay={0.15 + i * 0.35}>
            <rect x={x0} y={108} width={280} height={318} rx={14} fill="var(--card)" stroke="var(--ink)" strokeWidth={1.4} />
            <Label x={x0 + 18} y={136} anchor="start" size={15} weight={700} color="var(--ink)">
              {c.title}
            </Label>
            <Pill x={x0 + 262 - (c.data.length * 11.5 * 0.61 + 16) / 2} y={131} text={c.data} tone={c.tone} fontSize={11.5} />
            <line x1={x0 + 1} y1={152} x2={x0 + 279} y2={152} stroke="var(--rule)" />
            <FlowText pieces={c.pieces} x={x0 + 16} y={178} maxW={250} delay={0.4 + i * 0.35} />
            <line x1={x0 + 1} y1={392} x2={x0 + 279} y2={392} stroke="var(--rule)" />
            <Label x={x0 + 18} y={414} anchor="start" size={12.5} color="var(--ink-2)">
              {c.teaches}
            </Label>
          </Appear>
        );
      })}
      <Appear delay={1.5}>
        <rect x={40} y={444} width={880} height={56} rx={12} fill="var(--mark-soft)" stroke="var(--mark)" />
        <Label x={480} y={468} size={14} weight={650} color="var(--ink)">
          Same model, same next-token loss on every token. Only the data is new.
        </Label>
        <Label x={480} y={488} size={12.5} color="var(--ink-2)">
          The special tokens show up for the first time here, so their embeddings finally get trained.
        </Label>
      </Appear>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Steps 4 and 5: the chat template and the SFT loss mask.             */
/* ------------------------------------------------------------------ */

const ROW1: Tok[] = [BOS, US, { t: "Capital" }, { t: " of" }, { t: " France" }, { t: "?" }, UE];
const ROW2: Tok[] = [AS, { t: "Paris" }, { t: "." }, AE];
const MASK1 = [0, 0, 0, 0, 0, 0, 0];
const MASK2 = [0, 1, 1, 1];

function Bracket({ x1, x2, y, label, delay, tone = "var(--ink-3)" }: { x1: number; x2: number; y: number; label: string; delay: number; tone?: string }) {
  return (
    <Appear delay={delay} y={4}>
      <path d={`M ${x1} ${y} l 0 7 L ${x2} ${y + 7} l 0 -7`} fill="none" stroke={tone} strokeWidth={1.4} />
      <Label x={(x1 + x2) / 2} y={y + 26} size={12.5} color="var(--ink-2)">
        {label}
      </Label>
    </Appear>
  );
}

function Template() {
  const r1 = layoutRow(ROW1, 480, 14);
  const r2 = layoutRow(ROW2, 480, 14);
  return (
    <g>
      <Appear>
        <rect x={110} y={106} width={300} height={62} rx={16} fill="var(--card-2)" stroke="var(--rule-strong)" strokeWidth={1.4} />
        <Label x={130} y={128} anchor="start" size={12} color="var(--ink-3)">
          user
        </Label>
        <Label x={130} y={154} anchor="start" size={16} weight={600} color="var(--ink)">
          Capital of France?
        </Label>
      </Appear>
      <Appear delay={0.3}>
        <rect x={550} y={106} width={300} height={62} rx={16} fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth={1.4} />
        <Label x={570} y={128} anchor="start" size={12} color="var(--ink-3)">
          assistant
        </Label>
        <Label x={570} y={154} anchor="start" size={16} weight={600} color="var(--ink)">
          Paris.
        </Label>
      </Appear>
      <Arrow x1={480} y1={178} x2={480} y2={238} delay={0.6} label="render_conversation()" />
      {ROW1.map((t, i) => (
        <TokenChip key={`a${i}`} tok={t} x={r1[i].x} y={264} index={i} fs={14} delay={1.1 + i * 0.12} />
      ))}
      {ROW2.map((t, i) => (
        <TokenChip key={`b${i}`} tok={t} x={r2[i].x} y={356} index={i + 7} fs={14} delay={2 + i * 0.12} />
      ))}
      <Bracket x1={r1[1].x - r1[1].w / 2} x2={r1[6].x + r1[6].w / 2} y={288} label="user turn" delay={2.6} />
      <Bracket x1={r2[0].x - r2[0].w / 2} x2={r2[3].x + r2[3].w / 2} y={380} label="assistant turn" delay={2.8} />
      <Appear delay={2.6}>
        <Label x={r1[0].x} y={314} size={12} color="var(--ink-3)">
          starts every chat
        </Label>
      </Appear>
      <Appear delay={3.2}>
        <rect x={130} y={432} width={700} height={66} rx={12} fill="var(--card-2)" stroke="var(--rule-strong)" />
        <Label x={480} y={459} size={14} weight={650} color="var(--ink)">
          One flat list of token ids. The special tokens say who is speaking.
        </Label>
        <Label x={480} y={482} size={13} color="var(--ink-2)">
          At chat time the prompt ends with the assistant start token, and the model writes until it emits the end token.
        </Label>
      </Appear>
    </g>
  );
}

function MaskCell({ x, y, on, delay }: { x: number; y: number; on: boolean; delay: number }) {
  return (
    <Appear delay={delay} y={4}>
      <rect
        x={x - 14}
        y={y}
        width={28}
        height={26}
        rx={6}
        fill={on ? "var(--ok-soft)" : "url(#hatch)"}
        stroke={on ? "var(--ok)" : "var(--rule-strong)"}
        strokeWidth={on ? 1.6 : 1}
      />
      <text x={x} y={y + 17.5} textAnchor="middle" fontSize={13} className="mono" fontWeight={700} fill={on ? "var(--ink)" : "var(--ink-2)"}>
        {on ? 1 : 0}
      </text>
    </Appear>
  );
}

function SftMask() {
  const r1 = layoutRow(ROW1, 480, 14);
  const r2 = layoutRow(ROW2, 480, 14);
  const all = [...MASK1, ...MASK2];
  return (
    <g>
      <Label x={92} y={150} anchor="start" size={12.5} color="var(--ink-3)">
        tokens
      </Label>
      <Label x={92} y={192} anchor="start" size={12.5} color="var(--ink-3)">
        mask
      </Label>
      {ROW1.map((t, i) => (
        <TokenChip key={`a${i}`} tok={t} x={r1[i].x} y={146} index={i} fs={14} dim={!MASK1[i]} dimAt={1.4} />
      ))}
      {ROW1.map((_, i) => (
        <MaskCell key={`m${i}`} x={r1[i].x} y={174} on={!!MASK1[i]} delay={0.5 + i * 0.06} />
      ))}
      <Label x={92} y={262} anchor="start" size={12.5} color="var(--ink-3)">
        tokens
      </Label>
      <Label x={92} y={304} anchor="start" size={12.5} color="var(--ink-3)">
        mask
      </Label>
      {ROW2.map((t, i) => (
        <TokenChip key={`b${i}`} tok={t} x={r2[i].x} y={258} index={i + 7} fs={14} dim={!MASK2[i]} dimAt={1.4} />
      ))}
      {ROW2.map((_, i) => (
        <MaskCell key={`n${i}`} x={r2[i].x} y={286} on={!!MASK2[i]} delay={0.9 + i * 0.08} />
      ))}
      <Appear delay={1.8}>
        <path
          d={`M ${r2[1].x - 30} 326 L ${r2[1].x - 30} 334 L ${r2[3].x + r2[3].w / 2} 334 L ${r2[3].x + r2[3].w / 2} 326`}
          fill="none"
          stroke="var(--ok)"
          strokeWidth={1.6}
        />
        <Label x={(r2[1].x - 30 + r2[3].x + r2[3].w / 2) / 2} y={354} size={13} weight={600} color="var(--ink)">
          graded: the model must predict these
        </Label>
      </Appear>

      <Appear delay={2.3}>
        <rect x={40} y={390} width={420} height={108} rx={12} fill="var(--card)" stroke="var(--rule-strong)" />
        <Label x={60} y={416} anchor="start" size={12.5} color="var(--ink-3)">
          Positions that count toward the loss
        </Label>
        {all.map((m, i) => (
          <rect
            key={i}
            x={60 + i * 30}
            y={430}
            width={24}
            height={24}
            rx={5}
            fill={m ? "var(--ok)" : "url(#hatch)"}
            stroke={m ? "var(--ok)" : "var(--rule-strong)"}
          />
        ))}
        <Label x={60} y={484} anchor="start" size={14} weight={650} color="var(--ink)">
          3 of 11 tokens
        </Label>
        <Label x={176} y={484} anchor="start" size={13} color="var(--ink-2)">
          (the rest are read, not graded)
        </Label>

        <rect x={480} y={390} width={440} height={108} rx={12} fill="var(--card)" stroke="var(--rule-strong)" />
        <Label x={500} y={416} anchor="start" size={12.5} color="var(--ink-3)">
          The SFT loss
        </Label>
        <Label x={500} y={446} anchor="start" size={14} mono color="var(--ink)">
          mean over mask = 1 of -log p(token)
        </Label>
        <Label x={500} y={478} anchor="start" size={13} color="var(--ink-2)">
          Same cross-entropy. Masked targets are set to -1.
        </Label>
      </Appear>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Steps 6 and 7: RL with a group baseline.                            */
/* ------------------------------------------------------------------ */

const SAMPLES = [
  { right: "48 + 48/2 = 72", wrong: "48 × 2 = 96", wrongAns: "96", start: true },
  { right: "48/2 = 24; 48+24 = 72", wrong: "48 + 48 = 96", wrongAns: "96", start: false },
  { right: "May: 24, so 72 in total", wrong: "April: 48, May: 48 - 24", wrongAns: "24", start: true },
  { right: "48 + 24 = 72", wrong: "48 / 2 = 24", wrongAns: "24", start: false },
];

const ROW_Y = [168, 232, 296, 360];
const ADV_X = 806;
const ADV_SCALE = 80;

function RLScene({ interactive }: { interactive: boolean }) {
  const [ok, setOk] = useState(SAMPLES.map((s) => s.start));
  const [focus, setFocus] = useState<number | null>(null);
  const rewards: number[] = ok.map((v) => (v ? 1 : 0));
  const mean = rewards.reduce((a, b) => a + b, 0) / rewards.length;
  const adv = rewards.map((r) => r - mean);
  const signal = adv.reduce((a, b) => a + Math.abs(b), 0);
  const flip = (i: number) => setOk((prev) => prev.map((v, j) => (j === i ? !v : v)));
  const onKey = (i: number) => (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      flip(i);
    }
  };
  const base = interactive ? 0 : 0.4;

  return (
    <g>
      <Appear>
        <rect x={40} y={108} width={268} height={196} rx={14} fill="var(--card)" stroke="var(--ink)" strokeWidth={1.4} />
        <Label x={58} y={134} anchor="start" size={12.5} color="var(--ink-3)">
          GSM8K problem
        </Label>
        {["Natalia sold clips to 48 friends", "in April, and half as many in", "May. How many clips did she", "sell in April and May together?"].map(
          (l, i) => (
            <Label key={l} x={58} y={162 + i * 22} anchor="start" size={13.5} color="var(--ink)">
              {l}
            </Label>
          ),
        )}
        <Pill x={124} y={270} text="correct answer: 72" tone="ok" fontSize={12.5} />
      </Appear>

      {interactive ? (
        <Appear delay={0.2}>
          <rect x={40} y={322} width={268} height={150} rx={14} fill="var(--ok-soft)" stroke="var(--ok)" />
          <Label x={58} y={350} anchor="start" size={14} weight={700} color="var(--ink)">
            Try it
          </Label>
          {["Click a sample to flip it between", "right and wrong. Make all four", "right, then all four wrong. Watch", "the advantages and the signal."].map(
            (l, i) => (
              <Label key={l} x={58} y={376 + i * 22} anchor="start" size={13} color="var(--ink)">
                {l}
              </Label>
            ),
          )}
        </Appear>
      ) : (
        <Appear delay={0.2}>
          {[
            "1. sample a group of answers",
            "2. reward 1 if the final answer is right",
            "3. advantage = reward - group mean",
            "4. weight its tokens' log-probs by it",
          ].map((l, i) => (
            <Label key={l} x={44} y={346 + i * 26} anchor="start" size={13.5} color="var(--ink)">
              {l}
            </Label>
          ))}
        </Appear>
      )}

      <Appear delay={0.1}>
        <Label x={350} y={128} anchor="start" size={12.5} color="var(--ink-3)">
          sampled answer
        </Label>
        <Label x={636} y={128} size={12.5} color="var(--ink-3)">
          answer
        </Label>
        <Label x={704} y={128} size={12.5} color="var(--ink-3)">
          reward
        </Label>
        <Label x={ADV_X} y={128} size={12.5} color="var(--ink-3)">
          advantage
        </Label>
        <line x1={ADV_X} y1={140} x2={ADV_X} y2={390} stroke="var(--rule-strong)" strokeDasharray="3 4" />
      </Appear>

      {SAMPLES.map((s, i) => {
        const y = ROW_Y[i];
        const right = ok[i];
        const a = adv[i];
        const len = Math.abs(a) * ADV_SCALE;
        const rowProps = interactive
          ? {
              role: "button",
              tabIndex: 0,
              "aria-pressed": right,
              "aria-label": `Sample ${i + 1}: ${right ? "right" : "wrong"}. Press to flip.`,
              onClick: () => flip(i),
              onKeyDown: onKey(i),
              onFocus: () => setFocus(i),
              onBlur: () => setFocus(null),
              style: { cursor: "pointer", outline: "none" },
            }
          : {};
        return (
          <motion.g
            key={i}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: base + i * 0.25, ease: EASE }}
          >
            <g {...rowProps}>
              {interactive && focus === i && (
                <rect x={338} y={y - 29} width={398} height={58} rx={14} fill="none" stroke="var(--accent)" strokeWidth={2.2} />
              )}
              <rect
                x={344}
                y={y - 23}
                width={258}
                height={46}
                rx={10}
                fill="var(--card)"
                stroke={interactive ? "var(--ink)" : "var(--rule-strong)"}
                strokeWidth={interactive ? 1.4 : 1}
              />
              <text x={358} y={y + 5} fontSize={13} className="mono" fill="var(--ink)">
                {right ? s.right : s.wrong}
              </text>
              {interactive && (
                <g>
                  <rect x={556} y={y - 11} width={38} height={22} rx={11} fill="var(--accent-soft)" stroke="var(--accent)" />
                  <text x={575} y={y + 4} textAnchor="middle" fontSize={11} fontWeight={650} fill="var(--ink)">
                    flip
                  </text>
                </g>
              )}
              <rect x={612} y={y - 16} width={48} height={32} rx={8} fill="var(--card-2)" stroke="var(--rule-strong)" />
              <text x={636} y={y + 5} textAnchor="middle" fontSize={14} className="mono" fontWeight={650} fill="var(--ink)">
                {right ? "72" : s.wrongAns}
              </text>
              <motion.rect
                x={682}
                y={y - 16}
                width={44}
                height={32}
                rx={8}
                initial={false}
                animate={{ fill: right ? "var(--ok-soft)" : "var(--bad-soft)", stroke: right ? "var(--ok)" : "var(--bad)" }}
                strokeWidth={1.6}
              />
              <text x={704} y={y + 5} textAnchor="middle" fontSize={14} className="mono" fontWeight={700} fill="var(--ink)">
                {right ? 1 : 0}
              </text>
            </g>
            <motion.rect
              y={y - 9}
              height={18}
              rx={4}
              fill={a >= 0 ? "var(--ok)" : "var(--bad)"}
              initial={{ width: 0, x: ADV_X }}
              animate={{ width: Math.max(len, a === 0 ? 0 : 2), x: a >= 0 ? ADV_X : ADV_X - len }}
              transition={{ duration: 0.5, delay: interactive ? 0 : 1.6 + i * 0.15, ease: EASE }}
            />
            <Appear delay={interactive ? 0 : 1.9 + i * 0.15} y={0}>
              <text x={918} y={y + 5} textAnchor="end" fontSize={13.5} className="mono" fontWeight={650} fill="var(--ink)">
                {a > 0 ? "+" : a < 0 ? "-" : ""}
                {Math.abs(a).toFixed(2)}
              </text>
            </Appear>
          </motion.g>
        );
      })}

      <Appear delay={interactive ? 0 : 1.3}>
        <Pill x={560} y={414} text={`group mean reward = ${mean.toFixed(2)}`} fontSize={13} strong />
      </Appear>
      <Appear delay={interactive ? 0.1 : 2.4}>
        <rect x={344} y={440} width={576} height={58} rx={12} fill={signal === 0 ? "var(--bad-soft)" : "var(--card-2)"} stroke="var(--rule-strong)" />
        {signal === 0 ? (
          <>
            <Label x={362} y={464} anchor="start" size={14} weight={650} color="var(--ink)">
              No learning signal from this problem.
            </Label>
            <Label x={362} y={486} anchor="start" size={13} color="var(--ink-2)">
              Every sample scored the same, so there is nothing to prefer.
            </Label>
          </>
        ) : (
          <>
            <Label x={362} y={464} anchor="start" size={14} weight={650} color="var(--ink)">
              Green answers get more likely, red ones less likely.
            </Label>
            <Label x={362} y={486} anchor="start" size={13} color="var(--ink-2)">
              {`Total push on this problem: ${signal.toFixed(2)}. Mean reward is the baseline.`}
            </Label>
          </>
        )}
      </Appear>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Step 8: three ways to tune preferences.                             */
/* ------------------------------------------------------------------ */

const PREF = [
  {
    title: "RLHF with a reward model",
    sub: "InstructGPT, 2022",
    tone: "accent" as Tone,
    boxes: [
      { t: "Humans rank answers", s: "A is better than B" },
      { t: "Train a reward model", s: "text in, one score out" },
      { t: "PPO on the policy", s: "plus a KL leash to SFT" },
    ],
    good: "Good for: tone, helpfulness, safety",
    risk: "Risk: the policy games the scorer",
  },
  {
    title: "DPO",
    sub: "Direct preference optimization, 2023",
    tone: "violet" as Tone,
    boxes: [
      { t: "Preference pairs", s: "chosen, rejected" },
      { t: "Direct loss on pairs", s: "vs a frozen reference" },
      { t: "No reward model", s: "no sampling loop" },
    ],
    good: "Good for: cheap, stable tuning",
    risk: "Risk: limited to the pairs you have",
  },
  {
    title: "RL, verifiable rewards",
    sub: "nanochat chat_rl, reasoning models",
    tone: "mark" as Tone,
    boxes: [
      { t: "Sample answers", s: "the model's own attempts" },
      { t: "A program checks", s: "math answer, unit tests" },
      { t: "Policy gradient", s: "group baseline, GRPO-style" },
    ],
    good: "Good for: math, code, anything checkable",
    risk: "Risk: only where you can check",
  },
];

function Preferences() {
  return (
    <g>
      {PREF.map((c, i) => {
        const x0 = 40 + i * 300;
        const cx = x0 + 140;
        return (
          <Appear key={c.title} delay={0.1 + i * 0.4}>
            <rect
              x={x0}
              y={106}
              width={280}
              height={396}
              rx={14}
              fill="var(--card)"
              stroke={i === 2 ? "var(--mark)" : "var(--ink)"}
              strokeWidth={i === 2 ? 2.2 : 1.4}
            />
            <Label x={cx} y={134} size={15.5} weight={700} color="var(--ink)">
              {c.title}
            </Label>
            <Label x={cx} y={154} size={12} color="var(--ink-3)">
              {c.sub}
            </Label>
            {c.boxes.map((b, j) => (
              <g key={b.t}>
                <Box x={cx} y={202 + j * 84} w={236} h={56} title={b.t} sub={b.s} tone={c.tone} />
                {j < 2 && <Arrow x1={cx} y1={232 + j * 84} x2={cx} y2={256 + j * 84} delay={0.5 + i * 0.4 + j * 0.2} duration={0.3} />}
              </g>
            ))}
            <line x1={x0 + 1} y1={438} x2={x0 + 279} y2={438} stroke="var(--rule)" />
            <Label x={x0 + 18} y={462} anchor="start" size={12.5} color="var(--ink)">
              {c.good}
            </Label>
            <Label x={x0 + 18} y={484} anchor="start" size={12.5} color="var(--ink-2)">
              {c.risk}
            </Label>
          </Appear>
        );
      })}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Step 9: what each stage changes.                                    */
/* ------------------------------------------------------------------ */

const CHANGES = [
  { stage: "Pretrain", sub: "base_train", data: ["trillions of web tokens", "(nanochat: about 11B)"], change: ["knowledge and language", "facts, grammar, code"], bar: 1, note: "almost all of it" },
  { stage: "Midtrain", sub: "mid_train", data: ["chats, multiple choice,", "tool calls"], change: ["format and special", "tokens"], bar: 0.035 },
  { stage: "SFT", sub: "chat_sft", data: ["curated conversations"], change: ["behaviour and style", "of answers"], bar: 0.02 },
  { stage: "RL", sub: "chat_rl", data: ["checkable problems", "or preferences"], change: ["reasoning strategies", "and preferences"], bar: 0.07, note: "growing in reasoning models" },
];

function Changes() {
  return (
    <g>
      <Appear>
        <Label x={56} y={122} anchor="start" size={12.5} color="var(--ink-3)">
          Stage
        </Label>
        <Label x={196} y={122} anchor="start" size={12.5} color="var(--ink-3)">
          Data
        </Label>
        <Label x={420} y={122} anchor="start" size={12.5} color="var(--ink-3)">
          What it changes
        </Label>
        <Label x={640} y={122} anchor="start" size={12.5} color="var(--ink-3)">
          Share of training compute (illustrative)
        </Label>
      </Appear>
      {CHANGES.map((r, i) => {
        const y = 170 + i * 76;
        return (
          <Appear key={r.stage} delay={0.2 + i * 0.3}>
            <rect x={40} y={y - 32} width={880} height={66} rx={12} fill={i % 2 ? "var(--card)" : "var(--card-2)"} stroke="var(--rule)" />
            <Label x={56} y={y - 2} anchor="start" size={15.5} weight={700} color="var(--ink)">
              {r.stage}
            </Label>
            <Label x={56} y={y + 18} anchor="start" size={11.5} mono color="var(--ink-3)">
              {r.sub}
            </Label>
            {r.data.map((d, j) => (
              <Label key={d} x={196} y={y - 4 + j * 19 - (r.data.length - 1) * 9.5 + 9} anchor="start" size={13}>
                {d}
              </Label>
            ))}
            {r.change.map((d, j) => (
              <Label key={d} x={420} y={y - 4 + j * 19 - (r.change.length - 1) * 9.5 + 9} anchor="start" size={13.5} weight={650} color="var(--ink)">
                {d}
              </Label>
            ))}
            <rect x={640} y={y - 16} width={260} height={16} rx={4} fill="var(--paper-2)" />
            <motion.rect
              x={640}
              y={y - 16}
              height={16}
              rx={4}
              fill={i === 0 ? "var(--accent)" : "var(--mark)"}
              initial={{ width: 0 }}
              animate={{ width: Math.max(5, r.bar * 260) }}
              transition={{ duration: 0.8, delay: 0.5 + i * 0.3, ease: EASE }}
            />
            {r.note && (
              <Label x={640} y={y + 20} anchor="start" size={12} color="var(--ink-2)">
                {r.note}
              </Label>
            )}
          </Appear>
        );
      })}
      <Appear delay={1.8}>
        <Label x={480} y={488} size={14} weight={650} color="var(--ink)">
          Knowledge comes in at pretraining. Later stages mostly change how it is used.
        </Label>
      </Appear>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Step 10: a tool call at inference.                                  */
/* ------------------------------------------------------------------ */

const T_ROW1: Tok[] = [AS, { t: "Total" }, { t: ":" }, PS, { t: "48+24" }, PE];
const T_ROW2: Tok[] = [OS, { t: "72" }, OE, { t: " So" }, { t: " 72" }, { t: "." }, AE];

function LoopDot({ playing }: { playing: boolean }) {
  const xs = [262, 388, 572, 688, 688, 572, 388, 262, 262];
  const ys = [384, 384, 384, 384, 416, 416, 416, 416, 384];
  if (!playing) return null;
  return (
    <motion.circle
      r={6}
      fill="var(--mark)"
      stroke="var(--card)"
      strokeWidth={2}
      initial={{ cx: xs[0], cy: ys[0] }}
      animate={{ cx: xs, cy: ys }}
      transition={{ duration: 4, delay: 2.2, ease: "linear", repeat: Infinity, repeatDelay: 0.6 }}
    />
  );
}

function Tools({ playing }: { playing: boolean }) {
  const r1 = layoutRow(T_ROW1, 480, 13);
  const r2 = layoutRow(T_ROW2, 480, 13);
  const f0 = r2[0].x - r2[0].w / 2 - 8;
  const f1 = r2[2].x + r2[2].w / 2 + 8;
  return (
    <g>
      {T_ROW1.map((t, i) => (
        <TokenChip key={`a${i}`} tok={t} x={r1[i].x} y={132} index={i} fs={13} delay={0.2 + i * 0.3} />
      ))}
      <Bracket x1={r1[3].x - r1[3].w / 2} x2={r1[5].x + r1[5].w / 2} y={156} label="sampled: the model writes a tool call" delay={2} tone="var(--violet)" />
      <Appear delay={3.4}>
        <rect x={f0} y={190} width={f1 - f0} height={50} rx={12} fill="var(--ok-soft)" stroke="var(--ok)" strokeDasharray="5 4" />
      </Appear>
      {T_ROW2.map((t, i) => (
        <TokenChip key={`b${i}`} tok={t} x={r2[i].x} y={215} index={i + 6} fs={13} delay={i < 3 ? 3.6 + i * 0.2 : 4.6 + (i - 3) * 0.3} />
      ))}
      <Appear delay={4}>
        <Label x={(f0 + f1) / 2} y={262} size={12.5} weight={600} color="var(--ink)">
          forced by the engine, not sampled
        </Label>
      </Appear>
      <Appear delay={5.6}>
        <Label x={r2[5].x} y={262} size={12.5} color="var(--ink-2)">
          sampled again
        </Label>
      </Appear>

      <Appear delay={1.2}>
        <Box x={170} y={400} w={180} h={64} title="Model" sub="samples tokens" />
        <Box x={480} y={400} w={180} h={64} title="Engine" sub="watches the stream" tone="accent" />
        <Box x={790} y={400} w={200} h={64} title="Calculator" sub="safe eval, timeout" tone="ok" />
      </Appear>
      <Arrow x1={262} y1={384} x2={386} y2={384} delay={1.6} duration={0.4} />
      <Arrow x1={572} y1={384} x2={686} y2={384} delay={1.9} duration={0.4} />
      <Arrow x1={688} y1={416} x2={574} y2={416} delay={2.2} duration={0.4} />
      <Arrow x1={388} y1={416} x2={264} y2={416} delay={2.5} duration={0.4} />
      <Appear delay={1.8}>
        <Pill x={324} y={344} text="python_end seen" fontSize={11.5} />
        <Pill x={630} y={344} text="48+24" fontSize={11.5} />
        <Pill x={630} y={456} text="72" fontSize={11.5} tone="ok" />
        <Pill x={324} y={456} text="force 3 tokens" fontSize={11.5} tone="ok" />
      </Appear>
      <LoopDot playing={playing} />
      <Appear delay={2.6}>
        <Label x={480} y={498} size={13} color="var(--ink-2)">
          In SFT data these output tokens have mask 0: the model learns to call the tool, not to imitate its result.
        </Label>
      </Appear>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Step 11: recap.                                                     */
/* ------------------------------------------------------------------ */

const RECAP = [
  { data: ["web text", "(FineWeb-EDU)"], loss: ["next token,", "every position"], change: ["knowledge,", "language"] },
  { data: ["chats, multiple", "choice, tool use"], loss: ["next token,", "every position"], change: ["format, special", "tokens"] },
  { data: ["curated chats"], loss: ["next token,", "assistant only"], change: ["behaviour,", "answer style"] },
  { data: ["problems with", "checkable answers"], loss: ["advantage", "x log-prob"], change: ["reasoning,", "preferences"] },
  { data: ["your messages"], loss: ["none: weights", "are frozen"], change: ["nothing; tool", "calls run here"] },
];

function Recap() {
  return (
    <g>
      {RECAP.map((c, i) => {
        const cx = PIPE[i].x;
        const x0 = cx - 82;
        const block = (label: string, lines: string[], y: number) => (
          <g>
            <Label x={x0 + 14} y={y} anchor="start" size={11.5} color="var(--ink-3)">
              {label}
            </Label>
            {lines.map((l, j) => (
              <Label key={l} x={x0 + 14} y={y + 22 + j * 20} anchor="start" size={14} weight={600} color="var(--ink)">
                {l}
              </Label>
            ))}
          </g>
        );
        return (
          <Appear key={i} delay={0.15 + i * 0.18}>
            <rect x={x0} y={100} width={164} height={300} rx={14} fill="var(--card)" stroke="var(--ink)" strokeWidth={1.3} />
            {block("Data", c.data, 130)}
            {block("Loss", c.loss, 222)}
            {block("Changes", c.change, 314)}
          </Appear>
        );
      })}
      <Appear delay={1.2}>
        <rect x={110} y={426} width={740} height={64} rx={12} fill="var(--mark-soft)" stroke="var(--mark)" />
        <Label x={480} y={453} size={15} weight={700} color="var(--ink)">
          One transformer the whole way. Only the data and the objective change.
        </Label>
        <Label x={480} y={476} size={13} color="var(--ink-2)">
          RL is still next-token log-probability, weighted by how much better each sample did than its group.
        </Label>
      </Appear>
    </g>
  );
}

export function Stage({ step, playing }: StageProps) {
  return (
    <Svg label="The nanochat post-training pipeline">
      <Pipeline step={step} />
      {step === 0 && <Completer />}
      {step === 1 && <Pretrain />}
      {step === 2 && <Midtrain />}
      {step === 3 && <Template />}
      {step === 4 && <SftMask />}
      {step === 5 && <RLScene interactive={false} />}
      {step === 6 && <RLScene interactive />}
      {step === 7 && <Preferences />}
      {step === 8 && <Changes />}
      {step === 9 && <Tools playing={playing} />}
      {step === 10 && <Recap />}
    </Svg>
  );
}
