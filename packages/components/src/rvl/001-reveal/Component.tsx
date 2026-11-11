"use client";
import { useEffect, useRef, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import "./rvl-001.css";
import "./skins.css";

export type Rvl001Tag = "div" | "section" | "article" | "aside" | "figure" | "li" | "p";
export interface Rvl001Props extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  children: ReactNode;
  /** Element to render. Default div. Use li inside a list, section or article when the content is one. */
  as?: Rvl001Tag;
  /** Milliseconds to wait after entering the viewport. Use small steps (80 to 120) to stagger siblings. */
  delay?: number;
  /** true (default): reveal once and stay. false: hide again when it leaves the viewport, so it replays. */
  once?: boolean;
  /** Fraction of the element that must be visible (0 to 1). Default 0.15. */
  threshold?: number;
  /** Shrinks or grows the trigger area, like IntersectionObserver rootMargin. Default "0px 0px -8% 0px" (fires a little after the edge). */
  rootMargin?: string;
  skin?: string;
  /** Visual design (manifest props.design). Omitted = rise. */
  design?: "rise" | "scale" | "clip";
}

type Phase = "idle" | "hidden" | "shown";

/**
 * RVL-001 Reveal on scroll: wraps content and fades it in (rise, scale or clip) the first time it enters the viewport.
 * Content is VISIBLE by default: before JavaScript runs, with JavaScript off, with prefers-reduced-motion and in print, nothing is ever hidden.
 * Only after the component mounts does it hide content that is waiting to be revealed. Focus moving inside reveals it at once.
 * Do not wrap the largest content on the page above the fold (it delays LCP); do not nest reveals.
 */
export function Rvl001({ children, as = "div", delay = 0, once = true, threshold = 0.15, rootMargin = "0px 0px -8% 0px", skin, design, className, style, onFocus, ...rest }: Rvl001Props) {
  const Tag = as as "div";
  const ref = useRef<HTMLElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; // stays visible, nothing animates
    setPhase("hidden");
    const io = new IntersectionObserver((entries) => {
      const e = entries[entries.length - 1]!;
      if (e.isIntersecting) { setPhase("shown"); if (once) io.disconnect(); }
      else if (!once) setPhase("hidden");
    }, { threshold, rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [once, threshold, rootMargin]);

  const s = delay > 0 ? ({ ...style, "--_delay": `${delay}ms` } as CSSProperties) : style;
  return (
    <Tag
      {...(rest as object)}
      ref={ref as never}
      className={["ds-rvl-001", className].filter(Boolean).join(" ")}
      style={s}
      data-skin={skin}
      data-design={design}
      data-reveal={phase}
      onFocus={(e: React.FocusEvent<HTMLElement>) => { setPhase((p) => (p === "hidden" ? "shown" : p)); onFocus?.(e); }}
    >
      {children}
    </Tag>
  );
}
