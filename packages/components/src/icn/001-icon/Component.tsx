import type { SVGAttributes } from "react";
import { ICONS, type IconName } from "./icons.ts";
import "./icn-001.css";
import "./skins.css";

export type { IconName } from "./icons.ts";
export interface Icn001Props extends Omit<SVGAttributes<SVGSVGElement>, "name"> {
  name: IconName;
  size?: "sm" | "md" | "lg" | "xl";
  tone?: "current" | "muted" | "accent" | "success" | "danger";
  /** Give a label ONLY when the icon carries meaning on its own. Without one the icon is decorative (hidden from assistive tech). */
  label?: string;
  skin?: string;
}

/** ICN-001 Icon: one component for the whole set; decorative by default, an image with a name when `label` is given. */
export function Icn001({ name, size = "md", tone = "current", label, skin, className, ...rest }: Icn001Props) {
  const d = ICONS[name];
  if (!d) return null;
  return (
    <svg {...rest} className={["ds-icn-001", className].filter(Boolean).join(" ")} viewBox="0 0 24 24" data-size={size} data-tone={tone} data-skin={skin} data-name={name} focusable="false" {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}>
      <path d={d} />
    </svg>
  );
}
