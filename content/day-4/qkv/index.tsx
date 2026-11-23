"use client";

import type { LessonModule } from "@/lib/types";
import { linesOf } from "../averaging/kit";
import { Stage } from "./Stage";

const CODE = `import torch
import torch.nn as nn
import torch.nn.functional as F

class Head(nn.Module):
    """One head of causal self-attention."""

    def __init__(self, n_embd, head_size, block_size, dropout=0.0):
        super().__init__()
        self.key = nn.Linear(n_embd, head_size, bias=False)
        self.query = nn.Linear(n_embd, head_size, bias=False)
        self.value = nn.Linear(n_embd, head_size, bias=False)
        # a buffer, not a parameter: saved with the model, never trained
        self.register_buffer('tril', torch.tril(torch.ones(block_size, block_size)))
        self.dropout = nn.Dropout(dropout)

    def forward(self, x):
        B, T, C = x.shape
        k = self.key(x)      # (B, T, hs) what each token contains
        q = self.query(x)    # (B, T, hs) what each token is looking for
        v = self.value(x)    # (B, T, hs) what each token will share
        wei = q @ k.transpose(-2, -1)        # (B, T, hs) @ (B, hs, T) -> (B, T, T)
        wei = wei * k.shape[-1] ** -0.5      # divide by sqrt(head_size)
        wei = wei.masked_fill(self.tril[:T, :T] == 0, float('-inf'))
        wei = F.softmax(wei, dim=-1)         # each row sums to 1
        wei = self.dropout(wei)              # randomly drop some links in training
        out = wei @ v                        # (B, T, T) @ (B, T, hs) -> (B, T, hs)
        return out

head = Head(n_embd=4, head_size=2, block_size=8)
x = torch.randn(1, 4, 4)             # B = 1, T = 4, C = 4, like the stage
print(head(x).shape)                 # torch.Size([1, 4, 2])
`;

const L = (from: string, to?: string) => linesOf(CODE, from, to);

const lesson: LessonModule = {
  rail: [
    { id: "tensor", label: "Tensor" },
    { id: "shape", label: "Shape" },
    { id: "focus", label: "Watching" },
    { id: "value", label: "Value" },
  ],
  learn: [
    "Say what a query, a key and a value are, and compute them from x with three linear layers.",
    "Compute attention scores q · k by hand, scale them by 1 / sqrt(head_size), mask the future and softmax each row.",
    "Explain why the scale exists: unscaled dot products grow with head_size and saturate the softmax.",
    "Read an output row as a weighted mix of value rows, and give every tensor shape from (B, T, C) to (B, T, head_size).",
    "Explain why attention works on a set, and the difference between self and cross, encoder and decoder attention.",
  ],
  legend: [
    { label: "query", color: "var(--q)", shape: "square" },
    { label: "key", color: "var(--k)", shape: "square" },
    { label: "value", color: "var(--v)", shape: "square" },
    { label: "attention weight", color: "var(--violet)", shape: "square" },
    { label: "masked: the future", color: "var(--rule-strong)", shape: "square" },
    { label: "you are here", color: "var(--mark)", shape: "line" },
  ],
  code: {
    filename: "head.py",
    source: CODE,
    note: "One attention head in the style of Karpathy's gpt.py. The stage uses B = 1, T = 4, C = 4, head_size = 2.",
  },
  steps: [
    {
      label: "Roles",
      kind: "intuition",
      title: "Every token asks, advertises and shares",
      body: (
        <>
          <p>
            In the last lesson the scores were zeros. Now each token produces three small vectors from its embedding:
            a <strong>query</strong> (what am I looking for?), a <strong>key</strong> (what do I contain?) and a{" "}
            <strong>value</strong> (what will I hand over if you pick me?).
          </p>
          <p>
            The score between two tokens is how well one token&apos;s query matches the other&apos;s key. The value is
            what actually moves. Think of a search: you type a query, it is matched against keys, and you get back
            values.
          </p>
        </>
      ),
      keyIdea: "Query: what I want. Key: what I have. Value: what I give. Score = query · key.",
      changed: ["Four tokens, each with a query, a key and a value", "bank's query matches river's key best"],
      rail: { tensor: "x", shape: "(B, T, C) = (1, 4, 4)", focus: "bank" },
      learns: [0],
    },
    {
      label: "Projections",
      kind: "mechanism",
      title: "Three linear layers turn x into Q, K and V",
      body: (
        <>
          <p>
            Each row of x goes through three separate <code>nn.Linear(C, head_size, bias=False)</code> layers. Same
            input row, three different weight matrices, three different vectors. Row 2 of Q is bank&apos;s query, row 2
            of K is bank&apos;s key, and so on.
          </p>
          <p>
            The weights here are made up so you can check the arithmetic: <code>q = [x0 + x2, x1 + x3]</code>. In a
            trained model they are learned, and nobody hand-picks what a query means.
          </p>
        </>
      ),
      predict: {
        question: (
          <>
            In a real run x is (B, T, C) = (32, 8, 384) and head_size = 64. What is the shape of{" "}
            <code>q = self.query(x)</code>?
          </>
        ),
        options: ["(32, 8, 384)", "(32, 8, 64)", "(32, 64, 8)", "(8, 64)"],
        answer: 1,
        explain: (
          <>
            (32, 8, 64), that is (B, T, head_size). A Linear layer only acts on the last dimension, so every token in
            every sequence keeps its own row, and that row shrinks from C = 384 numbers to head_size = 64. On the stage
            it is (1, 4, 4) to (1, 4, 2).
          </>
        ),
      },
      code: { ranges: [L("self.key = nn.Linear", "self.value = nn.Linear"), L("k = self.key(x)", "v = self.value(x)")], caption: "Three projections of the same x. No bias, as in Karpathy's Head." },
      rail: { tensor: "Q, K, V", shape: "(B, T, hs) = (1, 4, 2)" },
      learns: [0],
    },
    {
      label: "Scores",
      kind: "mechanism",
      title: "Scores are dot products of queries with keys",
      body: (
        <>
          <p>
            <code>wei = q @ k.transpose(-2, -1)</code> computes every query against every key at once. Cell (i, j) is
            the dot product of row i of Q with column j of Kᵀ, that is, token i&apos;s query with token j&apos;s key.
          </p>
          <p>
            Watch all 16 cells fill in. For bank asking about river: <code>[1, 1] · [2, 1] = 1×2 + 1×1 = 3</code>, the
            biggest score in bank&apos;s row. A big score means the two vectors point the same way.
          </p>
        </>
      ),
      changed: ["Kᵀ on top, Q on the left, scores in the middle", "The ringed cell is the one being computed"],
      code: { ranges: [L("wei = q @ k.transpose(-2, -1)")], caption: "(B, T, hs) @ (B, hs, T) -> (B, T, T): one score per pair of tokens." },
      rail: { tensor: "scores", shape: "(B, T, T) = (1, 4, 4)", focus: "q_bank · k_river = 3" },
      learns: [1],
    },
    {
      label: "Scale",
      kind: "mechanism",
      title: "Divide every score by the square root of head_size",
      body: (
        <>
          <p>
            Before the softmax, multiply all scores by <code>head_size ** -0.5</code>. With head_size = 2 that is 1 /
            1.414 = 0.71, so bank&apos;s 3 becomes 2.12 and its 1 becomes 0.71.
          </p>
          <p>
            It looks like a cosmetic constant. It is not: remove it from a real model and training gets noticeably
            worse. Guess why before you move on.
          </p>
        </>
      ),
      predict: {
        question: "Why divide the scores by sqrt(head_size)?",
        options: [
          "So the numbers fit in 16-bit floats",
          "Dot products grow with head_size; big scores make softmax nearly one-hot and its gradients vanish",
          "So each row of scores sums to 1",
          "It makes the matrix multiply faster",
        ],
        answer: 1,
        explain: (
          <>
            If q and k have entries with variance 1, their dot product has variance head_size. At head_size 64 the
            scores spread 8 times wider, softmax puts almost all weight on one token, and the gradient through it is
            close to zero. Dividing by sqrt(head_size) brings the variance back to 1.
          </>
        ),
      },
      code: { ranges: [L("wei = wei * k.shape[-1] ** -0.5")], caption: "k.shape[-1] is head_size. ** -0.5 means 1 / sqrt." },
      rail: { tensor: "scaled scores", focus: "3 × 0.71 = 2.12" },
      learns: [1, 2],
    },
    {
      label: "Why scale",
      kind: "insight",
      title: "Without the scale, softmax turns into argmax",
      body: (
        <>
          <p>
            Left: the typical size of an unscaled dot product grows like sqrt(head_size). GPT-2 small uses head_size 64,
            so raw scores would be about 8 times wider than at head_size 1.
          </p>
          <p>
            Right: bank&apos;s row as it is, and the same row 8 times wider. The wide row is one-hot: bank would hear
            only river, and the gradient of softmax, roughly <code>p(1 - p)</code>, is 0.20 in the first case and 0.00
            in the second. No gradient, no learning.
          </p>
        </>
      ),
      keyIdea: "Scaling by 1 / sqrt(d_k) keeps scores at unit variance so softmax stays soft and trainable at any head size.",
      learns: [2],
    },
    {
      label: "Mask",
      kind: "mechanism",
      title: "Mask the future with -inf",
      body: (
        <>
          <p>
            The same causal mask as the last lesson. <code>tril</code> is a lower-triangular matrix of ones kept as a
            buffer. Wherever it is 0, the score becomes <code>-inf</code>. Bank loses its score for flooded, even though
            that score (1.41) was its second highest.
          </p>
          <p>
            <code>self.tril[:T, :T]</code> slices the buffer, which is built for the longest context, down to the current
            length.
          </p>
        </>
      ),
      predict: {
        question: "After the mask and the softmax, what will row the (the first token) be?",
        options: ["[0.25, 0.25, 0.25, 0.25]", "[1, 0, 0, 0], whatever its query is", "It depends on q_the · k_river", "[0, 0, 0, 1]"],
        answer: 1,
        explain: (
          <>
            [1, 0, 0, 0]. The first token can only see itself, so it gets all of its own attention and its output is
            just its own value. Its query does not matter at all.
          </>
        ),
      },
      code: { ranges: [L("self.register_buffer('tril'"), L("wei = wei.masked_fill")], caption: "The mask is a buffer: it moves to the GPU with the model but has no gradient." },
      rail: { tensor: "masked scores", focus: "flooded hidden from bank" },
      learns: [1],
    },
    {
      label: "Softmax",
      kind: "mechanism",
      title: "Softmax each row into attention weights",
      body: (
        <>
          <p>
            Exponentiate each score, then divide by the row total. <code>exp(-inf) = 0</code>, so masked cells get
            exactly zero. Every row now sums to 1: it is a budget of attention spread over the visible tokens.
          </p>
          <p>
            Bank spends 0.73 on river, 0.18 on itself and 0.09 on the. Flooded spends 0.75 on bank. These numbers came
            from the content of the tokens, not from a fixed rule.
          </p>
        </>
      ),
      keyIdea: "Each row of wei is a probability distribution: how much token i listens to each earlier token j.",
      code: { ranges: [L("wei = F.softmax(wei, dim=-1)", "wei = self.dropout(wei)")], caption: "dim=-1: normalize across keys, separately for each query." },
      rail: { tensor: "wei", shape: "(B, T, T)", focus: "bank: 0.09, 0.73, 0.18, 0" },
      learns: [1],
    },
    {
      label: "Output",
      kind: "mechanism",
      title: "The output is a weighted mix of the value rows",
      body: (
        <>
          <p>
            <code>out = wei @ v</code>. Row bank of the output is 0.09 of the&apos;s value plus 0.73 of river&apos;s
            value plus 0.18 of its own: <code>[1.51, 0.91]</code>. Bank now carries mostly river&apos;s information.
          </p>
          <p>
            Keys and queries only decide the weights. The values are what actually gets copied, which is why they are a
            separate projection.
          </p>
        </>
      ),
      predict: {
        question: "If bank's weights were exactly [0, 1, 0, 0], what would its output row be?",
        options: ["x_river, river's embedding", "v_river, river's value", "k_river, river's key", "All zeros"],
        answer: 1,
        explain: (
          <>
            Exactly v_river = [2, 1]. The output is wei @ v, so a one-hot row copies one value vector. Neither the key
            nor the raw embedding of river is passed on.
          </>
        ),
      },
      code: { ranges: [L("out = wei @ v", "return out")], caption: "(B, T, T) @ (B, T, hs) -> (B, T, hs)." },
      rail: { tensor: "out", shape: "(B, T, hs) = (1, 4, 2)", value: "out_bank = [1.51, 0.91]" },
      learns: [3],
    },
    {
      label: "Try it",
      kind: "try",
      title: "Steer a query and watch attention follow",
      body: (
        <>
          <p>
            With head_size = 2, queries and keys are arrows on a plane. Drag the blue query arrow, or use the sliders.
            The score with each key is their dot product: long and aligned means high.
          </p>
          <ul>
            <li>Point bank&apos;s query at flooded&apos;s key. The mask still gives flooded 0.</li>
            <li>Turn the mask off. Bank now reads the future: about a quarter of its attention goes to flooded.</li>
            <li>Make the query 3 times longer. The weights get sharper without changing direction.</li>
          </ul>
        </>
      ),
      rail: { focus: "you choose" },
      learns: [1, 3],
    },
    {
      label: "Notes",
      kind: "insight",
      title: "Three things interviewers like to ask",
      body: (
        <>
          <p>
            <strong>Attention works on a set.</strong> Nothing in q · k knows positions. With no mask and no positional
            embeddings, swapping two tokens just swaps their output rows. Order has to be added to x before attention.
          </p>
          <p>
            <strong>Self vs cross.</strong> In self-attention q, k and v all come from the same x. In cross-attention
            the queries come from one sequence and the keys and values from another, such as an encoder&apos;s output.{" "}
            <strong>Encoder vs decoder.</strong> An encoder lets every token see every other token (no mask). A decoder
            like GPT uses the causal mask.
          </p>
        </>
      ),
      predict: {
        question:
          "Now keep the causal mask, still with no positional embeddings, and swap tokens 1 and 2. Does the last token's output change?",
        options: [
          "Yes, its weights come in a different order, so the sum changes",
          "No, it still sees the same set of tokens, so its output is identical",
          "Yes, because the mask moved",
          "It cannot be computed any more",
        ],
        answer: 1,
        explain: (
          <>
            No. The last token sees x0 to x3 either way, and a weighted sum over a set does not care about order. The
            rows in between do change: token 1 now sees x2 instead of x1. Without position embeddings the model knows
            order only through the mask, which is why GPT adds positions to x.
          </>
        ),
      },
      learns: [4],
    },
    {
      label: "Recap",
      kind: "recap",
      title: "One head, from (B, T, C) to (B, T, head_size)",
      body: (
        <>
          <p>
            Project x into q, k, v. Score every pair with <code>q @ kᵀ</code>, scale by 1 / sqrt(head_size), mask the
            future, softmax each row, and mix the values: <code>softmax(mask(q kᵀ / sqrt(d))) v</code>.
          </p>
          <p>
            Every step is a matrix operation over the whole sequence, so all T positions are processed in parallel.
            The price is the (T, T) score matrix: time and memory grow with T².
          </p>
        </>
      ),
      keyIdea: "out = softmax((q kᵀ) / sqrt(head_size) + mask) v. Cost O(T² · head_size) per head.",
      code: { ranges: [L("def forward(self, x):", "return out")], caption: "The whole forward pass, eight lines." },
      rail: { tensor: "out", shape: "(B, T, hs)", focus: "every row" },
      learns: [0, 1, 2, 3, 4],
    },
  ],
  Stage,
};

export default lesson;
