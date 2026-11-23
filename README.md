# Token by Token

Build an LLM from scratch in 7 days. Token by Token is a Next.js app that teaches how a large language model works from the inside: animated, step-by-step lessons build the picture in your head, Karpathy's and 3Blue1Brown's videos make you build it in code, and a self-check at the end of every day makes sure you can explain it in an interview.

The finish line is the whiteboard test: draw the whole path from memory and say what flows along every arrow.

```
text -> tokens -> embeddings -> attention + MLP blocks -> logits -> loss -> backprop -> updated weights
```

The approach is AI-first. Let AI type the code; you must be able to explain every line.

## What is in the app

| Route | What it is |
| --- | --- |
| `/` | The course map: the path diagram, the seven days, and a live tokenizer (GPT-2 and GPT-4o BPE in the browser). |
| `/day/<n>/` | One day: its lessons, the video chapters to watch, skim or skip, the build, experiments, and interview questions with model answers. |
| `/day/<n>/<slug>/` | One animated lesson, played step by step with predictions, a code dock and a live stage. |
| `/plan/` | The 7-day study plan as a printable document, with a Download PDF button. |
| `/cheatsheet/` | The interview cheat sheet: shapes, formulas and numbers worth knowing. |
| `/day/7/whiteboard/` | The whiteboard test and the interview drill. |

Day 5's "Train a tiny GPT" lesson trains a real character-level transformer in your browser. The engine is plain TypeScript with hand-written forward and backward passes (`lib/engine/`), running in a Web Worker.

Progress (lessons seen, ticked checklists) lives in your browser's `localStorage` under `tbt:progress:v1`. Ticks on the plan and on the day pages share the same ids, so ticking a question in one place ticks it in the other.

## Run it

You need [Bun](https://bun.sh) and Node. Screenshots and the PDF also need Google Chrome installed.

```bash
bun install
bun run dev -- --port 3140   # http://localhost:3140, the port the scripts below expect
```

Build a static site:

```bash
bun run build          # static export to out/
bun run serve          # http://localhost:3150
```

`next.config.ts` sets `output: "export"` and `trailingSlash: true`, so every page is a plain HTML file in `out/` and the app can be hosted anywhere that serves static files. The build script sets `NEXT_LOADER_THREADS=1`, which makes Turbopack run its CSS loaders in worker threads instead of a socket-based child-process pool (that pool failed to start in this machine's sandboxed shells). `NEXT_DIST_DIR` picks the output folder, so a build never touches the dev server's `.next`.

## How the 7 days work

About 18 hours in total, two to three hours a day. Every day runs the same loop: learn it in the app, watch the marked video chapters, build it with AI while you explain each line, then check yourself out loud.

| Day | Title | Lessons |
| --- | --- | --- |
| 1 | The whole picture | A prompt's journey; One token at a time |
| 2 | How networks learn | Derivatives on a graph; Backprop, node by node; The training loop |
| 3 | Tokens and embeddings | Tokenization with BPE; Embeddings and positions; A bigram model and its loss |
| 4 | Self-attention | Tokens talking; Queries, keys and values; Multi-head attention |
| 5 | The block, and training it | Anatomy of a block; Train a tiny GPT; Break it on purpose |
| 6 | Scale, and how it answers you | Counting GPT-2's parameters; Training at scale; How the model answers you |
| 7 | From GPT to ChatGPT | From GPT to ChatGPT; What changed since GPT-2; The whiteboard test |

Beyond the original Zero to Hero path, the plan covers inference (prefill and decode, the KV cache, sampling), what changed since GPT-2 (RoPE, RMSNorm, SwiGLU, grouped-query attention, mixture of experts), napkin math, and a timed interview drill. It ends with a mini project: train your own small GPT on text you care about and write it up.

## How the content is organised

```
content/
  curriculum.ts          the seven days, in order
  lessons.ts             lazy loaders for every lesson module
  day-<n>/
    day.ts               the day's data: schedule, lessons, videos and chapters, build, prompts,
                         experiments, interview questions, lines to say out loud
    <slug>/index.tsx     one lesson
lib/types.ts             the contracts: DayContent, LessonModule, LessonStep, StageProps
lib/pipeline.ts          the stations of the whiteboard path
components/player/       the lesson player and code dock
components/viz/          SVG primitives and controls every stage is drawn with
app/plan/                the 7-day plan page and its print layout
```

A lesson is a `LessonModule`: 3 to 5 learning outcomes, a legend for every color on the stage, optional real PyTorch code, and 7 to 11 steps. Each step has a kind (intuition, problem, mechanism, insight, try, recap), a title and a short body, and can add a prediction question to answer before reading on, highlight lines of the code, and update live readings. The `Stage` component draws one evolving scene on a 960 by 540 canvas and redraws for every step.

Read [AUTHORING.md](AUTHORING.md) before writing or changing a lesson. It has the visual language, the writing rules (no em dashes, sentence case, concrete numbers), the rules for working in parallel, and how to verify a lesson.

## Regenerate the PDF

The Download PDF button on `/plan/` serves `public/LLM_From_Scratch_7_Days.pdf`. It is generated from the page itself, so regenerate it whenever a `day.ts` changes:

```bash
bun run dev -- --port 3140      # in one terminal
bun run pdf                     # in another; prints the page count
```

The script opens `http://localhost:3140/plan/` in your local Chrome through Playwright, in the light theme with print styles, and writes an A4 PDF with page numbers. Pass a different address as the first argument (for example `node scripts/make-pdf.mjs http://localhost:3000/plan/`) or `--out=path.pdf` to write somewhere else. It refuses to write anything if the page fails to render.

To check the result, rasterize the pages and look at them, for example `pdftoppm -r 60 -png public/LLM_From_Scratch_7_Days.pdf /tmp/plan`.

## Scripts and checks

| Command | What it does |
| --- | --- |
| `node scripts/shot.mjs <url> <out.png>` | Screenshot a page (`--dark`, `--w=390 --h=844` for a phone, `--full`, `--wait=3000`). Prints page errors. |
| `node scripts/shot-lesson.mjs <day> <slug> <outDir>` | Screenshot every step of one lesson. |
| `node scripts/montage.mjs <out.png> <cols> <width> <img...>` | Combine screenshots into one grid image. |
| `bun run pdf` | Regenerate the plan PDF. |
| `npx tsc --noEmit -p .` | Type-check. |
| `bun run lint` | ESLint. |
| `bun run test` | Tests for the in-browser training engine (gradient checks, initial loss, determinism). |

## Credits

The videos and reference code are by Andrej Karpathy (micrograd, minbpe, ng-video-lecture, build-nanogpt, nanoGPT and nanochat) and 3Blue1Brown. This app links to them rather than copying them, and its code samples are compact versions written in the style of micrograd and nanoGPT (both MIT licensed).
