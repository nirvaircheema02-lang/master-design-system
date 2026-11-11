# TXT-005 Section Header
Opens a page section: eyebrow (a `<p>`), a real heading with an optional highlighted phrase, and a lede. Token family `--ds-sech-*` (snippet in `TOKENS.snippet.txt`).
- Props: `eyebrow`, `title` (string), `highlight` (substring of title, first match), `lede`, `level` (h1-h6, default 2, independent of look), `skin` (accent, gradient, neutral), `design` (stacked, centered, split).
- Static (class A). For an entrance, wrap it in RVL-001; the site's per-child stagger with blur is not reproduced (blur is a forbidden animated property).
- Highlight is gradient text via `background-clip: text` with plain-colour fallback in forced-colors and print. The `gradient` skin runs accent ink to primary text; its contrast is not measured, only the flat skins follow the contrast-gated tokens.
- Split design switches to two columns at 48rem (viewport query, not container query); below that it stacks.
- Verified: manifest lint, typecheck, a 320px render with stub tokens. NOT verified: the conformance atom branch (none exists yet for TXT-005), real brand tokens, screen readers.
