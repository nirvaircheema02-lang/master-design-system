// S6: Radix vs Base UI, identical Tabs and Dialog. Measures behaviour, not marketing.
import { build } from "esbuild";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { gzipSync } from "node:zlib";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const out = { generated: new Date().toISOString(), libs: {} };
const work = mkdtempSync(join(tmpdir(), "s6-"));

// ---- bundle sizes (each component alone, minified + gzip, react excluded)
const size = async (code) => {
  const r = await build({ stdin: { contents: code, resolveDir: here, loader: "tsx" }, bundle: true, write: false, minify: true, format: "esm", platform: "browser", external: ["react", "react-dom", "react/jsx-runtime"], logLevel: "silent", define: { "process.env.NODE_ENV": '"production"' } });
  const text = r.outputFiles[0].text; return { min: Buffer.byteLength(text), gzip: gzipSync(text).length };
};
const sizes = {
  "radix-tabs": await size(`import * as T from "@radix-ui/react-tabs"; export default T;`),
  "base-tabs": await size(`import { Tabs } from "@base-ui/react/tabs"; export default Tabs;`),
  "radix-dialog": await size(`import * as D from "@radix-ui/react-dialog"; export default D;`),
  "base-dialog": await size(`import { Dialog } from "@base-ui/react/dialog"; export default Dialog;`),
};

// ---- page bundle
const bundle = (await build({ entryPoints: [join(here, "src/entry.tsx")], bundle: true, write: false, minify: true, format: "iife", jsx: "automatic", platform: "browser", define: { "process.env.NODE_ENV": '"production"' }, logLevel: "silent" })).outputFiles[0].text;
const html = readFileSync(join(here, "src/page.html"), "utf8").replace("</body>", `<script>${bundle.replace(/<\/script/g, "<\\/script")}</script></body>`);
const file = join(work, "page.html"); writeFileSync(file, html);

// ---- SSR render check in Node (RSC-ish: does it render without a browser and without crashing?)
const ssr = {};
for (const [name, mod, comp] of [["radix-tabs", "@radix-ui/react-tabs", "Tabs"], ["base-tabs", "@base-ui/react/tabs", "Tabs"], ["radix-dialog", "@radix-ui/react-dialog", "Dialog"], ["base-dialog", "@base-ui/react/dialog", "Dialog"]]) {
  try {
    const r = await build({ stdin: { contents: `import { createElement as h } from "react"; import { renderToString } from "react-dom/server"; import * as M from "${mod}"; const C = ${name.startsWith("radix") ? "M" : `M.${comp}`}; export const html = ${name === "radix-tabs" ? 'renderToString(h(C.Root,{defaultValue:"a"},h(C.List,null,h(C.Trigger,{value:"a"},"A")),h(C.Content,{value:"a"},"x")))' : name === "base-tabs" ? 'renderToString(h(C.Root,{defaultValue:"a"},h(C.List,null,h(C.Tab,{value:"a"},"A")),h(C.Panel,{value:"a"},"x")))' : name === "radix-dialog" ? 'renderToString(h(C.Root,null,h(C.Trigger,null,"Open")))' : 'renderToString(h(C.Root,null,h(C.Trigger,null,"Open")))'};`, resolveDir: here, loader: "tsx" }, bundle: true, write: false, platform: "node", format: "cjs", jsx: "automatic", external: ["react", "react-dom", "react-dom/server", "react/jsx-runtime"], logLevel: "silent", define: { "process.env.NODE_ENV": '"production"' } });
    const f = join(here, ".tmp-" + name + ".cjs"); writeFileSync(f, r.outputFiles[0].text);
    const m = createRequire(import.meta.url)(f);
    ssr[name] = { ok: true, htmlBytes: m.html.length };
  } catch (e) { ssr[name] = { ok: false, error: String(e).slice(0, 120) }; }
}

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const res = {};
const ctx = await browser.newContext({ viewport: { width: 900, height: 700 } });
const page = await ctx.newPage();
const errors = []; page.on("pageerror", (e) => errors.push(String(e))); page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(pathToFileURL(file).href);
const mount = async (n) => { await page.evaluate((x) => window.__mount(x), n); await page.waitForTimeout(80); };
const active = () => page.evaluate(() => { const a = document.activeElement; return a ? (a.id ? "#" + a.id : a.textContent?.trim().slice(0, 12) || a.tagName) : null; });

for (const lib of ["radix", "base"]) {
  const r = { tabs: {}, dialog: {} };
  // ---------- TABS
  await mount(lib + "-tabs");
  r.tabs.structure = await page.evaluate(() => { const list = document.querySelector("[role=tablist]"); const tabs = [...document.querySelectorAll("[role=tab]")]; const panel = document.querySelector("[role=tabpanel]"); return { tablist: !!list, labelled: !!list?.getAttribute("aria-label"), tabs: tabs.length, selectedCount: tabs.filter((t) => t.getAttribute("aria-selected") === "true").length, controls: tabs.every((t) => !!t.getAttribute("aria-controls")), panelLabelled: !!(panel?.getAttribute("aria-labelledby")), roving: tabs.map((t) => t.getAttribute("tabindex")).join(","), panelTabindex: panel?.getAttribute("tabindex") ?? null, tabAttrs: Object.keys(tabs[0].dataset).sort().join(","), panelAttrs: Object.keys(panel?.dataset ?? {}).sort().join(","), listAttrs: Object.keys(list.dataset).sort().join(",") }; });
  await page.locator("[role=tab]").first().focus();
  await page.keyboard.press("ArrowRight"); await page.waitForTimeout(80);
  r.tabs.arrowRight = await page.evaluate(() => ({ focusOn: document.activeElement?.textContent, selected: [...document.querySelectorAll("[role=tab]")].findIndex((t) => t.getAttribute("aria-selected") === "true") }));
  await page.keyboard.press("End"); await page.waitForTimeout(60);
  r.tabs.end = await page.evaluate(() => ({ focusOn: document.activeElement?.textContent }));
  await page.keyboard.press("Home"); await page.waitForTimeout(60);
  r.tabs.home = await page.evaluate(() => ({ focusOn: document.activeElement?.textContent }));
  r.tabs.activation = r.tabs.arrowRight.selected === 1 ? "automatic (selection follows focus)" : "manual (Enter/Space selects)";
  await page.keyboard.press("Tab"); await page.waitForTimeout(40);
  r.tabs.tabIntoPanel = await page.evaluate(() => document.activeElement?.getAttribute("role"));
  r.tabs.axe = (await new AxeBuilder({ page }).analyze()).violations.map((v) => v.id);

  // ---------- DIALOG
  await mount(lib + "-dialog");
  const pre = await page.evaluate(() => ({ bodyOverflow: getComputedStyle(document.body).overflow, htmlOverflow: getComputedStyle(document.documentElement).overflow, bodyStyle: document.body.getAttribute("style") }));
  await page.click("#open"); await page.waitForTimeout(350);
  r.dialog.open = await page.evaluate(() => { const d = document.querySelector("[role=dialog]"); const a = document.activeElement; const sib = [...document.body.children].filter((e) => e.id !== undefined && !e.contains(d)); return { role: d?.getAttribute("role"), ariaModal: d?.getAttribute("aria-modal"), labelledby: !!d?.getAttribute("aria-labelledby"), describedby: !!d?.getAttribute("aria-describedby"), focusInside: d?.contains(a), focusedEl: a ? (a.id ? "#" + a.id : a.textContent?.trim().slice(0, 12)) : null, portalParent: d?.parentElement?.tagName, popupAttrs: Object.keys(d?.dataset ?? {}).sort().join(","), outsideAriaHidden: sib.some((e) => e.getAttribute("aria-hidden") === "true"), outsideInert: sib.some((e) => e.hasAttribute("inert")), bodyChildrenAriaHidden: [...document.body.children].map((e) => e.getAttribute("aria-hidden") ?? (e.hasAttribute("inert") ? "inert" : "-")).join(",") }; });
  r.dialog.scrollLock = await page.evaluate((pre) => ({ before: pre, after: { bodyOverflow: getComputedStyle(document.body).overflow, htmlOverflow: getComputedStyle(document.documentElement).overflow, bodyStyle: document.body.getAttribute("style") } }), pre);
  const scrollBefore = await page.evaluate(() => scrollY); await page.mouse.wheel(0, 600); await page.waitForTimeout(150);
  r.dialog.pageScrolledWhileOpen = (await page.evaluate(() => scrollY)) !== scrollBefore;
  // trap: Tab 8 times, track whether focus ever leaves the dialog
  let left = false; for (let i = 0; i < 8; i++) { await page.keyboard.press("Tab"); await page.waitForTimeout(60); if (!(await page.evaluate(() => !!document.activeElement?.closest("[role=dialog]")))) left = true; }
  r.dialog.focusEscapedOnTab = left;
  let leftBack = false; for (let i = 0; i < 4; i++) { await page.keyboard.press("Shift+Tab"); await page.waitForTimeout(60); if (!(await page.evaluate(() => !!document.activeElement?.closest("[role=dialog]")))) leftBack = true; }
  r.dialog.focusEscapedOnShiftTab = leftBack;
  r.dialog.axeOpen = (await new AxeBuilder({ page }).analyze()).violations.map((v) => v.id);
  // Escape + exit animation + focus return
  await page.keyboard.press("Escape"); await page.waitForTimeout(60);
  r.dialog.stillMountedDuringExit = await page.evaluate(() => !!document.querySelector("[role=dialog]"));
  await page.waitForTimeout(450);
  r.dialog.unmountedAfterExit = await page.evaluate(() => !document.querySelector("[role=dialog]"));
  r.dialog.focusReturned = (await active()) === "#open";
  r.dialog.scrollUnlockedAfter = await page.evaluate(() => getComputedStyle(document.body).overflow !== "hidden" && !(document.body.getAttribute("style") ?? "").includes("overflow"));
  // outside press closes
  await page.click("#open"); await page.waitForTimeout(350);
  await page.mouse.click(5, 5); await page.waitForTimeout(450);
  r.dialog.outsideClickCloses = await page.evaluate(() => !document.querySelector("[role=dialog]"));
  // reduced motion: exit is instant
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.click("#open"); await page.waitForTimeout(100); await page.keyboard.press("Escape"); await page.waitForTimeout(40);
  r.dialog.reducedMotionExitInstant = await page.evaluate(() => !document.querySelector("[role=dialog]"));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  out.libs[lib] = r;
}
await browser.close();
out.sizes = sizes; out.ssr = ssr; out.pageErrors = errors.slice(0, 5);
writeFileSync(join(here, "RESULTS.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify({ trapEscapes: { radix: out.libs.radix.dialog.focusEscapedOnTab || out.libs.radix.dialog.focusEscapedOnShiftTab, base: out.libs.base.dialog.focusEscapedOnTab || out.libs.base.dialog.focusEscapedOnShiftTab }, sizes, ssr, pageErrors: out.pageErrors }, null, 1));
