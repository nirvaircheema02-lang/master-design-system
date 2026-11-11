"use client";
import { useEffect, useRef, useState, type HTMLAttributes } from "react";
import "./txt-006.css";
import "./skins.css";

export interface Txt006Props extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** The words to cycle through. One word = static. The first word is what shows with reduced motion and before JavaScript runs. */
  words: string[];
  /**
   * What assistive technology reads. The cycling words are hidden from it (they would be re-announced forever), so this text stands in.
   * Defaults to all the words joined with commas, so a screen-reader user gets the same information a sighted user gets over time.
   */
  label?: string;
  /** Milliseconds each word stays (minimum 1200). Default 2600. */
  interval?: number;
  /** Stop after this many full passes through the list and rest on the first word. 0 = never stop. Default 3, so the motion is finite (WCAG 2.2.2). */
  cycles?: number;
  /** Controlled pause: wire it to your own "pause animations" control. */
  paused?: boolean;
  skin?: string;
  /** Visual design (manifest props.design). Omitted = slide. */
  design?: "slide" | "fade" | "wipe";
}

const MIN_INTERVAL = 1200;

/**
 * TXT-006 Rotating word: an inline word inside a headline that cycles through a list.
 * The box is as wide as the longest word, so the line never jumps. Rotation only runs while the word is on screen, the tab is visible
 * and the pointer is not over it, and it never runs under prefers-reduced-motion (then the first word simply stays).
 * Put it INSIDE a heading: `<h1>We build <Txt006 words={[...]} /></h1>`.
 */
export function Txt006({ words, label, interval = 2600, cycles = 3, paused = false, skin, design, className, ...rest }: Txt006Props) {
  const [step, setStep] = useState({ cur: 0, prev: -1 });
  const stageRef = useRef<HTMLSpanElement>(null);
  const count = words.length;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || count < 2 || paused || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let inView = true, hovering = false, ticks = 0;
    const root = stage.parentElement as HTMLElement;
    const io = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver((e) => { inView = e[e.length - 1]!.isIntersecting; });
    io?.observe(stage);
    const enter = () => { hovering = true; };
    const leave = () => { hovering = false; };
    root.addEventListener("pointerenter", enter);
    root.addEventListener("pointerleave", leave);
    const onMotion = () => { if (mq.matches) setStep({ cur: 0, prev: -1 }); };
    mq.addEventListener("change", onMotion);
    const timer = window.setInterval(() => {
      if (mq.matches || hovering || !inView || document.hidden) return;
      setStep((s) => ({ cur: (s.cur + 1) % count, prev: s.cur }));
      ticks += 1;
      if (cycles > 0 && ticks >= cycles * count) window.clearInterval(timer);
    }, Math.max(MIN_INTERVAL, interval));
    return () => {
      window.clearInterval(timer);
      io?.disconnect();
      root.removeEventListener("pointerenter", enter);
      root.removeEventListener("pointerleave", leave);
      mq.removeEventListener("change", onMotion);
    };
  }, [count, interval, cycles, paused]);

  return (
    <span {...rest} className={["ds-txt-006", className].filter(Boolean).join(" ")} data-skin={skin} data-design={design}>
      <span className="ds-txt-006__sr">{label ?? words.join(", ")}</span>
      <span ref={stageRef} className="ds-txt-006__stage" aria-hidden="true">
        {words.map((w, i) => (
          <span key={i} className="ds-txt-006__word" data-state={i === step.cur ? "on" : i === step.prev ? "out" : undefined}>{w}</span>
        ))}
      </span>
    </span>
  );
}
