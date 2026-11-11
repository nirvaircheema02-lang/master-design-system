import type { Page } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { animEvents, ratio, resetAnim } from "./helpers.ts";
import { MIN_TARGET_AA, alpha, animatedProps, focusRing, focusStart, infiniteAll, opaque, settleAll, stageBg, undeclaredLayout, type Ctx } from "./arch-common.ts";
import { NARROW, VIEW, pageRules, park, scrollTo, tick } from "./archetypes-c.ts";

/** Phase 4 Wave C rest (page fixture): megamenu, drawer, popover, tooltip. */
const axeNote = (v: { help: string; nodes: Array<{ target: unknown; any?: Array<{ message: string }> }> }) => `${v.help}: ${JSON.stringify(v.nodes[0]?.target)} ${v.nodes[0]?.any?.[0]?.message ?? ""}`.slice(0, 300);
const active = (pg: Page) => pg.evaluate(() => { const a = document.activeElement as HTMLElement | null; return a ? `${a.tagName.toLowerCase()}${a.id ? "#" + a.id : ""}|${(a.textContent ?? "").trim().slice(0, 24)}` : "none"; });
const count = (pg: Page, sel: string) => pg.evaluate((s) => document.querySelectorAll(s).length, sel);
const gone = (pg: Page, sel: string, ms = 2500) => pg.waitForSelector(sel, { state: "detached", timeout: ms }).then(() => true, () => false);

async function motionContract(ctx: Ctx, events: number, props: string[], what: string) {
  const { assert, motion, m } = ctx;
  if (motion === "no-preference") assert(events >= 1, `${what}-transition`, `${what} is instant (no transition or animation started)`);
  else assert(events === 0, "reduced-motion-animations", `${events} animation(s) start on ${what} under prefers-reduced-motion`);
  const bad = undeclaredLayout(props, m.interaction.layoutProps);
  assert(bad.length === 0, "layout-animation-undeclared", `animates layout property ${bad.join(", ")} without declaring it`);
}

/* ------------------------------------------------------------------ MEGA MENU */
async function megamenuCombo(ctx: Ctx, first: boolean) {
  const { pg, m, assert, radiusVar } = ctx;
  const sb = await stageBg(pg);
  const T = "nav.ds-nav-005 button[aria-expanded]";
  await scrollTo(pg, 0); await park(pg); await focusStart(pg); await settleAll(pg);
  const r = await pg.evaluate(([rv]) => { const nav = document.querySelector("nav.ds-nav-005") as HTMLElement; const t = nav.querySelector("button[aria-expanded]") as HTMLElement; const c = getComputedStyle(t); const plain = nav.querySelector("a.ds-nav-005__plain") as HTMLElement | null;
    return { radius: c.borderTopLeftRadius, expected: rv ? getComputedStyle(nav).getPropertyValue(rv as string).trim() : "", fg: c.color, h: t.getBoundingClientRect().height, closed: Array.from(nav.querySelectorAll("button[aria-expanded]")).every((b) => b.getAttribute("aria-expanded") === "false" && (document.getElementById(b.getAttribute("aria-controls") ?? "") as HTMLElement).hidden), plain: plain ? getComputedStyle(plain).color : "" }; }, [radiusVar]);
  if (radiusVar) assert(r.radius === r.expected, "radius-token", `trigger radius ${r.radius} != ${radiusVar} ${r.expected}`);
  assert(ratio(r.fg, sb) >= 4.5, "contrast-rest", `trigger ${r.fg} on ${sb} = ${ratio(r.fg, sb).toFixed(2)}:1`);
  assert(r.plain === "" || ratio(r.plain, sb) >= 4.5, "plain-link-contrast", `plain nav link ${r.plain} on ${sb}`);
  assert(r.h >= MIN_TARGET_AA, "target-size", `trigger height ${r.h}px < 24`);
  assert(r.h >= parseFloat(m.responsive.touchTarget) - 0.5, "touch-claim", `trigger height ${r.h.toFixed(1)}px < claim ${m.responsive.touchTarget}`, "warn");
  assert(r.closed, "closed-by-default", "a panel is open or visible before activation");
  assert((await infiniteAll(pg)) === 0, "no-infinite-at-rest", "an infinite animation runs while idle");
  await pg.locator(T).first().hover(); await tick(pg, 220);
  assert((await pg.locator(T).first().getAttribute("aria-expanded")) === "false", "hover-does-not-open", "hovering a trigger opened its panel (disclosures open on activation only)");
  await park(pg); await settleAll(pg);

  await resetAnim(pg); await pg.locator(T).first().click(); await pg.waitForTimeout(60);
  const ev = await animEvents(pg); const props = await animatedProps(pg);
  await motionContract(ctx, ev, props, "mega panel open");
  await settleAll(pg);
  const o = await pg.evaluate(() => { const t = document.querySelector("nav.ds-nav-005 button[aria-expanded]") as HTMLElement; const p = document.getElementById(t.getAttribute("aria-controls") ?? "") as HTMLElement; const pc = getComputedStyle(p); const rect = p.getBoundingClientRect();
    const link = p.querySelector("a:not([aria-current])") as HTMLElement; const cur = p.querySelector('a[aria-current="page"]') as HTMLElement | null; const head = p.querySelector("h2,h3,h4") as HTMLElement; const desc = p.querySelector('[class*="__desc"]') as HTMLElement | null;
    return { exp: t.getAttribute("aria-expanded"), vis: p.checkVisibility({ checkVisibilityCSS: true } as any), bg: pc.backgroundColor, inside: rect.left >= -0.5 && rect.right <= innerWidth + 0.5 && rect.bottom <= innerHeight + 0.5, link: getComputedStyle(link.querySelector("span") ?? link).color, linkH: link.getBoundingClientRect().height,
      head: getComputedStyle(head).color, desc: desc ? getComputedStyle(desc).color : null, groups: p.querySelectorAll("h2,h3,h4").length,
      cur: cur ? { fg: getComputedStyle(cur).color, bg: getComputedStyle(cur).backgroundColor, w: getComputedStyle(cur.querySelector("span")!).fontWeight, pw: getComputedStyle(link.querySelector("span")!).fontWeight } : null }; });
  const pbg = opaque(o.bg, sb);
  assert(o.exp === "true" && o.vis, "click-opens", "clicking the trigger did not reveal its panel");
  assert(o.inside, "panel-in-viewport", "the open panel extends outside the viewport");
  assert(o.groups >= 2, "panel-has-groups", `${o.groups} group heading(s) in the panel (a mega menu groups links under headings)`);
  assert(ratio(o.link, pbg) >= 4.5, "link-contrast", `panel link ${o.link} on ${pbg} = ${ratio(o.link, pbg).toFixed(2)}:1`);
  assert(ratio(o.head, pbg) >= 4.5, "heading-contrast", `group heading ${o.head} on ${pbg} = ${ratio(o.head, pbg).toFixed(2)}:1`);
  if (o.desc) assert(ratio(o.desc, pbg) >= 4.5, "description-contrast", `link description ${o.desc} on ${pbg} = ${ratio(o.desc, pbg).toFixed(2)}:1`);
  assert(o.linkH >= MIN_TARGET_AA, "link-target-size", `link height ${o.linkH}px < 24`);
  assert(!!o.cur, "fixture-has-current", "the fixture must mark one link current");
  if (o.cur) { assert(ratio(o.cur.fg, opaque(o.cur.bg, pbg)) >= 4.5, "current-contrast", `current link ${o.cur.fg} on ${o.cur.bg}`); assert(o.cur.w !== o.cur.pw || o.cur.bg !== "rgba(0, 0, 0, 0)", "current-not-colour-only", "the current link differs only by colour"); }
  await pg.keyboard.press("Escape"); await tick(pg, 60);

  if (first) {
    const s = await pg.evaluate(() => { const nav = document.querySelector("nav.ds-nav-005") as HTMLElement; return { menuRoles: nav.querySelectorAll('[role^="menu"], [role="menubar"]').length, haspopup: nav.querySelectorAll("[aria-haspopup]").length, nonLinks: Array.from(nav.querySelectorAll('[class*="__panel"] ul')).filter((u) => u.querySelectorAll("button, [role]").length).length }; });
    assert(s.menuRoles === 0, "no-menu-roles", "site navigation must not use menu/menubar/menuitem roles (APG disclosure navigation)");
    assert(s.haspopup === 0, "no-haspopup", "a navigation disclosure must not advertise aria-haspopup");
    assert(s.nonLinks === 0, "panel-is-links", "a panel list contains controls other than links");
    await focusStart(pg); await pg.keyboard.press("Tab"); await tick(pg, 40);
    assert((await pg.locator(T).first().getAttribute("aria-expanded")) === "false", "focus-does-not-open", "moving focus onto a trigger opened its panel");
    await focusRing(ctx, `${T}:focus-visible`, "trigger", sb);
    await pg.keyboard.press("Enter"); await tick(pg, 80);
    assert((await pg.locator(T).first().getAttribute("aria-expanded")) === "true", "enter-opens", "Enter did not open the panel");
    await pg.keyboard.press("Tab"); await tick(pg, 40);
    assert(await pg.evaluate(() => !!document.activeElement?.closest('[id][class*="__panel"]')), "panel-follows-trigger", "Tab after opening does not move into the panel");
    await focusRing(ctx, 'nav.ds-nav-005 [class*="__panel"] a:focus-visible', "link", opaque(await pg.evaluate(() => getComputedStyle(document.querySelector('nav.ds-nav-005 [class*="__panel"]:not([hidden])')!).backgroundColor), sb));
    await pg.keyboard.press("Escape"); await tick(pg, 60);
    const esc = await pg.evaluate(() => ({ exp: document.querySelector("nav.ds-nav-005 button[aria-expanded]")?.getAttribute("aria-expanded"), onTrigger: document.activeElement === document.querySelector("nav.ds-nav-005 button[aria-expanded]") }));
    assert(esc.exp === "false", "escape-closes", "Escape did not close the panel");
    assert(esc.onTrigger, "escape-returns-focus", "after Escape from inside the panel focus did not return to its trigger");
    await pg.keyboard.press("Space"); await tick(pg, 80);
    assert((await pg.locator(T).first().getAttribute("aria-expanded")) === "true", "space-opens", "Space did not open the panel");
    // only one panel at a time
    await pg.locator(T).nth(1).click(); await tick(pg, 120);
    const exp = await pg.evaluate(() => Array.from(document.querySelectorAll("nav.ds-nav-005 button[aria-expanded]")).map((b) => b.getAttribute("aria-expanded")));
    assert(exp.filter((x) => x === "true").length === 1 && exp[1] === "true", "one-panel-at-a-time", `opening a second panel left ${exp.join(",")}`);
    // axe with a panel open, then tabbing out closes, then outside click closes
    await settleAll(pg); await tick(pg, 80);
    const axe = await new AxeBuilder({ page: pg }).include("#stage").analyze(); for (const v of axe.violations) assert(false, `axe:${v.id}`, `${axeNote(v)} (panel open)`);
    for (let i = 0; i < 14; i++) await pg.keyboard.press("Tab");
    await tick(pg, 80);
    assert((await count(pg, 'nav.ds-nav-005 button[aria-expanded="true"]')) === 0, "blur-closes", "tabbing out of the nav left a panel open");
    await pg.locator(T).first().click(); await tick(pg, 60); await pg.mouse.click(300, 590); await tick(pg, 60);
    assert((await count(pg, 'nav.ds-nav-005 button[aria-expanded="true"]')) === 0, "outside-click-closes", "clicking outside left a panel open");
    await pg.locator(T).first().click(); await tick(pg, 60);
    await pg.setViewportSize(NARROW); await tick(pg, 160);
    const n = await pg.evaluate(() => { const p = document.querySelector('nav.ds-nav-005 [class*="__panel"]:not([hidden])') as HTMLElement | null; const r = p?.getBoundingClientRect(); return { open: !!p, ok: !!r && r.left >= -0.5 && r.right <= innerWidth + 0.5, sw: document.documentElement.scrollWidth, iw: innerWidth }; });
    assert(!n.open || (n.ok && n.sw <= n.iw + 1), "reflow-320", `the open panel overflows a 320 px viewport (${JSON.stringify(n)})`);
    await pg.setViewportSize(VIEW); await tick(pg, 100);
    await pg.keyboard.press("Escape"); await pageRules(ctx, m.id);
  }
}

/* ------------------------------------------------------------------ DRAWER (modal nav) */
const DRW = '[role="dialog"]';
async function drawerCombo(ctx: Ctx, first: boolean) {
  const { pg, m, assert, radiusVar, mount } = ctx;
  const sb = await stageBg(pg);
  const trig = ".ds-nav-004__trigger";
  await scrollTo(pg, 0); await park(pg); await focusStart(pg); await settleAll(pg);
  const tr = await pg.evaluate((sel) => { const t = document.querySelector(sel) as HTMLElement; const c = getComputedStyle(t); return { fg: c.color, bg: c.backgroundColor, h: t.getBoundingClientRect().height, hp: t.getAttribute("aria-haspopup"), ex: t.getAttribute("aria-expanded") }; }, trig);
  assert(ratio(tr.fg, opaque(tr.bg, sb)) >= 4.5, "trigger-contrast", `trigger ${tr.fg} on ${tr.bg}`);
  assert(tr.h >= MIN_TARGET_AA, "target-size", `trigger height ${tr.h}px < 24`);
  assert(tr.h >= parseFloat(m.responsive.touchTarget) - 0.5, "touch-claim", `trigger height ${tr.h.toFixed(1)}px < claim ${m.responsive.touchTarget}`, "warn");
  assert(tr.hp === "dialog" && tr.ex === "false", "trigger-aria", `trigger should advertise aria-haspopup="dialog" and aria-expanded="false" (got ${tr.hp}/${tr.ex})`);
  assert((await count(pg, DRW)) === 0, "closed-not-in-dom", "the drawer is in the DOM before it is opened");

  await resetAnim(pg); await pg.locator(trig).click(); await pg.waitForSelector(DRW, { timeout: 2000 }); await pg.waitForTimeout(40);
  const ev = await animEvents(pg); const props = await animatedProps(pg);
  await motionContract(ctx, ev, props, "drawer enter");
  await settleAll(pg); await tick(pg);
  const d = await pg.evaluate(([rv]) => {
    const c = document.querySelector('[role="dialog"]') as HTMLElement; const cs = getComputedStyle(c); const rect = c.getBoundingClientRect(); const side = c.getAttribute("data-side");
    const link = c.querySelector("nav a:not([aria-current])") as HTMLElement; const cur = c.querySelector('nav a[aria-current="page"]') as HTMLElement | null; const nav = c.querySelector("nav") as HTMLElement; const ov = document.querySelector('[class*="__overlay"]') as HTMLElement | null; const orc = ov?.getBoundingClientRect(); const close = c.querySelector('[class*="__close"]') as HTMLElement | null;
    return { inStage: !!c.closest("#stage"), tokenResolved: cs.getPropertyValue("--ds-nav-drawer-bg").trim() !== "", linkRadius: getComputedStyle(link).borderTopLeftRadius, expected: rv ? cs.getPropertyValue(rv as string).trim() : "", bg: cs.backgroundColor, fg: cs.color, link: getComputedStyle(link).color, linkH: link.getBoundingClientRect().height,
      title: getComputedStyle(c.querySelector('[class*="__title"]')!).color, cur: cur ? { fg: getComputedStyle(cur).color, bg: getComputedStyle(cur).backgroundColor, w: getComputedStyle(cur).fontWeight, pw: getComputedStyle(link).fontWeight } : null,
      width: rect.width, height: rect.height, edge: side === "left" ? rect.left : innerWidth - rect.right, side, navName: nav.getAttribute("aria-label") ?? "", links: nav.querySelectorAll("a[href]").length,
      ov: ov ? { bg: getComputedStyle(ov).backgroundColor, covers: Math.round(orc!.width) >= innerWidth && Math.round(orc!.height) >= innerHeight } : null, closeBox: close?.getBoundingClientRect().height ?? 0, closeName: close?.getAttribute("aria-label") ?? "", iw: innerWidth, ih: innerHeight };
  }, [radiusVar]);
  const bg = opaque(d.bg, sb);
  assert(d.inStage && d.tokenResolved, "drawer-in-theme-scope", "the drawer escaped the brand scope (its tokens do not resolve); portal into the data-brand element");
  if (radiusVar) assert(d.linkRadius === d.expected, "radius-token", `link radius ${d.linkRadius} != ${radiusVar} ${d.expected}`);
  assert(ratio(d.link, bg) >= 4.5, "link-contrast", `drawer link ${d.link} on ${bg} = ${ratio(d.link, bg).toFixed(2)}:1`);
  assert(ratio(d.title, bg) >= 4.5, "title-contrast", `title ${d.title} on ${bg}`);
  assert(d.linkH >= MIN_TARGET_AA, "link-target-size", `link height ${d.linkH}px < 24`);
  assert(!!d.cur, "fixture-has-current", "the fixture must mark one link current");
  if (d.cur) { assert(ratio(d.cur.fg, opaque(d.cur.bg, bg)) >= 4.5, "current-contrast", `current link ${d.cur.fg} on ${d.cur.bg}`); assert(d.cur.w !== d.cur.pw || d.cur.bg !== "rgba(0, 0, 0, 0)", "current-not-colour-only", "the current link differs only by colour"); }
  assert(Math.abs(d.height - d.ih) <= 1, "drawer-full-height", `the drawer is ${d.height}px tall in a ${d.ih}px viewport`);
  assert(Math.abs(d.edge) <= 1, "drawer-on-its-edge", `the ${d.side} drawer is ${d.edge}px from its edge`);
  assert(d.width <= d.iw * 0.86 + 1, "drawer-leaves-scrim", `the drawer is ${d.width}px wide in a ${d.iw}px viewport; a strip of page must stay visible to close it`);
  assert(d.navName.length > 0 && d.links >= 2, "drawer-nav", `the drawer nav is unnamed or has ${d.links} links`);
  assert(!!d.ov && d.ov.covers && alpha(d.ov.bg) >= 0.2 && alpha(d.ov.bg) < 1, "scrim-visible", `the overlay must cover the viewport with a translucent scrim: ${JSON.stringify(d.ov)}`);
  assert(d.closeBox >= MIN_TARGET_AA && d.closeName.length > 0, "close-control", `the close control is ${d.closeBox}px with name "${d.closeName}"`);
  await pg.keyboard.press("Escape");
  assert(await gone(pg, DRW), "exit-completes", "the drawer is still mounted 2.5 s after Escape (exit animation never ends)");
  await tick(pg, 40);
  assert(await pg.evaluate((s) => document.activeElement === document.querySelector(s), trig), "escape-returns-focus", `after Escape focus is on ${await active(pg)}, not on the trigger`);
  assert((await infiniteAll(pg)) === 0, "no-infinite-at-rest", "an infinite animation runs after the drawer closed");

  if (first) {
    await focusStart(pg); await pg.keyboard.press("Tab"); await pg.keyboard.press("Enter"); await pg.waitForSelector(DRW, { timeout: 2000 }); await tick(pg, 100);
    const s = await pg.evaluate(() => { const c = document.querySelector('[role="dialog"]') as HTMLElement; const lab = document.getElementById(c.getAttribute("aria-labelledby") ?? ""); const tabbables = c.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])').length;
      const outside = [document.querySelector("#start"), document.querySelector(".ds-nav-004__trigger"), document.getElementById("main")].filter(Boolean) as HTMLElement[];
      return { labelled: !!lab && (lab.textContent ?? "").trim().length > 0, tabbables, inside: c.contains(document.activeElement), outsideHidden: outside.every((e) => !!e.closest('[aria-hidden="true"], [inert]')), locked: getComputedStyle(document.body).overflow === "hidden" || document.body.hasAttribute("data-scroll-locked") }; });
    assert(s.labelled, "drawer-named", "the drawer is not named by its title");
    assert(s.inside, "focus-moves-in", `after opening, focus is on ${await active(pg)} (outside the drawer)`);
    assert(s.outsideHidden, "outside-inert", "content outside the open drawer is neither aria-hidden nor inert");
    assert(s.locked, "scroll-locked", "page scrolling is not locked while the drawer is open");
    await focusRing(ctx, `${DRW} :focus-visible`, "control", bg);
    let esc = 0; for (let i = 0; i < s.tabbables + 2; i++) { await pg.keyboard.press("Tab"); await tick(pg, 60); if (!(await pg.evaluate(() => !!document.activeElement?.closest('[role="dialog"]')))) esc++; }
    assert(esc === 0, "focus-trap-forward", `Tab moved focus outside the drawer ${esc} time(s)`);
    esc = 0; for (let i = 0; i < s.tabbables + 2; i++) { await pg.keyboard.press("Shift+Tab"); await tick(pg, 60); if (!(await pg.evaluate(() => !!document.activeElement?.closest('[role="dialog"]')))) esc++; }
    assert(esc === 0, "focus-trap-backward", `Shift+Tab moved focus outside the drawer ${esc} time(s)`);
    const axe = await new AxeBuilder({ page: pg }).include("#stage").analyze(); for (const v of axe.violations) assert(false, `axe:${v.id}`, `${axeNote(v)} (drawer open)`);
    // choosing a link closes the drawer AND follows the link
    await pg.evaluate(() => history.replaceState(null, "", location.pathname));
    await pg.locator(`${DRW} nav a[href="#s15"]`).click();
    assert(await gone(pg, DRW), "link-closes-drawer", "choosing a link left the drawer open");
    assert((await pg.evaluate(() => location.hash)) === "#s15", "link-follows", "the chosen link did not navigate");
    assert(await pg.evaluate(() => getComputedStyle(document.body).overflow !== "hidden" && !document.body.hasAttribute("data-scroll-locked")), "scroll-unlocked", "page scrolling stays locked after the drawer closed");
    await scrollTo(pg, 0);
    // outside (scrim) click closes
    await pg.locator(trig).click(); await pg.waitForSelector(DRW, { timeout: 2000 }); await tick(pg, 100);
    await pg.mouse.click(d.iw - 5, 300);
    assert(await gone(pg, DRW), "outside-click-closes", "clicking the scrim did not close the drawer");
    // right-hand variant, and fit at 320 px
    await mount({ side: "right" });
    await pg.locator(trig).click(); await pg.waitForSelector(DRW, { timeout: 2000 }); await settleAll(pg); await tick(pg, 100);
    const rr = await pg.evaluate(() => { const r = (document.querySelector('[role="dialog"]') as HTMLElement).getBoundingClientRect(); return innerWidth - r.right; });
    assert(Math.abs(rr) <= 1, "right-side", `side=right leaves the drawer ${rr}px from the right edge`);
    await pg.keyboard.press("Escape"); await gone(pg, DRW);
    await mount();
    await pg.setViewportSize(NARROW); await tick(pg, 160);
    await pg.locator(trig).click(); await pg.waitForSelector(DRW, { timeout: 2000 }); await settleAll(pg);
    const n = await pg.evaluate(() => { const r = (document.querySelector('[role="dialog"]') as HTMLElement).getBoundingClientRect(); return { w: r.width, iw: innerWidth, sw: document.documentElement.scrollWidth }; });
    assert(n.w <= n.iw * 0.86 + 1 && n.sw <= n.iw + 1, "reflow-320", `at 320 px the drawer is ${n.w}px wide (page ${n.sw}px)`);
    await pg.keyboard.press("Escape"); await gone(pg, DRW);
    await pg.setViewportSize(VIEW); await tick(pg, 100);
  }
}

/* ------------------------------------------------------------------ POPOVER (non-modal) */
async function popoverCombo(ctx: Ctx, first: boolean) {
  const { pg, m, assert, radiusVar } = ctx;
  const sb = await stageBg(pg);
  const trig = ".ds-dlg-002__trigger";
  await scrollTo(pg, 0); await park(pg); await focusStart(pg); await settleAll(pg);
  const tr = await pg.evaluate((sel) => { const t = document.querySelector(sel) as HTMLElement; const c = getComputedStyle(t); return { fg: c.color, bg: c.backgroundColor, h: t.getBoundingClientRect().height, hp: t.getAttribute("aria-haspopup"), ex: t.getAttribute("aria-expanded"), b: t.getBoundingClientRect().bottom }; }, trig);
  assert(ratio(tr.fg, opaque(tr.bg, sb)) >= 4.5, "trigger-contrast", `trigger ${tr.fg} on ${tr.bg}`);
  assert(tr.h >= MIN_TARGET_AA, "target-size", `trigger height ${tr.h}px < 24`);
  assert(tr.hp === "dialog" && tr.ex === "false", "trigger-aria", `trigger should advertise aria-haspopup="dialog" and aria-expanded="false" (got ${tr.hp}/${tr.ex})`);
  assert((await count(pg, '[role="dialog"]')) === 0, "closed-not-in-dom", "the popover is in the DOM before it is opened");
  await resetAnim(pg); await pg.locator(trig).click(); await pg.waitForSelector('[role="dialog"]', { timeout: 2000 }); await pg.waitForTimeout(40);
  const ev = await animEvents(pg); const props = await animatedProps(pg);
  await motionContract(ctx, ev, props, "popover enter");
  await settleAll(pg); await tick(pg);
  const d = await pg.evaluate(([rv, tb]) => {
    const c = document.querySelector('[role="dialog"]') as HTMLElement; const cs = getComputedStyle(c); const rect = c.getBoundingClientRect(); const close = c.querySelector('[class*="__close"]') as HTMLElement | null; const title = c.querySelector('[class*="__title"]') as HTMLElement | null; const body = c.querySelector('[class*="__body"]') as HTMLElement;
    return { inStage: !!c.closest("#stage"), tokenResolved: cs.getPropertyValue("--ds-pop-bg").trim() !== "", radius: cs.borderTopLeftRadius, expected: rv ? cs.getPropertyValue(rv as string).trim() : "", bg: cs.backgroundColor, fg: cs.color, body: getComputedStyle(body).color, title: title ? getComputedStyle(title).color : null,
      fits: rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight, gap: rect.top - (tb as number), named: !!(c.getAttribute("aria-label") || c.getAttribute("aria-labelledby")), closeFg: close ? getComputedStyle(close).color : "", closeH: close?.getBoundingClientRect().height ?? 0, closeName: close?.getAttribute("aria-label") ?? "", shadow: cs.boxShadow, border: cs.borderTopWidth };
  }, [radiusVar, tr.b]);
  const bg = opaque(d.bg, sb);
  assert(d.inStage && d.tokenResolved, "popover-in-theme-scope", "the popover escaped the brand scope (its tokens do not resolve)");
  if (radiusVar) assert(d.radius === d.expected, "radius-token", `popover radius ${d.radius} != ${radiusVar} ${d.expected}`);
  assert(ratio(d.body, bg) >= 4.5, "body-contrast", `popover text ${d.body} on ${bg} = ${ratio(d.body, bg).toFixed(2)}:1`);
  if (d.title) assert(ratio(d.title, bg) >= 4.5, "title-contrast", `popover title ${d.title} on ${bg}`);
  assert(ratio(d.closeFg, bg) >= 3, "close-contrast", `close icon ${d.closeFg} on ${bg}`);
  assert(d.closeH >= MIN_TARGET_AA && d.closeName.length > 0, "close-control", `close control ${d.closeH}px, name "${d.closeName}"`);
  assert(d.named, "popover-named", "the popover has no accessible name (aria-label / aria-labelledby)");
  assert(d.fits, "popover-in-viewport", "the popover extends outside the viewport");
  assert(d.gap >= -1 && d.gap <= 48, "anchored-to-trigger", `the popover starts ${d.gap}px from its trigger`);
  assert(d.shadow !== "none" || d.border !== "0px", "popover-delineated", "the popover has neither a shadow nor a border");
  await pg.keyboard.press("Escape");
  assert(await gone(pg, '[role="dialog"]'), "exit-completes", "the popover is still mounted 2.5 s after Escape");
  await tick(pg, 40);
  assert(await pg.evaluate((s) => document.activeElement === document.querySelector(s), trig), "escape-returns-focus", `after Escape focus is on ${await active(pg)}, not on the trigger`);
  assert((await infiniteAll(pg)) === 0, "no-infinite-at-rest", "an infinite animation runs after the popover closed");

  if (first) {
    await focusStart(pg); await pg.keyboard.press("Tab"); await pg.keyboard.press("Enter"); await pg.waitForSelector('[role="dialog"]', { timeout: 2000 }); await tick(pg, 100);
    const s = await pg.evaluate(() => { const c = document.querySelector('[role="dialog"]') as HTMLElement; const outside = [document.querySelector("#start"), document.querySelector(".ds-dlg-002__trigger"), document.getElementById("main")].filter(Boolean) as HTMLElement[];
      return { inside: c.contains(document.activeElement), modalIsolation: outside.some((e) => !!e.closest('[aria-hidden="true"], [inert]')), locked: getComputedStyle(document.body).overflow === "hidden" || document.body.hasAttribute("data-scroll-locked"), ex: (document.querySelector(".ds-dlg-002__trigger") as HTMLElement).getAttribute("aria-expanded") }; });
    assert(s.inside, "focus-moves-in", `after opening, focus is on ${await active(pg)} (outside the popover)`);
    assert(s.ex === "true", "trigger-expanded", "the trigger does not report aria-expanded=true while open");
    assert(!s.modalIsolation, "page-stays-live", "the page behind an open popover is aria-hidden/inert (a popover is NOT modal; use DLG-001 for that)");
    assert(!s.locked, "page-scrolls", "page scrolling is locked while a popover is open (a popover is not modal)");
    await focusRing(ctx, '[role="dialog"] :focus-visible', "control", bg);
    const axe = await new AxeBuilder({ page: pg }).include("#stage").analyze(); for (const v of axe.violations) assert(false, `axe:${v.id}`, `${axeNote(v)} (popover open)`);
    // tabbing out must not trap (Radix loops Tab inside its focus scope): Tab past the last control closes it and focus continues from the trigger
    await pg.keyboard.press("Tab"); await tick(pg, 120);
    assert((await count(pg, '[role="dialog"]')) === 0 || (await gone(pg, '[role="dialog"]', 1500)), "tab-out-closes", "Tab past the last control left the popover open (keyboard focus is trapped inside a non-modal popover)");
    assert(await pg.evaluate((sel) => document.activeElement === document.querySelector(sel), trig), "tab-out-continues-from-trigger", `after tabbing out focus is on ${await active(pg)}, not on the trigger`);
    await focusStart(pg); await pg.keyboard.press("Tab"); await pg.keyboard.press("Enter"); await pg.waitForSelector('[role="dialog"]', { timeout: 2000 }); await tick(pg, 100);
    await pg.keyboard.press("Shift+Tab"); await tick(pg, 120);
    assert(await gone(pg, '[role="dialog"]', 1500), "shift-tab-out-closes", "Shift+Tab before the first control left the popover open");
    // outside click closes, clicking the trigger toggles, the close button closes and returns focus
    await pg.locator(trig).click(); await pg.waitForSelector('[role="dialog"]', { timeout: 2000 }); await tick(pg, 100);
    await pg.mouse.click(700, 560);
    assert(await gone(pg, '[role="dialog"]'), "outside-click-closes", "clicking outside did not close the popover");
    await pg.locator(trig).click(); await pg.waitForSelector('[role="dialog"]', { timeout: 2000 }); await tick(pg, 100);
    await pg.locator(trig).click();
    assert(await gone(pg, '[role="dialog"]'), "trigger-toggles", "clicking the trigger again did not close the popover");
    await pg.locator(trig).click(); await pg.waitForSelector('[role="dialog"]', { timeout: 2000 }); await tick(pg, 100);
    await pg.locator('[role="dialog"] [class*="__close"]').click();
    assert(await gone(pg, '[role="dialog"]'), "close-button-closes", "the close button did not close the popover");
    await tick(pg, 40);
    assert(await pg.evaluate((s) => document.activeElement === document.querySelector(s), trig), "close-returns-focus", "after the close button, focus is not back on the trigger");
    // fits a 320 px viewport
    await pg.setViewportSize(NARROW); await tick(pg, 160);
    await pg.locator(trig).click(); await pg.waitForSelector('[role="dialog"]', { timeout: 2000 }); await settleAll(pg); await tick(pg, 100);
    const n = await pg.evaluate(() => { const r = (document.querySelector('[role="dialog"]') as HTMLElement).getBoundingClientRect(); return { ok: r.left >= 0 && r.right <= innerWidth, sw: document.documentElement.scrollWidth, iw: innerWidth }; });
    assert(n.ok && n.sw <= n.iw + 1, "reflow-320", `the popover overflows a 320 px viewport (${JSON.stringify(n)})`);
    await pg.keyboard.press("Escape"); await gone(pg, '[role="dialog"]');
    await pg.setViewportSize(VIEW); await tick(pg, 100);
  }
}

/* ------------------------------------------------------------------ TOOLTIP (WCAG 1.4.13) */
const TIPSEL = '[role="tooltip"]';
async function tooltipCombo(ctx: Ctx, first: boolean) {
  const { pg, m, assert, radiusVar } = ctx;
  const sb = await stageBg(pg);
  const trig = ".ds-tip-001__trigger";
  const content = m.fixture.props.content as string;
  await scrollTo(pg, 0); await park(pg); await focusStart(pg); await settleAll(pg);
  const tr = await pg.evaluate((sel) => { const t = document.querySelector(sel) as HTMLElement; const c = getComputedStyle(t); return { fg: c.color, bg: c.backgroundColor, h: t.getBoundingClientRect().height, tag: t.tagName, describedby: t.getAttribute("aria-describedby") }; }, trig);
  assert(tr.tag === "BUTTON", "trigger-focusable", "the tooltip trigger must be a real <button> (a tooltip on a non-focusable element cannot be reached from the keyboard)");
  assert(ratio(tr.fg, opaque(tr.bg, sb)) >= 4.5, "trigger-contrast", `trigger ${tr.fg} on ${tr.bg}`);
  assert(tr.h >= MIN_TARGET_AA, "target-size", `trigger height ${tr.h}px < 24`);
  assert(tr.describedby === null && (await count(pg, TIPSEL)) === 0, "closed-by-default", "a tooltip is in the DOM before hover or focus");

  // keyboard focus shows it immediately (no hover delay for keyboard users)
  await resetAnim(pg); await focusStart(pg); await pg.keyboard.press("Tab"); await pg.waitForSelector(TIPSEL, { state: "attached", timeout: 2000 }).catch(() => undefined); await pg.waitForTimeout(60);
  const ev = await animEvents(pg); const props = await animatedProps(pg);
  await motionContract(ctx, ev, props, "tooltip appear");
  await settleAll(pg); await tick(pg);
  const d = await pg.evaluate(([rv]) => {
    const tip = document.querySelector('.ds-tip-001[data-state]') as HTMLElement | null; const role = document.querySelector('[role="tooltip"]') as HTMLElement | null; const t = document.querySelector(".ds-tip-001__trigger") as HTMLElement; const tb = t.getBoundingClientRect();
    if (!tip) return null; const cs = getComputedStyle(tip); const r = tip.getBoundingClientRect();
    return { inStage: !!tip.closest("#stage"), tokenResolved: cs.getPropertyValue("--ds-tip-bg").trim() !== "", radius: cs.borderTopLeftRadius, expected: rv ? cs.getPropertyValue(rv as string).trim() : "", bg: cs.backgroundColor, fg: cs.color, text: (role?.textContent ?? tip.textContent ?? "").trim(), describedby: t.getAttribute("aria-describedby"), describedRole: !!document.getElementById(t.getAttribute("aria-describedby") ?? "")?.matches('[role="tooltip"]'),
      fits: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, overlapsTrigger: r.left < tb.right && r.right > tb.left && r.top < tb.bottom && r.bottom > tb.top, interactive: tip.querySelectorAll("a, button, input, select, textarea, [tabindex]").length };
  }, [radiusVar]);
  assert(!!d, "shows-on-focus", "keyboard focus on the trigger did not show the tooltip");
  if (d) {
    const bg = opaque(d.bg, sb);
    assert(d.inStage && d.tokenResolved, "tooltip-in-theme-scope", "the tooltip escaped the brand scope (its tokens do not resolve)");
    if (radiusVar) assert(d.radius === d.expected, "radius-token", `tooltip radius ${d.radius} != ${radiusVar} ${d.expected}`);
    assert(ratio(d.fg, bg) >= 4.5, "text-contrast", `tooltip text ${d.fg} on ${bg} = ${ratio(d.fg, bg).toFixed(2)}:1`);
    assert(d.text.includes(content.slice(0, 12)), "tooltip-text", `tooltip says "${d.text}", expected the content prop`);
    assert(!!d.describedby && d.describedRole, "described-by", "the trigger is not described by the role=tooltip element (aria-describedby)");
    assert(d.fits, "tooltip-in-viewport", "the tooltip extends outside the viewport");
    assert(!d.overlapsTrigger, "tooltip-clear-of-trigger", "the tooltip covers its own trigger");
    assert(d.interactive === 0, "tooltip-not-interactive", "a tooltip must not contain interactive content (use a popover)");
  }
  await focusRing(ctx, `${trig}:focus-visible`, "trigger", sb);
  // Escape dismisses it while focus stays on the trigger (1.4.13 dismissible)
  await pg.keyboard.press("Escape"); await tick(pg, 120);
  assert((await count(pg, TIPSEL)) === 0, "escape-dismisses", "Escape did not dismiss the tooltip (WCAG 1.4.13 dismissible)");
  assert(await pg.evaluate((s) => document.activeElement === document.querySelector(s), trig), "escape-keeps-focus", "Escape moved focus off the trigger");
  assert((await infiniteAll(pg)) === 0, "no-infinite-at-rest", "an infinite animation runs after the tooltip closed");

  if (first) {
    await pg.evaluate(() => (document.activeElement as HTMLElement)?.blur()); await focusStart(pg); await tick(pg, 200);
    // hover: respects the delay, then shows; the pointer can move ONTO the tooltip without it vanishing (hoverable)
    const box = await pg.locator(trig).boundingBox();
    await pg.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2); await tick(pg, 120);
    assert((await count(pg, TIPSEL)) === 0, "hover-delay", "the tooltip appeared immediately on hover (it should wait the configured delay)");
    await tick(pg, 700);
    assert((await count(pg, TIPSEL)) >= 1, "shows-on-hover", "hovering the trigger did not show the tooltip");
    const tb = await pg.locator('.ds-tip-001[data-state]').first().boundingBox();
    await pg.mouse.move(tb!.x + tb!.width / 2, tb!.y + tb!.height / 2, { steps: 6 }); await tick(pg, 400);
    assert((await count(pg, TIPSEL)) >= 1, "hoverable", "the tooltip vanished when the pointer moved onto it (WCAG 1.4.13 hoverable)");
    await pg.mouse.move(300, 590, { steps: 8 }); await tick(pg, 1200);
    assert((await count(pg, TIPSEL)) === 0, "hover-leave-hides", "the tooltip stayed after the pointer left");
    // persistent while focus stays; blur hides
    await pg.evaluate(() => (document.querySelector(".ds-tip-001__trigger") as HTMLElement).focus()); await tick(pg, 700);
    assert((await count(pg, TIPSEL)) >= 1, "persistent", "the tooltip disappeared on its own while the trigger still had focus");
    await pg.evaluate(() => (document.activeElement as HTMLElement).blur()); await tick(pg, 200);
    assert((await count(pg, TIPSEL)) === 0, "blur-hides", "the tooltip stayed after focus left the trigger");
    await focusStart(pg); await pg.keyboard.press("Tab"); await tick(pg, 150); await settleAll(pg);
    const axe = await new AxeBuilder({ page: pg }).include("#stage").analyze(); for (const v of axe.violations) assert(false, `axe:${v.id}`, `${axeNote(v)} (tooltip open)`);
    await pg.keyboard.press("Escape");
    await pg.setViewportSize(NARROW); await tick(pg, 160); await focusStart(pg); await pg.keyboard.press("Tab"); await tick(pg, 200);
    const n = await pg.evaluate(() => { const t = document.querySelector('.ds-tip-001[data-state]') as HTMLElement | null; const r = t?.getBoundingClientRect(); return { shown: !!t, ok: !!r && r.left >= 0 && r.right <= innerWidth, sw: document.documentElement.scrollWidth, iw: innerWidth }; });
    assert(n.shown && n.ok && n.sw <= n.iw + 1, "reflow-320", `the tooltip does not fit a 320 px viewport (${JSON.stringify(n)})`);
    await pg.keyboard.press("Escape"); await pg.setViewportSize(VIEW); await tick(pg, 100);
  }
}

export const WAVE_D_COMBOS: Record<string, (ctx: Ctx, first: boolean) => Promise<void>> = { megamenu: megamenuCombo, drawer: drawerCombo, popover: popoverCombo, tooltip: tooltipCombo };
void stageBg; void settleAll;
