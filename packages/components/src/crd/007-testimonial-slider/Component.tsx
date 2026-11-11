"use client";
import { useEffect, useState, type CSSProperties, type FocusEvent, type PointerEvent } from "react";
import "./crd-007.css";
import "./skins.css";

export interface Crd007Item {
  quote: string;
  name: string;
  /** Job title and/or company, shown under the name. */
  role?: string;
}
/** Every string a screen reader hears. Override them to translate. `{n}`, `{total}` and `{name}` are filled in. */
export interface Crd007Labels {
  region?: string;
  /** Name of the group of slide-picker buttons. */
  picker?: string;
  previous?: string;
  next?: string;
  pause?: string;
  play?: string;
  goTo?: string;
  slide?: string;
}
export interface Crd007Props {
  items: Crd007Item[];
  /** Milliseconds each quote stays before the next one slides in. */
  interval?: number;
  /** Turn automatic rotation off completely (no pause button is shown then). Reduced motion turns it off too. */
  autoAdvance?: boolean;
  labels?: Crd007Labels;
  skin?: string;
  /** Visual design (manifest props.design). Omitted = card. */
  design?: "card" | "segments" | "plain";
  className?: string;
}

const L: Required<Crd007Labels> = {
  region: "Testimonials",
  picker: "Choose a testimonial",
  previous: "Previous testimonial",
  next: "Next testimonial",
  pause: "Pause automatic rotation",
  play: "Start automatic rotation",
  goTo: "Show testimonial {n} of {total}: {name}",
  slide: "{n} of {total}",
};
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ""));
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

/**
 * CRD-007 Testimonial slider: quotes slide one at a time. Auto-advance stops while the pointer is over it, while keyboard focus is
 * inside it, when the visitor presses Pause (WCAG 2.2.2), and always under reduced motion. The live region is silent while it
 * rotates on its own and polite once the visitor takes control. Slides that are not showing are `inert` (out of the tab order
 * and the accessibility tree). Without JavaScript the first quote is shown and the controls do nothing.
 */
export function Crd007({ items, interval = 6500, autoAdvance = true, labels, skin, design, className }: Crd007Props) {
  const T = { ...L, ...labels };
  const n = items.length;
  const [index, setIndex] = useState(0);
  const [wantsPlay, setWantsPlay] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const cur = Math.min(index, Math.max(n - 1, 0));
  const multi = n > 1;
  const auto = autoAdvance && multi && !reduced;
  const running = auto && wantsPlay && !hovered && !focused;

  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % n), interval);
    return () => clearTimeout(t);
  }, [running, cur, interval, n]);

  if (n === 0) return null;
  const go = (i: number) => setIndex(((i % n) + n) % n);
  const onEnter = (e: PointerEvent) => { if (e.pointerType === "mouse") setHovered(true); };
  const onFocus = (e: FocusEvent<HTMLElement>) => { if ((e.target as HTMLElement).matches(":focus-visible")) setFocused(true); };
  const onBlur = (e: FocusEvent<HTMLElement>) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false); };

  return (
    <section
      className={["ds-crd-007", className].filter(Boolean).join(" ")}
      aria-roledescription="carousel"
      aria-label={T.region}
      data-skin={skin}
      data-design={design}
      style={{ "--_i": cur, "--_n": n } as CSSProperties}
      onPointerEnter={onEnter}
      onPointerLeave={() => setHovered(false)}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <div className="ds-crd-007__viewport" aria-live={running ? "off" : "polite"}>
        <div className="ds-crd-007__track">
          {items.map((it, i) => (
            <div
              key={i}
              className="ds-crd-007__slide"
              role="group"
              aria-roledescription="slide"
              aria-label={fill(T.slide, { n: i + 1, total: n })}
              inert={i !== cur}
            >
              <figure className="ds-crd-007__card">
                <svg className="ds-crd-007__mark" viewBox="0 0 36 36" aria-hidden="true" focusable="false">
                  <path d="M5 21c0-7 3.5-12 10-14l1.2 2.3C12.6 11 11 13.4 10.8 16H15v13H5V21zm16 0c0-7 3.5-12 10-14l1.2 2.3C28.6 11 27 13.4 26.8 16H31v13H21V21z" />
                </svg>
                <blockquote className="ds-crd-007__quote">{it.quote}</blockquote>
                <figcaption className="ds-crd-007__author">
                  <span className="ds-crd-007__avatar" aria-hidden="true">{initials(it.name)}</span>
                  <span className="ds-crd-007__who">
                    <span className="ds-crd-007__name">{it.name}</span>
                    {it.role ? <span className="ds-crd-007__role">{it.role}</span> : null}
                  </span>
                </figcaption>
              </figure>
            </div>
          ))}
        </div>
      </div>

      {multi ? (
        <div className="ds-crd-007__controls">
          {auto ? (
            <button type="button" className="ds-crd-007__btn ds-crd-007__toggle" onClick={() => setWantsPlay((p) => !p)} aria-label={wantsPlay ? T.pause : T.play}>
              <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                {wantsPlay ? <path d="M7 5v10M13 5v10" /> : <path className="ds-crd-007__play" d="M7 4.5v11l9-5.5z" />}
              </svg>
            </button>
          ) : null}
          <button type="button" className="ds-crd-007__btn" onClick={() => go(cur - 1)} aria-label={T.previous}>
            <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M12 5l-5 5 5 5" /></svg>
          </button>
          <div className="ds-crd-007__bar" role="group" aria-label={T.picker}>
            <span className="ds-crd-007__fill" aria-hidden="true" />
            {items.map((it, i) => (
              <button
                key={i}
                type="button"
                className="ds-crd-007__pick"
                aria-label={fill(T.goTo, { n: i + 1, total: n, name: it.name })}
                aria-current={i === cur ? "true" : undefined}
                data-on={i <= cur ? "" : undefined}
                onClick={() => go(i)}
              >
                <span className="ds-crd-007__seg" aria-hidden="true"><span className="ds-crd-007__seg-fill" /></span>
              </button>
            ))}
          </div>
          <button type="button" className="ds-crd-007__btn" onClick={() => go(cur + 1)} aria-label={T.next}>
            <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M8 5l5 5-5 5" /></svg>
          </button>
        </div>
      ) : null}
    </section>
  );
}
