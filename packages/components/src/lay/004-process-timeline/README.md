# LAY-004 Process Timeline
What: an ordered list of steps along a vertical line. A scroll-linked fill and a glowing head follow the reading line (55% of the viewport height); passed steps get an accent node. Archetype `atom`, class B (fill scaleY + head translateY + opacity, driven by custom properties the component sets).
When: explaining a process in 3-7 steps. Not for interactive steps (use tabs). Client component (`'use client'`).
Props: `steps[{title,text}]`, `headingLevel` (2-6, default 3), `label`, `skin`, `design`. Token family `ptl`.
Designs: `numbered` (default, 48px numbered nodes), `alternate` (steps swing left/right of a centred line from 48rem), `minimal` (small dot, number as a label). Skins: `accent`, `ink`, `on-raised` (node fill for raised surfaces).
Accessibility: real `<ol role="list">`, step titles are headings, the node number is `aria-hidden` (the list already numbers the items). Text is never dimmed (the site's `opacity: .5` on upcoming steps would fail AA, so state shows on the node only). The effect is decoration; without JS the line is drawn complete.
Reduced motion: fill/head still follow the scroll position but never glide (transitions removed).
Deviation from the site: no per-step SVG connector rings; one rail + head, simpler and transform-only. The head glow has no velocity-based intensity.
Verified (headless Chromium scratch harness): 3 designs x light/dark, 320px no horizontal scroll, no console errors, lint/tsc clean. NOT verified: conformance harness (needs an `atom` branch for LAY-004), long pages with many steps, screen readers, RTL.
