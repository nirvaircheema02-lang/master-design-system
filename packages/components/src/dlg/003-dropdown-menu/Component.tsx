"use client";
import { Menu, useThemeContainer } from "@master-ds/headless";
import "./dlg-003.css";
import "./skins.css";

export interface Dlg003Item { id: string; label: string; disabled?: boolean; destructive?: boolean; /** draw a separator above this item */ separatorBefore?: boolean }
export interface Dlg003Props {
  triggerLabel: string;
  items: Dlg003Item[];
  /** Called with the item id when an item is chosen (Enter, Space or click). */
  onSelect?: (id: string) => void;
  skin?: string;
  className?: string;
}

/**
 * DLG-003 Dropdown (actions) menu. role=menu is correct HERE because the items are ACTIONS; for site navigation use a
 * disclosure (NAV-003). The menu is non-modal (APG menu button: the page behind is not made inert) and loops. Arrow keys, Home/End, typeahead, Escape, focus return and outside dismissal come from the adapter.
 */
export function Dlg003({ triggerLabel, items, onSelect, skin, className }: Dlg003Props) {
  const [scopeRef, container] = useThemeContainer();
  return (
    <Menu.Root modal={false}>
      <span ref={scopeRef} hidden />
      <Menu.Trigger className="ds-dlg-003__trigger">
        <span>{triggerLabel}</span>
        <svg className="ds-dlg-003__chevron" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M5 7.5l5 5 5-5" /></svg>
      </Menu.Trigger>
      <Menu.Portal container={container}>
        <Menu.Content className={["ds-dlg-003", className].filter(Boolean).join(" ")} data-skin={skin} sideOffset={6} align="start" loop>
          {items.map((it) => (
            <div key={it.id} role="none">
              {it.separatorBefore ? <Menu.Separator className="ds-dlg-003__separator" /> : null}
              <Menu.Item className="ds-dlg-003__item" data-destructive={it.destructive ? "" : undefined} disabled={it.disabled} onSelect={() => onSelect?.(it.id)}>{it.label}</Menu.Item>
            </div>
          ))}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
