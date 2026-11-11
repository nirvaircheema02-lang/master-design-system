#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { brandConfig } from "@master-ds/contracts";
import { masterTarget, siteTarget, runConformance } from "./index.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const args = process.argv.slice(2);
const flag = (n: string) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const workdir = resolve(flag("workdir") ?? join(root, "packages/conformance/.tmp"));
const chromiumPath = process.env.PW_CHROMIUM || undefined;

const site = flag("site");
let targets;
if (site) targets = [siteTarget(resolve(site))];
else {
  const registry = resolve(flag("registry") ?? join(root, "packages/components/src"));
  const brandsDir = resolve(flag("brands") ?? join(root, "brands"));
  const only = flag("brand");
  const brands = readdirSync(brandsDir).filter((f) => f.endsWith(".json")).map((f) => brandConfig.parse(JSON.parse(readFileSync(join(brandsDir, f), "utf8")))).filter((b) => !only || b.slug === only);
  targets = await Promise.all(brands.map((b) => masterTarget(registry, b, workdir)));
}
const only = flag("component")?.split(",");
if (only) for (const t of targets) t.components = t.components.filter((c) => only.includes(c.manifest.id));
const t0 = Date.now();
const r = await runConformance(targets, { workdir, chromiumPath });
mkdirSync(workdir, { recursive: true });
writeFileSync(join(workdir, "conformance-report.json"), JSON.stringify(r, null, 2));
const errors = r.findings.filter((f) => f.level === "error"), warns = r.findings.filter((f) => f.level === "warn");
const group = (list: typeof r.findings) => { const m = new Map<string, number>(); for (const f of list) { const k = `${f.component} ${f.check}: ${f.message}`; m.set(k, (m.get(k) ?? 0) + 1); } return [...m].sort(); };
for (const [k, n] of group(errors)) console.error(`ERROR x${n}  ${k}`);
for (const [k, n] of group(warns)) console.warn(`warn  x${n}  ${k}`);
console.log(`conformance: ${targets.length} target(s), ${r.combos} combos, ${r.checks} checks, ${errors.length} error(s), ${warns.length} warning(s) in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
process.exit(errors.length ? 1 : 0);
