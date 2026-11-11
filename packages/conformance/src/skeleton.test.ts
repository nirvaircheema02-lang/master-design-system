import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { generate, upgrade, validate, readLock, registryFingerprint } from "@master-ds/generator";
import { runConformance, siteTarget } from "./index.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const REGISTRY = join(root, "packages/components/src");
const chromiumPath = process.env.PW_CHROMIUM || undefined;
const skip = !chromiumPath && !existsSync(chromium.executablePath());
const json = (p: string) => JSON.parse(readFileSync(join(root, p), "utf8"));
const kit = json("kits/skeleton.kit.json");
const NOW = "2026-01-01T00:00:00.000Z";
const light = { radii: ["default", "9999px"], modes: ["light", "dark"] as Array<"light" | "dark"> };

async function conform(site: string) {
  return runConformance([siteTarget(site)], { workdir: mkdtempSync(join(tmpdir(), "skel-")), chromiumPath, ...light });
}

test("walking skeleton: both CTAs -> generated Finova -> conformance -> Master release -> upgrade -> conformance", { skip, timeout: 300000 }, async () => {
  const reg = mkdtempSync(join(tmpdir(), "skel-reg-"));
  cpSync(REGISTRY, reg, { recursive: true });
  const fp = registryFingerprint(reg);

  const site = join(mkdtempSync(join(tmpdir(), "skel-site-")), "finova");
  const gen = await generate({ registryRoot: reg, brand: json("brands/finova.json"), kit, outDir: site, now: NOW });
  assert.ok(gen.ok, JSON.stringify(gen.flags));
  assert.equal(registryFingerprint(reg), fp, "generation must not touch the Master");
  assert.deepEqual(validate(site), []);
  assert.deepEqual(readLock(site).components.map((c) => `${c.id}@${c.masterVersion}:${c.status}`), ["CTA-001@1.0.0:synced", "CTA-002@1.0.0:synced"]);

  // the generated package (not the Master) must pass the full matrix, with sharp corners and the Finova blue
  const before = await conform(site);
  assert.deepEqual(before.findings.filter((f) => f.level === "error"), []);
  assert.match(readFileSync(join(site, "tokens/build/theme.css"), "utf8"), /--ds-radius-cta: 0px;[\s\S]*--ds-color-accent: #1f4fd8;/);

  // Master ships CTA-001 1.0.1 (new shimmer angle) and CTA-002 1.0.1 (slower slide token); the site has a local tweak
  const siteCss = join(site, "components/cta-001/cta-001.css");
  writeFileSync(siteCss, readFileSync(siteCss, "utf8").replace("opacity: 0.5", "opacity: 0.6"));
  for (const [dir, file, from, to] of [["001-shimmer", "cta-001.css", "105deg", "110deg"], ["002-sliding-arrow", "cta-002.css", "translateX(120%)", "translateX(130%)"]] as const) {
    const d = join(reg, "cta", dir);
    writeFileSync(join(d, "manifest.json"), readFileSync(join(d, "manifest.json"), "utf8").replace('"version": "1.0.0"', '"version": "1.0.1"'));
    writeFileSync(join(d, file), readFileSync(join(d, file), "utf8").split(from).join(to));
  }
  const rows = upgrade(site, reg);
  assert.deepEqual(rows.map((r) => `${r.id}:${r.action}`), ["CTA-001:merged", "CTA-002:applied"]);
  assert.ok(readFileSync(siteCss, "utf8").includes("110deg") && readFileSync(siteCss, "utf8").includes("opacity: 0.6"), "merge keeps site edit AND master change");
  assert.deepEqual(readLock(site).components.map((c) => `${c.id}@${c.masterVersion}:${c.status}`), ["CTA-001@1.0.1:customized", "CTA-002@1.0.1:synced"]);
  assert.deepEqual(validate(site), []);

  const after = await conform(site);
  assert.deepEqual(after.findings.filter((f) => f.level === "error"), [], "upgraded site must still conform");
  assert.ok(after.checks > 100);
});

test("wave 1: five CTAs with non-default skins generate for a sharp and a pill brand and BOTH generated sites conform", { skip, timeout: 600000 }, async () => {
  const wave1 = json("kits/wave1.kit.json");
  const fp = registryFingerprint(REGISTRY);
  for (const brandFile of ["brands/finova.json", "brands/master-yellow.json"]) {
    const site = join(mkdtempSync(join(tmpdir(), "wave1-")), "site");
    const gen = await generate({ registryRoot: REGISTRY, brand: json(brandFile), kit: wave1, outDir: site, now: NOW });
    assert.ok(gen.ok, JSON.stringify(gen.flags));
    assert.deepEqual(validate(site), []);
    assert.equal(readLock(site).components.length, 5);
    // the instance's chosen skin becomes the site default, behind :not([data-skin]) so explicit data-skin still wins
    const inst = readFileSync(join(site, "components/cta-004/instance.css"), "utf8");
    assert.match(inst, /\.ds-cta-004:not\(\[data-skin\]\) \{[\s\S]*--ds-cta-bg: var\(--ds-color-accent\);/);
    assert.ok(readFileSync(join(site, "components/cta-003/skins.css"), "utf8").includes('[data-skin="outline-invert"]'), "skins.css travels with the component");
    const r = await runConformance([siteTarget(site)], { workdir: mkdtempSync(join(tmpdir(), "wave1-conf-")), chromiumPath, radii: ["default", "9999px"], modes: ["light", "dark"] });
    assert.deepEqual(r.findings.filter((f) => f.level === "error"), [], brandFile);
    assert.ok(r.checks > 1000, `only ${r.checks} checks`);
  }
  assert.equal(registryFingerprint(REGISTRY), fp, "generation must not touch the Master");
});

test("wave 2: six CTAs with non-default skins generate for a sharp brand and a dark-label rounded brand and both sites conform", { skip, timeout: 900000 }, async () => {
  const wave2 = json("kits/wave2.kit.json");
  const fp = registryFingerprint(REGISTRY);
  for (const brandFile of ["brands/finova.json", "brands/lifestyle.json"]) {
    const site = join(mkdtempSync(join(tmpdir(), "wave2-")), "site");
    const gen = await generate({ registryRoot: REGISTRY, brand: json(brandFile), kit: wave2, outDir: site, now: NOW });
    assert.ok(gen.ok, JSON.stringify(gen.flags));
    assert.deepEqual(validate(site), []);
    assert.equal(readLock(site).components.length, 6);
    const r = await runConformance([siteTarget(site)], { workdir: mkdtempSync(join(tmpdir(), "wave2-conf-")), chromiumPath, radii: ["default", "9999px"], modes: ["light", "dark"] });
    assert.deepEqual(r.findings.filter((f) => f.level === "error"), [], brandFile);
    assert.ok(r.checks > 1000, `only ${r.checks} checks`);
  }
  assert.equal(registryFingerprint(REGISTRY), fp, "generation must not touch the Master");
});

test("wave 3: pointer-driven and stateful CTAs generate for a light-label and a dark-label brand and both sites conform", { skip, timeout: 900000 }, async () => {
  const wave3 = json("kits/wave3.kit.json");
  const fp = registryFingerprint(REGISTRY);
  for (const brandFile of ["brands/finova.json", "brands/master-yellow.json"]) {
    const site = join(mkdtempSync(join(tmpdir(), "wave3-")), "site");
    const gen = await generate({ registryRoot: REGISTRY, brand: json(brandFile), kit: wave3, outDir: site, now: NOW });
    assert.ok(gen.ok, JSON.stringify(gen.flags));
    assert.deepEqual(validate(site), []);
    const r = await runConformance([siteTarget(site)], { workdir: mkdtempSync(join(tmpdir(), "wave3-conf-")), chromiumPath, radii: ["default", "9999px"], modes: ["light", "dark"] });
    assert.deepEqual(r.findings.filter((f) => f.level === "error"), [], brandFile);
    assert.ok(r.checks > 500, `only ${r.checks} checks`);
  }
  assert.equal(registryFingerprint(REGISTRY), fp, "generation must not touch the Master");
});

test("wave A: cards, field, error summary, accordion and nav items generate for a sharp and a dark-label rounded brand and both sites conform", { skip, timeout: 1200000 }, async () => {
  const waveA = json("kits/waveA.kit.json");
  const fp = registryFingerprint(REGISTRY);
  for (const brandFile of ["brands/finova.json", "brands/lifestyle.json"]) {
    const site = join(mkdtempSync(join(tmpdir(), "waveA-")), "site");
    const gen = await generate({ registryRoot: REGISTRY, brand: json(brandFile), kit: waveA, outDir: site, now: NOW });
    assert.ok(gen.ok, JSON.stringify(gen.flags));
    assert.deepEqual(validate(site), []);
    assert.equal(readLock(site).components.length, 8);
    const css = readFileSync(join(site, "tokens/build/theme.css"), "utf8");
    for (const family of ["field", "card", "acc", "nav", "frm"]) assert.match(css, new RegExp(`--ds-${family}-`), `family ${family} missing from the generated theme`);
    const r = await runConformance([siteTarget(site)], { workdir: mkdtempSync(join(tmpdir(), "waveA-conf-")), chromiumPath, radii: ["default", "9999px"], modes: ["light", "dark"] });
    assert.deepEqual(r.findings.filter((f) => f.level === "error"), [], brandFile);
    assert.ok(r.checks > 800, `only ${r.checks} checks`);
  }
  assert.equal(registryFingerprint(REGISTRY), fp, "generation must not touch the Master");
});

test("wave B: tabs, accordion, nav disclosure, dialog and menu generate WITH the headless adapter, conform, and the adapter upgrades like a component", { skip, timeout: 1500000 }, async () => {
  const waveB = json("kits/waveB.kit.json");
  const fp = registryFingerprint(REGISTRY);
  const HEADLESS = join(root, "packages/headless/src");
  const sites: string[] = [];
  for (const brandFile of ["brands/finova.json", "brands/lifestyle.json"]) {
    const site = join(mkdtempSync(join(tmpdir(), "waveB-")), "site");
    const gen = await generate({ registryRoot: REGISTRY, brand: json(brandFile), kit: waveB, outDir: site, now: NOW });
    assert.ok(gen.ok, JSON.stringify(gen.flags));
    assert.deepEqual(validate(site), []);
    assert.equal(readLock(site).components.length, 5);
    // the adapter travels with the site: modules for exactly the libraries used, an index, and a package.json that declares them
    const lock = readLock(site);
    assert.deepEqual(lock.headless?.modules, ["accordion", "dialog", "menu", "tabs"]);
    assert.ok(existsSync(join(site, "headless/scope.tsx")), "the theme-scope helper is copied with dialog/menu");
    assert.match(readFileSync(join(site, "headless/index.ts"), "utf8"), /export \* from "\.\/tabs\.tsx";/);
    const pkg = JSON.parse(readFileSync(join(site, "package.json"), "utf8"));
    assert.equal(pkg.dependencies["@master-ds/headless"], "file:./headless");
    const hpkg = JSON.parse(readFileSync(join(site, "headless/package.json"), "utf8"));
    for (const lib of ["@radix-ui/react-tabs", "@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-accordion"]) assert.ok(hpkg.dependencies[lib], `${lib} not declared`);
    for (const family of ["tab", "dlg", "menu"]) assert.match(readFileSync(join(site, "tokens/build/theme.css"), "utf8"), new RegExp(`--ds-${family}-`), `family ${family} missing from the generated theme`);
    const r = await runConformance([siteTarget(site)], { workdir: mkdtempSync(join(tmpdir(), "waveB-conf-")), chromiumPath, radii: ["default", "9999px"], modes: ["light", "dark"] });
    assert.deepEqual(r.findings.filter((f) => f.level === "error"), [], brandFile);
    assert.ok(r.checks > 800, `only ${r.checks} checks`);
    sites.push(site);
  }
  assert.equal(registryFingerprint(REGISTRY), fp, "generation must not touch the Master");

  // the adapter is tracked and upgraded: untouched copy -> applied; locally edited copy -> skipped and reported
  const hroot = join(mkdtempSync(join(tmpdir(), "hroot-")), "headless/src");
  cpSync(HEADLESS, hroot, { recursive: true });
  writeFileSync(join(hroot, "../package.json"), readFileSync(join(HEADLESS, "../package.json"), "utf8"));
  const site = join(mkdtempSync(join(tmpdir(), "waveB-up-")), "site");
  assert.ok((await generate({ registryRoot: REGISTRY, brand: json("brands/finova.json"), kit: waveB, outDir: site, now: NOW, headlessRoot: hroot })).ok);
  writeFileSync(join(hroot, "tabs.tsx"), readFileSync(join(hroot, "tabs.tsx"), "utf8") + "\n// master patch\n");
  let rows = upgrade(site, REGISTRY, ["HEADLESS"], { headlessRoot: hroot });
  assert.deepEqual(rows.map((r) => `${r.id}:${r.action}`), ["HEADLESS:applied"]);
  assert.match(readFileSync(join(site, "headless/tabs.tsx"), "utf8"), /master patch/);
  assert.deepEqual(validate(site), []);
  writeFileSync(join(site, "headless/menu.tsx"), readFileSync(join(site, "headless/menu.tsx"), "utf8") + "\n// site edit\n");
  writeFileSync(join(hroot, "menu.tsx"), readFileSync(join(hroot, "menu.tsx"), "utf8") + "\n// master menu patch\n");
  rows = upgrade(site, REGISTRY, ["HEADLESS"], { headlessRoot: hroot });
  assert.deepEqual(rows.map((r) => `${r.id}:${r.action}`), ["HEADLESS:skipped-diverged"]);
  assert.deepEqual(rows[0]!.conflicts, ["menu.tsx"]);

  // a Master that cannot supply the adapter must not generate a half-working site
  const lonely = mkdtempSync(join(tmpdir(), "lonely-"));
  cpSync(REGISTRY, join(lonely, "a/b/components"), { recursive: true });
  const bad = await generate({ registryRoot: join(lonely, "a/b/components"), brand: json("brands/finova.json"), kit: waveB, outDir: join(lonely, "out"), now: NOW });
  assert.equal(bad.ok, false);
  assert.ok(bad.flags.some((f) => f.code === "headless-missing"), JSON.stringify(bad.flags));
  void readdirSync;
});

test("wave C: skip link, breadcrumb, both headers and the toast stack generate for a sharp and a dark-label rounded brand and both sites conform in the page fixture", { skip, timeout: 1500000 }, async () => {
  const waveC = json("kits/waveC.kit.json");
  const fp = registryFingerprint(REGISTRY);
  for (const brandFile of ["brands/finova.json", "brands/lifestyle.json"]) {
    const site = join(mkdtempSync(join(tmpdir(), "waveC-")), "site");
    const gen = await generate({ registryRoot: REGISTRY, brand: json(brandFile), kit: waveC, outDir: site, now: NOW });
    assert.ok(gen.ok, JSON.stringify(gen.flags));
    assert.deepEqual(validate(site), []);
    assert.equal(readLock(site).components.length, 5);
    assert.equal(readLock(site).headless, undefined, "no Wave C component needs the headless adapter");
    const css = readFileSync(join(site, "tokens/build/theme.css"), "utf8");
    assert.match(css, /--ds-tst-/, "toast family missing from the generated theme");
    assert.match(css, /--ds-nav-header-height:/, "header tokens missing from the generated theme");
    const r = await runConformance([siteTarget(site)], { workdir: mkdtempSync(join(tmpdir(), "waveC-conf-")), chromiumPath, radii: ["default", "9999px"], modes: ["light", "dark"] });
    assert.deepEqual(r.findings.filter((f) => f.level === "error"), [], brandFile);
    assert.ok(r.checks > 800, `only ${r.checks} checks`);
  }
  assert.equal(registryFingerprint(REGISTRY), fp, "generation must not touch the Master");
});

test("wave C rest: mega menu, drawer, popover and tooltip generate WITH the dialog/popover/tooltip adapter and both sites conform in the page fixture", { skip, timeout: 1500000 }, async () => {
  const kit = json("kits/waveC2.kit.json");
  const fp = registryFingerprint(REGISTRY);
  for (const brandFile of ["brands/finova.json", "brands/lifestyle.json"]) {
    const site = join(mkdtempSync(join(tmpdir(), "waveC2-")), "site");
    const gen = await generate({ registryRoot: REGISTRY, brand: json(brandFile), kit, outDir: site, now: NOW });
    assert.ok(gen.ok, JSON.stringify(gen.flags));
    assert.deepEqual(validate(site), []);
    const lock = readLock(site);
    assert.deepEqual(lock.headless?.modules, ["dialog", "popover", "tooltip"]);
    const hpkg = JSON.parse(readFileSync(join(site, "headless/package.json"), "utf8"));
    for (const lib of ["@radix-ui/react-dialog", "@radix-ui/react-popover", "@radix-ui/react-tooltip"]) assert.ok(hpkg.dependencies[lib], `${lib} not declared`);
    assert.ok(!existsSync(join(site, "headless/tabs.tsx")), "unused adapter modules must not be copied");
    const css = readFileSync(join(site, "tokens/build/theme.css"), "utf8");
    for (const fam of ["pop", "tip"]) assert.match(css, new RegExp(`--ds-${fam}-`), `family ${fam} missing from the generated theme`);
    assert.match(css, /--ds-nav-drawer-width:/);
    const r = await runConformance([siteTarget(site)], { workdir: mkdtempSync(join(tmpdir(), "waveC2-conf-")), chromiumPath, radii: ["default", "9999px"], modes: ["light", "dark"] });
    assert.deepEqual(r.findings.filter((f) => f.level === "error"), [], brandFile);
    assert.ok(r.checks > 800, `only ${r.checks} checks`);
  }
  assert.equal(registryFingerprint(REGISTRY), fp, "generation must not touch the Master");
});

test("wave D: textarea, choices, select, stat card, pagination and data table generate for a sharp and a dark-label rounded brand and both sites conform", { skip, timeout: 1800000 }, async () => {
  const kit = json("kits/waveD.kit.json");
  const fp = registryFingerprint(REGISTRY);
  for (const brandFile of ["brands/finova.json", "brands/lifestyle.json"]) {
    const site = join(mkdtempSync(join(tmpdir(), "waveD-")), "site");
    const gen = await generate({ registryRoot: REGISTRY, brand: json(brandFile), kit, outDir: site, now: NOW });
    assert.ok(gen.ok, JSON.stringify(gen.flags));
    assert.deepEqual(validate(site), []);
    assert.equal(readLock(site).components.length, 8);
    assert.equal(readLock(site).headless, undefined, "no Wave D component needs the headless adapter");
    const css = readFileSync(join(site, "tokens/build/theme.css"), "utf8");
    for (const fam of ["choice", "stat", "pag", "tbl"]) assert.match(css, new RegExp(`--ds-${fam}-`), `family ${fam} missing from the generated theme`);
    const r = await runConformance([siteTarget(site)], { workdir: mkdtempSync(join(tmpdir(), "waveD-conf-")), chromiumPath, radii: ["default", "9999px"], modes: ["light", "dark"] });
    assert.deepEqual(r.findings.filter((f) => f.level === "error"), [], brandFile);
    assert.ok(r.checks > 1200, `only ${r.checks} checks`);
  }
  assert.equal(registryFingerprint(REGISTRY), fp, "generation must not touch the Master");
});

test("designs: a kit can pick a non-default design per component; every design of each generates and conforms for two brands", { skip, timeout: 2400000 }, async () => {
  const kit = json("kits/waveDesigns.kit.json");
  const fp = registryFingerprint(REGISTRY);
  // an unknown design is refused with a flag, never silently ignored
  const bad = await generate({ registryRoot: REGISTRY, brand: json("brands/finova.json"), kit: { instances: [{ ref: "TBL-001@1.0.0", skin: "plain", props: { design: "nope" } }] }, outDir: join(mkdtempSync(join(tmpdir(), "designs-bad-")), "o"), now: NOW });
  assert.equal(bad.ok, false);
  assert.ok(bad.flags.some((f) => f.code === "invalid-prop"), JSON.stringify(bad.flags));
  for (const brandFile of ["brands/finova.json", "brands/lifestyle.json"]) {
    const site = join(mkdtempSync(join(tmpdir(), "designs-")), "site");
    const gen = await generate({ registryRoot: REGISTRY, brand: json(brandFile), kit, outDir: site, now: NOW });
    assert.ok(gen.ok, JSON.stringify(gen.flags));
    assert.deepEqual(validate(site), []);
    assert.equal(readLock(site).components.length, 6);
    const r = await runConformance([siteTarget(site)], { workdir: mkdtempSync(join(tmpdir(), "designs-conf-")), chromiumPath, radii: ["default", "9999px"], modes: ["light", "dark"] });
    assert.deepEqual(r.findings.filter((f) => f.level === "error"), [], brandFile);
    assert.ok(r.checks > 2500, `only ${r.checks} checks`);
  }
  assert.equal(registryFingerprint(REGISTRY), fp, "generation must not touch the Master");
});
