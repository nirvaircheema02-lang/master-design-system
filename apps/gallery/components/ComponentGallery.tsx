"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { KIT_EVENT, readKit } from "../lib/kit";

export interface GalleryItem { id: string; name: string; group: string; kinds: string[]; variants: number; search: string; node: ReactNode }
interface Props { items: GalleryItem[]; groups: string[]; kinds: Array<{ key: string; label: string }> }

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/** Searchable, filterable gallery. Filters in one row are "any of"; different rows are "all of". State lives in the URL so a view can be shared. */
export function ComponentGallery({ items, groups, kinds }: Props) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string[]>([]);
  const [kind, setKind] = useState<string[]>([]);
  const [variantsOnly, setVariantsOnly] = useState(false);
  const [kitOnly, setKitOnly] = useState(false);
  const [sort, setSort] = useState<"category" | "az">("category");
  const [kitIds, setKitIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setQ(p.get("q") ?? ""); setGroup(p.get("group")?.split("|").filter(Boolean) ?? []); setKind(p.get("kind")?.split("|").filter(Boolean) ?? []);
    setVariantsOnly(p.get("variants") === "1"); setKitOnly(p.get("kit") === "1"); setSort(p.get("sort") === "az" ? "az" : "category"); setReady(true);
    const u = () => setKitIds(readKit().map((k) => k.ref.split("@")[0]!));
    u(); window.addEventListener(KIT_EVENT, u); window.addEventListener("storage", u);
    return () => { window.removeEventListener(KIT_EVENT, u); window.removeEventListener("storage", u); };
  }, []);
  useEffect(() => {
    if (!ready) return;
    const p = new URLSearchParams();
    if (q) p.set("q", q); if (group.length) p.set("group", group.join("|")); if (kind.length) p.set("kind", kind.join("|"));
    if (variantsOnly) p.set("variants", "1"); if (kitOnly) p.set("kit", "1"); if (sort === "az") p.set("sort", "az");
    const s = p.toString(); window.history.replaceState(null, "", window.location.pathname + (s ? `?${s}` : ""));
  }, [ready, q, group, kind, variantsOnly, kitOnly, sort]);

  const shown = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const out = items.filter((i) =>
      words.every((w) => i.search.includes(w)) &&
      (!group.length || group.includes(i.group)) &&
      (!kind.length || i.kinds.some((k) => kind.includes(k))) &&
      (!variantsOnly || i.variants > 1) &&
      (!kitOnly || kitIds.includes(i.id)));
    return sort === "az" ? [...out].sort((a, b) => a.name.localeCompare(b.name)) : out;
  }, [items, q, group, kind, variantsOnly, kitOnly, sort, kitIds]);
  const active = group.length + kind.length + (variantsOnly ? 1 : 0) + (kitOnly ? 1 : 0) + (q ? 1 : 0);
  const clear = () => { setQ(""); setGroup([]); setKind([]); setVariantsOnly(false); setKitOnly(false); };
  const sections = sort === "az" ? [["All components", shown] as const] : groups.map((g) => [g, shown.filter((i) => i.group === g)] as const).filter(([, l]) => l.length);

  return (
    <div>
      <div className="gal-bar">
        <div className="gal-search"><label htmlFor="gal-q" className="vh">Search components</label><input id="gal-q" type="search" placeholder="Search components, tags, uses…  e.g. “form”, “hover”, “modal”" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="gal-sort"><label htmlFor="gal-sort">Sort</label><select id="gal-sort" value={sort} onChange={(e) => setSort(e.target.value as "category" | "az")}><option value="category">By category</option><option value="az">A to Z</option></select></div>
      </div>
      <div className="chips" role="group" aria-label="Category"><span className="chips-label">Category</span>{groups.map((g) => <button key={g} type="button" className="chip-f" aria-pressed={group.includes(g)} onClick={() => setGroup(toggle(group, g))}>{g}</button>)}</div>
      <div className="chips" role="group" aria-label="Interaction"><span className="chips-label">Interaction</span>{kinds.map((k) => <button key={k.key} type="button" className="chip-f" aria-pressed={kind.includes(k.key)} onClick={() => setKind(toggle(kind, k.key))}>{k.label}</button>)}</div>
      <div className="chips" role="group" aria-label="More filters"><span className="chips-label">More</span>
        <button type="button" className="chip-f" aria-pressed={variantsOnly} onClick={() => setVariantsOnly(!variantsOnly)}>Has several variants</button>
        <button type="button" className="chip-f" aria-pressed={kitOnly} onClick={() => setKitOnly(!kitOnly)}>In my Brand UI Kit</button>
        {active ? <button type="button" className="chip-clear" onClick={clear}>Clear all</button> : null}
      </div>
      <p className="gal-count" role="status" aria-live="polite">{shown.length} of {items.length} components</p>
      {shown.length === 0 ? <div className="panel"><b>No components match.</b> <button type="button" className="plain" onClick={clear}>Clear filters</button></div> : sections.map(([title, list]) => (
        <section key={title}>
          <div className="layer-head"><h2>{title} ({list.length})</h2></div>
          <div className="grid">{list.map((i) => <div key={i.id} data-id={i.id} style={{ display: "contents" }}>{i.node}</div>)}</div>
        </section>
      ))}
    </div>
  );
}
