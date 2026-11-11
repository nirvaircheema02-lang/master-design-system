# Phase 4 research notes — forms, feedback, overlays, navigation, cards

Method: three research passes read official sources on 2026-11-06 (WCAG 2.2 Understanding pages, WAI-ARIA APG, WAI tutorials,
GOV.UK, Carbon, Primer, Atlassian, Radix, Base UI). "Could not verify" means the page was unreadable or silent. Fetch results
were summarised by a model, so wording is paraphrase; check the cited URL before quoting anything. Reference IDs (REF-###) point
into `research/inventory/`.

## 1. Forms and feedback
| Rule a component must encode | Source | Auto-testable? |
|---|---|---|
| Every control has a visible programmatic label; placeholder is never the label | WCAG 3.3.2, WAI labels, GOV.UK | partly (axe `label` + visible-text diff) |
| Radios/checkboxes grouped with a named `fieldset`/`group` | GOV.UK, APG | yes |
| Required is visible AND coded; one required/optional convention per product (Carbon marks the minority) | WCAG 3.3.2, Primer, Carbon | partly |
| Invalid: `aria-invalid="true"` + `aria-describedby` to an existing error node; remove the reference when the message goes | WCAG 3.3.1, Primer, GOV.UK | yes |
| Error text is text (not colour or icon only) and says how to fix it | WCAG 3.3.1/3.3.3, GOV.UK | partly (exists = yes, quality = manual) |
| Error summary on submit: receives focus, one link per error to the field, same wording as inline, `<title>` prefixed "Error:" | GOV.UK, Primer (3+ errors), WAI | yes |
| Validation timing is a documented prop (GOV.UK: on submit; Carbon: on blur; Primer: submit then re-validate while typing) | GOV.UK, Primer, Carbon | yes |
| Values are preserved after an error; paste is never blocked; codes are not split across boxes | GOV.UK, WCAG 3.3.8 | partly |
| Valid `autocomplete` token on inputs about the user | WCAG 1.3.5, GOV.UK | yes (axe `autocomplete-valid`) |
| Status messages use `role=status` / `alert` in a live region that EXISTS before the update; never move focus; alert only for urgent content | WCAG 4.1.3, APG alert, Atlassian | partly (presence + focus yes, announcement manual) |
| Toast: critical messages never auto-dismiss; close control; pause/extend; does not entirely cover a focused control | Carbon, Atlassian, WCAG 2.4.11 | partly |
| Switch label does not change with state; radio arrows move and check; combobox ARIA (`aria-expanded`, `aria-controls`, `aria-autocomplete`) | APG | yes |
**Not verifiable from the sources read:** any minimum target size for form controls, Primer toast roles/timeouts, Atlassian flag ARIA role.

## 2. Overlays and disclosure (APG + Radix + Base UI docs, then OUR spike S6)
- Tabs: roving tabindex, arrows (+ Home/End), selected tab tied to a labelled panel; automatic activation only when panels show instantly.
- Accordion: heading containing the only button, `aria-expanded` + `aria-controls`; avoid `region` landmarks when many panels.
- Modal dialog: name, focus in, Tab trap, Escape, focus return, outside content inert; initial focus on the least destructive control for destructive dialogs.
- Tooltip is still a work-in-progress APG pattern; focus never moves into it; Escape dismisses.
- Site navigation uses the **disclosure** pattern (`nav` > list > button[aria-expanded] + list), NOT menu/menubar roles.
- Neither library documents reduced motion; that stays our responsibility.

## 3. Navigation
- Labelled `nav` landmarks with unique names; `aria-current="page"`; no `menu`/`menubar` roles on site nav (APG caution).
- Submenus never open merely because focus passes; a link that also has children needs a separate toggle button.
- Bypass: first Tab stop is a skip link, hidden until focused, that moves focus to `main` (GOV.UK, Carbon, WCAG 2.4.1).
- Sticky headers: focus must not be entirely hidden (WCAG 2.4.11, technique `scroll-padding`); that is the only official sticky-header rule found.
- Mobile menu: GOV.UK is an inline disclosure (no focus trap, no Escape, no scroll lock); a MODAL drawer follows the APG modal dialog. Scroll lock is a house rule, not an official one.
- Reflow at 320 px without two-dimensional scrolling (WCAG 1.4.10).

## 4. Cards
- Two conflicting patterns: Carbon wraps the whole clickable tile (named by `aria-label`, no nested controls); NZ gov guidance makes the TITLE the link and stretches its hit area with CSS (name = heading text, allows secondary controls). **We should adopt the stretched-title pattern** as the default (no block-level `<a>` around interactive children) and offer the whole-tile variant only for single-action cards.
- Cards live in a list; consistent heading level; decorative images `alt=""`; repeated secondary actions carry context in their name (GOV.UK summary card).
- Hover and focus both exist; the focus ring covers the whole stretched area.

## 5. What this changes for the harness (it currently assumes "one button")
1. **Pluggable component archetypes**: `button` (today), `field` (input + label + hint + error), `disclosure` (accordion), `tabs`, `dialog`, `nav`, `card`, `toast`. Each declares roles, keyboard model and states in the manifest.
2. **Settle after every Tab** in focus-trap tests: Base UI's focus guards briefly hold focus outside the dialog (found in spike S6).
3. **Modal isolation is asserted as "outside inert OR aria-hidden"**, not `aria-modal`: neither Radix nor Base UI sets `aria-modal`.
4. **Keyboard activation mode is explicit** (tabs: automatic vs manual) and declared in the manifest, never inherited from a library default (Radix automatic, Base UI manual).
5. Field checks: label association, `aria-invalid`/`aria-describedby` wiring, error summary focus, values preserved, autocomplete tokens, validation timing prop.
6. Page-level checks (skip link first, sticky header vs focus, 320 px reflow, unique nav names) need a **page fixture**, not a single-component stage.
7. Still manual: screen-reader output, error wording quality, tab-activation latency feel, hover-delay usability, whether a skip link or drawer is warranted.
