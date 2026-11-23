"use client";

import type { LessonModule } from "@/lib/types";
import { LOSS_MEAN_8 } from "./data";
import { Stage } from "./Stage";

const CODE = `import torch
import torch.nn as nn
from torch.nn import functional as F

text = open("input.txt").read()  # tiny Shakespeare, about 1.1M characters
chars = sorted(set(text))
vocab_size = len(chars)  # 65
stoi = {ch: i for i, ch in enumerate(chars)}
itos = {i: ch for i, ch in enumerate(chars)}
data = torch.tensor([stoi[c] for c in text])
n = int(0.9 * len(data))
train_data, val_data = data[:n], data[n:]  # val: text the model never trains on

def get_batch(split, B=32, T=8):
    d = train_data if split == "train" else val_data
    ix = torch.randint(len(d) - T, (B,))
    x = torch.stack([d[i:i + T] for i in ix])
    y = torch.stack([d[i + 1:i + T + 1] for i in ix])  # targets: shifted by one
    return x, y

class BigramLanguageModel(nn.Module):
    def __init__(self, vocab_size):
        super().__init__()
        # row i holds the logits for whatever comes after token i
        self.token_embedding_table = nn.Embedding(vocab_size, vocab_size)

    def forward(self, idx, targets=None):
        logits = self.token_embedding_table(idx)  # (B, T, C)
        if targets is None:
            return logits, None
        B, T, C = logits.shape
        loss = F.cross_entropy(logits.view(B * T, C), targets.view(B * T))
        return logits, loss

    def generate(self, idx, max_new_tokens):
        for _ in range(max_new_tokens):
            logits, _ = self(idx)
            probs = F.softmax(logits[:, -1, :], dim=-1)  # last position only: (B, C)
            idx_next = torch.multinomial(probs, num_samples=1)  # (B, 1)
            idx = torch.cat((idx, idx_next), dim=1)  # (B, T + 1)
        return idx

model = BigramLanguageModel(vocab_size)
opt = torch.optim.AdamW(model.parameters(), lr=1e-3)
for step in range(10000):
    xb, yb = get_batch("train")
    logits, loss = model(xb, yb)
    opt.zero_grad(set_to_none=True)
    loss.backward()
    opt.step()
print(loss.item())  # starts near 4.8, ends near 2.5

idx = torch.zeros((1, 1), dtype=torch.long)  # id 0 is "\\n"
print("".join(itos[i] for i in model.generate(idx, 300)[0].tolist()))
`;

const lesson: LessonModule = {
  rail: [
    { id: "data", label: "Data" },
    { id: "vocab", label: "Vocab size" },
    { id: "shape", label: "Logits shape" },
    { id: "loss", label: "Loss" },
  ],
  learn: [
    "Build a bigram model from counts, then as a one-layer neural network.",
    "Compute cross-entropy loss by hand from a probability.",
    "Predict the loss of an untrained model: ln(vocab_size), 4.17 for 65 characters.",
    "Explain why logits are reshaped to (B*T, C) for F.cross_entropy.",
    "Say why a bigram plateaus near 2.5 and what attention adds.",
  ],
  legend: [
    { label: "count or probability (darker is larger)", color: "var(--accent)", shape: "square" },
    { label: "current pair, target, or you are here", color: "var(--mark)", shape: "square" },
    { label: "zero probability (logit -∞)", color: "var(--rule-strong)", shape: "square" },
    { label: "selected row", color: "var(--ink)", shape: "line" },
  ],
  code: { filename: "bigram.py", source: CODE, note: "A compact version of the bigram model from Let's build GPT." },
  steps: [
    {
      label: "Idea",
      kind: "intuition",
      title: "Predict the next character from this one",
      body: (
        <>
          <p>
            The simplest possible language model looks at one character and guesses the next. Nothing before it counts. To learn
            that, slide along the text and collect every adjacent pair: <code>s</code> then <code>h</code>, <code>h</code> then{" "}
            <code>e</code>, and so on.
          </p>
          <p>
            Our toy text is &quot;she sells sea shells by the sea shore&quot;: 37 characters, 11 distinct ones, 36 pairs. Every
            pair is a training example with an input and a target.
          </p>
        </>
      ),
      code: { ranges: [[14, 19]], caption: "get_batch builds the same pairs in bulk: targets are the inputs shifted by one." },
      changed: ["A window slides along the text.", "Each pair lands in the list on the right."],
      rail: { data: "37 chars, 36 pairs", vocab: "11 chars" },
      learns: [],
    },
    {
      label: "Counts",
      kind: "mechanism",
      title: "Count every pair into a table",
      body: (
        <>
          <p>
            Make an 11 by 11 table. Row is the current character, column is the next one, and each cell counts how often that
            pair occurred. The darkest cell says a space was followed by <code>s</code> five times.
          </p>
          <p>
            Most cells are zero: only 19 of the 121 pairs ever happen in this text. That table, and nothing else, is the whole
            bigram model.
          </p>
        </>
      ),
      keyIdea: "A bigram model is a (vocab_size, vocab_size) table: row i describes what tends to follow token i.",
      code: { ranges: [[6, 10]], caption: "A character-level tokenizer: each distinct character gets an id." },
      changed: ["The count table fills in.", "Row totals on the right add up to 36."],
    },
    {
      label: "Sample",
      kind: "mechanism",
      title: "Normalize a row, then sample",
      body: (
        <>
          <p>
            Divide each row by its total and it becomes a probability distribution. After <code>h</code> the text had{" "}
            <code>e</code> 3 times and <code>o</code> once, so P(e | h) = 0.75 and P(o | h) = 0.25.
          </p>
          <p>
            To generate, draw a random number between 0 and 1 and see which slice it lands in. Then use the new character&apos;s
            row for the next draw. That loop is text generation.
          </p>
        </>
      ),
      code: { ranges: [[38, 40]], caption: "softmax turns a row into probabilities; multinomial draws one." },
      changed: ["Row h is selected.", "A random draw of 0.62 picks e."],
      learns: [0],
    },
    {
      label: "Neural",
      kind: "mechanism",
      title: "The same model as a neural network",
      body: (
        <>
          <p>
            Replace the counts with learnable numbers: <code>nn.Embedding(vocab_size, vocab_size)</code>. Token id i selects row
            i, and that row is read directly as the <strong>logits</strong> for the next token. Softmax turns them into
            probabilities.
          </p>
          <p>
            If every logit were ln(count), softmax would give back the count table exactly. Gradient descent on the loss finds
            nearly that table by itself. The neural version matters because it scales: tomorrow&apos;s models replace this lookup
            with attention, and the loss and training loop stay the same.
          </p>
        </>
      ),
      keyIdea: "Bigram as a network: logits = token_embedding_table(idx), a (vocab_size, vocab_size) table read row by row.",
      code: { ranges: [[24, 25], [28, 28]], caption: "One table. The lookup result is the logits, shape (B, T, C)." },
      rail: { shape: "(B, T, 11)" },
      learns: [0],
    },
    {
      label: "Loss",
      kind: "mechanism",
      title: "Cross-entropy: -ln of the right answer's probability",
      body: (
        <>
          <p>
            To score a prediction, look up the probability the model gave to the character that actually came next, and take
            -ln of it. Certain and right (p = 1) costs 0. Giving the truth p = 0.02 costs 3.9. The loss is the average over every
            position.
          </p>
          <p>
            Using the count table on &quot;she sells&quot;: the 8 predictions cost between 0.29 and 1.10, a mean of{" "}
            {LOSS_MEAN_8.toFixed(2)}. Lower is better, and 0 would mean perfect certainty about every next character.
          </p>
        </>
      ),
      predict: {
        question:
          "Tiny Shakespeare has 65 distinct characters. A freshly initialized model spreads its probability about evenly over all 65. Roughly what loss do you expect?",
        options: ["0.0", "1.0", "4.17", "65"],
        answer: 2,
        explain: (
          <>
            About 4.17. Each target gets probability 1/65, and -ln(1/65) = ln 65 = 4.17. This is the most useful sanity check in
            deep learning: if your first loss is far from ln(vocab_size), the initialization or the loss code is off.
          </>
        ),
      },
      code: { ranges: [[32, 32]], caption: "F.cross_entropy does softmax, picks the target's probability, takes -ln, and averages." },
      changed: ["Eight predictions from the start of the text.", "Each one's loss sits on the -ln p curve."],
      rail: { loss: `${LOSS_MEAN_8.toFixed(2)} (8 positions)` },
      learns: [1],
    },
    {
      label: "At init",
      kind: "insight",
      title: "A random model scores ln(vocab_size)",
      body: (
        <>
          <p>
            Before training, the model has no reason to prefer any character, so every target gets about 1/65 and the loss is
            -ln(1/65) = 4.17. Karpathy&apos;s first printed loss is a bit higher, close to 4.9, because random N(0, 1) logits are
            not perfectly flat: the model starts slightly confident and wrong.
          </p>
          <p>
            Memorize the pattern, not the number: initial loss is about ln(vocab_size). GPT-2&apos;s vocabulary of 50,257 gives ln
            50,257 = 10.8.
          </p>
        </>
      ),
      keyIdea: "Untrained loss is about ln(vocab_size): 4.17 for 65 characters, 10.8 for GPT-2's 50,257 tokens.",
      predict: {
        question: (
          <>
            The model returns logits of shape (B, T, C) = (4, 8, 65) and targets of shape (4, 8). F.cross_entropy wants logits
            as (N, C) and targets as (N,). What do you pass?
          </>
        ),
        options: ["logits as is, (4, 8, 65)", "logits.view(32, 65)", "logits.view(4, 520)", "logits.view(65, 32)"],
        answer: 1,
        explain: (
          <>
            <code>logits.view(32, 65)</code> with <code>targets.view(32)</code>: B times T = 32 independent predictions, each a
            row of 65 logits. Passing (4, 8, 65) as is would be wrong: PyTorch reads dimension 1 as the classes, so it would see 8
            classes. That is why the code says <code>logits.view(B * T, C)</code>.
          </>
        ),
      },
      code: { ranges: [[25, 25], [43, 43]], caption: "nn.Embedding starts from random N(0, 1) numbers." },
      changed: ["65 characters, about equally likely.", "The answer: 4.17."],
      rail: { data: "tiny Shakespeare", vocab: "65 chars", shape: "(4, 8, 65)", loss: "4.17 at init" },
      learns: [2],
    },
    {
      label: "Reshape",
      kind: "mechanism",
      title: "Why logits become (B*T, C)",
      body: (
        <>
          <p>
            A batch holds B sequences of T positions, and every position is its own prediction. F.cross_entropy does not care
            which sequence a prediction came from. It wants one row of C logits per prediction and one target id per row.
          </p>
          <p>
            So stack the B sheets into one tall (B*T, C) matrix and flatten the (B, T) targets into (B*T,). The rows still line
            up: row 9 of logits is sequence 1, position 1, and so is target 9.
          </p>
        </>
      ),
      keyIdea: "logits.view(B*T, C) and targets.view(B*T): one row per prediction, the shape F.cross_entropy expects.",
      code: { ranges: [[31, 32]], caption: "Unpack the shape, flatten both, compute one scalar loss." },
      changed: ["Four sheets of (8, 65) stack into (32, 65).", "Targets flatten to 32 ids."],
      rail: { shape: "(32, 65)" },
      learns: [3],
    },
    {
      label: "Train",
      kind: "insight",
      title: "Training stops near 2.5",
      body: (
        <>
          <p>
            Train for 10,000 steps with AdamW and the loss falls from about 4.8 to about 2.5, then flattens. The validation loss,
            measured on the last 10% of the text that the model never trains on, follows right behind.
          </p>
          <p>
            2.5 is still a lot: e^2.5 is about 12, so at each step the model is as unsure as if it were choosing among 12
            characters. Samples look like Shakespeare-shaped noise: word-sized chunks, plausible letter pairs, no words.
          </p>
        </>
      ),
      predict: {
        question: "Train loss and validation loss both settle near 2.5 and stay close together. What does that tell you?",
        options: [
          "The model is overfitting",
          "The model is too simple: it cannot even fit the training text better",
          "The learning rate is too high",
          "The validation split is broken",
        ],
        answer: 1,
        explain: (
          <>
            Overfitting shows up as a gap: train keeps falling while val rises. Here there is no gap and a high floor, which means
            the model has hit its capacity. A bigram can only store one distribution per character (65 x 65 = 4,225 numbers).
            More steps will not help; more context will.
          </>
        ),
      },
      code: { ranges: [[11, 12], [44, 51]], caption: "Hold out 10% for validation, then the standard training loop." },
      rail: { loss: "about 2.5" },
      learns: [4],
    },
    {
      label: "Try it",
      kind: "try",
      title: "Generate text from the table",
      body: (
        <>
          <p>
            This samples live from the toy count table, one character at a time. The highlighted row is the one deciding the next
            character, and the bars show its distribution.
          </p>
          <p>
            Lower the temperature and the most common pair wins almost every time, so text loops. Raise it and rare pairs get
            picked more often. Switch on &quot;add 1 to every count&quot; and pairs that never occurred become possible, which is
            what keeps a real model&apos;s loss finite.
          </p>
        </>
      ),
      code: { ranges: [[35, 41], [53, 54]], caption: "generate: take the last position's logits, sample, append, repeat." },
      rail: { data: "toy table", vocab: "11 chars", shape: "(1, T, 11)", loss: "-" },
    },
    {
      label: "Limit",
      kind: "problem",
      title: "One character of memory is not enough",
      body: (
        <>
          <p>
            &quot;by th&quot;, &quot;she s&quot; and &quot;sells s&quot; all end in <code>e</code>, and the true next characters
            differ: a space, an <code>l</code>, an <code>a</code>. The bigram sees only the <code>e</code>, so it gives the same
            answer every time: one third each.
          </p>
          <p>
            The fix is to let each position look back at all earlier positions and decide which matter. That is attention, Day 4.
            A small transformer on the same Shakespeare data gets the validation loss down to about 1.5.
          </p>
        </>
      ),
      keyIdea: "The bigram's ceiling comes from its context of one token. Attention lets every position use all earlier tokens.",
      code: { ranges: [[38, 38]], caption: "logits[:, -1, :] here depends on the last token alone." },
      rail: { data: "tiny Shakespeare", vocab: "65 chars", shape: "(B, T, 65)", loss: "2.5 vs about 1.5" },
    },
    {
      label: "Recap",
      kind: "recap",
      title: "Recap: the bigram and its loss",
      body: (
        <>
          <p>
            A bigram predicts the next token from the current one with a single (vocab_size, vocab_size) table, either as counts
            or as an <code>nn.Embedding</code> whose rows are logits. Cross-entropy is -ln of the probability on the true next
            token, averaged over B*T positions.
          </p>
          <p>
            An untrained model scores ln(vocab_size), 4.17 for 65 characters. Training reaches about 2.5 and stops, because one
            character of context is not enough. Next: attention.
          </p>
        </>
      ),
      code: { ranges: [[21, 41]], caption: "The whole model: one table, a loss, and a sampling loop." },
    },
  ],
  Stage,
};

export default lesson;
