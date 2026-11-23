"use client";

import type { LessonModule } from "@/lib/types";
import { Stage } from "./Stage";

const CODE = `import torch
import torch.nn as nn
from torch.nn import functional as F

def layer_norm(x, gamma, beta, eps=1e-5):    # what nn.LayerNorm(C) computes
    mean = x.mean(-1, keepdim=True)              # per token, over C
    var = x.var(-1, keepdim=True, unbiased=False)
    return gamma * (x - mean) / torch.sqrt(var + eps) + beta

class MLP(nn.Module):
    def __init__(self, C):
        super().__init__()
        self.c_fc = nn.Linear(C, 4 * C)
        self.gelu = nn.GELU(approximate="tanh")
        self.c_proj = nn.Linear(4 * C, C)

    def forward(self, x):                        # (B, T, C), each token alone
        return self.c_proj(self.gelu(self.c_fc(x)))

class Block(nn.Module):
    def __init__(self, C, n_head):
        super().__init__()
        self.ln_1 = nn.LayerNorm(C)
        self.attn = CausalSelfAttention(C, n_head)   # from Day 4
        self.ln_2 = nn.LayerNorm(C)
        self.mlp = MLP(C)

    def forward(self, x):
        x = x + self.attn(self.ln_1(x))          # communicate
        x = x + self.mlp(self.ln_2(x))           # compute
        return x

class GPT(nn.Module):
    def __init__(self, cfg):
        super().__init__()
        self.wte = nn.Embedding(cfg.vocab_size, cfg.n_embd)
        self.wpe = nn.Embedding(cfg.block_size, cfg.n_embd)
        self.h = nn.ModuleList([Block(cfg.n_embd, cfg.n_head) for _ in range(cfg.n_layer)])
        self.ln_f = nn.LayerNorm(cfg.n_embd)
        self.lm_head = nn.Linear(cfg.n_embd, cfg.vocab_size, bias=False)
        self.lm_head.weight = self.wte.weight    # weight tying (Day 6)

    def forward(self, idx, targets=None):
        B, T = idx.shape
        pos = torch.arange(T, device=idx.device)
        x = self.wte(idx) + self.wpe(pos)        # (B, T, C)
        for block in self.h:
            x = block(x)                         # (B, T, C): the shape never changes
        x = self.ln_f(x)                         # (B, T, C)
        logits = self.lm_head(x)                 # (B, T, vocab_size)
        loss = None
        if targets is not None:
            loss = F.cross_entropy(logits.view(B * T, -1), targets.view(B * T))
        return logits, loss
`;

const lesson: LessonModule = {
  rail: [
    { id: "x", label: "Stream shape" },
    { id: "focus", label: "Looking at" },
    { id: "params", label: "Parameters" },
    { id: "stack", label: "Stack" },
  ],
  learn: [
    "Say what attention does and what the MLP does, in one sentence each",
    "Draw the MLP with its shapes: C to 4C, GELU, back to C",
    "Explain the residual stream and why it lets deep stacks train",
    "Compute a LayerNorm by hand and explain pre-norm vs post-norm",
    "Trace the GPT forward pass with the tensor shape after every stage",
  ],
  legend: [
    { label: "attention: communicate", color: "var(--violet)" },
    { label: "MLP: compute", color: "var(--accent)" },
    { label: "LayerNorm", color: "var(--rule-strong)", shape: "square" },
    { label: "residual stream", color: "var(--ink-3)", shape: "line" },
    { label: "clean gradient path", color: "var(--ok)", shape: "line" },
    { label: "data or gradient moving", color: "var(--mark)" },
    { label: "negative value", color: "var(--neg)", shape: "square" },
    { label: "positive value", color: "var(--pos)", shape: "square" },
  ],
  code: { filename: "block.py", source: CODE, note: "Compact nanoGPT-style GPT-2. CausalSelfAttention is the module from Day 4." },
  steps: [
    {
      label: "Two jobs",
      kind: "intuition",
      title: "A block communicates, then computes",
      body: (
        <>
          <p>
            A transformer block does two things in order. First <strong>attention</strong> lets every token read from the tokens before it: this is the
            only place where information moves between positions. Then an <strong>MLP</strong> processes each token&apos;s vector on its own, with the
            same weights at every position.
          </p>
          <p>
            Both take a <code>(B, T, C)</code> tensor and return one of the same shape. That is why GPT-2 small can stack 12 identical blocks, and GPT-3
            can stack 96.
          </p>
        </>
      ),
      keyIdea: "Attention is communication between tokens. The MLP is computation inside each token.",
      changed: ["Four tokens flow left to right through one block", "Violet curves: what the token ·on reads during attention", "Blue boxes: one MLP per token, all sharing weights"],
      code: { ranges: [[20, 31]], caption: "A Block is two sublayers, applied in order." },
      rail: { x: "(B, T, C)", focus: "attention + MLP", params: "7.09M per block", stack: "12 blocks" },
      learns: [0],
    },
    {
      label: "MLP",
      kind: "mechanism",
      title: "The MLP: widen, bend, narrow",
      body: (
        <>
          <p>
            The MLP is two linear layers with a nonlinearity between them. <code>c_fc</code> takes each 768-number vector up to 3,072 numbers (4C),{" "}
            <strong>GELU</strong> bends each of those numbers on its own, and <code>c_proj</code> brings the vector back down to 768.
          </p>
          <p>
            Without the GELU the two linears would collapse into one matrix and the block could only compute linear functions. The wide middle gives each
            token room to compute features; about two thirds of every block&apos;s parameters live here.
          </p>
        </>
      ),
      predict: {
        question: "Swap the vectors of ·sat and ·on just before they enter the MLP. What happens to the MLP's outputs?",
        options: ["The two outputs swap places, each one unchanged", "Both outputs change, because the MLP mixes tokens", "Only the later token's output changes", "The two outputs are averaged together"],
        answer: 0,
        explain: (
          <>
            The MLP multiplies along C only. The same weights are applied to each of the B × T vectors separately, so moving a token just moves its
            output. Mixing across positions happens only in attention.
          </>
        ),
      },
      code: { ranges: [[10, 18]], caption: "Linear(C, 4C), GELU, Linear(4C, C). Applied to every position independently." },
      rail: { focus: "MLP", params: "4.72M in the MLP" },
      learns: [1],
    },
    {
      label: "Residual",
      kind: "mechanism",
      title: "The residual stream: read, then add",
      body: (
        <>
          <p>
            The block never overwrites <code>x</code>. Each sublayer reads a normalized copy, computes something, and <strong>adds</strong> its result
            back: <code>x = x + attn(ln_1(x))</code>, then <code>x = x + mlp(ln_2(x))</code>.
          </p>
          <p>
            Picture <code>x</code> as a highway through the whole network. Sublayers are exits and on-ramps: they read from the stream and write small
            updates into it. The final vector is the embedding plus the sum of every sublayer&apos;s contribution.
          </p>
        </>
      ),
      keyIdea: (
        <>
          <code>x = x + f(x)</code>. The stream carries everything; each sublayer only adds a change.
        </>
      ),
      changed: ["The saffron dot is x travelling along the stream", "Each branch reads a normalized copy and adds its output back at a plus"],
      code: { ranges: [[28, 31]], caption: "Two additions: that is the whole residual stream." },
      rail: { focus: "residual stream", params: "7.09M per block" },
      learns: [2],
    },
    {
      label: "No shortcut",
      kind: "problem",
      title: "What if each layer replaced x?",
      body: (
        <>
          <p>
            Take the additions out: <code>x = attn(ln_1(x))</code>, then <code>x = mlp(ln_2(x))</code>. Now 12 blocks are a plain chain of 24
            sublayers, and in backprop the gradient from the loss must pass back through every one of them.
          </p>
          <p>
            By the chain rule, each sublayer multiplies the gradient by its local derivative. The stage uses a toy factor of 0.7 per sublayer to stand in
            for that.
          </p>
        </>
      ),
      predict: {
        question: "With a toy factor of 0.7 per sublayer, roughly how much of the gradient reaches block 1?",
        options: ["About 70%", "About 17%", "About 0.02%", "Exactly zero: gradients cannot flow back that far"],
        answer: 2,
        explain: (
          <>
            Factors multiply: 0.7 to the 24th power is about 0.0002, so 0.02%. Block 1 barely learns. Real layers can also push the product above 1 and
            make it explode; either way, a long chain of multiplications is fragile.
          </>
        ),
      },
      code: { ranges: [[29, 30]], caption: "Imagine these two lines without the x + part." },
      rail: { focus: "plain deep stack" },
    },
    {
      label: "Highway",
      kind: "insight",
      title: "Addition is a gradient highway",
      body: (
        <>
          <p>
            Put the additions back. The derivative of <code>x + f(x)</code> with respect to <code>x</code> is <code>1 + f′(x)</code>. That 1 means the
            gradient at a block&apos;s output passes straight to its input, whatever the sublayers do. You saw this on Day 2: addition hands its
            gradient to both inputs unchanged.
          </p>
          <p>
            So the loss reaches block 1 along the stream with no multiplications at all, and each sublayer adds its own term on top. This is why stacks of
            12, 96 or more blocks train.
          </p>
        </>
      ),
      keyIdea: "Residual connections give the gradient a straight path from the loss to every layer. That is what makes deep stacks trainable.",
      changed: ["The stream turns green: a clean path from the loss back to x", "Bars compare the gradient reaching block 1, with and without residuals"],
      code: { ranges: [[29, 30]], caption: "x + ...: the gradient of x flows through the plus untouched." },
      rail: { focus: "gradient path" },
      learns: [2],
    },
    {
      label: "LayerNorm",
      kind: "mechanism",
      title: "LayerNorm puts each token's vector on a steady scale",
      body: (
        <>
          <p>
            Before a sublayer reads the stream, <strong>LayerNorm</strong> rescales one token&apos;s vector: subtract its mean, divide by its standard
            deviation, so the C numbers have mean 0 and variance 1. Then it multiplies by a learned <code>γ</code> and adds a learned <code>β</code>, one
            pair per channel, so the network can undo the scaling where that helps.
          </p>
          <p>
            It works per token, across C, never across positions or the batch (unlike BatchNorm). The stream grows as sublayers add to it; LayerNorm hands
            every sublayer inputs on the same scale, which keeps activations and gradients well behaved.
          </p>
        </>
      ),
      changed: ["Row by row: subtract the mean, divide by the standard deviation, then scale by γ and shift by β", "The stats column shows mean 0 and std 1 after the second step"],
      code: { ranges: [[5, 8], [23, 23], [25, 25]], caption: "nn.LayerNorm(C) holds 2C parameters: γ and β." },
      rail: { focus: "LayerNorm", params: "1,536 per LayerNorm" },
      learns: [3],
    },
    {
      label: "Pre vs post",
      kind: "insight",
      title: "Where the LayerNorm sits matters",
      body: (
        <>
          <p>
            The original 2017 transformer normalized <em>after</em> the addition: <code>x = LN(x + f(x))</code>. That puts LayerNorms on the highway
            itself, so the gradient must cross two of them per block, and deep post-norm stacks need careful learning-rate warmup to train at all.
          </p>
          <p>
            GPT-2 moved them onto the branches: <code>x = x + f(LN(x))</code>. The stream stays clean. Because it is never normalized, GPT-2 adds one
            final <code>ln_f</code> after the last block, before <code>lm_head</code>.
          </p>
        </>
      ),
      keyIdea: "Pre-norm: normalize what goes into each sublayer, never the stream itself. Then one ln_f at the very end.",
      code: { ranges: [[29, 30], [39, 39]], caption: "ln_1 and ln_2 sit inside the branches; ln_f is the one that touches the stream." },
      rail: { focus: "norm placement" },
      learns: [3],
    },
    {
      label: "Forward",
      kind: "mechanism",
      title: "The whole GPT, shape by shape",
      body: (
        <>
          <p>
            Token ids <code>(B, T)</code> become vectors by looking up <code>wte</code> and adding <code>wpe</code>: <code>(B, T, C)</code>. Twelve blocks
            refine that tensor without ever changing its shape. <code>ln_f</code> normalizes it one last time, and <code>lm_head</code>, a{" "}
            <code>Linear(C, vocab_size)</code>, turns each position&apos;s vector into 50,257 scores.
          </p>
          <p>Every position gets logits for the token that follows it, so one forward pass makes T predictions per sequence at once.</p>
        </>
      ),
      predict: {
        question: "For B = 4 and T = 1024 in GPT-2 small, how many numbers are in the logits tensor?",
        options: ["4,096", "3.1 million", "206 million", "50,257"],
        answer: 2,
        explain: (
          <>
            4 × 1024 × 50,257 = 205,852,672 numbers, about 823 MB in fp32. (3.1 million is the size of x: 4 × 1024 × 768.) The logits are often the
            biggest single activation in the model, which is why vocab size matters for memory.
          </>
        ),
      },
      code: { ranges: [[43, 54]], caption: "The forward pass. Only lm_head changes the last dimension." },
      rail: { x: "(4, 1024, 768)", focus: "whole forward", params: "124.4M total", stack: "12 blocks" },
      learns: [4],
    },
    {
      label: "Try it",
      kind: "try",
      title: "Stack blocks yourself",
      body: (
        <>
          <p>
            Drag the number of blocks and watch the parameter count: each GPT-2 small block adds 7.09M, on top of 39.4M for the embeddings and{" "}
            <code>ln_f</code>. Then switch the residual connections off and look at the gradient bars.
          </p>
          <p>With residuals, depth costs parameters but not trainability. Without them, the first blocks of a deep stack get almost no signal.</p>
        </>
      ),
      changed: ["Try 1, 12 and 48 blocks", "Turn residuals off at 12 blocks: block 1 gets 0.7 to the 24th"],
      code: { ranges: [[38, 38]], caption: "n_layer is one number in the config." },
      rail: { focus: "your stack" },
      learns: [2, 4],
    },
    {
      label: "Recap",
      kind: "recap",
      title: "One block, from memory",
      body: (
        <>
          <p>
            The residual stream <code>x</code> has shape <code>(B, T, C)</code>. Each block does <code>x = x + attn(ln_1(x))</code> so tokens
            communicate, then <code>x = x + mlp(ln_2(x))</code> so each token computes alone: C to 4C, GELU, back to C.
          </p>
          <p>
            The additions give gradients a straight path to every layer; LayerNorm gives each sublayer inputs with mean 0 and variance 1. Stack 12
            blocks, apply <code>ln_f</code>, and <code>lm_head</code> maps C to <code>vocab_size</code> logits.
          </p>
        </>
      ),
      code: { ranges: [[20, 31]], caption: "If you can write this class from memory, you understand the block." },
      rail: { x: "(B, T, C)", focus: "recap", params: "124.4M total" },
      learns: [0, 1, 2, 3, 4],
    },
  ],
  Stage,
};

export default lesson;
