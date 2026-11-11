"use client";
import { useState } from "react";

const SIZES = ["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl"];
const SPACES = ["1", "2", "3", "4", "5", "6", "8", "10", "12", "16"];
const RADII = [["none", "radius-none"], ["control", "radius-control"], ["container", "radius-container"], ["cta", "radius-cta"], ["full", "radius-full"]];
const DURS = ["fast", "quick", "base", "slow"];
const EASES = ["standard", "out", "inout", "spring"];

/** Live foundation samples read straight from the chosen brand's CSS variables (no numbers typed here). */
export function FoundationsView({ brands }: { brands: Array<{ slug: string; name: string }> }) {
  const [brand, setBrand] = useState(brands.find((b) => b.slug === "finova")?.slug ?? brands[0]!.slug);
  const [mode, setMode] = useState("light");
  const [run, setRun] = useState(0);
  return (
    <div>
      <aside className="panel toolbar" aria-label="Customise">
        <div><label htmlFor="f-brand">Brand</label><select id="f-brand" value={brand} onChange={(e) => setBrand(e.target.value)}>{brands.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}</select></div>
        <div><label htmlFor="f-mode">Mode</label><select id="f-mode" value={mode} onChange={(e) => setMode(e.target.value)}><option>light</option><option>dark</option></select></div>
      </aside>
      <div className="stage" data-brand={brand} data-mode={mode}>
        <div className="found">
          <h2 id="type">Type scale <small>(Major Third, 1.25×)</small></h2>
          {SIZES.map((s) => <div key={s} style={{ display: "flex", alignItems: "baseline", gap: 16, padding: "4px 0", borderBottom: "1px solid var(--ds-color-border-subtle)" }}><code style={{ width: 56, fontSize: 12, color: "var(--ds-color-text-secondary)" }}>{s}</code><span style={{ fontSize: `var(--ds-type-size-${s})`, lineHeight: 1.2 }}>Market outlook 2026</span></div>)}
          <h2 id="space">Spacing scale</h2>
          {SPACES.map((s) => <div key={s} style={{ display: "flex", alignItems: "center", gap: 16, padding: "3px 0" }}><code style={{ width: 56, fontSize: 12, color: "var(--ds-color-text-secondary)" }}>space-{s}</code><span style={{ display: "block", height: 14, width: `var(--ds-space-${s})`, background: "var(--ds-color-accent)", borderRadius: 2 }} /></div>)}
          <h2 id="radius">Corner radius roles</h2>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>{RADII.map(([n, v]) => <div key={n} style={{ textAlign: "center" }}><div style={{ width: 88, height: 56, border: "2px solid var(--ds-color-accent)", background: "var(--ds-color-accent-subtle)", borderRadius: `var(--ds-${v})` }} /><code style={{ fontSize: 12 }}>{n}</code></div>)}</div>
          <h2 id="elevation">Elevation</h2>
          <div style={{ display: "flex", gap: 24 }}>{["1", "2"].map((n) => <div key={n} style={{ width: 120, height: 64, background: "var(--ds-color-surface-raised)", borderRadius: "var(--ds-radius-container)", boxShadow: `var(--ds-elevation-${n})`, display: "grid", placeItems: "center" }}><code style={{ fontSize: 12 }}>elevation-{n}</code></div>)}</div>
          <h2 id="motion">Motion <small>(press play; reduced motion turns this off)</small></h2>
          <p><button className="plain" onClick={() => setRun((n) => n + 1)}>Play</button></p>
          {DURS.map((d) => <div key={`${d}-${run}`} style={{ display: "flex", alignItems: "center", gap: 16, padding: "4px 0" }}><code style={{ width: 72, fontSize: 12, color: "var(--ds-color-text-secondary)" }}>{d}</code><div style={{ flex: 1, height: 12, background: "var(--ds-color-surface-sunken)", borderRadius: 6, position: "relative" }}><span className="mo-dot" style={{ animationDuration: `var(--ds-duration-${d})` }} /></div></div>)}
          <p style={{ color: "var(--ds-color-text-secondary)", fontSize: 13 }}>Easings available: {EASES.join(", ")}. Colours are on the <a href="/palettes/">Palettes</a> page.</p>
        </div>
      </div>
    </div>
  );
}
