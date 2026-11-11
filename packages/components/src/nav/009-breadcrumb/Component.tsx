import type { ReactNode } from "react";
import "./nav-009.css";
import "./skins.css";

export interface Nav009Item { label: ReactNode; href?: string }
export interface Nav009Props {
  /** Trail from the root to the current page. The LAST item is the current page (text, aria-current="page"); the others need an href. */
  items: Nav009Item[];
  /** Accessible name of the landmark. Must be unique among the page's navs. */
  label?: string;
  skin?: string;
  /** Visual design (manifest props.design). Omitted = slash. */
  design?: "slash" | "chevron" | "dot" | "arrow" | "boxed";
  className?: string;
}

/** NAV-009 Breadcrumb: a labelled nav landmark with an ordered list; separators are decorative CSS, not content. */
export function Nav009({ items, label = "Breadcrumb", skin, design, className }: Nav009Props) {
  return (
    <nav className={["ds-nav-009", className].filter(Boolean).join(" ")} data-skin={skin} data-design={design} aria-label={label}>
      <ol className="ds-nav-009__list">
        {items.map((it, i) => (
          <li key={i} className="ds-nav-009__item">
            {i === items.length - 1
              ? <span className="ds-nav-009__current" aria-current="page">{it.label}</span>
              : <a className="ds-nav-009__link" href={it.href}>{it.label}</a>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
