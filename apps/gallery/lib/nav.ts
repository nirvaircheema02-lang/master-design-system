import { layerOf } from "./atomic";
import { KIND_LABEL, KIND_ORDER } from "./discovery";

export interface NavItem { href: string; label: string }
export interface NavGroup { label: string; items: NavItem[] }
export interface NavSection { key: string; label: string; hint?: string; items?: NavItem[]; groups?: NavGroup[] }

/** Human names for the category prefixes (kept for breadcrumbs). */
export const CAT_LABEL: Record<string, string> = {
  CTA: "Buttons and CTAs", INP: "Form inputs", FRM: "Form helpers", CRD: "Cards", NAV: "Navigation", TAB: "Tabs", ACC: "Accordions", DLG: "Dialogs and menus",
  TBL: "Tables", TIP: "Tooltips", TST: "Toasts", LDR: "Loaders", TXT: "Typography", ICN: "Icons", BDG: "Badges and chips", AVT: "Avatars", LAY: "Layout",
};

/**
 * What a designer is looking for, in plain words. The atomic layer (atom / molecule / organism) is still known to the system
 * (see lib/atomic.ts) but it is NOT how people browse, so it never appears as a heading.
 */
export const GROUPS = [
  "Buttons and links", "Text", "Form controls", "Navigation", "Tabs and accordions", "Menus and overlays", "Cards and data", "Feedback and status", "Icons, images and layout",
] as const;
export type Group = (typeof GROUPS)[number];

export function groupOf(id: string): Group {
  const cat = id.slice(0, 3);
  if (cat === "CTA" || id === "TXT-003") return "Buttons and links";
  if (cat === "TXT") return "Text";
  if (cat === "INP" || cat === "FRM") return "Form controls";
  if (cat === "NAV") return "Navigation";
  if (cat === "TAB" || cat === "ACC") return "Tabs and accordions";
  if (cat === "DLG") return "Menus and overlays";
  if (cat === "CRD" || cat === "TBL") return "Cards and data";
  if (cat === "TST" || cat === "TIP" || cat === "LDR" || cat === "BDG") return "Feedback and status";
  return "Icons, images and layout";
}

/** Sidebar contents: Overview, Foundations, then every component grouped by what it is for. All visible at once, nothing to open first. */
export function buildNav(manifests: Array<{ id: string; name: string; category: string }>): NavSection[] {
  const groups: NavGroup[] = GROUPS.map((g) => ({ label: g, items: manifests.filter((m) => groupOf(m.id) === g).map((m) => ({ href: `/components/${m.id}/`, label: m.name })) })).filter((g) => g.items.length);
  return [
    { key: "overview", label: "Overview", items: [{ href: "/", label: "Start here" }, { href: "/system/", label: "How it works" }] },
    { key: "foundations", label: "Foundations", items: [
      { href: "/palettes/", label: "Colour (35 palettes)" }, { href: "/foundations/#type", label: "Typography" }, { href: "/foundations/#space", label: "Spacing" },
      { href: "/foundations/#radius", label: "Radius" }, { href: "/foundations/#elevation", label: "Elevation" }, { href: "/foundations/#motion", label: "Motion" }, { href: "/components/ICN-001/", label: "Icons" },
    ] },
    { key: "components", label: `Components (${manifests.length})`, items: [{ href: "/components/", label: "Browse all, search and filter" }], groups },
    { key: "interactions", label: "Interactions", items: [{ href: "/interactions/", label: "All behaviours" }, ...KIND_ORDER.filter((k) => k !== "none").map((k) => ({ href: `/interactions/#${k}`, label: KIND_LABEL[k]! }))] },
    { key: "patterns", label: "Patterns", items: [{ href: "/patterns/", label: "Page patterns" }] },
    { key: "brands", label: "Brand Design Systems", items: [{ href: "/brands/new/", label: "Create a Brand Design System" }, { href: "/brands/", label: "Master vs Brand UI Kit" }, { href: "/brands/#kit", label: "My Brand UI Kit" }, { href: "/brands/#examples", label: "Example brands" }] },
  ];
}

export const layerName = (id: string) => ({ atom: "Atom", molecule: "Molecule", organism: "Organism" })[layerOf(id)];
