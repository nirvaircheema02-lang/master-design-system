"use client";
import type { ReactNode } from "react";
import { Tooltip, useThemeContainer } from "@master-ds/headless";
import "./tip-001.css";
import "./skins.css";

export interface Tip001Props {
  /** The trigger's visible label. The trigger is a real <button>, so it is keyboard-focusable. */
  children: ReactNode;
  /** Plain supplementary text. Never put essential information or interactive content here. */
  content: string;
  /** Delay before showing on hover, in ms. Keyboard focus shows it immediately. */
  delayMs?: number;
  side?: "top" | "bottom" | "left" | "right";
  skin?: string;
  className?: string;
}

/**
 * TIP-001 Tooltip (WCAG 1.4.13): appears on hover AND keyboard focus, dismisses with Escape, can be hovered without vanishing,
 * stays until hover/focus leaves. The trigger is described by it (aria-describedby); it is supplementary, never the only source.
 */
export function Tip001({ children, content, delayMs = 400, side = "top", skin, className }: Tip001Props) {
  const [scopeRef, container] = useThemeContainer();
  return (
    <Tooltip.Provider delayDuration={delayMs}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild><button type="button" className="ds-tip-001__trigger">{children}</button></Tooltip.Trigger>
        <span ref={scopeRef} hidden />
        <Tooltip.Portal container={container}>
          <Tooltip.Content className={["ds-tip-001", className].filter(Boolean).join(" ")} data-skin={skin} side={side} sideOffset={6} collisionPadding={8}>{content}</Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
