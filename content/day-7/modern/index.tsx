"use client";

import type { LessonModule } from "@/lib/types";
import { Stage } from "./Stage";

const CODE = `import torch
import torch.nn as nn
import torch.nn.functional as F

class RMSNorm(nn.Module):
    def __init__(self, dim, eps=1e-6):
        super().__init__()
        self.eps = eps
        self.weight = nn.Parameter(torch.ones(dim))

    def forward(self, x):
        # no mean subtraction and no bias: divide by the root mean square
        return x * torch.rsqrt(x.pow(2).mean(-1, keepdim=True) + self.eps) * self.weight

def rope_angles(T, head_size, base=10000.0):
    freqs = base ** (-torch.arange(0, head_size, 2).float() / head_size)  # (head_size/2,)
    angles = torch.outer(torch.arange(T).float(), freqs)                  # (T, head_size/2)
    return angles.cos(), angles.sin()

def apply_rope(x, cos, sin):
    # x: (B, n_head, T, head_size). Rotate each (x1, x2) pair by its angle.
    x1, x2 = x[..., 0::2], x[..., 1::2]
    return torch.stack((x1 * cos - x2 * sin, x1 * sin + x2 * cos), dim=-1).flatten(-2)

class SwiGLU(nn.Module):
    def __init__(self, C, hidden):
        super().__init__()
        self.gate = nn.Linear(C, hidden, bias=False)
        self.up = nn.Linear(C, hidden, bias=False)
        self.down = nn.Linear(hidden, C, bias=False)

    def forward(self, x):
        return self.down(F.silu(self.gate(x)) * self.up(x))

class GQA(nn.Module):
    def __init__(self, C, n_head, n_kv_head):
        super().__init__()
        self.n_head, self.n_kv, self.hs = n_head, n_kv_head, C // n_head
        self.q = nn.Linear(C, n_head * self.hs, bias=False)
        self.kv = nn.Linear(C, 2 * n_kv_head * self.hs, bias=False)
        self.proj = nn.Linear(C, C, bias=False)

    def forward(self, x, cos, sin):
        B, T, C = x.shape
        q = self.q(x).view(B, T, self.n_head, self.hs).transpose(1, 2)
        k, v = self.kv(x).view(B, T, 2, self.n_kv, self.hs).unbind(2)
        k, v = k.transpose(1, 2), v.transpose(1, 2)              # (B, n_kv, T, hs): what the KV cache stores
        q, k = apply_rope(q, cos, sin), apply_rope(k, cos, sin)  # v is not rotated
        rep = self.n_head // self.n_kv                            # query heads per K/V head
        k, v = k.repeat_interleave(rep, dim=1), v.repeat_interleave(rep, dim=1)
        y = F.scaled_dot_product_attention(q, k, v, is_causal=True)
        return self.proj(y.transpose(1, 2).reshape(B, T, C))
`;

const lesson: LessonModule = {
  rail: [
    { id: "part", label: "Part" },
    { id: "before", label: "GPT-2" },
    { id: "now", label: "Now" },
    { id: "gain", label: "Buys you" },
  ],
  learn: [
    "Explain RoPE: why rotating q and k makes attention depend on relative distance.",
    "Say what RMSNorm and SwiGLU change, and size a SwiGLU MLP.",
    "Compute a KV cache size and explain how grouped-query attention shrinks it.",
    "Explain mixture of experts, with total versus active parameters.",
    "List the smaller changes since GPT-2 and why each exists.",
  ],
  legend: [
    { label: "changed part", color: "var(--mark)" },
    { label: "query", color: "var(--q)" },
    { label: "key", color: "var(--k)" },
    { label: "value", color: "var(--v)" },
    { label: "negative", color: "var(--neg)", shape: "square" },
    { label: "positive", color: "var(--pos)", shape: "square" },
  ],
  code: {
    filename: "modern_block.py",
    source: CODE,
    note: "The parts of a Llama-style block that differ from GPT-2. Compact and runnable, not optimized.",
  },
  steps: [
    {
      label: "Same plan",
      kind: "intuition",
      title: "The skeleton survived; the parts were swapped",
      body: (
        <>
          <p>
            Open the code of Llama, Mistral, Qwen or nanochat and you will recognise GPT-2: embed the tokens, run a stack of pre-norm
            residual blocks (attention, then an MLP), apply a final norm, project to logits. GPT-2 already used pre-norm.
          </p>
          <p>
            What changed is almost every part inside the boxes. Each step of this lesson takes one swap, shows the before and after, and
            gives the reason it won.
          </p>
        </>
      ),
      keyIdea: "If you can draw GPT-2, you can draw a modern open model. Learn the swaps and the reason for each.",
      changed: ["Two block diagrams side by side.", "Every changed part is highlighted."],
      rail: { part: "whole block", before: "GPT-2", now: "Llama-style", gain: "see each step" },
      learns: [],
    },
    {
      label: "RoPE",
      kind: "mechanism",
      title: "Learned positions become rotations of q and k",
      body: (
        <>
          <p>
            GPT-2 adds a learned row <code>wpe[t]</code> to each token embedding, one row per position up to 1,024. RoPE (rotary
            position embedding) instead splits each query and key into pairs of numbers and rotates pair <code>i</code> by{" "}
            <code>t x θ_i</code>, where <code>θ_i = 10000^(-2i/head_size)</code>.
          </p>
          <p>
            Rotate q by <code>m x θ</code> and k by <code>n x θ</code> and their dot product only sees the difference{" "}
            <code>(m - n) x θ</code>. Attention scores now depend on how far apart two tokens are. Values are not rotated.
          </p>
        </>
      ),
      predict: {
        question: "How many learned parameters does RoPE add to the model?",
        options: ["One table of max_len x C, like GPT-2", "One angle per head", "Zero", "One rotation matrix per layer"],
        answer: 2,
        explain: (
          <>
            None. The angles are a fixed function of position and pair index. GPT-2 small spends 1,024 x 768 = 786K parameters on its
            position table; RoPE spends nothing and has no table to run out of.
          </>
        ),
      },
      code: { ranges: [[15, 23], [48, 48]], caption: "Angles depend only on position; q and k are rotated, v is not." },
      changed: ["Left: the learned position table.", "Right: q and k rotate together; the angle between them stays."],
      rail: { part: "positions", before: "learned table", now: "RoPE", gain: "relative, no table" },
      learns: [0],
    },
    {
      label: "RMSNorm",
      kind: "mechanism",
      title: "LayerNorm becomes RMSNorm",
      body: (
        <>
          <p>
            LayerNorm subtracts the mean, divides by the standard deviation, then applies a learned scale and bias. RMSNorm skips the
            mean and the bias: it divides by the root mean square, <code>sqrt(mean(x²))</code>, and applies a learned scale.
          </p>
          <p>
            One reduction instead of two, fewer parameters, and models train just as well. nanochat goes further and drops the learned
            scale too.
          </p>
        </>
      ),
      code: { ranges: [[5, 13]], caption: "The whole of RMSNorm: one mean of squares, one rescale." },
      changed: ["Same input vector through both norms.", "RMSNorm keeps the sign pattern; it only rescales."],
      rail: { part: "norm", before: "LayerNorm", now: "RMSNorm", gain: "cheaper, same quality" },
      learns: [1],
    },
    {
      label: "SwiGLU",
      kind: "mechanism",
      title: "The GELU MLP becomes a gated MLP",
      body: (
        <>
          <p>
            GPT-2&apos;s MLP is <code>Linear(C, 4C)</code>, GELU, <code>Linear(4C, C)</code>. SwiGLU uses three matrices: a gate
            projection passed through SiLU, an up projection, their elementwise product, then a down projection.
          </p>
          <p>
            The gate lets each hidden unit decide how much signal passes. Shazeer&apos;s 2020 comparison found gated variants reach lower
            loss than a plain MLP of the same size.
          </p>
        </>
      ),
      predict: {
        question: "To keep the same parameter count as a GELU MLP with hidden size 4C, what hidden size H should SwiGLU use?",
        options: ["4C", "About 8C/3, roughly 2.67C", "2C", "6C"],
        answer: 1,
        explain: (
          <>
            The old MLP has 2 x C x 4C = 8C² weights. Three matrices of C x H give 3CH, so H = 8C/3. Llama rounds that to a multiple of
            256; Llama 7B uses 11,008 for C = 4,096.
          </>
        ),
      },
      code: { ranges: [[25, 33]], caption: "Three matrices: gate, up, down. silu(gate) times up, then down." },
      changed: ["One path becomes two branches multiplied together."],
      rail: { part: "MLP", before: "GELU, 4C", now: "SwiGLU", gain: "lower loss, same size" },
      learns: [1],
    },
    {
      label: "GQA",
      kind: "mechanism",
      title: "Query heads share keys and values",
      body: (
        <>
          <p>
            In multi-head attention every query head has its own key and value head. When you generate, each layer keeps K and V for
            every past token: the <strong>KV cache</strong>. It grows with layers x K/V heads x head_size x tokens.
          </p>
          <p>
            Multi-query attention shares one K/V head across all query heads. Grouped-query attention is the middle ground: groups of
            query heads share one K/V head. Quality stays close to multi-head; the cache shrinks by the group size.
          </p>
        </>
      ),
      predict: {
        question:
          "A model shaped like Llama 2 7B (32 layers, 32 heads of size 128, fp16) uses plain multi-head attention. How big is the KV cache for one 8,192-token sequence?",
        options: ["128 MiB", "1 GiB", "4 GiB", "32 GiB"],
        answer: 2,
        explain: (
          <>
            2 (K and V) x 32 layers x 32 heads x 128 x 2 bytes = 512 KiB per token. Times 8,192 tokens is 4 GiB, for one sequence.
            That is why serving long contexts is memory-bound, and why GQA matters.
          </>
        ),
      },
      code: { ranges: [[40, 40], [46, 50]], caption: "Project only n_kv K/V heads, cache them, then repeat them for each group of query heads." },
      changed: ["Three layouts: 8, 2 and 1 K/V heads.", "The cache bar shrinks with them."],
      rail: { part: "attention", before: "multi-head", now: "grouped-query", gain: "smaller KV cache" },
      learns: [2],
    },
    {
      label: "Try it",
      kind: "try",
      title: "Slide the number of K/V heads",
      body: (
        <>
          <p>
            Drag the slider from 32 K/V heads (multi-head) down to 1 (multi-query). Watch which query heads share a K/V head and how the
            cache shrinks.
          </p>
          <p>
            Llama 3 8B and Mistral 7B use 8 K/V heads for 32 query heads: a 4x smaller cache. That memory goes to longer contexts or more
            users per GPU.
          </p>
        </>
      ),
      keyIdea: "KV cache bytes = 2 x n_layer x n_kv_head x head_size x tokens x bytes per number.",
      code: { ranges: [[49, 50]], caption: "rep = n_head // n_kv: how many query heads read each cached K/V head." },
      changed: ["The slider sets n_kv_head.", "Lines show which query heads share."],
      learns: [2],
    },
    {
      label: "MoE",
      kind: "mechanism",
      title: "Dense MLP becomes a mixture of experts",
      body: (
        <>
          <p>
            A mixture-of-experts layer replaces one MLP with many (the experts) plus a small router. For each token the router scores all
            experts, keeps the top k, and the token&apos;s output is the gate-weighted sum of just those experts.
          </p>
          <p>
            <strong>Total</strong> parameters count every expert. <strong>Active</strong> parameters count what one token uses. Mixtral
            8x7B has about 47B total but about 13B active (attention and embeddings are shared, so not 56B). Training adds a
            load-balancing loss so the router does not send everything to a few experts.
          </p>
        </>
      ),
      predict: {
        question:
          "An MoE layer has 8 experts, each the size of the original dense MLP, and routes each token to 2. Compute per token for that layer is about:",
        options: ["The same as the dense MLP", "2x the dense MLP", "8x the dense MLP", "A quarter of the dense MLP"],
        answer: 1,
        explain: (
          <>
            Each token runs through 2 full-size experts, plus a tiny router. You hold 8x the MLP parameters in memory but pay about 2x
            the MLP compute. Many MoE models instead use smaller experts so active compute matches a dense model.
          </>
        ),
      },
      changed: ["Each token's line goes to its top 2 experts.", "Unused experts stay faded."],
      rail: { part: "MLP at scale", before: "dense", now: "mixture of experts", gain: "params without compute" },
      learns: [3],
    },
    {
      label: "Smaller",
      kind: "insight",
      title: "Four smaller changes",
      body: (
        <>
          <p>
            Biases are gone from most linear layers. Many recent models normalize q and k before the dot product (QK-norm) so attention
            logits cannot blow up. Larger models usually stop tying the input embedding to the output head. And context grew from 1,024
            tokens to 128K and beyond.
          </p>
          <p>Each one is small. Together with the earlier swaps they are most of the gap between GPT-2 and a 2025 open model.</p>
        </>
      ),
      code: { ranges: [[28, 30], [39, 41]], caption: "bias=False everywhere." },
      changed: ["Four cards: before, after, and why."],
      rail: { part: "details", before: "biases, tied", now: "none, untied", gain: "stability, capacity" },
      learns: [4],
    },
    {
      label: "Recap",
      kind: "recap",
      title: "GPT-2 to now, in one table",
      body: (
        <>
          <p>
            Positions moved into attention as rotations. Norms lost their mean. The MLP gained a gate, and at scale it split into
            experts. Attention shares K/V to save cache. Biases left, QK-norm arrived, embeddings untied, context grew.
          </p>
          <p>In an interview, give the swap and the reason in one breath: &quot;GQA, because the KV cache is the memory bottleneck.&quot;</p>
        </>
      ),
      changed: ["Every change with its reason."],
      rail: { part: "all", before: "GPT-2", now: "modern", gain: "see table" },
      learns: [0, 1, 2, 3, 4],
    },
  ],
  Stage,
};

export default lesson;
