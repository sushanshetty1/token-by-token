/** The plan's own copy. Day data comes from content/day-N/day.ts. */

export interface LoopStep {
  title: string;
  body: string;
}

export const DAILY_LOOP: LoopStep[] = [
  {
    title: "Learn it in the app",
    body: "30 to 45 minutes of animated lessons. Make every prediction before you read on. The picture in your head comes first, the code second.",
  },
  {
    title: "Watch the marked chapters",
    body: "Only the parts marked Watch, at 1.5x to 2x. Drop to 1x and pause when Karpathy goes to the whiteboard or works through the maths.",
  },
  {
    title: "Build it with AI",
    body: "Ask AI to write the part you just watched. Read every line, run it, then change one thing yourself and predict what happens.",
  },
  {
    title: "Check yourself",
    body: "Answer the day's questions out loud before you reveal the model answers on the day page. Anything you cannot explain goes in your confusion log.",
  },
];

export interface Rule {
  lead: string;
  body: string;
}

export const RULES: Rule[] = [
  {
    lead: "Do not type along with the video.",
    body: "Watching and typing at once means doing neither well. Watch a section, pause, then have AI write that part while you read it.",
  },
  {
    lead: "Predict before you run.",
    body: "Write down the output shape or the loss first. A wrong guess points straight at the thing you did not understand.",
  },
  {
    lead: "Break it on purpose.",
    body: "Remove the causal mask, the positional embeddings or the residual connections. Predict what happens, then watch the loss.",
  },
  {
    lead: "Own three pieces of code.",
    body: "backward() for one operation (Day 2), self-attention (Day 4) and the training loop (Day 5). Explain each line out loud, then make one change yourself and predict its effect.",
  },
  {
    lead: "Keep a confusion log.",
    body: "One line for everything you could not explain. Start the next day by asking AI about each line until it is gone.",
  },
  {
    lead: "Make AI grade you, not flatter you.",
    body: "Ask for strict marks out of 10 and the points you missed. The prompts on each day page are written to do exactly that.",
  },
  {
    lead: "Use a free GPU only when you need one.",
    body: "Your laptop CPU is fine for everything except Day 5's training run. For that one, use Google Colab or Kaggle.",
  },
];

export const SETUP: string[] = [
  "Python 3 with PyTorch on your laptop (pip install torch). The CPU build is all you need until Day 5.",
  "A free Google Colab or Kaggle account, so Day 5's training run is one click away.",
  "An AI assistant in a window next to the video, for writing code and grading your answers.",
  "A paper notebook for whiteboard drawings and your confusion log. Drawing the shapes by hand is part of the learning.",
];

/** Short summaries for the week table. Titles, lessons and times come from the day data. */
export const GLANCE: Record<number, { watch: string; build: string }> = {
  1: { watch: "3Blue1Brown, deep learning chapters 5 and 6 (7 is optional)", build: "No code: draw the path from memory, then again with shapes" },
  2: { watch: "Karpathy, building micrograd", build: "A Value class with backward(), then a tiny MLP" },
  3: { watch: "Karpathy, the GPT tokenizer, and Let's build GPT up to 38:00", build: "BPE merges and a bigram model" },
  4: { watch: "Let's build GPT, 42:13 to 1:24:25", build: "One attention head, explained line by line" },
  5: { watch: "Let's build GPT, 1:24:25 to the end", build: "Train gpt.py on a free GPU, then break it" },
  6: { watch: "Let's reproduce GPT-2 (124M), parts 1 and 3", build: "A parameter counter, and generate() with a KV cache" },
  7: { watch: "nanochat with DeepWiki; Deep Dive into LLMs is optional", build: "The whiteboard test, the interview drill, your project plan" },
};

export interface FinalCheck {
  q: string;
  days: number[];
}

export const FINAL_ORIGINAL: FinalCheck[] = [
  { q: "What do Q, K and V mean in self-attention, and why is the causal mask lower-triangular?", days: [4] },
  { q: "Why does a transformer need positional embeddings, and what breaks without them?", days: [3, 5] },
  { q: "What problems do residual connections and LayerNorm fix?", days: [5] },
  {
    q: "A freshly initialized model with a 65-character vocabulary starts at a loss of about 4.17. Where does that number come from?",
    days: [3],
  },
  { q: "What is the difference between pretraining, SFT and RL in nanochat?", days: [7] },
];

export const FINAL_NEW: FinalCheck[] = [
  {
    q: "What is the KV cache, what does it save, and what does it cost? Why is prefill limited by compute while decode is limited by memory bandwidth?",
    days: [6],
  },
  { q: "How do temperature, top-k and top-p each change which token gets picked?", days: [1, 6] },
  {
    q: "What does the chat template add to a conversation, and why is the SFT loss computed only on the assistant's tokens?",
    days: [7],
  },
  { q: "In RL on maths problems, where does the training signal come from, and how is that different from SFT?", days: [7] },
];

export const NAPKIN: FinalCheck[] = [
  {
    q: "Count GPT-2 small's parameters from its config: 12 layers, C = 768, a vocabulary of 50,257 and a context of 1,024 tokens.",
    days: [6],
  },
  { q: "Estimate the training compute for a 124M-parameter model on 10B tokens, using about 6 FLOPs per parameter per token.", days: [6] },
  { q: "How many megabytes does the KV cache take for one 1,024-token sequence in GPT-2 small, stored in bf16?", days: [6] },
];

export const DRILL: LoopStep[] = [
  {
    title: "Whiteboard",
    body: "Draw the full path with the tensor shape on every arrow, then compare it with the drawing you made on Day 1.",
  },
  {
    title: "Rapid fire",
    body: "Ask AI to act as a strict interviewer: ten questions from this week, one at a time, each marked out of 10 with what you missed.",
  },
  {
    title: "Code walk-through",
    body: "Without looking, explain backward() for multiply, one attention head and the training loop, line by line.",
  },
];

export interface Deliverable {
  title: string;
  body: string;
}

export const PROJECT: Deliverable[] = [
  {
    title: "Data",
    body: "1 to 5 MB of text you care about: Kannada text, your own project's docs, a writer you like. Split it 90/10 into train and val.",
  },
  {
    title: "Tokenizer",
    body: "Start character-level. Then train the BPE tokenizer you wrote on Day 3 with a vocabulary of 1,000 to 4,000 and compare tokens per sentence.",
  },
  {
    title: "Model",
    body: "Day 5's gpt.py with your tokenizer, about 10M parameters, on a free Colab or Kaggle GPU. If a run takes more than an hour, cut n_layer or block_size.",
  },
  {
    title: "Loss curves",
    body: "Train and val loss on one chart. Write your predicted step-0 loss, ln(vocab_size), on the chart before you start training.",
  },
  {
    title: "Samples",
    body: "Five samples each from an early, a middle and the final checkpoint, at temperatures 0.8 and 1.2.",
  },
  {
    title: "One break-it experiment",
    body: "Remove the mask, the positions or the residuals. Plot its loss next to the baseline and explain in two paragraphs why it fails the way it does.",
  },
  {
    title: "Faster generation",
    body: "Add the Day 6 KV cache to generate() and report tokens per second with and without it.",
  },
  {
    title: "Write-up",
    body: "A public repo that reproduces everything with one command, and a short post of about 1,000 words with the curves, the samples and the break-it story.",
  },
];

export const RESUME_LINE =
  "Built and trained a 10M-parameter GPT from scratch in PyTorch on Kannada text, with my own BPE tokenizer and KV-cache generation, and wrote up ablations of the causal mask and positional embeddings.";

export const STORY = "I built and trained a transformer from scratch, broke it on purpose, and can tell you why every part is there.";

export interface SkipItem {
  title: string;
  why: string;
}

export const SKIP: SkipItem[] = [
  {
    title: "Zero to Hero lectures 2 to 6",
    why: "makemore parts 1 to 5: bigrams in depth, the MLP, activations and BatchNorm, backprop ninja, WaveNet. Excellent, but not on the shortest path to a GPT. Come back for depth.",
  },
  {
    title: "The sentencepiece part of the tokenizer lecture",
    why: "Day 3 marks it as skip. Knowing it is another library for training BPE (Llama 2 used it) is enough for now.",
  },
  {
    title: "The speed-up and multi-GPU parts of Let's reproduce GPT-2",
    why: "Skim them. Know what bf16, torch.compile, flash attention and DDP buy you, not how they work inside.",
  },
  {
    title: "Running nanochat end to end",
    why: "The speedrun needs a rented 8-GPU H100 node for about four hours (roughly $100). Reading it teaches the same pipeline for free.",
  },
  {
    title: "The encoder half of Attention Is All You Need",
    why: "GPT is decoder-only, so cross-attention and encoder-decoder models can wait.",
  },
];

export interface BackupResource {
  title: string;
  by: string;
  url: string;
  why: string;
}

export const BACKUP: BackupResource[] = [
  {
    title: "Neural Networks: Zero to Hero",
    by: "Andrej Karpathy",
    url: "https://karpathy.ai/zero-to-hero.html",
    why: "The full course page, with a link to its Discord when you are stuck on a detail.",
  },
  {
    title: "The Illustrated Transformer",
    by: "Jay Alammar",
    url: "https://jalammar.github.io/illustrated-transformer/",
    why: "Attention drawn step by step. Good when the Day 4 shapes will not stick.",
  },
  {
    title: "Build a Large Language Model (From Scratch)",
    by: "Sebastian Raschka",
    url: "https://github.com/rasbt/LLMs-from-scratch",
    why: "The book's code. A second explanation of every stage, slower and more detailed.",
  },
  {
    title: "nanoGPT",
    by: "Andrej Karpathy",
    url: "https://github.com/karpathy/nanoGPT",
    why: "The cleaned-up version of the Day 5 code, with GPT-2 training configs.",
  },
  {
    title: "microgpt",
    by: "Andrej Karpathy, on his blog (February 2026)",
    url: "https://karpathy.ai",
    why: "A GPT in about 200 lines with no dependencies. A great final read: the whole week on one screen.",
  },
];

export const NEXT_STEP = {
  title: "RL fine-tuning with GRPO on a small open model",
  body: [
    "Take a 0.5B to 1.5B open model (Qwen or SmolLM), pick a task with an answer a program can check (grade-school maths, a strict JSON format), and fine-tune it with GRPO on a single GPU using Hugging Face TRL.",
    "Read the GRPO section of the DeepSeekMath paper first. nanochat's RL stage from Day 7 is a stripped-down version of the same idea, so you already know the shape of it.",
  ],
};
