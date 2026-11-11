import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { brandConfig, type BrandConfig } from "@master-ds/contracts";
import { buildBrand } from "./css.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const brands: BrandConfig[] = readdirSync(join(root, "brands"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => brandConfig.parse(JSON.parse(readFileSync(join(root, "brands", f), "utf8"))));

test("four reference brands exist", () => assert.equal(brands.length, 4));

for (const b of brands) {
  test(`${b.slug}: every contrast pair passes`, async () => {
    const { tokens } = await buildBrand(b);
    const bad = tokens.report.filter((r) => !r.ok);
    assert.deepEqual(bad, []);
  });

  test(`${b.slug}: seed colour preserved exactly in theme.css`, async () => {
    const { themeCss } = await buildBrand(b);
    assert.ok(themeCss.includes(b.seeds.primary.toLowerCase()), "primary seed hex missing");
  });

  test(`${b.slug}: component tier has no raw colour literals`, async () => {
    const { themeCss } = await buildBrand(b);
    const comp = themeCss.slice(themeCss.indexOf("@layer tokens.component {"));
    assert.doesNotMatch(comp, /#[0-9a-fA-F]{3,8}\b/);
    assert.doesNotMatch(comp, /rgba?\(/);
  });

  test(`${b.slug}: scoped by data-brand, never :root`, async () => {
    const { themeCss } = await buildBrand(b);
    assert.doesNotMatch(themeCss, /:root/);
    assert.match(themeCss, new RegExp(`\\[data-brand="${b.slug}"\\]`));
  });
}

test("sharp strategy yields cta radius 0, pill yields 9999px", async () => {
  const fin = brands.find((b) => b.slug === "finova")!;
  const yel = brands.find((b) => b.slug === "master-yellow")!;
  assert.match((await buildBrand(fin)).themeCss, /--ds-radius-cta: 0px;/);
  assert.match((await buildBrand(yel)).themeCss, /--ds-radius-cta: 9999px;/);
});

test("building one brand does not change another (isolation + determinism)", async () => {
  const [a, b] = [brands[0]!, brands[1]!];
  const a1 = (await buildBrand(a)).themeCss;
  await buildBrand(b);
  const a2 = (await buildBrand(a)).themeCss;
  assert.equal(a1, a2);
});

test("component tier references semantic tokens", async () => {
  const css = (await buildBrand(brands[0]!)).themeCss;
  assert.match(css, /--ds-cta-bg: var\(--ds-color-accent\);/);
  assert.match(css, /--ds-cta-shimmer-hl: color-mix\(in oklch, var\(--ds-color-on-accent\) 35%, transparent\);/);
});

const withOverrides = (o: Record<string, string>): BrandConfig => ({ ...brands.find((b) => b.slug === "finova")!, overrides: o });

test("T4 override changes the emitted value and reports what it applied", async () => {
  const { themeCss, tokens } = await buildBrand(withOverrides({ "radius.cta": "6px" }));
  assert.match(themeCss, /--ds-radius-cta: 6px;/);
  assert.deepEqual(tokens.overridesApplied, { applied: ["radius.cta"], unknown: [] });
});

test("mode-prefixed override touches only that mode", async () => {
  const { themeCss } = await buildBrand(withOverrides({ "dark:color.surface.base": "#000000" }));
  const dark = themeCss.slice(themeCss.indexOf('[data-mode="dark"]'));
  const light = themeCss.slice(0, themeCss.indexOf('[data-mode="dark"]'));
  assert.match(dark, /--ds-color-surface-base: #000000;/);
  assert.doesNotMatch(light, /--ds-color-surface-base: #000000;/);
});

test("unknown override paths are reported, never silently ignored", async () => {
  const { tokens } = await buildBrand(withOverrides({ "color.nope.zzz": "#fff" }));
  assert.deepEqual(tokens.overridesApplied.unknown, ["color.nope.zzz"]);
});

test("an override that breaks contrast fails the gate", async () => {
  const { tokens } = await buildBrand(withOverrides({ "color.on-accent": "#2a58e8" })); // blue label on blue fill
  assert.ok(tokens.report.some((r) => !r.ok && /on-accent\/accent/.test(r.pair)));
});

test("every component family in the token tree is emitted in the component layer", async () => {
  const { themeCss, tokens } = await buildBrand(brands[0]!);
  const comp = themeCss.slice(themeCss.indexOf("@layer tokens.component {"));
  for (const family of Object.keys(tokens.component)) assert.match(comp, new RegExp(`--ds-${family}-`), `family ${family} missing from the component layer`);
});

const finovaCfg = () => brands.find((b) => b.slug === "finova")!;
test("brand icon, type-scale and effects options default to today's values (existing brands look the same)", async () => {
  const { themeCss } = await buildBrand(finovaCfg());
  assert.match(themeCss, /--ds-icon-stroke: 1\.75;/);
  assert.match(themeCss, /--ds-icon-cap: round;/);
  assert.match(themeCss, /--ds-icon-join: round;/);
  assert.match(themeCss, /--ds-font-size-lg: 1\.25rem;/);
  assert.match(themeCss, /--ds-font-size-4xl: 3\.052rem;/);
  const same = await buildBrand({ ...finovaCfg(), icons: { stroke: "regular", cap: "round" }, typeScale: "standard", effects: "full" });
  assert.equal(same.themeCss, themeCss, "spelling out the defaults changes nothing");
});
test("icons: stroke and cap reach the theme; non-round caps use a mitered join", async () => {
  const { themeCss } = await buildBrand({ ...finovaCfg(), icons: { stroke: "bold", cap: "square" } });
  assert.match(themeCss, /--ds-icon-stroke: 2\.25;/);
  assert.match(themeCss, /--ds-icon-cap: square;/);
  assert.match(themeCss, /--ds-icon-join: miter;/);
  assert.match((await buildBrand({ ...finovaCfg(), icons: { stroke: "light" } })).themeCss, /--ds-icon-stroke: 1\.25;/);
});
test("type scale: compact and large change the big steps, never the small ones; contrast still passes", async () => {
  const c = await buildBrand({ ...finovaCfg(), typeScale: "compact" });
  const l = await buildBrand({ ...finovaCfg(), typeScale: "large" });
  assert.match(c.themeCss, /--ds-font-size-lg: 1\.2rem;/);
  assert.match(c.themeCss, /--ds-font-size-4xl: 2\.488rem;/);
  assert.match(l.themeCss, /--ds-font-size-lg: 1\.333rem;/);
  assert.match(l.themeCss, /--ds-font-size-4xl: 4\.209rem;/);
  for (const t of [c, l]) { assert.match(t.themeCss, /--ds-font-size-sm: 0\.9375rem;/); assert.deepEqual(t.tokens.report.filter((r) => !r.ok), []); }
});
