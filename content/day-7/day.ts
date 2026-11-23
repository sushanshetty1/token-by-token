import type { DayContent } from "@/lib/types";

const day: DayContent = {
  n: 7,
  title: "From GPT to ChatGPT",
  tagline: "Pretraining, midtraining, SFT and RL: how a text predictor becomes an assistant.",
  outcome: "You can draw the whole path from memory and explain the full ChatGPT training pipeline.",
  stations: ["text", "tokens", "embed", "attention", "mlp", "logits", "sample", "loss", "backprop", "update"],
  schedule: [
    { label: "Lessons in this app", minutes: 40 },
    { label: "Read nanochat with DeepWiki", minutes: 50 },
    { label: "The whiteboard test", minutes: 20 },
    { label: "Interview drill and mini project plan", minutes: 40 },
  ],
  lessons: [
    { slug: "post-training", title: "From GPT to ChatGPT", promise: "Follow nanochat's pipeline: pretrain, midtrain, SFT, RL, and the chat template.", minutes: 15, level: "Core" },
    { slug: "modern", title: "What changed since GPT-2", promise: "RoPE, RMSNorm, SwiGLU, grouped-query attention and mixture of experts.", minutes: 12, level: "Deep" },
    { slug: "whiteboard", title: "The whiteboard test", promise: "Rebuild the whole path from memory, then face the interview drill.", minutes: 15, level: "Core" },
  ],
  watch: [
    { kind: "code", title: "karpathy/nanochat", by: "GitHub", url: "https://github.com/karpathy/nanochat", why: "The full ChatGPT pipeline in one small repo. Read speedrun.sh first, then each stage. Do not run it." },
    { kind: "read", title: "Ask questions about nanochat on DeepWiki", by: "DeepWiki", url: "https://deepwiki.com/karpathy/nanochat", why: "Ask where each stage lives and what data it uses." },
    {
      kind: "video",
      title: "Deep Dive into LLMs like ChatGPT (post-training sections)",
      by: "Andrej Karpathy",
      url: "https://www.youtube.com/watch?v=7xTGNNLPyMI",
      minutes: 60,
      why: "Optional. The clearest non-code explanation of SFT, RL and RLHF. Watch at 2x.",
    },
  ],
  build: [
    "Read speedrun.sh top to bottom and write one line per stage: what data, what loss, what changes in the model.",
    "Find the chat template in nanochat's tokenizer and write out how one user/assistant turn becomes tokens.",
    "Do the whiteboard test in this app, then on paper. Compare with your Day 1 drawing.",
  ],
  aiPrompts: [],
  experiments: [],
  checks: [],
  explainOutLoud: [],
};

export default day;
