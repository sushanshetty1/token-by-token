export const CODE = `import torch
import torch.nn as nn
import torch.nn.functional as F

class GPT(nn.Module):
    def forward(self, idx):
        B, T = idx.shape
        tok = self.wte(idx)                            # (B, T, C) one row per id
        pos = self.wpe(torch.arange(T))                # (T, C) one row per position
        x = tok + pos
        for block in self.blocks:                      # 12 blocks in GPT-2 small
            x = x + block.attn(block.ln_1(x))          # tokens talk to earlier tokens
            x = x + block.mlp(block.ln_2(x))           # each token thinks on its own
        x = self.ln_f(x)
        return self.lm_head(x)                         # (B, T, vocab_size)

@torch.no_grad()
def reply(model, tok, message, max_new_tokens=64, temperature=0.8):
    prompt = "<|user|>" + message + "<|assistant|>"
    idx = torch.tensor([tok.encode(prompt)])           # (1, T) integer ids
    out = []
    for _ in range(max_new_tokens):
        logits = model(idx)                            # (1, T, vocab_size)
        logits = logits[:, -1, :] / temperature        # only the last position
        probs = F.softmax(logits, dim=-1)              # scores -> probabilities
        next_id = torch.multinomial(probs, 1)          # draw one token, (1, 1)
        if next_id.item() == tok.end_id:
            break
        idx = torch.cat([idx, next_id], dim=1)         # append and go again
        out.append(next_id.item())
        print(tok.decode([next_id.item()]), end="")    # stream it to the screen
    return tok.decode(out)
`;
