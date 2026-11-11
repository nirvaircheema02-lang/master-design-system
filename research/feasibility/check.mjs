// Feasibility check for next-wave CTA effects: shape-agnostic? reduced-motion safe? accessible name intact? which properties animate?
import { chromium } from "playwright";
import { contrast as wcagContrast } from "../../packages/tokens/src/palette.ts";
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { lintCss, contextFromTokens } from "../../packages/lint/src/index.ts";

const here = dirname(fileURLToPath(import.meta.url));
const FX = [
  { id: "glow", name: "Glow halo", cls: "B", js: false },
  { id: "roll", name: "Text roll", cls: "C", js: false, boxless: false },
  { id: "chip", name: "Icon expansion", cls: "C", js: false, layered: true },
  { id: "grad", name: "Gradient shift", cls: "B", js: false },
  { id: "spot", name: "Spotlight (cursor)", cls: "B", js: true },
  { id: "mag", name: "Magnetic pull", cls: "B", js: true },
  { id: "underline", name: "Underline draw (link)", cls: "B", js: false, boxless: true },
  { id: "press", name: "Press depth", cls: "B", js: false },
];
const COMPOSITOR = new Set(["transform", "opacity", "translate", "scale", "rotate"]);
const LAYOUT = /^(width|height|top|left|right|bottom|margin.*|padding.*|box-shadow|filter|border.*)$/;
const classify = (props) => props.some((p) => LAYOUT.test(p)) ? "layout/paint-heavy" : props.every((p) => COMPOSITOR.has(p)) ? "compositor" : "paint";

// lint the sketch with the extra tokens counted as emitted (they are the proposed T3 additions)
const ctx = contextFromTokens();
const extra = readFileSync(join(here, "extra-tokens.css"), "utf8");
const proposed = [...extra.matchAll(/(--ds-cta-[a-z-]+):/g)].map((m) => m[1]);
proposed.forEach((t) => ctx.emitted.add(t));
const lint = lintCss("effects.css", readFileSync(join(here, "effects.css"), "utf8"), ctx);
const used = [...lint.used].sort();
const newTokens = used.filter((t) => proposed.includes(t));

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const results = {};
for (const fx of FX) results[fx.id] = { ...fx, fails: [], props: new Set(), checks: 0 };

for (const reduced of [false, true]) {
  const ctx2 = await browser.newContext({ viewport: { width: 1800, height: 900 }, reducedMotion: reduced ? "reduce" : "no-preference" });
  const page = await ctx2.newPage();
  const errors = []; page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(pathToFileURL(join(here, "index.html")).href);
  for (const brand of ["finova", "master-yellow"]) for (const mode of ["light", "dark"]) {
    await page.evaluate(([b, m]) => (document.getElementById("b-" + b).dataset.mode = m), [brand, mode]);
    for (const fx of FX) for (const r of ["0px", "8px", "9999px"]) {
      const R = results[fx.id];
      const tag = `${brand}/${mode}/${r}/${reduced ? "reduced" : "motion"}`;
      const ok = (c, msg) => { R.checks++; if (!c) R.fails.push(`${tag}: ${msg}`); };
      const sel = `#b-${brand} td[data-fx="${fx.id}"][data-r="${r}"] > *`;
      const host = page.locator(sel);
      await host.scrollIntoViewIfNeeded();
      await page.mouse.move(0, 0); await page.waitForTimeout(25);
      await page.evaluate((s) => document.querySelector(s).getAnimations({ subtree: true }).forEach((a) => a.finish?.()), sel).catch(() => {});
      const rest = await host.evaluate((n) => {
        const cs = getComputedStyle(n); const pseudos = ["::before", "::after"].map((p) => { const s = getComputedStyle(n, p); return s.content !== "none" && s.display !== "none" ? s.borderTopLeftRadius : null; }).filter(Boolean);
        let bg = null;
        // gradient fills have no background-color: judge the label against BOTH stops (the fill + hover fill tokens)
        if (getComputedStyle(n).backgroundImage !== "none") bg = getComputedStyle(n).getPropertyValue("--ds-cta-bg").trim();
        for (let e = n; e && !bg; e = e.parentElement) { const b = getComputedStyle(e).backgroundColor; if (b !== "rgba(0, 0, 0, 0)" && b !== "transparent") { bg = b; break; } }
        const tr = []; for (const e of [n, ...n.querySelectorAll("*")]) { const s = getComputedStyle(e); tr.push(s.transform + "|" + s.translate); }
        return { bgHover: getComputedStyle(n).getPropertyValue("--ds-cta-bg-hover").trim(), grad: getComputedStyle(n).backgroundImage !== "none", radius: cs.borderTopLeftRadius, expected: getComputedStyle(n).getPropertyValue("--ds-cta-radius").trim(), pseudos, fg: cs.color, bg, tr, h: n.getBoundingClientRect().height, fgOnChip: cs.getPropertyValue("--ds-cta-fg-on-chip").trim(), chip: cs.getPropertyValue("--ds-cta-chip").trim() };
      });
      if (!fx.boxless) { ok(rest.radius === rest.expected, `host radius ${rest.radius} != token ${rest.expected}`); rest.pseudos.forEach((p) => ok(p === rest.radius || fx.id === "chip", `inner layer radius ${p} != host ${rest.radius}`)); }
      ok(wcagContrast(rest.fg, rest.bg) >= 4.5, `rest label/background ${wcagContrast(rest.fg, rest.bg).toFixed(2)}:1`);
      if (rest.grad) ok(wcagContrast(rest.fg, rest.bgHover) >= 4.5, `label vs gradient end stop ${wcagContrast(rest.fg, rest.bgHover).toFixed(2)}:1`);
      if (fx.layered) ok(wcagContrast(rest.fgOnChip, rest.chip) >= 4.5, `hover label/chip pair ${wcagContrast(rest.fgOnChip, rest.chip).toFixed(2)}:1`);
      if (!fx.boxless) ok(rest.h >= 24, `height ${rest.h}px < 24`);

      const b = await host.boundingBox();
      if (b) await page.mouse.move(b.x + b.width * 0.8, b.y + b.height * 0.3, { steps: 3 });
      await page.waitForTimeout(60);
      const hov = await host.evaluate((n) => {
        const anims = n.getAnimations({ subtree: true });
        const props = new Set(); anims.forEach((a) => (a.effect?.getKeyframes?.() ?? []).forEach((k) => Object.keys(k).forEach((p) => !["offset", "easing", "composite", "computedOffset"].includes(p) && props.add(p))));
        const tr = []; for (const e of [n, ...n.querySelectorAll("*")]) { const s = getComputedStyle(e); tr.push(s.transform + "|" + s.translate); }
        return { count: anims.length, props: [...props], tr, mx: n.style.getPropertyValue("--_mx"), tx: n.style.getPropertyValue("--_tx") };
      });
      hov.props.forEach((p) => R.props.add(p));
      if (!reduced && !fx.js) {
        let ran = hov.count >= 1;
        if (!ran) { await page.waitForTimeout(350); ran = await host.evaluate((n, before) => { const tr = []; for (const e of [n, ...n.querySelectorAll("*")]) { const s = getComputedStyle(e); tr.push(s.transform + "|" + s.translate); } return JSON.stringify(tr) !== before; }, JSON.stringify(rest.tr)); }
        ok(ran, "no animation ran on hover and end state unchanged");
      }
      if (!reduced && fx.js) ok(fx.id === "spot" ? hov.mx !== "" : hov.tx !== "", "pointer JS did not run");
      if (reduced) {
        ok(hov.count === 0, `${hov.count} animation(s) under reduced motion`);
        ok(JSON.stringify(hov.tr) === JSON.stringify(rest.tr), "elements move under reduced motion");
        if (fx.js) ok((fx.id === "spot" ? hov.mx : hov.tx) === "", "pointer JS ignored reduced motion");
      }
      await page.mouse.move(0, 0);
      if (!reduced && mode === "light" && r === "8px" && brand === "finova") {
        const snap = await host.ariaSnapshot();
        ok(/"Get started"/.test(snap) && !/Get started Get started/.test(snap), `accessible name wrong: ${snap.replace(/\s+/g, " ")}`);
        const foc = await host.evaluate((n) => { n.focus({ focusVisible: true }); const cs = getComputedStyle(n); return { w: parseFloat(cs.outlineWidth), s: cs.outlineStyle, vis: n.matches(":focus-visible") }; });
        ok(foc.vis && foc.s !== "none" && foc.w >= 2, `focus ring ${foc.s} ${foc.w}px visible=${foc.vis}`);
      }
    }
  }
  if (errors.length) for (const fx of FX) results[fx.id].fails.push("page errors: " + errors.join("|"));
  await ctx2.close();
}
await browser.close();

const rows = FX.map((fx) => {
  const R = results[fx.id]; const props = [...R.props].sort();
  return { id: fx.id, name: fx.name, class: fx.cls, js: fx.js, checks: R.checks, failures: R.fails.length, animated: props, perf: classify(props.length ? props : ["opacity"]), firstFail: R.fails[0] ?? null };
});
const out = { rows, tokensProposed: newTokens, lintViolations: lint.violations };
writeFileSync(join(here, "RESULTS.json"), JSON.stringify(out, null, 2));
console.table(rows.map((r) => ({ id: r.id, class: r.class, js: r.js, checks: r.checks, fail: r.failures, perf: r.perf, animated: r.animated.join("+") })));
console.log("lint violations:", lint.violations.length, lint.violations.slice(0, 5).map((v) => `${v.rule}:${v.message.slice(0, 70)}`));
console.log("new T3 tokens needed:", newTokens.join(", "));
for (const fx of FX) { const f = results[fx.id].fails; if (f.length) console.log("FAIL", fx.id, f.length, "e.g.", f.slice(0, 3).join(" || ")); }
process.exit(rows.some((r) => r.failures) || lint.violations.length ? 1 : 0);
