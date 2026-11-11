"use client";
import type { ReactNode } from "react";
import { Accordion } from "@master-ds/headless";
import "./acc-001.css";
import "./skins.css";

export interface Acc001Item { id: string; title: string; content: ReactNode; disabled?: boolean }
export interface Acc001Props {
  items: Acc001Item[];
  /** `single`: one panel open (and it can be closed again). `multiple`: any number. */
  type?: "single" | "multiple";
  /** Ids open on first render. */
  defaultOpen?: string[];
  /** Heading level of each title (2-5). The heading wraps the only button. */
  headingLevel?: 2 | 3 | 4 | 5;
  skin?: string;
  /** Visual design (manifest props.design). Omitted = boxed. */
  design?: "boxed" | "flush" | "cards" | "plus" | "left";
  className?: string;
}

/**
 * ACC-001 Animated accordion. Each title is a heading that wraps the only button (APG). The panel height animates from the
 * measured content height; reduced motion removes the animation entirely (the panel simply appears).
 */
export function Acc001({ items, type = "single", defaultOpen = [], headingLevel = 3, skin, design, className }: Acc001Props) {
  const Heading = `h${headingLevel}` as "h3";
  const root = { className: ["ds-acc-001", className].filter(Boolean).join(" "), "data-skin": skin, "data-design": design } as const;
  const body = items.map((it) => (
    <Accordion.Item key={it.id} value={it.id} disabled={it.disabled} className="ds-acc-001__item">
      <Accordion.Header asChild>
        <Heading className="ds-acc-001__heading">
          <Accordion.Trigger className="ds-acc-001__trigger">
            <span className="ds-acc-001__title">{it.title}</span>
            <svg className="ds-acc-001__chevron" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M5 7.5l5 5 5-5" /></svg>
            <svg className="ds-acc-001__plus" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M4 10h12" /><path className="ds-acc-001__vbar" d="M10 4v12" /></svg>
          </Accordion.Trigger>
        </Heading>
      </Accordion.Header>
      <Accordion.Content className="ds-acc-001__content"><div className="ds-acc-001__inner">{it.content}</div></Accordion.Content>
    </Accordion.Item>
  ));
  return type === "multiple"
    ? <Accordion.Root type="multiple" defaultValue={defaultOpen} {...root}>{body}</Accordion.Root>
    : <Accordion.Root type="single" collapsible defaultValue={defaultOpen[0]} {...root}>{body}</Accordion.Root>;
}
