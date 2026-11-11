# TXT-006 Rotating Word
An inline word inside a headline that cycles through `words`. Token family `--ds-rotw-*`. Use it inside a heading: `<h1>We build <Txt006 words={[...]} /></h1>`.
- Props: `words`, `label` (what assistive tech reads; default = all words joined), `interval` (ms, min 1200, default 2600), `cycles` (default 3, 0 = forever), `paused` (controlled), `skin` (accent, gradient), `design` (slide, fade, wipe).
- The words are `aria-hidden`; a visually hidden label stands in, so nothing is re-announced. Words stack in one grid cell, so the box is as wide as the longest and nothing jumps.
- Runs only while on screen, tab visible, pointer not over it. Reduced motion: no rotation, first word stays (also if the setting flips at runtime). No JS or SSR: first word is already shown.
- WCAG 2.2.2 is only partly met: rotation is finite by default and hover-pausable, but there is no built-in pause button. If `cycles={0}` or the headline is long-lived, give the page a pause control and drive `paused`.
- Not verified: screen readers, very long words at 200% zoom (they wrap, not tested visually), real brand tokens, conformance (no atom branch yet).
