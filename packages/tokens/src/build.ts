import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { brandConfig } from "@master-ds/contracts";
import { buildBrand } from "./css.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const brandsDir = join(root, "brands");
const outRoot = process.argv[2] ? resolve(process.argv[2]) : join(root, "packages/tokens/build");

let failed = false;
for (const f of readdirSync(brandsDir).filter((n) => n.endsWith(".json"))) {
  const cfg = brandConfig.parse(JSON.parse(readFileSync(join(brandsDir, f), "utf8")));
  const b = await buildBrand(cfg);
  const dir = join(outRoot, cfg.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "theme.css"), b.themeCss);
  writeFileSync(join(dir, "tailwind-theme.css"), b.tailwindCss);
  writeFileSync(join(dir, "contrast-report.json"), JSON.stringify(b.tokens.report, null, 2));
  const bad = b.tokens.report.filter((r) => !r.ok);
  console.log(`${cfg.slug}: ${b.tokens.report.length} contrast checks, ${bad.length} failing`);
  for (const r of bad) console.log(`  FAIL ${r.pair} ${r.ratio} < ${r.min}`);
  if (bad.length) failed = true;
}
process.exit(failed ? 1 : 0);
