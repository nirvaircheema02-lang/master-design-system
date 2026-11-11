"use client";

import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";
import "./cta-002.css";
import "./skins.css";

export interface Cta002Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  size?: "sm" | "md" | "lg";
  /** Named skin from the manifest; omitted = the default skin. */
  skin?: string;
  /** While loading the button stays focusable (aria-disabled, not disabled), ignores activation and announces itself. */
  loading?: boolean;
  loadingLabel?: string;
  /** Replaces the default arrow. Rendered twice (outgoing + incoming); must be decorative. */
  icon?: ReactNode;
  children: ReactNode;
}

const Arrow = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" focusable="false">
    <path d="M4 10h12M11 5l5 5-5 5" />
  </svg>
);

/** CTA-002 Sliding Arrow. Appearance comes only from --ds-cta-* tokens; never edit colours here. */
export function Cta002({ size = "md", skin, loading = false, loadingLabel = "Loading", children, disabled, onClick, icon, ...rest }: Cta002Props) {
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (loading) { e.preventDefault(); return; }
    onClick?.(e);
  };
  return (
    <>
      <button
        type="button"
        {...rest}
        className={["ds-cta-002", rest.className].filter(Boolean).join(" ")}
        data-size={size}
        data-skin={skin}
        data-loading={loading || undefined}
        aria-busy={loading || undefined}
        aria-disabled={loading || undefined}
        disabled={disabled}
        onClick={handleClick}
      >
        {loading ? <span className="ds-cta-002__spinner" aria-hidden="true" /> : null}
        <span className="ds-cta-002__label">{children}</span>
        <span className="ds-cta-002__icon" aria-hidden="true">
          {icon ?? <Arrow />}
          {icon ?? <Arrow />}
        </span>
      </button>
      <span className="ds-cta-002__status" role="status">{loading ? loadingLabel : ""}</span>
    </>
  );
}
