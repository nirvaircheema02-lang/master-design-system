import type { BrandConfig } from "./config.ts";
import type { Manifest } from "./manifest.ts";

/** Radius role values per brand strategy. Single source for the token engine, the generator and the gallery. */
export const RADIUS_ROLES: Record<BrandConfig["radiusStrategy"], { control: string; container: string; cta: string }> = {
  sharp: { control: "0px", container: "0px", cta: "0px" },
  soft: { control: "4px", container: "8px", cta: "4px" },
  rounded: { control: "8px", container: "16px", cta: "8px" },
  pill: { control: "9999px", container: "16px", cta: "9999px" },
  mixed: { control: "6px", container: "16px", cta: "9999px" },
};

export type RadiusClass = "square" | "pill" | "rounded";
export const radiusClass = (v: string): RadiusClass => (/^0(px)?$/.test(v) ? "square" : parseFloat(v) >= 999 ? "pill" : "rounded");

export interface CompatFlag { code: string; component?: string; message: string }

/** pass (null) or flag: does this component support the radius the brand resolves to? */
export function checkRadius(m: Manifest, effective: string): CompatFlag | null {
  const cls = radiusClass(effective);
  const s = m.constraints.radiusSupport;
  const ok = s === "any" || (s === "square-only" && cls === "square") || (s === "pill-only" && cls === "pill") || (s === "rounded-only" && cls === "rounded");
  return ok ? null : { code: "radius-unsupported", component: m.id, message: `${m.id} supports radius '${s}' but the brand resolves cta radius to ${effective} (${cls})` };
}

/** Icon values per setting; "regular" and "round" are the Master defaults. */
export const ICON_STROKE_VALUE = { light: "1.25", regular: "1.75", bold: "2.25" } as const;
/** Text-step ratio per scale (standard = Major Third). */
export const TYPE_SCALE_RATIO = { compact: 1.2, standard: 1.25, large: 1.333 } as const;

const EFFECT_RANK = { minimal: 0, subtle: 1, full: 2 } as const;
/** pass (null) or flag: is this component calm enough for the brand's effects level? */
export function checkEffects(m: Manifest, level: BrandConfig["effects"]): CompatFlag | null {
  const needs = m.discovery?.effects;
  if (!needs || EFFECT_RANK[level ?? "full"] >= EFFECT_RANK[needs]) return null;
  return { code: "effects-unsupported", component: m.id, message: `${m.id} is an expressive effect (needs effects level '${needs}' or higher) but the brand effects level is '${level}'` };
}
