import { loadBrands } from "../../lib/registry";
import { FoundationsView } from "../../components/FoundationsView";

export const metadata = { title: "Foundations · Master Design System" };

export default function Foundations() {
  const brands = loadBrands().map((b) => ({ slug: b.config.slug, name: b.config.name }));
  return (
    <>
      <p className="crumbs">Overview / Foundations</p>
      <h1 style={{ margin: "0 0 4px" }}>Foundations</h1>
      <p style={{ marginTop: 0, color: "var(--g-muted)" }}>The values decided once per brand. Every atom reads these (through component tokens), never raw numbers. Change the brand and watch the scale, radius and motion change.</p>
      <FoundationsView brands={brands} />
    </>
  );
}
