import { useId, type ReactNode, type SelectHTMLAttributes } from "react";
import "./inp-005.css";
import "./skins.css";

export interface Inp005Option { value: string; label: string; disabled?: boolean }
export interface Inp005Props extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  label: string;
  options: Inp005Option[];
  hint?: ReactNode;
  error?: string;
  /** Text of an empty first option ("Choose one"). Never use it instead of the label. */
  prompt?: string;
  skin?: string;
  /** Visual design (manifest props.design). Omitted = boxed. */
  design?: "boxed" | "underline" | "filled" | "pill" | "tall";
  marker?: "optional" | "required";
  optionalLabel?: string;
  requiredLabel?: string;
}

/** INP-005 Select: a styled NATIVE <select> (zero JS; the platform supplies the listbox, keyboard, typeahead and mobile picker). */
export function Inp005({ label, options, hint, error, prompt, skin, design, marker = "optional", optionalLabel = "(optional)", requiredLabel = "(required)", id: idProp, required, className, children: _children, "aria-describedby": describedByProp, ...rest }: Inp005Props) {
  const auto = useId();
  const id = idProp ?? `inp-${auto}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [describedByProp, hintId, errorId].filter(Boolean).join(" ") || undefined;
  const marked = marker === "required" ? !!required : !required;
  return (
    <div className={["ds-inp-005", className].filter(Boolean).join(" ")} data-skin={skin} data-design={design} data-invalid={error ? "" : undefined}>
      <label className="ds-inp-005__label" htmlFor={id}>
        {label}
        {marked ? <span className="ds-inp-005__marker"> {marker === "required" ? requiredLabel : optionalLabel}</span> : null}
      </label>
      {hint ? <div id={hintId} className="ds-inp-005__hint">{hint}</div> : null}
      {error ? <p id={errorId} className="ds-inp-005__error"><span className="ds-inp-005__vh">Error:</span> {error}</p> : null}
      <div className="ds-inp-005__wrap">
        <select {...rest} id={id} className="ds-inp-005__control" required={required} aria-invalid={error ? true : undefined} aria-describedby={describedBy}>
          {prompt !== undefined ? <option value="">{prompt}</option> : null}
          {options.map((o) => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}
        </select>
        <svg className="ds-inp-005__chevron" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M5 7.5l5 5 5-5" /></svg>
      </div>
    </div>
  );
}
