import Link from "next/link";
import { loadBrands, loadManifests } from "../../lib/registry";
import { KIND_BLURB, KIND_LABEL, KIND_ORDER } from "../../lib/discovery";
import { ComponentCard } from "../../components/ComponentCard";

export const metadata = { title: "Interactions · Master Design System" };

export default function Interactions() {
  const manifests = loadManifests();
  const hero = loadBrands().find((b) => b.config.slug === "master-yellow")!.config.slug;
  return (
    <>
      <p className="crumbs">Interactions</p>
      <h1 style={{ margin: "0 0 4px" }}>Interactions</h1>
      <p className="lede">The same components, grouped by what they <i>do</i> instead of what they look like. A component that does several things appears under each. Every animated component has a calm fallback for people who ask for reduced motion.</p>
      <p className="quick">{KIND_ORDER.filter((k) => k !== "none").map((k) => <a key={k} href={`#${k}`} style={{ marginRight: 14 }}>{KIND_LABEL[k]}</a>)}</p>
      {KIND_ORDER.filter((k) => k !== "none").map((k) => {
        const list = manifests.filter((m) => m.discovery?.interaction.includes(k));
        if (!list.length) return null;
        return (
          <section key={k} id={k}>
            <div className="layer-head"><h2>{KIND_LABEL[k]} ({list.length})</h2></div>
            <p className="kind-blurb">{KIND_BLURB[k]}</p>
            <div className="grid">{list.map((m) => <ComponentCard key={m.id} m={m} brand={hero} />)}</div>
          </section>
        );
      })}
      <p>Want to find components by name or use? Use <Link href="/components/">the component gallery</Link>.</p>
    </>
  );
}
