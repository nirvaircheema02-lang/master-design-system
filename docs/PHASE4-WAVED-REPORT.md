# Phase 4 Wave D report — forms and data

Date: 2026-11-08 · local only, nothing committed.

## Delivered
INP-003 textarea, INP-004 checkbox, INP-005 select, INP-006 radio group, INP-007 switch, CRD-005 stat card, NAV-010 pagination, TBL-001 data table (44 components in total). New archetypes: choice, stat, pagination, table.

## Evidence
- 4 brands: 768 combos, 13,936 checks, 0 errors (run 2026-11-07).
- 41 of 46 Wave D mutation tests passed at that time; the 5 non-applying mutations (textarea timeout string, switch role + transition, pagination aria-current, table caption) were rewritten afterwards.
- Gallery verify was 106/106 then.

## Not verified
- A clean full `pnpm check:all` after Wave D (Mac sleep corrupts long runs; run in pieces).
- The generated-site test for `kits/waveD.kit.json` after the final changes.
