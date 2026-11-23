# Scripts

Everything in `scripts/` drives your local Google Chrome through Playwright, so Chrome must be installed. Run them from the repository root against a running copy of the app: the dev server on port 3140 (`bun run dev -- --port 3140`) or the static build on port 3150 (`bun run build && bun run serve`).

| Command | Needs | What it writes |
| --- | --- | --- |
| `bun run pdf` | dev server on 3140 | `public/LLM_From_Scratch_7_Days.pdf` |
| `bun run og` | nothing running; Node 23.6+ | `public/og/*.png`, `public/icons/*.png`, `app/apple-icon.png` |
| `bun run gifs` | static build on 3150; ffmpeg | `docs/media/*.gif` |
| `node scripts/shot.mjs <url> <out.png>` | either server | one screenshot |
| `node scripts/shot-lesson.mjs <day> <slug> <outDir>` | dev server | a screenshot of every step of a lesson |
| `node scripts/montage.mjs <out.png> <cols> <width> <img...>` | nothing | screenshots combined into one grid |

## The plan PDF

The Download PDF button on `/plan/` serves `public/LLM_From_Scratch_7_Days.pdf`. It is printed from the page itself in the light theme with print styles, A4 with page numbers, so regenerate it whenever a `day.ts` or `app/plan/content.ts` changes.

Pass a different address as the first argument (`node scripts/make-pdf.mjs http://localhost:3000/plan/`) or `--out=path.pdf` to write somewhere else. The script refuses to write anything if the page fails to render. To check the result, rasterize it: `pdftoppm -r 60 -png public/LLM_From_Scratch_7_Days.pdf /tmp/plan`.

## Share cards and icons

`bun run og` reads every `day.ts` directly (Node strips the TypeScript types, hence Node 23.6 or newer), cuts each page's title into GPT-4o tokens with `gpt-tokenizer`, and draws a 1200 × 630 card with the app's own fonts. Rerun it after changing a day's or a lesson's title, tagline or promise, and commit the PNGs.

## README GIFs

`bun run gifs` opens each scene in `scripts/record-gifs.mjs`, records it with Chrome's screencast (a frame on every repaint) and encodes a GIF with ffmpeg at 12 frames per second. Record one scene with `--only=train`, or point it at another address with `node scripts/record-gifs.mjs http://localhost:3140`. Keep each GIF under about 2 MB so the README loads quickly.

## Screenshots

`scripts/shot.mjs` takes `--dark`, `--full`, `--w=390 --h=844` for a phone, `--wait=3000` and `--keys=ArrowRight,ArrowRight`, and prints any page errors. Use it to check your work before opening a pull request.
