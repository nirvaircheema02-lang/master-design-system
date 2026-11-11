import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { manifest, lintManifest, type Manifest } from "@master-ds/contracts";
import { listFiles, readText, sha256 } from "./util.ts";

export interface RegistryEntry {
  manifest: Manifest;
  dir: string;
  /** files relative to dir (manifest.json included), excluding tests/stories (not copied in the spike). */
  files: Record<string, string>; // rel path -> content
  /** sha256 over (path + content) of every copied file; the registry's content hash. */
  hash: string;
}

const SKIP = /(\.test\.|\.stories\.|^node_modules\/)/;

/** Scan `<registryRoot>/<category>/<nnn-slug>/manifest.json`. Pure read; never writes. */
export function loadRegistry(registryRoot: string): Map<string, RegistryEntry> {
  const out = new Map<string, RegistryEntry>();
  for (const cat of readdirSync(registryRoot)) {
    const catDir = join(registryRoot, cat);
    if (!statSync(catDir).isDirectory()) continue;
    for (const comp of readdirSync(catDir)) {
      const dir = join(catDir, comp);
      const mf = join(dir, "manifest.json");
      if (!existsSync(mf)) continue;
      const parsed = manifest.parse(JSON.parse(readText(mf)));
      const errs = lintManifest(parsed);
      if (errs.length) throw new Error(`${parsed.id}: ${errs.join("; ")}`);
      const files: Record<string, string> = {};
      for (const rel of listFiles(dir)) if (!SKIP.test(rel)) files[rel] = readText(join(dir, rel));
      const hash = sha256(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)).map(([p, c]) => p + "\0" + c).join("\n"));
      if (out.has(parsed.id)) throw new Error(`duplicate component id ${parsed.id}`);
      out.set(parsed.id, { manifest: parsed, dir, files, hash });
    }
  }
  return out;
}

/** Hash of the entire registry tree; used to prove the Master was not modified by generation. */
export function registryFingerprint(registryRoot: string): string {
  const parts = listFiles(registryRoot).map((rel) => rel + "\0" + sha256(readText(join(registryRoot, rel))));
  return sha256(parts.join("\n"));
}
