"use client";
import { useEffect, useState } from "react";
import { KIT_EVENT, readKit, writeKit, type KitInstance } from "../lib/kit";

/** The Brand UI Kit being collected: what was picked, as the exact kit.config.json the generator reads. */
export function KitPanel({ brands }: { brands: Array<{ slug: string; name: string }> }) {
  const [kit, setKit] = useState<KitInstance[]>([]);
  const [brand, setBrand] = useState(brands.find((b) => b.slug === "finova")?.slug ?? brands[0]!.slug);
  const [copied, setCopied] = useState("");
  useEffect(() => {
    const update = () => setKit(readKit());
    update();
    window.addEventListener(KIT_EVENT, update); window.addEventListener("storage", update);
    return () => { window.removeEventListener(KIT_EVENT, update); window.removeEventListener("storage", update); };
  }, []);
  const json = JSON.stringify({ instances: kit }, null, 2);
  const cmd = `master generate --brand brands/${brand}.json --kit kit.config.json --out ./my-design-system`;
  const copy = async (what: string, text: string) => { try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(""), 1500); } catch { /* clipboard blocked */ } };
  return (
    <div className="panel">
      {kit.length === 0 ? <p><em>Nothing picked yet.</em> Open any component and choose “Add to Kit”.</p> : (
        <ul className="kit-list">{kit.map((k) => <li key={k.ref}><code>{k.ref}</code> · style <b>{k.skin}</b>{k.props.design ? <> · variant <b>{k.props.design}</b></> : null} <button className="plain" onClick={() => writeKit(kit.filter((x) => x.ref !== k.ref))} aria-label={`Remove ${k.ref}`}>Remove</button></li>)}</ul>
      )}
      <details open={kit.length > 0} style={{ marginTop: 12 }}>
        <summary>kit.config.json</summary>
        {kit.length === 0 ? null : <pre aria-label="kit.config.json">{json}</pre>}
      </details>
      <p>
        <button className="plain" disabled={kit.length === 0} onClick={() => copy("json", json)}>{copied === "json" ? "Copied" : "Copy kit.config.json"}</button>{" "}
        <button className="plain" disabled={kit.length === 0} onClick={() => writeKit([])}>Clear kit</button>
      </p>
      <label htmlFor="kit-brand" style={{ display: "block", fontSize: 12, color: "var(--g-muted)", margin: "12px 0 4px" }}>Brand for the command</label>
      <select id="kit-brand" value={brand} onChange={(e) => setBrand(e.target.value)}>{brands.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}</select>
      <p><code className="cmd">{cmd}</code> <button className="plain" onClick={() => copy("cmd", cmd)}>{copied === "cmd" ? "Copied" : "Copy command"}</button></p>
    </div>
  );
}
