"use client";

import { tokenTint } from "@/lib/color";
import type { LessonModule } from "@/lib/types";
import { linesOf } from "../averaging/kit";
import { HEAD_TINT } from "./data";
import { Stage } from "./Stage";

const CODE = `import math
import torch
import torch.nn as nn
import torch.nn.functional as F

# the readable version: a list of Head modules from the last lesson
class MultiHeadAttention(nn.Module):
    def __init__(self, n_embd, n_head, block_size):
        super().__init__()
        head_size = n_embd // n_head
        self.heads = nn.ModuleList([Head(n_embd, head_size, block_size) for _ in range(n_head)])
        self.proj = nn.Linear(n_embd, n_embd)

    def forward(self, x):
        out = torch.cat([h(x) for h in self.heads], dim=-1)   # (B, T, n_head * hs) = (B, T, C)
        return self.proj(out)

# the fast version (nanoGPT): every head in one batched matmul
class CausalSelfAttention(nn.Module):
    def __init__(self, n_embd, n_head, block_size, dropout=0.0):
        super().__init__()
        assert n_embd % n_head == 0
        self.n_head = n_head
        self.c_attn = nn.Linear(n_embd, 3 * n_embd)   # q, k, v for all heads at once
        self.c_proj = nn.Linear(n_embd, n_embd)       # output projection
        self.attn_dropout = nn.Dropout(dropout)
        self.resid_dropout = nn.Dropout(dropout)
        mask = torch.tril(torch.ones(block_size, block_size))
        self.register_buffer('bias', mask.view(1, 1, block_size, block_size))

    def forward(self, x):
        B, T, C = x.size()
        hs = C // self.n_head
        q, k, v = self.c_attn(x).split(C, dim=2)                  # 3 x (B, T, C)
        q = q.view(B, T, self.n_head, hs).transpose(1, 2)        # (B, nh, T, hs)
        k = k.view(B, T, self.n_head, hs).transpose(1, 2)        # (B, nh, T, hs)
        v = v.view(B, T, self.n_head, hs).transpose(1, 2)        # (B, nh, T, hs)
        att = (q @ k.transpose(-2, -1)) * (1.0 / math.sqrt(hs))  # (B, nh, T, T)
        att = att.masked_fill(self.bias[:, :, :T, :T] == 0, float('-inf'))
        att = F.softmax(att, dim=-1)
        att = self.attn_dropout(att)
        y = att @ v                                              # (B, nh, T, hs)
        y = y.transpose(1, 2).contiguous().view(B, T, C)         # heads side by side
        return self.resid_dropout(self.c_proj(y))
`;

const L = (from: string, to?: string) => linesOf(CODE, from, to);

const lesson: LessonModule = {
  rail: [
    { id: "nh", label: "n_head" },
    { id: "hs", label: "head_size" },
    { id: "shape", label: "Shape" },
    { id: "params", label: "Parameters" },
  ],
  learn: [
    "Explain why one head is not enough: one softmax per token can only express one kind of relationship.",
    "Run n_head heads in parallel with head_size = n_embd / n_head, concatenate them and project back to (B, T, C).",
    "Trace the batched version: one Linear for q, k, v, reshape to (B, n_head, T, head_size), one batched matmul.",
    "Count the parameters of an attention layer (4C² + 4C) and explain why n_head does not change it.",
    "Say the one-line summary: attention is communication between tokens, the MLP is computation within a token.",
  ],
  legend: [
    { label: "attention weight", color: "var(--violet)", shape: "square" },
    { label: "one tint per head", color: tokenTint(HEAD_TINT[0]).stroke, shape: "square" },
    { label: "query, key, value", color: "var(--q)", shape: "square" },
    { label: "masked: the future", color: "var(--rule-strong)", shape: "square" },
    { label: "you are here", color: "var(--mark)", shape: "line" },
  ],
  code: {
    filename: "attention.py",
    source: CODE,
    note: "The readable MultiHeadAttention from Let's build GPT, then nanoGPT's batched CausalSelfAttention. Head is the class from the last lesson.",
  },
  steps: [
    {
      label: "One head",
      kind: "problem",
      title: "One head can only ask one question",
      body: (
        <>
          <p>
            A head gives each token exactly one softmax row: one budget of attention that sums to 1. But in &quot;the
            cat sat because it was tired&quot;, the token <strong>it</strong> needs two things: which noun it refers to
            (cat) and what kind of clause it sits in (because).
          </p>
          <p>
            One head has to split its budget, here 0.39 and 0.39, and the output blurs both into one averaged vector.
            Neither signal comes through cleanly.
          </p>
        </>
      ),
      changed: ["The arcs show where it sends its attention", "Thicker arc, bigger weight"],
      rail: { nh: "1", hs: "C", shape: "(B, T, C)" },
      learns: [0],
    },
    {
      label: "In parallel",
      kind: "mechanism",
      title: "Run several smaller heads side by side",
      body: (
        <>
          <p>
            Instead of one head of size C, run <code>n_head</code> heads, each with{" "}
            <code>head_size = n_embd / n_head</code>. Each head has its own key, query and value weights, reads the same
            x, and produces a (B, T, head_size) output.
          </p>
          <p>
            Here n_embd = 8 and n_head = 4, so each head is 2 wide. In GPT-2 small, n_embd = 768 and n_head = 12, so
            each head is 64 wide.
          </p>
        </>
      ),
      predict: {
        question: "n_embd stays 768. You go from 1 head of size 768 to 12 heads of size 64. What happens to the compute for the q, k, v projections?",
        options: ["12 times more", "About the same", "12 times less", "It depends on T"],
        answer: 1,
        explain: (
          <>
            About the same. 12 projections of size 768 to 64 are exactly one projection of 768 to 768, split into
            slices. The heads divide the channels, they do not multiply the work.
          </>
        ),
      },
      code: { ranges: [L("class MultiHeadAttention", "self.proj = nn.Linear")], caption: "A ModuleList of independent heads, each n_embd // n_head wide." },
      rail: { nh: "4", hs: "8 / 4 = 2", shape: "4 × (B, T, 2)" },
      learns: [1],
    },
    {
      label: "Patterns",
      kind: "insight",
      title: "Different heads learn different patterns",
      body: (
        <>
          <p>
            Same sentence, three heads. Head 1 looks at the previous token. Head 2 parks its attention on the first
            token. Head 3 links <strong>it</strong> (and <strong>tired</strong>) back to <strong>cat</strong>.
          </p>
          <p>
            These are illustrative: the scores follow simple rules and the weights are their real softmax. Trained
            models do contain heads like these (previous-token heads, heads that dump attention on the first token,
            heads that track coreference), but many heads are much harder to name.
          </p>
        </>
      ),
      keyIdea: "Multiple heads = multiple independent attention patterns over the same tokens, learned in parallel.",
      learns: [0, 1],
    },
    {
      label: "Concat",
      kind: "mechanism",
      title: "Concatenate the heads, then project",
      body: (
        <>
          <p>
            Each head returns (B, T, head_size). Glue them along the last dimension and you are back to (B, T,
            n_head × head_size) = (B, T, C). Then a Linear(C, C) projection mixes what the heads found.
          </p>
          <p>
            The output has the same shape as x on purpose: in the next lesson it is added back onto x as a residual.
          </p>
        </>
      ),
      predict: {
        question: "n_embd = 384 and n_head = 6. What is head_size, and what shape comes out of torch.cat for a batch?",
        options: ["head_size 6, shape (B, T, 36)", "head_size 64, shape (B, T, 384)", "head_size 64, shape (B, 6, T, 64)", "head_size 384, shape (B, T, 2304)"],
        answer: 1,
        explain: (
          <>
            384 / 6 = 64, and 6 heads of 64 side by side give 384 again: (B, T, 384). This is the configuration of
            Karpathy&apos;s Shakespeare model in Let&apos;s build GPT.
          </>
        ),
      },
      code: { ranges: [L("def forward(self, x):", "return self.proj(out)")], caption: "torch.cat on dim=-1, then the projection." },
      rail: { shape: "(B, T, C)" },
      learns: [1],
    },
    {
      label: "Batched",
      kind: "mechanism",
      title: "The fast version: all heads in one matmul",
      body: (
        <>
          <p>
            A Python loop over heads is slow. nanoGPT computes q, k and v for every head with one{" "}
            <code>Linear(C, 3C)</code>, splits the result, and reshapes each to (B, n_head, T, head_size). Now
            n_head is just another batch dimension.
          </p>
          <p>
            One batched <code>q @ kᵀ</code> gives every head&apos;s (T, T) map at once. After <code>att @ v</code>, a
            transpose and a view put the heads side by side again, which is the concatenation.
          </p>
        </>
      ),
      predict: {
        question: (
          <>
            Why <code>.transpose(1, 2)</code> after <code>.view(B, T, n_head, hs)</code>?
          </>
        ),
        options: [
          "To make the tensor contiguous in memory",
          "To move n_head next to B, so the matmul treats (B, n_head) as batch dimensions and multiplies (T, hs) by (hs, T)",
          "To swap queries and keys",
          "Softmax needs the head dimension last",
        ],
        answer: 1,
        explain: (
          <>
            Matmul works on the last two dimensions and broadcasts over the rest. With (B, n_head, T, hs), the last two
            are (T, hs), so <code>q @ k.transpose(-2, -1)</code> gives (B, n_head, T, T): one map per head per sequence.
          </>
        ),
      },
      code: { ranges: [L("q, k, v = self.c_attn(x)", "return self.resid_dropout")], caption: "Same math as the loop of heads, as a few big tensor ops." },
      rail: { shape: "(B, nh, T, hs)" },
      learns: [2],
    },
    {
      label: "Parameters",
      kind: "insight",
      title: "Count the parameters",
      body: (
        <>
          <p>
            Everything learnable sits in two Linear layers. <code>c_attn</code> maps C to 3C: a C × 3C weight plus 3C
            biases. <code>c_proj</code> maps C to C: a C × C weight plus C biases.
          </p>
          <p>
            The heads are only column slices of those matrices. Changing n_head moves the slice boundaries, not the
            size.
          </p>
        </>
      ),
      predict: {
        question: "For GPT-2 small, n_embd = 768 and n_head = 12. About how many parameters does one attention layer have?",
        options: ["About 0.6 million", "About 2.4 million", "About 7 million (12 heads)", "It depends on the context length"],
        answer: 1,
        explain: (
          <>
            4C² + 4C = 4 × 589,824 + 3,072 = 2,362,368. That is the same for 1 head or 12. Over 12 layers, attention is
            about 28M of GPT-2 small&apos;s 124M parameters. Context length adds no parameters, only compute.
          </>
        ),
      },
      code: { ranges: [L("self.c_attn = nn.Linear", "self.c_proj = nn.Linear")], caption: "Only these two layers have weights. The mask is a buffer." },
      rail: { shape: "(B, T, C)", params: "4C² + 4C" },
      learns: [3],
    },
    {
      label: "Communicate",
      kind: "insight",
      title: "Attention communicates, the MLP computes",
      body: (
        <>
          <p>
            Attention is the only place where tokens exchange information. It decides who reads from whom, with weights
            that depend on the data.
          </p>
          <p>
            Tomorrow you add the other half: an MLP that runs on every token separately, with no cross-talk. A
            transformer block alternates the two, with residual connections and layer norm around each.
          </p>
        </>
      ),
      keyIdea: "Attention is communication between tokens. The MLP is computation within each token.",
      learns: [4],
    },
    {
      label: "Try it",
      kind: "try",
      title: "Flip between heads and change n_head",
      body: (
        <>
          <p>
            Left: pick a head and look at the row for <strong>it</strong>. Each head reads the same sentence and
            distributes its attention differently.
          </p>
          <p>
            Right: change n_head for GPT-2 small. head_size shrinks as n_head grows, but the parameter count and the
            total matmul work stay exactly the same. Only the number of separate attention maps changes.
          </p>
        </>
      ),
      rail: { nh: "you choose", hs: "768 / n_head", shape: "(B, T, C)", params: "2,362,368" },
      learns: [1, 3],
    },
    {
      label: "Recap",
      kind: "recap",
      title: "Many heads, one layer",
      body: (
        <>
          <p>
            Multi-head attention runs n_head small attention heads in parallel on the same x. Each learns its own
            pattern. Their outputs are concatenated back to (B, T, C) and mixed by a projection.
          </p>
          <p>
            In practice it is one Linear for q, k and v, a reshape to (B, n_head, T, head_size), one batched masked
            softmax, and one Linear out: 4C² + 4C parameters, whatever n_head is.
          </p>
        </>
      ),
      keyIdea: "MultiHead(x) = proj(concat(head_1(x), ..., head_n(x))), with head_size = n_embd / n_head.",
      code: { ranges: [L("class CausalSelfAttention", "return self.resid_dropout")], caption: "The whole layer, as in nanoGPT." },
      rail: { nh: "any divisor of C", hs: "C / n_head", shape: "(B, T, C)", params: "4C² + 4C" },
      learns: [0, 1, 2, 3, 4],
    },
  ],
  Stage,
};

export default lesson;
