"use client";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Tabs, type TabsActivation } from "@master-ds/headless";
import "./tab-001.css";
import "./skins.css";

export interface Tab001Item { id: string; label: string; content: ReactNode; disabled?: boolean }
export interface Tab001Props {
  tabs: Tab001Item[];
  /**
   * REQUIRED and explicit. `automatic`: selection follows focus (use only when every panel shows instantly).
   * `manual`: arrows move focus, Enter/Space select (use when a panel is slow to show).
   */
  activation: TabsActivation;
  /** Accessible name of the tab list. */
  label?: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (id: string) => void;
  /** Named skin from the manifest; omitted = the default skin. */
  skin?: string;
  /** Visual design (manifest props.design). `vertical` also switches the keyboard model to Up/Down. Omitted = underline. */
  design?: "underline" | "pill" | "segmented" | "vertical" | "folder";
  className?: string;
}

/**
 * TAB-001 Underline tabs with a sliding indicator. Behaviour (roving tabindex, arrows, Home/End, tab/panel wiring) comes
 * from the headless adapter; the indicator is one transform-only line positioned from the measured active tab.
 */
export function Tab001({ tabs, activation, label = "Sections", defaultValue, value, onValueChange, skin, design, className }: Tab001Props) {
  const [inner, setInner] = useState(defaultValue ?? tabs.find((t) => !t.disabled)?.id ?? "");
  const current = value ?? inner;
  const list = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = list.current;
    if (!el) return;
    const measure = () => {
      const active = el.querySelector<HTMLElement>('[role="tab"][data-state="active"]');
      if (!active) return;
      el.style.setProperty("--_x", `${active.offsetLeft}px`);
      el.style.setProperty("--_w", String(active.offsetWidth));
      el.style.setProperty("--_y", `${active.offsetTop}px`);
      el.style.setProperty("--_h", String(active.offsetHeight));
      el.dataset.measured = "";
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    for (const t of Array.from(el.children)) ro.observe(t);
    return () => ro.disconnect();
  }, [current, tabs]);

  return (
    <Tabs.Root
      className={["ds-tab-001", className].filter(Boolean).join(" ")}
      data-skin={skin}
      data-design={design}
      orientation={design === "vertical" ? "vertical" : "horizontal"}
      activation={activation}
      value={current}
      onValueChange={(v) => { setInner(v); onValueChange?.(v); }}
    >
      <Tabs.List ref={list} className="ds-tab-001__list" aria-label={label}>
        {tabs.map((t) => (
          <Tabs.Trigger key={t.id} value={t.id} disabled={t.disabled} className="ds-tab-001__tab">{t.label}</Tabs.Trigger>
        ))}
      </Tabs.List>
      {tabs.map((t) => (
        <Tabs.Content key={t.id} value={t.id} className="ds-tab-001__panel">{t.content}</Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
