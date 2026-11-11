import type { HTMLAttributes } from "react";
import "./lay-003.css";
import "./skins.css";

export interface Lay003Props extends HTMLAttributes<HTMLElement> {
  /** Space between children, from the spacing scale (1 = 4px ... 12 = 48px). */
  gap?: "1" | "2" | "3" | "4" | "6" | "8" | "12";
  direction?: "vertical" | "horizontal";
  align?: "start" | "center" | "stretch";
  /** Let a horizontal stack wrap onto new lines instead of overflowing. */
  wrap?: boolean;
  /** Convenience for text-only content: one block per string (JSON-friendly; real children work too). */
  items?: string[];
  skin?: string;
}

/** LAY-003 Stack: vertical or horizontal flow with a gap from the spacing scale (never margins on the children). */
export function Lay003({ gap = "4", direction = "vertical", align = "stretch", wrap = false, items, skin, className, children, ...rest }: Lay003Props) {
  return <div {...rest} className={["ds-lay-003", className].filter(Boolean).join(" ")} data-gap={gap} data-direction={direction} data-align={align} data-wrap={wrap ? "" : undefined} data-skin={skin}>{items ? items.map((t, i) => <div key={i}>{t}</div>) : children}</div>;
}
