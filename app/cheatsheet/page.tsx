import Link from "next/link";

export const metadata = { title: "Interview cheat sheet" };

const SHAPES = [
  { stage: "Token ids", shape: "(B, T)", note: "integers from the tokenizer" },
  { stage: "Token embedding", shape: "(B, T, C)", note: "wte[idx], a lookup" },
  { stage: "Plus position embedding", shape: "(B, T, C)", note: "wpe[0..T-1], broadcast over B" },
  { stage: "Q, K, V for one head", shape: "(B, T, hs)", note: "hs = C / n_head" },
  { stage: "Attention scores", shape: "(B, n_head, T, T)", note: "q @ k.transpose(-2, -1)" },
  { stage: "Attention output", shape: "(B, T, C)", note: "heads concatenated, then projected" },
  { stage: "MLP hidden", shape: "(B, T, 4C)", note: "expand, GELU, project back" },
  { stage: "After every block", shape: "(B, T, C)", note: "the residual stream keeps its shape" },
  { stage: "Logits", shape: "(B, T, vocab_size)", note: "lm_head after ln_f" },
  { stage: "Loss", shape: "() scalar", note: "cross-entropy over B * T positions" },
];

const FORMULAS: { name: string; f: string; say: string }[] = [
  { name: "Softmax with temperature", f: "p_i = exp(z_i / τ) / Σ_j exp(z_j / τ)", say: "Only differences between logits matter. τ < 1 sharpens, τ > 1 flattens." },
  { name: "Cross-entropy loss", f: "L = -log p(correct next token)", say: "A uniform guess over V tokens gives ln(V): 4.17 for 65 characters, 10.82 for GPT-2's 50,257." },
  { name: "Perplexity", f: "PPL = exp(L)", say: "The effective number of tokens the model is choosing between." },
  { name: "Scaled dot-product attention", f: "softmax(Q Kᵀ / √d_k + M) V", say: "M is -∞ above the diagonal (causal mask). √d_k keeps scores from growing with head size." },
  { name: "Residual block (pre-norm)", f: "x = x + attn(LN(x));  x = x + mlp(LN(x))", say: "Blocks add to the stream, so gradients flow straight through the additions." },
  { name: "LayerNorm vs RMSNorm", f: "γ (x - μ) / √(σ² + ε) + β    vs    γ x / √(mean(x²) + ε)", say: "Per token, across channels. RMSNorm skips the mean and the shift." },
  { name: "Parameters of a GPT", f: "N ≈ 12 · n_layer · C² + vocab_size · C", say: "4C² for attention, 8C² for the MLP. GPT-2 small: 85M in blocks + 39M embedding = 124M." },
  { name: "Training compute", f: "FLOPs ≈ 6 · N · D", say: "2 for the forward pass, 4 for the backward pass, per parameter per token." },
  { name: "Inference compute", f: "FLOPs ≈ 2 · N per generated token", say: "Decode is usually limited by memory bandwidth, not FLOPs." },
  { name: "KV cache size", f: "2 · n_layer · n_kv_heads · head_size · T · bytes", say: "Per sequence. GPT-2 small at 1,024 tokens in bf16: about 37.7 MB." },
  { name: "Compute-optimal data", f: "D ≈ 20 · N tokens", say: "The Chinchilla rule of thumb." },
  { name: "AdamW step", f: "θ ← θ - lr · (m̂ / (√v̂ + ε) + λ θ)", say: "Momentum m, per-parameter scale v, weight decay applied directly to the weights." },
];

const NUMBERS = [
  ["GPT-2 small", "12 layers, C 768, 12 heads (hs 64), T 1,024, vocab 50,257, 124M parameters"],
  ["GPT-2 XL", "48 layers, C 1,600, 25 heads, 1.5B parameters"],
  ["GPT-3", "96 layers, C 12,288, 96 heads, T 2,048, 175B parameters"],
  ["GPT-2 training batch", "about 0.5M tokens per step, via gradient accumulation"],
  ["Tokens per word", "about 1.3 for English with a GPT-4 class tokenizer"],
  ["Bytes per parameter", "fp32 4, bf16 2, int8 1; training with AdamW about 16"],
];

const GLOSSARY = [
  ["Token", "A piece of text from a fixed vocabulary, represented by an integer id."],
  ["BPE", "Byte pair encoding: start from bytes, repeatedly merge the most frequent adjacent pair."],
  ["Embedding", "A learned vector looked up by token id (or position)."],
  ["Logit", "A raw score for one vocabulary entry before softmax."],
  ["Causal mask", "Stops position t from attending to positions after t."],
  ["Attention head", "One set of Q, K, V projections; several run in parallel."],
  ["Residual stream", "The running vector per token that every block reads from and adds to."],
  ["MLP / FFN", "Per-token network: C to 4C, non-linearity, back to C."],
  ["KV cache", "Stored keys and values of past tokens so decode only processes the new token."],
  ["Prefill / decode", "Process the prompt in parallel / generate one token at a time."],
  ["Top-k / top-p", "Sample only from the k most likely tokens / the smallest set whose probability reaches p."],
  ["Pretraining", "Next-token prediction on huge amounts of text. Where knowledge comes from."],
  ["SFT", "Supervised fine-tuning on conversations, loss only on the assistant's tokens."],
  ["RLHF / DPO", "Learning from preference comparisons, with a reward model and RL, or directly."],
  ["GRPO", "RL that scores a group of sampled answers and pushes up the above-average ones."],
  ["RoPE", "Rotary position embedding: rotate q and k by position-dependent angles."],
  ["GQA / MQA", "Several query heads share one key/value head, shrinking the KV cache."],
  ["MoE", "A router sends each token to a few expert MLPs: many total, few active parameters."],
];

export default function CheatsheetPage() {
  return (
    <main className="mx-auto max-w-[1180px] px-4 pb-24 pt-10 sm:px-6">
      <header className="max-w-[70ch]">
        <h1 className="font-display text-[clamp(2rem,4vw,2.8rem)] font-extrabold leading-[1.02] text-ink">Interview cheat sheet</h1>
        <p className="mt-3 text-[16.5px] text-ink-2">
          The shapes, formulas and numbers that come up again and again. Read it the night before an interview, then go back to the
          lesson for anything you cannot explain.
        </p>
      </header>

      <section className="mt-10">
        <h2 className="font-display text-[1.45rem] font-bold text-ink">Shapes through a GPT</h2>
        <p className="mt-1 text-[14.5px] text-ink-2">B batch, T sequence length, C embedding size, hs head size.</p>
        <div className="panel mt-4 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-[14.5px]">
            <thead>
              <tr className="border-b border-rule text-[13px] text-ink-3">
                <th className="px-4 py-2.5 font-semibold">Stage</th>
                <th className="px-4 py-2.5 font-semibold">Shape</th>
                <th className="px-4 py-2.5 font-semibold">Note</th>
              </tr>
            </thead>
            <tbody>
              {SHAPES.map((r) => (
                <tr key={r.stage} className="border-b border-rule last:border-0">
                  <td className="px-4 py-2.5 font-semibold text-ink">{r.stage}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[13.5px] text-accent">{r.shape}</td>
                  <td className="px-4 py-2.5 text-ink-2">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-[1.45rem] font-bold text-ink">Formulas worth knowing by heart</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {FORMULAS.map((f) => (
            <article key={f.name} className="panel p-4">
              <h3 className="text-[14.5px] font-bold text-ink">{f.name}</h3>
              <p className="mt-2 overflow-x-auto whitespace-nowrap rounded-lg border border-rule bg-card-2 px-3 py-2 font-mono text-[13.5px] text-ink">
                {f.f}
              </p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{f.say}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div>
          <h2 className="font-display text-[1.45rem] font-bold text-ink">Numbers to remember</h2>
          <dl className="panel mt-4 divide-y divide-rule">
            {NUMBERS.map(([k, v]) => (
              <div key={k} className="px-4 py-3">
                <dt className="text-[14px] font-bold text-ink">{k}</dt>
                <dd className="mt-0.5 text-[13.5px] text-ink-2">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <h2 className="font-display text-[1.45rem] font-bold text-ink">Glossary</h2>
          <dl className="panel mt-4 grid divide-y divide-rule sm:grid-cols-2 sm:divide-y-0">
            {GLOSSARY.map(([k, v]) => (
              <div key={k} className="px-4 py-2.5 sm:border-b sm:border-rule">
                <dt className="text-[14px] font-bold text-ink">{k}</dt>
                <dd className="mt-0.5 text-[13px] leading-snug text-ink-2">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <p className="mt-12 text-[14.5px] text-ink-2">
        Ready to test yourself? Take the{" "}
        <Link href="/day/7/whiteboard/" className="font-semibold text-accent underline underline-offset-4">
          whiteboard test
        </Link>{" "}
        or answer the questions at the end of each day.
      </p>
    </main>
  );
}
