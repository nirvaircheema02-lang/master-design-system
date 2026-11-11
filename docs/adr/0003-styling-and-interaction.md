# ADR 0003 — Styling and interaction model
Status: accepted. Evidence: spike S1 (192 automated checks + negative control).

- Component CSS is plain CSS in cascade layers, driven by `data-*` attributes and `--ds-<component>-*` variables.
  Tailwind v4 is used for layout in compositions only.
- Interaction classes: **A** token-only · **B** parametric effect module · **C** structurally coupled.
- Shape agnosticism comes from three rules, all verified in S1: host uses `overflow: clip` + `border-radius`;
  every inner layer uses `border-radius: inherit`; radius is one role token (`--ds-cta-radius`).
- Reduced motion means a defined static end state, not slower motion. Verified by `getAnimations()` under emulation.
- **Known exception to the transform/opacity rule:** the animated conic border animates an `@property` angle (paint, not
  compositor). Allowed for small elements; needs a measured perf budget in Phase 2/3.
- Base `.cta` needs `white-space: nowrap` (labels wrapped inside narrow cells in S1).

## Amendments (Phase 3 Wave 1)
- **The `@property` exception is gone.** CTA-005 rotates an oversized conic layer with `transform` (the technique Plaid was
  measured using, Phase 1 REF-004). The layer is clipped by the host (`overflow: clip`), covered by an inset layer whose
  radius is `max(0, host radius - ring width)`. Every animated property in Wave 1 is `transform`, `opacity` or a colour.
- **Layers that are deliberately inset** declare it in the manifest (`constraints.insetLayers`); the harness then expects
  radius = host radius minus the named token, instead of "equal to host".
- **Reduced motion for a revealed layer:** a layer that sweeps in (CTA-004) falls back to appearing by opacity, so no
  `transform` changes. "Static end state" means the state appears, nothing travels.
- **Nothing loops while idle.** Infinite animations run only under hover/focus (CTA-005) or while loading (spinner),
  and stop under reduced motion. Enforced by the harness check `no-infinite-at-rest`.
- **Loading** (P1): `aria-disabled` + `aria-busy`, still focusable, ignores activation, polite `role="status"` text.
- **Hover fills transition** (P2) with `--ds-cta-fade-duration` (150 ms) and `--ds-cta-fade-ease` (the measured market
  standard curve); under reduced motion they are instant.
- Components that handle events are Client Components: every CTA starts with `"use client"` (found by the gallery build).

## Amendments (Phase 3 Wave 2)
- **Press depth moves the FACE, never the host.** CTA-013 draws the fill and label on an inner face element and keeps the
  offset layer static on the host. The host box never transforms, so the hit area, focus ring and layout stay stable.
  (A pseudo layer at `z-index: -1` cannot sit under its own host's background once the host is a stacking context.)
- **A reduced-motion fallback must keep the label readable.** CTA-008 flips its label colour on hover; under reduced
  motion the chip does not grow, so a full-bleed fill now appears by opacity behind the label. Found by the pixel contrast
  check, not by review.
- **Hidden duplicates use `overflow: hidden`**, not `clip` (CTA-007 text roll): axe ignores clipped duplicates only for
  `hidden`. The duplicate stays `aria-hidden`; the harness verifies the accessible name is the label exactly once.
- **Text CTAs have their own target claim** (CTA-012: 32 px, above the WCAG 2.5.8 24 px floor) and render a real `<a>` when
  given `href` (Enter activates, Space does not; a loading link keeps its href but cancels navigation). `a11y.elements`
  in the manifest declares it and the harness tests it.
- **Authoring pitfall:** when a hover rule and a focus-visible rule share a suffix (pseudo-element or child), the suffix
  must be attached to BOTH selectors. Attaching it only to the last one applies the rule to the host on hover.

## Amendments (Phase 3 Wave 3)
- **Pointer-driven effects** (CTA-010, CTA-011) are declared in the manifest (`interaction.js`, `interaction.pointerVars`).
  Rules: JS only writes local custom properties on the host (`--_mx`, `--_tx`...); it ignores `pointerType === "touch"`;
  it checks `prefers-reduced-motion` at event time; it clears its properties on `pointerleave`. All visual change stays in
  CSS (opacity / `translate`). No pointer-driven transform on the host: the magnetic CTA moves its FACE so the hit area
  never flickers.
- **Stateful CTAs are controlled and timer-free** (CTA-014): the caller moves `status` idle -> loading -> success | error.
  The visible label stays in the DOM (fixed width, stable accessible name) and is replaced visually by a spinner, check or
  cross; the result is spoken via a polite live region; `loading` and `success` ignore activation, `error` allows a retry
  (`a11y.inertStates` declares which). A `loading` boolean stays as an alias so the shared loading checks apply.
- Status marks reveal with `clip-path` (allowed property) rather than SVG `stroke-dashoffset`.
