"use client";
import { useEffect, useId, useRef, useState } from "react";
import "./nav-005.css";
import "./skins.css";

export interface Nav005Link { href: string; label: string; description?: string; current?: boolean }
export interface Nav005Group { heading: string; links: Nav005Link[] }
/** An item with `groups` opens a panel; an item with only `href` is a plain link. */
export interface Nav005Item { label: string; href?: string; groups?: Nav005Group[] }
export interface Nav005Props {
  items: Nav005Item[];
  /** Accessible name of the nav landmark. Must be unique among the page's navs. */
  navLabel?: string;
  /** Heading level of each group title (2-4). */
  headingLevel?: 2 | 3 | 4;
  skin?: string;
  className?: string;
}

/**
 * NAV-005 Disclosure mega menu: site navigation as buttons (aria-expanded) that reveal panels of grouped links. NOT a menu widget:
 * no menu roles, nothing opens on hover or focus, one panel at a time, Escape closes and returns focus to its button,
 * and so does a click outside or tabbing out.
 */
export function Nav005({ items, navLabel = "Primary", headingLevel = 3, skin, className }: Nav005Props) {
  const [open, setOpen] = useState<number | null>(null);
  const root = useRef<HTMLElement>(null);
  const base = useId();
  const Heading = `h${headingLevel}` as "h3";

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(null);
      root.current?.querySelector<HTMLElement>(`[data-index="${open}"]`)?.focus();
    };
    const onDown = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(null); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onDown); };
  }, [open]);

  return (
    <nav
      ref={root}
      className={["ds-nav-005", className].filter(Boolean).join(" ")}
      data-skin={skin}
      aria-label={navLabel}
      onBlur={(e) => { if (open !== null && !root.current?.contains(e.relatedTarget as Node | null)) setOpen(null); }}
    >
      <ul className="ds-nav-005__list">
        {items.map((it, i) => (
          <li key={it.label} className="ds-nav-005__item">
            {it.groups ? (
              <>
                <button type="button" className="ds-nav-005__trigger" data-index={i} aria-expanded={open === i} aria-controls={`${base}-${i}`} onClick={() => setOpen(open === i ? null : i)}>
                  <span>{it.label}</span>
                  <svg className="ds-nav-005__chevron" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M5 7.5l5 5 5-5" /></svg>
                </button>
                <div id={`${base}-${i}`} className="ds-nav-005__panel" data-state={open === i ? "open" : "closed"} hidden={open !== i}>
                  <div className="ds-nav-005__groups">
                    {it.groups.map((g) => (
                      <div key={g.heading} className="ds-nav-005__group">
                        <Heading className="ds-nav-005__heading">{g.heading}</Heading>
                        <ul className="ds-nav-005__links">
                          {g.links.map((l) => (
                            <li key={l.href}>
                              <a className="ds-nav-005__link" href={l.href} aria-current={l.current ? "page" : undefined}>
                                <span className="ds-nav-005__label">{l.label}</span>
                                {l.description ? <span className="ds-nav-005__desc">{l.description}</span> : null}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <a className="ds-nav-005__trigger ds-nav-005__plain" href={it.href}>{it.label}</a>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
