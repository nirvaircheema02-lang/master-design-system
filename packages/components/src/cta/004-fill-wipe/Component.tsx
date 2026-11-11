"use client";

import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";
import "./cta-004.css";
import "./skins.css";

export interface Cta004Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  size?: "sm" | "md" | "lg";
  /** Named skin from the manifest; omitted = the default skin. */
  skin?: string;
  /** While loading the button stays focusable (aria-disabled, not disabled), ignores activation and announces itself. */
  loading?: boolean;
  loadingLabel?: string;
  /** Edge the fill enters from. */
  direction?: "left" | "right" | "top" | "bottom";
  children: ReactNode;
}

/** CTA-004 Fill Wipe. Appearance comes only from --ds-cta-* tokens; never edit colours here. */
export function Cta004({ size = "md", skin, loading = false, loadingLabel = "Loading", children, disabled, onClick, direction = "left", ...rest }: Cta004Props) {
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (loading) { e.preventDefault(); return; }
    onClick?.(e);
  };
  return (
    <>
      <button
        type="button"
        {...rest}
        className={["ds-cta-004", rest.className].filter(Boolean).join(" ")}
        data-size={size}
        data-skin={skin}
        data-direction={direction}
        data-loading={loading || undefined}
        aria-busy={loading || undefined}
        aria-disabled={loading || undefined}
        disabled={disabled}
        onClick={handleClick}
      >
        {loading ? <span className="ds-cta-004__spinner" aria-hidden="true" /> : null}
        <span className="ds-cta-004__label">{children}</span>
      </button>
      <span className="ds-cta-004__status" role="status">{loading ? loadingLabel : ""}</span>
    </>
  );
}
