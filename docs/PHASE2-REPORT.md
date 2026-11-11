# Phase 2 report — foundations + walking skeleton

Date: 2026-11-05 · all commands: `pnpm check:all` (≈90 s, needs Chromium). Local only, nothing committed.

## What exists now
| Area | State | Evidence |
|---|---|---|
| Contracts | manifest, brand, kit, lock, compat (`checkRadius`, `RADIUS_ROLES`) | 7 tests |
| Token engine | T0–T4, light/dark, 4 reference brands, T4 overrides, hover polarity, contrast gate (10 pairs/brand) | 24 tests |
| Components | CTA-001 shimmer (class B), CTA-002 sliding arrow (class C) — real, shipped through the full path | lint clean; conformance 0 errors / 0 warnings |
| Lint | 8 rules + manifest⇄CSS⇄token agreement (ADR 0006) | 9 tests |
| Conformance | registry-driven matrix, works on Master or a generated site; 7 mutation tests | 1,576 checks per full run |
| Generator | multi-instance kits, lock, status/upgrade/eject/validate | 11 tests + skeleton test |
| Walking skeleton | 2 CTAs → Finova package → conformance → Master release → merge upgrade → conformance | 1 end-to-end test |
| Gallery shell | Next 15: registry list, live preview, brand/mode/radius/size/skin/label controls, flagged options disabled with reason, original-vs-customised, kit builder → `kit.config.json` (persisted) | 20 browser checks incl. axe |

Blueprint Phase 2 acceptance: "CTA-001 yellow/pill in Master; Finova generated with original shimmer intact; Master files unchanged (hash check); CI green" — met (hash check is asserted in generator + skeleton tests).

## Defects found and fixed by the new tooling (not by review)
1. Hover label contrast 2.75:1 / 4.28:1 for dark-label brands → hover direction now follows label polarity; gate extended.
2. Class-C rule was too strict for CTA-002 (inner clip makes it radius-agnostic) → `constraints.radiusNote` justification required instead.
3. Harness bugs (Tab-after-blur, axe CORS noise, mid-transition probes) → ADR 0006.

## Not done / known gaps (honest list)
- **Phase 1 research has not been run**: no inventory, no scored references, no backlog. Phase 3 needs it.
- **Figma (S4)**: still no write; needs a target file.
- Conformance fixtures are default props at `md` size; `sm`/`lg`, `loading` and long labels are not exercised.
- No visual-regression baselines and **no performance measurement** (animated-border exception from ADR 0003 still unmeasured; CTA set has no animated border yet).
- `testing.conformance` in manifests still says `none`: nothing writes the result back, and `testing` is part of the content hash, so doing it naively would mark every site outdated. Decide hash scope first.
- Gallery: no forced-state toolbar, no viewport toggle, brand choice is per page (not global), component→preview map is hand-written, upgrade does not rebuild tokens when the brand changes, one instance per component per kit.
- `pnpm check:all` depends on Playwright's Chromium; this machine runs it through `PW_CHROMIUM` (cached build 1243).

## Suggested next steps
1. Run Phase 1 research (inventory + scored backlog) — prerequisite for choosing CTA-003+.
2. Unblock S4 with a Figma file.
3. Decide `testing`/hash scope, then write conformance results back to manifests.
4. Phase 3: CTA-003 fill-wipe and CTA-004 animated border from the S1 spike (the border brings the perf budget question).
