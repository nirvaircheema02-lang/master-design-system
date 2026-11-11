"use client";

import type { AnchorHTMLAttributes, ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";
import "./cta-012.css";
import "./skins.css";

interface CommonProps {
  /** Named skin from the manifest; omitted = the default skin. */
  skin?: string;
  /** While loading it stays focusable (aria-disabled, not disabled), ignores activation and announces itself. */
  loading?: boolean;
  loadingLabel?: string;
  children: ReactNode;
}
export interface Cta012ButtonProps extends CommonProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> { href?: undefined }
/** With `href` it renders a real link: Enter activates, Space does not, and a loading link keeps its href but cancels navigation. */
export interface Cta012LinkProps extends CommonProps, Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children"> { href: string }
export type Cta012Props = Cta012ButtonProps | Cta012LinkProps;

/** CTA-012 Underline Draw (text link). Appearance comes only from --ds-cta-* tokens; never edit colours here. */
export function Cta012(props: Cta012Props) {
  const { skin, loading = false, loadingLabel = "Loading", children, className, ...rest } = props;
  const cls = ["ds-cta-012", className].filter(Boolean).join(" ");
  const inner = (
    <>
      {loading ? <span className="ds-cta-012__spinner" aria-hidden="true" /> : null}
      <span className="ds-cta-012__label">{children}</span>
    </>
  );
  const status = <span className="ds-cta-012__status" role="status">{loading ? loadingLabel : ""}</span>;
  if (props.href !== undefined) {
    const { href, onClick, ...anchor } = rest as AnchorHTMLAttributes<HTMLAnchorElement>;
    const handle = (e: MouseEvent<HTMLAnchorElement>) => { if (loading) { e.preventDefault(); return; } onClick?.(e); };
    return (
      <>
        <a {...anchor} href={href} className={cls} data-skin={skin} data-loading={loading || undefined} aria-busy={loading || undefined} aria-disabled={loading || undefined} onClick={handle}>{inner}</a>
        {status}
      </>
    );
  }
  const { disabled, onClick, ...button } = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  const handle = (e: MouseEvent<HTMLButtonElement>) => { if (loading) { e.preventDefault(); return; } onClick?.(e); };
  return (
    <>
      <button type="button" {...button} className={cls} data-skin={skin} data-loading={loading || undefined} aria-busy={loading || undefined} aria-disabled={loading || undefined} disabled={disabled} onClick={handle}>{inner}</button>
      {status}
    </>
  );
}
