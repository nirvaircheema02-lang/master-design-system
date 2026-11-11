// Usage: node shot.mjs <file.html> <out.png> [--hover] [--dark] [--four] [--width=1400]
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
const [file, out, ...flags] = process.argv.slice(2);
const width = Number((flags.find((f) => f.startsWith("--width=")) ?? "--width=1400").split("=")[1]);
const exe = process.env.PW_CHROMIUM ?? undefined;
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const page = await browser.newPage({ viewport: { width, height: 900 } });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(pathToFileURL(resolve(file)).href);
for (const [flag, id] of [["--hover", "hover"], ["--dark", "dark"], ["--four", "four"]]) {
  if (flags.includes(flag)) await page.check("#" + id);
}
await page.waitForTimeout(300);
await page.screenshot({ path: out, fullPage: true });
console.log(errors.length ? "console errors: " + errors.join(" | ") : "no console errors");
await browser.close();
