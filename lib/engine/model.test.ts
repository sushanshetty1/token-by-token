import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CharData } from "./data";
import { GPT, paramBreakdown, type ModelConfig, type Switches } from "./model";
import { Rng } from "./rng";
import { Trainer } from "./trainer";

const TEXT = readFileSync(join(process.cwd(), "public/data/tinyshakespeare.txt"), "utf8");

const tiny: ModelConfig = { vocabSize: 11, nEmbd: 8, nHead: 2, nLayer: 2, blockSize: 6 };

function gradCheck(sw: Switches) {
  const model = new GPT(tiny, 7, sw, Float64Array);
  const rng = new Rng(99);
  for (let i = 0; i < model.params.length; i++) model.params[i] = rng.normal() * 0.4;
  const B = 3;
  const T = 5;
  const x = Array.from({ length: B * T }, () => rng.int(tiny.vocabSize));
  const y = Array.from({ length: B * T }, () => rng.int(tiny.vocabSize));
  const ws = model.workspace(B);
  model.forward(ws, x, y, B, T);
  model.zeroGrad();
  model.backward(ws, x, y);
  const analytic = Float64Array.from(model.grads);

  const eps = 1e-5;
  let worst = 0;
  let checked = 0;
  for (const t of model.layout) {
    const picks = Math.min(t.size, 12);
    for (let k = 0; k < picks; k++) {
      const i = t.offset + (t.size <= 12 ? k : rng.int(t.size));
      const orig = model.params[i];
      model.params[i] = orig + eps;
      const lp = model.forward(ws, x, y, B, T);
      model.params[i] = orig - eps;
      const lm = model.forward(ws, x, y, B, T);
      model.params[i] = orig;
      const numeric = (lp - lm) / (2 * eps);
      const a = analytic[i];
      const err = Math.abs(a - numeric) / Math.max(1e-7, Math.abs(a) + Math.abs(numeric));
      if (Math.abs(a - numeric) > 1e-8) worst = Math.max(worst, err);
      checked++;
    }
  }
  return { worst, checked };
}

describe("gradients match finite differences", () => {
  const cases: [string, Switches][] = [
    ["full model", { causal: true, positions: true, residual: true, layerNorm: true }],
    ["no causal mask", { causal: false, positions: true, residual: true, layerNorm: true }],
    ["no positions", { causal: true, positions: false, residual: true, layerNorm: true }],
    ["no residuals", { causal: true, positions: true, residual: false, layerNorm: true }],
    ["no LayerNorm", { causal: true, positions: true, residual: true, layerNorm: false }],
  ];
  for (const [name, sw] of cases) {
    it(name, () => {
      const { worst, checked } = gradCheck(sw);
      expect(checked).toBeGreaterThan(100);
      expect(worst).toBeLessThan(1e-4);
    });
  }
});

describe("model", () => {
  const data = new CharData(TEXT);

  it("has the 65-character vocabulary and a 90/10 split", () => {
    expect(data.vocabSize).toBe(65);
    expect(data.train.length + data.val.length).toBe(TEXT.length);
    expect(data.train.length).toBe(Math.floor(TEXT.length * 0.9));
    expect(data.decode(data.encode("To be, or not"))).toBe("To be, or not");
  });

  it("starts at a loss of about ln(vocab_size)", () => {
    const t = new Trainer(data);
    const { train, val } = t.estimateLoss();
    expect(Math.abs(train - Math.log(65))).toBeLessThan(0.03);
    expect(Math.abs(val - Math.log(65))).toBeLessThan(0.03);
  });

  it("counts parameters the same way the lesson does", () => {
    const t = new Trainer(data);
    expect(t.model.numParams).toBe(paramBreakdown(t.model.cfg).total);
  });

  it("is deterministic for a fixed seed", () => {
    const a = new Trainer(data, { seed: 5 });
    const b = new Trainer(data, { seed: 5 });
    for (let i = 0; i < 3; i++) expect(a.trainStep()).toBe(b.trainStep());
    expect(a.sample("\n", 40, 1, 3)).toBe(b.sample("\n", 40, 1, 3));
  });

  it("float32 gradients agree with float64 gradients", () => {
    const cfg: ModelConfig = { ...tiny, vocabSize: 65 };
    const m32 = new GPT(cfg, 3, undefined, Float32Array);
    const m64 = new GPT(cfg, 3, undefined, Float64Array);
    m64.params.set(m32.params);
    const rng = new Rng(4);
    const x = Array.from({ length: 12 }, () => rng.int(65));
    const y = Array.from({ length: 12 }, () => rng.int(65));
    const w32 = m32.workspace(2);
    const w64 = m64.workspace(2);
    const l32 = m32.forward(w32, x, y, 2, 6);
    const l64 = m64.forward(w64, x, y, 2, 6);
    expect(Math.abs(l32 - l64)).toBeLessThan(1e-5);
    m32.zeroGrad();
    m64.zeroGrad();
    m32.backward(w32, x, y);
    m64.backward(w64, x, y);
    let num = 0;
    let den = 0;
    for (let i = 0; i < m32.grads.length; i++) {
      num += (m32.grads[i] - m64.grads[i]) ** 2;
      den += m64.grads[i] ** 2;
    }
    expect(Math.sqrt(num / den)).toBeLessThan(1e-4);
  });

  it("learns: 120 steps take the loss well below ln(65)", () => {
    const t = new Trainer(data);
    let last = 0;
    for (let i = 0; i < 120; i++) last = t.trainStep();
    expect(last).toBeLessThan(3.0);
    expect(t.estimateLoss().val).toBeLessThan(3.0);
  }, 60000);
});
