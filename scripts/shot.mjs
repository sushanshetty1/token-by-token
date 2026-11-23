// Screenshot a page of the running dev server with the local Chrome.
// Usage: node scripts/shot.mjs <url> <out.png> [--w=1440] [--h=900] [--dark] [--full] [--wait=2500] [--keys=ArrowRight,ArrowRight]
import { chromium } from "playwright";

const [, , url, out, ...flags] = process.argv;
const opt = (name, dflt) => flags.find((f) => f.startsWith(`--${name}=`))?.split("=")[1] ?? dflt;
const dark = flags.includes("--dark");

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({
  viewport: { width: Number(opt("w", 1440)), height: Number(opt("h", 900)) },
  deviceScaleFactor: 1,
  colorScheme: dark ? "dark" : "light",
});
await ctx.addInitScript((t) => localStorage.setItem("tbt:theme", t), dark ? "dark" : "light");
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
await page.waitForTimeout(Number(opt("wait", 2500)));
for (const k of (opt("keys", "") || "").split(",").filter(Boolean)) {
  await page.keyboard.press(k);
  await page.waitForTimeout(700);
}
if (opt("keys", "")) await page.waitForTimeout(Number(opt("wait", 2500)));
await page.screenshot({ path: out, fullPage: flags.includes("--full") });
if (errors.length) console.log("PAGE ERRORS:\n" + errors.join("\n"));
console.log("saved", out);
await browser.close();
