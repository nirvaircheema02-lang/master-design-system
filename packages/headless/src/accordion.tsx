"use client";
import * as R from "@radix-ui/react-accordion";
import type { ComponentProps, CSSProperties } from "react";

/** The panel's measured height, normalised to a local helper so component CSS never reads a library-prefixed name. */
export const ACCORDION_HEIGHT_VAR = "--_content-height";

const AccordionContent = ({ style, ...rest }: ComponentProps<typeof R.Content>) => (
  <R.Content style={{ [ACCORDION_HEIGHT_VAR]: "var(--radix-accordion-content-height)", ...style } as CSSProperties} {...rest} />
);

/**
 * Attribute contract: `data-state="open|closed"` on item, header, trigger and content; the content exposes the measured
 * panel height as `--_content-height` while it animates. The heading (Header) wraps the only button (Trigger).
 */
export const Accordion = {
  Root: R.Root,
  Item: R.Item,
  Header: R.Header,
  Trigger: R.Trigger,
  Content: AccordionContent,
};
