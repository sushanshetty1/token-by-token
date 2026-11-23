export const CODE = `import torch
import torch.nn.functional as F

def softmax(logits):
    z = logits - logits.max(dim=-1, keepdim=True).values  # same result, no overflow
    e = z.exp()                                           # every score becomes positive
    return e / e.sum(dim=-1, keepdim=True)                # each row now sums to 1

@torch.no_grad()
def generate(model, idx, max_new_tokens, block_size, temperature=1.0, greedy=False):
    # idx: (B, T) token ids of the prompt
    for _ in range(max_new_tokens):
        idx_cond = idx[:, -block_size:]              # crop to the context window
        logits = model(idx_cond)                     # (B, T, vocab_size): one full forward pass
        logits = logits[:, -1, :] / temperature      # last position only: (B, vocab_size)
        probs = softmax(logits)                      # (B, vocab_size)
        if greedy:
            idx_next = probs.argmax(dim=-1, keepdim=True)        # (B, 1) the top token
        else:
            idx_next = torch.multinomial(probs, num_samples=1)  # (B, 1) a weighted draw
        idx = torch.cat((idx, idx_next), dim=1)      # (B, T + 1): append, then go again
    return idx

# training: every position predicts the token that follows it
def get_batch(data, block_size, batch_size):
    ix = torch.randint(len(data) - block_size, (batch_size,))
    x = torch.stack([data[i : i + block_size] for i in ix])          # (B, T) inputs
    y = torch.stack([data[i + 1 : i + block_size + 1] for i in ix])  # (B, T) targets, shifted by one
    return x, y

x, y = get_batch(train_data, block_size=6, batch_size=4)
logits = model(x)                                    # (B, T, vocab_size)
B, T, C = logits.shape
loss = F.cross_entropy(logits.view(B * T, C), y.view(B * T))  # B * T predictions graded at once
`;
