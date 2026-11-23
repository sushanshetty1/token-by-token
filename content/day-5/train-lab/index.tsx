"use client";

import type { LessonModule } from "@/lib/types";
import { Stage } from "./Stage";

const CODE = `import torch
import torch.nn.functional as F
from model import GPT  # the block from the last lesson, stacked n_layer times

batch_size, block_size = 16, 32  # B windows of T characters per step
n_embd, n_head, n_layer = 48, 4, 2
max_steps, eval_every, lr = 3000, 50, 3e-3
torch.manual_seed(1337)

text = open("input.txt").read()  # tiny Shakespeare: 1,115,394 characters
chars = sorted(set(text))  # the 65-character vocabulary
stoi = {c: i for i, c in enumerate(chars)}
data = torch.tensor([stoi[c] for c in text])
n = int(0.9 * len(data))
train_data, val_data = data[:n], data[n:]

def get_batch(split):
    d = train_data if split == "train" else val_data
    ix = torch.randint(len(d) - block_size, (batch_size,))
    x = torch.stack([d[i:i + block_size] for i in ix])  # (B, T)
    y = torch.stack([d[i + 1:i + block_size + 1] for i in ix])  # (B, T), shifted by one
    return x, y

@torch.no_grad()
def estimate_loss(iters=6):
    model.eval()
    out = {s: torch.stack([model(*get_batch(s))[1] for _ in range(iters)]).mean().item()
           for s in ("train", "val")}
    model.train()
    return out

model = GPT(len(chars), n_embd, n_head, n_layer, block_size)
print(sum(p.numel() for p in model.parameters()))  # 64,193
decay = [p for p in model.parameters() if p.dim() >= 2]  # weight matrices
no_decay = [p for p in model.parameters() if p.dim() < 2]  # biases, LayerNorm
optimizer = torch.optim.AdamW([{"params": decay, "weight_decay": 0.01},
                               {"params": no_decay, "weight_decay": 0.0}], lr=lr, betas=(0.9, 0.99))

for step in range(max_steps):
    if step % eval_every == 0:
        print(step, estimate_loss())  # step 0: about 4.17 on both splits
    xb, yb = get_batch("train")
    logits, loss = model(xb, yb)  # forward: (B, T, vocab_size) logits, scalar loss
    optimizer.zero_grad(set_to_none=True)
    loss.backward()  # backward: fills p.grad for all 64,193 weights
    torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
    optimizer.step()  # AdamW nudges every weight against its gradient

@torch.no_grad()
def generate(idx, max_new_tokens, temperature=0.8):
    for _ in range(max_new_tokens):
        logits, _ = model(idx[:, -block_size:])  # crop to the context window
        probs = F.softmax(logits[:, -1, :] / temperature, dim=-1)
        idx = torch.cat([idx, torch.multinomial(probs, 1)], dim=1)
    return idx

out = generate(torch.zeros((1, 1), dtype=torch.long), 160)  # start from "\\n" (id 0)
print("".join(chars[i] for i in out[0].tolist()))
`;

const lesson: LessonModule = {
  rail: [
    { id: "params", label: "Parameters" },
    { id: "batch", label: "Tokens per step" },
    { id: "start", label: "Loss at step 0" },
    { id: "bigram", label: "Bigram level" },
  ],
  learn: [
    "Read a small GPT's config and count its parameters",
    "Explain how get_batch turns one text file into (B, T) inputs and shifted targets",
    "Predict the loss at step 0 from the vocabulary size",
    "Say what each line of the training loop does to the weights",
    "Read a loss curve: n-gram levels, train vs val, and overfitting",
  ],
  legend: [
    { label: "train loss", color: "var(--accent)", shape: "line" },
    { label: "val loss", color: "var(--mark)", shape: "line" },
    { label: "recorded run, same seed", color: "var(--ink-3)", shape: "line" },
    { label: "attention weight", color: "var(--accent)", shape: "square" },
    { label: "masked (the future)", color: "var(--rule-strong)", shape: "square" },
  ],
  code: {
    filename: "train.py",
    source: CODE,
    note: "The browser runs the same algorithm in hand-written TypeScript (forward and backward), no PyTorch.",
  },
  steps: [
    {
      label: "Model",
      kind: "intuition",
      title: "What is about to train",
      body: (
        <>
          <p>
            This lesson trains a real GPT inside your browser: the same architecture as GPT-2, shrunk until it fits a laptop
            tab. It reads characters instead of BPE tokens, so its vocabulary is just the 65 characters that appear in
            tiny Shakespeare.
          </p>
          <p>
            It has <strong>64,193 parameters</strong>: 48-number embeddings, 2 blocks of 4-head attention plus an MLP, and
            a head that maps 48 numbers back to 65 logits. GPT-2 small has 124 million, about 1,900 times more.
          </p>
        </>
      ),
      keyIdea: (
        <>
          The MLPs hold 58% of the weights and attention 29%. Per block that is 8C² against 4C², the same 2 to 1 ratio as
          GPT-2.
        </>
      ),
      code: { ranges: [[5, 8], [32, 33]], caption: "These are the exact settings of the run in your browser." },
      rail: { params: "64,193" },
      learns: [0],
    },
    {
      label: "Data",
      kind: "mechanism",
      title: "One text file, cut into windows",
      body: (
        <>
          <p>
            The dataset is a single file of 1,115,394 characters. The first 90% is the training split; the last 10% is held
            out for validation and never trained on.
          </p>
          <p>
            <code>get_batch</code> picks 16 random start positions and cuts a 32-character window at each. The targets{" "}
            <code>y</code> are the same windows shifted by one, so every one of the 16 x 32 = 512 positions is its own
            &quot;guess the next character&quot; example.
          </p>
        </>
      ),
      changed: ["x and y are both (B, T) = (16, 32) tensors of character ids"],
      code: { ranges: [[10, 22]], caption: "x is (B, T); y is x shifted left by one." },
      rail: { batch: "16 x 32 = 512" },
      learns: [1],
    },
    {
      label: "Step 0",
      kind: "problem",
      title: "What loss should step 0 show?",
      body: (
        <>
          <p>
            The loss is cross-entropy: the average of <code>-ln p</code>, where p is the probability the model gave to the
            character that actually came next. A perfect model would score 0.
          </p>
          <p>
            Before training, the weights are small random numbers, so the 65 logits are nearly equal and softmax spreads the
            probability evenly.
          </p>
        </>
      ),
      predict: {
        question: "What will the loss be at step 0, before any update?",
        options: ["About 0", "About 1.0", "About 4.17", "About 65"],
        answer: 2,
        explain: (
          <>
            Every character gets p = 1/65, so the loss is -ln(1/65) = ln 65 = 4.17. This is the first sanity check of any
            run. Far above ln(vocab_size) means the initial logits are confidently wrong (a bad init). Far below would mean
            the model knows something it cannot know yet.
          </>
        ),
      },
      code: { ranges: [[24, 30], [39, 41]], caption: "estimate_loss runs before the first update, at step 0." },
      learns: [2],
    },
    {
      label: "Train",
      kind: "try",
      title: "Press start and watch it learn",
      body: (
        <>
          <p>
            Press <strong>Start training</strong>. A Web Worker repeats the loop: get a batch, forward, loss, zero the
            gradients, backward, AdamW step. Forward and backward are hand-written TypeScript; expect about 10 steps a
            second on a laptop.
          </p>
          <p>
            The dashed line is this exact run, recorded earlier with the same seed. Your curve should land right on it: same
            seed, same batches, same arithmetic. Training keeps going while you read the next steps.
          </p>
        </>
      ),
      predict: {
        question: "Over the first 200 steps, where will the training loss go?",
        options: ["It barely moves from 4.17", "Down to about 2.4, fast", "Down to about 1.0", "Almost to 0"],
        answer: 1,
        explain: (
          <>
            The recorded run is at 2.39 by step 200 (val 2.43). The cheap wins come first. 1.0 is far off: this model ends
            around 1.97 val after 3,000 steps, and 0 would mean predicting Shakespeare perfectly.
          </>
        ),
      },
      code: { ranges: [[39, 47]], caption: "One step: batch, forward, zero_grad, backward, clip, update." },
      rail: { start: "4.17" },
      learns: [3],
    },
    {
      label: "Fast drop",
      kind: "insight",
      title: "The fast drop is easy statistics",
      body: (
        <>
          <p>
            The upper dotted line, 3.31, is the loss of a model that only knows how often each character appears (spaces
            and &quot;e&quot; are common, &quot;Z&quot; is rare). The lower one, 2.45, is a bigram table: it knows which
            character tends to follow the previous one. Both come from counting the training text.
          </p>
          <p>
            The transformer passes 3.31 in roughly the first 30 steps and reaches the bigram level around step 150 to 200.
            Counting is the easy part, and gradient descent finds it first.
          </p>
        </>
      ),
      keyIdea: "Loss falls in stages: frequencies, then pairs, then context. The n-gram levels tell you which stage a model has reached.",
      code: { ranges: [[42, 43]], caption: "The same loss line, measured against two counting baselines." },
      rail: { bigram: "2.45" },
      learns: [4],
    },
    {
      label: "Context",
      kind: "mechanism",
      title: "Below 2.45, it has to read the context",
      body: (
        <>
          <p>
            Beating the bigram level takes more than the last character: a space follows a finished word, a capital follows
            a newline, a name in capitals ends with a colon. That is attention&apos;s job, and progress is slower: the
            recorded run needs 1,000 steps to reach 2.12 val and 3,000 steps for 1.97.
          </p>
          <p>
            Watch the samples. Step 0 is uniform noise. By step 100 there are spaces and common letters, by 300 short real
            words, by 1,000 phrases like &quot;drive you that come&quot;. At 2,000 it writes speaker names such as
            &quot;BUCKINGHARD:&quot;.
          </p>
        </>
      ),
      code: {
        ranges: [[49, 58]],
        caption: "Sampling: crop to the last 32 characters, softmax at temperature 0.8, draw one, append, repeat.",
      },
      learns: [4],
    },
    {
      label: "Val?",
      kind: "problem",
      title: "Train loss or val loss: which one to trust?",
      body: (
        <>
          <p>
            So far you have watched the training loss. Validation loss is the same measurement on the held-out 10%, text the
            model never trains on. It tells you whether it learned Shakespeare or only these particular lines.
          </p>
          <p>The model has 64,193 parameters; the training split has 1,003,854 characters.</p>
        </>
      ),
      predict: {
        question: "Between step 1,000 and 3,000, how does val loss compare with train loss?",
        options: [
          "Val is lower than train",
          "Val is a little higher, and still falling",
          "Val climbs while train keeps falling",
          "They are exactly equal",
        ],
        answer: 1,
        explain: (
          <>
            In the recorded run the gap is 0.12 at step 1,000 and 0.21 at step 3,000 (train 1.76, val 1.97), and val keeps
            falling the whole time. Val climbing while train falls would be overfitting, which you will cause on purpose two
            steps from now.
          </>
        ),
      },
      code: { ranges: [[14, 15], [24, 30]], caption: "Same function, different split." },
    },
    {
      label: "Gap",
      kind: "insight",
      title: "A small gap, with val still improving",
      body: (
        <>
          <p>
            Both curves are measured the same way: mean loss over 6 fixed batches of 16 x 32 characters per split. (The lab
            reuses the same batches at every evaluation so the curve does not jitter; the code draws fresh ones, which is
            also fine.)
          </p>
          <p>
            A slowly growing gap while val still improves is normal; the val text is also a different stretch of the plays.
            The warning sign is val turning upward while train keeps dropping. A 64k-parameter model cannot memorize a
            million characters, so you will not see that here.
          </p>
        </>
      ),
      keyIdea: "Train loss improves whenever you train longer. Val loss tells you whether the improvement is real.",
      code: { ranges: [[24, 30]], caption: "Evaluation never calls backward: it only reads the model." },
      learns: [4],
    },
    {
      label: "Overfit",
      kind: "try",
      title: "Overfit on purpose: 10,000 characters",
      body: (
        <>
          <p>
            Shrink the training text to its first 10,000 characters (1% of the train split) and keep the same 64,193
            parameters. Press <strong>Train on 10k chars</strong>: 1,000 steps in a second worker while your main run waits.
          </p>
          <p>
            In the recorded run of this experiment, val bottoms out at 2.71 around step 250, then climbs to 3.22 by step
            1,000 while train falls to 1.39. Same model, same code; only the amount of data changed.
          </p>
        </>
      ),
      keyIdea: (
        <>
          Overfitting is a ratio problem: too many parameters for too little data. The cures are more data, a smaller model,
          regularization such as dropout, or stopping at the val minimum.
        </>
      ),
      code: { ranges: [[14, 15]], caption: "The only change for this run: train_data = data[:10_000]." },
      learns: [4],
    },
    {
      label: "Attention",
      kind: "insight",
      title: "What the heads learned to look at",
      body: (
        <>
          <p>
            Each grid is one head on the prompt &quot;JULIET:↵O Romeo, Romeo!&quot;. Row i is the character doing the
            looking; its cells split 100% of its attention over itself and earlier characters. Shading uses a square-root
            scale so small weights stay visible.
          </p>
          <p>
            In the recorded model, layer 1 heads mostly look one or two characters back: in L1 H2 the &quot;e&quot; of
            &quot;Romeo&quot; puts 0.83 on the &quot;m&quot; before it. Layer 2 heads spread out, and several reach back to
            the speaker name and the newline. Switch to your model to compare.
          </p>
        </>
      ),
      code: { ranges: [[3, 3]], caption: "Attention lives inside the blocks: softmax(q k / sqrt(12)) per head, masked." },
    },
    {
      label: "Recap",
      kind: "recap",
      title: "The loop, and the numbers to remember",
      body: (
        <>
          <p>
            Training is six lines repeated: <code>get_batch</code>, forward, cross-entropy, <code>zero_grad</code>,{" "}
            <code>backward</code>, <code>step</code>. Evaluation and sampling only read the model.
          </p>
          <p>
            For a character model on this text: 4.17 at step 0 is ln 65; 3.31 means it knows frequencies; 2.45 means it
            knows pairs; lower means it uses context. Val a little above train is normal; val rising while train falls is
            overfitting.
          </p>
        </>
      ),
      code: { ranges: [[39, 47]] },
      learns: [0, 1, 2, 3, 4],
    },
  ],
  Stage,
};

export default lesson;
