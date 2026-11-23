/**
 * Speed check, skipped by default. Run with:
 *   BENCH=1 npx vitest run lib/engine/bench
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "vitest";
import { CharData } from "./data";
import { SIZE_PRESETS, Trainer, type SizePreset } from "./trainer";

describe.skipIf(!process.env.BENCH)("bench", () => {
  it("steps per second", () => {
    const data = new CharData(readFileSync(join(process.cwd(), "public/data/tinyshakespeare.txt"), "utf8"));
    for (const preset of ["tiny", "small", "medium"] as SizePreset[]) {
      const t = new Trainer(data, SIZE_PRESETS[preset]);
      for (let i = 0; i < 10; i++) t.trainStep();
      const n = 60;
      const t0 = performance.now();
      for (let i = 0; i < n; i++) t.trainStep();
      const dt = (performance.now() - t0) / 1000;
      const e0 = performance.now();
      t.estimateLoss();
      const evalMs = performance.now() - e0;
      const s0 = performance.now();
      t.sample("\n", 200, 0.8, 1);
      const sampleMs = performance.now() - s0;
      console.log(
        `${preset}: ${t.model.numParams} params, ${(n / dt).toFixed(1)} steps/s, eval ${evalMs.toFixed(0)} ms, 200-char sample ${sampleMs.toFixed(0)} ms`,
      );
    }
  }, 120000);
});
