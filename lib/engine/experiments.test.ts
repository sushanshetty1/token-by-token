/**
 * Offline runs, skipped by default. Used to tune the defaults and to record
 * the curves the lessons show as reference. Run with:
 *   EXP='[{"name":"base","steps":500}]' EXP_OUT=out.json npx vitest run lib/engine/experiments
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "vitest";
import { CharData } from "./data";
import { Trainer, type RunConfig } from "./trainer";

interface ExpSpec {
  name: string;
  steps: number;
  run?: Partial<RunConfig>;
  evalEvery?: number;
  /** Record the per-step loss every k steps. */
  lossEvery?: number;
  sampleAt?: number[];
  sampleLen?: number;
  temperature?: number;
  attentionPrompt?: string;
}

describe.skipIf(!process.env.EXP)("experiments", () => {
  it("runs", () => {
    const specs: ExpSpec[] = JSON.parse(process.env.EXP!);
    const data = new CharData(readFileSync(join(process.cwd(), "public/data/tinyshakespeare.txt"), "utf8"));
    const results = [];
    for (const s of specs) {
      const t = new Trainer(data, s.run ?? {});
      const evalEvery = s.evalEvery ?? 50;
      const lossEvery = s.lossEvery ?? 1;
      const losses: [number, number][] = [];
      const evals: { step: number; train: number; val: number }[] = [];
      const samples: { step: number; text: string }[] = [];
      const sampleAt = new Set(s.sampleAt ?? [s.steps]);
      const t0 = performance.now();
      const record = () => {
        if (t.step % evalEvery === 0 || t.step === s.steps) evals.push({ step: t.step, ...t.estimateLoss() });
        if (sampleAt.has(t.step)) samples.push({ step: t.step, text: t.sample("\n", s.sampleLen ?? 160, s.temperature ?? 0.8, t.run.seed * 7919 + t.step) });
      };
      record();
      let maxGrad = 0;
      while (t.step < s.steps) {
        const loss = t.trainStep();
        maxGrad = Math.max(maxGrad, t.lastGradNorm);
        if (t.step % lossEvery === 0 || t.step === 1) losses.push([t.step, Math.round(loss * 10000) / 10000]);
        record();
      }
      const out = {
        name: s.name,
        run: t.run,
        params: t.model.numParams,
        seconds: (performance.now() - t0) / 1000,
        maxGrad,
        losses,
        evals,
        samples,
        attention: s.attentionPrompt ? t.attention(s.attentionPrompt) : undefined,
      };
      const last = evals[evals.length - 1];
      console.log(`${s.name}: train ${last.train.toFixed(3)} val ${last.val.toFixed(3)} in ${out.seconds.toFixed(0)} s, max grad ${maxGrad.toFixed(2)}`);
      results.push(out);
    }
    if (process.env.EXP_OUT) writeFileSync(process.env.EXP_OUT, JSON.stringify(results));
  }, 3_600_000);
});
