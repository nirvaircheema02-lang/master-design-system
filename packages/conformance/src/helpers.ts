import type { Page } from "playwright";
import { wcagContrast } from "culori";
import { PNG } from "pngjs";
import { readFileSync } from "node:fs";
import type { ConformanceComponent, Target } from "./targets.ts";

/** Let running finite transitions/animations finish so probes read a steady state, not a mid-flight value. */
export const settle = (page: Page) => page.evaluate(async () => {
  const host = document.getElementById("stage")!.firstElementChild as HTMLElement;
  await Promise.race([Promise.all(host.getAnimations({ subtree: true }).filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished.catch(() => undefined))), new Promise((r) => setTimeout(r, 3000))]);
});

export const animCount = (page: Page, running: boolean) => page.evaluate((r) => (document.getElementById("stage")!.firstElementChild as HTMLElement).getAnimations({ subtree: true }).filter((a) => !r || a.playState === "running").length, running);
export const infiniteCount = (page: Page) => page.evaluate(() => (document.getElementById("stage")!.firstElementChild as HTMLElement).getAnimations({ subtree: true }).filter((a) => a.effect?.getTiming().iterations === Infinity).length);


/** Run async jobs with bounded concurrency (each job owns its own browser context). */
export async function pool(jobs: Array<() => Promise<void>>, n: number): Promise<void> {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, jobs.length) }, async () => { while (next < jobs.length) await jobs[next++]!(); }));
}


/**
 * Count animation STARTS (transitionrun / animationstart) instead of sampling "is it still running" at a wall-clock
 * offset: a 150 ms transition measured ~90 ms after hover is a race under load.
 */
export const armAnimEvents = (page: Page) => page.evaluate(() => {
  const w = window as any;
  if (w.__animArmed) return;
  w.__animArmed = true; w.__animEvents = 0;
  for (const t of ["transitionrun", "animationstart"]) document.addEventListener(t, () => { w.__animEvents++; }, true);
});
export const resetAnim = (page: Page) => page.evaluate(() => { (window as any).__animEvents = 0; });
export const animEvents = (page: Page) => page.evaluate(() => (window as any).__animEvents as number);

/** WCAG contrast; an unparsable colour (e.g. a missing element's empty colour) is unreadable, so 0, never an exception. */
export const ratio = (a: string, b: string): number => { try { return wcagContrast(a, b) || 0; } catch { return 0; } };
export const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]);
export const px = (v: string) => parseFloat(v);

/**
 * Layer-aware contrast: sample what is REALLY painted behind the label (both padding strips beside it), instead of
 * trusting the host's background-color. Handles transparent hosts, wipe/ring layers and gradient fills.
 */
export async function visualContrast(page: Page, labelSel = '[class*="__label"]', hostSel = "#stage > *"): Promise<{ ratio: number; bgLeft: string; bgRight: string; fg: string }> {
  const m = await page.evaluate(([labelSel, hostSel]) => {
    const host = document.querySelector(hostSel as string) as HTMLElement;
    const label = (host.querySelector(labelSel as string) as HTMLElement | null) ?? host;
    const h = host.getBoundingClientRect(), l = label.getBoundingClientRect();
    return { fg: getComputedStyle(label).color, host: { x: h.x, y: h.y, w: h.width, h: h.height }, label: { x: l.x, y: l.y, w: l.width, h: l.height } };
  }, [labelSel, hostSel]);
  const clip = { x: Math.max(0, m.host.x), y: Math.max(0, m.host.y), width: Math.ceil(m.host.w), height: Math.ceil(m.host.h) };
  const png = PNG.sync.read(await page.screenshot({ clip }));
  const sample = (x0: number, x1: number): string => {
    const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
    // sample at the LABEL's own height (a card's title is far below the card's vertical centre)
    const ly = m.label.y - m.host.y;
    const y0 = Math.max(0, Math.floor(ly + m.label.h * 0.3)), y1 = Math.min(png.height, Math.ceil(ly + m.label.h * 0.7) + 1);
    for (let y = y0; y < y1; y++) for (let x = Math.max(0, Math.floor(x0)); x < Math.min(png.width, Math.ceil(x1)); x++) {
      const i = (y * png.width + x) * 4;
      const r = png.data[i]!, g = png.data[i + 1]!, b = png.data[i + 2]!;
      const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      const e = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
      e.n++; e.r += r; e.g += g; e.b += b; buckets.set(key, e);
    }
    const top = [...buckets.values()].sort((a, b) => b.n - a.n)[0];
    if (!top) return "rgb(128, 128, 128)";
    return `rgb(${Math.round(top.r / top.n)}, ${Math.round(top.g / top.n)}, ${Math.round(top.b / top.n)})`;
  };
  const lx = m.label.x - m.host.x, rx = lx + m.label.w;
  // a label flush with the host edge (minimal designs have no padding) has no strip on that side: use the other side
  const hasLeft = lx - 2 > 4, hasRight = m.host.w - 2 > rx + 4;
  let bgLeft = hasLeft ? sample(Math.max(2, lx - 8), lx - 2) : "", bgRight = hasRight ? sample(rx + 2, Math.min(m.host.w - 2, rx + 8)) : "";
  if (!bgLeft) bgLeft = bgRight; if (!bgRight) bgRight = bgLeft; if (!bgLeft) bgLeft = bgRight = "rgb(128, 128, 128)";
  return { ratio: Math.min(ratio(m.fg, bgLeft), ratio(m.fg, bgRight)), bgLeft, bgRight, fg: m.fg };
}

/** Archetypes that need a whole page around them (P12): skip target, long main, a second labelled nav, a scrollable viewport. */
export const PAGE_ARCHETYPES = new Set(["skiplink", "breadcrumb", "header", "toast", "megamenu", "drawer", "popover", "tooltip", "stat", "pagination", "table", "atom"]);

/**
 * The page fixture. #slot is `display: contents`, so a sticky header placed in it is positioned against the whole #stage
 * (a normal wrapper would make the sticky containing block only as tall as the header itself).
 */
function pageFixtureBody(): string {
  const sections = Array.from({ length: 30 }, (_, i) => `<section id="s${i + 1}" style="min-height:170px"><h2>Section ${i + 1}</h2><p>Body copy for section ${i + 1}. It only exists so the page is long enough to scroll and has focusable controls spread along it.</p><p style="display:flex;justify-content:space-between;gap:12px"><a href="#s${i + 2}">Next: section ${i + 2}</a> <button type="button">Action ${i + 1}</button></p></section>`).join("\n");
  return `<div id="slot" style="display:contents"></div>
<main id="main" tabindex="-1" style="outline:none;padding:24px 16px"><h1>Page title</h1>
${sections}
<section id="s31"><h2>Last section</h2><p style="text-align:right"><button type="button" id="last-action">Last action</button></p></section></main>
<nav aria-label="Footer" style="padding:16px"><ul style="margin:0;padding:0;list-style:none"><li><a href="#s1">Back to top</a></li></ul></nav>`;
}

export function buildPage(target: Target, comp: ConformanceComponent, bundle: string): string {
  if (PAGE_ARCHETYPES.has(comp.manifest.archetype)) {
    const inlineCss = (p: string) => `<style data-src="${p.split("/").pop()}">\n${readFileSync(p, "utf8")}\n</style>`;
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${comp.manifest.id} page fixture</title>
${inlineCss(target.themeCss)}
${comp.css.map(inlineCss).join("\n")}
<style>html{scroll-behavior:auto}body{margin:0;font-family:system-ui,sans-serif}main a,nav[aria-label="Footer"] a{color:var(--ds-color-accent-ink)}main button{color:var(--ds-color-text-primary);background:var(--ds-color-surface-raised);border:1px solid var(--ds-color-border-control)}</style>
</head><body><span id="start" tabindex="-1"></span><div id="stage" data-brand="${target.brand.slug}" data-mode="light" style="background:var(--ds-color-surface-base);color:var(--ds-color-text-primary)">
${pageFixtureBody()}
</div>
<script>${bundle.replace(/<\/script/g, "<\\/script")}</script></body></html>`;
  }
  const inline = (p: string) => `<style data-src="${p.split("/").pop()}">\n${readFileSync(p, "utf8")}\n</style>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${comp.manifest.id} conformance</title>
${inline(target.themeCss)}
${comp.css.map(inline).join("\n")}
</head><body style="margin:0"><span id="start" tabindex="-1"></span><main><div id="stage" data-brand="${target.brand.slug}" data-mode="light" style="padding:48px;background:var(--ds-color-surface-base)"></div></main>
<script>${bundle.replace(/<\/script/g, "<\\/script")}</script></body></html>`;
}

