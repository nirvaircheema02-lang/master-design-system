# Phase 1 report — research, inventory, backlog

Date: 2026-11-05 · `pnpm check:all` green (includes `pnpm research validate` and `pnpm feasibility`). Local only, nothing committed.

## Exit criteria (blueprint §13) vs what exists
| Criterion | Result |
|---|---|
| ≥ 40 scored references | **42** (`research/inventory/REF-###/ref.yaml`, schema + rubric validated), 37 tied to a live measurement |
| Every adopt/adapt item has a licence finding | Yes, enforced by schema; proprietary/unverified sources cannot be `adapt` |
| Every Top-15 CTA has coupling, radius support, a11y/perf notes | **14 of 15**; slot 15 is open (no measurable attention/pulse reference). 5 of the 14 are feasibility- or inspiration-led, flagged in the backlog |
| Backlog signed off | **Not yet — needs the design lead** (checklist at the end of `research/BACKLOG.md`) |

## What was produced
- `packages/research`: reference schema + weighted rubric (a 1 in a11y/perf/licence = reject), behaviour **probe** (hover timing/easing/properties, pseudo layers, reduced-motion and focus checks; stores no page source), inventory builder/validator/matrix, 6 tests.
- `research/probe`: 65 pages attempted, 49 usable (git-ignored raw data + screenshots, internal reference only).
- `research/inventory`: 42 records. `research/MATRIX.md`: comparison matrix. `research/COVERAGE.json`.
- `research/architecture/NOTES.md`: Material 3, Atlassian, Carbon, Polaris, Primer, shadcn, Radix, Base UI, APG/WCAG, Open UI, read from official docs, with "could not verify" lists.
- `research/feasibility`: 8 next-wave CTA sketches (glow, text roll, icon expansion, gradient shift, spotlight, magnetic, underline draw, press depth): 0 failures, lint-clean; reveals the T3 tokens each needs.
- `research/BACKLOG.md`: Top-14 CTA list in three waves, 9 platform items, first-wave cards/nav/forms, gaps, sign-off checklist.

## Findings that change the plan
1. **Plain fills dominate**: of 109 measured CTAs, 41 only change colour/opacity, 14 move, 13 use paint-heavy tricks. Durations cluster at 150/200/300 ms (median 200 ms); `cubic-bezier(0.4, 0, 0.2, 1)` is 67 of 121 easings. A polished baseline CTA-003 is the highest-value item.
2. **Our CTAs have no fill transition** (verified in source). Add one (platform item P2).
3. **Loading must keep focus** (Primer/Atlassian/Base UI docs); our CTAs set `disabled`, which drops focus (P1).
4. **Animated border**: Plaid rotates a pseudo layer with `transform`, so the `@property` exception in ADR 0003 can likely be removed (P7, to prove in Phase 3).
5. **Box-shadow animation** appears in 5 measured patterns; Master keeps the opacity-layer rule.
6. **Reduced motion is rarely specified** by design systems; our harness is ahead of them.
7. **Feasibility check caught a real sketch bug** (icon-expansion kept a colour transition under reduced motion) and exposed a harness blind spot: layered/gradient fills need layer-aware contrast (P6).

## Not covered (be careful quoting)
- Luxury/lifestyle: Aesop, Cartier, NYT, Revolut blocked with 403; not circumvented. Only Glossier measured.
- Library demos: 6 of 15 pages gave the real demo component; React Bits and others were not isolable.
- JS-driven effects (magnetic, spotlight) can't be measured by the Web Animations probe; recorded as unmeasured.
- Forms, tabs, accordion, dialog, feedback: **no references captured**; cards have 2, nav 6.
- No screen recordings (computed styles + screenshots only).
- Scores are my judgement against the rubric, not a team vote; the licence scoring convention (proprietary/unverified = 2, public-site clean-room = 3) is mine and should be reviewed.
- React Bits and Motion Primitives licence files are still unread (register).

## Needs from you
1. Sign off or amend the backlog (waves, and the five feasibility/inspiration-led items).
2. Decide whether to spend more research on cards/nav/forms and luxury before Phase 4.
3. Figma file for S4 (still open).
