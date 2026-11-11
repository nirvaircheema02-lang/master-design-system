"use client";

import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";
import "./cta-005.css";
import "./skins.css";

export interface Cta005Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  size?: "sm" | "md" | "lg";
  /** Named skin from the manifest; omitted = the default skin. */
  skin?: string;
  /** While loading the button stays focusable (aria-disabled, not disabled), ignores activation and announces itself. */
  loading?: boolean;
  loadingLabel?: string;
  children: ReactNode;
}

/** CTA-005 Orbit Border. Appearance comes only from --ds-cta-* tokens; never edit colours here. */
export function Cta005({ size = "md", skin, loading = false, loadingLabel = "Loading", children, disabled, onClick, ...rest }: Cta005Props) {
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (loading) { e.preventDefault(); return; }
    onClick?.(e);
  };
  return (
    <>
      <button
        type="button"
        {...rest}
        className={["ds-cta-005", rest.className].filter(Boolean).join(" ")}
        data-size={size}
        data-skin={skin}
        data-loading={loading || undefined}
        aria-busy={loading || undefined}
        aria-disabled={loading || undefined}
        disabled={disabled}
        onClick={handleClick}
      >
        {loading ? <span className="ds-cta-005__spinner" aria-hidden="true" /> : null}
        <span className="ds-cta-005__label">{children}</span>
      </button>
      <span className="ds-cta-005__status" role="status">{loading ? loadingLabel : ""}</span>
    </>
  );
}
