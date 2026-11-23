"use client";

import type { LessonModule } from "@/lib/types";
import { Stage } from "./Stage";

const CODE = `import math
import torch
import torch.nn as nn
import torch.nn.functional as F

class CausalSelfAttention(nn.Module):
    def __init__(self, n_embd, n_head, block_size, causal=True):
        super().__init__()
        self.qkv = nn.Linear(n_embd, 3 * n_embd, bias=False)
        self.proj = nn.Linear(n_embd, n_embd)
        self.n_head, self.causal = n_head, causal
        self.register_buffer("tril", torch.tril(torch.ones(block_size, block_size)))

    def forward(self, x):
        B, T, C = x.shape
        q, k, v = self.qkv(x).split(C, dim=2)
        q, k, v = [t.view(B, T, self.n_head, C // self.n_head).transpose(1, 2) for t in (q, k, v)]
        att = q @ k.transpose(-2, -1) / math.sqrt(k.size(-1))  # (B, n_head, T, T)
        if self.causal:  # switch 1: the mask
            att = att.masked_fill(self.tril[:T, :T] == 0, float("-inf"))
        att = F.softmax(att, dim=-1)
        y = (att @ v).transpose(1, 2).contiguous().view(B, T, C)
        return self.proj(y)

class Block(nn.Module):
    def __init__(self, n_embd, n_head, block_size, causal=True, residual=True, layer_norm=True):
        super().__init__()
        norm = nn.LayerNorm if layer_norm else (lambda n: nn.Identity())  # switch 4
        self.ln1, self.ln2 = norm(n_embd), norm(n_embd)
        self.attn = CausalSelfAttention(n_embd, n_head, block_size, causal)
        self.mlp = nn.Sequential(nn.Linear(n_embd, 4 * n_embd), nn.ReLU(), nn.Linear(4 * n_embd, n_embd))
        self.residual = residual

    def forward(self, x):
        if self.residual:  # switch 3: the skip paths
            x = x + self.attn(self.ln1(x))
            x = x + self.mlp(self.ln2(x))
        else:
            x = self.attn(self.ln1(x))
            x = self.mlp(self.ln2(x))
        return x

class GPT(nn.Module):
    # __init__ builds tok_emb, pos_emb, the blocks, ln_f and lm_head as in the last lesson
    def forward(self, idx, targets=None):
        B, T = idx.shape
        x = self.tok_emb(idx)  # (B, T, C)
        if self.use_pos:  # switch 2: positions
            x = x + self.pos_emb(torch.arange(T, device=idx.device))  # (T, C), broadcast over B
        x = self.ln_f(self.blocks(x))
        logits = self.lm_head(x)  # (B, T, vocab_size)
        loss = None if targets is None else F.cross_entropy(logits.view(B * T, -1), targets.view(B * T))
        return logits, loss

model = GPT(vocab_size=65, n_embd=48, n_head=4, n_layer=2, block_size=32)
optimizer = torch.optim.AdamW(model.parameters(), lr=3e-3)  # switch 5: try 3e-2
`;

const lesson: LessonModule = {
  rail: [
    { id: "base", label: "Baseline val loss" },
    { id: "steps", label: "Steps per run" },
    { id: "seed", label: "Seed" },
    { id: "changed", label: "Changed" },
  ],
  learn: [
    "Run a controlled experiment: one change, same seed, same data",
    "Explain why removing the causal mask collapses the loss but ruins generation",
    "Explain what position embeddings and residual connections each make possible",
    "Say what LayerNorm and the learning rate do for stability, with numbers",
  ],
  legend: [
    { label: "baseline (recorded)", color: "var(--ink-3)", shape: "line" },
    { label: "broken run", color: "var(--bad)", shape: "line" },
    { label: "your live baseline", color: "var(--accent)", shape: "line" },
    { label: "free lab run", color: "var(--violet)", shape: "line" },
    { label: "attention weight", color: "var(--accent)", shape: "square" },
  ],
  code: {
    filename: "gpt_switches.py",
    source: CODE,
    note: "The same five switches exist in the TypeScript engine that trains in your browser.",
  },
  steps: [
    {
      label: "Baseline",
      kind: "intuition",
      title: "Break it to find out what each part does",
      body: (
        <>
          <p>
            Every part of a GPT is there because something fails without it. The fastest way to know which part does what is
            to remove one, retrain, and compare.
          </p>
          <p>
            The baseline is the 64,193-parameter model from the last lesson, trained for 400 steps. Every experiment keeps
            the same seed, so it sees exactly the same batches in the same order; only one switch changes. The gray line is
            the baseline, recorded: it reaches 2.28 val loss at step 400. Running it here reproduces it to the digit.
          </p>
        </>
      ),
      keyIdea: "Change one thing, hold the seed and the data fixed, and compare at the same step. Anything else is an anecdote.",
      code: { ranges: [[55, 56]], caption: "The baseline: every switch on, lr 3e-3." },
      rail: { base: "2.28", steps: "400", seed: "1337", changed: "nothing" },
      learns: [0],
    },
    {
      label: "No mask",
      kind: "try",
      title: "Remove the causal mask",
      body: (
        <>
          <p>
            Delete the <code>masked_fill</code>: every position can now attend to all 32 characters of its window, including
            the ones after it. Training data, loss and optimizer stay the same.
          </p>
          <p>Make your guess, then press Run. 400 steps take about 40 seconds.</p>
        </>
      ),
      predict: {
        question: "Without the mask, what happens to the training loss?",
        options: [
          "It stays near 4.17: the model gets confused",
          "About the same as the baseline",
          "It drops far below the baseline, toward 0",
          "It turns into NaN",
        ],
        answer: 2,
        explain: (
          <>
            It tracks the baseline for about 100 steps (2.45 vs 2.49 at step 100), then falls off a cliff between steps 150
            and 300 and ends at 0.097 train, 0.092 val. The target at position t is the character at t + 1, and that
            character is now in the input. One head learns to copy it.
          </>
        ),
      },
      code: { ranges: [[18, 21]], caption: "Switch 1: skip the masked_fill and the future is visible." },
      rail: { changed: "causal mask off" },
      learns: [0],
    },
    {
      label: "Cheating",
      kind: "insight",
      title: "A loss of 0.09, and it cannot write a word",
      body: (
        <>
          <p>
            The left grid is layer 1, head 2 of the unmasked model. Almost all of each row&apos;s attention (0.97 on average)
            sits on the outlined cell: the next character, which is exactly the target. The model does not predict; it reads
            the answer.
          </p>
          <p>
            Val loss is just as low, because val is scored the same way, with the answer in view. Only generation exposes it:
            the next character does not exist yet, so the copying head has nothing to copy. Its 160-character sample is
            almost entirely newlines.
          </p>
        </>
      ),
      keyIdea: (
        <>
          A loss is only meaningful if the model cannot see the target. The causal mask is what makes training on all T
          positions at once honest.
        </>
      ),
      code: { ranges: [[19, 20]], caption: "One line keeps the future out of reach." },
      learns: [1],
    },
    {
      label: "No positions",
      kind: "try",
      title: "Remove the position embeddings",
      body: (
        <>
          <p>
            Skip <code>pos_emb</code>: each character enters as its token embedding alone, so &quot;tab&quot; and
            &quot;bat&quot; hand attention the same set of vectors. The mask stays on.
          </p>
          <p>Guess, then run it.</p>
        </>
      ),
      predict: {
        question: "Without position embeddings, what happens?",
        options: [
          "It cannot learn at all and stays at 4.17",
          "It learns, but ends worse than the baseline",
          "Same as the baseline: attention already knows the order",
          "It cheats like the unmasked model",
        ],
        answer: 1,
        explain: (
          <>
            Val 2.41 against 2.28 at step 400, and the gap is still growing (0.07 at step 300, 0.13 at 400). Attention sees
            a bag of characters and cannot tell how far back each one is. It is not completely blind: the causal mask leaks a
            little order, since the first position sees only itself, the second only two characters, and so on.
          </>
        ),
      },
      code: { ranges: [[47, 49]], caption: "Switch 2: without this line, order only leaks in through the mask." },
      rail: { changed: "positions off" },
      learns: [2],
    },
    {
      label: "No residuals",
      kind: "try",
      title: "Remove the residual connections",
      body: (
        <>
          <p>
            Replace <code>x = x + attn(ln1(x))</code> with <code>x = attn(ln1(x))</code>, and the same for the MLP. Now the
            signal has no way around the blocks: it must pass through two attentions and two MLPs in series.
          </p>
          <p>Guess, then run it.</p>
        </>
      ),
      predict: {
        question: "With 2 blocks and no residuals, what happens in 400 steps?",
        options: [
          "Same as the baseline",
          "Slower, but it catches up by step 400",
          "It gets stuck early and barely improves",
          "The loss goes to 0",
        ],
        answer: 2,
        explain: (
          <>
            Stuck: 3.38 val at step 400, right at the frequency-only level (3.31 on train). Its sample has letters in the
            right proportions and no words. A separate 2,000-step run was still at 3.38. With 1 block and no residuals it
            does learn (2.48 val at step 500), so depth is what breaks it.
          </>
        ),
      },
      keyIdea: (
        <>
          At init, attention averages over the past and blurs which character is current. Without a skip path that blur
          compounds block after block, and the cheapest fit left is one that ignores the input: letter frequencies. The
          residual stream carries the input around every block, which is what makes deep stacks trainable.
        </>
      ),
      code: { ranges: [[34, 41]], caption: "Switch 3: no x + ..., no path around the block." },
      rail: { changed: "residuals off" },
      learns: [2],
    },
    {
      label: "No LayerNorm",
      kind: "try",
      title: "Remove LayerNorm",
      body: (
        <>
          <p>
            Replace <code>ln1</code>, <code>ln2</code> and <code>ln_f</code> with the identity. Nothing rescales the
            activations any more: they keep whatever size the weights give them.
          </p>
          <p>Guess, then run it at the default learning rate, 3e-3.</p>
        </>
      ),
      predict: {
        question: "Without LayerNorm, at lr 3e-3, what happens?",
        options: ["NaN within a few steps", "A slower start, and it ends clearly worse", "Same as the baseline", "Better than the baseline"],
        answer: 1,
        explain: (
          <>
            3.33 at step 25 against 2.83, and 2.52 val at step 400 against 2.28. The largest gradient norm was 5.7 against
            2.8. No NaN: the gradient is clipped to norm 1 before every update.
          </>
        ),
      },
      keyIdea: (
        <>
          A sweep makes it sharper. Without LayerNorm the gradient norm hit 26 at lr 1e-2 and 1,648 at 3e-2 (clipping kept
          the run alive). With LayerNorm and residuals in place, the worst at any learning rate from 1e-3 to 0.3 was 11.
          LayerNorm holds activations at a steady scale, so one learning rate suits every layer.
        </>
      ),
      code: { ranges: [[28, 29]], caption: "Switch 4: nn.Identity in place of every LayerNorm." },
      rail: { changed: "LayerNorm off" },
      learns: [3],
    },
    {
      label: "lr x10",
      kind: "try",
      title: "Make the learning rate 10 times too big",
      body: (
        <>
          <p>
            Keep the model intact and raise the AdamW learning rate from 3e-3 to 3e-2. Adam takes steps of roughly{" "}
            <code>lr</code> per weight whatever the gradient size, so this makes every step about 10 times longer.
          </p>
          <p>Guess, then run it.</p>
        </>
      ),
      predict: {
        question: "With lr 3e-2, what happens over 400 steps?",
        options: ["It learns 10 times faster", "It diverges to NaN", "It stalls well above the baseline", "Exactly the same: Adam adapts"],
        answer: 2,
        explain: (
          <>
            It is behind from the start (3.17 at step 25 against 2.83) and ends at 2.77 val against 2.28, with a jumpy curve:
            steps that are too long overshoot the valleys instead of settling in. No NaN, thanks to Adam&apos;s bounded steps
            and clipping. At 30x and 100x it sat near 3.2 after 500 steps, about the frequency-only level.
          </>
        ),
      },
      code: { ranges: [[56, 56]], caption: "Switch 5: lr=3e-2." },
      rail: { changed: "lr 3e-2" },
      learns: [3],
    },
    {
      label: "Lab",
      kind: "try",
      title: "Mix your own breakage",
      body: (
        <>
          <p>
            Every switch is live here, plus the learning rate and three model sizes: tiny (1 block, 32 wide), small (the
            baseline) and medium (4 blocks, 64 wide, about 4 times slower).
          </p>
          <p>
            Two to try: no residuals on the tiny 1-block model (does it still learn?), and no LayerNorm at lr 3e-2 (watch the
            max gradient norm).
          </p>
        </>
      ),
      code: { ranges: [[26, 32]], caption: "All switches live in the constructor." },
      rail: { changed: "your choice" },
      learns: [0, 2, 3],
    },
    {
      label: "Recap",
      kind: "recap",
      title: "What each part buys you",
      body: (
        <>
          <p>
            The mask makes the loss honest. Positions give attention a sense of order. Residuals keep a clean path from input
            to output, which is what lets you stack blocks. LayerNorm keeps activations at a steady scale so training is
            smooth. The learning rate sets the step size: too big and it bounces instead of descending.
          </p>
          <p>
            And the rule behind all of it: judge a model by val loss <strong>and</strong> by its samples. The lowest number
            in the table belongs to the only model that cannot write.
          </p>
        </>
      ),
      code: { ranges: [[19, 20], [28, 28], [35, 35], [48, 48], [56, 56]] },
      rail: { changed: "one at a time" },
      learns: [0, 1, 2, 3],
    },
  ],
  Stage,
};

export default lesson;
