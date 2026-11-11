import "server-only";
import { EFFECT_LEVELS, ICON_CAPS, ICON_STROKES, RADIUS_ROLES, TYPE_SCALES, jsonSchemas } from "@master-ds/contracts";
import { loadBrands, loadManifests } from "./registry";
import { groupOf } from "./nav";
import { layerOf } from "./atomic";
import { PRESETS } from "./presets";

/** The whole Master Library as plain data: what a script or an AI agent needs to pick components and write the two config files. */
export function registryDoc() {
  const manifests = loadManifests();
  const byId = new Map(manifests.map((m) => [m.id, m]));
  return {
    name: "master-ds",
    description: "Brand-neutral component library. A site gets a Brand Design System generated from a brand.config.json and a kit.config.json.",
    schemaVersion: 1,
    counts: { components: manifests.length },
    components: manifests.map((m) => ({
      id: m.id, ref: `${m.id}@${m.version}`, name: m.name, slug: m.slug, category: m.category, group: groupOf(m.id), layer: layerOf(m.id),
      version: m.version, lifecycle: m.lifecycle, description: m.description, url: `/components/${m.id}/`,
      variants: m.props.design ?? [], styles: m.skins.map((s) => s.id),
      props: m.props, states: m.states, tokens: m.tokens,
      interaction: { class: m.interaction.class, modules: m.interaction.modules },
      constraints: { radiusSupport: m.constraints.radiusSupport, minContrast: m.constraints.minContrast },
      a11y: { role: m.a11y.role, keyboard: m.a11y.keyboard, reducedMotion: m.a11y.reducedMotion },
      discovery: m.discovery ?? null,
    })),
    brands: loadBrands().map((b) => ({ slug: b.config.slug, name: b.config.name, concept: b.config.concept ?? null, seeds: b.config.seeds, fonts: b.config.fonts, radiusStrategy: b.config.radiusStrategy, density: b.config.density, motion: b.config.motion })),
    presets: PRESETS.map((p) => ({ key: p.key, name: p.name, blurb: p.blurb, components: p.ids.filter((id) => byId.has(id)).map((id) => `${id}@${byId.get(id)!.version}`) })),
    options: {
      radiusStrategy: Object.keys(RADIUS_ROLES), density: ["compact", "comfortable", "spacious"], motion: ["calm", "standard", "lively"],
      iconStroke: [...ICON_STROKES], iconCap: [...ICON_CAPS], typeScale: [...TYPE_SCALES], effects: [...EFFECT_LEVELS],
    },
    schemas: { brandConfig: jsonSchemas.brandConfig, kitConfig: jsonSchemas.kitConfig },
  };
}

/** llms.txt: a short plain-text guide for language models and people who skim. */
export function llmsTxt(): string {
  const d = registryDoc();
  const groups = [...new Set(d.components.map((c) => c.group))];
  const lines: string[] = [
    "# Master Design System",
    "",
    "> A brand-neutral library of " + d.counts.components + " React components. You do not edit the library. You write two small JSON files, and `master generate` builds a Brand Design System (components, tokens, docs, lock file) for one website.",
    "",
    "## How to build a Brand Design System",
    "1. Pick components from the list below (each has an id and a version, written `ID@version`).",
    "2. Write `kit.config.json`: `{ \"instances\": [ { \"ref\": \"CTA-003@1.0.0\", \"skin\": \"solid-accent\", \"props\": { \"size\": \"md\" } } ] }`. `skin` is the Style, `props.design` is the Variant.",
    "3. Write `brand.config.json`: name, slug, seeds (primary colour as #rrggbb), fonts, radiusStrategy, density, motion, and optionally icons, typeScale, effects.",
    "4. Run `master generate --brand brand.config.json --kit kit.config.json --out ./my-design-system`, then `master validate ./my-design-system`.",
    "",
    "## Rules the generator enforces",
    "- Every colour pair must pass contrast (the build reports it). Radius: `sharp`, `soft`, `rounded`, `pill`, `mixed`. A component that does not support the resulting corners is refused.",
    "- `effects` is `full` (default), `subtle` or `minimal`. Expressive components (pointer-following or structure-changing effects) need a higher level and are refused below it.",
    "- `icons`: stroke `" + d.options.iconStroke.join("` / `") + "`, cap `" + d.options.iconCap.join("` / `") + "`. `typeScale`: `" + d.options.typeScale.join("` / `") + "`.",
    "- Never invent props, styles or variants: use only the values listed for each component in /registry.json.",
    "",
    "## Machine-readable",
    "- /registry.json: every component with variants, styles, props, states, tokens, constraints, usage notes, plus the brand and kit JSON Schemas and the allowed option values.",
    "- Starting kits: " + d.presets.map((p) => `${p.name} (${p.components.length} components)`).join(", ") + ".",
    "",
    "## Components",
  ];
  for (const g of groups) {
    lines.push("", `### ${g}`);
    for (const c of d.components.filter((x) => x.group === g)) {
      const use = c.discovery?.useCases?.[0];
      lines.push(`- ${c.ref} ${c.name}: ${c.description}${use ? ` Use: ${use}.` : ""}${c.variants.length ? ` Variants: ${c.variants.join(", ")}.` : ""} Styles: ${c.styles.join(", ")}.`);
    }
  }
  return lines.join("\n") + "\n";
}
