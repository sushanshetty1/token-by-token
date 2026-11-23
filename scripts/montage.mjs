// Combine several PNGs into one grid image (uses the local Chrome via Playwright).
// Usage: node scripts/montage.mjs <out.png> <cols> <width-per-tile> <img1> <img2> ...
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const [, , out, cols, tileW, ...imgs] = process.argv;
const c = Number(cols);
const w = Number(tileW);
const html = `<html><body style="margin:0;background:#888;display:grid;grid-template-columns:repeat(${c},${w}px);gap:4px">${imgs
  .map((p) => `<img style="width:${w}px;display:block" src="data:image/png;base64,${readFileSync(p).toString("base64")}">`)
  .join("")}</body></html>`;
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: c * w + (c - 1) * 4, height: 400 } });
await page.setContent(html);
await page.waitForTimeout(300);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log("saved", out);
