"use client";

import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";
import "./cta-001.css";
import "./skins.css";

export interface Cta001Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  size?: "sm" | "md" | "lg";
  /** Named skin from the manifest; omitted = the default skin. */
  skin?: string;
  /** While loading the button stays focusable (aria-disabled, not disabled), ignores activation and announces itself. */
  loading?: boolean;
  loadingLabel?: string;
  iconTrailing?: ReactNode;
  children: ReactNode;
}

/** CTA-001 Shimmer. Appearance comes only from --ds-cta-* tokens; never edit colours here. */
export function Cta001({ size = "md", skin, loading = false, loadingLabel = "Loading", children, disabled, onClick, iconTrailing, ...rest }: Cta001Props) {
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (loading) { e.preventDefault(); return; }
    onClick?.(e);
  };
  return (
    <>
      <button
        type="button"
        {...rest}
        className={["ds-cta-001", rest.className].filter(Boolean).join(" ")}
        data-size={size}
        data-skin={skin}
        data-loading={loading || undefined}
        aria-busy={loading || undefined}
        aria-disabled={loading || undefined}
        disabled={disabled}
        onClick={handleClick}
      >
        {loading ? <span className="ds-cta-001__spinner" aria-hidden="true" /> : null}
        <span className="ds-cta-001__label">{children}</span>
        {iconTrailing ? <span className="ds-cta-001__icon" aria-hidden="true">{iconTrailing}</span> : null}
      </button>
      <span className="ds-cta-001__status" role="status">{loading ? loadingLabel : ""}</span>
    </>
  );
}
