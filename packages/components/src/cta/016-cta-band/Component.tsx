import { useId, type ReactNode } from "react";
import "./cta-016.css";
import "./skins.css";

export interface Cta016Props {
  /** Small label above the heading. */
  eyebrow?: string;
  /** The heading. Plain text or inline markup. */
  title: ReactNode;
  /** One supporting paragraph. */
  text?: ReactNode;
  /** SLOT: the main action (a CTA-* link or button). Comes first in the reading and tab order. */
  primary?: ReactNode;
  /** SLOT: the quieter second action. */
  secondary?: ReactNode;
  /** Heading level (the band is a labelled section). Default 2. */
  headingLevel?: 2 | 3 | 4;
  skin?: string;
  /** Visual design (manifest props.design). Omitted = left. */
  design?: "left" | "centered" | "split";
  className?: string;
}

/**
 * CTA-016 CTA Band: the closing call-to-action panel of a page. An outer section carries the vertical rhythm, an inner
 * panel carries the surface. Heading, one paragraph and up to two actions (slots: pass the CTA atoms). The default skin
 * is the inverted "dark" panel (dark in light mode, light in dark mode) so it always stands apart from the page.
 * Static: no motion. Appearance comes only from --ds-bnd-* tokens.
 */
export function Cta016({ eyebrow, title, text, primary, secondary, headingLevel = 2, skin, design, className }: Cta016Props) {
  const id = useId();
  const Heading = `h${headingLevel}` as "h2";
  return (
    <section className={["ds-cta-016", className].filter(Boolean).join(" ")} data-skin={skin} data-design={design} aria-labelledby={`${id}-title`}>
      <div className="ds-cta-016__panel">
        <div className="ds-cta-016__body">
          {eyebrow ? <p className="ds-cta-016__eyebrow">{eyebrow}</p> : null}
          <Heading id={`${id}-title`} className="ds-cta-016__title">{title}</Heading>
          {text ? <p className="ds-cta-016__text">{text}</p> : null}
        </div>
        {primary || secondary ? (
          <div className="ds-cta-016__actions">
            {primary}
            {secondary}
          </div>
        ) : null}
      </div>
    </section>
  );
}
