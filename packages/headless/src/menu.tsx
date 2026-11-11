"use client";
export { useThemeContainer } from "./scope.tsx";
import * as R from "@radix-ui/react-dropdown-menu";

/**
 * Action menu (role=menu). NOT for site navigation: that is a disclosure, never menu roles.
 * Attribute contract: `data-state="open|closed"` on trigger and content, `data-highlighted` on the active item,
 * `data-disabled` on a disabled item, `data-side` on content.
 */
export const Menu = {
  Root: R.Root,
  Trigger: R.Trigger,
  Portal: R.Portal,
  Content: R.Content,
  Item: R.Item,
  Label: R.Label,
  Separator: R.Separator,
  Group: R.Group,
};
