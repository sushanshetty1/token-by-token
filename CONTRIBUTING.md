# Contributing

Thanks for helping make LLMs easier to understand. Three kinds of change are especially welcome:

- **Fixes.** A wrong number, a broken animation, a step that confuses you. If it confused you, it confuses others.
- **Clearer explanations.** Shorter bodies, better "guess before you look" questions, sharper interview answers.
- **New lessons.** Open a lesson idea issue first so we can agree on where it sits in the seven days.

## Set up

```bash
bun install
bun run dev -- --port 3140
```

## Before you open a pull request

```bash
bun run lint
bun run typecheck
bun run test
bun run build
```

CI runs the same four commands. For anything visual, attach before and after screenshots (`node scripts/shot.mjs`, see [docs/scripts.md](docs/scripts.md)) in both themes, and at phone width if the layout changed.

## Writing a lesson

Read [docs/authoring.md](docs/authoring.md) first. It is the contract for lessons: the `LessonModule` shape, the visual language, the color meanings and how to verify every step. The short version of the writing rules:

- Concrete numbers over adjectives. Show the 4.17, not "high".
- Sentence case, plain verbs, no em dashes.
- One idea per step. If a body needs a third paragraph, it is two steps.
- Every color on the stage has a legend entry and means the same thing in every lesson.

## Changing a title or a promise

Titles and promises appear on the share cards, so rerun `bun run og` and commit the new PNGs. If a `day.ts` changed, regenerate the PDF with `bun run pdf`.

## Commits and pull requests

Keep a pull request to one change. Write the commit subject as what the change does ("Fix the softmax rounding in the next-token lesson"), and say in the description how you checked it.
