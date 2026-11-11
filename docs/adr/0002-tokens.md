# ADR 0002 — Tokens: DTCG + Style Dictionary v5, OKLCH engine, `--ds-` prefix
Status: accepted. Evidence: spike S2 (20 token tests, 4 brands, Tailwind v4 compile).

- Source format: DTCG JSON (`$value/$type`). Build: Style Dictionary **5.8** with custom transform + format.
- Tiers: T0 primitive · T1 semantic (light/dark modes) · T2/T3 component · T4 site overrides. Components read T2/T3 only
  (enforced by test today, by lint from Phase 2).
- All emitted variables carry the **`--ds-` prefix**. Reason: Tailwind v4 owns `--color-*`, `--radius-*`, `--font-*`; an
  unprefixed `--color-accent` would collide or create cycles in `@theme inline`. The bridge maps Tailwind names to our vars,
  never the reverse.
- Scope by `[data-brand="slug"]` and `[data-mode="dark"]`, never `:root`, so brands can be previewed side by side.
- Cascade layers declared once: `reset, tokens.primitive, tokens.semantic, tokens.component, components, effects, site-overrides`.
- Colour engine: Culori (OKLCH). The brand's seed hex is preserved **exactly** at the nearest ramp step.
- Roles added after S2: `accent-ink` and `focus`. A brand accent is not automatically usable as text/border/focus
  (yellow on white = 1.5:1). The engine derives a readable ink per mode and the contrast report gates the build.
- Component-tier values may use `color-mix()` over semantic references (e.g. `--ds-cta-shimmer-hl`).

## Amendments (Phase 2)
- **Hover fill follows label polarity.** A white label darkens the fill on hover, a dark label lightens it
  (`pickHover`). The first version always darkened, which dropped dark-label brands (terracotta, yellow) to 2.75:1 / 4.28:1.
  Found by the conformance harness, not by the token gate; the gate now includes `on-accent/accent-hover`.
- **T4 overrides are implemented** (`brand.overrides`): dotted token path, optional `light:`/`dark:` prefix. Unknown
  paths are reported and block generation. Contrast is recomputed from the FINAL values, so an override cannot ship a
  failing pair. Semantic values are resolved literals (not references to T0), so overriding a ramp step does not move the
  accent; override `color.accent.DEFAULT` (and its `on-accent`) instead.
- Component tier now also exposes `--ds-cta-font` and `--ds-cta-focus`, so components never read primitives or semantics.

## Amendments (Phase 3 Wave 3)
- **Status colours are brand-neutral**: `color.success` (#16703c) and `color.danger` (#b3261e) with `on-*` labels, identical in
  every brand and mode, gated at 4.5:1. A site's success/error must read the same whatever its palette.
- **The spotlight pool blends toward the hover shade** (`--ds-cta-spot` = `color.accent.hover`), not toward the label
  colour: the hover shade is already gated to stay readable against the label, so the pool can never break label contrast.
- New component tokens: `spot`, `spot-size`, `ok-bg`, `ok-fg`, `err-bg`, `err-fg`.

## Amendments (Phase 4 Wave A)
- **New semantic tokens:** `elevation.1/2`, `color.scrim` (overlay), `color.border.control` (3:1 against surfaces, for form
  controls), `color.danger-ink`/`color.success-ink` (readable text-weight status colours). Primitive `z` scale added.
- **New component families:** `field`, `card`, `acc`, `nav`, `frm` (alongside `cta`). `css.ts` now emits every declared
  family into `tokens.component`; before, the layer filter was hard-coded to `cta` (found by the first non-CTA component,
  regression test added).
- Contrast gate: 38 pairs per brand (was 20), incl. secondary text on raised/sunken surfaces, ink colours, and
  `border-control` at 3:1.
- Generator radius compat is per component: `cta/card/acc/frm` use the container role, `field/nav` the control role.

## Amendments (Phase 4 Wave B)
- **New component families**: `tab`, `dlg`, `menu`. `nav` gained panel tokens (`panel-bg/border/radius/shadow/padding/min-width`, `trigger-fg`, `z`);
  `acc` gained `expand-duration/ease` (used only by ACC-001). Overlay layers read `{z.overlay}` / `{z.sticky}` through `--ds-dlg-z`, `--ds-menu-z`, `--ds-nav-z`.
- Dialog and menu shadows are component tokens bound to `elevation.1/2` by skins (`raised` vs `outlined`/`flat`).
- Contrast gate: 42 pairs per brand (was 38): `accent-ink` on raised and sunken surfaces at 3:1 (non-text, for the tab indicator).
- Generator radius compatibility roles added: `tab` -> control, `dlg` and `menu` -> container.

## Amendments (Phase 4 Wave C)
- New component family `tst` (toast). `nav` gained `skip-bg/fg/z`, `crumb-fg/current/sep/gap`, `header-bg/border/height/shadow/z/slide-duration/slide-ease`;
  density table gained `hdrH` (3.5 / 4 / 4.5 rem). Overlay-ish layers read `{z.toast}` (skip link, toast) and `{z.sticky}` (headers).
- Generator radius role: `tst` -> container.

## Amendments (Phase 4 Wave C, second part)
- New families `pop` (popover) and `tip` (tooltip; inverse by default via `bg` = text.primary, `fg` = surface.base, so the existing text/surface pair gates it).
  `nav` gained `mega-width/gap/heading` and `drawer-*` (bg, fg, border, width, shadow, scrim, z, enter/exit duration, ease, close-bg-hover).
- Radius roles: `pop` -> container, `tip` -> control.
