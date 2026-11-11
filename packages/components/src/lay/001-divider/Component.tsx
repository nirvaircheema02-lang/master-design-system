import type { HTMLAttributes } from "react";
import "./lay-001.css";
import "./skins.css";

export interface Lay001Props extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  orientation?: "horizontal" | "vertical";
  /** Text in the middle of a horizontal rule (e.g. "or"). It is real, readable text; the lines are decoration. */
  label?: string;
  skin?: string;
  /** Visual design (manifest props.design). Omitted = solid. */
  design?: "solid" | "dashed" | "fade" | "thick";
}

/** LAY-001 Divider: a semantic <hr> for a horizontal break, a separator for a vertical one, an optional text label. */
export function Lay001({ orientation = "horizontal", label, skin, design, className, ...rest }: Lay001Props) {
  const cls = ["ds-lay-001", className].filter(Boolean).join(" ");
  if (label && orientation === "horizontal") return <div {...rest} className={cls} data-orientation="horizontal" data-labelled="" data-skin={skin} data-design={design}><span className="ds-lay-001__line" aria-hidden="true" /><span className="ds-lay-001__label">{label}</span><span className="ds-lay-001__line" aria-hidden="true" /></div>;
  if (orientation === "vertical") return <div {...rest} role="separator" aria-orientation="vertical" className={cls} data-orientation="vertical" data-skin={skin} data-design={design} />;
  return <hr {...(rest as HTMLAttributes<HTMLHRElement>)} className={cls} data-orientation="horizontal" data-skin={skin} data-design={design} />;
}
