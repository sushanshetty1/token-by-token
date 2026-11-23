"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * The test is HTML, not SVG, so it gets its own fixed canvas: 760 x 428 (16:9),
 * scaled to fit the stage the way the SVG stages scale their viewBox.
 */
export const CANVAS_W = 760;
export const CANVAS_H = 428;

export function FitCanvas({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setBox((b) => (b && b.w === width && b.h === height ? b : { w: width, h: height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const s = box ? Math.min(box.w / CANVAS_W, box.h / CANVAS_H) : 0;
  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      {box && (
        <div
          className="absolute"
          style={{
            width: CANVAS_W,
            height: CANVAS_H,
            left: (box.w - CANVAS_W * s) / 2,
            top: (box.h - CANVAS_H * s) / 2,
            transform: `scale(${s})`,
            transformOrigin: "0 0",
          }}
        >
          <div className="h-full p-5">{children}</div>
        </div>
      )}
    </div>
  );
}
