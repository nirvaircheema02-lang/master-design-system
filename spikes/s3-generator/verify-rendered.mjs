// S3 end-to-end: generate two sites from ONE master component, render in a real browser, assert computed styles + interaction.
import { chromium } from "playwright";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { generate, registryFingerprint } from "../../packages/generator/src/index.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const registry = join(root, "packages/components/src");
const j = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
const fingerprint = registryFingerprint(registry);
const cases = [
  { name: "finova", brand: j("brands/finova.json"), expect: { bg: "rgb(31, 79, 216)", radius: "0px", fg: "rgb(255, 255, 255)" } },
  { name: "master-yellow", brand: j("brands/master-yellow.json"), expect: { bg: "rgb(245, 197, 24)", radius: "9999px", fg: "rgb(17, 17, 17)" } },
  { name: "lifestyle", brand: j("brands/lifestyle.json"), expect: { radius: "8px" } },
  { name: "corporate", brand: j("brands/corporate.json"), expect: { radius: "4px" } },
];
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
let bad = 0;
const check = (c, m) => { if (!c) { bad++; console.log("  FAIL " + m); } };

for (const c of cases) {
  const out = join(root, "spikes/s3-generator/out", c.name);
  rmSync(out, { recursive: true, force: true });
  const r = await generate({ registryRoot: registry, brand: c.brand, kit: j("kits/finova.kit.json"), outDir: out });
  check(r.ok, `${c.name}: generate failed ${JSON.stringify(r.flags)}`);
  writeFileSync(join(out, "index.html"), `<!doctype html><link rel="stylesheet" href="tokens/build/theme.css"><link rel="stylesheet" href="components/cta-001/cta-001.css"><link rel="stylesheet" href="components/cta-001/instance.css">
<body style="margin:40px" data-brand="${c.brand.slug}"><button class="ds-cta-001" data-size="md"><span class="ds-cta-001__label">Get started</span></button></body>`);
  for (const reduced of [false, true]) {
    const ctx = await browser.newContext({ reducedMotion: reduced ? "reduce" : "no-preference" });
    const page = await ctx.newPage();
    await page.goto(pathToFileURL(join(out, "index.html")).href);
    const btn = page.locator(".ds-cta-001");
    const cs = await btn.evaluate((n) => { const s = getComputedStyle(n); return { bg: s.backgroundColor, radius: s.borderRadius, fg: s.color }; });
    for (const [k, v] of Object.entries(c.expect)) check(cs[k] === v, `${c.name}${reduced ? " (reduced)" : ""}: ${k} = ${cs[k]}, expected ${v}`);
    await btn.hover(); await page.waitForTimeout(80);
    const anims = await btn.evaluate((n) => n.getAnimations({ subtree: true }).filter((a) => a.playState === "running").length);
    if (reduced) check(anims === 0, `${c.name}: ${anims} running animation(s) under reduced-motion`);
    else check(anims >= 1, `${c.name}: shimmer not running on hover (${anims})`);
    if (!reduced) await page.screenshot({ path: join(out, "hover.png"), clip: { x: 0, y: 0, width: 260, height: 120 } });
    await ctx.close();
  }
  console.log(`${c.name}: rendered ok`);
}
await browser.close();
check(registryFingerprint(registry) === fingerprint, "MASTER registry changed during generation");
console.log(bad ? `FAILED (${bad})` : "S3 rendered verification: all pass; master unchanged");
process.exit(bad ? 1 : 0);
