import type { Page } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { armAnimEvents, animEvents, ratio, resetAnim, visualContrast } from "./helpers.ts";
import { MIN_TARGET_AA, animatedProps, focusRing, focusStart, infiniteAll, opaque, rgb, settleAll, stageBg, undeclaredLayout, type Ctx } from "./arch-common.ts";

/**
 * Phase 4 Wave C (P12 page fixture): skiplink, breadcrumb, header (sticky / hide-on-scroll) and toast.
 * The component is mounted into #slot (display: contents) of a tall page: skip target `main#main`, 31 sections of focusable
 * controls (a link on the left, a button on the right), a second labelled nav ("Footer"), scrollable window.
 */
export const tick = (pg: Page, ms = 70) => pg.waitForTimeout(ms);
export const px = (v: string) => parseFloat(v) || 0;
/** Park the pointer where no page-level component lives (the top-left corner IS the first link of a header/breadcrumb). */
export const park = (pg: Page) => pg.mouse.move(300, 590);
export const VIEW = { width: 900, height: 600 };
export const NARROW = { width: 320, height: 640 };
export const scrollTo = async (pg: Page, y: number) => { await pg.evaluate((yy) => window.scrollTo(0, yy), y); await tick(pg, 120); };
const overlaps = (a: { left: number; right: number; top: number; bottom: number }, b: { left: number; right: number; top: number; bottom: number }) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

/** Page-wide rules every page-level component must keep: reflow at 320 px, unique landmark names. */
export async function pageRules(ctx: Ctx, what: string) {
  const { pg, assert } = ctx;
  const names = await pg.evaluate(() => Array.from(document.querySelectorAll("nav")).map((n) => n.getAttribute("aria-label") ?? n.getAttribute("aria-labelledby") ?? ""));
  assert(names.every((n) => n.length > 0), "nav-named", `a <nav> on the page has no accessible name (${JSON.stringify(names)})`);
  assert(new Set(names).size === names.length, "nav-names-unique", `two navs share a name: ${JSON.stringify(names)} (landmark names must be unique)`);
  await pg.setViewportSize(NARROW); await tick(pg, 120);
  const w = await pg.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  assert(w.sw <= w.iw + 1, "reflow-320", `${what}: horizontal scroll at 320 px (content ${w.sw}px wide in a ${w.iw}px window; WCAG 1.4.10)`);
  await pg.setViewportSize(VIEW); await tick(pg, 120);
}

/* ------------------------------------------------------------------ SKIP LINK */
async function skiplinkCombo(ctx: Ctx, first: boolean) {
  const { pg, m, assert, radiusVar, mount, motion } = ctx;
  const sb = await stageBg(pg);
  const L = "#slot > a";
  await scrollTo(pg, 0); await park(pg); await focusStart(pg); await settleAll(pg);
  const rest = await pg.evaluate(([sel, rv]) => { const a = document.querySelector(sel as string) as HTMLElement; const c = getComputedStyle(a); const r = a.getBoundingClientRect();
    return { display: c.display, visibility: c.visibility, offscreen: r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth, text: (a.textContent ?? "").trim(), radius: c.borderTopLeftRadius, expected: rv ? c.getPropertyValue(rv as string).trim() : "" }; }, [L, radiusVar]);
  assert(rest.display !== "none" && rest.visibility !== "hidden", "hidden-but-focusable", "the skip link is display:none / visibility:hidden, so keyboard users can never reach it");
  assert(rest.offscreen, "hidden-until-focus", "the skip link is visible on screen before it has focus (it should only appear on focus)");
  assert(rest.text.length >= 8, "skip-label", `the skip link text "${rest.text}" is too short to be understood`);
  if (radiusVar) assert(rest.radius === rest.expected, "radius-token", `skip link radius ${rest.radius} != ${radiusVar} ${rest.expected}`);

  // the FIRST Tab stop of the page, and instantly readable
  await resetAnim(pg); await focusStart(pg); await pg.keyboard.press("Tab"); await tick(pg, 40);
  const ev = await animEvents(pg);
  assert(ev === 0, "skip-no-motion", `${ev} animation(s) run when the skip link appears; it must appear instantly`);
  const f = await pg.evaluate(([sel]) => { const a = document.querySelector(sel as string) as HTMLElement; const c = getComputedStyle(a); const r = a.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { active: document.activeElement === a, inView: r.top >= 0 && r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, fg: c.color, bg: c.backgroundColor, h: r.height, top: !!hit && (hit === a || a.contains(hit)) }; }, [L]);
  assert(f.active, "first-tab-stop", "the skip link is not the first thing Tab reaches");
  assert(f.inView, "visible-on-focus", "the focused skip link is not fully inside the viewport");
  assert(f.top, "not-obscured", "something covers the focused skip link");
  assert(ratio(f.fg, opaque(f.bg, sb)) >= 4.5, "contrast", `skip link ${f.fg} on ${f.bg} = ${ratio(f.fg, opaque(f.bg, sb)).toFixed(2)}:1`);
  assert(f.h >= MIN_TARGET_AA, "target-size", `skip link height ${f.h}px < 24`);
  assert(f.h >= parseFloat(m.responsive.touchTarget) - 0.5, "touch-claim", `skip link height ${f.h.toFixed(1)}px < claim ${m.responsive.touchTarget}`, "warn");
  await focusRing(ctx, `${L}:focus`, "link", sb);
  assert((await infiniteAll(pg)) === 0, "no-infinite-at-rest", "an infinite animation runs");
  void motion;

  if (first) {
    // activating moves FOCUS to the target (not only scroll) and the link hides again
    await pg.keyboard.press("Enter"); await tick(pg, 80);
    const a = await pg.evaluate(([sel]) => { const link = document.querySelector(sel as string) as HTMLElement; const r = link.getBoundingClientRect(); return { onMain: document.activeElement?.id === "main", gone: r.bottom <= 0 || r.top >= innerHeight }; }, [L]);
    assert(a.onMain, "moves-focus-to-main", `activating the skip link left focus on ${await pg.evaluate(() => document.activeElement?.tagName + "#" + document.activeElement?.id)}, not on <main>`);
    assert(a.gone, "hides-after-use", "the skip link is still on screen after it was used");
    await pg.keyboard.press("Tab"); await tick(pg, 60);
    assert(await pg.evaluate(() => !!document.activeElement?.closest("main")), "next-tab-in-main", "the next Tab after skipping is not inside <main> (the skip did not move the focus starting point)");
    // a skip target that does not exist must not break the page
    await mount({ target: "nope" }); await focusStart(pg); await pg.keyboard.press("Tab");
    const errs = await pg.evaluate(() => (document.activeElement as HTMLAnchorElement)?.getAttribute("href"));
    assert(errs === "#nope", "target-prop", `the href is ${errs}, expected #nope`);
    await mount({ reveal: "always" }); await scrollTo(pg, 0);
    assert(await pg.evaluate(([sel]) => { const r = (document.querySelector(sel as string) as HTMLElement).getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }, [L]), "reveal-always", "reveal=always must show the link without focus");
    await mount();
    await pg.setViewportSize(NARROW); await tick(pg, 100); await focusStart(pg); await pg.keyboard.press("Tab"); await tick(pg, 40);
    assert(await pg.evaluate(([sel]) => { const r = (document.querySelector(sel as string) as HTMLElement).getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }, [L]), "fits-320", "the focused skip link overflows a 320 px viewport");
    await pg.setViewportSize(VIEW); await tick(pg, 100);
  }
}

/* ------------------------------------------------------------------ BREADCRUMB */
async function breadcrumbCombo(ctx: Ctx, first: boolean) {
  const { pg, m, assert, radiusVar, mount } = ctx;
  const sb = await stageBg(pg);
  await scrollTo(pg, 0); await park(pg); await focusStart(pg); await settleAll(pg);
  const r = await pg.evaluate(([rv]) => { const nav = document.querySelector("nav.ds-nav-009") as HTMLElement; const link = nav.querySelector("a") as HTMLElement; const cur = (nav.querySelector('[aria-current="page"]') ?? nav.querySelector("ol > li:last-child > *")) as HTMLElement; const lc = getComputedStyle(link);
    return { radius: lc.borderTopLeftRadius, expected: rv ? getComputedStyle(nav).getPropertyValue(rv as string).trim() : "", link: lc.color, deco: lc.textDecorationLine, thick: lc.textDecorationThickness, h: link.getBoundingClientRect().height, cur: getComputedStyle(cur).color }; }, [radiusVar]);
  if (radiusVar) assert(r.radius === r.expected, "radius-token", `link radius ${r.radius} != ${radiusVar} ${r.expected}`);
  assert(ratio(r.link, sb) >= 4.5, "link-contrast", `link ${r.link} on ${sb} = ${ratio(r.link, sb).toFixed(2)}:1`);
  assert(ratio(r.cur, sb) >= 4.5, "current-contrast", `current page ${r.cur} on ${sb} = ${ratio(r.cur, sb).toFixed(2)}:1`);
  assert(/underline/.test(r.deco), "link-not-colour-only", "breadcrumb links are not underlined (colour alone must not mark a link)");
  assert(r.h >= MIN_TARGET_AA, "target-size", `link height ${r.h}px < 24`);
  assert(r.h >= parseFloat(m.responsive.touchTarget) - 0.5, "touch-claim", `link height ${r.h.toFixed(1)}px < claim ${m.responsive.touchTarget}`, "warn");
  assert((await infiniteAll(pg)) === 0, "no-infinite-at-rest", "an infinite animation runs");
  // hover feedback (underline weight) and focus ring
  await pg.locator("nav.ds-nav-009 a").first().hover(); await tick(pg, 60);
  const hv = await rgb(pg, "nav.ds-nav-009 a:hover", "textDecorationThickness");
  assert(hv !== "" && hv !== r.thick, "hover-feedback", `hovering a breadcrumb link changes nothing (underline stays ${r.thick})`);
  await park(pg);
  await focusStart(pg); await pg.keyboard.press("Tab"); await tick(pg, 40);
  await focusRing(ctx, "nav.ds-nav-009 a:focus-visible", "link", sb);

  if (first) {
    const s = await pg.evaluate(() => { const nav = document.querySelector("nav.ds-nav-009") as HTMLElement; const items = Array.from(nav.querySelectorAll("ol > li")) as HTMLElement[]; const last = items[items.length - 1]!;
      return { listOk: !!nav.querySelector(":scope > ol"), n: items.length, links: nav.querySelectorAll("a[href]").length, lastCurrent: last.querySelector('[aria-current="page"]') !== null, others: nav.querySelectorAll('[aria-current]').length, lastIsLink: !!last.querySelector("a"), name: nav.getAttribute("aria-label") }; });
    assert(s.listOk && s.n >= 2, "ordered-list", "the trail must be an ordered list inside the nav");
    assert(s.lastCurrent && s.others === 1, "aria-current-last", "exactly the last item must carry aria-current=\"page\"");
    assert(s.links === s.n - 1, "links-before-current", `${s.links} links for ${s.n} items (every item except the current page must be a link)`);
    assert(!!s.name && /bread/i.test(s.name), "landmark-name", `the nav is named "${s.name}" (expected a breadcrumb name)`);
    const snap = await pg.locator("nav.ds-nav-009").ariaSnapshot();
    assert(!snap.split("\n").some((l) => !/\/url/.test(l) && /\//.test(l)), "separators-not-content", `separators leak into the accessibility tree: ${snap.replace(/\s+/g, " ").slice(0, 140)}`);
    // following a link works from the keyboard
    await focusStart(pg); await pg.keyboard.press("Tab"); await pg.keyboard.press("Enter"); await tick(pg, 80);
    assert((await pg.evaluate(() => location.hash)) === "#s1", "link-follows", "Enter on the first breadcrumb link did not navigate");
    await pg.evaluate(() => { history.replaceState(null, "", location.pathname); window.scrollTo(0, 0); });
    // a very long trail wraps at 320 px instead of scrolling
    await mount({ items: [{ label: "Home", href: "#s1" }, { label: "A section name that is quite long indeed", href: "#s2" }, { label: "Another long intermediate section label", href: "#s3" }, { label: "Current page with an unreasonably long title that must wrap rather than overflow" }] });
    await pageRules(ctx, "breadcrumb");
    await mount();
  }
}

/* ------------------------------------------------------------------ HEADER (sticky / hide-on-scroll) */
async function headerCombo(ctx: Ctx, first: boolean) {
  const { pg, m, assert, radiusVar, motion } = ctx;
  const sb = await stageBg(pg);
  const H = "#slot > header";
  const hideOnScroll = m.interaction.modules.includes("slide-hide");
  await scrollTo(pg, 0); await park(pg); await focusStart(pg); await settleAll(pg);
  const r = await pg.evaluate(([sel, rv]) => { const h = document.querySelector(sel as string) as HTMLElement; const hc = getComputedStyle(h); const link = h.querySelector("nav a") as HTMLElement; const lc = getComputedStyle(link); const brand = h.querySelector("a") as HTMLElement; const cur = h.querySelector('[aria-current="page"]') as HTMLElement | null;
    return { radius: lc.borderTopLeftRadius, expected: rv ? hc.getPropertyValue(rv as string).trim() : "", bg: hc.backgroundColor, pos: hc.position, shadow: hc.boxShadow, border: hc.borderBottomWidth, hh: h.offsetHeight, linkH: link.getBoundingClientRect().height, link: lc.color, brand: getComputedStyle(brand).color,
      cur: cur ? { fg: getComputedStyle(cur).color, bg: getComputedStyle(cur).backgroundColor, weight: getComputedStyle(cur).fontWeight } : null, plainWeight: lc.fontWeight, plainBg: lc.backgroundColor, spt: getComputedStyle(document.documentElement).scrollPaddingTop,
      banner: !h.closest("main, section, article, aside, nav"), navName: h.querySelector("nav")?.getAttribute("aria-label") ?? "" }; }, [H, radiusVar]);
  const bg = opaque(r.bg, sb);
  if (radiusVar) assert(r.radius === r.expected, "radius-token", `link radius ${r.radius} != ${radiusVar} ${r.expected}`);
  assert(r.pos === "sticky", "position-sticky", `the header is position:${r.pos}, not sticky`);
  assert(r.banner, "banner-landmark", "the header sits inside another landmark, so it is not the page banner");
  assert(r.shadow !== "none" || r.border !== "0px", "header-delineated", "the header has neither a border nor a shadow separating it from the page");
  assert(r.linkH >= MIN_TARGET_AA, "target-size", `link height ${r.linkH}px < 24`);
  assert(r.linkH >= parseFloat(m.responsive.touchTarget) - 0.5, "touch-claim", `link height ${r.linkH.toFixed(1)}px < claim ${m.responsive.touchTarget}`, "warn");
  assert(ratio(r.link, bg) >= 4.5, "link-contrast", `link ${r.link} on ${bg} = ${ratio(r.link, bg).toFixed(2)}:1`);
  assert(ratio(r.brand, bg) >= 4.5, "brand-contrast", `brand ${r.brand} on ${bg} = ${ratio(r.brand, bg).toFixed(2)}:1`);
  assert(!!r.cur, "fixture-has-current", "the fixture must mark one link current so the current-page cue is tested");
  if (r.cur) {
    assert(ratio(r.cur.fg, opaque(r.cur.bg, bg)) >= 4.5, "current-contrast", `current link ${r.cur.fg} on ${r.cur.bg}`);
    assert(r.cur.weight !== r.plainWeight || r.cur.bg !== r.plainBg, "current-not-colour-only", "the current link differs from the others by colour alone");
  }
  const act = await pg.evaluate(([sel]) => { const a = document.querySelector(`${sel} > a:last-child:not(:first-child)`) as HTMLElement | null; if (!a || a.parentElement!.querySelector("nav a") === a) return null; const c = getComputedStyle(a); const rc = a.getBoundingClientRect(); return { fg: c.color, bg: c.backgroundColor, h: rc.height }; }, [H]);
  if (act) { assert(ratio(act.fg, opaque(act.bg, bg)) >= 4.5, "action-contrast", `header action ${act.fg} on ${act.bg} = ${ratio(act.fg, opaque(act.bg, bg)).toFixed(2)}:1`); assert(act.h >= MIN_TARGET_AA, "action-target-size", `header action ${act.h}px < 24`); }
  assert(px(r.spt) >= r.hh, "scroll-padding-top", `html scroll-padding-top is ${r.spt} but the header is ${r.hh}px tall: focus and anchors will slide under it (WCAG 2.4.11)`);
  assert(r.navName.length > 0, "nav-named", "the header nav has no accessible name");
  assert((await infiniteAll(pg)) === 0, "no-infinite-at-rest", "an infinite animation runs");
  // link hover feedback + focus ring
  await pg.locator(`${H} nav a`).nth(0).hover(); await tick(pg, 220);
  const hov = await pg.evaluate(([sel]) => { const a = document.querySelector(`${sel} nav a`) as HTMLElement; const c = getComputedStyle(a); return { fg: c.color, bg: c.backgroundColor }; }, [H]);
  assert(hov.bg !== r.plainBg || hov.fg !== r.link, "hover-feedback", "hovering a link changes nothing");
  assert(ratio(hov.fg, opaque(hov.bg, bg)) >= 4.5, "contrast-hover", `hovered link ${hov.fg} on ${hov.bg}`);
  await park(pg); await settleAll(pg);
  await focusStart(pg); await pg.keyboard.press("Tab"); await pg.keyboard.press("Tab"); await tick(pg, 40);
  await focusRing(ctx, `${H} a:focus-visible`, "link", bg);

  if (!hideOnScroll) {
    // pinned while scrolling; sits above content; no motion on scroll
    await resetAnim(pg); await scrollTo(pg, 1800);
    const p = await pg.evaluate(([sel]) => { const h = document.querySelector(sel as string) as HTMLElement; const rc = h.getBoundingClientRect(); const hit = document.elementFromPoint(rc.left + rc.width / 2, rc.top + rc.height / 2); return { top: rc.top, want: parseFloat(getComputedStyle(h).top) || 0, over: !!hit && h.contains(hit) }; }, [H]);
    assert(Math.abs(p.top - p.want) < 0.5 && p.over, "stays-pinned", `after scrolling the header is at top=${p.top} (expected ${p.want}; covered: ${!p.over})`);
    assert((await animEvents(pg)) === 0, "no-motion-on-scroll", "scrolling a pinned header starts an animation");
  }

  if (hideOnScroll) {
    // per combo (the deep checks below run once, with motion on): the slide uses a transition, and none at all under reduced motion
    await pg.evaluate(() => (document.activeElement as HTMLElement | null)?.blur()); await focusStart(pg);
    await resetAnim(pg); await scrollTo(pg, 900); await tick(pg, 140);
    const evHide = await animEvents(pg); const hp = await animatedProps(pg); const layoutBad = hp.filter((q) => /^(top|height|margin.*|padding.*|box-?shadow)/i.test(q));
    if (motion === "no-preference") assert(evHide >= 1, "hide-transition", "the header hides without any transition");
    else assert(evHide === 0, "reduced-motion-animations", `${evHide} animation(s) on hide under prefers-reduced-motion`);
    assert(layoutBad.length === 0, "layout-animation-undeclared", `the header animates ${layoutBad.join(", ")}`);
    await tick(pg, 300); await scrollTo(pg, 0); await tick(pg, 350);
  }

  if (first) {
    await focusObscuredCheck(ctx, H);
    await anchorJumpCheck(ctx, H);
    if (hideOnScroll) await hideOnScrollChecks(ctx, H);
    await pageRules(ctx, m.id);
    await scrollTo(pg, 0);
  }
  void motion; void undeclaredLayout; void visualContrast;
}

/** WCAG 2.4.11: walking BACKWARDS from deep in the page, a focused control must never end up under the header. */
async function focusObscuredCheck(ctx: Ctx, H: string) {
  const { pg, assert } = ctx;
  await scrollTo(pg, 2400);
  await pg.evaluate(() => (document.querySelector("#s20 button") as HTMLElement).focus());
  let bad = 0, worst = "";
  for (let i = 0; i < 24; i++) {
    await pg.keyboard.press("Shift+Tab"); await tick(pg, 90);
    const o = await pg.evaluate(([sel]) => { const h = document.querySelector(sel as string) as HTMLElement; const hv = getComputedStyle(h).visibility !== "hidden"; const hb = hv ? h.getBoundingClientRect().bottom : 0; const a = document.activeElement as HTMLElement; const r = a.getBoundingClientRect();
      return { inHeader: h.contains(a), top: r.top, hb, label: `${a.tagName}:${(a.textContent ?? "").trim().slice(0, 14)}` }; }, [H]);
    if (!o.inHeader && o.top < o.hb - 0.5) { bad++; worst = `${o.label} top=${o.top.toFixed(0)} under header bottom=${o.hb.toFixed(0)}`; }
  }
  assert(bad === 0, "focus-not-obscured", `${bad} focused control(s) ended up under the header (${worst})`);
}

/** Following a #fragment lands the target below the header, not under it. */
async function anchorJumpCheck(ctx: Ctx, H: string) {
  const { pg, assert } = ctx;
  await scrollTo(pg, 0);
  await pg.evaluate(() => { history.replaceState(null, "", location.pathname); });
  await pg.locator(`${H} nav a[href="#s15"]`).click(); await tick(pg, 160);
  const a = await pg.evaluate(([sel]) => ({ top: (document.getElementById("s15") as HTMLElement).getBoundingClientRect().top, hb: (document.querySelector(sel as string) as HTMLElement).getBoundingClientRect().bottom }), [H]);
  assert(a.top >= a.hb - 0.5, "anchor-not-hidden", `after jumping to #s15 its top is ${a.top.toFixed(0)}px but the header ends at ${a.hb.toFixed(0)}px`);
  await scrollTo(pg, 0);
}

async function hideOnScrollChecks(ctx: Ctx, H: string) {
  const { pg, assert, motion } = ctx;
  const state = () => pg.evaluate(([sel]) => { const h = document.querySelector(sel as string) as HTMLElement; const link = h.querySelector("nav a") as HTMLElement; return { hidden: h.dataset.hidden, vis: getComputedStyle(h).visibility, shown: h.checkVisibility({ checkVisibilityCSS: true } as any), tf: getComputedStyle(h).transform, linkVisible: link.checkVisibility({ checkVisibilityCSS: true } as any) }; }, [H]);
  await scrollTo(pg, 0); await tick(pg, 300);
  assert((await state()).hidden === "false", "visible-at-top", "the header is hidden at the top of the page");
  await resetAnim(pg);
  await scrollTo(pg, 900); await tick(pg, 120);
  const evHide = await animEvents(pg);
  if (motion === "no-preference") assert(evHide >= 1, "hide-transition", "the header hides without any transition");
  else assert(evHide === 0, "reduced-motion-animations", `${evHide} animation(s) on hide under prefers-reduced-motion`);
  const props = await animatedProps(pg); const bad = props.filter((p) => /^(top|height|margin.*|padding.*|box-?shadow)/i.test(p));
  assert(bad.length === 0, "layout-animation-undeclared", `the header animates ${bad.join(", ")}`);
  await tick(pg, 350);
  const hid = await state();
  assert(hid.hidden === "true" && !hid.shown, "hides-on-scroll-down", `scrolling down left the header visible (${JSON.stringify(hid)})`);
  assert(!hid.linkVisible && hid.vis === "hidden", "hidden-not-tabbable", "the hidden header is still exposed (visibility:hidden is what removes it from the tab order and the accessibility tree)");
  assert(await pg.evaluate(([sel]) => { (document.querySelector(`${sel} nav a`) as HTMLElement).focus(); return !(document.querySelector(sel as string) as HTMLElement).contains(document.activeElement); }, [H]), "hidden-not-focusable", "a link inside the hidden header can take focus");
  // scrolling up brings it back
  await scrollTo(pg, 700); await tick(pg, 250);
  assert((await state()).hidden === "false" && (await state()).shown, "shows-on-scroll-up", "scrolling up did not bring the header back");
  // hide it again, then Shift+Tab from the top of <main>: the header must be reachable and visible BEFORE focus lands in it
  await scrollTo(pg, 1600); await tick(pg, 400);
  assert((await state()).hidden === "true", "hides-again", "the header did not hide on the second scroll down");
  await pg.evaluate(() => (document.getElementById("main") as HTMLElement).focus());
  await pg.keyboard.press("Shift+Tab"); await tick(pg, 120);
  const t = await pg.evaluate(([sel]) => { const h = document.querySelector(sel as string) as HTMLElement; return { inHeader: h.contains(document.activeElement), shown: h.checkVisibility({ checkVisibilityCSS: true } as any) }; }, [H]);
  assert(t.inHeader && t.shown, "tab-reveals-header", `Shift+Tab from <main> did not land in a visible header (in header: ${t.inHeader}, visible: ${t.shown}); keyboard users cannot reach a hidden header`);
  // focus inside the header keeps it open while scrolling down
  await scrollTo(pg, 2300); await tick(pg, 400);
  assert((await state()).hidden === "false", "focus-keeps-open", "the header hid while a control inside it had focus");
  await pg.evaluate(() => (document.activeElement as HTMLElement)?.blur()); await scrollTo(pg, 0);
}

/* ------------------------------------------------------------------ TOAST */
async function toastCombo(ctx: Ctx, first: boolean) {
  const { pg, m, assert, radiusVar, mount, motion } = ctx;
  const sb = await stageBg(pg);
  const items = m.fixture.props.items as Array<{ id: string; title: string; tone?: string }>;
  const R = "section.ds-tst-001";
  await scrollTo(pg, 0); await park(pg);

  // the live regions exist BEFORE anything is announced, and survive additions
  await mount({ items: [] }); await tick(pg, 60);
  const pre = await pg.evaluate(() => { const reg = document.querySelector("section.ds-tst-001") as HTMLElement; const st = reg?.querySelector('[role="status"]') as HTMLElement | null; const al = reg?.querySelector('[role="alert"]') as HTMLElement | null; st?.setAttribute("data-probe", "1");
    const shown = (e: HTMLElement | null) => !!e && getComputedStyle(e).display !== "none" && getComputedStyle(e).visibility !== "hidden";
    return { region: !!reg, named: !!reg?.getAttribute("aria-label"), status: shown(st), polite: st?.getAttribute("aria-live") === "polite", alert: shown(al) }; });
  assert(pre.region && pre.named, "region-named", "the notifications region is missing or has no accessible name");
  assert(pre.status && pre.polite, "status-region-exists-first", "the polite live region (role=status) must exist in the DOM before a toast is added, or screen readers stay silent");
  assert(pre.alert, "alert-region-exists-first", "the assertive live region (role=alert) must exist in the DOM before a critical toast is added");
  await focusStart(pg); await resetAnim(pg);
  await mount(); await tick(pg, 110);
  const ev = await animEvents(pg); const props = await animatedProps(pg);
  const layout = undeclaredLayout(props, m.interaction.layoutProps);
  if (motion === "no-preference") assert(ev >= 1, "enter-transition", "toasts appear without any transition"); else assert(ev === 0, "reduced-motion-animations", `${ev} animation(s) on enter under prefers-reduced-motion`);
  assert(layout.length === 0, "layout-animation-undeclared", `toasts animate ${layout.join(", ")}`);
  await settleAll(pg); await tick(pg, 60);
  const d = await pg.evaluate(([rv]) => {
    const reg = document.querySelector("section.ds-tst-001") as HTMLElement; const rr = reg.getBoundingClientRect(); const toasts = Array.from(reg.querySelectorAll(".ds-tst-001__item")) as HTMLElement[];
    const one = (t: HTMLElement) => { const c = getComputedStyle(t); const q = (s: string) => t.querySelector(s) as HTMLElement | null; const col = (s: string) => { const e = q(s); return e ? getComputedStyle(e).color : ""; };
      const icon = q("svg"); const close = q("button"); const act = q("a");
      return { bg: c.backgroundColor, radius: c.borderTopLeftRadius, shadow: c.boxShadow, border: c.borderTopWidth, tone: t.dataset.tone, toneBorder: c.borderInlineStartColor, title: col('[class*="__title"]'), desc: q('[class*="__description"]') ? col('[class*="__description"]') : null, icon: icon ? getComputedStyle(icon).stroke : "", closeFg: close ? getComputedStyle(close).color : "", closeH: close?.getBoundingClientRect().height ?? 0, closeName: close?.getAttribute("aria-label") ?? "", act: act ? { fg: getComputedStyle(act).color, deco: getComputedStyle(act).textDecorationLine } : null,
        inStatus: !!t.closest('[role="status"]'), inAlert: !!t.closest('[role="alert"]'), toneText: (q('[class*="__tone"]')?.textContent ?? "").trim(), hasRole: t.hasAttribute("role") }; };
    return { inStage: !!reg.closest("#stage"), fixedOk: getComputedStyle(reg).position !== "fixed" || (rr.right <= innerWidth && rr.bottom <= innerHeight && rr.left >= 0), w: rr.width, active: document.activeElement?.id, spb: getComputedStyle(document.documentElement).scrollPaddingBottom, regionH: rr.height, rv: rv ? getComputedStyle(reg).getPropertyValue(rv as string).trim() : "", items: toasts.map(one), rect: { left: rr.left, right: rr.right, top: rr.top, bottom: rr.bottom } };
  }, [radiusVar]);
  assert(d.inStage, "toast-in-theme-scope", "the toast region is outside the brand scope");
  assert(d.active === "start", "toast-takes-no-focus", `focus moved to #${d.active} when toasts appeared; a toast must never take focus`);
  assert(d.items.length === items.length, "items-rendered", `${d.items.length} toasts rendered, expected ${items.length}`);
  assert(d.fixedOk, "toast-in-viewport", "the toast stack extends outside the viewport");
  for (const t of d.items) {
    const bg = opaque(t.bg, sb);
    if (radiusVar) assert(t.radius === d.rv, "radius-token", `toast radius ${t.radius} != ${radiusVar} ${d.rv}`);
    assert(ratio(t.title, bg) >= 4.5, "title-contrast", `title ${t.title} on ${bg} = ${ratio(t.title, bg).toFixed(2)}:1`);
    if (t.desc) assert(ratio(t.desc, bg) >= 4.5, "description-contrast", `description ${t.desc} on ${bg} = ${ratio(t.desc, bg).toFixed(2)}:1`);
    assert(ratio(t.icon, bg) >= 3, "icon-contrast", `${t.tone} icon ${t.icon} on ${bg} = ${ratio(t.icon, bg).toFixed(2)}:1 (non-text 3:1)`);
    assert(ratio(t.toneBorder, bg) >= 3, "tone-border-contrast", `${t.tone} tone border ${t.toneBorder} on ${bg} = ${ratio(t.toneBorder, bg).toFixed(2)}:1`);
    assert(ratio(t.closeFg, bg) >= 3, "close-contrast", `close icon ${t.closeFg} on ${bg}`);
    assert(t.closeH >= MIN_TARGET_AA, "close-target-size", `close control ${t.closeH}px < 24`);
    assert(t.closeH >= parseFloat(m.responsive.touchTarget) - 0.5, "touch-claim", `close control ${t.closeH}px < claim ${m.responsive.touchTarget}`, "warn");
    assert(t.closeName.startsWith("Dismiss") && t.closeName.length > 12, "close-named", `the close control is named "${t.closeName}" (it must say which toast it dismisses)`);
    assert(t.toneText.length > 0, "tone-not-colour-only", "the tone (Success / Error / Information) is conveyed by colour and icon only, with no text alternative");
    assert(t.shadow !== "none" || t.border !== "0px", "toast-delineated", "a toast has neither a border nor a shadow");
    if (t.act) assert(ratio(t.act.fg, bg) >= 4.5 && /underline/.test(t.act.deco), "action-link", `toast action ${t.act.fg} on ${bg} (underline: ${t.act.deco})`);
    assert(t.tone === "critical" ? t.inAlert && !t.inStatus : t.inStatus && !t.inAlert, "toast-in-right-region", `a ${t.tone} toast is in the wrong live region (status: ${t.inStatus}, alert: ${t.inAlert})`);
    assert(!t.hasRole, "no-role-on-item", "a toast item carries its own role (the live region around it announces it)");
  }
  assert(await pg.evaluate(() => document.querySelector('[role="status"]')?.getAttribute("data-probe") === "1"), "live-region-persistent", "the live region was re-created when toasts were added (announcements are lost); keep the same element");
  if (d.items.length && m.fixture.props.placement === "fixed") assert(px(d.spb) >= d.regionH, "scroll-padding-bottom", `html scroll-padding-bottom is ${d.spb} but the stack is ${d.regionH.toFixed(0)}px tall: focused controls slide under it`);
  assert((await infiniteAll(pg)) === 0, "no-infinite-at-rest", "an infinite animation runs");
  await focusStart(pg); await pg.keyboard.press("Tab"); await tick(pg, 40);
  await focusRing(ctx, `${R} button:focus-visible`, "close", opaque(d.items[0]!.bg, sb));
  // toasts do not hide a focused control: walk forward from mid-page, nothing focused may sit under the stack
  if (m.fixture.props.placement === "fixed") {
    await scrollTo(pg, 1000); await pg.evaluate(() => (document.querySelector("#s8 button") as HTMLElement).focus());
    let under = 0, where = "";
    for (let i = 0; i < 14; i++) {
      await pg.keyboard.press("Tab"); await tick(pg, 80);
      const o = await pg.evaluate(() => { const a = document.activeElement as HTMLElement; const r = a.getBoundingClientRect(); const reg = document.querySelector("section.ds-tst-001")!.getBoundingClientRect(); return { inside: !!a.closest("section.ds-tst-001"), r: { left: r.left, right: r.right, top: r.top, bottom: r.bottom }, reg: { left: reg.left, right: reg.right, top: reg.top, bottom: reg.bottom }, label: (a.textContent ?? "").trim().slice(0, 14) }; });
      if (!o.inside && overlaps(o.r, o.reg)) { under++; where = `${o.label} at y=${o.r.top.toFixed(0)}..${o.r.bottom.toFixed(0)} under the stack at y=${o.reg.top.toFixed(0)}`; }
    }
    assert(under === 0, "focus-not-covered", `${under} focused control(s) sat under the toast stack (${where})`);
    await scrollTo(pg, 0);
  }

  if (first) {
    const axe = await new AxeBuilder({ page: pg }).include("#stage").analyze(); for (const v of axe.violations) assert(false, `axe:${v.id}`, `${v.help} (toasts showing)`);
    // dismissal: Enter on the close button removes it and focus returns to where the user came from (never lost to <body>)
    await focusStart(pg); await pg.keyboard.press("Tab"); await pg.keyboard.press("Enter"); await tick(pg, 120);
    const k = await pg.evaluate(() => ({ n: document.querySelectorAll(".ds-tst-001__item").length, active: document.activeElement?.tagName + "#" + document.activeElement?.id }));
    assert(k.n === items.length - 1, "close-dismisses", `Enter on the close button left ${k.n} toasts (expected ${items.length - 1})`);
    assert(!/^BODY/.test(k.active), "focus-not-lost", `after dismissing, focus is on ${k.active}; it must land on the next toast or return to the previous control`);
    // timers: critical never dismisses; a normal toast auto-dismisses; hover and focus pause the timer
    await mount({ items: [{ id: "c", title: "Disk full", tone: "critical", durationMs: 200 }] }); await tick(pg, 700);
    assert(await pg.evaluate(() => document.querySelectorAll(".ds-tst-001__item").length === 1), "critical-never-dismisses", "a critical toast disappeared on its own (critical messages must stay until dismissed)");
    await mount({ items: [{ id: "i", title: "Copied", tone: "info", durationMs: 250 }] }); await tick(pg, 120);
    assert(await pg.evaluate(() => document.querySelectorAll(".ds-tst-001__item").length === 1), "visible-before-timeout", "a toast vanished before its timer ran out");
    await tick(pg, 600);
    assert(await pg.evaluate(() => document.querySelectorAll(".ds-tst-001__item").length === 0), "auto-dismiss", "a normal toast never auto-dismissed");
    await mount({ items: [{ id: "h", title: "Hover me", tone: "info", durationMs: 400 }] }); await tick(pg, 60);
    await pg.locator(".ds-tst-001__item").hover(); await tick(pg, 900);
    assert(await pg.evaluate(() => document.querySelectorAll(".ds-tst-001__item").length === 1), "hover-pauses", "the timer kept running while the pointer was over the toast");
    await park(pg); await tick(pg, 900);
    assert(await pg.evaluate(() => document.querySelectorAll(".ds-tst-001__item").length === 0), "resumes-after-hover", "the toast never dismissed after the pointer left");
    await mount({ items: [{ id: "f", title: "Focus me", tone: "info", durationMs: 400 }] }); await tick(pg, 40);
    await focusStart(pg); await pg.keyboard.press("Tab"); await tick(pg, 900);
    assert(await pg.evaluate(() => document.querySelectorAll(".ds-tst-001__item").length === 1), "focus-pauses", "the timer kept running while focus was inside the toast");
    await pg.keyboard.press("Enter"); await tick(pg, 100);
    await mount();
    await pg.setViewportSize(NARROW); await tick(pg, 120);
    const n = await pg.evaluate(() => { const r = document.querySelector("section.ds-tst-001")!.getBoundingClientRect(); return { ok: r.left >= 0 && r.right <= innerWidth, sw: document.documentElement.scrollWidth, iw: innerWidth }; });
    assert(n.ok && n.sw <= n.iw + 1, "reflow-320", `the stack overflows a 320 px viewport (${JSON.stringify(n)})`);
    await pg.setViewportSize(VIEW); await tick(pg, 100);
  }
  void armAnimEvents;
}

export const WAVE_C_COMBOS: Record<string, (ctx: Ctx, first: boolean) => Promise<void>> = { skiplink: skiplinkCombo, breadcrumb: breadcrumbCombo, header: headerCombo, toast: toastCombo };
