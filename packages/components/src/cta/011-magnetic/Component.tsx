"use client";

import type { ButtonHTMLAttributes, MouseEvent, PointerEvent, ReactNode } from "react";
import "./cta-011.css";
import "./skins.css";

export interface Cta011Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  size?: "sm" | "md" | "lg";
  /** Named skin from the manifest; omitted = the default skin. */
  skin?: string;
  /** How far the face leans toward the pointer, 0 (off) to 2. Default 1 = up to about 10px by 6px. */
  strength?: number;
  /** While loading the button stays focusable (aria-disabled, not disabled), ignores activation and announces itself. */
  loading?: boolean;
  loadingLabel?: string;
  children: ReactNode;
}

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * CTA-011 Magnetic. The button FACE leans toward the pointer; the host box never moves, so the hit area, focus ring
 * and layout stay put (a moving host makes the pointer flicker in and out). Pointer tracking is a no-op for touch and
 * under prefers-reduced-motion. Appearance comes only from --ds-cta-* tokens.
 */
export function Cta011({ size = "md", skin, strength = 1, loading = false, loadingLabel = "Loading", children, disabled, onClick, onPointerMove, onPointerLeave, ...rest }: Cta011Props) {
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (loading) { e.preventDefault(); return; }
    onClick?.(e);
  };
  const handleMove = (e: PointerEvent<HTMLButtonElement>) => {
    onPointerMove?.(e);
    if (e.pointerType === "touch" || prefersReducedMotion()) return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
    const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
    const k = Math.max(0, Math.min(2, strength));
    el.style.setProperty("--_tx", `${(dx * 20 * k).toFixed(1)}px`);
    el.style.setProperty("--_ty", `${(dy * 12 * k).toFixed(1)}px`);
  };
  const handleLeave = (e: PointerEvent<HTMLButtonElement>) => {
    onPointerLeave?.(e);
    e.currentTarget.style.removeProperty("--_tx");
    e.currentTarget.style.removeProperty("--_ty");
  };
  return (
    <>
      <button
        type="button"
        {...rest}
        className={["ds-cta-011", rest.className].filter(Boolean).join(" ")}
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
        <span className="ds-cta-011__face">
          {loading ? <span className="ds-cta-011__spinner" aria-hidden="true" /> : null}
          <span className="ds-cta-011__label">{children}</span>
        </span>
      </button>
      <span className="ds-cta-011__status" role="status">{loading ? loadingLabel : ""}</span>
    </>
  );
}
