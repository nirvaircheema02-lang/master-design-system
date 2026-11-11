import type { Page } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { animEvents, ratio, resetAnim } from "./helpers.ts";
import { MIN_TARGET_AA, animatedProps, fresh, focusRing, focusStart, infiniteAll, opaque, settleAll, stageBg, type Ctx } from "./arch-common.ts";
import { pageRules, park, scrollTo, tick } from "./archetypes-c.ts";

/**
 * Atoms: typography (TXT-*), icon, badge, chip, avatar, divider, container, stack, spinner, progress.
 * One runner, because most checks are shared: readable contrast against the REAL background behind the atom, reflow at 320 px,
 * no animation under reduced motion, the radius token, axe. The per-atom rules live in the branch for its id.
 */
const axeNote = (v: { help: string; nodes: Array<{ target: unknown; any?: Array<{ message: string }> }> }) => `${v.help}: ${JSON.stringify(v.nodes[0]?.target)} ${v.nodes[0]?.any?.[0]?.message ?? ""}`.slice(0, 300);
const S = "#slot > *";

/** Colour and the colour actually painted behind it (nearest ancestor with a visible background, else the stage). */
const paint = (pg: Page, sel: string, prop = "color") => pg.evaluate(([s, p, stage]) => {
  const el = document.querySelector(s as string) as HTMLElement | null; if (!el) return null;
  const fg = (getComputedStyle(el) as any)[p as string] as string;
  let bg = stage as string;
  for (let e: Element | null = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; const m = /rgba?\(([^)]*)\)/.exec(c); const a = m ? (m[1]!.split(",")[3] ?? "1").trim() : "0"; if (m && parseFloat(a) > 0.95) { bg = c; break; } if (e.id === "stage") break; }
  return { fg, bg };
}, [sel, prop, null as unknown as string]);

export async function atomCombo(ctx: Ctx, first: boolean) {
  const { pg, m, assert, motion, radiusVar } = ctx;
  const id = m.id;
  // atoms with internal state (a chip that was removed, an avatar whose picture failed) start every step from a fresh instance
  const mount = async (p: Record<string, unknown> = {}) => { if (id === "BDG-002" || id === "AVT-001") await fresh(pg); await ctx.mount(p); }; const design = ctx.design;
  const sb = await stageBg(pg);
  await scrollTo(pg, 0); await park(pg); await settleAll(pg);
  const effBg = (c: { bg: string } | null) => (c ? opaque(c.bg, sb) : sb);
  const readable = (name: string, c: { fg: string; bg: string } | null, min = 4.5) => { assert(!!c && ratio(c.fg, effBg(c)) >= min, `${name}-contrast`, `${name} ${c?.fg} on ${effBg(c)} = ${c ? ratio(c.fg, effBg(c)).toFixed(2) : "?"}:1 (need ${min})`); };
  const radiusOf = (sel: string) => pg.evaluate(([s, rv]) => { const e = document.querySelector(s as string) as HTMLElement; return { r: getComputedStyle(e).borderTopLeftRadius, want: rv ? getComputedStyle(e).getPropertyValue(rv as string).trim() : "" }; }, [sel, radiusVar]);
  const loops = id === "LDR-001";
  if (!loops) assert((await infiniteAll(pg)) === 0 || (id === "LDR-002" && motion === "no-preference" && (await pg.evaluate(() => !!document.querySelector("[data-indeterminate]")))), "no-infinite-at-rest", "an infinite animation runs on a static atom");

  switch (id) {
    case "TXT-001": {
      readable("heading", await paint(pg, S));
      const sizes: number[] = [];
      for (const sz of ["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl"]) { await mount({ size: sz }); sizes.push(await pg.evaluate((s) => parseFloat(getComputedStyle(document.querySelector(s) as HTMLElement).fontSize), S)); }
      assert(sizes.every((v, i) => i === 0 || v > sizes[i - 1]!), "type-scale-ascends", `heading sizes xs..4xl are ${sizes.join(", ")}px (must strictly increase)`);
      await mount({ size: "xl" });
      const lh = await pg.evaluate((s) => { const c = getComputedStyle(document.querySelector(s) as HTMLElement); return { lh: parseFloat(c.lineHeight), fs: parseFloat(c.fontSize), tag: (document.querySelector(s) as HTMLElement).tagName }; }, S);
      assert(lh.lh >= lh.fs * 1.1, "line-height", `heading line height ${lh.lh}px is under 1.1 x ${lh.fs}px`);
      if (first) {
        for (const level of [1, 3, 4, 6]) { await mount({ level }); assert((await pg.evaluate((s) => (document.querySelector(s) as HTMLElement).tagName, S)) === `H${level}`, "semantic-level", `level ${level} did not render an <h${level}>`); }
        await mount({ level: 2, size: "4xl" }); const a = await pg.evaluate((s) => (document.querySelector(s) as HTMLElement).tagName, S);
        assert(a === "H2", "level-independent-of-size", "changing the visual size changed the heading level");
        await mount({ children: "Supercalifragilisticexpialidocious_headingwithoutanyspacesthatmustwrapatnarrowwidths and more text", size: "3xl" }); await pageRules(ctx, id); await mount();
      }
      break;
    }
    case "TXT-002": {
      readable("text", await paint(pg, S));
      for (const tone of ["primary", "secondary"]) { await mount({ tone }); readable(`${tone}-text`, await paint(pg, S)); }
      await mount({ measure: true, size: "md" });
      const t = await pg.evaluate((s) => { const e = document.querySelector(s) as HTMLElement; const c = getComputedStyle(e); return { w: e.getBoundingClientRect().width, fs: parseFloat(c.fontSize), lh: parseFloat(c.lineHeight) }; }, S);
      assert(t.w <= t.fs * 46, "measure", `a measured text block is ${t.w}px wide (${(t.w / t.fs).toFixed(0)} em); keep lines near 65 characters`);
      assert(design === "caption" ? t.lh >= t.fs * 1.3 : t.lh >= t.fs * 1.4, "body-line-height", `line height ${t.lh}px for ${t.fs}px text is too tight to read`);
      if (first) { await mount({ children: "w".repeat(200) }); await pageRules(ctx, id); await mount(); }
      break;
    }
    case "TXT-003": {
      readable("link", await paint(pg, S));
      const r = await pg.evaluate((s) => { const c = getComputedStyle(document.querySelector(s) as HTMLElement); return { deco: c.textDecorationLine, th: c.textDecorationThickness, radius: c.borderTopLeftRadius }; }, S);
      assert(/underline/.test(r.deco), "link-not-colour-only", "a link is not underlined at rest (colour alone must not mark a link)");
      if (radiusVar) { const o = await radiusOf(S); assert(o.r === o.want, "radius-token", `link radius ${o.r} != ${radiusVar} ${o.want}`); }
      await resetAnim(pg); await pg.locator(S).hover(); await pg.waitForTimeout(60);
      const ev = await animEvents(pg); await settleAll(pg);
      const h = await pg.evaluate((s) => { const c = getComputedStyle(document.querySelector(s) as HTMLElement); return { th: c.textDecorationThickness, fg: c.color }; }, S);
      assert(h.th !== r.th || h.fg !== (await paint(pg, S))?.fg, "hover-feedback", "hovering the link changes nothing");
      if (motion === "reduce") assert(ev === 0, "reduced-motion-animations", `${ev} animation(s) on hover under prefers-reduced-motion`);
      await park(pg);
      await focusStart(pg); await pg.keyboard.press("Tab"); await tick(pg, 40); await focusRing(ctx, `${S}:focus-visible`, "link", sb);
      if (first) {
        await mount({ external: true });
        const e = await pg.evaluate((s) => { const a = document.querySelector(s) as HTMLAnchorElement; return { target: a.target, rel: a.rel, text: a.textContent ?? "", svg: !!a.querySelector("svg") }; }, S);
        assert(e.target === "_blank" && /noopener/.test(e.rel), "external-safe", `external link target=${e.target} rel="${e.rel}"`);
        assert(/opens in a new tab/i.test(e.text) && e.svg, "external-announced", "an external link does not say (in text and with a mark) that it opens a new tab");
        await mount(); await pg.evaluate(() => history.replaceState(null, "", location.pathname));
        await focusStart(pg); await pg.keyboard.press("Tab"); await pg.keyboard.press("Enter"); await tick(pg, 60);
        assert((await pg.evaluate(() => location.hash)) === "#s2", "link-follows", "Enter on the link did not navigate");
        await pg.evaluate(() => { history.replaceState(null, "", location.pathname); window.scrollTo(0, 0); });
        await mount({ children: "a-very-long-link-text-without-any-spaces-that-must-wrap-instead-of-overflowing-the-page-at-narrow-widths" }); await pageRules(ctx, id); await mount();
      }
      break;
    }
    case "TXT-004": {
      const c = await paint(pg, S); readable("code", c);
      const f = await pg.evaluate((s) => { const e = document.querySelector(s) as HTMLElement; const cs = getComputedStyle(e); return { ff: cs.fontFamily, bw: cs.borderBottomWidth, bc: cs.borderBottomColor, tag: e.tagName }; }, S);
      assert(/mono/i.test(f.ff), "monospace", `code uses "${f.ff}", not a monospace font`);
      if (radiusVar) { const o = await radiusOf(S); assert(o.r === o.want, "radius-token", `radius ${o.r} != ${radiusVar} ${o.want}`); }
      await mount({ as: "kbd", children: "Ctrl" }); const k = await pg.evaluate((s) => { const cs = getComputedStyle(document.querySelector(s) as HTMLElement); return { bc: cs.borderBottomColor, bw: parseFloat(cs.borderBottomWidth), tag: (document.querySelector(s) as HTMLElement).tagName }; }, S);
      assert(k.tag === "KBD" && k.bw >= 1 && ratio(k.bc, sb) >= 3, "kbd-cap", `a key cap needs a visible border (${k.bw}px ${k.bc} = ${ratio(k.bc, sb).toFixed(2)}:1)`);
      readable("kbd", await paint(pg, S));
      await mount();
      if (first) { await mount({ children: "x".repeat(160) }); await pageRules(ctx, id); await mount(); }
      break;
    }
    case "ICN-001": {
      const d = await pg.evaluate((s) => { const e = document.querySelector(s) as SVGElement; return { hidden: e.getAttribute("aria-hidden"), role: e.getAttribute("role"), focus: e.getAttribute("focusable"), stroke: getComputedStyle(e).stroke, color: getComputedStyle(e).color, d: (e.querySelector("path")?.getAttribute("d") ?? "").length }; }, S);
      assert(d.hidden === "true" && !d.role && d.focus === "false", "decorative-by-default", `an icon without a label must be hidden from assistive tech and not focusable (aria-hidden=${d.hidden} role=${d.role})`);
      assert(d.d > 5, "draws", "the icon has no path");
      assert(d.stroke === d.color, "takes-text-colour", `stroke ${d.stroke} is not the surrounding text colour ${d.color}`);
      await mount({ label: "Done" }); const l = await pg.evaluate((s) => { const e = document.querySelector(s) as SVGElement; return { role: e.getAttribute("role"), name: e.getAttribute("aria-label"), hidden: e.getAttribute("aria-hidden") }; }, S);
      assert(l.role === "img" && l.name === "Done" && l.hidden === null, "labelled-icon", `a labelled icon must be role=img with the name (${JSON.stringify(l)})`);
      const widths: number[] = [];
      for (const sz of ["sm", "md", "lg", "xl"]) { await mount({ size: sz }); widths.push(await pg.evaluate((s) => (document.querySelector(s) as Element).getBoundingClientRect().width, S)); }
      assert(widths.every((v, i) => i === 0 || v > widths[i - 1]!), "sizes-ascend", `icon sizes sm..xl are ${widths.join(", ")}px`);
      for (const tone of ["muted", "accent", "success", "danger"]) { await mount({ tone }); const t = await pg.evaluate((s) => getComputedStyle(document.querySelector(s) as Element).stroke, S); assert(ratio(t, sb) >= 3, `${tone}-tone-contrast`, `${tone} icon ${t} on ${sb} = ${ratio(t, sb).toFixed(2)}:1 (non-text 3:1)`); }
      await mount();
      if (first) {
        const names = (m.props.name ?? []) as string[]; const bad: string[] = [];
        for (const n of names) { await mount({ name: n }); if (!(await pg.evaluate((s) => ((document.querySelector(s) as Element | null)?.querySelector("path")?.getAttribute("d") ?? "").length > 5, S))) bad.push(n); }
        assert(bad.length === 0, "every-icon-draws", `icons that draw nothing: ${bad.join(", ")}`);
        await mount();
      }
      break;
    }
    case "BDG-001": {
      for (const tone of ["neutral", "accent", "success", "danger"]) {
        await mount({ tone }); readable(`${tone}-badge`, await paint(pg, S));
        if (design === "outline") { const b = await pg.evaluate((s) => getComputedStyle(document.querySelector(s) as Element).borderTopColor, S); assert(ratio(b, sb) >= 3, `${tone}-outline-contrast`, `${tone} outline ${b} on ${sb} = ${ratio(b, sb).toFixed(2)}:1 (non-text 3:1)`); }
        if (design === "dot") { const dc = await pg.evaluate((s) => getComputedStyle(document.querySelector(`${s} [class*="__dot"]`) as Element).backgroundColor, S); assert(ratio(dc, sb) >= 3, `${tone}-dot-contrast`, `${tone} dot ${dc} on ${sb} = ${ratio(dc, sb).toFixed(2)}:1`); }
      }
      await mount();
      if (radiusVar && design !== "dot") { const o = await radiusOf(S); assert(o.r === o.want, "radius-token", `badge radius ${o.r} != ${radiusVar} ${o.want}`); }
      const s = await pg.evaluate((sel) => { const e = document.querySelector(sel) as HTMLElement; return { text: (e.textContent ?? "").trim().length, tab: e.querySelectorAll("a, button, input, [tabindex]").length, tag: e.tagName }; }, S);
      assert(s.text > 0, "meaning-in-text", "a badge with no text carries its meaning by colour alone");
      assert(s.tab === 0, "not-interactive", "a badge contains an interactive element (use a chip)");
      break;
    }
    case "BDG-002": {
      const B = `${S} .ds-bdg-002__main`;
      const rest = await paint(pg, B); const chipBg = await pg.evaluate((s) => getComputedStyle(document.querySelector(s) as Element).backgroundColor, S);
      assert(!!rest && ratio(rest.fg, opaque(chipBg, sb)) >= 4.5, "unselected-contrast", `unselected chip text ${rest?.fg} on ${chipBg}`);
      if (radiusVar) { const o = await radiusOf(S); assert(o.r === o.want, "radius-token", `chip radius ${o.r} != ${radiusVar} ${o.want}`); }
      const h = await pg.evaluate((s) => (document.querySelector(s) as Element).getBoundingClientRect().height, S);
      assert(h >= MIN_TARGET_AA, "target-size", `chip ${h}px < 24`); assert(h >= parseFloat(m.responsive.touchTarget) - 0.5, "touch-claim", `chip ${h}px < claim ${m.responsive.touchTarget}`, "warn");
      await resetAnim(pg); await pg.locator(B).click(); await pg.waitForTimeout(50); const ev = await animEvents(pg); await settleAll(pg); await park(pg);
      if (motion === "reduce") assert(ev === 0, "reduced-motion-animations", `${ev} animation(s) on select under prefers-reduced-motion`);
      const on = await pg.evaluate(([s, b]) => { const w = document.querySelector(s as string) as HTMLElement; const btn = document.querySelector(b as string) as HTMLElement; return { pressed: btn.getAttribute("aria-pressed"), bg: getComputedStyle(w).backgroundColor, fg: getComputedStyle(btn).color, check: (btn.querySelector("svg") as Element).getBoundingClientRect().width }; }, [S, B]);
      assert(on.pressed === "true", "aria-pressed", "the chip does not report aria-pressed=true after it is chosen");
      assert(ratio(on.fg, opaque(on.bg, sb)) >= 4.5, "selected-contrast", `selected chip text ${on.fg} on ${on.bg} = ${ratio(on.fg, opaque(on.bg, sb)).toFixed(2)}:1`);
      assert(on.check > 4, "selected-not-colour-only", "the selected chip shows no check mark (colour alone)");
      await mount(); await focusStart(pg); await pg.keyboard.press("Tab"); await tick(pg, 40); await focusRing(ctx, `${B}:focus-visible`, "chip", sb);
      if (first) {
        await mount(); await focusStart(pg); await pg.keyboard.press("Tab"); await pg.keyboard.press("Space"); await tick(pg, 40);
        assert((await pg.locator(B).getAttribute("aria-pressed")) === "true", "space-toggles", "Space did not toggle the chip");
        await pg.keyboard.press("Enter"); await tick(pg, 40);
        assert((await pg.locator(B).getAttribute("aria-pressed")) === "false", "enter-toggles", "Enter did not toggle the chip back");
        await mount({ removable: true });
        const r = await pg.evaluate((s) => { const x = document.querySelector(`${s} .ds-bdg-002__remove`) as HTMLElement | null; return { name: x?.getAttribute("aria-label") ?? "", h: x?.getBoundingClientRect().height ?? 0, w: x?.getBoundingClientRect().width ?? 0 }; }, S);
        assert(/^Remove .+/.test(r.name), "remove-named", `the remove control is named "${r.name}"`); assert(r.h >= MIN_TARGET_AA && r.w >= MIN_TARGET_AA, "remove-target-size", `remove control ${r.w}x${r.h}px < 24`);
        await focusStart(pg); await pg.keyboard.press("Tab"); await pg.keyboard.press("Tab"); await focusRing(ctx, `${S} .ds-bdg-002__remove:focus-visible`, "remove", sb);
        await pg.keyboard.press("Enter"); await tick(pg, 60);
        assert(await pg.evaluate(() => !document.querySelector("#slot > *")), "remove-removes", "choosing remove did not remove the chip");
        await mount();
      }
      break;
    }
    case "AVT-001": {
      const sel = `${S}`;
      const a = await pg.evaluate((s) => { const e = document.querySelector(s) as HTMLElement; return { role: e.getAttribute("role"), name: e.getAttribute("aria-label"), text: (e.querySelector('[class*="__initials"]')?.textContent ?? ""), w: e.getBoundingClientRect().width, h: e.getBoundingClientRect().height }; }, sel);
      assert(a.role === "img" && a.name === "Aarav Mehta", "avatar-named", `the avatar is role=${a.role} name="${a.name}"`);
      assert(a.text === "AM", "initials", `the initials are "${a.text}" (expected AM)`);
      assert(Math.abs(a.w - a.h) < 1, "avatar-square-box", `the avatar box is ${a.w}x${a.h}`);
      readable("initials", await paint(pg, `${S} [class*="__initials"]`));
      if (design === "rounded" && radiusVar) { const o = await radiusOf(S); assert(o.r === o.want, "radius-token", `avatar radius ${o.r} != ${radiusVar} ${o.want}`); }
      if (design === "circle" || design === "ring" || !design) assert(await pg.evaluate((s) => parseFloat(getComputedStyle(document.querySelector(s) as Element).borderTopLeftRadius) >= (document.querySelector(s) as Element).getBoundingClientRect().width / 2 - 1 || getComputedStyle(document.querySelector(s) as Element).borderTopLeftRadius.includes("%"), S), "round-shape", "the circle design is not round");
      if (design === "ring") { const rg = await pg.evaluate((s) => { const c = getComputedStyle(document.querySelector(s) as Element); return { w: parseFloat(c.outlineWidth), col: c.outlineColor }; }, S); assert(rg.w >= 2 && ratio(rg.col, sb) >= 3, "ring-contrast", `ring ${rg.w}px ${rg.col} on ${sb} = ${ratio(rg.col, sb).toFixed(2)}:1`); }
      const ws: number[] = []; for (const sz of ["sm", "md", "lg", "xl"]) { await mount({ size: sz }); ws.push(await pg.evaluate((s) => (document.querySelector(s) as Element).getBoundingClientRect().width, S)); }
      assert(ws.every((v, i) => i === 0 || v > ws[i - 1]!), "sizes-ascend", `avatar sizes are ${ws.join(", ")}px`); await mount();
      if (first) {
        const px = "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' fill='%23888888'/%3E%3C/svg%3E";
        await mount({ src: px }); await tick(pg, 120);
        assert(await pg.evaluate((s) => { const e = document.querySelector(s) as HTMLElement; return !!e.querySelector("img") && !e.querySelector('[class*="__initials"]') && e.getAttribute("aria-label") === "Aarav Mehta"; }, S), "image-shown", "with a picture the avatar must show it (and keep its name)");
        await mount({ src: "data:image/png;base64,broken" }); await tick(pg, 300);
        assert(await pg.evaluate((s) => !!(document.querySelector(s) as HTMLElement).querySelector('[class*="__initials"]'), S), "broken-image-falls-back", "a picture that fails to load must fall back to the initials");
        await mount();
      }
      break;
    }
    case "LAY-001": {
      const d = await pg.evaluate((s) => { const e = document.querySelector(s) as HTMLElement; const c = getComputedStyle(e); return { tag: e.tagName, top: c.borderTopColor, topW: parseFloat(c.borderTopWidth), style: c.borderTopStyle, img: c.backgroundImage, h: e.getBoundingClientRect().height }; }, S);
      assert(d.tag === "HR", "semantic-hr", `a plain divider is <${d.tag}>, expected <hr>`);
      const line = design === "fade" ? d.img : d.top;
      assert(design === "fade" ? /gradient/.test(line) : ratio(line, sb) >= 1.2, "line-visible", `the divider line ${line} is not visible against ${sb} (< 1.2:1)`);
      if (design === "dashed") assert(d.style === "dashed", "dashed-style", `dashed design draws a ${d.style} line`);
      if (design === "thick") assert(d.topW >= 3, "thick-width", `thick design is ${d.topW}px`);
      if (first) {
        await mount({ orientation: "vertical" }); const v = await pg.evaluate((s) => { const e = document.querySelector(s) as HTMLElement; return { role: e.getAttribute("role"), o: e.getAttribute("aria-orientation") }; }, S);
        assert(v.role === "separator" && v.o === "vertical", "vertical-separator", `a vertical divider is role=${v.role} aria-orientation=${v.o}`);
        await mount({ label: "or" }); const l = await pg.evaluate((s) => { const e = document.querySelector(s) as HTMLElement; return { text: (e.textContent ?? "").trim(), hidden: Array.from(e.querySelectorAll('[class*="__line"]')).every((x) => x.getAttribute("aria-hidden") === "true"), fg: getComputedStyle(e.querySelector('[class*="__label"]') as Element).color }; }, S);
        assert(l.text === "or" && l.hidden, "labelled-divider", `label text "${l.text}", lines hidden from assistive tech: ${l.hidden}`);
        assert(ratio(l.fg, sb) >= 4.5, "label-contrast", `divider label ${l.fg} on ${sb}`);
        await mount();
      }
      break;
    }
    case "LAY-002": {
      for (const size of ["sm", "md", "lg", "xl", "prose"]) {
        await mount({ size });
        const c = await pg.evaluate((s) => { const e = document.querySelector(s) as HTMLElement; const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return { w: r.width, max: parseFloat(cs.maxWidth), ml: r.left, mr: innerWidth - r.right, pl: parseFloat(cs.paddingLeft), vw: innerWidth }; }, S);
        assert(c.w <= c.max + 1, `${size}-capped`, `${size} container is ${c.w}px but its cap is ${c.max}px`);
        assert(Math.abs(c.ml - c.mr) <= 1, `${size}-centred`, `${size} container is not centred (${c.ml}px left, ${c.mr}px right)`);
        assert(c.pl >= 16, `${size}-gutter`, `the gutter is ${c.pl}px (< 16): text would touch the screen edge`);
      }
      const caps: number[] = []; for (const size of ["sm", "md", "lg", "xl"]) { await mount({ size }); caps.push(await pg.evaluate((s) => parseFloat(getComputedStyle(document.querySelector(s) as Element).maxWidth), S)); }
      assert(caps.every((v, i) => i === 0 || v > caps[i - 1]!), "caps-ascend", `container caps sm..xl are ${caps.join(", ")}px`);
      await mount();
      if (first) { await pageRules(ctx, id); }
      break;
    }
    case "LAY-003": {
      const read = () => pg.evaluate((s) => { const e = document.querySelector(s) as HTMLElement; const cs = getComputedStyle(e); const k = Array.from(e.children) as HTMLElement[]; return { dir: cs.flexDirection, gap: parseFloat(cs.rowGap) || 0, cgap: parseFloat(cs.columnGap) || 0, ys: k.map((c) => Math.round(c.getBoundingClientRect().top)), xs: k.map((c) => Math.round(c.getBoundingClientRect().left)), n: k.length, g: (e.dataset.gap ?? ""), tokens: Object.fromEntries(["1", "2", "3", "4", "6", "8", "12"].map((x) => [x, parseFloat(getComputedStyle(e).getPropertyValue(`--ds-lay-gap-${x}`)) || 0])) as Record<string, number> }; }, S);
      const rem = await pg.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
      for (const gap of ["1", "2", "3", "4", "6", "8", "12"]) { await mount({ gap }); const s = await read(); const want = (s.tokens[gap] ?? 0) * (s.tokens[gap]! < 20 ? rem : 1); assert(Math.abs(s.gap - (s.tokens[gap]! < 20 ? want : s.tokens[gap]!)) <= 1, `gap-${gap}-is-token`, `gap ${gap} is ${s.gap}px but the spacing token is ${s.tokens[gap]}`); }
      await mount({ gap: "4" }); const v = await read();
      assert(v.dir === "column" && v.ys.every((y, i) => i === 0 || y > v.ys[i - 1]!) && new Set(v.xs).size === 1, "vertical-flow", `children are not stacked top to bottom (${v.ys.join(",")})`);
      if (first) {
        await mount({ direction: "horizontal", gap: "6" }); const h = await read();
        assert(h.dir === "row" && new Set(h.ys).size === 1 && h.xs.every((x, i) => i === 0 || x > h.xs[i - 1]!), "horizontal-flow", `children are not laid out left to right (${h.xs.join(",")})`);
        await mount({ direction: "horizontal", wrap: true, items: Array.from({ length: 12 }, (_, i) => `Item number ${i + 1}`) }); await pageRules(ctx, id); await mount();
      }
      break;
    }
    case "LDR-001": {
      const sp = await pg.evaluate((s) => { const e = document.querySelector(s) as HTMLElement; const l = e.querySelector('[class*="__label"]') as HTMLElement; const sh = e.querySelector('[class*="__shape"]') as HTMLElement; const lr = l.getBoundingClientRect(); return { role: e.getAttribute("role"), label: (l.textContent ?? "").trim(), labelShown: lr.width > 2 && lr.height > 2, w: sh.getBoundingClientRect().width, h: sh.getBoundingClientRect().height }; }, S);
      assert(sp.role === "status" && sp.label.length > 2, "status-with-label", `spinner role=${sp.role} label="${sp.label}"`);
      const running = await infiniteAll(pg);
      if (motion === "no-preference") assert(running >= 1, "spins", "the spinner does not animate");
      else { assert(running === 0, "reduced-motion-animations", `${running} infinite animation(s) under prefers-reduced-motion`); assert(sp.labelShown, "label-shown-when-still", "under reduced motion nothing moves, so the text label must be visible"); }
      const props = await animatedProps(pg); const bad = props.filter((p) => !/^(transform|opacity|rotate|scale|translate)$/.test(p));
      assert(bad.length === 0, "spin-uses-transform-opacity", `the spinner animates ${bad.join(", ")}`);
      const shape = await pg.evaluate((s) => { const sh = document.querySelector(`${s} [class*="__shape"]`) as HTMLElement; const i = sh.querySelector("i") as HTMLElement; const cs = getComputedStyle(sh); return { ring: cs.borderTopColor, dot: i ? getComputedStyle(i).backgroundColor : "", disp: i ? getComputedStyle(i).display : "none" }; }, S);
      const col = design === "dots" || design === "bars" ? shape.dot : shape.ring; assert(ratio(col, sb) >= 3, "shape-contrast", `spinner ${col} on ${sb} = ${ratio(col, sb).toFixed(2)}:1 (non-text 3:1)`);
      const ws: number[] = []; for (const size of ["sm", "md", "lg"]) { await mount({ size }); ws.push(await pg.evaluate((s) => (document.querySelector(`${s} [class*="__shape"]`) as Element).getBoundingClientRect().height, S)); }
      assert(ws.every((v, i) => i === 0 || v > ws[i - 1]!), "sizes-ascend", `spinner sizes sm..lg are ${ws.join(", ")}px`); await mount();
      break;
    }
    case "LDR-002": {
      const T = `${S} [role="progressbar"]`;
      const p = await pg.evaluate((s) => { const t = document.querySelector(s) as HTMLElement; const f = t.querySelector('[class*="__fill"]') as HTMLElement; const lab = document.getElementById(t.getAttribute("aria-labelledby") ?? ""); const tc = getComputedStyle(t); return { now: t.getAttribute("aria-valuenow"), min: t.getAttribute("aria-valuemin"), max: t.getAttribute("aria-valuemax"), name: (lab?.textContent ?? "").trim(), tf: getComputedStyle(f).transform, fw: f.getBoundingClientRect().width, tw: t.getBoundingClientRect().width, track: tc.backgroundColor, fill: getComputedStyle(f).backgroundColor, border: tc.borderTopColor, bw: parseFloat(tc.borderTopWidth) }; }, T);
      assert(p.now === "64" && p.min === "0" && p.max === "100" && p.name.length > 2, "progressbar-values", `role=progressbar now=${p.now} min=${p.min} max=${p.max} name="${p.name}"`);
      const sx = /^matrix\(([^,]+)/.exec(p.tf)?.[1]; assert(!!sx && Math.abs(parseFloat(sx) - 0.64) < 0.02, "fill-scales", `the fill is scaleX(${sx}) for 64% (the fill must scale with transform, not width)`);
      assert(ratio(p.fill, opaque(p.track, sb)) >= 3, "fill-contrast", `fill ${p.fill} on track ${p.track} = ${ratio(p.fill, opaque(p.track, sb)).toFixed(2)}:1 (non-text 3:1)`);
      if (radiusVar) { const o = await radiusOf(T); assert(o.r === o.want, "radius-token", `track radius ${o.r} != ${radiusVar} ${o.want}`); }
      readable("label", await paint(pg, `${S} [class*="__label"]`));
      await mount({ value: 20 }); const w1 = await pg.evaluate((s) => (document.querySelector(`${s} [class*="__fill"]`) as HTMLElement).offsetWidth, S);
      await mount({ value: 80 }); const w2 = await pg.evaluate((s) => (document.querySelector(`${s} [class*="__fill"]`) as HTMLElement).offsetWidth, S);
      assert(Math.abs(w1 - w2) < 1, "fill-box-constant", `the fill's width changes with the value (${w1}px vs ${w2}px): it must scale with transform`);
      for (const [v, want] of [[150, "100"], [-5, "0"]] as const) { await mount({ value: v }); assert((await pg.locator(T).getAttribute("aria-valuenow")) === want, "value-clamped", `value ${v} reports aria-valuenow=${await pg.locator(T).getAttribute("aria-valuenow")}, expected ${want}`); }
      await mount({ value: undefined, showValue: false }); await settleAll(pg);
      const ind = await pg.evaluate((s) => (document.querySelector(s) as HTMLElement).hasAttribute("aria-valuenow"), T);
      assert(!ind, "indeterminate-no-valuenow", "an indeterminate bar must not set aria-valuenow");
      const run = await infiniteAll(pg);
      if (motion === "no-preference") assert(run >= 1, "indeterminate-moves", "the indeterminate bar does not animate");
      else assert(run === 0, "reduced-motion-animations", `${run} infinite animation(s) under prefers-reduced-motion`);
      const ip = await animatedProps(pg); assert(ip.every((q) => /^(transform|translate|opacity)$/.test(q)), "indeterminate-transform-only", `the indeterminate bar animates ${ip.join(", ")}`);
      await mount();
      break;
    }
  }
  if (first) {
    await settleAll(pg); await tick(pg, 60);
    const axe = await new AxeBuilder({ page: pg }).include("#stage").analyze(); for (const v of axe.violations) assert(false, `axe:${v.id}`, axeNote(v));
  }
}

export const WAVE_F_COMBOS: Record<string, (ctx: Ctx, first: boolean) => Promise<void>> = { atom: atomCombo };
