import Link from "next/link";
import { loadBrands } from "../../lib/registry";
import { KitPanel } from "../../components/KitPanel";

export const metadata = { title: "Brand Design Systems · Master Design System" };

export default function Brands() {
  const brands = loadBrands();
  const list = brands.map((b) => ({ slug: b.config.slug, name: b.config.name }));
  return (
    <>
      <p className="crumbs">Brand Design Systems</p>
      <h1 style={{ margin: "0 0 4px" }}>Brand Design Systems</h1>
      <p className="lede">A Brand Design System is what one website gets: only the components it picked, with that brand's look, generated from the Master. The Master Library stays untouched.</p>

      <div className="compare">
        <div className="panel"><span className="flow-tag">Master Library</span><ul><li>All {" "}original components</li><li>No brand: neutral and read-only</li><li>Where you explore and compare</li></ul></div>
        <div className="panel"><span className="flow-tag">Brand UI Kit</span><ul><li>Only the components one site picked</li><li>Plus that brand's colours, fonts, radius, icons and interactions</li><li>A draft you can still change</li></ul></div>
        <div className="panel"><span className="flow-tag">Brand Design System</span><ul><li>The generated package for that site</li><li>Code, tokens, lock file, docs</li><li>Upgradeable from the Master</li></ul></div>
      </div>

      <h2 id="kit">My Brand UI Kit</h2>
      <p>Components you added with “Add to Kit”. This is the exact file the generator reads.</p>
      <KitPanel brands={list} />
      <p className="note-box"><b>No command line needed to start:</b> <Link href="/brands/new/">Create a Brand Design System</Link> walks you through Explore, Select, Customise and Generate.</p>

      <h2 id="examples">Example brands</h2>
      <p>The same Master components, generated for {brands.length} different brands. Open any component and switch the brand to see them.</p>
      <div className="grid">
        {brands.map((b) => (
          <article key={b.config.slug} className="card" data-brand={b.config.slug}>
            <div className="meta"><b>{b.config.name}</b><span style={{ color: "var(--g-muted)" }}>{b.config.concept}</span>
              <div className="facts"><span>{b.config.radiusStrategy} corners</span><span>{b.config.density}</span><span>{b.config.motion} motion</span></div>
              <div className="swatches" aria-hidden="true"><i style={{ background: b.config.seeds.primary }} />{b.config.seeds.secondary ? <i style={{ background: b.config.seeds.secondary }} /> : null}</div>
            </div>
          </article>
        ))}
      </div>
      <p>Browse the <Link href="/foundations/">foundations</Link> per brand.</p>
    </>
  );
}
