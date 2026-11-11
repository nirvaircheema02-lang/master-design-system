# Phase 3 Wave 2 report — CTA-006, 007, 008, 009, 012, 013

Date: 2026-11-06 · local only, nothing committed. Verified with `pnpm check:all` (see the end of this file for the numbers).

## Delivered
| ID | Component | Class | Skins | Notes |
|---|---|---|---|---|
| CTA-006 | Glow | B | solid-accent, surface-glow | halo is a pre-drawn layer; only its opacity animates |
| CTA-007 | Text Roll | C | solid-accent, outline-tint | hidden duplicate label; clip on the inner box |
| CTA-008 | Icon Expansion | C | solid-accent, outline | chip grows to fill; host clips it; reduced motion = fill appears |
| CTA-009 | Gradient Shift | B | solid-accent, surface-gradient | fill slides between fill and hover shade (paint-only) |
| CTA-012 | Underline Draw | B | accent-ink, neutral | text CTA, no box; renders a real `<a>` with `href` |
| CTA-013 | Press Depth | B | solid-accent, surface-ink | face moves toward a static offset layer; host never moves |

Eleven CTAs now exist. New component tokens: `glow`, `shadow`, `press-offset`, `chip`, `fg-on-chip`, `link`, `underline-width`, `grad-duration`.

## Evidence
- Conformance on the Master: 4 brands x 11 CTAs x every skin x radius x light/dark x reduced-motion = **1,068 combos, 15,188 checks, 0 errors, 0 warnings**.
- Generated sites for Finova (sharp) and Lifestyle (rounded, dark label on its accent) with all six Wave 2 CTAs in non-default skins both pass the same matrix; the Master stays byte-identical.
- 21 conformance tests, including 6 new mutation tests (leaked duplicate label, broken link, loading link navigating, missing reduced-motion fill, undersized text CTA, press face moving under reduced motion).
- Gallery: 11 components, 44 browser checks; screenshots of all six new CTAs reviewed by eye.

## Defects found by the tooling while building
1. My CSS generator attached a hover+focus suffix to only one of the two selectors, so hover applied rules to the host itself (89 errors on the first run). Fixed and documented (ADR 0003).
2. CTA-008's reduced-motion fallback flipped the label colour without showing the fill: label on its own colour, 1:1. Caught by the pixel contrast check.
3. axe flagged the text-roll duplicate label (`overflow: clip` is not treated as hiding it).
4. Harness: the right-hand contrast strip included the chip's own fill; the link test did not reset the URL hash between steps.

## Not done / open
- **No performance measurement** yet (orbit layer, gradient paint, chip scale of 28x); no visual-regression baselines; Figma still blocked on your file; manifests still say `testing.conformance: none`.
- Wave 2 backlog caveats: CTA-007 and CTA-009 and CTA-013 are feasibility- or inspiration-led, so they still lack a measured reference (BACKLOG says so).
- CTA-008 fills buttons up to roughly 450 px wide (scale cap); wider ones would not be fully covered. CTA-005's orbit layer still assumes an aspect ratio above about 0.4. Neither limit is exercised by tests.
- CTA-012's `href` variant is tested for keyboard, focus and loading, not for `target`/`rel` handling or visited styling.
- Wave 3 (CTA-010 spotlight, CTA-011 magnetic, CTA-014 loading-success morph) not started; platform items P4, P8, P9 and the CTA-002 `arrowMotion` option not started.
- The full conformance run now takes about 3.5 minutes; parallelism is already 4 contexts per target.

## Needs from you
1. Go-ahead for Wave 3, or a different priority (e.g. performance measurement, Figma, Phase 4 categories).
2. The Figma file for S4 and the content-hash decision for the `testing` fields.

## Verification (clean state, 7 min 17 s)
`pnpm check:all`: 83 tests (contracts 9, research 6, tokens 24, lint 9, generator 11, conformance 24), master-lint clean, token gate 16 pairs per brand, S1 192/192, S3 render pass, conformance 15,188 checks 0 errors, gallery 44/44, feasibility sketches 0 failures.
