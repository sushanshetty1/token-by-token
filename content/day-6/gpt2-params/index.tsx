"use client";

import type { LessonModule } from "@/lib/types";
import { Stage } from "./Stage";
import { bytes, commas, count, pct, short, SMALL } from "./count";

const S = count(SMALL);

const CODE = `from dataclasses import dataclass

@dataclass
class GPTConfig:
    n_layer: int = 12
    n_embd: int = 768        # C
    n_head: int = 12         # splits C into heads; no effect on the count
    vocab_size: int = 50257
    block_size: int = 1024

def count_params(cfg):
    C, V = cfg.n_embd, cfg.vocab_size
    wte = V * C                                   # token embedding
    wpe = cfg.block_size * C                      # position embedding
    ln = 2 * C                                    # gamma and beta
    attn = (C * 3 * C + 3 * C) + (C * C + C)      # c_attn (q, k, v) + c_proj
    mlp = (C * 4 * C + 4 * C) + (4 * C * C + C)   # c_fc + c_proj
    block = ln + attn + ln + mlp                  # = 12 C^2 + 13 C
    ln_f = 2 * C
    lm_head = 0                                   # tied to wte: no new weights
    return wte + wpe + cfg.n_layer * block + ln_f + lm_head

cfg = GPTConfig()
n = count_params(cfg)
print(f"{n:,}")                     # 124,439,808

model = GPT(cfg)                    # the module from Day 5
print(sum(p.numel() for p in model.parameters()))  # 124439808: the tied weight counts once

def gigabytes(n_params, bytes_per_param):
    return n_params * bytes_per_param / 1e9

print(gigabytes(n, 4))     # fp32 weights:   0.50 GB
print(gigabytes(n, 2))     # bf16 weights:   0.25 GB
print(gigabytes(n, 16))    # AdamW training: about 2 GB, before activations
`;

const lesson: LessonModule = {
  rail: [
    { id: "part", label: "Counting" },
    { id: "count", label: "This part" },
    { id: "running", label: "Running total" },
    { id: "share", label: "Share of model" },
  ],
  learn: [
    "Account for all 124,439,808 parameters of GPT-2 small",
    "Explain what wte and wpe store and where their shapes come from",
    "Derive 12C² + 13C for one block and say why n_head does not change it",
    "Explain weight tying and why it is allowed",
    "Estimate memory for inference and for AdamW training",
  ],
  legend: [
    { label: "embeddings (wte, wpe)", color: "var(--accent)", shape: "square" },
    { label: "attention", color: "var(--violet)", shape: "square" },
    { label: "MLP", color: "var(--ok)", shape: "square" },
    { label: "LayerNorm", color: "var(--ink-3)", shape: "square" },
    { label: "the part being counted", color: "var(--mark)", shape: "square" },
  ],
  code: { filename: "count_params.py", source: CODE, note: "Every number on the stage comes from these formulas." },
  steps: [
    {
      label: "Config",
      kind: "intuition",
      title: "Five numbers define GPT-2 small",
      body: (
        <>
          <p>
            GPT-2 small is described by a handful of numbers: 12 layers, C = 768 channels, 12 heads, a vocabulary of 50,257 tokens and a context of
            1,024 positions. Every parameter is one weight in a matrix whose shape comes from these numbers.
          </p>
          <p>So you can count them on paper. By the end of this lesson you will have placed all 124,439,808 of them.</p>
        </>
      ),
      predict: {
        question: "Sort the parameters into four piles: the token embedding wte, the position embedding wpe, all 12 attention layers, and all 12 MLPs. Which pile is biggest?",
        options: ["The token embedding wte", "The position embedding wpe", "All 12 attention layers", "All 12 MLPs"],
        answer: 3,
        explain: (
          <>
            The MLPs hold {short(S.mlp)} ({pct(S.mlp, S.total)}), wte {short(S.wte)} ({pct(S.wte, S.total)}), attention {short(S.attn)} (
            {pct(S.attn, S.total)}) and wpe only {short(S.wpe)}. Each MLP has 8C² weights against attention&apos;s 4C², and there are 12 of each.
          </>
        ),
      },
      code: { ranges: [[3, 9]], caption: "The whole architecture, as far as counting is concerned." },
      rail: { part: "config", count: "?", running: "0", share: "?" },
      learns: [0],
    },
    {
      label: "wte",
      kind: "mechanism",
      title: `The token embedding: ${short(S.wte)}`,
      body: (
        <>
          <p>
            <code>wte</code> is a lookup table with one row per token: 50,257 rows of 768 numbers. That is 50,257 × 768 ={" "}
            <strong>{commas(S.wte)}</strong> parameters, already {pct(S.wte, S.total)} of the model.
          </p>
          <p>
            It is big because the vocabulary is big. A forward pass reads only T of its rows, but all of them have to be stored, and the optimizer keeps
            state for every one.
          </p>
        </>
      ),
      changed: ["The wte row fills in, and its bar is drawn to scale"],
      code: { ranges: [[13, 13]], caption: "vocab_size × C." },
      rail: { part: "wte", count: commas(S.wte), running: short(S.wte), share: pct(S.wte, S.total) },
      learns: [1],
    },
    {
      label: "wpe",
      kind: "mechanism",
      title: "The position embedding: under 1%",
      body: (
        <>
          <p>
            <code>wpe</code> has one learned row per position: 1,024 × 768 = <strong>{commas(S.wpe)}</strong> parameters, {pct(S.wpe, S.total)} of the
            model. Its size is set by <code>block_size</code>, the longest context GPT-2 can read.
          </p>
          <p>
            That small table is also a hard limit: there is no row 1,025, so GPT-2 cannot read a longer sequence. Newer models use rotary embeddings
            (Day 7), which have no table and no parameters at all.
          </p>
        </>
      ),
      code: { ranges: [[14, 14]], caption: "block_size × C." },
      rail: { part: "wpe", count: commas(S.wpe), running: short(S.wte + S.wpe), share: pct(S.wpe, S.total) },
      learns: [1],
    },
    {
      label: "One block",
      kind: "mechanism",
      title: `Inside one block: ${(S.perBlock / 1e6).toFixed(2)}M`,
      body: (
        <>
          <p>
            Attention&apos;s <code>c_attn</code> maps C to 3C (queries, keys and values at once): 768 × 2,304 weights plus 2,304 biases ={" "}
            {commas(S.cAttn)}. Its <code>c_proj</code> is C × C + C = {commas(S.attnProj)}. The MLP&apos;s <code>c_fc</code> is C × 4C + 4C ={" "}
            {commas(S.cFc)} and its <code>c_proj</code> 4C × C + C = {commas(S.mlpProj)}. Two LayerNorms add 2C each.
          </p>
          <p>
            Sum: <strong>{commas(S.perBlock)}</strong>, which is 12C² + 13C. <code>n_head</code> never appears: heads split the same C channels, they
            do not add weights.
          </p>
        </>
      ),
      keyIdea: "One block is about 12C² parameters: 4C² in attention, 8C² in the MLP.",
      changed: ["The block row opens into its six weight tensors", "Bars now compare parts of one block"],
      code: { ranges: [[15, 18]], caption: "Two LayerNorms, attention, MLP." },
      rail: { part: "one block", count: commas(S.perBlock), share: `${pct(S.perBlock, S.total)} each` },
      learns: [2],
    },
    {
      label: "× 12",
      kind: "mechanism",
      title: "Twelve blocks and the head",
      body: (
        <>
          <p>
            Twelve identical blocks: 12 × {commas(S.perBlock)} = <strong>{commas(S.blocks)}</strong>, {pct(S.blocks, S.total)} of the model. The
            final LayerNorm <code>ln_f</code> adds {commas(S.lnF)}.
          </p>
          <p>
            Then <code>lm_head</code>, the <code>Linear(768, 50257)</code> that produces the logits. It should cost another {short(S.wte)}{" "}
            parameters. In GPT-2 it costs zero.
          </p>
        </>
      ),
      changed: ["The blocks bar splits into attention (violet) and MLP (green)", "lm_head is drawn as a dashed outline: no weights of its own"],
      code: { ranges: [[19, 21]], caption: "n_layer copies of the block, plus ln_f. lm_head adds nothing." },
      rail: { part: "12 blocks", count: commas(S.blocks), running: short(S.total), share: pct(S.blocks, S.total) },
      learns: [2],
    },
    {
      label: "Tying",
      kind: "insight",
      title: "Weight tying: one matrix, used twice",
      body: (
        <>
          <p>
            <code>lm_head</code> needs a 50,257 × 768 matrix, exactly the shape of <code>wte</code>, and GPT-2 uses the same tensor for both. At the
            input, row i is the vector for token i. At the output, the logit for token i is the dot product of the final vector with row i: a token
            scores high when the output points the same way as that token&apos;s embedding.
          </p>
          <p>
            That is a sensible constraint, not a hack: tokens that mean similar things should look similar both as inputs and as predictions. The
            gradients from both uses add into the one matrix.
          </p>
        </>
      ),
      predict: {
        question: "If GPT-2 small did not tie these weights, how many parameters would it have?",
        options: ["124.4M: tying changes nothing", short(S.untied), "201.6M", "248.9M"],
        answer: 1,
        explain: (
          <>
            {commas(S.total)} + {commas(S.wte)} = {commas(S.untied)}. An untied lm_head would be as big as wte, and bigger than all 12 attention layers
            put together.
          </>
        ),
      },
      code: { ranges: [[20, 20]], caption: "In the model this is one line: self.lm_head.weight = self.wte.weight." },
      rail: { part: "lm_head", count: "0 (tied)", share: `saves ${short(S.wte)}` },
      learns: [3],
    },
    {
      label: "Total",
      kind: "insight",
      title: `${commas(S.total)}, and where they live`,
      body: (
        <>
          <p>
            Add it up: {commas(S.wte)} + {commas(S.wpe)} + {commas(S.blocks)} + {commas(S.lnF)} = <strong>{commas(S.total)}</strong>. Grouped by job,
            the MLPs hold {pct(S.mlp, S.total)}, the token embedding {pct(S.wte, S.total)}, attention {pct(S.attn, S.total)}, positions{" "}
            {pct(S.wpe, S.total)}, and all 25 LayerNorms together {pct(S.norms, S.total, 2)}.
          </p>
          <p>
            The mix shifts with size. The embedding grows like V × C but the blocks like 12 × n_layer × C², so in big models the blocks dominate: in
            GPT-3 the token embedding is under 0.4% of the total.
          </p>
        </>
      ),
      changed: ["The total fills in", "The stacked bar groups every parameter by job"],
      code: { ranges: [[23, 28]], caption: "PyTorch agrees: parameters() yields the shared tensor once." },
      rail: { part: "total", count: commas(S.total), running: short(S.total), share: "100%" },
      learns: [0, 2],
    },
    {
      label: "Memory",
      kind: "mechanism",
      title: "Parameters times bytes",
      body: (
        <>
          <p>
            Memory is parameters × bytes per parameter. In fp32 (4 bytes) GPT-2 small&apos;s weights take {bytes(S.total * 4)}; in bf16 (2 bytes),{" "}
            {bytes(S.total * 2)}. That is roughly what you need to run it.
          </p>
          <p>
            Training needs far more. A common rule of thumb for AdamW with mixed precision is about <strong>16 bytes per parameter</strong>: bf16
            weights and gradients (2 + 2), an fp32 master copy of the weights (4), and Adam&apos;s two moment estimates (4 + 4). For GPT-2 small that is
            about {bytes(S.total * 16)}, before activations, which grow with batch size and context length.
          </p>
        </>
      ),
      keyIdea: "Serving: about 2 bytes per parameter in bf16. Training with AdamW: about 16, plus activations.",
      code: { ranges: [[30, 35]], caption: "Bytes per parameter is the whole formula." },
      rail: { part: "memory", count: `${bytes(S.total * 16)} to train`, share: "16 bytes each" },
      learns: [4],
    },
    {
      label: "Try it",
      kind: "try",
      title: "Count any GPT",
      body: (
        <>
          <p>
            Pick a preset or drag the sliders. Doubling C quadruples every block, while doubling the vocabulary only doubles the embedding. Change{" "}
            <code>n_head</code> and notice that nothing moves.
          </p>
          <p>
            The GPT-3 preset gives 174.6B from the same formula; the paper rounds it to 175B. Watch the training line to see why large models are
            trained across many GPUs.
          </p>
        </>
      ),
      changed: ["Presets for GPT-2 small, medium, large, XL and GPT-3", "Every number is recomputed from the formulas in the code"],
      code: { ranges: [[11, 21]], caption: "The calculator runs exactly this function." },
      rail: { part: "your model" },
      learns: [2, 4],
    },
    {
      label: "Recap",
      kind: "recap",
      title: "124M, from memory",
      body: (
        <>
          <p>
            wte: V × C = {short(S.wte)}. wpe: 1,024 × C = {short(S.wpe)}. Each block: 12C² + 13C = {(S.perBlock / 1e6).toFixed(2)}M, so{" "}
            {short(S.blocks)} for 12. ln_f: 2C. lm_head: tied to wte, zero. Total {commas(S.total)}.
          </p>
          <p>
            The MLPs are the biggest pile, heads cost nothing, and memory is parameters × bytes: about 2 bytes each to serve in bf16, about 16 each to
            train with AdamW.
          </p>
        </>
      ),
      code: { ranges: [[11, 21]] },
      rail: { part: "recap", count: commas(S.total), running: short(S.total), share: "100%" },
      learns: [0, 1, 2, 3, 4],
    },
  ],
  Stage,
};

export default lesson;
