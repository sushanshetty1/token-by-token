"use client";

import { Eye } from "lucide-react";
import { useState } from "react";
import { BASELINE_VAL, VARIANTS, type Variant } from "@/content/build";

export function ChangeOne() {
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {VARIANTS.map((v, i) => (
        <VariantCard key={v.id} v={v} wide={i === VARIANTS.length - 1 && VARIANTS.length % 2 === 1} />
      ))}
    </ul>
  );
}

function VariantCard({ v, wide }: { v: Variant; wide: boolean }) {
  const [shown, setShown] = useState(false);
  const delta = v.val - BASELINE_VAL;
  return (
    <li className={`panel flex flex-col p-5 ${wide ? "md:col-span-2" : ""}`}>
      <p className="font-mono text-[13.5px] font-semibold text-ink">
        <span className="rounded-md bg-mark-soft px-1.5 py-0.5">{v.change}</span>
      </p>
      <p className="mt-2 text-[13.5px] leading-snug text-ink-2">{v.what}</p>
      <p className="mt-3 rounded-lg border-[1.5px] border-dashed border-mark bg-mark-soft/50 p-3 text-[14px] leading-snug text-ink">
        <span className="font-semibold">Predict: </span>
        {v.predict}
      </p>
      <div className="mt-auto pt-3">
        {shown ? (
          <div className="rounded-lg bg-ok-soft p-3 text-[14px] leading-snug text-ink">
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-semibold">Val loss {v.val.toFixed(2)}</span>
              <span className="tabular font-mono text-[12.5px] text-ink-2">
                {delta >= 0 ? "+" : "−"}
                {Math.abs(delta).toFixed(2)} against {BASELINE_VAL.toFixed(2)}
              </span>
            </p>
            <p className="mt-1.5">{v.saw}</p>
            {v.sample && <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-md bg-card px-3 py-2 font-mono text-[12px] leading-relaxed text-ink-2">{v.sample}</pre>}
          </div>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={() => setShown(true)}>
            <Eye size={15} /> I made my guess, show me
          </button>
        )}
      </div>
    </li>
  );
}
