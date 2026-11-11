import { join, resolve } from "node:path";
import { brandConfig, checkEffects, checkRadius, componentClass, kitConfig, skinValue, lock as lockSchema, type BrandConfig, type KitConfig, type Lock, type Manifest } from "@master-ds/contracts";
import { buildBrand } from "@master-ds/tokens";
import { loadRegistry, type RegistryEntry } from "./registry.ts";
import { sha256, stableJson, writeFile } from "./util.ts";
import { resolveHeadless } from "./headless.ts";

export interface Flag { code: string; component?: string; message: string }
export interface GenerateOptions {
  registryRoot: string;
  brand: unknown;
  kit: unknown;
  outDir: string;
  /** Injectable for deterministic output/tests. */
  now?: string;
  generatorVersion?: string;
  /** Source of the headless adapter modules; default `<registryRoot>/../../headless/src`. Needed only when a picked component declares manifest.headless. */
  headlessRoot?: string;
}
export interface GenerateResult { ok: boolean; flags: Flag[]; lock?: Lock }

export async function generate(opts: GenerateOptions): Promise<GenerateResult> {
  const brand: BrandConfig = brandConfig.parse(opts.brand);
  const kit: KitConfig = kitConfig.parse(opts.kit);
  const registry = loadRegistry(opts.registryRoot);
  const flags: Flag[] = [];

  // 1. resolve instances against the registry
  const picked: Array<{ entry: RegistryEntry; inst: KitConfig["instances"][number] }> = [];
  const seen = new Set<string>();
  for (const inst of kit.instances) {
    const [id, version] = inst.ref.split("@") as [string, string];
    const entry = registry.get(id);
    if (!entry) { flags.push({ code: "unknown-component", component: id, message: `${id} not in registry` }); continue; }
    if (entry.manifest.version !== version) { flags.push({ code: "version-mismatch", component: id, message: `kit pins ${id}@${version}, registry has ${entry.manifest.version}` }); continue; }
    if (seen.has(id)) { flags.push({ code: "duplicate-instance", component: id, message: `${id} appears twice; one instance per component in v0` }); continue; }
    seen.add(id);
    if (!entry.manifest.skins.some((s) => s.id === inst.skin)) flags.push({ code: "unknown-skin", component: id, message: `skin '${inst.skin}' not defined for ${id}` });
    for (const [k, v] of Object.entries(inst.props)) {
      const allowed = entry.manifest.props[k];
      if (!allowed) flags.push({ code: "unknown-prop", component: id, message: `prop '${k}' not defined for ${id}` });
      else if (!allowed.includes(v)) flags.push({ code: "invalid-prop", component: id, message: `prop ${k}='${v}' not in [${allowed.join(", ")}]` });
    }
    for (const k of Object.keys(inst.tokenOverrides)) if (!/^--ds-[a-z0-9-]+$/.test(k)) flags.push({ code: "bad-override", component: id, message: `override key '${k}' must be a --ds-* variable` });
    picked.push({ entry, inst });
  }

  // 2. tokens + contrast
  const built = await buildBrand(brand);
  for (const u of built.tokens.overridesApplied.unknown) flags.push({ code: "unknown-override", message: `brand override '${u}' matches no token` });
  for (const r of built.tokens.report.filter((x) => !x.ok)) flags.push({ code: "contrast", message: `${r.pair} = ${r.ratio} (< ${r.min})` });

  // 3. shape compatibility using the radius the brand actually resolves to for EACH component's own radius role
  const RADIUS_ROLE: Record<string, string> = { cta: "cta", card: "container", acc: "container", frm: "container", field: "control", nav: "control", tab: "control", dlg: "container", menu: "container", tst: "container", pop: "container", tip: "control", choice: "control", stat: "container", pag: "control", tbl: "container", badge: "control", avt: "control", ldr: "control", type: "control" };
  const radii = (built.tokens.primitive as any).radius as Record<string, { $value: string }>;
  for (const { entry, inst } of picked) {
    const radiusToken = entry.manifest.tokens.find((t) => t.endsWith("-radius"));
    if (!radiusToken) continue; // boxless components (e.g. a text link) have no shape to check
    const family = radiusToken.split("-")[2] ?? "cta";
    const effective = inst.tokenOverrides[radiusToken] ?? radii[RADIUS_ROLE[family] ?? "cta"]!.$value;
    const f = checkRadius(entry.manifest, effective);
    if (f) flags.push(f);
  }
  for (const { entry } of picked) { const f = checkEffects(entry.manifest, brand.effects); if (f) flags.push(f); }
  if (flags.length) return { ok: false, flags };

  // 3b. headless adapter modules the picked components import (copied verbatim, like components)
  const modules = [...new Set(picked.flatMap(({ entry }) => entry.manifest.headless))];
  let headless: ReturnType<typeof resolveHeadless> | undefined;
  if (modules.length) {
    headless = resolveHeadless(opts.headlessRoot ?? resolve(opts.registryRoot, "../../headless/src"), modules);
    if ("error" in headless) return { ok: false, flags: [{ code: "headless-missing", message: headless.error }] };
  }

  // 4. emit
  const out = opts.outDir;
  const t = built.tokens;
  writeFile(join(out, "tokens/primitive.json"), stableJson(t.primitive));
  writeFile(join(out, "tokens/semantic.light.json"), stableJson(t.semanticLight));
  writeFile(join(out, "tokens/semantic.dark.json"), stableJson(t.semanticDark));
  writeFile(join(out, "tokens/component.json"), stableJson(t.component));
  writeFile(join(out, "tokens/build/theme.css"), built.themeCss);
  writeFile(join(out, "tokens/build/tailwind-theme.css"), built.tailwindCss);
  writeFile(join(out, "tokens/build/contrast-report.json"), stableJson(t.report));
  writeFile(join(out, "brand.config.json"), stableJson(brand));
  writeFile(join(out, "kit.config.json"), stableJson(kit));

  const lockEntries: Lock["components"] = [];
  const componentMap: unknown[] = [];
  for (const { entry, inst } of picked) {
    const m = entry.manifest;
    const dirName = m.id.toLowerCase();
    const files: Record<string, string> = {};
    for (const [rel, content] of Object.entries(entry.files)) {
      writeFile(join(out, "components", dirName, rel), content);
      writeFile(join(out, ".master/base", m.id, rel), content); // merge base for `master upgrade`
      files[rel] = sha256(content);
    }
    const skin = m.skins.find((s) => s.id === inst.skin)!;
    const binds = Object.entries(skin.bind).map(([token, path]) => `    ${token}: ${skinValue(path)};`);
    const overrides = Object.entries(inst.tokenOverrides).map(([k, v]) => `    ${k}: ${v};`);
    // skins.css (copied verbatim) already carries every skin behind [data-skin]. The instance only picks which skin is the
    // DEFAULT for this site (applies when a usage sets no data-skin) plus site token overrides.
    writeFile(join(out, "components", dirName, "instance.css"),
      `/* Site-owned: Instance of ${inst.ref} (default skin: ${inst.skin}). Safe to edit. */\n@layer site-overrides {\n  [data-brand="${brand.slug}"] ${componentClass(m)}:not([data-skin]) {\n${[...binds, ...overrides].join("\n")}\n  }\n}\n`);
    writeFile(join(out, "components", dirName, "instance.ts"),
      `export const instance = ${JSON.stringify({ ref: inst.ref, skin: inst.skin, props: inst.props }, null, 2)} as const;\n`);
    writeFile(join(out, "docs/components", `${dirName}.md`),
      `# ${m.id} — ${m.name}\n\n${m.description}\n\n- Version: ${m.version} (${m.lifecycle})\n- Interaction class: ${m.interaction.class} (${m.interaction.modules.join(", ") || "none"})\n- Radius support: ${m.constraints.radiusSupport}\n- Reduced motion: ${m.a11y.reducedMotion}\n- States: ${m.states.join(", ")}\n- Skin in use: ${inst.skin}\n- Tokens: ${m.tokens.join(", ")}\n`);
    componentMap.push({ id: m.id, version: m.version, figma: m.figma });
    lockEntries.push({ id: m.id, masterVersion: m.version, sourceHash: entry.hash, status: "synced", files });
  }
  writeFile(join(out, "figma/component-map.json"), stableJson(componentMap));
  let headlessLock: Lock["headless"];
  if (headless && !("error" in headless)) {
    const hashes: Record<string, string> = {};
    for (const [rel, content] of Object.entries(headless.files)) {
      writeFile(join(out, "headless", rel), content);
      writeFile(join(out, ".master/base-headless", rel), content);
      hashes[rel] = sha256(content);
    }
    writeFile(join(out, "package.json"), JSON.stringify({ name: `${brand.slug}-design-system`, private: true, type: "module", dependencies: { "@master-ds/headless": "file:./headless", react: headless.deps.react, "react-dom": headless.deps["react-dom"] } }, null, 2) + "\n");
    headlessLock = { modules: modules.sort(), sourceHash: headless.hash, files: hashes };
  }

  const lock: Lock = lockSchema.parse({
    lockVersion: 1,
    generator: opts.generatorVersion ?? "master-generator@0.0.0",
    generatedAt: opts.now ?? new Date().toISOString(),
    brand: brand.slug,
    tokensHash: sha256(built.themeCss),
    components: lockEntries.sort((a, b) => a.id.localeCompare(b.id)),
    ...(headlessLock ? { headless: headlessLock } : {}),
  });
  writeFile(join(out, "master.lock.json"), stableJson(lock));
  return { ok: true, flags: [], lock };
}
