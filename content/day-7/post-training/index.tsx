"use client";

import type { LessonModule } from "@/lib/types";
import { Stage } from "./Stage";

const CODE = `# Post-training in the style of nanochat, condensed.
import torch
import torch.nn.functional as F

def render_conversation(tok, conversation):
    ids, mask = [tok.bos], [0]
    def add(token_ids, train):
        ids.extend(token_ids)
        mask.extend([train] * len(token_ids))
    for msg in conversation:
        if msg["role"] == "user":
            add([tok.user_start] + tok.encode(msg["content"]) + [tok.user_end], 0)
        else:
            add([tok.assistant_start], 0)
            add(tok.encode(msg["content"]) + [tok.assistant_end], 1)
    return ids, mask

def sft_loss(model, ids, mask):
    x = torch.tensor(ids[:-1])[None]       # (1, T) inputs
    y = torch.tensor(ids[1:])[None]        # (1, T) targets, shifted by one
    m = torch.tensor(mask[1:])[None]       # 1 where the assistant wrote the target
    y = y.masked_fill(m == 0, -1)          # -1: skip this position
    logits = model(x)                      # (1, T, vocab_size)
    return F.cross_entropy(logits.view(-1, logits.size(-1)), y.view(-1), ignore_index=-1)

def rl_loss(model, prompt_ids, samples, rewards):
    # samples: G answers to one problem, rewards: (G,) with 1.0 = correct
    adv = rewards - rewards.mean()         # better than the group => positive
    total = 0.0
    for answer_ids, a in zip(samples, adv):
        ids = prompt_ids + answer_ids
        x = torch.tensor(ids[:-1])[None]
        y = torch.tensor(ids[1:])
        logp = -F.cross_entropy(model(x)[0], y, reduction="none")  # (T,)
        logp = logp[len(prompt_ids) - 1:]  # only the tokens the model sampled
        total = total - (a * logp).sum()
    return total / sum(len(s) for s in samples)
`;

const lesson: LessonModule = {
  rail: [
    { id: "stage", label: "Stage" },
    { id: "data", label: "Data" },
    { id: "loss", label: "Loss on" },
    { id: "changes", label: "Mostly changes" },
  ],
  learn: [
    "Explain why a base model completes documents instead of answering.",
    "Name nanochat's stages and what each one changes in the model.",
    "Write out how a chat turn becomes tokens, and why SFT masks the loss to assistant tokens.",
    "Explain group-relative RL and compare it with RLHF and DPO.",
    "Describe how a tool call runs at inference time.",
  ],
  legend: [
    { label: "special token", color: "var(--violet)", shape: "square" },
    { label: "trained on (mask 1)", color: "var(--ok)", shape: "square" },
    { label: "masked (mask 0)", color: "var(--rule-strong)", shape: "square" },
    { label: "you are here", color: "var(--mark)" },
    { label: "pushed down", color: "var(--bad)", shape: "square" },
  ],
  code: {
    filename: "post_training.py",
    source: CODE,
    note: "Condensed from the ideas in karpathy/nanochat (tokenizer.render_conversation, chat_sft, chat_rl). Tool-call parts are left out.",
  },
  steps: [
    {
      label: "Completer",
      kind: "problem",
      title: "A base model completes documents",
      body: (
        <>
          <p>
            After pretraining you have a <strong>base model</strong>. Ask it a question and it may answer, or it may write three more
            questions, because a page that starts with a quiz question usually continues with more quiz questions.
          </p>
          <p>
            It is not broken. It does the one thing it was trained for: continue the document. Everything in this lesson is about
            turning that document completer into an assistant, following Karpathy&apos;s nanochat.
          </p>
        </>
      ),
      predict: {
        question: "Without any extra training, what is the most reliable way to get an answer out of a base model?",
        options: [
          "Ask more politely",
          "Shape the prompt as a document where the answer comes next, like \"Q: ... A:\" with a few examples",
          "Raise the temperature so it explores",
          "There is no way; it needs fine-tuning first",
        ],
        answer: 1,
        explain: (
          <>
            A base model follows the document&apos;s pattern. A few question and answer pairs followed by your question make the
            answer the most likely next tokens. That was how people used GPT-3 before chat models existed.
          </>
        ),
      },
      changed: ["The prompt goes into a base model.", "It writes the most likely continuation of a quiz page."],
      rail: { stage: "base model", data: "web text", loss: "every token", changes: "knowledge" },
      learns: [0],
    },
    {
      label: "Pretrain",
      kind: "mechanism",
      title: "Pretraining: next-token loss on the internet",
      body: (
        <>
          <p>
            In nanochat&apos;s first release, <code>base_train</code> trains a 561M-parameter GPT on about 11B tokens of FineWeb-EDU,
            roughly 20 tokens per parameter (the Chinchilla rule of thumb). Frontier models read trillions of tokens.
          </p>
          <p>
            The loss is the one you know: cross-entropy of the next token at <strong>every</strong> position. To lower it on
            &quot;The capital of France is&quot;, the weights must store that Paris is the answer. That is where knowledge comes
            from.
          </p>
        </>
      ),
      keyIdea: "Pretraining is where the model learns facts and language. It is almost all of the compute.",
      changed: ["Inputs and targets are the same text shifted by one.", "Every position is graded."],
      rail: { stage: "pretrain", data: "FineWeb-EDU", loss: "every token", changes: "knowledge" },
      learns: [1],
    },
    {
      label: "Midtrain",
      kind: "mechanism",
      title: "Midtraining: teach the conversation format",
      body: (
        <>
          <p>
            <code>mid_train</code> keeps the same loss but swaps the data: conversations (SmolTalk), multiple choice questions
            (MMLU&apos;s auxiliary set) and math with calculator calls (GSM8K). Each one is rendered with special tokens such as{" "}
            <code>&lt;|user_start|&gt;</code> and <code>&lt;|python_start|&gt;</code>.
          </p>
          <p>
            In the first release this was its own script and trained on every token. In January 2026 nanochat folded this data into{" "}
            <code>chat_sft</code>; the idea is the same.
          </p>
        </>
      ),
      predict: {
        question: "The special tokens are in the tokenizer from day one. What do they mean to the model right after pretraining?",
        options: [
          "Already \"start of the user's turn\", learned from the web",
          "Nothing yet: they never appeared in pretraining text",
          "They are removed and re-added before midtraining",
        ],
        answer: 1,
        explain: (
          <>
            Pretraining documents only contain <code>&lt;|bos|&gt;</code> as a separator. An embedding row only gets a gradient when
            its token appears in the input, so the chat tokens have learned nothing. Midtraining is the first time the model sees them.
          </>
        ),
      },
      changed: ["Three kinds of chat-shaped data.", "Same next-token loss as pretraining."],
      rail: { stage: "midtrain", data: "chats, MC, tools", loss: "every token", changes: "format" },
      learns: [1],
    },
    {
      label: "Template",
      kind: "mechanism",
      title: "The chat template turns a conversation into tokens",
      body: (
        <>
          <p>
            A chat is still one sequence of integers. nanochat&apos;s <code>render_conversation</code> writes{" "}
            <code>&lt;|bos|&gt;</code>, then each user message between <code>&lt;|user_start|&gt;</code> and{" "}
            <code>&lt;|user_end|&gt;</code>, then each reply between <code>&lt;|assistant_start|&gt;</code> and{" "}
            <code>&lt;|assistant_end|&gt;</code>.
          </p>
          <p>
            At chat time the engine renders the history, appends <code>&lt;|assistant_start|&gt;</code>, and samples until the model
            emits <code>&lt;|assistant_end|&gt;</code>. The word splits on the stage are illustrative.
          </p>
        </>
      ),
      keyIdea: "A chat model is a next-token predictor on documents that look like chat transcripts.",
      code: { ranges: [[5, 16]], caption: "Each piece is appended with a 0 or 1: whether the model is trained to predict it." },
      changed: ["Two messages become 11 tokens.", "Special tokens (violet) mark the turns."],
      rail: { stage: "chat template", data: "conversations" },
      learns: [2],
    },
    {
      label: "SFT mask",
      kind: "mechanism",
      title: "SFT: the same loss, masked to the assistant",
      body: (
        <>
          <p>
            Supervised fine-tuning (<code>chat_sft</code>) trains on high-quality conversations, one per row. The loss is still
            cross-entropy, but positions whose target is not assistant text get target <code>-1</code>, which{" "}
            <code>ignore_index</code> skips.
          </p>
          <p>
            The model still <strong>reads</strong> the user&apos;s tokens: they are in the context and shape every prediction. It is
            just never graded on producing them.
          </p>
        </>
      ),
      predict: {
        question: "Why mask the user's tokens out of the loss?",
        options: [
          "Backprop cannot reach user tokens",
          "We want to learn to answer, not to imitate the user; grading the prompt spends learning on text we never want generated",
          "It makes the forward pass faster",
          "The tokenizer cannot encode user text",
        ],
        answer: 1,
        explain: (
          <>
            The goal is p(answer | conversation). Training on the prompt would teach the model to write questions like a user, and
            mix noisy user text into the signal. The compute is the same either way; only the gradient changes.
          </>
        ),
      },
      code: { ranges: [[18, 24]], caption: "Masked targets become -1 and cross_entropy ignores them." },
      changed: ["A mask row under each token.", "Only 3 of 11 positions are graded."],
      rail: { stage: "SFT", data: "curated chats", loss: "assistant tokens", changes: "behaviour" },
      learns: [2],
    },
    {
      label: "RL",
      kind: "mechanism",
      title: "RL: sample, score, and prefer the better answers",
      body: (
        <>
          <p>
            <code>chat_rl</code> takes a GSM8K problem, samples a group of answers (16 by default), and gives each a reward of 1 if the
            final number is right. The <strong>advantage</strong> is reward minus the group mean.
          </p>
          <p>
            The loss is the log-probability of each sampled token times its answer&apos;s advantage, so above-average answers become
            more likely and below-average ones less likely. GRPO also divides by the group&apos;s standard deviation and adds clipping
            and a KL penalty; nanochat drops those, which makes it close to plain REINFORCE with a group baseline.
          </p>
        </>
      ),
      predict: {
        question: "All four samples for a problem are correct, so every reward is 1. What does the model learn from this problem?",
        options: [
          "A strong push toward all four answers",
          "Nothing: every advantage is 0",
          "A push away from them, to keep exploring",
          "It depends on the learning rate",
        ],
        answer: 1,
        explain: (
          <>
            The mean is 1, so each advantage is 1 - 1 = 0 and the gradient is zero. Problems that are always solved, or never solved,
            teach nothing. The signal comes from problems the model sometimes gets right.
          </>
        ),
      },
      code: { ranges: [[26, 37]], caption: "Advantage is reward minus the group mean; it weights the log-probability of every sampled token." },
      changed: ["Four sampled answers with rewards.", "Advantages: +0.5 for right, -0.5 for wrong."],
      rail: { stage: "RL", data: "GSM8K problems", loss: "sampled answers", changes: "reasoning" },
      learns: [3],
    },
    {
      label: "Try it",
      kind: "try",
      title: "Flip the samples and watch the signal",
      body: (
        <>
          <p>
            Click a sampled answer to flip it between right and wrong. Watch the group mean, the advantages, and the total push.
          </p>
          <p>
            Try one right and three wrong: the lone right answer gets +0.75, a much bigger push than in a half-right group. Then make
            them all match and the signal vanishes.
          </p>
        </>
      ),
      keyIdea: "The group mean is the baseline. Only differences inside a group teach the model anything.",
      changed: ["Each row is a button.", "Advantages recompute as you click."],
      learns: [3],
    },
    {
      label: "Preferences",
      kind: "insight",
      title: "RLHF, DPO and verifiable rewards",
      body: (
        <>
          <p>
            <strong>RLHF</strong> (InstructGPT) has humans rank answers, trains a reward model on those rankings, then runs PPO
            against it with a KL penalty that keeps the policy near the SFT model. <strong>DPO</strong> skips the reward model and
            the sampling loop: one loss on (chosen, rejected) pairs raises the chosen answer&apos;s log-probability relative to a frozen
            reference and lowers the rejected one&apos;s.
          </p>
          <p>
            <strong>RL with verifiable rewards</strong> replaces the human or learned scorer with a program: the math answer matches,
            the unit tests pass. That is what nanochat&apos;s <code>chat_rl</code> does, and what recent reasoning models scale up.
          </p>
        </>
      ),
      changed: ["Three columns: where the reward comes from.", "nanochat's choice is outlined."],
      rail: { stage: "preference tuning", data: "rankings or checks", loss: "sampled answers", changes: "preferences" },
      learns: [3],
    },
    {
      label: "What changes",
      kind: "insight",
      title: "What each stage actually changes",
      body: (
        <>
          <p>
            Pretraining puts in knowledge. Midtraining and SFT change the format and behaviour: who speaks, how long, which tone, when
            to call a tool. RL changes which strategies the model prefers when it has several ways to answer.
          </p>
          <p>
            The share bars are illustrative, not measured. In nanochat&apos;s speedrun, base training takes hours and the later stages
            take minutes.
          </p>
        </>
      ),
      predict: {
        question: "You fine-tune a chat model on 10,000 conversations about events after its pretraining cutoff. What is most likely?",
        options: [
          "It now knows those events as deeply as anything else",
          "It learns to talk about them in that style, but its knowledge is shallow and it may invent details",
          "Nothing changes; SFT cannot add facts",
        ],
        answer: 1,
        explain: (
          <>
            A small SFT set teaches format far more than facts. It can add some knowledge, but thinly, and studies have found that
            fine-tuning on unfamiliar facts can increase hallucination. Deep knowledge comes from pretraining scale.
          </>
        ),
      },
      changed: ["One row per stage: data, effect, compute."],
      learns: [1],
    },
    {
      label: "Tools",
      kind: "mechanism",
      title: "Inference with tools: the engine runs the python block",
      body: (
        <>
          <p>
            The model samples <code>&lt;|python_start|&gt;</code>, an expression, then <code>&lt;|python_end|&gt;</code>. nanochat&apos;s
            engine sees the end token, evaluates the expression with a restricted calculator (simple arithmetic, a timeout, no
            builtins), and <strong>forces</strong> <code>&lt;|output_start|&gt;</code>, the result, and{" "}
            <code>&lt;|output_end|&gt;</code> into the sequence instead of sampling.
          </p>
          <p>
            The model then reads the result like any other context and keeps writing. Tool use is just tokens plus a loop around the
            model.
          </p>
        </>
      ),
      keyIdea: "A tool call is a special-token pattern the model learned to emit. The engine, not the model, runs it.",
      changed: ["A dot travels model, engine, calculator and back.", "Forced tokens are outlined in green."],
      rail: { stage: "inference", data: "your prompt", loss: "none", changes: "nothing" },
      learns: [4],
    },
    {
      label: "Recap",
      kind: "recap",
      title: "From GPT to ChatGPT, in one picture",
      body: (
        <>
          <p>
            Pretrain on web text for knowledge. Midtrain on chat-shaped data for format and special tokens. SFT with a loss mask for
            behaviour. RL on checkable problems for reasoning. Then the chat engine runs the model, with tools, while the weights stay
            frozen.
          </p>
          <p>Before moving on, say out loud how one user and assistant turn becomes tokens, and which of them are graded in SFT.</p>
        </>
      ),
      changed: ["Every stage with its data, loss and effect."],
      rail: { stage: "all", data: "all", loss: "all", changes: "all" },
      learns: [0, 1, 2, 3, 4],
    },
  ],
  Stage,
};

export default lesson;
