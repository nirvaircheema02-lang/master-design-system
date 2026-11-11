import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { brandConfig, type BrandConfig } from "@master-ds/contracts";
import { buildBrand } from "./css.ts";
import { STEPS } from "./palette.ts";

/**
 * Palette registry: every entry of palettes/palettes.json becomes a full, contrast-gated brand theme (all component tokens included).
 * Output: apps/gallery/public/palettes/<id>.css (loaded on demand) + apps/gallery/lib/palettes.generated.json (swatches, roles, contrast).
 * Exits 1 if ANY palette fails ANY contrast pair, so a palette cannot ship unreadable.
 */
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const raw = JSON.parse(readFileSync(join(root, "palettes/palettes.json"), "utf8")) as Array<{ id: string; name: string; group: string; note: string; seeds: BrandConfig["seeds"] }>;

type Tree = Record<string, any>;
const val = (tree: Tree, path: string): string | undefined => { let cur: any = tree; for (const p of path.split(".")) { cur = cur?.[p]; if (cur === undefined) return undefined; } return cur?.$value; };
const ROLES = ["surface.base", "surface.raised", "surface.sunken", "text.primary", "text.secondary", "border.subtle", "border.control", "accent.DEFAULT", "accent.ink", "accent.subtle", "on-accent", "success", "danger", "focus"] as const;

const out: unknown[] = [];
let failed = false;
mkdirSync(join(root, "apps/gallery/public/palettes"), { recursive: true });
for (const p of raw) {
  const cfg: BrandConfig = brandConfig.parse({ name: p.name, slug: `p-${p.id}`, concept: p.note, seeds: p.seeds, fonts: { sans: "Inter, system-ui, sans-serif" }, radiusStrategy: "soft", density: "comfortable", motion: "standard" });
  const b = await buildBrand(cfg);
  writeFileSync(join(root, "apps/gallery/public/palettes", `${p.id}.css`), b.themeCss);
  const bad = b.tokens.report.filter((r) => !r.ok);
  if (bad.length) { failed = true; console.log(`${p.id}: ${bad.length} FAILING`); for (const r of bad) console.log(`  FAIL ${r.pair} ${r.ratio} < ${r.min}`); }
  const ramp = (name: string) => Object.fromEntries(STEPS.map((s) => [s, val(b.tokens.primitive, `color.${name}.${s}`)]));
  const roles = (tree: Tree) => Object.fromEntries(ROLES.map((r) => [r, val(tree, `color.${r}`)]));
  out.push({ id: p.id, slug: cfg.slug, name: p.name, group: p.group, note: p.note, seeds: p.seeds, ramps: { primary: ramp("primary"), neutral: ramp("neutral") }, roles: { light: roles(b.tokens.semanticLight), dark: roles(b.tokens.semanticDark) }, contrast: { total: b.tokens.report.length, failing: bad.length } });
}
writeFileSync(join(root, "apps/gallery/lib/palettes.generated.json"), JSON.stringify(out, null, 1) + "\n");
console.log(`palettes: ${raw.length} built, ${out.filter((o: any) => o.contrast.failing).length} with failing contrast`);
void existsSync;
process.exit(failed ? 1 : 0);
