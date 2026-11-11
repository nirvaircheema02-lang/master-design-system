import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import "./inp-001.css";
import "./skins.css";

export interface Inp001Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** Visible label. Never replaced by a placeholder. */
  label: string;
  hint?: ReactNode;
  /** Error text. Wires aria-invalid and aria-describedby, and is prefixed with a visually hidden "Error:". */
  error?: string;
  size?: "sm" | "md" | "lg";
  /** Named skin from the manifest; omitted = the default skin. */
  skin?: string;
  /** Visual design (manifest props.design). `floating` ignores `placeholder` (it is the label's resting position); omitted = boxed. */
  design?: "boxed" | "underline" | "filled" | "floating" | "inline";
  /** Mark the MINORITY: "optional" (default) marks optional fields, "required" marks required ones. */
  marker?: "optional" | "required";
  optionalLabel?: string;
  requiredLabel?: string;
}

/** INP-001 Text field: label, hint, error and control as one unit. Appearance comes only from --ds-field-* tokens. */
export function Inp001({ label, hint, error, size = "md", skin, design, marker = "optional", optionalLabel = "(optional)", requiredLabel = "(required)", id: idProp, required, className, children: _children, "aria-describedby": describedByProp, ...rest }: Inp001Props) {
  const auto = useId();
  const id = idProp ?? `inp-${auto}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [describedByProp, hintId, errorId].filter(Boolean).join(" ") || undefined;
  const marked = marker === "required" ? !!required : !required;
  const labelEl = (
    <label className="ds-inp-001__label" htmlFor={id}>
      {label}
      {marked ? <span className="ds-inp-001__marker"> {marker === "required" ? requiredLabel : optionalLabel}</span> : null}
    </label>
  );
  const hintEl = hint ? <div id={hintId} className="ds-inp-001__hint">{hint}</div> : null;
  const errorEl = error ? (
    <p id={errorId} className="ds-inp-001__error">
      <span className="ds-inp-001__vh">Error:</span> {error}
    </p>
  ) : null;
  const controlEl = <input {...rest} {...(design === "floating" ? { placeholder: " " } : {})} id={id} className="ds-inp-001__control" required={required} aria-invalid={error ? true : undefined} aria-describedby={describedBy} />;
  // DOM order = visual order in every design: label, hint, error, control (boxed, underline, filled); control + label first when the label sits inside (floating) or beside (inline) the control.
  return (
    <div className={["ds-inp-001", className].filter(Boolean).join(" ")} data-size={size} data-skin={skin} data-design={design} data-invalid={error ? "" : undefined}>
      {design === "floating" ? <div className="ds-inp-001__float">{controlEl}{labelEl}</div> : design === "inline" ? <>{labelEl}{controlEl}{hintEl}{errorEl}</> : <>{labelEl}{hintEl}{errorEl}{controlEl}</>}
      {design === "floating" ? <>{hintEl}{errorEl}</> : null}
    </div>
  );
}
