"use client";

import { useState } from "react";
import { Slider, Toggle } from "@/components/viz/controls";
import { Chip, Svg, chipWidth } from "@/components/viz/svg";
import { sequential } from "@/lib/color";
import { TOK8, X8 } from "./data";
import { Mat, WCOLOR, matmul, num, softmaxRows, svgPoint, vec } from "./kit";

const LO = -4;
const HI = 4;
const TOP = 92;
const BOT = 244;
const yOf = (s: number) => BOT - ((s - LO) / (HI - LO)) * (BOT - TOP);
const sOf = (y: number) => Math.max(LO, Math.min(HI, LO + ((BOT - y) / (BOT - TOP)) * (HI - LO)));

export function Try() {
  const [T, setT] = useState(4);
  const [row, setRow] = useState(2);
  const [mask, setMask] = useState(true);
  const [scores, setScores] = useState(() => TOK8.map(() => TOK8.map(() => 0)));
  const [drag, setDrag] = useState<number | null>(null);

  const r = Math.min(row, T - 1);
  const S = scores.slice(0, T).map((rw, i) => rw.slice(0, T).map((v, j) => (mask && j > i ? -Infinity : v)));
  const W = softmaxRows(S);
  const out = matmul(W, X8.slice(0, T));
  const plain = matmul(softmaxRows(S.map((rw) => rw.map((v) => (Number.isFinite(v) ? 0 : v)))), X8.slice(0, T));

  const setScore = (j: number, v: number) =>
    setScores((prev) => prev.map((rw, i) => (i === r ? rw.map((s, k) => (k === j ? Math.round(v * 10) / 10 : s)) : rw)));

  const cell = T <= 4 ? 46 : T <= 6 ? 38 : 30;
  const gap = 4;
  const mx = 140;
  const my = 92;
  const colX = (j: number) => 532 + j * 54;

  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0">
          <Svg h={440} label="Interactive: drag scores and watch the softmax weights">
            <text x={mx + ((cell + gap) * T) / 2} y={36} textAnchor="middle" fontSize={14} fontWeight={650} fill="var(--ink-2)">
              {`wei (T, T) = (${T}, ${T})`}
            </text>
            {TOK8.slice(0, T).map((t, j) => (
              <text
                key={j}
                x={mx + j * (cell + gap) + cell / 2 + 4}
                y={my - 8}
                fontSize={11}
                className="mono"
                fill={j === r ? "var(--ink)" : "var(--ink-3)"}
                transform={`rotate(-40 ${mx + j * (cell + gap) + cell / 2 + 4} ${my - 8})`}
              >
                {t}
              </text>
            ))}
            {TOK8.slice(0, T).map((t, i) => {
              const w = chipWidth(t, 12);
              return (
                <g key={i} onClick={() => setRow(i)} style={{ cursor: "pointer" }}>
                  <Chip x={mx - 10 - w / 2} y={my + i * (cell + gap) + cell / 2} text={t} index={i} fontSize={12} h={Math.min(26, cell - 4)} highlight={i === r} />
                </g>
              );
            })}
            <Mat
              x={mx}
              y={my}
              values={W}
              cell={cell}
              gap={gap}
              mode="sequential"
              color={WCOLOR}
              masked={mask ? (i, j) => j > i : undefined}
              format={(v) => (v === 0 ? "0" : num(v, 2))}
              highlightRow={r}
              stagger={0}
            />
            {W.map((_, i) => (
              <rect
                key={i}
                x={mx}
                y={my + i * (cell + gap)}
                width={T * (cell + gap)}
                height={cell}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onClick={() => setRow(i)}
              />
            ))}

            <text x={500} y={36} fontSize={14} fontWeight={650} fill="var(--ink-2)">
              {`Row ${TOK8[r]}: drag each score`}
            </text>
            <text x={500} y={yOf(0) + 4} textAnchor="end" fontSize={11} className="mono" fill="var(--ink-3)">
              0
            </text>
            <text x={500} y={TOP + 4} textAnchor="end" fontSize={11} className="mono" fill="var(--ink-3)">
              +4
            </text>
            <text x={500} y={BOT + 4} textAnchor="end" fontSize={11} className="mono" fill="var(--ink-3)">
              -4
            </text>
            <line x1={508} x2={colX(T - 1) + 24} y1={yOf(0)} y2={yOf(0)} stroke="var(--rule-strong)" strokeDasharray="3 3" />
            {TOK8.slice(0, T).map((t, j) => {
              const x = colX(j);
              const hidden = mask && j > r;
              const s = scores[r][j];
              return (
                <g key={j}>
                  <rect x={x - 14} y={TOP} width={28} height={BOT - TOP} rx={7} fill={hidden ? "url(#hatch)" : "var(--paper-2)"} stroke="var(--rule)" />
                  {hidden ? (
                    <text x={x} y={yOf(0) + 5} textAnchor="middle" fontSize={13} className="mono" fontWeight={600} fill="var(--ink-2)">
                      -∞
                    </text>
                  ) : (
                    <g>
                      <rect
                        x={x - 8}
                        y={Math.min(yOf(0), yOf(s))}
                        width={16}
                        height={Math.abs(yOf(s) - yOf(0))}
                        rx={3}
                        fill={s >= 0 ? "var(--pos)" : "var(--neg)"}
                        opacity={0.75}
                      />
                      <circle
                        cx={x}
                        cy={yOf(s)}
                        r={drag === j ? 11 : 9}
                        fill="var(--card)"
                        stroke="var(--ink)"
                        strokeWidth={2.2}
                        tabIndex={0}
                        role="slider"
                        aria-label={`score for ${t}`}
                        aria-valuemin={LO}
                        aria-valuemax={HI}
                        aria-valuenow={s}
                        style={{ cursor: "ns-resize", touchAction: "none", outline: "none" }}
                        onPointerDown={(e) => {
                          (e.target as Element).setPointerCapture(e.pointerId);
                          setDrag(j);
                        }}
                        onPointerMove={(e) => {
                          if (drag !== j) return;
                          setScore(j, sOf(svgPoint(e).y));
                        }}
                        onPointerUp={() => setDrag(null)}
                        onPointerCancel={() => setDrag(null)}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setScore(j, Math.min(HI, s + 0.5));
                          } else if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setScore(j, Math.max(LO, s - 0.5));
                          }
                        }}
                      />
                      <text x={x} y={TOP - 10} textAnchor="middle" fontSize={12} className="mono" fill="var(--ink)">
                        {num(s, 1)}
                      </text>
                    </g>
                  )}
                  <text x={x} y={BOT + 22} textAnchor="middle" fontSize={11} className="mono" fill={j === r ? "var(--ink)" : "var(--ink-3)"}>
                    {t}
                  </text>
                  <rect
                    x={x - 24}
                    y={BOT + 34}
                    width={48}
                    height={40}
                    rx={6}
                    fill={hidden ? "url(#hatch)" : sequential(W[r][j], WCOLOR)}
                    stroke="var(--rule)"
                  />
                  {!hidden && (
                    <text
                      x={x}
                      y={BOT + 59}
                      textAnchor="middle"
                      fontSize={13}
                      className="mono"
                      fill={W[r][j] > 0.56 ? "var(--card)" : "var(--ink)"}
                    >
                      {num(W[r][j], 2)}
                    </text>
                  )}
                </g>
              );
            })}
            <text x={500} y={BOT + 59} textAnchor="end" fontSize={12} fontWeight={650} fill="var(--ink-2)">
              weight
            </text>
            <text x={500} y={356} fontSize={15} className="mono" fill="var(--ink)">
              {`out[${TOK8[r]}] = wei @ x = `}
              <tspan fontWeight={700}>{vec(out[r])}</tspan>
            </text>
            <text x={500} y={384} fontSize={13} className="mono" fill="var(--ink-3)">
              {`plain average was ${vec(plain[r])}`}
            </text>
            <text x={500} y={414} fontSize={12.5} fill="var(--ink-3)">
              Click a row on the left to edit a different token.
            </text>
          </Svg>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-rule bg-card/95 px-4 py-2.5">
        <div className="w-[170px]">
          <Slider label="T (tokens)" value={T} min={1} max={8} step={1} onChange={(v) => setT(v)} format={(v) => String(v)} />
        </div>
        <div className="w-[190px]">
          <Slider
            label="Row asking"
            value={r}
            min={0}
            max={Math.max(1, T - 1)}
            step={1}
            onChange={(v) => setRow(Math.min(v, T - 1))}
            format={(v) => TOK8[v]}
          />
        </div>
        <div className="w-[170px]">
          <Toggle label="Mask the future" checked={mask} onChange={setMask} />
        </div>
        <button
          type="button"
          className="btn btn-ghost !px-2.5 !py-1 !text-[12.5px]"
          onClick={() => setScores(TOK8.map(() => TOK8.map(() => 0)))}
        >
          Reset scores
        </button>
      </div>
    </div>
  );
}
