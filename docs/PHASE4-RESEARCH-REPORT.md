# Phase 4 research report — cards, forms, navigation, tabs, accordion, dialog, toast

Date: 2026-11-06 · local only, nothing committed. No components were built; this is the research that gates Phase 4.

## Delivered
| Artifact | What it is |
|---|---|
| `research/architecture/PHASE4-NOTES.md` | forms/feedback, overlay, navigation and card standards (WCAG 2.2, APG, WAI, GOV.UK, Carbon, Primer, Atlassian, Radix, Base UI) with a testable-or-manual rule table and the harness changes they imply |
| `packages/research/src/probe-ui.ts` | probe for input focus, tabs (keyboard model), accordions, overlay triggers (focus in/trap/Escape/return/scroll lock/backdrop), and sticky/hide-on-scroll headers; mobile viewport support |
| `research/inventory/` | **90 records** (was 42): 48 new, **85 measured on live pages**; 24 adapt, 61 inspiration, 5 reject |
| `spikes/s6-headless` | Radix vs Base UI, identical Tabs and Dialog, measured in a browser (behaviour, bundle size, SSR) |
| `docs/adr/0004-headless-and-motion.md` | now **accepted**: Radix default behind an adapter, explicit activation param |
| `research/BACKLOG-PHASE4.md` | archetypes, per-category backlog with IDs and bases, platform items P10-P16, three waves, gaps, sign-off checklist |

Capture: ~89 jobs, 63 usable targets (tabs 9, accordions 6, overlay triggers 20, inputs 10, headers 13, cards 5).

## Findings that change the plan
1. **Headless choice settled by evidence (ADR 0004).** Both libraries pass focus-in, trap, Escape, focus return, scroll lock, outside click, exit animation and reduced motion. Radix is 30-40% lighter (dialog 14.2 vs 23.9 KB gzip). Neither sets `aria-modal`. Defaults differ (Radix tabs activate on focus; Base UI's do not), so activation becomes an explicit manifest param.
2. **The harness needs archetypes.** It assumes one button. Seven archetypes (card, field, disclosure, tabs, dialog, page, toast) each need roles, keyboard model and assertions; page-level rules (skip link, sticky header vs focus, 320 px reflow) need a page fixture.
3. **Sticky headers are an accessibility gap in the wild:** 7 of 12 pinned, only 2 set `scroll-padding-top` (WCAG 2.4.11). We ship the pairing.
4. **Anti-patterns exist in production** and are now recorded as rejects: tabs without panel wiring (Stripe docs), a `span` accordion trigger (Cal.com), a modal drawer that never takes focus (Vercel), an input with no visible label (Vercel login), placeholder-only demos in library docs.
5. **Motion is fast and flat for overlays and state changes** (stable medians ~150 ms; drawers ~300 ms). No new motion tokens needed.
6. **Missing foundations:** no elevation, scrim or z-index tokens and no field token tier; dialogs, menus, toasts and inputs need them (P13, P14).
7. **Card pattern conflict resolved in the notes:** stretched-title link as the default (name = heading text), whole-tile variant only for single-action cards.
8. **A harness flake was found and fixed during verification:** sampling "is the transition still running" at a wall-clock offset raced under load (intermittent `CTA-010 ... did not animate on hover`, 2 of 4 runs). Replaced with `transitionrun`/`animationstart` event counting.

## Not covered (be careful quoting)
- Bot-walled or empty: Medium, Product Hunt, Unsplash (403, not circumvented); Airbnb, Dribbble, Vercel customers; several login/text-input pages; Radix popover/tooltip/accordion demos; Carbon accordion/modal did not open under the probe.
- The probe never types or submits, so **validation, error and success states were not observed**; all error-handling rules are standards-led.
- Library behaviour was verified in our own spike for tabs and dialog only (not accordion, menu, toast, popover).
- Tables, tooltips, date pickers, pagination, tree views, select/combobox: no research.
- Standards pages were summarised by a model; wording is paraphrase. Scores are my judgement; licence convention unchanged.
- Raw screenshots stay git-ignored (internal reference only).

## Needs from you
1. Sign off or amend `research/BACKLOG-PHASE4.md` (wave order, stretched-title card default, Radix default, P10-P16).
2. Decide whether to research tables, tooltips/popovers and select/combobox before they are scheduled.
3. Still open from earlier: the Figma file for S4, performance measurement, and the content-hash decision for manifest `testing`.

## Verification
- `pnpm check` (typecheck, lint, tokens with 20 contrast pairs per brand, research validate on 90 records, unit tests): all green except one intermittent conformance test, which was the flake above.
- After the fix: conformance suite **4 consecutive runs 33/33** (before the fix it failed in 2 of 4 runs), and the full Master matrix **1,368 combos / 20,168 checks / 0 errors / 0 warnings**. Four clean runs lower the odds of residual flakiness; they do not prove it is gone.
- `pnpm spike:s6` runs (RESULTS.json regenerated). I did NOT re-run the gallery export/verify or the Wave 1-3 generated-site checks beyond the conformance suite, because no component, token or gallery code changed this phase; the only code changes were the research package, the new spike and the harness timing fix.
