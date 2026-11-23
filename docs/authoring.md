# Authoring guide for Token by Token

Token by Token is a Next.js 16 app that teaches how an LLM works from the inside, in 7 days.
Each day = 2 or 3 animated lessons in this app + Karpathy/3Blue1Brown videos + a self-check.
The learner is a software engineer preparing for interviews. They want to understand LLMs
"from core": able to explain every line of a GPT and draw the full path from memory:
text -> tokens -> embeddings -> attention + MLP blocks -> logits -> loss -> backprop -> updated weights.

Read this whole file before writing anything. Then read these files, which are the system:

- `lib/types.ts`: the `LessonModule`, `LessonStep`, `StageProps`, `DayContent` contracts.
- `components/viz/svg.tsx`: SVG primitives (Svg, Box, Chip, Cells, Matrix, Arrow, Pill, Packet, Label, Bars, Bracket, Appear).
- `components/viz/controls.tsx`: HTML controls for interactive stages (StageOverlay, Slider, Toggle, Segmented).
- `components/viz/TokenizerPlayground.tsx` and `lib/tokenizer.ts`: real GPT-2 / GPT-4o BPE in the browser.
- `lib/color.ts`: `diverging`, `sequential`, `tokenTint`, `seededVector`, `softmax`, `fmt`.
- `components/player/LessonPlayer.tsx`: how a lesson is played (so you know what the learner sees).
- `content/day-1/prompt-journey/` once it exists: the reference lesson written by the lead. Match its quality.

## What a lesson is

A lesson lives in `content/day-N/<slug>/index.tsx` and default-exports a `LessonModule`:

```tsx
"use client";
import type { LessonModule } from "@/lib/types";
import { Stage } from "./Stage";

const lesson: LessonModule = {
  rail: [{ id: "shape", label: "Tensor shape" }, ...],   // optional live readings strip (3 to 5 slots)
  learn: ["...", "..."],                                   // 3 to 5 "You will be able to" outcomes
  legend: [{ label: "query", color: "var(--q)" }, ...],    // explains every color/glyph on the stage
  code: { filename: "gpt.py", source: CODE },              // optional; real, runnable-looking PyTorch
  steps: [ ...7 to 11 steps... ],
  Stage,
};
export default lesson;
```

Each `LessonStep`:
- `label`: 1-2 words for the stepper ("Scores", "Mask", "Softmax").
- `kind`: "intuition" | "problem" | "mechanism" | "insight" | "try" | "recap". Use them like a story:
  open with intuition or a problem, explain mechanisms, land insights, give at least one "try" step
  where the learner plays with a control on the stage, end with a "recap".
- `title`: the step's headline, sentence case.
- `body`: 2 short paragraphs max (JSX: `<p>`, `<strong>`, `<code>`). Plain, concrete, numbers over adjectives.
- `keyIdea`: optional, one or two sentences worth memorizing. Use on about half the steps, not all.
- `changed`: optional bullets describing what just changed on the stage.
- `predict`: at least 2 per lesson. A multiple-choice guess shown BEFORE the learner reads on:
  `{ question, options: [3 or 4], answer: index, explain }`. Make them genuinely make you think
  (shapes, loss values, what breaks). The stage for that step should not give the answer away
  until the next step.
- `code`: `{ ranges: [[start, end]], caption }` highlights lines of `lesson.code` (1-based) for this step.
  If a lesson has code, most mechanism steps should point at the exact lines.
- `rail`: values for rail slots, merged cumulatively (so set a value when it changes).
- `learns`: indices into `learn` ticked once this step is reached.

The `Stage` component receives `{ step, playing, runId, goTo }`. The player remounts it on every
step change and on Replay (it is keyed by step and runId), so entrance animations replay for free.
`playing` is false while paused: stop loops (Packet takes `playing`).

Stage canvas: the stage area is 16:9, graph paper background, `position: relative`. Draw with
`<Svg>` (viewBox 960 x 540) using the primitives. For interactive steps, render HTML controls
inside `<StageOverlay>` (absolute positioned card) on top of, or beside, the SVG. Keep everything
inside the viewBox with at least 24px margin. Nothing may overlap or clip. Text minimum 11px
in viewBox units; body labels 13 to 15.

A stage usually keeps ONE scene that evolves across steps (like a diagram that fills in), rather
than 10 unrelated pictures. Use `step` to decide what is visible, highlighted, dimmed (Box `dim`),
or animated. The learner should always know where they are in the bigger picture.

## Visual language (do not invent new colors)

- Every number in a vector or matrix is a cell colored by `diverging(v, max)`: negative leans
  ultramarine (`var(--neg)`), positive leans saffron (`var(--pos)`), zero is blank. Probabilities
  and attention weights use `sequential(p, color)`.
- Query = `var(--q)` (blue), key = `var(--k)` (rose), value = `var(--v)` (green). Always.
- Tokens are `Chip`s colored by `tokenTint(index)`; spaces are shown as `·`.
- Emphasis / "you are here" = `var(--mark)` (saffron). Primary actions = `var(--accent)`.
- Masked / not allowed = the hatch pattern (`url(#hatch)`, Matrix `masked`).
- Tones for Box/Pill/Arrow: "ink" | "accent" | "mark" | "q" | "k" | "v" | "ok" | "bad" | "violet" | "muted".
- Only use CSS variables from `app/globals.css`, never hex colors. Both light and dark themes must work.
- Use Tailwind classes that map to the tokens: `text-ink`, `text-ink-2`, `bg-card`, `border-rule`, `bg-accent-soft`, etc.
- Motion: `Appear`, `Arrow` (draws itself), `Packet` (dot travelling), `motion/react`. One purposeful
  motion per step; no decorative looping except data flowing along an arrow.

## Writing rules (the user is strict about these)

- No em dashes or en dashes anywhere (in copy, code comments, or strings). Use commas, colons, periods, parentheses.
- Sentence case everywhere. No ALL CAPS labels. No "→" glued onto button text.
- Address the learner as "you". Short sentences. Concrete numbers. No filler, no hype.
- Interview-grade accuracy. Every claim must be correct. When simplifying, say so in one clause.
- Tensor shapes in the `(B, T, C)` convention from Karpathy's videos: B batch, T time/sequence,
  C channels/embedding, plus `vocab_size`, `n_head`, `head_size`.
- Code samples: minimal PyTorch in the style of Karpathy's nanoGPT/micrograd (MIT licensed), but write
  your own compact version. Real, correct, idiomatic. Comment only non-obvious lines. Keep files
  under about 60 lines so the code dock stays readable.
- No native `alert/confirm/prompt`, no `title=""` tooltips for important info.

## Day content (`content/day-N/day.ts`)

Each day agent also fills the empty arrays in its own `day.ts`:
- `aiPrompts`: 3 prompts the learner can paste into an AI assistant for that day's build.
- `experiments`: 2 or 3 `{ title, predict, how, expect }` "predict then break it" experiments.
- `checks`: 6 to 8 interview questions with model answers (2 to 5 sentences each, precise).
- `explainOutLoud`: 3 to 5 one-sentence lines the learner should be able to say.
Do not change `lessons`, `watch`, `schedule`, `title` without a strong reason (titles/slugs are
wired into routes). Fix a factual error if you find one.

## Rules for working in parallel

Several agents work in this tree at the same time.
- Only create or edit files inside the folders you own. Put lesson-specific components inside
  your lesson folder (for example `content/day-4/qkv/Heatmap.tsx`).
- Do not edit shared files (`components/**`, `lib/**`, `app/**`, `globals.css`, `package.json`,
  `content/lessons.ts`, `content/curriculum.ts`). If a shared primitive has a bug or you need a
  new capability, work around it locally and report it in your final message.
- Do not install packages. Do not run `next build` (it fights the dev server). Do not commit.
- A dev server is already running at http://localhost:3140 with hot reload. Lessons are at
  `http://localhost:3140/day/<n>/<slug>/#<step number, 1-based>`.

## How to verify (required before you report done)

1. Types: `npx tsc --noEmit -p . 2>&1 | grep -E "content/day-N"` must print nothing for your files.
2. Lint: `npx eslint content/day-N` must pass.
3. Screenshots: `node scripts/shot.mjs "http://localhost:3140/day/N/slug/#K" "$TMPDIR/dN-slug-K.png"`
   (run it with the sandbox disabled: it launches the local Chrome). Flags: `--dark`, `--w=390 --h=844`
   for phone, `--wait=3000`, `--full`. It prints PAGE ERRORS if the page threw. Read the PNG files and
   look at them critically: every step of every lesson in light mode, a few in dark mode, one on a phone
   width. Fix overlaps, clipping, unreadable text, empty space, and anything that looks unfinished.
4. Check the console errors printed by the script are empty.

Report back: what you built (per lesson, one line per step), the verification you ran, anything
you could not do, and any shared-file issue you worked around.
