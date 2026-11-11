/** Starting kits for common site types. Only component ids: the version, style and props come from each manifest's defaults. */
export interface Preset { key: string; name: string; blurb: string; ids: string[] }
export const PRESETS: Preset[] = [
  { key: "marketing", name: "Marketing site", blurb: "Landing pages: a header, strong calls to action, cards, a form and a footer-style link list.", ids: ["NAV-006", "CTA-001", "CTA-003", "CRD-004", "ACC-001", "INP-001", "TXT-001", "TXT-002", "TXT-003"] },
  { key: "saas", name: "SaaS app", blurb: "Product screens: navigation, tabs, forms, dialogs, toasts and a data table.", ids: ["NAV-006", "TAB-001", "INP-001", "INP-005", "INP-007", "DLG-001", "TST-001", "TBL-001", "CTA-003", "BDG-001"] },
  { key: "editorial", name: "Editorial site", blurb: "Reading-first: headings, text, links, breadcrumb, cards and pagination.", ids: ["NAV-007", "NAV-009", "TXT-001", "TXT-002", "TXT-003", "CRD-002", "CRD-003", "NAV-010", "CTA-012"] },
  { key: "dashboard", name: "Dashboard", blurb: "Numbers and tables: stat cards, table, tabs, progress, tooltips and menus.", ids: ["NAV-006", "CRD-005", "TBL-001", "TAB-001", "LDR-002", "TIP-001", "DLG-003", "BDG-001", "AVT-001"] },
];

/** A site usually needs at least one of each; the Select step suggests the first one when a group is missing. */
export const GAPS: Array<{ group: string; label: string; suggest: string }> = [
  { group: "Buttons and links", label: "a button", suggest: "CTA-003" },
  { group: "Navigation", label: "a header or navigation", suggest: "NAV-006" },
  { group: "Form controls", label: "a form field", suggest: "INP-001" },
  { group: "Text", label: "text styles (heading and body)", suggest: "TXT-001" },
];

export const FONTS = [
  { label: "Inter", value: "Inter, system-ui, sans-serif" },
  { label: "System UI", value: "system-ui, -apple-system, sans-serif" },
  { label: "DM Sans", value: "'DM Sans', system-ui, sans-serif" },
  { label: "Georgia (serif)", value: "Georgia, 'Times New Roman', serif" },
  { label: "Noto Serif", value: "'Noto Serif', Georgia, serif" },
  { label: "Monospace", value: "ui-monospace, SFMono-Regular, Menlo, monospace" },
] as const;
