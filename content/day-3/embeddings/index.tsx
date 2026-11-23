"use client";

import type { LessonModule } from "@/lib/types";
import { Stage } from "./Stage";

const CODE = `import torch
import torch.nn as nn
import torch.nn.functional as F

vocab = ["the", "a", "dog", "cat", "man", "bites", "sees", "."]
vocab_size, block_size, n_embd = len(vocab), 6, 6

class GPT(nn.Module):
    def __init__(self):
        super().__init__()
        self.token_embedding_table = nn.Embedding(vocab_size, n_embd)  # (8, 6)
        self.position_embedding_table = nn.Embedding(block_size, n_embd)  # (6, 6)
        # the transformer blocks and lm_head arrive on Days 4 and 5

    def forward(self, idx):
        B, T = idx.shape
        tok_emb = self.token_embedding_table(idx)  # (B, T, C)
        pos = torch.arange(T, device=idx.device)  # 0, 1, ..., T-1
        pos_emb = self.position_embedding_table(pos)  # (T, C)
        x = tok_emb + pos_emb  # broadcasts over B: (B, T, C)
        return x

model = GPT()
idx = torch.tensor([[2, 5, 4]])  # "dog bites man": B=1, T=3
x = model(idx)
print(x.shape)  # torch.Size([1, 3, 6])

# a lookup is one-hot times the table, so the table trains like any weight
W = model.token_embedding_table.weight  # (vocab_size, n_embd)
one_hot = F.one_hot(torch.tensor(2), vocab_size).float()  # [0, 0, 1, 0, 0, 0, 0, 0]
assert torch.allclose(one_hot @ W, W[2])

# order now matters: same token, different position, different vector
swapped = model(torch.tensor([[4, 5, 2]]))  # "man bites dog"
print(torch.allclose(x[0, 0], swapped[0, 2]))  # False: dog at 0 vs dog at 2
`;

const lesson: LessonModule = {
  rail: [
    { id: "ids", label: "idx" },
    { id: "tok", label: "tok_emb" },
    { id: "pos", label: "pos_emb" },
    { id: "x", label: "x" },
  ],
  learn: [
    "Explain an embedding lookup as one-hot times a matrix, and why that makes it trainable.",
    "Explain why attention needs position information at all.",
    "Give the shape of every tensor in x = tok_emb + pos_emb.",
    "Compare learned, sinusoidal and rotary positions in one sentence each.",
  ],
  legend: [
    { label: "negative value", color: "var(--neg)", shape: "square" },
    { label: "positive value", color: "var(--pos)", shape: "square" },
    { label: "token embedding", color: "var(--accent)", shape: "line" },
    { label: "position embedding", color: "var(--violet)", shape: "line" },
    { label: "selected row", color: "var(--ink)", shape: "line" },
  ],
  code: { filename: "embeddings.py", source: CODE, note: "The first lines of a GPT forward pass, in the style of nanoGPT." },
  steps: [
    {
      label: "Lookup",
      kind: "intuition",
      title: "A token id picks one row of a table",
      body: (
        <>
          <p>
            The tokenizer hands the model integers. The first layer is a table with one row per token in the vocabulary:{" "}
            <code>vocab_size</code> rows, each <code>n_embd</code> numbers wide. Token id 2 means &quot;take row 2&quot;. That row
            is the token&apos;s <strong>embedding</strong>.
          </p>
          <p>
            Here the vocabulary has 8 tokens and each vector has 6 numbers, so the table is (8, 6). GPT-2 small uses the same
            idea at (50,257, 768): about 38.6 million numbers in this one table.
          </p>
        </>
      ),
      keyIdea: "An embedding lookup is indexing: id i returns row i of a (vocab_size, n_embd) table.",
      code: { ranges: [[11, 11], [17, 17]], caption: "nn.Embedding is the table; calling it with ids returns their rows." },
      changed: ["The sentence arrives as ids 2, 5, 4.", "Row 2 is copied out as the vector for dog."],
      rail: { ids: "(1, 3)", tok: "(1, 3, 6)" },
      learns: [],
    },
    {
      label: "One-hot",
      kind: "mechanism",
      title: "A lookup is a matrix multiply in disguise",
      body: (
        <>
          <p>
            Write id 2 as a one-hot vector: eight numbers, all zero except a 1 in slot 2. Multiply it by the table and every row
            gets scaled by its entry, then summed. The zeros wipe out everything except row 2. So{" "}
            <code>one_hot(2) @ W</code> equals <code>W[2]</code> exactly.
          </p>
          <p>
            That matters for training: the table is an ordinary weight matrix inside a linear layer, so gradient descent can
            tune it like any other weight. PyTorch just skips the wasteful multiply and indexes instead.
          </p>
        </>
      ),
      predict: {
        question: "A training batch contains only the tokens dog and man. After backprop, which rows of the embedding table have a nonzero gradient?",
        options: ["All 8 rows", "Only rows 2 and 4, for dog and man", "Only row 0", "None: embeddings are fixed"],
        answer: 1,
        explain: (
          <>
            Only rows 2 and 4. In the one-hot view, every other row was multiplied by 0, so its gradient is 0 too. A token that
            never appears in a batch gets no update from it, which is one reason rare tokens end up poorly trained.
          </>
        ),
      },
      code: { ranges: [[28, 31]], caption: "The assert holds for every id: indexing and one-hot multiply are the same function." },
      changed: ["A one-hot column multiplies each row.", "Every row except row 2 is zeroed out."],
      learns: [0],
    },
    {
      label: "Meaning",
      kind: "insight",
      title: "Training pulls similar tokens together",
      body: (
        <>
          <p>
            The table starts random. Training nudges the rows of tokens that appear in similar contexts in similar directions,
            because similar vectors lead to similar predictions. After enough text, dog and cat sit close together, and far from
            sees and bites.
          </p>
          <p>
            The plot uses columns 0 and 1 of the table as x and y. Real models have hundreds of columns, so pictures like this
            are always a projection, and these particular numbers are made up to show the idea.
          </p>
        </>
      ),
      keyIdea: "Nobody designs the embedding values. They are learned, and similar usage produces nearby vectors.",
      code: { ranges: [[11, 11]], caption: "nn.Embedding starts from random numbers; training does the rest." },
      changed: ["The table slides left.", "Columns 0 and 1 become x and y on a plot."],
    },
    {
      label: "Order",
      kind: "problem",
      title: "Without positions, word order is invisible",
      body: (
        <>
          <p>
            &quot;dog bites man&quot; and &quot;man bites dog&quot; look up the same three rows. Only their order differs. Day 4&apos;s
            attention mixes vectors by comparing them with each other, and that comparison does not care where a vector sits.
            Shuffle the inputs and the outputs shuffle the same way.
          </p>
          <p>
            So with token embeddings alone, the model gets the same set of vectors for two sentences with opposite meanings. (A
            causal mask leaks a little order in a GPT, but far too weakly to rely on.)
          </p>
        </>
      ),
      predict: {
        question: "Plain self-attention, no mask, no position information. Does the output vector at dog differ between \"dog bites man\" and \"man bites dog\"?",
        options: [
          "Yes, because dog's neighbours are different",
          "No, it is exactly the same vector, just at a different row",
          "Yes, it is flipped in sign",
          "It depends on the random seed",
        ],
        answer: 1,
        explain: (
          <>
            Identical. Each output is a weighted average over all inputs, with weights from dot products between vectors. Dog
            compares itself with the same three vectors in both sentences, so it computes the same result. Attention is
            permutation-equivariant: reorder the inputs and the outputs are reordered the same way, nothing more.
          </>
        ),
      },
      code: { ranges: [[17, 17]], caption: "tok_emb depends on which token, not on where it is." },
      changed: ["Two sentences with opposite meanings.", "They hand attention the same set of vectors."],
      learns: [1],
    },
    {
      label: "Positions",
      kind: "mechanism",
      title: "A second table, indexed by position",
      body: (
        <>
          <p>
            The fix is a second embedding table with one row per position: <code>block_size</code> rows of <code>n_embd</code>{" "}
            numbers. <code>torch.arange(T)</code> produces the positions 0, 1, ..., T-1, and looking them up gives one vector per
            position.
          </p>
          <p>
            This table knows nothing about tokens. Row 0 is &quot;first&quot;, whatever word is there. It is learned exactly like the
            token table. Its size also caps the context: there is no row for position 6 here.
          </p>
        </>
      ),
      predict: {
        question: (
          <>
            In a real batch, <code>tok_emb</code> has shape (B, T, C) = (4, 8, 32) and <code>pos_emb</code> has shape (T, C) = (8,
            32). What is the shape of <code>x = tok_emb + pos_emb</code>?
          </>
        ),
        options: ["(4, 8, 32)", "(8, 32)", "(4, 16, 32)", "An error: the shapes do not match"],
        answer: 0,
        explain: (
          <>
            (4, 8, 32). PyTorch broadcasting lines shapes up from the right: (8, 32) matches the last two dimensions of (4, 8,
            32), and the missing batch dimension is treated as 1 and stretched. Every sequence in the batch gets the same
            position vectors added.
          </>
        ),
      },
      code: { ranges: [[12, 12], [18, 19]], caption: "A second nn.Embedding, indexed by torch.arange(T) instead of token ids." },
      changed: ["The position table appears.", "arange(3) selects rows 0, 1 and 2."],
      rail: { pos: "(3, 6)" },
      learns: [1],
    },
    {
      label: "Sum",
      kind: "mechanism",
      title: "x = tok_emb + pos_emb",
      body: (
        <>
          <p>
            Each token&apos;s vector gets its position&apos;s vector added, number by number. The result <code>x</code> has shape (B,
            T, C): one vector per token per sequence, now carrying both what the token is and where it is.
          </p>
          <p>
            Look at the bottom: dog at position 0 and dog at position 2 now have different vectors. Adding is enough. The two
            signals share the same 6 numbers, and training learns to keep them apart.
          </p>
        </>
      ),
      keyIdea: "x = tok_emb + pos_emb: (B, T, C) plus (T, C) broadcasts to (B, T, C). This x enters the first transformer block.",
      code: { ranges: [[20, 26]], caption: "One addition, with broadcasting over the batch." },
      changed: ["Three columns: token, position, sum.", "Dog now has different vectors at different positions."],
      rail: { x: "(1, 3, 6)" },
      learns: [2],
    },
    {
      label: "Variants",
      kind: "insight",
      title: "Learned, sinusoidal, rotary",
      body: (
        <>
          <p>
            <strong>Learned</strong> positions, used by GPT-2 and this lesson, are a trained table: simple, but no row exists past{" "}
            <code>block_size</code>. <strong>Sinusoidal</strong> positions, from the original 2017 transformer, are a fixed formula
            of sines and cosines at different frequencies, with zero parameters.
          </p>
          <p>
            <strong>RoPE</strong> (rotary), used by Llama and most recent models, adds nothing to x at all. It rotates the query
            and key vectors inside attention by an angle that grows with position, so their dot product depends on the distance
            between tokens. More on Day 7.
          </p>
        </>
      ),
      keyIdea: "Learned: a trained table. Sinusoidal: a fixed formula. RoPE: rotate q and k so attention sees relative distance.",
      code: { ranges: [[12, 12]], caption: "GPT-2 uses this exact line at (1024, 768). RoPE would delete it." },
      learns: [3],
    },
    {
      label: "Try it",
      kind: "try",
      title: "Build a sentence and watch x",
      body: (
        <>
          <p>
            Click words to build a sentence of up to 6 tokens, the block_size. Each column shows the token&apos;s row, the
            position&apos;s row, and their sum.
          </p>
          <p>
            Try a sentence that repeats a word, like &quot;the dog sees the cat&quot;: the two token rows are identical, the two
            x vectors are not. Then switch between &quot;dog bites man&quot; and &quot;man bites dog&quot; and watch which rows move.
          </p>
        </>
      ),
      code: { ranges: [[33, 35]], caption: "The same check in code: dog at position 0 is not dog at position 2." },
    },
    {
      label: "Recap",
      kind: "recap",
      title: "Recap: from ids to x",
      body: (
        <>
          <p>
            Token ids index a (vocab_size, C) table; position indices from <code>arange(T)</code> index a (block_size, C)
            table. Their sum, x of shape (B, T, C), is what every transformer block reads and writes.
          </p>
          <p>
            Both tables are plain weights learned by gradient descent, because a lookup is one-hot times a matrix. Next: the
            simplest model you can build on top of an embedding table.
          </p>
        </>
      ),
      code: { ranges: [[15, 21]], caption: "The whole embedding stage: four lines of forward." },
      rail: { ids: "(1, 3)", tok: "(1, 3, 6)", pos: "(3, 6)", x: "(1, 3, 6)" },
    },
  ],
  Stage,
};

export default lesson;
