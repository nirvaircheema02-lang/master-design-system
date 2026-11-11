import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generate, status, upgrade, eject, validate, readLock, registryFingerprint } from "./index.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const REGISTRY = join(root, "packages/components/src");
const json = (p: string) => JSON.parse(readFileSync(join(root, p), "utf8"));
const finova = json("brands/finova.json");
const yellow = json("brands/master-yellow.json");
const kit = json("kits/finova.kit.json");
const NOW = "2026-01-01T00:00:00.000Z";
const tmp = () => mkdtempSync(join(tmpdir(), "master-test-"));
const read = (p: string) => readFileSync(p, "utf8");
const edit = (p: string, f: (s: string) => string) => writeFileSync(p, f(read(p)));

/** A private copy of the Master we can "release" a new version into without touching the real one. */
function masterCopy() { const d = tmp(); cpSync(REGISTRY, d, { recursive: true }); return d; }
function bump(reg: string, to: string, cssEdit: (s: string) => string) {
  const dir = join(reg, "cta/001-shimmer");
  edit(join(dir, "manifest.json"), (s) => s.replace('"version": "1.0.0"', `"version": "${to}"`));
  edit(join(dir, "cta-001.css"), cssEdit);
}
async function site(reg = REGISTRY, brand = finova) {
  const out = join(tmp(), "site");
  const r = await generate({ registryRoot: reg, brand, kit, outDir: out, now: NOW });
  assert.ok(r.ok, JSON.stringify(r.flags));
  return out;
}

test("generating Finova never modifies the Master", async () => {
  const before = registryFingerprint(REGISTRY);
  await site();
  assert.equal(registryFingerprint(REGISTRY), before);
});

test("Finova gets sharp corners + blue; master component source is byte-identical", async () => {
  const out = await site();
  const css = read(join(out, "tokens/build/theme.css"));
  assert.match(css, /--ds-radius-cta: 0px;/);
  assert.match(css, /--ds-color-accent: #1f4fd8;/);
  for (const f of ["Component.tsx", "cta-001.css", "manifest.json"])
    assert.equal(read(join(out, "components/cta-001", f)), read(join(REGISTRY, "cta/001-shimmer", f)), f);
  assert.match(read(join(out, "components/cta-001/instance.css")), /--ds-cta-bg: var\(--ds-color-accent\)/);
  assert.deepEqual(validate(out), []);
});

test("same Master source, different brand: yellow stays yellow + pill", async () => {
  const out = await site(REGISTRY, yellow);
  const css = read(join(out, "tokens/build/theme.css"));
  assert.match(css, /--ds-radius-cta: 9999px;/);
  assert.match(css, /--ds-color-accent: #f5c518;/);
  assert.equal(read(join(out, "components/cta-001/cta-001.css")), read(join(REGISTRY, "cta/001-shimmer/cta-001.css")));
});

test("generation is deterministic", async () => {
  const a = await site(), b = await site();
  for (const f of ["master.lock.json", "tokens/build/theme.css", "components/cta-001/instance.css"]) assert.equal(read(join(a, f)), read(join(b, f)), f);
});

test("lock traces component to master version + hashes", async () => {
  const lock = readLock(await site());
  const c = lock.components[0]!;
  assert.equal(c.id, "CTA-001"); assert.equal(c.masterVersion, "1.0.0"); assert.equal(c.status, "synced");
  assert.ok(c.sourceHash.startsWith("sha256:")); assert.ok(Object.keys(c.files).includes("cta-001.css"));
});

test("compat engine flags a shape-incompatible component and writes nothing", async () => {
  const reg = masterCopy();
  edit(join(reg, "cta/001-shimmer/manifest.json"), (s) => s.replace('"radiusSupport": "any"', '"radiusSupport": "pill-only"'));
  const out = join(tmp(), "site");
  const r = await generate({ registryRoot: reg, brand: finova, kit, outDir: out, now: NOW });
  assert.equal(r.ok, false);
  assert.equal(r.flags[0]!.code, "radius-unsupported");
  assert.equal(existsSync(out), false);
  const ok = await generate({ registryRoot: reg, brand: yellow, kit, outDir: join(tmp(), "s2"), now: NOW });
  assert.ok(ok.ok, "pill brand should satisfy pill-only");
});

test("unknown skin / invalid prop / bad override are flagged", async () => {
  const bad = { instances: [{ ref: "CTA-001@1.0.0", skin: "nope", props: { size: "xl" }, tokenOverrides: { color: "red" } }] };
  const r = await generate({ registryRoot: REGISTRY, brand: finova, kit: bad, outDir: join(tmp(), "x"), now: NOW });
  assert.deepEqual(r.flags.map((f) => f.code).sort(), ["bad-override", "invalid-prop", "unknown-skin"]);
});

test("upgrade: unmodified site takes the new Master cleanly", async () => {
  const reg = masterCopy(); const out = await site(reg);
  bump(reg, "1.0.1", (s) => s.replace("105deg", "110deg"));
  assert.equal(status(out, reg)[0]!.outdated, true);
  const rows = upgrade(out, reg);
  assert.equal(rows[0]!.action, "applied");
  assert.match(read(join(out, "components/cta-001/cta-001.css")), /110deg/);
  const lock = readLock(out);
  assert.equal(lock.components[0]!.masterVersion, "1.0.1"); assert.equal(lock.components[0]!.status, "synced");
  assert.equal(status(out, reg)[0]!.outdated, false);
  assert.deepEqual(validate(out), []);
});

test("upgrade: local edit + non-overlapping Master change merge cleanly", async () => {
  const reg = masterCopy(); const out = await site(reg);
  const sitecss = join(out, "components/cta-001/cta-001.css");
  edit(sitecss, (s) => s.replace("opacity: 0.5", "opacity: 0.6"));                 // site edit (disabled state)
  assert.deepEqual(status(out, reg)[0]!.locallyModified, ["cta-001.css"]);
  bump(reg, "1.0.1", (s) => s.replace("105deg", "110deg"));                          // master edit (shimmer angle)
  const rows = upgrade(out, reg);
  assert.equal(rows[0]!.action, "merged");
  const css = read(sitecss);
  assert.match(css, /opacity: 0\.6/); assert.match(css, /110deg/);
  const lock = readLock(out);
  assert.equal(lock.components[0]!.masterVersion, "1.0.1"); assert.equal(lock.components[0]!.status, "customized");
  assert.deepEqual(validate(out), []);
});

test("upgrade: overlapping edits produce a conflict, pin the old version, then finalize after resolution", async () => {
  const reg = masterCopy(); const out = await site(reg);
  const sitecss = join(out, "components/cta-001/cta-001.css");
  edit(sitecss, (s) => s.replace("opacity: 0.5", "opacity: 0.6"));
  bump(reg, "1.0.1", (s) => s.replace("opacity: 0.5", "opacity: 0.4"));
  const rows = upgrade(out, reg);
  assert.equal(rows[0]!.action, "conflict"); assert.deepEqual(rows[0]!.conflicts, ["cta-001.css"]);
  assert.match(read(sitecss), /<<<<<<< site/);
  assert.equal(readLock(out).components[0]!.status, "conflict");
  assert.equal(readLock(out).components[0]!.masterVersion, "1.0.0");
  assert.ok(validate(out).some((p) => /merge markers/.test(p.message)));
  assert.equal(upgrade(out, reg)[0]!.action, "conflict");                              // still unresolved
  edit(sitecss, (s) => s.replace(/<<<<<<< site\n([\s\S]*?)=======\n[\s\S]*?>>>>>>> master@new\n/, "$1"));
  assert.equal(upgrade(out, reg)[0]!.action, "finalized");
  assert.equal(readLock(out).components[0]!.masterVersion, "1.0.1");
  assert.deepEqual(validate(out), []);
});

test("eject marks diverged and upgrades skip it", async () => {
  const reg = masterCopy(); const out = await site(reg);
  eject(out, "CTA-001");
  bump(reg, "1.0.1", (s) => s.replace("105deg", "110deg"));
  assert.equal(upgrade(out, reg)[0]!.action, "skipped-diverged");
  assert.match(read(join(out, "components/cta-001/cta-001.css")), /105deg/);
  assert.equal(readLock(out).components[0]!.masterVersion, "1.0.0");
});

test("effects level: a brand set to minimal refuses an expressive component and writes nothing; full and subtle accept the shimmer", async () => {
  const out = join(tmp(), "calm");
  const r = await generate({ registryRoot: REGISTRY, brand: { ...finova, effects: "minimal" }, kit, outDir: out, now: NOW });
  assert.equal(r.ok, false);
  assert.ok(r.flags.some((f) => f.code === "effects-unsupported" && f.component === "CTA-001"));
  assert.equal(existsSync(out), false);
  assert.ok((await generate({ registryRoot: REGISTRY, brand: { ...finova, effects: "subtle" }, kit, outDir: join(tmp(), "s1"), now: NOW })).ok);
  assert.ok((await generate({ registryRoot: REGISTRY, brand: finova, kit, outDir: join(tmp(), "s2"), now: NOW })).ok);
});

test("icon settings reach the generated theme and the lock still validates", async () => {
  const out = join(tmp(), "icons");
  const r = await generate({ registryRoot: REGISTRY, brand: { ...finova, icons: { stroke: "bold", cap: "butt" }, typeScale: "large" }, kit, outDir: out, now: NOW });
  assert.ok(r.ok);
  const css = read(join(out, "tokens/build/theme.css"));
  assert.match(css, /--ds-icon-stroke: 2\.25;/); assert.match(css, /--ds-icon-cap: butt;/); assert.match(css, /--ds-font-size-lg: 1\.333rem;/);
  assert.deepEqual(validate(out), []);
});

import { PRESETS } from "../../../apps/gallery/lib/presets.ts";
import { defaultInstance } from "../../../apps/gallery/lib/kit.ts";
test("every starting kit (pattern) generates and validates on all four reference brands", async () => {
  const manifests = readdirSync(REGISTRY).filter((cat) => statSync(join(REGISTRY, cat)).isDirectory()).flatMap((cat) => readdirSync(join(REGISTRY, cat)).filter((c) => existsSync(join(REGISTRY, cat, c, "manifest.json"))).map((c) => JSON.parse(read(join(REGISTRY, cat, c, "manifest.json")))));
  const byId = new Map<string, any>(manifests.map((m) => [m.id, m]));
  for (const pr of PRESETS) {
    for (const id of pr.ids) assert.ok(byId.has(id), `${pr.key}: ${id} exists`);
    const kitCfg = { instances: pr.ids.map((id) => defaultInstance(byId.get(id))) };
    for (const b of ["finova", "lifestyle", "master-yellow", "corporate"]) {
      const out = join(tmp(), `${pr.key}-${b}`);
      const r = await generate({ registryRoot: REGISTRY, brand: json(`brands/${b}.json`), kit: kitCfg, outDir: out, now: NOW });
      assert.ok(r.ok, `${pr.key} on ${b}: ${r.flags.map((f) => `${f.component ?? ""} ${f.message}`).join("; ")}`);
      assert.deepEqual(validate(out), [], `${pr.key} on ${b} validates`);
    }
  }
});
