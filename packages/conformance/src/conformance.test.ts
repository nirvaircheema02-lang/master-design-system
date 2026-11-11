import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { brandConfig } from "@master-ds/contracts";
import { masterTarget, runConformance } from "./index.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const REGISTRY = join(root, "packages/components/src");
const chromiumPath = process.env.PW_CHROMIUM || undefined;
const haveBrowser = !!chromiumPath || existsSync(chromium.executablePath());
const brand = brandConfig.parse(JSON.parse(readFileSync(join(root, "brands/finova.json"), "utf8")));

/** Run the real harness on a private, deliberately damaged copy of the Master. */
async function run(mutate: (dir: string) => void, only = "CTA-001", folder = "001-shimmer", cat = "cta") {
  const reg = mkdtempSync(join(tmpdir(), "master-mut-"));
  cpSync(REGISTRY, reg, { recursive: true });
  const dir = join(reg, cat, folder);
  mutate(dir);
  const work = mkdtempSync(join(tmpdir(), "master-conf-"));
  const target = await masterTarget(reg, brand, work);
  target.components = target.components.filter((c) => c.manifest.id === only);
  return runConformance([target], { workdir: work, chromiumPath, radii: ["default", "9999px"], modes: ["light"] });
}
const edit = (p: string, f: (s: string) => string) => writeFileSync(p, f(readFileSync(p, "utf8")));
const checks = (r: Awaited<ReturnType<typeof run>>) => new Set(r.findings.filter((f) => f.level === "error").map((f) => f.check));

test("baseline: an undamaged copy is clean", { skip: !haveBrowser, timeout: 120000 }, async () => {
  const r = await run(() => {});
  assert.deepEqual(r.findings.filter((f) => f.level === "error"), []);
  assert.ok(r.checks > 50);
});

test("catches: reduced-motion block removed", { skip: !haveBrowser, timeout: 120000 }, async () => {
  const r = await run((d) => edit(join(d, "cta-001.css"), (s) => s.slice(0, s.indexOf("@media (prefers-reduced-motion"))));
  assert.ok(checks(r).has("reduced-motion-animations"), [...checks(r)].join());
});

test("catches: focus outline removed", { skip: !haveBrowser, timeout: 120000 }, async () => {
  const r = await run((d) => edit(join(d, "cta-001.css"), (s) => s.replace(/outline: 2px solid var\(--ds-cta-focus\)/, "outline: none")));
  assert.ok(checks(r).has("focus-visible"), [...checks(r)].join());
});

test("catches: inner layer stops inheriting the radius", { skip: !haveBrowser, timeout: 120000 }, async () => {
  const r = await run((d) => edit(join(d, "cta-001.css"), (s) => s.replace("border-radius: inherit;", "border-radius: 0;")));
  assert.ok(checks(r).has("inner-layer-radius"), [...checks(r)].join());
});

test("catches: label colour equals fill (contrast)", { skip: !haveBrowser, timeout: 120000 }, async () => {
  const r = await run((d) => edit(join(d, "cta-001.css"), (s) => s.replace("color: var(--ds-cta-fg);", "color: var(--ds-cta-bg-hover);")));
  assert.ok(checks(r).has("contrast-rest"), [...checks(r)].join());
});

test("catches: not a real button (no Tab/keyboard support)", { skip: !haveBrowser, timeout: 120000 }, async () => {
  const r = await run((d) => edit(join(d, "Component.tsx"), (s) => s.replace("<button", "<div").replace("</button>", "</div>")));
  assert.ok(checks(r).has("tab-focus") || checks(r).has("keyboard-activation"), [...checks(r)].join());
});

test("catches: component stays animated while disabled", { skip: !haveBrowser, timeout: 120000 }, async () => {
  const r = await run((d) => edit(join(d, "cta-001.css"), (s) => s.replace('.ds-cta-001:not(:disabled):not([aria-disabled="true"]):hover::after', ".ds-cta-001:hover::after")));
  assert.ok(checks(r).has("disabled-no-motion"), [...checks(r)].join());
});

// ---- Phase 3 Wave 1: new checks must be able to fail too ----
const rep = (file: string, from: string | RegExp, to: string) => (d: string) => edit(join(d, file), (s) => { const out = s.replace(from, to); assert.notEqual(out, s, `mutation did not apply: ${String(from)}`); return out; });

test("catches (P1): loading uses disabled and drops focus", { skip: !haveBrowser, timeout: 120000 }, async () => {
  const r = await run(rep("Component.tsx", "disabled={disabled}", "disabled={disabled || loading}"));
  assert.ok(checks(r).has("loading-aria") || checks(r).has("loading-keeps-focus"), [...checks(r)].join());
});

test("catches (P1): loading still fires activation", { skip: !haveBrowser, timeout: 120000 }, async () => {
  const r = await run(rep("Component.tsx", "if (loading) { e.preventDefault(); return; }", ""));
  assert.ok(checks(r).has("loading-ignores-activation"), [...checks(r)].join());
});

test("catches (P2): hover colour snaps instead of transitioning", { skip: !haveBrowser, timeout: 120000 }, async () => {
  const r = await run(rep("cta-003.css", /transition: background-color[^;]*;/, ""), "CTA-003", "003-solid-fade");
  assert.ok(checks(r).has("fill-transition"), [...checks(r)].join());
});

test("catches: a skin that breaks label contrast", { skip: !haveBrowser, timeout: 120000 }, async () => {
  const r = await run(rep("skins.css", /(outline-invert"\] \{[^}]*?--ds-cta-fg: )var\(--ds-color-accent-ink\)/, "$1var(--ds-color-surface-base)"), "CTA-003", "003-solid-fade");
  assert.ok(checks(r).has("contrast-rest"), [...checks(r)].join());
});

test("catches: layered fill failure that host background-color cannot see (pixel contrast)", { skip: !haveBrowser, timeout: 120000 }, async () => {
  const r = await run(rep("skins.css", /(outline-wipe"\] \{[^}]*?--ds-cta-fg-hover: )var\(--ds-color-on-accent\)/, "$1var(--ds-color-accent-ink)"), "CTA-004", "004-fill-wipe");
  assert.ok(checks(r).has("contrast-hover"), [...checks(r)].join());
});

test("catches: inset cover layer stops following host radius minus ring width", { skip: !haveBrowser, timeout: 120000 }, async () => {
  const r = await run(rep("cta-005.css", "max(0px, calc(var(--ds-cta-radius) - var(--ds-cta-ring-width)))", "var(--ds-cta-radius)"), "CTA-005", "005-orbit-border");
  assert.ok(checks(r).has("inset-layer-radius"), [...checks(r)].join());
});

test("catches (P5): an animation that loops while idle", { skip: !haveBrowser, timeout: 120000 }, async () => {
  const r = await run((d) => edit(join(d, "cta-005.css"), (s) => s + "\n@layer effects { .ds-cta-005::before { animation: ds-cta-005-orbit 2s linear infinite; } }\n"), "CTA-005", "005-orbit-border");
  assert.ok(checks(r).has("no-infinite-at-rest"), [...checks(r)].join());
});

test("catches: wipe sweeps (moves) under reduced motion", { skip: !haveBrowser, timeout: 120000 }, async () => {
  const r = await run(rep("cta-004.css", "  .ds-cta-004::before { transform: none; opacity: 0; }", ""), "CTA-004", "004-fill-wipe");
  assert.ok(checks(r).has("reduced-motion-end-state") || checks(r).has("reduced-motion-animations"), [...checks(r)].join());
});

// ---- Phase 3 Wave 2 ----
test("catches: a visible duplicate label leaks into the accessible name (text roll)", { skip: !haveBrowser, timeout: 120000 }, async () => {
  const r = await run(rep("Component.tsx", '<span aria-hidden="true">{children}</span>', "<span>{children}</span>"), "CTA-007", "007-text-roll");
  assert.ok(checks(r).has("accessible-name"), [...checks(r)].join());
});

test("catches: href no longer renders a real link", { skip: !haveBrowser, timeout: 120000 }, async () => {
  const r = await run(rep("Component.tsx", "<a {...anchor} href={href}", "<a {...anchor}"), "CTA-012", "012-underline-draw");
  assert.ok(checks(r).has("link-variant"), [...checks(r)].join());
});

test("catches: a loading link still navigates", { skip: !haveBrowser, timeout: 120000 }, async () => {
  const r = await run((d) => edit(join(d, "Component.tsx"), (s) => { const i = s.indexOf("if (loading) { e.preventDefault(); return; }"); assert.ok(i > 0); return s.slice(0, i) + s.slice(i + "if (loading) { e.preventDefault(); return; }".length); }), "CTA-012", "012-underline-draw");
  assert.ok(checks(r).has("link-loading"), [...checks(r)].join());
});

test("catches: reduced-motion fallback flips the label but never shows the fill (pixel contrast)", { skip: !haveBrowser, timeout: 120000 }, async () => {
  const r = await run(rep("cta-008.css", /\.ds-cta-008::before \{ content: ""; position: absolute; inset: 0;[^}]*\}/, ""), "CTA-008", "008-icon-expansion");
  assert.ok(checks(r).has("contrast-hover"), [...checks(r)].join());
});

test("catches: a text CTA smaller than the WCAG target minimum", { skip: !haveBrowser, timeout: 120000 }, async () => {
  const r = await run(rep("cta-012.css", "min-height: 2rem;", "min-height: 0.5rem;"), "CTA-012", "012-underline-draw");
  assert.ok(checks(r).has("target-size"), [...checks(r)].join());
});

test("catches: press face keeps moving under reduced motion", { skip: !haveBrowser, timeout: 120000 }, async () => {
  const r = await run((d) => edit(join(d, "cta-013.css"), (s) => { const i = s.indexOf("@media (prefers-reduced-motion"); assert.ok(i > 0); return s.slice(0, i); }), "CTA-013", "013-press-depth");
  assert.ok(checks(r).has("reduced-motion-animations") || checks(r).has("reduced-motion-end-state"), [...checks(r)].join());
});

// ---- Phase 3 Wave 3 ----
test("catches: pointer tracking ignores prefers-reduced-motion", { skip: !haveBrowser, timeout: 120000 }, async () => {
  const r = await run(rep("Component.tsx", ' || prefersReducedMotion()', ""), "CTA-010", "010-spotlight");
  assert.ok(checks(r).has("pointer-reduced-motion"), [...checks(r)].join());
});

test("catches: a touch pointer drives the effect", { skip: !haveBrowser, timeout: 120000 }, async () => {
  const r = await run(rep("Component.tsx", 'e.pointerType === "touch" || ', ""), "CTA-010", "010-spotlight");
  assert.ok(checks(r).has("pointer-ignores-touch"), [...checks(r)].join());
});

test("catches: pointer state survives the pointer leaving", { skip: !haveBrowser, timeout: 120000 }, async () => {
  const r = await run((d) => edit(join(d, "Component.tsx"), (s) => { const o = s.replace(/e\.currentTarget\.style\.removeProperty\("--_m[xy]"\);\s*/g, ""); assert.notEqual(o, s); return o; }), "CTA-010", "010-spotlight");
  assert.ok(checks(r).has("pointer-clears-on-leave"), [...checks(r)].join());
});

test("catches: magnetic never reacts to the pointer", { skip: !haveBrowser, timeout: 120000 }, async () => {
  const r = await run((d) => edit(join(d, "Component.tsx"), (s) => { const o = s.replace(/el\.style\.setProperty\("--_t[xy]", [^;]*;\s*/g, ""); assert.notEqual(o, s); return o; }), "CTA-011", "011-magnetic");
  assert.ok(checks(r).has("pointer-tracks"), [...checks(r)].join());
});

test("catches: a finished success state still accepts activation", { skip: !haveBrowser, timeout: 120000 }, async () => {
  const r = await run(rep("Component.tsx", 'const inert = status === "loading" || status === "success";', 'const inert = status === "loading";'), "CTA-014", "014-status-morph");
  assert.ok(checks(r).has("state-activation"), [...checks(r)].join());
});

test("catches: error state blocks the retry", { skip: !haveBrowser, timeout: 120000 }, async () => {
  const r = await run(rep("Component.tsx", 'const inert = status === "loading" || status === "success";', 'const inert = status === "loading" || status === "success" || status === "error";'), "CTA-014", "014-status-morph");
  assert.ok(checks(r).has("state-activation"), [...checks(r)].join());
});

test("catches: success mark unreadable on its own fill (pixel contrast per state)", { skip: !haveBrowser, timeout: 120000 }, async () => {
  const r = await run(rep("cta-014.css", /(\[data-status="success"\] \{ background: var\(--ds-cta-ok-bg\); color: )var\(--ds-cta-ok-fg\)/, "$1var(--ds-cta-ok-bg)"), "CTA-014", "014-status-morph");
  assert.ok(checks(r).has("state-contrast"), [...checks(r)].join());
});

test("catches: a spinner that keeps looping after success", { skip: !haveBrowser, timeout: 120000 }, async () => {
  const r = await run((d) => edit(join(d, "cta-014.css"), (s) => s + '\n@layer effects { .ds-cta-014[data-status="success"] .ds-cta-014__spinner { animation: ds-cta-014-spin 1s linear infinite; } }\n'), "CTA-014", "014-status-morph");
  assert.ok(checks(r).has("state-no-infinite"), [...checks(r)].join());
});

// ---- Phase 4 Wave A: every archetype's checks must be able to fail ----
const T = (name: string, id: string, folder: string, cat: string, mutate: (d: string) => void, expect: string | string[]) =>
  test(name, { skip: !haveBrowser, timeout: 180000 }, async () => {
    const r = await run(mutate, id, folder, cat);
    const want = Array.isArray(expect) ? expect : [expect];
    assert.ok(want.some((w) => checks(r).has(w)), `expected one of ${want.join("|")}, got: ${[...checks(r)].join(",") || "nothing"}`);
  });
const CARD = ["CRD-004", "004-stretched-title", "crd"] as const;
T("catches (card): an interactive element nested inside the card link", ...CARD, rep("Component.tsx", "{title}</a>", "{title}<button type=\"button\">x</button></a>"), "no-nested-interactive");
T("catches (card): a second primary link", ...CARD, rep("Component.tsx", '{children ? <div className="ds-crd-004__text">{children}</div> : null}', '{children ? <div className="ds-crd-004__text">{children}<a href="#more">more</a></div> : null}'), "one-primary-link");
T("catches (card): the link is not stretched over the card", ...CARD, rep("crd-004.css", /\.ds-crd-004__link::after \{[^}]*\}/, ""), "stretched-hit-area");
T("catches (card): the card shows no focus ring", ...CARD, rep("crd-004.css", /\.ds-crd-004:has\(\.ds-crd-004__link:focus-visible\) \{[^}]*\}/, ""), "card-focus-ring");
T("catches (card): hover feedback is instant", ...CARD, rep("crd-004.css", /transition: background-color[^;]*;/, ""), "hover-transition");
T("catches (card): title is not a heading link", ...CARD, rep("Component.tsx", 'const Heading = `h${headingLevel}` as "h3";', 'const Heading = "div" as unknown as "h3";'), "link-in-heading");
T("catches (card): image zoom persists under reduced motion", "CRD-002", "002-image-zoom", "crd", rep("crd-002.css", /\.ds-crd-002:hover \.ds-crd-002__media img, \.ds-crd-002:has\(\.ds-crd-002__link:focus-visible\) \.ds-crd-002__media img \{ transform: none; \}/, ""), ["zoom-reduced-motion", "reduced-motion-animations"]);
T("catches (card): reveal panel visible at rest", "CRD-003", "003-hover-reveal", "crd", rep("crd-003.css", "opacity: 0; transition: opacity", "opacity: 1; transition: opacity"), "reveal-hidden-at-rest");
const FIELD = ["INP-001", "001-text-field", "inp"] as const;
T("catches (field): label not associated with the control", ...FIELD, rep("Component.tsx", "htmlFor={id}", ""), "visible-label");
T("catches (field): error text not linked by aria-describedby", ...FIELD, rep("Component.tsx", 'const describedBy = [describedByProp, hintId, errorId]', 'const describedBy = [describedByProp, hintId]'), "error-described");
T("catches (field): invalid state not exposed", ...FIELD, rep("Component.tsx", "aria-invalid={error ? true : undefined}", ""), "aria-invalid");
T("catches (field): control boundary below 3:1", ...FIELD, rep("skins.css", /--ds-field-border: var\(--ds-color-border-control\);/, "--ds-field-border: var(--ds-color-border-subtle);"), "control-border-contrast");
T("catches (field): focus ring removed", ...FIELD, rep("inp-001.css", /\.ds-inp-001__control:focus-visible \{[^}]*\}/, ""), "control-focus-visible");
const SUM = ["FRM-001", "001-error-summary", "frm"] as const;
T("catches (summary): focus does not move when it appears", ...SUM, rep("Component.tsx", "if (focusOnMount && count > 0) ref.current?.focus();", ""), "focus-on-appear");
T("catches (summary): error link does not focus the field", ...SUM, rep("Component.tsx", "target.focus();", ""), "link-focuses-field");
T("catches (summary): links are colour-only", ...SUM, rep("frm-001.css", "text-decoration: underline;", "text-decoration: none;"), "link-not-colour-only");
const ACC = ["ACC-002", "002-native-details", "acc"] as const;
T("catches (disclosure): no heading inside the summary", ...ACC, rep("Component.tsx", '<Heading className="ds-acc-002__title">{item.title}</Heading>', '<span className="ds-acc-002__title">{item.title}</span>'), "heading-in-summary");
T("catches (disclosure): exclusive mode does nothing", ...ACC, rep("Component.tsx", "name={exclusive ? group : undefined}", "name={undefined}"), "exclusive-mode");
T("catches (disclosure): chevron snaps", ...ACC, rep("acc-002.css", /transition: transform var\(--ds-acc-fade-duration\) var\(--ds-acc-fade-ease\);/, ""), "chevron-transition");
T("catches (nav): the item is not a real link", "NAV-001", "001-pill-item", "nav", (d) => edit(join(d, "Component.tsx"), (s) => s.replace("<a {...rest}", "<span {...(rest as object)}").replace("</a>", "</span>")), "real-link");
T("catches (nav): the current page has no cue without hover", "NAV-001", "001-pill-item", "nav", rep("nav-001.css", "background: var(--ds-nav-bg-current); color: var(--ds-nav-fg-current); font-weight: 700;", "color: var(--ds-nav-fg-current);"), "current-visible");
T("catches (nav): neither indicator nor weight marks the current page", "NAV-002", "002-indicator-item", "nav", (d) => { rep("nav-002.css", ".ds-nav-002:hover::after, .ds-nav-002:focus-visible::after, .ds-nav-002[data-current]::after { transform: scaleX(1); }", ".ds-nav-002:hover::after, .ds-nav-002:focus-visible::after { transform: scaleX(1); }")(d); rep("nav-002.css", ".ds-nav-002[data-current] { font-weight: 700; }", "")(d); }, "current-visible");
T("catches (nav): aria-current missing", "NAV-001", "001-pill-item", "nav", rep("Component.tsx", 'aria-current={current ? "page" : undefined}', ""), "aria-current-page");

// ---- Phase 4 Wave B: tabs, accordion, nav disclosure, dialog, menu ----
const TAB = ["TAB-001", "001-underline-tabs", "tab"] as const;
T("catches (tabs): activation param ignored (always automatic)", ...TAB, rep("Component.tsx", "activation={activation}", 'activation="automatic"'), ["manual-no-select-on-arrow", "manual-enter-selects"]);
T("catches (tabs): the indicator never moves", ...TAB, rep("tab-001.css", "transform: translateX(var(--_x, 0px)) scaleX(var(--_w, 0));", "transform: translateX(0px) scaleX(1);"), ["indicator-tracks", "indicator-follows-selection"]);
T("catches (tabs): focus ring removed", ...TAB, rep("tab-001.css", /\.ds-tab-001__tab:focus-visible, \.ds-tab-001__panel:focus-visible \{[^}]*\}/, ""), "tab-focus-visible");
T("catches (tabs): reduced-motion block removed", ...TAB, (d) => edit(join(d, "tab-001.css"), (s) => s.slice(0, s.indexOf("@media (prefers-reduced-motion"))), "reduced-motion-animations");
T("catches (tabs): the indicator slides with left/width (layout) instead of transform", ...TAB, (d) => { rep("tab-001.css", "transform: translateX(var(--_x, 0px)) scaleX(var(--_w, 0));\n    transition: transform var(--ds-tab-slide-duration) var(--ds-tab-slide-ease);", "left: var(--_x, 0px); width: calc(var(--_w, 0) * 1px);\n    transition: left var(--ds-tab-slide-duration) var(--ds-tab-slide-ease), width var(--ds-tab-slide-duration) var(--ds-tab-slide-ease);")(d); }, ["layout-animation-undeclared", "indicator-tracks"]);
T("catches (tabs): the list container keeps focus after pointer use (raw Radix list)", ...TAB, (d) => edit(join(d, "Component.tsx"), (s) => s.replace('import { Tabs,', 'import * as RT from "@radix-ui/react-tabs";\nimport { Tabs,').replace("<Tabs.List", "<RT.List").replace("</Tabs.List>", "</RT.List>")), "tab-lands-on-selected-after-pointer");
const ACC1 = ["ACC-001", "001-animated-accordion", "acc"] as const;
T("catches (accordion): height animation not declared in the manifest", ...ACC1, (d) => edit(join(d, "manifest.json"), (s) => s.replace('"layoutProps": [\n      "height"\n    ]', '"layoutProps": []')), "layout-animation-undeclared");
T("catches (accordion): reduced-motion block removed", ...ACC1, (d) => edit(join(d, "acc-001.css"), (s) => s.slice(0, s.indexOf("@media (prefers-reduced-motion"))), "reduced-motion-animations");
T("catches (accordion): the title is not inside a heading", ...ACC1, rep("Component.tsx", 'const Heading = `h${headingLevel}` as "h3";', 'const Heading = "div" as unknown as "h3";'), "heading-wraps-button");
T("catches (accordion): focus ring removed", ...ACC1, rep("acc-001.css", /\.ds-acc-001__trigger:focus-visible \{[^}]*\}/, ""), "trigger-focus-visible");
T("catches (accordion): opening one panel no longer closes the other", ...ACC1, rep("Component.tsx", 'type === "multiple"\n    ?', 'true\n    ?'), "single-mode");
const NAV3 = ["NAV-003", "003-menu-trigger", "nav"] as const;
T("catches (nav menu): hovering opens the panel", ...NAV3, rep("Component.tsx", "onBlur={", "onMouseEnter={() => setOpen(true)}\n      onBlur={"), "hover-does-not-open");
T("catches (nav menu): Escape does not return focus", ...NAV3, rep("Component.tsx", "      button.current?.focus();\n", ""), "escape-returns-focus");
T("catches (nav menu): menu roles on site navigation", ...NAV3, rep("Component.tsx", '<ul id={panelId}', '<ul role="menu" id={panelId}'), "no-menu-roles");
T("catches (nav menu): tabbing out leaves the panel open", ...NAV3, rep("Component.tsx", "onBlur={(e) => { if (open && !root.current?.contains(e.relatedTarget as Node | null)) setOpen(false); }}", ""), "blur-closes");
T("catches (nav menu): current link marked by colour alone", ...NAV3, rep("nav-003.css", "{ background: var(--ds-nav-bg-current); color: var(--ds-nav-fg-current); font-weight: 600; }", "{ color: var(--ds-nav-fg-current); }"), ["current-not-colour-only", "current-contrast"]);
const DLG1 = ["DLG-001", "001-modal", "dlg"] as const;
T("catches (dialog): portalled outside the brand scope", ...DLG1, rep("Component.tsx", "<Dialog.Portal container={container}>", "<Dialog.Portal>"), "dialog-in-theme-scope");
T("catches (dialog): close control has no name", ...DLG1, rep("Component.tsx", ' aria-label={closeLabel}', ""), "close-named");
T("catches (dialog): no scrim", ...DLG1, rep("dlg-001.css", "background: var(--ds-dlg-scrim); }", "background: transparent; }"), "scrim-visible");
T("catches (dialog): exit animation never ends", ...DLG1, rep("dlg-001.css", "animation: ds-dlg-001-out var(--ds-dlg-exit-duration) var(--ds-dlg-ease) forwards;", "animation: ds-dlg-001-out var(--ds-dlg-exit-duration) var(--ds-dlg-ease) infinite;"), "exit-completes");
T("catches (dialog): focus is not returned to the trigger", ...DLG1, rep("Component.tsx", "<Dialog.Content className", "<Dialog.Content onCloseAutoFocus={(e) => e.preventDefault()} className"), ["escape-returns-focus", "close-returns-focus"]);
T("catches (dialog): reduced-motion block removed", ...DLG1, (d) => edit(join(d, "dlg-001.css"), (s) => s.slice(0, s.indexOf("@media (prefers-reduced-motion"))), "reduced-motion-animations");
T("catches (dialog): no description wired", ...DLG1, rep("Component.tsx", '<Dialog.Description className="ds-dlg-001__description">{description}</Dialog.Description>', ""), "dialog-described");
const MENU1 = ["DLG-003", "003-dropdown-menu", "dlg"] as const;
T("catches (menu): destructive item unreadable", ...MENU1, rep("dlg-003.css", "[data-destructive] { color: var(--ds-menu-danger); }", "[data-destructive] { color: var(--ds-menu-bg-highlight); }"), "destructive-contrast");
T("catches (menu): the highlighted item is invisible", ...MENU1, rep("dlg-003.css", "[data-highlighted] { background: var(--ds-menu-bg-highlight); color: var(--ds-menu-fg-highlight); }", ""), ["highlight-visible", "item-focus-ring"]);
T("catches (menu): no keyboard focus ring on items", ...MENU1, rep("dlg-003.css", /\.ds-dlg-003__item:focus-visible \{[^}]*\}/, ""), "item-focus-ring");
T("catches (menu): portalled outside the brand scope", ...MENU1, rep("Component.tsx", "<Menu.Portal container={container}>", "<Menu.Portal>"), "menu-in-theme-scope");
T("catches (menu): arrow keys do not wrap", ...MENU1, rep("Component.tsx", " loop>", ">"), "arrow-wraps");
T("catches (menu): reduced-motion block removed", ...MENU1, (d) => edit(join(d, "dlg-003.css"), (s) => s.slice(0, s.indexOf("@media (prefers-reduced-motion"))), "reduced-motion-animations");

// ---- Phase 4 Wave C: page-level components (P12 page fixture) ----
const SKIP = ["NAV-008", "008-skip-link", "nav"] as const;
T("catches (skip link): display:none at rest (unreachable by keyboard)", ...SKIP, rep("nav-008.css", "transform: translateY(calc(-100% - 1.5rem));", "display: none;"), ["hidden-but-focusable", "first-tab-stop"]);
T("catches (skip link): always visible", ...SKIP, rep("nav-008.css", "    transform: translateY(calc(-100% - 1.5rem));\n", ""), "hidden-until-focus");
T("catches (skip link): activating moves no focus", ...SKIP, rep("Component.tsx", "    el.focus();\n", ""), "moves-focus-to-main");
T("catches (skip link): no focus ring", ...SKIP, rep("nav-008.css", /\.ds-nav-008:focus-visible \{[^}]*\}/, ""), "link-focus-visible");
T("catches (skip link): it slides in with a transition", ...SKIP, rep("nav-008.css", "transform: translateY(calc(-100% - 1.5rem));", "transform: translateY(calc(-100% - 1.5rem)); transition: transform 300ms ease;"), "skip-no-motion");
T("catches (skip link): label as dark as its fill", ...SKIP, rep("skins.css", "--ds-nav-skip-fg: var(--ds-color-on-accent);", "--ds-nav-skip-fg: var(--ds-color-accent);"), "contrast");
const CRUMB = ["NAV-009", "009-breadcrumb", "nav"] as const;
T("catches (breadcrumb): current page not marked", ...CRUMB, rep("Component.tsx", 'className="ds-nav-009__current" aria-current="page"', 'className="ds-nav-009__current"'), "aria-current-last");
T("catches (breadcrumb): separators read out as content", ...CRUMB, rep("nav-009.css", ' content: "/" / "";', ""), "separators-not-content");
T("catches (breadcrumb): links not underlined", ...CRUMB, rep("nav-009.css", "text-decoration: underline;", "text-decoration: none;"), "link-not-colour-only");
T("catches (breadcrumb): the nav has no name", ...CRUMB, rep("Component.tsx", " aria-label={label}", ""), ["landmark-name", "nav-named"]);
T("catches (breadcrumb): a long trail scrolls sideways instead of wrapping", ...CRUMB, rep("nav-009.css", "flex-wrap: wrap;", "flex-wrap: nowrap; white-space: nowrap;"), "reflow-320");
const HDR6 = ["NAV-006", "006-sticky-header", "nav"] as const;
T("catches (sticky header): not sticky", ...HDR6, rep("nav-006.css", "position: sticky; top: 0;", "position: relative; top: 0;"), ["position-sticky", "stays-pinned"]);
T("catches (sticky header): no scroll-padding-top (focus slides under it)", ...HDR6, rep("Component.tsx", "root.style.scrollPaddingTop = `${el.offsetHeight + 8}px`;", ""), ["scroll-padding-top", "focus-not-obscured", "anchor-not-hidden"]);
T("catches (sticky header): scroll-padding smaller than the header", ...HDR6, rep("Component.tsx", "`${el.offsetHeight + 8}px`", "`${Math.round(el.offsetHeight / 3)}px`"), ["scroll-padding-top", "focus-not-obscured", "anchor-not-hidden"]);
T("catches (sticky header): two navs share a name", ...HDR6, rep("Component.tsx", "<nav aria-label={navLabel}>", '<nav aria-label="Footer">'), "nav-names-unique");
T("catches (sticky header): nothing separates it from the page", ...HDR6, (d) => { rep("nav-006.css", "border-bottom: 1px solid var(--ds-nav-header-border); box-shadow: var(--ds-nav-header-shadow);", "")(d); }, "header-delineated");
const HDR7 = ["NAV-007", "007-hide-on-scroll-header", "nav"] as const;
T("catches (hide-on-scroll): Tab does not reveal the hidden header", ...HDR7, rep("Component.tsx", 'if (e.key === "Tab") set(false);', ""), "tab-reveals-header");
T("catches (hide-on-scroll): the hidden header stays in the tab order", ...HDR7, rep("nav-007.css", "transform: translateY(-100%); visibility: hidden;", "transform: translateY(-100%);"), "hidden-not-tabbable");
T("catches (hide-on-scroll): it never hides", ...HDR7, rep("Component.tsx", "dy > THRESHOLD && !el.contains(document.activeElement)", "dy > 100000"), "hides-on-scroll-down");
T("catches (hide-on-scroll): reduced-motion block removed", ...HDR7, (d) => edit(join(d, "nav-007.css"), (s) => s.slice(0, s.indexOf("@media (prefers-reduced-motion"))), "reduced-motion-animations");
T("catches (hide-on-scroll): it hides while focus is inside it", ...HDR7, rep("Component.tsx", "dy > THRESHOLD && !el.contains(document.activeElement)", "dy > THRESHOLD"), "focus-keeps-open");
const TOAST = ["TST-001", "001-toast-stack", "tst"] as const;
T("catches (toast): the status live region only exists with content", ...TOAST, rep("Component.tsx", 'role="status" aria-live="polite" aria-atomic="false"', ""), "status-region-exists-first");
T("catches (toast): a toast steals focus", ...TOAST, rep("Component.tsx", "const paused = hover || focus;", 'const paused = hover || focus;\n  useEffect(() => { region.current?.querySelector<HTMLElement>("button")?.focus(); }, [items.length]);'), "toast-takes-no-focus");
T("catches (toast): a critical toast auto-dismisses", ...TOAST, rep("Component.tsx", 'const total = tone === "critical" ? 0 : item.durationMs ?? DEFAULT_MS;', "const total = item.durationMs ?? DEFAULT_MS;"), "critical-never-dismisses");
T("catches (toast): hover does not pause the timer", ...TOAST, rep("Component.tsx", "const paused = hover || focus;", "const paused = focus;"), "hover-pauses");
T("catches (toast): focused controls slide under the stack", ...TOAST, rep("Component.tsx", "root.style.scrollPaddingBottom = `${el.offsetHeight + 24}px`;", ""), ["scroll-padding-bottom", "focus-not-covered"]);
T("catches (toast): the close control does not say what it dismisses", ...TOAST, rep("Component.tsx", "aria-label={`Dismiss: ${item.title}`}", 'aria-label="Dismiss"'), "close-named");
T("catches (toast): the tone is colour and icon only", ...TOAST, rep("Component.tsx", '<span className="ds-tst-001__tone">{TONE_LABEL[tone]}: </span>', ""), "tone-not-colour-only");
T("catches (toast): reduced-motion block removed", ...TOAST, (d) => edit(join(d, "tst-001.css"), (s) => s.slice(0, s.indexOf("@media (prefers-reduced-motion"))), "reduced-motion-animations");
T("catches (toast): focus is lost to <body> after dismissing", ...TOAST, rep("Component.tsx", '(region.current?.querySelector<HTMLElement>(".ds-tst-001__close") ?? returnTo.current)?.focus();', ""), "focus-not-lost");
T("catches (toast): timers keep running while focus is inside", ...TOAST, rep("Component.tsx", "const paused = hover || focus;", "const paused = hover;"), "focus-pauses");

// ---- Phase 4 Wave C rest: mega menu, drawer, popover, tooltip ----
const MEGA = ["NAV-005", "005-mega-menu", "nav"] as const;
T("catches (mega menu): menu roles on site navigation", ...MEGA, rep("Component.tsx", 'className="ds-nav-005__panel" data-state', 'role="menu" className="ds-nav-005__panel" data-state'), "no-menu-roles");
T("catches (mega menu): Escape does not return focus", ...MEGA, rep("Component.tsx", '      root.current?.querySelector<HTMLElement>(`[data-index="${open}"]`)?.focus();\n', ""), "escape-returns-focus");
T("catches (mega menu): hovering opens a panel", ...MEGA, rep("Component.tsx", "onClick={() => setOpen(open === i ? null : i)}>", "onClick={() => setOpen(open === i ? null : i)} onMouseEnter={() => setOpen(i)}>"), "hover-does-not-open");
T("catches (mega menu): tabbing out leaves a panel open", ...MEGA, rep("Component.tsx", /\n      onBlur=\{[^\n]*\n/, "\n"), "blur-closes");
// In Chromium a click outside also blurs the button, so the blur handler alone closes the panel; Safari does not focus buttons on click,
// which is why the pointerdown listener exists. Remove BOTH to prove the check can fail.
T("catches (mega menu): neither a click outside nor a blur closes", ...MEGA, (d) => { rep("Component.tsx", '    document.addEventListener("pointerdown", onDown);\n', "")(d); rep("Component.tsx", /\n      onBlur=\{[^\n]*\n/, "\n")(d); }, ["outside-click-closes", "blur-closes"]);
T("catches (mega menu): group headings unreadable", ...MEGA, rep("nav-005.css", "color: var(--ds-nav-mega-heading); font-size: 0.8125rem; font-weight: 700;", "color: var(--ds-nav-panel-bg); font-size: 0.8125rem; font-weight: 700;"), "heading-contrast");
T("catches (mega menu): reduced-motion block removed", ...MEGA, (d) => edit(join(d, "nav-005.css"), (s) => s.slice(0, s.indexOf("@media (prefers-reduced-motion"))), "reduced-motion-animations");
T("catches (mega menu): the panel overflows a narrow viewport", ...MEGA, rep("nav-005.css", "width: var(--ds-nav-mega-width);", "width: 48rem;"), ["reflow-320", "panel-in-viewport"]);
const DRAWER = ["NAV-004", "004-drawer", "nav"] as const;
T("catches (drawer): portalled outside the brand scope", ...DRAWER, rep("Component.tsx", "<Dialog.Portal container={container}>", "<Dialog.Portal>"), "drawer-in-theme-scope");
T("catches (drawer): the drawer covers the whole viewport", ...DRAWER, rep("nav-004.css", "width: var(--ds-nav-drawer-width);", "width: 100vw;"), "drawer-leaves-scrim");
T("catches (drawer): choosing a link leaves the drawer open", ...DRAWER, rep("Component.tsx", '<Dialog.Close asChild><a className="ds-nav-004__link" href={l.href} aria-current={l.current ? "page" : undefined}>{l.label}</a></Dialog.Close>', '<a className="ds-nav-004__link" href={l.href} aria-current={l.current ? "page" : undefined}>{l.label}</a>'), "link-closes-drawer");
T("catches (drawer): exit animation never ends", ...DRAWER, rep("nav-004.css", "animation: ds-nav-004-out-left var(--ds-nav-drawer-exit-duration) var(--ds-nav-drawer-ease) forwards;", "animation: ds-nav-004-out-left var(--ds-nav-drawer-exit-duration) var(--ds-nav-drawer-ease) infinite;"), "exit-completes");
T("catches (drawer): no scrim", ...DRAWER, rep("nav-004.css", "background: var(--ds-nav-drawer-scrim);", "background: transparent;"), "scrim-visible");
T("catches (drawer): the nav inside has no name", ...DRAWER, rep("Component.tsx", "<nav aria-label={navLabel}>", "<nav>"), "drawer-nav");
T("catches (drawer): reduced-motion block removed", ...DRAWER, (d) => edit(join(d, "nav-004.css"), (s) => s.slice(0, s.indexOf("@media (prefers-reduced-motion"))), "reduced-motion-animations");
const POP = ["DLG-002", "002-popover", "dlg"] as const;
T("catches (popover): keyboard focus is trapped inside", ...POP, rep("Component.tsx", " onKeyDown={leave}", ""), "tab-out-closes");
T("catches (popover): no accessible name", ...POP, rep("Component.tsx", " aria-label={label}", ""), "popover-named");
T("catches (popover): portalled outside the brand scope", ...POP, rep("Component.tsx", "<Popover.Portal container={container}>", "<Popover.Portal>"), "popover-in-theme-scope");
T("catches (popover): close control has no name", ...POP, rep("Component.tsx", " aria-label={closeLabel}", ""), "close-control");
T("catches (popover): reduced-motion block removed", ...POP, (d) => edit(join(d, "dlg-002.css"), (s) => s.slice(0, s.indexOf("@media (prefers-reduced-motion"))), "reduced-motion-animations");
const TIP = ["TIP-001", "001-tooltip", "tip"] as const;
T("catches (tooltip): the trigger is not a real button", ...TIP, rep("Component.tsx", '<button type="button" className="ds-tip-001__trigger">{children}</button>', '<span className="ds-tip-001__trigger">{children}</span>'), ["trigger-focusable", "shows-on-focus"]);
T("catches (tooltip): text as dark as its background", ...TIP, rep("tip-001.css", "background: var(--ds-tip-bg); color: var(--ds-tip-fg);", "background: var(--ds-tip-bg); color: var(--ds-tip-bg);"), "text-contrast");
T("catches (tooltip): the hover delay is ignored", ...TIP, rep("Component.tsx", "delayDuration={delayMs}", "delayDuration={0}"), "hover-delay");
T("catches (tooltip): interactive content inside", ...TIP, rep("Component.tsx", "{content}</Tooltip.Content>", '{content}<a href="#s1">more</a></Tooltip.Content>'), "tooltip-not-interactive");
T("catches (tooltip): portalled outside the brand scope", ...TIP, rep("Component.tsx", "<Tooltip.Portal container={container}>", "<Tooltip.Portal>"), "tooltip-in-theme-scope");
T("catches (tooltip): reduced-motion block removed", ...TIP, (d) => edit(join(d, "tip-001.css"), (s) => s.slice(0, s.indexOf("@media (prefers-reduced-motion"))), "reduced-motion-animations");

// ---- Phase 4 Wave D: forms and data ----
const TXA = ["INP-003", "003-textarea", "inp"] as const;
T("catches (textarea): no always-present status region", ...TXA, rep("Component.tsx", '<div className="ds-inp-003__vh" role="status" aria-live="polite">{spoken}</div>', ""), "status-region-exists-first");
T("catches (textarea): the count is announced on every keystroke", ...TXA, rep("Component.tsx", "), 1000);", "), 0);"), "not-announced-per-keystroke");
T("catches (textarea): typing past the limit is blocked", ...TXA, rep("Component.tsx", "rows={rows} className=", "rows={rows} maxLength={limit} className="), "over-limit-not-blocked");
T("catches (textarea): the visible count is read out as well", ...TXA, rep("Component.tsx", ' aria-hidden="true">{text ?', ">{text ?"), "count-not-read-twice");
T("catches (textarea): invalid state not exposed", ...TXA, rep("Component.tsx", " aria-invalid={error ? true : undefined}", ""), "aria-invalid");
T("catches (textarea): over-limit count unreadable", ...TXA, rep("inp-003.css", "color: var(--ds-field-error); font-weight: 600; }\n  .ds-inp-003__control:disabled", "color: var(--ds-field-bg); font-weight: 600; }\n  .ds-inp-003__control:disabled"), "over-limit-contrast");
const SEL = ["INP-005", "005-select", "inp"] as const;
T("catches (select): label not associated with the control", ...SEL, rep("Component.tsx", "htmlFor={id}", ""), "visible-label");
T("catches (select): focus ring removed", ...SEL, rep("inp-005.css", /\.ds-inp-005__control:focus-visible \{[^}]*\}/, ""), "control-focus-visible");
T("catches (select): boundary below 3:1", ...SEL, rep("skins.css", "--ds-field-border: var(--ds-color-border-control);", "--ds-field-border: var(--ds-color-border-subtle);"), "control-border-contrast");
const CHK = ["INP-004", "004-checkbox", "inp"] as const;
T("catches (checkbox): the native input is gone", ...CHK, rep("inp-004.css", "opacity: 0; cursor: pointer; z-index: 1; }", "display: none; }"), ["native-input-on-top", "focus-reachable"]);
T("catches (checkbox): checked state shown by colour alone", ...CHK, rep("inp-004.css", "  .ds-inp-004__input:checked + .ds-inp-004__box svg { opacity: 1; }\n", ""), "state-not-colour-only");
T("catches (checkbox): control boundary vanishes", ...CHK, rep("inp-004.css", "border: var(--ds-choice-border-width) solid var(--ds-choice-border);\n    border-radius", "border: var(--ds-choice-border-width) solid var(--ds-choice-bg);\n    border-radius"), "control-border-contrast");
T("catches (checkbox): no legend", ...CHK, rep("Component.tsx", '<legend className="ds-inp-004__legend">{legend}</legend>', ""), "fieldset-legend");
T("catches (checkbox): focus ring removed", ...CHK, rep("inp-004.css", /\.ds-inp-004__input:focus-visible \+ \.ds-inp-004__box \{[^}]*\}/, ""), "focus-visible");
T("catches (checkbox): the error is not linked to the group", ...CHK, rep("Component.tsx", "data-invalid={error ? \"\" : undefined} aria-describedby={describedBy}>", "data-invalid={error ? \"\" : undefined}>"), "error-described");
T("catches (checkbox): reduced-motion block removed", ...CHK, (d) => edit(join(d, "inp-004.css"), (s) => s.slice(0, s.indexOf("@media (prefers-reduced-motion"))), "reduced-motion-animations");
const RAD = ["INP-006", "006-radio-group", "inp"] as const;
T("catches (radio): the radios do not form one group", ...RAD, rep("Component.tsx", "name={name} value={o.value}", "name={`${name}-${i}`} value={o.value}"), ["radios-share-a-name", "arrows-move-and-select"]);
T("catches (radio): selected state shown by colour alone", ...RAD, rep("inp-006.css", "  .ds-inp-006__input:checked + .ds-inp-006__dot::after { opacity: 1; }\n", ""), "state-not-colour-only");
T("catches (radio): focus ring removed", ...RAD, rep("inp-006.css", /\.ds-inp-006__input:focus-visible \+ \.ds-inp-006__dot \{[^}]*\}/, ""), "focus-visible");
const SW = ["INP-007", "007-switch", "inp"] as const;
T("catches (switch): the thumb never moves", ...SW, rep("inp-007.css", "background: var(--ds-choice-thumb-on); transform: translateX(calc(var(--ds-choice-track-w) - var(--ds-choice-track-h))); }", "background: var(--ds-choice-thumb-on); }"), "state-not-colour-only");
T("catches (switch): not exposed as a switch", ...SW, rep("Component.tsx", 'type="checkbox" role="switch"', 'type="checkbox"'), "role-switch");
T("catches (switch): thumb vanishes on the OFF track", ...SW, rep("inp-007.css", "border-radius: 50%; background: var(--ds-choice-thumb);", "border-radius: 50%; background: var(--ds-choice-track-off);"), "thumb-off-contrast");
T("catches (switch): the thumb and track jump instead of sliding", ...SW, (d) => { rep("inp-007.css", "transition: transform var(--ds-choice-fade-duration) var(--ds-choice-fade-ease), background-color var(--ds-choice-fade-duration) var(--ds-choice-fade-ease);", "")(d); rep("inp-007.css", "transition: background-color var(--ds-choice-fade-duration) var(--ds-choice-fade-ease);\n  }\n  .ds-inp-007__thumb", "}\n  .ds-inp-007__thumb")(d); }, "check-transition");
const STAT = ["CRD-005", "005-stat-card", "crd"] as const;
T("catches (stat): the label is not tied to its value", ...STAT, rep("Component.tsx", '<dt className="ds-crd-005__label">{label}</dt>', '<dd className="ds-crd-005__label">{label}</dd>'), "label-tied-to-value");
T("catches (stat): up, down and flat look the same", ...STAT, rep("Component.tsx", 'up: "M10 15V5M5.5 9.5L10 5l4.5 4.5", down: "M10 5v10M5.5 10.5L10 15l4.5-4.5", flat: "M4.5 10h11"', 'up: "M4.5 10h11", down: "M4.5 10h11", flat: "M4.5 10h11"'), "direction-arrow-differs");
T("catches (stat): direction not available as text", ...STAT, rep("Component.tsx", '<span className="ds-crd-005__vh">{WORDS[delta.direction]} </span>', ""), "direction-in-words");
T("catches (stat): positive change unreadable", ...STAT, rep("crd-005.css", 'data-intent="positive"] { color: var(--ds-stat-up); }', 'data-intent="positive"] { color: var(--ds-stat-bg); }'), "delta-contrast");
T("catches (stat): a link inside a static card", ...STAT, rep("Component.tsx", '<dt className="ds-crd-005__label">{label}</dt>', '<dt className="ds-crd-005__label">{label}<a href="#s1">i</a></dt>'), "not-interactive");
T("catches (stat): numbers without tabular figures", ...STAT, rep("crd-005.css", "font-variant-numeric: tabular-nums; ", ""), "tabular-figures");
const PAG = ["NAV-010", "010-pagination", "nav"] as const;
T("catches (pagination): the window ignores neighbours", ...PAG, rep("Component.tsx", "siblings = 1", "siblings = 0"), "window");
T("catches (pagination): an ellipsis is exposed", ...PAG, rep("Component.tsx", 'className="ds-nav-010__gap" aria-hidden="true"', 'className="ds-nav-010__gap"'), "ellipsis-not-a-link");
T("catches (pagination): the current page is not marked", ...PAG, rep("Component.tsx", ' aria-current={it === page ? "page" : undefined}', ""), ["page-names", "current-not-colour-only"]);
T("catches (pagination): Previous is a dead link on page 1", ...PAG, rep("Component.tsx", "{page > 1 ? <a", "{true ? <a"), "first-page-no-prev-link");
T("catches (pagination): the nav has no name", ...PAG, rep("Component.tsx", " aria-label={label}", ""), ["nav-named", "nav-names-unique"]);
T("catches (pagination): focus ring removed", ...PAG, rep("nav-010.css", /\.ds-nav-010__link:focus-visible \{[^}]*\}/, ""), "link-focus-visible");
T("catches (pagination): reduced-motion block removed", ...PAG, (d) => edit(join(d, "nav-010.css"), (s) => s.slice(0, s.indexOf("@media (prefers-reduced-motion"))), "reduced-motion-animations");
const TBL = ["TBL-001", "001-data-table", "tbl"] as const;
T("catches (table): column headers without scope", ...TBL, rep("Component.tsx", 'scope="col" ', ""), "header-scopes");
T("catches (table): aria-sort on every sortable column", ...TBL, rep("Component.tsx", "aria-sort={c.sortable && sort?.id === c.id ? sort.direction : undefined}", 'aria-sort={c.sortable ? (sort?.id === c.id ? sort.direction : "none") : undefined}'), "unsorted-by-default");
T("catches (table): a sort is never announced", ...TBL, rep("Component.tsx", "    setSaid(`Sorted by ${c.label}, ${direction}`);\n", ""), "sort-announced");
T("catches (table): the scroll region cannot be focused", ...TBL, rep("Component.tsx", " tabIndex={0}", ""), "scroll-region");
T("catches (table): numbers sorted as text", ...TBL, rep("Component.tsx", "col?.numeric ? Number(a[sort.id]) - Number(b[sort.id]) :", "false ? 0 :"), "sorts-ascending");
T("catches (table): numeric columns left-aligned", ...TBL, rep("tbl-001.css", "text-align: end; font-variant-numeric: tabular-nums; }", "text-align: start; font-variant-numeric: tabular-nums; }"), "numeric-right-aligned");
T("catches (table): no caption", ...TBL, rep("Component.tsx", '<caption id={capId} className="ds-tbl-001__caption">{caption}</caption>', ""), ["caption", "scroll-region"]);
T("catches (table): the page scrolls instead of the table", ...TBL, rep("tbl-001.css", ".ds-tbl-001__scroll { overflow-x: auto;", ".ds-tbl-001__scroll { overflow-x: visible; white-space: nowrap;"), "reflow-320");
T("catches (table): sort button focus ring removed", ...TBL, rep("tbl-001.css", /\.ds-tbl-001__sort:focus-visible \{[^}]*\}/, ""), "sort-focus-visible");
T("catches (table): reduced-motion block removed", ...TBL, (d) => edit(join(d, "tbl-001.css"), (s) => s.slice(0, s.indexOf("@media (prefers-reduced-motion"))), "reduced-motion-animations");

// ---- Designs: structurally different looks of the same component (props.design) ----
T("catches (design/tabs): vertical tabs keep the horizontal keyboard model", ...TAB, rep("Component.tsx", 'orientation={design === "vertical" ? "vertical" : "horizontal"}', 'orientation="horizontal"'), "arrow-right-moves-focus");
T("catches (design/tabs): the pill label is unreadable on its fill", ...TAB, rep("tab-001.css", "background: var(--ds-tab-bg-active); color: var(--ds-tab-fg-on-active); }", "background: var(--ds-tab-bg-active); color: var(--ds-tab-bg-active); }"), "contrast-selected");
T("catches (design/input): the floating label stays on top of the value", ...FIELD, rep("inp-001.css", ".ds-inp-001[data-design=\"floating\"] .ds-inp-001__control:not(:placeholder-shown) ~ .ds-inp-001__label { transform: translateY(-0.5rem) scale(0.78); font-weight: 600; }", ".ds-inp-001[data-design=\"floating\"] .ds-inp-001__control:not(:placeholder-shown) ~ .ds-inp-001__label { font-weight: 600; }"), "floating-label-floats");
T("catches (design/header): the accent bar's current link is unreadable", ...HDR6, rep("nav-006.css", 'data-design="accent"] .ds-nav-006__link[aria-current="page"] { background: var(--ds-nav-header-accent-fg); color: var(--ds-nav-header-accent-bg); }', 'data-design="accent"] .ds-nav-006__link[aria-current="page"] { background: var(--ds-nav-header-accent-fg); color: var(--ds-nav-header-accent-fg); }'), "current-contrast");
T("catches (design/header): the floating header ignores its own offset", ...HDR6, rep("Component.tsx", "el.offsetHeight + (parseFloat(getComputedStyle(el).top) || 0) + 8", "el.offsetHeight"), ["scroll-padding-top", "focus-not-obscured", "anchor-not-hidden"]);
T("catches (design/dialog): the bottom sheet slides off screen", ...DLG1, rep("dlg-001.css", "inset: auto 0 0 0; margin: 0 auto;", "inset: auto 0 -200px 0; margin: 0 auto;"), "dialog-fits-viewport");
T("catches (design/dialog): the side panel is wider than the viewport", ...DLG1, rep("dlg-001.css", "width: var(--ds-dlg-side-width); height: 100%;", "width: 200vw; height: 100%;"), "dialog-fits-viewport");
T("catches (design/card): the picture of the horizontal card covers the link", ...CARD, rep("crd-004.css", '.ds-crd-004[data-design="horizontal"] .ds-crd-004__media { flex: 0 0 38%;', '.ds-crd-004[data-design="horizontal"] .ds-crd-004__media { position: relative; z-index: 3; flex: 0 0 38%;'), "stretched-hit-area");
T("catches (design/table): the rows design loses its cell contrast", ...TBL, rep("tbl-001.css", ".ds-tbl-001[data-design=\"rows\"] .ds-tbl-001__td { background: var(--ds-tbl-bg);", ".ds-tbl-001[data-design=\"rows\"] .ds-tbl-001__td { background: var(--ds-tbl-fg);"), ["cell-contrast", "striped-row-contrast"]);

// ---- atoms ----
const ICN = ["ICN-001", "001-icon", "icn"] as const;
T("catches (atom/icon): a decorative icon is announced", ...ICN, rep("Component.tsx", '{ "aria-hidden": true }', "{}"), "decorative-by-default");
T("catches (atom/icon): a labelled icon has no accessible name", ...ICN, rep("Component.tsx", 'role: "img", "aria-label": label', 'role: "img"'), "labelled-icon");
const BDG = ["BDG-001", "001-badge", "bdg"] as const;
T("catches (atom/badge): a badge is made interactive", ...BDG, rep("Component.tsx", "{children}</span>;", "<button type=\"button\">{children}</button></span>;"), "not-interactive");
const CHIP = ["BDG-002", "002-chip", "bdg"] as const;
T("catches (atom/chip): toggle state not exposed", ...CHIP, rep("Component.tsx", "aria-pressed={on}", ""), "aria-pressed");
T("catches (atom/chip): remove button has no specific name", ...CHIP, rep("Component.tsx", "aria-label={removeLabel ?? `Remove ${text}`}", 'aria-label="Remove"'), "remove-named");
T("catches (atom/chip): remove does nothing", ...CHIP, rep("Component.tsx", "setGone(true); ", ""), "remove-removes");
const AVT = ["AVT-001", "001-avatar", "avt"] as const;
T("catches (atom/avatar): no accessible name", ...AVT, rep("Component.tsx", 'role="img" aria-label={name}', 'role="img"'), "avatar-named");
T("catches (atom/avatar): broken image shows nothing", ...AVT, rep("Component.tsx", "onError={() => setFailed(true)}", ""), "broken-image-falls-back");
const LDR1 = ["LDR-001", "001-spinner", "ldr"] as const;
T("catches (atom/spinner): keeps spinning under reduced motion", ...LDR1, rep("ldr-001.css", ".ds-ldr-001__shape, .ds-ldr-001__shape i { animation: none; }", ""), "reduced-motion-animations");
const LDR2 = ["LDR-002", "002-progress", "ldr"] as const;
T("catches (atom/progress): value not exposed", ...LDR2, rep("Component.tsx", '{ "aria-valuenow": v }', "{}"), "progressbar-values");
T("catches (atom/progress): fill ignores the value", ...LDR2, rep("ldr-002.css", "transform: scaleX(var(--_p, 0));", "transform: scaleX(1);"), "fill-scales");
const LNK = ["TXT-003", "003-link", "txt"] as const;
T("catches (atom/link): link relies on colour alone", ...LNK, rep("txt-003.css", "text-decoration: underline; text-decoration-thickness: 1px;", "text-decoration: none; text-decoration-thickness: 1px;"), "link-not-colour-only");
const HEAD = ["TXT-001", "001-heading", "txt"] as const;
T("catches (atom/heading): size scale flattens", ...HEAD, rep("txt-001.css", '.ds-txt-001[data-size="4xl"] { font-size: var(--ds-type-size-4xl);', '.ds-txt-001[data-size="4xl"] { font-size: var(--ds-type-size-xs);'), "type-scale-ascends");
const DIV = ["LAY-001", "001-divider", "lay"] as const;
T("catches (atom/divider): thick divider is thin", ...DIV, rep("lay-001.css", "border-top-width: var(--ds-lay-rule-thick); }\n  .ds-lay-001[data-design=\"thick\"][data-orientation", "border-top-width: 0; }\n  .ds-lay-001[data-design=\"thick\"][data-orientation"), ["thick-width", "line-visible"]);
