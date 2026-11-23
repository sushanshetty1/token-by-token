import type { LessonModule } from "@/lib/types";

type Loader = () => Promise<{ default: LessonModule }>;

/** Every lesson's module, loaded only when its page opens. */
export const LESSON_LOADERS: Record<string, Loader> = {
  "1/prompt-journey": () => import("./day-1/prompt-journey"),
  "1/next-token": () => import("./day-1/next-token"),
  "2/derivatives": () => import("./day-2/derivatives"),
  "2/backprop": () => import("./day-2/backprop"),
  "2/training-loop": () => import("./day-2/training-loop"),
  "3/tokenization": () => import("./day-3/tokenization"),
  "3/embeddings": () => import("./day-3/embeddings"),
  "3/bigram": () => import("./day-3/bigram"),
  "4/averaging": () => import("./day-4/averaging"),
  "4/qkv": () => import("./day-4/qkv"),
  "4/multi-head": () => import("./day-4/multi-head"),
  "5/block": () => import("./day-5/block"),
  "5/train-lab": () => import("./day-5/train-lab"),
  "5/break-it": () => import("./day-5/break-it"),
  "6/gpt2-params": () => import("./day-6/gpt2-params"),
  "6/scale-tricks": () => import("./day-6/scale-tricks"),
  "6/inference": () => import("./day-6/inference"),
  "7/post-training": () => import("./day-7/post-training"),
  "7/modern": () => import("./day-7/modern"),
  "7/whiteboard": () => import("./day-7/whiteboard"),
};
