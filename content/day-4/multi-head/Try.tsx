"use client";

import { useState } from "react";
import { Segmented } from "@/components/viz/controls";
import { Svg } from "@/components/viz/svg";
import { tokenTint } from "@/lib/color";
import { GPT2_C, HEADS, HEAD_TINT, IT, TOKS, attnParams } from "./data";
import { HeadMap } from "./HeadMap";

const NHEADS = [1, 2, 3, 4, 6, 8, 12];
const BAR_X = 480;
const BAR_W = 440;

export function Try() {
  const [head, setHead] = useState(2);
  const [nh, setNh] = useState(12);
  const hs = GPT2_C / nh;
  const t = tokenTint(HEAD_TINT[head]);
  const itRow = HEADS[head].wei[IT];
  const top = itRow
    .map((w, j) => ({ w, j }))
    .filter((e) => e.j <= IT)
    .sort((a, b) => b.w - a.w)[0];

  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0">
          <Svg h={440} label="Interactive: pick a head and change the number of heads">
            <rect x={110} y={22} width={280} height={32} rx={9} fill={t.fill} stroke={t.stroke} />
            <text x={250} y={43} textAnchor="middle" fontSize={14} fontWeight={650} fill={t.text}>
              {`head ${head + 1}: ${HEADS[head].name}`}
            </text>
            <HeadMap x={126} y={108} wei={HEADS[head].wei} cell={34} gap={3} rowLabels highlightRow={IT} />
            <text x={250} y={392} textAnchor="middle" fontSize={13} fill="var(--ink-2)">
              {HEADS[head].note}
            </text>
            <text x={250} y={416} textAnchor="middle" fontSize={13} className="mono" fill="var(--ink)">
              {`it listens most to ${TOKS[top.j]} (${top.w.toFixed(2)})`}
            </text>

            <text x={BAR_X} y={44} fontSize={15} fontWeight={650} fill="var(--ink)">
              GPT-2 small: n_embd = 768
            </text>
            <text x={BAR_X} y={70} fontSize={12.5} fill="var(--ink-3)">
              the 768 channels of q (and of k and v), split into heads
            </text>
            {Array.from({ length: nh }, (_, h) => {
              const w = BAR_W / nh;
              const ti = tokenTint(HEAD_TINT[h % 4]);
              return (
                <g key={h}>
                  <rect x={BAR_X + h * w} y={86} width={w} height={46} fill={ti.fill} stroke={ti.stroke} strokeWidth={1.4} />
                  {w >= 30 && (
                    <text x={BAR_X + h * w + w / 2} y={114} textAnchor="middle" fontSize={w >= 52 ? 13 : 11.5} className="mono" fill={ti.text} fontWeight={650}>
                      {hs}
                    </text>
                  )}
                </g>
              );
            })}
            <text x={BAR_X} y={154} fontSize={12} className="mono" fill="var(--ink-3)">
              {nh === 1 ? "one head uses all 768 channels" : `${nh} slices of ${hs} channels`}
            </text>

            {[
              ["n_head", String(nh)],
              ["head_size = 768 / n_head", String(hs)],
              ["q, k, v per head", `(B, T, ${hs})`],
              ["attention maps", `${nh} × (T, T)`],
              ["score work, all heads", `${nh} × T² × ${hs} = T² × 768`],
              ["parameters, 4C² + 4C", attnParams(GPT2_C).toLocaleString("en-US")],
            ].map(([k, v], i) => (
              <g key={k}>
                <text x={BAR_X} y={198 + i * 36} fontSize={13.5} fill="var(--ink-2)">
                  {k}
                </text>
                <text
                  x={BAR_X + BAR_W}
                  y={198 + i * 36}
                  textAnchor="end"
                  fontSize={14.5}
                  className="mono"
                  fontWeight={650}
                  fill={i === 5 ? "var(--ok)" : "var(--ink)"}
                >
                  {v}
                </text>
                <line x1={BAR_X} x2={BAR_X + BAR_W} y1={208 + i * 36} y2={208 + i * 36} stroke="var(--rule)" />
              </g>
            ))}
            <text x={BAR_X} y={420} fontSize={12.5} fill="var(--ink-3)">
              More, smaller heads. Same parameters, same matmul work.
            </text>
          </Svg>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-2 border-t border-rule bg-card/95 px-4 py-2.5">
        <div className="flex flex-col gap-1">
          <span className="text-[12.5px] font-semibold text-ink">Show head</span>
          <Segmented
            label="Show head"
            value={String(head)}
            onChange={(v) => setHead(Number(v))}
            options={HEADS.map((h, i) => ({ value: String(i), label: h.short }))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[12.5px] font-semibold text-ink">n_head for GPT-2 small</span>
          <Segmented
            label="n_head"
            value={String(nh)}
            onChange={(v) => setNh(Number(v))}
            options={NHEADS.map((n) => ({ value: String(n), label: String(n) }))}
          />
        </div>
      </div>
    </div>
  );
}
