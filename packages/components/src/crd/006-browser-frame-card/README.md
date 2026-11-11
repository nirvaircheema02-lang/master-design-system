# CRD-006 Browser-Frame Project Card
What: a portfolio card that shows a project screenshot inside a small browser window (three dots + address pill), then label, category, title, summary, outcome line and a "View project" cue. Archetype `card`, class B (hover lift + picture zoom, transform only).
When: case-study / project grids where the work is a website or app. Not for pictures that are not screens (use CRD-004 / CRD-002).
Props: `title`, `href`, `image`, `url`, `label`, `meta`, `outcome`, `footnote`, `viewLabel`, `headingLevel`, `children` (summary), `skin`, `design`. Token family `prj` (see `TOKENS.snippet.txt`; paste into `packages/tokens/src/theme.ts`).
Designs: `window` (default, mini window floats over the picture, as on the Singhtech site), `stacked` (full-width title bar above the picture), `split` (picture beside text from 48rem). Skins: `traffic` (red/accent/green dots), `quiet` (grey dots, filled card).
One link only (the title, stretched by `::after`); "View project" is an `aria-hidden` visual cue, not a second link, and is therefore not part of the accessible name.
Verified: master-lint rules on my CSS/skins/TSX with a synthetic context (0 violations), `tsc` clean, rendered in headless Chromium (light, dark, 320px no horizontal scroll, hover lift/zoom, reduced motion = none, focus ring on the card).
NOT verified: the conformance harness (card archetype), generator radius mapping (radius needs the container role like `card`), screen readers, visual match against the live site pixel by pixel (values were read from its CSS but not diffed).
