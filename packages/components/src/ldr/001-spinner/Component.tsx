import type { HTMLAttributes } from "react";
import "./ldr-001.css";
import "./skins.css";

export interface Ldr001Props extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  size?: "sm" | "md" | "lg";
  /** What is loading. Announced by assistive tech, and shown as text when the user asked for reduced motion. */
  label?: string;
  skin?: string;
  /** Visual design (manifest props.design). Omitted = ring. */
  design?: "ring" | "dots" | "bars";
}

/** LDR-001 Spinner: role=status with a text label. Under reduced motion nothing spins: the shape is still and the label is shown. */
export function Ldr001({ size = "md", label = "Loading", skin, design, className, ...rest }: Ldr001Props) {
  return (
    <span {...rest} role="status" className={["ds-ldr-001", className].filter(Boolean).join(" ")} data-size={size} data-skin={skin} data-design={design}>
      <span className="ds-ldr-001__shape" aria-hidden="true"><i /><i /><i /></span>
      <span className="ds-ldr-001__label">{label}</span>
    </span>
  );
}
