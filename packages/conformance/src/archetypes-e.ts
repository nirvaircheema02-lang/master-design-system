import type { Page } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { animEvents, ratio, resetAnim } from "./helpers.ts";
import { MIN_TARGET_AA, animatedProps, fresh, focusRing, focusStart, infiniteAll, opaque, settleAll, stageBg, undeclaredLayout, type Ctx } from "./arch-common.ts";
import { NARROW, VIEW, pageRules, park, scrollTo, tick } from "./archetypes-c.ts";

/** Phase 4 Wave D: textarea checks (the field runner calls them), choice (checkbox / radio / switch), stat, pagination, table. */
const axeNote = (v: { help: string; nodes: Array<{ target: unknown; any?: Array<{ message: string }> }> }) => `${v.help}: ${JSON.stringify(v.nodes[0]?.target)} ${v.nodes[0]?.any?.[0]?.message ?? ""}`.slice(0, 300);
const noLayout = (ctx: Ctx, props: string[], what: string) => { const bad = undeclaredLayout(props, ctx.m.interaction.layoutProps); ctx.assert(bad.length === 0, "layout-animation-undeclared", `${what} animates ${bad.join(", ")}`); };

/* ------------------------------------------------------------------ TEXTAREA specifics (called from the field runner) */
export async function textareaChecks(ctx: Ctx) {
  const { pg, assert } = ctx;
  const C = '[class*="__control"]';
  const sb = await stageBg(pg);
  await fresh(pg); await ctx.mount(); await tick(pg, 1300);
  const s0 = await pg.evaluate(() => { const st = document.querySelector('[role="status"]') as HTMLElement | null; const cnt = document.querySelector('[class*="__count"]') as HTMLElement | null; const t = document.querySelector('[class*="__control"]') as HTMLElement;
    return { status: !!st && st.getAttribute("aria-live") === "polite", countHidden: cnt?.getAttribute("aria-hidden") === "true", text: (cnt?.textContent ?? "").trim(), resize: getComputedStyle(t).resize }; });
  assert(s0.status, "status-region-exists-first", "the character-count status region (role=status, aria-live=polite) must exist before the user types");
  assert(s0.countHidden, "count-not-read-twice", "the visible count must be aria-hidden (screen readers get it from the status region)");
  assert(/up to \d+ characters/.test(s0.text), "initial-count", `before typing the count says "${s0.text}"`);
  assert(s0.resize !== "none", "resizable", "the textarea cannot be resized (users who need more room cannot get it)");
  await pg.locator(C).fill(""); await pg.locator(C).pressSequentially("hello", { delay: 40 }); await tick(pg, 120);
  const typing = await pg.evaluate(() => ({ visible: (document.querySelector('[class*="__count"]') as HTMLElement).textContent ?? "", spoken: (document.querySelector('[role="status"]') as HTMLElement).textContent ?? "" }));
  assert(/115 characters remaining/.test(typing.visible), "visible-count-live", `the visible count after 5 characters is "${typing.visible}"`);
  assert(typing.spoken.trim() === "", "not-announced-per-keystroke", `the status region already says "${typing.spoken}" while the user is still typing`);
  await tick(pg, 1300);
  assert(/115 characters remaining/.test(await pg.evaluate(() => (document.querySelector('[role="status"]') as HTMLElement).textContent ?? "")), "announced-when-typing-stops", "the status region never announced the remaining count after typing stopped");
  // over the limit: shown, never blocked
  await pg.locator(C).fill("x".repeat(130)); await tick(pg, 100);
  const over = await pg.evaluate(() => { const t = document.querySelector('[class*="__control"]') as HTMLTextAreaElement; const cnt = document.querySelector('[class*="__count"]') as HTMLElement; return { len: t.value.length, text: cnt.textContent ?? "", color: getComputedStyle(cnt).color, border: getComputedStyle(t).borderTopColor, over: !!document.querySelector("[data-over]") }; });
  assert(over.len === 130, "over-limit-not-blocked", `typing past the limit was blocked (${over.len} of 130 characters kept)`);
  assert(/10 characters too many/.test(over.text) && over.over, "over-limit-shown", `over the limit the count says "${over.text}"`);
  assert(ratio(over.color, sb) >= 4.5, "over-limit-contrast", `over-limit count ${over.color} on ${sb} = ${ratio(over.color, sb).toFixed(2)}:1`);
  assert(ratio(over.border, sb) >= 3, "over-limit-border", "the over-limit border does not reach 3:1");
  await tick(pg, 1300);
  assert(/too many/.test(await pg.evaluate(() => (document.querySelector('[role="status"]') as HTMLElement).textContent ?? "")), "over-limit-announced", "going over the limit was never announced");
  await pg.locator(C).fill(""); await tick(pg, 100);
}

/* ------------------------------------------------------------------ CHOICE (checkbox / radio / switch) */
async function choiceCombo(ctx: Ctx, first: boolean) {
  const { pg, m, assert, motion } = ctx;
  const mount = async (p: Record<string, unknown> = {}) => { await fresh(pg); await ctx.mount(p); };
  const keepMount = ctx.mount;
  const sb = await stageBg(pg);
  const role = m.a11y.role; // checkbox | radiogroup | switch
  const isSwitch = role === "switch", isRadio = role === "radiogroup";
  const IN = isSwitch ? 'input[type="checkbox"]' : isRadio ? 'input[type="radio"]' : 'input[type="checkbox"]';
  await mount(); await scrollTo(pg, 0); await park(pg); await focusStart(pg); await settleAll(pg);
  const r = await pg.evaluate(([sel, sw]) => {
    const first = document.querySelector(sel as string) as HTMLInputElement; const vis = first.nextElementSibling as HTMLElement; const vc = getComputedStyle(vis); const label = document.querySelector('[class*="__label"]') as HTMLElement; const hint = document.querySelector('[class*="__hint"]') as HTMLElement | null; const legend = document.querySelector("legend") as HTMLElement | null;
    const ir = first.getBoundingClientRect(), vr = vis.getBoundingClientRect(); const row = first.closest("label") as HTMLElement; const hit = document.elementFromPoint(vr.left + vr.width / 2, vr.top + vr.height / 2);
    return { label: getComputedStyle(label).color, hint: hint ? getComputedStyle(hint).color : null, legend: legend ? getComputedStyle(legend).color : null, border: vc.borderTopColor, bg: vc.backgroundColor, rowH: row.getBoundingClientRect().height, overlaps: Math.abs(ir.left - vr.left) < 2 && ir.width >= vr.width - 1 && ir.height >= vr.height - 1, hitsInput: hit === first, boxW: vr.width, boxH: vr.height, sw: !!sw };
  }, [IN, isSwitch]);
  assert(ratio(r.label, sb) >= 4.5, "label-contrast", `label ${r.label} on ${sb} = ${ratio(r.label, sb).toFixed(2)}:1`);
  if (r.hint) assert(ratio(r.hint, sb) >= 4.5, "hint-contrast", `hint ${r.hint} on ${sb} = ${ratio(r.hint, sb).toFixed(2)}:1`);
  if (r.legend) assert(ratio(r.legend, sb) >= 4.5, "legend-contrast", `legend ${r.legend} on ${sb}`);
  if (isSwitch) assert(ratio(r.bg, sb) >= 3, "track-contrast", `the OFF track ${r.bg} is ${ratio(r.bg, sb).toFixed(2)}:1 against the page (non-text 3:1)`);
  else assert(ratio(r.border, sb) >= 3, "control-border-contrast", `the control border ${r.border} is ${ratio(r.border, sb).toFixed(2)}:1 against the page (non-text 3:1, WCAG 1.4.11)`);
  assert(r.rowH >= MIN_TARGET_AA, "target-size", `option row ${r.rowH}px < 24`);
  assert(r.rowH >= parseFloat(m.responsive.touchTarget) - 0.5, "touch-claim", `option row ${r.rowH.toFixed(1)}px < claim ${m.responsive.touchTarget}`, "warn");
  assert(r.overlaps && r.hitsInput, "native-input-on-top", "the real <input> does not sit on top of its visual control (clicks and focus must reach the native element)");
  assert((await infiniteAll(pg)) === 0, "no-infinite-at-rest", "an infinite animation runs while idle");

  // checking: the visual state changes, with a transition under motion and none under reduced motion; never colour alone
  const state = () => pg.evaluate(([sel]) => { const el = document.querySelector(`${sel}:not(:checked):not(:disabled)`) as HTMLInputElement | null; const t = el ?? (document.querySelector(sel as string) as HTMLInputElement); const vis = t.nextElementSibling as HTMLElement; const vc = getComputedStyle(vis); const svg = vis.querySelector("svg"); const thumb = vis.querySelector('[class*="__thumb"]') as HTMLElement | null; const after = getComputedStyle(vis, "::after");
    return { checked: t.checked, bg: vc.backgroundColor, mark: svg ? getComputedStyle(svg).opacity : after.content !== "none" ? after.opacity : "n/a", thumb: thumb ? getComputedStyle(thumb).transform : "n/a", thumbBg: thumb ? getComputedStyle(thumb).backgroundColor : "n/a", stroke: svg ? getComputedStyle(svg).stroke : "", dotBg: after.content !== "none" ? after.backgroundColor : "" }; }, [IN]);
  const before = await state();
  await resetAnim(pg);
  await pg.locator(`${IN}:not(:checked):not(:disabled)`).first().click({ force: false }); await pg.waitForTimeout(50);
  const ev = await animEvents(pg); const props = await animatedProps(pg);
  if (motion === "no-preference") assert(ev >= 1, "check-transition", "checking it is instant (no transition)"); else assert(ev === 0, "reduced-motion-animations", `${ev} animation(s) on check under prefers-reduced-motion`);
  noLayout(ctx, props, "the control"); await settleAll(pg);
  const after = await pg.evaluate(([sel]) => { const t = document.querySelector(`${sel}:checked`) as HTMLInputElement; const vis = t.nextElementSibling as HTMLElement; const vc = getComputedStyle(vis); const svg = vis.querySelector("svg"); const thumb = vis.querySelector('[class*="__thumb"]') as HTMLElement | null; const after = getComputedStyle(vis, "::after");
    return { bg: vc.backgroundColor, mark: svg ? getComputedStyle(svg).opacity : after.content !== "none" ? after.opacity : "n/a", stroke: svg ? getComputedStyle(svg).stroke : "", dot: after.content !== "none" ? after.backgroundColor : "", thumb: thumb ? getComputedStyle(thumb).transform : "n/a", thumbBg: thumb ? getComputedStyle(thumb).backgroundColor : "n/a", track: vc.backgroundColor }; }, [IN]);
  assert(after.bg !== before.bg || after.mark !== before.mark || after.thumb !== before.thumb, "checked-visible", "checking it changes nothing visible");
  if (isSwitch) {
    assert(after.thumb !== before.thumb, "state-not-colour-only", "the switch state is shown by colour alone: the thumb does not move");
    assert(ratio(after.thumbBg, after.track) >= 3, "thumb-on-contrast", `the thumb ${after.thumbBg} on the ON track ${after.track} = ${ratio(after.thumbBg, after.track).toFixed(2)}:1`);
    assert(ratio(before.thumbBg, before.bg) >= 3, "thumb-off-contrast", `the thumb ${before.thumbBg} on the OFF track ${before.bg} = ${ratio(before.thumbBg, before.bg).toFixed(2)}:1`);
  } else {
    assert(after.mark !== before.mark, "state-not-colour-only", "the checked state is shown by colour alone: no mark appears");
    const mk = after.stroke || after.dot;
    if (mk) assert(ratio(mk, after.bg) >= 3, "mark-contrast", `the mark ${mk} on the checked fill ${after.bg} = ${ratio(mk, after.bg).toFixed(2)}:1`);
  }
  await park(pg); await mount(); await settleAll(pg);
  await focusStart(pg); await pg.keyboard.press("Tab"); await tick(pg, 40);
  const ring = await pg.evaluate(([sel]) => { const t = document.querySelector(`${sel}:focus-visible`) as HTMLElement | null; if (!t) return null; const vis = t.nextElementSibling as HTMLElement; const c = getComputedStyle(vis); return { w: parseFloat(c.outlineWidth), st: c.outlineStyle, col: c.outlineColor }; }, [IN]);
  assert(!!ring, "focus-reachable", "Tab did not reach a control");
  if (ring) { assert(ring.st !== "none" && ring.w >= 2, "focus-visible", `focus ring ${ring.st} ${ring.w}px (need >= 2px)`); assert(ratio(ring.col, sb) >= 3, "focus-contrast", `focus ring ${ring.col} on ${sb} = ${ratio(ring.col, sb).toFixed(2)}:1`); }

  if (first) {
    const s = await pg.evaluate(([sel, radio]) => { const inputs = Array.from(document.querySelectorAll(sel as string)) as HTMLInputElement[]; const fs = document.querySelector("fieldset");
      return { n: inputs.length, labelled: inputs.every((i) => i.labels?.length === 1 && (i.labels[0]!.textContent ?? "").trim().length > 0), fieldset: !!fs, legend: !!fs?.querySelector(":scope > legend") && (fs!.querySelector("legend")!.textContent ?? "").trim().length > 0, names: new Set(inputs.map((i) => i.name)).size, disabled: inputs.filter((i) => i.disabled).length, describedOk: !fs || (fs.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean).every((id) => !!document.getElementById(id)), radio }; }, [IN, isRadio]);
    assert(s.n >= 1 && s.labelled, "labelled", "every control needs exactly one visible associated <label>");
    if (!isSwitch) { assert(s.fieldset && s.legend, "fieldset-legend", "a group of choices must be a <fieldset> with a visible <legend> (the question)"); assert(s.describedOk, "describedby-resolves", "the fieldset's aria-describedby points at a missing id"); }
    if (isRadio) assert(s.names === 1, "radios-share-a-name", `the radios use ${s.names} different names (they must form one group)`);
    const snap = await pg.locator("#slot, #stage").first().ariaSnapshot().catch(() => "");
    if (isSwitch) assert(await pg.evaluate((sel) => document.querySelector(sel as string)?.getAttribute("role") === "switch", IN) && /switch "[A-Za-z]/.test(snap), "role-switch", `the control is not exposed as a switch: ${snap.replace(/\s+/g, " ").slice(0, 120)}`);
    else assert(new RegExp(isRadio ? "radiogroup|radio \"" : "group|checkbox \"").test(snap), "group-role", `choices are not exposed as a group: ${snap.replace(/\s+/g, " ").slice(0, 120)}`);
    // keyboard
    await mount(); await focusStart(pg); await pg.keyboard.press("Tab"); await tick(pg, 30);
    if (isRadio) {
      const firstChecked = await pg.evaluate(() => (document.activeElement as HTMLInputElement).checked);
      await pg.keyboard.press("ArrowDown"); await tick(pg, 60);
      const a = await pg.evaluate(() => ({ checked: (document.activeElement as HTMLInputElement).checked, value: (document.activeElement as HTMLInputElement).value }));
      assert(firstChecked && a.checked, "arrows-move-and-select", "ArrowDown did not move focus to the next radio and select it");
      await pg.keyboard.press("Tab"); await tick(pg, 40);
      assert(await pg.evaluate(() => !(document.activeElement as HTMLInputElement | null)?.matches?.('input[type="radio"]')), "one-tab-stop", "Tab moved to another radio; the group must be a single Tab stop");
      assert(await pg.evaluate(() => Array.from(document.querySelectorAll('input[type="radio"]:disabled')).every((r) => r !== document.activeElement)), "disabled-skipped", "a disabled radio received focus");
    } else {
      const was = await pg.evaluate(() => (document.activeElement as HTMLInputElement).checked);
      await pg.keyboard.press("Space"); await tick(pg, 60);
      assert((await pg.evaluate(() => (document.activeElement as HTMLInputElement).checked)) === !was, "space-toggles", "Space did not toggle the control");
      await pg.keyboard.press("Enter"); await tick(pg, 40);
      assert((await pg.evaluate(() => (document.activeElement as HTMLInputElement).checked)) === !was, "enter-does-not-toggle", "Enter toggled the control (only Space does)");
      if (isSwitch) {
        const names = await pg.evaluate(() => { const l = document.querySelector('[class*="__label"]') as HTMLElement; const a = l.textContent; (document.activeElement as HTMLInputElement).click(); return [a, l.textContent]; });
        assert(names[0] === names[1], "label-constant", `the switch label changed with its state ("${names[0]}" -> "${names[1]}")`);
      }
    }
    // clicking the LABEL text toggles it (the whole row is the target)
    await mount(); await settleAll(pg);
    if (!isRadio) { const before2 = await pg.evaluate(([sel]) => (document.querySelector(sel as string) as HTMLInputElement).checked, [IN]); await pg.locator('[class*="__label"]').first().click(); await tick(pg, 40); assert((await pg.evaluate(([sel]) => (document.querySelector(sel as string) as HTMLInputElement).checked, [IN])) !== before2, "label-click-toggles", "clicking the label text did not toggle the control"); }
    // error state: wiring, text (not colour only), border contrast; values preserved across the error (P16)
    await pg.locator(`${IN}:not(:disabled)`).last().check().catch(() => undefined);
    const checkedBefore = await pg.evaluate(([sel]) => Array.from(document.querySelectorAll(sel as string)).map((i) => (i as HTMLInputElement).checked).join(), [IN]);
    await keepMount({ error: "Select at least one option" }); await tick(pg, 60);
    const e = await pg.evaluate(([sel]) => { const err = document.querySelector('[class*="__error"]') as HTMLElement | null; const root = (document.querySelector("fieldset") ?? document.querySelector(sel as string)!.closest("div")) as HTMLElement; const ids = ((document.querySelector("fieldset") ?? document.querySelector(sel as string))!.getAttribute("aria-describedby") ?? "").split(/\s+/); return { text: err?.textContent ?? "", linked: !!err && ids.includes(err.id), color: err ? getComputedStyle(err).color : "", kept: Array.from(document.querySelectorAll(sel as string)).map((i) => (i as HTMLInputElement).checked).join(), invalid: root.hasAttribute("data-invalid") }; }, [IN]);
    assert(/^Error:/.test(e.text.trim()) && e.linked, "error-described", `the error is not text prefixed "Error:" and linked by aria-describedby ("${e.text.trim().slice(0, 40)}")`);
    assert(ratio(e.color, sb) >= 4.5, "error-contrast", `error text ${e.color} on ${sb} = ${ratio(e.color, sb).toFixed(2)}:1`);
    assert(e.kept === checkedBefore, "values-kept-after-error", `choices changed when the error appeared (${checkedBefore} -> ${e.kept}) (P16 form state)`);
    assert(e.invalid, "invalid-styled", "the group shows no invalid styling");
    const axe = await new AxeBuilder({ page: pg }).include("#stage").analyze(); for (const v of axe.violations) assert(false, `axe:${v.id}`, `${axeNote(v)} (error state)`);
    await mount();
    // long labels wrap at 320 px
    const long = "A very long choice label that goes on and on to prove that the row wraps instead of forcing a horizontal scroll at narrow widths";
    if (isSwitch) await mount({ label: long }); else await mount({ options: (m.fixture.props.options as Array<Record<string, unknown>>).map((o, i) => (i === 0 ? { ...o, label: long } : o)) });
    await pageRules(ctx, m.id); await mount();
  }
}

/* ------------------------------------------------------------------ STAT CARD */
async function statCombo(ctx: Ctx, first: boolean) {
  const { pg, m, assert, radiusVar, mount } = ctx;
  const sb = await stageBg(pg);
  await scrollTo(pg, 0); await park(pg); await settleAll(pg);
  const read = () => pg.evaluate(([rv]) => { const dl = document.querySelector("#slot > dl") as HTMLElement; const c = getComputedStyle(dl); const g = (s: string) => { const e = dl.querySelector(s) as HTMLElement | null; return e ? getComputedStyle(e).color : null; }; const arrow = dl.querySelector("svg") as SVGElement | null;
    return { radius: c.borderTopLeftRadius, expected: rv ? c.getPropertyValue(rv as string).trim() : "", bg: c.backgroundColor, label: g('[class*="__label"]'), value: g('[class*="__value"]'), delta: g('[class*="__delta"]'), versus: g('[class*="__versus"]'), desc: g('[class*="__description"]'), arrow: arrow ? getComputedStyle(arrow).stroke : null, path: arrow?.querySelector("path")?.getAttribute("d") ?? "", words: (dl.querySelector('[class*="__vh"]')?.textContent ?? "").trim(),
      tab: dl.querySelectorAll("a, button, input, [tabindex]").length, nums: getComputedStyle(dl.querySelector('[class*="__value"]')!).fontVariantNumeric, struct: dl.tagName === "DL" && dl.querySelector(":scope > dt") !== null && dl.querySelectorAll(":scope > dd").length >= 1, labelText: (dl.querySelector("dt")?.textContent ?? "").trim() }; }, [radiusVar]);
  const r = await read(); const bg = opaque(r.bg, sb);
  if (radiusVar) assert(r.radius === r.expected, "radius-token", `card radius ${r.radius} != ${radiusVar} ${r.expected}`);
  for (const [name, c] of [["label", r.label], ["value", r.value], ["delta", r.delta], ["versus", r.versus], ["description", r.desc]] as const) if (c) assert(ratio(c, bg) >= 4.5, `${name}-contrast`, `${name} ${c} on ${bg} = ${ratio(c, bg).toFixed(2)}:1`);
  if (r.arrow) assert(ratio(r.arrow, bg) >= 3, "arrow-contrast", `arrow ${r.arrow} on ${bg}`);
  assert(r.struct && r.labelText === (m.fixture.props.label as string), "label-tied-to-value", "the figure must be a description list: <dt> label with its <dd> value");
  assert(r.tab === 0, "not-interactive", `${r.tab} interactive element(s) inside a static stat card`);
  assert(/tabular/.test(r.nums), "tabular-figures", "the value does not use tabular figures (numbers will jitter as they change)");
  assert((await infiniteAll(pg)) === 0, "no-infinite-at-rest", "an infinite animation runs");
  // every intent keeps its contrast; direction is conveyed by arrow shape AND words, never colour alone
  const seen = new Map<string, { path: string; words: string }>();
  for (const [direction, intent] of [["up", "positive"], ["down", "negative"], ["down", "positive"], ["up", "negative"], ["flat", "neutral"]] as const) {
    await mount({ delta: { text: "3.2%", direction, intent } });
    const d = await read(); const dbg = opaque(d.bg, sb);
    assert(!!d.delta && ratio(d.delta, dbg) >= 4.5, "delta-contrast", `${direction}/${intent} change text ${d.delta} on ${dbg} = ${d.delta ? ratio(d.delta, dbg).toFixed(2) : "?"}:1`);
    seen.set(direction, { path: d.path, words: d.words });
  }
  assert(new Set([...seen.values()].map((v) => v.path)).size === 3, "direction-arrow-differs", "up, down and flat share the same arrow shape");
  assert(new Set([...seen.values()].map((v) => v.words)).size === 3 && [...seen.values()].every((v) => v.words.length > 3), "direction-in-words", `the direction is not available as text for screen readers (${JSON.stringify([...seen.values()].map((v) => v.words))})`);
  await mount({ delta: undefined });
  assert(await pg.evaluate(() => !document.querySelector('#slot > dl [class*="__delta"]')), "no-delta-renders-nothing", "a card without a change still renders an empty change row");
  await mount();
  if (first) {
    const axe = await new AxeBuilder({ page: pg }).include("#stage").analyze(); for (const v of axe.violations) assert(false, `axe:${v.id}`, axeNote(v));
    await mount({ value: "$1,234,567,890.12 across all regions and quarters" });
    await pageRules(ctx, m.id); await mount();
  }
}

/* ------------------------------------------------------------------ PAGINATION */
async function paginationCombo(ctx: Ctx, first: boolean) {
  const { pg, m, assert, radiusVar, mount, motion } = ctx;
  const sb = await stageBg(pg);
  const N = "nav.ds-nav-010";
  await scrollTo(pg, 0); await park(pg); await focusStart(pg); await settleAll(pg);
  const r = await pg.evaluate(([rv]) => { const nav = document.querySelector("nav.ds-nav-010") as HTMLElement; const links = Array.from(nav.querySelectorAll("a")) as HTMLElement[]; const plain = links.find((l) => !l.hasAttribute("aria-current") && l.hasAttribute("aria-label")) as HTMLElement; const cur = (nav.querySelector('[aria-current="page"]') ?? plain) as HTMLElement; const off = nav.querySelector('[class*="__off"]') as HTMLElement | null; const gap = nav.querySelector('[class*="__gap"]') as HTMLElement | null; const pc = getComputedStyle(plain), cc = getComputedStyle(cur);
    return { radius: pc.borderTopLeftRadius, expected: rv ? getComputedStyle(nav).getPropertyValue(rv as string).trim() : "", plain: pc.color, plainBg: pc.backgroundColor, plainH: plain.getBoundingClientRect().height, plainW: plain.getBoundingClientRect().width, cur: { fg: cc.color, bg: cc.backgroundColor, bw: cc.borderTopColor }, off: off ? getComputedStyle(off).color : null, gap: gap ? getComputedStyle(gap).color : null, name: nav.getAttribute("aria-label") ?? "", border: pc.borderTopColor }; }, [radiusVar]);
  const bgc = opaque(r.plainBg, sb);
  if (radiusVar && ctx.design !== "pill") assert(r.radius === r.expected, "radius-token", `link radius ${r.radius} != ${radiusVar} ${r.expected}`);
  assert(ratio(r.plain, bgc) >= 4.5, "link-contrast", `page link ${r.plain} on ${bgc} = ${ratio(r.plain, bgc).toFixed(2)}:1`);
  assert(ratio(r.cur.fg, opaque(r.cur.bg, sb)) >= 4.5, "current-contrast", `current page ${r.cur.fg} on ${r.cur.bg} = ${ratio(r.cur.fg, opaque(r.cur.bg, sb)).toFixed(2)}:1`);
  assert(r.cur.bg !== r.plainBg, "current-not-colour-only", "the current page is not marked by a filled shape (only aria-current)");
  if (r.off) assert(ratio(r.off, sb) >= 4.5, "unavailable-contrast", `unavailable Previous/Next ${r.off} on ${sb}`, "warn");
  if (r.gap) assert(ratio(r.gap, sb) >= 4.5, "ellipsis-contrast", `ellipsis ${r.gap} on ${sb} = ${ratio(r.gap, sb).toFixed(2)}:1`);
  assert(r.plainH >= MIN_TARGET_AA && r.plainW >= MIN_TARGET_AA, "target-size", `page link ${r.plainW}x${r.plainH}px < 24`);
  assert(r.plainH >= parseFloat(m.responsive.touchTarget) - 0.5, "touch-claim", `page link ${r.plainH.toFixed(1)}px < claim ${m.responsive.touchTarget}`, "warn");
  assert((await infiniteAll(pg)) === 0, "no-infinite-at-rest", "an infinite animation runs");
  // hover + focus
  const lnk = `${N} a[aria-label]:not([aria-current])`;
  await resetAnim(pg); await pg.locator(lnk).first().hover(); await pg.waitForTimeout(60);
  const ev = await animEvents(pg); await settleAll(pg);
  const hv = await pg.evaluate((sel) => { const a = document.querySelector(sel) as HTMLElement; const c = getComputedStyle(a); return { fg: c.color, bg: c.backgroundColor }; }, lnk);
  assert(hv.bg !== r.plainBg || hv.fg !== r.plain, "hover-feedback", "hovering a page link changes nothing");
  assert(ratio(hv.fg, opaque(hv.bg, sb)) >= 4.5, "contrast-hover", `hovered ${hv.fg} on ${hv.bg}`);
  if (motion === "no-preference") assert(ev >= 1, "hover-transition", "hover feedback is instant"); else assert(ev === 0, "reduced-motion-animations", `${ev} animation(s) on hover under prefers-reduced-motion`);
  await park(pg); await settleAll(pg);
  await focusStart(pg); await pg.keyboard.press("Tab"); await tick(pg, 40);
  await focusRing(ctx, `${N} a:focus-visible`, "link", sb);

  if (first) {
    const s = await pg.evaluate(() => { const nav = document.querySelector("nav.ds-nav-010") as HTMLElement; const items = Array.from(nav.querySelectorAll(":scope > ul > li")) as HTMLElement[]; return { listOk: !!nav.querySelector(":scope > ul"), seq: items.map((li) => (li.textContent ?? "").replace(/\s+/g, " ").trim()), gapsHidden: Array.from(nav.querySelectorAll('[class*="__gap"]')).every((g) => g.getAttribute("aria-hidden") === "true" && !g.querySelector("a")), labels: Array.from(nav.querySelectorAll("a[aria-label]")).map((a) => a.getAttribute("aria-label")), hrefs: Array.from(nav.querySelectorAll("a[aria-label]")).map((a) => a.getAttribute("href")), curN: nav.querySelectorAll('[aria-current="page"]').length, rel: [nav.querySelector('a[rel="prev"]') !== null, nav.querySelector('a[rel="next"]') !== null] }; });
    assert(s.listOk, "list-structure", "the pages must be a <ul> inside the nav");
    assert(JSON.stringify(s.seq) === JSON.stringify(["Previous page", "1", "…", "4", "5", "6", "…", "20", "Next page"]), "window", `page 5 of 20 shows ${JSON.stringify(s.seq)} (expected first, gap, neighbours, gap, last)`);
    assert(s.gapsHidden, "ellipsis-not-a-link", "an ellipsis is exposed to assistive tech or is a link");
    assert(s.labels.every((l) => /^Page \d+$/.test(l ?? "")) && s.curN === 1, "page-names", `page links are named ${JSON.stringify(s.labels)} with ${s.curN} current`);
    assert(s.hrefs.includes("#page-4") && s.hrefs.includes("#page-20"), "href-pattern", `hrefs ${JSON.stringify(s.hrefs)} do not follow hrefPattern`);
    assert(!!s.rel[0] && !!s.rel[1], "rel-prev-next", "Previous/Next links lack rel=prev / rel=next");
    // edges: first and last page render an unavailable step as plain text, not a dead link
    await mount({ page: 1 });
    const e1 = await pg.evaluate(() => { const nav = document.querySelector("nav.ds-nav-010") as HTMLElement; const li = nav.querySelector(":scope > ul > li") as HTMLElement; return { prevIsLink: !!li.querySelector("a"), text: (li.textContent ?? "").trim() }; });
    assert(!e1.prevIsLink && /Previous/.test(e1.text), "first-page-no-prev-link", "on page 1 Previous is a link (it should be plain text)");
    await mount({ page: 20 });
    assert(await pg.evaluate(() => { const lis = document.querySelectorAll("nav.ds-nav-010 > ul > li"); return !lis[lis.length - 1]!.querySelector("a"); }), "last-page-no-next-link", "on the last page Next is a link (it should be plain text)");
    await mount({ page: 2, pageCount: 3 });
    assert(await pg.evaluate(() => document.querySelectorAll('nav.ds-nav-010 [class*="__gap"]').length === 0), "no-needless-gaps", "a 3-page list shows an ellipsis");
    await mount();
    // keyboard follows a link
    await pg.evaluate(() => history.replaceState(null, "", location.pathname));
    await focusStart(pg); await pg.keyboard.press("Tab"); await pg.keyboard.press("Tab"); await pg.keyboard.press("Enter"); await tick(pg, 80);
    assert((await pg.evaluate(() => location.hash)).startsWith("#page-"), "link-follows", "Enter on a page link did not navigate");
    await pg.evaluate(() => { history.replaceState(null, "", location.pathname); });
    const axe = await new AxeBuilder({ page: pg }).include("#stage").analyze(); for (const v of axe.violations) assert(false, `axe:${v.id}`, axeNote(v));
    await pageRules(ctx, m.id);
  }
}

/* ------------------------------------------------------------------ DATA TABLE */
async function tableCombo(ctx: Ctx, first: boolean) {
  const { pg, m, assert, radiusVar, mount, motion, skinId } = ctx;
  const sb = await stageBg(pg);
  const SORT = ".ds-tbl-001__sort";
  await fresh(pg); await mount();
  await scrollTo(pg, 0); await park(pg); await focusStart(pg); await settleAll(pg);
  const r = await pg.evaluate(([rv]) => { const root = document.querySelector("#slot > .ds-tbl-001") as HTMLElement; const sc = root.querySelector('[class*="__scroll"]') as HTMLElement; const t = root.querySelector("table") as HTMLElement; const th = t.querySelector("thead th") as HTMLElement; const td = t.querySelector("tbody td") as HTMLElement; const num = t.querySelector("tbody td[data-numeric]") as HTMLElement; const cap = (t.querySelector("caption") ?? t) as HTMLElement; const rows = Array.from(t.querySelectorAll("tbody tr")) as HTMLElement[];
    const bgOf = (e: Element) => getComputedStyle(e).backgroundColor; const rowTd = (i: number) => rows[i]!.querySelector("td") as HTMLElement;
    return { radius: getComputedStyle(sc).borderTopLeftRadius, expected: rv ? getComputedStyle(root).getPropertyValue(rv as string).trim() : "", tableBg: getComputedStyle(sc).backgroundColor, th: getComputedStyle(th).color, thBg: bgOf(th), td: getComputedStyle(td).color, tdBg: getComputedStyle(td).backgroundColor, num: { align: getComputedStyle(num).textAlign, nums: getComputedStyle(num).fontVariantNumeric }, cap: getComputedStyle(cap).color, evenBg: bgOf(rows[1]!), oddBg: bgOf(rows[0]!), evenFg: getComputedStyle(rowTd(1)).color,
      capText: (cap.textContent ?? "").trim(), scope: Array.from(t.querySelectorAll("thead th")).every((h) => h.getAttribute("scope") === "col"), rowHeads: t.querySelectorAll('tbody th[scope="row"]').length, nRows: rows.length, region: sc.getAttribute("role") === "region" && !!document.getElementById(sc.getAttribute("aria-labelledby") ?? "") && sc.tabIndex === 0 }; }, [radiusVar]);
  const bg = opaque(r.tableBg, sb);
  if (radiusVar) assert(r.radius === r.expected, "radius-token", `table radius ${r.radius} != ${radiusVar} ${r.expected}`);
  const cellBg = opaque(r.tdBg, bg);
  assert(ratio(r.td, cellBg) >= 4.5, "cell-contrast", `cell text ${r.td} on ${cellBg} = ${ratio(r.td, cellBg).toFixed(2)}:1`);
  assert(ratio(r.th, opaque(r.thBg, bg)) >= 4.5, "header-contrast", `header ${r.th} on ${r.thBg} = ${ratio(r.th, opaque(r.thBg, bg)).toFixed(2)}:1`);
  assert(ratio(r.cap, bg) >= 4.5, "caption-contrast", `caption ${r.cap} on ${bg} = ${ratio(r.cap, bg).toFixed(2)}:1`);
  assert(ratio(r.evenFg, opaque(r.evenBg, bg)) >= 4.5, "striped-row-contrast", `text ${r.evenFg} on the even row ${r.evenBg}`);
  if (skinId === "striped") assert(r.evenBg !== r.oddBg, "stripes-visible", "the striped skin shows no row stripes");
  assert(r.capText.length > 3, "caption", "the table has no caption (it names the table)");
  assert(r.scope && r.rowHeads === r.nRows, "header-scopes", `column headers need scope="col" and every row a th scope="row" (${r.rowHeads}/${r.nRows} row headers)`);
  assert(r.region, "scroll-region", "the scroll container must be a focusable (tabindex=0) role=region named by the caption");
  assert(r.num.align === "right" || r.num.align === "end", "numeric-right-aligned", `numeric cells are ${r.num.align}-aligned`);
  assert(/tabular/.test(r.num.nums), "tabular-figures", "numeric cells do not use tabular figures");
  assert((await infiniteAll(pg)) === 0, "no-infinite-at-rest", "an infinite animation runs");
  assert(await pg.evaluate(() => !document.querySelector("[aria-sort]")), "unsorted-by-default", "a column carries aria-sort before the user sorted anything");

  // sorting: aria-sort on exactly one header, rows reorder, an announcement, a transition (motion) / none (reduced)
  const col = () => pg.evaluate(() => Array.from(document.querySelectorAll("tbody tr")).map((tr) => Number((tr.querySelectorAll("td")[0] as HTMLElement).textContent)));
  const q1Btn = pg.locator(SORT).nth(1);
  await resetAnim(pg); await q1Btn.click(); await pg.waitForTimeout(60);
  const ev = await animEvents(pg); const props = await animatedProps(pg);
  if (motion === "no-preference") assert(ev >= 1, "sort-transition", "the sort arrow changes without any transition"); else assert(ev === 0, "reduced-motion-animations", `${ev} animation(s) on sort under prefers-reduced-motion`);
  noLayout(ctx, props, "sorting"); await settleAll(pg);
  const asc = await col();
  assert(asc.every((v, i) => i === 0 || asc[i - 1]! <= v) && new Set(asc).size > 2, "sorts-ascending", `Q1 ascending produced ${asc.join(",")}`);
  assert(await pg.evaluate(() => document.querySelectorAll("[aria-sort]").length === 1 && document.querySelector("[aria-sort]")!.getAttribute("aria-sort") === "ascending"), "aria-sort-one-column", "aria-sort must be on exactly the sorted column header");
  await q1Btn.click(); await tick(pg, 80);
  const desc = await col();
  assert(desc.every((v, i) => i === 0 || desc[i - 1]! >= v), "sorts-descending", `the second click did not sort descending (${desc.join(",")})`);
  assert(/Sorted by Q1, descending/.test(await pg.evaluate(() => (document.querySelector('[role="status"]') as HTMLElement).textContent ?? "")), "sort-announced", "the new sort order is not announced (status region)");
  await pg.locator(SORT).nth(0).click(); await tick(pg, 60);
  assert(await pg.evaluate(() => document.querySelectorAll("[aria-sort]").length === 1 && document.querySelector("[aria-sort]")!.textContent!.includes("Region")), "aria-sort-moves", "sorting another column left aria-sort on the previous one");
  await focusStart(pg); await pg.keyboard.press("Tab"); await pg.keyboard.press("Tab"); await tick(pg, 40);
  await focusRing(ctx, `${SORT}:focus-visible`, "sort", opaque(r.thBg, bg));
  await mount();

  if (first) {
    await fresh(pg); await mount();
    const s = await pg.evaluate(() => { const ths = Array.from(document.querySelectorAll("thead th")) as HTMLElement[]; return { sortable: ths.map((t) => !!t.querySelector("button")), btnInHeader: Array.from(document.querySelectorAll(".ds-tbl-001__sort")).every((b) => !!b.closest("th")), names: Array.from(document.querySelectorAll(".ds-tbl-001__sort")).map((b) => (b.textContent ?? "").trim()) }; });
    assert(JSON.stringify(s.sortable) === JSON.stringify([true, true, true, false]), "sortable-columns", `sort buttons on ${JSON.stringify(s.sortable)} (expected the first three columns only)`);
    assert(s.btnInHeader && s.names.every((n) => n.length > 0), "sort-button-named", `sort buttons are not inside headers or have no name (${JSON.stringify(s.names)})`);
    // keyboard: Enter and Space sort
    await focusStart(pg); await pg.keyboard.press("Tab"); await pg.keyboard.press("Tab"); await pg.keyboard.press("Enter"); await tick(pg, 60);
    assert(await pg.evaluate(() => document.querySelector("[aria-sort]")?.getAttribute("aria-sort") === "ascending"), "enter-sorts", "Enter on a sort button did not sort");
    await pg.keyboard.press("Space"); await tick(pg, 60);
    assert(await pg.evaluate(() => document.querySelector("[aria-sort]")?.getAttribute("aria-sort") === "descending"), "space-sorts", "Space on a sort button did not sort");
    const axe = await new AxeBuilder({ page: pg }).include("#stage").analyze(); for (const v of axe.violations) assert(false, `axe:${v.id}`, axeNote(v));
    // narrow viewport: the TABLE scrolls inside its region, the page does not
    await pg.setViewportSize(NARROW); await tick(pg, 140);
    const n = await pg.evaluate(() => { const sc = document.querySelector('[class*="__scroll"]') as HTMLElement; return { sw: document.documentElement.scrollWidth, iw: innerWidth, scrolls: sc.scrollWidth > sc.clientWidth, tabbable: sc.tabIndex === 0 }; });
    assert(n.sw <= n.iw + 1, "reflow-320", `at 320 px the page scrolls sideways (${n.sw}px in ${n.iw}px): the table must scroll inside its region`);
    assert(!n.scrolls || n.tabbable, "scroll-region-focusable", "the table scrolls horizontally but its region is not keyboard-focusable");
    await pg.setViewportSize(VIEW); await tick(pg, 100);
    await pageRules(ctx, m.id);
  }
}

export const WAVE_E_COMBOS: Record<string, (ctx: Ctx, first: boolean) => Promise<void>> = { choice: choiceCombo, stat: statCombo, pagination: paginationCombo, table: tableCombo };
void (null as unknown as Page);
