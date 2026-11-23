import { mulberry32 } from "@/lib/color";

export const TOTAL_BATCH = 524288;
export const MICRO_B = 64;
export const T = 1024;
export const GRAD_ACCUM = TOTAL_BATCH / (MICRO_B * T);

export interface Schedule {
  maxLr: number;
  warmup: number;
  maxSteps: number;
}

export const GPT2_SCHEDULE: Schedule = { maxLr: 6e-4, warmup: 715, maxSteps: 19073 };

/** Linear warmup, then cosine decay to 10% of the peak (build-nanogpt's get_lr). */
export function getLr(it: number, s: Schedule) {
  const minLr = s.maxLr * 0.1;
  if (it < s.warmup) return (s.maxLr * (it + 1)) / s.warmup;
  if (it > s.maxSteps) return minLr;
  const ratio = (it - s.warmup) / Math.max(1, s.maxSteps - s.warmup);
  const coeff = 0.5 * (1 + Math.cos(Math.PI * ratio));
  return minLr + coeff * (s.maxLr - minLr);
}

export const sci = (x: number, digits = 1) => {
  if (x === 0) return "0";
  const [m, e] = x.toExponential(digits).split("e");
  return `${m}e${Number(e)}`;
};

export const commas = (n: number) => Math.round(n).toLocaleString("en-US");

export function short(n: number) {
  if (n >= 1e12) return `${(n / 1e12).toFixed(n >= 1e13 ? 0 : 1)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(n >= 1e10 ? 0 : 1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)}M`;
  return commas(n);
}

export function duration(hours: number) {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${hours.toFixed(1)} h`;
  if (hours < 24 * 365) return `${(hours / 24).toFixed(hours < 240 ? 1 : 0)} days`;
  return `${(hours / 24 / 365).toFixed(1)} years`;
}

/** Napkin math: training FLOPs about 6ND, time at a given peak throughput and utilization. */
export function napkin(N: number, D: number, gpus: number, peak: number, mfu: number) {
  const flops = 6 * N * D;
  const perGpu = peak * mfu;
  const gpuHours = flops / perGpu / 3600;
  return { flops, gpuHours, wallHours: gpuHours / gpus, chinchilla: 20 * N, ratio: D / N };
}

/** Noisy gradients and their momentum average, for the AdamW picture. */
export function momentumSeries(n = 40) {
  const rand = mulberry32(77);
  const g: number[] = [];
  const m: number[] = [];
  let mm = 0;
  for (let t = 1; t <= n; t++) {
    const gt = 1 + (rand() * 2 - 1) * 1.8;
    mm = 0.9 * mm + 0.1 * gt;
    g.push(gt);
    m.push(mm / (1 - Math.pow(0.9, t)));
  }
  return { g, m };
}

/** Gradient norm per step: high at the start, settling, with a few spikes. */
export function normSeries(n = 60) {
  const rand = mulberry32(2024);
  return Array.from({ length: n }, (_, i) => {
    const base = 0.35 + 2.6 * Math.exp(-i / 7);
    const spike = [23, 38, 51].includes(i) ? 1.6 + rand() * 1.2 : 0;
    return base + rand() * 0.25 + spike;
  });
}
