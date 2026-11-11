"use client";
import { useId, type ChangeEvent, type InputHTMLAttributes, type ReactNode } from "react";
import "./inp-007.css";
import "./skins.css";

export interface Inp007Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "role" | "size"> {
  /** What the switch controls. It never changes with the state ("Notifications", not "Notifications on"). */
  label: string;
  hint?: ReactNode;
  error?: string;
  skin?: string;
  /** Visual design (manifest props.design). Omitted = pill. */
  design?: "pill" | "square" | "large" | "slim" | "split";
  onCheckedChange?: (checked: boolean) => void;
}

/** INP-007 Switch: a native checkbox with role="switch"; the label stays constant and the state is carried by aria-checked and the thumb position. */
export function Inp007({ label, hint, error, skin, design, id: idProp, className, onCheckedChange, onChange, children: _children, "aria-describedby": describedByProp, ...rest }: Inp007Props) {
  const auto = useId();
  const id = idProp ?? `inp-${auto}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [describedByProp, hintId, errorId].filter(Boolean).join(" ") || undefined;
  const change = (e: ChangeEvent<HTMLInputElement>) => { onChange?.(e); onCheckedChange?.(e.target.checked); };
  return (
    <div className={["ds-inp-007", className].filter(Boolean).join(" ")} data-skin={skin} data-design={design} data-invalid={error ? "" : undefined}>
      <label className="ds-inp-007__row" htmlFor={id}>
        <input {...rest} id={id} type="checkbox" role="switch" className="ds-inp-007__input" onChange={change} aria-invalid={error ? true : undefined} aria-describedby={describedBy} />
        <span className="ds-inp-007__track" aria-hidden="true"><span className="ds-inp-007__thumb" /></span>
        <span className="ds-inp-007__label">{label}</span>
      </label>
      {hint ? <div id={hintId} className="ds-inp-007__hint">{hint}</div> : null}
      {error ? <p id={errorId} className="ds-inp-007__error"><span className="ds-inp-007__vh">Error:</span> {error}</p> : null}
    </div>
  );
}
