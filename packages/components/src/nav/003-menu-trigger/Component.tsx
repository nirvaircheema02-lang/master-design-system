"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import "./nav-003.css";
import "./skins.css";

export interface Nav003Link { href: string; label: string; current?: boolean }
export interface Nav003Props {
  /** Visible text of the trigger button. */
  children: ReactNode;
  links: Nav003Link[];
  defaultOpen?: boolean;
  skin?: string;
  className?: string;
}

/**
 * NAV-003 Menu trigger: a site-navigation DISCLOSURE (button[aria-expanded] + a list of links), deliberately NOT a
 * role=menu widget. Focus moving past it never opens it; Escape closes it and returns focus to the button; so does a
 * click outside or tabbing out of the component.
 */
export function Nav003({ children, links, defaultOpen = false, skin, className }: Nav003Props) {
  const [open, setOpen] = useState(defaultOpen);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    const onDown = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onDown); };
  }, [open]);

  return (
    <div
      ref={root}
      className={["ds-nav-003", className].filter(Boolean).join(" ")}
      data-skin={skin}
      onBlur={(e) => { if (open && !root.current?.contains(e.relatedTarget as Node | null)) setOpen(false); }}
    >
      <button ref={button} type="button" className="ds-nav-003__trigger" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((o) => !o)}>
        <span className="ds-nav-003__label">{children}</span>
        <svg className="ds-nav-003__chevron" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M5 7.5l5 5 5-5" /></svg>
      </button>
      <ul id={panelId} className="ds-nav-003__panel" data-state={open ? "open" : "closed"} hidden={!open}>
        {links.map((l) => (
          <li key={l.href}><a className="ds-nav-003__link" href={l.href} aria-current={l.current ? "page" : undefined}>{l.label}</a></li>
        ))}
      </ul>
    </div>
  );
}
