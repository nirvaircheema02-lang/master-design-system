"use client";
export { useThemeContainer } from "./scope.tsx";
import * as R from "@radix-ui/react-popover";

/**
 * Non-modal popover with interactive content (role=dialog, labelled by the caller). Focus moves in on open, Escape closes and
 * returns focus to the trigger, leaving the popover (focus or pointer outside) closes it; the page behind is NOT made inert.
 * Attribute contract: `data-state="open|closed"` on trigger and content, `data-side`/`data-align` on content.
 */
export const Popover = {
  Root: R.Root,
  Trigger: R.Trigger,
  Portal: R.Portal,
  Content: R.Content,
  Close: R.Close,
};
