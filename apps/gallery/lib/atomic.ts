/** Atomic-design layer of every Master component (rule: atom = one element; molecule = a few atoms with one job; organism = a self-contained section). */
export type Layer = "atom" | "molecule" | "organism";
const atoms = ["CTA-001", "CTA-002", "CTA-003", "CTA-004", "CTA-005", "CTA-006", "CTA-007", "CTA-008", "CTA-009", "CTA-010", "CTA-011", "CTA-012", "CTA-013", "CTA-014", "NAV-001", "NAV-002", "NAV-008"];
const organisms = ["NAV-004", "NAV-005", "NAV-006", "NAV-007", "DLG-001", "TBL-001"];
const atomCategories = ["TXT", "ICN", "BDG", "AVT", "LAY", "LDR"];
export const layerOf = (id: string): Layer => (atoms.includes(id) || atomCategories.includes(id.slice(0, 3)) ? "atom" : organisms.includes(id) ? "organism" : "molecule");

/**
 * The existing Ken Research design system (design-system/core-v2/src), counted from its component files on 2026-11-07,
 * for comparison. It is brand-specific (Ken red, Ken fonts); Master is the brand-neutral rebuild.
 */
export const KEN_COUNTS = { atoms: 55, molecules: 56, organisms: 73, templates: 9, patterns: 4 } as const;

/** Atoms Ken has that Master does not (yet). These are the primitives a complete system needs. */
export const MISSING_ATOMS = ["Skeleton (loading placeholder)", "Image with ratio and fallback", "Logo mark", "Rating (stars)", "Visually-hidden helper", "Toggle button group"];
export const MISSING_MOLECULES = ["Search field", "Empty state", "Filter chip group", "Card variants (listing, media, pricing)", "Form field groups", "Stat strip", "Accordion list / FAQ item"];
export const MISSING_ORGANISMS = ["Hero (editorial, cinematic)", "Footer", "CTA banner", "FAQ section", "Pricing table", "Feature grid", "Listing toolbar + filters"];
