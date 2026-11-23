"use client";

import { Svg, Label } from "./svg";

export function StubStage() {
  return (
    <Svg label="Lesson in progress">
      <Label x={480} y={270} size={18} color="var(--ink-3)">
        This lesson is being drawn.
      </Label>
    </Svg>
  );
}
