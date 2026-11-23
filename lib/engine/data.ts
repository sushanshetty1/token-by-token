import type { Rng } from "./rng";

/** Character-level dataset: the vocabulary is every distinct character, sorted. */
export class CharData {
  readonly chars: string[];
  readonly vocabSize: number;
  readonly train: Uint8Array;
  readonly val: Uint8Array;
  private readonly stoi: Map<string, number>;

  constructor(text: string, trainFraction = 0.9) {
    this.chars = [...new Set(text)].sort();
    this.vocabSize = this.chars.length;
    this.stoi = new Map(this.chars.map((c, i) => [c, i]));
    const all = this.encode(text);
    const n = Math.floor(all.length * trainFraction);
    this.train = all.subarray(0, n);
    this.val = all.subarray(n);
  }

  encode(s: string): Uint8Array {
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = this.stoi.get(s[i]) ?? 0;
    return out;
  }

  decode(ids: ArrayLike<number>): string {
    let s = "";
    for (let i = 0; i < ids.length; i++) s += this.chars[ids[i]] ?? "";
    return s;
  }

  has(c: string): boolean {
    return this.stoi.has(c);
  }
}

/**
 * Fills x with B random windows of T characters and y with the same windows
 * shifted by one: y[b, t] is the character that follows x[b, t].
 */
export function getBatch(
  data: Uint8Array,
  B: number,
  T: number,
  rng: Rng,
  x: Int32Array,
  y: Int32Array,
): void {
  const maxStart = data.length - T - 1;
  for (let b = 0; b < B; b++) {
    const s = rng.int(maxStart + 1);
    for (let t = 0; t < T; t++) {
      x[b * T + t] = data[s + t];
      y[b * T + t] = data[s + t + 1];
    }
  }
}
