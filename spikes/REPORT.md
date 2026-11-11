# Phase 0 report — spikes S1–S5

Date: 2026-11-05 · Repo: `~/Project-aura/master-ds` (local, uncommitted, no remote)

## Verdicts
| Spike | Question | Verdict | Evidence |
|---|---|---|---|
| S1 | Can distinct effects stay intact across radius 0 / 8px / pill, brands and modes, with a real reduced-motion fallback? | **PASS** | `pnpm spike:s1`: 192/192 (4 brands × 2 modes × 4 effects × 3 radii × motion/reduced). Negative control: removing the reduced-motion block made 48 checks fail |
| S2 | Does DTCG + Style Dictionary v5 build per-brand, scoped, layered tokens that Tailwind v4 can consume? | **PASS** | 20 token tests; 4 brands; `tailwindcss` 4.3 compile resolves `bg-accent`, `rounded-cta` etc. to `var(--ds-…)` |
| S3 | Does copy-in + lock + three-way upgrade work, with the Master untouched? | **PASS** | 11 generator tests + `pnpm spike:s3:render`: 4 generated sites render correct colour/radius, shimmer runs on hover, none under reduced-motion, Master fingerprint unchanged |
| S4 | Can we confirm Figma plan limits and push variables/components? | **PARTIAL** | Plan tier identified (Pro + Starter). **No write to Figma was done**; needs a target file from you (see ADR 0005) |
| S5 | Are the reference sources' licenses safe to reuse? | **PARTIAL** | Radix, Base UI, Magic UI, Motion = MIT. Aceternity = proprietary, ambiguous. React Bits and Motion Primitives unverified (fetch failed). `research/licenses/register.md` |

Gate from the blueprint ("each spike has a verdict; ADRs signed; Figma tier confirmed"): verdicts recorded; **ADR sign-off is yours**; Figma tier confirmed as Pro/Starter but the Code Connect/Variables-API limits are still assumptions.

## Test inventory
- Unit: contracts 6, tokens 20, generator 11 — all passing; `tsc` strict clean on all three packages.
- Browser: S1 192 checks; S3 4 brands rendered, 8 page loads (motion + reduced).

## Findings that change the blueprint
1. **Accent ≠ ink.** The contrast gate caught yellow-on-white at 1.5:1 and two dark-mode accents under 3:1. Added roles `accent-ink` and `focus` (derived per mode). The plan's T1 list should include them.
2. **Prefix is mandatory.** Tailwind v4 owns `--color-*`/`--radius-*`/`--font-*`. All variables are `--ds-*` (ADR 0002). Manifest token names changed accordingly (`--ds-cta-bg`).
3. **Lock needs content, not only hashes.** A three-way merge needs the old Master text. v0 stores it in `.master/base/`; a versioned immutable registry would avoid that (ADR 0001).
4. **Lock status gained `conflict`.** Overlapping edits keep the lock pinned to the old version until resolved.
5. **Animated border breaks the transform/opacity-only rule** (animates an `@property` angle = paint). Kept as a declared exception; must be measured in Phase 2/3.
6. **Lint rules are not built yet.** "No hex / no primitive tokens in components" is currently enforced by one test on the generated component tier, not by a repo-wide linter. Phase 2 item.

## Limits of what was proven (be careful quoting this)
- S1 proves structure, shape-agnostic CSS and reduced-motion behaviour, plus one visual review of rest/hover screenshots. It has **no pixel-diff baselines and no perf measurement**.
- S1 effects live in the spike CSS; only CTA-001 exists as a real component.
- S3 covers one component, one instance per component, no brand change on upgrade (tokens are not rebuilt by `upgrade`), minimal docs output, and **no shadcn-registry-format output** — that transport is still unverified.
- Tailwind compile was checked for Finova light mode only.
- No Figma write, no Storybook, no gallery app yet (all Phase 2+).

## Environment notes
- Playwright 1.64.1 expects Chromium build 1248; this machine has 1243 cached. Local runs set `PW_CHROMIUM` to the cached headless shell; CI installs browsers.
- The desktop Browser pane cannot drive `file://` pages; the spikes use Playwright screenshots instead (`spikes/_tools/shot.mjs`).
- `pnpm add` printed a notice that some dependency build scripts were skipped; nothing needed them.

## Open decisions for you
1. Sign off ADRs 0001–0003 and 0005; 0004 (headless library) is intentionally still "proposed".
2. Give me a Figma file (or approve creating one) to finish S4 with a real variables + component push.
3. Someone should read the React Bits and Motion Primitives LICENSE files in a browser.
4. Approve moving to Phase 2 (foundations + walking skeleton), and whether to make the first commit in this repo.
