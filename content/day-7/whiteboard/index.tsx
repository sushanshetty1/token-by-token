"use client";

import type { LessonModule } from "@/lib/types";
import { Stage } from "./Stage";

const lesson: LessonModule = {
  learn: [
    "Draw the forward pass from text to a sampled token, in order, from memory.",
    "Write one training step in order, and say where zero_grad may go.",
    "Put the right tensor shape on every arrow of the pipeline.",
    "Explain each box of the pipeline in one or two sentences.",
    "Answer interview questions from all seven days, and know which days to revisit.",
  ],
  legend: [
    { label: "right", color: "var(--ok)", shape: "square" },
    { label: "wrong place", color: "var(--bad)", shape: "square" },
    { label: "next slot, selected", color: "var(--mark)", shape: "square" },
    { label: "training card", color: "var(--violet)", shape: "square" },
  ],
  steps: [
    {
      label: "The test",
      kind: "intuition",
      title: "The finish line: the whole path, from memory",
      body: (
        <>
          <p>
            Your plan ends here. Without notes, draw text, tokens, embeddings, attention and MLP blocks, logits, loss, backprop and the
            weight update, and say what flows along every arrow.
          </p>
          <p>
            The stage runs it as five rounds: order the forward pass, order a training step, match the shapes, explain each box, then an
            interview drill drawn from every day. Results are saved in this browser, and the whiteboard fills in as you solve rounds.
          </p>
        </>
      ),
      predict: {
        question: "GPT-2 small reads one sequence of T = 1,024 tokens. Which of these tensors holds the most numbers?",
        options: ["The embeddings, (T, C)", "One head's attention scores, (T, T)", "The logits, (T, vocab_size)", "The loss"],
        answer: 2,
        explain: (
          <>
            1,024 x 50,257 is about 51.5M numbers, against 786K for the embeddings and about 1M for one head&apos;s scores. The last
            layer and the cross-entropy are among the most memory-hungry steps, which is why large-vocabulary models often compute the
            loss in chunks.
          </>
        ),
      },
      changed: ["A blank whiteboard: every box is a question mark.", "Five rounds below it, with your saved status."],
      learns: [],
    },
    {
      label: "Order",
      kind: "try",
      title: "Round 1: put the forward pass in order",
      body: (
        <>
          <p>
            Seven cards, shuffled. Click them in the order a prompt flows through the model; click a placed card to send it back. Then
            press Check.
          </p>
          <p>
            Red cards are out of place and come with a hint. After two misses you can ask to see the answer, but only an order you build
            yourself counts.
          </p>
        </>
      ),
      keyIdea: "Text, tokens, embeddings, then n_layer blocks of attention and MLP, then logits, then sample.",
      changed: ["Seven empty slots and a tray of cards.", "When solved, what flows out of each station appears."],
      learns: [0],
    },
    {
      label: "Loop",
      kind: "try",
      title: "Round 2: put one training step in order",
      body: (
        <>
          <p>
            Same game for the loop that trains every weight: get a batch, run the model, compute the loss, clear old gradients,
            backpropagate, update. One card has more than one valid place.
          </p>
          <p>When you solve it, the stage shows the same step as nanoGPT-style PyTorch.</p>
        </>
      ),
      predict: {
        question: "You forget to call optimizer.zero_grad(). What happens?",
        options: [
          "Nothing: PyTorch clears gradients after step()",
          "Gradients add up across steps, so each update uses a growing sum of old gradients",
          "backward() raises an error on the second step",
          "The loss is NaN right away",
        ],
        answer: 1,
        explain: (
          <>
            <code>.grad</code> accumulates by design (that is how gradient accumulation works). Without zeroing, every step adds to the
            previous ones, so updates follow a stale and growing sum, and training goes unstable.
          </>
        ),
      },
      changed: ["Six slots with a loop back to the start.", "When solved, the PyTorch loop appears."],
      learns: [1],
    },
    {
      label: "Shapes",
      kind: "try",
      title: "Round 3: match each arrow to its shape",
      body: (
        <>
          <p>
            Pick a shape, then click the arrow it flows along. Four shapes cover the whole pipeline: <code>(T)</code> token ids,{" "}
            <code>(T, C)</code> vectors, <code>(T, vocab_size)</code> logits, and a scalar loss. Add <code>B</code> in front of each for
            a batch.
          </p>
          <p>One shape appears twice. Ask yourself why the blocks can be stacked at all.</p>
        </>
      ),
      predict: {
        question: "What shape is the gradient of the loss with respect to the token embedding table wte?",
        options: ["(T, C)", "(vocab_size, C), the same as wte", "A scalar", "(T, vocab_size)"],
        answer: 1,
        explain: (
          <>
            Every parameter&apos;s gradient has that parameter&apos;s shape, because <code>optimizer.step()</code> subtracts one from the
            other. For wte, only the rows of tokens that appeared in the batch are non-zero.
          </>
        ),
      },
      changed: ["The pipeline drawn top to bottom.", "Five arrows waiting for a shape."],
      learns: [2],
    },
    {
      label: "Explain",
      kind: "try",
      title: "Round 4: explain every box out loud",
      body: (
        <>
          <p>
            Ten cards, one per station. For each, say out loud what goes in, what it does and what comes out. Then flip it and compare
            with the model answer.
          </p>
          <p>Be strict with yourself. If your version missed the shape or the reason, say it again before moving on.</p>
        </>
      ),
      keyIdea: "An interviewer is listening for three things per box: input, operation, output shape.",
      changed: ["Ten flip cards: forward pass on white, training on violet.", "A check marks every card you have explained."],
      learns: [3],
    },
    {
      label: "Drill",
      kind: "try",
      title: "Round 5: the interview drill",
      body: (
        <>
          <p>
            A random question from the self-checks of all seven days. Answer out loud first, then reveal the model answer and grade
            yourself: got it, shaky or missed.
          </p>
          <p>
            Questions you have not got yet come up first. Grading one <strong>got it</strong> also ticks it on its day page. Do at least
            five.
          </p>
        </>
      ),
      changed: ["One question card at a time.", "A running tally across every day."],
      learns: [4],
    },
    {
      label: "Score",
      kind: "recap",
      title: "Your score, and where to go back",
      body: (
        <>
          <p>
            The stage shows which rounds you have completed and builds a short list of days to revisit from what you missed: unsolved
            rounds, unexplained boxes and shaky drill answers.
          </p>
          <p>
            Then do the real thing on paper, one more time, and compare it with the drawing you made on Day 1. That gap is what the week
            bought you.
          </p>
        </>
      ),
      changed: ["Rounds complete out of five.", "Links to the days that need another pass."],
      learns: [0, 1, 2, 3, 4],
    },
  ],
  Stage,
};

export default lesson;
