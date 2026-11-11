import { loadBrands, loadManifests } from "../../../lib/registry";
import { PALETTES } from "../../../lib/palettes";
import { BrandWorkflow, type BaseTheme } from "../../../components/BrandWorkflow";

export const metadata = { title: "Create a Brand Design System · Master Design System" };

export default function NewBrand() {
  const manifests = loadManifests();
  const bases: BaseTheme[] = [
    ...loadBrands().map((b) => ({ slug: b.config.slug, name: b.config.name, group: "Reference brands", seeds: b.config.seeds, radiusStrategy: b.config.radiusStrategy, density: b.config.density, motion: b.config.motion, fonts: { sans: b.config.fonts.sans } })),
    ...PALETTES.map((p) => ({ slug: p.slug, name: p.name, group: `Palette · ${p.group}`, seeds: p.seeds as BaseTheme["seeds"], radiusStrategy: "soft" as const, density: "comfortable" as const, motion: "standard" as const, fonts: { sans: "Inter, system-ui, sans-serif" } })),
  ];
  return (
    <>
      <p className="crumbs">Brand Design Systems / Create</p>
      <h1 style={{ margin: "0 0 4px" }}>Create a Brand Design System</h1>
      <p className="lede">Four steps: explore, select, customise, generate. Your work is saved in this browser; you can also save it as a file.</p>
      <BrandWorkflow manifests={manifests} bases={bases} />
    </>
  );
}
