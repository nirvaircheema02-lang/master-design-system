"use client";
import * as R from "@radix-ui/react-tabs";
import type { ComponentProps, FocusEvent } from "react";

/** Explicit, never inherited from a library default (Radix: automatic, Base UI: manual). */
export type TabsActivation = "automatic" | "manual";
export interface TabsRootProps extends Omit<ComponentProps<typeof R.Root>, "activationMode"> { activation: TabsActivation }

/**
 * After any pointer interaction, Radix leaves the list CONTAINER as the next Tab stop without forwarding focus to a tab
 * (found by the conformance harness: Tab landed on the tablist and the arrow keys then did nothing). The container must
 * never keep focus: hand it to the selected tab.
 */
const TabsList = ({ onFocus, ...rest }: ComponentProps<typeof R.List>) => (
  <R.List
    onFocus={(e: FocusEvent<HTMLDivElement>) => {
      onFocus?.(e);
      if (!e.defaultPrevented && e.target === e.currentTarget) e.currentTarget.querySelector<HTMLElement>('[role="tab"][data-state="active"]:not([disabled])')?.focus();
    }}
    {...rest}
  />
);

/**
 * Attribute contract components style against: `data-state="active|inactive"` on trigger and content,
 * `data-orientation` on root, list and trigger, `data-disabled` on a disabled trigger.
 */
export const Tabs = {
  Root: ({ activation, ...rest }: TabsRootProps) => <R.Root activationMode={activation} {...rest} />,
  List: TabsList,
  Trigger: R.Trigger,
  Content: R.Content,
};
