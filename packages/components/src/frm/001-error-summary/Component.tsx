"use client";

import { useEffect, useId, useRef } from "react";
import "./frm-001.css";
import "./skins.css";

export interface Frm001Error { id: string; message: string }
export interface Frm001Props {
  title?: string;
  /** One entry per invalid field. `id` is the field's id; the link moves focus to it. Empty = renders nothing. */
  errors: Frm001Error[];
  headingLevel?: 2 | 3 | 4;
  /** Move focus to the summary when it appears (default). */
  focusOnMount?: boolean;
  /** Prefix document.title with "Error: " while the summary is shown. */
  updateDocumentTitle?: boolean;
  skin?: string;
  className?: string;
}

/**
 * FRM-001 Error summary. Appears on submit, takes focus, names the problem and links to each invalid field.
 * Wording should match the inline error text of each field. Appearance comes only from --ds-frm-* tokens.
 */
export function Frm001({ title = "There is a problem", errors, headingLevel = 2, focusOnMount = true, updateDocumentTitle = true, skin, className }: Frm001Props) {
  const ref = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const count = errors.length;
  useEffect(() => { if (focusOnMount && count > 0) ref.current?.focus(); }, [focusOnMount, count]);
  useEffect(() => {
    if (!updateDocumentTitle || count === 0) return;
    const original = document.title;
    document.title = `Error: ${original}`;
    return () => { document.title = original; };
  }, [updateDocumentTitle, count]);
  if (count === 0) return null;
  const Heading = `h${headingLevel}` as "h2";
  return (
    <div ref={ref} tabIndex={-1} className={["ds-frm-001", className].filter(Boolean).join(" ")} data-skin={skin} aria-labelledby={headingId}>
      <Heading id={headingId} className="ds-frm-001__title">{title}</Heading>
      <ul className="ds-frm-001__list">
        {errors.map((e) => (
          <li key={e.id}>
            <a
              className="ds-frm-001__link"
              href={`#${e.id}`}
              onClick={(ev) => {
                const target = document.getElementById(e.id);
                if (!target) return;
                ev.preventDefault();
                target.focus();
                target.scrollIntoView?.({ block: "center" });
              }}
            >
              {e.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
