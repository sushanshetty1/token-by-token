export const CODE = `# 1. one input: nudge x, watch f move
def f(x):
    return 3 * x**2 - 4 * x + 5

x = 3.0
h = 0.001
slope = (f(x + h) - f(x)) / h
print(f(x), slope)          # 20.0 14.003..., and the exact 6x - 4 gives 14

# 2. three inputs: nudge one at a time
a, b, c = 2.0, -3.0, 10.0
d1 = a * b + c              # 4.0
d2 = (a + h) * b + c        # 3.997
print((d2 - d1) / h)        # -3.0 (up to float error), which is b
d2 = a * (b + h) + c        # 4.002
print((d2 - d1) / h)        # 2.0, which is a
d2 = a * b + (c + h)        # 4.001
print((d2 - d1) / h)        # 1.0

# 3. a Value remembers how it was made, so we can walk back later
class Value:
    def __init__(self, data, _children=(), _op=""):
        self.data = data
        self.grad = 0.0                 # d(output) / d(this value), filled in by backprop
        self._prev = set(_children)
        self._op = _op

    def __add__(self, other):
        return Value(self.data + other.data, (self, other), "+")

    def __mul__(self, other):
        return Value(self.data * other.data, (self, other), "*")

    def __repr__(self):
        return f"Value(data={self.data})"

a, b, c = Value(2.0), Value(-3.0), Value(10.0)
e = a * b                       # Value(data=-6.0), made by "*" from a and b
d = e + c                       # Value(data=4.0)
print(d._op, d._prev)           # + {Value(data=-6.0), Value(data=10.0)}
`;
