# Master Design System: UX, information architecture and workflow plan

Status: P0 to P6 are BUILT (2026-11-11). P6: /patterns shows the 4 starting kits as live compositions (brand switch, "Use this kit", kit file download); /registry.json (all components, variants, styles, props, tokens, usage, brand+kit JSON Schemas, option values, presets) and /llms.txt are static routes in the export; generator test builds all 4 presets on the 4 reference brands and validates. Not in P6: page templates (full layouts), llms.txt inside generated systems. Gallery verify 218/218. Singhtech is a separate design system (its brand and kit files are kept locally, not in this repo). P5 (engine): brand config gained optional `icons {stroke: light|regular|bold, cap: round|square|butt}`, `typeScale: compact|standard|large` (ratio 1.2 / 1.25 / 1.333) and `effects: minimal|subtle|full`; theme emits `--ds-icon-cap`, `--ds-icon-join` and derived font sizes (defaults reproduce today's values; theme.css of existing brands only GAINS the two icon lines, look unchanged); ICN-001 CSS reads cap/join tokens; manifest `discovery.effects` (subtle|full = lowest brand level the component is available at) is set on 15 expressive components (7 full: CTA-002/004/005/007/008/010/011; 8 subtle: CTA-001/006/009/012/013/014, CRD-002/003); `checkEffects` flags like the radius check and the generator refuses. Customise step has Icons, Type scale and Effects level controls with live preview. Tests: contracts 12, tokens 28, generator 13, lint 10; conformance ICN-001/TXT-001/TXT-002 on the 4 brands 0 errors; gallery verify 209/209. NOT covered: conformance on a brand that uses bold/butt/large (only the tokens/generator tests cover those values); other icon sets; icon stroke on components that draw their own inline SVG. P4: `/brands/new` stepper (Explore with 4 starting kits, Select with gaps, Customise with live kit preview + contrast gate + corners/fonts/motion/density, Generate with brand+kit downloads and the command; state in localStorage `master-project-v0`, Save/Open project file). Not in P4: one-click ZIP (static site cannot run the generator), live recolouring of the preview for custom seeds (preview keeps the base theme), icon settings (P5), reorder in Select. Real `master generate` + `validate` on the exported files: 10 components, validate exit 0. Gallery verify 202/202. P3: component page has sticky sub-nav (Preview, Variants, Interactions, Usage, Code, Technical), controls grouped as Component options / Preview as, Usage from discovery, Code shows the live kit instance JSON and the generate command (the forced-state row was NOT built: states are listed only). Gallery verify 186/186. Only the 57 manifests changed in `packages/components` (the optional `discovery` block); no component code, CSS or tokens changed (checked by file time against the P0 start).
Scope: the gallery app (`apps/gallery`) and the small schema additions it needs. The component packages, tokens, harness, generator and lock file are kept as they are unless a phase below says otherwise.

## 1. What exists today (audit)

| Area | Today | Problem for a new user |
|---|---|---|
| Navigation | Left contents: Overview, Foundations, Components (9 groups). Routes: `/`, `/c/[id]`, `/palettes`, `/foundations`, `/system` | No place for Interactions, Patterns or "my brand". The idea of Master vs a site's kit is not explained anywhere |
| Home | 57 cards with technical badges (`class A`, `token-only`, `radius: any`, `alpha`, `conformance none`) | Badges are engineering jargon. No search or filter. Preview is small |
| Component page | Top bar: Brand, Mode, Corner radius, per-prop pickers (`design`, `skin`, `size`...), Add to kit. Then "Customised" vs "Original" stages, a designs strip, a manifest collapsible, a Kit box | `Design` and `Skin` mean nothing to a designer. Brand/Mode/Radius (how to PREVIEW) are mixed with the component's own options. No usage guidance, no code section, the kit box is at the bottom of every page |
| Kit | `Add to kit` stores JSON in browser localStorage (`master-kit-v0`). To build a system you copy `kit.config.json` and run `master generate --brand ... --kit ... --out ...` in a terminal | The workflow ends outside the product. A brand can only be one of 4 reference brands or 35 palettes (colour only); you cannot make your own |
| Brand config (schema) | seeds (primary, secondary, accent, neutral), fonts (sans, display, mono), radiusStrategy, density, motion | Colour, type, radius and motion are covered. **Icons are not** (no setting at all). There is no type-scale choice |
| Kit config (schema) | instances: `ref`, `skin`, `props`, `tokenOverrides` | Good. Already a pure data format that a UI or an AI can write |
| Strong parts | Manifests (single description of each component), skins/designs as data, token engine and contrast gate, 35 palettes, conformance harness, compatibility flags (radius), generator + lock + upgrade, 144 gallery checks | Keep all of it |

## 2. Retain / improve / rename / reorganise

**Retain unchanged:** every component, variant, animation and token; manifests; token engine; palettes; harness; generator, lock and upgrade; the brand/mode/radius preview controls; the sidebar search; the Foundations page; the atomic layer as internal metadata (`lib/atomic.ts`, shown only on the Technical section).

**Improve:** component cards (preview first, three quiet facts), component page (sections, controls grouped), Foundations (add colour, typography and icons sections), kit handling (a global "Brand UI Kit" tray instead of a box at the bottom of each page), Overview (explain Master vs Kit in one picture).

**Rename (user-facing words only; data keys stay):**
| Now | New | Why |
|---|---|---|
| Design (`props.design`) | **Variant** | "Underline / Pill / Segmented tabs" are variants of one component (shadcn and Material use the same word) |
| Skin | **Style** | Filled / Outlined / Ghost colour treatments. Data key `skin` is unchanged, so no manifest or generator change |
| Customised / Original (stages) | **Your brand** / **Master default** | Says what is being compared |
| Kit | **Brand UI Kit** (the draft selection) | A kit is the components one site picked, with brand settings |
| Generated output | **Brand Design System** | The deliverable: code, tokens, lock file, docs |
| `class A/B/C`, `token-only`, `alpha`, `conformance none` | hidden under **Technical** | Engineering detail |
| `/c/[id]` | `/components/[id]` (old URL redirects) | Matches the nav word |
| Atoms / Molecules / Organisms | removed as headings (done); stays as a small tag | |

**Reorganise:** `/system` becomes Overview > How it works; `/palettes` becomes Foundations > Colour; the footer Kit box moves to the global tray.

## 3. Master vs Brand UI Kit (the idea that must be obvious)

```
 MASTER LIBRARY                     BRAND UI KIT                       BRAND DESIGN SYSTEM
 all 57 components,                 the components ONE site            generated package:
 brand-neutral,        select       picked, with that site's  generate  code + tokens + lock + docs,
 never edited          ───────►     colours, fonts, radius,   ───────►  owned by the site,
 (read-only)           customise    icons, interactions                 Master is never changed
```
- One strip with these three boxes sits at the top of Overview and is repeated as a small stepper in the Brand Design Systems workflow.
- A persistent **context chip** in the top bar: `Master Library` (neutral) or `Kit: Finova · 12 components` (brand colour accent). On a component page the primary button reads "Add to Kit" in Master mode and "In your kit · Edit" in Kit mode.
- Master previews use the neutral reference brand by default; "Preview as" lets you try any brand or palette.

## 4. Information architecture

Left navigation, in this order:

1. **Overview**: what Master is, the Master→Kit→Brand Design System picture, the 4-step workflow, stats, How it works (the old `/system`).
2. **Foundations**: Colour (35 palettes), Typography, Spacing, Radius, Elevation, Motion, Icons.
3. **Components**: the 9 groups (Buttons and links, Text, Form controls, Navigation, Tabs and accordions, Menus and overlays, Cards and data, Feedback and status, Icons images and layout).
4. **Interactions**: browse by behaviour, not by shape: Hover and press effects, Pointer-reactive, Reveal and expand, Overlays, Scroll behaviour, Feedback and loading. The same components, filtered by what they DO (CTA effects, spotlight, magnetic, accordion, hide-on-scroll header...).
5. **Patterns**: compositions of existing components (marketing header + hero, form page, data page). Phase 6; until then the entry lists what is planned.
6. **Brand Design Systems**: my kits, the four reference brands as worked examples, and "Create a Brand Design System".

Routes (static export compatible): `/`, `/foundations/[topic]`, `/components` (gallery, filters in the query string), `/components/[id]`, `/interactions`, `/patterns`, `/brands`, `/brands/new` (stepper, state in the browser + query string), `/registry.json` (machine-readable index).

## 5. Component discovery (gallery)

- Header row: search (name, description, tags), **Cmd+K** from anywhere.
- Filters (chips, multi-select, all optional): Category (the 9 groups), Interaction (hover, press, reveal, overlay, scroll, pointer-reactive, none), Has variants, Motion level (static / subtle / expressive), In my kit.
- Grid of cards: large live preview (about 70% of the card), name, one-line description, three quiet facts (`5 variants`, interaction tag, group). No engineering badges.
- Toggle grid / list; sort by name or category.
- Data: needs optional manifest metadata `discovery: { tags[], interaction[], useCases[], avoidWhen[], pairsWith[] }`. It is additive (existing manifests stay valid), is backfilled for all 57 components and reviewed by hand, and feeds search, filters, usage text and later AI.

## 6. Component detail page

Sticky sub-nav: **Preview · Variants · Interactions · Usage · Code · Technical**.

1. **Preview (hero):** large stage. Controls in two labelled clusters so Brand/Mode/Radius are no longer confused with the component's own options:
   - *Component options*: **Variant**, **Style**, size and other props.
   - *Preview as*: Brand, Mode, Corner radius. Unsupported radius stays disabled with the reason (existing compatibility engine).
   - Compare toggle: "Your brand" vs "Master default".
2. **Variants:** every variant side by side (the strip that exists today), click to apply.
3. **Interactions and states:** the states the manifest lists (hover, focus, pressed, loading...) as a small forced-state row, plus a reduced-motion note.
4. **Usage:** when to use, when not to, accessibility notes, pairs well with (from `discovery` and the manifest `a11y`).
5. **Code:** props table, token list, `master add <ID>` and import snippet, kit.config instance JSON for this exact selection.
6. **Technical:** the current manifest table, interaction class, lifecycle, atomic level.

## 7. Brand Design System workflow (Explore → Select → Customise → Generate)

A stepper page at `/brands/new` plus a persistent kit tray (count + open).

1. **Explore:** the gallery. Every card has "Add to Kit". Optional starting presets (Marketing site, SaaS app, Editorial, Dashboard) pre-fill a kit using the existing kit files as the data.
2. **Select:** the kit as a grouped list with previews. Shows dependencies added automatically (headless adapter modules), gaps ("a site usually needs a header, a button and a form field"), remove and reorder.
3. **Customise:** a brand panel with a live mini-page showing the kit in the brand:
   - **Colours:** pick a palette or enter seeds; contrast report must pass (existing gate).
   - **Typography:** sans, display, mono (curated list with a custom field); type-scale preset.
   - **Radius:** the five strategies; compatibility flags shown per component.
   - **Icons:** stroke weight and cap style now; extra icon sets later.
   - **Interactions:** motion personality (calm, standard, lively) and an "effects level" that limits expressive components; per-component variant/style/props.
4. **Generate:** summary (brand, N components, contrast result), then outputs: download `brand.config.json` and `kit.config.json`, copy the exact `master generate ...` command, and in the local dev gallery a one-click ZIP of the generated Brand Design System. The static hosted gallery cannot run the Node generator, so it stops at the two config files and the command.

State model: one versioned "brand project" JSON (`{ brand, kit, step }`) in localStorage, export/import as a file. This is the same two schemas the generator already validates, so nothing new has to be trusted.

## 8. Customisation coverage (your constraint)

| Axis | Today | Needed |
|---|---|---|
| Colours | seeds + 35 palettes | UI to enter seeds; nothing in the engine |
| Typography | `fonts.sans/display/mono` | UI + curated font list + scale preset (additive schema field) |
| Radius | 5 strategies, per-component flags | UI only |
| Icons | none | additive `brand.icons` (stroke weight, cap style) mapped to one icon token family; engine + generator change |
| Interactions | `motion` personality; per-instance variant | additive `brand.effects` level; compat rule that limits class C effects |

## 9. Visual hierarchy rules

- Four text sizes only (page 28, section 18, body 15, caption 13); one accent colour for actions; neutral surfaces.
- 8 px spacing grid; content max width 1120; generous whitespace around previews; borders instead of shadows.
- Cards: preview dominates; metadata is quiet grey text, no badge soup.
- One primary action per screen. Sticky top bar: context chip, search, kit tray.
- Keep it light; no decorative gradients; dark mode only inside previews.

## 10. Scalability for AI

- The UI only edits two validated data files (brand config, kit config); an agent can write the same files.
- Manifests plus the new `discovery` block are the single description of components (search, filters, usage text and recommendations all read it).
- `/registry.json` and `llms.txt` generated at export time list components, variants, styles, tokens and constraints.
- Presets are kit files; "recommend a kit for this brief" later becomes one function returning a kit config.

## 11. Implementation plan (phased; every phase keeps gallery verify green and does not touch component code until Phase 5)

| Phase | Work | Risk | Done when |
|---|---|---|---|
| P0 Words | Rename Design→Variant, Skin→Style, stage labels, hide engineering badges (moved to Technical) | Low | Verify updated and green; labels consistent |
| P1 Structure | New nav (Overview, Foundations, Components, Interactions, Patterns, Brand Design Systems), `/components` routes with redirects, Overview with the Master→Kit→System picture and context chip, empty-state pages for Patterns and Brands | Low | All old URLs still work; no dead links |
| P2 Discovery | `discovery` metadata (schema + backfill 57), gallery with search, filters, Cmd+K, Interactions page driven by the same data | Medium (metadata quality) | Filter and search checks pass; every component tagged |
| P3 Detail page | Section layout, grouped controls, Variants, States, Usage, Code, Technical | Medium | A component page is usable without reading the manifest |
| P4 Brand workflow | Brand project store, Explore→Select→Customise→Generate, brand editor with live kit preview, exports, dev-only ZIP | Higher | A designer makes a brand, picks 8 components and gets a valid generated system that passes `master validate` |
| P5 Engine additions | `brand.icons`, type-scale, `brand.effects`; generator, lock, docs; conformance re-run on 4 brands | Higher (touches engine) | Existing brands generate byte-identical output; new options covered by tests |
| P6 Patterns + AI | Pattern pages, presets, `/registry.json`, `llms.txt` | Medium | Presets generate valid kits |

Recommended order: P0, P1, P2, P3, P4, then P5 and P6. P0 to P2 can be done without any risk to the library.

## 12. Verification approach

- Gallery verify stays the gate (144 checks today) and gains checks per phase (nav contents, filters, redirects, stepper end to end).
- A flow test creates a kit through the UI state, runs `master generate` and `master validate` on the output.
- axe on every new page; keyboard path through the stepper.
- Proof that the library is untouched: hash of `packages/components` and `packages/tokens` before and after P0 to P4.

## 13. Decisions needed from you

1. Words: Variant and Style OK? "Brand UI Kit" for the draft and "Brand Design System" for the generated output OK?
2. Generate: is a local-only one-click ZIP (plus downloadable config files and CLI command) acceptable, or must a hosted site generate?
3. Icons: stroke weight and cap style first, or must alternative icon sets (Lucide, Phosphor) be selectable? That brings licences and bundle size.
4. Patterns: start in this round, or after the brand workflow?
5. Order: go P0 to P4 first, or P4 first (the workflow) because it is the product's main purpose?
