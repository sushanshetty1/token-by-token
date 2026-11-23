import type { DayContent } from "@/lib/types";

const day: DayContent = {
  n: 1,
  title: "The whole picture",
  tagline: "Follow one prompt from your keyboard to the model's reply, before any code.",
  outcome:
    "You can explain, without notes, what happens between pressing Enter and seeing the first word of the answer.",
  stations: ["text", "tokens", "embed", "attention", "mlp", "logits", "sample"],
  schedule: [
    { label: "Lessons in this app", minutes: 30 },
    { label: "3Blue1Brown, chapters 5 and 6 at 1.5x", minutes: 45 },
    { label: "Chapter 7, optional", minutes: 15 },
    { label: "Whiteboard attempt and self-check", minutes: 30 },
    { label: "Write down what still confuses you", minutes: 10 },
  ],
  lessons: [
    {
      slug: "prompt-journey",
      title: "A prompt's journey",
      promise: "Trace one message through every component of an LLM and back out as text.",
      minutes: 14,
      level: "Beginner",
    },
    {
      slug: "next-token",
      title: "One token at a time",
      promise: "See why the model only ever predicts the next token, and how temperature shapes the choice.",
      minutes: 10,
      level: "Beginner",
    },
  ],
  watch: [
    {
      kind: "video",
      title: "Large Language Models explained briefly",
      by: "3Blue1Brown",
      url: "https://www.youtube.com/watch?v=LPZh9BOjkQs",
      minutes: 8,
      why: "A warm-up. The whole idea in eight minutes.",
    },
    {
      kind: "video",
      title: "Transformers, the tech behind LLMs (Deep Learning chapter 5)",
      by: "3Blue1Brown",
      url: "https://www.youtube.com/watch?v=wjZofJX0v4M",
      minutes: 27,
      why: "Embeddings, the unembedding matrix, softmax and temperature, drawn beautifully.",
    },
    {
      kind: "video",
      title: "Attention in transformers, step by step (Deep Learning chapter 6)",
      by: "3Blue1Brown",
      url: "https://www.youtube.com/watch?v=eMlx5fFNoYc",
      minutes: 26,
      why: "The best visual intuition for queries, keys and values. You will code it on Day 4.",
    },
    {
      kind: "video",
      title: "How might LLMs store facts (Deep Learning chapter 7)",
      by: "3Blue1Brown",
      url: "https://www.youtube.com/watch?v=9-Jl0dxWQs8",
      minutes: 23,
      why: "Optional. What the MLP half of each block is doing.",
    },
  ],
  build: [
    "No code today. Before anything else, draw the path from text to next token from memory. It will be wrong. Keep the page: you redraw it on Day 7.",
    "After the videos, redraw it and write the shape of the data on every arrow: (T) ids, (T, C) vectors, (T, vocab) logits.",
    "Paste three sentences into the tokenizer on the home page, one of them in Kannada, and note the token counts.",
  ],
  aiPrompts: [
    "Explain logits, softmax and sampling with a vocabulary of 5 words and real numbers. Then show what temperature 0.5 and 2.0 do to those exact numbers.",
    "Here is my description of how an LLM turns a prompt into the next token: <paste yours>. Point out anything wrong or missing. Be strict.",
    "Ask me 5 interview questions about how a transformer generates text, one at a time, and grade each answer out of 10 with the missing points.",
  ],
  experiments: [
    {
      title: "Temperature by hand",
      predict: "At temperature 0.1, what happens to the probability of the top token? At 2.0?",
      how: "Use the temperature slider in the 'One token at a time' lesson.",
      expect:
        "Low temperature pushes the top token towards 100% (almost greedy). High temperature flattens the distribution, so unlikely tokens get picked more often.",
    },
    {
      title: "Count the tokens",
      predict: "Which costs more tokens: 'I love strawberries' or the same sentence in Kannada?",
      how: "Type both into the tokenizer on the home page and switch between the GPT-2 and GPT-4o encodings.",
      expect:
        "The Kannada version uses several times more tokens, and GPT-2 is far worse than GPT-4o. Tokenizers are trained mostly on English text.",
    },
  ],
  checks: [
    {
      q: "Walk me through what happens when I send a prompt to a chat model.",
      a: "The message is wrapped in a chat template with special tokens, then the tokenizer turns the text into integer ids. Each id looks up a vector in the embedding table and position information is added, giving a (T, C) matrix. That passes through N transformer blocks: attention lets tokens read from earlier tokens, the MLP processes each token on its own, and both add their result back into a residual stream. A final projection gives logits over the whole vocabulary; the last position's logits go through softmax with temperature, one token is sampled, appended, and the loop repeats until an end token. The ids are decoded back to text and streamed to you.",
    },
    {
      q: "What is a logit?",
      a: "A raw, unnormalized score the model gives every token in the vocabulary. Softmax turns the logits into probabilities that sum to 1. A logit is a log-probability up to a constant, so adding the same number to every logit changes nothing.",
    },
    {
      q: "Why does a GPT produce predictions at every position, if we only need the last one?",
      a: "For training efficiency. A sequence of T tokens gives T next-token training examples in one forward pass, and the causal mask makes sure position t only sees tokens up to t. At inference time we only read the last position's logits.",
    },
    {
      q: "What does the model learn during pretraining, and where is the label?",
      a: "It learns to predict the next token over a huge amount of text. The text is its own label: the target for each position is simply the token that comes next. That is called self-supervised learning, and it is why pretraining scales to trillions of tokens without human labelling.",
    },
    {
      q: "What do attention and the MLP each contribute?",
      a: "Attention is communication: each token gathers information from earlier tokens, weighted by relevance. The MLP is computation: it transforms each token's vector independently, and is where much of the factual knowledge appears to be stored. A block alternates the two, and stacking blocks repeats the pattern.",
    },
    {
      q: "What is the context window, and why is it limited?",
      a: "It is the maximum number of tokens the model can attend over at once. Attention compares every token with every earlier one, so compute grows with the square of the length, the KV cache grows linearly in memory, and the model only learned position patterns up to the lengths it was trained on.",
    },
  ],
  explainOutLoud: [
    "Text becomes tokens, tokens become vectors, vectors flow through attention and MLP blocks, and the last vector becomes a score for every possible next token.",
    "The model never sees letters, only token ids.",
    "Generating a reply is a loop: one forward pass per new token, each new token fed back in.",
    "Attention moves information between tokens. The MLP thinks about each token on its own.",
  ],
};

export default day;
