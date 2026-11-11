"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { brandConfig, checkEffects, checkRadius, RADIUS_ROLES, TYPE_SCALE_RATIO, type Manifest } from "@master-ds/contracts";
import { buildBrandTokens } from "@master-ds/tokens/theme";
import { PREVIEWS } from "../lib/components";
import { groupOf } from "../lib/nav";
import { FONTS, GAPS, PRESETS } from "../lib/presets";
import { KIT_EVENT, defaultInstance, readKit, writeKit, type KitInstance } from "../lib/kit";
import { readProject, slugify, writeProject, type BrandProject, type Strategy } from "../lib/project";

export interface BaseTheme { slug: string; name: string; group: string; seeds: BrandProject["seeds"]; radiusStrategy: Strategy; density: BrandProject["density"]; motion: BrandProject["motion"]; fonts: { sans: string } }
const STEPS = ["Explore", "Select", "Customise", "Generate"] as const;
const STRATEGIES: Array<[Strategy, string]> = [["sharp", "Sharp (0)"], ["soft", "Soft (4px)"], ["rounded", "Rounded (12px)"], ["pill", "Pill"], ["mixed", "Mixed"]];
const HEX = /^#[0-9a-fA-F]{6}$/;

const download = (name: string, text: string) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

export function BrandWorkflow({ manifests, bases }: { manifests: Manifest[]; bases: BaseTheme[] }) {
  const byId = useMemo(() => new Map(manifests.map((m) => [m.id, m])), [manifests]);
  const first = bases.find((b) => b.slug === "finova") ?? bases[0]!;
  const initial = (): BrandProject => ({ name: "My brand", slug: "my-brand", concept: "", base: first.slug, seeds: { ...first.seeds }, fonts: { sans: first.fonts.sans }, icons: { stroke: "regular", cap: "round" }, typeScale: "standard", effects: "full", radiusStrategy: first.radiusStrategy, density: first.density, motion: first.motion, step: 0 });
  const [p, setP] = useState<BrandProject>(initial);
  const [kit, setKit] = useState<KitInstance[]>([]);
  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = readProject();
    if (saved) setP({ ...initial(), ...saved });
    setKit(readKit());
    setReady(true);
    const u = () => setKit(readKit());
    window.addEventListener(KIT_EVENT, u); window.addEventListener("storage", u);
    return () => { window.removeEventListener(KIT_EVENT, u); window.removeEventListener("storage", u); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (ready) writeProject(p); }, [p, ready]);

  // the preview borrows a built theme; palettes load their CSS on demand
  useEffect(() => {
    if (!p.base.startsWith("p-")) return;
    const id = `palette-css-${p.base}`;
    if (!document.getElementById(id)) { const l = document.createElement("link"); l.id = id; l.rel = "stylesheet"; l.href = `/palettes/${p.base.slice(2)}.css`; document.head.appendChild(l); }
  }, [p.base]);

  const set = (patch: Partial<BrandProject>) => setP((x) => ({ ...x, ...patch }));
  const go = (step: number) => { set({ step }); window.scrollTo({ top: 0 }); };
  const pickBase = (slug: string) => { const b = bases.find((x) => x.slug === slug)!; set({ base: slug, seeds: { ...b.seeds }, radiusStrategy: b.radiusStrategy, density: b.density, motion: b.motion, fonts: { ...p.fonts, sans: b.fonts.sans } }); };
  const base = bases.find((b) => b.slug === p.base) ?? first;
  const seedsChanged = JSON.stringify(p.seeds) !== JSON.stringify(base.seeds);

  const cfgInput = { name: p.name.trim() || "My brand", slug: slugify(p.slug || p.name), ...(p.concept.trim() ? { concept: p.concept.trim() } : {}), seeds: p.seeds, fonts: { sans: p.fonts.sans, ...(p.fonts.display ? { display: p.fonts.display } : {}), ...(p.fonts.mono ? { mono: p.fonts.mono } : {}) }, radiusStrategy: p.radiusStrategy, density: p.density, motion: p.motion, ...(p.icons.stroke !== "regular" || p.icons.cap !== "round" ? { icons: p.icons } : {}), ...(p.typeScale !== "standard" ? { typeScale: p.typeScale } : {}), ...(p.effects !== "full" ? { effects: p.effects } : {}), overrides: {} };
  const parsed = useMemo(() => brandConfig.safeParse(cfgInput), [JSON.stringify(cfgInput)]); // eslint-disable-line react-hooks/exhaustive-deps
  const contrast = useMemo(() => { try { return parsed.success ? buildBrandTokens(parsed.data).report : null; } catch { return null; } }, [parsed]);
  const failing = contrast ? contrast.filter((r) => !r.ok) : [];
  const effectiveRadius = RADIUS_ROLES[p.radiusStrategy].cta;
  const kitItems = kit.map((k) => ({ k, m: byId.get(k.ref.split("@")[0]!) })).filter((x): x is { k: KitInstance; m: Manifest } => !!x.m);
  const flags = kitItems.map((x) => ({ ...x, flag: checkRadius(x.m, effectiveRadius) })).filter((x) => x.flag);
  const effectFlags = kitItems.map((x) => ({ ...x, flag: checkEffects(x.m, p.effects) })).filter((x) => x.flag);
  const nFull = manifests.filter((m) => m.discovery?.effects === "full").length, nExpressive = manifests.filter((m) => m.discovery?.effects).length;

  const setKitIds = (ids: string[]) => writeKit(ids.map((id) => byId.get(id)).filter((m): m is Manifest => !!m).map(defaultInstance));
  const addId = (id: string) => { const m = byId.get(id); if (m && !kit.some((k) => k.ref.startsWith(id + "@"))) writeKit([...kit, defaultInstance(m)]); };
  const copy = async (key: string, text: string) => { try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(""), 1500); } catch { /* clipboard blocked */ } };

  const brandJson = parsed.success ? JSON.stringify(parsed.data, null, 2) : "";
  const kitJson = JSON.stringify({ instances: kit }, null, 2);
  const slug = parsed.success ? parsed.data.slug : "my-brand";
  const cmd = `master generate --brand ${slug}.brand.json --kit ${slug}.kit.json --out ./${slug}-design-system`;
  const blockers = [
    ...(kit.length === 0 ? ["The kit is empty: pick components in Explore or Select."] : []),
    ...(!parsed.success ? parsed.error.issues.map((i) => `Brand: ${i.path.join(".")} ${i.message}`) : []),
    ...(failing.length ? [`${failing.length} colour pair(s) fail the contrast check: change the colours.`] : []),
    ...flags.map((f) => `${f.m.id} ${f.m.name} does not support ${p.radiusStrategy} corners: ${f.flag!.message}`),
    ...effectFlags.map((f) => `${f.m.id} ${f.m.name} is too expressive for effects level “${p.effects}”: remove it or raise the level.`),
  ];

  const exportProject = () => download(`${slug}.project.json`, JSON.stringify({ master: "brand-project-v0", brand: cfgInput, base: p.base, kit }, null, 2));
  const importProject = async (file: File) => {
    try {
      const j = JSON.parse(await file.text());
      if (j?.master !== "brand-project-v0" || !j.brand) throw new Error("not a Master brand project file");
      const r = brandConfig.parse(j.brand);
      setP((x) => ({ ...x, name: r.name, slug: r.slug, concept: r.concept ?? "", base: bases.some((b) => b.slug === j.base) ? j.base : x.base, seeds: r.seeds, fonts: r.fonts, radiusStrategy: r.radiusStrategy, density: r.density, motion: r.motion, icons: { stroke: r.icons?.stroke ?? "regular", cap: r.icons?.cap ?? "round" }, typeScale: r.typeScale ?? "standard", effects: r.effects ?? "full" }));
      writeKit(Array.isArray(j.kit) ? j.kit : []);
      setMsg(`Imported “${r.name}” with ${Array.isArray(j.kit) ? j.kit.length : 0} component(s).`);
    } catch (e) { setMsg(`Could not import: ${(e as Error).message}`); }
  };

  const ratio = TYPE_SCALE_RATIO[p.typeScale];
  const scaleVars = p.typeScale === "standard" ? {} : Object.fromEntries((["lg", "xl", "2xl", "3xl", "4xl"] as const).map((k, i) => [`--ds-font-size-${k}`, `${Math.round(ratio ** (i + 1) * 1000) / 1000}rem`]));
  const stageStyle = { ["--ds-cta-radius" as string]: effectiveRadius, ["--ds-cta-font" as string]: p.fonts.sans, fontFamily: p.fonts.sans, ["--ds-icon-stroke" as string]: { light: "1.25", regular: "1.75", bold: "2.25" }[p.icons.stroke], ["--ds-icon-cap" as string]: p.icons.cap, ["--ds-icon-join" as string]: p.icons.cap === "round" ? "round" : "miter", ...scaleVars } as React.CSSProperties;
  const Icon = PREVIEWS["ICN-001"], Heading = PREVIEWS["TXT-001"], Para = PREVIEWS["TXT-002"];
  const grouped = [...new Set(kitItems.map((x) => groupOf(x.m.id)))].map((g) => ({ g, items: kitItems.filter((x) => groupOf(x.m.id) === g) }));
  const missing = GAPS.filter((g) => !grouped.some((x) => x.g === g.group) && byId.has(g.suggest));

  return (
    <div className="wf">
      <ol className="steps-bar" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s}><button type="button" className={`step-btn${p.step === i ? " on" : ""}`} aria-current={p.step === i ? "step" : undefined} onClick={() => go(i)}><span className="n">{i + 1}</span> {s}</button></li>
        ))}
        <li className="steps-meta">{kit.length} {kit.length === 1 ? "component" : "components"} in kit · <button type="button" className="plain" onClick={exportProject}>Save project</button> <button type="button" className="plain" onClick={() => fileRef.current?.click()}>Open project</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden aria-label="Open a saved project file" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importProject(f); e.target.value = ""; }} /></li>
      </ol>
      {msg && <p className="note-box" role="status">{msg}</p>}

      {p.step === 0 && (
        <section aria-labelledby="s-explore">
          <h2 id="s-explore">1. Explore</h2>
          <p>Start from a ready kit for the kind of site you are making, or browse the whole Master Library and press “Add to Kit” on what you like. You can change everything in the next step.</p>
          <div className="presets">
            {PRESETS.map((pr) => (
              <article key={pr.key} className="panel preset" data-preset={pr.key}>
                <h3>{pr.name}</h3><p>{pr.blurb}</p>
                <p className="hint">{pr.ids.filter((id) => byId.has(id)).map((id) => byId.get(id)!.name).join(" · ")}</p>
                <button type="button" className="plain primary" onClick={() => { setKitIds(pr.ids); go(1); }}>Use this kit ({pr.ids.filter((id) => byId.has(id)).length})</button>
              </article>
            ))}
          </div>
          <p><Link href="/components/" className="plain-link">Browse all {manifests.length} components →</Link> {kit.length > 0 && <>or <button type="button" className="plain" onClick={() => go(1)}>continue with the {kit.length} you already picked</button></>}</p>
        </section>
      )}

      {p.step === 1 && (
        <section aria-labelledby="s-select">
          <h2 id="s-select">2. Select</h2>
          <p>These are the components your Brand Design System will contain.</p>
          {kit.length === 0 && <p className="panel"><em>Nothing picked yet.</em> Go back to Explore and choose a starting kit, or <Link href="/components/">browse components</Link>.</p>}
          {grouped.map(({ g, items }) => (
            <div key={g} className="sel-group"><h3>{g}</h3>
              <ul className="sel-list">{items.map(({ k, m }) => (
                <li key={k.ref}>
                  <div><b>{m.name}</b> <code>{k.ref}</code><div className="hint">Style {k.skin}{k.props.design ? ` · variant ${k.props.design}` : ""}{m.interaction.modules.length ? ` · includes ${m.interaction.modules.join(", ")}` : ""}</div></div>
                  <span><Link href={`/components/${m.id}/`}>Change</Link> <button type="button" className="plain" aria-label={`Remove ${m.name}`} onClick={() => writeKit(kit.filter((x) => x.ref !== k.ref))}>Remove</button></span>
                </li>
              ))}</ul></div>
          ))}
          {kit.length > 0 && missing.length > 0 && (
            <div className="panel gaps"><b>A site usually needs</b>
              <ul>{missing.map((g) => <li key={g.group}>{g.label} <button type="button" className="plain" onClick={() => addId(g.suggest)}>Add {byId.get(g.suggest)!.name}</button></li>)}</ul></div>
          )}
          <p className="wf-nav"><button type="button" className="plain" onClick={() => go(0)}>← Back</button> <button type="button" className="plain primary" disabled={kit.length === 0} onClick={() => go(2)}>Next: Customise →</button></p>
        </section>
      )}

      {p.step === 2 && (
        <section aria-labelledby="s-custom">
          <h2 id="s-custom">3. Customise</h2>
          <div className="cust">
            <div className="cust-form">
              <fieldset><legend>Brand</legend>
                <label htmlFor="b-name">Name</label>
                <input id="b-name" type="text" value={p.name} onChange={(e) => set({ name: e.target.value, slug: slugify(e.target.value) })} />
                <label htmlFor="b-concept">One-line concept (optional)</label>
                <input id="b-concept" type="text" value={p.concept} onChange={(e) => set({ concept: e.target.value })} />
              </fieldset>
              <fieldset><legend>Colours</legend>
                <label htmlFor="b-base">Start from</label>
                <select id="b-base" value={p.base} onChange={(e) => pickBase(e.target.value)}>
                  {[...new Set(bases.map((b) => b.group))].map((g) => <optgroup key={g} label={g}>{bases.filter((b) => b.group === g).map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}</optgroup>)}
                </select>
                {(["primary", "secondary", "accent", "neutral"] as const).map((k) => (
                  <div key={k} className="seed-row"><label htmlFor={`seed-${k}`}>{k}{k === "primary" ? "" : " (optional)"}</label>
                    <input id={`seed-${k}`} type="text" value={p.seeds[k] ?? ""} placeholder="#rrggbb" aria-invalid={p.seeds[k] ? !HEX.test(p.seeds[k]!) : undefined}
                      onChange={(e) => { const v = e.target.value.trim(); const s = { ...p.seeds }; if (v === "" && k !== "primary") delete s[k]; else s[k] = v; set({ seeds: s }); }} />
                    <i className="sw" style={{ background: HEX.test(p.seeds[k] ?? "") ? p.seeds[k] : "transparent" }} aria-hidden="true" /></div>
                ))}
                <p className={`contrast ${failing.length ? "bad" : "good"}`} id="contrast-result" role="status">{contrast ? (failing.length ? `Contrast: ${failing.length} of ${contrast.length} pairs fail. Change the colours.` : `Contrast: all ${contrast.length} pairs pass.`) : "Enter a valid primary colour like #1f4fd8 to run the contrast check."}</p>
                {seedsChanged && <p className="hint">The preview keeps the “{base.name}” theme; your exact colours are built when you generate.</p>}
              </fieldset>
              <fieldset><legend>Typography</legend>
                <label htmlFor="f-sans">Text font</label>
                <select id="f-sans" value={FONTS.some((f) => f.value === p.fonts.sans) ? p.fonts.sans : "custom"} onChange={(e) => e.target.value !== "custom" && set({ fonts: { ...p.fonts, sans: e.target.value } })}>
                  {FONTS.map((f) => <option key={f.label} value={f.value}>{f.label}</option>)}<option value="custom">Custom (below)</option>
                </select>
                <label htmlFor="f-custom">Font stack</label>
                <input id="f-custom" type="text" value={p.fonts.sans} onChange={(e) => set({ fonts: { ...p.fonts, sans: e.target.value } })} />
                <label htmlFor="t-scale">Type scale</label>
                <select id="t-scale" value={p.typeScale} onChange={(e) => set({ typeScale: e.target.value as BrandProject["typeScale"] })}><option value="compact">Compact (steps ×1.2)</option><option value="standard">Standard (×1.25)</option><option value="large">Large (×1.333)</option></select>
                <p className="hint">The generated system names the font; load the font file in your site.</p>
              </fieldset>
              <fieldset><legend>Corners (radius)</legend>
                <div className="radio-row">{STRATEGIES.map(([v, label]) => (
                  <label key={v} className="rad"><input type="radio" name="strategy" value={v} checked={p.radiusStrategy === v} onChange={() => set({ radiusStrategy: v })} /> {label}</label>
                ))}</div>
                {flags.length > 0 ? <ul className="opt-note" id="radius-flags">{flags.map((f) => <li key={f.m.id}>⚠ {f.m.name}: {f.flag!.message}</li>)}</ul> : <p className="hint" id="radius-flags">Every component in your kit supports these corners.</p>}
              </fieldset>
              <fieldset><legend>Icons</legend>
                <label htmlFor="i-stroke">Line weight</label>
                <select id="i-stroke" value={p.icons.stroke} onChange={(e) => set({ icons: { ...p.icons, stroke: e.target.value as BrandProject["icons"]["stroke"] } })}><option value="light">Light</option><option value="regular">Regular</option><option value="bold">Bold</option></select>
                <label htmlFor="i-cap">Line ends</label>
                <select id="i-cap" value={p.icons.cap} onChange={(e) => set({ icons: { ...p.icons, cap: e.target.value as BrandProject["icons"]["cap"] } })}><option value="round">Round</option><option value="square">Square</option><option value="butt">Flat (butt)</option></select>
                <p className="hint">The Master icon set with your weight and line ends. More icon sets can come later.</p>
              </fieldset>
              <fieldset><legend>Interactions</legend>
                <label htmlFor="b-motion">Motion personality</label>
                <select id="b-motion" value={p.motion} onChange={(e) => set({ motion: e.target.value as BrandProject["motion"] })}><option value="calm">Calm (slower)</option><option value="standard">Standard</option><option value="lively">Lively (faster)</option></select>
                <label htmlFor="b-effects">Effects level</label>
                <select id="b-effects" value={p.effects} onChange={(e) => set({ effects: e.target.value as BrandProject["effects"] })}><option value="full">Full (all effects)</option><option value="subtle">Subtle</option><option value="minimal">Minimal (calm only)</option></select>
                <p className="hint" id="effects-hint">{p.effects === "full" ? `All ${manifests.length} components are available.` : p.effects === "subtle" ? `Turns off ${nFull} pointer-following and structure-changing components.` : `Turns off all ${nExpressive} expressive components.`}</p>
                {effectFlags.length > 0 && <ul className="opt-note" id="effects-flags">{effectFlags.map((f) => <li key={f.m.id}>⚠ {f.m.name} needs a higher effects level.</li>)}</ul>}
                <label htmlFor="b-density">Density</label>
                <select id="b-density" value={p.density} onChange={(e) => set({ density: e.target.value as BrandProject["density"] })}><option value="compact">Compact</option><option value="comfortable">Comfortable</option><option value="spacious">Spacious</option></select>
                <p className="hint">Motion and density are applied when the system is generated; the preview shows corners, font, type scale, icons and the base colours.</p>
              </fieldset>
            </div>
            <div className="cust-preview">
              <h3>Icons and type in this brand</h3>
              <div className="stage samples" id="brand-samples" data-brand={p.base} data-mode="light" style={stageStyle}>
                <div className="body">
                  {Heading && <Heading {...manifests.find((m) => m.id === "TXT-001")!.fixture.props} size="2xl">Market outlook</Heading>}
                  {Para && <Para {...manifests.find((m) => m.id === "TXT-002")!.fixture.props}>Body text sits on the same scale.</Para>}
                  {Icon && <div className="icon-row">{["check", "search", "arrow-right", "settings", "heart", "close"].map((n) => <Icon key={n} name={n} size="lg" />)}</div>}
                </div>
              </div>
              <h3>Your kit in this brand</h3>
              {kitItems.length === 0 ? <p className="panel"><em>No components in the kit yet.</em></p> : (
                <div className="designs" id="kit-preview">
                  {kitItems.map(({ k, m }) => {
                    const Preview = PREVIEWS[m.id];
                    return (
                      <div className="stage" key={k.ref} data-brand={p.base} data-mode="light" style={stageStyle}>
                        <div className="label"><span>{m.name}</span><span>{k.skin}</span></div>
                        <div className="body">{Preview ? <Preview {...m.fixture.props} {...k.props} skin={k.skin}>{m.fixture.children}</Preview> : null}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <p className="wf-nav"><button type="button" className="plain" onClick={() => go(1)}>← Back</button> <button type="button" className="plain primary" onClick={() => go(3)}>Next: Generate →</button></p>
        </section>
      )}

      {p.step === 3 && (
        <section aria-labelledby="s-gen">
          <h2 id="s-gen">4. Generate</h2>
          <table className="kv" id="gen-summary"><tbody>
            <tr><td>Brand</td><td>{cfgInput.name} <code>{slug}</code></td></tr>
            <tr><td>Components</td><td>{kit.length}</td></tr>
            <tr><td>Corners</td><td>{p.radiusStrategy}</td></tr>
            <tr><td>Contrast</td><td>{contrast ? (failing.length ? `${failing.length} of ${contrast.length} fail` : `all ${contrast.length} pass`) : "not run"}</td></tr>
            <tr><td>Compatibility</td><td>{flags.length ? `${flags.length} flagged` : "no flags"}</td></tr>
          </tbody></table>
          {blockers.length > 0 ? <ul className="opt-note" id="gen-blockers">{blockers.map((b) => <li key={b}>⚠ {b}</li>)}</ul> : <p className="contrast good" id="gen-ready">Ready: the brand and the kit are valid.</p>}
          <p>
            <button type="button" className="plain primary" disabled={blockers.length > 0} onClick={() => { download(`${slug}.brand.json`, brandJson); download(`${slug}.kit.json`, kitJson); }}>Download brand and kit files</button>{" "}
            <button type="button" className="plain" disabled={blockers.length > 0} onClick={() => copy("brand", brandJson)}>{copied === "brand" ? "Copied" : "Copy brand.config.json"}</button>{" "}
            <button type="button" className="plain" disabled={kit.length === 0} onClick={() => copy("kit", kitJson)}>{copied === "kit" ? "Copied" : "Copy kit.config.json"}</button>
          </p>
          <p>Then, in the master-ds folder on your computer, run:</p>
          <p><code className="cmd" id="gen-cmd">{cmd}</code> <button type="button" className="plain" onClick={() => copy("cmd", cmd)}>{copied === "cmd" ? "Copied" : "Copy command"}</button></p>
          <p className="hint">This gallery is a static site, so it cannot run the generator itself: it hands you the two files and the exact command. The generated folder holds the components, tokens, docs and a lock file you can upgrade later.</p>
          <p className="wf-nav"><button type="button" className="plain" onClick={() => go(2)}>← Back</button></p>
        </section>
      )}
    </div>
  );
}
