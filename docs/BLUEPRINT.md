# Universal Premium Master Design System — Architecture & Implementation Blueprint

Status: PLANNING ONLY (no code, no Figma). Awaiting approval.
Date: 2026-11-05

## 0. Decisions already locked with the user
| Decision | Choice | Consequence |
|---|---|---|
| Placement | **Separate repo** (not inside Ken workspace) | Own pnpm workspace + CI. Ken `core-v2` is a *source of lessons to copy*, never a dependency. Ken can later become "Brand #0" consumed via the same generator. |
| Delivery to sites | **Copy-in registry + pinned lockfile** (shadcn-style) | Generator emits source into the site repo + `master.lock.json`; `master diff/upgrade` pulls Master changes. Sites own their code. |
| Frameworks (v1) | **React 19 + Next 15 + Tailwind v4 only** | Tokens still emit framework-neutral CSS variables, so other stacks stay possible later. |

---

## 1. Context

Every new site today means rebuilding buttons, cards, nav and their interactions, because our only design system (Ken `core-v2`) is brand-welded. Survey of `core-v2` (see §14) shows why it cannot simply be "re-themed":
- Brand values leak into primitives and components: 237 hex literals and 306 primitive-token references in `.tsx`; **zero** components use the semantic `--cta-bg` / `--accent-primary` layer.
- No brand axis exists (only a `data-variant` light/dark overlay). Token tiers are "2-tier with leakage"; component tier exists only for `--button-*`, and is duplicated (`tokens.json` vs an unlayered `base.css` block that silently wins).
- `Button.tsx` is monolithic (shimmer + glow + ripple + arrow in one file), hardcodes `rgba(176,31,36,…)`, animates `box-shadow` against its own MOTION_SPEC, and its ripple/spinner ignore reduced-motion.
- No gallery (Storybook is a scaffold, 0 stories), no Figma↔code mapping, no component lifecycle tooling beyond JSDoc tags.

Goal: a **platform** (Master Library + token engine + gallery + generator) whose output is a standalone, traceable, brand-specific design system, with the Master never mutated.

---

## 2. Verdict on the proposal (challenges and changes)

The vision is sound. Eight things I would change:

1. **Collapse the six layers into three planes + a pipeline.** Your Layers 2/3/4 overlap (core components vs interaction library vs premium variants are the same artifact seen three ways), and Layer 6 is a process, not a layer. Recommended model:
   - **Plane A — Foundations** (tokens, motion, a11y rules; brand-neutral)
   - **Plane B — Components** (headless behavior + structure + effect modules + skins; permanent IDs)
   - **Plane C — Compositions** (Presets/Kits, page patterns; recommendations only)
   - **Pipeline — Contracts → Registry → Gallery → Generator → Conformance tests** (the part the proposal under-specifies and the part that makes it a platform).
2. **Missing layers:** (a) a machine-readable **Component Contract/manifest schema** (everything else depends on it), (b) a **compatibility engine**, (c) a **conformance test harness** (interaction preserved under brand × radius × mode × reduced-motion), (d) **governance** (deprecation, ID immutability, review gate), (e) **asset/slot policy** (icons, logos, images, fonts and their licenses), (f) logical-property/RTL hooks, (g) performance budgets.
3. **Interactions cannot be a fully independent swap-in layer.** Most "premium" CTA effects are coupled to DOM (sliding arrow needs an icon slot + clip; text-roll needs duplicated label; animated border needs a masked pseudo-layer that depends on radius). Model them as **effect modules with declared requirements**, and keep structurally-coupled ones inside their component (see §5).
4. **Testing is not Phase 7.** The core promise ("interaction survives customization") is a test property. Build the conformance harness in Phase 2 and run it in CI from then on.
5. **Generator is not Phase 6.** The biggest risk is the pipeline, not the 15th CTA. Build a **walking skeleton** (2–4 CTAs → brand config → generated package → lockfile → upgrade) before breadth. Pilot CTA count: start at 4, expand to 12–15 only after the contract survives.
6. **Terminology collision:** Ken already uses "recipes" for page-build specs. Use: **Component** (permanent ID), **Effect module**, **Skin**, **Brand theme**, **Preset** (style starter), **Kit** (a site's selection), **Instance** (configured component in a Kit), **Generated System**.
7. **Figma cannot be a second source of truth for behavior.** Code is the source of truth for tokens + behavior; Figma is a design-time mirror (static states + approximate prototype). Don't promise identical interactive prototypes (§7).
8. **"Distinct, not recolored" needs an enforceable test.** New ID only if DOM structure or interaction logic differs (§6). Everything else is a Skin or prop.

Kept as-is: token pyramid, master immutability, generated-system-per-site, Figma+code dual track, AI-ready metadata, no AI in this phase.

---

## 3. Recommended architecture

```
┌─ Contracts (Zod → JSON Schema): manifest · brand.config · kit.config · lock ─┐
│                                                                              │
│  PLANE A  Foundations     tokens(DTCG) · motion · a11y rules · brand engine  │
│  PLANE B  Components      headless behavior · structure · effect modules ·   │
│                           skins · manifests (CTA-001 …)                      │
│  PLANE C  Compositions    presets · kits · page patterns (recommend only)    │
│                                                                              │
│  Registry (JSON, content-hashed)  ─►  Gallery/Configurator  ─►  Generator   │
│  Conformance harness (Playwright · axe · perf) gates every release           │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Repo layout (new repo)
```
master-ds/
  packages/
    contracts/      Zod schemas → JSON Schema (manifest, brand, kit, lock)
    tokens/         DTCG sources, Style Dictionary build, brand engine, contrast checks
    motion/         easing/duration tokens, effect modules (CSS + tiny JS), reduced-motion rules
    components/     <category>/<ID-slug>/ {Component.tsx, *.css, manifest.json, stories, tests}
    registry/       build step → registry.json (+ shadcn-compatible items), content hashes
    generator/      CLI: generate · diff · upgrade · validate · eject
    lint/           eslint+stylelint rules (no hex, no primitive tokens in components)
  apps/
    gallery/        Next 15 configurator (user-facing selection UI)
    storybook/      dev/test/docs harness
  brands/           reference brands used by tests (yellow-pill, finova, lifestyle, corporate)
  research/         inventory/ (see §11) · licenses/ · NOTICE
  docs/             ADRs, taxonomy, contribution + governance
```

---

## 4. Technology stack (with trade-offs)

| Concern | Recommendation | Why / trade-off | Alternative considered |
|---|---|---|---|
| Monorepo | pnpm workspaces + Turborepo | Team already on pnpm; Turbo adds task caching | Nx (heavier) |
| Language/schemas | TypeScript strict + **Zod** as the single schema source, emitting JSON Schema | One definition → types, validation, docs, and future AI tool schemas | hand-written JSON Schema (drifts) |
| Tokens | **DTCG 2025.10** JSON + **Style Dictionary v5** (custom formats/transforms; one build per brand) | DTCG reached first stable version Oct 2025; SD has first-class DTCG; Ken already uses SD v4 (low learning cost). Verify v5 migration notes in P0 spike | Terrazzo (Cobalt), Tokens Studio as editor |
| Color engine | **Culori** (OKLCH) + contrast checks (WCAG2 + APCA); derive effect colors with CSS `color-mix()` / relative color | Seed color → 12-step scales + `on-*` pairs deterministically; avoids hand-made palettes per brand | Adobe Leonardo (good, adds dependency) |
| Component runtime | React 19, Next 15 App Router compatible (`'use client'` only where interactive) | Matches production stack | — |
| Styling | **Component-scoped plain CSS in cascade layers**, driven by `data-*` attributes and component-tier CSS vars; Tailwind v4 only for layout in compositions | Keyframes, `@property`, pseudo-element layers and masks are awkward in utilities; Ken's arbitrary-value + safelist generator is a drift source. Copy-in is clean (CSS file travels with the component) | Tailwind-utility components (shadcn style) · CSS-in-JS runtime (rejected: RSC + perf) |
| Variant props | small typed `cva`-style helper | Already known to team | — |
| Motion | **CSS-first**; Motion (framer-motion v12 / `motion/react`) only for spring, layout, gestures, scroll-linked | CSS effects are cheaper, theme-safe, SSR-safe. Ken's rule "no GSAP/Lenis" is kept | GSAP (rejected by existing dev-team parity) |
| Headless behavior | Radix primitives (Ken already has ~25) with an adapter boundary; evaluate **Base UI** in P0 | Don't reinvent dialog/tabs/menu a11y. Adapter lets us swap | Ariakit, React Aria |
| Docs/dev harness | **Storybook** (latest stable; verify version in P0) + a11y + Vitest addons | Per-component states, play-function interaction tests, autodocs | Ladle (lighter, fewer addons) |
| User-facing gallery | **Custom Next 15 app** reading registry JSON | Storybook controls can't do brand-level selection, compare, save, "add to kit", flagged-incompatible controls | Storybook-only (insufficient for goal E) |
| Tests | Vitest · Playwright (interaction + visual, run in Docker for font/OS determinism) · @axe-core/playwright · Lighthouse CI | Free and scriptable; Chromatic is optional paid add-on | Chromatic |
| Release/versioning | Changesets + per-component semver in manifest + content hash | Master release train + per-component traceability | — |
| Generator | Node 20+ TS CLI; plain file copy + `ts-morph` only to rewrite import paths; **shadcn registry-item schema as transport** | `npx shadcn add <url>` becomes a free alternate install path. Verify schema fit (`cssVars`, `meta`) in P0 | Yeoman/Plop/Handlebars (poor for TSX) |
| Figma | Variables via Plugin API (our `use_figma` MCP) or Tokens Studio; **Code Connect** for mapping | Confirm Figma plan: Code Connect and REST Variables write need Org/Enterprise (verify) | Manual naming conventions only |

---

## 5. Separation of concerns (the Component Contract)

Every component splits into six artifacts. Only the first two are code; the rest are data.

| # | Artifact | Form | Changes when |
|---|---|---|---|
| 1 | **Structure** — DOM, slots, ARIA, headless behavior | `Component.tsx` | Never for re-branding; major version if changed |
| 2 | **Interaction** — keyframes/transitions/JS hooks | `effect modules` (CSS-first) | New interaction = new ID or declared module |
| 3 | **Skin** — named binding of component slots to semantic tokens (solid, outline, gradient…) | `manifest.skins[]` (data) | Per brand/use |
| 4 | **Token bindings** — component-tier vars (`--cta-bg`, `--cta-radius`, `--cta-shimmer-hl`) | `component.tokens.json` | Rarely |
| 5 | **Responsive** — size/density/breakpoint behavior | manifest + container queries | Per component |
| 6 | **A11y behavior** — focus, keyboard, reduced-motion fallback, contrast pairs | manifest + tests | Never weakened by brand |

### Interaction taxonomy (answers "preset vs coupled")
| Class | Definition | Examples | Rule |
|---|---|---|---|
| **A — Token-only** | Pure appearance, no structure | color, border width, fill, shadow strength | Freely themable |
| **B — Parametric effect module** | Self-contained effect needing a host contract | shimmer sweep, gradient shift, glow halo (opacity layer), spotlight (JS pointer → CSS vars), magnetic pull | Independent module; requires host props (`position:relative; overflow:clip; border-radius:inherit`). Params: duration, ease, angle, intensity |
| **C — Structurally coupled** | Needs specific DOM/shape | sliding arrow (icon slot + clip), text roll (duplicated label, `aria-hidden` twin), icon-expansion (circular chip, radius-coupled), animated conic border (masked layer, radius-sensitive), fill-wipe (inner layer) | Stays inside its Component; manifest declares `requires` and `radiusSupport` |

Stacking multiple effect modules on one component is **deferred to Phase 4** and only for modules that declare `compatibleWith`.

### Radius/shape preservation
All inner layers use `border-radius: inherit`; one role token `--radius-cta` (default `var(--radius-full)` in the Master skin, `0` for Finova). Components declare `radiusSupport: any | square-only | rounded-only | pill-only`; the engine either adapts (e.g., clip-path/mask variant) or **flags** the control as unavailable with the reason.

### Performance and motion rules (fix Ken's drift)
Animate `transform`/`opacity`/`clip-path` only. Glow = pseudo-element opacity, **not** animated `box-shadow`. `will-change` only during interaction. Every component declares `reducedMotion: static-end-state | crossfade | none` and the conformance suite verifies it (spinner and ripple included). Max concurrent animations per Ken's spec (12).

---

## 6. Component taxonomy, IDs, metadata, compatibility, versioning

### Taxonomy
- Category prefixes: `CTA` buttons/links · `INP` inputs/forms · `CRD` cards · `NAV` navigation · `TAB` · `ACC` · `DLG` modals/sheets · `TBL` · `TIP` · `TST` notifications · `LDR` loading/feedback · `RVL` reveal · `SCR` scroll patterns · `LAY` layout · `TXT` text effects · `BGX` background effects · `ICN` icon animations.
- Facets (filterable in gallery): interaction type · coupling class (A/B/C) · tone tags (corporate, playful, editorial, luxury, technical) · radius support · JS required? · perf cost (low/med/high) · reduced-motion strategy.

### ID rules
- `CTA-001` is **permanent and never reused**; slug is an alias (`shimmer`). Retired IDs stay reserved.
- **New ID only if** DOM structure OR interaction logic/keyframes differ. A different color/radius/icon/font/size is a **Skin or prop**, never a new ID.
- Reference format in any generated system: `CTA-001@1.2.0`.

### Manifest (Zod → JSON Schema), illustrative
```json
{
  "id": "CTA-001", "slug": "shimmer", "name": "Shimmer CTA", "category": "CTA",
  "version": "1.0.0", "lifecycle": "stable",
  "description": "...", "inspiration": ["research/inventory/REF-014"],
  "interaction": { "class": "B", "modules": ["shimmer-sweep"], "params": {"duration":700,"ease":"ease-out","angle":105} },
  "slots": { "label": {"required":true}, "iconTrailing": {"required":false} },
  "props": { "size": ["sm","md","lg"], "iconPlacement": ["none","leading","trailing"] },
  "skins": [ { "id":"solid-accent", "bind":{"bg":"color.accent","fg":"color.on-accent"} } ],
  "tokens": ["--cta-bg","--cta-fg","--cta-radius","--cta-shimmer-hl"],
  "constraints": { "radiusSupport":"any", "requiresHost":["overflow:clip","position:relative"], "minContrast":"AA" },
  "states": ["default","hover","focus-visible","active","loading","disabled"],
  "responsive": { "touchTarget":"44px", "hoverFallback":"active-state on coarse pointers" },
  "a11y": { "role":"button|link", "keyboard":["Enter","Space"], "reducedMotion":"static-end-state" },
  "figma": { "fileKey":"…", "nodeId":"…", "mappedVersion":"1.0.0" },
  "code": { "path":"packages/components/cta/001-shimmer", "hash":"sha256:…" },
  "testing": { "conformance":"passed", "a11y":"AA", "visual":"baseline-2026-xx" }
}
```
This covers every metadata field in your §7 list.

### Compatibility engine
Each constraint evaluates to **pass / adapt (auto-substitute) / flag (blocked, with reason)**. The generator refuses a Kit with unresolved flags. Checks: radius vs shape-coupled effect, contrast of every skin × brand (`on-*` pair ≥ AA), required slots present, effect-stack conflicts, mixed radius strategies across the Kit, interaction-budget warning (too many distinct "personalities" on one site).

### Versioning
- Component semver: **major** = DOM/prop/token-contract change; **minor** = new optional prop/skin/param; **patch** = fix.
- Master release = changeset train; registry entries are content-hashed.
- Lifecycle: `alpha → beta → stable → deprecated → removed` (reuses Ken's `COMPONENT_LIFECYCLE` model, but **enforced by schema + CI**, which Ken planned and never built).
- Master Components are immutable for sites: a site gets an **Instance** (`{ref: CTA-001@1.0.0, skin, props, tokenOverrides}`), never an edited copy. Structural customization = `master eject` → site-local component marked `diverged` in the lock (upgrades skip it).

---

## 7. Tokenization strategy

### Tiers
| Tier | Content | Example |
|---|---|---|
| T0 Primitive | Raw scales: OKLCH ramps, space, radius, type, shadow, durations/easings | `color.blue.600` |
| T1 Semantic | Roles + **paired `on-*`** roles; surface/text/border/status; light/dark/high-contrast **modes** (orthogonal axis) | `color.accent`, `color.on-accent` |
| T2 Component-family | Shared by a family (buttons, cards) | `--btn-radius`, `--btn-height` |
| T3 Component/effect | Specific to one component/effect | `--cta-shimmer-hl` (derived via `color-mix` from T1) |
| T4 Brand/site overrides | Intentional deviations, versioned per site | `finova.overrides.json` |

Rules (lint-enforced from day 1): components may reference **T2/T3 only**; no hex/rgba literals in component source; no primitive tokens in components; one source of truth, with CSS/TS/Figma outputs **generated** (kills the Ken `tokens.json` vs unlayered `base.css` duplication).

### Brand Theme Engine inputs → outputs
Inputs: seed colors (primary/secondary/accent + neutral tint), font families/weights, **radius strategy** (`sharp | soft | rounded | pill | mixed`), density, motion personality (`calm | standard | lively` scales durations), optional overrides.
Outputs: T0 ramps (OKLCH), T1 semantic maps per mode, contrast report, `theme.css` (cascade-layered), Tailwind v4 `@theme` bridge (new vs Ken, which never bridged), TS types, Figma variables JSON.
Scope switch: `data-brand` + `data-mode` attributes (extending Ken's `data-variant` idea) → multiple brands can be previewed side by side in the gallery.

### Layer order (one declared order, no unlayered token blocks)
`reset, tokens.primitive, tokens.semantic, tokens.component, components, effects, site-overrides`

Guarantee: changing a site's tokens cannot alter the Master or other sites because sites receive **copies** and the Master has no runtime coupling.

---

## 8. Gallery / configurator UX and playground

### Selection and customization flow
1. **Brand panel (global):** seeds, fonts, radius strategy, density, motion personality. Every preview updates instantly via `data-brand` scope.
2. **Browse:** category and facet filters (interaction type, tone, coupling, radius support, perf).
3. **Component detail:** live preview, forced-state toolbar (hover/focus/active/loading/disabled via `data-force-state`), viewport toggle, reduced-motion toggle, theme/mode toggle, **Original ↔ Customized compare** (two theme scopes side by side).
4. **Controls grouped:** Color roles · Shape · Type · Icon (type/placement) · Size/spacing · Motion params. Controls blocked by constraints are shown disabled with the reason (not hidden).
5. **Override hierarchy** (with "overridden" badges and a diff view): Master default < Brand theme < Kit role override < Instance override.
6. **Save** a named Instance (JSON + shareable URL).
7. **Add to Kit:** Kit view runs consistency checks (mixed radii, contrast failures, interaction budget) → **Generate**.

### Build approach
- **Storybook** = engineering harness (states, play-function interaction tests, a11y, docs, visual baselines). **Gallery app** = designer/PM-facing configurator. Both read the same registry/manifests, so they cannot drift.
- Previews render in a scoped container (not iframe-per-card) with CSS vars on the wrapper; iframe only for the responsive viewport mode.
- State lives in URL + JSON (shareable, reproducible, becomes the generator's `kit.config.json`).

---

## 9. Figma ↔ code synchronization

Principle: **code owns tokens and behavior; Figma mirrors them and owns exploration.**

| Concern | Approach |
|---|---|
| Tokens | DTCG → Figma Variables (collections: Primitive, Semantic w/ light/dark modes, Brand). Generated, one-directional (code → Figma) in v1. Designers propose changes via PR to token source |
| Components | One Figma component set per Component ID; Figma properties mirror manifest `props`/`skins`; naming = `CTA-001 / Shimmer` |
| Mapping | `manifest.figma {fileKey,nodeId,mappedVersion}` + **Code Connect** files (`*.figma.tsx`) pointing at the same props; Storybook links on each |
| Prototype | Static states + Smart-Animate approximation only. The accurate interaction is linked via Gallery/Storybook URL. **We do not claim prototype = production behavior** |
| Drift detection | CI job: Playwright screenshots of default/focus/disabled/hover-**end** states vs Figma exports (`get_screenshot`) with tolerance; motion is *not* auto-compared (reviewed manually per release). Version check: `mappedVersion` vs manifest version fails CI on mismatch |
| Per-site | Generator emits `figma/variables.json`, `figma/component-map.json`, Code Connect stubs, so a Finova Figma file can be seeded |

Spike in P0: one CTA end-to-end (variables push + component + Code Connect) to confirm plan tier and API limits before committing the design.

---

## 10. Website-Specific Generator

### Inputs
`brand.config.json` (name, concept, logo ref, seeds, fonts, radius strategy, density, motion personality) + `kit.config.json` (list of Instances `{ref, skin, props, overrides}`, Preset base optional).

### Pipeline (deterministic, idempotent)
1. Validate configs against JSON Schema.
2. Resolve compatibility (pass/adapt/flag); stop on flags.
3. Build tokens (Style Dictionary per brand) + contrast report.
4. Resolve component dependency graph (effect modules, headless deps).
5. Copy sources (verbatim from registry) + write Instance config; rewrite import paths.
6. Emit docs (usage, tokens, a11y) generated from manifests; Figma mapping files.
7. Write `master.lock.json`; run the site's own conformance subset (`master validate`).

### Export format
```
finova-design-system/
  master.lock.json          ← source of truth for traceability
  brand.config.json  kit.config.json
  tokens/   primitive.json · semantic.light.json · semantic.dark.json · component.json · overrides.json
            build/ theme.css · tailwind-theme.css · tokens.ts · tokens.flat.json
  components/cta-001/  Component.tsx · cta-001.css · instance.ts · manifest.json · stories · tests
  motion/   effect modules used
  docs/     README · per-component usage · tokens · a11y · CHANGELOG
  figma/    variables.json · component-map.json · code-connect/*.figma.tsx
  registry/ registry.json  (shadcn-compatible items)
  package.json  (deps resolved)
```
`master.lock.json` records per component: `id`, `masterVersion`, `sourceHash`, `status: synced|customized|diverged`, token build hash, generator version, timestamp.

### Maintenance
- `master diff` shows what changed in Master since the pinned versions.
- `master upgrade CTA-001` does a three-way merge using the lock's recorded base hash; `diverged` components are skipped with a report.
- `master eject CTA-001` converts an Instance into a site-local fork.
- Result supports further customization without recreating components, and the original Master stays untouched (Finova gets a *configured instance*; CTA-001 stays yellow/pill).

---

## 11. Research & benchmarking method (Phase 1 content)

### Sources (candidates, not dependencies)
Design systems: shadcn/ui, Material, Atlassian, Radix, Base UI, Carbon, Polaris, Primer. Interaction libraries: Aceternity UI, React Bits, Motion Primitives, Magic UI, Motion for React examples. Plus 15–20 premium production sites across fintech/SaaS/editorial/luxury.

### Licensing policy (non-negotiable)
- **Clean-room by default:** record *behavior specs* (states, timings, easings, properties) and implement independently.
- Code reuse only from clearly permissive licenses, with entry in `NOTICE`. Never from paid/Pro components, never proprietary site code or branding.
- Per-source license verified from the primary `LICENSE` file, not secondary sources. Current state: Motion Primitives = MIT (repo); **React Bits license is reported inconsistently (MIT vs MIT + Commons Clause) → inspiration-only until verified from the repo**; Aceternity terms unverified → inspiration-only until read from its site.

### Inventory record (one folder per reference: `research/inventory/REF-###/`)
`ref.yaml` fields: reference name, URL, capture date, screenshot + screen recording (60 fps), category, interaction description, visual traits, states, responsiveness, technical feasibility, customizable properties, coupling class (A/B/C), radius support, a11y notes, perf notes (properties animated, JS needed), **license finding + source**, rubric scores, recommendation (**inspiration / adapt / reject**), proposed Master ID.

### Scoring rubric (1–5 each, weighted)
Distinctiveness · usability · a11y feasibility · performance · themability (color/radius agnostic) · implementation complexity (inverse) · license cleanliness · brand-neutrality. A reference needs ≥ threshold overall **and** no 1 in a/11y, license or perf.

### Initial CTA candidate backlog (to be validated by research)
Shimmer sweep · sliding/swapping arrow · directional fill-wipe · animated conic border · glow halo · text roll/reveal · icon-expansion · gradient shift · spotlight (cursor-follow) · magnetic pull · underline-draw (minimal text) · outline-to-fill · press-depth (offset shadow) · split-label slide · loading→success morph.

---

## 12. Roadmap (re-sequenced), dependencies, acceptance criteria

Estimates assume ~2 engineers + 1 designer; re-baseline at end of Phase 0.

| Phase | Weeks | Depends on | Deliverables | Acceptance criteria |
|---|---|---|---|---|
| **0 Architecture + spikes** | 2 | — | ADRs (stack, styling, headless lib, registry transport, versioning); **5 spikes** (S1 radius-agnostic animated border + shimmer; S2 SD multi-brand + Tailwind v4 `@theme`; S3 generator copy-in + lock + three-way upgrade; S4 Figma variables + Code Connect on one CTA; S5 license audit); repo skeleton + CI | Each spike has pass/fail verdict; stack ADRs signed; Figma plan tier confirmed |
| **1 Research** (overlaps P0 wk 2) | 2 | P0 start | Inventory of ≥40 refs scored; comparison matrix; prioritized backlog (Top 15 CTA + 10 per next category); licensing register | Every shortlisted ref has complete record + license finding; backlog approved |
| **2 Foundations + walking skeleton** | 3 | P0 | `contracts`, token pipeline (T0–T4, modes), brand engine v0, lint rules, conformance harness, gallery shell, **2 CTAs through full path**: brand config → generated package → lock → upgrade | CTA-001 yellow/pill in Master; Finova (blue, radius 0) generated with original shimmer intact; Master files unchanged (hash check); CI green |
| **3 CTA pilot** | 5 | P2 | 4 CTAs first (shimmer, sliding arrow, fill, animated border), then up to 12–15; skins, icon placement, radius support matrix; full states; Figma mapping; gallery previews | Each CTA passes conformance over 4 brands × radius {0, md, full} × {light, dark} × reduced-motion; axe 0 serious/critical; perf budget met; every CTA has manifest + Figma mapping |
| **4 Library expansion** | 8–10 | P3 | Cards, forms/inputs, navigation, tabs, accordions, modals, feedback, then reveal/scroll/layout patterns. ~2 wks per category; re-run contract review after first two categories | Each category meets P3 criteria; stacking of effect modules proven for ≥2 pairs |
| **5 Theme + config engine UI** | 3 | P2 (start), P3 | Brand panel, override hierarchy, save/share instances, compare view | Non-engineer builds a Kit in the gallery and exports a valid config in < 15 min |
| **6 Generator v1** | 4 | P3, P5 | Full CLI (generate/diff/upgrade/validate/eject), docs generation, Figma outputs, shadcn-compatible registry | **3 deliberately different brands** (consulting, fintech, lifestyle) generated; each passes validate; upgrading Master by one minor version propagates cleanly |
| **7 Validation + docs** | 3 (+ continuous from P2) | all | Visual regression baselines, perf analysis, Figma-to-code comparison, release docs, **Master v1.0** | All components stable, lock/semver audit clean, docs complete, sign-off checklist |

Dependency spine: contracts → tokens → lint/harness → components → registry → gallery → generator.

### First vs later
- **First:** contracts, token pipeline + lint, conformance harness, walking skeleton, gallery shell, CTA pilot.
- **Later (keep out of v1 scope):** presets (Layer 5) until ≥3 categories exist; effect stacking beyond 2 pairs; page transitions; scroll-linked layouts (heavy layout coupling); Figma *interactive* prototype parity; full RTL (use logical properties now, verify later); any AI beyond metadata.

---

## 13. Phase 1 execution plan (Research) — ready to start after approval

Run alongside Phase 0 spikes. 10 working days.

| Day | Activity | Output |
|---|---|---|
| 1 | Set up `research/` scaffold, inventory template (`ref.yaml`), rubric spreadsheet/JSON, capture protocol (viewport 1440×900 + 390×844, 60 fps recording, DevTools Animations panel notes) | Template + protocol doc |
| 1–2 | License register: read primary LICENSE/ToS for each source (shadcn, Radix, Base UI, Motion Primitives, React Bits, Aceternity, Magic UI, Motion) | `research/licenses/register.md` |
| 2–5 | Capture CTA references: ≥25 candidates from libraries + ≥10 production sites (record timings, easings, animated properties, DOM structure notes — not source copy) | ≥35 `REF-###` folders |
| 4–6 | Capture design-system architecture references: how Material/Atlassian/Carbon structure tokens, states, a11y, theming; extract patterns relevant to Contract | Architecture notes → feed ADRs |
| 6–7 | Score with rubric; classify coupling class + radius support; recommend inspiration/adapt/reject | Scored matrix |
| 8 | Prototype-feasibility check for the top 20 (quick CSS sketches in a scratch page to verify radius/color independence and perf) | Feasibility column validated |
| 9 | Draft prioritized backlog: Top 15 CTAs with proposed IDs, plus first-wave lists for cards, nav, forms | Backlog v1 |
| 10 | Review with design lead; freeze backlog; update risks | **Approved inventory + backlog** |

Exit criteria: ≥40 scored refs, every adopt/adapt item has a license finding, every Top-15 CTA has coupling class + radius support + a11y/perf notes, backlog signed off.

---

## 14. Evidence from the existing Ken DS (what to copy as lessons, not code)

Reuse conceptually: DTCG + Style Dictionary pipeline shape; cascade-layer ordering idea; `data-variant` scoping (extend to `data-brand`/`data-mode`); MOTION_SPEC durations/rules (700 ms shimmer, transform/opacity only, reduced-motion = final state); lifecycle vocabulary; `verify-css-vars` style gates.

Fix from day 1:
| Ken problem | Master countermeasure |
|---|---|
| Brand red/hex in 237 literals; semantic layer bypassed | Lint: no hex/rgba and no T0 tokens in components; CI-enforced |
| Duplicated `--button-*` (tokens.json vs unlayered base.css wins) | Single source; all CSS generated; no unlayered token blocks |
| Spec vs code drift (6 documented easings, 5 exist) | Motion tokens in DTCG; docs generated from same source |
| Monolithic Button (shimmer+glow+ripple+arrow) | Effect modules + separate components |
| Reduced-motion partial (ripple/spinner unguarded) | Mandatory manifest field + conformance test |
| Animated `box-shadow` despite spec | Lint/perf rule; opacity-layer glow |
| Lifecycle tags planned, never enforced | Schema-validated manifest, CI gate |
| No gallery/Storybook stories, no Figma map | Built in P2/P3, not at the end |

Longer term, "Ken as Brand #0" is the strongest proof of the abstraction: if the Master can regenerate the Ken Button from a brand config, the contract is sound.

---

## 15. Risks and mitigations

| # | Risk | Likelihood/Impact | Mitigation |
|---|---|---|---|
| 1 | Interaction breaks under radius/color changes | High/High | Class A/B/C model, `radiusSupport`, conformance matrix, flagged controls |
| 2 | Over-engineering the platform before proving value | Med/High | Walking skeleton first; ADR-gated scope; 4-CTA gate before 15 |
| 3 | Licensing contamination (React Bits/Aceternity ambiguity) | Med/High | Clean-room policy, primary-source LICENSE reads, NOTICE file, legal check before any code reuse |
| 4 | Figma plan lacks Variables API / Code Connect | Med/Med | P0 spike S4 confirms; fallback = plugin-API push + naming convention |
| 5 | Figma ≠ code drift | High/Med | Code-owns-tokens, `mappedVersion` CI check, static-state screenshot diff |
| 6 | Visual regression flakiness (fonts, OS, animation timing) | High/Med | Docker-based Playwright; deterministic animation snapshots by seeking WAAPI/negative `animation-delay` |
| 7 | Copy-in upgrade conflicts | Med/Med | Lock with base hash, three-way merge, `diverged` state, eject path |
| 8 | Performance debt from many effects | Med/Med | Property whitelist, perf budget per component, cost tag in manifest |
| 9 | A11y regressions from "premium" motion | Med/High | Reduced-motion required, touch/hover fallbacks, axe + keyboard tests in CI |
| 10 | Headless lib maintenance risk (Radix momentum) | Low-Med/Med | Adapter boundary; evaluate Base UI in P0 |
| 11 | Library bloat / inconsistent quality | Med/Med | ID governance, lifecycle, review checklist, deprecation policy |
| 12 | Scope creep into AI/page generation | Med/Med | Explicit non-goal this phase; only metadata readiness |

---

## 16. Maintainability and AI-readiness

Do now (cheap, high leverage):
- Manifests as the **only** description of components (Zod → JSON Schema), with `useCases`, `toneFit`, `visualTraits`, `avoidWhen`, `constraints`, `pairsWith`.
- Generator accepts **config only**, validated by schema. A future AI emits `brand.config` + `kit.config`; it never writes component code, so it cannot invent inconsistent UI.
- Registry exposes list/search/get/validate/generate as plain functions, so a later MCP server is a thin wrapper.
- Generated systems include `AGENTS.md`/`llms.txt` summarizing tokens and usage rules.
- Usage telemetry hooks in the gallery (what gets picked/blocked) → gap analysis later.

Defer: AI brand suggestion, auto-recommendation, website generation, reference-ingestion agents.

---

## 17. Open items (answer before/during Phase 0, none block approval)
1. Figma plan tier (Code Connect / Variables API availability).
2. Team size and calendar to re-baseline the estimates.
3. Hosting for the gallery (internal vs public) and repo/org location.
4. Product name for the Master (affects package scope and `master` CLI name).
5. Whether Ken becomes Brand #0 early (Phase 4) or after v1.

---

## 18. Verification of this plan (what "done" means for Phase 0/2 gate)
- Spike results S1–S5 recorded with pass/fail.
- Walking-skeleton demo: CTA-001 in Master stays yellow/pill (file hash unchanged) while a generated Finova package shows the blue/sharp shimmer CTA; Playwright conformance + axe green; `master upgrade` after a Master patch applies cleanly; `master.lock.json` traces each component to its Master version.
