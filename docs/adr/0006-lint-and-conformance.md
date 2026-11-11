# ADR 0006 — Lint rules and the conformance harness are the contract
Status: accepted. Evidence: Phase 2 (9 lint tests, 8 harness tests incl. 7 mutation tests, 1,576 matrix checks).

## Lint (`packages/lint`, `pnpm lint:ds`)
Rules run on every component folder: `no-literal-color`, `tier-only` (component CSS may read `--ds-<family>-*` only),
`unknown-token`, `token-namespace`, `layer-required` (unlayered CSS beats layered; only `prefers-reduced-motion` may be
unlayered), `motion-properties` (no layout/shadow/`all` transitions; keyframes limited to transform/opacity/clip-path/
registered `--ds-*` properties), `no-animated-shadow`, plus manifest rules and **manifest ⇄ CSS ⇄ token-build agreement**
(a token used but not declared, declared but unused, or not emitted by the build is an error). The allowed token
families are derived from the real token build, not hand-listed.

## Conformance harness (`packages/conformance`, `pnpm conformance`)
Server-renders the REAL component source, links the brand theme + component CSS as a site would, and runs, per
brand × radius × mode × reduced-motion: radius token + inner-layer radius, rendered label/fill contrast (rest and hover),
target size (WCAG 2.5.8 hard, 44px claim as warning), hover affordance, interaction actually runs, reduced-motion = zero
animations and no movement, Tab reachability, focus ring (>=2px, >=3:1), Enter/Space activation, disabled = no motion,
axe, console errors. It can target the Master registry OR a generated site (`--site`).
Seven mutation tests damage a copy of the Master (remove reduced-motion block, remove outline, break radius inheritance,
equal label/fill colour, non-button element, motion while disabled) and assert the harness fails. A harness that cannot
fail proves nothing.

## Harness pitfalls (so nobody re-learns them)
- `blur()` then `Tab` moves focus PAST the element; reset the focus start point with a `tabindex=-1` anchor before it.
- axe reads stylesheets via XHR; on `file://` that logs CORS console errors. CSS is inlined and console collection is
  paused around axe.
- Probe after transitions settle, or a mid-flight transform reads as a failure.

## Amendments (Phase 3 Wave 1)
- The harness now **bundles and mounts the real component with react-dom/client** instead of static markup, so event
  handlers are exercised (loading ignores activation, Enter/Space click counts come from the component's own handler).
- **Contrast is measured from pixels** (padding strips beside the label, both sides, modal colour), not from the host's
  `background-color`. This is what makes transparent hosts, wipe/ring layers and gradients testable (P6). A mutation test
  proves it catches a label/fill failure that exists only on a hover layer.
- New checks: skin matrix (default skin tested with NO attribute), `fill-transition`, `no-infinite-at-rest`,
  `loading-aria`, `loading-status`, `loading-keeps-focus`, `loading-ignores-activation`, `loading-spinner-motion`,
  `inset-layer-radius`; label overflow is measured on the label (an oversized decorative layer inflates `scrollWidth`).
- Components run in parallel (4 browser contexts). 468 combos / 6,652 checks across 4 brands and 5 CTAs.
- Lint additions: generated `skins.css` must match the manifest (`skins-missing`/`skins-stale`); in skins.css semantic
  tokens may be READ but only component tokens may be SET.
- Test-script pitfalls: fills now fade, so read computed colours after ~260 ms; wait for hydration (`networkidle`) before
  driving controls; URL-decode `%5Bid%5D` when serving a static export in-process.

## Amendments (Phase 3 Wave 2)
- Pixel contrast samples a 6 px band immediately beside the label on each side (not the whole padding region), because a
  trailing chip or icon is not the label's background.
- New checks: `accessible-name` (exactly the visible label, once; guards hidden duplicates), `link-variant`, `link-keyboard`,
  `link-loading` (for components that declare `a11y.elements: ["a"]`), and the touch claim is read from each manifest.
- 21 conformance tests, 6 added for these checks, each guarded so a mutation that does not apply cannot pass.

## Amendments (Phase 3 Wave 3)
- Pointer checks (for `interaction.js`): `pointer-tracks`, `pointer-ignores-touch` (a synthetic touch PointerEvent must not
  move the effect), `pointer-reduced-motion`, `pointer-clears-on-leave`. The "does it animate on hover" probe moves the real
  pointer off-centre first, because `hover()` lands on the centre where a magnetic effect has zero displacement.
- Extra-state checks (every manifest state beyond the base set is mounted via the `status` prop): `state-announced`,
  `state-contrast` (pixels), `state-no-infinite`, `state-keeps-focus`, `state-activation` (inert vs retry per
  `a11y.inertStates`), `state-reduced-motion`.
- 29 conformance tests, 8 added for these checks.
- Script pitfall: when writing JS test scripts from the shell, use a quoted heredoc; an unquoted one interpolates `${}`.

## Amendments (Phase 4 Wave A)
- **Archetypes.** The manifest declares `archetype` (`button` default, `card`, `field`, `summary`, `disclosure`, `navitem`);
  `run.ts` dispatches non-button archetypes to `archetypes.ts`, which mounts `fixture {props, children}` with the real
  component. Shared helpers (settle, animation event counting, pixel contrast, bundling) live in `helpers.ts`.
- Card checks: one primary link named by the heading, stretched hit area covers the card, focus ring on the card
  (`:has(link:focus-visible)`), hover-only content is also shown on focus and on touch, title contrast measured at the
  label's own y-range (not the card centre, which samples the image).
- Field checks: label association, hint/error wiring via `aria-describedby`/`aria-invalid`, required marker, focus ring
  contrast, `border-control` 3:1. Error summary: focus on mount, one link per error that moves focus to the field,
  `document.title` prefixed "Error:". Disclosure: `aria-expanded` via the browser accessibility tree (CDP), content hidden
  with `checkVisibility()`. Nav item: real link, `aria-current="page"` cue that is not colour alone.
- Runners wrap each combo in try/catch and report `harness-exception` instead of crashing the matrix.
- 23 archetype mutation tests added; a mutation that does not apply cannot pass.

## Amendments (Phase 4 Wave B)
- **New archetypes**: `tabs`, `accordion` (heading > button + region), `navmenu` (site-nav disclosure), `dialog` (modal), `menu`
  (actions, role=menu). Runners live in `archetypes-b.ts`; shared helpers in `arch-common.ts`. Overlays portal INTO the brand scope
  so their selectors are document-wide.
- **P15 settle-aware overlay checks**: every Tab/Shift+Tab is followed by a ~60 ms settle; modal isolation is "outside is aria-hidden OR
  inert" (never `aria-modal`); scroll lock, focus in, trap both directions, Escape, focus return, outside-click, exit animation that must
  complete (node detached within 2.5 s), page restored after close, axe with the overlay open, theme-scope check (tokens resolve inside).
- **Layout animation is now a declared exception**, not a free-for-all: manifest `interaction.layoutProps` (only `height` today).
  Lint allows `height` in `@keyframes` only for components that declare it; the harness reads every running animation/transition
  (`animatedProps`) and fails `layout-animation-undeclared` for any layout property not declared. ACC-001 is the only user.
- Every runner action has a 4 s default timeout, so a stuck overlay becomes a finding; an overlay left open by a failed step is closed
  (Escape x2) before the next combo; `ratio()` returns 0 for an unparsable colour instead of throwing; harness exceptions carry the
  failing source line.
- 27 Wave B mutation tests (each guarded: a mutation that does not apply fails). One fixture bug found while writing them: NAV-003's
  fixture marked no link current, so the current-page checks passed vacuously; a `fixture-has-current` check now guards that.

## Amendments (Phase 4 Wave C — P12 page fixture)
- **Page archetypes**: `skiplink`, `breadcrumb`, `header`, `toast` mount into `#slot` of a full PAGE (`helpers.ts: buildPage`): a skip target
  (`main#main`, tabindex -1), 31 sections each with a left link and a right button, a second labelled nav ("Footer"), a scrollable window
  and a 320 px viewport switch. `#slot` is `display: contents` so a sticky header is positioned against the whole page (a plain wrapper would
  make its containing block only as tall as the header). Runners live in `archetypes-c.ts`.
- **Page-level rules now tested**: skip link is the FIRST Tab stop, off-screen but never `display:none`, instant, moves focus to the target;
  sticky header keeps `html` scroll-padding-top >= its height and, walking BACKWARDS from deep in the page, no focused control ends up under it
  (WCAG 2.4.11), anchor jumps land below it; hide-on-scroll header is `visibility:hidden` while hidden and Tab/Shift+Tab/focus show it BEFORE focus
  moves; navs on the page have unique names; 320 px reflow without horizontal scroll; breadcrumb separators are not in the accessibility tree;
  toast live regions exist before content and are never re-created, toasts never take focus, critical never auto-dismisses, hover and focus pause
  timers, focus returns after dismissal, and nothing focused sits under the stack.
- Pitfalls found: the pointer parked at (0,0) is ON the first link of a header/breadcrumb (use `park()`); a focused control that is removed fires no
  blur, so "focus inside" must be re-derived from the DOM (a real bug the toast test found: the timer stayed paused forever); page fixtures need their
  own link/button colours or axe fails the FIXTURE in dark mode; some first-combo-only checks never ran under reduced motion, so motion probes that
  matter for reduced motion run per combo.

## Amendments (Phase 4 Wave C, second part)
- Four more page-fixture archetypes: `megamenu`, `drawer`, `popover`, `tooltip` (`archetypes-d.ts`). Popover asserts the OPPOSITE of the modal checks:
  the page behind is NOT aria-hidden/inert and NOT scroll-locked, and keyboard focus is not trapped. Tooltip asserts hover delay, keyboard focus shows
  it immediately, Escape dismisses while focus stays, the pointer can move onto it, it never contains interactive content and never covers its trigger.
- A selector pitfall worth remembering: Radix puts `data-state` on the tooltip TRIGGER as well as its content, so a `[data-state]` query finds the trigger.
- A mutation is only evidence if the test can reach it: removing the mega menu's pointerdown listener changed nothing in Chromium because the blur
  handler also closes it (a click on the page blurs the button), so that mutation removes both.
