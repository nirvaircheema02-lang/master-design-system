import Link from "next/link";
import { loadBrands, loadManifests } from "../lib/registry";
import { PALETTES } from "../lib/palettes";

const STEPS = [
  ["1", "Explore", "Browse the Master Library. Try any component under any brand, mode and corner radius.", "/components/"],
  ["2", "Select", "Add the components your website needs to a Brand UI Kit.", "/brands/#kit"],
  ["3", "Customise", "Set colours, typography, radius, icons and interactions for the brand.", "/brands/"],
  ["4", "Generate", "Get a Brand Design System: code, tokens and docs for that site only.", "/brands/"],
] as const;

export default function Overview() {
  const manifests = loadManifests();
  const variants = manifests.reduce((n, m) => n + (m.props.design?.length ?? 1), 0);
  return (
    <>
      <h1 style={{ margin: "0 0 4px" }}>Master Design System</h1>
      <p className="lede">One library of premium, brand-neutral components. Pick what a website needs, give it a brand, and generate that website's own design system. The Master itself is never changed.</p>

      <div className="flow" aria-label="Master Library to Brand UI Kit to Brand Design System">
        <div className="flow-box"><span className="flow-tag">Master Library</span><b>{manifests.length} components</b><span>All the originals. Brand-neutral, read-only. Every component has several variants and styles.</span></div>
        <div className="flow-arrow" aria-hidden="true">Select + customise<span>→</span></div>
        <div className="flow-box kit"><span className="flow-tag">Brand UI Kit</span><b>The ones one site picked</b><span>A selection plus that brand's colours, fonts, radius, icons and interactions.</span></div>
        <div className="flow-arrow" aria-hidden="true">Generate<span>→</span></div>
        <div className="flow-box out"><span className="flow-tag">Brand Design System</span><b>The deliverable</b><span>Code, tokens, lock file and docs. Owned by the website; upgradeable from the Master.</span></div>
      </div>

      <h2>How to build a Brand Design System</h2>
      <ol className="steps">
        {STEPS.map(([n, t, d, href]) => <li key={n}><Link href={href}><span className="step-n">{n}</span><b>{t}</b><span>{d}</span></Link></li>)}
      </ol>

      <h2>What is in the Master</h2>
      <div className="stats">
        <div className="panel"><b>{manifests.length}</b><span>components</span></div>
        <div className="panel"><b>{variants}</b><span>variants in total</span></div>
        <div className="panel"><b>{PALETTES.length}</b><span>colour palettes</span></div>
        <div className="panel"><b>{loadBrands().length}</b><span>example brands</span></div>
      </div>
      <p className="quick"><Link href="/components/">Browse components</Link> · <Link href="/foundations/">Foundations</Link> · <Link href="/interactions/">Interactions</Link> · <Link href="/brands/">Brand Design Systems</Link> · <Link href="/system/">How it works</Link></p>
    </>
  );
}
