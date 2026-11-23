"use client";

import { motion } from "motion/react";
import { Appear, Arrow, Bars, Box, Cells, Chip, Label, Pill, Svg } from "@/components/viz/svg";
import { tokenTint } from "@/lib/color";
import type { StageProps } from "@/lib/types";
import { Card, ColTokens, Mat, RowChips, WCOLOR, cellY, num, round, short, softmaxRow, useTicker, vec } from "../averaging/kit";
import { BANK, K, KT, MASKED, OUT, Q, S, SS, TOK, V, WEI, X } from "./data";
import { Try } from "./Try";

const ROLE = [
  { key: "q", name: "Query", ask: "What am I looking for?", eg: "bank: is there water nearby, or money?", M: Q },
  { key: "k", name: "Key", ask: "What do I contain?", eg: "river: I am about water.", M: K },
  { key: "v", name: "Value", ask: "What do I hand over if picked?", eg: "river: here is my information.", M: V },
] as const;

/** A colored frame around a matrix, in the q / k / v color. */
function Frame({ x, y, w, h, tone }: { x: number; y: number; w: number; h: number; tone: string }) {
  return <rect x={x - 6} y={y - 6} width={w + 12} height={h + 12} rx={10} fill="none" stroke={`var(--${tone})`} strokeWidth={2} />;
}

const size = (n: number, cell: number, gap: number) => n * cell + (n - 1) * gap;

function Roles() {
  const xs = [180, 380, 580, 780];
  return (
    <Svg label="Each token emits a query, a key and a value">
      {TOK.map((t, i) => (
        <g key={t}>
          <Chip x={xs[i]} y={62} text={t} index={i} fontSize={16} h={38} highlight={i === BANK} delay={i * 0.05} />
          {ROLE.map((r, k) => (
            <Appear key={r.key} delay={0.3 + k * 0.2 + i * 0.05}>
              <rect x={xs[i] - 42} y={104 + k * 52} width={84} height={44} rx={9} fill="var(--card)" stroke={`var(--${r.key})`} strokeWidth={1.8} />
              <Cells x={xs[i] - 36} y={110 + k * 52} values={r.M[i]} cell={32} gap={4} max={2.5} showValues />
            </Appear>
          ))}
        </g>
      ))}
      {ROLE.map((r, k) => (
        <text key={r.key} x={96} y={131 + k * 52} textAnchor="end" fontSize={13} fontWeight={700} fill={`var(--${r.key})`}>
          {r.name.toLowerCase()}
        </text>
      ))}
      <Appear delay={1.3} y={0}>
        <path
          d={`M ${xs[2] - 44} 126 C ${xs[2] - 100} 126, ${xs[1] + 100} 178, ${xs[1] + 44} 178`}
          fill="none"
          stroke="var(--mark)"
          strokeWidth={2.4}
          strokeDasharray="6 5"
        />
        <Pill x={480} y={152} text="best match" tone="mark" />
      </Appear>
      {ROLE.map((r, k) => (
        <Appear key={r.key} delay={0.9 + k * 0.2}>
          <Card x={40 + k * 300} y={292} w={280} h={170} tone={r.key}>
            <text x={60 + k * 300} y={326} fontSize={17} fontWeight={700} fill="var(--ink)">
              {r.name}
            </text>
            <text x={60 + k * 300} y={356} fontSize={14.5} fill="var(--ink)">
              {r.ask}
            </text>
            <text x={60 + k * 300} y={396} fontSize={13} fill="var(--ink-2)">
              {r.eg}
            </text>
            <text x={60 + k * 300} y={440} fontSize={12.5} className="mono" fill="var(--ink-3)">
              {`${r.key} = x @ W_${r.key}, (T, head_size)`}
            </text>
          </Card>
        </Appear>
      ))}
      <Label x={480} y={500} size={12.5} color="var(--ink-3)">
        The meanings are illustrations. A trained model learns whatever queries and keys help it predict.
      </Label>
    </Svg>
  );
}

function Projections() {
  const cell = 44;
  const gap = 4;
  const xx = 120;
  const y = 176;
  const H = size(4, cell, gap);
  const cols = [
    { tone: "q", M: Q, x: 430, title: "Q = x @ W_q" },
    { tone: "k", M: K, x: 590, title: "K = x @ W_k" },
    { tone: "v", M: V, x: 750, title: "V = x @ W_v" },
  ];
  const W2 = size(2, cell, gap);
  const busY = 96;
  return (
    <Svg label="x projected into Q, K and V">
      <ColTokens x={xx} y={y - 10} tokens={["c0", "c1", "c2", "c3"]} cell={cell} gap={gap} size={11} />
      <RowChips right={xx - 12} y={y} tokens={TOK} cell={cell} gap={gap} highlight={BANK} />
      <Mat x={xx} y={y} values={X} cell={cell} gap={gap} max={1.5} format={(v) => num(v, 1)} highlightRow={BANK} />
      <text x={xx + 94} y={y + H + 30} textAnchor="middle" fontSize={14} fontWeight={650} fill="var(--ink-2)">
        x (T, C) = (4, 4)
      </text>
      <motion.path
        d={`M ${xx + 94} ${y - 28} L ${xx + 94} ${busY} L ${cols[2].x + W2 / 2} ${busY}`}
        fill="none"
        stroke="var(--ink-3)"
        strokeWidth={1.8}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.7 }}
      />
      {cols.map((c, k) => (
        <g key={c.tone}>
          <Arrow x1={c.x + W2 / 2} y1={busY} x2={c.x + W2 / 2} y2={y - 14} tone={c.tone as "q" | "k" | "v"} delay={0.6 + k * 0.2} duration={0.4} />
          <Appear delay={0.7 + k * 0.2} y={0}>
            <Pill x={c.x + W2 / 2} y={busY} text={`Linear: ${c.tone === "q" ? "query" : c.tone === "k" ? "key" : "value"}`} tone={c.tone as "q" | "k" | "v"} fontSize={12} />
          </Appear>
          <Appear delay={0.9 + k * 0.2}>
            <Frame x={c.x} y={y} w={W2} h={H} tone={c.tone} />
            <Mat x={c.x} y={y} values={c.M} cell={cell} gap={gap} max={2.5} format={(v) => short(v, 1)} highlightRow={BANK} delay={0.9 + k * 0.2} />
            <text x={c.x + W2 / 2} y={y + H + 30} textAnchor="middle" fontSize={14} fontWeight={650} className="mono" fill={`var(--${c.tone})`}>
              {c.title}
            </text>
          </Appear>
        </g>
      ))}
      <Appear delay={1.6}>
        <text x={480} y={448} textAnchor="middle" fontSize={15} className="mono" fill="var(--ink)">
          <tspan fill="var(--q)" fontWeight={700}>
            q_bank
          </tspan>
          {" = [x0 + x2, x1 + x3] = [0.5 + 0.5, 1 + 0] = "}
          <tspan fontWeight={700}>[1, 1]</tspan>
        </text>
        <text x={480} y={480} textAnchor="middle" fontSize={13} fill="var(--ink-3)">
          Made-up weights so you can check by hand. Real W_q, W_k, W_v are learned.
        </text>
      </Appear>
    </Svg>
  );
}

function Scores({ playing }: { playing: boolean }) {
  const tick = useTicker(17, 420, playing, 500);
  const done = tick >= 16;
  const i = done ? BANK : Math.floor(tick / 4);
  const j = done ? 1 : tick % 4;
  const cell = 54;
  const gap = 5;
  const sx = 330;
  const sy = 200;
  const W2 = size(2, cell, gap);
  const qx = sx - 24 - W2;
  const ky = sy - 24 - W2;
  const q = Q[i];
  const k = K[j];
  return (
    <Svg label="Scores computed cell by cell as query dot key">
      <ColTokens x={sx} y={ky - 10} tokens={TOK} cell={cell} gap={gap} size={12} highlight={j} />
      <text x={sx - 16} y={ky + W2 / 2 + 6} textAnchor="end" fontSize={17} fontWeight={700} className="mono" fill="var(--k)">
        Kᵀ
      </text>
      <Frame x={sx} y={ky} w={size(4, cell, gap)} h={W2} tone="k" />
      <Mat x={sx} y={ky} values={KT} cell={cell} gap={gap} max={2.5} highlightCol={j} stagger={0} />
      <text x={qx + W2 / 2} y={sy - 14} textAnchor="middle" fontSize={17} fontWeight={700} className="mono" fill="var(--q)">
        Q
      </text>
      <RowChips right={qx - 14} y={sy} tokens={TOK} cell={cell} gap={gap} highlight={i} />
      <Frame x={qx} y={sy} w={W2} h={size(4, cell, gap)} tone="q" />
      <Mat x={qx} y={sy} values={Q} cell={cell} gap={gap} max={2.5} highlightRow={i} stagger={0} />
      <Mat
        x={sx}
        y={sy}
        values={S}
        cell={cell}
        gap={gap}
        max={3}
        hidden={(r, c) => !done && r * 4 + c > tick}
        focus={[i, j]}
        stagger={0}
      />
      <text x={sx + size(4, cell, gap) / 2} y={sy + size(4, cell, gap) + 32} textAnchor="middle" fontSize={14} fontWeight={650} fill="var(--ink-2)">
        scores = Q @ Kᵀ, shape (T, T)
      </text>

      <Card x={610} y={150} w={320} h={270} tone="mark">
        <text x={632} y={184} fontSize={14} className="mono" fill="var(--ink-2)">
          score[i, j] = q_i · k_j
        </text>
        <text x={632} y={226} fontSize={16} fill="var(--ink)">
          <tspan fontWeight={700}>{TOK[i]}</tspan> asks about <tspan fontWeight={700}>{TOK[j]}</tspan>
        </text>
        <text x={632} y={268} fontSize={17} className="mono" fill="var(--ink)">
          <tspan fill="var(--q)" fontWeight={700}>
            {vec(q, 1)}
          </tspan>
          {" · "}
          <tspan fill="var(--k)" fontWeight={700}>
            {vec(k, 1)}
          </tspan>
        </text>
        <text x={632} y={308} fontSize={17} className="mono" fill="var(--ink)">
          {`= ${short(q[0])}×${short(k[0])} + ${short(q[1])}×${short(k[1])}`}
        </text>
        <text x={632} y={362} fontSize={30} className="mono" fontWeight={700} fill="var(--ink)">
          {`= ${short(S[i][j])}`}
        </text>
        <text x={632} y={402} fontSize={12.5} fill="var(--ink-2)">
          {done ? "bank's best match is river: 3" : `cell ${tick + 1} of 16`}
        </text>
      </Card>
      <Label x={770} y={456} size={13} color="var(--ink-3)">
        16 dot products, each of length head_size = 2.
      </Label>
      <Label x={770} y={478} size={13} color="var(--ink-3)">
        The upper triangle gets masked later.
      </Label>
    </Svg>
  );
}

function ScaleStep() {
  const cell = 54;
  const gap = 5;
  const ax = 110;
  const bx = 560;
  const y = 150;
  const W4 = size(4, cell, gap);
  const mid = y + W4 / 2;
  return (
    <Svg label="Scores multiplied by one over square root of head size">
      <text x={ax + W4 / 2} y={y - 40} textAnchor="middle" fontSize={14} fontWeight={650} fill="var(--ink-2)">
        q @ kᵀ
      </text>
      <ColTokens x={ax} y={y - 12} tokens={TOK} cell={cell} gap={gap} size={11} />
      <RowChips right={ax - 12} y={y} tokens={TOK} cell={cell} gap={gap} fontSize={12} h={26} highlight={BANK} />
      <Mat x={ax} y={y} values={S} cell={cell} gap={gap} max={3} highlightRow={BANK} focus={[BANK, 1]} stagger={0} />
      <Arrow x1={ax + W4 + 18} y1={mid} x2={bx - 18} y2={mid} delay={0.3} tone="mark" />
      <Appear delay={0.5} y={0}>
        <Pill x={(ax + W4 + bx) / 2} y={mid - 30} text="× 1/√2 ≈ 0.71" tone="mark" fontSize={14} strong />
      </Appear>
      <text x={bx + W4 / 2} y={y - 40} textAnchor="middle" fontSize={14} fontWeight={650} fill="var(--ink-2)">
        q @ kᵀ × head_size ** -0.5
      </text>
      <ColTokens x={bx} y={y - 12} tokens={TOK} cell={cell} gap={gap} size={11} />
      <Mat
        x={bx}
        y={y}
        values={SS}
        cell={cell}
        gap={gap}
        max={2.2}
        format={(v) => (v === 0 ? "0" : num(v, 2))}
        highlightRow={BANK}
        focus={[BANK, 1]}
        delay={0.6}
        stagger={0.02}
      />
      <Appear delay={1.2}>
        {["3 × 0.71 = 2.12", "1 × 0.71 = 0.71", "2 × 0.71 = 1.41"].map((t, i) => (
          <Label key={t} x={260 + i * 220} y={y + W4 + 56} size={15} mono color="var(--ink)">
            {t}
          </Label>
        ))}
        <Label x={480} y={y + W4 + 92} size={13} color="var(--ink-3)">
          Every score shrinks by the same factor, so the order inside each row does not change.
        </Label>
      </Appear>
    </Svg>
  );
}

function WhyScale() {
  const sizes = [1, 4, 16, 64];
  const base = 410;
  const unit = 34;
  const bank = SS[BANK].slice(0, 3);
  const wide = bank.map((v) => v * 8);
  const rows = [
    { title: "bank's row, scaled (what we use)", s: bank, w: softmaxRow(bank), g: "p(1 - p) for river: 0.73 × 0.27 = 0.20" },
    { title: "the same row, 8 times wider", s: wide, w: softmaxRow(wide), g: "p(1 - p) for river: 1.00 × 0.00 = 0.00" },
  ];
  return (
    <Svg label="Unscaled dot products grow with head size and saturate the softmax">
      <text x={60} y={60} fontSize={15} fontWeight={650} fill="var(--ink)">
        Typical size of an unscaled q · k
      </text>
      <text x={60} y={82} fontSize={12.5} fill="var(--ink-3)">
        standard deviation when q and k entries have variance 1
      </text>
      <line x1={70} x2={440} y1={base} y2={base} stroke="var(--rule-strong)" />
      {sizes.map((d, i) => {
        const h = Math.sqrt(d) * unit;
        const x = 92 + i * 72;
        return (
          <g key={d}>
            <motion.rect
              x={x}
              width={46}
              rx={6}
              fill={d === 64 ? "var(--mark)" : "var(--paper-2)"}
              stroke={d === 64 ? "var(--mark)" : "var(--rule-strong)"}
              initial={{ y: base, height: 0 }}
              animate={{ y: base - h, height: h }}
              transition={{ duration: 0.6, delay: 0.2 + i * 0.15 }}
            />
            <text x={x + 23} y={base - h - 8} textAnchor="middle" fontSize={14} className="mono" fontWeight={650} fill="var(--ink)">
              {short(Math.sqrt(d))}
            </text>
            <text x={x + 23} y={base + 20} textAnchor="middle" fontSize={12} className="mono" fill="var(--ink-2)">
              {`hs ${d}`}
            </text>
          </g>
        );
      })}
      <line x1={80} x2={440} y1={base - unit} y2={base - unit} stroke="var(--ok)" strokeWidth={2} strokeDasharray="6 4" />
      <text x={440} y={base - unit - 26} textAnchor="end" fontSize={12.5} fontWeight={650} fill="var(--ok)">
        after scaling
      </text>
      <text x={440} y={base - unit - 9} textAnchor="end" fontSize={12.5} fontWeight={650} fill="var(--ok)">
        std = 1
      </text>
      <text x={92 + 3 * 72 + 23} y={base + 40} textAnchor="middle" fontSize={11.5} fill="var(--ink-3)">
        GPT-2 small
      </text>

      {rows.map((r, k) => (
        <Appear key={k} delay={0.6 + k * 0.4}>
          <Card x={480} y={54 + k * 228} w={448} h={208} tone={k === 0 ? "ok" : "bad"}>
            <text x={500} y={84 + k * 228} fontSize={14.5} fontWeight={650} fill="var(--ink)">
              {r.title}
            </text>
            <text x={500} y={108 + k * 228} fontSize={12.5} className="mono" fill="var(--ink-2)">
              {`scores ${vec(r.s.map((v) => round(v, 2)))}`}
            </text>
            <Bars
              x={570}
              y={120 + k * 228}
              labels={TOK.slice(0, 3)}
              values={r.w}
              width={250}
              row={28}
              max={1}
              color={WCOLOR}
              highlight={1}
              delay={0.8 + k * 0.4}
              format={(v) => num(v, 2)}
            />
            <text x={500} y={226 + k * 228} fontSize={12.5} className="mono" fill="var(--ink-2)">
              {r.g}
            </text>
          </Card>
        </Appear>
      ))}
    </Svg>
  );
}

function MaskStep() {
  const cell = 54;
  const gap = 5;
  const tx = 60;
  const tc = 34;
  const tg = 4;
  const sx = 400;
  const y = 150;
  const W4 = size(4, cell, gap);
  const T4 = size(4, tc, tg);
  const mid = y + W4 / 2;
  const tril = TOK.map((_, r) => TOK.map((__, c) => (c <= r ? 0.45 : 0)));
  return (
    <Svg label="Causal mask sets the upper triangle to minus infinity">
      <text x={tx + T4 / 2} y={mid - T4 / 2 - 14} textAnchor="middle" fontSize={14} fontWeight={650} className="mono" fill="var(--ink-2)">
        tril
      </text>
      <Mat x={tx} y={mid - T4 / 2} values={tril} cell={tc} gap={tg} mode="sequential" color="var(--ok)" format={(v) => (v > 0 ? "1" : "0")} />
      <Arrow x1={tx + T4 + 14} y1={mid} x2={sx - 18} y2={mid} delay={0.3} />
      <Appear delay={0.5} y={0}>
        <Pill x={(tx + T4 + sx) / 2} y={mid - 28} text="where tril == 0: -inf" fontSize={12} />
      </Appear>
      <text x={sx + W4 / 2} y={y - 40} textAnchor="middle" fontSize={14} fontWeight={650} fill="var(--ink-2)">
        scaled scores, masked
      </text>
      <ColTokens x={sx} y={y - 12} tokens={TOK} cell={cell} gap={gap} size={11} />
      <Mat
        x={sx}
        y={y}
        values={MASKED}
        cell={cell}
        gap={gap}
        max={2.2}
        format={(v) => (v === 0 ? "0" : num(v, 2))}
        masked={(r, c) => c > r}
        showInf
        highlightRow={BANK}
        delay={0.5}
        stagger={0.02}
      />
      {TOK.map((t, r) => (
        <text
          key={t}
          x={sx + W4 + 14}
          y={cellY(y, r, cell, gap) + cell / 2 + 4}
          fontSize={12}
          className="mono"
          fill={r === BANK ? "var(--ink)" : "var(--ink-3)"}
          fontWeight={r === BANK ? 700 : 500}
        >
          {t}
        </text>
      ))}
      <Appear delay={1.1}>
        <Card x={712} y={156} w={218} h={224}>
          <text x={730} y={188} fontSize={14} fill="var(--ink)">
            Row t keeps columns 0..t.
          </text>
          <text x={730} y={220} fontSize={14} fill="var(--ink)">
            The rest becomes -inf.
          </text>
          <text x={730} y={264} fontSize={13} fill="var(--ink-2)">
            bank loses flooded, its
          </text>
          <text x={730} y={284} fontSize={13} fill="var(--ink-2)">
            second best score (1.41).
          </text>
          <text x={730} y={328} fontSize={13} fill="var(--ink-2)">
            Same rule for every head.
          </text>
          <text x={730} y={356} fontSize={12} className="mono" fill="var(--ink-3)">
            tril[:T, :T] == 0
          </text>
        </Card>
      </Appear>
    </Svg>
  );
}

function SoftmaxStep() {
  const cell = 50;
  const gap = 5;
  const sx = 110;
  const wx = 470;
  const y = 160;
  const W4 = size(4, cell, gap);
  const mid = y + W4 / 2;
  const row = MASKED[BANK].map((v) => (Number.isFinite(v) ? round(v, 2) : v));
  const ex = row.map((v) => (Number.isFinite(v) ? Math.exp(v) : 0));
  const sum = ex.reduce((a, b) => a + b, 0);
  return (
    <Svg label="Row-wise softmax turns masked scores into attention weights">
      <text x={sx + W4 / 2} y={y - 40} textAnchor="middle" fontSize={14} fontWeight={650} fill="var(--ink-2)">
        masked scores
      </text>
      <ColTokens x={sx} y={y - 12} tokens={TOK} cell={cell} gap={gap} size={11} />
      <RowChips right={sx - 12} y={y} tokens={TOK} cell={cell} gap={gap} fontSize={12} h={26} highlight={BANK} />
      <Mat x={sx} y={y} values={MASKED} cell={cell} gap={gap} max={2.2} format={(v) => (v === 0 ? "0" : num(v, 2))} masked={(r, c) => c > r} showInf highlightRow={BANK} stagger={0} />
      <Arrow x1={sx + W4 + 14} y1={mid} x2={wx - 16} y2={mid} delay={0.3} />
      <Appear delay={0.5} y={0}>
        <Pill x={(sx + W4 + wx) / 2} y={mid - 28} text="softmax(dim=-1)" fontSize={12} />
      </Appear>
      <text x={wx + W4 / 2} y={y - 40} textAnchor="middle" fontSize={14} fontWeight={650} fill="var(--ink-2)">
        wei: attention weights
      </text>
      <ColTokens x={wx} y={y - 12} tokens={TOK} cell={cell} gap={gap} size={11} />
      <Mat
        x={wx}
        y={y}
        values={WEI}
        cell={cell}
        gap={gap}
        mode="sequential"
        color={WCOLOR}
        format={(v) => num(v, 2)}
        masked={(r, c) => c > r}
        highlightRow={BANK}
        delay={0.7}
        stagger={0.03}
      />
      <Appear delay={1.4} y={0}>
        <Pill x={wx + W4 / 2} y={y + W4 + 30} text="each row sums to 1" tone="violet" />
      </Appear>
      <Card x={712} y={140} w={218} h={270}>
        <text x={730} y={170} fontSize={13} fontWeight={650} fill="var(--ink-2)">
          row bank
        </text>
        {row.map((v, j) => (
          <Appear key={j} delay={0.9 + j * 0.2} y={3}>
            <text x={730} y={202 + j * 30} fontSize={14} className="mono" fill="var(--ink)">
              {`exp(${num(v, 2)}) = ${Number.isFinite(v) ? num(ex[j], 2) : "0"}`}
            </text>
          </Appear>
        ))}
        <Appear delay={1.8} y={3}>
          <line x1={730} x2={912} y1={320} y2={320} stroke="var(--rule-strong)" />
          <text x={730} y={344} fontSize={14} className="mono" fill="var(--ink)">
            {`sum = ${num(sum, 2)}`}
          </text>
          <text x={730} y={374} fontSize={13} className="mono" fill="var(--ink-2)">
            divide each by the sum:
          </text>
          <text x={730} y={396} fontSize={14} className="mono" fontWeight={700} fill="var(--violet)">
            {ex.map((e) => (e === 0 ? "0" : num(e / sum, 2))).join("  ")}
          </text>
        </Appear>
      </Card>
    </Svg>
  );
}

function Output() {
  const cell = 46;
  const gap = 4;
  const wx = 110;
  const vx = 356;
  const ox = 500;
  const y = 150;
  const W4 = size(4, cell, gap);
  const W2 = size(2, cell, gap);
  const mid = y + W4 / 2;
  const w = WEI[BANK];
  const starts = w.map((_, j) => w.slice(0, j).reduce((a, b) => a + b, 0));
  const barX = 160;
  const barW = 640;
  return (
    <Svg label="Output row as a weighted mix of value rows">
      <text x={wx + W4 / 2} y={y - 34} textAnchor="middle" fontSize={14} fontWeight={650} fill="var(--ink-2)">
        wei (T, T)
      </text>
      <ColTokens x={wx} y={y - 10} tokens={TOK} cell={cell} gap={gap} size={11} />
      <RowChips right={wx - 12} y={y} tokens={TOK} cell={cell} gap={gap} fontSize={12} h={26} highlight={BANK} />
      <Mat x={wx} y={y} values={WEI} cell={cell} gap={gap} mode="sequential" color={WCOLOR} format={(v) => num(v, 2)} masked={(r, c) => c > r} highlightRow={BANK} stagger={0} />
      <Label x={333} y={mid + 8} size={24} weight={600} color="var(--ink)">
        @
      </Label>
      <text x={vx + W2 / 2} y={y - 34} textAnchor="middle" fontSize={14} fontWeight={650} className="mono" fill="var(--v)">
        V (T, hs)
      </text>
      <Frame x={vx} y={y} w={W2} h={W4} tone="v" />
      <Mat x={vx} y={y} values={V} cell={cell} gap={gap} max={2.5} format={(v) => short(v, 1)} stagger={0} />
      <Label x={476} y={mid + 8} size={24} weight={600} color="var(--ink)">
        =
      </Label>
      <text x={ox + W2 / 2} y={y - 34} textAnchor="middle" fontSize={14} fontWeight={650} fill="var(--ink-2)">
        out (T, hs)
      </text>
      <Mat x={ox} y={y} values={OUT} cell={cell} gap={gap} max={2.5} format={(v) => short(v, 2)} highlightRow={BANK} delay={0.3} stagger={0.03} />

      <Card x={630} y={112} w={300} h={248}>
        <text x={650} y={142} fontSize={13} fontWeight={650} fill="var(--ink-2)">
          out[bank] = sum of wei × v
        </text>
        {TOK.map((t, j) => (
          <Appear key={t} delay={0.5 + j * 0.2} y={3}>
            <text x={650} y={180 + j * 38} fontSize={12} className="mono" fill="var(--ink-3)">
              {t}
            </text>
            <text x={714} y={180 + j * 38} fontSize={15} className="mono" fontWeight={700} fill={w[j] > 0 ? "var(--violet)" : "var(--ink-3)"}>
              {w[j] > 0 ? num(w[j], 2) : "0"}
            </text>
            <text x={760} y={180 + j * 38} fontSize={14} className="mono" fill="var(--ink-3)">
              ×
            </text>
            <Mat x={784} y={160 + j * 38} values={[V[j]]} cell={32} gap={3} max={2.5} format={(v) => short(v, 1)} stagger={0} />
          </Appear>
        ))}
        <Appear delay={1.4} y={3}>
          <line x1={650} x2={910} y1={320} y2={320} stroke="var(--rule-strong)" />
          <text x={650} y={346} fontSize={16} className="mono" fontWeight={700} fill="var(--ink)">
            {`= ${vec(OUT[BANK].map((v) => round(v, 2)))}`}
          </text>
        </Appear>
      </Card>

      <Appear delay={1.6}>
        <text x={480} y={410} textAnchor="middle" fontSize={14} fontWeight={650} fill="var(--ink)">
          Where bank&apos;s output comes from
        </text>
        {w.map((wj, j) => {
          const x = barX + starts[j] * barW;
          const ww = wj * barW;
          if (ww < 1) return null;
          const tint = tokenTint(j);
          return (
            <g key={j}>
              <rect x={x} y={428} width={ww} height={38} fill={tint.fill} stroke={tint.stroke} strokeWidth={1.4} rx={6} />
              {ww > 60 && (
                <text x={x + ww / 2} y={452} textAnchor="middle" fontSize={13} className="mono" fill={tint.text} fontWeight={650}>
                  {`${TOK[j]} ${Math.round(wj * 100)}%`}
                </text>
              )}
              {ww <= 60 && (
                <text x={x + ww / 2} y={488} textAnchor="middle" fontSize={11.5} className="mono" fill="var(--ink-3)">
                  {`${TOK[j]} ${Math.round(wj * 100)}%`}
                </text>
              )}
            </g>
          );
        })}
      </Appear>
    </Svg>
  );
}

function Notes() {
  const enc = TOK.map(() => TOK.map(() => 0.45));
  const dec = TOK.map((_, r) => TOK.map((__, c) => (c <= r ? 0.45 : 0)));
  const mini = ["x0", "x1", "x2"];
  const swapped = ["x0", "x2", "x1"];
  const outA = ["o0", "o1", "o2"];
  const outB = ["o0", "o2", "o1"];
  return (
    <Svg label="Attention is a set operation; self versus cross; encoder versus decoder">
      {[
        { x: 30, title: "A set, not a sequence" },
        { x: 340, title: "Self vs cross attention" },
        { x: 650, title: "Encoder vs decoder" },
      ].map((p, k) => (
        <Appear key={k} delay={k * 0.3}>
          <Card x={p.x} y={36} w={280} h={460} />
          <text x={p.x + 18} y={68} fontSize={15} fontWeight={700} fill="var(--ink)">
            {p.title}
          </text>
        </Appear>
      ))}

      <Appear delay={0.2}>
        {[mini, swapped].map((row, r) => (
          <g key={r}>
            <text x={50} y={110 + r * 150} fontSize={12} fill="var(--ink-3)">
              {r === 0 ? "input order" : "swap tokens 1 and 2"}
            </text>
            {row.map((t, i) => (
              <g key={i}>
                <rect x={60 + i * 80} y={124 + r * 150} width={56} height={32} rx={7} fill="var(--card-2)" stroke="var(--rule-strong)" />
                <text x={88 + i * 80} y={145 + r * 150} textAnchor="middle" fontSize={13} className="mono" fill="var(--ink)">
                  {t}
                </text>
                <line x1={88 + i * 80} x2={88 + i * 80} y1={158 + r * 150} y2={180 + r * 150} stroke="var(--ink-3)" strokeWidth={1.4} markerEnd="url(#arrow-muted)" />
                <rect
                  x={60 + i * 80}
                  y={186 + r * 150}
                  width={56}
                  height={32}
                  rx={7}
                  fill={r === 1 && i > 0 ? "var(--mark-soft)" : "var(--card-2)"}
                  stroke={r === 1 && i > 0 ? "var(--mark)" : "var(--rule-strong)"}
                />
                <text x={88 + i * 80} y={207 + r * 150} textAnchor="middle" fontSize={13} className="mono" fill="var(--ink)">
                  {(r === 0 ? outA : outB)[i]}
                </text>
              </g>
            ))}
          </g>
        ))}
        <text x={50} y={418} fontSize={13} fill="var(--ink)">
          No mask, no positions: outputs
        </text>
        <text x={50} y={438} fontSize={13} fill="var(--ink)">
          swap exactly like the inputs.
        </text>
        <text x={50} y={470} fontSize={12.5} fill="var(--ink-2)">
          GPT adds position embeddings to x.
        </text>
      </Appear>

      <Appear delay={0.5}>
        <text x={360} y={104} fontSize={13} fontWeight={650} fill="var(--ink-2)">
          self: q, k, v from the same x
        </text>
        <rect x={370} y={150} width={60} height={34} rx={8} fill="var(--card-2)" stroke="var(--ink)" />
        <text x={400} y={172} textAnchor="middle" fontSize={14} className="mono" fill="var(--ink)">
          x
        </text>
        {(["q", "k", "v"] as const).map((t, i) => (
          <g key={t}>
            <Arrow x1={432} y1={167} x2={520} y2={128 + i * 38} tone={t} delay={0.6} duration={0.4} />
            <Pill x={548} y={128 + i * 38} text={t} tone={t} />
          </g>
        ))}
        <text x={360} y={256} fontSize={13} fontWeight={650} fill="var(--ink-2)">
          cross: q from one sequence,
        </text>
        <text x={360} y={274} fontSize={13} fontWeight={650} fill="var(--ink-2)">
          k and v from another
        </text>
        <rect x={356} y={290} width={104} height={34} rx={8} fill="var(--card-2)" stroke="var(--ink)" />
        <text x={408} y={312} textAnchor="middle" fontSize={13} className="mono" fill="var(--ink)">
          decoder x
        </text>
        <rect x={356} y={360} width={104} height={34} rx={8} fill="var(--card-2)" stroke="var(--ink)" />
        <text x={408} y={382} textAnchor="middle" fontSize={13} className="mono" fill="var(--ink)">
          encoder out
        </text>
        <Arrow x1={462} y1={307} x2={522} y2={307} tone="q" delay={0.8} duration={0.4} />
        <Pill x={548} y={307} text="q" tone="q" />
        <Arrow x1={462} y1={372} x2={522} y2={358} tone="k" delay={0.8} duration={0.4} />
        <Pill x={548} y={358} text="k" tone="k" />
        <Arrow x1={462} y1={382} x2={522} y2={396} tone="v" delay={0.8} duration={0.4} />
        <Pill x={548} y={396} text="v" tone="v" />
        <text x={360} y={450} fontSize={12.5} fill="var(--ink-2)">
          Used in translation models and
        </text>
        <text x={360} y={470} fontSize={12.5} fill="var(--ink-2)">
          when text attends to an image.
        </text>
      </Appear>

      <Appear delay={0.8}>
        <text x={670} y={104} fontSize={13} fontWeight={650} fill="var(--ink-2)">
          encoder (BERT): no mask
        </text>
        <Mat x={705} y={118} values={enc} cell={30} gap={3} mode="sequential" color="var(--ok)" showValues={false} />
        <text x={670} y={270} fontSize={13} fontWeight={650} fill="var(--ink-2)">
          decoder (GPT): causal mask
        </text>
        <Mat x={705} y={284} values={dec} cell={30} gap={3} mode="sequential" color="var(--ok)" masked={(r, c) => c > r} showValues={false} />
        <text x={670} y={440} fontSize={12.5} fill="var(--ink-2)">
          An encoder reads both sides.
        </text>
        <text x={670} y={460} fontSize={12.5} fill="var(--ink-2)">
          A decoder can generate, because
        </text>
        <text x={670} y={480} fontSize={12.5} fill="var(--ink-2)">
          it never relied on the future.
        </text>
      </Appear>
    </Svg>
  );
}

function Recap() {
  type B = { x: number; w: number; t: string; s: string; tone?: "violet" | "mark" | "v" };
  const r1: B[] = [
    { x: 96, w: 136, t: "x", s: "(B, T, C)" },
    { x: 282, w: 172, t: "key, query, value", s: "3 × Linear(C, hs)" },
    { x: 472, w: 144, t: "k, q, v", s: "(B, T, hs) each", tone: "violet" },
    { x: 660, w: 136, t: "q @ kᵀ", s: "(B, T, T)" },
    { x: 846, w: 140, t: "× hs ** -0.5", s: "scale" },
  ];
  const r2: B[] = [
    { x: 846, w: 140, t: "masked_fill", s: "-inf above diagonal" },
    { x: 660, w: 136, t: "softmax", s: "rows sum to 1" },
    { x: 472, w: 144, t: "wei @ v", s: "mix the values", tone: "v" },
    { x: 282, w: 172, t: "out", s: "(B, T, hs)", tone: "mark" },
  ];
  return (
    <Svg label="The attention head as a pipeline of shapes">
      {r1.map((b, i) => (
        <Appear key={b.t} delay={i * 0.12}>
          <Box x={b.x} y={110} w={b.w} h={64} title={b.t} sub={b.s} tone={b.tone ?? "ink"} />
          {i < r1.length - 1 && (
            <Arrow x1={b.x + b.w / 2 + 6} y1={110} x2={r1[i + 1].x - r1[i + 1].w / 2 - 8} y2={110} delay={i * 0.12 + 0.1} duration={0.3} />
          )}
        </Appear>
      ))}
      <Arrow x1={846} y1={148} x2={846} y2={250} delay={0.7} duration={0.3} />
      {r2.map((b, i) => (
        <Appear key={b.t} delay={0.75 + i * 0.12}>
          <Box x={b.x} y={290} w={b.w} h={64} title={b.t} sub={b.s} tone={b.tone ?? "ink"} active={b.t === "out"} />
          {i < r2.length - 1 && (
            <Arrow x1={b.x - b.w / 2 - 6} y1={290} x2={r2[i + 1].x + r2[i + 1].w / 2 + 8} y2={290} delay={0.8 + i * 0.12} duration={0.3} />
          )}
        </Appear>
      ))}
      <Appear delay={1.4}>
        <text x={480} y={410} textAnchor="middle" fontSize={20} className="mono" fill="var(--ink)">
          out = softmax(mask(q kᵀ / √hs)) v
        </text>
        <text x={480} y={452} textAnchor="middle" fontSize={13.5} fill="var(--ink-2)">
          All T positions are computed at once. The (T, T) matrix costs O(T² · hs) time and O(T²) memory per head.
        </text>
        <text x={480} y={480} textAnchor="middle" fontSize={13.5} fill="var(--ink-2)">
          Next: run several heads side by side.
        </text>
      </Appear>
    </Svg>
  );
}

export function Stage({ step, playing }: StageProps) {
  switch (step) {
    case 0:
      return <Roles />;
    case 1:
      return <Projections />;
    case 2:
      return <Scores playing={playing} />;
    case 3:
      return <ScaleStep />;
    case 4:
      return <WhyScale />;
    case 5:
      return <MaskStep />;
    case 6:
      return <SoftmaxStep />;
    case 7:
      return <Output />;
    case 8:
      return <Try />;
    case 9:
      return <Notes />;
    default:
      return <Recap />;
  }
}

