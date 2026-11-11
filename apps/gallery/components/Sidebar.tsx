"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { NavSection } from "../lib/nav";

const norm = (p: string) => (p.endsWith("/") ? p : p + "/");

/** Left table of contents (like a docs site): collapsible sections, the open page highlighted, a search box that filters every entry. */
export function Sidebar({ sections }: { sections: NavSection[] }) {
  const path = norm(usePathname() ?? "/");
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const view = useMemo(() => sections.map((s) => {
    const match = (label: string) => !query || label.toLowerCase().includes(query) || s.label.toLowerCase().includes(query);
    const items = s.items?.filter((i) => match(i.label));
    const groups = s.groups?.map((g) => ({ ...g, items: g.items.filter((i) => match(i.label) || g.label.toLowerCase().includes(query)) })).filter((g) => g.items.length);
    return { ...s, items, groups };
  }).filter((s) => (s.items?.length ?? 0) + (s.groups?.length ?? 0) > 0), [sections, query]);
  const isActive = (href: string) => !href.includes("#") && norm(href) === path;
  useEffect(() => { const t = document.querySelector("nav.toc") as HTMLElement | null; const a = t?.querySelector('a[aria-current="page"]') as HTMLElement | null; if (t && a) t.scrollTop += a.getBoundingClientRect().top - t.getBoundingClientRect().top - t.clientHeight / 2; }, [path]);
  return (
    <nav className="toc" aria-label="Design system contents">
      <div className="toc-search"><label htmlFor="toc-q" className="vh">Search components</label><input id="toc-q" type="search" placeholder="Search components…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {view.length === 0 ? <p className="toc-empty">Nothing matches “{q}”.</p> : null}
      {view.map((s) => {
        const hasActive = !!s.items?.some((i) => isActive(i.href)) || !!s.groups?.some((g) => g.items.some((i) => isActive(i.href)));
        return (
          <details key={`${s.key}-${query ? "q" : "n"}`} className="toc-sec" open={!!query || hasActive || s.key !== "none"}>
            <summary><span>{s.label}</span>{s.hint ? <small>{s.hint}</small> : null}</summary>
            {s.items ? <ul>{s.items.map((i) => <li key={i.href}><Link href={i.href} aria-current={isActive(i.href) ? "page" : undefined}>{i.label}</Link></li>)}</ul> : null}
            {s.groups?.map((g) => (
              <details key={`${g.label}-${query ? "q" : "n"}`} className="toc-group" open>
                <summary>{g.label}<small>{g.items.length}</small></summary>
                <ul>{g.items.map((i) => <li key={i.href}><Link href={i.href} aria-current={isActive(i.href) ? "page" : undefined}>{i.label}</Link></li>)}</ul>
              </details>
            ))}
          </details>
        );
      })}
    </nav>
  );
}
