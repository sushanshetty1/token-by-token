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
  aiPrompts: [
    "Write a minimal PyTorch Block for a GPT: pre-norm, LayerNorm, causal self-attention, LayerNorm, an MLP with 4x expansion and GELU, and two residual additions. Annotate every tensor shape as (B, T, C). Then ask me 3 questions that check I know why each residual and each LayerNorm is there.",
    "I am running Karpathy's gpt.py from ng-video-lecture on a free GPU. Show only the lines to change to (a) remove the residual connections, (b) remove the position embedding, (c) switch to post-norm. Before I run anything, ask me to predict the effect of each on the validation loss, then tell me what to look for in the loss curve.",
    "Interview me on the transformer block, one question at a time: the residual stream, LayerNorm vs BatchNorm, pre-norm vs post-norm, what the MLP is for and how big it is, and dropout. Push back if an answer is vague, and give me the precise version.",
  ],
  experiments: [
    {
      title: "Take out the residual connections",
      predict: "Will a 6-layer model still train? Will its validation loss end up close to the baseline, or far above it?",
      how: "In gpt.py's Block.forward, change x = x + self.sa(self.ln1(x)) to x = self.sa(self.ln1(x)), and the same for the feed-forward line. Train with the same settings and compare the loss curves.",
      expect:
        "It trains, but much worse: the loss falls slowly and settles clearly above the baseline. Every layer now multiplies the gradient on the way back, so the early layers learn little. Put the additions back and the baseline returns.",
    },
    {
      title: "Delete the position embedding",
      predict: "Without wpe, can the model still tell word order apart? How much worse is the loss?",
      how: "Replace x = tok_emb + pos_emb with x = tok_emb and retrain.",
      expect:
        "Worse, but not hopeless. The causal mask leaks some position information (a token can sense how many tokens it attends over), so the model still learns something, but its samples mix up order. That gap is the value of the position embedding.",
    },
    {
      title: "Post-norm at depth",
      predict: "At 12 layers with the same learning rate and no warmup, which trains better: pre-norm or post-norm?",
      how: "Change Block.forward to x = self.ln1(x + self.sa(x)) and x = self.ln2(x + self.ffwd(x)), drop the final LayerNorm, set n_layer = 12, and train both versions side by side.",
      expect:
        "Pre-norm trains smoothly. Post-norm is touchier: it tends to learn slower or spike at the same learning rate, and usually needs a warmup to behave. That is why GPT-2 moved to pre-norm.",
    },
  ],
  checks: [
    {
      q: "What does a residual connection do, and why does it help train deep networks?",
      a: "A residual connection computes x = x + f(x): the sublayer adds a change to its input instead of replacing it. In backprop, the derivative of x + f(x) with respect to x is 1 + f′(x), so the gradient reaches every earlier layer directly through the identity path, however deep the stack. Without it, the gradient is a product of many layer Jacobians and tends to vanish or explode. Residuals also let each layer start close to the identity, so a deep network begins training like a shallow one.",
    },
    {
      q: "What does LayerNorm compute, and how is it different from BatchNorm?",
      a: "For each token's vector separately, LayerNorm subtracts the mean and divides by the standard deviation over its C features (with a small eps), then applies a learned per-channel scale γ and shift β. BatchNorm instead normalizes each feature across the batch, so its output depends on the other examples and it needs running statistics at inference. LayerNorm depends only on the token itself, behaves identically in training and inference, and works for any batch size or sequence length.",
    },
    {
      q: "What is the MLP in a transformer block for, and how big is it?",
      a: "Attention moves information between positions; the MLP then processes each position on its own, applying a nonlinear function to what was gathered. In GPT-2 it is Linear(C, 4C), GELU, Linear(4C, C): about 8C² parameters per block, twice attention's 4C² and roughly two thirds of the block. Interpretability work suggests much of a model's factual knowledge lives in the MLPs, which behave like key-value memories.",
    },
    {
      q: "Pre-norm vs post-norm: what is the difference, and why did GPT-2 switch?",
      a: "Post-norm, from the 2017 transformer, normalizes after the addition: x = LN(x + f(x)). Pre-norm normalizes each sublayer's input instead: x = x + f(LN(x)). Pre-norm leaves the residual stream untouched, so gradients flow straight through it and deep models train stably with less warmup tuning. Because the stream is never normalized, pre-norm models add one final LayerNorm (ln_f) before the output head.",
    },
    {
      q: "What is dropout, where does a GPT apply it, and is it used in large-scale pretraining?",
      a: "Dropout zeroes each activation with probability p during training and scales the survivors by 1/(1 − p), so the expected value is unchanged; at inference it is switched off. nanoGPT applies it to the attention weights, after the attention and MLP output projections, and after the embeddings. It helps small models trained for many passes over small data, like Shakespeare. Large pretraining runs see most tokens about once, so overfitting is not the bottleneck and dropout is usually set to 0, as in Karpathy's GPT-2 reproduction.",
    },
    {
      q: "What loss should a character-level model with 65 characters show at step 0, and why?",
      a: "A freshly initialized model should spread its probability almost evenly, 1/65 per character, so the cross-entropy is −ln(1/65) = ln 65 ≈ 4.17. If the step-0 loss is much higher, the initial logits are too confident, usually because weights start too large, and the first steps are wasted undoing that.",
    },
    {
      q: "Trace the tensor shapes through a GPT forward pass.",
      a: "idx is (B, T) integer ids. wte(idx) gives (B, T, C), wpe(arange(T)) gives (T, C), and the two are added by broadcasting. Every block maps (B, T, C) to (B, T, C); inside attention it is split into (B, n_head, T, head_size) and the scores are (B, n_head, T, T). ln_f keeps (B, T, C), lm_head produces logits of shape (B, T, vocab_size), and for the loss they are flattened to (B·T, vocab_size) against targets of shape (B·T).",
    },
  ],
  explainOutLoud: [
    "A block is x = x + attn(ln_1(x)), then x = x + mlp(ln_2(x)): tokens communicate, then each token computes on its own.",
    "The residual stream is a highway: every sublayer reads from it and adds to it, and the additions give gradients a straight path to every layer.",
    "LayerNorm rescales each token's vector to mean 0 and variance 1 across C, then applies a learned scale and shift.",
    "The MLP is Linear(C, 4C), GELU, Linear(4C, C), applied to every position independently.",
    "Pre-norm keeps LayerNorm off the residual stream, which is why GPT-2 needs one final ln_f before lm_head.",
  ],
};

export default day;
