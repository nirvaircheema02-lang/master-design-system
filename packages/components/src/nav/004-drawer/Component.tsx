"use client";
import type { ReactNode } from "react";
import { Dialog, useThemeContainer } from "@master-ds/headless";
import "./nav-004.css";
import "./skins.css";

export interface Nav004Link { href: string; label: string; current?: boolean }
export interface Nav004Props {
  /** Visible label of the built-in trigger button. */
  children?: ReactNode;
  /** Heading of the drawer, also its accessible name. */
  title?: string;
  links: Nav004Link[];
  /** Accessible name of the nav inside the drawer. Must be unique among the page's navs. */
  navLabel?: string;
  side?: "left" | "right";
  closeLabel?: string;
  skin?: string;
  className?: string;
}

/**
 * NAV-004 Modal navigation drawer: a MODAL dialog (focus trap, Escape, focus return, outside inert, scroll lock from the adapter)
 * that slides in from a side and contains a labelled nav. Choosing a link closes it. Opened by its own button, never automatically.
 */
export function Nav004({ children = "Menu", title = "Menu", links, navLabel = "Primary", side = "left", closeLabel = "Close menu", skin, className }: Nav004Props) {
  const [scopeRef, container] = useThemeContainer();
  return (
    <Dialog.Root>
      <Dialog.Trigger className="ds-nav-004__trigger">
        <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M3 5.5h14M3 10h14M3 14.5h14" /></svg>
        <span>{children}</span>
      </Dialog.Trigger>
      <span ref={scopeRef} hidden />
      <Dialog.Portal container={container}>
        <Dialog.Overlay className="ds-nav-004__overlay" />
        <Dialog.Content className={["ds-nav-004", className].filter(Boolean).join(" ")} data-skin={skin} data-side={side} aria-describedby={undefined}>
          <Dialog.Title className="ds-nav-004__title">{title}</Dialog.Title>
          <nav aria-label={navLabel}>
            <ul className="ds-nav-004__list">
              {links.map((l) => (
                <li key={l.href}><Dialog.Close asChild><a className="ds-nav-004__link" href={l.href} aria-current={l.current ? "page" : undefined}>{l.label}</a></Dialog.Close></li>
              ))}
            </ul>
          </nav>
          <Dialog.Close className="ds-nav-004__close" aria-label={closeLabel}>
            <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M5 5l10 10M15 5L5 15" /></svg>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
