"use client";

import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";
import "./cta-008.css";
import "./skins.css";

export interface Cta008Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  size?: "sm" | "md" | "lg";
  /** Named skin from the manifest; omitted = the default skin. */
  skin?: string;
  /** While loading the button stays focusable (aria-disabled, not disabled), ignores activation and announces itself. */
  loading?: boolean;
  loadingLabel?: string;
  /** Replaces the default arrow glyph (decorative). */
  icon?: ReactNode;
  children: ReactNode;
}

const Arrow = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" focusable="false">
    <path d="M4 10h12M11 5l5 5-5 5" />
  </svg>
);

/** CTA-008 Icon Expansion. Appearance comes only from --ds-cta-* tokens; never edit colours here. */
export function Cta008({ size = "md", skin, loading = false, loadingLabel = "Loading", children, disabled, onClick, icon, ...rest }: Cta008Props) {
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (loading) { e.preventDefault(); return; }
    onClick?.(e);
  };
  return (
    <>
      <button
        type="button"
        {...rest}
        className={["ds-cta-008", rest.className].filter(Boolean).join(" ")}
        data-size={size}
        data-skin={skin}
        data-loading={loading || undefined}
        aria-busy={loading || undefined}
        aria-disabled={loading || undefined}
        disabled={disabled}
        onClick={handleClick}
      >
        {loading ? <span className="ds-cta-008__spinner" aria-hidden="true" /> : null}
        <span className="ds-cta-008__label">{children}</span>
        <span className="ds-cta-008__chip" aria-hidden="true">{icon ?? <Arrow />}</span>
      </button>
      <span className="ds-cta-008__status" role="status">{loading ? loadingLabel : ""}</span>
    </>
  );
}
