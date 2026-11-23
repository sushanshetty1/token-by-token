import { STARTER_RUN } from "@/content/build";

/** Train and val loss from the real starter run, with the uniform-guess line it started from. */
export function RunChart() {
  const pts = STARTER_RUN.steps;
  const W = 520;
  const H = 250;
  const L = 44;
  const R = 74;
  const T = 16;
  const B = 34;
  const yMin = 1.4;
  const yMax = 4.4;
  const x = (step: number) => L + (step / 2000) * (W - L - R);
  const y = (loss: number) => T + ((yMax - loss) / (yMax - yMin)) * (H - T - B);
  const path = (key: "train" | "val") => pts.map((p, i) => `${i ? "L" : "M"} ${x(p.step).toFixed(1)} ${y(p[key]).toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  const uniform = Math.log(65);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="stage-svg block h-auto w-full" role="img" aria-label="Loss over 2,000 steps: train falls from 4.21 to 1.57, val from 4.21 to 1.75">
      {[1.5, 2, 2.5, 3, 3.5, 4].map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--rule)" strokeWidth={1} />
          <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize={11} className="mono" fill="var(--ink-3)">
            {v.toFixed(1)}
          </text>
        </g>
      ))}
      {[0, 500, 1000, 1500, 2000].map((s) => (
        <text key={s} x={x(s)} y={H - 12} textAnchor="middle" fontSize={11} className="mono" fill="var(--ink-3)">
          {s.toLocaleString("en-US")}
        </text>
      ))}
      <line x1={L} x2={W - R} y1={y(uniform)} y2={y(uniform)} stroke="var(--ink-3)" strokeWidth={1.2} strokeDasharray="4 4" />
      <text x={W - R + 6} y={y(uniform) + 4} fontSize={11.5} className="mono" fill="var(--ink-2)">
        ln 65
      </text>
      <text x={x(1000)} y={y(uniform) - 7} textAnchor="middle" fontSize={11.5} fill="var(--ink-2)">
        a uniform guess over 65 characters
      </text>
      <path d={path("val")} fill="none" stroke="var(--mark)" strokeWidth={2.4} strokeLinejoin="round" />
      <path d={path("train")} fill="none" stroke="var(--accent)" strokeWidth={2.4} strokeLinejoin="round" />
      {pts.map((p) => (
        <g key={p.step}>
          <circle cx={x(p.step)} cy={y(p.val)} r={2.6} fill="var(--mark)" />
          <circle cx={x(p.step)} cy={y(p.train)} r={2.6} fill="var(--accent)" />
        </g>
      ))}
      <text x={W - R + 6} y={y(last.val) - 2} fontSize={12} fontWeight={700} fill="var(--mark)">
        val {last.val.toFixed(2)}
      </text>
      <text x={W - R + 6} y={y(last.train) + 12} fontSize={12} fontWeight={700} fill="var(--accent)">
        train {last.train.toFixed(2)}
      </text>
    </svg>
  );
}
