import type { AnchorHTMLAttributes, ReactNode } from "react";
import "./txt-003.css";
import "./skins.css";

export interface Txt003Props extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: ReactNode;
  /** Opens in a new tab: adds rel, a visible mark and a text alternative so nobody is surprised. */
  external?: boolean;
  skin?: string;
  /** Visual design (manifest props.design). Omitted = underline. A link is NEVER marked by colour alone. */
  design?: "underline" | "thick" | "arrow" | "bold";
}

/** TXT-003 Link: always underlined (colour alone must not mark a link); hover strengthens the cue; keyboard focus gets a ring. */
export function Txt003({ href, children, external = false, skin, design, className, ...rest }: Txt003Props) {
  return (
    <a {...rest} href={href} className={["ds-txt-003", className].filter(Boolean).join(" ")} data-skin={skin} data-design={design} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {children}
      {external ? <><svg className="ds-txt-003__ext" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14 4h6v6M20 4l-9 9M18 13v6H5V6h6" /></svg><span className="ds-txt-003__vh"> (opens in a new tab)</span></> : null}
      {design === "arrow" && !external ? <svg className="ds-txt-003__arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6" /></svg> : null}
    </a>
  );
}
