/**
 * The whiteboard path. The course map on the home page is drawn from this list,
 * and every day lights up the stations it teaches.
 */
export interface Station {
  id: string;
  label: string;
  /** What flows out of this station. */
  out: string;
  phase: "forward" | "training";
}

export const PIPELINE: Station[] = [
  { id: "text", label: "Text", out: "a string", phase: "forward" },
  { id: "tokens", label: "Tokens", out: "integer ids", phase: "forward" },
  { id: "embed", label: "Embeddings", out: "vectors (T, C)", phase: "forward" },
  { id: "attention", label: "Attention", out: "mixed vectors", phase: "forward" },
  { id: "mlp", label: "MLP", out: "refined vectors", phase: "forward" },
  { id: "logits", label: "Logits", out: "scores (T, vocab)", phase: "forward" },
  { id: "sample", label: "Sample", out: "next token", phase: "forward" },
  { id: "loss", label: "Loss", out: "one number", phase: "training" },
  { id: "backprop", label: "Backprop", out: "gradients", phase: "training" },
  { id: "update", label: "Update", out: "better weights", phase: "training" },
];

export const stationById = (id: string) => PIPELINE.find((s) => s.id === id);
