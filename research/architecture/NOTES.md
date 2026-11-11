# Design-system architecture references (Phase 1)

Method: official documentation read 2026-11-05 by two research passes; every claim below was read on the named pages.
"Could not verify" means exactly that, never filled from memory. No third-party code or wording is reproduced.
Pages read: m3.material.io (tokens, buttons, accessibility, motion), atlassian.design (tokens, button, accessibility,
release phases), carbondesignsystem.com (themes, button, accessibility, migration FAQ), shopify.dev Polaris web
components, primer.style (primitives, button, accessibility, motion), ui.shadcn.com (theming, registry, registry-item-json,
components.json), radix-ui.com (Primitives styling/composition/accessibility; Themes theme/color/button), base-ui.com
(button, styling, releases), W3C APG button pattern + WCAG 2.2 Understanding pages, open-ui.org press-button explainer.

## What each system teaches (adopt / avoid for a multi-brand platform)
| System | Adopt | Avoid |
|---|---|---|
| Material 3 | Component tokens point to system/reference tokens, never hex. Three classes ref/sys/comp | Shape that morphs on press/select: radius becomes part of the interaction, which breaks brands that change radius |
| Atlassian | A `token()` accessor with lint + codemod so renames survive; published release/deprecation phases | Fallback-value pattern (Atlassian itself discourages it now) |
| Carbon | Token **names never change across themes, only values**; per-variant × per-state token mapping tables; one-major-version deprecation window | Hover/active colours that depend on theme-specific inversion tokens |
| Polaris | Intent props (`variant` + `tone`) instead of colours | Sealing components so no brand layer exists |
| Primer | Pattern tokens carry component + state in the name (`--button-primary-bgColor-hover`); `loading`/`inactive` keep the button focusable with `aria-disabled`; 24×24 minimum; wrap motion in `no-preference` | A theme list that grows by whole colour sets (9 themes) — expensive for many brands |
| shadcn/ui | Registry items can carry `cssVars`, `css`, `registryDependencies`, arbitrary `meta`: brand and metadata ship as data | Init-locked `style`/`baseColor`; versioning only by a `?version=` query (no semver) |
| Radix Primitives | `data-state` attribute convention; `asChild` composition | `asChild` on a non-button without keeping it focusable and keyboard-operable |
| Radix Themes | 12-step role-based scales; nested `Theme` for scoped overrides | A closed prop surface (fixed accent names/sizes) as the only brand lever |
| Base UI | Documented, exported data-attribute / CSS-variable constants per part as a styling contract; stable v1 line | Nothing specific found (its Button docs cover only the disabled state) |
| W3C APG / WCAG 2.2 | Enter+Space activate; 2.5.8 target ≥24px (AA); treat 2.4.13 focus appearance (2px, 3:1, AAA) as the default target | Changing a toggle's label with its state |
| Open UI | Pressed true/false/mixed vocabulary for toggles | Depending on `type="press"`/`:pressed` (not shipped) |

## Cross-system facts
- Only Material states three token tiers outright, and calls its component tier "in development". We already ship T0–T4 and gate it.
- **None** of the five systems documents how a *different company's brand* is applied; Carbon/Primer/Atlassian swap values behind stable names for their own themes. Our brand engine is a genuine gap-filler, not a copy.
- State specification: Material and Carbon give per-state token tables; Atlassian/Primer describe states as props/behaviours.
- **Reduced motion is almost never specified** (Primer and Atlassian mention it; Carbon only says provide alternatives; Material says drop decorative morph/parallax). Our conformance harness is ahead of the references here.
- Atlassian, Primer and Carbon discourage `disabled`; Primer and Atlassian keep a loading button focusable.

## Changes this implies for Master (feeds the backlog)
1. **Loading must keep focus** (found in our own components): CTA-001/002 set `disabled` while `loading`, which removes them from the tab order. Switch to `aria-disabled` + ignore activation, keep focus, announce via a polite live region. Add a conformance check "loading keeps focus".
2. **Per-state token table in the manifest** (Carbon/Material style) instead of a flat `tokens` list, so the gallery/Figma can show each state.
3. **Stop-after-5s rule for infinite animations** at rest (Primer cites it): lint/harness flag any infinite animation not tied to hover/focus.
4. **Token accessor + codemod** for site code (Atlassian pattern) once components reference tokens from site CSS: `master upgrade` already handles file merges; token renames need a codemod channel.
5. **Document intent props**: `variant`/`tone`/skin as the only public styling surface (Polaris/Radix Themes), never colours.
6. **Data-attribute contract per component** (Base UI/Radix): publish `data-state`, `data-size`, `data-loading` as a stable styling API in the manifest.
7. **Registry transport**: shadcn registry-item can carry `cssVars`, `css`, `meta` → our ADR-0001 "shadcn-compatible items" is feasible for tokens+CSS+metadata; semver must be ours (the registry has none). Still to be proven with a real `shadcn build`.
8. **Deprecation policy**: adopt Carbon's rule (deprecated for one full major, removed in the next).

## Could not verify
Material focus-ring spec; Atlassian hover/pressed table and target size; Carbon target size and reduced-motion guidance; Polaris token tiers and states; Primer hover/pressed values and the 3:1 focus figure on the Button page; Radix Themes class/data-attribute naming; shadcn use of cva; Open UI button research page (404); any registry-wide versioning policy.
