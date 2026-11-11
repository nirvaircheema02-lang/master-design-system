import { notFound } from "next/navigation";
import Link from "next/link";
import { loadBrands, loadManifests } from "../../../lib/registry";
import { Playground } from "../../../components/Playground";
import { PALETTES } from "../../../lib/palettes";
import { groupOf, layerName } from "../../../lib/nav";

export function generateStaticParams() { return loadManifests().map((m) => ({ id: m.id })); }

export default async function ComponentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const manifest = loadManifests().find((m) => m.id === id);
  if (!manifest) notFound();
  const brands = loadBrands().map((b) => ({ slug: b.config.slug, name: b.config.name, ctaRadius: b.ctaRadius, group: "Reference brands" }));
  // palettes: full themes loaded on demand (soft radius strategy: 4px controls)
  const palettes = PALETTES.map((p) => ({ slug: p.slug, name: p.name, ctaRadius: "4px", group: `Palette · ${p.group}` }));
  const names = Object.fromEntries(loadManifests().map((m) => [m.id, `${m.id} · ${m.name}`]));
  return (
    <>
      <p className="crumbs"><Link href="/">Components</Link> / {groupOf(manifest.id)} <span className="badge" title="Building-block level inside the system">{layerName(manifest.id)}</span></p>
      <h1 style={{ margin: "0 0 4px" }}>{manifest.id} · {manifest.name}</h1>
      <p style={{ marginTop: 0, color: "var(--g-muted)" }}>{manifest.description}</p>
      <Playground manifest={manifest} brands={[...brands, ...palettes]} names={names} />
    </>
  );
}
