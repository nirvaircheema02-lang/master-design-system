"use client";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import "./nav-006.css";
import "./skins.css";

export interface Nav006Link { href: string; label: string; current?: boolean }
export interface Nav006Props {
  /** The brand / site name (rendered as a link to `brandHref`). */
  children: ReactNode;
  brandHref?: string;
  links: Nav006Link[];
  /** Accessible name of the primary nav. Must be unique among the page's navs. */
  navLabel?: string;
  /** Optional call-to-action link at the end of the header. */
  actionLabel?: string;
  actionHref?: string;
  skin?: string;
  /** Visual design (manifest props.design). Omitted = classic. */
  design?: "classic" | "centered" | "floating" | "accent" | "split";
  className?: string;
}

/**
 * NAV-006 Sticky header. It ships the pairing the research found missing on 10 of 12 production sites: while mounted it keeps
 * <html> `scroll-padding-top` equal to its measured height, so keyboard focus and #anchor jumps are never hidden behind it
 * (WCAG 2.4.11). The padding follows the header when it wraps to more lines.
 */
export function Nav006({ children, brandHref = "/", links, navLabel = "Primary", actionLabel, actionHref = "#", skin, design, className }: Nav006Props) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    // a floating header sits `top` px below the edge while stuck: reserve that too
    const apply = () => { root.style.scrollPaddingTop = `${el.offsetHeight + (parseFloat(getComputedStyle(el).top) || 0) + 8}px`; };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => { ro.disconnect(); root.style.removeProperty("scroll-padding-top"); };
  }, []);
  return (
    <header ref={ref} className={["ds-nav-006", className].filter(Boolean).join(" ")} data-skin={skin} data-design={design}>
      <a className="ds-nav-006__brand" href={brandHref}>{children}</a>
      <nav aria-label={navLabel}>
        <ul className="ds-nav-006__list">
          {links.map((l) => (
            <li key={l.href}><a className="ds-nav-006__link" href={l.href} aria-current={l.current ? "page" : undefined}>{l.label}</a></li>
          ))}
        </ul>
      </nav>
      {actionLabel ? <a className="ds-nav-006__action" href={actionHref}>{actionLabel}</a> : null}
    </header>
  );
}
