import type { Page } from "playwright";
import { ratio } from "./helpers.ts";
import type { ConformanceComponent } from "./targets.ts";
import type { Finding } from "./run.ts";

export interface ArchResult { checks: number; combos: number; findings: Finding[] }

export const MIN_TARGET_AA = 24;

export type Mount = (props?: Record<string, unknown>) => Promise<void>;
export interface Ctx {
  pg: Page; m: ConformanceComponent["manifest"]; mount: Mount; radiusVar: string | undefined;
  assert: (ok: boolean, check: string, message: string, level?: "error" | "warn") => void;
  combo: string; motion: "no-preference" | "reduce"; skinId: string; skinIndex: number; /** The design being run (manifest props.design); the first one is the default. */ design?: string;
}

export const stageBg = (pg: Page) => pg.evaluate(() => getComputedStyle(document.getElementById("stage")!).backgroundColor);
export const rgb = (pg: Page, sel: string, prop: string) => pg.evaluate(([s, p]) => { const e = document.querySelector(s as string); return e ? (getComputedStyle(e) as any)[p as string] as string : ""; }, [sel, prop]);
export const focusStart = (pg: Page) => pg.evaluate(() => document.getElementById("start")!.focus());
export const clicks = (pg: Page) => pg.evaluate(() => (window as any).__clicks as number);
export const resetClicks = (pg: Page) => pg.evaluate(() => { (window as any).__clicks = 0; });
/** The REAL accessibility tree (CDP): role and expanded state of the node with this name. <summary> does not show in aria snapshots. */
export async function axState(pg: Page, name: string): Promise<{ role: string; expanded: boolean | null } | null> {
  const cdp = await pg.context().newCDPSession(pg);
  const { nodes } = await cdp.send("Accessibility.getFullAXTree") as { nodes: Array<{ role?: { value: string }; name?: { value: string }; properties?: Array<{ name: string; value: { value: unknown } }> }> };
  await cdp.detach();
  const hit = nodes.find((n) => n.name?.value === name && n.role && ["DisclosureTriangle", "button", "group"].includes(n.role.value) && n.properties?.some((p) => p.name === "expanded"));
  if (!hit) return null;
  const exp = hit.properties!.find((p) => p.name === "expanded")!.value.value;
  return { role: hit.role!.value, expanded: typeof exp === "boolean" ? exp : null };
}

export const opaque = (c: string, fallback: string) => (/rgba\(.*,\s*0\)$/.test(c) || c === "transparent" ? fallback : c);

/** Radius, focus ring and basic geometry shared by every archetype. */
export async function focusRing(ctx: Ctx, sel: string, label: string, bg: string) {
  const { pg, assert } = ctx;
  const f = await pg.evaluate((s) => { const e = document.querySelector(s) as HTMLElement | null; if (!e) return null; const c = getComputedStyle(e); return { w: parseFloat(c.outlineWidth), st: c.outlineStyle, col: c.outlineColor, active: document.activeElement === e }; }, sel);
  assert(!!f && f.active, `${label}-focus-reachable`, `${label} is not focused by Tab`);
  if (f && f.active) {
    assert(f.st !== "none" && f.w >= 2, `${label}-focus-visible`, `outline ${f.st} ${f.w}px (need >= 2px)`);
    assert(ratio(f.col, bg) >= 3, `${label}-focus-contrast`, `focus ring ${ratio(f.col, bg).toFixed(2)}:1 vs ${bg} < 3`);
  }
}


const LAYOUT_ANIMATED = /^(width|height|top|left|right|bottom|margin.*|padding.*|boxShadow|box-shadow|filter|maxHeight|max-height|gridTemplateRows|grid-template-rows)$/;
const NOT_PROPS = new Set(["offset", "easing", "composite", "computedOffset"]);
/** Properties every running transition/animation (anywhere in the document, portals included) is animating right now. */
export const animatedProps = (pg: Page): Promise<string[]> => pg.evaluate((skip) => {
  const out = new Set<string>();
  for (const a of document.getAnimations()) {
    if (a instanceof CSSTransition) out.add(a.transitionProperty);
    else if (a instanceof CSSAnimation) for (const k of (a.effect as KeyframeEffect).getKeyframes()) for (const p of Object.keys(k)) if (!(skip as string[]).includes(p)) out.add(p);
  }
  return [...out];
}, [...NOT_PROPS]);
/** Layout-affecting properties that are animating but were not declared in manifest.interaction.layoutProps. */
export const undeclaredLayout = (props: string[], declared: string[]) => props.filter((p) => LAYOUT_ANIMATED.test(p) && !declared.includes(p));

/** Document-wide (portals included) versions of the helpers that look only inside the first stage child. */
export const settleAll = (pg: Page) => pg.evaluate(async () => { await Promise.race([Promise.all(document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished.catch(() => undefined))), new Promise((r) => setTimeout(r, 3000))]); });
export const infiniteAll = (pg: Page) => pg.evaluate(() => document.getAnimations().filter((a) => a.effect?.getTiming().iterations === Infinity).length);
export const alpha = (c: string) => { const m = /\/\s*([\d.]+)\s*\)\s*$/.exec(c) ?? /rgba\(.*,\s*([\d.]+)\)\s*$/.exec(c); return m ? parseFloat(m[1]!) : 1; };
export { ratio };

/** Remount the component with fresh internal state (sort order, typed text, dismissed toasts): bumps the React key of the mounted root. */
export const fresh = (pg: Page) => pg.evaluate(() => { (window as any).__key = ((window as any).__key ?? 0) + 1; });
