import type { HTMLAttributes } from "react";
import "./bdg-001.css";
import "./skins.css";

export interface Bdg001Props extends HTMLAttributes<HTMLSpanElement> {
  tone?: "neutral" | "accent" | "success" | "danger";
  skin?: string;
  /** Visual design (manifest props.design). Omitted = subtle. The text, not the colour, carries the meaning. */
  design?: "subtle" | "solid" | "outline" | "dot";
}

/** BDG-001 Badge: a short status or count. It is plain text with a tone: never interactive, never the only carrier of meaning. */
export function Bdg001({ tone = "neutral", skin, design, className, children, ...rest }: Bdg001Props) {
  return <span {...rest} className={["ds-bdg-001", className].filter(Boolean).join(" ")} data-tone={tone} data-skin={skin} data-design={design}>{design === "dot" ? <span className="ds-bdg-001__dot" aria-hidden="true" /> : null}{children}</span>;
}
