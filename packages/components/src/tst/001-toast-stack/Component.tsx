"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import "./tst-001.css";
import "./skins.css";

export type Tst001Tone = "info" | "success" | "critical";
export interface Tst001Item {
  id: string;
  title: string;
  description?: string;
  tone?: Tst001Tone;
  /** Auto-dismiss delay in ms. Ignored for `critical` (never auto-dismisses). 0 = stay until dismissed. */
  durationMs?: number;
  action?: { label: string; href: string };
}
export interface Tst001Props {
  items: Tst001Item[];
  /** Called after the user dismisses an item or its timer ends (the stack also hides it itself). */
  onDismiss?: (id: string) => void;
  /** `fixed`: bottom-right of the viewport. `inline`: in the flow (documentation previews, embedded panels). */
  placement?: "fixed" | "inline";
  /** Accessible name of the notifications region. */
  label?: string;
  skin?: string;
  /** Visual design (manifest props.design). Omitted = bar. */
  design?: "bar" | "thick" | "outline" | "badge" | "slide";
  className?: string;
}

const DEFAULT_MS = 6000;
const ICON: Record<Tst001Tone, string> = { info: "M10 9v5M10 6.2v.1", success: "M5.5 10.5l3 3 6-6.5", critical: "M10 5.5v5.5M10 14v.1" };
const TONE_LABEL: Record<Tst001Tone, string> = { info: "Information", success: "Success", critical: "Error" };

function Toast({ item, paused, onDone, onClose }: { item: Tst001Item; paused: boolean; onDone: () => void; onClose: () => void }) {
  const tone = item.tone ?? "info";
  const total = tone === "critical" ? 0 : item.durationMs ?? DEFAULT_MS;
  const remaining = useRef(total);
  useEffect(() => {
    if (!total || paused) return;
    const started = Date.now();
    const t = setTimeout(onDone, remaining.current);
    return () => { clearTimeout(t); remaining.current -= Date.now() - started; };
  }, [paused, total, onDone]);
  return (
    <div className="ds-tst-001__item" data-tone={tone}>
      <svg className="ds-tst-001__icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><circle cx="10" cy="10" r="8.25" /><path d={ICON[tone]} /></svg>
      <div className="ds-tst-001__text">
        <p className="ds-tst-001__title"><span className="ds-tst-001__tone">{TONE_LABEL[tone]}: </span>{item.title}</p>
        {item.description ? <p className="ds-tst-001__description">{item.description}</p> : null}
        {item.action ? <a className="ds-tst-001__action" href={item.action.href}>{item.action.label}</a> : null}
      </div>
      <button type="button" className="ds-tst-001__close" aria-label={`Dismiss: ${item.title}`} onClick={onClose}>
        <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M5 5l10 10M15 5L5 15" /></svg>
      </button>
    </div>
  );
}

/**
 * TST-001 Toast stack. Two live regions ALWAYS exist (polite `status`, assertive `alert`) so additions are announced; a toast
 * never takes focus. Critical toasts never auto-dismiss; timers pause while the stack is hovered or holds focus; while any toast
 * is showing <html> `scroll-padding-bottom` keeps focused controls from sliding underneath it.
 */
export function Tst001({ items, onDismiss, placement = "fixed", label = "Notifications", skin, design, className }: Tst001Props) {
  const [gone, setGone] = useState<ReadonlySet<string>>(new Set());
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const region = useRef<HTMLElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const restore = useRef(false);

  const dismiss = (id: string, viaKeyboardOrClick: boolean) => {
    if (viaKeyboardOrClick && region.current?.contains(document.activeElement)) restore.current = true;
    setGone((g) => new Set(g).add(id));
    onDismiss?.(id);
  };
  // forget dismissals of ids the caller removed, so an id can be shown again later
  useEffect(() => { setGone((g) => { const ids = new Set(items.map((i) => i.id)); const next = new Set([...g].filter((x) => ids.has(x))); return next.size === g.size ? g : next; }); }, [items]);
  const visible = items.filter((i) => !gone.has(i.id));
  const polite = visible.filter((i) => (i.tone ?? "info") !== "critical");
  const urgent = visible.filter((i) => i.tone === "critical");

  // After dismissing a toast that held focus, hand focus to the next toast or back to where the user came from.
  useEffect(() => {
    // a focused control that gets removed fires no blur, so re-derive "focus is inside" from the DOM
    setFocus(!!region.current?.contains(document.activeElement));
    if (!restore.current) return;
    restore.current = false;
    if (region.current?.contains(document.activeElement)) return;
    (region.current?.querySelector<HTMLElement>(".ds-tst-001__close") ?? returnTo.current)?.focus();
  }, [gone, items]);

  useLayoutEffect(() => {
    const el = region.current;
    if (!el || placement !== "fixed" || visible.length === 0) return;
    const root = document.documentElement;
    const apply = () => { root.style.scrollPaddingBottom = `${el.offsetHeight + 24}px`; };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => { ro.disconnect(); root.style.removeProperty("scroll-padding-bottom"); };
  }, [placement, visible.length]);

  const paused = hover || focus;
  const render = (list: Tst001Item[]) => list.map((i) => <Toast key={i.id} item={i} paused={paused} onDone={() => dismiss(i.id, false)} onClose={() => dismiss(i.id, true)} />);
  return (
    <section
      ref={region}
      className={["ds-tst-001", className].filter(Boolean).join(" ")}
      data-skin={skin}
      data-design={design}
      data-placement={placement}
      aria-label={label}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onFocus={(e) => { if (!region.current?.contains(e.relatedTarget as Node | null)) returnTo.current = e.relatedTarget as HTMLElement | null; setFocus(true); }}
      onBlur={(e) => { if (!region.current?.contains(e.relatedTarget as Node | null)) setFocus(false); }}
    >
      <div className="ds-tst-001__stack ds-tst-001__status" role="status" aria-live="polite" aria-atomic="false">{render(polite)}</div>
      <div className="ds-tst-001__stack ds-tst-001__alert" role="alert" aria-atomic="false">{render(urgent)}</div>
    </section>
  );
}
