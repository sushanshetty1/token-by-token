"use client";

import type { LessonModule } from "@/lib/types";
import { CODE } from "./code";
import { Stage } from "./Stage";

const lesson: LessonModule = {
  rail: [
    { id: "L", label: "Output" },
    { id: "node", label: "Backward at" },
    { id: "rule", label: "Rule" },
    { id: "grads", label: "Leaf grads" },
  ],
  learn: [
    "Run a forward pass on an expression graph and say what each grad means.",
    "Apply the backward rules for × and + by hand.",
    "State the chain rule as local derivative times upstream gradient.",
    "Backprop through tanh, and spot when a gradient becomes 0.",
    "Explain why gradients accumulate with += when a value is used twice.",
    "Explain why backward walks the graph in reverse topological order.",
  ],
  legend: [
    { label: "forward value", color: "var(--accent)" },
    { label: "gradient, flowing backwards", color: "var(--violet)" },
    { label: "node being processed", color: "var(--mark)" },
    { label: "wrong", color: "var(--bad)", shape: "square" },
    { label: "right", color: "var(--ok)", shape: "square" },
  ],
  code: { filename: "engine.py", source: CODE },
  steps: [
    {
      label: "Forward",
      kind: "intuition",
      title: "Start with a forward pass",
      body: (
        <>
          <p>
            Here is a slightly bigger expression: L = (a × b + c) × f, with a = 2, b = -3, c = 10 and f = -2. The
            forward pass computes left to right: e = -6, d = 4, L = -8.
          </p>
          <p>
            Each node also has a <code>grad</code> slot: how much L moves per nudge of that node, ∂L/∂node. You could
            nudge every input one at a time. Backprop fills every slot in one sweep, right to left.
          </p>
        </>
      ),
      changed: ["Forward values flow left to right along the edges.", "Every grad starts unknown."],
      code: { ranges: [[48, 51]], caption: "Build the graph. Each Value remembers its inputs and its operation." },
      rail: { L: "L = -8.0", node: "not yet", rule: "forward", grads: "?, ?, ?, ?" },
      learns: [0],
    },
    {
      label: "Seed",
      kind: "mechanism",
      title: "Seed the output with 1",
      body: (
        <>
          <p>
            The sweep starts at the end. L.grad = ∂L/∂L = 1: nudge L by h and L moves by h. Every other grad starts at
            0.
          </p>
          <p>
            From here, each node passes gradient to its inputs using only two things: its own local rule, and the
            gradient it received from above, called the <strong>upstream gradient</strong>.
          </p>
        </>
      ),
      code: { ranges: [[44, 44]], caption: "backward() seeds the output before walking the graph." },
      rail: { node: "L", rule: "dL/dL = 1" },
      learns: [0],
    },
    {
      label: "× rule",
      kind: "mechanism",
      title: "The × rule: each input gets the other input",
      body: (
        <>
          <p>
            L = d × f. From the last lesson, ∂L/∂d = f and ∂L/∂f = d. Multiply each by the upstream gradient, L.grad = 1:
            d.grad = -2 × 1 = -2 and f.grad = 4 × 1 = 4.
          </p>
          <p>
            Read it as: nudge d by h and L moves by -2h; nudge f by h and L moves by 4h. Note the swap: d&apos;s
            gradient uses f&apos;s data, and f&apos;s uses d&apos;s.
          </p>
        </>
      ),
      predict: {
        question: "Next comes d = e + c, and d.grad is -2. What is c.grad?",
        options: ["-2", "1", "10", "-20"],
        answer: 0,
        explain:
          "+ has local derivative 1 for both inputs, so it passes the upstream gradient through unchanged: c.grad = 1 × (-2) = -2, and e.grad = -2 too. Nudge c by h, d moves by h, and L moves by -2h.",
      },
      code: { ranges: [[22, 23]], caption: "self.grad gets other.data × out.grad, and the other way round." },
      rail: { node: "L = d × f", rule: "× swaps", grads: "?, ?, ?, 4.0" },
      learns: [1],
    },
    {
      label: "+ rule",
      kind: "mechanism",
      title: "The + rule: pass it straight through",
      body: (
        <>
          <p>
            d = e + c. Both local derivatives are 1, so e.grad = c.grad = 1 × d.grad = -2. Addition copies the upstream
            gradient to every input, unchanged.
          </p>
          <p>
            Remember this one. It is why residual connections (Day 5) help deep networks train: a + node hands the
            gradient straight back to earlier layers without shrinking it.
          </p>
        </>
      ),
      predict: {
        question: "Next comes e = a × b, and e.grad is -2. What is a.grad?",
        options: ["-3", "6", "-6", "2"],
        answer: 1,
        explain:
          "The × rule: a.grad = b.data × e.grad = (-3) × (-2) = 6. Check by nudging: a up by 0.001 makes e fall by 0.003, d fall by 0.003, and L = d × f rise by 0.006.",
      },
      code: { ranges: [[14, 15]], caption: "+ multiplies the upstream gradient by 1.0 for both inputs." },
      rail: { node: "d = e + c", rule: "+ copies", grads: "?, ?, -2.0, 4.0" },
      learns: [1],
    },
    {
      label: "Chain rule",
      kind: "mechanism",
      title: "The chain rule, one node at a time",
      body: (
        <>
          <p>
            e = a × b. Its upstream gradient e.grad = -2 says how much L cares about e. The local derivative ∂e/∂a = b =
            -3 says how much e cares about a. Multiply: a.grad = (-3) × (-2) = 6. Likewise b.grad = 2 × (-2) = -4.
          </p>
          <p>
            That is the whole chain rule: ∂L/∂a = ∂L/∂e × ∂e/∂a. No node needs to see the whole graph. Each one applies
            its local rule to the gradient it was handed.
          </p>
        </>
      ),
      keyIdea: "Input grad = local derivative × upstream gradient (out.grad). That is the chain rule.",
      code: { ranges: [[22, 23]], caption: "other.data is the local derivative, out.grad the upstream gradient." },
      rail: { node: "e = a × b", rule: "local × upstream", grads: "6.0, -4.0, -2.0, 4.0" },
      learns: [1, 2],
    },
    {
      label: "Try it",
      kind: "try",
      title: "Try it: change the inputs",
      body: (
        <>
          <p>
            Drag a and f. The forward values and every gradient update together: a.grad is always b × f, c.grad is
            always f. Set f to 0 and every gradient except f&apos;s drops to 0, because they all flow through f.
          </p>
          <p>
            The card nudges a by 0.01 and reruns the forward pass. The change in L matches a.grad × 0.01. That is a{" "}
            <strong>gradient check</strong>, the standard test for a backward implementation.
          </p>
        </>
      ),
      changed: ["Live: every data and grad value.", "Live: the numerical check for a.grad."],
      code: { ranges: [[48, 53]], caption: "Same graph, your numbers." },
      rail: { node: "live", rule: "all three", grads: "live" },
      learns: [2],
    },
    {
      label: "Neuron",
      kind: "mechanism",
      title: "A neuron, and the tanh rule",
      body: (
        <>
          <p>
            A real neuron: o = tanh(x1·w1 + x2·w2 + b), with x1 = 2, w1 = -3, x2 = 0, w2 = 1 and b = 6.8814 (chosen so
            the numbers come out round). Forward: n = 0.8814, o = 0.7071.
          </p>
          <p>
            tanh&apos;s local derivative is 1 - tanh(n)² = 1 - o² = 0.5, so n.grad = 0.5. The + nodes copy 0.5 back, and
            the × nodes swap: w1.grad = x1 × 0.5 = 1.0 and x1.grad = w1 × 0.5 = -1.5. Since x2 = 0, w2.grad = 0.
          </p>
        </>
      ),
      keyIdea: "d tanh(n)/dn = 1 - tanh(n)². When |n| is large that is close to 0 and the gradient vanishes.",
      changed: ["New graph: one neuron.", "Gradients arrive in waves from right to left."],
      code: { ranges: [[27, 33]], caption: "Line 31: local derivative 1 - t², times the upstream gradient." },
      rail: { L: "o = 0.7071", node: "tanh", rule: "1 - t²", grads: "-1.5, 1.0, 0.5, 0.0" },
      learns: [3],
    },
    {
      label: "Used twice",
      kind: "problem",
      title: "A bug: one value, two uses",
      body: (
        <>
          <p>
            Take b = a + a with a = 3. Then b = 6, and since b = 2a, the true db/da is 2. In backward, __add__ writes
            to <code>self.grad</code> and <code>other.grad</code>, and here self and other are the same object: a.
          </p>
          <p>Suppose the first draft assigned with = instead of adding with +=. Follow what each line writes.</p>
        </>
      ),
      predict: {
        question: "With = in _backward, what is a.grad after b.backward()?",
        options: ["2.0, it works anyway", "1.0", "0.0", "It raises an error"],
        answer: 1,
        explain:
          "Both lines write a.grad = 1.0 × b.grad = 1.0. The second overwrites the first, so a.grad ends at 1.0 instead of 2. Nothing crashes: the gradient is silently wrong.",
      },
      code: { ranges: [[13, 15]], caption: "With a + a, these two lines hit the same .grad." },
      rail: { L: "b = 6.0", node: "b = a + a", rule: "?", grads: "a.grad ?" },
      learns: [4],
    },
    {
      label: "+=",
      kind: "insight",
      title: "Gradients accumulate: always +=",
      body: (
        <>
          <p>
            When a value feeds several places, the output depends on it through each path, and the multivariable chain
            rule says the contributions add. So every _backward adds into <code>.grad</code> with +=.
          </p>
          <p>
            In real networks this is everywhere: an input feeds every neuron of the next layer, and a weight is reused
            at every position of a sequence. The flip side: since grads accumulate, they must be reset to 0 before each
            new backward pass. That is zero_grad, in the next lesson.
          </p>
        </>
      ),
      keyIdea: "A value used in several places gets the sum of the gradients from every use.",
      code: {
        ranges: [
          [14, 15],
          [22, 23],
          [31, 31],
        ],
        caption: "Every gradient line uses +=.",
      },
      rail: { rule: "+= sums paths", grads: "a.grad 2.0" },
      learns: [4],
    },
    {
      label: "Order",
      kind: "mechanism",
      title: "Topological order: the output first",
      body: (
        <>
          <p>
            A node may run its _backward only once its own grad is complete, meaning every node that uses it has
            already added its share. build_topo is a depth-first search that appends a node after all of its inputs, so
            in topo every arrow points right.
          </p>
          <p>
            reversed(topo) visits L, f, d, c, e, b, a: each node after everything downstream of it. One sort, one sweep.
            The backward pass costs a small multiple of the forward pass (about 2x), however many weights there are.
          </p>
        </>
      ),
      keyIdea: "Backprop: sort the graph topologically, seed the output with 1, call _backward in reverse order.",
      code: { ranges: [[35, 46]], caption: "build_topo, then one loop over reversed(topo)." },
      rail: { L: "L = -8.0", node: "reversed(topo)", rule: "outputs first", grads: "6.0, -4.0, -2.0, 4.0" },
      learns: [5],
    },
    {
      label: "Recap",
      kind: "recap",
      title: "Recap",
      body: (
        <>
          <p>
            Backprop is three local rules plus bookkeeping. ×: each input gets the other input&apos;s data times
            out.grad. +: each input gets out.grad. tanh: the input gets (1 - t²) times out.grad.
          </p>
          <p>
            The bookkeeping: seed the output with 1, walk in reversed topological order, always +=. PyTorch&apos;s{" "}
            <code>loss.backward()</code> does exactly this, over millions of nodes.
          </p>
        </>
      ),
      code: { ranges: [[52, 53]], caption: "One call fills every grad." },
      learns: [0, 1, 2, 3, 4, 5],
    },
  ],
  Stage,
};

export default lesson;
