#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { eject, generate, status, upgrade, validate } from "./index.ts";

const here = dirname(fileURLToPath(import.meta.url));
const defaultRegistry = resolve(here, "../../components/src");
const [cmd, ...rest] = process.argv.slice(2);
const flag = (n: string) => { const i = rest.indexOf(`--${n}`); return i >= 0 ? rest[i + 1] : undefined; };
const json = (p: string) => JSON.parse(readFileSync(resolve(p), "utf8"));
const registry = resolve(flag("registry") ?? defaultRegistry);

switch (cmd) {
  case "generate": {
    const brand = flag("brand"), kit = flag("kit"), out = flag("out");
    if (!brand || !kit || !out) { console.error("usage: master generate --brand b.json --kit k.json --out dir [--registry dir]"); process.exit(2); }
    const r = await generate({ registryRoot: registry, brand: json(brand), kit: json(kit), outDir: resolve(out) });
    if (!r.ok) { for (const f of r.flags) console.error(`FLAG [${f.code}] ${f.component ?? ""} ${f.message}`); process.exit(1); }
    console.log(`generated ${r.lock!.components.length} component(s) for ${r.lock!.brand} -> ${out}`);
    break;
  }
  case "status": console.table(status(resolve(rest[0]!), registry)); break;
  case "upgrade": {
    const rows = upgrade(resolve(rest[0]!), registry, rest.slice(1).filter((a) => !a.startsWith("--")));
    console.table(rows.map((r) => ({ ...r, conflicts: r.conflicts.join(","), merged: r.merged.join(",") })));
    process.exit(rows.some((r) => r.action === "conflict") ? 3 : 0);
    break;
  }
  case "eject": eject(resolve(rest[0]!), rest[1]!); console.log(`${rest[1]} ejected (status: diverged)`); break;
  case "validate": {
    const p = validate(resolve(rest[0]!));
    for (const x of p) console.error(`PROBLEM ${x.component ?? ""} ${x.message}`);
    process.exit(p.length ? 1 : 0);
    break;
  }
  default: console.error("commands: generate | status | upgrade | eject | validate"); process.exit(2);
}
