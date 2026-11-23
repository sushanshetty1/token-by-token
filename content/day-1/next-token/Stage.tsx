"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { Slider, StageOverlay } from "@/components/viz/controls";
import { Appear, Arrow, Box, Chip, EASE, Label, Packet, Pill, Svg, chipWidth } from "@/components/viz/svg";
import { diverging, seededVector, sequential, softmax, tokenTint } from "@/lib/color";
import type { StageProps } from "@/lib/types";

interface Tok {
  text: string;
  id: number;
}

export const CONTEXT: Tok[] = [
  { text: "The", id: 464 },
  { text: " capital", id: 3139 },
  { text: " of", id: 286 },
  { text: " France", id: 4881 },
  { text: " is", id: 318 },
];

/** Illustrative logits for eight real GPT-2 tokens. We pretend they are the whole vocabulary. */
export const CANDS: (Tok & { logit: number })[] = [
  { text: " Paris", id: 6342, logit: 6.2 },
  { text: " a", id: 257, logit: 4.0 },
  { text: " the", id: 262, logit: 3.6 },
  { text: " located", id: 5140, logit: 2.9 },
  { text: " Lyon", id: 35193, logit: 1.5 },
  { text: " home", id: 1363, logit: 0.8 },
  { text: " London", id: 3576, logit: 0.3 },
  { text: " banana", id: 25996, logit: -2.1 },
];

const LOGITS = CANDS.map((c) => c.logit);
const EXPS = LOGITS.map((v) => Math.exp(v));
const EXP_SUM = EXPS.reduce((a, b) => a + b, 0);
export const PROBS = EXPS.map((e) => e / EXP_SUM);
const MAX_EXP = Math.max(...EXPS);

const pct = (p: number, d = 1) => `${(p * 100).toFixed(d)}%`;

/* ------------------------------------------------------------------ */
/* Where am I: a strip of stations across the top.                     */
/* ------------------------------------------------------------------ */

const MAP = ["Context", "Logits", "Softmax", "Pick", "Loop", "Train"];
const STATION_OF_STEP = [0, 1, 2, 2, 2, 3, 3, 4, 4, 5, 6];

function StationMap({ step }: { step: number }) {
  const at = STATION_OF_STEP[step] ?? 0;
  const dx = 136;
  const x0 = 480 - dx * 2.5;
  return (
    <g>
      {MAP.map((m, i) => {
        const active = i === at;
        const done = i < at;
        const x = x0 + i * dx;
        return (
          <g key={m}>
            {i > 0 && (
              <line
                x1={x - dx + 52}
                y1={40}
                x2={x - 56}
                y2={40}
                stroke={done || active ? "var(--ink)" : "var(--rule-strong)"}
                strokeWidth={1.4}
                markerEnd={done || active ? "url(#arrow-ink)" : "url(#arrow-muted)"}
              />
            )}
            {active && <rect x={x - 50} y={26} width={100} height={30} rx={8} fill="var(--ink)" />}
            <rect
              x={x - 50}
              y={23}
              width={100}
              height={30}
              rx={8}
              fill={active ? "var(--mark)" : done ? "var(--card)" : "var(--card-2)"}
              stroke={active || done ? "var(--ink)" : "var(--rule-strong)"}
              strokeWidth={active ? 1.7 : 1.1}
            />
            <text x={x} y={42.5} textAnchor="middle" fontSize={13} fontWeight={active ? 700 : 600} fill={active || done ? "var(--ink)" : "var(--ink-3)"}>
              {m}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Small helpers.                                                      */
/* ------------------------------------------------------------------ */

/** Centres for a row of chips that starts at x (or is centred on cx). */
function layoutRow(texts: string[], fontSize: number, gap: number, opts: { x?: number; cx?: number }) {
  const widths = texts.map((t) => chipWidth(t, fontSize));
  const total = widths.reduce((a, b) => a + b, 0) + gap * (texts.length - 1);
  let x = opts.x ?? (opts.cx ?? 480) - total / 2;
  return {
    total,
    centers: widths.map((w) => {
      const c = x + w / 2;
      x += w + gap;
      return c;
    }),
    widths,
  };
}

function ChipRow({
  toks,
  y,
  fontSize = 14,
  gap = 8,
  x,
  cx,
  ids = false,
  delay = 0,
  h = 32,
  highlightLast = false,
}: {
  toks: Tok[];
  y: number;
  fontSize?: number;
  gap?: number;
  x?: number;
  cx?: number;
  ids?: boolean;
  delay?: number;
  h?: number;
  highlightLast?: boolean;
}) {
  const lay = layoutRow(
    toks.map((t) => t.text),
    fontSize,
    gap,
    { x, cx },
  );
  return (
    <g>
      {toks.map((t, i) => (
        <Chip
          key={i}
          x={lay.centers[i]}
          y={y}
          text={t.text}
          index={i}
          id={ids ? t.id : undefined}
          fontSize={fontSize}
          h={h}
          delay={delay + i * 0.05}
          highlight={highlightLast && i === toks.length - 1}
        />
      ))}
    </g>
  );
}

function Card({ x, y, w, h, tone = "ink" }: { x: number; y: number; w: number; h: number; tone?: "ink" | "bad" | "ok" | "mark" }) {
  const stroke = tone === "ink" ? "var(--rule-strong)" : `var(--${tone})`;
  const fill = tone === "ink" ? "var(--card)" : `var(--${tone}-soft)`;
  return <rect x={x} y={y} width={w} height={h} rx={14} fill={fill} stroke={stroke} strokeWidth={1.3} />;
}

/* ------------------------------------------------------------------ */
/* Step 1: the model's only job.                                       */
/* ------------------------------------------------------------------ */

function Job() {
  const n = 150;
  const x0 = 150;
  const span = 660;
  const heights = seededVector(91, n).map((v) => 6 + Math.abs(v) * 26);
  const parisAt = Math.round((6342 / 50256) * (n - 1));
  heights[parisAt] = 118;
  heights[1] = 64;
  heights[2] = 56;
  const bx = (i: number) => x0 + (i / (n - 1)) * span;
  return (
    <g>
      <ChipRow toks={CONTEXT} y={112} cx={480} fontSize={15} ids />
      <Arrow x1={480} y1={150} x2={480} y2={184} delay={0.4} />
      <Box x={480} y={214} w={250} h={54} title="GPT" sub="one forward pass" tone="ink" />
      <Arrow x1={480} y1={244} x2={480} y2={282} delay={0.8} />
      <g>
        {heights.map((hgt, i) => {
          const hot = i === parisAt;
          return (
            <motion.rect
              key={i}
              x={bx(i) - 1.3}
              width={2.6}
              rx={1}
              fill={hot ? "var(--mark)" : i <= 2 ? "var(--ink-2)" : "var(--ink-3)"}
              initial={{ y: 430, height: 0 }}
              animate={{ y: 430 - hgt, height: hgt }}
              transition={{ delay: 1 + i * 0.004, duration: 0.4, ease: EASE }}
            />
          );
        })}
        <line x1={x0 - 6} y1={430} x2={x0 + span + 6} y2={430} stroke="var(--rule-strong)" />
      </g>
      <Appear delay={1.6}>
        <line x1={bx(parisAt)} y1={308} x2={bx(parisAt)} y2={296} stroke="var(--mark)" strokeWidth={1.6} />
        <Pill x={bx(parisAt)} y={284} text="id 6342 ·Paris" tone="mark" fontSize={12} />
        <text x={x0} y={450} fontSize={12} className="mono" fill="var(--ink-3)">
          id 0 &quot;!&quot;
        </text>
        <text x={x0 + span} y={450} textAnchor="end" fontSize={12} className="mono" fill="var(--ink-3)">
          id 50256 &lt;|endoftext|&gt;
        </text>
      </Appear>
      <Label x={480} y={484} size={14} color="var(--ink)" delay={1.9}>
        Out come 50,257 scores, one for every token in GPT-2&apos;s vocabulary (150 drawn).
      </Label>
      <Label x={480} y={508} size={13} delay={2.1}>
        That is the whole job. Everything else in this lesson is what we do with these scores.
      </Label>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Steps 2 to 5: the softmax table.                                    */
/* ------------------------------------------------------------------ */

const ROW0 = 160;
const ROW = 37;
const rowY = (i: number) => ROW0 + i * ROW;
const CHIP_X = 92;
const LOGIT_ZERO = 232;
const LOGIT_SCALE = 21;
const EXP_X = 446;
const EXP_W = 134;
const PROB_X = 690;
const PROB_W = 190;

function ContextReminder({ x = 136 }: { x?: number }) {
  const lay = layoutRow(
    CONTEXT.map((t) => t.text),
    12.5,
    6,
    { x },
  );
  const end = x + lay.total;
  return (
    <g>
      <text x={x - 12} y={97} textAnchor="end" fontSize={12.5} fill="var(--ink-3)">
        context
      </text>
      {CONTEXT.map((t, i) => (
        <Chip key={i} x={lay.centers[i]} y={92} text={t.text} index={i} fontSize={12.5} h={26} delay={0} />
      ))}
      <text x={end + 12} y={97} fontSize={13} className="mono" fill="var(--ink-2)">
        → next token?
      </text>
    </g>
  );
}

function TableChips({ dim = false }: { dim?: boolean }) {
  return (
    <g opacity={dim ? 0.9 : 1}>
      {CANDS.map((c, i) => (
        <Chip key={c.id} x={CHIP_X} y={rowY(i)} text={c.text} index={i} fontSize={13.5} h={28} delay={i * 0.03} />
      ))}
    </g>
  );
}

function SoftmaxTable({ phase }: { phase: "logits" | "exp" | "probs" | "shift" }) {
  const shift = phase === "shift";
  const showExp = phase !== "logits";
  const showProbs = phase === "probs" || phase === "shift";
  const shiftBy = shift ? 10 : 0;
  return (
    <g>
      <ContextReminder />
      <TableChips />

      {/* logits */}
      <g opacity={shift ? 0.45 : 1}>
        <text x={316} y={130} textAnchor="middle" fontSize={13} fontWeight={650} fill="var(--ink-2)">
          logit
        </text>
        <line x1={LOGIT_ZERO} y1={rowY(0) - 16} x2={LOGIT_ZERO} y2={rowY(7) + 16} stroke="var(--rule-strong)" />
        <text x={LOGIT_ZERO} y={rowY(7) + 32} textAnchor="middle" fontSize={11} className="mono" fill="var(--ink-3)">
          0
        </text>
        {CANDS.map((c, i) => {
          const w = Math.abs(c.logit) * LOGIT_SCALE;
          const x = c.logit >= 0 ? LOGIT_ZERO : LOGIT_ZERO - w;
          return (
            <motion.rect
              key={c.id}
              y={rowY(i) - 10}
              height={20}
              rx={4}
              fill={diverging(c.logit, 6.2)}
              stroke="var(--rule-strong)"
              strokeWidth={0.6}
              initial={{ x: LOGIT_ZERO, width: 0 }}
              animate={{ x, width: w }}
              transition={{ duration: 0.6, delay: 0.2 + i * 0.05, ease: EASE }}
            />
          );
        })}
      </g>
      {CANDS.map((c, i) => (
        <text
          key={c.id}
          x={404}
          y={rowY(i) + 4.5}
          textAnchor="end"
          fontSize={13}
          className="mono"
          fontWeight={shift ? 700 : 500}
          fill={shift ? "var(--ink)" : "var(--ink-2)"}
        >
          {(c.logit + shiftBy).toFixed(1)}
        </text>
      ))}
      {shift && (
        <Appear delay={0.2}>
          <Pill x={316} y={130} text="every logit + 10" tone="mark" fontSize={12} strong />
        </Appear>
      )}

      {/* exp */}
      {showExp && (
        <g>
          <text x={EXP_X + 80} y={130} textAnchor="middle" fontSize={13} fontWeight={650} fill="var(--ink-2)">
            {shift ? "exp(logit + 10)" : "exp(logit)"}
          </text>
          {EXPS.map((e, i) => (
            <g key={i}>
              <rect x={EXP_X} y={rowY(i) - 10} width={EXP_W} height={20} rx={4} fill="var(--paper-2)" />
              <motion.rect
                x={EXP_X}
                y={rowY(i) - 10}
                height={20}
                rx={4}
                fill={sequential(0.62, "var(--pos)")}
                initial={{ width: 0 }}
                animate={{ width: Math.max(1.5, (e / MAX_EXP) * EXP_W) }}
                transition={{ duration: 0.6, delay: (phase === "exp" ? 0.4 : 0) + i * 0.05, ease: EASE }}
              />
              <text x={652} y={rowY(i) + 4.5} textAnchor="end" fontSize={13} className="mono" fill="var(--ink-2)">
                {shift ? sci(e * Math.exp(10)) : e < 10 ? e.toFixed(2) : e.toFixed(1)}
              </text>
            </g>
          ))}
          <Appear delay={phase === "exp" ? 1 : 0}>
            <line x1={EXP_X} y1={rowY(7) + 20} x2={652} y2={rowY(7) + 20} stroke="var(--ink-3)" />
            <text x={652} y={rowY(7) + 39} textAnchor="end" fontSize={13} className="mono" fontWeight={650}>
              {`sum = ${shift ? sci(EXP_SUM * Math.exp(10)) : EXP_SUM.toFixed(1)}`}
            </text>
          </Appear>
        </g>
      )}

      {/* probabilities */}
      {showProbs && (
        <g>
          <text x={PROB_X + 100} y={130} textAnchor="middle" fontSize={13} fontWeight={650} fill="var(--ink-2)">
            {shift ? "probability, unchanged" : `exp ÷ ${EXP_SUM.toFixed(1)}`}
          </text>
          {PROBS.map((p, i) => (
            <g key={i}>
              <rect x={PROB_X} y={rowY(i) - 10} width={PROB_W} height={20} rx={4} fill="var(--paper-2)" />
              <motion.rect
                x={PROB_X}
                y={rowY(i) - 10}
                height={20}
                rx={4}
                fill="var(--accent)"
                initial={{ width: shift ? Math.max(1.5, p * PROB_W) : 0 }}
                animate={{ width: Math.max(1.5, p * PROB_W) }}
                transition={{ duration: 0.6, delay: 0.5 + i * 0.05, ease: EASE }}
              />
              <text x={930} y={rowY(i) + 4.5} textAnchor="end" fontSize={13} className="mono" fill="var(--ink)">
                {p < 0.001 ? pct(p, 2) : pct(p)}
              </text>
            </g>
          ))}
          <Appear delay={phase === "probs" ? 1.1 : 0}>
            <line x1={PROB_X} y1={rowY(7) + 20} x2={930} y2={rowY(7) + 20} stroke="var(--ink-3)" />
            <text x={930} y={rowY(7) + 39} textAnchor="end" fontSize={13} className="mono" fontWeight={650}>
              sum = 100%
            </text>
          </Appear>
        </g>
      )}

      {phase === "logits" && (
        <Appear delay={0.8}>
          <Card x={480} y={164} w={430} h={196} />
          <text x={502} y={196} fontSize={15} fontWeight={650}>
            Logits are raw scores
          </text>
          {[
            "Bigger means the model likes that token more.",
            "Any real number is allowed, negatives too.",
            "They do not sum to anything in particular.",
            "·banana at -2.1 is unlikely, not impossible.",
          ].map((l, i) => (
            <text key={i} x={502} y={228 + i * 28} fontSize={14} fill="var(--ink-2)">
              {l}
            </text>
          ))}
          <text x={502} y={344} fontSize={12.5} className="mono" fill="var(--ink-3)">
            illustrative values, 8 of 50,257 tokens
          </text>
        </Appear>
      )}
      {phase === "exp" && (
        <Appear delay={1.2}>
          <Card x={692} y={164} w={238} h={196} />
          <text x={710} y={194} fontSize={14.5} fontWeight={650}>
            What exp did
          </text>
          {["Every value is now positive.", "One more logit point", "means 2.72x bigger.", "6.2 vs 4.0 was a gap of 2.2.", "Now it is 9x."].map((l, i) => (
            <text key={i} x={710} y={224 + i * 26} fontSize={13.5} fill="var(--ink-2)">
              {l}
            </text>
          ))}
        </Appear>
      )}
      {shift && (
        <Appear delay={0.9}>
          <rect x={60} y={490} width={840} height={36} rx={10} fill="var(--ok-soft)" stroke="var(--ok)" />
          <text x={480} y={513} textAnchor="middle" fontSize={13.5} className="mono">
            exp(x + 10) = 22,026 × exp(x). The 22,026 is in the sum too, so it cancels.
          </text>
        </Appear>
      )}
    </g>
  );
}

function sci(v: number) {
  const s = v.toExponential(2);
  const [m, e] = s.split("e");
  return `${m}e${Number(e)}`;
}

/* ------------------------------------------------------------------ */
/* Probability list used by Pick and Temperature.                      */
/* ------------------------------------------------------------------ */

function ProbList({
  probs,
  x0,
  barX,
  barW,
  textX,
  highlight,
  animateFrom0 = true,
}: {
  probs: number[];
  x0: number;
  barX: number;
  barW: number;
  textX: number;
  highlight?: number;
  animateFrom0?: boolean;
}) {
  return (
    <g>
      {CANDS.map((c, i) => (
        <g key={c.id}>
          <Chip x={x0} y={rowY(i)} text={c.text} index={i} fontSize={13.5} h={28} delay={0} highlight={highlight === i} />
          <rect x={barX} y={rowY(i) - 10} width={barW} height={20} rx={4} fill="var(--paper-2)" />
          <motion.rect
            x={barX}
            y={rowY(i) - 10}
            height={20}
            rx={4}
            fill={highlight === i ? "var(--mark)" : "var(--accent)"}
            initial={animateFrom0 ? { width: 0 } : false}
            animate={{ width: Math.max(1.5, probs[i] * barW) }}
            transition={{ duration: animateFrom0 ? 0.6 : 0.25, delay: animateFrom0 ? i * 0.04 : 0, ease: EASE }}
          />
          <text x={textX} y={rowY(i) + 4.5} textAnchor="end" fontSize={13} className="mono" fill="var(--ink)">
            {probs[i] < 0.001 ? pct(probs[i], 2) : pct(probs[i])}
          </text>
        </g>
      ))}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Step 6: greedy or sample.                                           */
/* ------------------------------------------------------------------ */

const DRAWS = [0.42, 0.86, 0.93];

function pickFor(u: number) {
  let c = 0;
  for (let i = 0; i < PROBS.length; i++) {
    c += PROBS[i];
    if (u < c) return i;
  }
  return PROBS.length - 1;
}

const STRIP_X = 482;
const STRIP_W = 420;
const CUM = PROBS.map((_, i) => PROBS.slice(0, i).reduce((a, b) => a + b, 0));
const SEGS = PROBS.map((p, i) => ({ x: STRIP_X + CUM[i] * STRIP_W, w: p * STRIP_W, i }));

function Pick() {
  const sx = STRIP_X;
  const sw = STRIP_W;
  const segs = SEGS;
  return (
    <g>
      <ContextReminder />
      <text x={250} y={130} textAnchor="middle" fontSize={13} fontWeight={650} fill="var(--ink-2)">
        probability at T = 1
      </text>
      <ProbList probs={PROBS} x0={CHIP_X} barX={150} barW={190} textX={406} highlight={0} />

      <Appear delay={0.4}>
        <Card x={452} y={120} w={478} h={128} />
        <text x={472} y={150} fontSize={15} fontWeight={650}>
          Greedy: always take the top token
        </text>
        <text x={472} y={174} fontSize={13.5} fill="var(--ink-2)">
          argmax picks ·Paris. Same prompt, same text, every run.
        </text>
        {[0, 1, 2].map((r) => (
          <g key={r}>
            <text x={472 + r * 150} y={222} fontSize={12} className="mono" fill="var(--ink-3)">
              {`run ${r + 1}`}
            </text>
            <Chip x={548 + r * 150} y={217} text=" Paris" index={0} fontSize={13} h={26} delay={0.6 + r * 0.1} />
          </g>
        ))}
      </Appear>

      <Appear delay={1}>
        <Card x={452} y={266} w={478} h={238} />
        <text x={472} y={296} fontSize={15} fontWeight={650}>
          Sampling: a weighted draw
        </text>
        <text x={472} y={320} fontSize={13.5} fill="var(--ink-2)">
          Draw u between 0 and 1, see where it lands on the stacked bar.
        </text>
        {segs.map((s) => (
          <rect
            key={s.i}
            x={s.x}
            y={372}
            width={Math.max(0.6, s.w)}
            height={28}
            fill={tokenTint(s.i).fill}
            stroke={tokenTint(s.i).stroke}
            strokeWidth={0.8}
          />
        ))}
        <text x={segs[0].x + segs[0].w / 2} y={391} textAnchor="middle" fontSize={13} className="mono" fill={tokenTint(0).text} fontWeight={600}>
          ·Paris 80.7%
        </text>
        <text x={sx} y={418} fontSize={11} className="mono" fill="var(--ink-3)">
          0
        </text>
        <text x={sx + sw} y={418} textAnchor="end" fontSize={11} className="mono" fill="var(--ink-3)">
          1
        </text>
      </Appear>
      {DRAWS.map((u, k) => {
        const x = sx + u * sw;
        const pick = pickFor(u);
        const labelY = k === 2 ? 340 : 354;
        return (
          <Appear key={k} delay={1.5 + k * 0.45} y={-6}>
            <line x1={x} y1={labelY + 5} x2={x} y2={404} stroke="var(--ink)" strokeWidth={1.6} />
            <text x={x} y={labelY} textAnchor="middle" fontSize={11.5} className="mono" fontWeight={650}>
              {`u=${u}`}
            </text>
            <text x={472 + k * 150} y={470} fontSize={12} className="mono" fill="var(--ink-3)">
              {`run ${k + 1}`}
            </text>
            <Chip x={548 + k * 150} y={465} text={CANDS[pick].text} index={pick} fontSize={13} h={26} />
          </Appear>
        );
      })}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Step 7: temperature, live.                                          */
/* ------------------------------------------------------------------ */

function Temperature({ t }: { t: number }) {
  const probs = softmax(LOGITS, t);
  const top = probs[0];
  const regime = t < 0.35 ? "almost greedy" : t < 0.95 ? "sharper than the model" : t <= 1.05 ? "the model's own distribution" : t < 2 ? "flatter, more variety" : "very flat, close to random";
  return (
    <g>
      <ContextReminder />
      <text x={190} y={130} textAnchor="middle" fontSize={13} fontWeight={650} fill="var(--ink-2)">
        logit ÷ T
      </text>
      <text x={420} y={130} textAnchor="middle" fontSize={13} fontWeight={650} fill="var(--ink-2)">
        probability
      </text>
      {CANDS.map((c, i) => (
        <text key={c.id} x={222} y={rowY(i) + 4.5} textAnchor="end" fontSize={13} className="mono" fill="var(--ink-2)">
          {(c.logit / t).toFixed(1)}
        </text>
      ))}
      <ProbList probs={probs} x0={CHIP_X} barX={250} barW={300} textX={624} highlight={0} animateFrom0={false} />
      <Card x={664} y={116} w={266} h={266} />
      <text x={684} y={146} fontSize={14} fontWeight={650}>
        Reading
      </text>
      <text x={684} y={176} fontSize={13} fill="var(--ink-2)">
        top token
      </text>
      <text x={910} y={176} textAnchor="end" fontSize={14} className="mono" fontWeight={700}>
        {`·Paris ${pct(top)}`}
      </text>
      <text x={684} y={204} fontSize={13} fill="var(--ink-2)">
        ·banana
      </text>
      <text x={910} y={204} textAnchor="end" fontSize={14} className="mono" fontWeight={600}>
        {probs[7] < 0.0001 ? "< 0.01%" : pct(probs[7], 2)}
      </text>
      <line x1={684} y1={222} x2={910} y2={222} stroke="var(--rule)" />
      <text x={684} y={248} fontSize={14} fontWeight={650} fill="var(--accent)">
        {regime}
      </text>
      {["T below 1 stretches the gaps.", "T above 1 squeezes them.", "T near 0 turns sampling", "into greedy."].map((l, i) => (
        <text key={i} x={684} y={276 + i * 23} fontSize={13} fill="var(--ink-2)">
          {l}
        </text>
      ))}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Step 8: the autoregressive loop.                                    */
/* ------------------------------------------------------------------ */

const GENERATED: (Tok & { p: number })[] = [
  { text: " Paris", id: 6342, p: 0.81 },
  { text: ".", id: 13, p: 0.58 },
  { text: " It", id: 632, p: 0.24 },
  { text: " is", id: 318, p: 0.47 },
];

function Loop({ playing }: { playing: boolean }) {
  const rows = GENERATED.map((g, k) => ({ ctx: [...CONTEXT, ...GENERATED.slice(0, k)], out: g }));
  const y0 = 108;
  const dy = 92;
  return (
    <g>
      {rows.map((r, k) => {
        const y = y0 + k * dy;
        const lay = layoutRow(
          r.ctx.map((t) => t.text),
          12.5,
          5,
          { x: 112 },
        );
        const end = 112 + lay.total;
        const boxX = 664;
        const outX = 790;
        const d = k * 0.7;
        return (
          <Appear key={k} delay={d}>
            <Pill x={56} y={y} text={`pass ${k + 1}`} fontSize={12} />
            {r.ctx.map((t, i) => (
              <g key={i} opacity={i < CONTEXT.length ? 0.8 : 1}>
                <Chip x={lay.centers[i]} y={y} text={t.text} index={i} fontSize={12.5} h={28} delay={d} highlight={i >= CONTEXT.length && i === r.ctx.length - 1} />
              </g>
            ))}
            <line x1={end + 10} y1={y} x2={boxX - 52} y2={y} stroke="var(--ink)" strokeWidth={1.5} markerEnd="url(#arrow-ink)" />
            <rect x={boxX - 46} y={y - 20} width={92} height={40} rx={10} fill="var(--card)" stroke="var(--ink)" strokeWidth={1.5} />
            <text x={boxX} y={y + 5} textAnchor="middle" fontSize={14} fontWeight={650}>
              GPT
            </text>
            <line x1={boxX + 50} y1={y} x2={outX - 46} y2={y} stroke="var(--ink)" strokeWidth={1.5} markerEnd="url(#arrow-ink)" />
            <Chip x={outX} y={y} text={r.out.text} index={r.ctx.length} fontSize={14} h={30} delay={d + 0.35} highlight />
            <text x={850} y={y + 5} fontSize={13} className="mono" fill="var(--ink-2)">
              {`p ${r.out.p.toFixed(2)}`}
            </text>
            {k < rows.length - 1 && (
              <path
                d={`M ${outX} ${y + 17} C ${outX} ${y + 52}, ${end + 40} ${y + 40}, ${end + 34} ${y + dy - 18}`}
                fill="none"
                stroke="var(--mark)"
                strokeWidth={1.6}
                strokeDasharray="4 4"
                markerEnd="url(#arrow-mark)"
              />
            )}
          </Appear>
        );
      })}
      {playing && <Packet from={[790, y0 + 17]} to={[555, y0 + dy - 18]} playing={playing} duration={1.1} delay={0.8} tone="mark" />}
      <Label x={480} y={500} size={14} color="var(--ink)" delay={2.6}>
        4 new tokens, 4 forward passes. Each pass reads the whole context so far.
      </Label>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Step 9: confident and wrong.                                        */
/* ------------------------------------------------------------------ */

const MARS: Tok[] = [
  { text: "The", id: 464 },
  { text: " first", id: 717 },
  { text: " person", id: 1048 },
  { text: " to", id: 284 },
  { text: " walk", id: 2513 },
  { text: " on", id: 319 },
  { text: " Mars", id: 8706 },
  { text: " was", id: 373 },
];
const MARS_NEXT = [
  { text: " Neil", p: 0.31 },
  { text: " a", p: 0.14 },
  { text: " the", p: 0.1 },
  { text: " John", p: 0.07 },
  { text: " Buzz", p: 0.06 },
  { text: " Elon", p: 0.05 },
];

function Hallucination() {
  const rest = 1 - MARS_NEXT.reduce((a, b) => a + b.p, 0);
  return (
    <g>
      <ChipRow toks={MARS} y={98} cx={480} fontSize={14} gap={6} />
      <Label x={250} y={146} size={13} weight={650}>
        pass 1: who comes next?
      </Label>
      {MARS_NEXT.map((m, i) => {
        const y = 176 + i * 36;
        return (
          <g key={m.text}>
            <Chip x={110} y={y} text={m.text} index={i} fontSize={13.5} h={28} delay={0.2 + i * 0.04} highlight={i === 0} />
            <rect x={160} y={y - 10} width={230} height={20} rx={4} fill="var(--paper-2)" />
            <motion.rect
              x={160}
              y={y - 10}
              height={20}
              rx={4}
              fill={i === 0 ? "var(--mark)" : "var(--accent)"}
              initial={{ width: 0 }}
              animate={{ width: m.p * 230 }}
              transition={{ duration: 0.6, delay: 0.3 + i * 0.05, ease: EASE }}
            />
            <text x={440} y={y + 4.5} textAnchor="end" fontSize={13} className="mono">
              {`${Math.round(m.p * 100)}%`}
            </text>
          </g>
        );
      })}
      <text x={110} y={176 + 6 * 36 + 4} textAnchor="middle" fontSize={12.5} className="mono" fill="var(--ink-3)">
        others
      </text>
      <text x={440} y={176 + 6 * 36 + 4} textAnchor="end" fontSize={13} className="mono" fill="var(--ink-3)">
        {`${Math.round(rest * 100)}%`}
      </text>

      <Appear delay={1.1}>
        <Label x={700} y={146} size={13} weight={650}>
          pass 2: ·Neil is now part of the context
        </Label>
        <Card x={488} y={162} w={430} h={110} />
        <text x={508} y={196} fontSize={13} className="mono" fill="var(--ink-2)">
          … on Mars was ·Neil
        </text>
        <line x1={680} y1={192} x2={730} y2={192} stroke="var(--ink)" strokeWidth={1.4} markerEnd="url(#arrow-ink)" />
        <Chip x={800} y={192} text=" Armstrong" index={1} fontSize={14} h={30} highlight />
        <text x={508} y={246} fontSize={13.5} fill="var(--ink-2)">
          p(·Armstrong) = 0.92. Very sure, given ·Neil.
        </text>
      </Appear>

      <Appear delay={1.8}>
        <Card x={488} y={292} w={430} h={150} tone="bad" />
        <text x={508} y={324} fontSize={15} fontWeight={650}>
          &quot;… was Neil Armstrong.&quot;
        </text>
        {[
          "Fluent, confident, false. Nobody has walked",
          "on Mars. Every step picked a likely token,",
          "and no step asked whether the claim is true.",
        ].map((l, i) => (
          <text key={i} x={508} y={354 + i * 24} fontSize={13.5} fill="var(--ink-2)">
            {l}
          </text>
        ))}
      </Appear>
      <Label x={480} y={490} size={13} delay={2.2}>
        Illustrative numbers. Greedy decoding would make the same mistake: ·Neil is the top token.
      </Label>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Step 10: the training objective.                                    */
/* ------------------------------------------------------------------ */

const SENT: Tok[] = [...CONTEXT, { text: " Paris", id: 6342 }, { text: ".", id: 13 }];

function Training() {
  const xs = SENT.slice(0, 6);
  const ys = SENT.slice(1);
  const colX = (i: number) => 214 + i * 114;
  const focus = 3;
  return (
    <g>
      <text x={30} y={130} fontSize={13} fontWeight={650} fill="var(--ink-2)">
        targets y
      </text>
      <text x={30} y={150} fontSize={11.5} className="mono" fill="var(--ink-3)">
        data[i+1 : i+T+1]
      </text>
      <text x={30} y={398} fontSize={13} fontWeight={650} fill="var(--ink-2)">
        inputs x
      </text>
      <text x={30} y={418} fontSize={11.5} className="mono" fill="var(--ink-3)">
        data[i : i+T]
      </text>

      <rect x={154} y={234} width={690} height={62} rx={14} fill="var(--card)" stroke="var(--ink)" strokeWidth={1.6} />
      <text x={499} y={260} textAnchor="middle" fontSize={15} fontWeight={650}>
        GPT, one forward pass over all 6 positions
      </text>
      <text x={499} y={282} textAnchor="middle" fontSize={12.5} className="mono" fill="var(--ink-2)">
        causal: position t only sees inputs 0 to t
      </text>

      {xs.map((t, i) => (
        <g key={`x${i}`} opacity={i <= focus ? 1 : 0.55}>
          <Chip x={colX(i)} y={404} text={t.text} index={i} fontSize={14} h={32} id={t.id} delay={i * 0.05} />
        </g>
      ))}
      {ys.map((t, i) => (
        <Appear key={`y${i}`} delay={0.5 + i * 0.12}>
          <line x1={colX(i)} y1={386} x2={colX(i)} y2={302} stroke={i === focus ? "var(--mark)" : "var(--rule-strong)"} strokeWidth={i === focus ? 2 : 1.3} />
          <line
            x1={colX(i)}
            y1={232}
            x2={colX(i)}
            y2={160}
            stroke={i === focus ? "var(--mark)" : "var(--ink-3)"}
            strokeWidth={i === focus ? 2 : 1.3}
            markerEnd={i === focus ? "url(#arrow-mark)" : "url(#arrow-muted)"}
          />
          <Chip x={colX(i)} y={138} text={t.text} index={i + 1} fontSize={14} h={32} highlight={i === focus} />
          <text x={colX(i) + 7} y={202} fontSize={11.5} className="mono" fill={i === focus ? "var(--ink)" : "var(--ink-3)"}>
            {`pos ${i}`}
          </text>
        </Appear>
      ))}
      <Appear delay={1.4}>
        <path d={`M ${colX(0) - 44} 436 L ${colX(0) - 44} 446 L ${colX(focus) + 44} 446 L ${colX(focus) + 44} 436`} fill="none" stroke="var(--mark)" strokeWidth={1.6} />
        <text x={(colX(0) + colX(focus)) / 2} y={468} textAnchor="middle" fontSize={13} fill="var(--ink)">
          position 3 sees these 4 inputs and must predict ·is
        </text>
      </Appear>
      <Label x={480} y={504} size={14} color="var(--ink)" delay={1.7}>
        T = 6 inputs give 6 graded predictions in one pass. The text is its own label.
      </Label>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Step 11: recap.                                                     */
/* ------------------------------------------------------------------ */

function Recap() {
  const boxes = [
    { t: "Context", s: "(B, T) ids" },
    { t: "GPT", s: "(B, T, vocab)" },
    { t: "Last row", s: "(B, vocab)" },
    { t: "÷ T, softmax", s: "probs" },
    { t: "Pick", s: "(B, 1) id" },
  ];
  const x0 = 130;
  const dx = 175;
  return (
    <g>
      {boxes.map((b, i) => (
        <g key={b.t}>
          {i > 0 && <Arrow x1={x0 + (i - 1) * dx + 70} y1={176} x2={x0 + i * dx - 72} y2={176} delay={0.1 + i * 0.12} />}
          <Appear delay={i * 0.12}>
            <Box x={x0 + i * dx} y={176} w={136} h={60} title={b.t} sub={b.s} tone={i === 3 ? "accent" : i === 4 ? "mark" : "ink"} />
          </Appear>
        </g>
      ))}
      <motion.path
        d={`M ${x0 + 4 * dx} 208 C ${x0 + 4 * dx} 290, ${x0} 290, ${x0} 212`}
        fill="none"
        stroke="var(--mark)"
        strokeWidth={2}
        strokeDasharray="6 6"
        markerEnd="url(#arrow-mark)"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.8, duration: 1.1, ease: EASE }}
      />
      <Label x={480} y={282} size={13.5} color="var(--ink)" delay={1.4}>
        append the id, run again: one forward pass per new token
      </Label>
      <Appear delay={1.7}>
        <Card x={90} y={330} w={380} h={150} />
        <text x={110} y={360} fontSize={14.5} fontWeight={650}>
          Inference
        </text>
        {["Only the last position's logits are used.", "Shifting all logits changes nothing.", "T < 1 sharper, T > 1 flatter, T → 0 greedy.", "Likely is not the same as true."].map((l, i) => (
          <text key={i} x={110} y={388 + i * 24} fontSize={13.5} fill="var(--ink-2)">
            {l}
          </text>
        ))}
        <Card x={490} y={330} w={380} h={150} />
        <text x={510} y={360} fontSize={14.5} fontWeight={650}>
          Training
        </text>
        {["Every position predicts its next token.", "Targets are the inputs shifted by one.", "A (B, T) batch gives B × T examples.", "Same forward pass, plus a loss (Day 5)."].map((l, i) => (
          <text key={i} x={510} y={388 + i * 24} fontSize={13.5} fill="var(--ink-2)">
            {l}
          </text>
        ))}
      </Appear>
    </g>
  );
}

/* ------------------------------------------------------------------ */

function TemperatureStage({ step }: { step: number }) {
  const [t, setT] = useState(1);
  return (
    <>
      <Svg label="Temperature reshaping the next-token distribution">
        <StationMap step={step} />
        <Temperature t={t} />
      </Svg>
      <StageOverlay position="bottom-right" className="w-[252px]">
        <Slider
          label="Temperature"
          value={t}
          min={0.1}
          max={3}
          step={0.05}
          onChange={setT}
          format={(v) => `T = ${v.toFixed(2)}`}
          hint="Drag it. The bars reshape live."
        />
      </StageOverlay>
    </>
  );
}

export function Stage({ step, playing }: StageProps) {
  if (step === 6) return <TemperatureStage step={step} />;
  return (
    <Svg label="How a language model picks the next token">
      <StationMap step={step} />
      {step === 0 && <Job />}
      {step === 1 && <SoftmaxTable phase="logits" />}
      {step === 2 && <SoftmaxTable phase="exp" />}
      {step === 3 && <SoftmaxTable phase="probs" />}
      {step === 4 && <SoftmaxTable phase="shift" />}
      {step === 5 && <Pick />}
      {step === 7 && <Loop playing={playing} />}
      {step === 8 && <Hallucination />}
      {step === 9 && <Training />}
      {step === 10 && <Recap />}
    </Svg>
  );
}
