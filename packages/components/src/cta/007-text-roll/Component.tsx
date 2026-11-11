"use client";

import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";
import "./cta-007.css";
import "./skins.css";

export interface Cta007Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  size?: "sm" | "md" | "lg";
  /** Named skin from the manifest; omitted = the default skin. */
  skin?: string;
  /** While loading the button stays focusable (aria-disabled, not disabled), ignores activation and announces itself. */
  loading?: boolean;
  loadingLabel?: string;
  children: ReactNode;
}

/** CTA-007 Text Roll. Appearance comes only from --ds-cta-* tokens; never edit colours here. */
export function Cta007({ size = "md", skin, loading = false, loadingLabel = "Loading", children, disabled, onClick, ...rest }: Cta007Props) {
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (loading) { e.preventDefault(); return; }
    onClick?.(e);
  };
  return (
    <>
      <button
        type="button"
        {...rest}
        className={["ds-cta-007", rest.className].filter(Boolean).join(" ")}
        data-size={size}
        data-skin={skin}
        data-loading={loading || undefined}
        aria-busy={loading || undefined}
        aria-disabled={loading || undefined}
        disabled={disabled}
        onClick={handleClick}
      >
        {loading ? <span className="ds-cta-007__spinner" aria-hidden="true" /> : null}
        <span className="ds-cta-007__label"><span>{children}</span><span aria-hidden="true">{children}</span></span>
      </button>
      <span className="ds-cta-007__status" role="status">{loading ? loadingLabel : ""}</span>
    </>
  );
}
