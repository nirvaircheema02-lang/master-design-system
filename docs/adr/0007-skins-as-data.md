# ADR 0007 — Skins are data; skins.css is generated
Status: accepted. Evidence: Phase 3 Wave 1 (CTA-003/004/005 ship 3/2/2 skins; 6,652 conformance checks).

- A skin is `manifest.skins[]`: `{ id, bind: { "--ds-cta-bg": "color.accent", ... } }`. Keys are component tokens the
  manifest lists; values are semantic paths or `transparent`/`currentColor`.
- `pnpm build:skins` renders them into `skins.css` inside the component folder. The first skin is the default (applies with
  no `data-skin` attribute); the others sit behind `[data-skin="id"]`. master-lint fails if the file is missing or stale.
- Components accept `skin` and render `data-skin`; they never contain colours.
- A site's Instance picks its default skin with `instance.css`: `[data-brand] .ds-x:not([data-skin])`. An explicit
  `data-skin` still wins, so one site can use several skins of one component.
- Why generated-and-committed rather than runtime: the file is plain CSS that copies into any site unchanged, the harness
  and gallery need no special loader, and drift is a lint error.
- Gate: every colour pair a skin creates must be in the token contrast gate (added: `accent-ink/accent-subtle`,
  `text/surface-raised`, `text/surface-sunken`; the dark-mode accent tint is derived so its ink stays readable).
