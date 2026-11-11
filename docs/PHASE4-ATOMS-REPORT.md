# Phase 4 atoms report — foundation type/space + 13 atoms

Date: 2026-11-08 · local only, nothing committed.

## Foundation added
Primitives: `font-size` (xs..4xl, Major Third), `line-height`, `font-weight`, `tracking`, `space` (1..16). Component families: `type, icon, badge, avt, lay, ldr`. Contrast gate is now 50 pairs per brand; `accent-ink` is computed against the hardest surface. All 35 palettes still pass.

## Atoms (13)
| ID | Atom | Designs |
|---|---|---|
| TXT-001 | Heading | plain, display, bar, rule, eyebrow |
| TXT-002 | Text | body, lead, caption |
| TXT-003 | Link | underline, thick, arrow, bold |
| TXT-004 | Code / kbd | code, kbd |
| ICN-001 | Icon (33 icons) | — |
| BDG-001 | Badge | subtle, solid, outline, dot |
| BDG-002 | Chip (toggle, removable) | outline, filled |
| AVT-001 | Avatar | circle, rounded, square, ring |
| LAY-001 | Divider | solid, dashed, fade, thick |
| LAY-002 / 003 | Container / Stack | — |
| LDR-001 | Spinner | ring, dots, bars |
| LDR-002 | Progress | bar, thin, steps |

## Evidence
- Finova: 348 combos, 2,933 checks, 0 errors.
- 14 atom mutation tests, all pass (icon decorative/labelled, badge interactive, chip pressed/remove name/remove, avatar name/broken image, spinner reduced motion, progress value/fill, link colour-only, heading scale, divider thick).
- Corporate, Lifestyle, Master Yellow: all 13 atoms per brand run one at a time, 39 of 39 runs 0 errors.
- Gallery static export + verify: 127/127 (57 cards, atom checks; the palette gate check was updated 42 to 50 pairs).

## Open
- Atoms have no 5-design variety yet (3-5 each, not per the six-pick standard).
- No screen-reader testing; no atoms kit/generated-site test.
