import { ALL_LESSONS, DAYS, TOTAL_MINUTES } from "@/content/curriculum";
import { SITE, abs } from "@/lib/site";

const head = () =>
  [
    `# ${SITE.name}: ${SITE.tagline}`,
    "",
    `> ${SITE.description}`,
    "",
    `${ALL_LESSONS.length} animated lessons over 7 days, about ${Math.round(TOTAL_MINUTES / 60)} hours in all. Free, no sign-up. Each day pairs lessons in the browser with chapters of Andrej Karpathy's "Neural Networks: Zero to Hero" and 3Blue1Brown's deep learning series, a build task done with an AI assistant, and interview questions with model answers.`,
    "",
  ].join("\n");

/** The short index described at llmstxt.org. */
export function llmsIndex() {
  const out = [head(), "## Days and lessons", ""];
  for (const d of DAYS) {
    out.push(`- [Day ${d.n}: ${d.title}](${abs(`/day/${d.n}/`)}): ${d.tagline}`);
    for (const l of ALL_LESSONS.filter((x) => x.day === d.n)) {
      out.push(`  - [${l.title}](${abs(`/day/${l.day}/${l.slug}/`)}): ${l.promise} (${l.minutes} min, ${l.level})`);
    }
  }
  out.push(
    "",
    "## Reference",
    "",
    `- [The 7-day plan](${abs("/plan/")}): what to learn, watch, build and check each day`,
    `- [Printable plan (PDF)](${abs("/LLM_From_Scratch_7_Days.pdf")})`,
    `- [Interview cheat sheet](${abs("/cheatsheet/")}): tensor shapes, formulas, model sizes and a glossary`,
    "",
    "## Optional",
    "",
    `- [Full text](${abs("/llms-full.txt")}): every day's outcome, lessons, videos and interview questions with answers`,
    "",
  );
  return out.join("\n");
}

/** Everything a model needs to answer questions about the course, in one file. */
export function llmsFull() {
  const out = [head()];
  for (const d of DAYS) {
    out.push(`## Day ${d.n}: ${d.title}`, "", `URL: ${abs(`/day/${d.n}/`)}`, "", d.tagline, "", `Outcome: ${d.outcome}`, "", "### Lessons", "");
    for (const l of ALL_LESSONS.filter((x) => x.day === d.n)) {
      out.push(`- ${l.title} (${abs(`/day/${l.day}/${l.slug}/`)}): ${l.promise}`);
    }
    out.push("", "### Watch", "");
    for (const r of d.watch) out.push(`- ${r.title}, ${r.by} (${r.url}): ${r.why}`);
    out.push("", "### Build", "", ...d.build.map((b) => `- ${b}`), "", "### Say it out loud", "", ...d.explainOutLoud.map((e) => `- ${e}`));
    out.push("", "### Interview questions", "");
    for (const c of d.checks) out.push(`Q: ${c.q}`, "", `A: ${c.a}`, "");
  }
  return out.join("\n");
}
