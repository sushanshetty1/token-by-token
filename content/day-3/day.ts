import type { DayContent } from "@/lib/types";

const day: DayContent = {
  n: 3,
  title: "Tokens and embeddings",
  tagline: "How text becomes numbers, and the simplest model that can predict the next character.",
  outcome: "You can explain BPE, why LLMs are bad at spelling, and why a random model's loss is about 4.17.",
  stations: ["text", "tokens", "embed", "loss"],
  schedule: [
    { label: "Lessons in this app", minutes: 35 },
    { label: "Tokenizer lecture, selected parts at 1.5x", minutes: 45 },
    { label: "Let's build GPT, first 38 minutes", minutes: 30 },
    { label: "Build: tokenizer and bigram model with AI", minutes: 30 },
    { label: "Self-check", minutes: 10 },
  ],
  lessons: [
    { slug: "tokenization", title: "Tokenization with BPE", promise: "Watch byte pair encoding merge characters into tokens, and see where it breaks.", minutes: 12, level: "Beginner" },
    { slug: "embeddings", title: "Embeddings and positions", promise: "Turn token ids into vectors, and give the model a sense of order.", minutes: 10, level: "Core" },
    { slug: "bigram", title: "A bigram model and its loss", promise: "Build the simplest language model and read cross-entropy loss like a pro.", minutes: 12, level: "Core" },
  ],
  watch: [
    {
      kind: "video",
      title: "Let's build the GPT Tokenizer",
      by: "Andrej Karpathy",
      url: "https://www.youtube.com/watch?v=zduSFxRajkE",
      minutes: 133,
      why: "Tokenization causes a surprising number of LLM failures. Watch the BPE core and the quirks.",
      chapters: [
        { at: "0:00", title: "Why tokenization matters, tokenizer issues", pace: "watch" },
        { at: "14:56", title: "Unicode and UTF-8", pace: "skim" },
        { at: "23:50", title: "Byte pair encoding walkthrough and implementation", pace: "watch" },
        { at: "39:20", title: "The tokenizer is a separate stage from the LLM", pace: "watch" },
        { at: "42:47", title: "Decoding and encoding", pace: "skim" },
        { at: "57:36", title: "Regex splits, tiktoken, special tokens", pace: "skim" },
        { at: "1:28:42", title: "sentencepiece", pace: "skip" },
        { at: "1:43:27", title: "Choosing vocabulary size", pace: "watch" },
        { at: "1:51:41", title: "Explaining the quirks of LLM tokenization", pace: "watch" },
      ],
    },
    {
      kind: "video",
      title: "Let's build GPT: from scratch, in code, spelled out (first part)",
      by: "Andrej Karpathy",
      url: "https://www.youtube.com/watch?v=kCc8FmEb1nY",
      minutes: 38,
      why: "Data, character tokenizer, batching and the bigram baseline. Stop at 38:00.",
      chapters: [
        { at: "7:52", title: "Reading the Shakespeare data", pace: "skim" },
        { at: "9:28", title: "Tokenization, train/val split", pace: "watch" },
        { at: "14:27", title: "Data loader: batches of chunks", pace: "watch" },
        { at: "22:11", title: "Bigram language model, loss, generation", pace: "watch" },
        { at: "34:53", title: "Training the bigram model", pace: "watch" },
      ],
    },
    { kind: "code", title: "karpathy/minbpe", by: "GitHub", url: "https://github.com/karpathy/minbpe", why: "Read basic.py: BPE in about 60 lines." },
  ],
  build: [
    "Have AI write BPE training (get_stats, merge) on a paragraph of text. Print the first 10 merges and explain each.",
    "Have AI write the character-level data loader and the bigram model from the lecture. Predict the starting loss before running it.",
  ],
  aiPrompts: [],
  experiments: [],
  checks: [],
  explainOutLoud: [],
};

export default day;
