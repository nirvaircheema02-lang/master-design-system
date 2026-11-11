import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";

export const sha256 = (data: string | Uint8Array): string => "sha256:" + createHash("sha256").update(data).digest("hex");

export function listFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else out.push(relative(dir, p).split("\\").join("/"));
    }
  };
  walk(dir);
  return out;
}

export function writeFile(path: string, content: string | Uint8Array): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

export const readText = (p: string): string => readFileSync(p, "utf8");

/** Stable JSON (sorted keys) so generated files are byte-deterministic. */
export function stableJson(value: unknown): string {
  const sort = (v: unknown): unknown =>
    Array.isArray(v) ? v.map(sort)
    : v && typeof v === "object" ? Object.fromEntries(Object.entries(v as object).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, sort(x)]))
    : v;
  return JSON.stringify(sort(value), null, 2) + "\n";
}

export interface MergeResult { content: string; conflicts: number }

/** Three-way merge via `git merge-file` (no extra dependency). base = master@lock, ours = site, theirs = new master. */
export function threeWayMerge(base: string, ours: string, theirs: string): MergeResult {
  const dir = mkdtempSync(join(tmpdir(), "master-merge-"));
  try {
    writeFileSync(join(dir, "base"), base);
    writeFileSync(join(dir, "ours"), ours);
    writeFileSync(join(dir, "theirs"), theirs);
    const r = spawnSync("git", ["merge-file", "-p", "-L", "site", "-L", "master@locked", "-L", "master@new", join(dir, "ours"), join(dir, "base"), join(dir, "theirs")], { encoding: "utf8" });
    if (r.status === null || r.status < 0 || r.status > 127) throw new Error("git merge-file failed: " + r.stderr);
    return { content: r.stdout, conflicts: r.status };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export const gitAvailable = (): boolean => {
  try { execFileSync("git", ["--version"], { stdio: "ignore" }); return true; } catch { return false; }
};
