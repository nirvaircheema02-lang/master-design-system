"use client";
import { useId, type ReactNode } from "react";
import "./inp-006.css";
import "./skins.css";

export interface Inp006Option { value: string; label: string; hint?: string; disabled?: boolean }
export interface Inp006Props {
  /** The question the options answer (the <legend>). */
  legend: string;
  options: Inp006Option[];
  /** Radios in one group share a name. */
  name: string;
  hint?: ReactNode;
  error?: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  skin?: string;
  /** Visual design (manifest props.design). Omitted = dot. */
  design?: "dot" | "card" | "pill" | "bar" | "large";
  className?: string;
}

/** INP-006 Radio group: <fieldset> + native radios, so arrow keys, roving selection and form posting are the browser's. */
export function Inp006({ legend, options, name, hint, error, defaultValue, value, onValueChange, skin, design, className }: Inp006Props) {
  const auto = useId();
  const hintId = hint ? `${auto}-hint` : undefined;
  const errorId = error ? `${auto}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const controlled = value !== undefined;
  return (
    <fieldset className={["ds-inp-006", className].filter(Boolean).join(" ")} data-skin={skin} data-design={design} data-invalid={error ? "" : undefined} aria-describedby={describedBy}>
      <legend className="ds-inp-006__legend">{legend}</legend>
      {hint ? <div id={hintId} className="ds-inp-006__hint">{hint}</div> : null}
      {error ? <p id={errorId} className="ds-inp-006__error"><span className="ds-inp-006__vh">Error:</span> {error}</p> : null}
      <div className="ds-inp-006__options">
        {options.map((o, i) => {
          const id = `${auto}-${i}`;
          return (
            <label key={o.value} className="ds-inp-006__option" htmlFor={id}>
              <input
                id={id} type="radio" className="ds-inp-006__input" name={name} value={o.value} disabled={o.disabled}
                {...(controlled ? { checked: value === o.value } : { defaultChecked: defaultValue === o.value })}
                onChange={() => onValueChange?.(o.value)}
              />
              <span className="ds-inp-006__dot" aria-hidden="true" />
              <span className="ds-inp-006__text"><span className="ds-inp-006__label">{o.label}</span>{o.hint ? <span className="ds-inp-006__optionhint">{o.hint}</span> : null}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
