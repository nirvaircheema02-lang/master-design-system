import type { HTMLAttributes } from "react";
import "./txt-002.css";
import "./skins.css";

export interface Txt002Props extends HTMLAttributes<HTMLElement> {
  as?: "p" | "span" | "div";
  size?: "sm" | "md" | "lg";
  tone?: "primary" | "secondary";
  /** Cap the line length at a readable measure (about 65 characters). */
  measure?: boolean;
  skin?: string;
  /** Visual design (manifest props.design). Omitted = body. */
  design?: "body" | "lead" | "caption";
}

/** TXT-002 Text: body copy from the type scale, with a readable line height and an optional measure. */
export function Txt002({ as: Tag = "p", size = "md", tone = "primary", measure = false, skin, design, className, children, ...rest }: Txt002Props) {
  return <Tag {...rest} className={["ds-txt-002", className].filter(Boolean).join(" ")} data-size={size} data-tone={tone} data-measure={measure ? "" : undefined} data-skin={skin} data-design={design}>{children}</Tag>;
}
