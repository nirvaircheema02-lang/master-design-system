# ADR 0001 — Separate repo; copy-in delivery with a pinned lock
Status: accepted (user decision 2026-11-05). Evidence: spike S3.

- The Master lives in its own repo/workspace. Ken `core-v2` is a source of lessons, not a dependency.
- Sites receive **source copies** of Master components plus `master.lock.json`; they own the code.
- Lock records, per component: id, masterVersion, sourceHash, per-file hashes, status
  (`synced | customized | diverged | conflict`).
- A site-local snapshot of the merge base is kept in `.master/base/<ID>/`. **Trade-off:** a hash is not enough for a
  three-way merge; either the site stores the base (chosen for v0, simple, offline) or the registry keeps every released
  version immutably and the CLI fetches it (smaller sites; revisit when a hosted registry exists).
- Upgrades use `git merge-file`. Overlapping edits stop with conflict markers and leave the lock pinned at the old version
  until resolved; `diverged` (ejected) components are never touched.
- Framework target v1: React 19, Next 15, Tailwind v4. Tokens are framework-neutral CSS variables.
