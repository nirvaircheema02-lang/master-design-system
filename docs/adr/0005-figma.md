# ADR 0005 — Figma strategy and plan constraints
Status: accepted with open verification. Evidence: spike S4 (capability check only; nothing written to Figma).

- Code owns tokens and behavior; Figma mirrors them. Token flow is code → Figma, generated.
- Account check via the Figma MCP: one team on a **Pro** plan (Full seat), one **Starter** team (View seat).
- Assumption to confirm in Figma's docs: Code Connect and the Variables REST API are not available on Pro. Plan for the
  **Plugin API route** (the `use_figma` MCP tool writes variables/components in a file we can edit) and treat Code Connect
  as optional until an Organization/Enterprise plan exists. Fallback mapping = `manifest.figma {fileKey,nodeId,mappedVersion}`
  plus a CI version check, which works on any plan.
- Variable modes are plan-limited; we need two per brand (light/dark), so one collection per brand with two modes fits Pro
  (confirm the mode cap).
- Not yet done: pushing one brand's variables + one component set to a real Figma file. Needs a target file from the user.
