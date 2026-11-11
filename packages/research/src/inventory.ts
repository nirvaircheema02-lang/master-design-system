import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";
import { lintRef, overall, ref, verdict, CRITERIA, type Ref } from "./schema.ts";
import type { ProbeResult } from "./probe.ts";

export interface LoadedInventory { refs: Ref[]; errors: string[] }

/** Read every `REF-###/ref.yaml`, validate the schema AND the rubric rules. */
export function loadInventory(dir: string): LoadedInventory {
  const refs: Ref[] = [];
  const errors: string[] = [];
  if (!existsSync(dir)) return { refs, errors: [`inventory dir missing: ${dir}`] };
  for (const name of readdirSync(dir).filter((n) => /^REF-\d{3}$/.test(n)).sort()) {
    const file = join(dir, name, "ref.yaml");
    if (!existsSync(file)) { errors.push(`${name}: ref.yaml missing`); continue; }
    const parsed = ref.safeParse(YAML.parse(readFileSync(file, "utf8")));
    if (!parsed.success) { errors.push(`${name}: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`); continue; }
    if (parsed.data.id !== name) errors.push(`${name}: id ${parsed.data.id} does not match folder`);
    errors.push(...lintRef(parsed.data));
    refs.push(parsed.data);
  }
  const ids = new Set<string>();
  for (const r of refs) { if (ids.has(r.id)) errors.push(`duplicate ${r.id}`); ids.add(r.id); }
  const proposed = new Map<string, string>();
  for (const r of refs) if (r.proposedId) { const prev = proposed.get(r.proposedId); if (prev) errors.push(`${r.proposedId} proposed by both ${prev} and ${r.id}`); proposed.set(r.proposedId, r.id); }
  return { refs, errors };
}

/** Compact authoring entry: everything a human must decide. Measurements and images come from the probe. */
export interface SourceEntry extends Omit<Ref, "measured" | "id" | "captured"> { id?: string; probe?: string; captured?: string }

/** `probe: "S-stripe#2"` -> target 2 of research/probe/S-stripe/probe.json */
export function buildInventory(sources: SourceEntry[], opts: { probeDir: string; outDir: string; today: string }): Ref[] {
  const out: Ref[] = [];
  sources.forEach((s, i) => {
    const id = s.id ?? `REF-${String(i + 1).padStart(3, "0")}`;
    let measured: Ref["measured"] = null;
    const folder = join(opts.outDir, id);
    mkdirSync(folder, { recursive: true });
    if (s.probe) {
      const [pid, idx] = s.probe.split("#") as [string, string | undefined];
      const pf = join(opts.probeDir, pid, "probe.json");
      if (existsSync(pf)) {
        const pr = JSON.parse(readFileSync(pf, "utf8")) as ProbeResult;
        const t = pr.targets[Number(idx ?? 0)];
        if (t) {
          measured = {
            probeFile: `research/probe/${pid}/probe.json#${idx ?? 0}`,
            animations: t.animations.map((a) => ({ target: a.target + (a.pseudo ? a.pseudo : ""), property: a.property, durationMs: a.durationMs, easing: a.easing })),
            reducedMotionAnimations: t.reducedMotionAnimations,
          };
          for (const [src, dst] of [[t.rest_png, "rest.png"], [t.hover_png, "hover.png"]] as const) if (src && existsSync(src)) copyFileSync(src, join(folder, dst));
        }
      }
    }
    const { probe: _p, ...rest } = s;
    const r = ref.parse({ ...rest, id, captured: s.captured ?? opts.today, measured });
    writeFileSync(join(folder, "ref.yaml"), YAML.stringify(r, { lineWidth: 110 }));
    out.push(r);
  });
  return out;
}

export function coverage(refs: Ref[]) {
  const count = <K extends string>(f: (r: Ref) => K) => refs.reduce<Record<string, number>>((m, r) => ((m[f(r)] = (m[f(r)] ?? 0) + 1), m), {});
  return {
    total: refs.length,
    byCategory: count((r) => r.category), bySource: count((r) => r.sourceKind), byRecommendation: count((r) => r.recommendation),
    byCoupling: count((r) => r.coupling), measured: refs.filter((r) => r.measured).length,
  };
}

export function matrixMarkdown(refs: Ref[]): string {
  const rows = [...refs].sort((a, b) => a.category.localeCompare(b.category) || overall(b.scores) - overall(a.scores));
  const head = `| ID | Reference | Cat | Class | Radius | ${CRITERIA.map((c) => c.slice(0, 4)).join(" | ")} | Overall | Rec | Proposed | Licence |\n|---|---|---|---|---|${CRITERIA.map(() => "---").join("|")}|---|---|---|---|`;
  const lines = rows.map((r) => `| ${r.id} | [${r.name.replace(/\|/g, "/")}](${r.url}) | ${r.category} | ${r.coupling} | ${r.radiusSupport} | ${CRITERIA.map((c) => r.scores[c]).join(" | ")} | **${overall(r.scores)}** | ${r.recommendation} | ${r.proposedId ?? ""} | ${r.license.status}/${r.license.usage} |`);
  return [head, ...lines].join("\n");
}

export { verdict };
