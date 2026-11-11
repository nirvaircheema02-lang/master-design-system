"use client";
import { useState, type HTMLAttributes } from "react";
import "./avt-001.css";
import "./skins.css";

export interface Avt001Props extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** The person or thing. It is the accessible name and the source of the initials. */
  name: string;
  src?: string;
  size?: "sm" | "md" | "lg" | "xl";
  skin?: string;
  /** Visual design (manifest props.design). Omitted = circle. */
  design?: "circle" | "rounded" | "square" | "ring";
}

const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

/** AVT-001 Avatar: a picture, or the initials when there is no picture or it fails to load. One accessible name either way. */
export function Avt001({ name, src, size = "md", skin, design, className, ...rest }: Avt001Props) {
  const [failed, setFailed] = useState(false);
  const showImage = !!src && !failed;
  return (
    <span {...rest} role="img" aria-label={name} className={["ds-avt-001", className].filter(Boolean).join(" ")} data-size={size} data-skin={skin} data-design={design} data-fallback={showImage ? undefined : ""}>
      {showImage ? <img className="ds-avt-001__img" src={src} alt="" onError={() => setFailed(true)} /> : <span className="ds-avt-001__initials" aria-hidden="true">{initials(name)}</span>}
    </span>
  );
}
