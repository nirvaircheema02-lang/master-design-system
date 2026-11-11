import { buildBrandTokens } from "@master-ds/tokens";
import { brandConfig } from "@master-ds/contracts";
import type { LintContext } from "./index.ts";

/** Derive the allowed component-tier families/variables from the real token build (single source of truth). */
export function contextFromTokens(): LintContext {
  const probe = brandConfig.parse({ name: "probe", slug: "probe", seeds: { primary: "#1f4fd8" }, fonts: { sans: "Inter" }, radiusStrategy: "soft" });
  const built = buildBrandTokens(probe);
  const component = built.component as Record<string, Record<string, unknown>>;
  const families = Object.keys(component);
  const emitted = new Set<string>();
  for (const f of families) for (const k of Object.keys(component[f]!)) emitted.add(`--ds-${f}-${k}`.toLowerCase());
  const semantic = new Set<string>();
  const walk = (node: Record<string, unknown>, path: string[]) => {
    for (const [k, v] of Object.entries(node)) {
      if (v && typeof v === "object" && "$value" in v) semantic.add(`--ds-${[...path, k].filter((p) => p !== "DEFAULT").join("-")}`.toLowerCase());
      else walk(v as Record<string, unknown>, [...path, k]);
    }
  };
  walk(built.semanticLight as Record<string, unknown>, []);
  return { families, emitted, semantic };
}
