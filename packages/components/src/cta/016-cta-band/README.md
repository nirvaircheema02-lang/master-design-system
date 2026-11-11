# CTA-016 CTA Band
What: the closing call-to-action panel of a page: eyebrow, heading, one paragraph and two action slots (`primary`, `secondary`). Outer section = vertical rhythm (the site's `cta-out`), inner panel = surface (`cta-in`). Token family `bnd`.
When: the last block before the footer, or a mid-page conversion break. Not for more than two actions.
Props: `eyebrow`, `title`, `text`, `primary`, `secondary`, `headingLevel`, `skin`, `design`, `className`.
Designs: `left` (default), `centered`, `split` (text left, actions right from 48rem). Skins: `ink` (default: inverted dark panel, light in dark mode), `accent`, `raised`.
Static, no motion. The site pulses a blurred glow forever; that was left out on purpose (no infinite animation at rest, and blur/filter is not animatable here). The glow is a static radial gradient.
Pass CTA atoms into the slots; pick a button skin that contrasts with the panel skin (on `ink` a solid accent button is fine; a `raised`-looking button works on `accent`).
NOT verified: nothing rendered yet (tokens not wired); contrast of slotted buttons on each panel skin is the consumer's to check; no screen reader test.
