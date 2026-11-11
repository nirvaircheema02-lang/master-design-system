# ADR 0004 — Headless primitives and motion libraries
Status: **accepted** (2026-11-06). Evidence: spike S6 (`spikes/s6-headless`, `RESULTS.json`): identical Tabs and Dialog built
with Radix Primitives (react-tabs 1.2.1, react-dialog 1.3.1) and Base UI 1.9.0, measured in a real browser.

## Decision
- **Default headless layer: Radix Primitives**, behind an adapter boundary so a component can switch to Base UI individually.
- Our component CSS keys on ONE attribute contract (`data-state="open|closed|active|inactive"`, `data-orientation`,
  `data-disabled`) that the adapter guarantees; it never imports a library's attribute names directly.
- Activation/keyboard modes are **explicit manifest params** (e.g. tabs `activation: automatic | manual`), never library defaults.
- Motion stays CSS-first; the `motion` package only for spring/layout/gesture (unchanged). Never copy Motion+ material.

## What the spike measured
| | Radix | Base UI |
|---|---|---|
| Tabs bundle (min+gzip, react excluded) | 9.7 KB | 13.6 KB |
| Dialog bundle | 14.2 KB | 23.9 KB |
| SSR `renderToString` in Node | works | works |
| Tabs default activation | automatic (selection follows focus) | manual (arrows move focus, Enter/Space select) |
| Tabs roving tabindex | list tabindex 0, tabs -1 | selected tab 0, others -1 |
| `aria-controls` on tabs | present (points at panels that may be unmounted) | only when the panel is mounted |
| State attributes | `data-state` (+ `data-orientation`) | booleans: `data-active`, `data-open`, `data-activation-direction`, `data-starting-style`/`data-ending-style` |
| Dialog: role / name / description | yes / yes / yes | yes / yes / yes |
| Dialog: `aria-modal` | **not set** | **not set** |
| Dialog: outside content hidden | `aria-hidden` on siblings + `pointer-events: none` on body | `aria-hidden` on siblings |
| Dialog: focus in on open, trap (Tab and Shift+Tab), Escape, focus return | all pass | all pass (after settling; see below) |
| Dialog: scroll lock | yes (body `overflow: hidden`) — not stated in Radix docs | yes (body `overflow: hidden`) |
| Dialog: outside click closes, exit animation finishes before unmount, reduced motion exits instantly (with our CSS) | pass | pass |
| Portal target | `body` | a wrapper `div` |

Both libraries pass every behavioural check we tried. The choice is therefore about weight, attribute shape and defaults:
Radix is 30-40% lighter for these two components and already used by the existing Ken design system; Base UI's manual
tab activation and starting/ending-style transitions are attractive, and it is stable at v1.9.

## Consequences and harness lessons
- **Settle after every Tab** in focus-trap tests. Base UI's focus guards hold focus outside the dialog for a moment; without
  a ~60 ms settle the trap looks broken (it is not). Asserted behaviour must be "focus is inside after settling".
- **Modal isolation is asserted as "outside content aria-hidden or inert"**, not `aria-modal` (neither library sets it).
- Radix may leave `aria-controls` pointing at unmounted panels; the harness should flag dangling references per component.
- Per-component re-evaluation stays open: Base UI may win for components where its API is better (tabs indicator CSS
  variables, toast, field). Switching is an adapter change, not a rewrite.

## Amendments (Phase 4 Wave B — the adapter is built)
- **`@master-ds/headless`** (`packages/headless`): four modules (`tabs`, `dialog`, `menu`, `accordion`) plus `scope`, re-exporting
  Radix under OUR part names. Components import only from it; lint rule `headless-boundary` rejects `@radix-ui/*` imports in
  component source and `headless-declared` requires `manifest.headless` to list the modules used. The adapter has Radix only: a
  Base UI implementation of one module has NOT been built, so "switch per component" is still a design claim, not a proof.
- **Copy-in**: a generated site receives `headless/` (only the modules its components declare, plus local imports, an `index.ts`
  and a `package.json` naming the libraries) and a root `package.json` with `"@master-ds/headless": "file:./headless"`. The lock
  records it (`headless.{modules,sourceHash,files}`); `master upgrade` re-copies an untouched adapter and skips an edited one.
- **Explicit activation**: `Tabs.Root` takes a REQUIRED `activation` prop (maps to Radix `activationMode`); TAB-001 exposes it and the
  harness proves manual mode does not select on arrow keys.
- **Defects found in Radix by the harness, handled in the adapter or the component** (none is a reason to leave Radix):
  - After any mouse use, the next Tab lands on the tablist container without forwarding focus, so arrow keys do nothing.
    `Tabs.List` now hands focus from the container to the selected tab.
  - Portalled layers leave the element carrying `data-brand`/`data-mode`, so they lose every token. `useThemeContainer` (from
    `scope.tsx`, re-exported by `dialog` and `menu`) portals into the nearest `[data-brand]` element (or `<body>` when that is `<html>`).
  - Radix modal menus set `aria-hidden` on the trigger, which stays focusable (axe `aria-hidden-focus`). DLG-003 is **non-modal**
    (APG menu button: the page behind is not made inert) and `loop`s. Radix keeps focus inside the menu on Tab instead of closing it;
    APG leaves that optional, so the harness only requires that focus is never stranded behind the menu.
  - Radix Accordion removes `aria-controls` from a closed trigger; the harness asserts the wiring only while open.
  - The measured panel height is normalised to `--_content-height` (a local helper) so component CSS never names a library variable.
- Radix Tabs renders every panel (inactive ones hidden), so `aria-controls` never dangles; the harness warns if that changes.

## Amendments (Phase 4 Wave C)
- Two more adapter modules: `popover` and `tooltip` (Radix Popover, Radix Tooltip with a `Provider` defaulting to 400 ms / 300 ms skip). Both re-export
  `useThemeContainer`; the generator copies them like the others (`HEADLESS_LIBS`), with libraries declared in the site's `headless/package.json`.
- **Defect found in Radix by the harness, handled in the component**: Radix Popover loops Tab inside its focus scope even when it is not modal, so a
  keyboard user could never leave it except with Escape. DLG-002 now treats Tab past the last control (or Shift+Tab before the first) as "leave":
  it closes and focus continues from the trigger.
- NAV-004 (drawer) is a Dialog from the same adapter module as DLG-001 (no new library); NAV-005 (mega menu) has no headless dependency, like NAV-003.
- The tooltip follows WCAG 1.4.13 (hoverable, dismissible, persistent) and is tested for each; Radix passes all three without adaptation.
