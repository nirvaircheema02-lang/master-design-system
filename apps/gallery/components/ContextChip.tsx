"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { KIT_EVENT, readKit } from "../lib/kit";

/** Top-bar context: you are looking at the Master Library; the second chip is the Brand UI Kit being collected. */
export function ContextChip() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const update = () => setN(readKit().length);
    update();
    window.addEventListener(KIT_EVENT, update); window.addEventListener("storage", update);
    return () => { window.removeEventListener(KIT_EVENT, update); window.removeEventListener("storage", update); };
  }, []);
  return (
    <div className="ctx" aria-label="Where you are">
      <span className="ctx-chip" title="All original components, brand-neutral and read-only">Master Library</span>
      <Link className={`ctx-chip kit${n ? " has" : ""}`} href="/brands/" title="The components you picked for one website">Brand UI Kit · {n} {n === 1 ? "component" : "components"}</Link>
    </div>
  );
}
