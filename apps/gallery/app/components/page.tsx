import { loadBrands, loadManifests } from "../../lib/registry";
import { GROUPS, groupOf } from "../../lib/nav";
import { KIND_LABEL, KIND_ORDER } from "../../lib/discovery";
import { ComponentCard } from "../../components/ComponentCard";
import { ComponentGallery, type GalleryItem } from "../../components/ComponentGallery";

export const metadata = { title: "Components · Master Design System" };

export default function Components() {
  const manifests = loadManifests();
  const hero = loadBrands().find((b) => b.config.slug === "master-yellow")!.config.slug;
  const items: GalleryItem[] = manifests.map((m) => {
    const d = m.discovery;
    return {
      id: m.id, name: m.name, group: groupOf(m.id), kinds: d?.interaction ?? [], variants: m.props.design?.length ?? 1,
      search: [m.id, m.name, m.description, groupOf(m.id), ...(d?.tags ?? []), ...(d?.useCases ?? []), ...(d?.interaction ?? []).map((k) => KIND_LABEL[k] ?? k)].join(" ").toLowerCase(),
      node: <ComponentCard m={m} brand={hero} />,
    };
  });
  return (
    <>
      <p className="crumbs">Components</p>
      <h1 style={{ margin: "0 0 4px" }}>Components</h1>
      <p className="lede">The Master Library: {manifests.length} original, brand-neutral components. Search or filter, open one to try it under any brand, then add it to your Brand UI Kit.</p>
      <ComponentGallery items={items} groups={[...GROUPS]} kinds={KIND_ORDER.map((k) => ({ key: k, label: KIND_LABEL[k]! }))} />
    </>
  );
}
