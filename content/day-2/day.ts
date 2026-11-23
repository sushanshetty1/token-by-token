import type { DayContent } from "@/lib/types";

const day: DayContent = {
  n: 2,
  title: "How networks learn",
  tagline: "Build intuition for gradients by watching them flow backwards through a tiny graph.",
  outcome: "You can explain backward() for one operation out loud, and say exactly what one training step does.",
  stations: ["loss", "backprop", "update"],
  schedule: [
    { label: "Lessons in this app", minutes: 35 },
    { label: "micrograd lecture, focus parts at 1.5x", minutes: 75 },
    { label: "Have AI write micrograd, you explain it", minutes: 30 },
    { label: "Self-check", minutes: 15 },
  ],
  lessons: [
    { slug: "derivatives", title: "Derivatives on a graph", promise: "Read a derivative as 'if I nudge this input, how much does the output move'.", minutes: 10, level: "Beginner" },
    { slug: "backprop", title: "Backprop, node by node", promise: "Push gradients backwards through +, * and tanh with the chain rule.", minutes: 14, level: "Core" },
    { slug: "training-loop", title: "The training loop", promise: "See forward, loss, backward and update repeat until the loss falls.", minutes: 12, level: "Core" },
  ],
  watch: [
    {
      kind: "video",
      title: "The spelled-out intro to neural networks and backpropagation: building micrograd",
      by: "Andrej Karpathy",
      url: "https://www.youtube.com/watch?v=VMj-3S1tku0",
      minutes: 145,
      why: "The clearest explanation of backprop that exists. Everything later is this, at scale.",
      chapters: [
        { at: "0:00", title: "micrograd overview", pace: "watch" },
        { at: "8:08", title: "Derivative of a simple function, then with multiple inputs", pace: "watch" },
        { at: "19:09", title: "The Value object", pace: "skim" },
        { at: "32:10", title: "Manual backprop, example 1", pace: "watch" },
        { at: "52:52", title: "Manual backprop through a neuron", pace: "watch" },
        { at: "1:09:02", title: "backward() for each operation, topological sort", pace: "watch" },
        { at: "1:22:28", title: "The bug when a node is used twice (+=)", pace: "watch" },
        { at: "1:27:05", title: "Breaking up tanh, the same in PyTorch", pace: "skim" },
        { at: "1:43:55", title: "MLP, dataset, loss, gradient descent", pace: "watch" },
        { at: "2:14:03", title: "Summary and walkthrough of the repo", pace: "skim" },
      ],
    },
    {
      kind: "code",
      title: "karpathy/micrograd",
      by: "GitHub",
      url: "https://github.com/karpathy/micrograd",
      why: "About 150 lines. engine.py is the part to own.",
    },
  ],
  build: [
    "Have AI write a Value class with +, *, tanh and backward(). Read every line before running it.",
    "Explain backward() for multiplication out loud: why does a.grad get b.data * out.grad?",
    "Train a 2-layer MLP on 4 points and watch the loss go down. Then set the learning rate to 10 and watch it explode.",
  ],
  aiPrompts: [
    "Write a micrograd-style Value class in Python with __add__, __mul__, tanh and backward() using a topological sort, in under 60 lines. Then walk me through backward() for L = (a*b + c) * f with a=2, b=-3, c=10, f=-2, showing every grad as it is filled in.",
    "Here is my explanation of why _backward uses += instead of =: <paste yours>. Point out anything wrong or missing, then show me a three-line example where = gives a silently wrong gradient.",
    "Using my Value class, build a 3-4-4-1 MLP and train it on xs = [[2,3,-1],[3,-1,0.5],[0.5,1,1],[1,1,-1]], ys = [1,-1,-1,1] with mean squared error, printing the loss every 10 steps. Then write the same loop in PyTorch and check that both give the same gradients on the first step.",
  ],
  experiments: [
    {
      title: "Check backward with nudges",
      predict: "For h = 0.001, how close will (L(a + h) - L(a)) / h be to a.grad if your backward is correct?",
      how: "In your micrograd, compute L and call L.backward(). Then rebuild the graph with a.data + 0.001, recompute L, and compare the slope with a.grad. Repeat for every leaf.",
      expect:
        "They agree to about three decimal places, and exactly when L depends on that leaf linearly. A bigger mismatch means one of your _backward functions is wrong, and checking leaf by leaf tells you which.",
    },
    {
      title: "Break the learning rate",
      predict: "Your MLP trains smoothly at lr = 0.05. What will the loss do at lr = 1, and at lr = 10?",
      how: "Train the same network from the same seed at lr = 0.05, 0.5, 1 and 10. Print the loss every 10 steps for each.",
      expect:
        "Small rates fall slowly and steadily. Larger ones fall faster but bumpier. At 10 each step overshoots by more than it gains, so the loss jumps around or blows up to inf or nan.",
    },
    {
      title: "Forget zero_grad",
      predict: "Delete the line that resets the gradients. Will the loss still go down?",
      how: "Comment out the p.grad reset (or optimizer.zero_grad()) and train for 100 steps, printing the loss and one weight's .grad every 10 steps. Then put it back and compare.",
      expect:
        "The loss may fall at first, then it overshoots and bounces instead of settling. The printed .grad stops shrinking as the loss falls, because it is now a running sum of every step's gradient.",
    },
  ],
  checks: [
    {
      q: "What is a derivative, in words an engineer would use?",
      a: "It is the sensitivity of an output to an input: nudge the input by a tiny h and the output moves by about derivative × h. The sign says which way the output moves and the size says how strongly. You can estimate it numerically with (f(x + h) - f(x)) / h for a small h, which is also how you test a backward implementation.",
    },
    {
      q: "State the chain rule the way backprop uses it.",
      a: "The gradient of the loss with respect to a node's input is the node's local derivative times the gradient flowing into the node from above: dL/dx = dL/dout × dout/dx. Each node only needs its own local derivative, and multiplying by the upstream gradient carries the effect all the way back to the leaves. If a value feeds several nodes, the contributions from all paths are summed.",
    },
    {
      q: "Walk me through backward() for out = a * b and for out = a + b.",
      a: "For multiplication, a.grad += b.data × out.grad and b.grad += a.data × out.grad: each input receives the other input times the upstream gradient. For addition, a.grad += out.grad and b.grad += out.grad, because the local derivative of a sum is 1 for each input. So + routes the gradient through unchanged, and × scales it by the other operand.",
    },
    {
      q: "Why does backward() use += instead of =?",
      a: "A value can be used more than once, and by the multivariable chain rule its gradient is the sum over every path to the output. With =, a later write overwrites an earlier one: for b = a + a you get a.grad = 1 instead of 2, with no error raised. Accumulating with += is correct, and it is also why gradients must be reset to zero before each new backward pass.",
    },
    {
      q: "Why does backward() need a topological sort?",
      a: "A node may only pass its gradient on once its own gradient is complete, meaning every node that uses it has already added its share. A topological order lists each node after all of its inputs, so walking it in reverse visits each node after everything downstream of it. Without that order a node could propagate a partial gradient, for example 0.",
    },
    {
      q: "What does one step of gradient descent do, and what does the learning rate control?",
      a: "It computes the gradient of the loss with respect to every parameter, then moves each parameter a small step against its own gradient: p ← p - lr × grad. The learning rate is the step size. Too small and training crawls; too large and steps overshoot the minimum, so the loss bounces or diverges. On the bowl L = (w - 2)², for example, any lr above 1 diverges.",
    },
    {
      q: "What happens if you forget optimizer.zero_grad()?",
      a: "PyTorch adds new gradients into .grad on every backward call, so each update uses the sum of all gradients so far instead of the current one. The effective step keeps growing while heading downhill and keeps pushing even when the current gradient is near zero, so training overshoots, oscillates or diverges, silently. The accumulation is deliberate: it lets you sum gradients over several micro-batches before one update.",
    },
    {
      q: "Why can tanh cause vanishing gradients?",
      a: "The local derivative of tanh is 1 - tanh(x)², which is at most 1 and close to 0 when |x| is large and the unit saturates near ±1. Backprop multiplies local derivatives along the path, so after several saturated layers the gradient reaching early weights is tiny and they barely learn. Careful initialization, normalization layers, residual connections and activations like ReLU or GELU all help.",
    },
  ],
  explainOutLoud: [
    "A derivative tells me how much the output moves when I nudge one input, and in which direction.",
    "Backprop is the chain rule applied node by node from the output: each input's gradient is its local derivative times the upstream gradient.",
    "At a times node each input gets the other input times out.grad; at a plus node each input gets out.grad unchanged.",
    "Gradients accumulate with += because a value used twice gets a contribution from each use, which is why we zero them before every backward pass.",
    "One training step is forward, loss, zero_grad, backward, update, and training a GPT is the same loop with far more parameters.",
  ],
};

export default day;
