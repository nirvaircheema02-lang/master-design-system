import type { HTMLAttributes } from "react";
import "./lay-002.css";
import "./skins.css";

export interface Lay002Props extends HTMLAttributes<HTMLElement> {
  as?: "div" | "main" | "section" | "article";
  /** Maximum content width. `prose` is the reading measure for long text. */
  size?: "sm" | "md" | "lg" | "xl" | "prose";
  skin?: string;
}

/** LAY-002 Container: centres content, caps its width and keeps a gutter so text never touches the screen edge. */
export function Lay002({ as: Tag = "div", size = "lg", skin, className, children, ...rest }: Lay002Props) {
  return <Tag {...rest} className={["ds-lay-002", className].filter(Boolean).join(" ")} data-size={size} data-skin={skin}>{children}</Tag>;
}
