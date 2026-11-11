"use client";
import { useEffect, useMemo, useState } from "react";
import { Cta003, Cta004, Inp001, Inp007, Crd005, Tab001, Nav010 } from "@master-ds/components";
import type { Palette } from "../lib/palettes";

const STEPS = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"];
type Mode = "light" | "dark";

export function PaletteBrowser({ palettes, groups }: { palettes: Palette[]; groups: readonly string[] }) {
  const [sel, setSel] = useState(palettes.find((p) => p.id === "blue")?.id ?? palettes[0]!.id);
  const [mode, setMode] = useState<Mode>("light");
  const [q, setQ] = useState("");
  const p = palettes.find((x) => x.id === sel)!;
  const shown = useMemo(() => palettes.filter((x) => x.name.toLowerCase().includes(q.toLowerCase())), [palettes, q]);

  // each palette's full theme CSS is loaded only when it is chosen (35 themes inline would bloat every page)
  useEffect(() => {
    const id = `palette-css-${sel}`;
    if (!document.getElementById(id)) { const l = document.createElement("link"); l.id = id; l.rel = "stylesheet"; l.href = `/palettes/${sel}.css`; document.head.appendChild(l); }
  }, [sel]);
  const r = p.roles[mode];

  return (
    <div className="pal-layout">
      <aside className="panel pal-list" aria-label="Palettes">
        <label htmlFor="pal-q">Search</label>
        <input id="pal-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. blue, navy, warm" />
        {groups.map((g) => {
          const items = shown.filter((x) => x.group === g);
          return items.length ? (
            <div key={g}>
              <h2 className="pal-group">{g} ({items.length})</h2>
              <ul className="pal-items">
                {items.map((x) => (
                  <li key={x.id}>
                    <button type="button" className="pal-item" aria-pressed={x.id === sel} onClick={() => setSel(x.id)}>
                      <span className="pal-dot" style={{ background: x.ramps.primary["500"] }} />
                      <span className="pal-dot" style={{ background: x.roles.light["accent.DEFAULT"] }} />
                      <span>{x.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null;
        })}
      </aside>

      <section>
        <h1 className="pal-title">{p.name} <small>{p.group}</small></h1>
        <p>{p.note}</p>
        <p className="pal-badges"><span className="badge ok">{p.contrast.total - p.contrast.failing}/{p.contrast.total} contrast checks pass (each mode)</span> <span className="badge">seed {p.seeds.primary}</span>{p.seeds.neutral ? <span className="badge">neutral tint {p.seeds.neutral}</span> : null}{p.seeds.accent ? <span className="badge">accent {p.seeds.accent}</span> : null}</p>

        <h2>Colour ramp (primary) and neutral ramp</h2>
        <div className="pal-ramp" role="img" aria-label={`${p.name} primary ramp`}>{STEPS.map((s) => <span key={s} style={{ background: p.ramps.primary[s] }} title={`${s} ${p.ramps.primary[s]}`}><i>{s}</i></span>)}</div>
        <div className="pal-ramp" role="img" aria-label={`${p.name} neutral ramp`}>{STEPS.map((s) => <span key={s} style={{ background: p.ramps.neutral[s] }} title={`${s} ${p.ramps.neutral[s]}`}><i>{s}</i></span>)}</div>

        <h2>Roles the components use <span className="pal-mode"><button type="button" aria-pressed={mode === "light"} onClick={() => setMode("light")}>Light</button><button type="button" aria-pressed={mode === "dark"} onClick={() => setMode("dark")}>Dark</button></span></h2>
        <ul className="pal-roles">
          {Object.entries(r).map(([k, v]) => <li key={k}><span className="pal-chip" style={{ background: v }} /><b>{k}</b><code>{v}</code></li>)}
        </ul>

        <h2>Live preview with real components</h2>
        <div className="pal-live" data-brand={p.slug} data-mode={mode}>
          <div className="pal-live-row"><Cta003>Get started</Cta003><Cta004>Learn more</Cta004></div>
          <div className="pal-live-grid">
            <Inp001 label="Email address" hint="We only use it to reply." name="email" autoComplete="email" />
            <Inp007 label="Email notifications" hint="A weekly summary." name="notify" defaultChecked />
            <Crd005 label="Monthly revenue" value="$48,230" delta={{ text: "12.4%", direction: "up", intent: "positive", versus: "vs last month" }} />
          </div>
          <Tab001 activation="automatic" label="Sections" tabs={[{ id: "a", label: "Overview", content: "Overview content." }, { id: "b", label: "Usage", content: "Usage content." }, { id: "c", label: "Pricing", content: "Pricing content." }]} />
          <Nav010 page={4} pageCount={12} hrefPattern="#page-{n}" />
        </div>
      </section>
    </div>
  );
}
