import Link from "next/link";
import type { Manifest } from "@master-ds/contracts";
import { PREVIEWS } from "../lib/components";
import { KIND_LABEL } from "../lib/discovery";

/** One component in the gallery: the real component first, then name, one line, and three quiet facts. (Server component.) */
export function ComponentCard({ m, brand }: { m: Manifest; brand: string }) {
  const Preview = PREVIEWS[m.id];
  const variants = m.props.design?.length ?? 1;
  const kinds = (m.discovery?.interaction ?? []).filter((k) => k !== "none");
  return (
    <article className="card">
      <div className="stage-mini" inert data-brand={brand} data-mode="light" style={{ background: "var(--ds-color-surface-base)" }}>
        {Preview ? <Preview {...m.fixture.props} {...(m.id === "TST-001" ? { placement: "inline" } : {})}>{m.fixture.children ?? (m.archetype === "button" ? "Get started" : undefined)}</Preview> : <em>no preview</em>}
      </div>
      <div className="meta">
        <b><Link className="card-link" href={`/components/${m.id}`}>{m.name}</Link> <small className="cid">{m.id}</small></b>
        <span className="desc">{m.description}</span>
        <div className="facts"><span>{variants} {variants === 1 ? "variant" : "variants"}</span><span>{m.skins.length} {m.skins.length === 1 ? "style" : "styles"}</span>{kinds[0] ? <span>{KIND_LABEL[kinds[0]]}</span> : null}</div>
      </div>
    </article>
  );
}
