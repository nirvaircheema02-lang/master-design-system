import { chromium, type Browser, type Page } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type ProbeKind = "cta" | "card" | "nav";
export interface AnimInfo { target: string; property: string; durationMs: number; delayMs: number; easing: string; iterations: number; pseudo: string | null }
export interface StyleSnap { bg: string; color: string; radius: string; shadow: string; transform: string; outline: string; border: string; textDecoration: string; opacity: string }
export interface TargetResult {
  index: number;
  text: string;
  tag: string;
  box: { w: number; h: number };
  structure: string;
  rest: StyleSnap;
  hover: StyleSnap;
  changed: string[];
  animations: AnimInfo[];
  restAnimations: number;
  pseudoLayers: string[];
  reducedMotionAnimations: number | null;
  focusOutline: string | null;
  interest: number;
  rest_png?: string;
  hover_png?: string;
}
export interface ProbeResult { url: string; kind: ProbeKind; ok: boolean; error?: string; title?: string; status?: number | null; targets: TargetResult[]; capturedAt: string }

const SELECTORS: Record<ProbeKind, string> = {
  cta: "a, button, [role='button']",
  card: "article, a, li, [class*='card' i]",
  nav: "nav a, header a, [role='navigation'] a",
};

/**
 * Observes BEHAVIOUR only: computed-style deltas and Web Animations timing on hover. It never stores page HTML or CSS
 * source (clean-room policy, research/licenses/register.md). Screenshots are for internal reference only.
 */
export interface ProbeJob { id: string; url: string; kind?: ProbeKind | "input" | "tab" | "accordion" | "trigger" | "header"; viewport?: "mobile" | "desktop"; max?: number; scope?: string; match?: string; exclude?: string }
export async function probeUrl(browser: Browser, url: string, opts: { kind?: ProbeKind; outDir: string; id: string; maxTargets?: number; timeoutMs?: number; scope?: string; match?: string; exclude?: string }): Promise<ProbeResult> {
  const kind = opts.kind ?? "cta";
  const max = opts.maxTargets ?? 6;
  const result: ProbeResult = { url, kind, ok: false, targets: [], capturedAt: new Date().toISOString() };
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: "en-US" });
  const page = await ctx.newPage();
  try {
    const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: opts.timeoutMs ?? 30000 });
    result.status = resp?.status() ?? null;
    if (result.status && result.status >= 400) { result.error = `HTTP ${result.status}`; return result; }
    await page.waitForTimeout(2200);
    result.title = await page.title();
    const bodyText = (await page.evaluate(() => document.body?.innerText?.slice(0, 400) ?? "")).toLowerCase();
    if (/(verify you are human|access denied|just a moment|attention required)/.test(bodyText)) { result.error = "bot-wall"; return result; }

    const sel = opts.scope ? SELECTORS[kind].split(",").map((x) => `${opts.scope} ${x.trim()}`).join(", ") : SELECTORS[kind];
    const cands = await page.evaluate(({ sel, kind, match, exclude }) => {
      const matchRe = match ? new RegExp(match, "i") : null;
      const excludeRe = new RegExp(exclude || "^(copy|copy page|search|skip to|menu|close|cookie|accept|reject|log ?in|sign ?in|install|npm|pnpm|yarn|bun|open in)", "i");
      const out: Array<{ i: number; score: number }> = [];
      const els = Array.from(document.querySelectorAll(sel)) as HTMLElement[];
      const seen = new Set<string>();
      els.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || cs.display === "none" || r.width < 40 || r.height < 24) return;
        if (!matchRe && (r.top > 2600 || (r.bottom < 0 && r.top < -2000))) return;
        const text = (el.innerText || el.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ");
        if (kind === "cta" && (!text || text.length > 40 || r.height > 90 || r.width > 520)) return;
        if (matchRe && !matchRe.test(text)) return;
        if (excludeRe.test(text)) return;
        if (kind === "card" && (r.width < 200 || r.height < 120 || !el.querySelector("img, picture, svg, video"))) return;
        if (kind === "nav" && (!text || text.length > 30)) return;
        const key = kind + "|" + text.slice(0, 30);
        if (seen.has(key)) return;
        seen.add(key);
        const hasBg = cs.backgroundColor !== "rgba(0, 0, 0, 0)" || cs.backgroundImage !== "none";
        const hasBorder = parseFloat(cs.borderTopWidth) > 0;
        const pill = parseFloat(cs.borderTopLeftRadius) > 0;
        out.push({ i, score: (hasBg ? 3 : 0) + (hasBorder ? 1 : 0) + (pill ? 1 : 0) + (r.top >= 0 && r.top < 900 ? 2 : 0) + Math.min(2, r.width / 150) });
      });
      return out.sort((a, b) => b.score - a.score).slice(0, 12);
    }, { sel, kind, match: opts.match ?? "", exclude: opts.exclude ?? "" });

    mkdirSync(opts.outDir, { recursive: true });
    for (const c of cands) {
      if (result.targets.length >= max * 2) break;
      const t = await measure(page, sel, c.i, kind, opts.outDir, `${opts.id}-${result.targets.length}`).catch(() => null);
      if (t) result.targets.push(t);
    }
    // keep the most interesting few
    result.targets.sort((a, b) => b.interest - a.interest);
    result.targets = result.targets.slice(0, max);
    result.ok = true;
    return result;
  } catch (e) {
    result.error = String(e).split("\n")[0]!.slice(0, 160);
    return result;
  } finally {
    await ctx.close();
  }
}

async function snap(page: Page, sel: string, i: number): Promise<StyleSnap> {
  return page.evaluate(({ sel, i }) => {
    const el = document.querySelectorAll(sel)[i] as HTMLElement;
    const cs = getComputedStyle(el);
    return { bg: cs.backgroundColor + (cs.backgroundImage !== "none" ? " +img" : ""), color: cs.color, radius: cs.borderTopLeftRadius, shadow: cs.boxShadow, transform: cs.transform, outline: `${cs.outlineStyle} ${cs.outlineWidth}`, border: `${cs.borderTopWidth} ${cs.borderTopColor}`, textDecoration: cs.textDecorationLine, opacity: cs.opacity };
  }, { sel, i });
}

async function measure(page: Page, sel: string, i: number, kind: ProbeKind, outDir: string, tag: string): Promise<TargetResult | null> {
  const handle = (await page.$$(sel))[i];
  if (!handle) return null;
  await handle.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => undefined);
  await page.mouse.move(2, 2);
  await page.waitForTimeout(250);
  const box = await handle.boundingBox();
  if (!box || box.width < 30) return null;

  const info = await page.evaluate(({ sel, i }) => {
    const el = document.querySelectorAll(sel)[i] as HTMLElement;
    const sig = (n: Element, d = 0): string => d > 2 ? "" : n.tagName.toLowerCase() + (n.children.length ? "(" + Array.from(n.children).slice(0, 4).map((c) => sig(c, d + 1)).join(",") + ")" : "");
    const pseudo = ["::before", "::after"].filter((p) => { const s = getComputedStyle(el, p); return s.content !== "none" && s.display !== "none"; });
    return { text: (el.innerText || el.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 40), tag: el.tagName.toLowerCase(), structure: sig(el), pseudo, restAnims: el.getAnimations({ subtree: true }).filter((a) => (a.effect?.getTiming().iterations ?? 1) === Infinity).length };
  }, { sel, i });

  const rest = await snap(page, sel, i);
  const clip = { x: Math.max(0, box.x - 16), y: Math.max(0, box.y - 16), width: Math.min(box.width + 32, 640), height: Math.min(box.height + 32, 420) };
  const restPng = join(outDir, `${tag}-rest.png`);
  await page.screenshot({ path: restPng, clip }).catch(() => undefined);

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
  await page.waitForTimeout(140);
  const anims: AnimInfo[] = await page.evaluate(({ sel, i }) => {
    const el = document.querySelectorAll(sel)[i] as HTMLElement;
    return el.getAnimations({ subtree: true }).slice(0, 12).map((a) => {
      const eff = a.effect as KeyframeEffect | null;
      const t = eff?.getTiming();
      const kf = eff?.getKeyframes?.() ?? [];
      const props = new Set<string>();
      kf.forEach((f) => Object.keys(f).forEach((k) => { if (!["offset", "easing", "composite", "computedOffset"].includes(k)) props.add(k); }));
      const tgt = eff?.target as HTMLElement | null;
      return {
        target: tgt ? tgt.tagName.toLowerCase() + (tgt === el ? "(host)" : "(child)") : "?",
        property: (a as CSSTransition).transitionProperty ?? ((a as CSSAnimation).animationName ? "@" + (a as CSSAnimation).animationName + ":" + [...props].join("+") : [...props].join("+")),
        durationMs: Math.round(Number(t?.duration ?? 0)), delayMs: Math.round(Number(t?.delay ?? 0)), easing: String(t?.easing ?? ""), iterations: Number(t?.iterations ?? 1),
        pseudo: eff?.pseudoElement ?? null,
      };
    });
  }, { sel, i });
  await page.waitForTimeout(600);
  const hover = await snap(page, sel, i);
  const hoverPng = join(outDir, `${tag}-hover.png`);
  await page.screenshot({ path: hoverPng, clip }).catch(() => undefined);

  const changed = (Object.keys(rest) as Array<keyof StyleSnap>).filter((k) => k !== "outline" && rest[k] !== hover[k]);

  // reduced motion: does the same hover still animate?
  await page.mouse.move(2, 2);
  await page.waitForTimeout(500);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 3 });
  await page.waitForTimeout(120);
  const reduced = await page.evaluate(({ sel, i }) => (document.querySelectorAll(sel)[i] as HTMLElement).getAnimations({ subtree: true }).filter((a) => (a.effect?.getTiming().iterations ?? 1) !== Infinity).length, { sel, i });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.mouse.move(2, 2);

  const focusOutline = await page.evaluate(({ sel, i }) => {
    const el = document.querySelectorAll(sel)[i] as HTMLElement;
    try { (el as HTMLElement).focus({ focusVisible: true } as FocusOptions); } catch { el.focus(); }
    const cs = getComputedStyle(el);
    const o = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0 ? `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}` : (cs.boxShadow !== "none" ? "box-shadow ring?" : null);
    el.blur();
    return o;
  }, { sel, i });

  const animScore = anims.length * 2 + info.pseudo.length + changed.length;
  void kind;
  return {
    index: i, text: info.text, tag: info.tag, box: { w: Math.round(box.width), h: Math.round(box.height) }, structure: info.structure,
    rest, hover, changed, animations: anims, restAnimations: info.restAnims, pseudoLayers: info.pseudo, reducedMotionAnimations: reduced,
    focusOutline, interest: animScore, rest_png: restPng, hover_png: hoverPng,
  };
}

export async function probeMany(jobs: ProbeJob[], outRoot: string, concurrency = 4, chromiumPath?: string): Promise<ProbeResult[]> {
  const browser = await chromium.launch(chromiumPath ? { executablePath: chromiumPath } : {});
  const results: ProbeResult[] = new Array(jobs.length);
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const idx = next++;
      const job = jobs[idx]!;
      const outDir = join(outRoot, job.id);
      const r = await probeUrl(browser, job.url, { kind: job.kind as ProbeKind | undefined, outDir, id: job.id, scope: job.scope, match: job.match, exclude: job.exclude });
      mkdirSync(outDir, { recursive: true });
      writeFileSync(join(outDir, "probe.json"), JSON.stringify(r, null, 2));
      results[idx] = r;
      console.log(`${r.ok ? "ok " : "ERR"} ${job.id} ${job.url} ${r.ok ? r.targets.length + " target(s)" : r.error}`);
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  await browser.close();
  return results;
}
