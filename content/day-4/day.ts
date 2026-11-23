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
  aiPrompts: [
    "Write a single causal self-attention Head class in PyTorch: key, query and value nn.Linear layers without bias, a tril buffer registered with register_buffer, scores scaled by head_size ** -0.5, masked_fill with -inf, softmax over the last dimension, dropout, then wei @ v. Annotate every line with the tensor shape for B = 4, T = 8, C = 32, head_size = 16. Keep it under 30 lines and add nothing I did not ask for.",
    "Here is my Head class: [paste it]. Quiz me on it one question at a time: why each line exists (the mask, the scale, the transpose, which dim the softmax runs over), and what every tensor shape is. Wait for my answer each time, then correct me precisely and tell me what an interviewer would want to hear.",
    "Turn this list-of-heads MultiHeadAttention [paste it] into one batched CausalSelfAttention in the nanoGPT style: a single Linear(C, 3C) for q, k and v, view and transpose to (B, n_head, T, head_size), one masked softmax, transpose back, then c_proj. Then write a test that copies the weights from the slow version into the fast one and asserts both outputs match with torch.allclose.",
  ],
  experiments: [
    {
      title: "Remove the causal mask",
      predict: "Without the mask, does the training loss go up or down? And what does the generated text look like?",
      how: "Comment out the masked_fill line in Head.forward, train for the same number of steps as before, and compare both the losses and a sample of generated text.",
      expect: "The loss drops much lower than before, because every position can now read the very token it is supposed to predict and simply copy it (validation loss leaks the same way). Generation becomes nonsense: when you sample, the future does not exist yet, so the shortcut the model learned is useless.",
    },
    {
      title: "Remove the scale",
      predict: "With head_size = 64, how much larger is the variance of the raw scores q @ k.T than after scaling? What does a softmax row look like at initialization?",
      how: "Run Karpathy's check: q = torch.randn(B, T, 64); k = torch.randn(B, T, 64); compare (q @ k.transpose(-2, -1)).var() with and without * 64 ** -0.5, and print F.softmax of one row each way. Then delete the scale line in your Head and train again.",
      expect: "Unscaled variance is about 64, scaled about 1. The unscaled softmax row is close to one-hot, so each token attends to a single other token from the start and gradients through the softmax are tiny. Training is slower or less stable and usually ends a little worse; with very small heads the difference is small.",
    },
    {
      title: "Change n_head, keep n_embd",
      predict: "With n_embd = 384, compare n_head = 1, 6 and 12. Does the parameter count change? Which trains best?",
      how: "Train the same model three times for the same number of steps, changing only n_head. Print sum(p.numel() for p in model.parameters()) and the final validation loss each time.",
      expect: "The parameter count is identical in all three runs, because the heads are slices of the same matrices. Several heads usually beat one head of full width, and the gain flattens as the heads get very small.",
    },
  ],
  checks: [
    {
      q: "What do the query, key and value vectors represent in self-attention?",
      a: "Each token's vector x is projected three ways by learned linear layers. The query encodes what this token is looking for, the key encodes what it contains and can be matched on, and the value is the information it hands over if attended to. The score between tokens i and j is q_i · k_j; after a softmax those scores weight a sum of value vectors. Queries and keys decide where to look, values decide what is moved.",
    },
    {
      q: "Why is the attention mask lower-triangular in a GPT?",
      a: "A GPT is trained to predict the next token at every position in parallel, so position t may only use tokens 0 to t; otherwise it could read its own target and learn to copy. In the (T, T) score matrix the row is the query position and the column the key position, so the allowed cells j <= t form the lower triangle. Masked scores are set to -inf, so after exp they are exactly 0, which also matches generation, where future tokens do not exist yet.",
    },
    {
      q: "Why divide the attention scores by sqrt(d_k)?",
      a: "If the entries of q and k are independent with variance 1, then q · k is a sum of d_k such products and has variance d_k, so its spread grows like sqrt(d_k). Large scores push the softmax toward one-hot, where its gradient is nearly zero, so learning stalls and each token attends to a single token from initialization. Dividing by sqrt(d_k) brings the scores back to unit variance whatever the head size.",
    },
    {
      q: "What is the time and memory complexity of self-attention?",
      a: "Computing Q Kᵀ multiplies (T, d) by (d, T), which is O(T² · d) time per head, and the T × T attention matrix takes O(T²) memory per head. The q, k, v and output projections cost O(T · d²). For long contexts the T² term dominates, which is what methods like FlashAttention (never materializes the full T × T matrix) and sliding-window attention target.",
    },
    {
      q: "Why use multiple attention heads instead of one big one?",
      a: "A head gives each token one softmax distribution, so it can express one pattern of who to read from at a time. With n_head heads of size n_embd / n_head, different heads can attend to different tokens for different reasons in parallel, such as the previous token or the noun a pronoun refers to. Their outputs are concatenated back to (B, T, C) and mixed by an output projection, and the parameter count stays 4C² + 4C regardless of n_head.",
    },
    {
      q: "What is the difference between self-attention and cross-attention?",
      a: "In self-attention the queries, keys and values are all computed from the same sequence x. In cross-attention the queries come from one sequence and the keys and values from another, for example a translation decoder reading the encoder's output, or text tokens reading image features. The computation is identical; only the source of k and v changes.",
    },
    {
      q: "What is the difference between encoder and decoder attention?",
      a: "An encoder such as BERT uses no causal mask: every token attends to every other token, which suits understanding tasks where the whole input is available. A decoder such as GPT uses the causal mask, so each position sees only the past; that lets it train on next-token prediction at all positions at once and generate text one token at a time. The original Transformer had both: an encoder, and a decoder with masked self-attention plus cross-attention to the encoder.",
    },
    {
      q: "What can attention not do without positional information?",
      a: "Attention is a weighted sum over a set: neither q · k nor the sum depends on where a token sits. Without position information and without a mask, permuting the input tokens just permutes the outputs, so the model cannot tell 'dog bites man' from 'man bites dog'. That is why GPT adds learned position embeddings to the token embeddings before the first block (other models use sinusoidal embeddings or RoPE). A causal mask leaks some order information, but explicit positions are the standard fix.",
    },
  ],
  explainOutLoud: [
    "Self-attention replaces each token's vector with a weighted average of the value vectors it may see, weighted by softmax(q · k / sqrt(head_size)).",
    "The causal mask sets future scores to -inf so each position uses only the past, which is what lets us train all T next-token predictions in one pass.",
    "We scale by 1 / sqrt(head_size) so scores keep unit variance and the softmax does not collapse to one-hot.",
    "Multi-head attention runs n_head smaller heads in parallel and concatenates them, for the same 4C² + 4C parameters as one big head.",
    "Attention is communication between tokens; the MLP that follows is computation inside each token.",
  ],
};

export default day;
