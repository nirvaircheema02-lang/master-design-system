# Phase 4 Wave B report — tabs, accordion, nav disclosure, dialog, action menu

Date: 2026-11-06 · local only, nothing committed. Verification numbers at the end.

## Delivered
| ID | Component | Archetype | Class | Headless | Notes |
|---|---|---|---|---|---|
| TAB-001 | Underline tabs, sliding indicator | tabs | B | Radix Tabs | `activation` (automatic/manual) is a REQUIRED prop; the indicator is one transform-only line positioned from the measured active tab |
| ACC-001 | Animated accordion | accordion | B | Radix Accordion | heading wraps the only button; single or multiple; panel height animates (declared exception, see below) |
| NAV-003 | Menu trigger | navmenu | B | none | a site-navigation DISCLOSURE (button + aria-expanded + links), never menu roles; opens on activation only |
| DLG-001 | Modal dialog | dialog | B | Radix Dialog | title, description, body, footer, close; fade+scale enter/exit |
| DLG-003 | Dropdown (actions) menu | menu | B | Radix DropdownMenu | role=menu for ACTIONS only; non-modal, loops |

Platform work done with it:
- **P10 headless adapter** `@master-ds/headless`: Radix behind our own part names, one import boundary (lint `headless-boundary` / `headless-declared`), copied into generated sites with a lock entry and `master upgrade` support. ADR 0004 amended.
- **P15 settle-aware overlay checks** and five new archetype runners (tabs, accordion, navmenu, dialog, menu), with 27 mutation tests.
- Tokens: families `tab`, `dlg`, `menu`; `nav` panel tokens; `acc` expand tokens; 42 contrast pairs per brand.
- Manifest: archetypes added, `headless` (adapter modules used) and `interaction.layoutProps` (declared layout animation).
- Wave B kit (`kits/waveB.kit.json`) and a generated-site test (adapter copy, upgrade, missing-adapter refusal).
- Gallery: 5 previews, 79 browser checks.

## Deviations and decisions to confirm
- **Layout animation is now a declared exception.** ACC-001 animates panel `height` (keyframes). The rule "transform/opacity/clip-path only" still holds for everything else; lint allows `height` in keyframes only when the manifest declares `interaction.layoutProps`, and the harness fails any undeclared layout animation. If you would rather ban it, ACC-001 becomes fade+slide with an instant height change.
- **NAV-003 has no headless dependency** (a plain disclosure; Radix has no navigation-disclosure primitive). The backlog assumed an adapter.
- **DLG-003 is non-modal** and loops (Radix's modal menu leaves the focusable trigger `aria-hidden`).
- **Radix Tabs defect handled in the adapter**: after any mouse use, Tab landed on the tablist container and arrow keys did nothing; the adapter hands focus to the selected tab.
- Portalled layers must stay inside the brand scope: `useThemeContainer` portals dialogs/menus into the nearest `[data-brand]` element. A site that puts `data-brand` on a node with `transform`/`filter` breaks `position: fixed` (documented, not guarded).
- The adapter is Radix only. A Base UI version of one module has NOT been built, so per-component switching is still a claim.

## Defects found by the work itself
- Fixture without a current link made NAV-003's current-page checks pass vacuously (now guarded by `fixture-has-current`).
- Radix Accordion drops `aria-controls` while closed; Radix Menu keeps focus in the menu on Tab; Radix Tabs focus stranding (above).
- The gallery's global `h2` rule (unlayered) overrode the dialog title's layered style; scoped to unclassed headings.
- Harness robustness: a stuck overlay used to cascade into every later combo; now each step has a 2.5 s timeout, a stuck overlay is reloaded once and the run aborts on the second with an `overlay-stuck` finding.
- Process: my long runs looked "hung" (900 s durations, mass test timeouts) because the Mac slept while I was idle. Long suites now run under `caffeinate`.

## Not done / open
- No performance measurement; no visual-regression baselines; Figma (S4) still blocked on your file; manifests still say `testing.conformance: none`.
- No screen-reader testing of dialog, menu, tabs and accordion announcements.
- Radix versions are not pinned exactly (caret ranges); the generated site inherits them.
- Menu has no sub-menus, checkbox/radio items or groups with labels in the component (the adapter exports `Label`/`Group`).
- Dialog has no alert-dialog variant, no sheet/drawer, no initial-focus prop; confirm actions are caller-supplied nodes.
- The gallery radius control only overrides the CTA radius variable (existing limitation).
- `master upgrade` for the adapter is all-or-nothing per file (no three-way merge).
- The Phase 1 feasibility probe (`research/feasibility`) is timing-based and failed once in the full run (chip, hover), then passed 3 of 3 reruns; not touched by this wave.
- Wave C (NAV-004..009, TST-001, DLG-002) needs P12 page fixtures; P16 form fixtures, P4/P8/P9 and the CTA-002 `arrowMotion` option are still open.

## Needs from you
1. Confirm the three decisions above (declared height animation, NAV-003 without Radix, non-modal menu).
2. Direction: Wave C (page-level: skip link, sticky header, mobile drawer, toast, popover/tooltip) needs the page-fixture harness first, or performance/visual baselines, or the Figma file for S4.

## Verification (clean state)
Suite re-run under `caffeinate` after the sleep-corrupted runs. `pnpm check:all`: 153 tests (contracts 10, headless 5, research 6, tokens 25, lint 9, generator 11, conformance 87 covering the harness, the mutation tests and the generated-site tests), master-lint clean, token gate 42 pairs per brand with 0 failing, S1 192/192, S3 render pass with the Master unchanged, conformance **4 brands, 2,616 combos, 39,500 checks, 0 errors, 0 warnings** (506 s), gallery 79/79, S6 ran. The feasibility probe failed one hover sample once and passed 3 of 3 reruns.
