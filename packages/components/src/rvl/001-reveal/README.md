# RVL-001 Reveal on scroll
Wraps content and fades it in the first time it enters the viewport. Token family `--ds-rvl-*`.
- Props: `as` (div, section, article, aside, figure, li, p), `delay` (ms, for staggering siblings), `once` (default true), `threshold`, `rootMargin`, `skin` (default only), `design` (rise, scale, clip).
- Safe by default: content is visible before JS, without JS, with reduced motion and in print. Only the mounted component hides it (`data-reveal="hidden"`), then reveals on intersection. Focus inside reveals it immediately.
- Trade-off: with server rendering, content that is already in view at hydration flashes visible, hides, then animates in. Do not wrap the LCP element above the fold; do not nest reveals.
- Durations come from the brand motion scale (`duration.slow`), not the site's 750/1050 ms, and the site's blur-in is dropped (filter is a forbidden animated property).
- Only one skin (`default`): it has no colour surface, and skins can only bind semantic colour tokens, so a second skin would be empty.
- Not verified: Ctrl+F finding hidden text (browsers do find it, but it is invisible until scrolled), real brand tokens, conformance (no atom branch yet), screen readers.
