"use client";
import { useState, type ReactNode } from "react";
import "./bdg-002.css";
import "./skins.css";

export interface Bdg002Props {
  children: ReactNode;
  /** Controlled / initial pressed state (a filter chip is a toggle). */
  selected?: boolean;
  defaultSelected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
  /** Show a remove button. Choosing it hides the chip and calls onRemove. */
  removable?: boolean;
  onRemove?: () => void;
  removeLabel?: string;
  skin?: string;
  /** Visual design (manifest props.design). Omitted = outline. */
  design?: "outline" | "filled";
  className?: string;
}

/** BDG-002 Chip: a toggle button (aria-pressed) with an optional remove button. The selected state shows a check mark AND a fill, never colour alone. */
export function Bdg002({ children, selected, defaultSelected = false, onSelectedChange, removable = false, onRemove, removeLabel, skin, design, className }: Bdg002Props) {
  const [inner, setInner] = useState(defaultSelected);
  const [gone, setGone] = useState(false);
  const on = selected ?? inner;
  if (gone) return null;
  const text = typeof children === "string" ? children : "";
  return (
    <span className={["ds-bdg-002", className].filter(Boolean).join(" ")} data-selected={on ? "" : undefined} data-removable={removable ? "" : undefined} data-skin={skin} data-design={design}>
      <button type="button" className="ds-bdg-002__main" aria-pressed={on} onClick={() => { setInner(!on); onSelectedChange?.(!on); }}>
        <svg className="ds-bdg-002__check" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        <span>{children}</span>
      </button>
      {removable ? (
        <button type="button" className="ds-bdg-002__remove" aria-label={removeLabel ?? `Remove ${text}`} onClick={() => { setGone(true); onRemove?.(); }}>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 7l10 10M17 7L7 17" /></svg>
        </button>
      ) : null}
    </span>
  );
}
