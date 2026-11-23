"use client";

import type { LessonModule } from "@/lib/types";
import { Stage } from "./Stage";
import { bytes, GPT2_KV, GQA_7B_8K, HBM_BW, kvBytes, LLAMA2_7B_8K, LLAMA2_7B_PARAMS } from "./math";

const GPT2_CACHE = bytes(kvBytes(GPT2_KV));
const L7_CACHE = bytes(kvBytes(LLAMA2_7B_8K));
const L7_BATCH = bytes(kvBytes(LLAMA2_7B_8K) * 16);
const L7_WEIGHTS = bytes(LLAMA2_7B_PARAMS * 2);
const DECODE_TPS = Math.round(HBM_BW / (LLAMA2_7B_PARAMS * 2));
const NAIVE = Array.from({ length: 100 }, (_, k) => 1000 + k).reduce((a, b) => a + b, 0);

const CODE = `import torch
import torch.nn as nn
from torch.nn import functional as F

class CausalSelfAttention(nn.Module):        # Day 4's module, now with a cache
    def forward(self, x, past_kv=None):
        B, T, C = x.shape
        q, k, v = self.c_attn(x).split(C, dim=2)
        q, k, v = [t.view(B, T, self.n_head, -1).transpose(1, 2) for t in (q, k, v)]
        if past_kv is not None:                     # decode: T is 1
            k = torch.cat([past_kv[0], k], dim=2)   # (B, nh, T_past + 1, hs)
            v = torch.cat([past_kv[1], v], dim=2)
        y = F.scaled_dot_product_attention(q, k, v, is_causal=past_kv is None)
        y = y.transpose(1, 2).contiguous().view(B, T, C)
        return self.c_proj(y), (k, v)                # hand the cache back

class Block(nn.Module):
    def forward(self, x, past_kv=None):
        a, kv = self.attn(self.ln_1(x), past_kv)
        x = x + a
        x = x + self.mlp(self.ln_2(x))
        return x, kv

class GPT(nn.Module):
    def forward(self, idx, past_kvs=None):
        B, T = idx.shape
        start = 0 if past_kvs is None else past_kvs[0][0].size(2)
        pos = torch.arange(start, start + T, device=idx.device)
        x = self.wte(idx) + self.wpe(pos)
        new_kvs = []
        for i, block in enumerate(self.h):
            x, kv = block(x, None if past_kvs is None else past_kvs[i])
            new_kvs.append(kv)
        return self.lm_head(self.ln_f(x)), new_kvs

@torch.no_grad()
def generate(model, idx, max_new_tokens, temperature=1.0, top_k=None, top_p=None, eos=50256):
    logits, kvs = model(idx)                           # prefill: the whole prompt at once
    for _ in range(max_new_tokens):
        logits = logits[:, -1, :] / temperature        # (B, vocab_size)
        if top_k is not None:
            kth = torch.topk(logits, top_k).values[:, [-1]]
            logits[logits < kth] = -float("inf")
        probs = F.softmax(logits, dim=-1)
        if top_p is not None:
            p, order = probs.sort(dim=-1, descending=True)
            p[p.cumsum(-1) - p > top_p] = 0.0          # keep the smallest set reaching top_p
            probs = torch.zeros_like(probs).scatter(-1, order, p)
        nxt = torch.multinomial(probs, num_samples=1)  # (B, 1); weights need not sum to 1
        yield nxt                                      # stream it to the caller
        if (nxt == eos).all():
            break
        logits, kvs = model(nxt, kvs)                  # decode: one new token in
`;

const lesson: LessonModule = {
  rail: [
    { id: "phase", label: "Phase" },
    { id: "ctx", label: "Tokens in context" },
    { id: "work", label: "Positions per step" },
    { id: "cache", label: "KV cache" },
  ],
  learn: [
    "Explain prefill vs decode, and why decode is memory-bound",
    "Explain the KV cache and why it is exact",
    "Compute KV cache memory for any model shape",
    "Explain temperature, top-k and top-p, and the order they apply in",
    "Describe stop conditions, streaming, time to first token and tokens per second",
  ],
  legend: [
    { label: "query", color: "var(--q)" },
    { label: "key", color: "var(--k)" },
    { label: "value", color: "var(--v)" },
    { label: "prefill", color: "var(--accent)", shape: "square" },
    { label: "new this step", color: "var(--mark)", shape: "square" },
    { label: "cached, reused", color: "var(--ok)", shape: "square" },
    { label: "recomputed or cut", color: "var(--bad)", shape: "square" },
  ],
  code: { filename: "generate.py", source: CODE, note: "GPT-2 with a KV cache. Layers not shown (c_attn, mlp, ln_1, wte...) are the Day 5 modules." },
  steps: [
    {
      label: "Loop",
      kind: "intuition",
      title: "The answer is a loop",
      body: (
        <>
          <p>
            A GPT never writes a reply in one go. It reads your prompt and outputs a probability for every possible next token; one is sampled,
            appended to the text, and the whole thing runs again. Generating 100 tokens takes 100 forward passes.
          </p>
          <p>
            The loop has two phases with very different costs. <strong>Prefill</strong> reads the whole prompt once. <strong>Decode</strong> produces
            one token per step.
          </p>
        </>
      ),
      changed: ["The prompt (blue bracket) goes in once", "New tokens (saffron) appear one per step and join the input"],
      code: { ranges: [[38, 39], [53, 53]], caption: "One prefill call, then one model call per new token." },
      rail: { phase: "prefill, then decode", ctx: "5 + new tokens", work: "?", cache: "?" },
      learns: [0],
    },
    {
      label: "Prefill",
      kind: "mechanism",
      title: "Prefill: the whole prompt in one pass",
      body: (
        <>
          <p>
            All prompt tokens go through the model together, just like a training forward pass: each layer handles every position with big matrix
            multiplies, so the GPU&apos;s arithmetic units stay busy. Prefill is <strong>compute-bound</strong>.
          </p>
          <p>
            Only the logits at the last position matter now: they give the first new token. But every layer also produced a key and a value for every
            prompt position. Keep those.
          </p>
        </>
      ),
      changed: ["Each layer processes all 5 positions at once, bottom to top", "Every cell leaves a key (rose) and a value (green) behind"],
      code: { ranges: [[38, 38], [25, 34]], caption: "past_kvs is None: start at position 0, return every layer's (k, v)." },
      rail: { phase: "prefill", ctx: "5", work: "5", cache: "5 tokens × 12 layers" },
      learns: [0],
    },
    {
      label: "No cache",
      kind: "problem",
      title: "Decoding without a cache repeats itself",
      body: (
        <>
          <p>
            The naive loop calls the model on the whole sequence every step: to get token 7 it reruns tokens 1 to 6 through all 12 layers, although
            their results are the same as last time. The work per step grows with the length of the text.
          </p>
          <p>For a long prompt that adds up fast.</p>
        </>
      ),
      predict: {
        question: "A 1,000-token prompt, then 100 generated tokens, without a cache. Roughly how many token positions go through the model in total?",
        options: ["About 1,100", "About 10,500", "About 105,000", "About 1,000,000"],
        answer: 2,
        explain: (
          <>
            Step k reruns 1,000 + k positions: 1,000 + 1,001 + ... + 1,099 = {NAIVE.toLocaleString("en-US")}. With a cache it is the 1,000 prompt
            positions once, then 1 per new token: about 1,100, nearly 100 times less work.
          </>
        ),
      },
      code: { ranges: [[53, 53]], caption: "Without a cache, this line would be model(all tokens so far)." },
      rail: { phase: "decode, no cache", ctx: "6", work: "6 (5 wasted)", cache: "none" },
      learns: [0],
    },
    {
      label: "KV cache",
      kind: "mechanism",
      title: "The KV cache: keep every key and value",
      body: (
        <>
          <p>
            Store K and V for every past token, in every layer. Then a decode step feeds in only the newest token. Each layer computes q, k and v for
            that one token, appends k and v to its cache, and lets q attend over all cached keys to mix the cached values.
          </p>
          <p>The model now processes 1 position per step instead of all of them. Attention still reads the whole cache, but reading is not recomputing.</p>
        </>
      ),
      predict: {
        question: "Why is it safe to reuse ·sat's cached K and V when later tokens arrive?",
        options: [
          "The new tokens are too far away to matter",
          "The causal mask means ·sat's K and V never depend on later tokens, so they cannot change",
          "K and V are fixed embeddings that do not depend on context",
          "It is an approximation that slightly lowers quality",
        ],
        answer: 1,
        explain: (
          <>
            From layer 2 up, ·sat&apos;s vector depends on the tokens before it, so its K and V are not fixed embeddings. But the causal mask stops any
            later token from flowing into its position, at every layer. Its K and V are final the moment they are computed, so the cache is exact.
          </>
        ),
      },
      changed: ["Left: q, k, v for the new token only", "k and v join the caches as new rows (saffron outline)", "q is scored against every cached key; the weights mix every cached value"],
      code: { ranges: [[10, 15]], caption: "Concatenate the new k and v onto the cache, attend, return the grown cache." },
      rail: { phase: "decode, cached", ctx: "6, then 7, 8...", work: "1", cache: "grows 1 row per step" },
      learns: [1],
    },
    {
      label: "Exact",
      kind: "insight",
      title: "The causal mask makes the cache exact",
      body: (
        <>
          <p>
            Information flows only forward in time. At every layer, position i reads positions 1 to i and nothing after. So when a new token arrives,
            nothing about the earlier tokens changes: not their hidden vectors, not their keys, not their values.
          </p>
          <p>
            That is why a cached generate gives the same result as rerunning everything, up to floating-point rounding. It is also why prefill needs{" "}
            <code>is_causal=True</code>, while a single new token may read the whole cache.
          </p>
        </>
      ),
      keyIdea: "Causal masking means past positions never change, so their K and V are computed once and reused.",
      changed: ["Old columns are green: cached and reused", "Violet: ·sat at layer 2 reads only The, ·cat and ·sat from layer 1"],
      code: { ranges: [[13, 13]], caption: "Causal mask in prefill; one new query may attend to every cached key." },
      learns: [1],
    },
    {
      label: "Memory",
      kind: "mechanism",
      title: "What the cache costs",
      body: (
        <>
          <p>
            Per sequence, the cache holds K and V for every layer, KV head and position: <code>2 × n_layer × n_kv_heads × head_size × T × bytes</code>.
            GPT-2 small at 1,024 tokens in bf16: 2 × 12 × 12 × 64 × 1,024 × 2 = <strong>{GPT2_CACHE}</strong>, small next to its 249 MB of weights.
          </p>
          <p>
            Scale up and it dominates. A 7B model shaped like Llama 2 at 8,192 tokens needs {L7_CACHE} per sequence; a batch of 16 needs {L7_BATCH},
            five times its {L7_WEIGHTS} of weights. Grouped-query attention (Day 7) lets several query heads share one K and V head: 8 KV heads instead of
            32 make the cache 4 times smaller, {bytes(kvBytes(GQA_7B_8K))} per sequence.
          </p>
        </>
      ),
      keyIdea: "KV cache = 2 × n_layer × n_kv_heads × head_size × T × bytes, per sequence. It grows with every token and every user.",
      code: { ranges: [[11, 12]], caption: "Every decode step grows k and v by one position, in every layer." },
      rail: { cache: `${GPT2_CACHE} (GPT-2, 1,024)` },
      learns: [2],
    },
    {
      label: "Try it",
      kind: "try",
      title: "Size a KV cache",
      body: (
        <>
          <p>
            Pick a model or set its shape, then grow the context and the batch. The cache is linear in every factor: double the context and it doubles,
            double the batch and it doubles again.
          </p>
          <p>
            Compare Llama 2 7B with Llama 3 8B: similar sizes, but 8 KV heads instead of 32 make the cache 4 times smaller per token, one reason the newer
            model can serve longer contexts.
          </p>
        </>
      ),
      changed: ["Presets for GPT-2 small, Llama 2 7B, Llama 3 8B and Llama 3 70B", "The bar compares the whole batch's cache with one 80 GB GPU"],
      code: { ranges: [[11, 12]] },
      rail: { cache: "your model" },
      learns: [2],
    },
    {
      label: "Bound",
      kind: "insight",
      title: "Why decode is memory-bound",
      body: (
        <>
          <p>
            Every forward pass streams all the weights from GPU memory. Prefill uses each weight for 1,000 tokens at once, so the arithmetic outlasts the
            reading: compute-bound. Decode at batch 1 uses each weight for a single token, so the GPU spends its time waiting on memory.
          </p>
          <p>
            Decode speed is roughly memory bandwidth ÷ bytes read per step. For a 7B model in bf16 on an A100: about 2 TB/s ÷ {L7_WEIGHTS} ≈{" "}
            {DECODE_TPS} steps per second at best, before reading the KV cache. Batching shares each weight read across many sequences, which is how
            servers get high throughput.
          </p>
        </>
      ),
      keyIdea: "Prefill is limited by FLOPs, decode by memory bandwidth. Batching turns waiting into useful math.",
      code: { ranges: [[53, 53]], caption: "One token in, every weight read: the shape of a memory-bound step." },
      rail: { phase: "decode", work: "1", cache: "read every step" },
      learns: [0],
    },
    {
      label: "Sampling",
      kind: "try",
      title: "Temperature, top-k, top-p",
      body: (
        <>
          <p>
            The model gives logits; you decide how to pick. <strong>Temperature</strong> divides the logits before softmax: below 1 sharpens the
            distribution, above 1 flattens it. <strong>Top-k</strong> keeps the k likeliest tokens. <strong>Top-p</strong> (nucleus) keeps the smallest
            set whose probabilities add up to p. What survives is renormalized and sampled.
          </p>
          <p>
            Greedy decoding, the limit as temperature goes to 0, always takes the top token, which tends to repeat itself. Move the sliders and watch
            which tokens survive.
          </p>
        </>
      ),
      predict: {
        question: "You set top_p = 0.9. The model is very sure: its top token has 95% probability. How many tokens can be sampled?",
        options: ["Just that 1 token", "About 9", "90% of the vocabulary", "Exactly top_k of them"],
        answer: 0,
        explain: (
          <>
            Top-p keeps the smallest set of tokens whose probabilities reach p. 95% already passes 0.9, so only one survives. When the model is unsure,
            the same p keeps many tokens. That adaptivity is the point of top-p over a fixed top-k.
          </>
        ),
      },
      code: { ranges: [[40, 49]], caption: "Temperature, then top-k, then top-p, then sample." },
      rail: { phase: "sampling" },
      learns: [3],
    },
    {
      label: "Stream",
      kind: "mechanism",
      title: "Stop, stream, and the two latencies",
      body: (
        <>
          <p>
            The loop stops when the model emits the end-of-text token (id 50256 in GPT-2) or hits <code>max_new_tokens</code>; servers also accept stop
            strings. Each token is detokenized and sent as soon as it is sampled, which is why replies appear word by word.
          </p>
          <p>
            Users feel two numbers. <strong>Time to first token</strong> is queueing plus prefill, so it grows with prompt length.{" "}
            <strong>Tokens per second</strong> is set by the decode step, so it depends on memory bandwidth and batch size.
          </p>
        </>
      ),
      code: { ranges: [[50, 52]], caption: "yield streams each token; the end token breaks the loop." },
      rail: { phase: "streaming", ctx: "9" },
      learns: [4],
    },
    {
      label: "Recap",
      kind: "recap",
      title: "From prompt to reply",
      body: (
        <>
          <p>
            Prefill runs the whole prompt once, compute-bound, and fills a KV cache with K and V for every layer and position. Then decode loops: one new
            token in, its q, k, v computed, k and v appended, attention over the cache, logits, temperature, top-k, top-p, sample, stream. Stop at the
            end token or the length limit.
          </p>
          <p>
            The cache is exact because of the causal mask and costs 2 × n_layer × n_kv_heads × head_size × T × bytes per sequence. Decode is
            memory-bound, so time to first token and tokens per second are different problems.
          </p>
        </>
      ),
      code: { ranges: [[36, 53]], caption: "generate(), start to finish." },
      rail: { phase: "recap", ctx: "prompt + new", work: "1 after prefill", cache: "grows with T" },
      learns: [0, 1, 2, 3, 4],
    },
  ],
  Stage,
};

export default lesson;
