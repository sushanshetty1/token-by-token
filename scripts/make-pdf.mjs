// Print the /plan page to public/LLM_From_Scratch_7_Days.pdf with the local Chrome.
// Needs the app running (bun run dev, or any static server on out/).
// Usage: node scripts/make-pdf.mjs [url] [--out=path.pdf]
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith("--")) ?? process.env.PLAN_URL ?? "http://localhost:3140/plan/";
const out = resolve(root, args.find((a) => a.startsWith("--out="))?.slice(6) ?? "public/LLM_From_Scratch_7_Days.pdf");

// Chrome draws this in its own margin box, so it cannot use the page's web fonts or tokens.
const footer = `
<div style="width:100%; padding:0 14mm; display:flex; justify-content:space-between;
  font-family:-apple-system, 'Helvetica Neue', Arial, sans-serif; font-size:7.5px; color:#7a8591;">
  <span>Build a tiny GPT from scratch in 7 days</span>
  <span><span class="pageNumber"></span> of <span class="totalPages"></span></span>
</div>`;

const browser = await chromium.launch({ channel: "chrome" });
try {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, colorScheme: "light" });
  await ctx.addInitScript(() => localStorage.setItem("tbt:theme", "light"));
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  const res = await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
  const rendered = !!res?.ok() && (await page.locator(".plan-doc").count()) > 0;
  if (!rendered) {
    console.error(`The plan did not render at ${url} (HTTP ${res?.status()}). Nothing was written.`);
    if (errors.length) console.error(errors[0].split("\n").slice(0, 6).join("\n"));
    process.exitCode = 1;
  } else {
    await page.emulateMedia({ media: "print", colorScheme: "light" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(800);

    await page.pdf({
      path: out,
      format: "A4",
      printBackground: true,
      scale: 0.84,
      margin: { top: "14mm", right: "14mm", bottom: "16mm", left: "14mm" },
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: footer,
    });

    const pages = (readFileSync(out, "latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    if (errors.length) console.log("PAGE ERRORS:\n" + errors.join("\n"));
    console.log(`saved ${out} (${pages} pages)`);
  }
} finally {
  await browser.close();
}
