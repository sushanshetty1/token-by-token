"use client";

import { motion } from "motion/react";
import { Chip, EASE, chipWidth, textWidth } from "@/components/viz/svg";

/** A piece of a rendered conversation: plain text, or one of nanochat's special tokens. */
export interface Tok {
  t: string;
  s?: boolean;
}

export const BOS: Tok = { t: "<|bos|>", s: true };
export const US: Tok = { t: "<|user_start|>", s: true };
export const UE: Tok = { t: "<|user_end|>", s: true };
export const AS: Tok = { t: "<|assistant_start|>", s: true };
export const AE: Tok = { t: "<|assistant_end|>", s: true };
export const PS: Tok = { t: "<|python_start|>", s: true };
export const PE: Tok = { t: "<|python_end|>", s: true };
export const OS: Tok = { t: "<|output_start|>", s: true };
export const OE: Tok = { t: "<|output_end|>", s: true };

export const specialWidth = (text: string, fs: number) => textWidth(text, fs, true) + 16;

export function tokWidth(tok: Tok, fs: number) {
  return tok.s ? specialWidth(tok.t, fs) : chipWidth(tok.t, fs);
}

/** Centers of a row of chips laid out around cx. */
export function layoutRow(toks: Tok[], cx: number, fs: number, gap = 8) {
  const ws = toks.map((t) => tokWidth(t, fs));
  const total = ws.reduce((a, b) => a + b, 0) + gap * (toks.length - 1);
  let x = cx - total / 2;
  return ws.map((w) => {
    const c = x + w / 2;
    x += w + gap;
    return { x: c, w };
  });
}

export function Special({
  x,
  y,
  text,
  fs = 13,
  h = 34,
  delay = 0,
  dim = false,
}: {
  x: number;
  y: number;
  text: string;
  fs?: number;
  h?: number;
  delay?: number;
  dim?: boolean;
}) {
  const w = specialWidth(text, fs);
  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: dim ? 0.38 : 1, scale: 1 }}
      transition={{ duration: 0.35, delay, ease: EASE }}
      style={{ transformOrigin: `${x}px ${y}px`, transformBox: "view-box" }}
    >
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={8} fill="var(--violet-soft)" stroke="var(--violet)" strokeWidth={1.4} />
      <text x={x} y={y + fs * 0.35} textAnchor="middle" fontSize={fs} className="mono" fontWeight={600} fill="var(--ink)">
        {text}
      </text>
    </motion.g>
  );
}

/** One token, special or plain, with an optional dim state animated after `dimAt` seconds. */
export function TokenChip({
  tok,
  x,
  y,
  index,
  fs,
  delay = 0,
  dim = false,
  dimAt = 0,
  highlight = false,
}: {
  tok: Tok;
  x: number;
  y: number;
  index: number;
  fs: number;
  delay?: number;
  dim?: boolean;
  dimAt?: number;
  highlight?: boolean;
}) {
  return (
    <motion.g initial={{ opacity: 1 }} animate={{ opacity: dim ? 0.38 : 1 }} transition={{ duration: 0.5, delay: dimAt }}>
      {tok.s ? (
        <Special x={x} y={y} text={tok.t} fs={fs - 1} delay={delay} />
      ) : (
        <Chip x={x} y={y} text={tok.t} index={index} fontSize={fs} delay={delay} highlight={highlight} />
      )}
    </motion.g>
  );
}

/** Lays out words and small special chips inside a card, wrapping at maxW. */
export interface Piece {
  t: string;
  s?: boolean;
  br?: boolean;
  strong?: boolean;
}

export function flow(pieces: Piece[], x0: number, y0: number, maxW: number, fsText = 12.5, fsSpecial = 10.5, lh = 27) {
  const out: { x: number; y: number; w: number; t: string; s: boolean; strong: boolean }[] = [];
  let x = x0;
  let y = y0;
  const gap = textWidth(" ", fsText);
  const place = (t: string, s: boolean, strong: boolean) => {
    const w = s ? specialWidth(t, fsSpecial) - 4 : textWidth(t, fsText, false);
    if (x + w > x0 + maxW && x > x0) {
      x = x0;
      y += lh;
    }
    const prev = out[out.length - 1];
    // Words on the same line share one <text> so the browser spaces them, not our estimate.
    if (!s && prev && !prev.s && prev.y === y && prev.strong === strong) {
      prev.t = `${prev.t} ${t}`;
      prev.w = textWidth(prev.t, fsText, false);
      x = prev.x + prev.w + gap;
      return;
    }
    out.push({ x, y, w, t, s, strong });
    x += w + (s ? 6 : gap);
  };
  for (const p of pieces) {
    if (p.br) {
      x = x0;
      y += lh;
      continue;
    }
    if (p.s) place(p.t, true, false);
    else p.t.split(" ").forEach((word) => word && place(word, false, !!p.strong));
  }
  return { items: out, bottom: y };
}

export function FlowText({
  pieces,
  x,
  y,
  maxW,
  delay = 0,
  fsText = 12.5,
  fsSpecial = 10.5,
  lh = 27,
}: {
  pieces: Piece[];
  x: number;
  y: number;
  maxW: number;
  delay?: number;
  fsText?: number;
  fsSpecial?: number;
  lh?: number;
}) {
  const { items } = flow(pieces, x, y, maxW, fsText, fsSpecial, lh);
  return (
    <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay }}>
      {items.map((it, i) =>
        it.s ? (
          <g key={i}>
            <rect x={it.x} y={it.y - 10} width={it.w} height={20} rx={5} fill="var(--violet-soft)" stroke="var(--violet)" strokeWidth={1} />
            <text x={it.x + it.w / 2} y={it.y + 3.6} textAnchor="middle" fontSize={fsSpecial} className="mono" fill="var(--ink)">
              {it.t}
            </text>
          </g>
        ) : (
          <text key={i} x={it.x} y={it.y + 4.4} fontSize={fsText} fontWeight={it.strong ? 650 : 450} fill="var(--ink)">
            {it.t}
          </text>
        ),
      )}
    </motion.g>
  );
}
