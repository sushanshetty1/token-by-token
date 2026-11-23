"use client";

import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import {
  Appear,
  Arrow,
  Bars,
  Box,
  Cells,
  Chip,
  EASE,
  Label,
  Packet,
  Pill,
  Svg,
  chipWidth,
} from "@/components/viz/svg";
import { seededVector, softmax } from "@/lib/color";
import { useTokens } from "@/lib/tokenizer";
import type { StageProps } from "@/lib/types";

export const MESSAGE = "What is the capital of France?";
const USER = "<|user|>";
const ASSISTANT = "<|assistant|>";
/** GPT-2 has 50,257 tokens; this hypothetical chat model adds two special ones. */
const SPECIAL_IDS: Record<string, number> = { [USER]: 50257, [ASSISTANT]: 50258, "<|end|>": 50259 };

export const CANDIDATES = ["The", "Paris", "France", "It", "the", "Capital"];
export const LOGITS = [7.9, 7.2, 4.1, 3.8, 3.0, 2.2];
const ATTN = [0.05, 0.07, 0.03, 0.02, 0.28, 0.05, 0.38, 0.04, 0.08];
const REPLY = ["The", " capital", " of", " France", " is", " Paris", ".", "<|end|>"];

const MAP = [
  { label: "Template", steps: [1] },
  { label: "Tokenizer", steps: [2] },
  { label: "Embeddings", steps: [3] },
  { label: "12 blocks", steps: [4, 5, 6, 7] },
  { label: "Logits", steps: [8] },
  { label: "Sample", steps: [9] },
  { label: "Stream", steps: [10] },
];

interface Tok {
  text: string;
  id: number;
  special: boolean;
}

function usePromptTokens(): Tok[] {
  const res = useTokens(MESSAGE, "gpt2");
  return useMemo(() => {
    const mid = res?.pieces.map((p) => ({ text: p.text, id: p.id, special: false })) ?? [];
    return [
      { text: USER, id: SPECIAL_IDS[USER], special: true },
      ...mid,
      { text: ASSISTANT, id: SPECIAL_IDS[ASSISTANT], special: true },
    ];
  }, [res]);
}

/** Lay chips out in a centred row and return their centre x positions. */
function rowLayout(texts: string[], fontSize: number, gap: number, cx = 480) {
  const widths = texts.map((t) => chipWidth(t, fontSize));
  const total = widths.reduce((a, b) => a + b, 0) + gap * (texts.length - 1);
  let x = cx - total / 2;
  return widths.map((w) => {
    const c = x + w / 2;
    x += w + gap;
    return { c, w };
  });
}

function PipelineMap({ step }: { step: number }) {
  const x0 = 90;
  const dx = 130;
  return (
    <g>
      {MAP.map((m, i) => {
        const active = m.steps.includes(step);
        const done = step === 11 || m.steps.every((s) => s < step);
        const x = x0 + i * dx;
        return (
          <g key={m.label}>
            {i > 0 && (
              <line
                x1={x - dx + 56}
                y1={44}
                x2={x - 60}
                y2={44}
                stroke={done || active ? "var(--ink)" : "var(--rule-strong)"}
                strokeWidth={1.5}
                markerEnd={done || active ? "url(#arrow-ink)" : "url(#arrow-muted)"}
              />
            )}
            <rect x={x - 54} y={27} width={108} height={34} rx={9} fill={active ? "var(--ink)" : "transparent"} />
            <rect
              x={x - 54}
              y={24}
              width={108}
              height={34}
              rx={9}
              fill={active ? "var(--mark)" : done ? "var(--card)" : "var(--card-2)"}
              stroke={active || done ? "var(--ink)" : "var(--rule-strong)"}
              strokeWidth={active ? 1.8 : 1.2}
            />
            <text
              x={x}
              y={45.5}
              textAnchor="middle"
              fontSize={13}
              fontWeight={active ? 700 : 600}
              fill={active || done ? "var(--ink)" : "var(--ink-3)"}
            >
              {m.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function TokenRow({
  toks,
  y,
  fontSize = 14,
  gap = 10,
  showIds = true,
  dimExceptLast = false,
  delay = 0,
}: {
  toks: Tok[];
  y: number;
  fontSize?: number;
  gap?: number;
  showIds?: boolean;
  dimExceptLast?: boolean;
  delay?: number;
}) {
  const lay = rowLayout(
    toks.map((t) => t.text),
    fontSize,
    gap,
  );
  return (
    <g>
      {toks.map((t, i) => (
        <g key={i} opacity={dimExceptLast && i < toks.length - 1 ? 0.45 : 1}>
          {t.special ? (
            <SpecialChip x={lay[i].c} y={y} text={t.text} fontSize={fontSize} delay={delay + i * 0.05} id={showIds ? t.id : undefined} />
          ) : (
            <Chip x={lay[i].c} y={y} text={t.text} index={i} id={showIds ? t.id : undefined} fontSize={fontSize} delay={delay + i * 0.05} />
          )}
        </g>
      ))}
    </g>
  );
}

function SpecialChip({ x, y, text, fontSize = 14, delay = 0, id }: { x: number; y: number; text: string; fontSize?: number; delay?: number; id?: number }) {
  const w = chipWidth(text, fontSize);
  return (
    <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay, duration: 0.35 }}>
      <rect x={x - w / 2} y={y - 17} width={w} height={34} rx={8} fill="var(--violet-soft)" stroke="var(--violet)" strokeWidth={1.4} strokeDasharray="4 3" />
      <text x={x} y={y + fontSize * 0.35} textAnchor="middle" fontSize={fontSize} className="mono" fontWeight={600} fill="var(--violet)">
        {text}
      </text>
      {id !== undefined && (
        <text x={x} y={y + 32} textAnchor="middle" fontSize={11} className="mono" fill="var(--ink-3)">
          {id}
        </text>
      )}
    </motion.g>
  );
}

/* ------------------------------------------------------------------ */

function Enter() {
  return (
    <g>
      <Appear>
        <rect x={250} y={190} width={460} height={84} rx={22} fill="var(--card)" stroke="var(--ink)" strokeWidth={1.8} />
        <path d="M 640 274 L 676 300 L 664 274 Z" fill="var(--card)" stroke="var(--ink)" strokeWidth={1.8} strokeLinejoin="round" />
        <rect x={639} y={268} width={30} height={8} fill="var(--card)" />
        <text x={480} y={240} textAnchor="middle" fontSize={25} fontWeight={600}>
          {MESSAGE}
        </text>
      </Appear>
      <Appear delay={0.3}>
        <Pill x={706} y={318} text="you" mono={false} strong />
      </Appear>
      <motion.g
        initial={{ y: 0 }}
        animate={{ y: [0, 0, 5, 0] }}
        transition={{ duration: 0.6, delay: 0.9, times: [0, 0.4, 0.6, 1] }}
      >
        <rect x={420} y={358} width={120} height={50} rx={10} fill="var(--ink)" />
        <rect x={420} y={352} width={120} height={50} rx={10} fill="var(--card)" stroke="var(--ink)" strokeWidth={1.8} />
        <text x={480} y={383} textAnchor="middle" fontSize={16} fontWeight={650}>
          Enter ⏎
        </text>
      </motion.g>
      <Label x={480} y={466} size={14} delay={1.3}>
        The model: GPT-2 small sized (12 blocks, C = 768), tuned to chat. Hypothetical, to keep the numbers concrete.
      </Label>
    </g>
  );
}

function Template() {
  const pieces = [
    { text: USER, special: true },
    { text: MESSAGE, special: false },
    { text: ASSISTANT, special: true },
  ];
  const fs = 16;
  const lay = rowLayout(
    pieces.map((p) => p.text),
    fs,
    12,
  );
  return (
    <g>
      <Label x={480} y={128} size={14}>
        What the chat app actually sends the model is one long string
      </Label>
      {pieces.map((p, i) =>
        p.special ? (
          <SpecialChip key={i} x={lay[i].c} y={230} text={p.text} fontSize={fs} delay={0.2 + i * 0.25} />
        ) : (
          <Appear key={i} delay={0.1}>
            <rect x={lay[i].c - lay[i].w / 2} y={213} width={lay[i].w} height={34} rx={8} fill="var(--card)" stroke="var(--ink)" strokeWidth={1.4} />
            <text x={lay[i].c} y={235.5} textAnchor="middle" fontSize={fs} className="mono" fontWeight={500}>
              {p.text}
            </text>
          </Appear>
        ),
      )}
      <Arrow x1={lay[0].c} y1={300} x2={lay[0].c} y2={256} tone="violet" delay={0.8} />
      <Label x={lay[0].c} y={322} size={13} color="var(--violet)" delay={0.9}>
        who is speaking
      </Label>
      <Arrow x1={lay[2].c} y1={300} x2={lay[2].c} y2={256} tone="violet" delay={1} />
      <Label x={lay[2].c} y={322} size={13} color="var(--violet)" delay={1.1}>
        the model&apos;s turn starts here
      </Label>
      <Appear delay={1.4}>
        <rect x={210} y={372} width={540} height={74} rx={14} fill="var(--card-2)" stroke="var(--rule-strong)" />
        <text x={480} y={403} textAnchor="middle" fontSize={14.5}>
          A system prompt and earlier turns would be glued on the same way.
        </text>
        <text x={480} y={427} textAnchor="middle" fontSize={14.5} fill="var(--ink-2)">
          Every model family has its own special tokens. nanochat&apos;s are on Day 7.
        </text>
      </Appear>
    </g>
  );
}

function Tokens({ toks }: { toks: Tok[] }) {
  const ids = toks.map((t) => t.id).join(", ");
  return (
    <g>
      <Label x={480} y={150} size={14}>
        The tokenizer cuts the string into pieces it knows, and swaps each for its id
      </Label>
      <TokenRow toks={toks} y={226} fontSize={15} gap={9} />
      <Appear delay={0.9}>
        <rect x={150} y={326} width={660} height={56} rx={12} fill="var(--ink)" />
        <text x={480} y={360} textAnchor="middle" fontSize={15} className="mono" fill="var(--card)">
          {`tensor([[${ids}]])`}
        </text>
      </Appear>
      <Label x={480} y={420} size={14} delay={1.2} color="var(--ink)">
        This row of 9 integers is all the model ever sees. No letters, no words.
      </Label>
      <Label x={480} y={446} size={13} delay={1.3}>
        The dot marks a space. A word with a leading space is a different token from the same word without one.
      </Label>
    </g>
  );
}

const SHOWN_C = 12;

function Embeddings({ toks }: { toks: Tok[] }) {
  const lay = rowLayout(
    toks.map((t) => t.text),
    12.5,
    14,
  );
  return (
    <g>
      <TokenRow toks={toks} y={120} fontSize={12.5} gap={14} showIds={false} />
      {toks.map((t, i) => {
        const v = seededVector(t.id, SHOWN_C);
        const p = seededVector(1000 + i, SHOWN_C).map((n) => n * 0.35);
        const sum = v.map((n, j) => Math.max(-1, Math.min(1, n + p[j])));
        return (
          <g key={i}>
            <Cells x={lay[i].c - 7} y={156} values={sum} vertical cell={14} gap={2} delay={0.4 + i * 0.07} stagger={0.012} />
          </g>
        );
      })}
      <Appear delay={1.3}>
        <text x={lay[0].c - 26} y={252} textAnchor="end" fontSize={12} className="mono" fill="var(--ink-3)">
          C
        </text>
        <line x1={lay[0].c - 18} y1={156} x2={lay[0].c - 18} y2={346} stroke="var(--ink-3)" strokeWidth={1.2} />
      </Appear>
      <Appear delay={1.5}>
        <rect x={150} y={378} width={660} height={92} rx={14} fill="var(--card)" stroke="var(--ink)" strokeWidth={1.4} />
        <text x={480} y={406} textAnchor="middle" fontSize={14.5} fontWeight={600}>
          x = token vector + position vector
        </text>
        <text x={480} y={430} textAnchor="middle" fontSize={13.5} fill="var(--ink-2)">
          Each id picks one row of a 50,260 x 768 table. Each position adds its own row.
        </text>
        <text x={480} y={452} textAnchor="middle" fontSize={13} className="mono" fill="var(--ink-3)">
          drawn sideways: one column per token, 12 of the 768 numbers shown
        </text>
      </Appear>
    </g>
  );
}

function BlockStack({ highlight }: { highlight?: "attn" | "mlp" }) {
  return (
    <g>
      {Array.from({ length: 5 }, (_, k) => 4 - k).map((k) => (
        <rect
          key={k}
          x={370 + k * 10}
          y={150 - k * 10}
          width={240}
          height={250}
          rx={16}
          fill="var(--card-2)"
          stroke="var(--rule-strong)"
          strokeWidth={1.2}
        />
      ))}
      <rect x={370} y={153} width={240} height={250} rx={16} fill="var(--ink)" />
      <rect x={370} y={150} width={240} height={250} rx={16} fill="var(--card)" stroke="var(--ink)" strokeWidth={1.8} />
      <text x={392} y={178} fontSize={14} fontWeight={700}>
        Block 1
      </text>
      <text x={590} y={178} textAnchor="end" fontSize={12} className="mono" fill="var(--ink-3)">
        of 12
      </text>
      <line x1={490} y1={196} x2={490} y2={384} stroke="var(--mark)" strokeWidth={5} strokeLinecap="round" opacity={0.55} />
      <Box x={490} y={240} w={190} h={52} title="Attention" sub="tokens talk" tone="accent" active={highlight === "attn"} dim={highlight === "mlp"} />
      <Box x={490} y={332} w={190} h={52} title="MLP" sub="each token thinks" tone="violet" active={highlight === "mlp"} dim={highlight === "attn"} />
    </g>
  );
}

function MiniMatrix({ x, y, seed, highlightLast = false, dim = false }: { x: number; y: number; seed: number; highlightLast?: boolean; dim?: boolean }) {
  return (
    <g opacity={dim ? 0.5 : 1}>
      {Array.from({ length: 9 }, (_, i) => (
        <g key={i}>
          <Cells x={x + i * 13} y={y} values={seededVector(seed + i, 10)} vertical cell={11} gap={2} stagger={0.004} delay={i * 0.02} />
        </g>
      ))}
      {highlightLast && (
        <rect x={x + 8 * 13 - 4} y={y - 4} width={19} height={10 * 13 + 6} rx={5} fill="none" stroke="var(--mark)" strokeWidth={2.4} />
      )}
    </g>
  );
}

function Blocks() {
  return (
    <g>
      <MiniMatrix x={120} y={210} seed={300} />
      <Label x={178} y={190} size={13} mono>
        x: (9, 768)
      </Label>
      <Arrow x1={250} y1={275} x2={360} y2={275} delay={0.3} label="in" />
      <BlockStack />
      <Arrow x1={622} y1={275} x2={728} y2={275} delay={0.8} label="out" />
      <Appear delay={1.1}>
        <MiniMatrix x={740} y={210} seed={700} />
      </Appear>
      <Label x={798} y={190} size={13} mono delay={1.1}>
        x: (9, 768)
      </Label>
      <Label x={490} y={440} size={14} delay={1.3} color="var(--ink)">
        Same shape in, same shape out. Each block refines every token&apos;s vector.
      </Label>
      <Label x={490} y={464} size={13} delay={1.4}>
        The saffron line is the residual stream: blocks add to x, they never replace it.
      </Label>
    </g>
  );
}

function Attention({ toks }: { toks: Tok[] }) {
  const lay = rowLayout(
    toks.map((t) => t.text),
    13,
    12,
  );
  const y = 380;
  const last = lay.length - 1;
  return (
    <g>
      <Label x={480} y={120} size={14}>
        The last position asks: which earlier tokens matter for what comes next?
      </Label>
      {lay.map((l, i) => {
        if (i === last) return null;
        const w = ATTN[i] ?? 0;
        const x1 = lay[last].c;
        const x2 = l.c;
        const h = 60 + (x1 - x2) * 0.32;
        return (
          <motion.path
            key={i}
            d={`M ${x1} ${y - 22} C ${x1} ${y - 22 - h}, ${x2} ${y - 22 - h}, ${x2} ${y - 22}`}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={1 + w * 22}
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.25 + w * 2 }}
            transition={{ duration: 0.8, delay: 0.3 + (last - i) * 0.08, ease: EASE }}
          />
        );
      })}
      <TokenRow toks={toks} y={y} fontSize={13} gap={12} showIds={false} />
      {lay.map((l, i) =>
        (ATTN[i] ?? 0) >= 0.07 ? (
          <Label key={i} x={l.c} y={y + 42} size={12.5} mono weight={650} color="var(--accent)" delay={1.2}>
            {`${Math.round((ATTN[i] ?? 0) * 100)}%`}
          </Label>
        ) : null,
      )}
      <Appear delay={1.4}>
        <text x={480} y={470} textAnchor="middle" fontSize={13} fill="var(--ink-2)">
          Illustrative weights. Each layer has 12 heads, each with its own pattern (Day 4).
        </text>
        <text x={480} y={492} textAnchor="middle" fontSize={13} fill="var(--ink-2)">
          A token can only look left: the future is masked.
        </text>
      </Appear>
    </g>
  );
}

function MLP() {
  const before = seededVector(42, SHOWN_C);
  const after = seededVector(4242, SHOWN_C);
  return (
    <g>
      <Label x={480} y={120} size={14}>
        The MLP runs on each position separately. Here is the last one.
      </Label>
      <Cells x={170} y={164} values={before} vertical cell={16} gap={3} />
      <Label x={178} y={150} size={12} mono>
        768
      </Label>
      <Arrow x1={204} y1={276} x2={300} y2={276} delay={0.3} />
      <Appear delay={0.5}>
        {Array.from({ length: 4 }, (_, c) => (
          <Cells key={c} x={318 + c * 19} y={164} values={seededVector(90 + c, SHOWN_C).map((v) => Math.max(0, v))} vertical cell={16} gap={3} stagger={0.01} delay={0.5 + c * 0.08} />
        ))}
        <text x={366} y={150} textAnchor="middle" fontSize={12} className="mono" fill="var(--ink-2)">
          3,072
        </text>
      </Appear>
      <Label x={366} y={412} size={12.5} delay={0.8}>
        widen 4x, then GELU
      </Label>
      <Arrow x1={406} y1={276} x2={500} y2={276} delay={1} />
      <Appear delay={1.2}>
        <Cells x={518} y={164} values={after} vertical cell={16} gap={3} />
        <text x={526} y={150} textAnchor="middle" fontSize={12} className="mono" fill="var(--ink-2)">
          768
        </text>
      </Appear>
      <Label x={526} y={412} size={12.5} delay={1.2}>
        back to 768
      </Label>
      <Appear delay={1.5}>
        <rect x={600} y={186} width={300} height={150} rx={14} fill="var(--violet-soft)" stroke="var(--violet)" strokeWidth={1.2} />
        <text x={620} y={216} fontSize={14} fontWeight={650} fill="var(--violet)">
          Where facts seem to live
        </text>
        {["Two thirds of a block's weights", "sit in this MLP. Patterns like", "\"capital of France\" to \"Paris\" are", "written into these numbers."].map(
          (l, i) => (
            <text key={i} x={620} y={244 + i * 21} fontSize={13.5}>
              {l}
            </text>
          ),
        )}
      </Appear>
      <Label x={480} y={470} size={13} delay={1.7}>
        Then the result is added back into the residual stream for that token.
      </Label>
    </g>
  );
}

function LastPosition({ playing }: { playing: boolean }) {
  return (
    <g>
      {Array.from({ length: 12 }, (_, i) => (
        <motion.g key={i} initial={{ opacity: 0.3 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 + i * 0.12 }}>
          <rect x={130 + i * 38} y={200} width={30} height={150} rx={7} fill="var(--card)" stroke="var(--ink)" strokeWidth={1.3} />
          <rect x={133 + i * 38} y={205} width={24} height={64} rx={4} fill="var(--accent-soft)" />
          <rect x={133 + i * 38} y={280} width={24} height={64} rx={4} fill="var(--violet-soft)" />
          <text x={145 + i * 38} y={372} textAnchor="middle" fontSize={11} className="mono" fill="var(--ink-3)">
            {i + 1}
          </text>
        </motion.g>
      ))}
      <Packet from={[120, 275]} to={[590, 275]} playing={playing} duration={2.2} />
      <Label x={352} y={176} size={13} weight={650} color="var(--ink)">
        12 blocks, one after another
      </Label>
      <Arrow x1={600} y1={275} x2={666} y2={275} delay={1.6} />
      <Appear delay={1.7}>
        <MiniMatrix x={680} y={210} seed={1200} highlightLast />
      </Appear>
      <Label x={738} y={190} size={13} mono delay={1.7}>
        (9, 768)
      </Label>
      <Appear delay={2}>
        <line x1={789} y1={348} x2={789} y2={392} stroke="var(--mark)" strokeWidth={2} />
        <Pill x={789} y={410} text="this one predicts the next token" tone="mark" fontSize={12.5} />
      </Appear>
      <Label x={480} y={470} size={13} delay={2.2}>
        The other 8 positions predict their own next tokens. That matters in training, not here.
      </Label>
    </g>
  );
}

function Logits() {
  const bars = useMemo(() => {
    const r = seededVector(77, 150);
    return r.map((v, i) => (i === 19 || i === 88 ? 0.95 : i === 120 ? 0.55 : Math.abs(v) * 0.28));
  }, []);
  return (
    <g>
      <Cells x={110} y={170} values={seededVector(1208, SHOWN_C)} vertical cell={14} gap={2} />
      <Label x={117} y={156} size={12} mono>
        768
      </Label>
      <Arrow x1={140} y1={262} x2={196} y2={262} delay={0.2} />
      <Box x={270} y={262} w={140} h={66} title="ln_f, lm_head" sub="768 x 50,260" tone="ink" />
      <Arrow x1={344} y1={262} x2={398} y2={262} delay={0.5} />
      <g>
        {bars.map((h, i) => (
          <motion.rect
            key={i}
            x={410 + i * 3.4}
            width={2.4}
            rx={1}
            fill={h > 0.5 ? "var(--mark)" : "var(--ink-3)"}
            initial={{ y: 300, height: 0 }}
            animate={{ y: 300 - h * 110, height: h * 110 }}
            transition={{ delay: 0.6 + i * 0.004, duration: 0.4 }}
          />
        ))}
        <line x1={408} y1={300} x2={922} y2={300} stroke="var(--rule-strong)" />
        <text x={665} y={322} textAnchor="middle" fontSize={12.5} className="mono" fill="var(--ink-2)">
          50,260 scores, one per token in the vocabulary (a sample drawn)
        </text>
      </g>
      <Appear delay={1.2}>
        <rect x={300} y={356} width={360} height={150} rx={14} fill="var(--card)" stroke="var(--ink)" strokeWidth={1.4} />
        <text x={320} y={382} fontSize={13.5} fontWeight={650}>
          The six highest logits
        </text>
        {CANDIDATES.map((c, i) => (
          <g key={c}>
            <text x={334 + (i % 3) * 112} y={414 + Math.floor(i / 3) * 40} fontSize={14} className="mono" fontWeight={600}>
              {c}
            </text>
            <text x={334 + (i % 3) * 112} y={430 + Math.floor(i / 3) * 40} fontSize={12} className="mono" fill="var(--ink-3)">
              {LOGITS[i].toFixed(1)}
            </text>
          </g>
        ))}
      </Appear>
    </g>
  );
}

function Sample() {
  const probs = softmax(LOGITS, 1);
  return (
    <g>
      <Label x={480} y={120} size={14}>
        Softmax turns scores into probabilities. Then the model rolls the dice.
      </Label>
      <Bars x={300} y={160} labels={CANDIDATES} values={probs} width={360} row={36} highlight={0} max={1} />
      <Appear delay={1.1}>
        <Pill x={480} y={410} text="sampled: The" tone="mark" fontSize={15} strong />
      </Appear>
      <Label x={480} y={458} size={13} delay={1.3}>
        Temperature divides the logits first. Lower means safer picks, higher means more variety.
      </Label>
    </g>
  );
}

function Loop({ toks, playing }: { toks: Tok[]; playing: boolean }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!playing || n >= REPLY.length) return;
    const t = setTimeout(() => setN((k) => k + 1), n === 0 ? 500 : 650);
    return () => clearTimeout(t);
  }, [n, playing]);
  const gen = REPLY.slice(0, n);
  const all: Tok[] = [
    ...toks,
    ...gen.map((t) => ({ text: t, id: SPECIAL_IDS[t] ?? 0, special: t.startsWith("<|") })),
  ];
  const fs = 11.5;
  const lay = rowLayout(
    all.map((t) => t.text),
    fs,
    6,
  );
  const shown = gen.filter((t) => !t.startsWith("<|")).join("");
  const done = n >= REPLY.length;
  return (
    <g>
      <Box x={480} y={140} w={220} h={56} title="GPT forward pass" sub={`pass ${Math.min(n + 1, REPLY.length)} of ${REPLY.length}`} tone="ink" active={!done} />
      {all.map((t, i) => {
        const isGen = i >= toks.length;
        const x = lay[i].c;
        return (
          <g key={i} opacity={isGen ? 1 : 0.55}>
            {t.special ? (
              <SpecialChip x={x} y={250} text={t.text} fontSize={fs} />
            ) : (
              <Chip x={x} y={250} text={t.text} index={i} fontSize={fs} h={30} highlight={isGen && i === all.length - 1} />
            )}
          </g>
        );
      })}
      {n > 0 && !done && <Packet from={[480, 170]} to={[lay[all.length - 1].c, 232]} playing={playing} duration={0.6} repeat={false} />}
      <rect x={210} y={318} width={540} height={70} rx={20} fill="var(--card)" stroke="var(--ink)" strokeWidth={1.6} />
      <text x={236} y={360} fontSize={22} fontWeight={600}>
        {shown}
        {!done && (
          <tspan fill="var(--accent)" fontWeight={400}>
            ▍
          </tspan>
        )}
      </text>
      <Label x={480} y={432} size={13.5} color="var(--ink)">
        {done
          ? "The end token stops the loop. 8 tokens, 8 forward passes."
          : "Append the new token, run the whole model again, pick the next one."}
      </Label>
      <Label x={480} y={458} size={13}>
        Each id is decoded back to text and streamed to your screen as soon as it exists.
      </Label>
    </g>
  );
}

function Recap() {
  const rows = [
    { t: "Text", s: "30 chars" },
    { t: "Tokens", s: "(9,) ids" },
    { t: "Embeddings", s: "(9, 768)" },
    { t: "12 blocks", s: "(9, 768)" },
    { t: "Logits", s: "last row only" },
    { t: "Sample", s: "1 token" },
  ];
  return (
    <g>
      {rows.map((r, i) => {
        const x = 110 + i * 148;
        return (
          <g key={r.t}>
            {i > 0 && <Arrow x1={x - 148 + 62} y1={240} x2={x - 66} y2={240} delay={0.1 + i * 0.12} />}
            <Appear delay={i * 0.12}>
              <Box x={x} y={240} w={128} h={58} title={r.t} sub={r.s} tone={i === 3 ? "accent" : "ink"} />
            </Appear>
          </g>
        );
      })}
      <motion.path
        d="M 850 272 C 850 360, 110 360, 110 276"
        fill="none"
        stroke="var(--mark)"
        strokeWidth={2.2}
        strokeDasharray="6 6"
        markerEnd="url(#arrow-mark)"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.9, duration: 1.2, ease: EASE }}
      />
      <Label x={480} y={348} size={13.5} delay={1.6} color="var(--ink)">
        append the token and repeat until the end token
      </Label>
      <Appear delay={1.9}>
        <rect x={150} y={398} width={660} height={70} rx={14} fill="var(--card-2)" stroke="var(--rule-strong)" />
        <text x={480} y={428} textAnchor="middle" fontSize={14.5} fontWeight={600}>
          Training runs this same forward pass, then compares with the real next token.
        </text>
        <text x={480} y={451} textAnchor="middle" fontSize={13.5} fill="var(--ink-2)">
          Loss and backprop are Days 2 and 5. The KV cache that speeds up this loop is Day 6.
        </text>
      </Appear>
    </g>
  );
}

export function Stage({ step, playing }: StageProps) {
  const toks = usePromptTokens();
  const ready = toks.length > 2;
  return (
    <Svg label="A prompt travelling through a language model">
      <PipelineMap step={step} />
      {step === 0 && <Enter />}
      {step === 1 && <Template />}
      {step === 2 && ready && <Tokens toks={toks} />}
      {step === 3 && ready && <Embeddings toks={toks} />}
      {step === 4 && <Blocks />}
      {step === 5 && ready && <Attention toks={toks} />}
      {step === 6 && <MLP />}
      {step === 7 && <LastPosition playing={playing} />}
      {step === 8 && <Logits />}
      {step === 9 && <Sample />}
      {step === 10 && ready && <Loop toks={toks} playing={playing} />}
      {step === 11 && <Recap />}
      {!ready && [2, 3, 5, 10].includes(step) && (
        <text x={480} y={280} textAnchor="middle" fontSize={14} fill="var(--ink-3)">
          Loading the GPT-2 tokenizer…
        </text>
      )}
    </Svg>
  );
}

