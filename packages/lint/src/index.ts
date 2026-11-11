import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import postcss, { type AtRule, type Declaration, type Node } from "postcss";
import { manifest as manifestSchema, lintManifest, skinCss } from "@master-ds/contracts";

export interface Violation { file: string; line: number; rule: string; message: string }
export interface LintContext {
  /** Component-tier families from the token build, e.g. ["cta"]. Components may only read --ds-<family>-*. */
  families: string[];
  /** Names of every component-tier variable the token build actually emits (e.g. "--ds-cta-bg"). */
  emitted: Set<string>;
  /** Semantic variables (e.g. "--ds-color-accent-ink"): readable ONLY from generated skins.css. */
  semantic: Set<string>;
}

const FUNC_COLOR = /\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i;
const HEX = /#[0-9a-fA-F]{3,8}\b/;
const NAMED = /\b(white|black|red|green|blue|yellow|orange|purple|gray|grey|pink|brown|cyan|magenta|silver|gold|navy|teal)\b/i;
const LAYOUT_PROPS = /^(all|width|height|top|left|right|bottom|margin.*|padding.*|box-shadow|filter|backdrop-filter)$/;
const KEYFRAME_OK = /^(transform|opacity|clip-path|translate|scale|rotate|offset-distance|--ds-[a-z0-9-]+)$/;
const VAR = /var\(\s*(--[a-zA-Z0-9_-]+)/g;

const line = (n: Node) => n.source?.start?.line ?? 0;

function inLayer(n: Node): boolean {
  for (let p = n.parent; p; p = p.parent) if (p.type === "atrule" && (p as AtRule).name === "layer") return true;
  return false;
}
function inReducedMotion(n: Node): boolean {
  for (let p = n.parent; p; p = p.parent) if (p.type === "atrule" && (p as AtRule).name === "media" && /prefers-reduced-motion/.test((p as AtRule).params)) return true;
  return false;
}
function inKeyframes(n: Node): boolean {
  for (let p = n.parent; p; p = p.parent) if (p.type === "atrule" && /keyframes$/.test((p as AtRule).name)) return true;
  return false;
}

/** Returns violations plus the set of --ds-* variables the stylesheet reads. */
export function lintCss(file: string, css: string, ctx: LintContext, opts: { skin?: boolean; allowLayoutKeyframes?: string[] } = {}): { violations: Violation[]; used: Set<string> } {
  const violations: Violation[] = [];
  const used = new Set<string>();
  const add = (n: Node, rule: string, message: string) => violations.push({ file, line: line(n), rule, message });
  const root = postcss.parse(css, { from: file });

  root.walkRules((r) => {
    if (inKeyframes(r)) return;
    if (!inLayer(r) && !inReducedMotion(r)) add(r, "layer-required", `rule "${r.selector}" is outside any @layer (unlayered rules silently beat layered tokens); only prefers-reduced-motion may be unlayered`);
  });

  root.walkDecls((d: Declaration) => {
    const v = d.value;
    if (opts.skin && !(d.prop.startsWith("--ds-") && ctx.families.some((f) => d.prop.startsWith(`--ds-${f}-`)))) add(d, "skin-target", `skins may only set component tokens, not "${d.prop}"`);
    if (HEX.test(v) || FUNC_COLOR.test(v) || (!d.prop.startsWith("--") && NAMED.test(v) && /color|background|border|outline|fill|stroke|shadow/.test(d.prop)))
      add(d, "no-literal-color", `colour literal in "${d.prop}: ${v}" — use a --ds-<component>-* token`);
    for (const m of v.matchAll(VAR)) {
      const name = m[1]!;
      if (!name.startsWith("--ds-")) { if (!name.startsWith("--_")) add(d, "token-namespace", `${name} is outside the --ds- namespace (local helpers must start with --_)`); continue; }
      const isFamily = ctx.families.some((f) => name.startsWith(`--ds-${f}-`));
      if (opts.skin && !isFamily) {
        // skins map semantic -> component tokens, so this is the one place semantic reads are legal
        if (!ctx.semantic.has(name)) add(d, "unknown-token", `${name} is not a semantic token emitted by the token build`);
        continue;
      }
      used.add(name);
      if (!isFamily)
        add(d, "tier-only", `${name} is not a component-tier token (allowed families: ${ctx.families.map((f) => `--ds-${f}-*`).join(", ")}). Components may not read primitive or semantic tokens`);
      else if (!ctx.emitted.has(name)) add(d, "unknown-token", `${name} is not emitted by the token build`);
    }
    if (d.prop === "transition" || d.prop === "transition-property" || d.prop === "will-change") {
      const props = d.prop === "transition" ? d.value.split(",").map((s) => s.trim().split(/\s+/)[0]!) : d.value.split(",").map((s) => s.trim());
      for (const p of props) if (d.prop !== "will-change" && LAYOUT_PROPS.test(p)) add(d, "motion-properties", `transition on "${p}" — animate transform/opacity/clip-path only`);
    }
    if (inKeyframes(d) && !KEYFRAME_OK.test(d.prop) && !opts.allowLayoutKeyframes?.includes(d.prop)) add(d, "motion-properties", `@keyframes animates "${d.prop}" — allowed: transform, opacity, clip-path, registered --ds-* properties`);
    if (d.prop === "animation" || d.prop === "animation-name") { /* name checked via keyframes content */ }
  });

  root.walkAtRules("keyframes", (k) => {
    k.walkDecls((d) => { if (/box-shadow|filter/.test(d.prop)) add(d, "no-animated-shadow", `animated ${d.prop}`); });
  });
  return { violations, used };
}

export function lintTsx(file: string, src: string): Violation[] {
  const out: Violation[] = [];
  src.split("\n").forEach((text, i) => {
    const t = text.trim();
    if (t.startsWith("//") || t.startsWith("*") || t.startsWith("/*")) return;
    const code = text.replace(/\/\*.*?\*\//g, "").replace(/\/\/.*$/, "");
    if (HEX.test(code) || FUNC_COLOR.test(code)) out.push({ file, line: i + 1, rule: "no-literal-color", message: "colour literal in component source" });
    if (/style=\{\{[^}]*\b(color|background|backgroundColor|borderColor|boxShadow)\b/.test(code)) out.push({ file, line: i + 1, rule: "no-inline-style-colour", message: "inline style sets a colour; use tokens in CSS" });
    if (/from\s+["'][^"']*(tokens\/build|--ds-)/.test(code)) out.push({ file, line: i + 1, rule: "no-token-import", message: "components must not import token build output" });
  });
  return out;
}

const walk = (dir: string, out: string[] = []): string[] => {
  for (const n of readdirSync(dir)) { const p = join(dir, n); statSync(p).isDirectory() ? walk(p, out) : out.push(p); }
  return out;
};

/** Lint every component folder (`<root>/<category>/<nnn-slug>/manifest.json`). */
export function lintRegistry(registryRoot: string, ctx: LintContext): Violation[] {
  const all: Violation[] = [];
  for (const cat of readdirSync(registryRoot)) {
    const catDir = join(registryRoot, cat);
    if (!statSync(catDir).isDirectory()) continue;
    for (const comp of readdirSync(catDir)) {
      const dir = join(catDir, comp);
      const mfPath = join(dir, "manifest.json");
      if (!existsSync(mfPath)) continue;
      const rel = (p: string) => relative(registryRoot, p);
      let m;
      try { m = manifestSchema.parse(JSON.parse(readFileSync(mfPath, "utf8"))); }
      catch (e) { all.push({ file: rel(mfPath), line: 1, rule: "manifest-schema", message: String(e).slice(0, 200) }); continue; }
      for (const e of lintManifest(m)) all.push({ file: rel(mfPath), line: 1, rule: "manifest-rules", message: e });

      const usedAll = new Set<string>();
      const skinsPath = join(dir, "skins.css");
      const expected = skinCss(m);
      if (!existsSync(skinsPath)) all.push({ file: rel(dir), line: 1, rule: "skins-missing", message: "skins.css missing; run `pnpm build:skins`" });
      else if (readFileSync(skinsPath, "utf8") !== expected) all.push({ file: rel(skinsPath), line: 1, rule: "skins-stale", message: "skins.css does not match manifest.skins; run `pnpm build:skins`" });
      for (const f of walk(dir)) {
        if (f === skinsPath) { all.push(...lintCss(rel(f), readFileSync(f, "utf8"), ctx, { skin: true }).violations); continue; }
        if (/\.css$/.test(f)) { const r = lintCss(rel(f), readFileSync(f, "utf8"), ctx, { allowLayoutKeyframes: m.interaction.layoutProps }); all.push(...r.violations); r.used.forEach((u) => usedAll.add(u)); }
        else if (/\.tsx?$/.test(f) && !/\.(test|stories)\./.test(f)) {
          const src = readFileSync(f, "utf8");
          all.push(...lintTsx(rel(f), src));
          if (/from\s+["']@radix-ui\//.test(src)) all.push({ file: rel(f), line: 1, rule: "headless-boundary", message: "import headless primitives through @master-ds/headless, never @radix-ui/* directly (ADR 0004 adapter boundary)" });
          for (const mod of ["tabs", "dialog", "menu", "accordion", "popover", "tooltip"] as const) if (new RegExp(`\\b${{ tabs: "Tabs", dialog: "Dialog", menu: "Menu", accordion: "Accordion", popover: "Popover", tooltip: "Tooltip" }[mod]}\\.(Root|Trigger)`).test(src) && /@master-ds\/headless/.test(src) && !m.headless.includes(mod)) all.push({ file: rel(mfPath), line: 1, rule: "headless-declared", message: `component uses the ${mod} adapter but manifest.headless does not list '${mod}'` });
        }
      }
      // manifest <-> CSS <-> token build must agree
      const declared = new Set(m.tokens);
      for (const u of usedAll) if (!declared.has(u)) all.push({ file: rel(mfPath), line: 1, rule: "manifest-tokens", message: `CSS reads ${u} but manifest.tokens does not list it` });
      for (const d of declared) {
        if (!ctx.emitted.has(d)) all.push({ file: rel(mfPath), line: 1, rule: "manifest-tokens", message: `manifest lists ${d} which the token build does not emit` });
        else if (!usedAll.has(d)) all.push({ file: rel(mfPath), line: 1, rule: "manifest-tokens", message: `manifest lists ${d} but no CSS reads it (stale)` });
      }
    }
  }
  return all;
}

export { contextFromTokens } from "./context.ts";

/** Regenerate skins.css for every component (the only generated file inside a component folder). */
export function writeSkins(registryRoot: string, write: (path: string, content: string) => void): string[] {
  const out: string[] = [];
  for (const cat of readdirSync(registryRoot)) {
    const catDir = join(registryRoot, cat);
    if (!statSync(catDir).isDirectory()) continue;
    for (const comp of readdirSync(catDir)) {
      const mf = join(catDir, comp, "manifest.json");
      if (!existsSync(mf)) continue;
      const m = manifestSchema.parse(JSON.parse(readFileSync(mf, "utf8")));
      write(join(catDir, comp, "skins.css"), skinCss(m));
      out.push(m.id);
    }
  }
  return out;
}
