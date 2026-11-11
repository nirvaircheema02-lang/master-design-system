import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import YAML from "yaml";
import { overall, verdict, lintRef, ref, loadInventory, buildInventory, coverage, type SourceEntry } from "./index.ts";

const good = (o: Partial<SourceEntry> = {}): SourceEntry => ({
  name: "Example sweep", url: "https://example.com/x", sourceKind: "production-site", category: "CTA",
  interaction: "A highlight band sweeps across the button on hover.", visual: "solid fill", states: ["hover"], responsive: "n/a",
  feasibility: "clip on host + inherit radius", customizable: ["color", "radius"], coupling: "B", radiusSupport: "any",
  a11y: "reduced motion removes sweep", perf: { animated: ["transform"], js: false },
  license: { status: "not-applicable", usage: "clean-room" },
  scores: { distinctiveness: 4, usability: 4, a11y: 4, performance: 5, themability: 4, simplicity: 4, license: 5, neutrality: 4 },
  recommendation: "adapt", proposedId: "CTA-010", notes: "", ...o,
});

test("overall is a weighted mean in 1..5", () => {
  assert.equal(overall({ distinctiveness: 5, usability: 5, a11y: 5, performance: 5, themability: 5, simplicity: 5, license: 5, neutrality: 5 }), 5);
  assert.equal(overall({ distinctiveness: 1, usability: 1, a11y: 1, performance: 1, themability: 1, simplicity: 1, license: 1, neutrality: 1 }), 1);
});

test("a 1 in a hard criterion rejects regardless of the rest", () => {
  const s = { ...good().scores, a11y: 1 };
  assert.equal(verdict(s), "reject");
  assert.equal(verdict({ ...good().scores, license: 1 }), "reject");
  assert.equal(verdict({ ...good().scores, performance: 1 }), "reject");
});

test("low overall is inspiration, not adapt", () => {
  assert.equal(verdict({ distinctiveness: 3, usability: 3, a11y: 3, performance: 3, themability: 3, simplicity: 3, license: 3, neutrality: 3 }), "inspiration");
});

test("lintRef: adapt must satisfy the rubric, licence policy and carry a proposed id", () => {
  const mk = (o: Partial<SourceEntry>) => ref.parse({ ...good(o), id: "REF-001", captured: "2026-11-05", measured: null });
  assert.deepEqual(lintRef(mk({})), []);
  assert.match(lintRef(mk({ license: { status: "proprietary", usage: "inspiration-only" } })).join("|"), /inspiration-only/);
  assert.match(lintRef(mk({ license: { status: "unverified", usage: "dependency" } })).join("|"), /unverified/);
  assert.match(lintRef(mk({ proposedId: null })).join("|"), /needs a proposedId/);
  assert.match(lintRef(mk({ recommendation: "inspiration" })).join("|"), /only 'adapt'/);
  assert.match(lintRef(mk({ scores: { ...good().scores, a11y: 1 } })).join("|"), /rubric says 'reject'/);
  assert.match(lintRef(mk({ coupling: "C", feasibility: "works" })).join("|"), /class C claiming radius/);
});

test("build -> load round trip, duplicate proposed ids and coverage", () => {
  const out = mkdtempSync(join(tmpdir(), "inv-"));
  const probeDir = mkdtempSync(join(tmpdir(), "probe-"));
  mkdirSync(join(probeDir, "P1"), { recursive: true });
  writeFileSync(join(probeDir, "P1", "probe.json"), JSON.stringify({ url: "u", kind: "cta", ok: true, capturedAt: "x", targets: [{ animations: [{ target: "a(host)", property: "transform", durationMs: 300, easing: "ease", pseudo: null }], reducedMotionAnimations: 0 }] }));
  buildInventory([good({ probe: "P1#0" }), good({ name: "Second" })], { probeDir, outDir: out, today: "2026-11-05" });
  const inv = loadInventory(out);
  assert.equal(inv.refs.length, 2);
  assert.equal(inv.refs[0]!.measured?.animations[0]?.durationMs, 300);
  assert.match(inv.errors.join("|"), /CTA-010 proposed by both/);
  assert.equal(coverage(inv.refs).measured, 1);
});

test("loadInventory reports schema errors per record", () => {
  const out = mkdtempSync(join(tmpdir(), "inv-"));
  mkdirSync(join(out, "REF-001"));
  writeFileSync(join(out, "REF-001", "ref.yaml"), YAML.stringify({ id: "REF-001", name: "x" }));
  assert.match(loadInventory(out).errors.join("|"), /REF-001:/);
});
