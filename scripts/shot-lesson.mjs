// Screenshot every step of one lesson in a single browser session.
// Usage: node scripts/shot-lesson.mjs <day> <slug> <outDir> [--dark] [--w=1440] [--h=900] [--wait=2200] [--stage]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const [, , day, slug, outDir, ...flags] = process.argv;
const opt = (n, d) => flags.find((f) => f.startsWith(`--${n}=`))?.split("=")[1] ?? d;
const dark = flags.includes("--dark");
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({
  viewport: { width: Number(opt("w", 1440)), height: Number(opt("h", 900)) },
  colorScheme: dark ? "dark" : "light",
});
await ctx.addInitScript((t) => localStorage.setItem("tbt:theme", t), dark ? "dark" : "light");
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(`http://localhost:3140/day/${day}/${slug}/#1`, { waitUntil: "networkidle", timeout: 90000 });
await page.waitForTimeout(1500);
const total = await page.locator('[aria-label^="Step "]').count();
for (let i = 0; i < total; i++) {
  await page.waitForTimeout(Number(opt("wait", 2200)));
  const target = flags.includes("--stage") ? page.locator('section[aria-label="Animated stage"]') : page;
  await target.screenshot({ path: `${outDir}/step-${String(i + 1).padStart(2, "0")}.png` });
  await page.keyboard.press("ArrowRight");
}
console.log(`saved ${total} steps to ${outDir}`);
if (errors.length) console.log("PAGE ERRORS:\n" + [...new Set(errors)].join("\n"));
await browser.close();
