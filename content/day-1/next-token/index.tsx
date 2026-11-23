"use client";

import type { LessonModule } from "@/lib/types";
import { StubStage } from "@/components/viz/StubStage";

const lesson: LessonModule = {
  learn: ["This lesson is being written."],
  steps: [
    {
      label: "Soon",
      kind: "intuition",
      title: "This lesson is on its way",
      body: <p>The animated version of this lesson is being built. Use the day page for the videos and self-check meanwhile.</p>,
    },
  ],
  Stage: StubStage,
};

export default lesson;
