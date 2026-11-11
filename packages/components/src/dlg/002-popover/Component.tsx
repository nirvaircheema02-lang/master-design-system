"use client";
import { useState, type KeyboardEvent, type ReactNode } from "react";
import { Popover, useThemeContainer } from "@master-ds/headless";
import "./dlg-002.css";
import "./skins.css";

export interface Dlg002Props {
  /** Visible text of the trigger button. */
  triggerLabel: string;
  /** Accessible name of the popover (role=dialog). Required: a dialog without a name is unusable with a screen reader. */
  label: string;
  /** Optional visible heading inside the popover. */
  title?: string;
  /** Popover content. May contain links and controls. */
  children?: ReactNode;
  closeLabel?: string;
  defaultOpen?: boolean;
  skin?: string;
  className?: string;
}

/**
 * DLG-002 Popover: NON-modal. Focus moves in on open, Escape closes and returns focus to the trigger, tabbing or clicking out
 * closes it; the page behind stays live (not inert, scrollable). For content that must be answered before continuing use DLG-001.
 */
export function Dlg002({ triggerLabel, label, title, children, closeLabel = "Close", defaultOpen, skin, className }: Dlg002Props) {
  const [scopeRef, container] = useThemeContainer();
  const [open, setOpen] = useState(!!defaultOpen);
  // Radix loops Tab inside the popover (its focus scope), so a keyboard user could never leave it except with Escape.
  // A non-modal popover must not trap: Tab past its last control (or Shift+Tab before its first) closes it and
  // continues from the trigger.
  const leave = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return;
    const tabbables = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'));
    const at = document.activeElement;
    if ((!e.shiftKey && (tabbables.length === 0 || at === tabbables[tabbables.length - 1])) || (e.shiftKey && (tabbables.length === 0 || at === tabbables[0] || at === e.currentTarget))) { e.preventDefault(); setOpen(false); }
  };
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className="ds-dlg-002__trigger">{triggerLabel}</Popover.Trigger>
      <span ref={scopeRef} hidden />
      <Popover.Portal container={container}>
        <Popover.Content className={["ds-dlg-002", className].filter(Boolean).join(" ")} data-skin={skin} aria-label={label} onKeyDown={leave} sideOffset={8} collisionPadding={8} align="start">
          {title ? <p className="ds-dlg-002__title">{title}</p> : null}
          <div className="ds-dlg-002__body">{children}</div>
          <Popover.Close className="ds-dlg-002__close" aria-label={closeLabel}>
            <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M5 5l10 10M15 5L5 15" /></svg>
          </Popover.Close>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
