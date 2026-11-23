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
  aiPrompts: [
    "Write a Python function count_params(n_layer, n_embd, n_head, vocab_size, block_size) for a GPT-2 style model with biases and a tied lm_head, returning a breakdown by component. Check it against sum(p.numel() for p in model.parameters()) on my nanoGPT model, then explain why n_head does not change the result.",
    "Here is my Day 5 GPT in PyTorch: <paste it>. Add a KV cache: attention returns (k, v), each block passes its past_kv through, positions start at the cache length, and generate() does one prefill call then single-token decode steps. Then write a test that checks the cached and uncached versions give the same logits at every step, within float tolerance.",
    "Interview me, one question at a time, on: gradient accumulation and the loss / grad_accum line, AdamW vs Adam, warmup, bf16 vs fp16, flash attention, 6ND, KV cache memory for a 7B model, and top-p vs top-k. After each answer, correct anything imprecise and give me one number to remember.",
  ],
  experiments: [
    {
      title: "Forget the division in gradient accumulation",
      predict: "With 8 micro steps, what happens if you delete loss = loss / grad_accum?",
      how: "In build-nanogpt's train_gpt2.py, comment out the division, train a few hundred steps with the same settings, and log the gradient norm (before clipping) and the loss next to a normal run.",
      expect:
        "The gradient norm comes out about 8 times larger. Clipping at 1.0 hides part of the damage, since it rescales any norm above 1, but the updates are effectively too large: the loss gets noisier and can spike. Restore the division and the two runs line up again.",
    },
    {
      title: "Time the KV cache",
      predict: "Generating 500 tokens after a 100-token prompt: how much faster is the cached version?",
      how: "Time generate() with and without the cache (call torch.cuda.synchronize() before reading the clock on a GPU), then compare the logits of both versions at each step.",
      expect:
        "The cached version is several times faster, and the gap widens as the text grows, because the uncached loop reruns the whole sequence every step. The logits match within floating-point tolerance: the cache is exact.",
    },
    {
      title: "Three temperatures, one prompt",
      predict: "At temperature 0.2, 1.0 and 1.5 on the same prompt, which output repeats itself, which reads naturally, and which falls apart?",
      how: "With a pretrained GPT-2 (your nanoGPT with loaded weights, or Hugging Face transformers), generate 100 tokens at each temperature, then once more at temperature 1.0 with top_p = 0.9.",
      expect:
        "0.2 tends to loop on the same phrases, 1.5 drifts into nonsense, and 1.0 with top_p = 0.9 usually reads best: it trims the long tail of unlikely tokens without flattening the rest.",
    },
  ],
  checks: [
    {
      q: "How many parameters does GPT-2 small have, where are they, and what is weight tying?",
      a: "124,439,808. The token embedding is 50,257 × 768 = 38.6M, the position embedding 1,024 × 768 = 0.79M, and each of the 12 blocks holds 12C² + 13C = 7.09M (4C² in attention, 8C² in the MLP, plus biases and two LayerNorms), 85.1M in all; ln_f adds 1,536. lm_head adds nothing because it is tied to the token embedding: the output scores token i by the dot product of the final vector with row i of the same matrix the input uses to look token i up. Both roles want similar tokens to have similar vectors, so sharing is a sensible constraint, and it saves 38.6M parameters, 31% of the model.",
    },
    {
      q: "How does AdamW differ from Adam with L2, and why warm up the learning rate?",
      a: "Adam keeps per-weight running averages of the gradient (m) and of its square (v), and steps by lr × m̂ / (√v̂ + ε), so every weight moves about lr per step whatever its gradient scale. Adam with L2 adds λθ to the gradient, where √v̂ rescales it, so weights with large gradients are barely decayed; AdamW subtracts lr × λ × θ separately, decaying every weight at the same rate. Warmup ramps lr up from near 0 (715 steps in the GPT-2 reproduction) because early gradients are large and erratic and v has seen only a few of them, so full-size steps can blow training up. A cosine decay to about 10% of the peak then lets the model settle at the end.",
    },
    {
      q: "Explain gradient accumulation, and the bug people make with it.",
      a: "To train with a 524,288-token batch on a GPU that fits 64 × 1,024 tokens, run 8 micro-batches, each with a forward and backward pass, then call optimizer.step() once; PyTorch adds every backward pass into .grad. The classic bug is not dividing each micro-batch loss by the number of micro steps: each loss is already a mean, so the summed gradient comes out 8 times too large, like an 8 times higher learning rate. With loss / grad_accum the result equals the big-batch gradient exactly, because nothing in a transformer depends on batch statistics.",
    },
    {
      q: "bf16 vs fp16 vs fp32 for training: what is the difference?",
      a: "fp32 has 8 exponent bits and 23 mantissa bits. fp16 has 5 and 10: decent precision but a maximum of 65,504, and small values underflow below about 6e-5 (6e-8 with subnormals), so fp16 training needs loss scaling. bf16 keeps fp32's 8 exponent bits with a 7-bit mantissa: the same range with less precision, so it usually trains without loss scaling. Mixed precision runs the matmuls in bf16 (312 TFLOPS on an A100 against 19.5 in fp32) while keeping master weights and sensitive ops such as softmax, LayerNorm and the loss in fp32.",
    },
    {
      q: "What does flash attention do, and is it an approximation?",
      a: "Standard attention writes the T × T score and probability matrices out to GPU memory (HBM) and reads them back, which costs O(T²) memory and is limited by memory bandwidth. Flash attention fuses attention into one kernel that streams tiles of K and V through fast on-chip SRAM and uses an online softmax (a running max and sum), so the T × T matrix is never written out. The output is exact attention, not an approximation; it is faster because it moves far less data.",
    },
    {
      q: "Estimate the compute to train a 124M-parameter model on 10B tokens.",
      a: "Training costs about 6 FLOPs per parameter per token: 2 in the forward pass (a multiply and an add per weight) and about 4 in the backward pass. 6 × 124M × 10B ≈ 7.4e18 FLOPs. An A100 peaks at 312 TFLOPS in bf16; at a realistic 40% utilization that is 1.25e14 FLOP/s, so about 60,000 seconds: 16 to 17 GPU-hours, or about 2 hours on 8 GPUs. Chinchilla's rule of thumb puts compute-optimal training at about 20 tokens per parameter, 2.5B here; training longer buys a better small model at extra cost.",
    },
    {
      q: "What is the KV cache, how much memory does it take, and why is decode memory-bound while prefill is compute-bound?",
      a: "Generation runs the whole prompt in one pass (prefill), then one token per forward pass (decode). Because of the causal mask, past tokens' keys and values never change, so every layer caches them and a decode step computes q, k and v only for the new token and attends over the cache. The cache costs 2 × n_layer × n_kv_heads × head_size × T × bytes per sequence: 37.7 MB for GPT-2 small at 1,024 tokens in bf16, 4.3 GB for a Llama-2-7B-shaped model at 8,192 tokens. Prefill uses each weight for every prompt token at once, so arithmetic dominates; decode reads all the weights and the cache to produce one token per sequence, so it is capped by memory bandwidth, about 2 TB/s ÷ 13.5 GB ≈ 150 tokens per second for that 7B model at batch 1 on an A100.",
    },
    {
      q: "Temperature vs top-k vs top-p: what does each do?",
      a: "Temperature divides the logits before the softmax: below 1 it sharpens the distribution toward the likeliest tokens, above 1 it flattens it, and as it approaches 0 sampling becomes greedy argmax. Top-k keeps only the k most likely tokens. Top-p (nucleus) keeps the smallest set whose probabilities add up to at least p, so it keeps few tokens when the model is confident and many when it is unsure. The survivors are renormalized and one is sampled; implementations usually apply temperature first, then top-k, then top-p.",
    },
  ],
  explainOutLoud: [
    "GPT-2 small is 124M parameters: a 38.6M token embedding, 12 blocks of 12C² + 13C each, and an lm_head tied to the embedding.",
    "Gradient accumulation sums gradients over micro-batches, with each loss divided by the number of micro steps, to train with a 0.5M-token batch on one GPU.",
    "AdamW gives every weight a step of about lr from running gradient statistics and applies weight decay separately; the learning rate warms up, then follows a cosine down.",
    "Training compute is about 6ND FLOPs, and compute-optimal training uses about 20 tokens per parameter.",
    "The KV cache stores every past key and value so decode only processes the new token, but each step still reads all the weights and the cache, so decode is memory-bound.",
  ],
};

export default day;
