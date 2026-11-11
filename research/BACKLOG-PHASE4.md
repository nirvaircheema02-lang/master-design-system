# Phase 4 backlog — cards, forms, navigation, tabs, accordion, dialog, toast (PROPOSED, awaiting sign-off)

Inputs: `research/inventory/` (now 90 records: 48 new, 85 measured on live pages), `research/MATRIX.md`,
`research/architecture/PHASE4-NOTES.md` (standards), `spikes/s6-headless/RESULTS.json` (Radix vs Base UI), ADR 0004.
Regenerate the matrix with `pnpm research matrix`; validate with `pnpm research validate`.

## What the measurements say (read before the lists)
- **Overlay and state motion is fast and flat.** Stable medians: accordion 150 ms (100-200), dialog 150 ms (100-250), input
  focus 150 ms (150-200), tabs 150 ms, menus 100-400 ms, mobile drawer ~300 ms (150-400), toast 200-500 ms. A 700 ms mega-menu
  fade (Vercel) and 600 ms card zoom (Stripe) are outliers. The existing `duration.fast/quick/base` tokens already cover this;
  **no new motion tokens are needed**, only a `slow` rule for outliers. (Card and header medians in the raw data are dominated by
  a few pages with decorative animations; do not quote them.)
- **Headers:** of 12 measured, 7 stay pinned, 1 hides on scroll (Wise), 2 change background/shadow on scroll, only **2 set
  `scroll-padding-top`** (Linear, Notion). Sticky headers without it risk WCAG 2.4.11. We ship the pairing.
- **Inputs:** label above 8 of 15, placeholder-only 3 (all in library docs demos), aria-only 1 (Vercel login), left 1.
  `autocomplete` tokens are set on production login pages (4 of 4) and mostly absent in library demos.
- **Dialogs:** every library dialog passes focus-in, trap, Escape, focus-return and scroll lock; only Atlassian, Primer and
  Vercel's drawer set `aria-modal` (Radix, Base UI, shadcn do not; outside content is `aria-hidden`).
- **Tabs:** activation models split: automatic (Radix, Next.js docs) vs manual (Base UI, Atlassian, shadcn). Production docs
  (Stripe) ship "tabs" with no tabpanel wiring; one FAQ (Cal.com) uses a `span` as the accordion trigger; Vercel's mobile menu
  is a modal dialog that does not move focus in. Our harness must reject all three.

## Component archetypes (each needs a conformance mode; today the harness knows only "button")
| Archetype | Components | Keyboard model | Core assertions |
|---|---|---|---|
| `card` | CRD-001..004 | one primary link/button; Enter | one primary action named by the heading; no interactive descendants in a whole-card link; focus ring covers the stretched area; hover and focus both present |
| `field` | INP-001, INP-002 | text entry | visible label; `aria-describedby`/`aria-invalid` wiring; error summary focus; values preserved; autocomplete token; focus ring contrast |
| `disclosure` | ACC-001, ACC-002, NAV-005 | Enter/Space | trigger is a real button/summary; heading wrapper (accordion); `aria-expanded` matches visibility; Escape closes (mega menu); no menu roles on site nav |
| `tabs` | TAB-001 | roving tabindex + arrows (+ Home/End) | `activation` declared in the manifest; tab-to-panel wiring; selected state; indicator follows selection |
| `dialog` | DLG-001, DLG-003, NAV-004 | trap + Escape | name; focus in on open; trap (after settling); Escape; focus return; outside inert or `aria-hidden`; scroll lock; exit animation completes; reduced motion |
| `page` | NAV-006, NAV-007, skip link | Tab order | skip link first and visible on focus; sticky header never hides focus (scroll-padding + rectangle check); 320 px reflow; unique nav names |
| `toast` | TST-001 | none / close button | live region exists before the update; focus not moved; critical never auto-dismisses; does not cover focus |

## Backlog by category
Basis: **adapt-ref** = scored reference whose licence allows a clean-room build; **dependency** = verified MIT headless library;
**standards-led** = derived from the standards notes, no measured reference; **inspiration-led** = only inspiration refs.

### Cards (CRD)
| ID | Name | Basis | Class | Notes |
|---|---|---|---|---|
| CRD-001 | Tint card | adapt-ref REF-031 (Phase 1) | A | colour-only surface change |
| CRD-004 | **Stretched-title link card** (default pattern) | adapt-ref REF-080 + standards | A | name = heading text; one primary link; hit area stretched by CSS; focus ring covers the card |
| CRD-002 | Image-zoom card | adapt-ref REF-077 (Stripe) | B | transform on the image only, clipped by radius; use the standard duration, not 600 ms |
| CRD-003 | Hover-reveal card | adapt-ref REF-078 (Awwwards) | B | reveals on `:focus-within` too; essential info always visible (hover-only content fails keyboard and touch) |
| CRD-005 | Stat / metric card | none | A | **gap: no reference captured** |

### Forms (INP, FRM)
| ID | Name | Basis | Class | Notes |
|---|---|---|---|---|
| INP-001 | Text field (label above) | adapt-ref REF-082 (GitHub) | A | focus ring + border; 150 ms transition; autocomplete prop; sizes 32/36/40 |
| INP-002 | **Field wrapper** (label, hint, error, required marker) | standards-led | A | owns the `aria-describedby`/`aria-invalid` wiring, error summary link target, required convention (mark the minority) |
| INP-003 | Textarea + character count | standards-led (GOV.UK) | A | count announced when typing stops; over-limit not blocked |
| INP-004 | Checkbox / radio group / switch | standards-led (APG) | A | fieldset+legend; switch label never changes with state; headless (Radix) |
| INP-005 | Select / combobox | standards-led (APG combobox) | C | headless-led; ARIA table in PHASE4-NOTES; do after INP-001/002 |
| FRM-001 | Error summary | standards-led (GOV.UK, Primer) | A | focus on submit, one link per error, `<title>` prefix |
| **Gap** | Validation and error STATES were not observable by the probe (it never submits forms); all error rules are standards-led and need real fixtures. Date input, OTP, file upload: nothing captured. |

### Navigation (NAV)
| ID | Name | Basis | Class | Notes |
|---|---|---|---|---|
| NAV-001 | Pill-hover nav item | adapt-ref REF-033 (Phase 1) | A | |
| NAV-002 | Indicator-reveal nav item | adapt-ref REF-034 (Phase 1) | B | current page shown without hover |
| NAV-003 | Menu trigger | adapt-ref REF-035 (Phase 1) | A | wraps a disclosure |
| NAV-005 | **Disclosure mega menu** | adapt-ref REF-067 (Notion) | B | button + `aria-expanded` + panel; no menu roles; Escape returns focus; 150-250 ms |
| NAV-004 | Modal navigation drawer | adapt-ref REF-063 (GitHub) + Dialog dependency | C | add role, name, trap, initial focus (Vercel's version omits focus) |
| NAV-006 | Sticky header + `scroll-padding-top` | adapt-ref REF-071 (Vercel) | A | ships the padding token with the header |
| NAV-007 | Hide-on-scroll header | adapt-ref REF-072 (Wise) | B | reappears on focus entering it; hidden state must leave the tab order |
| NAV-008 | Skip link | standards-led (GOV.UK, Carbon, WCAG 2.4.1) | A | first Tab stop; visible on focus; moves focus to `main` |
| NAV-009 | Breadcrumb | standards-led (APG) | A | labelled `nav`, `aria-current="page"` |
| **Gap** | Mobile 320 px reflow, page-set consistency (3.2.3) and skip-link behaviour were not measured on live sites; they need our own page fixtures. |

### Tabs, accordion, dialog, toast
| ID | Name | Basis | Class | Notes |
|---|---|---|---|---|
| TAB-001 | Underline tabs with sliding indicator | adapt-ref REF-043 (Base UI, MIT) on the **Radix adapter** | B | `activation` is an explicit manifest param; indicator from measured width/offset, 150 ms |
| TAB-002 | Segmented pill tabs | inspiration-led (REF-046) | A | no box-shadow animation |
| ACC-002 | Native-details accordion | adapt-ref REF-051 (Notion/Vercel) | A | zero-JS baseline |
| ACC-001 | Animated accordion | adapt-ref REF-050 (Base UI) | C | heading wraps the only button; height via content-height variable; reduced motion = instant |
| DLG-001 | Modal dialog | **dependency** Radix (REF-054) | A | adapter + our CSS keyed on `data-state` (ADR 0004); outside inert/`aria-hidden`, scroll lock, return focus |
| DLG-003 | Dropdown (actions) menu | **dependency** Radix (REF-059) | A | menu roles are correct here (actions, not navigation) |
| DLG-002 | Popover / tooltip | standards-led | A | **gap**: the probe found no Radix popover/tooltip demo to measure; APG tooltip is still work-in-progress |
| TST-001 | Toast | adapt-ref REF-061 (Base UI) | B | live region present before update; critical never auto-dismisses; avoid covering focus |
| **Gap** | Tables (TBL), tooltips, date pickers, pagination, tree views: no research. Carbon accordion/modal demos did not open under the probe. |

## Platform work required before or with the first wave
| # | Item | Why |
|---|---|---|
| P10 | **Headless adapter package** (`@master-ds/headless`): Radix by default, normalising to `data-state`/`data-orientation`/`data-disabled` | ADR 0004; lets a component move to Base UI individually |
| P11 | **Archetype-aware harness** (card, field, disclosure, tabs, dialog, page, toast) + manifest fields `archetype`, `keyboard`, `activation`, `aria` | the harness assumes one button today |
| P12 | **Page fixture** harness (skip link, sticky header vs focus, 320 px reflow, unique nav names) | single-component stage cannot test these |
| P13 | **Elevation, scrim and z-index tokens** (dialog shadow, overlay colour, stacking scale) | the token engine has none; dialogs, menus and toasts need them |
| P14 | **Field tokens** (control height, border, ring, placeholder, error and hint colours; gated contrast) | forms need a component tier like `cta` |
| P15 | **Settle-aware focus tests** and "outside inert OR aria-hidden" (not `aria-modal`) | spike S6 lessons |
| P16 | Real form fixtures to exercise validation/error states (the probe cannot) | rules are only testable with fixtures |

## Status (2026-11-06)
- **Wave A built**: CRD-002/003/004, INP-001, FRM-001, ACC-002, NAV-001/002 + P11 (card/field/summary/disclosure/navitem harness), P13 (elevation/scrim tokens), P14 (field tokens). INP-002 was folded into INP-001. See `docs/PHASE4-WAVEA-REPORT.md`.
- **Wave B built**: TAB-001, ACC-001, NAV-003, DLG-001, DLG-003 + P10 (`@master-ds/headless`) + P15 (settle-aware overlay checks, tabs/dialog/menu/accordion/navmenu archetypes). See `docs/PHASE4-WAVEB-REPORT.md`. NAV-003 was built WITHOUT a headless dependency (a plain disclosure).
- **Wave C built** (all of it): NAV-004 drawer, NAV-005 mega menu, NAV-006 sticky header, NAV-007 hide-on-scroll header, NAV-008 skip link, NAV-009 breadcrumb, TST-001 toast, DLG-002 popover, and TIP-001 tooltip (split out of DLG-002) + P12 (page fixture). See `docs/PHASE4-WAVEC-REPORT.md`. Not started: P16 (form fixtures) and everything in the gaps list (tables, date pickers, pagination, tree views, select/combobox, INP-003..005, CRD-005).

## Proposed waves (design lead to confirm)
1. **Wave A, no headless dependency:** CRD-004, CRD-002, CRD-003, INP-001, INP-002, FRM-001, ACC-002, NAV-001/002. Needs P11 (card, field), P13/P14 (tokens).
2. **Wave B, headless adapter:** TAB-001, ACC-001, DLG-001, DLG-003, NAV-003. Needs P10, P11 (tabs, dialog), P15.
3. **Wave C, page-level:** NAV-004/005/006/007/008/009, TST-001, DLG-002. Needs P12.

## Coverage gaps and caveats
- Blocked or empty: Medium, Product Hunt, Unsplash (403 bot walls, not circumvented); Airbnb, Dribbble, Vercel customers (no card targets); Linear, Notion, Cal.com, Carbon, GOV.UK login/text inputs; Radix popover, tooltip, accordion demos.
- Library demos were measured on their docs pages only; library behaviour was additionally verified in our own spike S6 for tabs and dialog only.
- Probe never types, submits or accepts cookies; state it cannot reach (validation errors, success pages) is unmeasured.
- Standards claims come from model-summarised pages; verify wording at the cited URL before quoting.
- Scores are my judgement against the rubric; licence convention (proprietary/unverified = 2, public-site clean-room = 3) unchanged.

## Sign-off checklist (design lead)
- [ ] Wave order A -> B -> C, or reorder.
- [ ] Stretched-title card as the default card pattern (CRD-004).
- [ ] Radix as the default headless layer (ADR 0004) and `activation` as an explicit param.
- [ ] Approve P10-P16 as Phase 4 platform work.
- [ ] Decide whether to research tables, tooltips/popovers and select/combobox before they are scheduled.
