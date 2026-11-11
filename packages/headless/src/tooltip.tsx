"use client";
export { useThemeContainer } from "./scope.tsx";
import * as R from "@radix-ui/react-tooltip";
import type { ComponentProps } from "react";

/**
 * Tooltip (WCAG 1.4.13): shown on hover AND keyboard focus, dismissible with Escape, hoverable (the pointer can move onto it),
 * persistent until hover/focus leaves. The trigger gets `aria-describedby`; the content is role=tooltip and never interactive.
 * Attribute contract: `data-state="delayed-open|instant-open|closed"` on the content, `data-side` on the content.
 */
const Provider = ({ delayDuration = 400, skipDelayDuration = 300, ...rest }: ComponentProps<typeof R.Provider>) => <R.Provider delayDuration={delayDuration} skipDelayDuration={skipDelayDuration} {...rest} />;
export const Tooltip = { Provider, Root: R.Root, Trigger: R.Trigger, Portal: R.Portal, Content: R.Content };
