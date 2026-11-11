"use client";

import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";
import "./cta-014.css";
import "./skins.css";

export type Cta014Status = "idle" | "loading" | "success" | "error";

export interface Cta014Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  size?: "sm" | "md" | "lg";
  /** Named skin from the manifest; omitted = the default skin. */
  skin?: string;
  /** Controlled state. The component has no timers: the caller moves it idle -> loading -> success | error. */
  status?: Cta014Status;
  /** Alias for status="loading". */
  loading?: boolean;
  loadingLabel?: string;
  successLabel?: string;
  errorLabel?: string;
  children: ReactNode;
}

/**
 * CTA-014 Status Morph. The visible label stays in the DOM (so the width and the accessible name never change) and is
 * replaced visually by a spinner, a check or a cross. The result is spoken through a polite live region. loading and
 * success ignore activation; error allows a retry. Appearance comes only from --ds-cta-* tokens.
 */
export function Cta014({ size = "md", skin, status: statusProp = "idle", loading = false, loadingLabel = "Loading", successLabel = "Done", errorLabel = "Something went wrong. Try again.", children, disabled, onClick, ...rest }: Cta014Props) {
  const status: Cta014Status = loading ? "loading" : statusProp;
  const inert = status === "loading" || status === "success";
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (inert) { e.preventDefault(); return; }
    onClick?.(e);
  };
  const message = status === "loading" ? loadingLabel : status === "success" ? successLabel : status === "error" ? errorLabel : "";
  return (
    <>
      <button
        type="button"
        {...rest}
        className={["ds-cta-014", rest.className].filter(Boolean).join(" ")}
        data-size={size}
        data-skin={skin}
        data-status={status}
        data-loading={status === "loading" || undefined}
        aria-busy={status === "loading" || undefined}
        aria-disabled={inert || undefined}
        disabled={disabled}
        onClick={handleClick}
      >
        <span className="ds-cta-014__label">{children}</span>
        <span className="ds-cta-014__spinner" aria-hidden="true" />
        <svg className="ds-cta-014__mark ds-cta-014__check" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M4 10.5l4 4 8-9" /></svg>
        <svg className="ds-cta-014__mark ds-cta-014__cross" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M5 5l10 10M15 5L5 15" /></svg>
      </button>
      <span className="ds-cta-014__status" role="status">{message}</span>
    </>
  );
}
