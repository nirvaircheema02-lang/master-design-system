import type { AnchorHTMLAttributes, ReactNode } from "react";
import "./cta-015.css";
import "./skins.css";

export interface Cta015Props extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "href"> {
  /** Where the chat lives: a messaging deep link (wa.me style), a chat page, or mailto:. Required. */
  href: string;
  /** The accessible name, and the visible text in the pill design. Say what happens: "Chat with us". */
  label?: string;
  /** Replaces the built-in speech-bubble icon. Decorative: it is hidden from assistive tech. */
  icon?: ReactNode;
  /** Which corner it sits in. */
  position?: "bottom-right" | "bottom-left";
  /** fixed = pinned to the viewport corner (the point of the component). static = in the normal flow, for docs, galleries and tests. */
  placement?: "fixed" | "static";
  /** Open in a new tab (default true: a chat should not replace the page). Announced as "(opens in a new tab)". */
  newTab?: boolean;
  skin?: string;
  /** Visual design (manifest props.design). Omitted = round. */
  design?: "round" | "pill" | "square";
}

/**
 * CTA-015 Floating Chat Button: a link pinned to a viewport corner that opens a chat. It is a real link (not a button),
 * so middle-click, copy link and "open in new tab" work. The icon is decorative and the name comes from `label`.
 * On entry it fades and rises once; hover grows it slightly. Both stop under reduced motion. Appearance comes only from --ds-chat-* tokens.
 * Pass a brand logo as `icon` if you want one; the built-in mark is a neutral speech bubble.
 */
export function Cta015({ href, label = "Chat with us", icon, position = "bottom-right", placement = "fixed", newTab = true, skin, design, className, ...rest }: Cta015Props) {
  return (
    <a
      {...rest}
      href={href}
      {...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={["ds-cta-015", className].filter(Boolean).join(" ")}
      data-skin={skin}
      data-design={design}
      data-position={position}
      data-placement={placement}
    >
      {icon ? <span className="ds-cta-015__icon" aria-hidden="true">{icon}</span> : (
        <svg className="ds-cta-015__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 4v-4h0A2.5 2.5 0 0 1 4 13.5z" /></svg>
      )}
      <span className="ds-cta-015__label">{label}</span>
      {newTab ? <span className="ds-cta-015__vh"> (opens in a new tab)</span> : null}
    </a>
  );
}
