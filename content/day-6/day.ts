import type { DayContent } from "@/lib/types";

const day: DayContent = {
  n: 6,
  title: "Scale, and how it answers you",
  tagline: "What changes at GPT-2 size, and what really happens when the model replies.",
  outcome: "You can break down 124M parameters, name the training tricks, and explain the KV cache and sampling.",
  stations: ["logits", "sample", "update"],
  schedule: [
    { label: "Lessons in this app", minutes: 40 },
    { label: "Reproduce GPT-2, parts 1 and 3 closely", minutes: 70 },
    { label: "Read nanochat's engine.py (KV cache)", minutes: 25 },
    { label: "Self-check", minutes: 15 },
  ],
  lessons: [
    { slug: "gpt2-params", title: "Counting GPT-2's parameters", promise: "Account for all 124M parameters and see where they live.", minutes: 10, level: "Core" },
    { slug: "scale-tricks", title: "Training at scale", promise: "AdamW, warmup and cosine decay, gradient accumulation, mixed precision, and napkin math.", minutes: 14, level: "Deep" },
    { slug: "inference", title: "How the model answers you", promise: "Prefill, decode, the KV cache, and sampling with temperature, top-k and top-p.", minutes: 14, level: "Core" },
  ],
  watch: [
    {
      kind: "video",
      title: "Let's reproduce GPT-2 (124M)",
      by: "Andrej Karpathy",
      url: "https://www.youtube.com/watch?v=l8pRSuU81PU",
      minutes: 70,
      why: "Real-world training. Watch the model code and the optimization section closely; skim the speed section.",
      chapters: [
        { at: "0:00", title: "Part 1: the GPT-2 nn.Module, loading weights, generating", pace: "watch" },
        { at: "1:22:00", title: "Part 2: making it fast (TF32, bf16, torch.compile, flash attention)", pace: "skim" },
        { at: "2:14:00", title: "Part 3: AdamW, gradient clipping, LR schedule, weight decay, grad accumulation", pace: "watch" },
        { at: "3:00:00", title: "DDP, datasets, evaluation, results", pace: "skim" },
      ],
    },
    { kind: "code", title: "karpathy/build-nanogpt", by: "GitHub", url: "https://github.com/karpathy/build-nanogpt", why: "One commit per step of the video. train_gpt2.py is the file to read." },
    { kind: "code", title: "nanochat engine.py (KV cache and sampling)", by: "GitHub", url: "https://github.com/karpathy/nanochat", why: "Inference in a real small chat model, with a KV cache." },
  ],
  build: [
    "Have AI write a function that counts GPT-2's parameters from the config. Check it lands on about 124M.",
    "Have AI write generate() with a KV cache for your Day 5 model. Explain why each step only needs one new token's Q, K and V.",
  ],
  aiPrompts: [],
  experiments: [],
  checks: [],
  explainOutLoud: [],
};

export default day;
