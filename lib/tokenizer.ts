"use client";

import { useEffect, useState } from "react";

export type EncodingName = "gpt2" | "o200k";

export const ENCODING_LABEL: Record<EncodingName, string> = {
  gpt2: "GPT-2 (50,257 tokens)",
  o200k: "GPT-4o (200k tokens)",
};

interface Api {
  encode: (s: string, opts?: { disallowedSpecial?: Set<string> }) => number[];
  decode: (ids: Iterable<number>) => string;
  vocab: number;
}

const cache: Partial<Record<EncodingName, Promise<Api>>> = {};

/** Loads a real BPE vocabulary on demand (they are a few MB each). */
export function loadEncoding(name: EncodingName): Promise<Api> {
  cache[name] ??= (name === "gpt2"
    ? import("gpt-tokenizer/encoding/gpt2")
    : import("gpt-tokenizer/encoding/o200k_base")
  ).then((m) => ({ encode: m.encode, decode: m.decode, vocab: m.vocabularySize }));
  return cache[name]!;
}

export interface TokenPiece {
  id: number;
  text: string;
  /** True when this token is only part of a multi-byte character. */
  partial: boolean;
}

export function useTokens(text: string, name: EncodingName) {
  const [state, setState] = useState<{ pieces: TokenPiece[]; vocab: number; name: EncodingName } | null>(null);
  useEffect(() => {
    let live = true;
    loadEncoding(name).then((api) => {
      if (!live) return;
      let ids: number[] = [];
      try {
        // Text that looks like a special token (e.g. "<|endoftext|>") is encoded as plain text.
        ids = api.encode(text, { disallowedSpecial: new Set() });
      } catch {
        ids = [];
      }
      const pieces = ids.map((id) => {
        const t = api.decode([id]);
        return { id, text: t, partial: t.includes("�") };
      });
      setState({ pieces, vocab: api.vocab, name });
    });
    return () => {
      live = false;
    };
  }, [text, name]);
  return state;
}
