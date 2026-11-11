import Link from "next/link";
import { loadBrands, loadManifests } from "../../lib/registry";
import { PatternsView } from "../../components/PatternsView";

export const metadata = { title: "Patterns · Master Design System" };

export default function Patterns() {
  const brands = loadBrands().map((b) => ({ slug: b.config.slug, name: b.config.name }));
  return (
    <>
      <p className="crumbs">Patterns</p>
      <h1 style={{ margin: "0 0 4px" }}>Patterns</h1>
      <p className="lede">A pattern is a starting kit for a kind of site: the components that usually go together, shown together. “Use this kit” puts them in your Brand UI Kit, ready to customise. Page templates (full layouts) are not built yet; these show the parts and how they sit side by side.</p>
      <p className="hint">Machine-readable versions: <a href="/registry.json">registry.json</a> and <a href="/llms.txt">llms.txt</a>. Or <Link href="/brands/new/">create a Brand Design System</Link> directly.</p>
      <PatternsView manifests={loadManifests()} brands={brands} />
    </>
  );
}
