import { existsSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { lock as lockSchema, type Lock } from "@master-ds/contracts";
import { loadRegistry } from "./registry.ts";
import { resolveHeadless } from "./headless.ts";
import { listFiles, readText, sha256, stableJson, threeWayMerge, writeFile } from "./util.ts";

const MARKER = /^(<<<<<<<|>>>>>>>) /m;

export const readLock = (site: string): Lock => lockSchema.parse(JSON.parse(readText(join(site, "master.lock.json"))));
const writeLock = (site: string, l: Lock) => writeFile(join(site, "master.lock.json"), stableJson(l));
const siteFile = (site: string, id: string, rel: string) => join(site, "components", id.toLowerCase(), rel);
const baseFile = (site: string, id: string, rel: string) => join(site, ".master/base", id, rel);

export interface StatusRow {
  id: string; locked: string; latest: string | null; outdated: boolean; status: Lock["components"][number]["status"];
  locallyModified: string[]; missing: string[];
}

/** What changed in the Master since this site's pinned versions, and what changed locally. */
export function status(site: string, registryRoot: string): StatusRow[] {
  const lock = readLock(site);
  const registry = loadRegistry(registryRoot);
  return lock.components.map((c) => {
    const latest = registry.get(c.id);
    const modified: string[] = [];
    const missing: string[] = [];
    for (const [rel, h] of Object.entries(c.files)) {
      const p = siteFile(site, c.id, rel);
      if (!existsSync(p)) missing.push(rel);
      else if (sha256(readText(p)) !== h) modified.push(rel);
    }
    return { id: c.id, locked: c.masterVersion, latest: latest?.manifest.version ?? null, outdated: !!latest && latest.hash !== c.sourceHash, status: c.status, locallyModified: modified, missing };
  });
}

export interface UpgradeRow { id: string; action: "skipped-diverged" | "up-to-date" | "applied" | "merged" | "conflict" | "finalized"; from: string; to: string; conflicts: string[]; merged: string[] }

export function upgrade(site: string, registryRoot: string, only?: string[], opts: { headlessRoot?: string } = {}): UpgradeRow[] {
  const lock = readLock(site);
  const registry = loadRegistry(registryRoot);
  const rows: UpgradeRow[] = [];

  for (const entry of lock.components) {
    if (only && !only.includes(entry.id)) continue;
    const master = registry.get(entry.id);
    const row: UpgradeRow = { id: entry.id, action: "up-to-date", from: entry.masterVersion, to: master?.manifest.version ?? entry.masterVersion, conflicts: [], merged: [] };
    rows.push(row);
    if (entry.status === "diverged") { row.action = "skipped-diverged"; continue; }
    if (!master) continue;

    // Re-run after the user resolved conflicts by hand: finalize if no markers remain.
    if (entry.status === "conflict") {
      const stillConflicted = Object.keys(master.files).filter((rel) => existsSync(siteFile(site, entry.id, rel)) && MARKER.test(readText(siteFile(site, entry.id, rel))));
      if (stillConflicted.length) { row.action = "conflict"; row.conflicts = stillConflicted; continue; }
      finalize(site, entry, master);
      row.action = "finalized";
      continue;
    }
    if (master.hash === entry.sourceHash) continue;

    const rels = [...new Set([...Object.keys(master.files), ...Object.keys(entry.files)])].sort();
    let anyMerge = false;
    for (const rel of rels) {
      const theirs = master.files[rel];
      const bp = baseFile(site, entry.id, rel);
      const base = existsSync(bp) ? readText(bp) : undefined;
      const sp = siteFile(site, entry.id, rel);
      const ours = existsSync(sp) ? readText(sp) : undefined;
      if (theirs === base) continue;                                   // master did not touch this file
      if (ours === base) {                                             // site did not touch it: take master
        if (theirs === undefined) rmSync(sp, { force: true }); else writeFile(sp, theirs);
        continue;
      }
      if (theirs === undefined || ours === undefined) { row.conflicts.push(rel); continue; } // removed on one side, edited on the other
      const merged = threeWayMerge(base ?? "", ours, theirs);
      writeFile(sp, merged.content);
      if (merged.conflicts > 0) row.conflicts.push(rel); else { row.merged.push(rel); anyMerge = true; }
    }

    if (row.conflicts.length) {
      row.action = "conflict";
      entry.status = "conflict";                                       // base + lock version stay pinned until resolved
      continue;
    }
    finalize(site, entry, master);
    row.action = anyMerge ? "merged" : "applied";
  }
  if (lock.headless && (!only || only.includes("HEADLESS"))) rows.push(upgradeHeadless(site, lock, opts.headlessRoot ?? resolve(registryRoot, "../../headless/src")));
  writeLock(site, lock);
  return rows;
}

/** The headless adapter has no merge base per file in v0: take the Master's version only when the site copy is untouched. */
function upgradeHeadless(site: string, lock: Lock, srcRoot: string): UpgradeRow {
  const h = lock.headless!;
  const row: UpgradeRow = { id: "HEADLESS", action: "up-to-date", from: h.sourceHash.slice(0, 8), to: h.sourceHash.slice(0, 8), conflicts: [], merged: [] };
  const next = resolveHeadless(srcRoot, h.modules);
  if ("error" in next) { row.action = "conflict"; row.conflicts.push(next.error); return row; }
  row.to = next.hash.slice(0, 8);
  if (next.hash === h.sourceHash) return row;
  const touched = Object.entries(h.files).filter(([rel, hash]) => !existsSync(join(site, "headless", rel)) || sha256(readText(join(site, "headless", rel))) !== hash).map(([rel]) => rel);
  if (touched.length) { row.action = "skipped-diverged"; row.conflicts = touched; return row; }
  const files: Record<string, string> = {};
  for (const [rel, content] of Object.entries(next.files)) { writeFile(join(site, "headless", rel), content); writeFile(join(site, ".master/base-headless", rel), content); files[rel] = sha256(content); }
  h.files = files; h.sourceHash = next.hash;
  row.action = "applied";
  return row;
}

function finalize(site: string, entry: Lock["components"][number], master: ReturnType<typeof loadRegistry> extends Map<string, infer V> ? V : never) {
  for (const rel of listFiles(join(site, ".master/base", entry.id))) if (!(rel in master.files)) rmSync(baseFile(site, entry.id, rel), { force: true });
  const files: Record<string, string> = {};
  for (const [rel, content] of Object.entries(master.files)) {
    writeFile(baseFile(site, entry.id, rel), content);
    files[rel] = sha256(content);
  }
  entry.masterVersion = master.manifest.version;
  entry.sourceHash = master.hash;
  entry.files = files;
  const customized = Object.entries(files).some(([rel, h]) => !existsSync(siteFile(site, entry.id, rel)) || sha256(readText(siteFile(site, entry.id, rel))) !== h);
  entry.status = customized ? "customized" : "synced";
}

/** Turn a component into a site-owned fork: future upgrades skip it. */
export function eject(site: string, id: string): void {
  const lock = readLock(site);
  const c = lock.components.find((x) => x.id === id);
  if (!c) throw new Error(`${id} is not in ${site}/master.lock.json`);
  c.status = "diverged";
  writeLock(site, lock);
}

export interface Problem { component?: string; message: string }
/** Structural validation of a generated site. */
export function validate(site: string): Problem[] {
  const problems: Problem[] = [];
  let lock: Lock;
  try { lock = readLock(site); } catch (e) { return [{ message: `lock invalid: ${(e as Error).message}` }]; }
  for (const f of ["brand.config.json", "kit.config.json", "tokens/build/theme.css", "figma/component-map.json"])
    if (!existsSync(join(site, f))) problems.push({ message: `missing ${f}` });
  for (const c of lock.components) {
    for (const rel of Object.keys(c.files)) if (!existsSync(siteFile(site, c.id, rel))) problems.push({ component: c.id, message: `missing file ${rel}` });
    for (const rel of Object.keys(c.files)) {
      const p = siteFile(site, c.id, rel);
      if (existsSync(p) && MARKER.test(readText(p))) problems.push({ component: c.id, message: `unresolved merge markers in ${rel}` });
    }
    if (!existsSync(join(site, ".master/base", c.id))) problems.push({ component: c.id, message: "missing merge base snapshot" });
  }
  if (lock.headless) for (const rel of Object.keys(lock.headless.files)) {
    const p = join(site, "headless", rel);
    if (!existsSync(p)) problems.push({ component: "HEADLESS", message: `missing headless/${rel}` });
    else if (MARKER.test(readText(p))) problems.push({ component: "HEADLESS", message: `unresolved merge markers in headless/${rel}` });
  }
  for (const c of lock.components) if (!lock.headless && existsSync(join(site, "components", c.id.toLowerCase(), "Component.tsx")) && /@master-ds\/headless/.test(readText(join(site, "components", c.id.toLowerCase(), "Component.tsx"))))
    problems.push({ component: c.id, message: "imports @master-ds/headless but the lock has no headless copy" });
  return problems;
}
