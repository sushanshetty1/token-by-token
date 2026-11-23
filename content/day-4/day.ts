import type { DayContent } from "@/lib/types";

const day: DayContent = {
  n: 4,
  title: "Self-attention",
  tagline: "The heart of the transformer: how tokens decide which other tokens to listen to.",
  outcome: "You can write self-attention from memory, explain every line, and say what Q, K and V mean.",
  stations: ["attention"],
  schedule: [
    { label: "Lessons in this app", minutes: 40 },
    { label: "Let's build GPT, 42:13 to 1:24:25", minutes: 60 },
    { label: "Build: one attention head, explained line by line", minutes: 45 },
    { label: "Self-check", minutes: 15 },
  ],
  lessons: [
    { slug: "averaging", title: "Tokens talking", promise: "Start with plain averaging, then discover the masked matrix-multiply trick.", minutes: 12, level: "Core" },
    { slug: "qkv", title: "Queries, keys and values", promise: "Compute attention on four real tokens: scores, scaling, mask, softmax, output.", minutes: 16, level: "Core" },
    { slug: "multi-head", title: "Multi-head attention", promise: "Run several attention heads in parallel and see why that helps.", minutes: 10, level: "Core" },
  ],
  watch: [
    {
      kind: "video",
      title: "Let's build GPT: from scratch, in code, spelled out (the attention part)",
      by: "Andrej Karpathy",
      url: "https://www.youtube.com/watch?v=kCc8FmEb1nY",
      minutes: 60,
      why: "The crux of the whole course. Slow down here.",
      chapters: [
        { at: "42:13", title: "Version 1: averaging past context with for loops", pace: "watch" },
        { at: "47:11", title: "The trick: matrix multiply as weighted aggregation", pace: "watch" },
        { at: "54:42", title: "Version 3: adding softmax", pace: "watch" },
        { at: "1:00:18", title: "Positional encoding", pace: "watch" },
        { at: "1:02:00", title: "Version 4: self-attention (the crux)", pace: "watch" },
        { at: "1:11:38", title: "Notes: communication, sets, batch, encoder vs decoder", pace: "watch" },
        { at: "1:16:56", title: "Why divide by sqrt(head_size)", pace: "watch" },
        { at: "1:21:59", title: "Multi-headed self-attention", pace: "watch" },
      ],
    },
    { kind: "code", title: "karpathy/ng-video-lecture", by: "GitHub", url: "https://github.com/karpathy/ng-video-lecture", why: "gpt.py, the Head and MultiHeadAttention classes." },
  ],
  build: [
    "Have AI write a single attention Head class in PyTorch. Explain every line out loud, including every tensor shape.",
    "Remove the causal mask and predict what happens to the training loss and to generated text. Then run it.",
  ],
  aiPrompts: [],
  experiments: [],
  checks: [],
  explainOutLoud: [],
};

export default day;
