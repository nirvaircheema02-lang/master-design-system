# Phase 3 Wave 1 report — CTA-003, CTA-004, CTA-005 + platform items P1/P2/P3/P7

Date: 2026-11-05 · `pnpm check:all` green from a clean state (~4.5 min, needs Chromium). Local only, nothing committed.

## Delivered
| Item | Result |
|---|---|
| **CTA-003 Solid Fade** (baseline, class A) | skins `solid-accent`, `outline-invert`, `outline-tint`; colour/border fade only |
| **CTA-004 Fill Wipe** (class C) | skins `outline-wipe`, `solid-wipe`; `direction` left/right/top/bottom; reduced motion = fill appears by opacity |
| **CTA-005 Orbit Border** (class C) | skins `solid-accent`, `surface-ring`; a rotating `transform` layer behind an inset cover (replaces the `@property` exception) |
| **P1** loading keeps focus | CTA-001..005: `aria-disabled`+`aria-busy`, focusable, ignores activation, polite live region, spinner stops under reduced motion |
| **P2** hover fill transition | CTA-001..005 use `--ds-cta-fade-*` (150 ms, standard curve); instant under reduced motion |
| **P3** motion tokens | `duration.quick` 200 ms, `orbit`, `spin`; `ease.standard` (the measured market curve), `ease.spring` (`linear()`) |
| **P7** rotating-layer ring | built in CTA-005; ADR 0003 exception removed |
| **P5, P6** (harness) | `no-infinite-at-rest`; pixel-sampled, layer-aware contrast |
| Skins as data | token-keyed `manifest.skins`, generated `skins.css`, lint-verified (ADR 0007) |

## Evidence
- 76 unit/integration tests (contracts 9, research 6, tokens 24, lint 9, generator 11, conformance 17 incl. **15 mutation tests**).
- Conformance: 4 brands × 5 CTAs × every skin × radius × light/dark × reduced-motion = 468 combos, **6,652 checks, 0 errors, 0 warnings**.
- Generated Finova (sharp) and Master Yellow (pill) sites with all five CTAs and non-default skins both pass the same matrix; the Master stays byte-identical.
- Gallery: 5 components, skin picker, loading toggle; 26 browser checks; screenshots reviewed by eye for CTA-003/004/005.
- Token gate: 16 contrast pairs per brand, all pass (added: accent-ink on accent tint, text on raised/sunken surfaces).

## Defects found by the tooling while building (not by review)
1. The new tinted-outline skin failed contrast in dark mode for 3 of 4 brands → the accent tint is now derived to keep its ink readable.
2. CTA-004 moved a layer under reduced motion → falls back to an opacity reveal.
3. Handlers added for loading made every CTA need `"use client"` (Next 15 build error caught by the gallery export).
4. Harness: label overflow false positive from the oversized rotating layer; contrast was blind to layered fills (fixed with pixels).
5. Script races (not product bugs): fills now fade so computed styles must be read after ~260 ms; hydration must finish before driving controls; static-export paths must be URL-decoded.

## Not done / still open
- **No performance measurement** of the rotating layer (raster cost on low-end devices); orbit uses a 250% square, so it assumes the button's aspect ratio is >= ~0.4; tall buttons are untested.
- No visual-regression baselines; no Figma push (S4 still needs your file); manifests still say `testing.conformance: none` (needs the content-hash decision).
- Non-default skins run a reduced radius matrix (default + pill) to keep runtime sane.
- P4 per-state token table, P8 real `shadcn build`, P9 deprecation policy: not started.
- CTA-002 `arrowMotion` (nudge/swap) parameter from the research is not built.
- Wave 2 (CTA-006..009, 012, 013) and Wave 3 (010, 011, 014) not started; five of those still rest on feasibility/inspiration rather than a measured reference.

## Needs from you
1. Wave 2 go-ahead (CTA-006 glow, 007 text roll, 008 icon expansion, 009 gradient shift, 012 underline, 013 press depth).
2. The Figma file for S4, and a decision on whether `testing` fields count in a component's content hash.
