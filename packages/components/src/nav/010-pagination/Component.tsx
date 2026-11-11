import "./nav-010.css";
import "./skins.css";

export interface Nav010Props {
  /** Current page, 1-based. */
  page: number;
  pageCount: number;
  /** Link template; `{n}` becomes the page number (JSON-friendly, and works without client JS). */
  hrefPattern?: string;
  /** How many pages to show on each side of the current one. */
  siblings?: number;
  /** Accessible name of the landmark. Must be unique among the page's navs. */
  label?: string;
  prevLabel?: string;
  nextLabel?: string;
  skin?: string;
  /** Visual design (manifest props.design). Omitted = boxed. */
  design?: "boxed" | "pill" | "plain" | "joined" | "compact";
  className?: string;
}

/** First, last, the current page and its neighbours; gaps become a single "…" so the list never grows with the page count. */
export function pageWindow(page: number, count: number, siblings: number): Array<number | "gap-l" | "gap-r"> {
  const keep = new Set<number>([1, count]);
  for (let p = page - siblings; p <= page + siblings; p++) if (p >= 1 && p <= count) keep.add(p);
  const sorted = [...keep].sort((a, b) => a - b);
  const out: Array<number | "gap-l" | "gap-r"> = [];
  sorted.forEach((p, i) => {
    const prev = sorted[i - 1];
    if (prev !== undefined && p - prev > 1) { if (p - prev === 2) out.push(prev + 1); else out.push(i <= sorted.length / 2 ? "gap-l" : "gap-r"); }
    out.push(p);
  });
  return out;
}

/** NAV-010 Pagination: a labelled nav of real links (no JS needed). The current page is `aria-current`; an unavailable Previous/Next is plain text, not a dead link. */
export function Nav010({ page, pageCount, hrefPattern = "?page={n}", siblings = 1, label = "Pagination", prevLabel = "Previous", nextLabel = "Next", skin, design, className }: Nav010Props) {
  const href = (n: number) => hrefPattern.replace("{n}", String(n));
  const items = pageWindow(page, pageCount, siblings);
  return (
    <nav className={["ds-nav-010", className].filter(Boolean).join(" ")} data-skin={skin} data-design={design} aria-label={label}>
      <ul className="ds-nav-010__list">
        <li>{page > 1 ? <a className="ds-nav-010__link ds-nav-010__step" href={href(page - 1)} rel="prev">{prevLabel}<span className="ds-nav-010__vh"> page</span></a> : <span className="ds-nav-010__link ds-nav-010__step ds-nav-010__off">{prevLabel}</span>}</li>
        {items.map((it) => typeof it === "number" ? (
          <li key={it}><a className="ds-nav-010__link" href={href(it)} aria-label={`Page ${it}`} aria-current={it === page ? "page" : undefined}>{it}</a></li>
        ) : (
          <li key={it} className="ds-nav-010__gap" aria-hidden="true">…</li>
        ))}
        <li>{page < pageCount ? <a className="ds-nav-010__link ds-nav-010__step" href={href(page + 1)} rel="next">{nextLabel}<span className="ds-nav-010__vh"> page</span></a> : <span className="ds-nav-010__link ds-nav-010__step ds-nav-010__off">{nextLabel}</span>}</li>
      </ul>
    </nav>
  );
}
