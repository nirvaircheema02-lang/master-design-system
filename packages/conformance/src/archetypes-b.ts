import type { Page } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { armAnimEvents, animEvents, ratio, resetAnim, settle, visualContrast } from "./helpers.ts";
import { MIN_TARGET_AA, alpha, animatedProps, focusRing, focusStart, infiniteAll, opaque, rgb, settleAll, stageBg, undeclaredLayout, type Ctx } from "./arch-common.ts";

/**
 * Phase 4 Wave B archetypes: tabs, accordion (button + region), navmenu (site-nav disclosure), dialog (modal), menu (actions).
 * Overlays portal INTO the brand scope (the stage), so selectors here are document-wide, not "first stage child".
 */

/** Computed `transform` -> [scaleX, translateX] (the harness runs in Node, which has no DOMMatrix). */
const matrixOf = (tf: string): { m11: number; m41: number; m22: number; m42: number } => { const v = /^matrix\(([^)]*)\)$/.exec(tf)?.[1]?.split(",").map(Number); return v && v.length === 6 ? { m11: v[0]!, m41: v[4]!, m22: v[3]!, m42: v[5]! } : { m11: 1, m41: 0, m22: 1, m42: 0 }; };
const axeNote = (v: { help: string; nodes: Array<{ target: unknown; any?: Array<{ message: string }> }> }) => `${v.help}: ${JSON.stringify(v.nodes[0]?.target)} ${v.nodes[0]?.any?.[0]?.message ?? ""}`.slice(0, 300);
const step = (s: string) => { if (process.env.MASTER_TRACE) console.error("  [step]", new Date().toISOString().slice(11, 23), s); };
const DOC_SETTLE = 70; // focus guards and presence need a beat (ADR 0004: settle after every Tab)
const tick = (pg: Page, ms = DOC_SETTLE) => pg.waitForTimeout(ms);
const active = (pg: Page) => pg.evaluate(() => { const a = document.activeElement as HTMLElement | null; return a ? `${a.tagName.toLowerCase()}${a.id ? "#" + a.id : ""}|${(a.textContent ?? "").trim().slice(0, 24)}` : "none"; });

/** Motion contract shared by every Wave B interaction: transition under no-preference, nothing under reduce, no undeclared layout animation. */
async function motionContract(ctx: Ctx, events: number, props: string[], what: string) {
  const { assert, motion, m } = ctx;
  if (motion === "no-preference") assert(events >= 1, `${what}-transition`, `${what} is instant (no transition or animation started)`);
  else assert(events === 0, "reduced-motion-animations", `${events} animation(s) start on ${what} under prefers-reduced-motion`);
  const bad = undeclaredLayout(props, m.interaction.layoutProps);
  assert(bad.length === 0, "layout-animation-undeclared", `animates layout propert${bad.length > 1 ? "ies" : "y"} ${bad.join(", ")} without declaring it in manifest.interaction.layoutProps`);
}

/* ------------------------------------------------------------------ TABS */
async function tabsCombo(ctx: Ctx, first: boolean) {
  const { pg, assert, radiusVar, mount, motion } = ctx;
  const sb = await stageBg(pg);
  const design = ctx.design; const vert = design === "vertical"; const hasInd = !design || design === "underline" || vert;
  const NEXT = vert ? "ArrowDown" : "ArrowRight", PREV = vert ? "ArrowUp" : "ArrowLeft";
  await pg.mouse.move(0, 0); await focusStart(pg); await settleAll(pg);
  const r = await pg.evaluate(([rv]) => {
    const list = document.querySelector('[role="tablist"]') as HTMLElement; const tabs = Array.from(list.querySelectorAll('[role="tab"]')) as HTMLElement[];
    const t = tabs[0]!, cs = getComputedStyle(t);
    const act = list.querySelector('[role="tab"][data-state="active"]') as HTMLElement; const inact = tabs.find((x) => x !== act)!;
    const af = getComputedStyle(list, "::after");
    return { radius: cs.borderTopLeftRadius, expected: rv ? getComputedStyle(list).getPropertyValue(rv as string).trim() : "", h: t.getBoundingClientRect().height, w: t.getBoundingClientRect().width,
      listBg: getComputedStyle(list).backgroundColor, actColor: getComputedStyle(act).color, actBg: getComputedStyle(act).backgroundColor, inactColor: getComputedStyle(inact).color,
      ind: { bg: af.backgroundColor, h: parseFloat(af.height), thick: parseFloat(af.width), tf: af.transform, measured: list.hasAttribute("data-measured"), left: act.offsetLeft, width: act.offsetWidth, top: act.offsetTop, height: act.offsetHeight }, n: tabs.length };
  }, [radiusVar]);
  const bg = opaque(r.listBg, sb);
  if (radiusVar) assert(r.radius === r.expected, "radius-token", `tab radius ${r.radius} != ${radiusVar} ${r.expected}`);
  assert(r.h >= MIN_TARGET_AA && r.w >= MIN_TARGET_AA, "target-size", `${r.w}x${r.h}px`);
  assert(r.h >= parseFloat(ctx.m.responsive.touchTarget) - 0.5, "touch-claim", `tab height ${r.h.toFixed(1)}px < claim ${ctx.m.responsive.touchTarget}`, "warn");
  assert(ratio(r.actColor, opaque(r.actBg, bg)) >= 4.5, "contrast-selected", `selected label ${r.actColor} on ${opaque(r.actBg, bg)} = ${ratio(r.actColor, opaque(r.actBg, bg)).toFixed(2)}:1`);
  assert(ratio(r.inactColor, bg) >= 4.5, "contrast-unselected", `unselected label ${r.inactColor} on ${bg} = ${ratio(r.inactColor, bg).toFixed(2)}:1`);
  if (hasInd) {
  assert(r.ind.measured, "indicator-measured", "the indicator was never positioned from the active tab");
  const mat = matrixOf(r.ind.tf);
  assert(vert ? Math.abs(mat.m42 - r.ind.top) <= 1 && Math.abs(mat.m22 - r.ind.height) <= 1 : Math.abs(mat.m41 - r.ind.left) <= 1 && Math.abs(mat.m11 - r.ind.width) <= 1, "indicator-tracks", `indicator at ${mat.m41.toFixed(1)},${mat.m42.toFixed(1)} scale ${mat.m11.toFixed(1)},${mat.m22.toFixed(1)} but the selected tab is at x=${r.ind.left} y=${r.ind.top} ${r.ind.width}x${r.ind.height}`);
  assert((vert ? r.ind.thick : r.ind.h) >= 2, "indicator-thickness", `indicator is ${vert ? r.ind.thick : r.ind.h}px thick (need >= 2)`);
  assert(ratio(r.ind.bg, bg) >= 3, "indicator-contrast", `indicator ${r.ind.bg} on ${bg} = ${ratio(r.ind.bg, bg).toFixed(2)}:1 (non-text 3:1)`);
  }
  assert((await infiniteAll(pg)) === 0, "no-infinite-at-rest", "an infinite animation runs while the tabs are idle");

  // hover: feedback exists on an unselected tab
  const hoverTab = pg.locator('[role="tab"][data-state="inactive"]').first();
  const before = await rgb(pg, '[role="tab"][data-state="inactive"]', "backgroundColor");
  await hoverTab.hover(); await tick(pg, 220);
  const after = await rgb(pg, '[role="tab"][data-state="inactive"]', "backgroundColor");
  assert(after !== before, "hover-feedback", "hovering an unselected tab changes nothing");
  const hovFg = await pg.evaluate(() => { const t = document.querySelector('[role="tab"][data-state="inactive"]') as HTMLElement; return getComputedStyle(t).color; });
  assert(ratio(hovFg, opaque(after, bg)) >= 4.5, "contrast-hover", `hovered label ${hovFg} on ${after} = ${ratio(hovFg, opaque(after, bg)).toFixed(2)}:1`);
  await pg.mouse.move(0, 0); await settleAll(pg);

  // selecting another tab slides the indicator (transform only), instantly under reduced motion
  await resetAnim(pg);
  await pg.locator('[role="tab"]').nth(2).click();
  await pg.waitForTimeout(40);
  const ev = await animEvents(pg); const props = await animatedProps(pg);
  await motionContract(ctx, ev, props, "indicator slide");
  await settleAll(pg);
  const moved = await pg.evaluate(() => { const list = document.querySelector('[role="tablist"]') as HTMLElement; const a = list.querySelector('[role="tab"][data-state="active"]') as HTMLElement; return { left: a.offsetLeft, width: a.offsetWidth, top: a.offsetTop, height: a.offsetHeight, tf: getComputedStyle(list, "::after").transform }; });
  const mv = matrixOf(moved.tf);
  if (hasInd) assert(vert ? Math.abs(mv.m42 - moved.top) <= 1 && Math.abs(mv.m22 - moved.height) <= 1 : Math.abs(mv.m41 - moved.left) <= 1 && Math.abs(mv.m11 - moved.width) <= 1, "indicator-follows-selection", `after selecting another tab the indicator is at x=${mv.m41.toFixed(1)} w=${mv.m11.toFixed(1)}, tab at x=${moved.left} w=${moved.width}`);
  await pg.locator('[role="tab"]').nth(0).click(); await pg.mouse.move(0, 0); await settleAll(pg);

  // keyboard focus ring
  await focusStart(pg); await pg.keyboard.press("Tab"); await tick(pg, 40);
  await focusRing(ctx, '[role="tab"][data-state="active"]', "tab", bg);

  if (first) {
    const s = await pg.evaluate(() => {
      const list = document.querySelector('[role="tablist"]') as HTMLElement; const tabs = Array.from(list.querySelectorAll('[role="tab"]')) as HTMLElement[];
      const sel = tabs.filter((t) => t.getAttribute("aria-selected") === "true");
      const wiring = sel.map((t) => { const p = document.getElementById(t.getAttribute("aria-controls") ?? ""); return { controls: !!p, role: p?.getAttribute("role"), back: p?.getAttribute("aria-labelledby") === t.id, visible: !!p && (p as HTMLElement).checkVisibility({ checkVisibilityCSS: true } as any) }; });
      const visiblePanels = Array.from(document.querySelectorAll('[role="tabpanel"]')).filter((p) => (p as HTMLElement).checkVisibility({ checkVisibilityCSS: true } as any)).length;
      const dangling = tabs.filter((t) => t.getAttribute("aria-controls") && !document.getElementById(t.getAttribute("aria-controls")!)).length;
      return { named: !!(list.getAttribute("aria-label") || list.getAttribute("aria-labelledby")), tabs: tabs.length, selected: sel.length, wiring, visiblePanels, dangling, tabsAreButtons: tabs.every((t) => t.tagName === "BUTTON"), orientation: list.getAttribute("aria-orientation") ?? "horizontal" };
    });
    assert(s.named, "tablist-named", "the tab list has no accessible name (aria-label or aria-labelledby)");
    assert(s.selected === 1, "one-selected", `${s.selected} tabs have aria-selected=true (need exactly 1)`);
    assert(s.wiring.every((w) => w.controls && w.role === "tabpanel" && w.back), "tab-panel-wiring", `the selected tab is not wired to a labelled tabpanel: ${JSON.stringify(s.wiring)}`);
    assert(s.visiblePanels === 1 && s.wiring.every((w) => w.visible), "only-selected-panel-visible", `${s.visiblePanels} panels are visible (need exactly the selected one)`);
    assert(s.dangling === 0, "no-dangling-aria-controls", `${s.dangling} tab(s) point aria-controls at a panel that is not in the DOM`, "warn");
    assert(s.tabsAreButtons, "tabs-are-buttons", "every tab must be a <button role=tab> (keyboard and click semantics for free)");

    // Tab order: one stop for the whole list, landing on the SELECTED tab; the next Tab leaves the list (roving tabindex)
    await focusStart(pg); await pg.keyboard.press("Tab"); await tick(pg, 40);
    const landed = await pg.evaluate(() => (document.activeElement as HTMLElement)?.getAttribute("aria-selected") === "true" && document.activeElement?.getAttribute("role") === "tab");
    assert(landed, "tab-lands-on-selected", "the first Tab did not land on the selected tab");
    await pg.keyboard.press("Tab"); await tick(pg, 40);
    assert(await pg.evaluate(() => document.activeElement?.getAttribute("role") !== "tab"), "roving-tabindex", "Tab moved to another tab; the list must be a single Tab stop (arrow keys move within it)");

    // after mouse use the list must STILL be one Tab stop that lands on the selected tab (never on the list container)
    await pg.locator('[role="tab"]').nth(1).click(); await pg.mouse.move(0, 0); await tick(pg, 40);
    await focusStart(pg); await pg.keyboard.press("Tab"); await tick(pg, 60);
    assert(await pg.evaluate(() => document.activeElement?.getAttribute("role") === "tab" && document.activeElement?.getAttribute("aria-selected") === "true"), "tab-lands-on-selected-after-pointer", `after clicking a tab, Tab focused ${await active(pg)} instead of the selected tab`);
    await pg.locator('[role="tab"]').nth(0).click(); await pg.mouse.move(0, 0); await tick(pg, 40);

    // arrows, Home/End, wrap (automatic activation from the fixture)
    await focusStart(pg); await pg.keyboard.press("Tab"); await pg.keyboard.press(NEXT); await tick(pg, 40);
    const a1 = await pg.evaluate(() => ({ focusIdx: Array.from(document.querySelectorAll('[role="tab"]')).indexOf(document.activeElement as Element), selIdx: Array.from(document.querySelectorAll('[role="tab"]')).findIndex((t) => t.getAttribute("aria-selected") === "true") }));
    assert(a1.focusIdx === 1, "arrow-right-moves-focus", `ArrowRight left focus on tab ${a1.focusIdx}`);
    assert(a1.selIdx === 1, "automatic-selects-on-focus", `activation=automatic but tab ${a1.selIdx} is selected while tab ${a1.focusIdx} has focus`);
    await pg.keyboard.press("End"); await tick(pg, 40);
    const n = (ctx.m.fixture.props.tabs as unknown[]).length;
    const endIdx = await pg.evaluate(() => Array.from(document.querySelectorAll('[role="tab"]')).indexOf(document.activeElement as Element));
    assert(endIdx === n - 1, "end-key", `End focused tab ${endIdx}, expected ${n - 1}`);
    await pg.keyboard.press(NEXT); await tick(pg, 40);
    assert((await pg.evaluate(() => Array.from(document.querySelectorAll('[role="tab"]')).indexOf(document.activeElement as Element))) === 0, "arrow-wraps", "ArrowRight from the last tab did not wrap to the first");
    await pg.keyboard.press("Home"); await pg.keyboard.press(PREV); await tick(pg, 40);
    assert((await pg.evaluate(() => Array.from(document.querySelectorAll('[role="tab"]')).indexOf(document.activeElement as Element))) === n - 1, "arrow-left-wraps", "ArrowLeft from the first tab did not wrap to the last");
    // panel is reachable next: Tab from the selected tab goes to its panel (tabindex 0) or content inside it
    await pg.keyboard.press("Tab"); await tick(pg, 40);
    assert(await pg.evaluate(() => !!document.activeElement?.closest('[role="tabpanel"]')), "panel-reachable", "Tab from the selected tab does not reach its panel");

    // manual activation: arrows move focus WITHOUT selecting; Enter/Space selects (explicit param, not a library default)
    await mount({ activation: "manual" });
    await pg.locator('[role="tab"]').nth(0).click(); await pg.mouse.move(0, 0); await tick(pg, 40);
    await focusStart(pg); await pg.keyboard.press("Tab"); await pg.keyboard.press(NEXT); await tick(pg, 60);
    const man = await pg.evaluate(() => ({ focusIdx: Array.from(document.querySelectorAll('[role="tab"]')).indexOf(document.activeElement as Element), selIdx: Array.from(document.querySelectorAll('[role="tab"]')).findIndex((t) => t.getAttribute("aria-selected") === "true") }));
    assert(man.focusIdx === 1 && man.selIdx === 0, "manual-no-select-on-arrow", `activation=manual but ArrowRight selected tab ${man.selIdx} (focus on ${man.focusIdx}); arrows must only move focus`);
    await pg.keyboard.press("Enter"); await tick(pg, 60);
    assert((await pg.evaluate(() => Array.from(document.querySelectorAll('[role="tab"]')).findIndex((t) => t.getAttribute("aria-selected") === "true"))) === 1, "manual-enter-selects", "Enter on the focused tab did not select it in manual mode");

    // disabled tabs are skipped by arrows and cannot be selected
    const tabs = (ctx.m.fixture.props.tabs as Array<Record<string, unknown>>).map((t, i) => (i === 1 ? { ...t, disabled: true } : t));
    await mount({ activation: "automatic", tabs });
    await pg.locator('[role="tab"]').nth(0).click(); await pg.mouse.move(0, 0); await tick(pg, 40);
    await focusStart(pg); await pg.keyboard.press("Tab"); await pg.keyboard.press(NEXT); await tick(pg, 60);
    assert((await pg.evaluate(() => Array.from(document.querySelectorAll('[role="tab"]')).indexOf(document.activeElement as Element))) === 2, "disabled-skipped", "ArrowRight did not skip the disabled tab");
    assert(await pg.evaluate(() => document.querySelectorAll('[role="tab"][disabled], [role="tab"][aria-disabled="true"], [role="tab"][data-disabled]').length > 0), "disabled-exposed", "a disabled tab is not exposed as disabled");
    await mount({ activation: "automatic" });
  }
  void motion;
}

/* ------------------------------------------------------------------ ACCORDION (button + region) */
async function accordionCombo(ctx: Ctx, first: boolean) {
  const { pg, m, assert, radiusVar, mount, motion } = ctx;
  const sb = await stageBg(pg);
  await mount(); await pg.mouse.move(0, 0); await focusStart(pg); await settleAll(pg);
  const r = await pg.evaluate(([rv]) => { const h = document.querySelector("#stage > *") as HTMLElement; const c = getComputedStyle(h); const t = document.querySelector("button[aria-expanded]") as HTMLElement;
    return { radius: c.borderTopLeftRadius, expected: rv ? c.getPropertyValue(rv as string).trim() : "", h: t.getBoundingClientRect().height, bg: c.backgroundColor }; }, [radiusVar]);
  if (radiusVar) assert(r.radius === r.expected, "radius-token", `accordion radius ${r.radius} != ${radiusVar} ${r.expected}`);
  assert(r.h >= MIN_TARGET_AA, "target-size", `trigger height ${r.h}px < 24`);
  assert(r.h >= parseFloat(m.responsive.touchTarget) - 0.5, "touch-claim", `trigger height ${r.h.toFixed(1)}px < claim ${m.responsive.touchTarget}`, "warn");
  const vc = await visualContrast(pg, '[class*="__title"]', "[class*='__item']:first-child [class*='__trigger']");
  assert(vc.ratio >= 4.5, "title-contrast", `title ${vc.fg} on ${vc.bgLeft}/${vc.bgRight} = ${vc.ratio.toFixed(2)}:1`);
  assert((await infiniteAll(pg)) === 0, "no-infinite-at-rest", "an infinite animation runs while idle");

  // toggling a panel: animates (motion) / appears instantly (reduced); only declared layout properties animate; ends static
  await resetAnim(pg);
  await pg.locator("button[aria-expanded]").nth(0).click(); await pg.waitForTimeout(40);
  const ev = await animEvents(pg); const props = await animatedProps(pg);
  await motionContract(ctx, ev, props, "panel expand");
  if (motion === "reduce") assert(await pg.evaluate(() => { const c = document.querySelector('[role="region"]') as HTMLElement | null; return !!c && c.getBoundingClientRect().height > 8; }), "reduced-appears-immediately", "under reduced motion the panel is not fully shown right after activation");
  await settleAll(pg);
  const end = await pg.evaluate(() => { const c = document.querySelector('[role="region"]') as HTMLElement | null; return c ? { h: c.getBoundingClientRect().height, anim: c.getAnimations().length, overflow: getComputedStyle(c).height } : null; });
  assert(!!end && end.h > 8 && end.anim === 0, "expand-ends-static", `panel did not reach a static open state (${JSON.stringify(end)})`);
  if (motion === "no-preference") { await resetAnim(pg); await pg.locator("button[aria-expanded]").nth(0).click(); await pg.waitForTimeout(40); const e2 = await animEvents(pg); assert(e2 >= 1, "collapse-transition", "closing the panel is instant (no animation)"); await settleAll(pg); }
  else await pg.locator("button[aria-expanded]").nth(0).click();
  await tick(pg, 120);

  if (first) {
    const s = await pg.evaluate(() => {
      const trig = Array.from(document.querySelectorAll("button[aria-expanded]")) as HTMLElement[];
      return { n: trig.length, headings: trig.every((t) => /^H[1-6]$/.test(t.parentElement?.tagName ?? "")), single: trig.every((t) => t.parentElement!.querySelectorAll("button").length === 1), expandedFalse: trig.every((t) => t.getAttribute("aria-expanded") === "false"),
        controls: trig.every((t) => !!t.getAttribute("aria-controls")), regionRole: document.querySelectorAll('[role="region"]').length };
    });
    assert(s.n >= 2 && s.headings && s.single, "heading-wraps-button", "every trigger must be the only button inside a heading element (APG accordion)");
    assert(s.expandedFalse, "closed-by-default", "an accordion trigger is expanded although nothing was opened");

    // keyboard: Tab to the first trigger, Enter opens (state exposed + region named), Space closes, arrows move between triggers
    await focusStart(pg); await pg.keyboard.press("Tab"); await tick(pg, 40);
    await focusRing(ctx, "button[aria-expanded]:focus-visible", "trigger", opaque(r.bg, sb));
    await pg.keyboard.press("Enter"); await tick(pg, 120); await settleAll(pg);
    const op = await pg.evaluate(() => { const t = document.querySelector("button[aria-expanded]") as HTMLElement; const reg = document.getElementById(t.getAttribute("aria-controls") ?? ""); return { exp: t.getAttribute("aria-expanded"), region: reg?.getAttribute("role"), named: reg?.getAttribute("aria-labelledby") === t.id, visible: !!reg && (reg as HTMLElement).checkVisibility({ checkVisibilityCSS: true } as any) }; });
    assert(op.exp === "true" && op.region === "region" && op.named && op.visible, "enter-opens", `Enter did not open a labelled, visible region: ${JSON.stringify(op)}`);
    await pg.keyboard.press("Space"); await tick(pg, 120); await settleAll(pg);
    assert((await pg.evaluate(() => document.querySelector("button[aria-expanded]")?.getAttribute("aria-expanded"))) === "false", "space-closes", "Space did not close the open panel (single + collapsible)");
    assert(await pg.evaluate(() => !document.querySelector('[role="region"]') || !(document.querySelector('[role="region"]') as HTMLElement).checkVisibility({ checkVisibilityCSS: true } as any)), "closed-content-hidden", "a closed panel is still visible to users and assistive tech");
    await pg.keyboard.press("ArrowDown"); await tick(pg, 40);
    assert((await pg.evaluate(() => Array.from(document.querySelectorAll("button[aria-expanded]")).indexOf(document.activeElement as Element))) === 1, "arrow-down-next", "ArrowDown did not move focus to the next trigger");
    await pg.keyboard.press("End"); await tick(pg, 40);
    const n = (m.fixture.props.items as unknown[]).length;
    assert((await pg.evaluate(() => Array.from(document.querySelectorAll("button[aria-expanded]")).indexOf(document.activeElement as Element))) === n - 1, "end-key", "End did not move focus to the last trigger");
    await pg.keyboard.press("Home"); await tick(pg, 40);
    assert((await pg.evaluate(() => Array.from(document.querySelectorAll("button[aria-expanded]")).indexOf(document.activeElement as Element))) === 0, "home-key", "Home did not move focus to the first trigger");

    // single: opening another closes the first. multiple: both stay open.
    await mount({ type: "single" });
    await pg.locator("button[aria-expanded]").nth(0).click(); await tick(pg, 150); await pg.locator("button[aria-expanded]").nth(1).click(); await tick(pg, 300); await settleAll(pg);
    const single = await pg.evaluate(() => Array.from(document.querySelectorAll("button[aria-expanded]")).map((t) => t.getAttribute("aria-expanded")));
    assert(single.filter((x) => x === "true").length === 1 && single[1] === "true", "single-mode", `single accordion left ${single.join(",")}`);
    await mount({ type: "multiple" });
    await pg.locator("button[aria-expanded]").nth(0).click(); await tick(pg, 100); await pg.locator("button[aria-expanded]").nth(1).click(); await tick(pg, 300); await settleAll(pg);
    const multi = await pg.evaluate(() => Array.from(document.querySelectorAll("button[aria-expanded]")).map((t) => t.getAttribute("aria-expanded")));
    assert(multi.filter((x) => x === "true").length === 2, "multiple-mode", `multiple accordion left ${multi.join(",")}`);
    // disabled item: skipped by arrows, exposed as disabled
    const items = (m.fixture.props.items as Array<Record<string, unknown>>).map((t, i) => (i === 1 ? { ...t, disabled: true } : t));
    await mount({ type: "single", items });
    await focusStart(pg); await pg.keyboard.press("Tab"); await pg.keyboard.press("ArrowDown"); await tick(pg, 40);
    assert((await pg.evaluate(() => Array.from(document.querySelectorAll("button[aria-expanded]")).indexOf(document.activeElement as Element))) === 2, "disabled-skipped", "ArrowDown did not skip the disabled item");
    assert(await pg.evaluate(() => !!document.querySelector("button[aria-expanded][disabled], button[aria-expanded][data-disabled]")), "disabled-exposed", "a disabled item is not exposed as disabled");
    await mount({ type: "single" });
  }
}

/* ------------------------------------------------------------------ NAV MENU (site-navigation disclosure) */
async function navmenuCombo(ctx: Ctx, first: boolean) {
  const { pg, m, assert, radiusVar } = ctx;
  const sb = await stageBg(pg);
  const trig = "button[aria-expanded]";
  await pg.mouse.move(0, 0); await focusStart(pg); await settleAll(pg);
  const r = await pg.evaluate(([rv]) => { const t = document.querySelector("button[aria-expanded]") as HTMLElement; const c = getComputedStyle(t);
    return { radius: c.borderTopLeftRadius, expected: rv ? c.getPropertyValue(rv as string).trim() : "", fg: c.color, bg: c.backgroundColor, h: t.getBoundingClientRect().height, w: t.getBoundingClientRect().width, expanded: t.getAttribute("aria-expanded"), panelHidden: (document.getElementById(t.getAttribute("aria-controls") ?? "") as HTMLElement | null)?.hidden }; }, [radiusVar]);
  if (radiusVar) assert(r.radius === r.expected, "radius-token", `trigger radius ${r.radius} != ${radiusVar} ${r.expected}`);
  assert(r.h >= MIN_TARGET_AA && r.w >= MIN_TARGET_AA, "target-size", `${r.w}x${r.h}px`);
  assert(r.h >= parseFloat(m.responsive.touchTarget) - 0.5, "touch-claim", `trigger height ${r.h.toFixed(1)}px < claim ${m.responsive.touchTarget}`, "warn");
  assert(ratio(r.fg, opaque(r.bg, sb)) >= 4.5, "contrast-rest", `trigger ${r.fg} on ${opaque(r.bg, sb)} = ${ratio(r.fg, opaque(r.bg, sb)).toFixed(2)}:1`);
  assert(r.expanded === "false" && r.panelHidden === true, "closed-by-default", "the panel is open or visible before activation");
  assert((await infiniteAll(pg)) === 0, "no-infinite-at-rest", "an infinite animation runs while idle");

  // hover feedback on the trigger, and hover alone must NOT open the panel
  await pg.locator(trig).hover(); await tick(pg, 220);
  const hv = await pg.evaluate(() => { const t = document.querySelector("button[aria-expanded]") as HTMLElement; const c = getComputedStyle(t); return { fg: c.color, bg: c.backgroundColor, exp: t.getAttribute("aria-expanded") }; });
  assert(hv.bg !== r.bg || hv.fg !== r.fg, "hover-feedback", "hovering the trigger changes nothing");
  assert(ratio(hv.fg, opaque(hv.bg, sb)) >= 4.5, "contrast-hover", `hovered trigger ${hv.fg} on ${hv.bg} = ${ratio(hv.fg, opaque(hv.bg, sb)).toFixed(2)}:1`);
  assert(hv.exp === "false", "hover-does-not-open", "hovering the trigger opened the panel (disclosures open on activation only)");
  await pg.mouse.move(0, 0); await settleAll(pg);

  // activation opens: animates (motion) / not (reduced), panel readable and inside the viewport
  await resetAnim(pg);
  await pg.locator(trig).click(); await pg.waitForTimeout(40);
  const ev = await animEvents(pg); const props = await animatedProps(pg);
  await motionContract(ctx, ev, props, "panel open");
  await settleAll(pg);
  const o = await pg.evaluate(() => { const t = document.querySelector("button[aria-expanded]") as HTMLElement; const p = document.getElementById(t.getAttribute("aria-controls") ?? "") as HTMLElement; const pc = getComputedStyle(p); const rect = p.getBoundingClientRect();
    const links = Array.from(p.querySelectorAll("a")) as HTMLElement[]; const cur = p.querySelector('a[aria-current="page"]') as HTMLElement | null; const plain = links.find((l) => l !== cur) ?? links[0]!;
    return { exp: t.getAttribute("aria-expanded"), vis: p.checkVisibility({ checkVisibilityCSS: true } as any), bg: pc.backgroundColor, inside: rect.left >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight, linkFg: getComputedStyle(plain).color, linkH: plain.getBoundingClientRect().height,
      cur: cur ? { fg: getComputedStyle(cur).color, bg: getComputedStyle(cur).backgroundColor, weight: getComputedStyle(cur).fontWeight } : null, plainWeight: getComputedStyle(plain).fontWeight, plainBg: getComputedStyle(plain).backgroundColor }; });
  assert(o.exp === "true" && o.vis, "click-opens", "clicking the trigger did not reveal the panel");
  assert(o.inside, "panel-in-viewport", "the open panel extends outside the viewport");
  assert(ratio(o.linkFg, opaque(o.bg, sb)) >= 4.5, "link-contrast", `panel link ${o.linkFg} on ${o.bg} = ${ratio(o.linkFg, opaque(o.bg, sb)).toFixed(2)}:1`);
  assert(o.linkH >= MIN_TARGET_AA, "link-target-size", `link height ${o.linkH}px < 24`);
  assert(!!o.cur, "fixture-has-current", "the fixture must mark one link current so the current-page cue is tested");
  if (o.cur) {
    assert(ratio(o.cur.fg, opaque(o.cur.bg, opaque(o.bg, sb))) >= 4.5, "current-contrast", `current link ${o.cur.fg} on ${o.cur.bg}`);
    assert(o.cur.weight !== o.plainWeight || o.cur.bg !== o.plainBg, "current-not-colour-only", "the current link differs from the others by colour alone");
  }
  await pg.keyboard.press("Escape"); await tick(pg, 60);

  if (first) {
    const s = await pg.evaluate(() => { const root = document.querySelector("#stage > *") as HTMLElement; const t = root.querySelector("button[aria-expanded]") as HTMLElement; const p = document.getElementById(t.getAttribute("aria-controls") ?? "") as HTMLElement;
      return { menuRoles: root.querySelectorAll('[role^="menu"], [role="menubar"]').length, links: p.querySelectorAll("a[href]").length, nonLinks: p.querySelectorAll("button, [role]").length, hasPopup: t.hasAttribute("aria-haspopup"), controls: !!p };
    });
    assert(s.menuRoles === 0, "no-menu-roles", "site navigation must not use menu/menubar/menuitem roles (APG disclosure navigation pattern)");
    assert(!s.hasPopup, "no-haspopup", "a navigation disclosure must not advertise aria-haspopup (it is not a menu)");
    assert(s.links >= 2 && s.nonLinks === 0, "panel-is-links", "the panel must be a list of links only");
    // focus alone never opens
    await focusStart(pg); await pg.keyboard.press("Tab"); await tick(pg, 40);
    assert((await pg.evaluate(() => document.querySelector("button[aria-expanded]")?.getAttribute("aria-expanded"))) === "false", "focus-does-not-open", "moving focus onto the trigger opened the panel");
    await focusRing(ctx, "button[aria-expanded]:focus-visible", "trigger", sb);
    // Enter opens, Space toggles, Escape closes AND returns focus to the trigger
    await pg.keyboard.press("Enter"); await tick(pg, 80);
    assert((await pg.evaluate(() => document.querySelector("button[aria-expanded]")?.getAttribute("aria-expanded"))) === "true", "enter-opens", "Enter did not open the panel");
    await pg.keyboard.press("Tab"); await tick(pg, 40);
    assert(await pg.evaluate(() => !!document.activeElement?.closest("ul")), "panel-follows-trigger", "Tab after opening does not move into the panel");
    await focusRing(ctx, "ul a:focus-visible", "link", opaque(await pg.evaluate(() => getComputedStyle(document.querySelector("ul")!).backgroundColor), sb));
    await pg.keyboard.press("Escape"); await tick(pg, 60);
    const esc = await pg.evaluate(() => ({ exp: document.querySelector("button[aria-expanded]")?.getAttribute("aria-expanded"), onTrigger: document.activeElement === document.querySelector("button[aria-expanded]") }));
    assert(esc.exp === "false", "escape-closes", "Escape did not close the panel");
    assert(esc.onTrigger, "escape-returns-focus", "after Escape from inside the panel focus did not return to the trigger");
    await pg.keyboard.press("Space"); await tick(pg, 80);
    assert((await pg.evaluate(() => document.querySelector("button[aria-expanded]")?.getAttribute("aria-expanded"))) === "true", "space-opens", "Space did not open the panel");
    // tabbing out of the whole component closes it
    await pg.keyboard.press("Tab"); await pg.keyboard.press("Tab"); await pg.keyboard.press("Tab"); await pg.keyboard.press("Tab"); await tick(pg, 80);
    assert((await pg.evaluate(() => document.querySelector("button[aria-expanded]")?.getAttribute("aria-expanded"))) === "false", "blur-closes", "tabbing out of the component left the panel open");
    // click outside closes
    await pg.locator(trig).click(); await tick(pg, 60);
    await pg.mouse.click(5, 5); await tick(pg, 60);
    assert((await pg.evaluate(() => document.querySelector("button[aria-expanded]")?.getAttribute("aria-expanded"))) === "false", "outside-click-closes", "clicking outside left the panel open");
    const axe = await new AxeBuilder({ page: pg }).include("#stage").analyze(); void axe;
    await pg.locator(trig).click(); await tick(pg, 60); await settleAll(pg);
    const axeOpen = await new AxeBuilder({ page: pg }).include("#stage").analyze(); for (const v of axeOpen.violations) assert(false, `axe:${v.id}`, `${axeNote(v)} (panel open)`);
    await pg.keyboard.press("Escape");
  }
}

/* ------------------------------------------------------------------ DIALOG (modal) */
const DLG = '[role="dialog"]';
async function openByKeyboard(pg: Page, triggerSel: string, popup: string) {
  await focusStart(pg); await pg.keyboard.press("Tab"); await pg.keyboard.press("Enter");
  await pg.waitForSelector(popup, { timeout: 2000 }); await tick(pg, 80); void triggerSel;
}
async function dialogCombo(ctx: Ctx, first: boolean) {
  const { pg, m, assert, radiusVar, motion } = ctx;
  const sb = await stageBg(pg);
  const trig = ".ds-dlg-001__trigger";
  await pg.mouse.move(0, 0); await focusStart(pg); await settleAll(pg);
  const tr = await pg.evaluate((sel) => { const t = document.querySelector(sel) as HTMLElement; const c = getComputedStyle(t); return { fg: c.color, bg: c.backgroundColor, h: t.getBoundingClientRect().height, expanded: t.getAttribute("aria-expanded"), haspopup: t.getAttribute("aria-haspopup") }; }, trig);
  assert(ratio(tr.fg, opaque(tr.bg, sb)) >= 4.5, "trigger-contrast", `trigger ${tr.fg} on ${tr.bg}`);
  assert(tr.h >= MIN_TARGET_AA, "target-size", `trigger height ${tr.h}px < 24`);
  assert(tr.haspopup === "dialog" && tr.expanded === "false", "trigger-aria", `trigger should advertise aria-haspopup="dialog" and aria-expanded="false" (got ${tr.haspopup}/${tr.expanded})`);
  assert(await pg.evaluate((s) => !document.querySelector(s), DLG), "closed-not-in-dom", "the dialog is in the DOM before it is opened");
  // open by click: motion contract
  await resetAnim(pg);
  await pg.locator(trig).click(); await pg.waitForSelector(DLG, { timeout: 2000 }); await pg.waitForTimeout(30);
  const ev = await animEvents(pg); const props = await animatedProps(pg);
  await motionContract(ctx, ev, props, "dialog enter");
  await settleAll(pg); await tick(pg);
  const d = await pg.evaluate(([rv]) => {
    const c = document.querySelector('[role="dialog"]') as HTMLElement; const cs = getComputedStyle(c); const q = (s: string) => c.querySelector(s) as HTMLElement | null; const col = (s: string) => { const e = q(s); return e ? getComputedStyle(e).color : ""; };
    const ov = document.querySelector('[class*="__overlay"]') as HTMLElement | null; const orc = ov?.getBoundingClientRect(); const r = c.getBoundingClientRect(); const act = q('[class*="__action"]'); const close = q('[class*="__close"]');
    return { inStage: !!c.closest("#stage"), tokenResolved: cs.getPropertyValue("--ds-dlg-bg").trim() !== "", radius: cs.borderTopLeftRadius, expected: rv ? cs.getPropertyValue(rv as string).trim() : "", bg: cs.backgroundColor, fg: cs.color, title: col('[class*="__title"]'), desc: col('[class*="__description"]'),
      actFg: act ? getComputedStyle(act).color : "", actBg: act ? getComputedStyle(act).backgroundColor : "", closeFg: close ? getComputedStyle(close).color : "", closeBox: close ? close.getBoundingClientRect().height : 0, closeName: close?.getAttribute("aria-label") ?? close?.textContent?.trim() ?? "",
      ov: ov ? { bg: getComputedStyle(ov).backgroundColor, covers: Math.round(orc!.width) >= innerWidth && Math.round(orc!.height) >= innerHeight } : null, fits: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, shadow: cs.boxShadow, border: cs.borderTopWidth };
  }, [radiusVar]);
  assert(d.inStage && d.tokenResolved, "dialog-in-theme-scope", "the dialog escaped the brand scope (its tokens do not resolve); portal into the data-brand element");
  if (radiusVar) assert(d.radius === d.expected, "radius-token", `dialog radius ${d.radius} != ${radiusVar} ${d.expected}`);
  const bg = opaque(d.bg, sb);
  assert(ratio(d.fg, bg) >= 4.5, "text-contrast", `dialog text ${d.fg} on ${bg}`);
  assert(ratio(d.title, bg) >= 4.5, "title-contrast", `title ${d.title} on ${bg} = ${ratio(d.title, bg).toFixed(2)}:1`);
  assert(ratio(d.desc, bg) >= 4.5, "description-contrast", `description ${d.desc} on ${bg} = ${ratio(d.desc, bg).toFixed(2)}:1`);
  assert(ratio(d.actFg, opaque(d.actBg, bg)) >= 4.5, "action-contrast", `action ${d.actFg} on ${d.actBg}`);
  assert(ratio(d.closeFg, bg) >= 3, "close-icon-contrast", `close icon ${d.closeFg} on ${bg} = ${ratio(d.closeFg, bg).toFixed(2)}:1 (non-text 3:1)`);
  assert(d.closeBox >= MIN_TARGET_AA, "close-target-size", `close control ${d.closeBox}px < 24`);
  assert(d.closeBox >= parseFloat(m.responsive.touchTarget) - 0.5, "touch-claim", `close control ${d.closeBox}px < claim ${m.responsive.touchTarget}`, "warn");
  assert(d.closeName.length > 0, "close-named", "the close control has no accessible name");
  assert(!!d.ov && d.ov.covers && alpha(d.ov.bg) >= 0.2 && alpha(d.ov.bg) < 1, "scrim-visible", `the overlay must cover the viewport with a translucent scrim (alpha 0.2-0.99): ${JSON.stringify(d.ov)}`);
  assert(d.fits, "dialog-fits-viewport", "the dialog does not fit inside the viewport");
  assert(d.shadow !== "none" || d.border !== "0px", "dialog-delineated", "the dialog has neither a shadow nor a border separating it from the page");
  // close (Escape): exit animation completes and the node is removed; focus returns to the trigger
  await pg.keyboard.press("Escape");
  await pg.waitForSelector(DLG, { state: "detached", timeout: 2500 }).then(() => { assert(true, "exit-completes", ""); }, () => { assert(false, "exit-completes", "the dialog is still mounted 2.5 s after Escape (exit animation never ends)"); });
  await tick(pg, 40);
  assert(await pg.evaluate((s) => document.activeElement === document.querySelector(s), trig), "escape-returns-focus", `after Escape focus is on ${await active(pg)}, not on the trigger`);
  assert((await infiniteAll(pg)) === 0, "no-infinite-at-rest", "an infinite animation runs after the dialog closed");

  if (first) {
    step("dialog first: open by keyboard");
    await openByKeyboard(pg, trig, DLG);
    const s = await pg.evaluate(() => { const c = document.querySelector('[role="dialog"]') as HTMLElement; const lab = document.getElementById(c.getAttribute("aria-labelledby") ?? ""); const des = document.getElementById(c.getAttribute("aria-describedby") ?? "");
      const tabbables = c.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])').length;
      const outside = [document.querySelector("#start"), document.querySelector(".ds-dlg-001__trigger")].filter(Boolean) as HTMLElement[];
      return { labelled: !!lab && (lab.textContent ?? "").trim().length > 0, described: !!des && (des.textContent ?? "").trim().length > 0, tabbables, inside: c.contains(document.activeElement), outsideHidden: outside.every((e) => !!e.closest('[aria-hidden="true"], [inert]')),
        locked: getComputedStyle(document.body).overflow === "hidden" || document.body.hasAttribute("data-scroll-locked"), modalAttr: c.getAttribute("aria-modal") }; });
    assert(s.labelled, "dialog-named", "the dialog is not named by its title (aria-labelledby)");
    assert(s.described, "dialog-described", "the dialog has no accessible description (aria-describedby)");
    assert(s.inside, "focus-moves-in", `after opening, focus is on ${await active(pg)} (outside the dialog)`);
    assert(s.outsideHidden, "outside-inert", "content outside the open dialog is neither aria-hidden nor inert (assertion is hidden-OR-inert, not aria-modal: ADR 0004)");
    assert(s.locked, "scroll-locked", "page scrolling is not locked while the modal is open");
    await focusRing(ctx, '[role="dialog"] :focus-visible', "control", opaque(d.bg, sb));
    step("dialog first: trap");
    // trap: forward and backward, settling after every key (ADR 0004)
    let escaped = 0;
    for (let i = 0; i < s.tabbables + 2; i++) { await pg.keyboard.press("Tab"); await tick(pg, 60); if (!(await pg.evaluate(() => !!document.activeElement?.closest('[role="dialog"]')))) escaped++; }
    assert(escaped === 0, "focus-trap-forward", `Tab moved focus outside the dialog ${escaped} time(s)`);
    escaped = 0;
    for (let i = 0; i < s.tabbables + 2; i++) { await pg.keyboard.press("Shift+Tab"); await tick(pg, 60); if (!(await pg.evaluate(() => !!document.activeElement?.closest('[role="dialog"]')))) escaped++; }
    assert(escaped === 0, "focus-trap-backward", `Shift+Tab moved focus outside the dialog ${escaped} time(s)`);
    step("dialog first: axe");
    const axe = await new AxeBuilder({ page: pg }).include("#stage").analyze(); for (const v of axe.violations) assert(false, `axe:${v.id}`, `${axeNote(v)} (dialog open)`);
    step("dialog first: close button");
    // the close control and the cancel button both close it and return focus
    await pg.locator('[role="dialog"] [class*="__close"]').click();
    await pg.waitForSelector(DLG, { state: "detached", timeout: 2500 }).catch(() => assert(false, "close-button-closes", "the close button did not close the dialog"));
    await tick(pg, 40);
    assert(await pg.evaluate((sel) => document.activeElement === document.querySelector(sel), trig), "close-returns-focus", "after the close button, focus is not back on the trigger");
    assert(await pg.evaluate(() => getComputedStyle(document.body).overflow !== "hidden" && !document.body.hasAttribute("data-scroll-locked")), "scroll-unlocked", "page scrolling stays locked after the dialog closed");
    assert(await pg.evaluate(() => !document.querySelector('[aria-hidden="true"]:not(svg)') ), "outside-restored", "content is still aria-hidden after the dialog closed");
    await pg.locator(trig).click(); await pg.waitForSelector(DLG, { timeout: 2000 }); await tick(pg, 80);
    await pg.locator('[role="dialog"] [class*="__action"]').first().click();
    await pg.waitForSelector(DLG, { state: "detached", timeout: 2500 }).catch(() => assert(false, "cancel-closes", "the cancel button did not close the dialog"));
    // outside (overlay) click closes
    await pg.locator(trig).click(); await pg.waitForSelector(DLG, { timeout: 2000 }); await tick(pg, 80);
    await pg.mouse.click(5, 5);
    await pg.waitForSelector(DLG, { state: "detached", timeout: 2500 }).catch(() => assert(false, "outside-click-closes", "clicking the scrim did not close the dialog"));
    await tick(pg, 40);
  }
}

/* ------------------------------------------------------------------ MENU (actions) */
const MENU = '[role="menu"]';
async function menuCombo(ctx: Ctx, first: boolean) {
  const { pg, m, assert, radiusVar } = ctx;
  const sb = await stageBg(pg);
  const trig = ".ds-dlg-003__trigger";
  await pg.mouse.move(0, 0); await focusStart(pg); await settleAll(pg);
  const tr = await pg.evaluate((sel) => { const t = document.querySelector(sel) as HTMLElement; const c = getComputedStyle(t); return { fg: c.color, bg: c.backgroundColor, h: t.getBoundingClientRect().height, haspopup: t.getAttribute("aria-haspopup"), expanded: t.getAttribute("aria-expanded") }; }, trig);
  assert(ratio(tr.fg, opaque(tr.bg, sb)) >= 4.5, "trigger-contrast", `trigger ${tr.fg} on ${tr.bg}`);
  assert(tr.h >= MIN_TARGET_AA, "target-size", `trigger height ${tr.h}px < 24`);
  assert(tr.haspopup === "menu" && tr.expanded === "false", "trigger-aria", `trigger should advertise aria-haspopup="menu" and aria-expanded="false" (got ${tr.haspopup}/${tr.expanded})`);
  assert(await pg.evaluate((s) => !document.querySelector(s), MENU), "closed-not-in-dom", "the menu is in the DOM before it is opened");

  await resetAnim(pg);
  await pg.locator(trig).click(); await pg.waitForSelector(MENU, { timeout: 2000 }); await pg.waitForTimeout(30);
  const ev = await animEvents(pg); const props = await animatedProps(pg);
  await motionContract(ctx, ev, props, "menu enter");
  await settleAll(pg); await tick(pg);
  const d = await pg.evaluate(([rv]) => {
    const c = document.querySelector('[role="menu"]') as HTMLElement; const cs = getComputedStyle(c); const items = Array.from(c.querySelectorAll('[role="menuitem"]')) as HTMLElement[]; const rect = c.getBoundingClientRect();
    const reg = items.find((i) => !i.hasAttribute("data-disabled") && !i.hasAttribute("data-destructive")); const dest = items.find((i) => i.hasAttribute("data-destructive")); const dis = items.find((i) => i.hasAttribute("data-disabled"));
    return { inStage: !!c.closest("#stage"), tokenResolved: cs.getPropertyValue("--ds-menu-bg").trim() !== "", radius: cs.borderTopLeftRadius, expected: rv ? cs.getPropertyValue(rv as string).trim() : "", bg: cs.backgroundColor, n: items.length, h: Math.min(...items.map((i) => i.getBoundingClientRect().height)),
      fg: reg ? getComputedStyle(reg).color : "", destFg: dest ? getComputedStyle(dest).color : null, disabledOk: dis ? dis.getAttribute("aria-disabled") === "true" : null, fits: rect.left >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight, shadow: cs.boxShadow, border: cs.borderTopWidth,
      sep: c.querySelectorAll('[role="separator"]').length, labelled: !!document.getElementById(c.getAttribute("aria-labelledby") ?? "") };
  }, [radiusVar]);
  assert(d.inStage && d.tokenResolved, "menu-in-theme-scope", "the menu escaped the brand scope (its tokens do not resolve); portal into the data-brand element");
  if (radiusVar) assert(d.radius === d.expected, "radius-token", `menu radius ${d.radius} != ${radiusVar} ${d.expected}`);
  const bg = opaque(d.bg, sb);
  assert(ratio(d.fg, bg) >= 4.5, "item-contrast", `item ${d.fg} on ${bg} = ${ratio(d.fg, bg).toFixed(2)}:1`);
  if (d.destFg) assert(ratio(d.destFg, bg) >= 4.5, "destructive-contrast", `destructive item ${d.destFg} on ${bg} = ${ratio(d.destFg, bg).toFixed(2)}:1`);
  assert(d.h >= MIN_TARGET_AA, "item-target-size", `item height ${d.h}px < 24`);
  assert(d.h >= parseFloat(m.responsive.touchTarget) - 0.5, "touch-claim", `item height ${d.h.toFixed(1)}px < claim ${m.responsive.touchTarget}`, "warn");
  assert(d.fits, "menu-fits-viewport", "the menu does not fit inside the viewport");
  assert(d.shadow !== "none" || d.border !== "0px", "menu-delineated", "the menu has neither a shadow nor a border separating it from the page");
  assert(d.n === (m.fixture.props.items as unknown[]).length, "items-rendered", `${d.n} menu items rendered`);
  assert(d.labelled, "menu-named", "the menu is not named (aria-labelledby the trigger)");
  assert(d.disabledOk !== false, "disabled-exposed", "a disabled item is not exposed with aria-disabled=true");
  await pg.keyboard.press("Escape");
  await pg.waitForSelector(MENU, { state: "detached", timeout: 2500 }).then(() => assert(true, "exit-completes", ""), () => assert(false, "exit-completes", "the menu is still mounted 2.5 s after Escape"));
  await tick(pg, 40);
  assert(await pg.evaluate((s) => document.activeElement === document.querySelector(s), trig), "escape-returns-focus", `after Escape focus is on ${await active(pg)}, not on the trigger`);
  assert((await infiniteAll(pg)) === 0, "no-infinite-at-rest", "an infinite animation runs after the menu closed");

  if (first) {
    const items = m.fixture.props.items as Array<{ id: string; label: string; disabled?: boolean }>;
    // keyboard open: Enter, then arrows. The highlighted item must be visible, readable and ringed.
    await openByKeyboard(pg, trig, MENU);
    assert(await pg.evaluate(() => !!document.activeElement?.closest('[role="menu"]')), "focus-moves-into-menu", `after Enter focus is on ${await active(pg)}`);
    await pg.keyboard.press("ArrowDown"); await tick(pg, 60);
    const h1 = await pg.evaluate(() => { const e = document.activeElement as HTMLElement; const c = getComputedStyle(e); const menu = getComputedStyle(e.closest('[role="menu"]')!); return { role: e.getAttribute("role"), hi: e.hasAttribute("data-highlighted"), fg: c.color, bg: c.backgroundColor, outline: parseFloat(c.outlineWidth), outlineStyle: c.outlineStyle, outlineColor: c.outlineColor, menuBg: menu.backgroundColor, text: e.textContent }; });
    assert(h1.role === "menuitem" && h1.hi, "highlight-follows-focus", `the focused item is not highlighted (${JSON.stringify({ role: h1.role, hi: h1.hi })})`);
    assert(h1.bg !== h1.menuBg, "highlight-visible", "the highlighted item looks the same as the others");
    assert(ratio(h1.fg, opaque(h1.bg, opaque(h1.menuBg, sb))) >= 4.5, "highlight-contrast", `highlighted ${h1.fg} on ${h1.bg} = ${ratio(h1.fg, opaque(h1.bg, sb)).toFixed(2)}:1`);
    assert(h1.outlineStyle !== "none" && h1.outline >= 2 && ratio(h1.outlineColor, opaque(h1.menuBg, sb)) >= 3, "item-focus-ring", `keyboard focus ring on the item: ${h1.outlineStyle} ${h1.outline}px ${h1.outlineColor}`);
    // arrows skip the disabled item, Home/End, wrap, typeahead
    const enabled = items.filter((i) => !i.disabled);
    const focusedLabel = () => pg.evaluate(() => (document.activeElement?.textContent ?? "").trim());
    await pg.keyboard.press("Home"); await tick(pg, 40);
    assert((await focusedLabel()) === enabled[0]!.label, "home-key", `Home focused "${await focusedLabel()}"`);
    await pg.keyboard.press("End"); await tick(pg, 40);
    assert((await focusedLabel()) === enabled[enabled.length - 1]!.label, "end-key", `End focused "${await focusedLabel()}"`);
    await pg.keyboard.press("ArrowDown"); await tick(pg, 40);
    assert((await focusedLabel()) === enabled[0]!.label, "arrow-wraps", `ArrowDown from the last item focused "${await focusedLabel()}" instead of wrapping`);
    await pg.keyboard.press("Home");
    for (let i = 1; i < enabled.length; i++) { await pg.keyboard.press("ArrowDown"); await tick(pg, 30); if ((await focusedLabel()) !== enabled[i]!.label) { assert(false, "disabled-skipped", `ArrowDown focused "${await focusedLabel()}", expected "${enabled[i]!.label}" (disabled items must be skipped)`); break; } }
    const tail = enabled[enabled.length - 1]!.label;
    await pg.keyboard.press("Home"); await pg.keyboard.type(tail.slice(0, 3).toLowerCase()); await tick(pg, 60);
    assert((await focusedLabel()) === tail, "typeahead", `typing "${tail.slice(0, 3).toLowerCase()}" focused "${await focusedLabel()}", expected "${tail}"`);
    const axe = await new AxeBuilder({ page: pg }).include("#stage").analyze(); for (const v of axe.violations) assert(false, `axe:${v.id}`, `${axeNote(v)} (menu open)`);
    // Enter on a disabled item does nothing; Enter on an enabled item closes the menu; Tab closes it
    await pg.keyboard.press("Escape"); await pg.waitForSelector(MENU, { state: "detached", timeout: 2500 }).catch(() => {});
    await openByKeyboard(pg, trig, MENU); await pg.keyboard.press("ArrowDown"); await pg.keyboard.press("Enter"); await tick(pg, 60);
    await pg.waitForSelector(MENU, { state: "detached", timeout: 2500 }).then(() => assert(true, "enter-selects", ""), () => assert(false, "enter-selects", "Enter on an item did not select it and close the menu"));
    await tick(pg, 40);
    assert(await pg.evaluate((s) => document.activeElement === document.querySelector(s), trig), "select-returns-focus", "after choosing an item focus is not back on the trigger");
    await openByKeyboard(pg, trig, MENU); await pg.keyboard.press("Tab"); await tick(pg, 80);
    // APG leaves Tab optional: either the menu closes, or focus stays inside it. Focus must never be lost to the page behind.
    assert(await pg.evaluate((s) => !document.querySelector(s) || !!document.activeElement?.closest(s), MENU), "tab-does-not-strand-focus", "Tab left the menu open with focus outside it");
    await pg.keyboard.press("Escape"); await pg.waitForSelector(MENU, { state: "detached", timeout: 2500 }).catch(() => {});
    // Space and ArrowDown open it from the trigger; outside click closes it
    await focusStart(pg); await pg.keyboard.press("Tab"); await pg.keyboard.press("Space"); await tick(pg, 120);
    assert(await pg.evaluate((s) => !!document.querySelector(s), MENU), "space-opens", "Space on the trigger did not open the menu");
    await pg.keyboard.press("Escape"); await pg.waitForSelector(MENU, { state: "detached", timeout: 2500 }).catch(() => {});
    await focusStart(pg); await pg.keyboard.press("Tab"); await pg.keyboard.press("ArrowDown"); await tick(pg, 120);
    assert(await pg.evaluate((s) => !!document.querySelector(s), MENU), "arrow-down-opens", "ArrowDown on the trigger did not open the menu");
    await pg.mouse.click(5, 5); await pg.waitForSelector(MENU, { state: "detached", timeout: 2500 }).then(() => assert(true, "outside-click-closes", ""), () => assert(false, "outside-click-closes", "clicking outside did not close the menu"));
    await tick(pg, 40);
  }
}

export const WAVE_B_COMBOS: Record<string, (ctx: Ctx, first: boolean) => Promise<void>> = { tabs: tabsCombo, accordion: accordionCombo, navmenu: navmenuCombo, dialog: dialogCombo, menu: menuCombo };
void armAnimEvents; void settle;
