import type { HTMLAttributes } from "react";
import "./txt-001.css";
import "./skins.css";

export type Txt001Size = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
export interface Txt001Props extends HTMLAttributes<HTMLHeadingElement> {
  /** The SEMANTIC level (h1-h6): it builds the page outline. Choose it by structure, never by looks. */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  /** The VISUAL size from the type scale. Defaults to a size that suits the level. */
  size?: Txt001Size;
  skin?: string;
  /** Visual design (manifest props.design). Omitted = plain. */
  design?: "plain" | "display" | "bar" | "rule" | "eyebrow";
}

const DEFAULT_SIZE: Record<number, Txt001Size> = { 1: "3xl", 2: "2xl", 3: "xl", 4: "lg", 5: "md", 6: "sm" };

/** TXT-001 Heading: semantic level and visual size are separate, so a page can keep a correct outline and still look right. */
export function Txt001({ level = 2, size, skin, design, className, children, ...rest }: Txt001Props) {
  const Tag = `h${level}` as "h2";
  return <Tag {...rest} className={["ds-txt-001", className].filter(Boolean).join(" ")} data-size={size ?? DEFAULT_SIZE[level]} data-skin={skin} data-design={design}>{children}</Tag>;
}
