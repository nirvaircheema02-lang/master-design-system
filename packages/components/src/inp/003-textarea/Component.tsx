"use client";
import { useEffect, useId, useRef, useState, type ChangeEvent, type ReactNode, type TextareaHTMLAttributes } from "react";
import "./inp-003.css";
import "./skins.css";

export interface Inp003Props extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "maxLength"> {
  label: string;
  hint?: ReactNode;
  error?: string;
  /** Soft character limit. Typing past it is NEVER blocked: the count turns into "N too many" and the form decides. */
  limit?: number;
  skin?: string;
  /** Visual design (manifest props.design). Omitted = boxed. */
  design?: "boxed" | "underline" | "filled" | "roomy" | "compact";
  marker?: "optional" | "required";
  optionalLabel?: string;
  requiredLabel?: string;
}

const REMAINING = (n: number) => (n >= 0 ? `You have ${n} character${n === 1 ? "" : "s"} remaining` : `You have ${-n} character${n === -1 ? "" : "s"} too many`);

/**
 * INP-003 Textarea with an optional character count. The visible count updates as you type; screen readers hear it through
 * an always-present polite status region ONLY after typing pauses (announcing every keystroke makes the field unusable).
 */
export function Inp003({ label, hint, error, limit, skin, design, marker = "optional", optionalLabel = "(optional)", requiredLabel = "(required)", id: idProp, required, className, rows = 4, value, defaultValue, onChange, "aria-describedby": describedByProp, children: _children, ...rest }: Inp003Props) {
  const auto = useId();
  const id = idProp ?? `inp-${auto}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [describedByProp, hintId, errorId].filter(Boolean).join(" ") || undefined;
  const marked = marker === "required" ? !!required : !required;
  const [inner, setInner] = useState(String(defaultValue ?? ""));
  const text = value !== undefined ? String(value) : inner;
  const left = limit !== undefined ? limit - text.length : null;
  const [spoken, setSpoken] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (left === null) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setSpoken(text ? REMAINING(left) : ""), 1000);
    return () => clearTimeout(timer.current);
  }, [text, left]);
  const change = (e: ChangeEvent<HTMLTextAreaElement>) => { setInner(e.target.value); onChange?.(e); };
  return (
    <div className={["ds-inp-003", className].filter(Boolean).join(" ")} data-skin={skin} data-design={design} data-invalid={error ? "" : undefined} data-over={left !== null && left < 0 ? "" : undefined}>
      <label className="ds-inp-003__label" htmlFor={id}>
        {label}
        {marked ? <span className="ds-inp-003__marker"> {marker === "required" ? requiredLabel : optionalLabel}</span> : null}
      </label>
      {hint ? <div id={hintId} className="ds-inp-003__hint">{hint}</div> : null}
      {error ? <p id={errorId} className="ds-inp-003__error"><span className="ds-inp-003__vh">Error:</span> {error}</p> : null}
      <textarea {...rest} id={id} rows={rows} className="ds-inp-003__control" required={required} value={value} defaultValue={value === undefined ? defaultValue : undefined} onChange={change} aria-invalid={error ? true : undefined} aria-describedby={describedBy} />
      {left !== null ? <p className="ds-inp-003__count" aria-hidden="true">{text ? REMAINING(left) : `You can enter up to ${limit} characters`}</p> : null}
      <div className="ds-inp-003__vh" role="status" aria-live="polite">{spoken}</div>
    </div>
  );
}
