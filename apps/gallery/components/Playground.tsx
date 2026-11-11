"use client";
import { useEffect, useMemo, useState } from "react";
import { checkRadius, type Manifest } from "@master-ds/contracts";
import Link from "next/link";
import { PREVIEWS } from "../lib/components";
import { layerName } from "../lib/nav";
import { KIND_BLURB, KIND_LABEL } from "../lib/discovery";
import { KIT_EVENT, readKit, writeKit, type KitInstance } from "../lib/kit";

export interface BrandOption { slug: string; name: string; ctaRadius: string; group?: string }
type Mode = "light" | "dark";
const RADII = [["brand default", "default"], ["0 (sharp)", "0px"], ["8px", "8px"], ["pill", "9999px"]] as const;
const PROP_LABEL: Record<string, string> = { design: "Variant", size: "Size", type: "Mode of use", side: "Side", placement: "Placement" };

export function Playground({ manifest, brands, names = {} }: { manifest: Manifest; brands: BrandOption[]; names?: Record<string, string> }) {
  const Preview = PREVIEWS[manifest.id];
  const fx = manifest.fixture.props;
  const isButton = manifest.archetype === "button";
  const hasLoading = manifest.states.includes("loading");
  const [brandSlug, setBrand] = useState(brands.find((b) => b.slug === "finova")?.slug ?? brands[0]!.slug);
  const [mode, setMode] = useState<Mode>("light");
  const [radius, setRadius] = useState<string>("default");
  const [label, setLabel] = useState("Get started");
  const [skin, setSkin] = useState(manifest.skins[0]!.id);
  const [props, setProps] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(manifest.props).map(([k, v]) => [k, v[k === "design" ? 0 : Math.min(1, v.length - 1)]!])));
  const defaults = useMemo(() => Object.fromEntries(Object.entries(manifest.props).map(([k, v]) => [k, v[k === "design" ? 0 : Math.min(1, v.length - 1)]!])), [manifest]);
  const [kit, setKit] = useState<KitInstance[]>([]);
  const [loading, setLoading] = useState(false);

  // a palette's theme CSS is loaded only when chosen (35 themes inline would bloat every page)
  useEffect(() => {
    if (!brandSlug.startsWith("p-")) return;
    const id = `palette-css-${brandSlug}`;
    if (!document.getElementById(id)) { const l = document.createElement("link"); l.id = id; l.rel = "stylesheet"; l.href = `/palettes/${brandSlug.slice(2)}.css`; document.head.appendChild(l); }
  }, [brandSlug]);
  useEffect(() => { const u = () => setKit(readKit()); u(); window.addEventListener(KIT_EVENT, u); return () => window.removeEventListener(KIT_EVENT, u); }, []);
  const persist = (next: KitInstance[]) => { setKit(next); writeKit(next); };

  const brand = brands.find((b) => b.slug === brandSlug)!;
  const effective = radius === "default" ? brand.ctaRadius : radius;
  const flag = useMemo(() => checkRadius(manifest, effective), [manifest, effective]);
  const radiusOpts = RADII.map(([name, v]) => ({ name, v, flag: checkRadius(manifest, v === "default" ? brand.ctaRadius : v) }));
  const stageStyle = radius === "default" ? undefined : ({ ["--ds-cta-radius" as string]: radius } as React.CSSProperties);
  const instance = { ref: `${manifest.id}@${manifest.version}`, skin, props };
  const [copied, setCopied] = useState("");
  const copy = (key: string, text: string) => { void navigator.clipboard?.writeText(text); setCopied(key); setTimeout(() => setCopied(""), 1500); };
  const original = brands.find((b) => b.slug === "master-yellow") ?? brands[0]!;

  const inKit = kit.some((k) => k.ref === `${manifest.id}@${manifest.version}`);
  const add = () => persist([...kit.filter((k) => !k.ref.startsWith(manifest.id + "@")), { ref: `${manifest.id}@${manifest.version}`, skin, props }]);

  if (!Preview) return <p className="panel">No preview registered for {manifest.id}.</p>;
  const d = manifest.discovery;
  const hasVariants = !!manifest.props.design || (manifest.id === "ICN-001" && !!manifest.props.name);
  const sections = [["preview", "Preview"], ...(hasVariants ? [["variants", "Variants"]] : []), ["interactions", "Interactions"], ["usage", "Usage"], ["code", "Code"], ["technical", "Technical"]];
  const cmd = "master generate --brand brands/<your-brand>.json --kit kit.config.json --out <folder>";
  const instJson = JSON.stringify({ instances: [instance] }, null, 2);
  const otherProps = Object.entries(manifest.props).filter(([k]) => k !== "design");
  return (
    <div>
      <nav className="subnav" aria-label="On this page">
        {sections.map(([id, name]) => <a key={id} href={`#${id}`}>{name}</a>)}
        <span className="subnav-kit"><button className="plain primary" onClick={add} disabled={!!flag}>{inKit ? "Update in Kit" : "Add to Kit"}</button> <Link href="/brands/" className="tb-kitlink">Brand UI Kit ({kit.length})</Link></span>
      </nav>

      <section id="preview" className="sec">
        <h2 className="sec-h">Preview</h2>
        <aside className="panel toolbar" aria-label="Customise">
          <fieldset className="tb-group"><legend>Component options</legend>
            {manifest.props.design && <div><label htmlFor="p-design">{PROP_LABEL.design}</label>
              <select id="p-design" value={props.design} onChange={(e) => setProps({ ...props, design: e.target.value })}>{manifest.props.design.map((v) => <option key={v}>{v}</option>)}</select></div>}
            <div><label htmlFor="skin">Style</label>
            <select id="skin" value={skin} onChange={(e) => setSkin(e.target.value)}>{manifest.skins.map((s) => <option key={s.id}>{s.id}</option>)}</select></div>
            {otherProps.map(([k, vals]) => (
              <div key={k}><label htmlFor={`p-${k}`}>{PROP_LABEL[k] ?? k}</label>
                <select id={`p-${k}`} value={props[k]} onChange={(e) => setProps({ ...props, [k]: e.target.value })}>{vals.map((v) => <option key={v}>{v}</option>)}</select></div>
            ))}
            {isButton && <div><label htmlFor="label">Label</label><input id="label" type="text" value={label} onChange={(e) => setLabel(e.target.value)} /></div>}
            {hasLoading && <div className="tb-check"><input id="loading" type="checkbox" checked={loading} onChange={(e) => setLoading(e.target.checked)} /><label htmlFor="loading">Loading state (stays focusable)</label></div>}
          </fieldset>
          <fieldset className="tb-group"><legend>Preview as</legend>
            <div><label htmlFor="brand">Brand</label>
            <select id="brand" value={brandSlug} onChange={(e) => setBrand(e.target.value)}>
              {[...new Set(brands.map((b) => b.group ?? "Brands"))].map((g) => <optgroup key={g} label={g}>{brands.filter((b) => (b.group ?? "Brands") === g).map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}</optgroup>)}
            </select></div>
            <div><label htmlFor="mode">Mode</label>
            <select id="mode" value={mode} onChange={(e) => setMode(e.target.value as Mode)}><option>light</option><option>dark</option></select></div>
            <div><label htmlFor="radius">Corner radius</label>
            <select id="radius" value={radius} onChange={(e) => setRadius(e.target.value)}>
              {radiusOpts.map((o) => <option key={o.v} value={o.v} disabled={!!o.flag} title={o.flag?.message}>{o.name}{o.flag ? " (unsupported)" : ""}</option>)}
            </select></div>
          </fieldset>
          {flag && <div className="opt-note">⚠ {flag.message}</div>}
        </aside>
        <div className="stages">
          <div className="stage" data-brand={brandSlug} data-mode={mode} style={stageStyle}>
            <div className="label"><span>Your brand · {brand.name}</span><span>{effective}</span></div>
            <div className="body"><Preview {...fx} {...props} skin={skin} {...(hasLoading ? { loading } : {})}>{isButton ? label : manifest.fixture.children}</Preview></div>
          </div>
          <div className="stage" data-brand={original.slug} data-mode="light">
            <div className="label"><span>Master default · {original.name}</span><span>{original.ctaRadius}</span></div>
            <div className="body"><Preview {...fx} {...defaults}>{isButton ? label : manifest.fixture.children}</Preview></div>
          </div>
        </div>
        <p className="hint">Hover and Tab into the component to test the real interaction. Turn on your OS “reduce motion” setting to see the static fallback.</p>
      </section>

      {hasVariants && (
        <section id="variants" className="sec">
          {manifest.props.design ? (
            <>
              <h2 className="sec-h">All {manifest.props.design.length} variants <small>(same brand, same behaviour, different structure and look)</small></h2>
              <div className="designs">
                {manifest.props.design.map((dn) => (
                  <div className="stage" key={dn} data-brand={brandSlug} data-mode={mode} style={stageStyle}>
                    <div className="label"><span>{dn}</span><button className="plain" onClick={() => setProps({ ...props, design: dn })} aria-pressed={props.design === dn}>{props.design === dn ? "shown above" : "show above"}</button></div>
                    <div className="body"><Preview {...fx} {...props} design={dn} skin={skin} {...(hasLoading ? { loading } : {})}>{isButton ? label : manifest.fixture.children}</Preview></div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
          {manifest.id === "ICN-001" && manifest.props.name ? (
            <>
              <h2 className="sec-h">All {manifest.props.name.length} icons</h2>
              <div className="icon-grid" data-brand={brandSlug} data-mode={mode}>
                {manifest.props.name.map((n) => (
                  <button key={n} className="icon-cell" onClick={() => setProps({ ...props, name: n })} aria-pressed={props.name === n} title={n}>
                    <Preview {...fx} {...props} name={n} skin={skin} />
                    <span>{n}</span>
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </section>
      )}

      <section id="interactions" className="sec">
        <h2 className="sec-h">Interactions and states</h2>
        <p className="lead">{d?.interaction?.length ? d.interaction.map((k) => KIND_LABEL[k] ?? k).join(" · ") : "—"}{d?.interaction?.[0] ? `: ${KIND_BLURB[d.interaction[0]] ?? ""}` : ""}</p>
        <ul className="chips-static" aria-label="States this component supports">{manifest.states.map((st) => <li key={st}>{st}</li>)}</ul>
        <p className="hint">Reduced motion: {manifest.a11y.reducedMotion === "none" ? "this component has no motion to reduce." : manifest.a11y.reducedMotion === "static-end-state" ? "with “reduce motion” on, it jumps to the end state instead of animating." : manifest.a11y.reducedMotion === "crossfade" ? "with “reduce motion” on, it cross-fades instead of moving." : manifest.a11y.reducedMotion}</p>
      </section>

      <section id="usage" className="sec">
        <h2 className="sec-h">Usage</h2>
        <div className="usage">
          <div><h3>Use it for</h3><ul>{(d?.useCases ?? []).map((u) => <li key={u}>{u}</li>)}</ul></div>
          <div><h3>Avoid when</h3><ul>{(d?.avoidWhen ?? []).map((u) => <li key={u}>{u}</li>)}</ul></div>
          <div><h3>Accessibility</h3><ul>
            <li>Role: {manifest.a11y.role}</li>
            {manifest.a11y.keyboard.length > 0 && <li>Keyboard: {manifest.a11y.keyboard.join(", ")}</li>}
            <li>Minimum contrast: {manifest.constraints.minContrast}</li>
          </ul></div>
          <div><h3>Pairs well with</h3><ul>{(d?.pairsWith ?? []).map((pid) => <li key={pid}><Link href={`/components/${pid}/`}>{names[pid] ?? pid}</Link></li>)}</ul></div>
        </div>
      </section>

      <section id="code" className="sec">
        <h2 className="sec-h">Code</h2>
        <p className="hint">The Brand UI Kit entry for exactly what you selected above ({manifest.id}@{manifest.version}, style {skin}).</p>
        <pre className="code" aria-label="kit instance">{instJson}</pre>
        <p><button className="plain" onClick={() => copy("inst", instJson)}>{copied === "inst" ? "Copied" : "Copy instance"}</button> <button className="plain" onClick={add} disabled={!!flag}>{inKit ? "Update in Kit" : "Add to Kit"}</button></p>
        <p className="hint">Generate a Brand Design System from your kit:</p>
        <pre className="code" aria-label="generate command">{cmd}</pre>
        <p><button className="plain" onClick={() => copy("cmd", cmd)}>{copied === "cmd" ? "Copied" : "Copy command"}</button></p>
        <h3>Options (props)</h3>
        <table className="kv"><tbody>
          {Object.entries(manifest.props).map(([k, vals]) => <tr key={k}><td>{PROP_LABEL[k] ?? k}</td><td>{vals.join(", ")}</td></tr>)}
          <tr><td>Style</td><td>{manifest.skins.map((s) => s.id).join(", ")}</td></tr>
        </tbody></table>
        <details className="manifest">
          <summary>{manifest.tokens.length} design tokens this component reads</summary>
          <ul className="tok">{manifest.tokens.map((t) => <li key={t}><code>{t}</code></li>)}</ul>
        </details>
      </section>

      <section id="technical" className="sec">
        <h2 className="sec-h">Technical details <small>(how this component is built)</small></h2>
        <table className="kv"><tbody>
          <tr><td>Version</td><td>{manifest.version} ({manifest.lifecycle})</td></tr>
          <tr><td>Building-block level</td><td>{layerName(manifest.id)}</td></tr>
          <tr><td>Interaction</td><td>class {manifest.interaction.class}: {manifest.interaction.modules.join(", ") || "none"}</td></tr>
          <tr><td>Radius support</td><td>{manifest.constraints.radiusSupport}</td></tr>
          <tr><td>Reduced motion</td><td>{manifest.a11y.reducedMotion}</td></tr>
          <tr><td>States</td><td>{manifest.states.join(", ")}</td></tr>
          <tr><td>Tokens</td><td>{manifest.tokens.length} component tokens</td></tr>
        </tbody></table>
      </section>
    </div>
  );
}
