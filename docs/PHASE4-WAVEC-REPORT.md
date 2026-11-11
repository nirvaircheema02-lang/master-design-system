# Phase 4 Wave C report — page-level components (page fixture, P12)

Date: 2026-11-06 · local only, nothing committed. Verification numbers at the end.

## Delivered (9 components + the page-fixture harness)
| ID | Component | Archetype | Class | Headless | Notes |
|---|---|---|---|---|---|
| NAV-008 | Skip link | skiplink | A | none | first Tab stop, off-screen but never `display:none`, instant, moves FOCUS to the target |
| NAV-009 | Breadcrumb | breadcrumb | A | none | labelled nav + ordered list, last item `aria-current`, links always underlined, separators not in the accessibility tree |
| NAV-006 | Sticky header | header | A | none | ships the pairing most sites miss: keeps `html` scroll-padding-top = its height (WCAG 2.4.11) |
| NAV-007 | Hide-on-scroll header | header | B | none | hidden = `visibility:hidden`; Tab/Shift+Tab/focus show it BEFORE focus moves |
| TST-001 | Toast stack | toast | B | none | two live regions that always exist; never takes focus; critical never auto-dismisses; timers pause on hover and focus; scroll-padding-bottom |
| NAV-005 | Disclosure mega menu | megamenu | B | none | buttons + panels of grouped links; no menu roles; one panel at a time |
| NAV-004 | Modal navigation drawer | drawer | B | Radix Dialog | side left/right, labelled nav inside, link closes it |
| DLG-002 | Popover (non-modal) | popover | B | Radix Popover | page stays live; Tab at its edges leaves it |
| TIP-001 | Tooltip | tooltip | B | Radix Tooltip | WCAG 1.4.13: hoverable, dismissible, persistent; focus shows it at once |

TIP-001 is split out of the backlog's "DLG-002 popover / tooltip" (they are different patterns).

**P12 page fixture** (`helpers.ts: buildPage`, runners in `archetypes-c.ts` / `archetypes-d.ts`): the component mounts into a tall page with a skip target, 31 sections
of focusable controls, a second labelled nav and a 320 px switch. New page-level checks: first Tab stop, focus never under a sticky header walking BACKWARDS,
anchor jumps land below the header, hidden header is out of the tab order but reachable by keyboard, unique nav names, 320 px reflow, breadcrumb separators,
live regions exist before content and are never re-created, focus returns after a toast is dismissed, nothing focused sits under the toast stack, popover is
NOT modal (page not inert, not scroll-locked) and does not trap Tab, tooltip hover delay / hoverable / Escape.

Adapter: `popover` and `tooltip` modules added to `@master-ds/headless` (generator copies them; `headless/package.json` declares the libraries). Tokens: families
`pop`, `tip`, `tst`; `nav` gained skip/crumb/header/mega/drawer tokens; header density row; 42 contrast pairs per brand.

## Defects found by the work itself (real ones in bold)
- **TST-001: a focused control that is removed fires no blur, so the "pause while focused" state stuck and timers never ran again.** Found by the auto-dismiss check.
- **Radix Popover loops Tab inside its focus scope even when non-modal, so keyboard users could not leave it.** DLG-002 now releases Tab at its edges.
- Radix puts `data-state` on the tooltip TRIGGER too (a `[data-state]` query found the trigger, not the tooltip).
- Harness: the pointer parked at (0,0) is the first header/breadcrumb link; first-combo-only motion probes never ran under reduced motion (hide-on-scroll now checks per combo);
  a skip-link `reveal=always` mode was `position: fixed` and covered the gallery chrome (now static).
- Test quality: 9 mutations first did not fail (the mutation hit a comment, a default prop the fixture overrode, a wrapper that tolerated it, or a handler that Chromium makes redundant);
  each was rewritten until the check demonstrably failed. 59 Wave C mutation tests in total.
- Environment: closing the laptop lid (Clamshell Sleep) froze runs and made tests look hung (900 s durations); a 2.5 s step timeout also flaked once under CPU load (now 4 s).

## Decisions to confirm
- DLG-002 closes on Tab past its last control and continues from the trigger (instead of Radix's looping). It is a deliberate deviation from the library default.
- NAV-005 and NAV-004 follow the research notes: disclosure pattern, never menu roles; drawer is a real modal dialog.
- NAV-006/007 and TST-001 write `scroll-padding-top` / `scroll-padding-bottom` on `<html>` while mounted and remove it on unmount. Pages that set their own value will be overridden.
- The popover is portalled to the end of the brand scope, so Tab from the trigger does not enter it (focus is moved in on open instead).

## Not done / open
- No performance measurement, no visual-regression baselines, Figma (S4) still blocked on your file, manifests still say `testing.conformance: none`.
- No screen-reader testing (live-region announcements, tooltip, popover, drawer).
- Toast has no exit animation and no swipe-to-dismiss; it is controlled by `items` (no imperative `toast()` API or provider).
- Mega menu has no keyboard arrow navigation between triggers (the disclosure pattern does not require it), no hover-intent, and the panel is anchored to the nav's left edge (it does not re-align near the viewport edge).
- Header components do not collapse into the drawer automatically at narrow widths; compose NAV-006/007 with NAV-004 yourself.
- Tooltip does not handle touch (long-press); popover has no arrow and no collision flip tuning beyond Radix defaults.
- The gallery radius control still only overrides the CTA radius variable.
- Still unbuilt from the whole Phase 4 backlog: P16 form fixtures and the gaps list (textarea, checkbox/radio/switch, select/combobox, date picker, pagination, tables, tree views, tabs variant TAB-002, stat card CRD-005).

## Needs from you
1. Look at the preview (gallery) and tell me what to change.
2. Direction: Wave D (forms and data: P16 + INP-003..005, CRD-005, pagination, tables), or performance + visual baselines, or the Figma file for S4.

## Verification (clean state, lid open)
`pnpm check:all` exit 0: 213 tests (contracts 10, headless 6, research 6, tokens 25, lint 9, generator 11, conformance 146 covering the harness, 59 Wave C mutation tests and the generated-site tests),
master-lint clean, token gate 42 pairs per brand with 0 failing, S1 192/192, S3 render pass with the Master unchanged, conformance **4 brands, 3,480 combos, 61,200 checks, 0 errors, 0 warnings** (930 s),
gallery 91/91, feasibility and S6 ran. Wave C generated-site tests (two kits, two brands each) pass.
