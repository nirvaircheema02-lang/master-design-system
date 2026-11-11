"use client";
import type { MouseEvent, ReactNode } from "react";
import "./nav-008.css";
import "./skins.css";

export interface Nav008Props {
  /** Visible text, e.g. "Skip to main content". */
  children: ReactNode;
  /** id of the element focus moves to. It gets tabindex="-1" if it has none. */
  target?: string;
  /** `on-focus` (default): hidden until it has keyboard focus. `always`: shown permanently (documentation previews only). */
  reveal?: "on-focus" | "always";
  skin?: string;
  className?: string;
}

/**
 * NAV-008 Skip link (WCAG 2.4.1). Must be the FIRST focusable element of the page. It is off-screen, never display:none,
 * until focused; activating it moves FOCUS to the target (a plain #hash link only scrolls in some browsers).
 */
export function Nav008({ children, target = "main", reveal = "on-focus", skin, className }: Nav008Props) {
  const go = (e: MouseEvent<HTMLAnchorElement>) => {
    const el = document.getElementById(target);
    if (!el) return;
    e.preventDefault();
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
    el.focus();
  };
  return <a className={["ds-nav-008", className].filter(Boolean).join(" ")} data-skin={skin} data-reveal={reveal} href={`#${target}`} onClick={go}>{children}</a>;
}
