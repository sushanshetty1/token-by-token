// Draw the share cards (public/og/*.png, 1200x630) and the app icons with the local Chrome.
// Every card shows its own title cut into real GPT tokens, the idea the course is named after.
// Usage: node scripts/make-og.mjs   (rerun after changing a day's or lesson's title or promise)
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { encode, decode } from "gpt-tokenizer";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const days = [];
for (let n = 1; n <= 7; n++) {
  days.push((await import(pathToFileURL(resolve(root, `content/day-${n}/day.ts`)).href)).default);
}
const lessons = days.flatMap((d) => d.lessons.map((l, i) => ({ ...l, day: d.n, index: i, of: d.lessons.length })));
const hours = (m) => `${Math.round(m / 6) / 10} h`.replace(".0 ", " ");
const totalMin = days.reduce((s, d) => s + d.schedule.reduce((a, b) => a + b.minutes, 0), 0);

const cards = [
  {
    slug: "home",
    kicker: "Build a tiny GPT from scratch in 7 days",
    title: "Learn how a language model thinks, one token at a time.",
    sub: "Animated lessons, Karpathy's build-it videos and interview questions with answers.",
    pills: [`${lessons.length} lessons`, `${Math.round(totalMin / 60)} h`, "Free"],
    big: true,
  },
  {
    slug: "plan",
    kicker: "Study plan",
    title: "The 7-day plan",
    sub: "What to learn, watch, build and check each day, from first token to a GPT you can explain.",
    pills: ["7 days", "Printable PDF"],
  },
  {
    slug: "cheatsheet",
    kicker: "Interview prep",
    title: "LLM interview cheat sheet",
    sub: "Tensor shapes, the formulas, the model sizes and the words that come up again and again.",
    pills: ["Shapes", "Formulas", "Glossary"],
  },
  ...days.map((d) => ({
    slug: `day-${d.n}`,
    kicker: `Day ${d.n} of 7`,
    title: d.title,
    sub: d.tagline,
    pills: [`${d.lessons.length} lessons`, hours(d.schedule.reduce((a, b) => a + b.minutes, 0)), `${d.checks.length} interview questions`],
  })),
  ...lessons.map((l) => ({
    slug: `day-${l.day}-${l.slug}`,
    kicker: `Day ${l.day}, lesson ${l.index + 1} of ${l.of}`,
    title: l.title,
    sub: l.promise,
    pills: [`${l.minutes} min`, l.level],
  })),
];

for (const c of cards) {
  c.tokens = encode(c.title).map((id) => ({ id, text: decode([id]) }));
}

const font = (p) => `data:font/woff2;base64,${readFileSync(resolve(root, "node_modules", p)).toString("base64")}`;
const MARK = `<svg viewBox="0 0 30 30"><rect x="1" y="1" width="28" height="28" rx="7" fill="#17212b"/><rect x="5" y="11" width="6" height="8" rx="1.6" fill="#2f52d0"/><rect x="12" y="11" width="6" height="8" rx="1.6" fill="#f6f7f5"/><rect x="19" y="11" width="6" height="8" rx="1.6" fill="#e4972a"/></svg>`;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: Bricolage; src: url(${font("@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-standard-normal.woff2")}) format("woff2"); font-weight: 200 800; font-stretch: 75% 100%; }
@font-face { font-family: JBM; src: url(${font("@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2")}) format("woff2"); font-weight: 100 800; }
* { box-sizing: border-box; margin: 0; }
body { width: 1200px; height: 630px; font-family: Bricolage; color: #17212b; background: #eef1ee; }
#card { position: relative; width: 1200px; height: 630px; padding: 52px 64px 0; display: flex; flex-direction: column; overflow: hidden;
  background-color: #fafbf9;
  background-image: linear-gradient(#e3e8e4 1px, transparent 1px), linear-gradient(90deg, #e3e8e4 1px, transparent 1px);
  background-size: 30px 30px; background-position: -1px -1px; }
.top { display: flex; align-items: center; justify-content: space-between; }
.brand { display: flex; align-items: center; gap: 14px; font-weight: 750; font-size: 27px; letter-spacing: -0.01em; font-variation-settings: "wdth" 88; }
.brand svg { width: 46px; height: 46px; }
.kicker { font: 650 21px/1 JBM; padding: 11px 16px; border: 2px solid #17212b; border-radius: 12px; background: #fafbf9; box-shadow: 0 3px 0 #17212b; }
.body { margin-top: 46px; flex: 1; }
h1 { font-weight: 800; font-size: 84px; line-height: 0.98; letter-spacing: -0.025em; font-variation-settings: "wdth" 88; max-width: 1020px; text-wrap: balance; }
.big h1 { font-size: 74px; max-width: 1060px; }
p { margin-top: 22px; font-size: 30px; line-height: 1.3; color: #47525e; max-width: 980px; text-wrap: pretty;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.pills { display: flex; gap: 10px; margin-top: 26px; }
.pill { font-size: 21px; font-weight: 600; color: #47525e; padding: 7px 15px; border: 1.5px solid #b9c3bc; border-radius: 999px; background: #f4f6f3; }
.strip { position: absolute; left: 0; right: 0; bottom: 0; padding: 22px 64px 30px; border-top: 2px solid #17212b; background: #17212b;
  overflow: hidden; }
.row { display: flex; gap: 10px; align-items: flex-end; -webkit-mask-image: linear-gradient(90deg, #000 86%, transparent); }
.tok { flex: none; display: flex; flex-direction: column; align-items: center; gap: 7px; }
.tok b { font: 600 27px/1 JBM; padding: 12px 13px; border-radius: 10px; color: #17212b; white-space: pre; }
.tok i { font: 500 15px/1 JBM; font-style: normal; color: #7a8591; }
.sp { color: rgba(23,33,43,.35); }
</style></head><body><div id="card"></div></body></html>`;

const FILLS = ["#dfe5fb", "#fbecd2", "#d9efe2", "#f7dde2", "#e7e1fa"];

function render({ c, fills }) {
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const card = document.getElementById("card");
  card.className = c.big ? "big" : "";
  const toks = c.tokens
    .map((t, i) => {
      const shown = esc(t.text).replace(/^ /, '<span class="sp">·</span>');
      return `<div class="tok"><b style="background:${fills[i % fills.length]}">${shown}</b><i>${t.id}</i></div>`;
    })
    .join("");
  card.innerHTML = `
    <div class="top"><div class="brand">${window.MARK}Token by Token</div><div class="kicker">${esc(c.kicker)}</div></div>
    <div class="body"><h1>${esc(c.title)}</h1>${c.sub ? `<p>${esc(c.sub)}</p>` : ""}
      <div class="pills">${c.pills.map((p) => `<span class="pill">${esc(p)}</span>`).join("")}</div></div>
    <div class="strip"><div class="row">${toks}</div></div>`;
}

const outDir = resolve(root, "public/og");
mkdirSync(outDir, { recursive: true });
mkdirSync(resolve(root, "public/icons"), { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(html);
  await page.evaluate((m) => (window.MARK = m), MARK);
  await page.evaluate(() => document.fonts.ready);
  for (const c of cards) {
    await page.evaluate(render, { c, fills: FILLS });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: resolve(outDir, `${c.slug}.png`), clip: { x: 0, y: 0, width: 1200, height: 630 } });
  }
  // A fingerprint per card goes into the URL, so a redrawn card is never served from a CDN or chat-app cache.
  const versions = Object.fromEntries(
    cards.map((c) => [c.slug, createHash("sha1").update(readFileSync(resolve(outDir, `${c.slug}.png`))).digest("hex").slice(0, 10)]),
  );
  writeFileSync(resolve(root, "lib/og-versions.json"), `${JSON.stringify(versions, null, 2)}\n`);
  console.log(`Wrote ${cards.length} cards to public/og/`);

  const icon = async (size, file, { maskable = false } = {}) => {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<body style="margin:0;width:${size}px;height:${size}px;display:grid;place-items:center;background:${maskable ? "#17212b" : "transparent"}">` +
        `<div style="width:${maskable ? size * 0.72 : size}px;height:${maskable ? size * 0.72 : size}px">${MARK.replace("<svg ", '<svg width="100%" height="100%" ')}</div></body>`,
    );
    await page.screenshot({ path: resolve(root, file), omitBackground: !maskable });
  };
  await icon(192, "public/icons/icon-192.png");
  await icon(512, "public/icons/icon-512.png");
  await icon(512, "public/icons/icon-maskable-512.png", { maskable: true });
  await icon(180, "app/apple-icon.png", { maskable: true });
  console.log("Wrote icons");
} finally {
  await browser.close();
}
