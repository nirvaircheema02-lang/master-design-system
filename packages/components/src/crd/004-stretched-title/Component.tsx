import type { HTMLAttributes, ReactNode } from "react";
import "./crd-004.css";
import "./skins.css";

export interface Crd004Props extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  /** The card's name. It is the ONLY link text: the link is stretched over the whole card by CSS. */
  title: string;
  href: string;
  /** Heading level for the title (2-5). Keep the page outline consistent across a list of cards. */
  headingLevel?: 2 | 3 | 4 | 5;
  /** Named skin from the manifest; omitted = the default skin. */
  skin?: string;
  /** Visual design: same markup and behaviour, a different look (see manifest props.design). Omitted = classic. */
  design?: "classic" | "elevated" | "accent-bar" | "horizontal" | "minimal";
  /** Decorative by default (alt=""): the title already names the card. Give alt text only if the image carries information. */
  image?: { src: string; alt?: string };
  meta?: ReactNode;
  /** Secondary controls. They sit ABOVE the stretched link and add tab stops: use sparingly. */
  actions?: ReactNode;
  children?: ReactNode;
}

/** CRD-004 Stretched-title link card. Appearance comes only from --ds-card-* tokens; never edit colours here. */
export function Crd004({ title, href, headingLevel = 3, skin, design, image, meta, actions, children, className, ...rest }: Crd004Props) {
  const Heading = `h${headingLevel}` as "h3";
  return (
    <article {...rest} className={["ds-crd-004", className].filter(Boolean).join(" ")} data-skin={skin} data-design={design}>
      {image ? (
        <div className="ds-crd-004__media">
          <img src={image.src} alt={image.alt ?? ""} loading="lazy" />
        </div>
      ) : null}
      <div className="ds-crd-004__body">
        {meta ? <p className="ds-crd-004__meta">{meta}</p> : null}
        <Heading className="ds-crd-004__title">
          <a className="ds-crd-004__link" href={href}>{title}</a>
        </Heading>
        {children ? <div className="ds-crd-004__text">{children}</div> : null}
        {actions ? <div className="ds-crd-004__actions">{actions}</div> : null}
      </div>
    </article>
  );
}
