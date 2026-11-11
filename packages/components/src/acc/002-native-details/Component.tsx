import { useId, type ReactNode } from "react";
import "./acc-002.css";
import "./skins.css";

export interface Acc002Item { id?: string; title: string; content: ReactNode; defaultOpen?: boolean }
export interface Acc002Props {
  items: Acc002Item[];
  /** Only one item open at a time (HTML exclusive accordion: shared name on the <details> elements). */
  exclusive?: boolean;
  /** Heading level of each title (2-5). The heading lives inside the <summary>. */
  headingLevel?: 2 | 3 | 4 | 5;
  /** Named skin from the manifest; omitted = the default skin. */
  skin?: string;
  /** Visual design (manifest props.design). Omitted = boxed. */
  design?: "boxed" | "flush" | "cards" | "plus" | "left";
  className?: string;
}

/**
 * ACC-002 Native-details accordion. Zero JS: <details>/<summary> supplies the keyboard, state and semantics.
 * Each title is a heading inside its summary. Appearance comes only from --ds-acc-* tokens.
 */
export function Acc002({ items, exclusive = false, headingLevel = 3, skin, design, className }: Acc002Props) {
  const group = useId();
  const Heading = `h${headingLevel}` as "h3";
  return (
    <div className={["ds-acc-002", className].filter(Boolean).join(" ")} data-skin={skin} data-design={design}>
      {items.map((item, i) => (
        <details key={item.id ?? i} className="ds-acc-002__item" name={exclusive ? group : undefined} open={item.defaultOpen}>
          <summary className="ds-acc-002__summary">
            <Heading className="ds-acc-002__title">{item.title}</Heading>
            <svg className="ds-acc-002__chevron" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M5 7.5l5 5 5-5" /></svg>
            <svg className="ds-acc-002__plus" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M4 10h12" /><path className="ds-acc-002__vbar" d="M10 4v12" /></svg>
          </summary>
          <div className="ds-acc-002__content">{item.content}</div>
        </details>
      ))}
    </div>
  );
}
