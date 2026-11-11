"use client";
export const PROJECT_KEY = "master-project-v0";
export const PROJECT_EVENT = "master-project-change";
export type Strategy = "sharp" | "soft" | "rounded" | "pill" | "mixed";
export interface BrandProject {
  name: string; slug: string; concept: string;
  base: string; // which built theme the preview borrows (a reference brand or a palette slug)
  seeds: { primary: string; secondary?: string; accent?: string; neutral?: string };
  fonts: { sans: string; display?: string; mono?: string };
  icons: { stroke: "light" | "regular" | "bold"; cap: "round" | "square" | "butt" };
  typeScale: "compact" | "standard" | "large";
  effects: "minimal" | "subtle" | "full";
  radiusStrategy: Strategy; density: "compact" | "comfortable" | "spacious"; motion: "calm" | "standard" | "lively";
  step: number;
}
export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "my-brand";
export function readProject(): BrandProject | null {
  try { const v = localStorage.getItem(PROJECT_KEY); return v ? (JSON.parse(v) as BrandProject) : null; } catch { return null; }
}
export function writeProject(p: BrandProject) {
  try { localStorage.setItem(PROJECT_KEY, JSON.stringify(p)); } catch { /* storage unavailable */ }
}
