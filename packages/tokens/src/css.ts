import StyleDictionary from "style-dictionary";
import type { DesignTokens } from "style-dictionary/types";
import { formattedVariables } from "style-dictionary/utils";
import type { BrandConfig } from "@master-ds/contracts";
import { buildBrandTokens, type BrandTokens } from "./theme.ts";

const PREFIX = "ds";

/** `--ds-color-accent` for color.accent.DEFAULT; prefix prevents collisions with Tailwind's own `--color-*`. */
StyleDictionary.registerTransform({
  name: "name/ds",
  type: "name",
  transform: (token) => [PREFIX, ...token.path.filter((p: string) => p !== "DEFAULT")].join("-").toLowerCase(),
});
StyleDictionary.registerTransformGroup({ name: "ds-css", transforms: ["attribute/cti", "name/ds", "color/css"] });

StyleDictionary.registerFormat({
  name: "css/ds-layered",
  format: ({ dictionary, options, file }) => {
    const { layer, selector } = (file.options ?? {}) as { layer: string; selector: string };
    const vars = formattedVariables({
      format: "css",
      dictionary,
      outputReferences: options?.outputReferences ?? true,
      usesDtcg: true,
    });
    return `@layer ${layer} {\n  ${selector} {\n${vars}\n  }\n}\n`;
  },
});

const paths = (tree: object, prefix: string[] = []): string[] =>
  Object.entries(tree).flatMap(([k, v]) =>
    v && typeof v === "object" && "$value" in v ? [[...prefix, k].join(".")] : paths(v as object, [...prefix, k]),
  );

async function run(tokens: DesignTokens, files: Array<{ destination: string; layer: string; selector: string; filter: (t: any) => boolean }>) {
  const sd = new StyleDictionary({
    tokens,
    usesDtcg: true,
    log: { verbosity: "silent", warnings: "disabled" },
    platforms: {
      css: {
        transformGroup: "ds-css",
        files: files.map((f) => ({
          destination: f.destination,
          format: "css/ds-layered",
          filter: f.filter,
          options: { outputReferences: true, layer: f.layer, selector: f.selector },
        })),
      },
    },
  });
  const out = await sd.formatPlatform("css");
  return Object.fromEntries(out.map((o) => [String(o.destination), String(o.output)]));
}

/** Tailwind v4 bridge: Tailwind names -> our prefixed runtime vars (never the reverse, so no cycles). */
function tailwindBridge(): string {
  return `/* Generated. Maps Tailwind v4 theme keys to Master runtime vars. */
@theme inline {
  --color-surface: var(--ds-color-surface-base);
  --color-surface-raised: var(--ds-color-surface-raised);
  --color-surface-sunken: var(--ds-color-surface-sunken);
  --color-fg: var(--ds-color-text-primary);
  --color-fg-muted: var(--ds-color-text-secondary);
  --color-line: var(--ds-color-border-subtle);
  --color-line-strong: var(--ds-color-border-strong);
  --color-accent: var(--ds-color-accent);
  --color-accent-hover: var(--ds-color-accent-hover);
  --color-accent-subtle: var(--ds-color-accent-subtle);
  --color-on-accent: var(--ds-color-on-accent);
  --radius-control: var(--ds-radius-control);
  --radius-container: var(--ds-radius-container);
  --radius-cta: var(--ds-radius-cta);
  --font-sans: var(--ds-font-sans);
  --font-display: var(--ds-font-display);
}
`;
}

export interface BrandBuild {
  themeCss: string;
  tailwindCss: string;
  tokens: BrandTokens;
}

export async function buildBrand(b: BrandConfig): Promise<BrandBuild> {
  const tokens = buildBrandTokens(b);
  const primSet = new Set(paths(tokens.primitive));
  const brandSel = `[data-brand="${b.slug}"]`;
  const isPrim = (t: any) => primSet.has(t.path.join("."));
  const componentFamilies = new Set(Object.keys(tokens.component));

  const light = await run({ ...merge(tokens.primitive, tokens.semanticLight, tokens.component) }, [
    { destination: "primitive.css", layer: "tokens.primitive", selector: brandSel, filter: isPrim },
    { destination: "semantic-light.css", layer: "tokens.semantic", selector: `${brandSel}, ${brandSel}[data-mode="light"]`, filter: (t) => !isPrim(t) && (t.path[0] === "color" || t.path[0] === "elevation") },
    { destination: "component.css", layer: "tokens.component", selector: brandSel, filter: (t) => componentFamilies.has(t.path[0]) },
  ]);
  const dark = await run({ ...merge(tokens.primitive, tokens.semanticDark, tokens.component) }, [
    { destination: "semantic-dark.css", layer: "tokens.semantic", selector: `${brandSel}[data-mode="dark"]`, filter: (t) => !isPrim(t) && (t.path[0] === "color" || t.path[0] === "elevation") },
  ]);

  const themeCss = [
    `/* Generated for brand "${b.slug}". Do not edit. */`,
    `@layer reset, tokens.primitive, tokens.semantic, tokens.component, components, effects, site-overrides;`,
    light["primitive.css"], light["semantic-light.css"], dark["semantic-dark.css"], light["component.css"],
  ].join("\n");
  return { themeCss, tailwindCss: tailwindBridge(), tokens };
}

function merge(...trees: object[]): DesignTokens {
  const out: Record<string, any> = {};
  for (const tree of trees) {
    for (const [k, v] of Object.entries(tree)) {
      out[k] = out[k] && !("$value" in v) ? merge(out[k], v) : v;
    }
  }
  return out;
}
