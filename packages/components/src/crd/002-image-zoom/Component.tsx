import type { HTMLAttributes, ReactNode } from "react";
import "./crd-002.css";
import "./skins.css";

export interface Crd002Props extends Omit<HTMLAttributes<HTMLElement>, "title"> {
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
  /** Secondary controls. They sit ABOVE the stretched link and add tab stops: use sparingly. */
  actions?: ReactNode;
  children?: ReactNode;
}

/** CRD-002 Image-zoom card: the picture scales inside its clipped frame on hover and focus. Appearance comes only from --ds-card-* tokens; never edit colours here. */
export function Crd002({ title, href, headingLevel = 3, skin, image, meta, actions, children, className, ...rest }: Crd002Props) {
  const Heading = `h${headingLevel}` as "h3";
  return (
    <article {...rest} className={["ds-crd-002", className].filter(Boolean).join(" ")} data-skin={skin}>
      {image ? (
        <div className="ds-crd-002__media">
          <img src={image.src} alt={image.alt ?? ""} loading="lazy" />
        </div>
      ) : null}
      <div className="ds-crd-002__body">
        {meta ? <p className="ds-crd-002__meta">{meta}</p> : null}
        <Heading className="ds-crd-002__title">
          <a className="ds-crd-002__link" href={href}>{title}</a>
        </Heading>
        {children ? <div className="ds-crd-002__text">{children}</div> : null}
        {actions ? <div className="ds-crd-002__actions">{actions}</div> : null}
      </div>
    </article>
  );
}
