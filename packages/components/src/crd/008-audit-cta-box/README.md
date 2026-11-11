# CRD-008 Audit CTA Box
What: a soft panel for ONE high-intent offer (e.g. a free audit): eyebrow, heading with an optional gradient phrase, text, an action slot (email field + button), a note and a decorative radar. Token family `aud`.
When: a lead-capture offer with one field, near the end of a page. Not for forms with more than two fields.
Props: `eyebrow`, `title`, `highlight` (a phrase inside `title`), `text`, `children` (the action slot), `note`, `coreLabel`, `pills` (max 4), `headingLevel`, `skin`, `design`, `className`.
Designs: `radar` (default, radar first), `mirrored` (radar after the text), `plain` (no radar). Skins: `raised`, `sunken`.
Notes: archetype is `atom` (not `card`): the card harness expects one stretched link, and this box has none. The radar and pills are `aria-hidden`, so nothing important may live in them. The pulse plays once on load (not infinite) so WCAG 2.2.2 needs no pause control; it is removed under reduced motion. The gradient text falls back to a flat accent colour in forced-colors mode.
Slot: the first child of the action slot grows to fill the row (min 13.75rem), so put the input there and the button second. The fixture has no slot content (JSON only); the gallery should pass an INP + CTA pair.
NOT verified: nothing was rendered (tokens are not wired yet); no screen reader, no 320 px / 200 % zoom check by eye, no contrast measurement of pills/core on every brand.
