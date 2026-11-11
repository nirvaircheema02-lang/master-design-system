"use client";
import { useEffect, useRef, type HTMLAttributes, type RefObject } from "react";
import "./scr-001.css";
import "./skins.css";

export interface Scr001Props extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /**
   * Measure reading progress through this element instead of the whole page: 0 when its top reaches the top of the viewport,
   * 1 when its bottom reaches the bottom. Omit it to follow the page scroll.
   */
  targetRef?: RefObject<HTMLElement | null>;
  skin?: string;
  /** Visual design (manifest props.design). Omitted = line. */
  design?: "line" | "bar" | "bottom";
}

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/**
 * SCR-001 Scroll progress bar: a fixed bar along a viewport edge that fills as the page (or one article) scrolls.
 * It is decoration for sighted users and is hidden from assistive technology on purpose: a live value would be re-announced on every scroll.
 * The fill is a transform (scaleX), written straight to a CSS variable on scroll, so it never re-renders React and never causes layout.
 * Needs JavaScript; without it the bar stays empty, which loses nothing.
 */
export function Scr001({ targetRef, skin, design, className, ...rest }: Scr001Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const vh = window.innerHeight;
      let p: number;
      const target = targetRef?.current;
      if (target) {
        const r = target.getBoundingClientRect();
        p = clamp01(-r.top / Math.max(r.height - vh, 1));
      } else {
        const d = document.documentElement;
        p = clamp01(window.scrollY / Math.max(d.scrollHeight - vh, 1));
        if (d.scrollHeight <= vh) p = 0;
      }
      el.style.setProperty("--_p", p.toFixed(4));
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    ro?.observe(document.documentElement);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      ro?.disconnect();
    };
  }, [targetRef]);

  return (
    <div {...rest} ref={ref} className={["ds-scr-001", className].filter(Boolean).join(" ")} data-skin={skin} data-design={design} aria-hidden="true">
      <span className="ds-scr-001__fill" />
    </div>
  );
}
