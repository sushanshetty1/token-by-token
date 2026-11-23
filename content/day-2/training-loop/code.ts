export const CODE = `import torch
import torch.nn as nn

xs = torch.tensor([[2.0, 3.0, -1.0],
                   [3.0, -1.0, 0.5],
                   [0.5, 1.0, 1.0],
                   [1.0, 1.0, -1.0]])        # 4 examples, 3 inputs each
ys = torch.tensor([1.0, -1.0, -1.0, 1.0])   # the target for each example

torch.manual_seed(42)
model = nn.Sequential(
    nn.Linear(3, 4), nn.Tanh(),
    nn.Linear(4, 4), nn.Tanh(),
    nn.Linear(4, 1),
)
params = list(model.parameters())         # 6 tensors, 41 numbers
lr = 0.1

for step in range(100):
    ypred = model(xs).squeeze(-1)           # 1. forward: (4,)
    loss = ((ypred - ys) ** 2).mean()       # 2. loss: mean squared error
    for p in params:
        p.grad = None                       # 3. zero_grad: backward adds into .grad
    loss.backward()                         # 4. backward: d loss / d p for all 41
    for p in params:
        p.data -= lr * p.grad               # 5. update: a small step downhill

# the same loop with a built-in optimizer; GPT training swaps in AdamW
opt = torch.optim.SGD(model.parameters(), lr=lr)
for step in range(100):
    loss = ((model(xs).squeeze(-1) - ys) ** 2).mean()
    opt.zero_grad()
    loss.backward()
    opt.step()
`;
