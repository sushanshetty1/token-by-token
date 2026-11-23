"use client";

import type { LessonModule } from "@/lib/types";
import { Stage } from "./Stage";
import { commas, GRAD_ACCUM, MICRO_B, napkin, sci, T, TOTAL_BATCH } from "./math";

const RUN = napkin(124e6, 10e9, 8, 312e12, 0.4);

const CODE = `import math, torch

total_batch = 524288                    # 2**19 tokens, about 0.5M per step
B, T = 64, 1024                         # one micro-batch: what fits on the GPU
grad_accum = total_batch // (B * T)     # 8 micro steps
max_lr, min_lr = 6e-4, 6e-5
warmup, max_steps = 715, 19073          # 19073 * 524288 tokens = 10B

def get_lr(it):
    if it < warmup:
        return max_lr * (it + 1) / warmup
    if it > max_steps:
        return min_lr
    ratio = (it - warmup) / (max_steps - warmup)
    coeff = 0.5 * (1.0 + math.cos(math.pi * ratio))   # 1 down to 0
    return min_lr + coeff * (max_lr - min_lr)

torch.set_float32_matmul_precision("high")           # fp32 matmuls run as tf32
model = torch.compile(GPT(GPTConfig()).cuda())        # its attention is flash attention
decay = [p for p in model.parameters() if p.dim() >= 2]    # matrices and embeddings
no_decay = [p for p in model.parameters() if p.dim() < 2]  # biases and LayerNorm
optimizer = torch.optim.AdamW(
    [{"params": decay, "weight_decay": 0.1}, {"params": no_decay, "weight_decay": 0.0}],
    lr=max_lr, betas=(0.9, 0.95), eps=1e-8, fused=True)

for step in range(max_steps):
    optimizer.zero_grad()
    for micro in range(grad_accum):
        x, y = loader.next_batch()                    # (B, T) each
        with torch.autocast(device_type="cuda", dtype=torch.bfloat16):
            logits, loss = model(x, y)
        loss = loss / grad_accum                      # mean over the full batch
        loss.backward()                               # adds into .grad
    norm = torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
    lr = get_lr(step)
    for group in optimizer.param_groups:
        group["lr"] = lr
    optimizer.step()
`;

const lesson: LessonModule = {
  rail: [
    { id: "batch", label: "Tokens per step" },
    { id: "accum", label: "Micro steps" },
    { id: "lr", label: "Learning rate" },
    { id: "dtype", label: "Precision" },
    { id: "compute", label: "Compute" },
  ],
  learn: [
    "Explain batch size in tokens and implement gradient accumulation correctly",
    "Explain what AdamW adds over SGD and over Adam",
    "Draw the warmup plus cosine schedule and explain gradient clipping",
    "Compare fp32, tf32, bf16 and fp16, and say what flash attention saves",
    "Estimate training compute with 6ND and know the 20 tokens per parameter rule",
  ],
  legend: [
    { label: "micro-batch in flight", color: "var(--mark)" },
    { label: "accumulated gradient", color: "var(--violet)", shape: "square" },
    { label: "learning rate, Adam step", color: "var(--accent)", shape: "line" },
    { label: "correct or safe", color: "var(--ok)" },
    { label: "wrong or wasteful", color: "var(--bad)" },
  ],
  code: { filename: "train_gpt2.py", source: CODE, note: "The core of build-nanogpt's training loop, trimmed. GPT, GPTConfig and loader come from earlier days." },
  steps: [
    {
      label: "Batch",
      kind: "problem",
      title: "GPT-2 learns from half a million tokens per step",
      body: (
        <>
          <p>
            GPT-2 small was trained with about 0.5M tokens per optimizer step: {commas(TOTAL_BATCH)}, which is 2^19. A big batch averages the gradient
            over more text, so each update points more reliably downhill.
          </p>
          <p>
            One GPU cannot hold that. With T = {commas(T)}, an 80 GB A100 fits about B = {MICRO_B} sequences, {commas(MICRO_B * T)} tokens, in one forward
            and backward pass. That is {GRAD_ACCUM} times too few.
          </p>
        </>
      ),
      keyIdea: "For LLMs, batch size is counted in tokens: B × T per pass, times the number of passes per update.",
      code: { ranges: [[3, 5]], caption: "The target batch, what fits, and how many passes that takes." },
      rail: { batch: commas(TOTAL_BATCH), accum: `${GRAD_ACCUM} × ${commas(MICRO_B * T)}`, lr: "?", dtype: "fp32", compute: "?" },
      learns: [0],
    },
    {
      label: "Accumulate",
      kind: "mechanism",
      title: "Gradient accumulation: 8 passes, one update",
      body: (
        <>
          <p>
            Run the 8 micro-batches one after another. Each does a forward pass and <code>loss.backward()</code>, and PyTorch <strong>adds</strong> each
            new gradient into <code>.grad</code> instead of replacing it. Only after the eighth do you call <code>optimizer.step()</code>, then{" "}
            <code>zero_grad()</code>.
          </p>
          <p>You get the update of a 524,288-token batch with the memory of a 65,536-token one. The price is time: 8 passes in a row.</p>
        </>
      ),
      predict: {
        question: "Each micro step's loss is a mean over its own 65,536 tokens. Call loss.backward() on all 8 without changing anything, and the accumulated gradient is:",
        options: ["The same as one 524,288-token batch", "8 times too big", "8 times too small", "Different on every run"],
        answer: 1,
        explain: (
          <>
            Each backward adds a full mean-sized gradient, so 8 of them sum to 8 times the big-batch mean. It is as if the learning rate were 8 times
            higher. The fix is one line: divide each loss by 8 before backward.
          </>
        ),
      },
      changed: ["Micro-batches light up one at a time", "Each backward pass adds into the .grad bucket; the optimizer waits"],
      code: { ranges: [[26, 33]], caption: "The inner loop runs grad_accum times before one optimizer step." },
      rail: { accum: "8 micro steps" },
      learns: [0],
    },
    {
      label: "Divide",
      kind: "insight",
      title: "Divide each loss by the number of micro steps",
      body: (
        <>
          <p>
            The big-batch loss is the mean over all 524,288 tokens, which equals the average of the 8 micro-batch means. So scale each micro loss by
            1/8: <code>loss = loss / grad_accum</code>. Because gradients add, the accumulated <code>.grad</code> is then the big-batch gradient, up to
            floating-point rounding.
          </p>
          <p>This is clean for transformers because nothing in them uses batch statistics: LayerNorm normalizes each token on its own.</p>
        </>
      ),
      keyIdea: "8 backward passes of loss / 8 give the same gradient as one batch 8 times bigger.",
      code: { ranges: [[32, 33]], caption: "One division keeps the gradient on the right scale." },
      learns: [0],
    },
    {
      label: "AdamW",
      kind: "mechanism",
      title: "AdamW: momentum, a per-weight step, and decay on the side",
      body: (
        <>
          <p>
            AdamW keeps two running averages per weight. <strong>m</strong> averages the gradient (momentum), smoothing out noise. <strong>v</strong>{" "}
            averages the squared gradient; dividing by √v makes each weight&apos;s step about <code>lr</code> in size, whether its gradients are large or
            tiny.
          </p>
          <p>
            <strong>Weight decay</strong> pulls weights toward zero. Adam with L2 adds it to the gradient, where √v rescales it unevenly. AdamW subtracts{" "}
            <code>lr × λ × θ</code> separately, so every weight decays at the same rate. The GPT-2 reproduction decays matrices and embeddings only.
          </p>
        </>
      ),
      changed: ["Panel 1: m (blue) smooths the noisy gradient", "Panel 2: two weights with gradients 400 times apart get the same Adam step", "Panel 3: where the decay term sits"],
      code: { ranges: [[20, 24]], caption: "Two parameter groups: decay the 2D weights, not biases or LayerNorm." },
      rail: { lr: "AdamW" },
      learns: [1],
    },
    {
      label: "Schedule",
      kind: "try",
      title: "Warm up, then decay",
      body: (
        <>
          <p>
            The learning rate ramps linearly from almost 0 to its peak of 6e-4 over 715 steps, then follows half a cosine down to 6e-5 at step 19,073.
            Drag the sliders and watch the curve and the token count.
          </p>
          <p>The decay matters as much as the warmup: small steps late in training let the model settle into a minimum instead of bouncing around it.</p>
        </>
      ),
      predict: {
        question: "Why not start at the full 6e-4 on step 0?",
        options: [
          "To save compute while the model is still bad",
          "The weights are random and Adam's statistics are fresh, so full-size steps can blow training up",
          "Weight decay needs time to start working",
          "So the model memorizes the first batches",
        ],
        answer: 1,
        explain: (
          <>
            At initialization the gradients are large and erratic, and v has averaged only a handful of them, so the first steps can be badly sized. A
            short ramp keeps early updates small until the statistics settle. Skipping warmup often shows up as an early loss spike or divergence.
          </>
        ),
      },
      code: { ranges: [[6, 16], [35, 37]], caption: "get_lr is called every step and written into each parameter group." },
      rail: { lr: "6e-4 peak" },
      learns: [2],
    },
    {
      label: "Clipping",
      kind: "mechanism",
      title: "Clip the gradient norm at 1.0",
      body: (
        <>
          <p>
            After the backward passes, compute one number: the norm of the whole gradient, the square root of the sum of squares of all 124M entries. If
            it is above 1.0, scale every entry down by the same factor so the norm becomes exactly 1.0. The direction is kept; only the length is capped.
          </p>
          <p>
            This stops one unlucky batch from throwing the weights far off in a single step. The norm is also a cheap health check: steady is good,
            repeated spikes mean trouble.
          </p>
        </>
      ),
      code: { ranges: [[34, 34]], caption: "Returns the norm before clipping, which is worth logging." },
      learns: [2],
    },
    {
      label: "Precision",
      kind: "mechanism",
      title: "Fewer bits, same range",
      body: (
        <>
          <p>
            A float has a sign bit, exponent bits (how large or small it can get) and mantissa bits (how precise it is). fp32 uses 8 and 23.{" "}
            <strong>bf16</strong> keeps fp32&apos;s 8 exponent bits and cuts the mantissa to 7: the same range with about 3 significant digits.{" "}
            <strong>tf32</strong> is a tensor-core mode that rounds fp32 matmul inputs to a 10-bit mantissa.
          </p>
          <p>
            Networks tolerate the lost precision, and the hardware rewards it: an A100 does 312 TFLOPS in bf16 against 19.5 in fp32, and half the bytes
            means half the memory traffic. <code>torch.autocast</code> runs the matmuls in bf16 while weights and sensitive ops stay in fp32.
          </p>
        </>
      ),
      predict: {
        question: "Why does fp16 training need loss scaling while bf16 does not?",
        options: ["bf16 has more mantissa bits", "bf16 keeps fp32's 8 exponent bits, so tiny gradients do not underflow", "bf16 is secretly computed in fp32", "fp16 cannot store negative numbers"],
        answer: 1,
        explain: (
          <>
            fp16&apos;s 5 exponent bits bottom out near 6e-5 for normal numbers (6e-8 with subnormals), so small gradients round to zero; loss scaling
            multiplies the loss up to keep them representable. bf16 reaches down to about 1e-38 like fp32. It gives up precision, not range.
          </>
        ),
      },
      code: { ranges: [[18, 18], [30, 31]], caption: "tf32 for any fp32 matmul; bf16 autocast for the forward pass." },
      rail: { dtype: "bf16 autocast" },
      learns: [3],
    },
    {
      label: "Kernels",
      kind: "insight",
      title: "Flash attention never writes the T × T matrix",
      body: (
        <>
          <p>
            On a GPU, arithmetic is cheap and moving data is not. Standard attention writes the scores S and probabilities P, each T × T per head, out
            to slow GPU memory and reads them back. <strong>Flash attention</strong> is one fused kernel that streams tiles of K and V through fast
            on-chip SRAM with an online softmax, so that matrix never leaves the chip. The output is exactly the same.
          </p>
          <p>
            <code>torch.compile</code> does the same for other chains of operations: fewer kernels, fewer trips to memory. In nanoGPT flash attention
            is one call: <code>F.scaled_dot_product_attention(q, k, v, is_causal=True)</code>.
          </p>
        </>
      ),
      keyIdea: "Flash attention is exact attention with less memory traffic, not an approximation.",
      code: { ranges: [[19, 19]], caption: "torch.compile fuses kernels; the model's attention calls the flash kernel." },
      learns: [3],
    },
    {
      label: "6ND",
      kind: "mechanism",
      title: "Napkin math: 6 × N × D",
      body: (
        <>
          <p>
            Training costs about <strong>6 FLOPs per parameter per token</strong>: 2 in the forward pass (a multiply and an add per weight) and about 4
            in the backward pass (gradients for the activations and for the weights). GPT-2 small on 10B tokens: 6 × 124M × 10B = {sci(RUN.flops, 2)}{" "}
            FLOPs.
          </p>
          <p>
            An A100 peaks at 312 TFLOPS in bf16 and a good run gets about 40% of that, {sci(312e12 * 0.4, 3)} FLOP/s. Divide: about{" "}
            {commas(RUN.gpuHours * 3600)} seconds, {RUN.gpuHours.toFixed(1)} GPU-hours, or {RUN.wallHours.toFixed(1)} hours on 8 GPUs.
          </p>
        </>
      ),
      keyIdea: "Training FLOPs ≈ 6ND. Divide by peak FLOPS × utilization to get GPU-seconds.",
      code: { ranges: [[7, 7]], caption: "D = 19,073 steps × 524,288 tokens = 10B." },
      rail: { compute: `${sci(RUN.flops, 2)} FLOPs` },
      learns: [4],
    },
    {
      label: "Try it",
      kind: "try",
      title: "Price a training run",
      body: (
        <>
          <p>Pick a real run or drag the sliders. The time is 6ND divided by what your GPUs actually deliver.</p>
          <p>
            The marker shows training tokens per parameter. The Chinchilla paper (2022) found that, for a fixed compute budget, the best loss comes from
            about <strong>20 tokens per parameter</strong>. GPT-3 used under 2. Recent small models go far past 20 on purpose: a smaller model trained
            longer is cheaper to serve.
          </p>
        </>
      ),
      changed: ["Four real runs as presets", "The saffron marker moves along a tokens-per-parameter scale; the green band is about 20"],
      rail: { compute: "your run" },
      learns: [4],
    },
    {
      label: "Recap",
      kind: "recap",
      title: "One training step at scale",
      body: (
        <>
          <p>
            Each step sees 524,288 tokens: 8 micro-batches of 64 × 1,024 under bf16 autocast, each loss divided by 8 so <code>.grad</code> accumulates
            the big-batch gradient. Then clip the norm to 1.0, set the learning rate from warmup plus cosine, take an AdamW step, and zero the gradients.
          </p>
          <p>
            Flash attention and <code>torch.compile</code> compute the same math with less data movement. The bill is about 6ND FLOPs, and about 20
            tokens per parameter is compute-optimal.
          </p>
        </>
      ),
      code: { ranges: [[26, 38]], caption: "The whole step, from micro-batches to optimizer.step()." },
      rail: { batch: commas(TOTAL_BATCH), accum: `${GRAD_ACCUM} × ${commas(MICRO_B * T)}`, lr: "6e-4 peak", dtype: "bf16 autocast", compute: `${sci(RUN.flops, 2)} FLOPs` },
      learns: [0, 1, 2, 3, 4],
    },
  ],
  Stage,
};

export default lesson;
