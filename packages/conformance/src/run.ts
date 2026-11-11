import { chromium, type Page } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { bundleClient } from "./render.ts";
import { animCount, animEvents, armAnimEvents, infiniteCount, pool, px, ratio, resetAnim, sameList, settle, visualContrast, buildPage } from "./helpers.ts";
import { runArchetype } from "./archetypes.ts";
import type { ConformanceComponent, Target } from "./targets.ts";

export interface Finding { target: string; component: string; combo: string; check: string; level: "error" | "warn"; message: string }
export interface RunOptions {
  workdir: string;
  radii?: string[];            // "default" = whatever the brand resolves to
  modes?: Array<"light" | "dark">;
  motions?: Array<"no-preference" | "reduce">;
  chromiumPath?: string;
}
export interface RunResult { checks: number; combos: number; findings: Finding[] }

const MIN_TARGET_AA = 24;   // WCAG 2.2 SC 2.5.8 (AA)

interface Probe {
  radius: string; expectedRadius: string; stageBg: string;
  outlineStyle: string; outlineWidth: number; outlineColor: string;
  w: number; h: number; scrollW: number; clientW: number; opacity: number;
  fg: string; bg: string; ringWidthPx: number;
  pseudoRadii: Array<{ name: string; radius: string }>;
  transforms: string[];
}

const probe = (page: Page, radiusVar: string | undefined, insetVars: string[]): Promise<Probe> =>
  page.evaluate(([rv, insets]) => {
    const stage = document.getElementById("stage")!;
    const host = stage.firstElementChild as HTMLElement;
    const cs = getComputedStyle(host);
    const pseudoRadii: Array<{ name: string; radius: string }> = [];
    for (const name of ["::before", "::after"]) {
      const p = getComputedStyle(host, name);
      if (p.content !== "none" && p.display !== "none") pseudoRadii.push({ name, radius: p.borderTopLeftRadius });
    }
    const transforms: string[] = [];
    const all: Element[] = [host, ...Array.from(host.querySelectorAll("*"))];
    for (const el of all) {
      transforms.push(getComputedStyle(el).transform);
      for (const name of ["::before", "::after"]) { const p = getComputedStyle(el, name); transforms.push(p.content === "none" || p.display === "none" ? "n/a" : p.transform); }
    }
    const r = host.getBoundingClientRect();
    const inset = (insets as string[])[0];
    return {
      radius: cs.borderTopLeftRadius,
      expectedRadius: rv ? cs.getPropertyValue(rv as string).trim() : "",
      stageBg: getComputedStyle(stage).backgroundColor,
      outlineStyle: cs.outlineStyle, outlineWidth: parseFloat(cs.outlineWidth), outlineColor: cs.outlineColor,
      w: r.width, h: r.height, ...(() => { const lb = (host.querySelector('[class*="__label"]') as HTMLElement | null)?.getBoundingClientRect(); return { scrollW: lb ? lb.right - r.left : 0, clientW: r.width }; })(), opacity: parseFloat(cs.opacity),
      fg: cs.color, bg: cs.backgroundColor,
      ringWidthPx: inset ? parseFloat(cs.getPropertyValue(inset)) : 0,
      pseudoRadii, transforms,
    };
  }, [radiusVar, insetVars] as const);


const pointerVars = (page: Page, vars: string[]) => page.evaluate((vs) => { const h = document.getElementById("stage")!.firstElementChild as HTMLElement; return vs.map((v) => h.style.getPropertyValue(v)); }, vars);



export async function runConformance(targets: Target[], opts: RunOptions): Promise<RunResult> {
  const radii = opts.radii ?? ["default", "0px", "8px", "9999px"];
  const modes = opts.modes ?? ["light", "dark"];
  const motions = opts.motions ?? ["no-preference", "reduce"];
  mkdirSync(opts.workdir, { recursive: true });
  const browser = await chromium.launch(opts.chromiumPath ? { executablePath: opts.chromiumPath } : {});
  const findings: Finding[] = [];
  let checks = 0, combos = 0;

  try {
    for (const target of targets) {
      const jobs = target.components.map((comp) => async () => {
        const m = comp.manifest;
        if (m.archetype !== "button") {
          const r = await runArchetype(browser, target, comp, { workdir: opts.workdir, radii, modes, motions });
          checks += r.checks; combos += r.combos; findings.push(...r.findings);
          return;
        }
        const bundle = await bundleClient(comp.dir, m);
        const file = join(opts.workdir, `${target.name.replace(/\W+/g, "_")}__${m.id}.html`);
        writeFileSync(file, buildPage(target, comp, bundle));
        const ctx = await browser.newContext({ viewport: { width: 900, height: 500 } });
        const pg = await ctx.newPage();
        const pageErrors: string[] = [];
        let collecting = true; // axe reads stylesheets via XHR and logs CORS noise on file://; not a component error
        pg.on("pageerror", (e) => collecting && pageErrors.push(String(e)));
        pg.on("console", (m2) => collecting && m2.type() === "error" && pageErrors.push(m2.text()));
        await pg.goto(pathToFileURL(file).href);
        const fixtureBase = { ...m.fixture.props, children: m.fixture.children ?? "Get started" };
        const mount = (props: Record<string, unknown> = {}) => pg.evaluate((p) => (window as any).__mount(p), { ...fixtureBase, ...props });
        await mount();
        await armAnimEvents(pg);

        const radiusVar = m.tokens.find((t) => t.endsWith("-radius"));
        const insetVars = m.constraints.insetLayers.map((l) => l.inset);
        const interactive = m.interaction.class !== "A";
        const touchClaim = parseFloat(m.responsive.touchTarget) || 44; // each manifest states its own claim
        const baseCombo = { target: target.name, component: m.id };

        for (let si = 0; si < m.skins.length; si++) {
          const skin = m.skins[si]!;
          // the default skin is exercised with NO data-skin attribute (that is how most sites use it)
          await mount(si === 0 ? {} : { skin: skin.id });
          const skinRadii = si === 0 ? radii : radii.filter((r) => r === "default" || r === "9999px");

          for (const mode of modes) {
            let axeDone = false;
            for (const radius of skinRadii) {
              for (const motion of motions) {
                combos++;
                const combo = `${skin.id}/${radius}/${mode}/${motion}`;
                const fail = (check: string, message: string, level: "error" | "warn" = "error") => findings.push({ ...baseCombo, combo, check, level, message });
                const assert = (ok: boolean, check: string, message: string, level: "error" | "warn" = "error") => { checks++; if (!ok) fail(check, message, level); };

                await pg.emulateMedia({ reducedMotion: motion });
                await pg.evaluate(([mo, r, rv]) => {
                  const stage = document.getElementById("stage")!;
                  stage.dataset.mode = mo!;
                  if (rv) { if (r === "default") stage.style.removeProperty(rv); else stage.style.setProperty(rv, r!); }
                }, [mode, radius, radiusVar] as const);
                await pg.mouse.move(0, 0);
                await pg.evaluate(() => document.getElementById("start")!.focus());
                await pg.waitForTimeout(30);
                await settle(pg);

                const rest = await probe(pg, radiusVar, insetVars);

                // 1 shape: host follows the radius token; inner layers inherit it (declared inset layers: host minus inset)
                if (radiusVar) {
                  assert(rest.radius === rest.expectedRadius, "radius-token", `host radius ${rest.radius} != ${radiusVar} ${rest.expectedRadius}`);
                  for (const p of rest.pseudoRadii) {
                    const inset = m.constraints.insetLayers.find((l) => l.pseudo === p.name);
                    if (inset) {
                      const want = Math.max(0, px(rest.radius) - rest.ringWidthPx);
                      assert(Math.abs(px(p.radius) - want) < 0.6, "inset-layer-radius", `${p.name} radius ${p.radius} != host ${rest.radius} - ${inset.inset} (${want}px)`);
                    } else assert(p.radius === rest.radius, "inner-layer-radius", `${p.name} radius ${p.radius} != host ${rest.radius}`);
                  }
                }
                // 2 rendered contrast from real pixels (rest)
                const vr = await visualContrast(pg);
                assert(vr.ratio >= 4.5, "contrast-rest", `label ${vr.fg} on ${vr.bgLeft}/${vr.bgRight} = ${vr.ratio.toFixed(2)}:1 < 4.5`);
                // 3 target size, overflow, nothing loops at rest (WCAG 2.2.2 stop-after-5s)
                assert(rest.h >= MIN_TARGET_AA && rest.w >= MIN_TARGET_AA, "target-size", `${rest.w.toFixed(0)}x${rest.h.toFixed(0)}px < ${MIN_TARGET_AA}px (WCAG 2.5.8)`);
                assert(rest.h >= touchClaim - 0.5, "touch-claim", `height ${rest.h.toFixed(1)}px < manifest claim ${touchClaim}px`, "warn");
                assert(rest.scrollW <= rest.clientW + 1, "label-overflow", `content ${rest.scrollW}px > box ${rest.clientW}px`, "warn");
                assert((await infiniteCount(pg)) === 0, "no-infinite-at-rest", "an infinite animation runs while the component is idle");

                // 3b pointer-driven effects ignore touch
                if (m.interaction.js) {
                  await pg.evaluate(() => { const h = document.getElementById("stage")!.firstElementChild as HTMLElement; const r = h.getBoundingClientRect(); h.dispatchEvent(new PointerEvent("pointermove", { pointerType: "touch", clientX: r.left + r.width * 0.8, clientY: r.top + r.height * 0.3, bubbles: true })); });
                  assert((await pointerVars(pg, m.interaction.pointerVars)).every((v) => v === ""), "pointer-ignores-touch", "a touch pointer moved the pointer-driven effect");
                }

                // 4 hover + interaction + reduced motion + fill transition
                await resetAnim(pg);
                await pg.locator("#stage > *").first().hover();
                await pg.waitForTimeout(45);
                if (m.interaction.js) {
                  // hover() lands on the centre; a real pointer then moves off-centre, which is what drives the effect
                  const bb = (await pg.locator("#stage > *").first().boundingBox())!;
                  await pg.mouse.move(bb.x + bb.width * 0.8, bb.y + bb.height * 0.3, { steps: 2 });
                  await pg.waitForTimeout(45);
                  const vars = await pointerVars(pg, m.interaction.pointerVars);
                  if (motion === "no-preference") assert(vars.every((v) => v !== ""), "pointer-tracks", `pointer move did not set ${m.interaction.pointerVars.join(", ")}`);
                  else assert(vars.every((v) => v === ""), "pointer-reduced-motion", "pointer tracking is active under prefers-reduced-motion");
                }
                const hovEarly = await probe(pg, radiusVar, insetVars);
                const running = await animEvents(pg); // animations STARTED by the hover (race-free)
                const any = running;
                await settle(pg);
                const hov = await probe(pg, radiusVar, insetVars);
                const vh = await visualContrast(pg);
                assert(vh.ratio >= 4.5, "contrast-hover", `hover label ${vh.fg} on ${vh.bgLeft}/${vh.bgRight} = ${vh.ratio.toFixed(2)}:1 < 4.5`);
                const colourChanged = hov.bg !== rest.bg || hov.fg !== rest.fg;
                if (m.states.includes("hover")) assert(colourChanged || !sameList(hov.transforms, rest.transforms) || interactive, "hover-affordance", "hover changes neither colour nor geometry", "warn");
                if (motion === "no-preference") {
                  if (interactive) assert(running >= 1, "interaction-runs", `${m.id} ${m.interaction.modules.join("+")} did not animate on hover`);
                  // a colour change must TRANSITION, not snap (market norm 150-300 ms; our CTAs used to snap)
                  if (colourChanged) assert(any >= 1 && (hovEarly.bg !== hov.bg || hovEarly.fg !== hov.fg || any >= 1), "fill-transition", "hover colour change is instant (no transition)");
                }
                if (motion === "reduce") {
                  assert(any === 0, "reduced-motion-animations", `${any} animation(s) active under prefers-reduced-motion`);
                  assert(sameList(hov.transforms, rest.transforms), "reduced-motion-end-state", "elements still move on hover under prefers-reduced-motion");
                }
                await pg.mouse.move(0, 0);
                await settle(pg);
                if (m.interaction.js) assert((await pointerVars(pg, m.interaction.pointerVars)).every((v) => v === ""), "pointer-clears-on-leave", "pointer state stays after the pointer leaves");
                await pg.evaluate(() => document.getElementById("start")!.focus());

                // 5 keyboard focus ring (real Tab, so :focus-visible applies)
                await pg.keyboard.press("Tab");
                const foc = await probe(pg, radiusVar, insetVars);
                const focused = await pg.evaluate(() => document.activeElement === document.getElementById("stage")!.firstElementChild);
                assert(focused, "tab-focus", "component is not reachable with Tab");
                if (focused) {
                  assert(foc.outlineStyle !== "none" && foc.outlineWidth >= 2, "focus-visible", `outline ${foc.outlineStyle} ${foc.outlineWidth}px (need >= 2px)`);
                  assert(ratio(foc.outlineColor, foc.stageBg) >= 3, "focus-contrast", `focus ring ${ratio(foc.outlineColor, foc.stageBg).toFixed(2)}:1 vs surface < 3`);
                }

                // 6 once per (skin, mode): activation, disabled, loading, axe
                if (radius === "default" && motion === "no-preference") {
                  await pg.evaluate(() => { (window as any).__clicks = 0; });
                  await pg.evaluate(() => document.getElementById("start")!.focus());
                  await pg.keyboard.press("Tab"); await pg.keyboard.press("Enter"); await pg.keyboard.press("Space");
                  const n = await pg.evaluate(() => (window as any).__clicks as number);
                  assert(n === 2, "keyboard-activation", `Enter+Space produced ${n} click(s), expected 2`);

                  // accessible name: exactly the visible label, once (guards hidden duplicates such as text-roll)
                  const snap = await pg.locator("#stage > *").first().ariaSnapshot();
                  assert(/^- (button|link) "Get started"(\s|$)/.test(snap.trim()), "accessible-name", `accessible name is not exactly "Get started": ${snap.replace(/\s+/g, " ").slice(0, 120)}`);

                  // link variant: a real <a> (Enter activates, Space does not); loading keeps focus and cancels navigation
                  if (m.a11y.elements.includes("a")) {
                    await mount({ href: "#conf", ...(si === 0 ? {} : { skin: skin.id }) });
                    await pg.evaluate(() => { (window as any).__clicks = 0; document.getElementById("start")!.focus(); });
                    await pg.keyboard.press("Tab");
                    const info = await pg.evaluate(() => { const h = document.getElementById("stage")!.firstElementChild as HTMLElement; return { tag: h.tagName, href: h.getAttribute("href"), focused: document.activeElement === h }; });
                    assert(info.tag === "A" && info.href === "#conf" && info.focused, "link-variant", `href must render a focusable <a> (got ${JSON.stringify(info)})`);
                    await pg.keyboard.press("Enter"); await pg.keyboard.press("Space");
                    assert((await pg.evaluate(() => (window as any).__clicks as number)) === 1, "link-keyboard", "a link activates on Enter only (Space must not)");
                    await mount({ href: "#conf", loading: true });
                    await pg.evaluate(() => { (window as any).__clicks = 0; history.replaceState(null, "", location.pathname); document.getElementById("start")!.focus(); });
                    await pg.keyboard.press("Tab"); await pg.keyboard.press("Enter");
                    const ll = await pg.evaluate(() => { const h = document.getElementById("stage")!.firstElementChild as HTMLElement; return { focused: document.activeElement === h, aria: h.getAttribute("aria-disabled"), hash: location.hash }; });
                    assert(ll.focused && ll.aria === "true" && ll.hash !== "#conf", "link-loading", `loading link must stay focusable, aria-disabled and not navigate (got ${JSON.stringify(ll)})`);
                    await mount(si === 0 ? {} : { skin: skin.id });
                  }

                  // disabled: no motion
                  await mount({ disabled: true, ...(si === 0 ? {} : { skin: skin.id }) });
                  await pg.mouse.move(0, 0); await settle(pg);
                  await resetAnim(pg);
                  await pg.locator("#stage > *").first().hover({ force: true });
                  await pg.waitForTimeout(45);
                  const dAnim = await animEvents(pg);
                  const dProbe = await probe(pg, radiusVar, insetVars);
                  assert(dAnim === 0, "disabled-no-motion", `${dAnim} animation(s) run while disabled`);
                  assert(dProbe.opacity < 1, "disabled-affordance", "disabled state is not visually distinct", "warn");

                  // P1: loading keeps focus, announces itself, ignores activation, and its spinner stops under reduced motion
                  if (m.states.includes("loading")) {
                    await mount({ loading: true, ...(si === 0 ? {} : { skin: skin.id }) });
                    await pg.mouse.move(0, 0); await settle(pg);
                    const attrs = await pg.evaluate(() => { const h = document.getElementById("stage")!.firstElementChild as HTMLButtonElement; const s = document.querySelector('#stage [role="status"]'); return { ariaDisabled: h.getAttribute("aria-disabled"), busy: h.getAttribute("aria-busy"), disabled: h.hasAttribute("disabled"), status: s?.textContent?.trim() ?? null }; });
                    assert(attrs.ariaDisabled === "true" && attrs.busy === "true" && !attrs.disabled, "loading-aria", `loading must use aria-disabled+aria-busy and NOT disabled (got ${JSON.stringify(attrs)})`);
                    assert(!!attrs.status, "loading-status", "loading has no polite live region text");
                    await pg.evaluate(() => { (window as any).__clicks = 0; document.getElementById("start")!.focus(); });
                    await pg.keyboard.press("Tab");
                    const lf = await pg.evaluate(() => document.activeElement === document.getElementById("stage")!.firstElementChild);
                    assert(lf, "loading-keeps-focus", "a loading component must stay reachable with Tab (Primer/Atlassian/Base UI guidance)");
                    await pg.keyboard.press("Enter"); await pg.keyboard.press("Space");
                    assert((await pg.evaluate(() => (window as any).__clicks as number)) === 0, "loading-ignores-activation", "activation fired while loading");
                    await pg.mouse.move(0, 0);
                    await pg.evaluate(() => document.getElementById("start")!.focus());
                  }
                  // extra states (e.g. success, error): announced, focusable, readable, activation per manifest, still under reduced motion
                  const baseStates = new Set(["default", "hover", "focus-visible", "active", "loading", "disabled"]);
                  for (const st of m.states.filter((x) => !baseStates.has(x))) {
                    const props = { status: st, ...(si === 0 ? {} : { skin: skin.id }) };
                    await mount(props);
                    await pg.mouse.move(0, 0); await settle(pg);
                    const said = await pg.evaluate(() => document.querySelector('#stage [role="status"]')?.textContent?.trim() ?? "");
                    assert(!!said, "state-announced", `${st}: the live region is empty`);
                    const sv = await visualContrast(pg);
                    assert(sv.ratio >= 4.5, "state-contrast", `${st}: label/mark ${sv.fg} on ${sv.bgLeft}/${sv.bgRight} = ${sv.ratio.toFixed(2)}:1 < 4.5`);
                    assert((await infiniteCount(pg)) === 0, "state-no-infinite", `${st}: an animation loops in a finished state`);
                    await pg.evaluate(() => { (window as any).__clicks = 0; document.getElementById("start")!.focus(); });
                    await pg.keyboard.press("Tab");
                    assert(await pg.evaluate(() => document.activeElement === document.getElementById("stage")!.firstElementChild), "state-keeps-focus", `${st}: no longer reachable with Tab`);
                    await pg.keyboard.press("Enter");
                    const clicks = await pg.evaluate(() => (window as any).__clicks as number);
                    const inert = m.a11y.inertStates.includes(st);
                    assert(inert ? clicks === 0 : clicks === 1, "state-activation", `${st}: ${clicks} click(s); ${inert ? "must be ignored" : "must be allowed (e.g. retry)"}`);
                    await pg.emulateMedia({ reducedMotion: "reduce" });
                    await mount(props); await settle(pg);
                    assert((await animCount(pg, false)) === 0, "state-reduced-motion", `${st}: animations active under prefers-reduced-motion`);
                    await pg.emulateMedia({ reducedMotion: "no-preference" });
                  }
                  await mount(si === 0 ? {} : { skin: skin.id });

                  if (!axeDone) {
                    axeDone = true;
                    collecting = false;
                    const res = await new AxeBuilder({ page: pg }).include("#stage").analyze();
                    collecting = true;
                    checks++;
                    for (const v of res.violations) fail(`axe:${v.id}`, `${v.help} (${v.nodes.length} node(s))`);
                  }
                }
              }
            }
          }
        }
        // loading spinner must stop under reduced motion (separate, because loading is not part of the idle matrix)
        if (m.states.includes("loading")) {
          combos++;
          const combo = "loading/reduce";
          for (const [motion, expectSpin] of [["no-preference", true], ["reduce", false]] as const) {
            await pg.emulateMedia({ reducedMotion: motion });
            await mount({ loading: true });
            await settle(pg);
            const spinning = (await infiniteCount(pg)) > 0;
            checks++;
            if (spinning !== expectSpin) findings.push({ ...baseCombo, combo, check: "loading-spinner-motion", level: "error", message: `spinner ${spinning ? "animates" : "is static"} under ${motion} (expected ${expectSpin ? "animation" : "static"})` });
          }
          await pg.emulateMedia({ reducedMotion: "no-preference" });
        }
        for (const e of pageErrors) findings.push({ ...baseCombo, combo: "page", check: "console-error", level: "error", message: e });
        checks++;
        await ctx.close();
      });
      await pool(jobs, 4);
    }
  } finally {
    await browser.close();
  }
  return { checks, combos, findings };
}
