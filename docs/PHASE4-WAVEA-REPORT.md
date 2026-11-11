# Phase 4 Wave A report — cards, text field, error summary, accordion, nav items

Date: 2026-11-06 · local only, nothing committed. Verification numbers at the end.

## Delivered
| ID | Component | Archetype | Class | Notes |
|---|---|---|---|---|
| CRD-004 | Stretched-title card (default card pattern) | card | A | name = heading text; one primary link whose hit area is stretched by `::after`; focus ring on the whole card via `:has(link:focus-visible)` |
| CRD-002 | Image-zoom card | card | B | transform on the image only, clipped by the radius |
| CRD-003 | Hover-reveal card | card | B | reveal panel animates opacity only; shown on `:focus-within`, and always on `(hover: none)` |
| INP-001 | Text field | field | A | label above, hint, error, required/optional marker; owns `aria-describedby`/`aria-invalid` wiring |
| FRM-001 | Error summary | summary | A | focus on mount, one link per error that focuses its field, `document.title` gets an "Error:" prefix |
| ACC-002 | Native-details accordion | disclosure | A | zero-JS `<details>`/`<summary>`, heading inside the summary, optional exclusive mode (`name`) |
| NAV-001 | Pill nav item | navitem | A | real link, `aria-current="page"` shown without hover |
| NAV-002 | Indicator nav item | navitem | B | indicator reveal; current page has a non-colour cue |

Platform work done with it:
- **P11 archetype-aware harness**: card, field, summary, disclosure, navitem runners (`archetypes.ts`, shared `helpers.ts`); manifest fields `archetype`, `fixture`, `a11y.elements`.
- **P13 tokens**: `elevation.1/2`, `color.scrim`, primitive `z` scale.
- **P14 tokens**: component families `field`, `card`, `acc`, `nav`, `frm`; `color.border.control` (3:1), `danger-ink`, `success-ink`. Contrast gate grew from 20 to 38 pairs per brand.
- Generator radius compatibility is now per component (cta/card/acc/frm use the container role, field/nav the control role).
- Wave A kit (`kits/waveA.kit.json`, 8 instances in non-default skins) and a generated-site test.

## Deviations from the backlog (read these)
- **INP-002 (Field wrapper) was not built separately.** INP-001 is self-contained (label, hint, error, marker wiring), so a second component would have duplicated it. INP-002 stays a reserved ID; build it only if a composite control needs to share the wrapper.
- **FRM** was added as a category for FRM-001 (it was in the backlog but not in the contract's category list).
- No headless dependency was needed for Wave A.
- Nav items are items only; the sticky header, skip link and mobile drawer are Wave C.

## Defects found by the work itself
- The CSS builder emitted only the `cta` component family. Every non-CTA component rendered with black text and 20 px controls (754 errors on the first run). Fixed in `css.ts`, regression test added.
- Card title contrast sampled the image (card vertical centre); now sampled at the label's own y-range.
- Gallery home hydration error (React #418) from a card link wrapping previews that contain links (nested `<a>`). Cards are now `<article>` with an inert preview and a stretched link.
- INP-001 forwarded a stray `children` prop to `<input>` (SSR "self-closing tag" error); it now drops it.
- Harness: accordion state read via `checkVisibility()` and the CDP accessibility tree; a runner crash on a broken-link mutation now becomes a `harness-exception` finding.

## Evidence
- 23 archetype mutation tests (each guarded so a non-applying mutation cannot pass): broken label link, error not linked by `aria-describedby`, error link that does not focus its field, whole-card link wrapping controls, missing focus ring on stretched area, hover-only reveal, closed accordion content still visible, `aria-expanded` not exposed, nav item not a real link, no current-page cue, and others.
- Gallery checked in a real browser and by eye: home, CRD-003 hover (Lifestyle), ACC-002 open (Finova), INP-001 focus ring (Master Yellow, dark).

## Not done / open
- **No performance measurement; no visual-regression baselines; Figma (S4) still blocked** on your file; manifests still say `testing.conformance: none`.
- Wave A components have **no screen-reader testing** (announcement of the error summary, status of `<details>` in each AT is manual).
- Validation timing (on submit vs blur) is not modelled; INP-001 shows an error only when the caller passes one. Real submit flows need the P16 form fixtures.
- Only text inputs: no textarea, checkbox, radio, switch, select (INP-003..005).
- CRD-005 (stat card) has no reference and was not built.
- NAV-002 indicator motion is tested for reduced motion, not for how it feels.
- Full conformance now takes about 7 minutes (2,136 combos).
- Carried over: CTA-002 `arrowMotion`, platform items P4/P8/P9, P10 (headless adapter), P12 (page fixture), P15, P16, Waves B and C.

## Needs from you
1. Go-ahead for **Wave B** (TAB-001, ACC-001, DLG-001, DLG-003, NAV-003): needs the Radix adapter (P10) and settle-aware focus tests (P15). ADR 0004 already says Radix is the default.
2. Still open from before: the Figma file for S4, and the content-hash decision for the `testing` fields.

## Verification (clean state)
`pnpm check:all` exit 0: 118 tests (contracts 10, research 6, tokens 25, lint 9, generator 11, conformance 57 incl. 23 archetype mutation tests and the wave A generated-site test), master-lint clean, token gate 38 pairs per brand with 0 failing, S1 192/192, S3 render pass with the Master unchanged, conformance **4 brands, 2,136 combos, 29,784 checks, 0 errors, 0 warnings** (423 s), gallery 68/68, feasibility 0 failures, S6 ran.
