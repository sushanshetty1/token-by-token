import type { DayContent } from "@/lib/types";

const day: DayContent = {
  n: 5,
  title: "The block, and training it",
  tagline: "Wrap attention into a transformer block, stack it, and train a real small GPT.",
  outcome: "You have trained a small GPT, broken it on purpose, and can explain residuals and LayerNorm.",
  stations: ["attention", "mlp", "logits", "loss", "backprop", "update"],
  schedule: [
    { label: "Lessons and the in-browser lab", minutes: 45 },
    { label: "Let's build GPT, 1:24:25 to the end", minutes: 35 },
    { label: "Train gpt.py on Colab or Kaggle", minutes: 50 },
    { label: "Break it on purpose, write notes", minutes: 30 },
    { label: "Self-check", minutes: 10 },
  ],
  lessons: [
    { slug: "block", title: "Anatomy of a block", promise: "LayerNorm, attention, MLP and the residual stream, and why each one is there.", minutes: 12, level: "Core" },
    { slug: "train-lab", title: "Train a tiny GPT", promise: "Train a real transformer in your browser and watch the loss fall from 4.17.", minutes: 15, level: "Core" },
    { slug: "break-it", title: "Break it on purpose", promise: "Remove the mask, positions, residuals or LayerNorm and see exactly what fails.", minutes: 15, level: "Deep" },
  ],
  watch: [
    {
      kind: "video",
      title: "Let's build GPT: from scratch, in code, spelled out (the final part)",
      by: "Andrej Karpathy",
      url: "https://www.youtube.com/watch?v=kCc8FmEb1nY",
      minutes: 35,
      why: "Feedforward, residuals, LayerNorm, dropout and scaling up.",
      chapters: [
        { at: "1:24:25", title: "Feedforward layers of the transformer block", pace: "watch" },
        { at: "1:26:48", title: "Residual connections", pace: "watch" },
        { at: "1:32:51", title: "LayerNorm", pace: "watch" },
        { at: "1:37:49", title: "Scaling up the model, dropout", pace: "watch" },
        { at: "1:42:39", title: "Encoder vs decoder transformers", pace: "skim" },
        { at: "1:46:22", title: "Walkthrough of nanoGPT", pace: "skim" },
        { at: "1:48:53", title: "Back to ChatGPT: pretraining vs finetuning, RLHF", pace: "watch" },
      ],
    },
    { kind: "code", title: "karpathy/ng-video-lecture", by: "GitHub", url: "https://github.com/karpathy/ng-video-lecture", why: "Run gpt.py on a free Colab or Kaggle GPU." },
  ],
  build: [
    "Run gpt.py on a free GPU. Before you start, predict the loss at step 0 and write it down.",
    "Explain the training loop line by line out loud: get_batch, forward, loss, zero_grad, backward, step.",
    "Break it: remove the residual connections, then the positional embedding. Note the final val loss for each.",
  ],
  aiPrompts: [],
  experiments: [],
  checks: [],
  explainOutLoud: [],
};

export default day;
