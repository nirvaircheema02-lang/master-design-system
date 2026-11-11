"use client";
export { useThemeContainer } from "./scope.tsx";
import * as R from "@radix-ui/react-dialog";

/**
 * Attribute contract: `data-state="open|closed"` on overlay and content (drives enter/exit animation; the library keeps
 * the node mounted until the exit animation ends). Neither Radix nor Base UI set `aria-modal`; outside content is
 * `aria-hidden` while the dialog is open, which is what the conformance suite asserts.
 */
export const Dialog = {
  Root: R.Root,
  Trigger: R.Trigger,
  Portal: R.Portal,
  Overlay: R.Overlay,
  Content: R.Content,
  Title: R.Title,
  Description: R.Description,
  Close: R.Close,
};
