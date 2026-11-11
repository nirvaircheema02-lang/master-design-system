import "server-only";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { brandConfig, manifest, RADIUS_ROLES, type BrandConfig, type Manifest } from "@master-ds/contracts";

// The gallery runs from apps/gallery; the repo root is two levels up.
const ROOT = resolve(process.cwd(), "../..");

export function loadManifests(): Manifest[] {
  const base = join(ROOT, "packages/components/src");
  const out: Manifest[] = [];
  for (const cat of readdirSync(base)) {
    const catDir = join(base, cat);
    if (!statSync(catDir).isDirectory()) continue;
    for (const comp of readdirSync(catDir)) {
      const mf = join(catDir, comp, "manifest.json");
      if (existsSync(mf)) out.push(manifest.parse(JSON.parse(readFileSync(mf, "utf8"))));
    }
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

export interface BrandEntry { config: BrandConfig; ctaRadius: string; themeCss: string | null }

/** Brand configs + their generated theme (run `pnpm build:tokens` first). All themes are inlined, scoped by data-brand. */
export function loadBrands(): BrandEntry[] {
  const dir = join(ROOT, "brands");
  return readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => {
    const config = brandConfig.parse(JSON.parse(readFileSync(join(dir, f), "utf8")));
    const css = join(ROOT, "packages/tokens/build", config.slug, "theme.css");
    return { config, ctaRadius: config.overrides["radius.cta"] ?? RADIUS_ROLES[config.radiusStrategy].cta, themeCss: existsSync(css) ? readFileSync(css, "utf8") : null };
  });
}
