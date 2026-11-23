"use client";

import { motion } from "motion/react";
import { TokenizerPlayground } from "@/components/viz/TokenizerPlayground";
import { Appear, Arrow, Bars, Box, Chip, chipWidth, EASE, Label, Pill, Svg } from "@/components/viz/svg";
import type { StageProps } from "@/lib/types";
import { Track } from "./Track";

const TRACK = ["text", "UTF-8 bytes", "BPE merges", "token ids", "model"];
const TRACK_AT: number[][] = [[0, 3], [1], [2], [2], [2], [2, 3], [3], [3, 4], [3, 4], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4]];

interface Tok {
  t: string;
  id?: number | string;
  c: number;
  hl?: boolean;
}

function rowXs(toks: { t: string }[], x0: number, gap: number, fs: number, center = false) {
  const ws = toks.map((k) => chipWidth(k.t, fs));
  const total = ws.reduce((a, b) => a + b, 0) + gap * (toks.length - 1);
  let c = center ? x0 - total / 2 : x0;
  return ws.map((w) => {
    const x = c + w / 2;
    c += w + gap;
    return x;
  });
}

function ChipRow({
  toks,
  x0,
  y,
  fs = 15,
  gap = 6,
  center = false,
  delay = 0,
  stagger = 0.03,
}: {
  toks: Tok[];
  x0: number;
  y: number;
  fs?: number;
  gap?: number;
  center?: boolean;
  delay?: number;
  stagger?: number;
}) {
  const xs = rowXs(toks, x0, gap, fs, center);
  return (
    <g>
      {toks.map((k, i) => (
        <Chip
          key={i}
          x={xs[i]}
          y={y}
          text={k.t}
          id={k.id}
          index={k.c}
          fontSize={fs}
          h={fs + 18}
          delay={delay + i * stagger}
          highlight={k.hl}
        />
      ))}
    </g>
  );
}

/** A heading with a lighter note after it on the same line. */
function Heading({ x, y, title, note, delay = 0 }: { x: number; y: number; title: string; note?: string; delay?: number }) {
  return (
    <Appear delay={delay} y={4}>
      <text x={x} y={y} fontSize={15}>
        <tspan fontWeight={650} fill="var(--ink)">
          {title}
        </tspan>
        {note && (
          <tspan dx={10} fontSize={13} fill="var(--ink-3)">
            {note}
          </tspan>
        )}
      </text>
    </Appear>
  );
}

function Lines({ x, y, lines, size = 13, gap = 19, color = "var(--ink-2)", anchor = "start", delay }: {
  x: number;
  y: number;
  lines: string[];
  size?: number;
  gap?: number;
  color?: string;
  anchor?: "start" | "middle" | "end";
  delay?: number;
}) {
  const node = (
    <text x={x} y={y} fontSize={size} fill={color} textAnchor={anchor}>
      {lines.map((l, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : gap}>
          {l}
        </tspan>
      ))}
    </text>
  );
  return delay === undefined ? node : <Appear delay={delay} y={4}>{node}</Appear>;
}

/* ------------------------------------------------------------------ */
/* Step 1: three ways to cut text                                      */
/* ------------------------------------------------------------------ */

const PHRASE = "the unhappiest cats";

function Granularity() {
  const chars: Tok[] = [...PHRASE].map((ch, i) => ({ t: ch, id: PHRASE.charCodeAt(i), c: i }));
  const words: Tok[] = [
    { t: "the", c: 0 },
    { t: "unhappiest", c: 1 },
    { t: "cats", c: 2 },
  ];
  const subs: Tok[] = [
    { t: "the", id: 1169, c: 0 },
    { t: " unh", id: 14274, c: 1 },
    { t: "app", id: 1324, c: 2 },
    { t: "iest", id: 6386, c: 3 },
    { t: " cats", id: 11875, c: 4 },
  ];
  const wordXs = rowXs(words, 48, 12, 15);
  const unW = chipWidth("unhappiest", 15);
  return (
    <g>
      <Heading x={48} y={96} title="Characters" note="19 tokens. A tiny vocabulary, but very long sequences." />
      <Pill x={860} y={91} text="vocab ~100" tone="muted" />
      <ChipRow toks={chars} x0={48} y={132} fs={14} gap={4} stagger={0.02} />

      <Heading x={48} y={222} title="Words" note="3 tokens. Short, but the vocabulary is huge." delay={0.35} />
      <Pill x={860} y={217} text="vocab 100k+" tone="muted" />
      <ChipRow toks={words} x0={48} y={258} gap={12} delay={0.4} />
      <Appear delay={0.7}>
        <rect
          x={wordXs[1] - unW / 2 - 6}
          y={258 - 23}
          width={unW + 12}
          height={46}
          rx={11}
          fill="none"
          stroke="var(--bad)"
          strokeWidth={1.5}
          strokeDasharray="5 4"
        />
        <text x={wordXs[2] + 60} y={263} fontSize={13} fill="var(--bad)">
          not in the 100k-word list
        </text>
      </Appear>

      <Heading x={48} y={340} title="Subwords (GPT-2)" note="5 tokens. Common words whole, rare words in pieces." delay={0.7} />
      <Pill x={860} y={335} text="vocab 50,257" tone="mark" />
      <ChipRow toks={subs} x0={48} y={376} gap={8} delay={0.8} stagger={0.06} />
      <Label x={48} y={452} size={13} anchor="start" color="var(--ink-3)" delay={1.2}>
        Numbers under the chips are ids: byte values for characters, real GPT-2 ids for subwords.
      </Label>
      <Label x={48} y={474} size={13} anchor="start" color="var(--ink-3)" delay={1.3}>
        The split follows frequency, not grammar: unh + app + iest.
      </Label>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Step 2: UTF-8 bytes                                                 */
/* ------------------------------------------------------------------ */

const GLYPHS = [
  { ch: "a", cp: "U+0061", bytes: [97], x: 140 },
  { ch: "é", cp: "U+00E9", bytes: [195, 169], x: 340 },
  { ch: "ನ", cp: "U+0CA8 (Kannada)", bytes: [224, 178, 168], x: 570 },
  { ch: "🙂", cp: "U+1F642", bytes: [240, 159, 153, 130], x: 800 },
];
const BPE_TEXT = "aaabdaaabac";

function Bytes() {
  const bw = 42;
  return (
    <g>
      {GLYPHS.map((g, gi) => {
        const total = g.bytes.length * bw + (g.bytes.length - 1) * 5;
        return (
          <Appear key={g.ch} delay={gi * 0.18}>
            <text x={g.x} y={122} textAnchor="middle" fontSize={42} fontWeight={600} fill="var(--ink)">
              {g.ch}
            </text>
            <text x={g.x} y={150} textAnchor="middle" fontSize={12} className="mono" fill="var(--ink-3)">
              {g.cp}
            </text>
            {g.bytes.map((b, i) => {
              const bx = g.x - total / 2 + i * (bw + 5);
              return (
                <g key={i}>
                  <rect x={bx} y={170} width={bw} height={30} rx={7} fill="var(--card)" stroke="var(--ink-2)" strokeWidth={1.2} />
                  <text x={bx + bw / 2} y={190} textAnchor="middle" fontSize={14} className="mono" fontWeight={600} fill="var(--ink)">
                    {b}
                  </text>
                </g>
              );
            })}
            <text x={g.x} y={224} textAnchor="middle" fontSize={13} fill="var(--ink-2)">
              {g.bytes.length} {g.bytes.length === 1 ? "byte" : "bytes"}
            </text>
          </Appear>
        );
      })}

      <line x1={48} x2={912} y1={262} y2={262} stroke="var(--rule)" strokeWidth={1} />

      <Appear delay={0.8} y={4}>
        <text x={480} y={300} textAnchor="middle" fontSize={15}>
          <tspan fontWeight={650} fill="var(--ink)">
            The text we will compress
          </tspan>
          <tspan dx={10} fontSize={13} fill="var(--ink-3)">
            11 characters, 11 bytes, so 11 tokens to start.
          </tspan>
        </text>
      </Appear>
      <ChipRow
        toks={[...BPE_TEXT].map((ch) => ({ t: ch, id: ch.charCodeAt(0), c: ch.charCodeAt(0) - 97 }))}
        x0={480}
        center
        y={344}
        gap={8}
        delay={0.9}
        stagger={0.04}
      />
      <Appear delay={1.4}>
        <Pill x={480} y={432} text="256 possible byte values = 256 base tokens. Nothing is ever unknown." tone="mark" fontSize={13} mono={false} strong />
      </Appear>
      <Label x={480} y={472} size={13} color="var(--ink-3)" delay={1.6}>
        The cost: bytes are short, so sequences get long. Kannada needs 3 bytes per letter.
      </Label>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Steps 3 to 5: byte pair encoding on aaabdaaabac                     */
/* ------------------------------------------------------------------ */

const NAME: Record<number, string> = { 97: "a", 98: "b", 99: "c", 100: "d", 256: "aa", 257: "aaa", 258: "aaab" };
const TINT: Record<number, number> = { 97: 0, 98: 1, 99: 2, 100: 3, 256: 4, 257: 5, 258: 6 };
const MERGES: [number, number, number][] = [
  [97, 97, 256],
  [256, 97, 257],
  [257, 98, 258],
];
const ROW0 = [...BPE_TEXT].map((ch) => ch.charCodeAt(0));

function applyMerge(ids: number[], a: number, b: number, idx: number) {
  const out: { id: number; src: number[] }[] = [];
  let i = 0;
  while (i < ids.length) {
    if (i < ids.length - 1 && ids[i] === a && ids[i + 1] === b) {
      out.push({ id: idx, src: [i, i + 1] });
      i += 2;
    } else {
      out.push({ id: ids[i], src: [i] });
      i += 1;
    }
  }
  return out;
}

const HISTORY: { ids: number[]; src: number[][] }[] = [{ ids: ROW0, src: ROW0.map((_, i) => [i]) }];
for (const [a, b, idx] of MERGES) {
  const out = applyMerge(HISTORY[HISTORY.length - 1].ids, a, b, idx);
  HISTORY.push({ ids: out.map((o) => o.id), src: out.map((o) => o.src) });
}

function pairCounts(ids: number[]) {
  const counts = new Map<string, { a: number; b: number; n: number }>();
  for (let i = 0; i < ids.length - 1; i++) {
    const k = `${ids[i]},${ids[i + 1]}`;
    const cur = counts.get(k);
    if (cur) cur.n += 1;
    else counts.set(k, { a: ids[i], b: ids[i + 1], n: 1 });
  }
  return [...counts.values()].sort((p, q) => q.n - p.n);
}

const ROW_Y = [146, 231, 316, 401];
const ROW_X0 = 150;
const ROW_NOTE = ["bytes", "merge 1", "merge 2", "merge 3"];

function BpeRows({ upto, newRow }: { upto: number; newRow: number }) {
  const xsByRow = HISTORY.map((h) => rowXs(h.ids.map((id) => ({ t: NAME[id] })), ROW_X0, 8, 15));
  return (
    <g>
      {ROW_Y.map((y, r) =>
        r <= upto ? null : (
          <Appear key={`ghost${r}`} delay={0.3} y={0}>
            <rect x={ROW_X0 - 8} y={y - 22} width={420} height={44} rx={10} fill="none" stroke="var(--rule-strong)" strokeDasharray="5 5" />
            <text x={48} y={y + 1} fontSize={14} fontWeight={650} fill="var(--ink-3)">
              ? tokens
            </text>
            <text x={48} y={y + 19} fontSize={12} fill="var(--ink-3)">
              {ROW_NOTE[r]}
            </text>
          </Appear>
        ),
      )}
      {HISTORY.slice(0, upto + 1).map((h, r) => {
        const isNew = r >= newRow;
        const base = isNew ? 0.5 + (r - newRow) * 0.9 : 0;
        return (
          <g key={r}>
            <Appear delay={base} y={0}>
              <text x={48} y={ROW_Y[r] + 1} fontSize={14} fontWeight={650} fill="var(--ink)">
                {h.ids.length} tokens
              </text>
              <text x={48} y={ROW_Y[r] + 19} fontSize={12} fill="var(--ink-3)">
                {ROW_NOTE[r]}
              </text>
            </Appear>
            {r > 0 &&
              h.src.map((src, j) =>
                src.map((s) => {
                  const merged = src.length > 1;
                  return (
                    <motion.line
                      key={`${j}-${s}`}
                      x1={xsByRow[r - 1][s]}
                      y1={ROW_Y[r - 1] + 37}
                      x2={xsByRow[r][j]}
                      y2={ROW_Y[r] - 19}
                      stroke={merged ? "var(--mark)" : "var(--rule-strong)"}
                      strokeWidth={merged ? 2.2 : 1}
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.45, delay: Math.max(0, base - 0.35), ease: EASE }}
                    />
                  );
                }),
              )}
            <ChipRow
              toks={h.ids.map((id, j) => ({
                t: NAME[id],
                id,
                c: TINT[id],
                hl: r > 0 && r === upto && h.src[j].length > 1,
              }))}
              x0={ROW_X0}
              y={ROW_Y[r]}
              gap={8}
              delay={base}
              stagger={isNew ? 0.04 : 0}
            />
          </g>
        );
      })}
    </g>
  );
}

function PairArcs() {
  const xs = rowXs(ROW0.map((id) => ({ t: NAME[id] })), ROW_X0, 8, 15);
  const y = ROW_Y[0] - 21;
  return (
    <g>
      {ROW0.slice(0, -1).map((id, i) => {
        const hot = id === 97 && ROW0[i + 1] === 97;
        const x1 = xs[i] + 3;
        const x2 = xs[i + 1] - 3;
        const lift = hot ? (i % 2 === 0 ? 20 : 30) : 16;
        return (
          <motion.path
            key={i}
            d={`M ${x1} ${y} Q ${(x1 + x2) / 2} ${y - lift} ${x2} ${y}`}
            fill="none"
            stroke={hot ? "var(--mark)" : "var(--rule-strong)"}
            strokeWidth={hot ? 2.2 : 1.3}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.35, delay: 0.4 + i * 0.09, ease: EASE }}
          />
        );
      })}
    </g>
  );
}

function PairTable() {
  const stats = pairCounts(ROW0);
  return (
    <g>
      <Heading x={640} y={96} title="Pair counts" note="in the 11 bytes" delay={0.3} />
      <Bars
        x={700}
        y={112}
        labels={stats.map((s) => `(${NAME[s.a]}, ${NAME[s.b]})`)}
        values={stats.map((s) => s.n)}
        width={140}
        row={30}
        max={4}
        highlight={0}
        delay={1.3}
        format={(v) => `${v}`}
        color="var(--rule-strong)"
      />
      <Appear delay={2}>
        <Pill x={770} y={324} text="most frequent: (a, a), so it becomes id 256" tone="mark" fontSize={12.5} mono={false} />
      </Appear>
      <Lines
        x={640}
        y={372}
        lines={["(a, a) counts 4 because each aaa", "holds two overlapping pairs."]}
        color="var(--ink-3)"
        delay={2.2}
      />
    </g>
  );
}

function MergeList({ count, newFrom }: { count: number; newFrom: number }) {
  return (
    <g>
      <Heading x={640} y={96} title="Merges learned" note="in order" />
      {MERGES.slice(0, count).map(([a, b, idx], k) => {
        const y = 140 + k * 62;
        const delay = k >= newFrom ? 0.6 + (k - newFrom) * 0.9 : 0;
        return (
          <Appear key={idx} delay={delay}>
            <rect x={636} y={y - 22} width={280} height={52} rx={10} fill="var(--card)" stroke="var(--rule)" />
            <text x={652} y={y + 1} fontSize={14} className="mono" fontWeight={600} fill="var(--ink-3)">
              {k + 1}
            </text>
            <text x={674} y={y + 1} fontSize={14} className="mono" fill="var(--ink)">
              ({a}, {b}) → {idx}
            </text>
            <text x={674} y={y + 19} fontSize={12} fill="var(--ink-3)">
              {NAME[a]} + {NAME[b]}
            </text>
            <Chip x={872} y={y + 3} text={NAME[idx]} index={TINT[idx]} fontSize={14} h={30} delay={delay + 0.1} />
          </Appear>
        );
      })}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Step 6: vocabulary size                                             */
/* ------------------------------------------------------------------ */

function VocabSize() {
  const labels = ["bytes", "GPT-2", "GPT-4o"];
  return (
    <g>
      <Heading x={48} y={92} title="Tokens for the same text" />
      <Label x={48} y={122} size={13} anchor="start" color="var(--ink-3)">
        an English sentence, 127 characters
      </Label>
      <Bars x={124} y={132} labels={labels} values={[127, 26, 24]} width={250} row={28} max={127} format={(v) => `${v}`} delay={0.2} highlight={2} />
      <Label x={48} y={250} size={13} anchor="start" color="var(--ink-3)">
        a Kannada sentence, 20 code points
      </Label>
      <Bars x={124} y={260} labels={labels} values={[56, 55, 10]} width={250} row={28} max={127} format={(v) => `${v}`} delay={0.5} highlight={2} />

      <Heading x={520} y={92} title="Embedding table size" note="if C = 768" />
      <Label x={520} y={122} size={13} anchor="start" color="var(--ink-3)">
        one row of 768 numbers per token
      </Label>
      <Bars
        x={596}
        y={132}
        labels={labels}
        values={[256 * 768, 50257 * 768, 200000 * 768]}
        width={200}
        row={28}
        format={(v) => `${(v / 1e6).toFixed(1)}M`}
        delay={0.8}
        color="var(--violet)"
      />
      <Lines
        x={520}
        y={250}
        lines={["The output layer has one logit per token too,", "so it grows the same way. Rare tokens also", "get fewer training examples each."]}
        delay={1.1}
      />

      <Appear delay={1.4}>
        <Pill x={480} y={392} text="GPT-2: 50,257 = 256 bytes + 50,000 merges + 1 special token" tone="mark" fontSize={13} strong />
      </Appear>
      <Appear delay={1.7}>
        <line x1={250} x2={710} y1={452} y2={452} stroke="var(--ink-3)" strokeWidth={1.4} markerStart="url(#arrow-muted)" markerEnd="url(#arrow-muted)" />
        <text x={236} y={457} textAnchor="end" fontSize={13} fill="var(--ink-2)">
          small vocab: long sequences
        </text>
        <text x={724} y={457} fontSize={13} fill="var(--ink-2)">
          big vocab: big tables
        </text>
      </Appear>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Step 8: strawberry and arithmetic                                   */
/* ------------------------------------------------------------------ */

/** Same id, same color: each distinct id gets the next tint in order of appearance. */
function colorById(toks: Tok[]) {
  const seen = new Map<number | string | undefined, number>();
  for (const k of toks) {
    if (!seen.has(k.id)) seen.set(k.id, seen.size);
    k.c = seen.get(k.id) ?? 0;
  }
}

function Spelling() {
  const letters = [..."strawberry"];
  const question: Tok[] = [
    ["How", 5299],
    [" many", 1991],
    [" r", 428],
    ["'s", 885],
    [" are", 553],
    [" in", 306],
    [" strawberry", 101830],
    ["?", 30],
  ].map(([t, id], i) => ({ t: t as string, id, c: i, hl: id === 101830 }));
  const nospace: Tok[] = [
    { t: "st", id: 302, c: 0 },
    { t: "raw", id: 1618, c: 1 },
    { t: "berry", id: 19772, c: 2 },
  ];
  const gpt2: Tok[] = [
    ["123", 10163],
    ["456", 29228],
    [" +", 1343],
    [" 65", 6135],
    ["43", 3559],
    ["21", 2481],
    [" =", 796],
    [" 777", 35534],
    ["777", 29331],
  ].map(([t, id], i) => ({ t: t as string, id, c: 0, hl: i >= 3 && i <= 5 }));
  colorById(gpt2);
  const gpt4o: Tok[] = [
    ["123", 7633],
    ["456", 19354],
    [" +", 659],
    [" ", 220],
    ["654", 43200],
    ["321", 26293],
    [" =", 314],
    [" ", 220],
    ["777", 16307],
    ["777", 16307],
  ].map(([t, id], i) => ({ t: t as string, id, c: 0, hl: i === 4 || i === 5 }));
  colorById(gpt4o);
  return (
    <g>
      <Label x={48} y={104} size={14} anchor="start" weight={650} color="var(--ink)">
        You see
      </Label>
      {letters.map((ch, i) => {
        const x = 190 + i * 34;
        const r = ch === "r";
        return (
          <Appear key={i} delay={i * 0.04} y={4}>
            <rect x={x} y={84} width={30} height={30} rx={6} fill={r ? "var(--mark-soft)" : "var(--card)"} stroke={r ? "var(--mark)" : "var(--rule-strong)"} strokeWidth={r ? 1.6 : 1} />
            <text x={x + 15} y={104} textAnchor="middle" fontSize={15} className="mono" fontWeight={600} fill="var(--ink)">
              {ch}
            </text>
          </Appear>
        );
      })}
      <Label x={540} y={104} size={13} anchor="start" color="var(--ink-3)">
        10 letters, 3 of them r
      </Label>

      <Label x={48} y={168} size={14} anchor="start" weight={650} color="var(--ink)" delay={0.5}>
        GPT-4o sees
      </Label>
      <ChipRow toks={question} x0={190} y={163} fs={14} gap={6} delay={0.6} stagger={0.05} />
      <Label x={48} y={240} size={13} anchor="start" color="var(--ink-3)" delay={1.1}>
        no space before it
      </Label>
      <ChipRow toks={nospace} x0={190} y={235} fs={14} gap={6} delay={1.2} stagger={0.06} />
      <Label x={380} y={240} size={13} anchor="start" color="var(--ink-3)" delay={1.3}>
        same word, three different tokens
      </Label>

      <line x1={48} x2={912} y1={290} y2={290} stroke="var(--rule)" />

      <text x={48} y={326} fontSize={14}>
        <tspan fontWeight={650} fill="var(--ink)">
          Numbers
        </tspan>
        <tspan dx={10} className="mono" fontSize={13} fill="var(--ink-3)">
          123456 + 654321 = 777777
        </tspan>
      </text>
      <Label x={48} y={372} size={13} anchor="start" weight={600} color="var(--ink-2)" delay={1.5}>
        GPT-2
      </Label>
      <ChipRow toks={gpt2} x0={190} y={367} fs={14} gap={6} delay={1.6} stagger={0.05} />
      <Label x={48} y={446} size={13} anchor="start" weight={600} color="var(--ink-2)" delay={2.1}>
        GPT-4o
      </Label>
      <ChipRow toks={gpt4o} x0={190} y={441} fs={14} gap={6} delay={2.2} stagger={0.05} />
      <Lines x={706} y={358} lines={["GPT-2: 654321 becomes", "65, 43, 21 but 123456", "becomes 123, 456."]} size={12.5} gap={17} color="var(--ink-3)" delay={2.0} />
      <Lines x={706} y={432} lines={["GPT-4o: groups of three", "from the left."]} size={12.5} gap={17} color="var(--ink-3)" delay={2.6} />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Step 9: spaces, languages, special tokens                           */
/* ------------------------------------------------------------------ */

function Quirks() {
  const the: Tok[] = [
    { t: "the", id: 3086, c: 0 },
    { t: " the", id: 290, c: 1 },
    { t: "The", id: 976, c: 2 },
    { t: " The", id: 623, c: 3 },
  ];
  return (
    <g>
      <Heading x={48} y={92} title="One word, four ids" note="GPT-4o" />
      <ChipRow toks={the} x0={48} y={140} gap={14} delay={0.2} stagger={0.1} />
      <Lines x={48} y={200} lines={["The leading space is part of the token.", "The model has to learn these mean the same."]} delay={0.7} />

      <Heading x={500} y={92} title="Same meaning, different price" delay={0.4} />
      <text x={500} y={124} fontSize={15} fill="var(--ink-2)">
        <tspan className="mono">I like strawberry</tspan>
        <tspan dx={14}>ನನಗೆ ಸ್ಟ್ರಾಬೆರಿ ಇಷ್ಟ</tspan>
      </text>
      <Bars
        x={628}
        y={140}
        labels={["English, GPT-4o", "Kannada, GPT-4o", "Kannada, GPT-2"]}
        values={[3, 10, 55]}
        width={170}
        row={28}
        max={55}
        highlight={2}
        format={(v) => `${v} tokens`}
        delay={0.7}
      />
      <Lines x={500} y={250} lines={["Fewer merges for a language means more tokens:", "higher cost, less fits in the context."]} delay={1.1} />

      <line x1={48} x2={912} y1={300} y2={300} stroke="var(--rule)" />

      <Heading x={48} y={338} title="Special tokens" note="added by hand after BPE training, never made by merges" delay={1.3} />
      <Appear delay={1.5}>
        <rect x={60} y={366} width={250} height={44} rx={10} fill="var(--card-2)" stroke="var(--rule-strong)" />
        <text x={185} y={393} textAnchor="middle" fontSize={13.5} fill="var(--ink-2)">
          ...the end of one web page.
        </text>
        <rect x={650} y={366} width={250} height={44} rx={10} fill="var(--card-2)" stroke="var(--rule-strong)" />
        <text x={775} y={393} textAnchor="middle" fontSize={13.5} fill="var(--ink-2)">
          An unrelated article starts...
        </text>
      </Appear>
      <Chip x={480} y={388} text="<|endoftext|>" id="50256 in GPT-2 (its last id), 199999 in GPT-4o" index={3} highlight delay={1.8} />
      <Lines
        x={480}
        y={462}
        anchor="middle"
        lines={["GPT-2 puts it between documents during training, so it learns where one text ends."]}
        color="var(--ink-3)"
        delay={2.1}
      />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Step 10: the tokenizer is its own stage                             */
/* ------------------------------------------------------------------ */

function Separate() {
  const y = 372;
  return (
    <g>
      <Label x={48} y={86} size={13} anchor="start" weight={650} color="var(--ink-2)">
        Once, before the LLM is trained
      </Label>
      <Box x={150} y={140} w={190} h={60} title="Tokenizer corpus" sub="its own text" />
      <Arrow x1={248} y1={140} x2={318} y2={140} delay={0.2} />
      <Box x={410} y={140} w={170} h={60} title="BPE training" sub="count, merge, repeat" />
      <Arrow x1={498} y1={140} x2={568} y2={140} delay={0.4} />
      <Box x={670} y={140} w={190} h={60} title="Merges + vocab" sub="frozen from now on" tone="mark" />

      <Label x={48} y={286} size={13} anchor="start" weight={650} color="var(--ink-2)" delay={0.6}>
        Every time you use the model
      </Label>
      <Appear delay={0.7}>
        <Pill x={72} y={y} text="text" />
        <Box x={196} y={y} w={112} h={56} title="encode" />
        <Pill x={330} y={y} text="ids" tone="accent" />
        <Box x={480} y={y} w={150} h={78} title="LLM" sub="ids in, ids out" tone="accent" />
        <Pill x={630} y={y} text="ids" tone="accent" />
        <Box x={764} y={y} w={112} h={56} title="decode" />
        <Pill x={888} y={y} text="text" />
      </Appear>
      <Arrow x1={96} y1={y} x2={136} y2={y} delay={0.9} />
      <Arrow x1={254} y1={y} x2={306} y2={y} delay={1.0} />
      <Arrow x1={354} y1={y} x2={401} y2={y} delay={1.1} />
      <Arrow x1={558} y1={y} x2={606} y2={y} delay={1.2} />
      <Arrow x1={654} y1={y} x2={704} y2={y} delay={1.3} />
      <Arrow x1={822} y1={y} x2={862} y2={y} delay={1.4} />

      <Arrow x1={620} y1={172} x2={210} y2={340} tone="mark" dashed bend={-30} delay={1.6} />
      <Arrow x1={720} y1={172} x2={764} y2={340} tone="mark" dashed bend={-10} delay={1.7} />
      <Label x={480} y={462} size={13} color="var(--ink-3)" delay={2}>
        Text exists only outside the LLM. Inside, there are only integer ids.
      </Label>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Step 11: recap                                                      */
/* ------------------------------------------------------------------ */

const CARDS = [
  { title: "Start from bytes", lines: ["UTF-8 gives 256 base tokens.", "Any text in any language fits,", "so nothing is ever unknown."] },
  { title: "Merge the top pair, repeat", lines: ["Count adjacent pairs, merge the", "most frequent into a new id.", "aaabdaaabac: 11, 9, 7, 5 tokens."] },
  { title: "Vocabulary size is a trade-off", lines: ["Bigger: shorter sequences, but", "bigger embedding and output layers.", "GPT-2 50,257. GPT-4o about 200k."] },
  { title: "The model sees ids, not letters", lines: ["Spelling, arithmetic and non-English", "text suffer. The tokenizer is a", "separate, frozen stage."] },
];

function RecapVisual({ i, x, y }: { i: number; x: number; y: number }) {
  if (i === 0) {
    return (
      <g>
        <text x={x + 30} y={y + 5} fontSize={18} fontWeight={600} fill="var(--ink)">
          ನ
        </text>
        {[224, 178, 168].map((b, k) => (
          <g key={b}>
            <rect x={x + 62 + k * 46} y={y - 13} width={40} height={26} rx={6} fill="var(--card)" stroke="var(--ink-2)" />
            <text x={x + 82 + k * 46} y={y + 5} textAnchor="middle" fontSize={13} className="mono" fill="var(--ink)">
              {b}
            </text>
          </g>
        ))}
      </g>
    );
  }
  if (i === 1) {
    return (
      <g>
        {[11, 9, 7, 5].map((n, k) => (
          <g key={n}>
            <Pill x={x + 52 + k * 66} y={y} text={`${n}`} tone={k === 3 ? "mark" : "muted"} fontSize={13} />
            {k < 3 && (
              <line x1={x + 70 + k * 66} x2={x + 96 + k * 66} y1={y} y2={y} stroke="var(--ink-3)" strokeWidth={1.4} markerEnd="url(#arrow-muted)" />
            )}
          </g>
        ))}
        <text x={x + 268} y={y + 5} fontSize={13} fill="var(--ink-3)">
          tokens
        </text>
      </g>
    );
  }
  if (i === 2) {
    return (
      <g>
        <Pill x={x + 80} y={y} text="256" tone="muted" />
        <Pill x={x + 190} y={y} text="50,257" tone="mark" />
        <Pill x={x + 310} y={y} text="~200k" tone="muted" />
        <line x1={x + 104} x2={x + 150} y1={y} y2={y} stroke="var(--ink-3)" strokeWidth={1.4} markerEnd="url(#arrow-muted)" />
        <line x1={x + 230} x2={x + 278} y1={y} y2={y} stroke="var(--ink-3)" strokeWidth={1.4} markerEnd="url(#arrow-muted)" />
      </g>
    );
  }
  return (
    <g>
      <Chip x={x + 92} y={y} text=" strawberry" index={6} fontSize={14} h={28} />
      <text x={x + 162} y={y + 5} fontSize={13} className="mono" fill="var(--ink-3)">
        = id 101830, no letters inside
      </text>
    </g>
  );
}

function Recap() {
  return (
    <g>
      {CARDS.map((c, i) => {
        const x = i % 2 === 0 ? 60 : 496;
        const y = i < 2 ? 76 : 290;
        return (
          <Appear key={c.title} delay={i * 0.2}>
            <rect x={x} y={y} width={404} height={190} rx={16} fill="var(--card)" stroke="var(--ink)" strokeWidth={1.4} />
            <circle cx={x + 32} cy={y + 34} r={14} fill="var(--mark-soft)" stroke="var(--mark)" strokeWidth={1.4} />
            <text x={x + 32} y={y + 39} textAnchor="middle" fontSize={14} fontWeight={700} fill="var(--ink)">
              {i + 1}
            </text>
            <text x={x + 58} y={y + 40} fontSize={17} fontWeight={650} fill="var(--ink)">
              {c.title}
            </text>
            <Lines x={x + 28} y={y + 78} lines={c.lines} size={14.5} gap={24} color="var(--ink-2)" />
            <RecapVisual i={i} x={x} y={y + 156} />
          </Appear>
        );
      })}
    </g>
  );
}

/* ------------------------------------------------------------------ */

const TRY_PRESETS = [
  { label: "Strawberry", text: "How many r's are in strawberry?" },
  { label: "Arithmetic", text: "123456 + 654321 = 777777" },
  { label: "Kannada", text: "ನನಗೆ ಸ್ಟ್ರಾಬೆರಿ ಇಷ್ಟ" },
  { label: "Spaces", text: "the cat. The cat saw the dog." },
  { label: "Code", text: "def forward(self, x):\n    return self.head(x)" },
  { label: "Special", text: "<|endoftext|>" },
];

export function Stage({ step }: StageProps) {
  if (step === 6) {
    return (
      <div className="absolute inset-0 p-2.5 sm:p-5">
        <div className="h-full overflow-hidden rounded-xl border border-rule bg-card/95 p-3 shadow-[var(--shadow-2)] sm:p-4">
          <TokenizerPlayground initial="How many r's are in strawberry? And is 9.11 bigger than 9.9?" presets={TRY_PRESETS} showVectors={false} compact />
        </div>
      </div>
    );
  }

  return (
    <Svg label="Tokenization with byte pair encoding">
      <Track items={TRACK} at={TRACK_AT[step] ?? []} />
      {step === 0 && <Granularity />}
      {step === 1 && <Bytes />}
      {step === 2 && (
        <>
          <BpeRows upto={0} newRow={1} />
          <PairArcs />
          <PairTable />
        </>
      )}
      {step === 3 && (
        <>
          <BpeRows upto={1} newRow={1} />
          <MergeList count={1} newFrom={0} />
          <Lines
            x={640}
            y={252}
            lines={["Each aaa holds two (a, a) pairs, but a", "byte can join only one token. Scanning", "left to right, aaa becomes aa + a."]}
            size={12.5}
            gap={18}
            color="var(--ink-3)"
            delay={1.3}
          />
          <Appear delay={1.6}>
            <Pill x={776} y={420} text="vocab: 256 + 1 = 257" tone="mark" />
          </Appear>
        </>
      )}
      {step === 4 && (
        <>
          <BpeRows upto={3} newRow={2} />
          <MergeList count={3} newFrom={1} />
          <Lines
            x={640}
            y={346}
            lines={["Merge 2 was a tie: (256, 97) and", "(97, 98) both appear twice.", "max() keeps the pair it saw first."]}
            size={12.5}
            gap={18}
            color="var(--ink-3)"
            delay={2.6}
          />
          <Appear delay={2.8}>
            <Pill x={776} y={452} text="vocab: 256 + 3 = 259" tone="mark" />
          </Appear>
        </>
      )}
      {step === 5 && <VocabSize />}
      {step === 7 && <Spelling />}
      {step === 8 && <Quirks />}
      {step === 9 && <Separate />}
      {step === 10 && <Recap />}
    </Svg>
  );
}
