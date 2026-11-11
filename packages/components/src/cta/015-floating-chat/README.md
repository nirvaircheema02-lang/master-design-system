# CTA-015 Floating Chat Button
What: a real `<a>` pinned to a viewport corner that opens a chat (wa.me style link, chat page or mailto). Token family `chat`.
When: an always-available chat entry on marketing pages. Avoid where a fixed corner button would cover content or another floating control.
Props: `href` (required), `label` (accessible name, default "Chat with us"), `icon` (decorative; default is a neutral speech bubble, no brand logo), `position` (`bottom-right` | `bottom-left`), `placement` (`fixed` default | `static`), `newTab` (default true, announced as "(opens in a new tab)"), `skin`, `design`.
Designs: `round` (default), `pill` (icon + visible label), `square`. Skins: `accent`, `success` (the familiar chat green), `ink`. 54 px target, safe-area insets respected, hidden in print.
Motion: one entrance (fade + rise) and a hover/focus grow; both removed under reduced motion. No infinite animation.
Deviation: the fixture sets `placement: "static"` so galleries and the harness are not covered by a fixed element; the fixed behaviour itself is only CSS (`position: fixed`).
NOT verified: nothing rendered yet (tokens not wired); no check that a fixed element does not obscure focus on real pages (WCAG 2.4.11); no screen reader test.
