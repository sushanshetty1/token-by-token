// Record the README's demo GIFs (docs/media/*.gif) from a running copy of the app.
// Needs Google Chrome and ffmpeg. Serve the static build first: bun run build && bun run serve
// Usage: node scripts/record-gifs.mjs [baseUrl] [--only=lesson,tokenizer,build,train]
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const base = (args.find((a) => !a.startsWith("--")) ?? "http://localhost:3150").replace(/\/$/, "");
const only = args.find((a) => a.startsWith("--only="))?.slice(7).split(",");
const outDir = resolve(root, "docs/media");
mkdirSync(outDir, { recursive: true });

const W = 1280;
const H = 800;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Each scene loads its page, then acts; only the acting part ends up in the GIF. */
const SCENES = [
  {
    name: "lesson",
    url: "/day/4/qkv/#2",
    async act(page) {
      await wait(2200);
      for (let i = 0; i < 4; i++) {
        await page.keyboard.press("ArrowRight");
        await wait(2300);
      }
    },
  },
  {
    name: "tokenizer",
    url: "/",
    crop: { x: 0, y: 48, w: 1280, h: 500 },
    async act(page) {
      const box = page.getByLabel("Text to tokenize");
      await box.click();
      await page.keyboard.press("ControlOrMeta+A");
      await page.keyboard.press("Backspace");
      await wait(400);
      await box.pressSequentially("How many r's are in strawberry?", { delay: 70 });
      await wait(1600);
      await page.getByRole("button", { name: "Kannada" }).click();
      await wait(2200);
      await page.getByRole("button", { name: "Code" }).click();
      await wait(2200);
    },
  },
  {
    name: "build",
    url: "/build/",
    // A long scene with a lot of text: fewer frames and a narrower GIF keep it near the 2 MB budget.
    gifWidth: 800,
    fps: 8,
    async setup(page) {
      await page.evaluate(() => {
        const y = document.getElementById("starter").getBoundingClientRect().top + scrollY - 76;
        scrollTo(0, y);
      });
    },
    async act(page) {
      const glide = (id, offset = 76) =>
        page.evaluate(
          ([id, offset]) => {
            const y = document.getElementById(id).getBoundingClientRect().top + scrollY - offset;
            scrollTo({ top: y, behavior: "smooth" });
          },
          [id, offset],
        );
      await wait(1400);
      for (const part of ["2. Model", "4. Training loop", "5. Sampling"]) {
        await page.getByRole("button", { name: part }).click();
        await wait(1700);
      }
      await glide("change-one");
      await wait(1500);
      const reveal = page.getByRole("button", { name: "I made my guess, show me" });
      await reveal.first().click();
      await wait(1600);
      await reveal.last().click();
      await wait(1200);
      await glide("variant-nomask", 140);
      await wait(2200);
      await glide("projects-title", 76);
      await wait(1500);
      await page.getByRole("button", { name: "A weekend", exact: true }).click();
      await wait(1500);
      await page.locator("#teach-it-to-chat summary").click();
      await wait(800);
      await page.evaluate(() => {
        const y = document.getElementById("teach-it-to-chat").getBoundingClientRect().top + scrollY - 90;
        scrollTo({ top: y, behavior: "smooth" });
      });
      await wait(2600);
    },
  },
  {
    name: "train",
    url: "/day/5/train-lab/#4",
    async act(page) {
      await wait(1200);
      await page.getByRole("button", { name: /start/i }).first().click();
      await wait(12000);
    },
  },
];

const browser = await chromium.launch({ channel: "chrome" });
const tmp = mkdtempSync(join(tmpdir(), "tbt-gifs-"));
try {
  for (const s of SCENES.filter((x) => !only || only.includes(x.name))) {
    const size = { width: s.width ?? W, height: s.height ?? H };
    const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1, colorScheme: "light", reducedMotion: "no-preference" });
    await ctx.addInitScript(() => localStorage.setItem("tbt:theme", "light"));
    const page = await ctx.newPage();
    await page.goto(base + s.url, { waitUntil: "networkidle", timeout: 90000 });
    await page.evaluate(() => document.fonts.ready);
    if (s.setup) await s.setup(page);
    await wait(800);

    // Chrome's screencast sends a frame whenever the page repaints; each frame lasts until the next.
    const dir = mkdtempSync(join(tmp, `${s.name}-`));
    const frames = [];
    const cdp = await ctx.newCDPSession(page);
    cdp.on("Page.screencastFrame", ({ data, sessionId, metadata }) => {
      const file = join(dir, `${String(frames.length).padStart(5, "0")}.png`);
      writeFileSync(file, Buffer.from(data, "base64"));
      frames.push({ file, t: metadata.timestamp });
      cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
    });
    await cdp.send("Page.startScreencast", { format: "png", maxWidth: size.width, maxHeight: size.height, everyNthFrame: 1 });
    const t0 = Date.now() / 1000;
    await s.act(page);
    const t1 = Date.now() / 1000;
    await cdp.send("Page.stopScreencast");
    await ctx.close();
    const length = t1 - t0;

    const list = frames.map((f, i) => {
      const next = frames[i + 1]?.t ?? t1;
      return `file '${f.file}'\nduration ${Math.max(0.01, next - f.t).toFixed(3)}`;
    });
    const concat = join(dir, "frames.txt");
    writeFileSync(concat, `${list.join("\n")}\nfile '${frames.at(-1).file}'\n`);

    const gif = join(outDir, `${s.name}.gif`);
    const width = s.gifWidth ?? Math.min(960, s.crop?.w ?? size.width);
    const crop = s.crop ? `crop=${s.crop.w}:${s.crop.h}:${s.crop.x}:${s.crop.y},` : "";
    execFileSync("ffmpeg", [
      "-y", "-loglevel", "error",
      "-f", "concat", "-safe", "0", "-i", concat,
      "-vf", `${crop}fps=${s.fps ?? 12},scale=${width}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`,
      gif,
    ]);
    console.log(`${s.name}.gif  ${length.toFixed(1)} s  ${(statSync(gif).size / 1e6).toFixed(1)} MB`);
  }
} finally {
  await browser.close();
  rmSync(tmp, { recursive: true, force: true });
}
