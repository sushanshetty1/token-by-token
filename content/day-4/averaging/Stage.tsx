"use client";

import { motion } from "motion/react";
import { Appear, Arrow, Bars, Box, Cells, Chip, Label, Pill, Svg, chipWidth, textWidth, EASE } from "@/components/viz/svg";
import { seededVector } from "@/lib/color";
import type { StageProps } from "@/lib/types";
import { BANK, NEXT8, SUMS, THREE_WAYS, TOK, TRIL, WEI, X, XBOW } from "./data";
import { Card, ColTokens, Mat, RowChips, WCOLOR, cellY, num, short, useTicker, vec } from "./kit";
import { Try } from "./Try";

/** Centers for a row of chips laid out around cx. */
function chipRow(tokens: string[], cx: number, gap: number, fs: number) {
  const ws = tokens.map((t) => chipWidth(t, fs));
  const total = ws.reduce((a, b) => a + b, 0) + gap * (tokens.length - 1);
  let x = cx - total / 2;
  return ws.map((w) => {
    const c = x + w / 2;
    x += w + gap;
    return c;
  });
}

function Context() {
  const A = ["the", "river", "bank"];
  const B = ["the", "central", "bank"];
  const ax = chipRow(A, 250, 14, 16);
  const bx = chipRow(B, 710, 14, 16);
  const emb = seededVector("bank", 6);
  return (
    <Svg label="Bank has the same embedding in two sentences">
      <Label x={480} y={46} size={15} weight={650} color="var(--ink)">
        Same token, same vector. The meaning has to come from the neighbours.
      </Label>
      {A.map((t, i) => (
        <Chip key={`a${i}`} x={ax[i]} y={128} text={t} index={i} fontSize={16} h={38} delay={i * 0.06} highlight={i === 2} />
      ))}
      {B.map((t, i) => (
        <Chip key={`b${i}`} x={bx[i]} y={128} text={t} index={i === 1 ? 5 : i} fontSize={16} h={38} delay={0.2 + i * 0.06} highlight={i === 2} />
      ))}
      <Arrow x1={ax[2]} y1={150} x2={432} y2={256} delay={0.4} />
      <Arrow x1={bx[2]} y1={150} x2={528} y2={256} delay={0.4} />
      <Appear delay={0.6}>
        <Cells x={480 - 130} y={266} values={emb} cell={40} gap={4} showValues outline />
        <Label x={480} y={336} size={13}>
          embedding of bank: one row of the table
        </Label>
      </Appear>
      <Appear delay={1.1}>
        <Arrow x1={ax[1]} y1={106} x2={ax[2] - 6} y2={106} bend={-34} tone="accent" delay={1.1} />
        <Pill x={(ax[1] + ax[2]) / 2} y={78} text="water" tone="accent" />
        <Arrow x1={bx[1]} y1={106} x2={bx[2] - 6} y2={106} bend={-34} tone="accent" delay={1.2} />
        <Pill x={(bx[1] + bx[2]) / 2} y={78} text="money" tone="accent" />
      </Appear>
      <Arrow x1={420} y1={348} x2={290} y2={412} tone="accent" dashed delay={1.5} label="+ river" />
      <Arrow x1={540} y1={348} x2={670} y2={412} tone="accent" dashed delay={1.5} label="+ central" />
      <Appear delay={1.8}>
        <Box x={250} y={448} w={260} h={60} title="bank, by the water" sub="after reading river" tone="accent" />
        <Box x={710} y={448} w={260} h={60} title="bank, the institution" sub="after reading central" tone="accent" />
      </Appear>
    </Svg>
  );
}

function LookBack() {
  const xs = [200, 360, 520, 680];
  const cy = 156;
  const gx = 300;
  const gy = 286;
  const cell = 46;
  const gap = 5;
  const allowed = TRIL.map((row) => row.map((v) => v * 0.45));
  return (
    <Svg label="Each token may read itself and earlier tokens">
      {TOK.map((t, i) => (
        <g key={i}>
          <Chip x={xs[i]} y={cy} text={t} index={i} fontSize={16} h={38} highlight={i === BANK} delay={i * 0.05} />
          <Label x={xs[i]} y={cy + 40} size={12} mono color="var(--ink-3)">
            {`next: ${NEXT8[i]}`}
          </Label>
        </g>
      ))}
      <Arrow x1={xs[0]} y1={cy - 21} x2={xs[2] - 16} y2={cy - 22} bend={-86} tone="ok" delay={0.3} />
      <Arrow x1={xs[1] + 4} y1={cy - 21} x2={xs[2] - 6} y2={cy - 22} bend={-34} tone="ok" delay={0.45} />
      <Arrow x1={xs[3]} y1={cy - 21} x2={xs[2] + 16} y2={cy - 22} bend={40} tone="bad" dashed delay={0.7} />
      <Appear delay={1.1} y={0}>
        <Pill x={600} y={100} text="no peeking" tone="bad" />
        <Pill x={360} y={66} text="allowed" tone="ok" />
      </Appear>

      <Appear delay={0.9}>
        <text x={gx + 96} y={gy - 34} textAnchor="middle" fontSize={13} fontWeight={650} fill="var(--ink-2)">
          column: a token it may read
        </text>
        <ColTokens x={gx} y={gy - 10} tokens={TOK} cell={cell} gap={gap} />
        <text
          x={gx - 78}
          y={gy + 100}
          textAnchor="middle"
          fontSize={13}
          fontWeight={650}
          fill="var(--ink-2)"
          transform={`rotate(-90 ${gx - 78} ${gy + 100})`}
        >
          row: who is asking
        </text>
        {TOK.map((t, r) => (
          <text
            key={r}
            x={gx - 10}
            y={cellY(gy, r, cell, gap) + cell / 2 + 4}
            textAnchor="end"
            fontSize={12}
            className="mono"
            fill={r === BANK ? "var(--ink)" : "var(--ink-3)"}
            fontWeight={r === BANK ? 700 : 500}
          >
            {t}
          </text>
        ))}
        <Mat
          x={gx}
          y={gy}
          values={allowed}
          cell={cell}
          gap={gap}
          mode="sequential"
          color="var(--ok)"
          masked={(r, c) => c > r}
          showValues={false}
          highlightRow={BANK}
          delay={1}
          stagger={0.03}
        />
      </Appear>
      <Appear delay={1.5}>
        <Card x={570} y={276} w={350} h={216}>
          <text x={594} y={312} fontSize={14.5} fill="var(--ink)">
            Green: allowed. Hatched: the future.
          </text>
          <text x={594} y={348} fontSize={14.5} fill="var(--ink)">
            Row t may read columns 0 to t, so the
          </text>
          <text x={594} y={372} fontSize={14.5} fill="var(--ink)">
            allowed cells form a <tspan fontWeight={700}>lower triangle</tspan>.
          </text>
          <text x={594} y={420} fontSize={13.5} fill="var(--ink-2)">
            Row bank reads the, river and bank.
          </text>
          <text x={594} y={444} fontSize={13.5} fill="var(--ink-2)">
            flooded is its answer, so it stays hidden.
          </text>
        </Card>
      </Appear>
    </Svg>
  );
}

function Loops({ playing }: { playing: boolean }) {
  const t = useTicker(4, 1500, playing, 500);
  const cell = 56;
  const gap = 6;
  const mx = 250;
  const my = 138;
  const bx = 590;
  const winH = (t + 1) * (cell + gap) - gap;
  const terms = X.slice(0, t + 1).map((r) => vec(r)).join(" + ");
  return (
    <Svg label="Version 1: averaging with a loop">
      <text x={430} y={74} textAnchor="end" fontSize={17} className="mono" fill="var(--ink)">
        for t in range(T):
      </text>
      <Pill x={480} y={68} text={`t = ${t}`} tone="mark" fontSize={15} strong />
      <text x={mx + 59} y={my - 14} textAnchor="middle" fontSize={14} fontWeight={650} fill="var(--ink-2)">
        x
      </text>
      <text x={bx + 59} y={my - 14} textAnchor="middle" fontSize={14} fontWeight={650} fill="var(--ink-2)">
        xbow
      </text>
      <RowChips right={mx - 14} y={my} tokens={TOK} cell={cell} gap={gap} fontSize={14} h={32} highlight={t} />
      <Mat x={mx} y={my} values={X} cell={cell} gap={gap} max={3} format={(v) => short(v)} />
      <motion.rect
        x={mx - 7}
        y={my - 7}
        width={cell * 2 + gap + 14}
        rx={10}
        fill="none"
        stroke="var(--mark)"
        strokeWidth={3}
        initial={false}
        animate={{ height: winH + 14 }}
        transition={{ duration: 0.45, ease: EASE }}
      />
      <Arrow x1={mx + 140} y1={my + 121} x2={bx - 20} y2={my + 121} label="mean of rows 0..t" />
      <Mat
        x={bx}
        y={my}
        values={XBOW}
        cell={cell}
        gap={gap}
        max={3}
        hidden={(r) => r > t}
        highlightRow={t}
        format={(v) => short(v)}
      />
      <motion.g key={t} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <text x={480} y={440} textAnchor="middle" fontSize={16} className="mono" fill="var(--ink)">
          {`xbow[${t}] = (${terms}) / ${t + 1} = `}
          <tspan fontWeight={700}>{vec(XBOW[t])}</tspan>
        </text>
      </motion.g>
      <Label x={480} y={482} size={13} color="var(--ink-3)">
        A bag of words: what was said is kept, the order inside the window is lost.
      </Label>
    </Svg>
  );
}

/** wei @ x = out, with a receipt for row bank. Used for sums and for averages. */
function Equation({ normalized }: { normalized: boolean }) {
  const cell = 50;
  const gap = 5;
  const wx = 130;
  const y = 168;
  const xx = 400;
  const ox = 556;
  const wei = normalized ? WEI : TRIL;
  const out = normalized ? XBOW : SUMS;
  const fmtW = (v: number) => (v === 0 ? "0" : normalized ? num(v, 2) : short(v));
  const weightText = (v: number) => (v === 0 ? "0" : normalized ? (v === 1 ? "1" : `1/${Math.round(1 / v)}`) : "1");
  const mid = y + (4 * cell + 3 * gap) / 2;
  return (
    <Svg label={normalized ? "Normalized lower-triangular matrix times x gives running means" : "Lower-triangular ones times x gives running sums"}>
      <Label x={480} y={80} size={15} weight={650} color="var(--ink)">
        {normalized ? "Each row of wei sums to 1, so wei @ x is a running mean" : "tril(ones) @ x adds up the past: running sums"}
      </Label>
      <text x={wx + 107} y={y - 34} textAnchor="middle" fontSize={14} fontWeight={650} fill="var(--ink-2)">
        {normalized ? "wei (rows sum to 1)" : "wei = tril(ones(T, T))"}
      </text>
      <ColTokens x={wx} y={y - 10} tokens={TOK} cell={cell} gap={gap} size={11} />
      <RowChips right={wx - 12} y={y} tokens={TOK} cell={cell} gap={gap} fontSize={13} h={28} highlight={BANK} />
      <Mat
        x={wx}
        y={y}
        values={wei}
        cell={cell}
        gap={gap}
        mode="sequential"
        color={WCOLOR}
        format={fmtW}
        highlightRow={BANK}
      />
      <Label x={372} y={mid + 8} size={24} weight={600} color="var(--ink)">
        @
      </Label>
      <text x={xx + 52} y={y - 34} textAnchor="middle" fontSize={14} fontWeight={650} fill="var(--ink-2)">
        x
      </text>
      <Mat x={xx} y={y} values={X} cell={cell} gap={gap} max={3} />
      <rect
        x={xx - 6}
        y={y - 6}
        width={2 * cell + gap + 12}
        height={3 * (cell + gap) - gap + 12}
        rx={9}
        fill="none"
        stroke="var(--mark)"
        strokeWidth={2}
        strokeDasharray="5 4"
      />
      <Label x={530} y={mid + 8} size={24} weight={600} color="var(--ink)">
        =
      </Label>
      <text x={ox + 52} y={y - 34} textAnchor="middle" fontSize={14} fontWeight={650} fill="var(--ink-2)">
        {normalized ? "xbow2 (means)" : "running sums"}
      </text>
      <Mat x={ox} y={y} values={out} cell={cell} gap={gap} max={4} highlightRow={BANK} delay={0.3} />

      <Card x={694} y={150} w={236} h={256}>
        <text x={714} y={180} fontSize={13} fontWeight={650} fill="var(--ink-2)">
          row bank of the product
        </text>
        {X.map((r, j) => (
          <Appear key={j} delay={0.5 + j * 0.25} y={4}>
            <text
              x={714}
              y={216 + j * 32}
              fontSize={15}
              className="mono"
              fill={wei[BANK][j] === 0 ? "var(--ink-3)" : "var(--ink)"}
            >
              <tspan fill="var(--violet)" fontWeight={700}>
                {weightText(wei[BANK][j])}
              </tspan>
              {` × ${vec(r)}`}
            </text>
          </Appear>
        ))}
        <Appear delay={1.6} y={4}>
          <line x1={714} x2={910} y1={352} y2={352} stroke="var(--rule-strong)" />
          <text x={714} y={384} fontSize={17} className="mono" fontWeight={700} fill="var(--ink)">
            {`= ${vec(out[BANK])}`}
          </text>
        </Appear>
      </Card>
      <Appear delay={1.2}>
        <Label x={480} y={458} size={14} color="var(--ink-2)">
          {normalized
            ? "Row t holds 1/(t+1) in its first t+1 cells. Same result as the loops, as one matmul."
            : "Row t has t+1 ones, so it adds x[0] to x[t]. Sums, not averages yet."}
        </Label>
      </Appear>
      {normalized && (
        <Appear delay={1.4}>
          <Pill x={wx + 107} y={410} text="every row sums to 1" tone="violet" />
        </Appear>
      )}
    </Svg>
  );
}

function SoftmaxStep() {
  const cell = 52;
  const gap = 5;
  const sx = 150;
  const wx = 560;
  const y = 168;
  const zeros = TOK.map(() => TOK.map(() => 0));
  const mid = y + (4 * cell + 3 * gap) / 2;
  return (
    <Svg label="Masked zeros through a row softmax give the averaging weights">
      <Label x={480} y={80} size={15} weight={650} color="var(--ink)">
        Scores of 0, the future set to -inf, softmax along each row
      </Label>
      <text x={sx + 111} y={y - 34} textAnchor="middle" fontSize={14} fontWeight={650} fill="var(--ink-2)">
        scores after masked_fill
      </text>
      <ColTokens x={sx} y={y - 10} tokens={TOK} cell={cell} gap={gap} size={11} />
      <RowChips right={sx - 12} y={y} tokens={TOK} cell={cell} gap={gap} fontSize={13} h={28} highlight={BANK} />
      <Mat x={sx} y={y} values={zeros} cell={cell} gap={gap} masked={(r, c) => c > r} showInf highlightRow={BANK} />
      <Arrow x1={sx + 238} y1={mid} x2={wx - 18} y2={mid} delay={0.4} />
      <Appear delay={0.6} y={0}>
        <Pill x={(sx + 238 + wx - 18) / 2} y={mid - 26} text="softmax(dim=-1)" />
      </Appear>
      <text x={wx + 111} y={y - 34} textAnchor="middle" fontSize={14} fontWeight={650} fill="var(--ink-2)">
        wei
      </text>
      <ColTokens x={wx} y={y - 10} tokens={TOK} cell={cell} gap={gap} size={11} />
      <Mat
        x={wx}
        y={y}
        values={WEI}
        cell={cell}
        gap={gap}
        mode="sequential"
        color={WCOLOR}
        format={(v) => (v === 0 ? "0" : num(v, 2))}
        highlightRow={BANK}
        delay={0.8}
        stagger={0.02}
      />
      {WEI.map((_, r) => (
        <Appear key={r} delay={1.3 + r * 0.08} y={0}>
          <text x={wx + 240} y={cellY(y, r, cell, gap) + cell / 2 + 5} fontSize={13} className="mono" fill="var(--ink-3)">
            sum 1
          </text>
        </Appear>
      ))}
      <Appear delay={1.6}>
        <Label x={480} y={462} size={14} color="var(--ink-2)">
          The same weights as version 2, but now they come out of scores. Scores are something a network can learn.
        </Label>
      </Appear>
    </Svg>
  );
}

function Fixed() {
  const cols = [
    { x0: 36, title: "Fill the future with 0", sub: "exp(0) = 1, so flooded still counts", tone: "bad" as const, hl: 3 },
    { x0: 344, title: "Fill it with -inf (version 3)", sub: "exp(-inf) = 0, so flooded gets nothing", tone: "accent" as const, hl: undefined },
    { x0: 652, title: "Scores from content", sub: "what attention will compute", tone: "ok" as const, hl: 1 },
  ];
  const verdict = ["leaks the answer", "correct, same for every sentence", "bank listens to river"];
  return (
    <Svg label="Row bank with three different score rows">
      <Label x={480} y={44} size={15} weight={650} color="var(--ink)">
        Row bank, three ways
      </Label>
      {cols.map((c, k) => {
        const { scores, w, out } = THREE_WAYS[k];
        return (
          <Appear key={k} delay={0.2 + k * 0.35}>
            <Card x={c.x0} y={66} w={272} h={404} tone={c.tone}>
              <text x={c.x0 + 16} y={96} fontSize={14.5} fontWeight={650} fill="var(--ink)">
                {c.title}
              </text>
              <text x={c.x0 + 16} y={118} fontSize={12.5} fill="var(--ink-2)">
                {c.sub}
              </text>
              <text x={c.x0 + 16} y={152} fontSize={12} fontWeight={650} fill="var(--ink-3)">
                scores
              </text>
              <Mat
                x={c.x0 + 70}
                y={134}
                values={[scores]}
                cell={40}
                gap={4}
                max={3}
                masked={(_, j) => !Number.isFinite(scores[j])}
                showInf
                format={(v) => short(v, 1)}
                delay={0.3 + k * 0.35}
              />
              <text x={c.x0 + 16} y={206} fontSize={12} fontWeight={650} fill="var(--ink-3)">
                softmax weights
              </text>
              <Bars
                x={c.x0 + 82}
                y={216}
                labels={TOK}
                values={w}
                width={120}
                row={30}
                max={1}
                highlight={c.hl}
                color={WCOLOR}
                delay={0.5 + k * 0.35}
                format={(v) => num(v, 2)}
              />
              <text x={c.x0 + 16} y={378} fontSize={14} className="mono" fill="var(--ink)">
                out[bank] = <tspan fontWeight={700}>{vec(out)}</tspan>
              </text>
              <text x={c.x0 + 16} y={418} fontSize={13} fontWeight={650} fill={`var(--${c.tone})`}>
                {verdict[k]}
              </text>
              <text x={c.x0 + 16} y={444} fontSize={12} fill="var(--ink-3)">
                {k === 0 ? "the model could just copy flooded" : k === 1 ? "the is weighted like river" : "next lesson: scores = q · k"}
              </text>
            </Card>
          </Appear>
        );
      })}
      <Appear delay={1.4}>
        <Label x={480} y={504} size={14} color="var(--ink-2)">
          Same mask, same softmax. Only the scores differ, and the scores decide everything.
        </Label>
      </Appear>
    </Svg>
  );
}

function Recap() {
  const zeros = TOK.map(() => TOK.map(() => 0));
  const cards = [
    { title: "1. Loops", f1: "xbow[t] = mean(x[:t+1])", f2: "slow: Python loop over T" },
    { title: "2. Matrix multiply", f1: "wei = tril / row sums", f2: "one matmul: wei @ x" },
    { title: "3. Masked softmax", f1: "softmax(masked_fill(0, -inf))", f2: "weights come from scores" },
  ];
  const pipe = ["scores (T, T)", "mask: -inf above", "softmax per row", "wei @ x", "(B, T, C)"];
  const pw = pipe.map((p) => textWidth(p, 13, true) + 16);
  const pgap = 46;
  const ptotal = pw.reduce((a, b) => a + b, 0) + pgap * (pipe.length - 1);
  const px: number[] = [];
  pw.reduce((left, w) => {
    px.push(left + w / 2);
    return left + w + pgap;
  }, 480 - ptotal / 2);
  return (
    <Svg label="Recap of the three versions">
      {cards.map((c, k) => {
        const x0 = 40 + k * 300;
        return (
          <Appear key={k} delay={k * 0.25}>
            <Card x={x0} y={40} w={280} h={296} tone={k === 2 ? "mark" : undefined}>
              <text x={x0 + 18} y={72} fontSize={15} fontWeight={650} fill="var(--ink)">
                {c.title}
              </text>
              {k === 0 && <Mat x={x0 + 76} y={90} values={TRIL} cell={29} gap={3} mode="sequential" color={WCOLOR} format={(v) => (v ? "1" : "")} />}
              {k === 1 && <Mat x={x0 + 76} y={90} values={WEI} cell={29} gap={3} mode="sequential" color={WCOLOR} format={(v) => (v === 0 ? "" : v === 1 ? "1" : `.${Math.round(v * 100)}`)} />}
              {k === 2 && <Mat x={x0 + 76} y={90} values={zeros} cell={29} gap={3} masked={(r, cc) => cc > r} showInf />}
              <text x={x0 + 18} y={244} fontSize={13} className="mono" fill="var(--ink)">
                {c.f1}
              </text>
              <text x={x0 + 18} y={272} fontSize={13} fill="var(--ink-2)">
                {c.f2}
              </text>
              <text x={x0 + 18} y={312} fontSize={12.5} fontWeight={650} fill={k === 2 ? "var(--ink)" : "var(--ink-3)"}>
                {k === 2 ? "the form attention uses" : "same numbers"}
              </text>
            </Card>
          </Appear>
        );
      })}
      {pipe.map((p, i) => (
        <Appear key={p} delay={0.9 + i * 0.15} y={0}>
          <Pill x={px[i]} y={398} text={p} tone={i === 0 ? "mark" : "ink"} fontSize={13} />
          {i < pipe.length - 1 && (
            <line
              x1={px[i] + pw[i] / 2 + 4}
              x2={px[i + 1] - pw[i + 1] / 2 - 6}
              y1={398}
              y2={398}
              stroke="var(--rule-strong)"
              strokeWidth={1.6}
              markerEnd="url(#arrow-muted)"
            />
          )}
        </Appear>
      ))}
      <Appear delay={1.8}>
        <Label x={480} y={466} size={15} weight={650} color="var(--ink)">
          Next lesson: the scores come from queries and keys.
        </Label>
      </Appear>
    </Svg>
  );
}

export function Stage({ step, playing }: StageProps) {
  switch (step) {
    case 0:
      return <Context />;
    case 1:
      return <LookBack />;
    case 2:
      return <Loops playing={playing} />;
    case 3:
      return <Equation normalized={false} />;
    case 4:
      return <Equation normalized />;
    case 5:
      return <SoftmaxStep />;
    case 6:
      return <Fixed />;
    case 7:
      return <Try />;
    default:
      return <Recap />;
  }
}
