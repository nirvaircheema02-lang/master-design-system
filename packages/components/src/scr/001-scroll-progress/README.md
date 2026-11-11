# SCR-001 Scroll progress bar
A fixed bar along a viewport edge that fills as you scroll. Token family `--ds-scp-*`.
- Props: `targetRef` (measure one article instead of the page: 0 at its top edge reaching the viewport top, 1 at its bottom reaching the viewport bottom), `skin` (solid, gradient), `design` (line, bar with track, bottom edge).
- The fill is `scaleX(var(--_p))`; the variable is written on scroll (rAF, passive listener) so React never re-renders. RTL flips the origin via `:dir(rtl)`.
- Decorative and `aria-hidden` on purpose (a live value would be re-announced on every scroll). Use LDR-002 when a spoken progress value is needed.
- Reduced motion: the bar still tracks scroll (it is user-driven, not an autonomous animation) but without the smoothing transition. Hidden in print. Without JS it stays empty.
- Sits at `z.overlay` (1000) so it shows above sticky headers (100); dialogs share that level, so DOM order decides. Not verified: interplay with NAV-006/NAV-007 headers, real brand tokens, conformance (no atom branch yet).
