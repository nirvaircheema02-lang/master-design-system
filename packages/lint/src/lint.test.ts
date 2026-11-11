import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, cpSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { lintCss, lintTsx, lintRegistry, contextFromTokens } from "./index.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const REGISTRY = join(root, "packages/components/src");
const ctx = contextFromTokens();
const rules = (css: string) => lintCss("x.css", css, ctx).violations.map((v) => v.rule).sort();

test("the real registry is clean", () => assert.deepEqual(lintRegistry(REGISTRY, ctx), []));

test("context comes from the token build", () => {
  assert.ok(ctx.families.includes("cta"));
  assert.ok(ctx.emitted.has("--ds-cta-radius"));
});

test("literal colours are rejected (hex, rgb, named)", () => {
  assert.deepEqual(rules("@layer components{.a{background:#f5c518}}"), ["no-literal-color"]);
  assert.deepEqual(rules("@layer components{.a{color:rgba(0,0,0,.5)}}"), ["no-literal-color"]);
  assert.deepEqual(rules("@layer components{.a{border-color:white}}"), ["no-literal-color"]);
  assert.deepEqual(rules("@layer components{.a{background:transparent;color:currentColor}}"), []);
});

test("primitive and semantic tokens are rejected in components", () => {
  assert.deepEqual(rules("@layer components{.a{color:var(--ds-color-primary-700)}}"), ["tier-only"]);
  assert.deepEqual(rules("@layer components{.a{color:var(--ds-color-accent)}}"), ["tier-only"]);
  assert.deepEqual(rules("@layer components{.a{border-radius:var(--ds-radius-cta)}}"), ["tier-only"]);
  assert.deepEqual(rules("@layer components{.a{color:var(--ds-cta-fg)}}"), []);
});

test("unknown component token and foreign namespace are rejected", () => {
  assert.deepEqual(rules("@layer components{.a{color:var(--ds-cta-nope)}}"), ["unknown-token"]);
  assert.deepEqual(rules("@layer components{.a{color:var(--brand)}}"), ["token-namespace"]);
  assert.deepEqual(rules("@layer components{.a{--_x:1;width:var(--_x)}}"), []);
});

test("unlayered rules are rejected except inside prefers-reduced-motion", () => {
  assert.deepEqual(rules(".a{display:block}"), ["layer-required"]);
  assert.deepEqual(rules("@media (prefers-reduced-motion: reduce){.a{animation:none}}"), []);
  assert.deepEqual(rules("@media (min-width:600px){.a{display:block}}"), ["layer-required"]);
});

test("layout/shadow transitions and keyframes are rejected", () => {
  assert.deepEqual(rules("@layer effects{.a{transition:box-shadow 1s}}"), ["motion-properties"]);
  assert.deepEqual(rules("@layer effects{.a{transition:all 1s}}"), ["motion-properties"]);
  assert.deepEqual(rules("@layer effects{.a{transition:transform 1s,opacity 1s}}"), []);
  assert.ok(rules("@layer effects{@keyframes k{to{width:10px}}}").includes("motion-properties"));
  assert.ok(rules("@layer effects{@keyframes k{to{box-shadow:0 0 4px var(--ds-cta-bg)}}}").includes("no-animated-shadow"));
  assert.deepEqual(rules("@layer effects{@keyframes k{to{transform:translateX(1px);opacity:0}}}"), []);
});

test("tsx: colour literals and inline colour styles are rejected; comments ignored", () => {
  assert.equal(lintTsx("a.tsx", 'const c = "#fff";').length, 1);
  assert.equal(lintTsx("a.tsx", "<div style={{ background: x }} />").length, 1);
  assert.equal(lintTsx("a.tsx", "// uses #fff in a comment").length, 0);
  assert.equal(lintTsx("a.tsx", 'import t from "../tokens/build/theme";').length, 1);
});

test("manifest <-> css drift is caught in both directions", () => {
  const reg = mkdtempSync(join(tmpdir(), "lint-"));
  cpSync(REGISTRY, reg, { recursive: true });
  const mf = join(reg, "cta/001-shimmer/manifest.json");
  const orig = JSON.parse(readFileSync(mf, "utf8"));
  writeFileSync(mf, JSON.stringify({ ...orig, tokens: [...orig.tokens.filter((t: string) => t !== "--ds-cta-ease"), "--ds-cta-stale"] }));
  const v = lintRegistry(reg, ctx).map((x) => `${x.rule}:${x.message}`);
  assert.ok(v.some((m) => /reads --ds-cta-ease but manifest/.test(m)));
  assert.ok(v.some((m) => /--ds-cta-stale which the token build does not emit/.test(m)));
});


test("every real component has browse metadata (discovery) and its pairsWith ids exist", async () => {
  const { readdirSync, readFileSync, existsSync } = await import("node:fs");
  const { join, dirname } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const root = join(dirname(fileURLToPath(import.meta.url)), "../../components/src");
  const ms: Array<{ id: string; discovery?: { tags: string[]; interaction: string[]; useCases: string[]; avoidWhen: string[]; pairsWith: string[] } }> = [];
  const { statSync } = await import("node:fs");
  for (const cat of readdirSync(root)) {
    if (!statSync(join(root, cat)).isDirectory()) continue;
    for (const c of readdirSync(join(root, cat))) {
      const f = join(root, cat, c, "manifest.json");
      if (existsSync(f)) ms.push(JSON.parse(readFileSync(f, "utf8")));
    }
  }
  assert.ok(ms.length >= 57, `found ${ms.length} manifests`);
  const ids = new Set(ms.map((m) => m.id));
  for (const m of ms) {
    assert.ok(m.discovery, `${m.id} has no discovery block`);
    assert.ok(m.discovery!.tags.length >= 2, `${m.id} needs at least 2 tags`);
    assert.ok(m.discovery!.interaction.length >= 1, `${m.id} needs an interaction kind (use "none" for static)`);
    assert.ok(m.discovery!.useCases.length >= 1 && m.discovery!.avoidWhen.length >= 1, `${m.id} needs a use and an avoid line`);
    for (const p of m.discovery!.pairsWith) assert.ok(ids.has(p) && p !== m.id, `${m.id} pairsWith unknown or self id ${p}`);
  }
});
