# Singhtech — Brand Design System (Master brand #5)

Source analysed: https://singhtechstudio.com/ (2026-11-10). Config: [`brands/singhtech.json`](../../brands/singhtech.json). Everything below is measured from the live site's CSS variables and computed styles, not guessed.

## 1. What the site is

A digital growth studio (websites, branding, SEO, AI automation). One-page marketing site: cinematic dark hero, then warm off-white sections (services, industries, process, work, testimonials, free-audit CTA band, final CTA).

Voice: plain, outcome-led ("so inquiries actually reach you"). Eyebrow labels in caps (`DESIGN · TECHNOLOGY · GROWTH`, `SERVICES`, `PROCESS`).

## 2. Measured foundations → Master tokens

| Foundation | Site value | Master token | How |
|---|---|---|---|
| Brand | `#6D5CF6` (`--brand`), `#7C6BFF` (`--brand-2`) | `color.accent` ramp | seed `primary` |
| Ink | `#0A0A12` / `#0F0F1C` | `color.surface.base` (dark) | override |
| Page bg | `#FBFBF9` | `color.surface.base` (light) | override |
| Surface | `#F4F4F1` | `color.surface.sunken` | override |
| Card | `#FFFFFF` | `color.surface.raised` | override |
| Text | `#0E0E12`, muted `#6B6B73` | `color.text.primary/secondary` | override |
| Border | `#E7E7E2`, strong `#D3D3CC` | `color.border.subtle/strong` | override (subtle darkened to `#DDDCD6` to pass the divider-visibility gate) |
| Brand soft (icon tile) | `#F1EFFF` | `color.accent.subtle` | engine-derived `#f3f4ff` |
| Cyan `#22D3EE`, WhatsApp `#25D366` | one-off dots / chat button | not tokens | deliberately left out: they are not part of the CTA system |
| Font | Manrope 400–800 | `font.sans` | seed |
| Radius | 5 / 10 / 15 / 20 px, pill 999 | `radius.control 10`, `container 20`, `cta 10`, `full` | override on `rounded` |
| Motion ease | `cubic-bezier(.16,1,.3,1)` | `ease.out` | already in Master |
| Primary CTA | violet fill + glow `0 8px 26px -8px rgba(109,92,246,.6)` | `cta` skins | `effects: full` |

Type in use: H1/H2 ≈ 41px / 600 / tracking −0.035em; H3 18px / 700; body 16.4px / 1.75; small 13–14px; eyebrow 10–11px / 700 / tracking 0.16em caps.

## 3. Differences accepted vs the live site

- Master radius scale has three roles, so the site's 5px chips and 15px cards map to 10px and 20px.
- Hero gradient (`--grad-hero`) and brand gradient (`--grad-brand`) are page-level art, not tokens. Use the dark mode tokens for the hero surface.
- Light/dark in Master are page-wide modes. On the site the dark hero sits inside a light page, so compose it with a dark-mode section wrapper.

## 4. Verification

- `pnpm build:tokens`: 50 contrast checks, 0 failing (light and dark).
- Conformance (full run, 57 components): 1,682 combos / 27,252 checks. One real error class: LAY-001 divider invisible (site border `#e7e7e2` on `#fbfbf9` is under 1.2:1), fixed by setting `light:color.border.subtle` to `#dddcd6`; LAY-001 re-run clean. Other components had 0 errors in the full run. One warning remains: NAV-010 page link 32px < 36px touch claim.
- Gallery: open any component, set Brand = Singhtech.

## 5. Use it

```bash
node --experimental-strip-types packages/generator/src/cli.ts generate --brand brands/singhtech.json --kit kits/<kit>.kit.json --out <dir>
```

## 6. Site parts → Master components (audit 2026-11-11)

Class names read from the live DOM (`hdr-*`, `hsv-*`, `ind-*`, `ptl-*`, `proj-*`, `tq-*`, `audit-*`, `ft-*`). Kit: [`kits/singhtech.kit.json`](../../kits/singhtech.kit.json) (22 Master components; `master generate` + `validate` pass).

### Reuse from Master (take as is, Singhtech brand applied)

| Site part (class) | Master component | Fit |
|---|---|---|
| Header bar (`hdr-wrap`, `hdr-scrolled`) | NAV-006 Sticky Header | good |
| Desktop nav links with pill hover (`nav-a`) | NAV-001 Pill-Hover Nav Item | exact idea |
| Mobile toggle + menu (`mob-toggle`, `mob-menu`) | NAV-003 + NAV-004 Drawer | good |
| Primary violet glow button (`btn-p`) | CTA-006 Glow CTA | good |
| Ghost button (`btn-ghost`) | CTA-003 `outline-invert` | good |
| Eyebrow pill (`eyebrow`, `eyebrow-dk`) | BDG-001 Badge | good |
| Section title / lede (`sec-title`, `sec-p`) | TXT-001 / TXT-002 | good |
| Footer links (`ft-link`) | TXT-003 Link | good |
| Industry card (`ind-card`: image, veil, label, arrow) | CRD-002 Image-Zoom Card | close, check veil + arrow |
| Service card (`hsv-card`: title, text, tick list, link) | CRD-004 Stretched-Title Link Card | partial: no tick list slot |
| Testimonial avatar (`tq-avatar`) | AVT-001 | good |
| Audit email field (`audit-form .inp`) | INP-001 + FRM-001 | good |
| Footer divider, layout wrap | LAY-001 / LAY-002 / LAY-003 | good |
| Icons (`sw`, arrows, ticks) | ICN-001 | check icon set covers all |

### Missing in Master (the site's own components; build as new Master components so every brand gets them)

| Site part | Why Master cannot cover it | Proposed id |
|---|---|---|
| Section header block (`reveal-head`: eyebrow + title with rotating/highlight word + lede) | molecule, only atoms exist | molecule: SectionHeader |
| Rotating-word headline (`RotatingWord`, `rot-w`) | no text-rotation component | TXT-005 |
| Process timeline (`ptl`, `ptl-node`, glow head) | no stepper / timeline | MOL: ProcessTimeline |
| Project card with browser chrome (`proj-card`, `chrome-u`, `cdot`) | CRD-003 has no device frame | CRD-006 Browser-Frame Card |
| Testimonial slider (`tq-*`, progress bars) | no carousel / quote | MOL: TestimonialSlider |
| Audit CTA box with radar rings (`audit-box`, `audit-ring`) | decorative composition | ORG: AuditCtaBand |
| Final CTA band (`cta-out`) | no CTA band | ORG: CtaBand |
| Footer (`ft-*`: grid, contact, signature word) | Master has no footer organism | ORG: SiteFooter |
| Scroll progress bar (`scroll-prog`) | LDR-002 is not scroll-linked | LDR-003 |
| Reveal-on-scroll (`reveal`, `reveal-scale`) | motion util, not a component | foundation: reveal motion |
| Floating WhatsApp button | no floating action | CTA-015 |

Nearest-match rows above are judgement from class names and screenshots; each needs a side-by-side check against the live site before it is called equal.
