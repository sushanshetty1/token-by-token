"use client";

import { Appear, Arrow, Bars, Box, Chip, Label, Pill, Svg, chipWidth } from "@/components/viz/svg";
import { sequential, tokenTint } from "@/lib/color";
import type { ReactNode } from "react";
import type { StageProps } from "@/lib/types";
import { Card, Mat, WCOLOR, num } from "../averaging/kit";
import { CONCAT, HEADS, HEAD_OUT, HEAD_TINT, IT, ONE_HEAD, PROJ, TOKS, X } from "./data";
import { HeadMap } from "./HeadMap";
import { Try } from "./Try";

const tint = (h: number) => tokenTint(HEAD_TINT[h]);

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

function OneHead() {
  const xs = chipRow(TOKS, 480, 20, 16);
  const cy = 210;
  const top = cy - 20;
  return (
    <Svg label="One head has to split one softmax between two needs">
      <Label x={480} y={46} size={15} weight={650} color="var(--ink)">
        One head gives it one set of weights. Two different needs share that budget.
      </Label>
      {ONE_HEAD.map((w, j) => {
        if (j === IT) return null;
        const x1 = xs[IT];
        const x2 = xs[j];
        const h = 24 + Math.abs(IT - j) * 18;
        const mx = (x1 + x2) / 2;
        return (
          <Appear key={j} delay={0.3 + j * 0.1} y={0}>
            <path
              d={`M ${x1 - 6} ${top} Q ${mx} ${top - h * 2} ${x2 + 6} ${top}`}
              fill="none"
              stroke={WCOLOR}
              strokeWidth={1 + w * 12}
              strokeLinecap="round"
              opacity={0.3 + w * 0.7}
            />
            <Pill x={mx} y={top - h - 2} text={num(w, 2)} tone="violet" fontSize={11.5} />
          </Appear>
        );
      })}
      {TOKS.map((t, i) => (
        <g key={t} opacity={i > IT ? 0.4 : 1}>
          <Chip x={xs[i]} y={cy} text={t} index={i} fontSize={16} h={38} highlight={i === IT} delay={i * 0.04} />
        </g>
      ))}
      <Appear delay={1}>
        <Card x={150} y={262} w={420} h={236}>
          <text x={172} y={292} fontSize={13.5} fontWeight={650} fill="var(--ink-2)">
            weights of it (one softmax, sums to 1)
          </text>
          <Bars
            x={250}
            y={306}
            labels={TOKS.slice(0, IT + 1)}
            values={ONE_HEAD}
            width={220}
            row={34}
            max={1}
            color={WCOLOR}
            delay={1.1}
            format={(v) => num(v, 2)}
          />
        </Card>
        <Card x={600} y={262} w={300} h={236} tone="mark">
          <text x={620} y={296} fontSize={14} fontWeight={650} fill="var(--ink)">
            it needs two things at once
          </text>
          <text x={620} y={334} fontSize={13.5} fill="var(--ink)">
            cat: who is it? (meaning)
          </text>
          <text x={620} y={362} fontSize={13.5} fill="var(--ink)">
            because: what kind of clause
          </text>
          <text x={620} y={384} fontSize={13.5} fill="var(--ink)">
            am I in? (grammar)
          </text>
          <text x={620} y={428} fontSize={13} fill="var(--ink-2)">
            One weighted average blurs them:
          </text>
          <text x={620} y={450} fontSize={13} fill="var(--ink-2)">
            0.39 of each, mixed into one vector.
          </text>
        </Card>
      </Appear>
    </Svg>
  );
}

/** A head as a tinted box. */
function HeadBox({ x, y, h, w = 170, sub }: { x: number; y: number; h: number; w?: number; sub?: string }) {
  const t = tint(h);
  return (
    <g>
      <rect x={x - w / 2} y={y - 27} width={w} height={54} rx={12} fill={t.fill} stroke={t.stroke} strokeWidth={1.8} />
      <text x={x} y={sub ? y - 3 : y + 5} textAnchor="middle" fontSize={15} fontWeight={650} fill={t.text}>
        {`head ${h + 1}`}
      </text>
      {sub && (
        <text x={x} y={y + 15} textAnchor="middle" fontSize={11.5} className="mono" fill="var(--ink-2)">
          {sub}
        </text>
      )}
    </g>
  );
}

function Parallel() {
  const ys = [96, 214, 332, 450];
  const xx = 56;
  const xy = 210;
  const cell = 18;
  const gap = 2;
  return (
    <Svg label="Four heads run in parallel on the same x">
      <text x={xx + 79} y={xy - 18} textAnchor="middle" fontSize={14} fontWeight={650} fill="var(--ink-2)">
        x (T, C) = (7, 8)
      </text>
      <Mat x={xx} y={xy} values={X} cell={cell} gap={gap} showValues={false} />
      {ys.map((y, h) => (
        <g key={h}>
          <Arrow x1={xx + 166} y1={xy + 69} x2={300} y2={y} bend={(h - 1.5) * -8} delay={0.2 + h * 0.12} duration={0.5} />
          <Appear delay={0.4 + h * 0.12}>
            <HeadBox x={390} y={y} h={h} sub="own q, k, v" />
          </Appear>
          <Arrow x1={480} y1={y} x2={524} y2={y} delay={0.7 + h * 0.12} duration={0.3} />
          <Appear delay={0.9 + h * 0.12}>
            <rect x={530} y={y - 55} width={35} height={110} rx={6} fill="none" stroke={tint(h).stroke} strokeWidth={1.6} />
            <Mat x={534} y={y - 51} values={HEAD_OUT[h]} cell={12} gap={3} max={0.8} showValues={false} />
            <text x={576} y={y + 4} fontSize={12} className="mono" fill="var(--ink-2)">
              (T, 2)
            </text>
          </Appear>
        </g>
      ))}
      <Appear delay={1.4}>
        <Card x={660} y={150} w={270} h={250}>
          <text x={680} y={184} fontSize={14} className="mono" fill="var(--ink)">
            n_embd = 8, n_head = 4
          </text>
          <text x={680} y={214} fontSize={14} className="mono" fill="var(--ink)">
            head_size = 8 / 4 = <tspan fontWeight={700}>2</tspan>
          </text>
          <text x={680} y={256} fontSize={13.5} fill="var(--ink)">
            Same x, same mask.
          </text>
          <text x={680} y={280} fontSize={13.5} fill="var(--ink)">
            Each head has its own key,
          </text>
          <text x={680} y={300} fontSize={13.5} fill="var(--ink)">
            query and value weights.
          </text>
          <text x={680} y={342} fontSize={13} fill="var(--ink-2)">
            4 heads × 2 channels = 8,
          </text>
          <text x={680} y={362} fontSize={13} fill="var(--ink-2)">
            exactly n_embd again.
          </text>
        </Card>
      </Appear>
    </Svg>
  );
}

function Patterns() {
  const xs = [120, 410, 700];
  const y = 160;
  return (
    <Svg label="Three heads with different attention patterns on the same sentence">
      {xs.map((x, h) => (
        <Appear key={h} delay={h * 0.35}>
          <rect x={x - 6} y={60} width={220} height={34} rx={9} fill={tint(h).fill} stroke={tint(h).stroke} />
          <text x={x + 104} y={82} textAnchor="middle" fontSize={14} fontWeight={650} fill={tint(h).text}>
            {`head ${h + 1}: ${HEADS[h].name}`}
          </text>
          <HeadMap x={x} y={y} wei={HEADS[h].wei} rowLabels={h === 0} highlightRow={h === 2 ? IT : undefined} delay={0.2 + h * 0.35} />
          <text x={x + 104} y={y + 236} textAnchor="middle" fontSize={13} fill="var(--ink-2)">
            {HEADS[h].note}
          </text>
        </Appear>
      ))}
      <Appear delay={1.3}>
        <Label x={480} y={y + 290} size={13} color="var(--ink-3)">
          Illustrative patterns built from simple rules. Heads like these are found in trained models, but most are messier.
        </Label>
        <Label x={480} y={y + 316} size={13} color="var(--ink-3)">
          Same sentence, same mask, different learned weights, so each head asks a different question.
        </Label>
      </Appear>
    </Svg>
  );
}

function Concat() {
  const cell = 16;
  const gap = 3;
  const y = 170;
  const bx = [56, 112, 168, 224];
  const cx = 336;
  const blockW = 2 * cell + gap;
  const catW = 8 * cell + 7 * gap;
  const H = 7 * cell + 6 * gap;
  const ox = 756;
  return (
    <Svg label="Concatenate head outputs and project back to n_embd">
      <text x={bx[0] + 100} y={y - 34} textAnchor="middle" fontSize={14} fontWeight={650} fill="var(--ink-2)">
        4 heads, each (T, 2)
      </text>
      {bx.map((x, h) => (
        <g key={h}>
          <rect x={x - 4} y={y - 4} width={blockW + 8} height={H + 8} rx={6} fill="none" stroke={tint(h).stroke} strokeWidth={1.8} />
          <Mat x={x} y={y} values={HEAD_OUT[h]} cell={cell} gap={gap} max={0.8} showValues={false} />
          <text x={x + blockW / 2} y={y + H + 22} textAnchor="middle" fontSize={11.5} className="mono" fill={tint(h).text}>
            {`h${h + 1}`}
          </text>
        </g>
      ))}
      <Arrow x1={276} y1={y + H / 2} x2={cx - 14} y2={y + H / 2} delay={0.3} />
      <Appear delay={0.5}>
        <text x={cx + catW / 2} y={y - 34} textAnchor="middle" fontSize={14} fontWeight={650} fill="var(--ink-2)">
          torch.cat(..., dim=-1)
        </text>
        {[0, 1, 2, 3].map((h) => (
          <rect key={h} x={cx + h * (blockW + gap) - 2} y={y - 4} width={blockW + 4} height={H + 8} rx={5} fill="none" stroke={tint(h).stroke} strokeWidth={1.8} />
        ))}
        <Mat x={cx} y={y} values={CONCAT} cell={cell} gap={gap} max={0.8} showValues={false} delay={0.5} />
        <text x={cx + catW / 2} y={y + H + 22} textAnchor="middle" fontSize={12} className="mono" fill="var(--ink-2)">
          (T, 8) = (T, C)
        </text>
      </Appear>
      <Arrow x1={cx + catW + 14} y1={y + H / 2} x2={590} y2={y + H / 2} delay={0.8} />
      <Appear delay={0.9}>
        <Box x={650} y={y + H / 2} w={116} h={64} title="proj" sub="Linear(C, C)" tone="accent" />
      </Appear>
      <Arrow x1={712} y1={y + H / 2} x2={ox - 12} y2={y + H / 2} delay={1.1} />
      <Appear delay={1.2}>
        <text x={ox + catW / 2} y={y - 34} textAnchor="middle" fontSize={14} fontWeight={650} fill="var(--ink-2)">
          output
        </text>
        <Mat x={ox} y={y} values={PROJ} cell={cell} gap={gap} max={1} showValues={false} delay={1.2} />
        <text x={ox + catW / 2} y={y + H + 22} textAnchor="middle" fontSize={12} className="mono" fill="var(--ink-2)">
          (T, C)
        </text>
      </Appear>
      <Appear delay={1.5}>
        <text x={480} y={410} textAnchor="middle" fontSize={15} className="mono" fill="var(--ink)">
          out = proj(torch.cat([h(x) for h in heads], dim=-1))
        </text>
        <text x={480} y={446} textAnchor="middle" fontSize={13.5} fill="var(--ink-2)">
          Concatenation keeps each head in its own slice of channels. The projection lets them mix
        </text>
        <text x={480} y={468} textAnchor="middle" fontSize={13.5} fill="var(--ink-2)">
          and brings the result back to the shape of x, so it can be added to x (Day 5).
        </text>
      </Appear>
    </Svg>
  );
}

/** Stacked pages: a tensor with an n_head dimension. */
function Pages({ x, y, w, h, label, maps }: { x: number; y: number; w: number; h: number; label: string; maps?: boolean }) {
  return (
    <g>
      {[3, 2, 1, 0].map((k) => (
        <g key={k} transform={`translate(${k * 12} ${-k * 10})`}>
          <rect x={x} y={y} width={w} height={h} rx={6} fill="var(--card)" stroke={tint(k).stroke} strokeWidth={1.6} />
          {maps ? (
            <g>
              {HEADS[k].wei.map((row, r) =>
                row.map((v, c) => (
                  <rect
                    key={`${r}-${c}`}
                    x={x + 5 + c * ((w - 10) / 7)}
                    y={y + 5 + r * ((h - 10) / 7)}
                    width={(w - 10) / 7 - 1}
                    height={(h - 10) / 7 - 1}
                    fill={c > r ? "url(#hatch)" : sequential(v, WCOLOR)}
                  />
                )),
              )}
            </g>
          ) : (
            <rect x={x + 5} y={y + 5} width={w - 10} height={h - 10} rx={3} fill={tint(k).fill} />
          )}
        </g>
      ))}
      <text x={x + w / 2 + 18} y={y + h + 24} textAnchor="middle" fontSize={11.5} className="mono" fill="var(--ink-3)">
        {label}
      </text>
    </g>
  );
}

function Batched() {
  const stage = (cx: number, cy: number, code: string, shape: string, delay: number, body: ReactNode) => (
    <Appear delay={delay}>
      <text x={cx} y={cy - 74} textAnchor="middle" fontSize={12.5} className="mono" fill="var(--ink)">
        {code}
      </text>
      {body}
      <Pill x={cx} y={cy + 78} text={shape} tone="mark" fontSize={12.5} />
    </Appear>
  );
  const qkv = ["q", "k", "v"] as const;
  return (
    <Svg label="Batched multi-head attention as a sequence of tensor shapes">
      {stage(
        170,
        140,
        "self.c_attn(x)",
        "(B, T, 3C)",
        0.1,
        <g>
          {qkv.map((t, i) => (
            <rect key={t} x={80 + i * 60} y={120} width={60} height={40} fill={`var(--${t}-soft)`} stroke={`var(--${t})`} strokeWidth={1.6} />
          ))}
          {qkv.map((t, i) => (
            <text key={`l${t}`} x={110 + i * 60} y={145} textAnchor="middle" fontSize={14} className="mono" fontWeight={700} fill={`var(--${t})`}>
              {t}
            </text>
          ))}
        </g>,
      )}
      <Arrow x1={290} y1={140} x2={372} y2={140} delay={0.3} duration={0.3} />
      {stage(
        480,
        140,
        ".split(C, dim=2)",
        "3 × (B, T, C)",
        0.4,
        <g>
          {qkv.map((t, i) => (
            <g key={t}>
              <rect x={420} y={102 + i * 26} width={120} height={22} rx={4} fill={`var(--${t}-soft)`} stroke={`var(--${t})`} strokeWidth={1.4} />
              <text x={480} y={118 + i * 26} textAnchor="middle" fontSize={12} className="mono" fontWeight={700} fill={`var(--${t})`}>
                {t}
              </text>
            </g>
          ))}
        </g>,
      )}
      <Arrow x1={588} y1={140} x2={680} y2={140} delay={0.6} duration={0.3} />
      {stage(790, 140, ".view(B, T, nh, hs).transpose(1, 2)", "(B, nh, T, hs)", 0.7, <Pages x={740} y={112} w={64} h={56} label="one page per head" />)}
      <Arrow x1={800} y1={240} x2={800} y2={310} delay={0.9} duration={0.3} />
      {stage(790, 404, "q @ k.transpose(-2, -1), mask, softmax", "(B, nh, T, T)", 1.0, <Pages x={740} y={370} w={70} h={70} label="one attention map per head" maps />)}
      <Arrow x1={652} y1={404} x2={590} y2={404} delay={1.2} duration={0.3} />
      {stage(480, 404, "att @ v", "(B, nh, T, hs)", 1.3, <Pages x={436} y={376} w={64} h={56} label="each head's output" />)}
      <Arrow x1={398} y1={404} x2={300} y2={404} delay={1.5} duration={0.3} />
      {stage(
        170,
        404,
        ".transpose(1, 2).view(B, T, C)",
        "(B, T, C)",
        1.6,
        <g>
          {[0, 1, 2, 3].map((h) => (
            <rect key={h} x={90 + h * 40} y={384} width={40} height={40} fill={tint(h).fill} stroke={tint(h).stroke} strokeWidth={1.4} />
          ))}
          <text x={170} y={450} textAnchor="middle" fontSize={11.5} className="mono" fill="var(--ink-3)">
            heads side by side, then c_proj
          </text>
        </g>,
      )}
    </Svg>
  );
}

function Params() {
  const x0 = 70;
  const y0 = 120;
  const side = 150;
  const qkv = ["q", "k", "v"] as const;
  return (
    <Svg label="Parameters of an attention layer">
      <text x={x0} y={70} fontSize={15} fontWeight={650} fill="var(--ink)">
        c_attn = Linear(C, 3C)
      </text>
      {qkv.map((t, i) => (
        <Appear key={t} delay={i * 0.15}>
          <rect x={x0 + i * side} y={y0} width={side} height={side} fill={`var(--${t}-soft)`} stroke={`var(--${t})`} strokeWidth={1.6} />
          {[1, 2, 3].map((k) => (
            <line
              key={k}
              x1={x0 + i * side + (k * side) / 4}
              x2={x0 + i * side + (k * side) / 4}
              y1={y0 + 4}
              y2={y0 + side - 4}
              stroke={`var(--${t})`}
              strokeDasharray="3 4"
              opacity={0.6}
            />
          ))}
          <rect x={x0 + i * side + side / 2 - 28} y={y0 + side / 2 - 14} width={56} height={26} rx={6} fill="var(--card)" stroke={`var(--${t})`} />
          <text x={x0 + i * side + side / 2} y={y0 + side / 2 + 5} textAnchor="middle" fontSize={15} className="mono" fontWeight={700} fill={`var(--${t})`}>
            {`W_${t}`}
          </text>
          <text x={x0 + i * side + side / 2} y={y0 - 10} textAnchor="middle" fontSize={12} className="mono" fill="var(--ink-2)">
            C × C
          </text>
        </Appear>
      ))}
      <rect x={x0} y={y0 + side + 10} width={side * 3} height={14} rx={3} fill="var(--paper-2)" stroke="var(--rule-strong)" />
      <text x={x0 + side * 1.5} y={y0 + side + 44} textAnchor="middle" fontSize={12} className="mono" fill="var(--ink-2)">
        bias: 3C
      </text>
      <text x={x0 - 10} y={y0 + side / 2 + 4} textAnchor="end" fontSize={12} className="mono" fill="var(--ink-2)">
        C
      </text>
      <Appear delay={0.5}>
        <text x={640} y={70} fontSize={15} fontWeight={650} fill="var(--ink)">
          c_proj = Linear(C, C)
        </text>
        <rect x={660} y={y0} width={side} height={side} fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth={1.6} />
        <text x={660 + side / 2} y={y0 + side / 2 + 5} textAnchor="middle" fontSize={15} className="mono" fontWeight={700} fill="var(--accent)">
          W_proj
        </text>
        <text x={660 + side / 2} y={y0 - 10} textAnchor="middle" fontSize={12} className="mono" fill="var(--ink-2)">
          C × C
        </text>
        <rect x={660} y={y0 + side + 10} width={side} height={14} rx={3} fill="var(--paper-2)" stroke="var(--rule-strong)" />
        <text x={660 + side / 2} y={y0 + side + 44} textAnchor="middle" fontSize={12} className="mono" fill="var(--ink-2)">
          bias: C
        </text>
      </Appear>
      <Appear delay={0.9}>
        <text x={x0} y={372} fontSize={13} fill="var(--ink-2)">
          Dashed lines: the 4 heads are just column slices of each matrix. Changing n_head moves the lines, not the size.
        </text>
        <Card x={x0} y={398} w={820} h={96} tone="mark">
          <text x={x0 + 22} y={432} fontSize={15} className="mono" fill="var(--ink)">
            c_attn: 3C² + 3C
          </text>
          <text x={x0 + 260} y={432} fontSize={15} className="mono" fill="var(--ink)">
            c_proj: C² + C
          </text>
          <text x={x0 + 22} y={466} fontSize={13.5} fill="var(--ink-2)">
            Add them up and plug in C = 768 for GPT-2 small. n_head does not appear anywhere.
          </text>
        </Card>
      </Appear>
    </Svg>
  );
}

function CommCompute() {
  const toks = TOKS.slice(0, 5);
  const lx = chipRow(toks, 240, 12, 14);
  const rx = chipRow(toks, 720, 12, 14);
  const y = 230;
  const arcs: [number, number][] = [
    [1, 0],
    [2, 1],
    [3, 2],
    [4, 1],
    [4, 3],
  ];
  return (
    <Svg label="Attention moves information between tokens; the MLP processes each token on its own">
      <Card x={36} y={50} w={420} h={340} />
      <Card x={504} y={50} w={420} h={340} />
      <text x={246} y={78} textAnchor="middle" fontSize={16} fontWeight={700} fill="var(--ink)">
        Attention: communication
      </text>
      <text x={246} y={102} textAnchor="middle" fontSize={13} fill="var(--ink-2)">
        tokens read from earlier tokens
      </text>
      <text x={714} y={78} textAnchor="middle" fontSize={16} fontWeight={700} fill="var(--ink)">
        MLP: computation
      </text>
      <text x={714} y={102} textAnchor="middle" fontSize={13} fill="var(--ink-2)">
        each token thinks on its own (Day 5)
      </text>
      {arcs.map(([a, b], k) => {
        const h = 20 + (a - b) * 22;
        return (
          <Appear key={k} delay={0.3 + k * 0.12} y={0}>
            <path
              d={`M ${lx[a]} ${y - 20} Q ${(lx[a] + lx[b]) / 2} ${y - 20 - h * 2} ${lx[b]} ${y - 20}`}
              fill="none"
              stroke={WCOLOR}
              strokeWidth={2}
              markerEnd="url(#arrow-violet)"
            />
          </Appear>
        );
      })}
      {toks.map((t, i) => (
        <Chip key={`l${t}`} x={lx[i]} y={y} text={t} index={i} fontSize={14} h={34} />
      ))}
      <text x={246} y={318} textAnchor="middle" fontSize={13.5} fill="var(--ink)">
        Mixes vectors across positions.
      </text>
      <text x={246} y={342} textAnchor="middle" fontSize={13.5} fill="var(--ink)">
        The weights depend on the data.
      </text>
      {toks.map((t, i) => (
        <g key={`r${t}`}>
          <Chip x={rx[i]} y={y - 60} text={t} index={i} fontSize={14} h={34} />
          <Arrow x1={rx[i]} y1={y - 40} x2={rx[i]} y2={y - 6} delay={0.4 + i * 0.08} duration={0.3} />
          <Appear delay={0.5 + i * 0.08}>
            <rect x={rx[i] - chipWidth(t, 14) / 2} y={y} width={chipWidth(t, 14)} height={34} rx={8} fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth={1.4} />
            <text x={rx[i]} y={y + 22} textAnchor="middle" fontSize={12.5} className="mono" fill="var(--ink)">
              MLP
            </text>
          </Appear>
        </g>
      ))}
      <text x={714} y={318} textAnchor="middle" fontSize={13.5} fill="var(--ink)">
        The same small network on every token.
      </text>
      <text x={714} y={342} textAnchor="middle" fontSize={13.5} fill="var(--ink)">
        No information crosses positions.
      </text>
      <Appear delay={1.2}>
        <text x={480} y={436} textAnchor="middle" fontSize={16} className="mono" fill="var(--ink)">
          x = x + attn(ln(x)); x = x + mlp(ln(x))
        </text>
        <text x={480} y={466} textAnchor="middle" fontSize={13.5} fill="var(--ink-2)">
          A transformer block alternates the two. Gather information, then process it.
        </text>
      </Appear>
    </Svg>
  );
}

function Recap() {
  const ys = [66, 172, 278, 384];
  return (
    <Svg label="Recap: heads in parallel, concatenate, project">
      <Box x={90} y={270} w={110} h={64} title="x" sub="(B, T, C)" />
      {ys.map((y, h) => (
        <g key={h}>
          <Arrow x1={146} y1={270} x2={238} y2={y + 44} delay={0.1 + h * 0.08} duration={0.4} />
          <Appear delay={0.2 + h * 0.1}>
            <rect x={246} y={y} width={92} height={88} rx={8} fill={tint(h).fill} stroke={tint(h).stroke} strokeWidth={1.6} />
            <HeadMap x={256} y={y + 8} wei={HEADS[h].wei} cell={9} gap={1} colLabels={false} />
            <text x={350} y={y + 40} fontSize={12.5} fontWeight={650} fill={tint(h).text}>
              {`head ${h + 1}`}
            </text>
            <text x={350} y={y + 58} fontSize={11.5} className="mono" fill="var(--ink-3)">
              {HEADS[h].short}
            </text>
            <Arrow x1={430} y1={y + 44} x2={496} y2={270} delay={0.4 + h * 0.08} duration={0.4} />
          </Appear>
        </g>
      ))}
      <Appear delay={0.8}>
        <Box x={560} y={270} w={120} h={64} title="concat" sub="(B, T, C)" tone="violet" />
      </Appear>
      <Arrow x1={622} y1={270} x2={676} y2={270} delay={0.9} duration={0.3} />
      <Appear delay={1}>
        <Box x={734} y={270} w={100} h={64} title="proj" sub="C × C" tone="accent" />
      </Appear>
      <Arrow x1={786} y1={270} x2={830} y2={270} delay={1.1} duration={0.3} />
      <Appear delay={1.2}>
        <Box x={872} y={270} w={76} h={64} title="out" sub="(B, T, C)" tone="mark" active />
      </Appear>
      <Appear delay={1.3}>
        <text x={680} y={392} textAnchor="middle" fontSize={13.5} fill="var(--ink)">
          head_size = n_embd / n_head
        </text>
        <text x={680} y={418} textAnchor="middle" fontSize={13.5} fill="var(--ink)">
          parameters: 4C² + 4C, for any n_head
        </text>
        <text x={680} y={444} textAnchor="middle" fontSize={13.5} fill="var(--ink)">
          attention communicates, the MLP computes
        </text>
      </Appear>
    </Svg>
  );
}

export function Stage({ step }: StageProps) {
  switch (step) {
    case 0:
      return <OneHead />;
    case 1:
      return <Parallel />;
    case 2:
      return <Patterns />;
    case 3:
      return <Concat />;
    case 4:
      return <Batched />;
    case 5:
      return <Params />;
    case 6:
      return <CommCompute />;
    case 7:
      return <Try />;
    default:
      return <Recap />;
  }
}
