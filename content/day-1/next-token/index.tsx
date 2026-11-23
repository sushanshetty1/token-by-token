"use client";

import type { LessonModule } from "@/lib/types";
import { CODE } from "./code";
import { Stage } from "./Stage";

const lesson: LessonModule = {
  rail: [
    { id: "ctx", label: "Context" },
    { id: "top", label: "Top token" },
    { id: "p", label: "p(top)" },
    { id: "temp", label: "Temperature" },
    { id: "passes", label: "Forward passes" },
  ],
  learn: [
    "Say exactly what a language model outputs for a given context.",
    "Compute softmax by hand, and explain why adding a constant to every logit changes nothing.",
    "Explain greedy decoding, sampling and temperature with real numbers.",
    "Describe the generation loop and why it costs one forward pass per new token.",
    "Explain why one sequence of T tokens gives T training examples.",
  ],
  legend: [
    { label: "positive logit", color: "var(--pos)", shape: "square" },
    { label: "negative logit", color: "var(--neg)", shape: "square" },
    { label: "probability", color: "var(--accent)", shape: "square" },
    { label: "chosen token", color: "var(--mark)", shape: "square" },
  ],
  code: { filename: "generate.py", source: CODE },
  steps: [
    {
      label: "The job",
      kind: "intuition",
      title: "The model has exactly one job",
      body: (
        <>
          <p>
            Give a GPT the tokens so far and it returns one number for every token in its vocabulary: 50,257 numbers
            for GPT-2. These numbers are <strong>logits</strong>, raw scores for &quot;what comes next&quot;.
          </p>
          <p>
            It does not plan a sentence and it does not look anything up. Every reply you have ever read from a model
            came out of this one step, repeated.
          </p>
        </>
      ),
      keyIdea: "A language model maps the tokens so far to a score for every possible next token. That is all it computes.",
      code: { ranges: [[14, 15]], caption: "model(idx) returns logits at every position. Generation keeps only the last one." },
      rail: { ctx: "5 tokens", passes: "1" },
      learns: [0],
    },
    {
      label: "Logits",
      kind: "mechanism",
      title: "Logits: one raw score per token",
      body: (
        <>
          <p>
            Here are 8 of the 50,257 logits for this context, with their real GPT-2 tokens. To keep the arithmetic
            visible, pretend these 8 are the whole vocabulary (the values are illustrative).
          </p>
          <p>
            <code>·Paris</code> scores 6.2 and <code>·banana</code> scores -2.1. Higher means more likely, but a logit
            is not a probability: it can be negative, and the column does not sum to 1.
          </p>
        </>
      ),
      changed: ["Each candidate gets a bar from zero: saffron for positive logits, ultramarine for negative."],
      code: { ranges: [[15, 15]], caption: "logits[:, -1, :] keeps the last position: shape (B, vocab_size)." },
      rail: { top: "·Paris" },
      learns: [0],
    },
    {
      label: "Exp",
      kind: "mechanism",
      title: "Softmax, part 1: exponentiate",
      body: (
        <>
          <p>
            Softmax first applies <code>exp</code> to every logit. The result is always positive, so{" "}
            <code>·banana</code>&apos;s -2.1 becomes 0.12: small, but a valid share.
          </p>
          <p>
            <code>exp</code> also stretches gaps. Each extra point of logit multiplies by e ≈ 2.72. <code>·Paris</code>{" "}
            was 2.2 points ahead of <code>·a</code>, so it is now e<sup>2.2</sup> ≈ 9 times bigger: 492.7 against 54.6.
          </p>
        </>
      ),
      changed: ["New column: exp(logit) for each token.", "Their sum, 610.3, appears underneath."],
      code: { ranges: [[6, 6]], caption: "Step one of softmax: exponentiate." },
    },
    {
      label: "Normalize",
      kind: "mechanism",
      title: "Softmax, part 2: divide by the sum",
      body: (
        <>
          <p>
            Divide each value by the total, 610.3. Now every number is between 0 and 1 and they add up to 1: a
            probability distribution. <code>·Paris</code> gets 492.7 / 610.3 = 80.7%.
          </p>
          <p>
            That is all of softmax: p<sub>i</sub> = exp(z<sub>i</sub>) / Σ<sub>j</sub> exp(z<sub>j</sub>). The order
            never changes, so the top logit is always the top probability.
          </p>
        </>
      ),
      keyIdea: "Softmax: exponentiate every logit, then divide by their sum.",
      predict: {
        question: "Now add 10 to every one of the 8 logits. What happens to the probabilities?",
        options: [
          "·Paris climbs towards 100%",
          "They all grow, so they sum to more than 1",
          "Nothing changes",
          "·banana becomes likely, because its logit is now positive",
        ],
        answer: 2,
        explain:
          "Adding a constant multiplies every exp by the same factor, e^10 ≈ 22,026. That factor is in each numerator and in the sum, so it cancels. Only the differences between logits matter.",
      },
      code: { ranges: [[4, 7]], caption: "The full softmax. Line 7 divides by the sum." },
      rail: { p: "80.7%", temp: "1.0" },
      learns: [1],
    },
    {
      label: "Shift",
      kind: "insight",
      title: "Only the gaps between logits matter",
      body: (
        <>
          <p>
            Every logit went up by 10. The exp column exploded (<code>·Paris</code> is now 1.09e7), but every value grew
            by the same factor of 22,026, so did the sum, and the probabilities did not move.
          </p>
          <p>
            Real code uses this on purpose: it subtracts the largest logit before <code>exp</code>. Same answer, and{" "}
            <code>exp</code> never sees a large number. In float32, exp overflows to infinity above about 88.
          </p>
        </>
      ),
      keyIdea: "softmax(z + c) = softmax(z) for any constant c. Only logit differences carry information.",
      changed: ["Logits now read 16.2 down to 7.9.", "The exp column is 22,026 times bigger, same shape.", "Probabilities: identical."],
      code: { ranges: [[5, 5]], caption: "Subtracting the max is the same trick, with -6.2 instead of +10." },
      rail: { p: "80.7%, same" },
      learns: [1],
    },
    {
      label: "Pick",
      kind: "mechanism",
      title: "Greedy or sample",
      body: (
        <>
          <p>
            Probabilities are not a token yet. <strong>Greedy</strong> decoding takes the argmax, <code>·Paris</code>,
            every time, so the same prompt always gives the same text. <strong>Sampling</strong> draws a random u
            between 0 and 1 and sees where it lands on the stacked bar.
          </p>
          <p>
            <code>·Paris</code> owns the first 80.7% of the bar, so it wins about 4 draws in 5. Run 2 drew 0.86 and
            landed on <code>·a</code>, which is still a sensible start: &quot;is a city of two million people&quot;.
          </p>
        </>
      ),
      predict: {
        question: "Before sampling, the logits are divided by a temperature T. What does sampling turn into as T gets close to 0?",
        options: [
          "Uniform: every token equally likely",
          "Greedy: it always picks ·Paris",
          "Nothing changes, T only matters above 1",
          "It crashes, because you divide by zero",
        ],
        answer: 1,
        explain:
          "Dividing by a tiny T multiplies every gap between logits by a huge number, so after softmax the top token holds almost all the probability and every draw returns it. Exactly T = 0 is undefined, so libraries switch to argmax there.",
      },
      code: { ranges: [[17, 20]], caption: "argmax for greedy, torch.multinomial for a weighted draw." },
      learns: [2],
    },
    {
      label: "Temperature",
      kind: "try",
      title: "Try it: temperature",
      body: (
        <>
          <p>
            Drag the slider. The logits never change; only z / T does. Below 1 the gaps grow and <code>·Paris</code>{" "}
            swallows the distribution (98.1% at T = 0.5). Above 1 they shrink (49.3% at T = 2), and even{" "}
            <code>·banana</code> gets a real chance.
          </p>
          <p>
            Chat products often sample somewhere around T = 0.7 to 1. Lower values suit code and evaluations.
            Temperature changes how the model chooses, never what it knows.
          </p>
        </>
      ),
      changed: ["Live: the logit ÷ T column and every bar.", "Try T = 0.1, then T = 3."],
      code: { ranges: [[15, 15], [20, 20]], caption: "Temperature is one division, before softmax." },
      rail: { temp: "your choice" },
      learns: [2],
    },
    {
      label: "Loop",
      kind: "mechanism",
      title: "One token at a time, in a loop",
      body: (
        <>
          <p>
            Generation is a loop: run the model, pick a token, append it, run again. <code>·Paris</code> becomes part of
            the context for pass 2, which picks <code>.</code>, and so on.
          </p>
          <p>
            Each pass goes through every layer, and the passes cannot run side by side: pass 2 needs the token that pass
            1 picked. That is why replies stream in piece by piece. When the context outgrows the window (1,024 tokens
            for GPT-2) the oldest tokens are cropped.
          </p>
        </>
      ),
      keyIdea: "Autoregressive: every output token becomes input for the next step.",
      predict: {
        question: "A prompt is 1,000 tokens long. How many forward passes does it take to generate 50 new tokens?",
        options: ["1", "50", "1,050", "50,000"],
        answer: 1,
        explain:
          "One pass per new token: 50. The first pass reads all 1,000 prompt tokens at once, in parallel, and yields the first new token. Each later pass adds one. Without a cache every pass recomputes the whole context; the KV cache (Day 6) avoids that work, but it is still 50 passes.",
      },
      code: { ranges: [[12, 22]], caption: "The whole loop. torch.cat appends, idx[:, -block_size:] keeps it inside the window." },
      rail: { ctx: "5 to 9 tokens", temp: "1.0", passes: "4" },
      learns: [3],
    },
    {
      label: "Wrong",
      kind: "problem",
      title: "Confident and wrong",
      body: (
        <>
          <p>
            Ask about something that never happened. The model still outputs a distribution that sums to 1, so some
            token gets picked. <code>·Neil</code> leads because &quot;first person to walk on&quot; is so often followed
            by Neil Armstrong in the training text.
          </p>
          <p>
            Then <code>·Neil</code> is context, and given it, <code>·Armstrong</code> is 92% likely. Every step is
            locally reasonable and the sentence is false. This is one mechanical cause of hallucination: nothing in the
            loop checks facts. Training to say &quot;I am not sure&quot;, retrieval and tools reduce it; they do not
            remove it.
          </p>
        </>
      ),
      keyIdea: "The model is trained to produce likely text, not true text.",
      code: { ranges: [[20, 21]], caption: "Nothing between the draw and the append asks whether the claim is true." },
      rail: { ctx: "8 tokens", top: "·Neil", p: "31%", passes: "2" },
      learns: [3],
    },
    {
      label: "Training",
      kind: "mechanism",
      title: "Training: every position is an example",
      body: (
        <>
          <p>
            In training the targets are the text shifted by one. In the window &quot;The capital of France is
            Paris&quot;, position 0 sees <code>The</code> and must predict <code>·capital</code>; position 3 sees four
            tokens and must predict <code>·is</code>.
          </p>
          <p>
            A causal mask stops each position from peeking ahead, so one forward pass over T = 6 inputs grades 6
            predictions at once, and a batch of B windows grades B × T. Nobody labelled anything: the text is its own
            label.
          </p>
        </>
      ),
      keyIdea: "x = data[i : i+T], y = data[i+1 : i+T+1]. One window of T tokens, T next-token examples.",
      code: { ranges: [[25, 34]], caption: "y is x shifted by one. cross_entropy grades all B × T positions together." },
      rail: { ctx: "6 tokens", top: "6 targets", p: "per position", passes: "1" },
      learns: [4],
    },
    {
      label: "Recap",
      kind: "recap",
      title: "Recap",
      body: (
        <>
          <p>
            Inference in one breath: token ids in, logits for every vocabulary entry, keep the last position, divide by
            T, softmax, pick one id, append, repeat. One forward pass per new token.
          </p>
          <p>
            Training is the same forward pass with every position predicting its next token. Next on Day 2: how a
            wrong prediction turns into a nudge for every weight.
          </p>
        </>
      ),
      learns: [0, 1, 2, 3, 4],
    },
  ],
  Stage,
};

export default lesson;
