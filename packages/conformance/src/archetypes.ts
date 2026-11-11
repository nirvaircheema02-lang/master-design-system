import type { Browser, Page } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { bundleClient } from "./render.ts";
import { PAGE_ARCHETYPES, armAnimEvents, animEvents, buildPage, infiniteCount, px, ratio, resetAnim, settle, visualContrast } from "./helpers.ts";
import type { ConformanceComponent, Target } from "./targets.ts";
import type { Finding, RunOptions } from "./run.ts";

import { MIN_TARGET_AA, axState, focusRing, focusStart, opaque, resetClicks, clicks, rgb, stageBg, type ArchResult, type Ctx, type Mount, animatedProps, undeclaredLayout, settleAll, infiniteAll } from "./arch-common.ts";
import { WAVE_B_COMBOS } from "./archetypes-b.ts";
import { WAVE_C_COMBOS } from "./archetypes-c.ts";
import { WAVE_D_COMBOS } from "./archetypes-d.ts";
import { WAVE_E_COMBOS, textareaChecks } from "./archetypes-e.ts";
import { WAVE_F_COMBOS } from "./archetypes-f.ts";
export type { ArchResult } from "./arch-common.ts";

/* ------------------------------------------------------------------ CARD */
async function cardCombo(ctx: Ctx, first: boolean) {
  const { pg, m, assert, motion, radiusVar } = ctx;
  const sb = await stageBg(pg);
  await pg.mouse.move(0, 0); await focusStart(pg); await settle(pg);
  const rest = await pg.evaluate(([rv]) => {
    const host = document.querySelector("#stage > *") as HTMLElement; const cs = getComputedStyle(host);
    const link = host.querySelector('[class*="__link"]') as HTMLElement | null;
    const img = host.querySelector("img") as HTMLElement | null;
    const reveal = host.querySelector('[class*="__reveal"]') as HTMLElement | null;
    return { radius: cs.borderTopLeftRadius, expected: rv ? cs.getPropertyValue(rv as string).trim() : "", bg: cs.backgroundColor, border: cs.borderTopColor, h: host.getBoundingClientRect().height, w: host.getBoundingClientRect().width,
      text: (host.querySelector('[class*="__text"]') ? getComputedStyle(host.querySelector('[class*="__text"]')!).color : null), meta: (host.querySelector('[class*="__meta"]') ? getComputedStyle(host.querySelector('[class*="__meta"]')!).color : null),
      imgTransform: img ? getComputedStyle(img).transform : null, revealOpacity: reveal ? parseFloat(getComputedStyle(reveal).opacity) : null, hasLink: !!link };
  }, [radiusVar]);
  const hostBg = opaque(rest.bg, sb);
  if (radiusVar) assert(rest.radius === rest.expected, "radius-token", `card radius ${rest.radius} != ${radiusVar} ${rest.expected}`);
  const vc = await visualContrast(pg, '[class*="__link"]');
  assert(vc.ratio >= 4.5, "title-contrast", `title ${vc.fg} on ${vc.bgLeft}/${vc.bgRight} = ${vc.ratio.toFixed(2)}:1 < 4.5`);
  if (rest.text) assert(ratio(rest.text, hostBg) >= 4.5, "text-contrast", `body ${rest.text} on ${hostBg} = ${ratio(rest.text, hostBg).toFixed(2)}:1`);
  if (rest.meta) assert(ratio(rest.meta, hostBg) >= 4.5, "meta-contrast", `meta ${rest.meta} on ${hostBg} = ${ratio(rest.meta, hostBg).toFixed(2)}:1`);
  assert(rest.h >= MIN_TARGET_AA && rest.w >= MIN_TARGET_AA, "target-size", `${rest.w}x${rest.h}px`);
  assert((await infiniteCount(pg)) === 0, "no-infinite-at-rest", "an infinite animation runs while the card is idle");

  // hover: feedback must transition (motion) or be instant-and-static (reduced); zoom and reveal behave
  await resetAnim(pg);
  await pg.locator("#stage > *").first().hover();
  await pg.waitForTimeout(60);
  const events = await animEvents(pg);
  await settle(pg);
  const hov = await pg.evaluate(() => {
    const host = document.querySelector("#stage > *") as HTMLElement; const cs = getComputedStyle(host);
    const img = host.querySelector("img") as HTMLElement | null; const reveal = host.querySelector('[class*="__reveal"]') as HTMLElement | null;
    return { bg: cs.backgroundColor, border: cs.borderTopColor, imgTransform: img ? getComputedStyle(img).transform : null,
      revealOpacity: reveal ? parseFloat(getComputedStyle(reveal).opacity) : null, revealColor: reveal ? getComputedStyle(reveal).color : null, revealBg: reveal ? getComputedStyle(reveal).backgroundColor : null };
  });
  assert(hov.bg !== rest.bg || hov.border !== rest.border, "hover-feedback", "hover changes neither the surface nor the border");
  if (motion === "no-preference") assert(events >= 1, "hover-transition", "hover feedback is instant (no transition)");
  else assert(events === 0, "reduced-motion-animations", `${events} animation(s) start on hover under prefers-reduced-motion`);
  if (m.interaction.modules.includes("image-zoom") && rest.imgTransform !== null) {
    if (motion === "no-preference") assert(hov.imgTransform !== rest.imgTransform && hov.imgTransform !== "none", "zoom-runs", `picture did not scale on hover (${hov.imgTransform})`);
    else assert(hov.imgTransform === rest.imgTransform, "zoom-reduced-motion", "picture still scales under prefers-reduced-motion");
  }
  if (rest.revealOpacity !== null) {
    assert(rest.revealOpacity === 0, "reveal-hidden-at-rest", `reveal panel opacity ${rest.revealOpacity} at rest`);
    assert((hov.revealOpacity ?? 0) === 1, "reveal-on-hover", `reveal panel opacity ${hov.revealOpacity} on hover`);
    if (hov.revealColor && hov.revealBg) assert(ratio(hov.revealColor, opaque(hov.revealBg, hostBg)) >= 4.5, "reveal-contrast", `reveal text ${hov.revealColor} on ${hov.revealBg}`);
  }
  await pg.mouse.move(0, 0); await settle(pg);

  // focus: ring on the CARD (stretched area), reached by Tab
  await focusStart(pg);
  await pg.keyboard.press("Tab"); await pg.waitForTimeout(40);
  const focusedIsLink = await pg.evaluate(() => !!document.activeElement?.matches('[class*="__link"]'));
  assert(focusedIsLink, "link-reachable", "the card link is not the first Tab stop");
  const ring = await pg.evaluate(() => { const h = document.querySelector("#stage > *") as HTMLElement; const c = getComputedStyle(h); const reveal = h.querySelector('[class*="__reveal"]') as HTMLElement | null; return { w: parseFloat(c.outlineWidth), st: c.outlineStyle, col: c.outlineColor, revealOpacity: reveal ? parseFloat(getComputedStyle(reveal).opacity) : null }; });
  assert(ring.st !== "none" && ring.w >= 2, "card-focus-ring", `the card shows no focus ring (outline ${ring.st} ${ring.w}px)`);
  assert(ratio(ring.col, sb) >= 3, "card-focus-contrast", `ring ${ratio(ring.col, sb).toFixed(2)}:1 vs surface < 3`);
  if (ring.revealOpacity !== null) { await settle(pg); const o = await pg.evaluate(() => parseFloat(getComputedStyle(document.querySelector('#stage [class*="__reveal"]')!).opacity)); assert(o === 1, "reveal-on-focus", `reveal opacity ${o} while the link has focus`); }

  if (first) {
    const s = await pg.evaluate(() => {
      const host = document.querySelector("#stage > *") as HTMLElement; const links = Array.from(host.querySelectorAll("a[href]")).filter((a) => !a.closest('[class*="__actions"]'));
      const link = links[0] as HTMLElement | undefined; const heading = link?.closest("h1,h2,h3,h4,h5,h6");
      const r = host.getBoundingClientRect();
      const pts = [[0.12, 0.12], [0.88, 0.12], [0.12, 0.88], [0.88, 0.88], [0.5, 0.5]];
      const covered = pts.filter(([fx, fy]) => { const el = document.elementFromPoint(r.left + r.width * fx!, r.top + r.height * fy!); return !!el && (el === link || link?.contains(el)); }).length;
      return { links: links.length, inHeading: !!heading, headingMatches: !!heading && heading.textContent?.trim() === link?.textContent?.trim(), interactiveInLink: link ? link.querySelectorAll("button,a,input,select,textarea").length : -1, imgAlt: Array.from(host.querySelectorAll("img")).every((i) => i.hasAttribute("alt")), covered, pts: pts.length };
    });
    assert(s.links === 1, "one-primary-link", `${s.links} primary links (need exactly 1; extra controls belong in actions)`);
    assert(s.inHeading && s.headingMatches, "link-in-heading", "the link must be the heading's text (accessible name = title)");
    assert(s.interactiveInLink === 0, "no-nested-interactive", `${s.interactiveInLink} interactive element(s) inside the link`);
    assert(s.imgAlt, "image-alt", "an image has no alt attribute (decorative images use alt=\"\")");
    assert(s.covered === s.pts, "stretched-hit-area", `the link covers ${s.covered}/${s.pts} probe points of the card`);
    const snap = await pg.locator('#stage a[href]').first().ariaSnapshot();
    assert(/link "/.test(snap), "link-name", `link has no accessible name: ${snap.replace(/\s+/g, " ")}`);
    await resetClicks(pg); await focusStart(pg); await pg.keyboard.press("Tab"); await pg.keyboard.press("Enter");
    assert((await clicks(pg)) === 1, "enter-activates", `Enter produced ${await clicks(pg)} click(s)`);
  }
}

/* ------------------------------------------------------------------ FIELD */
async function fieldCombo(ctx: Ctx, first: boolean) {
  const { pg, assert, motion, radiusVar, mount } = ctx;
  const sb = await stageBg(pg);
  await pg.mouse.move(0, 0); await focusStart(pg); await settle(pg);
  const r = await pg.evaluate(([rv]) => {
    const c = document.querySelector('[class*="__control"]') as HTMLInputElement; const cs = getComputedStyle(c);
    const lab = document.querySelector('[class*="__label"]') as HTMLElement; const hint = document.querySelector('[class*="__hint"]') as HTMLElement | null;
    const edge = parseFloat(cs.borderTopWidth) > 0 ? cs.borderTopColor : parseFloat(cs.borderBottomWidth) > 0 ? cs.borderBottomColor : cs.borderTopColor;
    return { radius: cs.borderTopLeftRadius, expected: rv ? cs.getPropertyValue(rv as string).trim() : "", border: edge, bg: cs.backgroundColor, fg: cs.color, h: c.getBoundingClientRect().height, w: c.getBoundingClientRect().width,
      label: getComputedStyle(lab).color, hint: hint ? getComputedStyle(hint).color : null };
  }, [radiusVar]);
  // the underline design has no corners to round (a rounded underline is a curved line), so it is the one design exempt from the radius token
  if (radiusVar && ctx.design !== "underline" && ctx.design !== "pill") assert(r.radius === r.expected, "radius-token", `control radius ${r.radius} != ${radiusVar} ${r.expected}`);
  assert(ratio(r.border, sb) >= 3 && ratio(r.border, opaque(r.bg, sb)) >= 3, "control-border-contrast", `control border ${r.border} is ${ratio(r.border, sb).toFixed(2)}:1 vs surface and ${ratio(r.border, r.bg).toFixed(2)}:1 vs fill (need 3:1, WCAG 1.4.11)`);
  assert(ratio(r.fg, opaque(r.bg, sb)) >= 4.5, "input-text-contrast", `input text ${r.fg} on ${r.bg}`);
  assert(ratio(r.label, sb) >= 4.5, "label-contrast", `label ${r.label} on ${sb} = ${ratio(r.label, sb).toFixed(2)}:1`);
  if (r.hint) assert(ratio(r.hint, sb) >= 4.5, "hint-contrast", `hint ${r.hint} on ${sb} = ${ratio(r.hint, sb).toFixed(2)}:1`);
  assert(r.h >= MIN_TARGET_AA, "target-size", `control height ${r.h}px < 24`);
  assert((await infiniteCount(pg)) === 0, "no-infinite-at-rest", "an infinite animation runs while the field is idle");

  // focus: ring visible, reached by Tab, border transitions (motion) or not at all (reduced)
  await focusStart(pg); await resetAnim(pg);
  await pg.keyboard.press("Tab"); await pg.waitForTimeout(60);
  const ev = await animEvents(pg);
  await focusRing(ctx, '[class*="__control"]', "control", sb);
  const fb = await rgb(pg, '[class*="__control"]', "borderTopColor");
  if (fb !== r.border) { if (motion === "no-preference") assert(ev >= 1, "focus-transition", "the focus colour change is instant (no transition)"); else assert(ev === 0, "reduced-motion-animations", `${ev} animation(s) on focus under prefers-reduced-motion`); }
  await settle(pg);

  if (first) {
    // label association, describedby wiring, dangling references
    const w = await pg.evaluate(() => { const c = document.querySelector('[class*="__control"]') as HTMLInputElement; const lab = c.labels?.[0]; const ids = (c.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean);
      return { labelled: !!lab, labelVisible: !!lab && lab.getBoundingClientRect().height > 8, labelText: lab?.textContent?.trim() ?? "", ids, resolve: ids.every((i) => !!document.getElementById(i)), hintText: ids.map((i) => document.getElementById(i)?.textContent?.trim() ?? ""), placeholderOnly: !lab && !!c.placeholder }; });
    assert(w.labelled && w.labelVisible, "visible-label", "the control has no visible associated <label>");
    assert(!w.placeholderOnly, "no-placeholder-label", "a placeholder is standing in for the label");
    assert(w.resolve, "describedby-resolves", `aria-describedby points at missing ids: ${w.ids.join(" ")}`);
    const role = ctx.m.a11y.role === "combobox" ? "combobox" : "textbox";
    const snap = await pg.locator('[class*="__control"]').ariaSnapshot();
    assert(new RegExp(`${role} "[A-Za-z]`).test(snap), "accessible-name", `control name missing: ${snap.replace(/\s+/g, " ")}`);
    // typing (or choosing) keeps the value
    await focusStart(pg); await pg.keyboard.press("Tab");
    if (role === "combobox") { await pg.keyboard.type("Uni"); assert((await pg.locator('[class*="__control"]').inputValue()) !== "", "value-kept", "typeahead did not choose an option"); }
    else { await pg.keyboard.type("abc"); assert((await pg.locator('[class*="__control"]').inputValue()) === "abc", "value-kept", "typed text was not kept"); }
    const typed = await pg.locator('[class*="__control"]').inputValue();
    if (ctx.design === "floating") assert(await pg.evaluate(() => { const l = document.querySelector('[class*="__label"]') as HTMLElement; return getComputedStyle(l).transform !== "none"; }), "floating-label-floats", "in the floating design the label must move out of the way once the field has a value (it overlaps the text)");
    // error variant: wiring, non-colour cue, contrast
    await mount({ error: "Enter an email address in the correct format" });
    const e = await pg.evaluate(() => { const c = document.querySelector('[class*="__control"]') as HTMLInputElement; const err = document.querySelector('[class*="__error"]') as HTMLElement | null; const ids = (c.getAttribute("aria-describedby") ?? "").split(/\s+/);
      return { invalid: c.getAttribute("aria-invalid"), linked: !!err && ids.includes(err.id), text: err?.textContent?.trim() ?? "", color: err ? getComputedStyle(err).color : "", resolve: ids.filter(Boolean).every((i) => !!document.getElementById(i)), border: parseFloat(getComputedStyle(c).borderTopWidth) > 0 ? getComputedStyle(c).borderTopColor : getComputedStyle(c).borderBottomColor }; });
    assert((await pg.locator('[class*="__control"]').inputValue()) === typed, "value-kept-after-error", "the value the user entered was lost when the field became invalid (P16 form state)");
    assert(e.invalid === "true", "aria-invalid", "an invalid field must set aria-invalid=\"true\"");
    assert(e.linked && e.resolve, "error-described", "the error text is not linked through aria-describedby");
    assert(/^Error:/.test(e.text), "error-prefix", `error text does not start with the hidden "Error:" prefix: "${e.text.slice(0, 40)}"`);
    assert(ratio(e.color, sb) >= 4.5, "error-contrast", `error text ${e.color} on ${sb} = ${ratio(e.color, sb).toFixed(2)}:1`);
    assert(e.border !== r.border && ratio(e.border, sb) >= 3, "error-border", "the invalid border does not change or lacks 3:1 contrast");
    const axe = await new AxeBuilder({ page: pg }).include("#stage").analyze(); for (const v of axe.violations) assert(false, `axe:${v.id}`, `${v.help} (error state)`);
    // clearing the error removes aria-invalid and leaves no dangling aria-describedby reference
    await mount();
    const cleared = await pg.evaluate(() => { const c = document.querySelector('[class*="__control"]') as HTMLElement; const ids = (c.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean); return { invalid: c.getAttribute("aria-invalid"), dangling: ids.filter((i) => !document.getElementById(i)).length }; });
    assert(cleared.invalid === null && cleared.dangling === 0, "error-cleared", `after the error is gone aria-invalid=${cleared.invalid} and ${cleared.dangling} aria-describedby id(s) dangle`);
    if (ctx.m.id === "INP-003") await textareaChecks(ctx);
    // required marker convention and disabled
    await mount({ required: true, marker: "required" });
    assert(/\(required\)/.test(await pg.evaluate(() => document.querySelector('[class*="__label"]')?.textContent ?? "")), "required-marker", "required fields must say so in the visible label");
    await mount({ disabled: true });
    await focusStart(pg); await pg.keyboard.press("Tab");
    assert(!(await pg.evaluate(() => !!document.activeElement?.matches('[class*="__control"]'))), "disabled-not-focusable", "a disabled field received focus");
    assert(parseFloat(await rgb(pg, '[class*="__control"]', "opacity")) < 1, "disabled-affordance", "disabled state is not visually distinct", "warn");
    await mount();
  }
}

/* ------------------------------------------------------------------ SUMMARY */
async function summaryCombo(ctx: Ctx, first: boolean) {
  const { pg, m, assert, radiusVar, mount } = ctx;
  const sb = await stageBg(pg);
  const errors = (m.fixture.props.errors as Array<{ id: string; message: string }>) ?? [];
  const hostSel = "#stage > *";
  const r = await pg.evaluate(([sel, rv]) => { const h = document.querySelector(sel as string) as HTMLElement | null; if (!h) return null; const c = getComputedStyle(h); const link = h.querySelector("a") as HTMLElement | null; const title = h.querySelector("h1,h2,h3,h4") as HTMLElement | null;
    return { radius: c.borderTopLeftRadius, expected: rv ? c.getPropertyValue(rv as string).trim() : "", bg: c.backgroundColor, fg: c.color, link: link ? getComputedStyle(link).color : "", underline: link ? getComputedStyle(link).textDecorationLine : "", title: title ? getComputedStyle(title).color : "", active: document.activeElement === h }; }, [hostSel, radiusVar]);
  assert(!!r, "renders-with-errors", "the summary did not render");
  if (!r) return;
  if (radiusVar) assert(r.radius === r.expected, "radius-token", `summary radius ${r.radius} != ${radiusVar} ${r.expected}`);
  const bg = opaque(r.bg, sb);
  assert(ratio(r.fg, bg) >= 4.5, "text-contrast", `text ${r.fg} on ${bg}`);
  assert(ratio(r.link, bg) >= 4.5, "link-contrast", `link ${r.link} on ${bg} = ${ratio(r.link, bg).toFixed(2)}:1`);
  assert(ratio(r.title, bg) >= 4.5, "title-contrast", `heading ${r.title} on ${bg} = ${ratio(r.title, bg).toFixed(2)}:1`);
  assert(/underline/.test(r.underline), "link-not-colour-only", "links are not underlined (colour alone must not mark a link)");
  assert((await infiniteCount(pg)) === 0, "no-infinite-at-rest", "an infinite animation runs");
  if (first) {
    await mount({ errors: [] }); await mount(); await pg.waitForTimeout(60);
    assert(await pg.evaluate((sel) => document.activeElement === document.querySelector(sel), hostSel), "focus-on-appear", "focus did not move to the summary when it appeared");
    const s = await pg.evaluate(([sel, ids]) => { const h = document.querySelector(sel as string) as HTMLElement; const heading = h.querySelector("h1,h2,h3,h4") as HTMLElement | null; const links = Array.from(h.querySelectorAll("a")) as HTMLAnchorElement[];
      return { labelled: !!document.getElementById(h.getAttribute("aria-labelledby") ?? "") , headingText: heading?.textContent?.trim() ?? "", n: links.length, hrefs: links.map((l) => l.getAttribute("href")), targetsExist: (ids as string[]).every((i) => !!document.getElementById(i)), title: document.title }; }, [hostSel, errors.map((e) => e.id)]);
    assert(s.labelled && s.headingText.length > 0, "named-group", "the summary is not named by its heading");
    assert(s.n === errors.length && JSON.stringify(s.hrefs) === JSON.stringify(errors.map((e) => `#${e.id}`)), "one-link-per-error", `links ${JSON.stringify(s.hrefs)} do not match the errors`);
    assert(s.targetsExist, "link-targets-exist", "a link points at a field that does not exist on the page");
    assert(/^Error: /.test(s.title), "document-title", `document.title is not prefixed with "Error: ": "${s.title}"`);
    // clicking a link moves FOCUS to the field
    const first0 = errors[0]!;
    await pg.locator(`${hostSel} a`).first().click();
    assert(await pg.evaluate((id) => document.activeElement?.id === id, first0.id), "link-focuses-field", "following an error link did not focus the field");
    await mount({ errors: [] });
    assert(await pg.evaluate(() => !document.querySelector("#stage > *")), "empty-renders-nothing", "an empty error list still renders");
    assert(await pg.evaluate(() => !/^Error:/.test(document.title)), "title-restored", "document.title keeps the Error: prefix after the summary is gone");
    await mount();
  }
}

/* ------------------------------------------------------------------ DISCLOSURE */
async function disclosureCombo(ctx: Ctx, first: boolean) {
  const { pg, m, assert, motion, radiusVar, mount } = ctx;
  const sb = await stageBg(pg);
  await pg.mouse.move(0, 0); await focusStart(pg); await settle(pg);
  const r = await pg.evaluate(([rv]) => { const h = document.querySelector("#stage > *") as HTMLElement; const c = getComputedStyle(h); const sm = document.querySelector("summary") as HTMLElement;
    return { radius: c.borderTopLeftRadius, expected: rv ? c.getPropertyValue(rv as string).trim() : "", sumH: sm.getBoundingClientRect().height, bg: c.backgroundColor, fg: c.color }; }, [radiusVar]);
  if (radiusVar) assert(r.radius === r.expected, "radius-token", `accordion radius ${r.radius} != ${radiusVar} ${r.expected}`);
  assert(r.sumH >= MIN_TARGET_AA, "target-size", `summary height ${r.sumH}px < 24`);
  assert(r.sumH >= 44 - 0.5, "touch-claim", `summary height ${r.sumH.toFixed(1)}px < 44`, "warn");
  const vc = await visualContrast(pg, '[class*="__title"]', "details:first-child summary");
  assert(vc.ratio >= 4.5, "title-contrast", `title ${vc.fg} on ${vc.bgLeft}/${vc.bgRight} = ${vc.ratio.toFixed(2)}:1`);
  assert((await infiniteCount(pg)) === 0, "no-infinite-at-rest", "an infinite animation runs while idle");
  void sb; void m;
  if (first) {
    const s = await pg.evaluate(() => { const sums = Array.from(document.querySelectorAll("summary")) as HTMLElement[]; return { n: sums.length, headings: sums.every((x) => !!x.querySelector("h1,h2,h3,h4,h5,h6")), anyOpen: document.querySelectorAll("details[open]").length }; });
    assert(s.n >= 2 && s.headings, "heading-in-summary", "every summary must contain a heading (APG: the trigger lives inside a heading)");
    // keyboard: Tab to the first summary, Enter opens, Space closes
    await focusStart(pg); await pg.keyboard.press("Tab");
    await focusRing(ctx, "summary:focus-visible", "summary", opaque(r.bg, sb));
    await pg.keyboard.press("Enter"); await pg.waitForTimeout(80);
    const title0 = await pg.evaluate(() => document.querySelector("summary h1,summary h2,summary h3,summary h4,summary h5,summary h6")?.textContent?.trim() ?? "");
    const vis = () => pg.evaluate(() => (document.querySelector("details [class*='__content']") as HTMLElement).checkVisibility({ checkVisibilityCSS: true, contentVisibilityAuto: true } as any));
    const opened = await pg.evaluate(() => (document.querySelector("details") as HTMLDetailsElement).open);
    assert(opened && (await vis()), "enter-opens", "Enter on a summary did not open and reveal its panel");
    const axOpen = await axState(pg, title0);
    assert(!!axOpen && axOpen.expanded === true, "expanded-exposed", `the open state is not exposed in the accessibility tree: ${JSON.stringify(axOpen)}`);
    await pg.keyboard.press("Space"); await pg.waitForTimeout(80);
    assert(!(await pg.evaluate(() => (document.querySelector("details") as HTMLDetailsElement).open)), "space-closes", "Space on a summary did not close its panel");
    assert(!(await vis()), "closed-content-hidden", "a closed panel is still visible to users and assistive tech");
    const axClosed = await axState(pg, title0);
    assert(!!axClosed && axClosed.expanded === false, "collapsed-exposed", `the closed state is not exposed in the accessibility tree: ${JSON.stringify(axClosed)}`);
    // chevron animates (motion) / not (reduced)
    await resetAnim(pg); await pg.keyboard.press("Enter"); await pg.waitForTimeout(60);
    const ev = await animEvents(pg);
    if (motion === "no-preference") assert(ev >= 1, "chevron-transition", "toggling starts no animation"); else assert(ev === 0, "reduced-motion-animations", `${ev} animation(s) start on toggle under prefers-reduced-motion`);
    await pg.keyboard.press("Enter");
    // exclusive: opening one closes the others
    await mount({ exclusive: true });
    await pg.evaluate(() => document.querySelectorAll("details").forEach((d) => { (d as HTMLDetailsElement).open = false; }));
    await pg.locator("summary").nth(0).click(); await pg.locator("summary").nth(1).click(); await pg.waitForTimeout(80);
    const ex = await pg.evaluate(() => Array.from(document.querySelectorAll("details")).map((d) => (d as HTMLDetailsElement).open));
    assert(ex.filter(Boolean).length === 1 && ex[1] === true, "exclusive-mode", `exclusive accordion left ${ex.filter(Boolean).length} panels open (${ex.join(",")})`);
    await mount();
  }
}

/* ------------------------------------------------------------------ NAV ITEM */
async function navCombo(ctx: Ctx, first: boolean) {
  const { pg, m, assert, motion, radiusVar, mount, skinIndex } = ctx;
  const sb = await stageBg(pg);
  const snapStyle = () => pg.evaluate(([rv]) => { const a = document.querySelector("#stage > *") as HTMLElement; const c = getComputedStyle(a); const af = getComputedStyle(a, "::after");
    return { radius: c.borderTopLeftRadius, expected: rv ? c.getPropertyValue(rv as string).trim() : "", bg: c.backgroundColor, fg: c.color, weight: c.fontWeight, h: a.getBoundingClientRect().height, w: a.getBoundingClientRect().width, afterTransform: af.content !== "none" ? af.transform : "n/a", afterOpacity: af.content !== "none" ? af.opacity : "n/a" }; }, [radiusVar]);
  await mount(); await pg.mouse.move(0, 0); await focusStart(pg); await settle(pg);
  const rest = await snapStyle();
  if (radiusVar) assert(rest.radius === rest.expected, "radius-token", `nav item radius ${rest.radius} != ${radiusVar} ${rest.expected}`);
  assert(rest.h >= MIN_TARGET_AA && rest.w >= MIN_TARGET_AA, "target-size", `${rest.w}x${rest.h}px`);
  assert(rest.h >= parseFloat(m.responsive.touchTarget) - 0.5, "touch-claim", `height ${rest.h.toFixed(1)}px < claim ${m.responsive.touchTarget}`, "warn");
  const vr = await visualContrast(pg, '[class*="__label"]', "#stage > *");
  assert(vr.ratio >= 4.5, "contrast-rest", `label ${vr.fg} on ${vr.bgLeft}/${vr.bgRight} = ${vr.ratio.toFixed(2)}:1`);
  assert((await infiniteCount(pg)) === 0, "no-infinite-at-rest", "an infinite animation runs while idle");
  // hover
  await resetAnim(pg);
  await pg.locator("#stage > *").hover(); await pg.waitForTimeout(60);
  const ev = await animEvents(pg); await settle(pg);
  const hov = await snapStyle();
  const hv = await visualContrast(pg, '[class*="__label"]', "#stage > *");
  assert(hv.ratio >= 4.5, "contrast-hover", `hover label ${hv.fg} on ${hv.bgLeft}/${hv.bgRight} = ${hv.ratio.toFixed(2)}:1`);
  assert(hov.bg !== rest.bg || hov.fg !== rest.fg || hov.afterTransform !== rest.afterTransform || hov.afterOpacity !== rest.afterOpacity, "hover-feedback", "hover changes nothing visible");
  if (motion === "no-preference") assert(ev >= 1, "hover-transition", "hover feedback is instant (no transition)"); else assert(ev === 0, "reduced-motion-animations", `${ev} animation(s) on hover under prefers-reduced-motion`);
  await pg.mouse.move(0, 0); await settle(pg);
  // current page: persistent, non-hover, not colour-only, readable
  await mount({ current: true }); await settle(pg);
  const cur = await snapStyle();
  const cv = await visualContrast(pg, '[class*="__label"]', "#stage > *");
  assert(cv.ratio >= 4.5, "contrast-current", `current label ${cv.fg} on ${cv.bgLeft}/${cv.bgRight} = ${cv.ratio.toFixed(2)}:1`);
  assert(cur.bg !== rest.bg || cur.afterTransform !== rest.afterTransform || cur.afterOpacity !== rest.afterOpacity || cur.weight !== rest.weight, "current-visible", "the current page has no visual cue without hover");
  assert(cur.weight !== rest.weight || cur.afterTransform !== rest.afterTransform || cur.afterOpacity !== rest.afterOpacity || cur.bg !== rest.bg, "current-not-colour-only", "the current cue is colour-only");
  await mount();
  await focusStart(pg); await pg.keyboard.press("Tab"); await pg.waitForTimeout(40);
  await focusRing(ctx, "#stage > *", "link", sb);
  if (first) {
    const s = await pg.evaluate(() => { const a = document.querySelector("#stage > *") as HTMLAnchorElement; return { tag: a?.tagName, href: a?.getAttribute("href"), current: a?.getAttribute("aria-current") }; });
    assert(s.tag === "A" && !!s.href, "real-link", "a nav item must be an <a href>");
    assert(s.current === null, "no-current-by-default", "aria-current is set on a non-current item");
    const snap = await pg.locator("#stage > *").ariaSnapshot();
    assert(/link "Pricing"/.test(snap), "accessible-name", `link name: ${snap.replace(/\s+/g, " ")}`);
    await mount({ current: true });
    assert((await pg.evaluate(() => document.querySelector("#stage > *")?.getAttribute("aria-current"))) === "page", "aria-current-page", "the current item must set aria-current=\"page\"");
    await mount();
    await resetClicks(pg); await focusStart(pg); await pg.keyboard.press("Tab"); await pg.keyboard.press("Enter"); await pg.keyboard.press("Space");
    assert((await clicks(pg)) === 1, "link-keyboard", `a link activates on Enter only (got ${await clicks(pg)} click(s))`);
  }
  void skinIndex;
}

const COMBOS: Record<string, (ctx: Ctx, first: boolean) => Promise<void>> = { card: cardCombo, field: fieldCombo, summary: summaryCombo, disclosure: disclosureCombo, navitem: navCombo, ...WAVE_B_COMBOS, ...WAVE_C_COMBOS, ...WAVE_D_COMBOS, ...WAVE_E_COMBOS, ...WAVE_F_COMBOS };

/** Run one non-button component through the matrix with its archetype's assertions. */
export async function runArchetype(browser: Browser, target: Target, comp: ConformanceComponent, opts: Required<Pick<RunOptions, "workdir">> & { radii: string[]; modes: Array<"light" | "dark">; motions: Array<"no-preference" | "reduce"> }): Promise<ArchResult> {
  const m = comp.manifest;
  const findings: Finding[] = []; let checks = 0, combos = 0;
  const bundle = await bundleClient(comp.dir, m, target.headlessDir);
  mkdirSync(opts.workdir, { recursive: true });
  const file = join(opts.workdir, `${target.name.replace(/\W+/g, "_")}__${m.id}.html`);
  writeFileSync(file, buildPage(target, comp, bundle));
  const ctx = await browser.newContext({ viewport: { width: 900, height: 600 } });
  const pg = await ctx.newPage();
  pg.setDefaultTimeout(4000); // a stuck overlay must become a finding, not a hang
  const pageErrors: string[] = []; let collecting = true;
  pg.on("pageerror", (e) => collecting && pageErrors.push(String(e)));
  pg.on("console", (c) => collecting && c.type() === "error" && pageErrors.push(c.text()));
  await pg.goto(pathToFileURL(file).href);
  const base = { ...m.fixture.props, children: m.fixture.children };
  const mount: Mount = (props = {}) => pg.evaluate((p) => (window as any).__mount(p), { ...base, ...props });
  if (m.archetype === "card") await pg.evaluate(() => { document.getElementById("stage")!.style.maxWidth = "420px"; }); // cards are not full-page: keep them inside the viewport for pixel sampling
  await mount(); await armAnimEvents(pg);
  // the error summary links to fields that live on the page, outside the component
  const ids = ((m.fixture.props.errors as Array<{ id: string }> | undefined) ?? []).map((e) => e.id);
  if (ids.length) await pg.evaluate((list) => { const d = document.createElement("div"); d.id = "targets"; for (const id of list) { const i = document.createElement("input"); i.id = id; i.setAttribute("aria-label", id); d.appendChild(i); } document.body.appendChild(d); }, ids);

  const radiusVar = m.tokens.find((t) => t.endsWith("-radius"));
  const run = COMBOS[m.archetype]!;
  const baseCombo = { target: target.name, component: m.id };
  let stuck = 0;
  // DESIGNS (manifest props.design): structurally different looks of one component. The first is the default; every other design is run
  // with the default skin only, at the default radius, and gets its deep (first-combo) checks in light mode once.
  const designs: Array<string | undefined> = m.props.design?.length ? m.props.design : [undefined];
  combos: for (let di = 0; di < designs.length; di++) for (let si = 0; si < (di === 0 ? m.skins.length : 1); si++) {
    const design = designs[di];
    const designProps = di === 0 || !design ? {} : { design };
    const skin = m.skins[si]!;
    const skinProps = { ...(si === 0 ? {} : { skin: skin.id }), ...designProps };
    await mount(skinProps);
    const skinRadii = di > 0 ? ["default"] : si === 0 ? opts.radii : opts.radii.filter((r) => r === "default" || r === "9999px");
    for (const mode of opts.modes) {
      let firstInMode = true;
      for (const radius of skinRadii) for (const motion of opts.motions) {
        combos++;
        if (process.env.MASTER_TRACE) console.error(`[trace] ${m.id} ${target.name} ${skin.id}/${radius}/${mode}/${motion}`);
        const combo = `${designs.length > 1 ? (design ?? "default") + "/" : ""}${skin.id}/${radius}/${mode}/${motion}`;
        const assert: Ctx["assert"] = (ok, check, message, level = "error") => { checks++; if (!ok) findings.push({ ...baseCombo, combo, check, level, message }); };
        await pg.emulateMedia({ reducedMotion: motion });
        await pg.evaluate(([mo, r, rv]) => { const st = document.getElementById("stage")!; st.dataset.mode = mo!; if (rv) { if (r === "default") st.style.removeProperty(rv); else st.style.setProperty(rv, r!); } }, [mode, radius, radiusVar] as const);
        await mount(skinProps); await pg.mouse.move(0, 0); await pg.waitForTimeout(30); await settle(pg);
        const c: Ctx = { pg, m, mount: (p = {}) => mount({ ...skinProps, ...p }), radiusVar, assert, combo, motion, skinId: skin.id, skinIndex: si, design: design ?? designs[0] };
        const deepOk = (di === 0 || mode === "light") && firstInMode && radius === "default" && motion === "no-preference";
        try { await run(c, deepOk); }
        catch (e) { checks++; findings.push({ ...baseCombo, combo, check: "harness-exception", level: "error", message: (String(e).split("\n")[0]! + " @ " + ((e as Error).stack?.split("\n")[1]?.trim().replace(/^.*\//, "") ?? "")).slice(0, 260) }); }
        if (PAGE_ARCHETYPES.has(m.archetype)) { await pg.setViewportSize({ width: 900, height: 600 }).catch(() => undefined); await pg.evaluate(() => window.scrollTo(0, 0)).catch(() => undefined); }
        // an overlay left open by a failed step must not cascade into every later combo
        if (m.archetype === "dialog" || m.archetype === "menu" || m.archetype === "navmenu" || m.archetype === "toast" || m.archetype === "drawer" || m.archetype === "popover" || m.archetype === "tooltip" || m.archetype === "megamenu") {
          await pg.keyboard.press("Escape").catch(() => undefined); await pg.waitForTimeout(80); await pg.keyboard.press("Escape").catch(() => undefined); await pg.waitForTimeout(80);
          // an overlay that will not close poisons every later combo (and costs a timeout per step): reload once, give up on the second time
          if (await pg.evaluate(() => !!document.querySelector('[role="dialog"], [role="menu"]')).catch(() => false)) {
            if (++stuck >= 2) { findings.push({ ...baseCombo, combo, check: "overlay-stuck", level: "error", message: "the overlay would not close in two combos; the remaining combos were skipped" }); break combos; }
            await pg.reload().catch(() => undefined); await mount(skinProps).catch(() => undefined); await armAnimEvents(pg).catch(() => undefined);
          }
        }
        if (deepOk) {
          collecting = false;
          // axe reads computed colours: let every running transition finish first, or it measures a half-faded tab
          await pg.evaluate(async () => { await Promise.race([Promise.all(document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished.catch(() => undefined))), new Promise((r) => setTimeout(r, 2000))]); }).catch(() => undefined);
          await pg.waitForTimeout(60);
          const axe = await new AxeBuilder({ page: pg }).include("#stage").analyze();
          collecting = true; checks++;
          for (const v of axe.violations) findings.push({ ...baseCombo, combo, check: `axe:${v.id}`, level: "error", message: `${v.help} (${v.nodes.length} node(s)): ${JSON.stringify(v.nodes[0]?.target)} ${(v.nodes[0]?.any?.[0]?.message ?? "").slice(0, 160)}` });
          firstInMode = false;
        }
      }
    }
  }
  for (const e of pageErrors) findings.push({ ...baseCombo, combo: "page", check: "console-error", level: "error", message: e });
  checks++;
  await ctx.close();
  return { checks, combos, findings };
}
