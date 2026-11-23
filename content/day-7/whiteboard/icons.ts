import { ArrowRight, ChartColumn, Cpu, Dices, Grid3x3, Hash, Layers, Redo2, RefreshCw, RotateCcw, Target, Type, Undo2, Waypoints, type LucideIcon } from "lucide-react";

export const STATION_ICON: Record<string, LucideIcon> = {
  text: Type,
  tokens: Hash,
  embed: Grid3x3,
  attention: Waypoints,
  mlp: Cpu,
  logits: ChartColumn,
  sample: Dices,
  loss: Target,
  backprop: Undo2,
  update: RefreshCw,
};

export const LOOP_ICON: Record<string, LucideIcon> = {
  batch: Layers,
  forward: ArrowRight,
  loss: Target,
  zero: RotateCcw,
  backward: Undo2,
  step: Redo2,
};
