// S1 automated check: effect survives brand × radius × mode, and reduced-motion removes animation.
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const url = pathToFileURL(resolve(here, "index.html")).href;
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const results = [];
const fail = (msg) => { results.push({ ok: false, msg }); };
const pass = (msg) => { results.push({ ok: true, msg }); };

for (const reduced of [false, true]) {
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 }, reducedMotion: reduced ? "reduce" : "no-preference" });
  const page = await ctx.newPage();
  await page.goto(url);
  await page.check("#four");
  for (const dark of [false, true]) {
    if (dark) await page.check("#dark"); else if (await page.isChecked("#dark")) await page.uncheck("#dark");
    for (const brand of ["master-yellow", "finova", "lifestyle", "corporate"]) {
      for (const [effect, anim] of [["shimmer", "pseudo"], ["wipe", "transition"], ["arrow", "transition"], ["ring", "pseudo"]]) {
        for (let col = 0; col < 3; col++) {
          const sel = `section[data-brand="${brand}"] tbody tr:nth-child(${["shimmer","wipe","arrow","ring"].indexOf(effect) + 1}) td:nth-child(${col + 2}) .cta`;
          const el = page.locator(sel).first();
          const tag = `${brand}/${dark ? "dark" : "light"}/${effect}/r${col}/${reduced ? "reduced" : "motion"}`;
          const info = await el.evaluate((n) => {
            const cs = getComputedStyle(n);
            const probe = (pseudo) => { const p = getComputedStyle(n, pseudo); return { radius: p.borderRadius }; };
            return { radius: cs.borderRadius, overflow: cs.overflow, bg: cs.backgroundColor, before: probe("::before"), after: probe("::after") };
          });
          await el.hover();
          await page.waitForTimeout(60);
          const running = await el.evaluate((n) => n.getAnimations({ subtree: true }).filter((a) => a.playState === "running").length);
          const pseudoAnimating = await el.evaluate((n) => n.getAnimations({ subtree: true }).length);
          await page.mouse.move(0, 0);
          // 1) every inner layer inherits the radius (or the host clips) => shape-agnostic
          const layer = effect === "shimmer" ? info.after.radius : effect === "ring" ? info.before.radius : null;
          if (layer && layer !== info.radius) fail(`${tag}: inner layer radius ${layer} != host ${info.radius}`);
          if (effect !== "ring" && effect !== "arrow" && info.overflow !== "clip") fail(`${tag}: host overflow ${info.overflow} (needs clip)`);
          // 2) interaction runs when motion allowed (class B/C with keyframes/transition) and is absent when reduced
          if (effect === "shimmer" || effect === "ring") {
            if (!reduced && running < 1) fail(`${tag}: expected running animation on hover, got ${running}`);
            if (reduced && pseudoAnimating > 0) fail(`${tag}: ${pseudoAnimating} animations under reduced-motion`);
          }
          if (!results.some((r) => !r.ok && r.msg.startsWith(tag))) pass(tag);
        }
      }
    }
  }
  await ctx.close();
}
await browser.close();
const bad = results.filter((r) => !r.ok);
console.log(`S1 checks: ${results.length - bad.length}/${results.length} pass`);
bad.slice(0, 30).forEach((r) => console.log("  FAIL " + r.msg));
process.exit(bad.length ? 1 : 0);
