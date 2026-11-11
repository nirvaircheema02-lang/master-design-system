import { z } from "zod";

export const CATEGORIES = [
  "CTA", "INP", "CRD", "NAV", "TAB", "ACC", "DLG", "TBL", "TIP",
  "TST", "LDR", "RVL", "SCR", "LAY", "TXT", "BGX", "ICN", "FRM", "BDG", "AVT",
] as const;

export const componentId = z.string().regex(/^[A-Z]{3}-\d{3}$/, "ID must look like CTA-001");
export const semver = z.string().regex(/^\d+\.\d+\.\d+$/, "semver x.y.z");

/**
 * What the conformance harness tests. `button` = activation controls (CTAs). The rest each have their own keyboard
 * model and assertions: card (one primary link), field (label/hint/error wiring), summary (error summary),
 * disclosure (details/accordion), navitem (a nav link with current state), tabs (roving tabindex + panels),
 * accordion (heading > button + region), dialog (modal), menu (action menu, role=menu), navmenu (site-nav disclosure
 * button + link panel, never menu roles). skiplink, breadcrumb, header (sticky / hide-on-scroll site header) and toast are PAGE-level:
 * the harness mounts them (and megamenu, drawer, popover, tooltip) into a full page fixture (long main, skip target, a second labelled nav, scrollable viewport) because their
 * rules (first Tab stop, focus not obscured by a sticky header, 320 px reflow, unique nav names, live regions) need a page around them.
 */
export const archetype = z.enum(["button", "card", "field", "summary", "disclosure", "navitem", "tabs", "accordion", "dialog", "menu", "navmenu", "skiplink", "breadcrumb", "header", "toast", "megamenu", "drawer", "popover", "tooltip", "choice", "stat", "pagination", "table", "atom"]);

export const lifecycle = z.enum(["alpha", "beta", "stable", "deprecated", "removed"]);
/** A = token-only, B = parametric effect module, C = structurally coupled. */
export const interactionClass = z.enum(["A", "B", "C"]);
export const radiusSupport = z.enum(["any", "square-only", "rounded-only", "pill-only"]);
export const reducedMotion = z.enum(["static-end-state", "crossfade", "none"]);

export const skin = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  /** component token -> semantic path (or `transparent`/`currentColor`), e.g. { "--ds-cta-bg": "color.accent" } */
  bind: z.record(z.string().regex(/^--ds-[a-z0-9-]+$/), z.string()),
});

/** What a person looks for (browse by behaviour). A component can have several; `none` means static. */
export const INTERACTION_KINDS = ["hover-press", "pointer", "reveal", "overlay", "scroll", "feedback", "input", "none"] as const;
export const discovery = z.object({
  /** Search words. */
  tags: z.array(z.string()).default([]),
  interaction: z.array(z.enum(INTERACTION_KINDS)).default([]),
  /** Plain-language "use it for" and "avoid it when" lines shown on the component page. */
  useCases: z.array(z.string()).default([]),
  avoidWhen: z.array(z.string()).default([]),
  /** Component ids that are commonly used together. */
  pairsWith: z.array(componentId).default([]),
  /** Lowest brand effects level this component is available at. Absent = always available (a calm component). */
  effects: z.enum(["subtle", "full"]).optional(),
});
export type Discovery = z.infer<typeof discovery>;

export const manifest = z.object({
  id: componentId,
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  category: z.enum(CATEGORIES),
  archetype: archetype.default("button"),
  /** Props (JSON only) the harness and gallery mount the component with. `children` is the text child. */
  fixture: z.object({ props: z.record(z.string(), z.unknown()).default({}), children: z.string().optional() }).default({ props: {} }),
  version: semver,
  lifecycle,
  description: z.string(),
  inspiration: z.array(z.string()).default([]),
  /** Optional browse and search metadata (gallery, usage text, future recommendations). Does not affect rendering. */
  discovery: discovery.optional(),
  interaction: z.object({
    class: interactionClass,
    modules: z.array(z.string()).default([]),
    params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
    /** The effect is driven by pointer JS. It must ignore touch, honour reduced motion itself, and clear on leave. */
    js: z.boolean().default(false),
    /** Local custom properties the JS writes on the host (e.g. --_mx); the harness reads them. Must start with --_ */
    pointerVars: z.array(z.string().regex(/^--_[a-z0-9-]+$/)).default([]),
    /**
     * Layout properties (only `height` today) the component animates on purpose, e.g. an accordion panel. Everything else
     * stays on the transform/opacity/clip-path whitelist. Declaring it means: motion-only, ends in a static state, and
     * reduced motion removes it (the harness checks all three).
     */
    layoutProps: z.array(z.enum(["height"])).default([]),
  }),
  /** Adapter modules from @master-ds/headless this component imports (copied into generated sites). Never import Radix directly. */
  headless: z.array(z.enum(["tabs", "dialog", "menu", "accordion", "popover", "tooltip"])).default([]),
  slots: z.record(z.string(), z.object({ required: z.boolean() })),
  props: z.record(z.string(), z.array(z.string())),
  skins: z.array(skin).min(1),
  tokens: z.array(z.string().regex(/^--[a-z0-9-]+$/)),
  constraints: z.object({
    radiusSupport,
    requiresHost: z.array(z.string()).default([]),
    minContrast: z.enum(["AA", "AAA"]).default("AA"),
    /** Why the shape support claim holds. Required for class C components that claim `any`. */
    radiusNote: z.string().optional(),
    /** Pseudo layers deliberately inset from the edge: their radius must be host radius minus the named inset token. */
    insetLayers: z.array(z.object({ pseudo: z.enum(["::before", "::after"]), inset: z.string().regex(/^--ds-[a-z0-9-]+$/) })).default([]),
  }),
  states: z.array(z.string()),
  responsive: z.object({
    touchTarget: z.string(),
    hoverFallback: z.string(),
  }),
  a11y: z.object({
    role: z.string(),
    keyboard: z.array(z.string()),
    reducedMotion,
    /** Elements the component can render. "a" means it accepts `href` and must behave as a real link. */
    elements: z.array(z.enum(["button", "a"])).default(["button"]),
    /** States (beyond "loading") in which activation must be ignored, e.g. a finished "success". */
    inertStates: z.array(z.string()).default([]),
  }),
  figma: z
    .object({ fileKey: z.string(), nodeId: z.string(), mappedVersion: semver })
    .nullable()
    .default(null),
  code: z.object({ path: z.string(), hash: z.string().nullable().default(null) }),
  testing: z.object({
    conformance: z.enum(["none", "failing", "passed"]).default("none"),
    a11y: z.enum(["pending", "AA", "AAA"]).default("pending"),
    visual: z.string().nullable().default(null),
  }),
});
export type Manifest = z.infer<typeof manifest>;

/** Cross-field rules a plain schema cannot express. Returns error strings (empty = ok). */
export function lintManifest(m: Manifest): string[] {
  const errs: string[] = [];
  if (!m.id.startsWith(m.category)) errs.push(`id ${m.id} does not match category ${m.category}`);
  if (m.interaction.class === "C" && m.constraints.radiusSupport === "any" && !m.constraints.radiusNote?.trim())
    errs.push("class C (structurally coupled) claiming radiusSupport 'any' must explain why in constraints.radiusNote");
  if (m.interaction.class !== "A" && m.a11y.reducedMotion === "none")
    errs.push("animated components (class B/C) must declare a reducedMotion fallback");
  for (const sk of m.skins) for (const k of Object.keys(sk.bind)) if (!m.tokens.includes(k)) errs.push(`skin '${sk.id}' binds ${k}, which is not listed in tokens`);
  if (m.interaction.layoutProps.length && m.a11y.reducedMotion === "none") errs.push("components that animate a layout property must declare a reducedMotion fallback");
  if (m.interaction.js && m.interaction.pointerVars.length === 0) errs.push("pointer-driven (js) components must list interaction.pointerVars");
  if (m.interaction.js && m.a11y.reducedMotion === "none") errs.push("pointer-driven (js) components must honour reduced motion");
  if (m.lifecycle === "stable" && m.testing.conformance !== "passed")
    errs.push("stable components require testing.conformance = passed");
  return errs;
}
