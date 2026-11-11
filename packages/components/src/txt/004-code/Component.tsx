import type { HTMLAttributes } from "react";
import "./txt-004.css";
import "./skins.css";

export interface Txt004Props extends HTMLAttributes<HTMLElement> {
  /** `code`: inline code. `kbd`: a keyboard key (a cap with a border). */
  as?: "code" | "kbd";
  skin?: string;
}

/** TXT-004 Code and keyboard key, in the monospace font; long code wraps instead of forcing a horizontal scroll. */
export function Txt004({ as: Tag = "code", skin, className, children, ...rest }: Txt004Props) {
  return <Tag {...rest} className={["ds-txt-004", className].filter(Boolean).join(" ")} data-as={Tag} data-skin={skin}>{children}</Tag>;
}
