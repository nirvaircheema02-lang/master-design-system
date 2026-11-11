import type { Browser, Page } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { AnimInfo } from "./probe.ts";

export type UiKind = "input" | "tab" | "accordion" | "trigger" | "header";
export interface UiJob { id: string; url: string; kind: UiKind; scope?: string; match?: string; exclude?: string; viewport?: "mobile" | "desktop"; max?: number }
export interface UiTarget {
  index: number; label: string; animations: AnimInfo[]; reducedMotionAnimations: number | null; rest_png?: string; hover_png?: string;
  /** Kind-specific observations (focus ring, aria wiring, keyboard, overlay behaviour...). */
  ui: Record<string, unknown>;
}
export interface UiProbeResult { url: string; kind: UiKind; ok: boolean; error?: string; title?: string; status?: number | null; targets: UiTarget[]; capturedAt: string }

export const UI_KINDS = new Set<string>(["input", "tab", "accordion", "trigger", "header"]);

const SELECTORS: Record<UiKind, string> = {
  input: "input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=submit]):not([type=button]):not([type=file]), textarea, select",
  tab: "[role=tab]",
  accordion: "[aria-expanded]:not(a), summary",
  trigger: "button, [role=button], [aria-haspopup]",
  header: "header, [role=banner], nav",
};

/** Running animations anywhere in the document (overlays and portals included), normalised. */
const docAnims = (page: Page): Promise<AnimInfo[]> => page.evaluate(() =>
  document.getAnimations().filter((a) => a.playState === "running" || (a.pending && a.playState !== "finished")).slice(0, 16).map((a) => {
    const eff = a.effect as KeyframeEffect | null;
    const t = eff?.getTiming();
    const kf = eff?.getKeyframes?.() ?? [];
    const props = new Set<string>();
    kf.forEach((f) => Object.keys(f).forEach((k) => { if (!["offset", "easing", "composite", "computedOffset"].includes(k)) props.add(k); }));
    const tgt = eff?.target as HTMLElement | null;
    const name = (a as CSSTransition).transitionProperty ?? ((a as CSSAnimation).animationName ? "@" + (a as CSSAnimation).animationName + ":" + [...props].join("+") : [...props].join("+"));
    return {
      target: tgt ? tgt.tagName.toLowerCase() + (tgt.getAttribute("role") ? `[${tgt.getAttribute("role")}]` : "") : "?",
      property: name, durationMs: Math.round(Number(t?.duration ?? 0)), delayMs: Math.round(Number(t?.delay ?? 0)),
      easing: String(t?.easing ?? ""), iterations: Number(t?.iterations ?? 1), pseudo: eff?.pseudoElement ?? null,
    };
  }));

/** Visible overlay-ish elements by role; used to see what a click opened. */
const overlays = (page: Page) => page.evaluate(() => {
  const q = (s: string) => Array.from(document.querySelectorAll(s)).filter((e) => { const r = (e as HTMLElement).getBoundingClientRect(); const c = getComputedStyle(e as HTMLElement); return r.width > 4 && r.height > 4 && c.visibility !== "hidden" && c.display !== "none"; });
  const d = q('[role=dialog],[role=alertdialog],dialog[open]')[0] as HTMLElement | undefined;
  const active = document.activeElement as HTMLElement | null;
  const bd = Array.from(document.querySelectorAll("body *")).find((e) => { const c = getComputedStyle(e as HTMLElement); const r = (e as HTMLElement).getBoundingClientRect(); return c.position === "fixed" && r.width >= innerWidth * 0.95 && r.height >= innerHeight * 0.95 && c.backgroundColor !== "rgba(0, 0, 0, 0)" && e !== d && !(d && (d.contains(e) || (e as HTMLElement).contains(d))); });
  return {
    counts: { dialog: q('[role=dialog],[role=alertdialog],dialog[open]').length, status: q("[role=status],[role=alert],[aria-live=polite],[aria-live=assertive]").length, menu: q("[role=menu],[role=listbox],[role=tooltip]").length },
    dialog: d ? { role: d.getAttribute("role") ?? "dialog", modal: d.getAttribute("aria-modal"), labelled: !!(d.getAttribute("aria-label") || d.getAttribute("aria-labelledby")), w: Math.round(d.getBoundingClientRect().width), h: Math.round(d.getBoundingClientRect().height), focusInside: d.contains(active) } : null,
    backdrop: !!bd, bodyOverflow: getComputedStyle(document.body).overflow, htmlOverflow: getComputedStyle(document.documentElement).overflow,
    active: active ? active.tagName.toLowerCase() + (active.getAttribute("role") ? `[${active.getAttribute("role")}]` : "") + (active.id ? "#" + active.id : "") : null,
  };
});

export async function probeUi(browser: Browser, job: UiJob, outDir: string): Promise<UiProbeResult> {
  const result: UiProbeResult = { url: job.url, kind: job.kind, ok: false, targets: [], capturedAt: new Date().toISOString() };
  const mobile = job.viewport === "mobile";
  const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, locale: "en-US" });
  const page = await ctx.newPage();
  try {
    const resp = await page.goto(job.url, { waitUntil: "domcontentloaded", timeout: 30000 });
    result.status = resp?.status() ?? null;
    if (result.status && result.status >= 400) { result.error = `HTTP ${result.status}`; return result; }
    await page.waitForTimeout(2500);
    result.title = await page.title();
    const body = (await page.evaluate(() => document.body?.innerText?.slice(0, 400) ?? "")).toLowerCase();
    if (/(verify you are human|access denied|just a moment|attention required)/.test(body)) { result.error = "bot-wall"; return result; }
    mkdirSync(outDir, { recursive: true });

    const sel = job.scope ? SELECTORS[job.kind].split(",").map((x) => `${job.scope} ${x.trim()}`).join(", ") : SELECTORS[job.kind];
    const idx: number[] = await page.evaluate(({ sel, kind, match, exclude }) => {
      const re = match ? new RegExp(match, "i") : null;
      const ex = exclude ? new RegExp(exclude, "i") : /^(accept|reject|cookie|allow|decline|sign ?up|sign ?in|log ?in|subscribe|buy|checkout|submit|send|delete|remove)/i;
      const out: number[] = [];
      const seen = new Set<string>();
      Array.from(document.querySelectorAll(sel)).forEach((el, i) => {
        const e = el as HTMLElement; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
        if (cs.visibility === "hidden" || cs.display === "none" || r.width < 24 || r.height < 16) return;
        const text = (e.innerText || e.getAttribute("aria-label") || (e as HTMLInputElement).placeholder || "").trim().replace(/\s+/g, " ");
        if (kind === "trigger" && (!re || !re.test(text))) return;
        if (kind !== "input" && kind !== "header" && ex.test(text)) return;
        if (kind === "accordion" && e.tagName === "A") return;
        if (kind === "input" && (r.width < 80 || r.height < 24)) return;
        if (kind === "header" && (r.width < innerWidth * 0.6 || r.height < 30)) return;
        const key = kind + "|" + text.slice(0, 40) + "|" + Math.round(r.top / 50);
        if (seen.has(key)) return; seen.add(key); out.push(i);
      });
      return out.slice(0, 14);
    }, { sel, kind: job.kind, match: job.match ?? "", exclude: job.exclude ?? "" });

    const max = job.max ?? 3;
    for (const i of idx) {
      if (result.targets.length >= max) break;
      const t = await measureUi(page, sel, i, job.kind, outDir, `${job.id}-${result.targets.length}`).catch((e) => { void e; return null; });
      if (t) result.targets.push(t);
    }
    result.ok = true;
    return result;
  } catch (e) {
    result.error = String(e).split("\n")[0]!.slice(0, 160);
    return result;
  } finally { await ctx.close(); }
}

async function measureUi(page: Page, sel: string, i: number, kind: UiKind, outDir: string, tag: string): Promise<UiTarget | null> {
  const handle = (await page.$$(sel))[i];
  if (!handle) return null;
  await handle.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => undefined);
  await page.mouse.move(2, 2);
  await page.waitForTimeout(200);
  if (kind === "input") return measureInput(page, sel, i, outDir, tag);
  if (kind === "tab") return measureTabs(page, sel, i, outDir, tag);
  if (kind === "accordion") return measureAccordion(page, sel, i, outDir, tag);
  if (kind === "trigger") return measureTrigger(page, sel, i, outDir, tag);
  return measureHeader(page, sel, i, outDir, tag);
}

const shot = async (page: Page, sel: string, i: number, path: string, pad = 16) => {
  const b = await (await page.$$(sel))[i]?.boundingBox();
  if (b) await page.screenshot({ path, clip: { x: Math.max(0, b.x - pad), y: Math.max(0, b.y - pad), width: Math.min(b.width + pad * 2, 700), height: Math.min(b.height + pad * 2, 420) } }).catch(() => undefined);
};

async function measureInput(page: Page, sel: string, i: number, outDir: string, tag: string): Promise<UiTarget> {
  const info = await page.evaluate(({ sel, i }) => {
    const el = document.querySelectorAll(sel)[i] as HTMLInputElement;
    const cs = getComputedStyle(el);
    const lab = el.labels?.[0] as HTMLElement | undefined;
    const aria = el.getAttribute("aria-label");
    const lby = el.getAttribute("aria-labelledby")?.split(" ").map((id) => document.getElementById(id)?.innerText).join(" ");
    let labelKind = "none";
    if (lab) { const lc = getComputedStyle(lab); const lr = lab.getBoundingClientRect(), er = el.getBoundingClientRect(); labelKind = lc.position === "absolute" && lr.top < er.bottom && lr.bottom > er.top && lr.left < er.right ? "floating-or-overlay" : lr.bottom <= er.top + 2 ? "above" : lr.right <= er.left + 2 ? "left" : "other"; }
    else if (aria || lby) labelKind = "aria-only";
    else if (el.placeholder) labelKind = "placeholder-only";
    const st = () => ({ border: `${cs.borderTopWidth} ${cs.borderTopColor}`, outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`, shadow: cs.boxShadow, bg: cs.backgroundColor, radius: cs.borderTopLeftRadius });
    return { tag: el.tagName.toLowerCase(), type: el.type, placeholder: !!el.placeholder, autocomplete: el.getAttribute("autocomplete"), required: el.required, describedby: !!el.getAttribute("aria-describedby"), invalidAttr: el.getAttribute("aria-invalid"), label: (lab?.innerText || aria || lby || "").trim().slice(0, 40), labelKind, h: Math.round(el.getBoundingClientRect().height), w: Math.round(el.getBoundingClientRect().width), rest: st(), fontSize: cs.fontSize };
  }, { sel, i });
  await shot(page, sel, i, join(outDir, `${tag}-rest.png`));
  await page.evaluate(({ sel, i }) => { const el = document.querySelectorAll(sel)[i] as HTMLElement; try { el.focus({ focusVisible: true } as FocusOptions); } catch { el.focus(); } }, { sel, i });
  await page.waitForTimeout(90);
  const anims = await docAnims(page);
  const focus = await page.evaluate(({ sel, i }) => { const cs = getComputedStyle(document.querySelectorAll(sel)[i] as HTMLElement); return { border: `${cs.borderTopWidth} ${cs.borderTopColor}`, outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`, shadow: cs.boxShadow, bg: cs.backgroundColor, radius: cs.borderTopLeftRadius }; }, { sel, i });
  await page.waitForTimeout(400);
  await shot(page, sel, i, join(outDir, `${tag}-focus.png`));
  const changed = (Object.keys(info.rest) as Array<keyof typeof info.rest>).filter((k) => info.rest[k] !== focus[k]);
  await page.evaluate(({ sel, i }) => (document.querySelectorAll(sel)[i] as HTMLElement).blur(), { sel, i });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(({ sel, i }) => { const el = document.querySelectorAll(sel)[i] as HTMLElement; try { el.focus({ focusVisible: true } as FocusOptions); } catch { el.focus(); } }, { sel, i });
  await page.waitForTimeout(60);
  const reduced = (await docAnims(page)).filter((a) => a.iterations !== Infinity).length;
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.evaluate(({ sel, i }) => (document.querySelectorAll(sel)[i] as HTMLElement).blur(), { sel, i });
  return { index: i, label: info.label || `${info.tag}:${info.type}`, animations: anims, reducedMotionAnimations: reduced, rest_png: join(outDir, `${tag}-rest.png`), hover_png: join(outDir, `${tag}-focus.png`), ui: { ...info, focusStyle: focus, focusChanged: changed } };
}

async function measureTabs(page: Page, sel: string, i: number, outDir: string, tag: string): Promise<UiTarget | null> {
  const info = await page.evaluate(({ sel, i }) => {
    const tab = document.querySelectorAll(sel)[i] as HTMLElement;
    const list = tab.closest("[role=tablist]") as HTMLElement | null;
    if (!list) return null;
    const tabs = Array.from(list.querySelectorAll("[role=tab]")) as HTMLElement[];
    const sel0 = tabs.findIndex((t) => t.getAttribute("aria-selected") === "true");
    const first = tabs.indexOf(tab) === 0;
    return { count: tabs.length, first, selected: sel0, orientation: list.getAttribute("aria-orientation") ?? "horizontal", roving: tabs.map((t) => t.getAttribute("tabindex")), controls: tabs.every((t) => !!t.getAttribute("aria-controls")), panelRole: !!document.getElementById(tabs[Math.max(0, sel0)]?.getAttribute("aria-controls") ?? "")?.getAttribute("role"), panelLabelled: !!(document.getElementById(tabs[Math.max(0, sel0)]?.getAttribute("aria-controls") ?? "")?.getAttribute("aria-labelledby")), labels: tabs.slice(0, 5).map((t) => (t.innerText || "").trim().slice(0, 18)) };
  }, { sel, i });
  if (!info || !info.first) return null; // one target per tablist
  await shot(page, sel, i, join(outDir, `${tag}-rest.png`), 24);
  const all = await page.$$(sel);
  // keyboard model: focus the selected tab, ArrowRight/ArrowDown then Home/End
  const idxs = await page.evaluate(({ sel, i }) => { const tab = document.querySelectorAll(sel)[i] as HTMLElement; const tabs = Array.from((tab.closest("[role=tablist]") as HTMLElement).querySelectorAll("[role=tab]")); return tabs.map((t) => Array.from(document.querySelectorAll("[role=tab]")).indexOf(t)); }, { sel, i });
  const selectedPos = Math.max(0, info.selected);
  const startHandle = all[idxs[selectedPos]!];
  const key = info.orientation === "vertical" ? "ArrowDown" : "ArrowRight";
  let keyboard: Record<string, unknown> = {};
  if (startHandle) {
    await startHandle.focus();
    const st = () => page.evaluate(() => { const a = document.activeElement as HTMLElement; return { role: a?.getAttribute("role"), selected: a?.getAttribute("aria-selected"), text: (a?.innerText || "").trim().slice(0, 16) }; });
    const before = await st();
    await page.keyboard.press(key); await page.waitForTimeout(150);
    const after = await st();
    const focusMoved = before.text !== after.text;
    keyboard = { arrow: key, focusMoved, activatesOnFocus: after.selected === "true" && focusMoved };
    await page.keyboard.press("End"); await page.waitForTimeout(80);
    const end = await st(); keyboard = { ...keyboard, endMovesFocus: end.text !== after.text || info.count <= 2 };
  }
  // click another tab: animation + indicator
  const target = all[idxs[Math.min(1, info.count - 1)]!];
  let anims: AnimInfo[] = [], reduced: number | null = null, panelChanged = false;
  if (target) {
    const before = await page.evaluate(() => (document.querySelector("[role=tabpanel]:not([hidden])") as HTMLElement | null)?.innerText.slice(0, 40) ?? "");
    await target.click({ timeout: 2000 }).catch(() => undefined);
    await page.waitForTimeout(70);
    anims = await docAnims(page);
    await page.waitForTimeout(500);
    panelChanged = (await page.evaluate(() => (document.querySelector("[role=tabpanel]:not([hidden])") as HTMLElement | null)?.innerText.slice(0, 40) ?? "")) !== before;
    await shot(page, sel, i, join(outDir, `${tag}-selected.png`), 24);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const back = all[idxs[0]!]; await back?.click({ timeout: 2000 }).catch(() => undefined);
    await page.waitForTimeout(70);
    reduced = (await docAnims(page)).filter((a) => a.iterations !== Infinity).length;
    await page.emulateMedia({ reducedMotion: "no-preference" });
  }
  return { index: i, label: `tabs(${info.count}): ${info.labels.join(" | ")}`, animations: anims, reducedMotionAnimations: reduced, rest_png: join(outDir, `${tag}-rest.png`), hover_png: join(outDir, `${tag}-selected.png`), ui: { ...info, keyboard, panelChanged } };
}

async function measureAccordion(page: Page, sel: string, i: number, outDir: string, tag: string): Promise<UiTarget | null> {
  const read = () => page.evaluate(({ sel, i }) => {
    const el = document.querySelectorAll(sel)[i] as HTMLElement;
    const id = el.getAttribute("aria-controls");
    const panel = id ? document.getElementById(id) : (el.tagName === "SUMMARY" ? el.parentElement : null);
    const r = panel?.getBoundingClientRect();
    const head = el.closest("h1,h2,h3,h4,h5,h6,[role=heading]");
    return { expanded: el.getAttribute("aria-expanded") ?? (el.parentElement?.hasAttribute("open") ? "true" : "false"), tag: el.tagName.toLowerCase(), controls: !!id, panelHidden: panel ? (panel.hasAttribute("hidden") || getComputedStyle(panel).display === "none") : null, panelH: r ? Math.round(r.height) : null, inHeading: !!head, text: (el.innerText || "").trim().slice(0, 40), panelRole: panel?.getAttribute("role") ?? null };
  }, { sel, i });
  const before = await read();
  await shot(page, sel, i, join(outDir, `${tag}-rest.png`), 24);
  await (await page.$$(sel))[i]!.click({ timeout: 2000 });
  await page.waitForTimeout(70);
  const openAnims = await docAnims(page);
  await page.waitForTimeout(700);
  const open = await read();
  await shot(page, sel, i, join(outDir, `${tag}-open.png`), 24);
  await (await page.$$(sel))[i]!.click({ timeout: 2000 });
  await page.waitForTimeout(70);
  const closeAnims = await docAnims(page);
  await page.waitForTimeout(500);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await (await page.$$(sel))[i]!.click({ timeout: 2000 });
  await page.waitForTimeout(70);
  const reduced = (await docAnims(page)).filter((a) => a.iterations !== Infinity).length;
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForTimeout(400);
  await (await page.$$(sel))[i]!.click({ timeout: 2000 }).catch(() => undefined);
  return { index: i, label: before.text, animations: openAnims, reducedMotionAnimations: reduced, rest_png: join(outDir, `${tag}-rest.png`), hover_png: join(outDir, `${tag}-open.png`), ui: { before, open, openedChanged: before.expanded !== open.expanded, closeAnimations: closeAnims.map((a) => `${a.property}:${a.durationMs}ms`) } };
}

async function measureTrigger(page: Page, sel: string, i: number, outDir: string, tag: string): Promise<UiTarget | null> {
  const meta = await page.evaluate(({ sel, i }) => { const el = document.querySelectorAll(sel)[i] as HTMLElement; return { text: (el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 40), haspopup: el.getAttribute("aria-haspopup"), expanded: el.getAttribute("aria-expanded"), controls: !!el.getAttribute("aria-controls"), tag: el.tagName.toLowerCase(), href: el.getAttribute("href") }; }, { sel, i });
  if (meta.href) return null;
  const pre = await overlays(page);
  await shot(page, sel, i, join(outDir, `${tag}-rest.png`), 24);
  const handle = (await page.$$(sel))[i]!;
  await handle.click({ timeout: 2000 });
  await page.waitForTimeout(70);
  const anims = await docAnims(page);
  await page.waitForTimeout(700);
  const post = await overlays(page);
  await page.screenshot({ path: join(outDir, `${tag}-open.png`) }).catch(() => undefined);
  const expandedAfter = await page.evaluate(({ sel, i }) => (document.querySelectorAll(sel)[i] as HTMLElement).getAttribute("aria-expanded"), { sel, i });
  // Tab once: does focus stay inside an open modal?
  let trapped: boolean | null = null;
  if (post.dialog) { for (let k = 0; k < 4; k++) await page.keyboard.press("Tab"); trapped = (await overlays(page)).dialog?.focusInside ?? false; }
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  const closed = await overlays(page);
  const focusReturned = await page.evaluate(({ sel, i }) => document.activeElement === document.querySelectorAll(sel)[i], { sel, i });
  // reduced motion: open again and count animations
  await page.emulateMedia({ reducedMotion: "reduce" });
  await (await page.$$(sel))[i]?.click({ timeout: 2000 }).catch(() => undefined);
  await page.waitForTimeout(70);
  const reduced = (await docAnims(page)).filter((a) => a.iterations !== Infinity).length;
  await page.keyboard.press("Escape").catch(() => undefined);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForTimeout(300);
  const opened = post.counts.dialog > pre.counts.dialog || post.counts.menu > pre.counts.menu || post.counts.status > pre.counts.status || expandedAfter !== meta.expanded;
  return { index: i, label: meta.text, animations: anims, reducedMotionAnimations: reduced, rest_png: join(outDir, `${tag}-rest.png`), hover_png: join(outDir, `${tag}-open.png`),
    ui: { meta, opened, dialog: post.dialog, backdrop: post.backdrop, scrollLocked: /hidden|clip/.test(post.bodyOverflow + post.htmlOverflow) && !/hidden|clip/.test(pre.bodyOverflow + pre.htmlOverflow), activeAfterOpen: post.active, focusTrapped: trapped, escapeCloses: opened ? (closed.counts.dialog <= pre.counts.dialog && closed.counts.menu <= pre.counts.menu) : null, focusReturnedToTrigger: opened ? focusReturned : null, countsBefore: pre.counts, countsAfter: post.counts } };
}

async function measureHeader(page: Page, sel: string, i: number, outDir: string, tag: string): Promise<UiTarget | null> {
  const snap = () => page.evaluate(({ sel, i }) => {
    const el = document.querySelectorAll(sel)[i] as HTMLElement; const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    const html = getComputedStyle(document.documentElement);
    return { position: cs.position, top: Math.round(r.top), h: Math.round(r.height), bg: cs.backgroundColor, shadow: cs.boxShadow !== "none" ? "yes" : "no", blur: cs.backdropFilter !== "none" ? cs.backdropFilter : "no", transform: cs.transform, borderBottom: cs.borderBottomWidth, scrollPaddingTop: html.scrollPaddingTop, zIndex: cs.zIndex, opacity: cs.opacity };
  }, { sel, i });
  const rest = await snap();
  await shot(page, sel, i, join(outDir, `${tag}-rest.png`), 0);
  await page.mouse.wheel(0, 900); await page.waitForTimeout(700);
  const down = await snap();
  await page.screenshot({ path: join(outDir, `${tag}-scrolled.png`), clip: { x: 0, y: 0, width: 1200, height: 160 } }).catch(() => undefined);
  await page.mouse.wheel(0, -250); await page.waitForTimeout(700);
  const up = await snap();
  await page.mouse.wheel(0, -2000); await page.waitForTimeout(300);
  const stays = down.top >= -2 && down.top <= 4;
  const hides = down.top < -(down.h * 0.5) && up.top >= -2;
  const anims = await docAnims(page);
  return { index: i, label: `${rest.position} header h=${rest.h}`, animations: anims, reducedMotionAnimations: null, rest_png: join(outDir, `${tag}-rest.png`), hover_png: join(outDir, `${tag}-scrolled.png`),
    ui: { rest, scrolledDown: down, scrolledUp: up, pinned: stays, hidesOnScrollDown: hides, shrinks: down.h < rest.h - 4, bgChanges: down.bg !== rest.bg, shadowAppears: down.shadow !== rest.shadow, blurAppears: down.blur !== rest.blur, hasScrollPaddingTop: rest.scrollPaddingTop !== "auto" && rest.scrollPaddingTop !== "0px" } };
}

export async function probeUiMany(jobs: UiJob[], outRoot: string, browser: Browser, concurrency = 3): Promise<UiProbeResult[]> {
  const results: UiProbeResult[] = new Array(jobs.length);
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const idx = next++;
      const job = jobs[idx]!;
      const outDir = join(outRoot, job.id);
      const r = await probeUi(browser, job, outDir);
      mkdirSync(outDir, { recursive: true });
      writeFileSync(join(outDir, "probe.json"), JSON.stringify(r, null, 2));
      results[idx] = r;
      console.log(`${r.ok && r.targets.length ? "ok " : "ERR"} ${job.id} ${job.url} ${r.ok ? r.targets.length + " target(s)" : r.error}`);
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}
