"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import "./lay-004.css";
import "./skins.css";

export interface Lay004Step {
  title: string;
  text?: ReactNode;
}
export interface Lay004Props {
  steps: Lay004Step[];
  /** Heading level of each step title (2-6). Pick the level that follows the section heading above the timeline. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** Accessible name of the list, e.g. "How we work". Optional: the section heading usually names it. */
  label?: string;
  skin?: string;
  /** Visual design (manifest props.design). Omitted = numbered. */
  design?: "numbered" | "alternate" | "minimal";
  className?: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
const clamp = (v: number) => Math.min(1, Math.max(0, v));

/**
 * LAY-004 Process timeline: an ordered list of steps along a vertical line. While the page scrolls, the line fills down to the
 * reading position and a glowing head rides its tip; steps already passed are marked. All of that is decoration and scroll
 * position only: the content is a real <ol> with full-contrast text, so nothing depends on the effect. Without JavaScript the
 * line is drawn complete. Under reduced motion the head and fill still follow the scroll but never glide.
 */
export function Lay004({ steps, headingLevel = 3, label, skin, design, className }: Lay004Props) {
  const Heading = `h${headingLevel}` as "h3";
  const root = useRef<HTMLDivElement>(null);
  /** Index of the last step the reading line has passed; null until measured (then nothing is dimmed). */
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const box = el.getBoundingClientRect();
      const centres = Array.from(el.querySelectorAll<HTMLElement>(".ds-lay-004__node")).map((nd) => { const b = nd.getBoundingClientRect(); return b.top - box.top + b.height / 2; });
      if (!centres.length) return;
      const first = centres[0]!, last = centres[centres.length - 1]!;
      const reading = window.innerHeight * 0.55 - box.top;
      const p = last > first ? clamp((reading - first) / (last - first)) : 1;
      el.style.setProperty("--_top", `${first}px`);
      el.style.setProperty("--_bot", `${box.height - last}px`);
      el.style.setProperty("--_p", p.toFixed(4));
      el.style.setProperty("--_hv", p > 0.002 && p < 0.998 ? "1" : "0");
      let at = -1;
      centres.forEach((c, i) => { if (reading >= c) at = i; });
      setActive((a) => (a === at ? a : at));
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(measure); };
    measure();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(queue);
    ro?.observe(el);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      ro?.disconnect();
    };
  }, [steps.length]);

  const stateOf = (i: number) => (active === null ? undefined : i < active ? "done" : i === active ? "current" : "todo");

  return (
    <div ref={root} className={["ds-lay-004", className].filter(Boolean).join(" ")} data-skin={skin} data-design={design}>
      <div className="ds-lay-004__rail" aria-hidden="true">
        <span className="ds-lay-004__line" />
        <span className="ds-lay-004__fill" />
        <span className="ds-lay-004__head">
          <span className="ds-lay-004__glow" />
          <span className="ds-lay-004__core" />
        </span>
      </div>
      {/* role="list" keeps list semantics in Safari/VoiceOver, which drops them when list-style is none */}
      <ol className="ds-lay-004__list" role="list" aria-label={label}>
        {steps.map((s, i) => (
          <li key={i} className="ds-lay-004__step" data-state={stateOf(i)}>
            <span className="ds-lay-004__node" aria-hidden="true">{pad(i + 1)}</span>
            <div className="ds-lay-004__body">
              <span className="ds-lay-004__no" aria-hidden="true">{pad(i + 1)}</span>
              <Heading className="ds-lay-004__title">{s.title}</Heading>
              {s.text ? <p className="ds-lay-004__text">{s.text}</p> : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
