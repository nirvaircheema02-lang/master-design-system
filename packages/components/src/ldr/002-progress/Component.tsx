import { useId } from "react";
import "./ldr-002.css";
import "./skins.css";

export interface Ldr002Props {
  /** Required: what is progressing. */
  label: string;
  /** 0 to max. Omit it for an indeterminate bar (unknown duration). */
  value?: number;
  max?: number;
  /** Show the percentage as text next to the label. */
  showValue?: boolean;
  skin?: string;
  /** Visual design (manifest props.design). Omitted = bar. */
  design?: "bar" | "thin" | "steps";
  className?: string;
}

/** LDR-002 Progress bar: role=progressbar with a name and exact values (aria-valuenow is omitted while indeterminate). The fill scales with transform, never width. */
export function Ldr002({ label, value, max = 100, showValue = false, skin, design, className }: Ldr002Props) {
  const id = useId();
  const determinate = value !== undefined;
  const v = determinate ? Math.min(Math.max(value, 0), max) : 0;
  const pct = max > 0 ? v / max : 0;
  return (
    <div className={["ds-ldr-002", className].filter(Boolean).join(" ")} data-skin={skin} data-design={design} data-indeterminate={determinate ? undefined : ""}>
      <div className="ds-ldr-002__head"><span id={id} className="ds-ldr-002__label">{label}</span>{showValue && determinate ? <span className="ds-ldr-002__value">{Math.round(pct * 100)}%</span> : null}</div>
      <div className="ds-ldr-002__track" role="progressbar" aria-labelledby={id} aria-valuemin={0} aria-valuemax={max} {...(determinate ? { "aria-valuenow": v } : {})}>
        <span className="ds-ldr-002__fill" style={determinate ? ({ "--_p": pct } as React.CSSProperties) : undefined} />
      </div>
    </div>
  );
}
