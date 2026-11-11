import { z } from "zod";
import { componentId, semver } from "./manifest.ts";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "#rrggbb");

export const radiusStrategy = z.enum(["sharp", "soft", "rounded", "pill", "mixed"]);
export const motionPersonality = z.enum(["calm", "standard", "lively"]);

export const ICON_STROKES = ["light", "regular", "bold"] as const;
export const ICON_CAPS = ["round", "square", "butt"] as const;
export const TYPE_SCALES = ["compact", "standard", "large"] as const;
export const EFFECT_LEVELS = ["minimal", "subtle", "full"] as const;

export const brandConfig = z.object({
  name: z.string(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  concept: z.string().optional(),
  seeds: z.object({
    primary: hex,
    secondary: hex.optional(),
    accent: hex.optional(),
    /** Used to tint the neutral ramp; defaults to a hue-neutral grey. */
    neutral: hex.optional(),
  }),
  fonts: z.object({ sans: z.string(), display: z.string().optional(), mono: z.string().optional() }),
  radiusStrategy,
  density: z.enum(["compact", "comfortable", "spacious"]).default("comfortable"),
  motion: motionPersonality.default("standard"),
  /** Icon line weight and line ends. Absent = regular / round (the Master look). */
  icons: z.object({ stroke: z.enum(ICON_STROKES).optional(), cap: z.enum(ICON_CAPS).optional() }).optional(),
  /** Size ratio between text steps. Absent = standard (Major Third, 1.25). */
  typeScale: z.enum(TYPE_SCALES).optional(),
  /** How expressive the interactions may be. Absent = full. Components above the level are flagged, never silently dropped. */
  effects: z.enum(EFFECT_LEVELS).optional(),
  /** Intentional T4 overrides: dotted token path -> value. */
  overrides: z.record(z.string(), z.string()).default({}),
});
export type BrandConfig = z.infer<typeof brandConfig>;

export const instance = z.object({
  /** e.g. "CTA-001@1.0.0" */
  ref: z.string().regex(/^[A-Z]{3}-\d{3}@\d+\.\d+\.\d+$/),
  as: z.string().optional(),
  skin: z.string(),
  props: z.record(z.string(), z.string()).default({}),
  tokenOverrides: z.record(z.string(), z.string()).default({}),
});

export const kitConfig = z.object({
  preset: z.string().optional(),
  instances: z.array(instance).min(1),
});
export type KitConfig = z.infer<typeof kitConfig>;

export const lockEntry = z.object({
  id: componentId,
  masterVersion: semver,
  /** sha256 of the master source files at generation time (merge base). */
  sourceHash: z.string(),
  status: z.enum(["synced", "customized", "diverged", "conflict"]),
  files: z.record(z.string(), z.string()), // relative path -> sha256 at generation
});

export const lock = z.object({
  lockVersion: z.literal(1),
  generator: z.string(),
  generatedAt: z.string(),
  brand: z.string(),
  tokensHash: z.string(),
  components: z.array(lockEntry),
  /** The headless adapter modules copied into this site (shared by components that declare manifest.headless). */
  headless: z.object({ modules: z.array(z.string()), sourceHash: z.string(), files: z.record(z.string(), z.string()) }).optional(),
});
export type Lock = z.infer<typeof lock>;
