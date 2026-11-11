import type { AnchorHTMLAttributes, ReactNode } from "react";
import "./nav-002.css";
import "./skins.css";

export interface Nav002Props extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children"> {
  href: string;
  /** The page the link points to is the current page: sets aria-current="page" and a persistent (non-hover) cue. */
  current?: boolean;
  /** Named skin from the manifest; omitted = the default skin. */
  skin?: string;
  children: ReactNode;
}

/** NAV-002 Indicator-reveal navigation item. A real link. Appearance comes only from --ds-nav-* tokens. */
export function Nav002({ href, current = false, skin, children, className, ...rest }: Nav002Props) {
  return (
    <a {...rest} href={href} className={["ds-nav-002", className].filter(Boolean).join(" ")} data-skin={skin} data-current={current || undefined} aria-current={current ? "page" : undefined}>
      <span className="ds-nav-002__label">{children}</span>
    </a>
  );
}
