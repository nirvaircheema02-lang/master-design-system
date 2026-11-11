"use client";
import { useCallback, useState } from "react";

/**
 * Portalled layers (dialog, menu) leave the element that carries `data-brand` / `data-mode`, and with it every token.
 * Render the returned ref on a hidden marker next to the trigger; portal into the returned container so the layer
 * stays inside its brand scope. When the scope is <html> (or absent) the container is <body>.
 */
export function useThemeContainer(): [(el: HTMLElement | null) => void, HTMLElement | undefined] {
  const [container, setContainer] = useState<HTMLElement>();
  const ref = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    const scope = el.closest<HTMLElement>("[data-brand]");
    setContainer(!scope || scope === document.documentElement ? document.body : scope);
  }, []);
  return [ref, container];
}
