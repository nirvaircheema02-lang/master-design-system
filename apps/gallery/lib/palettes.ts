import data from "./palettes.generated.json";

export interface Palette {
  id: string; slug: string; name: string; group: string; note: string;
  seeds: Record<string, string>;
  ramps: { primary: Record<string, string>; neutral: Record<string, string> };
  roles: { light: Record<string, string>; dark: Record<string, string> };
  contrast: { total: number; failing: number };
}
export const PALETTES = data as unknown as Palette[];
export const PALETTE_GROUPS = ["Neutral bases", "Accent hues", "Curated", "Material seeds"] as const;
