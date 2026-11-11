import type { HTMLAttributes, ReactNode } from "react";
import "./crd-006.css";
import "./skins.css";

export interface Crd006Props extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  /** The project's name. It is the ONLY link text: the link is stretched over the whole card by CSS. */
  title: string;
  href: string;
  /** Heading level for the title (2-5). Keep the page outline consistent across a list of cards. */
  headingLevel?: 2 | 3 | 4 | 5;
  /** The project screenshot. Decorative by default (alt=""): the title already names the card. */
  image: { src: string; alt?: string };
  /** Text shown in the address pill of the window chrome, e.g. "example.com". Decorative. Omitted = an empty pill. */
  url?: string;
  /** Short tag laid over the picture's bottom-left corner, e.g. "Web app". */
  label?: string;
  /** Small line above the title, e.g. the category. */
  meta?: ReactNode;
  /** One line stating what the work achieved. Announced with an "Outcome:" prefix. */
  outcome?: ReactNode;
  /** Left side of the footer row, e.g. the industry. */
  footnote?: ReactNode;
  /** The visual call to action at the right of the footer. Not a second link: the stretched title link is the action. */
  viewLabel?: string;
  skin?: string;
  /** Visual design: same markup and behaviour, a different frame (see manifest props.design). Omitted = window. */
  design?: "window" | "stacked" | "split";
  /** The summary paragraph(s). */
  children?: ReactNode;
}

/**
 * CRD-006 Browser-frame project card: a project screenshot shown inside a small browser window (three dots + address pill),
 * then label, title, summary, outcome and a "View project" cue. One link only (the title), stretched over the whole card.
 * Use it for portfolio / case-study grids where the work is a website or an app. Appearance comes only from --ds-prj-* tokens.
 */
export function Crd006({ title, href, headingLevel = 3, image, url, label, meta, outcome, footnote, viewLabel = "View project", skin, design, children, className, ...rest }: Crd006Props) {
  const Heading = `h${headingLevel}` as "h3";
  return (
    <article {...rest} className={["ds-crd-006", className].filter(Boolean).join(" ")} data-skin={skin} data-design={design}>
      <div className="ds-crd-006__media">
        <div className="ds-crd-006__chrome" aria-hidden="true">
          <span className="ds-crd-006__dot" />
          <span className="ds-crd-006__dot" />
          <span className="ds-crd-006__dot" />
          <span className="ds-crd-006__url">{url}</span>
        </div>
        <div className="ds-crd-006__thumb">
          <img src={image.src} alt={image.alt ?? ""} loading="lazy" />
          {label ? <span className="ds-crd-006__label">{label}</span> : null}
        </div>
      </div>
      <div className="ds-crd-006__body">
        <div className="ds-crd-006__main">
          {meta ? <p className="ds-crd-006__meta">{meta}</p> : null}
          <Heading className="ds-crd-006__title">
            <a className="ds-crd-006__link" href={href}>{title}</a>
          </Heading>
          {children ? <div className="ds-crd-006__text">{children}</div> : null}
          {outcome ? (
            <p className="ds-crd-006__outcome">
              <span className="ds-crd-006__tick" aria-hidden="true">
                <svg viewBox="0 0 16 16" focusable="false"><path d="M4 8.5l2.7 2.7L12 5.5" /></svg>
              </span>
              <span><span className="ds-crd-006__vh">Outcome: </span>{outcome}</span>
            </p>
          ) : null}
        </div>
        <div className="ds-crd-006__foot">
          <span className="ds-crd-006__note">{footnote}</span>
          <span className="ds-crd-006__view" aria-hidden="true">
            {viewLabel}
            <svg className="ds-crd-006__arrow" viewBox="0 0 16 16" focusable="false"><path d="M5 11L11 5M6 5h5v5" /></svg>
          </span>
        </div>
      </div>
    </article>
  );
}
