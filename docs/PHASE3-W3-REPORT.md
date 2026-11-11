# Phase 3 Wave 3 report — CTA-010, CTA-011, CTA-014

Date: 2026-11-06 · local only, nothing committed. Verification numbers at the end.

## Delivered
| ID | Component | Class | Skins | Notes |
|---|---|---|---|---|
| CTA-010 | Spotlight | B + pointer JS | solid-accent, surface-spot | pool of light follows the pointer; blends toward the hover shade so label contrast is guaranteed |
| CTA-011 | Magnetic | B + pointer JS | solid-accent, surface | the FACE leans toward the pointer; the host never moves |
| CTA-014 | Status Morph | C | solid-accent, outline-invert | controlled `status`: label -> spinner -> check or cross; fixed size; result announced; error allows retry |

All 14 backlog CTAs except the open 15th slot now exist. Foundation additions: brand-neutral status colours (`success`, `danger` with gated `on-*` labels), tokens `spot`, `spot-size`, `ok-*`, `err-*`; manifest fields `interaction.js`, `interaction.pointerVars`, `a11y.inertStates`.

**CTA-014 design (the backlog said "design needed first")**: timer-free and controlled; the label stays in the DOM so width and accessible name never change; icon-only visual feedback; `loading`/`success` inert, `error` retryable; live-region text per state. This is my design, not derived from a reference.

## Evidence
- Conformance on the Master: 4 brands x 14 CTAs x every skin x radius x light/dark x reduced-motion; see the numbers below.
- Generated Finova (light label) and Master Yellow (dark label) sites with all three pass the same matrix; the Master stays byte-identical.
- 29 conformance tests, including 8 new mutation tests (reduced-motion ignored by pointer JS, touch drives the effect, stale pointer state, magnetic dead, success accepts activation, error blocks retry, success mark unreadable, spinner loops after success).
- Gallery: 14 components, 49 browser checks including real pointer tracking and the status states; screenshots reviewed by eye.

## Not done / open
- **No performance measurement** (pointer handlers, orbit layer, gradient paint, chip scale); **no visual-regression baselines**; **Figma still blocked** on your file; manifests still say `testing.conformance: none`.
- CTA-010 and CTA-011 still have **no measured reference** (the backlog flagged this); the Motion Primitives magnetic demo could not be measured.
- Magnetic only reacts while the pointer is over the button (no attraction radius outside it); the lean is capped near 10x6 px at strength 1.
- Pointer handlers use synthetic PointerEvents for the touch test; no physical touch device was tried.
- CTA-014 has no auto-reset or timeout by design; callers must move the state. Error text is a generic default.
- The 15th CTA slot, platform items P4 (per-state token table), P8 (real `shadcn build`), P9 (deprecation policy), and the CTA-002 `arrowMotion` option are not started.
- Conformance for 14 CTAs now takes over 4 minutes per full run.

## Needs from you
1. Direction: Phase 4 (cards, nav, forms) needs a research day first (those categories have thin or no references); or measure performance; or Figma/S4.
2. The Figma file for S4 and the content-hash decision for the `testing` fields.

## Verification (clean state, 9 min 4 s)
`pnpm check:all`: 92 tests (contracts 9, research 6, tokens 24, lint 9, generator 11, conformance 33 = 29 harness/mutation + 4 generated-site), master-lint clean, token gate 20 pairs per brand, S1 192/192, S3 render pass, conformance **1,368 combos / 20,168 checks / 0 errors / 0 warnings** (263 s), gallery 49/49, feasibility 0 failures.
