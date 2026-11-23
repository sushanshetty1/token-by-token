"use client";

import type { LessonModule } from "@/lib/types";
import { linesOf } from "./kit";
import { Stage } from "./Stage";

const CODE = `import torch
import torch.nn.functional as F

torch.manual_seed(1337)
B, T, C = 4, 8, 2                       # batch, time, channels
x = torch.randn(B, T, C)

# version 1: each token averages itself and every token before it
xbow = torch.zeros((B, T, C))
for b in range(B):
    for t in range(T):
        xprev = x[b, :t + 1]            # (t+1, C)
        xbow[b, t] = torch.mean(xprev, 0)

# version 2: the same averages as one matrix multiply
wei = torch.tril(torch.ones(T, T))      # 1 on and below the diagonal
wei = wei / wei.sum(1, keepdim=True)    # each row sums to 1
xbow2 = wei @ x                         # (T, T) @ (B, T, C) -> (B, T, C)
print(torch.allclose(xbow, xbow2))      # True

# version 3: start from scores, hide the future, softmax
tril = torch.tril(torch.ones(T, T))
wei = torch.zeros((T, T))               # every score equal, for now
wei = wei.masked_fill(tril == 0, float('-inf'))
wei = F.softmax(wei, dim=-1)            # exp(-inf) = 0, rows sum to 1
xbow3 = wei @ x
print(torch.allclose(xbow, xbow3))      # True
`;

const L = (from: string, to?: string) => linesOf(CODE, from, to);

const lesson: LessonModule = {
  rail: [
    { id: "version", label: "Version" },
    { id: "wei", label: "Weights" },
    { id: "shape", label: "Output shape" },
    { id: "cost", label: "Work" },
  ],
  learn: [
    "Explain why a token's embedding alone is not enough, and why it may only read earlier tokens.",
    "Average past tokens with loops, then with one matrix multiply by a normalized lower-triangular matrix.",
    "Explain why the future is filled with -inf, not 0, before the softmax.",
    "Say what is still missing: weights that depend on content. That is attention.",
  ],
  legend: [
    { label: "positive value", color: "var(--pos)", shape: "square" },
    { label: "negative value", color: "var(--neg)", shape: "square" },
    { label: "weight (0 to 1)", color: "var(--violet)", shape: "square" },
    { label: "masked: the future", color: "var(--rule-strong)", shape: "square" },
    { label: "you are here", color: "var(--mark)", shape: "line" },
  ],
  code: {
    filename: "averaging.py",
    source: CODE,
    note: "Karpathy's three versions of the same idea, from Let's build GPT. All three print True.",
  },
  steps: [
    {
      label: "Context",
      kind: "intuition",
      title: "A token on its own does not know what it means",
      body: (
        <>
          <p>
            After the embedding lookup, <strong>bank</strong> is one row of a table. It is the same six numbers in
            &quot;the river bank&quot; and in &quot;the central bank&quot;. Nothing in that row knows about its
            neighbours.
          </p>
          <p>
            To mean riverside in one sentence and finance in the other, the vector for bank has to be rewritten using
            the tokens around it. This lesson builds the simplest possible version of that rewrite.
          </p>
        </>
      ),
      keyIdea: "Embeddings are context-free. Mixing information between tokens is the whole job of attention.",
      changed: ["Two sentences, one shared vector for bank", "The words before bank decide which meaning it should take"],
      rail: { version: "none yet", wei: "-", shape: "(B, T, C)", cost: "-" },
      learns: [0],
    },
    {
      label: "Look back",
      kind: "problem",
      title: "Each token may only read the tokens before it",
      body: (
        <>
          <p>
            A GPT is trained to predict the next token at every position at once. In &quot;the river bank
            flooded&quot;, position 2 (bank) must predict <code>flooded</code>. If bank could read flooded, the task
            would be copying, and the model would learn nothing useful for generation, where the future does not
            exist yet.
          </p>
          <p>
            So the rule is: the token at row <code>t</code> may read columns <code>0..t</code>, itself included. Drawn
            as a grid, that is a lower triangle.
          </p>
        </>
      ),
      predict: {
        question: "One training sequence has T = 8 tokens. How many next-token predictions does it train in one forward pass?",
        options: ["1, the last one", "7", "8", "64, one per pair of tokens"],
        answer: 2,
        explain: (
          <>
            Eight. The targets are the inputs shifted by one, so position 0 predicts token 1, and position 7 predicts
            the token after the window. Every row is its own training example, which is exactly why row t must not see
            beyond t.
          </>
        ),
      },
      rail: { cost: "T predictions per sequence" },
      learns: [0],
    },
    {
      label: "Loops",
      kind: "mechanism",
      title: "Version 1: average yourself and everything before you",
      body: (
        <>
          <p>
            The simplest way to let a token hear its past: replace <code>x[t]</code> with the mean of{" "}
            <code>x[0]</code> to <code>x[t]</code>. Karpathy calls the result <code>xbow</code>, a bag of words: it
            keeps what was said and forgets the order.
          </p>
          <p>
            Watch the loop. Here T = 4 and C = 2 so you can check every number by hand: bank becomes{" "}
            <code>([3, 0] + [1, 2] + [-1, 1]) / 3 = [1, 1]</code>.
          </p>
        </>
      ),
      changed: ["x is (T, C) = (4, 2)", "xbow[t] fills in as t moves down", "The orange frame is the window 0..t"],
      code: { ranges: [L("# version 1", "xbow[b, t] = torch.mean")], caption: "Two Python loops: slow, but obviously correct." },
      rail: { version: "1: loops", wei: "mean of rows 0..t", cost: "a Python loop over T" },
      learns: [1],
    },
    {
      label: "Sums",
      kind: "mechanism",
      title: "Version 2: a triangle of ones adds up the past",
      body: (
        <>
          <p>
            Multiply x by a lower-triangular matrix of ones. Row t of that matrix has ones in columns <code>0..t</code>,
            so row t of the product is <code>x[0] + ... + x[t]</code>. One matrix multiply computes every running sum at
            once.
          </p>
          <p>
            Read the receipt on the right: row bank picks rows the, river and bank of x with weight 1 and flooded with
            weight 0.
          </p>
        </>
      ),
      changed: ["wei = torch.tril(torch.ones(T, T))", "wei @ x gives running sums", "Row bank highlighted in wei and the result"],
      code: {
        ranges: [L("wei = torch.tril(torch.ones(T, T))"), L("xbow2 = wei @ x")],
        caption: "Matrix multiply as weighted aggregation: row t of wei says how much of each x row to take.",
      },
      rail: { version: "2: tril @ x", wei: "tril(ones), 0 or 1", cost: "one matmul" },
      learns: [1],
    },
    {
      label: "Normalize",
      kind: "mechanism",
      title: "Divide each row by its sum and you get the averages",
      body: (
        <>
          <p>
            Row t has t + 1 ones. Divide it by its sum and every entry becomes <code>1 / (t + 1)</code>. Now each row
            sums to 1, and the product is exactly the running mean from version 1: bank is again <code>[1, 1]</code>.
          </p>
          <p>
            This is the trick the rest of the course builds on: a weighted average over the past is a matrix multiply
            with a row-normalized weight matrix.
          </p>
        </>
      ),
      predict: {
        question: (
          <>
            In the real code <code>wei</code> is (T, T) and <code>x</code> is (B, T, C). What is the shape of{" "}
            <code>wei @ x</code>?
          </>
        ),
        options: ["(T, C)", "(B, T, C)", "(B, T, T)", "An error: the shapes do not match"],
        answer: 1,
        explain: (
          <>
            (B, T, C). PyTorch broadcasts <code>wei</code> across the batch, so it computes (T, T) @ (T, C) once per
            sequence. Every sequence in the batch is averaged with the same weights.
          </>
        ),
      },
      keyIdea: "A weighted average of past tokens is wei @ x, where wei is lower-triangular and each row sums to 1.",
      code: { ranges: [L("# version 2", "print(torch.allclose(xbow, xbow2))")], caption: "Same numbers as the loops: allclose prints True." },
      rail: { wei: "tril / row sums", shape: "(B, T, C)" },
      learns: [1],
    },
    {
      label: "Softmax",
      kind: "mechanism",
      title: "Version 3: start from scores, mask the future, softmax",
      body: (
        <>
          <p>
            Now build the same weights a third way. Start with a (T, T) matrix of scores, all zero. Fill every cell
            above the diagonal with <code>-inf</code>. Then take a softmax along each row.
          </p>
          <p>
            Out come the same weights as version 2: 1, then 0.5 and 0.5, then thirds, then quarters. Why bother? Because
            scores are something a network can compute and learn. Zeros are just a placeholder.
          </p>
        </>
      ),
      predict: {
        question: "Why fill the masked cells with -inf instead of 0?",
        options: [
          "-inf is cheaper to compute",
          "softmax exponentiates: exp(0) = 1 would still give the future weight, exp(-inf) = 0 gives none",
          "0 would make each row sum to 0",
          "It does not matter, both give the same weights",
        ],
        answer: 1,
        explain: (
          <>
            Softmax computes <code>exp(score) / sum of exp</code>. A 0 becomes exp(0) = 1, so flooded would get a
            quarter of bank&apos;s attention. Only <code>-inf</code> turns into exactly 0. The next step shows both.
          </>
        ),
      },
      code: { ranges: [L("# version 3", "print(torch.allclose(xbow, xbow3))")], caption: "masked_fill, then softmax along the last dimension." },
      rail: { version: "3: masked softmax", wei: "softmax(masked zeros)" },
      learns: [2],
    },
    {
      label: "Fixed",
      kind: "insight",
      title: "These weights ignore the words. Attention will not.",
      body: (
        <>
          <p>
            Left: masking with 0 leaks the future. Middle: version 3, correct but uniform. Every sentence gets the same
            thirds, so bank listens to &quot;the&quot; as much as to &quot;river&quot;.
          </p>
          <p>
            Right: if the scores came from the tokens themselves, bank could give river 0.79 of its attention. Computing
            those scores from content, with queries and keys, is self-attention. That is the next lesson.
          </p>
        </>
      ),
      keyIdea: "Version 3 is attention with all scores set to zero. Attention replaces the zeros with q · k.",
      changed: ["Row bank computed three ways", "Same mask, different scores, different output"],
      code: { ranges: [L("wei = torch.zeros((T, T))")], caption: "These zeros are where the attention scores will go." },
      rail: { wei: "fixed, data-independent" },
      learns: [2, 3],
    },
    {
      label: "Try it",
      kind: "try",
      title: "Drag the scores and watch the weights",
      body: (
        <>
          <p>
            Pick a row, then drag the score handles up and down. The softmax weights and the output row update as you
            drag. Change T to see the triangle grow.
          </p>
          <ul>
            <li>Push one score up by 3. Its weight goes to about 0.9: softmax rewards gaps, not totals.</li>
            <li>Raise every score by the same amount. Nothing changes.</li>
            <li>Turn the mask off. Row 0 can suddenly read the whole sentence.</li>
          </ul>
        </>
      ),
      rail: { version: "you drive", wei: "softmax(your scores)" },
      learns: [2, 3],
    },
    {
      label: "Recap",
      kind: "recap",
      title: "Three ways to say the same thing",
      body: (
        <>
          <p>
            Loops, a normalized triangle, and a masked softmax all compute a weighted average of past tokens. The third
            form is the one that matters: <code>softmax(mask(scores)) @ x</code>.
          </p>
          <p>
            You now have every piece of attention except one: where the scores come from. Next, each token emits a
            query and a key, and <code>q · k</code> becomes the score.
          </p>
        </>
      ),
      keyIdea: "Attention = softmax over masked scores, then a weighted sum. The mask keeps it causal; the scores make it smart.",
      code: { ranges: [L("# version 1", "print(torch.allclose(xbow, xbow3))")], caption: "Three versions, one result." },
      learns: [0, 1, 2, 3],
    },
  ],
  Stage,
};

export default lesson;
