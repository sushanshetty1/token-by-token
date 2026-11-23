export const CODE = `import math

class Value:
    def __init__(self, data, _children=(), _op=""):
        self.data = data
        self.grad = 0.0
        self._backward = lambda: None       # a leaf has nothing to pass back
        self._prev = set(_children)
        self._op = _op

    def __add__(self, other):
        out = Value(self.data + other.data, (self, other), "+")
        def _backward():
            self.grad += 1.0 * out.grad        # + passes the gradient through
            other.grad += 1.0 * out.grad
        out._backward = _backward
        return out

    def __mul__(self, other):
        out = Value(self.data * other.data, (self, other), "*")
        def _backward():
            self.grad += other.data * out.grad  # each input gets the other input
            other.grad += self.data * out.grad
        out._backward = _backward
        return out

    def tanh(self):
        t = math.tanh(self.data)
        out = Value(t, (self,), "tanh")
        def _backward():
            self.grad += (1 - t**2) * out.grad
        out._backward = _backward
        return out

    def backward(self):
        topo, visited = [], set()
        def build_topo(v):
            if v not in visited:
                visited.add(v)
                for child in v._prev:
                    build_topo(child)
                topo.append(v)                 # v goes in after all of its inputs
        build_topo(self)
        self.grad = 1.0                        # dL/dL
        for v in reversed(topo):               # the output first, leaves last
            v._backward()

a, b, c, f = Value(2.0), Value(-3.0), Value(10.0), Value(-2.0)
e = a * b
d = e + c
L = d * f
L.backward()
print(a.grad, b.grad, c.grad, f.grad)      # 6.0 -4.0 -2.0 4.0
`;
