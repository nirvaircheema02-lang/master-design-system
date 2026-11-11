import Link from "next/link";
import { loadBrands, loadManifests } from "../../lib/registry";
import { KEN_COUNTS, MISSING_ATOMS, MISSING_MOLECULES, MISSING_ORGANISMS, layerOf, type Layer } from "../../lib/atomic";
import { PALETTES } from "../../lib/palettes";

export const metadata = { title: "Foundations and atomic map · Master Gallery" };

/** Count component-tier and semantic variables per family from a real built theme (so the numbers cannot drift from the code). */
function tokenFamilies(css: string | null) {
  const names = new Set([...(css ?? "").matchAll(/(--ds-[a-z0-9-]+):/g)].map((m) => m[1]!));
  const fam = new Map<string, number>();
  for (const n of names) { const f = n.split("-")[3] ?? "other"; fam.set(f, (fam.get(f) ?? 0) + 1); }
  return { total: names.size, fam: [...fam].sort((a, b) => b[1] - a[1]) };
}

export default function SystemPage() {
  const manifests = loadManifests();
  const theme = loadBrands().find((b) => b.config.slug === "finova")?.themeCss ?? null;
  const t = tokenFamilies(theme);
  const base = ["color", "radius", "font", "duration", "ease", "z", "elevation", "space"];
  const byLayer: Record<Layer, typeof manifests> = { atom: [], molecule: [], organism: [] };
  for (const m of manifests) byLayer[layerOf(m.id)].push(m);
  const skins = manifests.reduce((n, m) => n + m.skins.length, 0);
  const comp = t.fam.filter(([f]) => !base.includes(f));
  return (
    <>
      <h1 style={{ textTransform: "none", letterSpacing: 0, fontSize: 28, color: "inherit" }}>How the Master design system is built</h1>
      <p style={{ color: "var(--g-muted)" }}>Four layers, from the most general to the most specific. Everything below is read from the real code, not typed by hand.</p>

      <h2>1. Foundation (decided once, per brand)</h2>
      <div className="sys-grid">
        <div className="panel"><div className="sys-big">{PALETTES.length}</div><b>colour palettes</b><p>Each palette is 2 ramps of 11 steps plus light and dark roles. <Link href="/palettes">Browse them</Link>.</p></div>
        <div className="panel"><div className="sys-big">{t.total}</div><b>design tokens per brand</b><p>Named values (colour, radius, spacing, motion, ...) that every component reads. Nothing inside a component is a raw colour.</p></div>
        <div className="panel"><div className="sys-big">{comp.length}</div><b>component token families</b><p>{comp.map(([f, n]) => `${f} (${n})`).join(", ")}</p></div>
      </div>
      <table className="sys-table"><thead><tr><th>Foundation</th><th>What it controls</th></tr></thead><tbody>
        <tr><td>Colour</td><td>A brand gives 1 to 3 seed colours. The engine builds the ramps, the roles (surface, text, border, accent, status) and a light and a dark mode, then refuses to ship a pair that is hard to read.</td></tr>
        <tr><td>Shape</td><td>Radius strategy: sharp, soft, rounded, pill or mixed. Buttons, cards and fields each get their own radius role.</td></tr>
        <tr><td>Type and spacing</td><td>Font family and density (compact, comfortable, spacious) set heights, paddings and text sizes of every control.</td></tr>
        <tr><td>Depth and layers</td><td>Two elevation levels, a scrim colour and a z-index scale (sticky, overlay, toast).</td></tr>
        <tr><td>Motion</td><td>Durations and easings with a personality (calm, standard, lively). Reduced motion removes the animation everywhere.</td></tr>
      </tbody></table>

      <h2>2. Atoms, molecules, organisms</h2>
      <p>Rule: an <b>atom</b> is one element; a <b>molecule</b> is a few atoms doing one job; an <b>organism</b> is a self-contained section.</p>
      <table className="sys-table"><thead><tr><th>Layer</th><th>Master (built)</th><th>Existing Ken design system</th><th>Components in Master</th></tr></thead><tbody>
        {(["atom", "molecule", "organism"] as const).map((l) => (
          <tr key={l}><td><b>{l}s</b></td><td>{byLayer[l].length}</td><td>{KEN_COUNTS[`${l}s` as "atoms"]}</td><td>{byLayer[l].map((m) => <Link key={m.id} href={`/components/${m.id}`} style={{ marginRight: 8 }}>{m.id}</Link>)}</td></tr>
        ))}
        <tr><td><b>templates, patterns</b></td><td>0</td><td>{KEN_COUNTS.templates} and {KEN_COUNTS.patterns}</td><td>not started</td></tr>
      </tbody></table>
      <p>Every Master component has <b>{(skins / manifests.length).toFixed(1)} designs on average</b> ({skins} skins over {manifests.length} components). A skin only changes colour, border and shadow, so today the library has little visual variety. Buttons are the exception (14 different effects).</p>

      <h2>3. What the existing Ken system has that Master still lacks</h2>
      <p>Ken's <code>core-v2</code> is a full atomic system, but it is welded to the Ken brand. Master has to rebuild these brand-neutral.</p>
      <b>Atoms</b><div className="sys-tags">{MISSING_ATOMS.map((x) => <span className="badge" key={x}>{x}</span>)}</div>
      <b>Molecules</b><div className="sys-tags">{MISSING_MOLECULES.map((x) => <span className="badge" key={x}>{x}</span>)}</div>
      <b>Organisms</b><div className="sys-tags">{MISSING_ORGANISMS.map((x) => <span className="badge" key={x}>{x}</span>)}</div>

      <h2>4. Kits (what a website gets)</h2>
      <p>A kit is the list of components one site picked, each with the design (skin) it chose. The generator copies exactly those components, a theme for the chosen palette and a lock file into the site. The Master is never modified.</p>
    </>
  );
}
