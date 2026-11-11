import type { HTMLAttributes, ReactNode } from "react";
import "./txt-005.css";
import "./skins.css";

export interface Txt005Props extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** Small label above the title (category, step, section name). Rendered as a paragraph, not a heading. */
  eyebrow?: string;
  /** The section title text. */
  title: string;
  /** A word or phrase INSIDE `title` to colour (first match). Ignored when it is not found in the title. */
  highlight?: string;
  /** One supporting sentence or short paragraph under the title. */
  lede?: ReactNode;
  /** The SEMANTIC heading level (h1-h6): choose it by page structure, never by looks. Default 2. */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  skin?: string;
  /** Visual design (manifest props.design). Omitted = stacked. */
  design?: "stacked" | "centered" | "split";
}

function renderTitle(title: string, highlight?: string): ReactNode {
  if (!highlight) return title;
  const at = title.indexOf(highlight);
  if (at < 0) return title;
  return (
    <>
      {title.slice(0, at)}
      <span className="ds-txt-005__hl">{highlight}</span>
      {title.slice(at + highlight.length)}
    </>
  );
}

/**
 * TXT-005 Section header: an eyebrow, a real heading (optionally with one highlighted word) and a lede.
 * Use it to open a page section. The heading level is separate from its look so the page outline stays correct.
 * Static: wrap it in RVL-001 when you want it to fade in on scroll.
 */
export function Txt005({ eyebrow, title, highlight, lede, level = 2, skin, design, className, ...rest }: Txt005Props) {
  const Tag = `h${level}` as "h2";
  return (
    <div {...rest} className={["ds-txt-005", className].filter(Boolean).join(" ")} data-skin={skin} data-design={design}>
      <div className="ds-txt-005__main">
        {eyebrow ? <p className="ds-txt-005__eyebrow">{eyebrow}</p> : null}
        <Tag className="ds-txt-005__title">{renderTitle(title, highlight)}</Tag>
      </div>
      {lede ? <p className="ds-txt-005__lede">{lede}</p> : null}
    </div>
  );
}
