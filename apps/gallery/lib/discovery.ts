/** Words for the browse-by-behaviour kinds (the values come from manifest.discovery.interaction). */
export const KIND_LABEL: Record<string, string> = {
  "hover-press": "Hover and press effects",
  pointer: "Pointer-reactive",
  reveal: "Reveal and expand",
  overlay: "Overlays and layers",
  scroll: "Scroll behaviour",
  feedback: "Feedback and loading",
  input: "Input and selection",
  none: "Static (no interaction)",
};
export const KIND_BLURB: Record<string, string> = {
  "hover-press": "Something happens when you hover, focus or press: a shimmer, a fill, an arrow, a depth change.",
  pointer: "The effect follows the pointer: a light that tracks it, a button that leans toward it. Desktop only; touch and reduced motion get the plain version.",
  reveal: "Content opens, slides or fades in: accordions, hover-reveal cards, menus, indicators.",
  overlay: "Layers above the page: dialogs, popovers, tooltips, menus and drawers. Focus is trapped or returned correctly.",
  scroll: "The component reacts to scrolling, for example a header that hides as you read.",
  feedback: "Tells the user something is happening or happened: toasts, spinners, progress, status buttons, error summaries.",
  input: "Something you type into, pick from or toggle.",
  none: "No moving parts.",
};
export const KIND_ORDER = ["hover-press", "pointer", "reveal", "overlay", "scroll", "feedback", "input", "none"] as const;
