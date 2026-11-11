import type { ReactNode } from "react";
import "./crd-005.css";
import "./skins.css";

export interface Crd005Delta {
  /** The change as text, e.g. "12.4%". */
  text: string;
  /** Which way the number moved. Shown by an arrow AND by words for screen readers, never by colour alone. */
  direction: "up" | "down" | "flat";
  /** Whether that movement is good news. Up can be bad (churn). Drives the colour only. */
  intent?: "positive" | "negative" | "neutral";
  /** What it is compared with, e.g. "vs last month". */
  versus?: string;
}
export interface Crd005Props {
  label: string;
  value: ReactNode;
  delta?: Crd005Delta;
  description?: ReactNode;
  skin?: string;
  /** Visual design (manifest props.design). Omitted = classic. */
  design?: "classic" | "bar" | "centered" | "bold" | "inline";
  className?: string;
}

const WORDS = { up: "Increased by", down: "Decreased by", flat: "No change," } as const;
const ARROW = { up: "M10 15V5M5.5 9.5L10 5l4.5 4.5", down: "M10 5v10M5.5 10.5L10 15l4.5-4.5", flat: "M4.5 10h11" } as const;

/** CRD-005 Stat card: a labelled figure (a description list, so the label is programmatically tied to its value) with an optional change. Not interactive. */
export function Crd005({ label, value, delta, description, skin, design, className }: Crd005Props) {
  const intent = delta ? delta.intent ?? (delta.direction === "flat" ? "neutral" : "positive") : "neutral";
  return (
    <dl className={["ds-crd-005", className].filter(Boolean).join(" ")} data-skin={skin} data-design={design}>
      <dt className="ds-crd-005__label">{label}</dt>
      <dd className="ds-crd-005__value">{value}</dd>
      {delta ? (
        <dd className="ds-crd-005__delta" data-intent={intent}>
          <svg className="ds-crd-005__arrow" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d={ARROW[delta.direction]} /></svg>
          <span className="ds-crd-005__vh">{WORDS[delta.direction]} </span>
          <span className="ds-crd-005__change">{delta.text}</span>
          {delta.versus ? <span className="ds-crd-005__versus"> {delta.versus}</span> : null}
        </dd>
      ) : null}
      {description ? <dd className="ds-crd-005__description">{description}</dd> : null}
    </dl>
  );
}
