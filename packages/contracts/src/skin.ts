import type { Manifest } from "./manifest.ts";

export const SKIN_KEYWORDS = new Set(["transparent", "currentColor"]);

/** `color.accent.ink` -> `var(--ds-color-accent-ink)`; keywords pass through. */
export const skinValue = (path: string): string => (SKIN_KEYWORDS.has(path) ? path : `var(--ds-${path.replace(/\./g, "-").toLowerCase()})`);

/** CSS class a component's root element carries: CTA-003 -> `.ds-cta-003`. */
export const componentClass = (m: Pick<Manifest, "id">): string => `.ds-${m.id.toLowerCase()}`;

/**
 * Skins are DATA (manifest.skins); this renders them. The first skin is the default (applies when no data-skin
 * attribute is set). Output is checked into the component folder and verified by master-lint so it cannot go stale.
 */
export function skinCss(m: Manifest): string {
  const cls = componentClass(m);
  const rules = m.skins.map((sk, i) => {
    const sel = i === 0 ? `${cls}:not([data-skin]),\n  ${cls}[data-skin="${sk.id}"]` : `${cls}[data-skin="${sk.id}"]`;
    const decls = Object.entries(sk.bind).map(([k, v]) => `    ${k}: ${skinValue(v)};`).join("\n");
    return `  ${sel} {\n${decls}\n  }`;
  });
  return `/* Generated from manifest.json by \`pnpm build:skins\`. Do not edit. */\n@layer components {\n${rules.join("\n")}\n}\n`;
}
