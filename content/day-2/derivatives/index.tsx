"use client";

import type { LessonModule } from "@/lib/types";
import { CODE } from "./code";
import { Stage } from "./Stage";

const lesson: LessonModule = {
  rail: [
    { id: "x", label: "x" },
    { id: "f", label: "f(x)" },
    { id: "slope", label: "Slope at x" },
    { id: "d", label: "d = a·b + c" },
    { id: "grad", label: "∂d/∂a, ∂d/∂b, ∂d/∂c" },
  ],
  learn: [
    "Read a derivative as: nudge the input, how much does the output move?",
    "Estimate a slope with (f(x + h) - f(x)) / h and check it against the formula.",
    "Use the sign of a derivative to decide which way to move an input.",
    "Find partial derivatives through × and + by reasoning about nudges.",
    "Say what a gradient is and why training needs one for every weight.",
  ],
  legend: [
    { label: "f(x)", color: "var(--ink)", shape: "line" },
    { label: "negative slope", color: "var(--neg)", shape: "line" },
    { label: "positive slope", color: "var(--pos)", shape: "line" },
    { label: "partial derivative", color: "var(--violet)", shape: "square" },
    { label: "you are here", color: "var(--mark)" },
  ],
  code: { filename: "derivatives.py", source: CODE },
  steps: [
    {
      label: "Nudge",
      kind: "intuition",
      title: "A derivative answers one question",
      body: (
        <>
          <p>
            Take f(x) = 3x² - 4x + 5. At x = 3 it gives 20. Now push x a tiny bit to the right. Does f go up or down,
            and by how much per unit of push?
          </p>
          <p>
            That ratio, output change divided by input change for a vanishingly small push, is the{" "}
            <strong>derivative</strong>. It is the only idea you need for all of backprop.
          </p>
        </>
      ),
      keyIdea: "A derivative is a sensitivity: how much the output moves per unit nudge of the input.",
      code: { ranges: [[1, 3]], caption: "The function we will nudge." },
      rail: { x: "3.0", f: "20.0" },
      learns: [0],
    },
    {
      label: "Rise / run",
      kind: "mechanism",
      title: "Measure it: rise over run",
      body: (
        <>
          <p>
            Nudge by h and divide the change by h. With h = 1 you get (37 - 20) / 1 = 17, too high because the curve
            bends upward. With h = 0.1 you get 14.3, then 14.03, then 14.003.
          </p>
          <p>
            The estimates settle on one number. In code it is three lines, and it works for any function you can
            evaluate, no calculus needed. It is also how people check a backprop implementation.
          </p>
        </>
      ),
      changed: ["Secant lines through x = 3 for h = 1, 0.5 and 0.1.", "A table that shrinks h by 10 each row."],
      code: { ranges: [[5, 8]], caption: "The numerical derivative: nudge, measure, divide." },
      rail: { slope: "≈ 14.003" },
      learns: [1],
    },
    {
      label: "Tangent",
      kind: "mechanism",
      title: "The limit is the slope of the tangent",
      body: (
        <>
          <p>
            As h goes to 0 the secant becomes the tangent, the line that just touches the curve at x = 3. Its slope is
            the derivative, written f&apos;(3).
          </p>
          <p>
            Calculus gives the exact formula, f&apos;(x) = 6x - 4, so f&apos;(3) = 14. The nudge estimate is off by
            exactly 3h = 0.003: the curvature that h = 0.001 still sees.
          </p>
        </>
      ),
      predict: {
        question: "What is the slope of f at x = -1?",
        options: ["14", "-10", "10", "12"],
        answer: 1,
        explain:
          "f'(-1) = 6 × (-1) - 4 = -10. It is negative: at x = -1, moving right makes f go down. (12 is f(-1), the height, not the slope.) Check it with the slider on the next step.",
      },
      code: { ranges: [[8, 8]], caption: "14.003 from the nudge against 14 from the formula." },
      rail: { slope: "14 exactly" },
      learns: [0],
    },
    {
      label: "Slide x",
      kind: "try",
      title: "Try it: slide x along the curve",
      body: (
        <>
          <p>
            Drag x. The tangent turns ultramarine where the slope is negative and saffron where it is positive. The
            nudge estimate and the exact 6x - 4 agree everywhere, always off by 3h = 0.003.
          </p>
          <p>
            Go to x = -1 to check your prediction. Then find where the slope is zero: x = 2/3 ≈ 0.67, the bottom of the
            bowl, where f = 3.67.
          </p>
        </>
      ),
      changed: ["Live: the tangent, f(x), the nudge slope and the exact slope."],
      code: { ranges: [[5, 8]], caption: "The same three lines, run at whatever x you pick." },
      rail: { x: "slider", f: "live", slope: "live" },
      learns: [1],
    },
    {
      label: "Downhill",
      kind: "insight",
      title: "The sign tells you which way is down",
      body: (
        <>
          <p>
            Where the slope is negative, increasing x lowers f. Where it is positive, decreasing x lowers f. Either way:
            step against the slope, and take bigger steps where it is steeper.
          </p>
          <p>
            x ← x - lr × slope. From x = 3 with a learning rate of 0.01, x becomes 3 - 0.14 = 2.86 and f drops from 20 to
            18.10. Repeat and you slide to the bottom. That is gradient descent in one dimension.
          </p>
        </>
      ),
      keyIdea: "To decrease a function, move each input a small step against its derivative.",
      rail: { x: "3 → 2.86", f: "20 → 18.10", slope: "14" },
      learns: [2],
    },
    {
      label: "Three inputs",
      kind: "mechanism",
      title: "More than one input",
      body: (
        <>
          <p>
            Now d = a × b + c with a = 2, b = -3 and c = 10. As a graph: a and b go into ×, giving e = -6; e and c go
            into +, giving d = 4.
          </p>
          <p>
            Every neural network is a graph like this, only bigger. With several inputs we ask the derivative question
            once per input: nudge one, hold the rest still. That is a <strong>partial derivative</strong>, written
            ∂d/∂a.
          </p>
        </>
      ),
      predict: {
        question: "Nudge a from 2 to 2.001 and keep b and c fixed. What happens to d?",
        options: ["It goes up by 0.002", "It goes down by 0.003", "It goes up by 0.001", "It does not change"],
        answer: 1,
        explain:
          "d = 2.001 × (-3) + 10 = 3.997, so d falls by 0.003. Divided by h = 0.001 that is a slope of -3, which is exactly the value of b.",
      },
      code: { ranges: [[11, 12]], caption: "Three inputs, one output." },
      rail: { d: "4.0" },
      learns: [3],
    },
    {
      label: "Partials",
      kind: "mechanism",
      title: "One partial derivative per input",
      body: (
        <>
          <p>
            Nudging each input in turn: ∂d/∂a = -3, ∂d/∂b = 2, ∂d/∂c = 1. Look at what they equal. In a × b, the slope
            for a is b and the slope for b is a. In e + c, nudging c by h moves d by exactly h.
          </p>
          <p>
            Each partial is a sensitivity with a direction: d is three times as sensitive to a as to c, and moves the
            opposite way. These local rules are all backprop needs.
          </p>
        </>
      ),
      keyIdea: "For a × b: ∂/∂a = b and ∂/∂b = a. For a + b: both partials are 1.",
      changed: ["Violet pills: the partial derivative of d for each input."],
      code: { ranges: [[12, 18]], caption: "One nudge per input, the others held still." },
      rail: { grad: "-3, 2, 1" },
      learns: [3],
    },
    {
      label: "Try a, b",
      kind: "try",
      title: "Try it: change a and b",
      body: (
        <>
          <p>
            Drag a and b. The value of d updates, and so do the partials: ∂d/∂a always equals the current b, and ∂d/∂b
            the current a.
          </p>
          <p>
            So a derivative is not a fixed property of the graph. It depends on the values flowing through it right
            now. That is why backprop always runs after a forward pass.
          </p>
        </>
      ),
      predict: {
        question: "Set b to 0. What is ∂d/∂a now?",
        options: ["0", "1", "2", "-3"],
        answer: 0,
        explain:
          "∂d/∂a = b, so it is 0. When b is zero, a × b is zero whatever a is, so nudging a does nothing. In a network, a weight that multiplies a zero input gets no gradient from that example.",
      },
      code: { ranges: [[11, 18]], caption: "Run these with your own a and b." },
      rail: { d: "live", grad: "b, a, 1" },
      learns: [3],
    },
    {
      label: "The loss",
      kind: "insight",
      title: "Why we care: the loss depends on every weight",
      body: (
        <>
          <p>
            In a network, the inputs you can change are the weights, and the output you care about is the{" "}
            <strong>loss</strong>: one number for how wrong the model is. GPT-2 small has 124 million weights, so the
            loss has 124 million partial derivatives.
          </p>
          <p>
            Together they form the <strong>gradient</strong>, with the same shape as the weights. Nudging weights one at
            a time would cost 124 million extra forward passes per update. Backprop gets every partial from one forward
            and one backward pass. That is the next lesson.
          </p>
        </>
      ),
      keyIdea: "The gradient is ∂loss/∂w for every weight. Training moves every weight against its own partial.",
      code: { ranges: [[21, 40]], caption: "A Value remembers its inputs and its operation, so we can walk the graph backwards." },
      learns: [4],
    },
    {
      label: "Recap",
      kind: "recap",
      title: "Recap",
      body: (
        <>
          <p>
            A derivative is a nudge ratio: (f(x + h) - f(x)) / h as h shrinks. Its sign says which way the output moves,
            its size says how sensitive it is. Step against it to go downhill.
          </p>
          <p>
            With many inputs you get one partial each. For × the partial is the other input; for + it is 1. All the
            partials of the loss together are the gradient.
          </p>
        </>
      ),
      learns: [0, 1, 2, 3, 4],
    },
  ],
  Stage,
};

export default lesson;
