import { seededVector, softmax } from "@/lib/color";

export const PROMPT = ["The", " cat", " sat", " on", " the"];
export const GENERATED = [" mat", ".", " It", " purred"];

export interface KvCfg {
  nLayer: number;
  nKvHeads: number;
  headSize: number;
  T: number;
  bytes: number;
}

/** Bytes of K and V cached for one sequence: 2 x n_layer x n_kv_heads x head_size x T x bytes. */
export const kvBytes = (c: KvCfg) => 2 * c.nLayer * c.nKvHeads * c.headSize * c.T * c.bytes;

export const GPT2_KV: KvCfg = { nLayer: 12, nKvHeads: 12, headSize: 64, T: 1024, bytes: 2 };
export const LLAMA2_7B_8K: KvCfg = { nLayer: 32, nKvHeads: 32, headSize: 128, T: 8192, bytes: 2 };
export const GQA_7B_8K: KvCfg = { ...LLAMA2_7B_8K, nKvHeads: 8 };
export const LLAMA2_7B_PARAMS = 6.74e9;
export const HBM_BW = 2.0e12;
export const A100_BF16 = 312e12;

export function bytes(n: number) {
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)} TB`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(n >= 1e11 ? 0 : n >= 1e10 ? 1 : 2)} GB`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e8 ? 0 : 1)} MB`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)} KB`;
  return `${n} B`;
}

export const commas = (n: number) => Math.round(n).toLocaleString("en-US");

/** A plausible next-token distribution after "The cat sat on the" (top 12 shown). */
export const CANDIDATES = [
  { t: " mat", logit: 3.2 },
  { t: " floor", logit: 2.6 },
  { t: " couch", logit: 2.2 },
  { t: " bed", logit: 2.0 },
  { t: " sofa", logit: 1.8 },
  { t: " windows", logit: 1.1 },
  { t: " roof", logit: 1.0 },
  { t: " table", logit: 0.9 },
  { t: " edge", logit: 0.6 },
  { t: " keyboard", logit: 0.3 },
  { t: " grass", logit: 0.1 },
  { t: " moon", logit: -1.0 },
];

/** Temperature, then top-k, then top-p, then renormalize: the order generate() uses. */
export function sampleFilter(temperature: number, topK: number, topP: number) {
  const probs = softmax(
    CANDIDATES.map((c) => c.logit),
    temperature,
  );
  const order = probs.map((p, i) => ({ p, i })).sort((a, b) => b.p - a.p);
  const reason: ("kept" | "k" | "p")[] = probs.map(() => "kept");
  order.forEach((o, rank) => {
    if (rank >= topK) reason[o.i] = "k";
  });
  const afterK = order.filter((o) => reason[o.i] === "kept");
  const massK = afterK.reduce((s, o) => s + o.p, 0);
  let cum = 0;
  afterK.forEach((o) => {
    const pk = o.p / massK;
    if (cum > topP) reason[o.i] = "p";
    cum += pk;
  });
  const keptMass = probs.reduce((s, p, i) => s + (reason[i] === "kept" ? p : 0), 0);
  const final = probs.map((p, i) => (reason[i] === "kept" ? p / keptMass : 0));
  return { probs, reason, final, kept: reason.filter((r) => r === "kept").length, keptMass };
}

/** Deterministic stand-ins for per-token keys, values and a query. */
export const kVec = (tok: string) => seededVector(`k${tok}`, 6);
export const vVec = (tok: string) => seededVector(`v${tok}`, 6);
export const qVec = (tok: string) => seededVector(`q${tok}`, 6);

export function attend(q: number[], keys: number[][]) {
  const scores = keys.map((k) => k.reduce((s, kv, i) => s + kv * q[i], 0) / Math.sqrt(q.length));
  return softmax(scores.map((s) => s * 2.2));
}
