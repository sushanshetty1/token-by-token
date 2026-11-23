import { PIPELINE, type Station } from "@/lib/pipeline";

/*
  The whiteboard path drawn top to bottom so it stays legible on A4 and on a phone.
  Left column: the forward pass, with what flows along every arrow.
  Right column: the training loop, which climbs back up and writes new weights.
*/
const FX = 64;
const FW = 176;
const BH = 40;
const PITCH = 72;
const TOP = 44;
const RX = 352;
const RW = 148;
const rowY = (i: number) => TOP + i * PITCH;
const ARROW_X = FX + 30;

function StationBox({ s, x, y, w, fill }: { s: Station; x: number; y: number; w: number; fill: string }) {
  return (
    <g>
      <rect x={x} y={y + 3} width={w} height={BH} rx={10} fill="var(--ink)" />
      <rect x={x} y={y} width={w} height={BH} rx={10} fill={fill} stroke="var(--ink)" strokeWidth={1.6} />
      <text x={x + w / 2} y={y + 26.5} textAnchor="middle" fontSize={16} fontWeight={700}>
        {s.label}
      </text>
    </g>
  );
}

export function FinishLine() {
  const fwd = PIPELINE.filter((s) => s.phase === "forward");
  const train = PIPELINE.filter((s) => s.phase === "training");
  const loss = train.find((s) => s.id === "loss");
  const backprop = train.find((s) => s.id === "backprop");
  const update = train.find((s) => s.id === "update");
  const at = (id: string) => fwd.findIndex((s) => s.id === id);
  const tokensY = rowY(at("tokens"));
  const embedY = rowY(at("embed"));
  const attY = rowY(at("attention"));
  const mlpY = rowY(at("mlp"));
  const logitsY = rowY(at("logits"));
  const sampleY = rowY(fwd.length - 1);
  const updateY = embedY;
  const backpropY = (attY + mlpY) / 2;
  const lossY = logitsY;
  const targetY = lossY + BH + 32;

  return (
    <svg
      viewBox="0 0 512 528"
      className="stage-svg block h-auto w-full"
      role="img"
      aria-label="The forward pass from text to the next token, the generation loop that feeds each new token back in, and the training loop from loss to backprop to updated weights"
    >
      <defs>
        <marker id="fl-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--ink)" />
        </marker>
        <marker id="fl-arrow-accent" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent)" />
        </marker>
      </defs>

      <text x={FX} y={24} fontSize={13} fontWeight={650} fill="var(--ink-3)">
        Forward pass
      </text>

      {fwd.slice(0, -1).map((s, i) => (
        <g key={s.id}>
          <line
            x1={ARROW_X}
            y1={rowY(i) + BH + 4}
            x2={ARROW_X}
            y2={rowY(i + 1) - 3}
            stroke="var(--ink)"
            strokeWidth={1.6}
            markerEnd="url(#fl-arrow)"
          />
          <text x={ARROW_X + 12} y={rowY(i) + BH + 22} fontSize={13.5} className="mono" fill="var(--ink-2)">
            {s.out}
          </text>
        </g>
      ))}

      {fwd.map((s, i) => (
        <StationBox key={s.id} s={s} x={FX} y={rowY(i)} w={FW} fill="var(--card)" />
      ))}

      {/* The block: attention then MLP, stacked N times. */}
      <path d={`M ${FX + FW + 8} ${attY} H ${FX + FW + 15} V ${mlpY + BH + 3} H ${FX + FW + 8}`} fill="none" stroke="var(--ink-2)" strokeWidth={1.4} />
      <text x={FX + FW + 24} y={backpropY + 8} fontSize={13} fontWeight={700}>
        block,
      </text>
      <text x={FX + FW + 24} y={backpropY + 26} fontSize={12} className="mono" fill="var(--ink-2)">
        repeated
      </text>
      <text x={FX + FW + 24} y={backpropY + 42} fontSize={12} className="mono" fill="var(--ink-2)">
        N times
      </text>

      {/* Generation: the sampled token is appended and the model runs again. */}
      <path
        d={`M ${FX - 3} ${sampleY + BH / 2} H 34 V ${tokensY + BH / 2} H ${FX - 4}`}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={1.6}
        markerEnd="url(#fl-arrow-accent)"
      />
      <text
        transform={`translate(25 ${(tokensY + sampleY + BH) / 2}) rotate(-90)`}
        textAnchor="middle"
        fontSize={12.5}
        className="mono"
        fill="var(--accent)"
      >
        {fwd[fwd.length - 1].out}, appended
      </text>

      {/* Training loop. */}
      <text x={RX} y={updateY - 12} fontSize={13} fontWeight={650} fill="var(--ink-3)">
        Training loop
      </text>
      <line
        x1={FX + FW + 4}
        y1={lossY + BH / 2}
        x2={RX - 4}
        y2={lossY + BH / 2}
        stroke="var(--ink)"
        strokeWidth={1.6}
        strokeDasharray="5 4"
        markerEnd="url(#fl-arrow)"
      />
      <line x1={RX + 30} y1={lossY - 3} x2={RX + 30} y2={backpropY + BH + 4} stroke="var(--ink)" strokeWidth={1.6} strokeDasharray="5 4" markerEnd="url(#fl-arrow)" />
      <line x1={RX + 30} y1={backpropY - 3} x2={RX + 30} y2={updateY + BH + 4} stroke="var(--ink)" strokeWidth={1.6} strokeDasharray="5 4" markerEnd="url(#fl-arrow)" />
      {loss && (
        <text x={RX + 42} y={(lossY + backpropY + BH) / 2 + 5} fontSize={13.5} className="mono" fill="var(--ink-2)">
          {loss.out}
        </text>
      )}
      {backprop && (
        <text x={RX + 42} y={(backpropY + updateY + BH) / 2 + 5} fontSize={13.5} className="mono" fill="var(--ink-2)">
          {backprop.out}
        </text>
      )}
      <line
        x1={RX - 3}
        y1={updateY + BH / 2}
        x2={FX + FW + 5}
        y2={updateY + BH / 2}
        stroke="var(--ink)"
        strokeWidth={1.6}
        strokeDasharray="5 4"
        markerEnd="url(#fl-arrow)"
      />
      {update && (
        <text x={(RX + FX + FW) / 2 + 2} y={updateY + BH / 2 - 8} textAnchor="middle" fontSize={12} className="mono" fill="var(--ink-2)">
          {update.out}
        </text>
      )}

      <rect x={RX} y={targetY} width={RW} height={30} rx={15} fill="none" stroke="var(--ink-3)" strokeWidth={1.3} strokeDasharray="4 3" />
      <text x={RX + RW / 2} y={targetY + 20} textAnchor="middle" fontSize={12.5} className="mono" fill="var(--ink-2)">
        real next token
      </text>
      <line x1={RX + RW / 2} y1={targetY - 2} x2={RX + RW / 2} y2={lossY + BH + 6} stroke="var(--ink-3)" strokeWidth={1.4} markerEnd="url(#fl-arrow)" />

      {update && <StationBox s={update} x={RX} y={updateY} w={RW} fill="var(--card-2)" />}
      {backprop && <StationBox s={backprop} x={RX} y={backpropY} w={RW} fill="var(--card-2)" />}
      {loss && <StationBox s={loss} x={RX} y={lossY} w={RW} fill="var(--card-2)" />}
    </svg>
  );
}
