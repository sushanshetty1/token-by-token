"use client";

import { useState } from "react";
import { Segmented, Slider, Toggle } from "@/components/viz/controls";
import { Chip, Svg } from "@/components/viz/svg";
import { sequential } from "@/lib/color";
import { Mat, WCOLOR, num, short, softmaxRow, svgPoint, vec } from "../averaging/kit";
import { HS, K, Q, TOK, V } from "./data";

const CX = 214;
const CY = 220;
const U = 54;
const LIM = 3.4;
const px = (v: number[]) => [CX + v[0] * U, CY - v[1] * U] as const;
const clamp = (v: number) => Math.max(-LIM, Math.min(LIM, Math.round(v * 10) / 10));

export function Try() {
  const [asker, setAsker] = useState(2);
  const [q, setQ] = useState<number[]>([...Q[2]]);
  const [mask, setMask] = useState(true);
  const [scaleOn, setScaleOn] = useState(true);
  const [drag, setDrag] = useState(false);

  const pick = (i: number) => {
    setAsker(i);
    setQ([...Q[i]]);
  };

  const raw = K.map((k) => q[0] * k[0] + q[1] * k[1]);
  const scaled = raw.map((s) => (scaleOn ? s / Math.sqrt(HS) : s));
  const visible = (j: number) => !mask || j <= asker;
  const w = softmaxRow(scaled.map((s, j) => (visible(j) ? s : -Infinity)));
  const out = [0, 1].map((c) => w.reduce((acc, wj, j) => acc + wj * V[j][c], 0));
  const [qx, qy] = px(q);
  const rowY = (j: number) => 106 + j * 60;

  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0">
          <Svg h={440} label="Interactive: drag the query and watch the attention weights">
            <rect x={CX - LIM * U} y={CY - LIM * U} width={2 * LIM * U} height={2 * LIM * U} rx={10} fill="var(--card)" stroke="var(--rule)" />
            {[-3, -2, -1, 1, 2, 3].map((t) => (
              <g key={t}>
                <line x1={CX + t * U} x2={CX + t * U} y1={CY - LIM * U} y2={CY + LIM * U} stroke="var(--grid)" />
                <line x1={CX - LIM * U} x2={CX + LIM * U} y1={CY + t * U} y2={CY + t * U} stroke="var(--grid)" />
              </g>
            ))}
            <line x1={CX - LIM * U} x2={CX + LIM * U} y1={CY} y2={CY} stroke="var(--rule-strong)" />
            <line x1={CX} x2={CX} y1={CY - LIM * U} y2={CY + LIM * U} stroke="var(--rule-strong)" />
            {K.map((k, j) => {
              const [x, y] = px(k);
              const on = visible(j);
              const len = Math.hypot(k[0], k[1]) || 1;
              return (
                <g key={j} opacity={on ? 1 : 0.4}>
                  <line
                    x1={CX}
                    y1={CY}
                    x2={x}
                    y2={y}
                    stroke="var(--k)"
                    strokeWidth={2.4}
                    strokeDasharray={on ? undefined : "5 4"}
                    markerEnd="url(#arrow-k)"
                  />
                  <text
                    x={x + (k[0] / len) * 16}
                    y={y - (k[1] / len) * 16 + 4}
                    textAnchor={k[0] < -0.2 ? "end" : k[0] > 0.2 ? "start" : "middle"}
                    fontSize={13}
                    className="mono"
                    fontWeight={650}
                    fill="var(--k)"
                  >
                    {`k ${TOK[j]}`}
                  </text>
                </g>
              );
            })}
            <line x1={CX} y1={CY} x2={qx} y2={qy} stroke="var(--q)" strokeWidth={3.4} markerEnd="url(#arrow-q)" />
            <circle
              cx={qx}
              cy={qy}
              r={drag ? 13 : 11}
              fill="var(--q-soft)"
              stroke="var(--q)"
              strokeWidth={2.4}
              style={{ cursor: "grab", touchAction: "none" }}
              onPointerDown={(e) => {
                (e.target as Element).setPointerCapture(e.pointerId);
                setDrag(true);
              }}
              onPointerMove={(e) => {
                if (!drag) return;
                const p = svgPoint(e);
                setQ([clamp((p.x - CX) / U), clamp((CY - p.y) / U)]);
              }}
              onPointerUp={() => setDrag(false)}
              onPointerCancel={() => setDrag(false)}
            />
            <text x={qx + 14} y={qy - 14} fontSize={13} className="mono" fontWeight={700} fill="var(--q)">
              {`q ${TOK[asker]}`}
            </text>
            <text x={CX} y={CY + LIM * U + 20} textAnchor="middle" fontSize={12} fill="var(--ink-3)">
              drag the blue dot
            </text>

            <text x={470} y={52} fontSize={12} fontWeight={650} fill="var(--ink-3)">
              key
            </text>
            <text x={590} y={52} textAnchor="end" fontSize={12} fontWeight={650} fill="var(--ink-3)">
              q · k
            </text>
            <text x={672} y={52} textAnchor="end" fontSize={12} fontWeight={650} fill="var(--ink-3)">
              {scaleOn ? "÷ √2" : "unscaled"}
            </text>
            <text x={700} y={52} fontSize={12} fontWeight={650} fill="var(--ink-3)">
              attention weight
            </text>
            {TOK.map((t, j) => {
              const on = visible(j);
              const y = rowY(j);
              return (
                <g key={t}>
                  <Chip x={500} y={y} text={t} index={j} fontSize={13} h={28} highlight={j === asker} />
                  <text x={590} y={y + 5} textAnchor="end" fontSize={15} className="mono" fill={on ? "var(--ink)" : "var(--ink-3)"}>
                    {short(raw[j], 2)}
                  </text>
                  <text x={672} y={y + 5} textAnchor="end" fontSize={15} className="mono" fill={on ? "var(--ink)" : "var(--ink-3)"}>
                    {on ? short(scaled[j], 2) : "-∞"}
                  </text>
                  <rect x={700} y={y - 16} width={200} height={32} rx={7} fill={on ? "var(--paper-2)" : "url(#hatch)"} stroke="var(--rule)" />
                  {on && (
                    <rect x={700} y={y - 16} width={Math.max(0, w[j] * 200)} height={32} rx={7} fill={sequential(0.35 + w[j] * 0.65, WCOLOR)} />
                  )}
                  <text x={712} y={y + 5} fontSize={14} className="mono" fontWeight={650} fill={on && w[j] > 0.6 ? "var(--card)" : "var(--ink)"}>
                    {on ? num(w[j], 2) : "0, masked"}
                  </text>
                </g>
              );
            })}
            <text x={470} y={374} fontSize={14} className="mono" fill="var(--ink)">
              {`out[${TOK[asker]}] = sum of weight × v =`}
            </text>
            <Mat x={800} y={344} values={[out]} cell={48} gap={4} max={2.5} format={(v) => short(v, 2)} stagger={0} />
            <text x={470} y={404} fontSize={12} className="mono" fill="var(--ink-3)">
              {`v: the ${vec(V[0], 1)}   river ${vec(V[1], 1)}`}
            </text>
            <text x={492} y={424} fontSize={12} className="mono" fill="var(--ink-3)">
              {`bank ${vec(V[2], 1)}  flooded ${vec(V[3], 1)}`}
            </text>
          </Svg>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-rule bg-card/95 px-4 py-2.5">
        <div className="flex flex-col gap-1">
          <span className="text-[12.5px] font-semibold text-ink">Who is asking</span>
          <Segmented
            label="Who is asking"
            value={String(asker)}
            onChange={(v) => pick(Number(v))}
            options={TOK.map((t, i) => ({ value: String(i), label: t }))}
          />
        </div>
        <div className="w-[180px]">
          <Slider label="q[0]" value={q[0]} min={-LIM} max={LIM} step={0.1} onChange={(v) => setQ([clamp(v), q[1]])} format={(v) => short(v, 1)} />
        </div>
        <div className="w-[180px]">
          <Slider label="q[1]" value={q[1]} min={-LIM} max={LIM} step={0.1} onChange={(v) => setQ([q[0], clamp(v)])} format={(v) => short(v, 1)} />
        </div>
        <div className="flex w-[180px] flex-col">
          <Toggle label="Causal mask" checked={mask} onChange={setMask} />
          <Toggle label="Scale by 1/√2" checked={scaleOn} onChange={setScaleOn} />
        </div>
      </div>
    </div>
  );
}
