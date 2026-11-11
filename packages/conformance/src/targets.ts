import { existsSync, readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { brandConfig, manifest as manifestSchema, type BrandConfig, type Manifest } from "@master-ds/contracts";
import { buildBrand } from "@master-ds/tokens";

export interface ConformanceComponent { dir: string; manifest: Manifest; css: string[] }
export interface Target {
  name: string;
  brand: BrandConfig;
  themeCss: string;
  components: ConformanceComponent[];
  /** A generated site's own copy of the headless adapter; bundling aliases @master-ds/headless to it. */
  headlessDir?: string;
}

const cssIn = (dir: string) => readdirSync(dir).filter((f) => f.endsWith(".css")).map((f) => join(dir, f));

/** Every component in the Master registry, rendered under one brand theme. */
export async function masterTarget(registryRoot: string, brand: BrandConfig, workdir: string): Promise<Target> {
  const components: ConformanceComponent[] = [];
  for (const cat of readdirSync(registryRoot)) {
    const catDir = join(registryRoot, cat);
    if (!statSync(catDir).isDirectory()) continue;
    for (const comp of readdirSync(catDir)) {
      const dir = join(catDir, comp);
      const mf = join(dir, "manifest.json");
      if (existsSync(mf)) components.push({ dir, manifest: manifestSchema.parse(JSON.parse(readFileSync(mf, "utf8"))), css: cssIn(dir) });
    }
  }
  const built = await buildBrand(brand);
  mkdirSync(workdir, { recursive: true });
  const themeCss = join(workdir, `${brand.slug}.theme.css`);
  writeFileSync(themeCss, built.themeCss);
  return { name: `master/${brand.slug}`, brand, themeCss, components };
}

/** A generated site: its own copied components + its own instance.css + its own built theme. */
export function siteTarget(siteDir: string): Target {
  const brand = brandConfig.parse(JSON.parse(readFileSync(join(siteDir, "brand.config.json"), "utf8")));
  const components: ConformanceComponent[] = [];
  const root = join(siteDir, "components");
  for (const comp of readdirSync(root)) {
    const dir = join(root, comp);
    components.push({ dir, manifest: manifestSchema.parse(JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"))), css: cssIn(dir) });
  }
  return { name: `site/${brand.slug}`, brand, themeCss: join(siteDir, "tokens/build/theme.css"), components, headlessDir: existsSync(join(siteDir, "headless")) ? join(siteDir, "headless") : undefined };
}
