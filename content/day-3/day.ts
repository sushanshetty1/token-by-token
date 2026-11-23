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
  aiPrompts: [
    "Write a byte-level BPE tokenizer in Python with get_stats, merge, train, encode and decode, in under 60 lines and no libraries. Train it on a paragraph I paste to vocab_size 276, print the 20 merges as readable strings, and assert decode(encode(text)) == text. Then explain why the first merges are pairs like 'e ' and 'th'.",
    "Write the character-level data loader and BigramLanguageModel from Karpathy's Let's build GPT for tiny Shakespeare: a 90/10 train/val split, get_batch with B=32 and T=8, forward returning (logits, loss), and generate. Before I run it, make me predict the step-0 loss and explain why it should be close to ln(65) = 4.17.",
    "Quiz me on tokenization and embeddings with 5 interview questions, one at a time: BPE, vocabulary size, why LLMs fail at spelling and arithmetic, embedding lookups as one-hot times a matrix, and positional embeddings. Grade each answer out of 10 and list exactly what I left out.",
  ],
  experiments: [
    {
      title: "One word, many tokens",
      predict: "In GPT-2, do egg, egg after a space, Egg and EGG share any token ids? How many tokens is each?",
      how: "Type 'egg egg Egg EGG' into the tokenizer on the home page and switch it to GPT-2. Then switch to GPT-4o and compare.",
      expect:
        "GPT-2 gives four unrelated encodings: egg is 33856, ·egg is 5935, ·Egg is 14562, and ·EGG splits into two tokens, ·E and GG. The model has to learn from data that all of them are the same word, which is one reason capitalization and spacing change model behaviour.",
    },
    {
      title: "Break the starting loss",
      predict:
        "In your bigram script, multiply the embedding table by 10 right after creating the model. What is the step-0 loss now? And if you multiply by 0.01 instead?",
      how: "Right after model = BigramLanguageModel(vocab_size), run model.token_embedding_table.weight.data *= 10 and print the loss of the first batch. Repeat with 0.01 instead of 10.",
      expect:
        "Times 10 gives a loss around 20 to 25: the random logits are huge, so the model is confidently wrong almost everywhere. Times 0.01 lands almost exactly on ln(65) = 4.17, because tiny logits make softmax nearly uniform. The default N(0, 1) init sits in between, around 4.7. This is why good initializations keep the first logits small.",
    },
    {
      title: "Starve the bigram",
      predict: "Train the bigram on only the first 1,000 characters of tiny Shakespeare. Will train and validation loss still stay together?",
      how: "Set train_data = data[:1000] and keep val_data as before. Train for 5,000 steps and print both losses every 500 steps.",
      expect:
        "A gap opens: train loss drops below the full-data value while validation loss is clearly higher and can start rising. With so little text, even a 65 x 65 table memorizes transitions that do not generalize. This is overfitting, and it is what the validation split exists to catch.",
    },
  ],
  checks: [
    {
      q: "How does byte pair encoding work, and why do GPT tokenizers start from bytes?",
      a: "Text is first turned into UTF-8 bytes, so the base vocabulary is the 256 byte values and no input is ever out of vocabulary. Training counts every adjacent pair of tokens, merges the most frequent pair into a new token id, and repeats until the vocabulary reaches the chosen size. The ordered list of merges is the tokenizer; encoding new text replays those merges in the same order. GPT-2 learned 50,000 merges, which with the 256 bytes and one special token gives 50,257 tokens.",
    },
    {
      q: "What are the trade-offs when choosing a vocabulary size?",
      a: "A bigger vocabulary compresses text into fewer tokens, so more fits in the context window and generation needs fewer forward passes. The cost is a bigger embedding table and output layer (vocab_size x C each), a more expensive softmax, and rare tokens that get few training updates. GPT-2 uses 50,257 tokens, GPT-4 about 100k and GPT-4o about 200k; the bigger vocabularies mainly help code and non-English text, which otherwise fall back to many short pieces.",
    },
    {
      q: "Why are LLMs bad at counting letters or doing arithmetic on long numbers?",
      a: "The model sees token ids, not characters. ' strawberry' is a single token in GPT-4o, so the letters are not in its input; it has to recall the spelling from what it memorized about that token. Numbers are split into chunks that do not line up with place value (GPT-2 splits 654321 into 65, 43, 21 but 123456 into 123, 456), so digit-by-digit algorithms are hard to learn. Tool use, or tokenizers that split digits one by one, are the usual fixes.",
    },
    {
      q: "What is an embedding layer, and how is it trained?",
      a: "It is a (vocab_size, n_embd) matrix, and a token id selects its row. That lookup equals multiplying a one-hot vector by the matrix, so it is an ordinary linear layer and gets gradients like any other weight; only rows of tokens present in the batch get a nonzero gradient. Training moves tokens used in similar contexts to nearby vectors. GPT-2 also reuses the same matrix, transposed, as its output layer (weight tying).",
    },
    {
      q: "Why does a transformer need positional information, and how is it added?",
      a: "Self-attention computes weighted sums over its inputs with weights from dot products, so on its own it is permutation-equivariant: 'dog bites man' and 'man bites dog' produce the same vectors in a different order. GPT-2 adds a learned position embedding table of shape (block_size, C): x = tok_emb + pos_emb, where (T, C) broadcasts over the batch to (B, T, C). The original transformer used fixed sinusoids, and most modern models use RoPE, which rotates queries and keys so attention scores depend on the relative distance between tokens.",
    },
    {
      q: "What exactly is the cross-entropy loss of a language model?",
      a: "At every position the model produces logits over the vocabulary; softmax turns them into probabilities, and the loss is -ln of the probability given to the actual next token, averaged over all B x T positions. It is 0 only if every correct token gets probability 1, and confident mistakes cost a lot. In PyTorch you flatten logits from (B, T, C) to (B*T, C) and targets to (B*T,) because F.cross_entropy expects one row per prediction. exp(loss) is the perplexity, the effective number of choices the model is hesitating between.",
    },
    {
      q: "A character-level model over 65 characters prints a loss of about 4.17 before training. Is that good or bad?",
      a: "It is what a healthy initialization should look like. A uniform prediction gives every target probability 1/65, and -ln(1/65) = ln 65 = 4.17. With default N(0, 1) logits you see a bit more, around 4.7, because random logits are not perfectly flat. A value like 20 means the initial logits are far too large and the model is confidently wrong; a value well below 4.17 before training points to a bug such as the target leaking into the input.",
    },
    {
      q: "Why hold out a validation split, and how do you read train versus validation loss?",
      a: "The validation set is text the model never trains on, usually the last 10%, so its loss measures generalization rather than memorization. If train loss keeps falling while validation loss rises, the model is overfitting. If both are high and close together, as with a bigram at about 2.5 on tiny Shakespeare, the model is underfitting: it lacks the capacity or the context to do better, and more training will not help.",
    },
  ],
  explainOutLoud: [
    "A tokenizer is trained separately with BPE: start from 256 bytes, merge the most frequent pair, repeat. The model only ever sees the resulting ids.",
    "An embedding lookup is one-hot times a matrix, so the table is learned by gradient descent like any other weight.",
    "x = tok_emb + pos_emb: (B, T, C) plus (T, C) broadcasts to (B, T, C), and that is what enters the first block.",
    "Cross-entropy is minus the log of the probability on the correct next token, and an untrained model scores ln(vocab_size): 4.17 for 65 characters.",
    "A bigram plateaus near 2.5 because it sees one character of context; attention is how the model reads further back.",
  ],
};

export default day;
