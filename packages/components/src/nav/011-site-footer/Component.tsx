import type { ReactNode } from "react";
import "./nav-011.css";
import "./skins.css";

export interface Nav011Link { label: ReactNode; href: string }
export interface Nav011Column {
  /** Column heading. Rendered as a real heading so screen-reader users can jump between columns. */
  heading: string;
  links: Nav011Link[];
}
export interface Nav011ContactItem {
  /** Short visible label, e.g. "Email". */
  label: string;
  /** The value, e.g. an address or number. Becomes a link when `href` is set (mailto:, tel:, https:). */
  value: ReactNode;
  href?: string;
}
export interface Nav011Props {
  /** The brand block: a logo or the site name. Wrap it in your own link if it should navigate. */
  brand: ReactNode;
  /** One or two sentences under the brand. */
  description?: ReactNode;
  /** Optional slot under the description (e.g. a secondary button or link). */
  action?: ReactNode;
  /** Link columns, each with a heading and a list of links. */
  columns?: Nav011Column[];
  /** Contact details, shown as a labelled list next to the columns. */
  contact?: Nav011ContactItem[];
  /** Heading above the contact list. */
  contactHeading?: string;
  /** Copyright / legal text slot in the bottom bar. */
  legal?: ReactNode;
  /** Small links in the bottom bar (privacy, terms). */
  bottomLinks?: Nav011Link[];
  /** The big decorative word at the very bottom. aria-hidden: screen readers never see it. */
  signature?: string;
  /** Accessible name of the footer link navigation. Must be unique among the page's navs. */
  navLabel?: string;
  /** Accessible name of the bottom-bar link navigation. */
  legalNavLabel?: string;
  /** Level of the column headings (default 2: the footer is a top-level region). */
  headingLevel?: 2 | 3 | 4;
  skin?: string;
  /** Visual design (manifest props.design). Omitted = columns. */
  design?: "columns" | "centered" | "split";
  className?: string;
}

/**
 * NAV-011 Site footer: the page's closing region (contentinfo when it is a direct child of the page root, outside <main>).
 * Brand block, link columns each with a heading, contact items, a bottom bar with a copyright slot, and an optional huge
 * decorative signature word. Static and token-driven; no JavaScript. Use once per page.
 */
export function Nav011({
  brand, description, action, columns = [], contact = [], contactHeading = "Contact", legal, bottomLinks = [], signature,
  navLabel = "Footer links", legalNavLabel = "Legal links", headingLevel = 2, skin, design, className,
}: Nav011Props) {
  const H = `h${headingLevel}` as "h2" | "h3" | "h4";
  return (
    <footer className={["ds-nav-011", className].filter(Boolean).join(" ")} data-skin={skin} data-design={design}>
      <div className="ds-nav-011__inner">
        <div className="ds-nav-011__top">
          <div className="ds-nav-011__brand">
            <div className="ds-nav-011__name">{brand}</div>
            {description ? <p className="ds-nav-011__desc">{description}</p> : null}
            {action ? <div className="ds-nav-011__action">{action}</div> : null}
          </div>
          {columns.length ? (
            <nav className="ds-nav-011__nav" aria-label={navLabel}>
              {columns.map((c) => (
                <div key={c.heading} className="ds-nav-011__col">
                  <H className="ds-nav-011__heading">{c.heading}</H>
                  <ul className="ds-nav-011__list">
                    {c.links.map((l) => (
                      <li key={l.href}><a className="ds-nav-011__link" href={l.href}>{l.label}</a></li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          ) : null}
          {contact.length ? (
            <div className="ds-nav-011__contact">
              <H className="ds-nav-011__heading">{contactHeading}</H>
              <ul className="ds-nav-011__list">
                {contact.map((c) => (
                  <li key={c.label} className="ds-nav-011__ci">
                    <span className="ds-nav-011__ci-label">{c.label}</span>
                    {c.href ? <a className="ds-nav-011__link" href={c.href}>{c.value}</a> : <span className="ds-nav-011__ci-value">{c.value}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        {legal || bottomLinks.length ? (
          <div className="ds-nav-011__bar">
            {legal ? <p className="ds-nav-011__legal">{legal}</p> : null}
            {bottomLinks.length ? (
              <nav aria-label={legalNavLabel}>
                <ul className="ds-nav-011__bar-list">
                  {bottomLinks.map((l) => (
                    <li key={l.href}><a className="ds-nav-011__link" href={l.href}>{l.label}</a></li>
                  ))}
                </ul>
              </nav>
            ) : null}
          </div>
        ) : null}
      </div>
      {signature ? <div className="ds-nav-011__sig" aria-hidden="true" data-text={signature} /> : null}
    </footer>
  );
}
