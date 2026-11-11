"use client";
import { useState } from "react";
import Link from "next/link";
import type { Manifest } from "@master-ds/contracts";
import { PREVIEWS } from "../lib/components";
import { defaultInstance, writeKit } from "../lib/kit";
import { PRESETS } from "../lib/presets";

const WIDE = new Set(["NAV-006", "NAV-007", "TBL-001"]);

/** Each starting kit shown as a composition: the real components together, in a chosen reference brand. */
export function PatternsView({ manifests, brands }: { manifests: Manifest[]; brands: Array<{ slug: string; name: string }> }) {
  const byId = new Map(manifests.map((m) => [m.id, m]));
  const [brand, setBrand] = useState(brands.find((b) => b.slug === "finova")?.slug ?? brands[0]!.slug);
  const [used, setUsed] = useState("");
  const kitOf = (ids: string[]) => ids.map((id) => byId.get(id)).filter((m): m is Manifest => !!m).map(defaultInstance);
  const download = (key: string, ids: string[]) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ instances: kitOf(ids) }, null, 2)], { type: "application/json" }));
    a.download = `${key}.kit.json`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  return (
    <div>
      <div className="panel toolbar" aria-label="Preview brand"><div><label htmlFor="pat-brand">Preview in brand</label>
        <select id="pat-brand" value={brand} onChange={(e) => setBrand(e.target.value)}>{brands.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}</select></div></div>
      {PRESETS.map((pr) => {
        const items = pr.ids.map((id) => byId.get(id)).filter((m): m is Manifest => !!m);
        return (
          <section key={pr.key} className="pattern" id={pr.key} data-pattern={pr.key}>
            <h2 className="sec-h">{pr.name} <small>{items.length} components</small></h2>
            <p>{pr.blurb}</p>
            <div className="stage pat-stage" data-brand={brand} data-mode="light">
              <div className="label"><span>The components of this kit, together</span><span>{brands.find((b) => b.slug === brand)?.name}</span></div>
              <div className="pat-grid">
                {items.map((m) => {
                  const Preview = PREVIEWS[m.id]; const inst = defaultInstance(m);
                  return <div key={m.id} className={`pat-cell${WIDE.has(m.id) ? " wide" : ""}`}>{Preview ? <Preview {...m.fixture.props} {...inst.props} skin={inst.skin}>{m.fixture.children}</Preview> : null}</div>;
                })}
              </div>
            </div>
            <p className="hint">{items.map((m, i) => <span key={m.id}>{i ? " · " : ""}<Link href={`/components/${m.id}/`}>{m.name}</Link></span>)}</p>
            <p>
              <Link href="/brands/new/" className="plain primary pat-use" onClick={() => { writeKit(kitOf(pr.ids)); setUsed(pr.key); }}>Use this kit</Link>{" "}
              <button type="button" className="plain" onClick={() => download(pr.key, pr.ids)}>Download kit.config.json</button>
              {used === pr.key && <span className="hint"> Kit saved.</span>}
            </p>
          </section>
        );
      })}
    </div>
  );
}
