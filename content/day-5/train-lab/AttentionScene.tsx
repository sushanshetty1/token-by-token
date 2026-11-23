"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Segmented } from "@/components/viz/controls";
import { Label } from "@/components/viz/svg";
import { sequential } from "@/lib/color";
import type { AttentionResult } from "@/lib/engine/client";
import { useTrainer } from "@/lib/engine/useTrainer";
import { ATTN_PROMPT, RECORDED, TRAIN_DEFAULTS, TRAIN_LAB, fmtInt } from "./run";
import { Frame, Html, cq, fs } from "./ui";

const show = (c: string) => (c === "\n" ? "↵" : c === " " ? "·" : c);

/** Attention weights as a grid: row = query position, column = key position. */
export function AttentionGrid({
  x,
  y,
  cell,
  tokens,
  m,
  hatchFuture = true,
  labels = true,
  color = "var(--accent)",
  outlineNext = false,
}: {
  x: number;
  y: number;
  cell: number;
  tokens: string[];
  m: number[][];
  hatchFuture?: boolean;
  labels?: boolean;
  color?: string;
  /** Outline the cell just right of the diagonal: the character each row must predict. */
  outlineNext?: boolean;
}) {
  const T = tokens.length;
  const g = cell >= 8 ? 1 : 0;
  const p = cell + g;
  return (
    <g>
      {labels &&
        tokens.map((t, i) => (
          <g key={i}>
            <text x={x - 6} y={y + i * p + cell / 2 + 4} textAnchor="end" fontSize={11.5} className="mono" fill="var(--ink-2)">
              {show(t)}
            </text>
            <text x={x + i * p + cell / 2} y={y - 7} textAnchor="middle" fontSize={11.5} className="mono" fill="var(--ink-2)">
              {show(t)}
            </text>
          </g>
        ))}
      {m.map((row, i) =>
        row.slice(0, T).map((v, j) => (
          <rect
            key={`${i}-${j}`}
            x={x + j * p}
            y={y + i * p}
            width={cell}
            height={cell}
            rx={cell >= 8 ? 2 : 0}
            fill={hatchFuture && j > i ? "url(#hatch)" : sequential(Math.sqrt(v), color)}
            stroke={cell >= 8 ? "var(--rule)" : "none"}
            strokeWidth={0.5}
          />
        )),
      )}
      {outlineNext &&
        tokens.slice(0, -1).map((_, i) => (
          <rect key={`n${i}`} x={x + (i + 1) * p - 0.5} y={y + i * p - 0.5} width={cell + 1} height={cell + 1} rx={2} fill="none" stroke="var(--bad)" strokeWidth={1.4} />
        ))}
    </g>
  );
}

const HEADS = [0, 1].flatMap((l) => [0, 1, 2, 3].map((h) => ({ l, h })));

function stats(m: number[][]) {
  const T = m.length;
  let prev = 0;
  let self = 0;
  for (let i = 0; i < T; i++) {
    self += m[i][i];
    if (i > 0) prev += m[i][i - 1];
  }
  return { prev: prev / (T - 1), self: self / T };
}

export function AttentionScene({ playing }: { playing: boolean }) {
  const [snap, client] = useTrainer(TRAIN_LAB, { defaults: TRAIN_DEFAULTS, playing });
  const [sel, setSel] = useState({ l: 0, h: 1 });
  const [source, setSource] = useState<"live" | "recorded">(snap.step >= 300 ? "live" : "recorded");
  const [live, setLive] = useState<AttentionResult | null>(null);
  const [asked, setAsked] = useState(0);

  const ready = snap.phase !== "idle" && snap.phase !== "loading";
  const epoch = Math.floor(snap.step / 250);
  useEffect(() => {
    if (!ready || source !== "live") return;
    let on = true;
    client.attention(ATTN_PROMPT).then((r) => on && setLive(r)).catch(() => {});
    return () => {
      on = false;
    };
  }, [client, ready, source, asked, epoch]);

  const data = source === "live" && live ? live : { ...RECORDED.attention, step: 3000 };
  const m = data.maps[sel.l][sel.h];
  const s = stats(m);
  const T = data.tokens.length;
  const cell = 15;
  const gx = 112;
  const gy = 122;
  const gridEnd = gy + T * (cell + 1);

  return (
    <Frame
      label="Attention weights of the trained model on a short prompt"
      svg={
        <>
          <Label x={gx} y={52} size={17} weight={700} color="var(--ink)" anchor="start">
            {`Layer ${sel.l + 1}, head ${sel.h + 1}: where each character looks`}
          </Label>
          <Label x={gx} y={76} size={12.5} anchor="start">
            {`rows look at columns; each row sums to 1; hatched = the future (masked)`}
          </Label>
          <AttentionGrid x={gx} y={gy} cell={cell} tokens={data.tokens} m={m} />
          <Label x={gx + (T * (cell + 1)) / 2} y={gridEnd + 26} size={12.5}>
            {source === "live" && live ? `your model at step ${fmtInt(live.step)}` : "recorded model at step 3,000"}
          </Label>

          <Label x={560} y={100} size={13} weight={650} color="var(--ink)" anchor="start">
            All 8 heads (click one)
          </Label>
          {HEADS.map(({ l, h }) => {
            const tx = 560 + h * 92;
            const ty = 140 + l * 116;
            const on = sel.l === l && sel.h === h;
            return (
              <g
                key={`${l}-${h}`}
                role="button"
                tabIndex={0}
                aria-label={`Show layer ${l + 1} head ${h + 1}`}
                onClick={() => setSel({ l, h })}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSel({ l, h })}
                style={{ cursor: "pointer" }}
              >
                <rect x={tx - 6} y={ty - 6} width={T * 3 + 12} height={T * 3 + 12} rx={6} fill="var(--card)" stroke={on ? "var(--mark)" : "var(--rule)"} strokeWidth={on ? 2.4 : 1} />
                <AttentionGrid x={tx} y={ty} cell={3} tokens={data.tokens} m={data.maps[l][h]} labels={false} />
                <text x={tx + (T * 3) / 2} y={ty + T * 3 + 22} textAnchor="middle" fontSize={12} className="mono" fill={on ? "var(--ink)" : "var(--ink-2)"} fontWeight={on ? 700 : 500}>
                  {`L${l + 1} H${h + 1}`}
                </text>
              </g>
            );
          })}
        </>
      }
    >
      <Html x={556} y={386} w={380} h={130}>
        <div className="flex h-full flex-col rounded-xl border border-rule bg-card/95 shadow-[var(--shadow-1)]" style={{ padding: cq(12), gap: cq(8) }}>
          <div className="flex items-center justify-between gap-2">
            <div style={{ fontSize: fs(12.5, 10) }}>
              <Segmented
                label="Which model"
                value={source}
                onChange={setSource}
                options={[
                  { value: "live", label: snap.step > 0 ? `your model (${fmtInt(snap.step)})` : "your model" },
                  { value: "recorded", label: "recorded (3,000)" },
                ]}
              />
            </div>
            {source === "live" && (
              <button type="button" className="btn btn-ghost" style={{ fontSize: fs(12, 10), padding: "0.35em 0.6em" }} onClick={() => setAsked((a) => a + 1)} aria-label="Refresh from the live model">
                <RefreshCw size="1em" />
              </button>
            )}
          </div>
          <div className="text-ink" style={{ fontSize: fs(13, 10), lineHeight: 1.45 }}>
            {`On average this head puts ${s.prev.toFixed(2)} on the previous character and ${s.self.toFixed(2)} on itself.`}
            {source === "live" && snap.step < 300 && " Your model is still young: expect blurry rows."}
          </div>
        </div>
      </Html>
    </Frame>
  );
}
