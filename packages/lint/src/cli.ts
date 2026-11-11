#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";
import { lintRegistry, writeSkins } from "./index.ts";
import { contextFromTokens } from "./context.ts";

const here = dirname(fileURLToPath(import.meta.url));
const registry = resolve(process.argv.slice(2).find((a) => !a.startsWith("--")) ?? resolve(here, "../../components/src"));
if (process.argv.includes("--write-skins")) { const ids = writeSkins(registry, (p, c) => writeFileSync(p, c)); console.log(`skins.css written for ${ids.join(", ")}`); process.exit(0); }
const v = lintRegistry(registry, contextFromTokens());
for (const x of v) console.error(`${x.file}:${x.line}  [${x.rule}]  ${x.message}`);
console.log(v.length ? `master-lint: ${v.length} violation(s)` : "master-lint: clean");
process.exit(v.length ? 1 : 0);
