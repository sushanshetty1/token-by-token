import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ArrowDown, Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ChangeOne } from "@/components/build/ChangeOne";
import { CopyButton } from "@/components/build/CopyButton";
import { IdeaBoard } from "@/components/build/IdeaBoard";
import { RunChart } from "@/components/build/RunChart";
import { StarterExplorer, type StarterPart } from "@/components/build/StarterExplorer";
import { JsonLd } from "@/components/seo/JsonLd";
import { IDEAS, SIZES, STARTER_RUN } from "@/content/build";
import { breadcrumbs } from "@/lib/schema";
import { abs, ogImage, pageMeta } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "What to build next: 18 LLM projects",
  description:
    "A one-file GPT you can train on a laptop in two minutes, then 18 LLM projects sized for an evening, a weekend or a week, each with first steps and a prompt.",
  path: "/build/",
  image: ogImage("build"),
  imageAlt: "What to build next: a starter GPT and 18 LLM projects",
  type: "article",
  keywords: ["LLM project ideas", "GPT from scratch project", "machine learning projects for beginners", "nanoGPT projects", "tiny GPT PyTorch"],
});

const SOURCE = readFileSync(join(process.cwd(), "public/starter/tiny_gpt.py"), "utf8").replace(/\n$/, "");

function lineOf(marker: string) {
  const i = SOURCE.split("\n").findIndex((l) => l.includes(marker));
  if (i < 0) throw new Error(`tiny_gpt.py has no line containing ${marker}`);
  return i + 1;
}

const LAST = SOURCE.split("\n").length;

const PARTS: StarterPart[] = [
  {
    id: "settings",
    label: "Settings",
    what: "Six numbers set the model's size and the length of the run. They are the first thing to change.",
    ranges: [[lineOf("# Settings."), lineOf("torch.manual_seed") ]],
  },
  {
    id: "data",
    label: "1. Data",
    what: "Every distinct character gets an integer. get_batch cuts random windows of text, and the targets are the same windows shifted by one.",
    ranges: [[lineOf("# 1. Data"), lineOf("return x.to(device), y.to(device)")]],
  },
  {
    id: "model",
    label: "2. Model",
    what: "Embeddings, then four blocks that each add attention and an MLP to the residual stream, then a LayerNorm and a head that scores every character.",
    ranges: [[lineOf("# 2. The model."), lineOf("return logits, None")]],
  },
  {
    id: "loss",
    label: "3. Loss",
    what: "Cross-entropy: minus the log of the probability the model gave the real next character, averaged over all B × T positions.",
    ranges: [[lineOf("# 3. The loss"), lineOf("return logits, loss")]],
  },
  {
    id: "train",
    label: "4. Training loop",
    what: "Sample a batch, run it forward, take the loss, backpropagate, take an AdamW step. Every 250 steps it measures loss on fresh batches.",
    ranges: [[lineOf("model = GPT().to(device)"), lineOf("opt.step()")]],
  },
  {
    id: "sample",
    label: "5. Sampling",
    what: "Feed the text so far in, take the last position's probabilities, draw one character, append it, and go again.",
    ranges: [
      [lineOf("def generate"), lineOf("return idx")],
      [lineOf("# 5. Sampling"), LAST],
    ],
  },
];

const RUN_LOG = [
  "$ python tiny_gpt.py",
  ...STARTER_RUN.header,
  ...STARTER_RUN.steps.map(
    (p) => `step ${String(p.step).padStart(5)}   train ${p.train.toFixed(3)}   val ${p.val.toFixed(3)}   ${String(p.s).padStart(5)} s`,
  ),
  "",
  STARTER_RUN.sample,
].join("\n");

const BUILD_LD = [
  {
    "@type": "SoftwareSourceCode",
    "@id": abs("/build/#starter"),
    name: "tiny_gpt.py",
    description: "A character-level GPT in one Python file that trains on a laptop CPU in about two minutes.",
    programmingLanguage: "Python",
    runtimePlatform: "PyTorch",
    codeSampleType: "full solution",
    license: "https://opensource.org/licenses/MIT",
    url: abs("/starter/tiny_gpt.py"),
    isPartOf: { "@id": abs("/#course") },
  },
  {
    "@type": "ItemList",
    "@id": abs("/build/#projects"),
    name: "LLM projects to build after the course",
    numberOfItems: IDEAS.length,
    itemListElement: IDEAS.map((idea, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: abs(`/build/#${idea.id}`),
      name: idea.title,
      description: `${idea.make} (${SIZES[idea.size].label.toLowerCase()}, ${SIZES[idea.size].hours})`,
    })),
  },
  breadcrumbs([{ name: "What to build next", path: "/build/" }]),
];

const OWN_TEXT = [
  { t: "Any plain text file works", d: "python tiny_gpt.py my_text.txt. It reads the file, builds the vocabulary from it and trains." },
  { t: "One voice, a megabyte or more", d: "A single style learns fastest: one writer, your own notes, a language you speak, the code of one project. Under 100 KB it mostly memorises." },
  { t: "It stays on your laptop", d: "Nothing is uploaded, so private text such as an exported chat is fine to train on. Just keep the samples to yourself." },
  { t: "Read the first number first", d: "Your step 0 loss should be close to ln(vocabulary size). If it is far off, something is wrong before training even starts." },
];

export default function BuildPage() {
  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-24 pt-10 sm:px-6">
      <JsonLd data={BUILD_LD} />

      <header className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-end">
        <div className="max-w-[64ch]">
          <h1 className="font-display text-[clamp(2.2rem,4.6vw,3.4rem)] font-extrabold leading-[1] text-ink">What to build next</h1>
          <p className="mt-4 text-[17px] leading-relaxed text-ink-2">
            You can draw the path from memory. Now make something with it. Start with the starter below: one Python file, a real
            GPT, two minutes on a laptop. Change one thing, then pick a project that fits the time you have.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="/starter/tiny_gpt.py" download className="btn btn-primary !px-4 !py-2.5 !text-[15px]">
              <Download size={16} /> Download tiny_gpt.py
            </a>
            <a href="#projects" className="btn btn-ghost !px-4 !py-2.5 !text-[15px]">
              <ArrowDown size={16} /> Jump to the {IDEAS.length} projects
            </a>
          </div>
        </div>
        <div className="rounded-2xl border-[1.5px] border-ink bg-card p-4 shadow-[var(--press)]">
          <p className="text-[13px] font-semibold text-ink-3">Two commands</p>
          <div className="mt-2 grid gap-2">
            {["pip install torch", "python tiny_gpt.py"].map((c) => (
              <div key={c} className="flex items-center justify-between gap-2 rounded-lg bg-paper-2 py-1.5 pl-3 pr-1.5">
                <code className="font-mono text-[14px] text-ink">{c}</code>
                <CopyButton text={c} />
              </div>
            ))}
          </div>
          <p className="mt-3 text-[13px] leading-snug text-ink-2">
            Python 3.9 or newer. No GPU needed; it uses one if you have it. The first run downloads Tiny Shakespeare (1 MB).
          </p>
        </div>
      </header>

      <section className="mt-16" aria-labelledby="starter">
        <h2 id="starter" className="font-display text-[clamp(1.5rem,2.8vw,2rem)] font-bold text-ink">
          Start here: a GPT in one file
        </h2>
        <p className="mt-1.5 max-w-[68ch] text-[15.5px] text-ink-2">
          Everything from Days 3 to 6 in {SOURCE.split("\n").length} lines, in the same five parts as the course. Pick a part to
          light up its lines, and read it the way you read the code in the lessons.
        </p>
        <div className="mt-6">
          <StarterExplorer source={SOURCE} parts={PARTS} />
        </div>
      </section>

      <section className="mt-16 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" aria-labelledby="run">
        <div>
          <h2 id="run" className="font-display text-[clamp(1.5rem,2.8vw,2rem)] font-bold text-ink">
            What it printed for us
          </h2>
          <p className="mt-1.5 max-w-[60ch] text-[15.5px] text-ink-2">
            A real run on {STARTER_RUN.machine}, same seed as yours. Before you run it, write down the loss you expect at step 0.
          </p>
          <div className="panel mt-5 p-4 sm:p-5">
            <RunChart />
          </div>
          <ul className="mt-5 grid gap-3 text-[14.5px] leading-snug text-ink-2">
            <li className="border-l-2 border-accent pl-3">
              <strong className="text-ink">Step 0 is 4.21, close to ln 65 = 4.17.</strong> With small random weights the model
              spreads its bets evenly over 65 characters. That is the Day 3 number, and it is your first check that the code is
              right.
            </li>
            <li className="border-l-2 border-mark pl-3">
              <strong className="text-ink">Train and val split apart after step 500.</strong> By the end the gap is 0.18. The
              model has started to learn this particular text, not just English. Dropout is there to keep that gap small.
            </li>
            <li className="border-l-2 border-ok pl-3">
              <strong className="text-ink">1.75 is not a big number, but look at the text.</strong> Names in capitals, a colon,
              then lines of verse. It learned the shape of a play from characters alone, in under two minutes.
            </li>
          </ul>
        </div>
        <div className="flex min-w-0 flex-col">
          <div className="panel flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-rule bg-card-2 px-4 py-2.5">
              <span className="font-mono text-[13px] font-semibold text-ink">Terminal</span>
              <span className="text-[12.5px] text-ink-3">{STARTER_RUN.steps.at(-1)?.s} seconds in all</span>
            </div>
            <pre className="flex-1 overflow-x-auto bg-card px-4 py-3 font-mono text-[12.5px] leading-[1.65] text-ink">{RUN_LOG}</pre>
          </div>
        </div>
      </section>

      <section className="mt-16" aria-labelledby="change-one">
        <h2 id="change-one" className="font-display text-[clamp(1.5rem,2.8vw,2rem)] font-bold text-ink">
          Your first hour: change one thing
        </h2>
        <p className="mt-1.5 max-w-[68ch] text-[15.5px] text-ink-2">
          Each card is one edit to tiny_gpt.py. Guess the final val loss and what the text will look like, then open the card to
          see what our run got. Then make the edit and run it yourself.
        </p>
        <div className="mt-6">
          <ChangeOne />
        </div>
      </section>

      <section className="mt-16" aria-labelledby="own-text">
        <h2 id="own-text" className="font-display text-[clamp(1.5rem,2.8vw,2rem)] font-bold text-ink">
          Then train it on your own text
        </h2>
        <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          {OWN_TEXT.map((o) => (
            <div key={o.t} className="border-t-2 border-ink pt-3">
              <dt className="text-[15px] font-bold text-ink">{o.t}</dt>
              <dd className="mt-1 text-[14px] leading-snug text-ink-2">{o.d}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="projects" className="mt-20 scroll-mt-20" aria-labelledby="projects-title">
        <h2 id="projects-title" className="font-display text-[clamp(1.7rem,3.2vw,2.4rem)] font-bold text-ink">
          Pick your next build
        </h2>
        <p className="mb-6 mt-1.5 max-w-[70ch] text-[15.5px] text-ink-2">
          {IDEAS.length} projects, from an evening to a week. Each one names the days it builds on, its first three moves, how you
          know you are done, and a prompt that makes your AI assistant teach you rather than do it for you. If you want one
          finished project to show, do the{" "}
          <Link href="/plan/#project" className="font-semibold text-accent underline underline-offset-4">
            mini project in the plan
          </Link>
          .
        </p>
        <IdeaBoard />
      </section>

      <p className="mt-16 max-w-[70ch] border-t border-rule pt-6 text-[14.5px] text-ink-2">
        Stuck on a project? Go back to the lesson for the part that is not working, or take the{" "}
        <Link href="/day/7/whiteboard/" className="font-semibold text-accent underline underline-offset-4">
          whiteboard test
        </Link>{" "}
        again. Whatever you cannot draw is usually what is broken.
      </p>
    </main>
  );
}
