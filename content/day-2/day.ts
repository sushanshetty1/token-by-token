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
  aiPrompts: [],
  experiments: [],
  checks: [],
  explainOutLoud: [],
};

export default day;
