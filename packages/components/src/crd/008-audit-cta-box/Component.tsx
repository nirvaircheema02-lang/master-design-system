import { useId, type ReactNode } from "react";
import "./crd-008.css";
import "./skins.css";

export interface Crd008Props {
  /** Small label above the heading. */
  eyebrow?: string;
  /** The heading text. */
  title: string;
  /** A word or phrase inside `title` to set in the gradient. Not found in the title = the title is shown plain. */
  highlight?: string;
  /** Supporting paragraph under the heading. */
  text?: ReactNode;
  /** SLOT: the action itself, usually an email field and a button (INP-* / CTA-*). Stays in the DOM order after the text. */
  children?: ReactNode;
  /** Small print under the action (privacy line, response time ...). */
  note?: ReactNode;
  /** Short word shown in the centre of the decorative radar. Decorative only: never put information here. */
  coreLabel?: string;
  /** Up to four short labels floated round the radar. Decorative only: the whole radar is hidden from assistive tech. */
  pills?: string[];
  /** Heading level (the box is a labelled section). Default 2. */
  headingLevel?: 2 | 3 | 4;
  skin?: string;
  /** Visual design (manifest props.design). Omitted = radar. */
  design?: "radar" | "mirrored" | "plain";
  className?: string;
}

/** Splits the title around the first match of `highlight`; no match = no highlight. */
function parts(title: string, highlight?: string): [string, string, string] {
  if (!highlight) return [title, "", ""];
  const i = title.indexOf(highlight);
  return i < 0 ? [title, "", ""] : [title.slice(0, i), highlight, title.slice(i + highlight.length)];
}

/**
 * CRD-008 Audit CTA Box: one calm, high-intent call to action (typically "get a free audit": an email field and a button)
 * inside a soft panel with a decorative radar. The box is a labelled section; the action is a slot you fill with the
 * input and button atoms. The radar is purely decorative and hidden from assistive technology, so nothing important
 * may live in it. Appearance comes only from --ds-aud-* tokens. One short pulse plays once on load, never again,
 * and not at all under reduced motion.
 */
export function Crd008({ eyebrow, title, highlight, text, children, note, coreLabel, pills, headingLevel = 2, skin, design, className }: Crd008Props) {
  const id = useId();
  const Heading = `h${headingLevel}` as "h2";
  const [before, mark, after] = parts(title, highlight);
  return (
    <section className={["ds-crd-008", className].filter(Boolean).join(" ")} data-skin={skin} data-design={design} aria-labelledby={`${id}-title`}>
      {design === "plain" ? null : (
        <div className="ds-crd-008__radar" aria-hidden="true">
          <span className="ds-crd-008__ring ds-crd-008__ring--1" />
          <span className="ds-crd-008__ring ds-crd-008__ring--2" />
          <span className="ds-crd-008__ring ds-crd-008__ring--3" />
          <span className="ds-crd-008__core">
            <svg className="ds-crd-008__scan" viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><path d="M12 12l6-6" /></svg>
            {coreLabel ? <span className="ds-crd-008__core-label">{coreLabel}</span> : null}
          </span>
          {(pills ?? []).slice(0, 4).map((p, i) => (
            <span key={`${p}-${i}`} className={`ds-crd-008__pill ds-crd-008__pill--${i + 1}`}><i className="ds-crd-008__dot" />{p}</span>
          ))}
        </div>
      )}
      <div className="ds-crd-008__body">
        {eyebrow ? <p className="ds-crd-008__eyebrow">{eyebrow}</p> : null}
        <Heading id={`${id}-title`} className="ds-crd-008__title">
          {before}
          {mark ? <span className="ds-crd-008__hl">{mark}</span> : null}
          {after}
        </Heading>
        {text ? <p className="ds-crd-008__text">{text}</p> : null}
        {children ? <div className="ds-crd-008__action">{children}</div> : null}
        {note ? <p className="ds-crd-008__note">{note}</p> : null}
      </div>
    </section>
  );
}
