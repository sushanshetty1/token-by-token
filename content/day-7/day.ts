import type { DayContent } from "@/lib/types";

const day: DayContent = {
  n: 7,
  title: "From GPT to ChatGPT",
  tagline: "Pretraining, midtraining, SFT and RL: how a text predictor becomes an assistant.",
  outcome: "You can draw the whole path from memory and explain the full ChatGPT training pipeline.",
  stations: ["text", "tokens", "embed", "attention", "mlp", "logits", "sample", "loss", "backprop", "update"],
  schedule: [
    { label: "Lessons in this app", minutes: 40 },
    { label: "Read nanochat with DeepWiki", minutes: 50 },
    { label: "The whiteboard test", minutes: 20 },
    { label: "Interview drill and mini project plan", minutes: 40 },
  ],
  lessons: [
    { slug: "post-training", title: "From GPT to ChatGPT", promise: "Follow nanochat's pipeline: pretrain, midtrain, SFT, RL, and the chat template.", minutes: 15, level: "Core" },
    { slug: "modern", title: "What changed since GPT-2", promise: "RoPE, RMSNorm, SwiGLU, grouped-query attention and mixture of experts.", minutes: 12, level: "Deep" },
    { slug: "whiteboard", title: "The whiteboard test", promise: "Rebuild the whole path from memory, then face the interview drill.", minutes: 15, level: "Core" },
  ],
  watch: [
    { kind: "code", title: "karpathy/nanochat", by: "GitHub", url: "https://github.com/karpathy/nanochat", why: "The full ChatGPT pipeline in one small repo. Read speedrun.sh first, then each stage. Do not run it." },
    { kind: "read", title: "Ask questions about nanochat on DeepWiki", by: "DeepWiki", url: "https://deepwiki.com/karpathy/nanochat", why: "Ask where each stage lives and what data it uses." },
    {
      kind: "video",
      title: "Deep Dive into LLMs like ChatGPT (post-training sections)",
      by: "Andrej Karpathy",
      url: "https://www.youtube.com/watch?v=7xTGNNLPyMI",
      minutes: 60,
      why: "Optional. The clearest non-code explanation of SFT, RL and RLHF. Watch at 2x.",
    },
  ],
  build: [
    "Read speedrun.sh top to bottom and write one line per stage: what data, what loss, what changes in the model.",
    "Find the chat template in nanochat's tokenizer and write out how one user/assistant turn becomes tokens.",
    "Do the whiteboard test in this app, then on paper. Compare with your Day 1 drawing.",
  ],
  aiPrompts: [
    "Be my tutor for karpathy/nanochat. Walk me through speedrun.sh one stage at a time (tokenizer, base_train, midtraining or the SFT that replaced it, chat_sft, chat_rl, the chat engine). For each stage tell me the data, the loss, what changes in the model and the file to read. Do not write code. After each stage, ask me one question and correct my answer.",
    "Write a compact PyTorch function render_conversation(tok, messages) that turns alternating user and assistant messages into token ids and a 0/1 loss mask with the special tokens <|bos|>, <|user_start|>, <|user_end|>, <|assistant_start|>, <|assistant_end|>. Then write one SFT step that sets masked targets to -1 and uses cross_entropy with ignore_index=-1. Keep it under 40 lines, then quiz me on every line.",
    "Interview me on modern LLM architecture. Ask me, one at a time, to explain RoPE, RMSNorm, SwiGLU, grouped-query attention and mixture of experts. After each answer, ask one sharp follow-up (for example the KV cache size for a given config, or total versus active parameters) and tell me exactly what I got wrong or left out.",
  ],
  experiments: [
    {
      title: "Base model versus chat model",
      predict: "You paste \"What is the capital of France?\" into a base model. Will it answer, and what changes if you write \"Q: What is the capital of France? A:\" instead?",
      how: "Use any base checkpoint and its chat version (nanochat's base and SFT checkpoints with chat_cli, or a hosted base and instruct pair). Send the bare question to both, then the Q/A-framed version to the base model. Sample a few times each.",
      expect: "The base model often continues the document instead: more questions, a quiz page, a forum post. With the Q/A framing it usually answers, because the answer is now the likely continuation. The chat model answers either way, because SFT taught it the template and the behaviour.",
    },
    {
      title: "Problems that teach nothing",
      predict: "In group-relative RL on GSM8K, what fraction of problems give zero gradient at the start of training?",
      how: "Take a small chat model, sample 8 answers for each of 50 GSM8K problems, score each with the answer checker, and count the problems where all 8 are right or all 8 are wrong.",
      expect: "All-right and all-wrong groups have advantage 0 for every sample, so they contribute nothing. A weak model has many all-wrong groups, a strong one many all-right groups. The learning comes from problems the model sometimes solves, which is why RL works best on problems at the edge of its ability.",
    },
    {
      title: "A KV cache budget",
      predict: "With 40 GB for the KV cache, how many 8,192-token sequences of a Llama 2 7B shaped model (32 layers, 32 heads of size 128, fp16) fit with 32 K/V heads? With 8?",
      how: "Compute bytes per token = 2 x n_layer x n_kv_head x head_size x 2 bytes, multiply by 8,192, and divide 40 GB by it. Check it by allocating the K and V tensors in PyTorch and reading torch.cuda.memory_allocated().",
      expect: "32 K/V heads: 512 KiB per token, 4 GiB per sequence, about 9 sequences. 8 K/V heads: 128 KiB per token, 1 GiB per sequence, about 37 sequences. Same weights, four times the concurrent users or context.",
    },
  ],
  checks: [
    {
      q: "What is the difference between pretraining, SFT and RL?",
      a: "Pretraining trains a randomly initialised transformer with next-token cross-entropy on huge amounts of web text; it is where knowledge and language come from, and almost all of the compute. SFT continues training on curated conversations rendered with a chat template, usually with the loss masked to the assistant's tokens; it teaches format and behaviour. RL samples the model's own answers, scores them with a reward (a verifier, a reward model or preferences) and raises the probability of better-than-average answers; it shapes reasoning strategies and preferences rather than adding facts.",
    },
    {
      q: "What is a chat template?",
      a: "A fixed way to render a conversation into one token sequence, with special tokens that mark the turns. In nanochat it is <|bos|>, then <|user_start|> message <|user_end|>, then <|assistant_start|> reply <|assistant_end|>, repeated. At inference the engine renders the history, appends <|assistant_start|> and samples until the model emits <|assistant_end|>. Serving a model with a different template from the one it was trained on degrades it, because it learned to predict tokens in that exact format.",
    },
    {
      q: "Why mask the SFT loss to the assistant's tokens?",
      a: "The goal is p(answer | conversation), not imitating the user. Positions whose target is a user, special or tool-output token get target -1, which cross_entropy ignores, so all of the gradient comes from the assistant's tokens; the prompt still sits in the context and conditions every prediction. Tool outputs are masked too, because the engine supplies them at inference. Masking is the common default; training on the prompt as well is possible, but it spends learning on text you never want the model to generate.",
    },
    {
      q: "Compare RLHF with a reward model, DPO, and RL with verifiable rewards.",
      a: "RLHF (InstructGPT) collects human rankings, trains a reward model to score responses, then optimises the policy with PPO against that score, with a KL penalty that keeps it near the SFT model; it is powerful but complex, and the policy can exploit the reward model. DPO drops the reward model and the sampling loop: one loss on (chosen, rejected) pairs raises the chosen answer's log-probability ratio against a frozen reference relative to the rejected one. RL with verifiable rewards scores samples with a program, such as a correct math answer or passing tests, which is hard to fool but only works for checkable tasks; nanochat's chat_rl and reasoning models use it.",
    },
    {
      q: "How does RoPE encode position, and why is it preferred to a learned position table?",
      a: "RoPE splits each query and key into pairs of dimensions and rotates pair i by the angle position x θ_i, with θ_i = 10000^(-2i/head_size). Rotating q by mθ and k by nθ leaves their dot product depending only on (m - n)θ, so attention scores depend on relative distance. It adds no parameters, is applied to q and k but not v, and has no fixed table to outgrow, so context can be extended with position interpolation or YaRN plus some long-context training.",
    },
    {
      q: "What is grouped-query attention and why does it matter?",
      a: "In multi-head attention every query head has its own key and value head. In grouped-query attention several query heads share one K/V head; multi-query attention is the extreme with a single K/V head. Only K/V heads are cached during generation, so the KV cache shrinks by n_head / n_kv_head: for a 32-layer model with 128-dim heads in fp16, 32 K/V heads cost 512 KiB per token and 8 cost 128 KiB. Decoding is memory-bandwidth bound, so a smaller cache means longer contexts, larger batches and faster tokens, for a small quality cost.",
    },
    {
      q: "In a mixture-of-experts model, what is the difference between total and active parameters?",
      a: "An MoE layer replaces the MLP with many experts and a router that sends each token to its top-k experts, weighting their outputs by the router's gate values. Total parameters count every expert, and all of them must sit in memory; active parameters count what one token actually uses (the shared attention and embeddings plus k experts), which sets the compute per token. Mixtral 8x7B has about 47B total and 13B active; DeepSeek-V3 has 671B total and 37B active. Training adds a load-balancing loss so the router does not overload a few experts.",
    },
    {
      q: "How does a tool call work at inference time?",
      a: "The model is trained to emit a special pattern, in nanochat <|python_start|> expression <|python_end|>. The inference engine watches the sampled tokens; when it sees the end token it runs the expression in a sandbox (nanochat uses a restricted calculator with a timeout) and forces <|output_start|> result <|output_end|> into the sequence instead of sampling. The model then continues with the result in its context and KV cache. In training those output tokens have mask 0, so the model learns to call the tool, not to predict its result.",
    },
  ],
  explainOutLoud: [
    "A base model completes documents; post-training teaches it the chat format, behaviour and preferences on top of what pretraining put in.",
    "SFT is the same next-token loss on conversations, masked so only the assistant's tokens are graded.",
    "Group-relative RL raises the probability of answers that beat their group's average reward and lowers the rest.",
    "RoPE rotates q and k by position so attention depends on relative distance, and GQA shares K/V heads to shrink the KV cache.",
    "A mixture-of-experts layer routes each token to a few experts, so total parameters grow while compute per token stays small.",
  ],
};

export default day;
