"use client";

import type { LessonModule } from "@/lib/types";
import { CODE } from "./code";
import { Stage } from "./Stage";

const lesson: LessonModule = {
  rail: [
    { id: "chars", label: "Characters" },
    { id: "tokens", label: "Tokens" },
    { id: "shape", label: "Tensor shape" },
    { id: "layers", label: "Blocks run" },
    { id: "next", label: "Next token" },
  ],
  learn: [
    "Name every component a prompt passes through, in order",
    "Say what the data looks like at each stage, with its shape",
    "Explain what attention and the MLP each contribute",
    "Explain why only the last position's logits pick the next token",
    "Describe generation as a loop of forward passes",
  ],
  legend: [
    { label: "token", color: "color-mix(in oklab, #2f52d0 30%, var(--card))", shape: "square" },
    { label: "special token", color: "var(--violet)", shape: "square" },
    { label: "negative value", color: "var(--neg)", shape: "square" },
    { label: "positive value", color: "var(--pos)", shape: "square" },
    { label: "you are here", color: "var(--mark)", shape: "dot" },
  ],
  code: {
    filename: "journey.py",
    source: CODE,
    note: "Simplified from nanoGPT: no dropout, no batching of many users, no KV cache.",
  },
  steps: [
    {
      label: "Hit Enter",
      kind: "intuition",
      title: "You ask a question",
      body: (
        <>
          <p>
            You type <code>What is the capital of France?</code> and press Enter. A fraction of a second later the
            first word of the answer appears.
          </p>
          <p>
            In between, your sentence becomes integers, the integers become vectors, the vectors flow through a stack
            of identical blocks, and out comes a score for every token the model knows. Let&apos;s follow it hop by hop.
          </p>
        </>
      ),
      keyIdea: "A language model does exactly one thing: given some tokens, it scores every possible next token.",
      rail: { chars: "30" },
    },
    {
      label: "Template",
      kind: "mechanism",
      title: "Your message gets wrapped",
      body: (
        <>
          <p>
            The model has no idea what a chat is. The app wraps your text in <strong>special tokens</strong> that mark
            who is speaking, and ends with the token that says it is now the assistant&apos;s turn.
          </p>
          <p>The model learned this format during fine-tuning, so the final marker makes it answer instead of, say, continuing your question.</p>
        </>
      ),
      predict: {
        question: (
          <>
            How many tokens does GPT-2&apos;s tokenizer turn <code>What is the capital of France?</code> into (not counting
            the two special tokens)?
          </>
        ),
        options: ["5, one per word", "7", "30, one per character", "It depends on the GPU"],
        answer: 1,
        explain: (
          <>
            Seven: <code>What</code>, <code>·is</code>, <code>·the</code>, <code>·capital</code>, <code>·of</code>,{" "}
            <code>·France</code>, <code>?</code>. Common words are single tokens, and the leading space belongs to the
            token. Rare words would be split into several pieces.
          </>
        ),
      },
      code: { ranges: [[19, 19]], caption: "The chat template is just string concatenation." },
      changed: ["Added a speaker marker before your message", "Added the assistant marker after it"],
    },
    {
      label: "Tokenize",
      kind: "mechanism",
      title: "Text becomes integers",
      body: (
        <>
          <p>
            The tokenizer splits the string into pieces from a fixed vocabulary (50,257 for GPT-2) and replaces each
            piece with its id. These are the real GPT-2 ids for your message.
          </p>
          <p>
            From here on there are no letters anywhere. That is why models struggle to count the r&apos;s in
            &quot;strawberry&quot;: they see a few chunks, not letters (Day 3).
          </p>
        </>
      ),
      code: { ranges: [[20, 20]], caption: "encode() returns a list of ints, wrapped into a (1, T) tensor." },
      rail: { tokens: "9", shape: "(1, 9)" },
      learns: [0],
    },
    {
      label: "Embed",
      kind: "mechanism",
      title: "Each integer picks a row of numbers",
      body: (
        <>
          <p>
            The model owns a table with one learned row of 768 numbers per token. Token id 4881 simply selects row 4881.
            A second table adds a row for each <strong>position</strong>, so the model knows the order.
          </p>
          <p>
            The result is a matrix: 9 tokens by 768 numbers. Every later step works on this matrix, and its shape stays
            the same all the way through the blocks.
          </p>
        </>
      ),
      keyIdea: "An embedding is a lookup, not a calculation. Training moves the numbers in the rows.",
      code: { ranges: [[7, 10]], caption: "tok and pos are both lookups; x is their sum." },
      rail: { shape: "(1, 9, 768)" },
      learns: [1],
    },
    {
      label: "Blocks",
      kind: "mechanism",
      title: "Into a stack of 12 identical blocks",
      body: (
        <>
          <p>
            Each block has two parts. <strong>Attention</strong> lets every token gather information from earlier
            tokens. The <strong>MLP</strong> then processes each token&apos;s vector on its own.
          </p>
          <p>
            Both parts add their result to <code>x</code> instead of replacing it. That running sum is the{" "}
            <strong>residual stream</strong>, and it is what makes deep stacks trainable (Day 5).
          </p>
        </>
      ),
      code: { ranges: [[11, 13]], caption: "Two lines per block. Both add into x." },
      rail: { layers: "0 / 12" },
    },
    {
      label: "Attention",
      kind: "mechanism",
      title: "Tokens talk to earlier tokens",
      body: (
        <>
          <p>
            For each position, attention computes how relevant every earlier token is, turns those scores into weights
            that sum to 1, and takes a weighted mix of what those tokens offer.
          </p>
          <p>
            For the position about to answer, <code>·France</code> and <code>·capital</code> matter most. A token can
            never look to its right: during training that would be cheating.
          </p>
        </>
      ),
      keyIdea: "Attention is communication between positions. It is the only place where tokens exchange information.",
      code: { ranges: [[12, 12]], caption: "block.attn: mixes information across positions." },
      rail: { layers: "1 / 12" },
      learns: [2],
    },
    {
      label: "MLP",
      kind: "mechanism",
      title: "Each token thinks on its own",
      body: (
        <>
          <p>
            The MLP widens each vector from 768 to 3,072 numbers, applies a non-linearity, and squeezes it back to 768.
            It is the same small network for every position, with no mixing between them.
          </p>
          <p>
            About two thirds of each block&apos;s weights live here, and research suggests this is where much of the
            stored knowledge sits (3Blue1Brown chapter 7).
          </p>
        </>
      ),
      code: { ranges: [[13, 13]], caption: "block.mlp: computation on each position separately." },
      rail: { layers: "1 / 12" },
    },
    {
      label: "Last spot",
      kind: "insight",
      title: "After 12 blocks, one vector matters",
      body: (
        <>
          <p>
            The matrix comes out of block 12 with the same shape it went in: (9, 768). Every position now holds a vector
            describing what should come after it.
          </p>
          <p>To continue your conversation, we only need what comes after the final token.</p>
        </>
      ),
      predict: {
        question: "Which position's output is used to choose the first word of the answer?",
        options: ["The first position", "The last position", "The average of all positions", "The position of 'France'"],
        answer: 1,
        explain: (
          <>
            The last one. Position t predicts token t + 1, and only the last position has seen the entire prompt. The
            other positions&apos; predictions are what make training efficient: one sequence gives 9 training examples
            at once.
          </>
        ),
      },
      code: { ranges: [[14, 15], [24, 24]], caption: "The model returns logits for all positions; reply() keeps only [:, -1, :]." },
      rail: { layers: "12 / 12" },
      learns: [3],
    },
    {
      label: "Logits",
      kind: "mechanism",
      title: "A score for every token in the vocabulary",
      body: (
        <>
          <p>
            A final LayerNorm and one big matrix multiply (768 by 50,260) turn the last vector into 50,260 numbers called{" "}
            <strong>logits</strong>: one raw score per token the model knows.
          </p>
          <p>
            Most are low. A handful stand out: <code>The</code> at 7.9 and <code>Paris</code> at 7.2. Logits are not
            probabilities yet; they can be any real number.
          </p>
        </>
      ),
      code: { ranges: [[14, 15], [23, 24]], caption: "lm_head maps (B, T, 768) to (B, T, vocab_size)." },
      rail: { shape: "(1, 50260)" },
    },
    {
      label: "Sample",
      kind: "mechanism",
      title: "Softmax, then a weighted coin toss",
      body: (
        <>
          <p>
            Softmax exponentiates every logit and divides by the total, so the scores become probabilities that sum to
            1. Here <code>The</code> gets about 65% and <code>Paris</code> about 32%.
          </p>
          <p>
            The model then <em>samples</em>: it usually picks <code>The</code>, sometimes <code>Paris</code>. Temperature
            and top-p control how adventurous this draw is (next lesson, and Day 6).
          </p>
        </>
      ),
      predict: {
        question: "You add 10 to every one of the 50,260 logits. What happens to the probabilities?",
        options: ["They all rise", "Nothing changes", "The top token reaches 100%", "They no longer sum to 1"],
        answer: 1,
        explain: (
          <>
            Nothing. Softmax only cares about differences between logits: e^(x+10) / Σ e^(x+10) is the same as
            e^x / Σ e^x. That is why logits are called unnormalized log-probabilities.
          </>
        ),
      },
      code: { ranges: [[24, 26]], caption: "Divide by temperature, softmax, then torch.multinomial draws one id." },
      rail: { next: "The" },
    },
    {
      label: "Loop",
      kind: "mechanism",
      title: "Append, run again, repeat",
      body: (
        <>
          <p>
            The chosen token is appended to the input and the whole model runs again to choose the next one. One full
            forward pass per new token, until the model produces the end token.
          </p>
          <p>
            Each id is decoded back to text and sent to your screen immediately. That is the streaming you see in every
            chat app.
          </p>
        </>
      ),
      keyIdea: "Generation is a loop. The model never plans the whole answer; it commits to one token at a time.",
      code: { ranges: [[22, 31]], caption: "The generation loop: forward, pick, append, stream." },
      rail: { tokens: "17", next: "<|end|>" },
      learns: [4],
      changed: ["8 new tokens, 8 forward passes", "The KV cache (Day 6) avoids recomputing the first 9 tokens each time"],
    },
    {
      label: "Recap",
      kind: "recap",
      title: "The whole journey, with shapes",
      body: (
        <>
          <p>
            Text, then <strong>token ids</strong> (T), then <strong>embeddings</strong> (T, C), through{" "}
            <strong>12 blocks</strong> of attention and MLP that keep the shape (T, C), then <strong>logits</strong> for
            the last position (vocab_size), then a <strong>sample</strong>, appended, and repeat.
          </p>
          <p>
            Say it out loud once without looking. That sentence is the backbone of every interview answer about LLMs.
          </p>
        </>
      ),
      code: { ranges: [[5, 32]], caption: "The whole journey in about 30 lines." },
      learns: [0, 1, 2, 3, 4],
    },
  ],
  Stage,
};

export default lesson;
