"use client";

import type { ButtonHTMLAttributes, MouseEvent, PointerEvent, ReactNode } from "react";
import "./cta-010.css";
import "./skins.css";

export interface Cta010Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  size?: "sm" | "md" | "lg";
  /** Named skin from the manifest; omitted = the default skin. */
  skin?: string;
  /** While loading the button stays focusable (aria-disabled, not disabled), ignores activation and announces itself. */
  loading?: boolean;
  loadingLabel?: string;
  children: ReactNode;
}

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * CTA-010 Spotlight. A soft pool of light follows the pointer inside the button. Pointer tracking writes two local
 * custom properties and is a no-op for touch and under prefers-reduced-motion (the pool then sits centred, static).
 * Appearance comes only from --ds-cta-* tokens.
 */
export function Cta010({ size = "md", skin, loading = false, loadingLabel = "Loading", children, disabled, onClick, onPointerMove, onPointerLeave, ...rest }: Cta010Props) {
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (loading) { e.preventDefault(); return; }
    onClick?.(e);
  };
  const handleMove = (e: PointerEvent<HTMLButtonElement>) => {
    onPointerMove?.(e);
    if (e.pointerType === "touch" || prefersReducedMotion()) return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--_mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--_my", `${e.clientY - r.top}px`);
  };
  const handleLeave = (e: PointerEvent<HTMLButtonElement>) => {
    onPointerLeave?.(e);
    e.currentTarget.style.removeProperty("--_mx");
    e.currentTarget.style.removeProperty("--_my");
  };
  return (
    <>
      <button
        type="button"
        {...rest}
        className={["ds-cta-010", rest.className].filter(Boolean).join(" ")}
        data-size={size}
        data-skin={skin}
        data-loading={loading || undefined}
        aria-busy={loading || undefined}
        aria-disabled={loading || undefined}
        disabled={disabled}
        onClick={handleClick}
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
      >
        {loading ? <span className="ds-cta-010__spinner" aria-hidden="true" /> : null}
        <span className="ds-cta-010__label">{children}</span>
      </button>
      <span className="ds-cta-010__status" role="status">{loading ? loadingLabel : ""}</span>
    </>
  );
}
