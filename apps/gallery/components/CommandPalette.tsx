"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export interface PaletteEntry { href: string; label: string; hint: string; search: string }

/** Cmd/Ctrl+K from anywhere: type a component, a use ("modal", "form") or a page, press Enter. */
export function CommandPalette({ entries }: { entries: PaletteEntry[] }) {
  const router = useRouter();
  const dlg = useRef<HTMLDialogElement>(null);
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const results = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return entries.filter((e) => words.every((w) => e.search.includes(w))).slice(0, 8);
  }, [entries, q]);
  const open = () => { setQ(""); setI(0); dlg.current?.showModal(); };
  const go = (href: string) => { dlg.current?.close(); router.push(href); };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); open(); } };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => setI(0), [q]);
  const key = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setI((n) => Math.min(n + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setI((n) => Math.max(n - 1, 0)); }
    else if (e.key === "Enter" && results[i]) { e.preventDefault(); go(results[i]!.href); }
  };
  return (
    <>
      <button type="button" className="cmd-open" onClick={open}>Search <kbd>⌘K</kbd></button>
      <dialog ref={dlg} className="cmd-dlg" aria-label="Search the design system" onClick={(e) => { if (e.target === dlg.current) dlg.current?.close(); }}>
        <label htmlFor="cmd-q" className="vh">Search components and pages</label>
        <input id="cmd-q" type="search" autoComplete="off" placeholder="Search components and pages…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={key} role="combobox" aria-expanded="true" aria-controls="cmd-list" aria-activedescendant={results[i] ? `cmd-${i}` : undefined} />
        <ul id="cmd-list" role="listbox" aria-label="Results">
          {results.map((r, n) => <li key={r.href} id={`cmd-${n}`} role="option" aria-selected={n === i} onMouseEnter={() => setI(n)} onClick={() => go(r.href)}><b>{r.label}</b><small>{r.hint}</small></li>)}
          {results.length === 0 ? <li className="cmd-none" role="presentation">No match</li> : null}
        </ul>
      </dialog>
    </>
  );
}
