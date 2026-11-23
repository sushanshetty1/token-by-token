"use client";

import type { LessonModule } from "@/lib/types";
import { CODE } from "./code";
import { Stage } from "./Stage";

const lesson: LessonModule = {
  rail: [
    { id: "step", label: "Training step" },
    { id: "loss", label: "Loss" },
    { id: "lr", label: "Learning rate" },
    { id: "phase", label: "Phase" },
  ],
  learn: [
    "Name the ingredients of training: data, a model, and its parameters.",
    "Compute a mean squared error loss by hand.",
    "Say what zero_grad, backward and the update each do.",
    "Read a loss curve and explain why it falls.",
    "Explain what too small and too large learning rates do.",
    "Explain what goes wrong when you forget zero_grad.",
  ],
  legend: [
    { label: "positive weight", color: "var(--pos)", shape: "line" },
    { label: "negative weight", color: "var(--neg)", shape: "line" },
    { label: "prediction", color: "var(--accent)" },
    { label: "target", color: "var(--ink)", shape: "square" },
    { label: "error", color: "var(--bad)", shape: "line" },
    { label: "loss", color: "var(--mark)", shape: "line" },
  ],
  code: {
    filename: "train.py",
    source: CODE,
    note: "The stage trains this same 3-4-4-1 network in your browser from its own seeded start, so its numbers differ slightly from a PyTorch run.",
  },
  steps: [
    {
      label: "Setup",
      kind: "intuition",
      title: "A tiny network and four examples",
      body: (
        <>
          <p>
            Four examples, each 3 numbers, each with a target of +1 or -1. The model is a small MLP: 3 inputs, two
            hidden layers of 4 tanh neurons, 1 output. That is 41 parameters: 12 + 4 in layer 1, 16 + 4 in layer 2, 4 +
            1 at the output.
          </p>
          <p>
            Training means finding 41 numbers that make the outputs match the targets. The stage trains this exact
            network in your browser, from a seeded random start.
          </p>
        </>
      ),
      code: { ranges: [[4, 17]], caption: "Data, a model, its parameters and a learning rate." },
      rail: { step: "0", loss: "not yet", lr: "0.1", phase: "setup" },
      learns: [0],
    },
    {
      label: "Forward",
      kind: "mechanism",
      title: "1. Forward: make predictions",
      body: (
        <>
          <p>
            Run all 4 examples through the network. <code>ypred = model(xs)</code> gives one number per example, shape
            (4,): right now 0.13, 0.18, -0.08 and 0.08.
          </p>
          <p>
            The diamonds are the targets. Every guess is near 0, because small random weights give small outputs, and
            example 2 is on the wrong side entirely.
          </p>
        </>
      ),
      predict: {
        question: "The targets are +1, -1, -1, +1. If all four predictions were exactly 0, what would the mean squared error be?",
        options: ["0", "0.5", "1.0", "4.0"],
        answer: 2,
        explain:
          "Each squared error is (0 - (±1))² = 1, and the mean of four 1s is 1.0. (4.0 is the sum, which the micrograd lecture uses; the mean only rescales it.) The real starting loss, 0.962, is close to 1 because the real predictions are close to 0.",
      },
      code: { ranges: [[20, 20]], caption: "Forward: (4, 3) inputs in, (4,) predictions out." },
      rail: { phase: "forward" },
      learns: [1],
    },
    {
      label: "Loss",
      kind: "mechanism",
      title: "2. Loss: one number for how wrong",
      body: (
        <>
          <p>
            Square each error and take the mean: (0.13 - 1)², (0.18 + 1)², (-0.08 + 1)² and (0.08 - 1)² average to
            0.962. Squaring makes every miss positive and punishes big misses most: example 2&apos;s miss of 1.18 adds
            1.39 on its own.
          </p>
          <p>
            The loss is the one number training pushes down. Every parameter gets judged by a single question: if you
            nudge me, does the loss go down?
          </p>
        </>
      ),
      keyIdea: "The loss turns 'how wrong is the model' into one number, so it has a gradient.",
      code: { ranges: [[21, 21]], caption: "Mean squared error: one scalar." },
      rail: { loss: "0.962", phase: "loss" },
      learns: [1],
    },
    {
      label: "Backward",
      kind: "mechanism",
      title: "3 and 4. zero_grad, then backward",
      body: (
        <>
          <p>
            First reset every <code>.grad</code> to zero. Then <code>loss.backward()</code> runs the backprop you just
            learned through every +, × and tanh, and fills in all 41 gradients, ∂loss/∂p.
          </p>
          <p>
            Each cell is one gradient. Saffron means raising that parameter would raise the loss; ultramarine means it
            would lower it. The biggest here is -0.35, on a weight in the second layer.
          </p>
        </>
      ),
      predict: {
        question: "Suppose you delete the zero_grad lines. What happens over many steps?",
        options: [
          "Nothing: backward overwrites .grad anyway",
          "Training stops, because gradients stay at 0",
          "Gradients pile up across steps, so updates grow and overshoot",
          "PyTorch raises an error",
        ],
        answer: 2,
        explain:
          "backward adds into .grad (the += from the last lesson). Without a reset, step t uses the sum of every gradient so far, so the updates keep growing and keep pushing even when the current gradient is near 0. You will see the damage in step 9.",
      },
      code: { ranges: [[22, 24]], caption: "Clear the old gradients, then compute fresh ones." },
      rail: { phase: "zero_grad, backward" },
      learns: [2],
    },
    {
      label: "Update",
      kind: "mechanism",
      title: "5. Update: a small step against the gradient",
      body: (
        <>
          <p>
            Every parameter moves a little against its own gradient: <code>p.data -= lr * p.grad</code> with lr = 0.1.
            The highlighted weight had gradient -0.3506, so it rises from 0.1866 to 0.2217.
          </p>
          <p>
            One step later the loss is 0.911, down from 0.962. That is the whole algorithm: gradient descent. Training a
            large model is this step, done at scale, stably, billions of times over.
          </p>
        </>
      ),
      keyIdea: "Gradient descent: p ← p - lr × ∂loss/∂p, for every parameter at once.",
      code: { ranges: [[25, 26]], caption: "The update. .data skips autograd, so this step is not itself tracked." },
      rail: { step: "1", loss: "0.962 → 0.911", phase: "update" },
      learns: [2],
    },
    {
      label: "Repeat",
      kind: "mechanism",
      title: "Repeat: 100 steps",
      body: (
        <>
          <p>
            Run the five lines 100 times. The loss falls slowly at first (0.289 after 10 steps), then fast (0.006 after
            20), then creeps to 0.001. The predictions slide onto the targets and the edges recolor as the weights
            move.
          </p>
          <p>
            Nothing new happens on any single step. The network learns because each update is a small move downhill on
            the loss, aimed by the chain rule.
          </p>
        </>
      ),
      changed: ["Live: 100 real training steps.", "The loss curve draws itself as it goes."],
      code: { ranges: [[19, 26]], caption: "The training loop, all five parts." },
      rail: { step: "1 → 100", loss: "0.962 → 0.001", phase: "all five, repeated" },
      learns: [3],
    },
    {
      label: "Bowl",
      kind: "intuition",
      title: "The learning rate is a step size",
      body: (
        <>
          <p>
            Picture one weight and a loss shaped like a bowl, L(w) = (w - 2)². The gradient is the slope, 2(w - 2).
            From w = -1 the slope is -6, so with lr = 0.1 the step is +0.6.
          </p>
          <p>
            Near the bottom the slope flattens, so steps shrink on their own. The learning rate decides how far you
            trust the slope: too small and you crawl, too big and you jump past the bottom.
          </p>
        </>
      ),
      predict: {
        question: "On this bowl, what happens with lr = 1.05?",
        options: [
          "It converges faster than at 0.1",
          "Each step overshoots further and w runs off to infinity",
          "It stops after one step",
          "It settles in a different minimum",
        ],
        answer: 1,
        explain:
          "Each step multiplies the distance to the minimum by (1 - 2 × lr) = -1.1: the sign flips (an overshoot) and the size grows 10% per step, so w diverges. Anything above lr = 1 diverges on this bowl, and exactly 0.5 lands on the bottom in one step.",
      },
      code: { ranges: [[26, 26]], caption: "lr scales every step." },
      rail: { lr: "0.1", phase: "update" },
      learns: [4],
    },
    {
      label: "Try lr",
      kind: "try",
      title: "Try it: the learning rate",
      body: (
        <>
          <p>
            Drag the learning rate and watch 20 steps from w = -1. Below about 0.05 it crawls. Up to 0.5 it glides in,
            at exactly 0.5 it lands in one step, from 0.5 to 1 it zigzags in, and above 1 it explodes.
          </p>
          <p>
            Real losses curve differently in millions of directions, so no single lr suits them all. That is one reason
            optimizers like Adam scale the step per parameter, and why training schedules warm the rate up, then decay
            it.
          </p>
        </>
      ),
      changed: ["Live: the path of the ball and the loss at each step."],
      code: {
        ranges: [
          [17, 17],
          [26, 26],
        ],
        caption: "One number, lr, controls every step.",
      },
      rail: { lr: "your choice" },
      learns: [4],
    },
    {
      label: "No zero_grad",
      kind: "problem",
      title: "The bug: forgetting zero_grad",
      body: (
        <>
          <p>
            Same network, same lr, no reset. Each backward adds into <code>.grad</code>, so step t moves by lr × (g1 + …
            + gt). The loss reaches 0.03 at step 6, jumps back to 0.38, and never settles: over the last 50 steps it
            bounces between 0.01 and 0.18.
          </p>
          <p>
            On the bowl the bug is plain: the summed gradient acts like momentum with no friction, so w swings between
            -1 and 5 forever. No error is raised, the model just trains badly. That is why every loop calls{" "}
            <code>optimizer.zero_grad()</code> or sets <code>p.grad = None</code>.
          </p>
        </>
      ),
      keyIdea: "Gradients accumulate by design. Reset them before every backward pass.",
      code: { ranges: [[22, 23]], caption: "The two lines this bug deletes." },
      rail: { step: "100", loss: "bounces", lr: "0.1", phase: "zero_grad missing" },
      learns: [5],
    },
    {
      label: "Recap",
      kind: "recap",
      title: "Recap: the same loop trains GPT",
      body: (
        <>
          <p>
            Forward, loss, zero_grad, backward, update. You watched it fit 41 parameters to 4 examples. Training GPT-2
            small is the same loop with 124 million parameters, batches of tokens instead of 4 examples, cross-entropy
            on the next token instead of squared error, and AdamW instead of plain SGD.
          </p>
          <p>When you train your own GPT on Day 5, you will write these lines again and recognise every one.</p>
        </>
      ),
      code: { ranges: [[28, 34]], caption: "The idiomatic version. Swap SGD for AdamW and this is how GPTs train." },
      learns: [0, 1, 2, 3, 4, 5],
    },
  ],
  Stage,
};

export default lesson;
