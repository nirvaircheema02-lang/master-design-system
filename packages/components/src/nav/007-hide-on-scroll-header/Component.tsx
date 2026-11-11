"use client";
import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import "./nav-007.css";
import "./skins.css";

export interface Nav007Link { href: string; label: string; current?: boolean }
export interface Nav007Props {
  children: ReactNode;
  brandHref?: string;
  links: Nav007Link[];
  /** Accessible name of the primary nav. Must be unique among the page's navs. */
  navLabel?: string;
  skin?: string;
  className?: string;
}

const THRESHOLD = 8;

/**
 * NAV-007 Hide-on-scroll header. Scrolling DOWN hides it; scrolling UP, reaching the top, or any keyboard use brings it back.
 * While hidden it is `visibility: hidden` (out of the tab order and the accessibility tree), and Tab / Shift+Tab / focus
 * entering it show it BEFORE focus moves, so a keyboard user can always reach it and never focuses something invisible.
 * Like NAV-006 it keeps <html> `scroll-padding-top` equal to its height.
 */
export function Nav007({ children, brandHref = "/", links, navLabel = "Primary", skin, className }: Nav007Props) {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    const apply = () => { root.style.scrollPaddingTop = `${el.offsetHeight + 8}px`; };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => { ro.disconnect(); root.style.removeProperty("scroll-padding-top"); };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Direct DOM writes (not React state): a Tab keydown must show the header synchronously, before the browser moves focus.
    const set = (hidden: boolean) => { el.dataset.hidden = hidden ? "true" : "false"; };
    let last = window.scrollY, queued = false;
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        const y = window.scrollY, dy = y - last;
        if (y <= el.offsetHeight) set(false);
        else if (dy > THRESHOLD && !el.contains(document.activeElement)) set(true);
        else if (dy < -THRESHOLD) set(false);
        if (Math.abs(dy) > THRESHOLD) last = y;
      });
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Tab") set(false); };
    const onFocusIn = () => set(false);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("keydown", onKey, true);
    el.addEventListener("focusin", onFocusIn);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("keydown", onKey, true); el.removeEventListener("focusin", onFocusIn); };
  }, []);

  return (
    <header ref={ref} className={["ds-nav-007", className].filter(Boolean).join(" ")} data-skin={skin} data-hidden="false">
      <a className="ds-nav-007__brand" href={brandHref}>{children}</a>
      <nav aria-label={navLabel}>
        <ul className="ds-nav-007__list">
          {links.map((l) => (
            <li key={l.href}><a className="ds-nav-007__link" href={l.href} aria-current={l.current ? "page" : undefined}>{l.label}</a></li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
