import { test } from "node:test";
import assert from "node:assert/strict";
import { manifest, lintManifest, brandConfig, jsonSchemas, skinCss, skinValue } from "./index.ts";

const base = {
  id: "CTA-001", slug: "shimmer", name: "Shimmer CTA", category: "CTA", version: "1.0.0",
  lifecycle: "alpha", description: "Left-to-right shimmer sweep",
  interaction: { class: "B", modules: ["shimmer-sweep"], params: { duration: 700 } },
  slots: { label: { required: true } }, props: { size: ["sm", "md", "lg"] },
  skins: [{ id: "solid-accent", bind: { "--ds-cta-bg": "color.accent", "--ds-cta-fg": "color.on-accent" } }],
  tokens: ["--ds-cta-bg", "--ds-cta-fg", "--ds-cta-radius"],
  constraints: { radiusSupport: "any", requiresHost: ["overflow:clip"] },
  states: ["default", "hover", "focus-visible", "active", "loading", "disabled"],
  responsive: { touchTarget: "44px", hoverFallback: "active-state" },
  a11y: { role: "button", keyboard: ["Enter", "Space"], reducedMotion: "static-end-state" },
  code: { path: "packages/components/src/cta/001-shimmer" },
  testing: {},
};

test("valid manifest parses and lints clean", () => {
  const m = manifest.parse(base);
  assert.deepEqual(lintManifest(m), []);
});

test("bad id is rejected", () => {
  assert.throws(() => manifest.parse({ ...base, id: "cta1" }));
});

test("class C with radiusSupport 'any' is flagged", () => {
  const m = manifest.parse({ ...base, interaction: { class: "C" } });
  assert.match(lintManifest(m).join("|"), /radiusNote/);
});

test("class C may claim 'any' radius when it justifies it", () => {
  const m = manifest.parse({ ...base, interaction: { class: "C" }, constraints: { radiusSupport: "any", radiusNote: "clip is on the inner icon box, not the button edge" } });
  assert.deepEqual(lintManifest(m), []);
});

test("stable requires passed conformance", () => {
  const m = manifest.parse({ ...base, lifecycle: "stable" });
  assert.match(lintManifest(m).join("|"), /conformance/);
});

test("brand config validates hex seeds", () => {
  assert.throws(() => brandConfig.parse({ name: "X", slug: "x", seeds: { primary: "blue" }, fonts: { sans: "Inter" }, radiusStrategy: "sharp" }));
});

test("json schemas emit", () => {
  assert.ok(jsonSchemas.manifest.type === "object");
});

test("a skin may only bind tokens the manifest lists", () => {
  const m = manifest.parse({ ...base, skins: [{ id: "x", bind: { "--ds-cta-bg": "color.accent", "--ds-cta-nope": "color.accent" } }] });
  assert.match(lintManifest(m).join("|"), /binds --ds-cta-nope/);
  assert.throws(() => manifest.parse({ ...base, skins: [{ id: "x", bind: { bg: "color.accent" } }] }));
});

test("skinCss: first skin is the default, others are data-skin scoped, keywords pass through", () => {
  const m = manifest.parse({ ...base, skins: [
    { id: "solid", bind: { "--ds-cta-bg": "color.accent" } },
    { id: "outline", bind: { "--ds-cta-bg": "transparent", "--ds-cta-fg": "color.accent.ink" } },
  ], tokens: ["--ds-cta-bg", "--ds-cta-fg"] });
  const css = skinCss(m);
  assert.match(css, /\.ds-cta-001:not\(\[data-skin\]\),\n  \.ds-cta-001\[data-skin="solid"\] \{\n    --ds-cta-bg: var\(--ds-color-accent\);/);
  assert.match(css, /\[data-skin="outline"\] \{\n    --ds-cta-bg: transparent;\n    --ds-cta-fg: var\(--ds-color-accent-ink\);/);
  assert.equal(skinValue("color.on-accent"), "var(--ds-color-on-accent)");
  assert.equal(skinValue("currentColor"), "currentColor");
});

test("archetype defaults to button and fixture to empty props", () => {
  const m = manifest.parse(base);
  assert.equal(m.archetype, "button");
  assert.deepEqual(m.fixture, { props: {} });
  const c = manifest.parse({ ...base, archetype: "card", fixture: { props: { title: "x" }, children: "body" } });
  assert.equal(c.archetype, "card");
  assert.throws(() => manifest.parse({ ...base, archetype: "carousel" }));
});

import { checkEffects } from "./compat.ts";
const withEffects = (e?: "subtle" | "full") => manifest.parse({ ...base, discovery: e ? { effects: e } : {} });
test("effects level: a calm component is always allowed; expressive ones are flagged below their level", () => {
  assert.equal(checkEffects(withEffects(), "minimal"), null);
  assert.equal(checkEffects(withEffects("subtle"), "minimal")?.code, "effects-unsupported");
  assert.equal(checkEffects(withEffects("subtle"), "subtle"), null);
  assert.equal(checkEffects(withEffects("full"), "subtle")?.code, "effects-unsupported");
  assert.equal(checkEffects(withEffects("full"), undefined), null, "no level set means full");
});
test("brand config: the new icon, type-scale and effects fields are optional and validated", () => {
  const b = { name: "X", slug: "x", seeds: { primary: "#1f4fd8" }, fonts: { sans: "Inter" }, radiusStrategy: "soft" };
  assert.ok(brandConfig.safeParse(b).success);
  assert.ok(brandConfig.safeParse({ ...b, icons: { stroke: "bold", cap: "butt" }, typeScale: "large", effects: "subtle" }).success);
  assert.ok(!brandConfig.safeParse({ ...b, icons: { stroke: "heavy" } }).success);
  assert.ok(!brandConfig.safeParse({ ...b, effects: "wild" }).success);
});
