import type { HTMLAttributes, ReactNode } from "react";
import "./crd-003.css";
import "./skins.css";

export interface Crd003Props extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  /** The card's name. It is the ONLY link text: the link is stretched over the whole card by CSS. */
  title: string;
  href: string;
  /** Heading level for the title (2-5). Keep the page outline consistent across a list of cards. */
  headingLevel?: 2 | 3 | 4 | 5;
  /** Named skin from the manifest; omitted = the default skin. */
  skin?: string;
  /** Decorative by default (alt=""): the title already names the card. Give alt text only if the image carries information. */
  image?: { src: string; alt?: string };
  meta?: ReactNode;
  /** Supplementary text revealed over the picture. It stays in the accessibility tree (opacity only) and is always shown on touch. */
  reveal?: ReactNode;
  /** Secondary controls. They sit ABOVE the stretched link and add tab stops: use sparingly. */
  actions?: ReactNode;
  children?: ReactNode;
}

/** CRD-003 Hover-reveal card: a supplementary panel fades in over the picture on hover and focus; the title is always visible. Appearance comes only from --ds-card-* tokens; never edit colours here. */
export function Crd003({ title, href, headingLevel = 3, skin, image, meta, reveal, actions, children, className, ...rest }: Crd003Props) {
  const Heading = `h${headingLevel}` as "h3";
  return (
    <article {...rest} className={["ds-crd-003", className].filter(Boolean).join(" ")} data-skin={skin}>
      {image ? (
        <div className="ds-crd-003__media">
          <img src={image.src} alt={image.alt ?? ""} loading="lazy" />
          {reveal ? <div className="ds-crd-003__reveal">{reveal}</div> : null}
        </div>
      ) : null}
      <div className="ds-crd-003__body">
        {meta ? <p className="ds-crd-003__meta">{meta}</p> : null}
        <Heading className="ds-crd-003__title">
          <a className="ds-crd-003__link" href={href}>{title}</a>
        </Heading>
        {children ? <div className="ds-crd-003__text">{children}</div> : null}
        {actions ? <div className="ds-crd-003__actions">{actions}</div> : null}
      </div>
    </article>
  );
}
