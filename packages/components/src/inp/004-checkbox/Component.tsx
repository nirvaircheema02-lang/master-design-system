"use client";
import { useId, type ReactNode } from "react";
import "./inp-004.css";
import "./skins.css";

export interface Inp004Option { value: string; label: string; hint?: string; disabled?: boolean }
export interface Inp004Props {
  /** Names the group (rendered as the <legend>). Required: a lone checkbox still needs a question it answers. */
  legend: string;
  options: Inp004Option[];
  name?: string;
  hint?: ReactNode;
  error?: string;
  defaultValue?: string[];
  value?: string[];
  onValueChange?: (value: string[]) => void;
  skin?: string;
  /** Visual design (manifest props.design). Omitted = box. */
  design?: "box" | "card" | "pill" | "bar" | "large";
  className?: string;
}

/** INP-004 Checkbox group: a <fieldset> with a legend; every option is a real checkbox, so keyboard, Space and form posting come from the browser. */
export function Inp004({ legend, options, name, hint, error, defaultValue, value, onValueChange, skin, design, className }: Inp004Props) {
  const auto = useId();
  const hintId = hint ? `${auto}-hint` : undefined;
  const errorId = error ? `${auto}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const controlled = value !== undefined;
  return (
    <fieldset className={["ds-inp-004", className].filter(Boolean).join(" ")} data-skin={skin} data-design={design} data-invalid={error ? "" : undefined} aria-describedby={describedBy}>
      <legend className="ds-inp-004__legend">{legend}</legend>
      {hint ? <div id={hintId} className="ds-inp-004__hint">{hint}</div> : null}
      {error ? <p id={errorId} className="ds-inp-004__error"><span className="ds-inp-004__vh">Error:</span> {error}</p> : null}
      <div className="ds-inp-004__options">
        {options.map((o, i) => {
          const id = `${auto}-${i}`;
          return (
            <label key={o.value} className="ds-inp-004__option" htmlFor={id}>
              <input
                id={id} type="checkbox" className="ds-inp-004__input" name={name} value={o.value} disabled={o.disabled}
                {...(controlled ? { checked: value.includes(o.value) } : { defaultChecked: defaultValue?.includes(o.value) })}
                onChange={(e) => { if (!onValueChange) return; const cur = controlled ? value : []; onValueChange(e.target.checked ? [...cur, o.value] : cur.filter((v) => v !== o.value)); }}
              />
              <span className="ds-inp-004__box" aria-hidden="true"><svg viewBox="0 0 20 20" focusable="false"><path d="M5 10.5l3.5 3.5L15 6.5" /></svg></span>
              <span className="ds-inp-004__text"><span className="ds-inp-004__label">{o.label}</span>{o.hint ? <span className="ds-inp-004__optionhint">{o.hint}</span> : null}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
