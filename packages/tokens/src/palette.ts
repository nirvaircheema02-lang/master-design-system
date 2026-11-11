import { clampChroma, converter, formatHex, parse, wcagContrast } from "culori";

const toOklch = converter("oklch");

export const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type Step = (typeof STEPS)[number];

/** Target OKLCH lightness per step (light → dark). Shared by every brand. */
const L_CURVE: Record<Step, number> = {
  50: 0.97, 100: 0.94, 200: 0.89, 300: 0.82, 400: 0.74, 500: 0.66,
  600: 0.57, 700: 0.48, 800: 0.39, 900: 0.3, 950: 0.22,
};
/** Chroma multiplier per step: strongest in the middle, fading at the ends. */
const C_CURVE: Record<Step, number> = {
  50: 0.18, 100: 0.3, 200: 0.5, 300: 0.72, 400: 0.9, 500: 1,
  600: 1, 700: 0.88, 800: 0.72, 900: 0.55, 950: 0.42,
};

export type Ramp = Record<Step, string>;

const hexOf = (c: unknown): string => formatHex(clampChroma(c as never, "oklch"))!;

/**
 * 11-step OKLCH ramp from one seed. The seed itself is preserved EXACTLY at the
 * step whose target lightness is closest, so a brand's own colour never drifts.
 */
export function buildRamp(seedHex: string): { ramp: Ramp; seedStep: Step } {
  const seed = toOklch(parse(seedHex)!);
  const hue = seed.h ?? 0;
  const chroma = seed.c;
  let seedStep: Step = 500;
  let best = Infinity;
  for (const s of STEPS) {
    const d = Math.abs(L_CURVE[s] - seed.l);
    if (d < best) { best = d; seedStep = s; }
  }
  const ramp = {} as Ramp;
  for (const s of STEPS) {
    ramp[s] = s === seedStep
      ? seedHex.toLowerCase()
      : hexOf({ mode: "oklch", l: L_CURVE[s], c: chroma * C_CURVE[s], h: hue });
  }
  return { ramp, seedStep };
}

/** Hue-tinted neutral ramp (very low chroma). */
export function buildNeutral(tintHex?: string): Ramp {
  const t = tintHex ? toOklch(parse(tintHex)!) : undefined;
  const hue = t?.h ?? 260;
  const c = t ? Math.min(t.c, 0.02) : 0.004;
  const ramp = {} as Ramp;
  for (const s of STEPS) ramp[s] = hexOf({ mode: "oklch", l: L_CURVE[s], c: c * (s === 50 || s === 950 ? 0.5 : 1), h: hue });
  return ramp;
}

export const contrast = (a: string, b: string): number => wcagContrast(a, b);

/**
 * Accent colour usable as TEXT / border / focus ring on `surface`: walk the ramp from the
 * accent's own step toward the readable end until `min` contrast is met. Keeps the hue,
 * so a yellow brand gets a deep amber ink on white instead of failing yellow-on-white.
 */
export function pickInk(ramp: Ramp, startStep: Step, surface: string, dark: boolean, min = 4.5): { color: string; step: Step } {
  const order = dark ? [...STEPS].reverse() : [...STEPS];
  const from = order.indexOf(startStep);
  // light surface: move to darker steps (ascending numbers); dark surface: lighter steps (descending)
  for (const s of order.slice(from)) {
    if (contrast(ramp[s], surface) >= min) return { color: ramp[s], step: s };
  }
  const end = order[order.length - 1] as Step;
  return { color: ramp[end], step: end };
}

/**
 * Quiet accent tint (outline-skin hover fill) that keeps `ink` readable on top of it. Light mode walks 50->200,
 * dark mode 950->700; falls back to the extreme step if no step reaches `min`.
 */
export function pickSubtle(ramp: Ramp, ink: string, dark: boolean, min = 4.5): string {
  const order: Step[] = dark ? [900, 950, 800] : [50, 100, 200];
  for (const s of dark ? [900, 950] as Step[] : [50, 100, 200] as Step[]) if (contrast(ink, ramp[s]) >= min) return ramp[s];
  return ramp[dark ? 950 : 50 ] ?? ramp[order[0]!];
}

/**
 * Hover fill for a solid accent. Direction follows the LABEL: white label -> darker fill, dark label -> lighter
 * fill, so the label keeps its contrast. Falls back to the unchanged accent if no adjacent step keeps `min`.
 */
export function pickHover(ramp: Ramp, step: Step, label: string, min = 4.5): string {
  const labelIsLight = contrast(label, "#000000") > contrast(label, "#ffffff");
  const i = STEPS.indexOf(step);
  const j = labelIsLight ? i + 1 : i - 1;           // higher step number = darker
  const cand = STEPS[j] !== undefined ? ramp[STEPS[j]!] : undefined;
  return cand && contrast(label, cand) >= min ? cand : ramp[step];
}

/**
 * First ramp step (walking from `start` toward the readable end) whose contrast against EVERY surface reaches `min`.
 * Used for colours that must work on base, raised and sunken surfaces at once (control borders, status ink).
 */
export function pickAgainst(ramp: Ramp, start: Step, surfaces: string[], dark: boolean, min: number): { color: string; step: Step } {
  const order = dark ? [...STEPS].reverse() : [...STEPS];
  for (const s of order.slice(order.indexOf(start))) if (surfaces.every((bg) => contrast(ramp[s], bg) >= min)) return { color: ramp[s], step: s };
  const end = order[order.length - 1] as Step;
  return { color: ramp[end], step: end };
}

export const INK_LIGHT = "#ffffff";
export const INK_DARK = "#111111";

/** Pick the text colour with the better WCAG contrast on `bg`. */
export function onColor(bg: string): { color: string; ratio: number } {
  const w = contrast(bg, INK_LIGHT);
  const d = contrast(bg, INK_DARK);
  return w >= d ? { color: INK_LIGHT, ratio: w } : { color: INK_DARK, ratio: d };
}
