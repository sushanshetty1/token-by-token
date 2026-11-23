"""
tiny_gpt.py: a character-level GPT you can read in one sitting and train on a laptop.
From Token by Token, https://llm.sushans.dev/build/ (MIT licensed).

    pip install torch
    python tiny_gpt.py                # trains on Tiny Shakespeare (downloaded once)
    python tiny_gpt.py my_notes.txt   # trains on any text file you give it

Five parts, the same five as the course: data, model, loss, training loop, sampling.
"""
import math
import os
import sys
import time
import urllib.request

import torch
import torch.nn as nn
from torch.nn import functional as F

# Settings. Change one, predict what will happen, then run.
block_size = 64    # T: how many characters the model can see at once
n_embd = 128       # C: width of the residual stream
n_head = 4         # attention heads per block
n_layer = 4        # transformer blocks
dropout = 0.1
batch_size = 32    # B: sequences per training step
max_steps = 2000
lr = 1e-3
eval_every = 250
device = "cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu"
torch.manual_seed(1337)

# 1. Data: text becomes integers.
path = sys.argv[1] if len(sys.argv) > 1 else "input.txt"
if not os.path.exists(path):
    print(f"No {path} here, so downloading Tiny Shakespeare into it")
    urllib.request.urlretrieve("https://raw.githubusercontent.com/karpathy/char-rnn/master/data/tinyshakespeare/input.txt", path)
text = open(path, encoding="utf-8").read()
chars = sorted(set(text))
vocab_size = len(chars)
stoi = {c: i for i, c in enumerate(chars)}
encode = lambda s: [stoi[c] for c in s]
decode = lambda ids: "".join(chars[i] for i in ids)
data = torch.tensor(encode(text), dtype=torch.long)
n = int(0.9 * len(data))
train_data, val_data = data[:n], data[n:]
if len(val_data) <= block_size + 1:
    sys.exit("Not enough text. Give it at least 10,000 characters, ideally a megabyte or more.")
print(f"{len(text):,} characters, a vocabulary of {vocab_size}")


def get_batch(split):
    d = train_data if split == "train" else val_data
    ix = torch.randint(len(d) - block_size - 1, (batch_size,))
    x = torch.stack([d[i : i + block_size] for i in ix])
    y = torch.stack([d[i + 1 : i + block_size + 1] for i in ix])  # the targets: the same text shifted by one
    return x.to(device), y.to(device)


# 2. The model.
class Attention(nn.Module):
    def __init__(self):
        super().__init__()
        self.qkv = nn.Linear(n_embd, 3 * n_embd, bias=False)
        self.proj = nn.Linear(n_embd, n_embd)
        self.drop = nn.Dropout(dropout)
        self.register_buffer("mask", torch.tril(torch.ones(block_size, block_size)).bool())

    def forward(self, x):
        B, T, C = x.shape
        q, k, v = self.qkv(x).split(C, dim=2)
        # (B, T, C) -> (B, n_head, T, hs): every head gets its own slice of the channels
        q, k, v = (t.view(B, T, n_head, C // n_head).transpose(1, 2) for t in (q, k, v))
        att = q @ k.transpose(-2, -1) / math.sqrt(k.size(-1))     # (B, n_head, T, T)
        att = att.masked_fill(~self.mask[:T, :T], float("-inf"))   # no looking at the future
        att = self.drop(F.softmax(att, dim=-1))
        y = (att @ v).transpose(1, 2).contiguous().view(B, T, C)  # put the heads side by side again
        return self.drop(self.proj(y))


class Block(nn.Module):
    def __init__(self):
        super().__init__()
        self.ln1, self.ln2 = nn.LayerNorm(n_embd), nn.LayerNorm(n_embd)
        self.attn = Attention()
        self.mlp = nn.Sequential(
            nn.Linear(n_embd, 4 * n_embd), nn.GELU(), nn.Linear(4 * n_embd, n_embd), nn.Dropout(dropout)
        )

    def forward(self, x):
        x = x + self.attn(self.ln1(x))  # tokens talk to each other
        x = x + self.mlp(self.ln2(x))   # each token thinks on its own
        return x


class GPT(nn.Module):
    def __init__(self):
        super().__init__()
        self.tok = nn.Embedding(vocab_size, n_embd)
        self.pos = nn.Embedding(block_size, n_embd)
        self.blocks = nn.Sequential(*[Block() for _ in range(n_layer)])
        self.ln_f = nn.LayerNorm(n_embd)
        self.head = nn.Linear(n_embd, vocab_size)
        self.apply(self._init)

    def _init(self, m):
        # Small weights make every first guess close to uniform, so step 0 lands near ln(vocab_size).
        if isinstance(m, (nn.Linear, nn.Embedding)):
            nn.init.normal_(m.weight, std=0.02)
        if isinstance(m, nn.Linear) and m.bias is not None:
            nn.init.zeros_(m.bias)

    def forward(self, idx, targets=None):
        B, T = idx.shape
        x = self.tok(idx) + self.pos(torch.arange(T, device=idx.device))  # (B, T, C)
        logits = self.head(self.ln_f(self.blocks(x)))                      # (B, T, vocab_size)
        if targets is None:
            return logits, None
        # 3. The loss: how surprised was the model by each real next character?
        loss = F.cross_entropy(logits.view(B * T, -1), targets.view(B * T))
        return logits, loss

    @torch.no_grad()
    def generate(self, idx, n_new, temperature=1.0):
        for _ in range(n_new):
            logits, _ = self(idx[:, -block_size:])
            probs = F.softmax(logits[:, -1, :] / temperature, dim=-1)
            idx = torch.cat([idx, torch.multinomial(probs, 1)], dim=1)
        return idx


model = GPT().to(device)
opt = torch.optim.AdamW(model.parameters(), lr=lr)
print(f"{sum(p.numel() for p in model.parameters()) / 1e6:.2f}M parameters, training on {device}")
print(f"Predicted loss at step 0: ln({vocab_size}) = {math.log(vocab_size):.2f}")


@torch.no_grad()
def estimate_loss():
    model.eval()
    out = {s: torch.stack([model(*get_batch(s))[1] for _ in range(20)]).mean().item() for s in ("train", "val")}
    model.train()
    return out


# 4. The training loop.
t0 = time.time()
for step in range(max_steps + 1):
    if step % eval_every == 0:
        losses = estimate_loss()
        print(f"step {step:5d}   train {losses['train']:.3f}   val {losses['val']:.3f}   {time.time() - t0:5.0f} s")
    if step == max_steps:
        break
    x, y = get_batch("train")
    _, loss = model(x, y)
    opt.zero_grad(set_to_none=True)
    loss.backward()  # backprop: a gradient for every weight
    opt.step()       # nudge every weight a little downhill

# 5. Sampling: one character at a time, each fed back in.
torch.save(model.state_dict(), "tiny_gpt.pt")
model.eval()
start = torch.tensor([[stoi.get("\n", 0)]], device=device)
print("\n" + decode(model.generate(start, 500, temperature=0.8)[0].tolist()))
