# master-ds

Universal Premium Master Design System: a token-driven component library, brand theme engine,
gallery and website-specific design-system generator.

Status: **Phase 0 — architecture and feasibility spikes.** Not for production use.
Blueprint: see `docs/BLUEPRINT.md` (copied from the approved plan) and `docs/adr/`.

Local only. No remote is configured; nothing here is pushed or deployed.

## Layout
- `packages/contracts` — Zod schemas (manifest, brand, kit, lock) → JSON Schema
- `packages/tokens` — DTCG sources, Style Dictionary build, brand engine
- `packages/components` — Master components (Phase 0: spike implementations only)
- `packages/generator` — CLI: generate / status / upgrade / validate / eject
- `spikes/` — S1–S5 feasibility experiments, each with a pass/fail verdict in `REPORT.md`
- `research/` — inventory + license register (Phase 1)
- `docs/adr/` — architecture decision records

## Commands
```bash
pnpm install
pnpm check            # typecheck + build tokens + all unit tests
pnpm spike:s1         # browser checks for radius/mode/reduced-motion (needs Chromium)
pnpm spike:s3:render  # generate 4 sites and render them in a browser
node --experimental-strip-types packages/generator/src/cli.ts generate --brand brands/finova.json --kit kits/finova.kit.json --out /some/dir
```
If Playwright wants a newer Chromium than you have, run `pnpm exec playwright install chromium`
or set `PW_CHROMIUM` to an existing headless-shell binary.

Phase 0 results: `spikes/REPORT.md`. Decisions: `docs/adr/`. Licenses: `research/licenses/register.md`.
