# Prioritized component backlog (Phase 1 output — PROPOSED, awaiting design-lead sign-off)

Inputs: `research/inventory/` (42 scored references, 37 measured on live pages), `research/MATRIX.md`,
`research/feasibility/RESULTS.json` (8 next-wave sketches, 0 failures), S1 spike (4 effects), `research/architecture/NOTES.md`,
`research/licenses/register.md`. Regenerate the matrix with `pnpm research matrix`; validate records with `pnpm research validate`.

## How an item earns its place
| Basis | Meaning | May we follow the reference closely? |
|---|---|---|
| **adapt-ref** | A scored reference (rubric ≥ 3.5, no 1 in a11y/perf/licence) whose licence allows a clean-room implementation | Yes, from the observed behaviour only |
| **inspiration-led** | Only inspiration-only refs (proprietary/unverified) or none | No: original implementation of a generic pattern; provenance recorded |
| **feasibility-led** | Proven by our own sketch/spike but no reference was captured | Yes (it is ours), but needs a reference check before Phase 3 sign-off |

## CTA backlog (Top 14 + 1 open slot)
Priority waves follow the blueprint's "4 CTAs first, then expand": Wave 1 completes the pilot gate, Wave 2 is the main expansion, Wave 3 carries JS or state-machine effects.

| ID | Name | Class | Radius | Basis | Evidence | Animated props (perf) | New T3 tokens | Wave |
|---|---|---|---|---|---|---|---|---|
| CTA-001 | Shimmer | B | any | built | Phase 2, REF-001 | transform (compositor) | — | done |
| CTA-002 | Sliding arrow (+ params `arrowMotion: swap \| nudge`, blur-swap option) | C | any (inner clip) | built; refs REF-007/008/009 inspire params | Phase 2 | transform | — | done |
| CTA-003 | ✅ **built (Phase 3 W1)** **Solid fade (baseline)** with skins solid / outline / outline-invert | A | any | adapt-ref REF-002 + 7 fill-fade evidence refs (REF-019..023, 040, 041) | 41 of 109 measured CTAs are colour/opacity-only | background-color, color | — | **1** |
| CTA-004 | ✅ **built (Phase 3 W1)** Fill wipe | C | any (host clip) | inspiration-led (REF-015 invert button) + S1 spike | S1: 192 checks pass | transform | — | **1** |
| CTA-005 | ✅ **built (Phase 3 W1)** Animated border (rotating ring) | C | any, inner cover radius = host − ring | adapt-ref REF-004 (Plaid) | S1 proved the `@property` version; Plaid measured as a **rotate on a pseudo layer** (compositor) | rotate | ring width | **1** |
| CTA-006 ✅ **built (Phase 3 W2)**  | Glow halo (opacity layer) | B | any | adapt-ref REF-005 (Resend) | feasibility `glow`: 134 checks, 0 fail | opacity | `--ds-cta-glow` | 2 |
| CTA-007 ✅ **built (Phase 3 W2)**  | Text roll | C | any (inner clip) | feasibility-led | `roll`: 110 checks, 0 fail; accessible name verified (twin is aria-hidden) | transform | — | 2 (**needs a reference capture**) |
| CTA-008 ✅ **built (Phase 3 W2)**  | Icon expansion | C | any (host clip) | adapt-ref REF-003 (Magic UI, MIT) | `chip`: 134 checks, 0 fail after a reduced-motion bug the check caught | transform, color | `--ds-cta-chip`, `--ds-cta-fg-on-chip` | 2 |
| CTA-009 ✅ **built (Phase 3 W2)**  | Gradient shift (brand ramp) | B | any | inspiration-led (REF-012 rainbow, brand-neutrality 1) | `grad`: 134 checks, 0 fail | background-position (paint) | — | 2 |
| CTA-012 ✅ **built (Phase 3 W2)**  | Underline draw (text link) | B | n/a (no box) | adapt-ref REF-006 (Figma) | `underline`: 62 checks, 0 fail | transform | `--ds-cta-link` | 2 |
| CTA-013 ✅ **built (Phase 3 W2)**  | Press depth (offset layer) | B | any | inspiration-led (REF-014, proprietary: no copying) | `press`: 134 checks, 0 fail | transform | `--ds-cta-shadow` | 2 |
| CTA-010 ✅ **built (Phase 3 W3)**  | Spotlight (cursor) | B + JS | any | feasibility-led | `spot`: 146 checks, 0 fail; JS honours reduced motion | opacity | `--ds-cta-spot` | 3 (**needs a reference capture**) |
| CTA-011 ✅ **built (Phase 3 W3)**  | Magnetic pull | B + JS | any | inspiration-led (REF-018; magnetic motion NOT measured) | `mag`: 122 checks, 0 fail | translate | — | 3 |
| CTA-014 ✅ **built (Phase 3 W3)**  | Loading → success morph | C | any | none | no sketch, no reference | — | — | 3 (**design needed first**) |
| (open) | 15th slot | — | — | — | Attention/pulse CTA candidates were not measurable (Magic UI pulsating demo not isolated) | — | — | research |

Notes
- CTA-003 matters most: **today our CTAs change fill instantly** (no transition). The market norm is 150–300 ms.
- Only B/C effects with a measured source are `adapt-ref`; 5 of 14 are feasibility- or inspiration-led, which Phase 3 sign-off should treat as higher design risk.
- Unmeasured on purpose: Glossier marching ants (square-only), Material shape morph (rejected), rainbow hues (brand-neutrality 1).

## Platform items surfaced by the research (do before or with Wave 1)
| # | Item | Evidence | Where |
|---|---|---|---|
| P1 | ✅ done. **Loading keeps focus**: `aria-disabled` + ignore activation + polite live region; stop setting `disabled` while loading | Primer, Atlassian, Base UI docs; our CTA-001/002 set `disabled` today | components + conformance check "loading keeps focus" |
| P2 | ✅ done. **Hover fill transition** token use: add `background-color` transition (fast) to every fill CTA | measured 109 targets | CTA-001/002/003 |
| P3 | ✅ done (`duration.quick`, `ease.standard`, `ease.spring`). **Motion tokens from data**: durations cluster at 150 ms (39), 200 ms (38), 300 ms (23) of 121; median 200 ms; `cubic-bezier(0.4, 0, 0.2, 1)` is 67 of 121 easings. Add `ease.standard` = that curve and a 200 ms step; add a `spring` easing via `linear()` (REF-010 Framer; check Baseline support) | probe aggregate | token engine |
| P4 | **Per-state token table** in the manifest (Carbon/Material pattern) | architecture notes | contracts |
| P5 | ✅ harness check `no-infinite-at-rest`. **Stop-after-5 s** rule for infinite animations at rest | Primer, WCAG 2.2.2 | lint + harness |
| P6 | ✅ done (pixel-sampled). **Layered-fill contrast**: harness measures host background, so wipe/chip/gradient fills need pixel- or layer-aware contrast | feasibility checker had to special-case gradients | conformance v2 |
| P7 | ✅ done in CTA-005. **Rotating-layer ring** replaces the `@property` angle exception in ADR 0003 | Plaid measured | CTA-005 |
| P8 | Registry transport: prove a real `shadcn build` with `cssVars`/`css`/`meta` | shadcn docs | generator |
| P9 | Deprecation policy: deprecated for one full major, removed in the next (Carbon) | architecture notes | governance doc |

## First-wave candidates in other categories
| Category | Ready (adapt-ref) | Inspiration only | **Gap: no reference captured** |
|---|---|---|---|
| Cards (CRD) | CRD-001 tint card (REF-031) | CRD-002 editorial no-motion card (REF-032) | image-zoom card, lift card, spotlight card, stat card |
| Navigation (NAV) | NAV-001 pill hover (REF-033), NAV-002 indicator reveal (REF-034), NAV-003 menu trigger on a headless primitive (REF-035) | link-fade / colour variants (REF-036, 037, 038) | sticky/hide-on-scroll bar, mobile drawer, mega-menu panel |
| Forms (INP) | — | Base UI / shadcn / Radix Themes for API shape only | **everything**: text field, floating label, validation states, select/combobox, OTP, checkbox/switch (plan: headless-led, Radix or Base UI) |
| Tabs, accordion, dialog, feedback | — | — | **everything**; all headless-led in Phase 4 |

## Coverage gaps (what this research did NOT cover)
- **Luxury/lifestyle**: Aesop, Cartier, NYT, Revolut returned 403 bot walls; I did not work around them. Only Glossier measured, so luxury is under-represented.
- **Library demos**: of 15 library pages attempted, 6 yielded the actual demo components (3 Magic UI, Aceternity button collection, hover-border, Motion Primitives Submit). React Bits demos and several others were not isolable with the probe.
- **Not measurable by the probe**: JS-driven effects (magnetic displacement, spotlight position) and canvas/WebGL; recorded as such.
- **No screen recordings**: probe captured computed styles, Web Animations timing and rest/hover screenshots, not 60 fps video.
- **Reduced-motion counts** in `probe.json` include allowed colour transitions, so they are not evidence that a site violates reduced-motion.
- Screenshots are internal reference only and are git-ignored.

## Sign-off checklist (design lead)
- [ ] Wave 1 = CTA-003, CTA-004, CTA-005 (with P1, P2, P3, P7).
- [ ] Accept or reject the five feasibility/inspiration-led items (CTA-004, 007, 009, 010, 011, 013).
- [ ] Decide whether to spend a research day closing the card/nav/form gaps before Phase 4.
- [ ] Approve P1–P9 as Phase 3 platform work.
