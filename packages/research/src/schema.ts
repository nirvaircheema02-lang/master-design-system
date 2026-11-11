import { z } from "zod";

export const CRITERIA = ["distinctiveness", "usability", "a11y", "performance", "themability", "simplicity", "license", "neutrality"] as const;
export type Criterion = (typeof CRITERIA)[number];

/** Weights sum to 1. Themability weighs most: the platform's promise is "restyle without breaking the interaction". */
export const WEIGHTS: Record<Criterion, number> = {
  distinctiveness: 0.15, usability: 0.15, a11y: 0.15, performance: 0.12, themability: 0.18, simplicity: 0.10, license: 0.10, neutrality: 0.05,
};
/** A reference scoring below this overall is inspiration-only; a 1 in any HARD criterion is an automatic reject. */
export const ADAPT_THRESHOLD = 3.5;
export const HARD: Criterion[] = ["a11y", "performance", "license"];

const score = z.number().int().min(1).max(5);
export const scores = z.object(Object.fromEntries(CRITERIA.map((c) => [c, score])) as Record<Criterion, typeof score>);

export const sourceKind = z.enum(["library", "production-site", "design-system", "internal"]);
export const category = z.enum(["CTA", "CRD", "NAV", "INP", "TAB", "ACC", "DLG", "TBL", "TIP", "TST", "LDR", "RVL", "SCR", "LAY", "TXT", "BGX", "ICN"]);
export const recommendation = z.enum(["adapt", "inspiration", "reject"]);

export const ref = z.object({
  id: z.string().regex(/^REF-\d{3}$/),
  name: z.string(),
  url: z.string().url(),
  sourceKind,
  captured: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category,
  interaction: z.string().min(20),
  visual: z.string(),
  states: z.array(z.string()),
  responsive: z.string(),
  feasibility: z.string(),
  customizable: z.array(z.string()),
  /** A = token-only, B = parametric effect module, C = structurally coupled (see ADR 0003). */
  coupling: z.enum(["A", "B", "C"]),
  radiusSupport: z.enum(["any", "square-only", "rounded-only", "pill-only"]),
  a11y: z.string(),
  perf: z.object({ animated: z.array(z.string()), js: z.boolean(), note: z.string().optional() }),
  license: z.object({
    status: z.enum(["verified-permissive", "unverified", "proprietary", "not-applicable"]),
    usage: z.enum(["dependency", "clean-room", "inspiration-only"]),
    note: z.string().optional(),
  }),
  /** Observed on the live page by the probe (timings, easings, properties). null = not measured. */
  measured: z.object({
    probeFile: z.string(),
    animations: z.array(z.object({ target: z.string(), property: z.string(), durationMs: z.number().nullable(), easing: z.string() })).default([]),
    reducedMotionAnimations: z.number().nullable().default(null),
  }).nullable().default(null),
  scores,
  recommendation,
  proposedId: z.string().regex(/^[A-Z]{3}-\d{3}$/).nullable().default(null),
  notes: z.string().default(""),
});
export type Ref = z.infer<typeof ref>;

export function overall(s: Record<Criterion, number>): number {
  return Math.round(CRITERIA.reduce((acc, c) => acc + s[c] * WEIGHTS[c], 0) * 100) / 100;
}

/** What the rubric says the recommendation must be. */
export function verdict(s: Record<Criterion, number>): "adapt" | "inspiration" | "reject" {
  if (HARD.some((c) => s[c] === 1)) return "reject";
  return overall(s) >= ADAPT_THRESHOLD ? "adapt" : "inspiration";
}

/** Cross-field rules the plain schema cannot express. */
export function lintRef(r: Ref): string[] {
  const errs: string[] = [];
  const v = verdict(r.scores);
  if (r.recommendation === "adapt" && v !== "adapt") errs.push(`${r.id}: recommended 'adapt' but rubric says '${v}' (overall ${overall(r.scores)})`);
  if (r.recommendation === "inspiration" && v === "reject") errs.push(`${r.id}: rubric rejects (hard criterion = 1) but recommendation is 'inspiration'`);
  if (r.recommendation === "adapt" && r.license.usage === "inspiration-only")
    errs.push(`${r.id}: 'adapt' requires clean-room or dependency usage; source is inspiration-only (${r.license.status})`);
  if (r.recommendation === "adapt" && !r.proposedId) errs.push(`${r.id}: 'adapt' needs a proposedId`);
  if (r.recommendation !== "adapt" && r.proposedId) errs.push(`${r.id}: only 'adapt' refs may carry a proposedId`);
  if (r.license.status === "proprietary" && r.license.usage !== "inspiration-only") errs.push(`${r.id}: proprietary source must be inspiration-only`);
  if (r.license.status === "unverified" && r.license.usage === "dependency") errs.push(`${r.id}: unverified license cannot be a dependency`);
  if (r.coupling === "C" && r.radiusSupport === "any" && !/radius|clip|inherit|inner/i.test(r.feasibility)) errs.push(`${r.id}: class C claiming radius 'any' must say why in feasibility`);
  return errs;
}
