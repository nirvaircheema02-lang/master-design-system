"use client";
import type { ReactElement, ReactNode } from "react";
import { Dialog, useThemeContainer } from "@master-ds/headless";
import "./dlg-001.css";
import "./skins.css";

export interface Dlg001Props {
  /** Dialog heading; also its accessible name. */
  title: string;
  /** What the dialog is about; wired as its accessible description. */
  description: string;
  /** Body content. */
  children?: ReactNode;
  /** Built-in trigger label. Ignored when `trigger` is given. */
  triggerLabel?: string;
  /** Your own trigger element (e.g. a CTA). It must accept ref and onClick. */
  trigger?: ReactElement;
  /** Footer actions, placed after the built-in cancel button. Use Dialog-closing controls for confirm. */
  actions?: ReactNode;
  cancelLabel?: string;
  closeLabel?: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  skin?: string;
  /** Visual design (manifest props.design). Omitted = centered. */
  design?: "centered" | "sheet" | "side" | "alert" | "wide";
  className?: string;
}

/**
 * DLG-001 Modal dialog. Focus trap, Escape, focus return, outside inertness and scroll lock come from the headless
 * adapter; this component adds the structure (title, description, close, footer) and the enter/exit motion.
 */
export function Dlg001({ title, description, children, triggerLabel = "Open dialog", trigger, actions, cancelLabel = "Cancel", closeLabel = "Close", open, defaultOpen, onOpenChange, skin, design, className }: Dlg001Props) {
  const [scopeRef, container] = useThemeContainer();
  return (
    <Dialog.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <span ref={scopeRef} hidden />
      {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : <Dialog.Trigger className="ds-dlg-001__trigger">{triggerLabel}</Dialog.Trigger>}
      <Dialog.Portal container={container}>
        <Dialog.Overlay className="ds-dlg-001__overlay" />
        <Dialog.Content className={["ds-dlg-001", className].filter(Boolean).join(" ")} data-skin={skin} data-design={design}>
          <Dialog.Title className="ds-dlg-001__title">{title}</Dialog.Title>
          <Dialog.Description className="ds-dlg-001__description">{description}</Dialog.Description>
          {children ? <div className="ds-dlg-001__body">{children}</div> : null}
          <div className="ds-dlg-001__footer">
            <Dialog.Close className="ds-dlg-001__action">{cancelLabel}</Dialog.Close>
            {actions}
          </div>
          <Dialog.Close className="ds-dlg-001__close" aria-label={closeLabel}>
            <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M5 5l10 10M15 5L5 15" /></svg>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
