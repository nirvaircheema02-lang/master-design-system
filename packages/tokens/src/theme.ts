import { ICON_STROKE_VALUE, RADIUS_ROLES, TYPE_SCALE_RATIO, type BrandConfig } from "@master-ds/contracts";
import { buildNeutral, buildRamp, contrast, onColor, pickAgainst, pickHover, pickInk, pickSubtle, STEPS, type Ramp, type Step } from "./palette.ts";

type Tok = { $value: string; $type?: string; $description?: string };
type Tree = { [k: string]: Tree | Tok };

const t = (value: string, type?: string): Tok => (type ? { $value: value, $type: type } : { $value: value });

function rampTree(r: Ramp): Tree {
  const out: Tree = {};
  for (const s of STEPS) out[String(s)] = t(r[s], "color");
  return out;
}

/** Text steps. `standard` is the fixed Major Third table (kept literal so existing brands do not change by a digit); others derive from the ratio. */
function fontSizes(scale: BrandConfig["typeScale"]): Tree {
  const fixed = scale === undefined || scale === "standard";
  const r = TYPE_SCALE_RATIO[scale ?? "standard"];
  const step = (n: number, std: string) => t(fixed ? std : `${(Math.round(r ** n * 1000) / 1000)}rem`, "dimension");
  return { xs: t("0.8rem", "dimension"), sm: t("0.9375rem", "dimension"), md: t("1rem", "dimension"), lg: step(1, "1.25rem"), xl: step(2, "1.563rem"), "2xl": step(3, "1.953rem"), "3xl": step(4, "2.441rem"), "4xl": step(5, "3.052rem") };
}

const MOTION_SCALE = { calm: 1.3, standard: 1, lively: 0.8 } as const;
const DENSITY = {
  compact: { ctaH: "2.25rem", ctaPx: "1rem" },
  comfortable: { ctaH: "2.75rem", ctaPx: "1.5rem" },
  spacious: { ctaH: "3.25rem", ctaPx: "2rem" },
} as const;

const DENSITY_EXTRA = {
  compact: { fieldH: "2.25rem", fieldPx: "0.625rem", navH: "2.25rem", navPx: "0.75rem", accPy: "0.75rem", cardPad: "1rem", tabH: "2.5rem", menuItemH: "2rem", dlgPad: "1.25rem", hdrH: "3.5rem", tblPy: "0.5rem" },
  comfortable: { fieldH: "2.75rem", fieldPx: "0.75rem", navH: "2.5rem", navPx: "0.875rem", accPy: "1rem", cardPad: "1.25rem", tabH: "2.75rem", menuItemH: "2.25rem", dlgPad: "1.5rem", hdrH: "4rem", tblPy: "0.75rem" },
  spacious: { fieldH: "3.25rem", fieldPx: "1rem", navH: "2.75rem", navPx: "1rem", accPy: "1.25rem", cardPad: "1.5rem", tabH: "3rem", menuItemH: "2.5rem", dlgPad: "1.75rem", hdrH: "4.5rem", tblPy: "1rem" },
} as const;

export interface ContrastRow { pair: string; ratio: number; min: number; ok: boolean }
export interface BrandTokens {
  primitive: Tree;
  semanticLight: Tree;
  semanticDark: Tree;
  component: Tree;
  report: ContrastRow[];
  seedStep: Step;
  overridesApplied: { applied: string[]; unknown: string[] };
}

export function buildBrandTokens(b: BrandConfig): BrandTokens {
  const { ramp: primary, seedStep } = buildRamp(b.seeds.primary);
  const secondary = b.seeds.secondary ? buildRamp(b.seeds.secondary).ramp : undefined;
  const accent = b.seeds.accent ? buildRamp(b.seeds.accent).ramp : primary;
  const accentStep: Step = b.seeds.accent ? buildRamp(b.seeds.accent).seedStep : seedStep;
  const neutral = buildNeutral(b.seeds.neutral ?? b.seeds.secondary);
  const r = RADIUS_ROLES[b.radiusStrategy];
  const m = MOTION_SCALE[b.motion];
  const d = DENSITY[b.density];
  const dx = DENSITY_EXTRA[b.density];

  const primitive: Tree = {
    color: {
      primary: rampTree(primary),
      ...(secondary ? { secondary: rampTree(secondary) } : {}),
      neutral: rampTree(neutral),
      white: t("#ffffff", "color"),
      black: t("#000000", "color"),
    },
    radius: {
      none: t("0px", "dimension"),
      control: t(r.control, "dimension"),
      container: t(r.container, "dimension"),
      cta: t(r.cta, "dimension"),
      full: t("9999px", "dimension"),
    },
    font: {
      sans: t(b.fonts.sans),
      display: t(b.fonts.display ?? b.fonts.sans),
      mono: t(b.fonts.mono ?? "ui-monospace, monospace"),
    },
    duration: {
      // Phase 1 probe (121 measured transitions): 150 ms x39, 200 ms x38, 300 ms x23, median 200 ms.
      fast: t(`${Math.round(150 * m)}ms`, "duration"),
      quick: t(`${Math.round(200 * m)}ms`, "duration"),
      base: t(`${Math.round(300 * m)}ms`, "duration"),
      slow: t(`${Math.round(500 * m)}ms`, "duration"),
      shimmer: t(`${Math.round(700 * m)}ms`, "duration"),
      orbit: t(`${Math.round(2500 * m)}ms`, "duration"),
      spin: t(`${Math.round(800 * m)}ms`, "duration"),
    },
    // Type scale (Major Third, 1.25), line heights, weights, tracking: every text atom reads these through the `type` family.
    "font-size": fontSizes(b.typeScale),
    "line-height": { tight: t("1.15", "number"), snug: t("1.3", "number"), normal: t("1.5", "number"), relaxed: t("1.7", "number") },
    "font-weight": { regular: t("400", "number"), medium: t("500", "number"), semibold: t("600", "number"), bold: t("700", "number") },
    tracking: { tight: t("-0.02em", "dimension"), normal: t("0em", "dimension"), wide: t("0.06em", "dimension") },
    // Spacing scale (4 px base): atoms and layout read it through the `lay` family.
    space: { "1": t("0.25rem", "dimension"), "2": t("0.5rem", "dimension"), "3": t("0.75rem", "dimension"), "4": t("1rem", "dimension"), "5": t("1.25rem", "dimension"), "6": t("1.5rem", "dimension"), "8": t("2rem", "dimension"), "10": t("2.5rem", "dimension"), "12": t("3rem", "dimension"), "16": t("4rem", "dimension") },
    z: { base: t("0", "number"), raised: t("10", "number"), sticky: t("100", "number"), overlay: t("1000", "number"), toast: t("1100", "number") },
    ease: {
      out: t("cubic-bezier(0.22, 1, 0.36, 1)"),
      inOut: t("cubic-bezier(0.65, 0, 0.35, 1)"),
      // 67 of 121 measured production easings; also Tailwind's default.
      standard: t("cubic-bezier(0.4, 0, 0.2, 1)"),
      // Small-overshoot spring approximation via linear() (Baseline 2023). Not used by default.
      spring: t("linear(0, 0.4 10%, 0.85 25%, 1.06 40%, 1.01 55%, 1)"),
    },
  };

  const accentHex = accent[accentStep];
  const on = onColor(accentHex);
  // Status colours are brand-neutral on purpose: "success" and "danger" must read the same on every site.
  // Seeds are dark enough that a white or near-black label reaches 4.5:1 (gated below, per mode).
  const SUCCESS = "#16703c", DANGER = "#b3261e";
  const onSuccess = onColor(SUCCESS), onDanger = onColor(DANGER);
  const dangerRamp = buildRamp(DANGER), successRamp = buildRamp(SUCCESS);

  const mode = (dark: boolean): Tree => {
    const surface = dark ? neutral[950] : neutral[50];
    const raised = dark ? neutral[900] : "#ffffff";
    const text = dark ? neutral[50] : neutral[950];
    const textSecondary = dark ? neutral[300] : neutral[700];
    // The accent FILL is identified by its own label (on-accent/accent above). When the accent is
    // used as text / border / focus ring on the page, it must be readable: derive an ink per mode.
    const sunken = dark ? neutral[900] : neutral[100];
    const surfaces = [surface, raised, sunken];
    // text links and ink sit on base, raised AND sunken surfaces: check against the hardest one (light: sunken is darkest; dark: raised is lightest)
    const ink = pickInk(accent, accentStep, dark ? raised : sunken, dark);
    // Control boundary must be 3:1 on every surface (WCAG 1.4.11); status ink must be readable text (4.5:1) on all of them.
    const control = pickAgainst(neutral, 500, surfaces, dark, 3);
    const dangerInk = pickAgainst(dangerRamp.ramp, dangerRamp.seedStep, surfaces, dark, 4.5);
    const successInk = pickAgainst(successRamp.ramp, successRamp.seedStep, surfaces, dark, 4.5);
    return {
      elevation: {
        "1": t("0 1px 2px color-mix(in oklch, {color.text.primary} 14%, transparent)"),
        "2": t("0 8px 24px color-mix(in oklch, {color.text.primary} 18%, transparent)"),
      },
      color: {
        surface: { base: t(surface, "color"), raised: t(raised, "color"), sunken: t(dark ? neutral[900] : neutral[100], "color") },
        text: { primary: t(text, "color"), secondary: t(textSecondary, "color") },
        border: { subtle: t(dark ? neutral[800] : neutral[200], "color"), strong: t(dark ? neutral[600] : neutral[400], "color"), control: t(control.color, "color") },
        scrim: t("color-mix(in oklch, {color.text.primary} 45%, transparent)"),
        "danger-ink": t(dangerInk.color, "color"),
        "success-ink": t(successInk.color, "color"),
        accent: {
          DEFAULT: t(accentHex, "color"),
          hover: t(pickHover(accent, accentStep, on.color), "color"),
          subtle: t(pickSubtle(accent, ink.color, dark), "color"),
          ink: t(ink.color, "color"),
        },
        "on-accent": t(on.color, "color"),
        success: t(SUCCESS, "color"),
        "on-success": t(onSuccess.color, "color"),
        danger: t(DANGER, "color"),
        "on-danger": t(onDanger.color, "color"),
        focus: t(ink.color, "color"),
      },
    };
  };

  // Component tier: ONLY semantic/primitive-role references, never raw literals.
  const component: Tree = {
    cta: {
      bg: t("{color.accent.DEFAULT}", "color"),
      "bg-hover": t("{color.accent.hover}", "color"),
      fg: t("{color.on-accent}", "color"),
      radius: t("{radius.cta}", "dimension"),
      height: t(d.ctaH, "dimension"),
      "padding-x": t(d.ctaPx, "dimension"),
      "shimmer-hl": t("color-mix(in oklch, {color.on-accent} 35%, transparent)"),
      "shimmer-duration": t("{duration.shimmer}", "duration"),
      "slide-duration": t("{duration.base}", "duration"),
      "fade-duration": t("{duration.fast}", "duration"),
      "fade-ease": t("{ease.standard}"),
      "wipe-duration": t("{duration.base}", "duration"),
      "orbit-duration": t("{duration.orbit}", "duration"),
      "spin-duration": t("{duration.spin}", "duration"),
      "fg-hover": t("{color.on-accent}", "color"),
      border: t("transparent"),
      "border-width": t("2px", "dimension"),
      "ring-width": t("2px", "dimension"),
      ring: t("{color.on-accent}", "color"),
      "ring-base": t("{color.accent.hover}", "color"),
      glow: t("{color.accent.DEFAULT}", "color"),
      shadow: t("{color.text.primary}", "color"),
      "press-offset": t("4px", "dimension"),
      chip: t("{color.on-accent}", "color"),
      "fg-on-chip": t("{color.accent.DEFAULT}", "color"),
      link: t("{color.accent.ink}", "color"),
      "underline-width": t("2px", "dimension"),
      "grad-duration": t("{duration.slow}", "duration"),
      spot: t("{color.accent.hover}", "color"),
      "spot-size": t("110px", "dimension"),
      "ok-bg": t("{color.success}", "color"),
      "ok-fg": t("{color.on-success}", "color"),
      "err-bg": t("{color.danger}", "color"),
      "err-fg": t("{color.on-danger}", "color"),
      font: t("{font.sans}"),
      focus: t("{color.focus}", "color"),
      ease: t("{ease.out}"),
    },
  };

  component.field = {
    bg: t("{color.surface.raised}", "color"), fg: t("{color.text.primary}", "color"), border: t("{color.border.control}", "color"),
    "border-width": t("1px", "dimension"), radius: t("{radius.control}", "dimension"), height: t(dx.fieldH, "dimension"), "padding-x": t(dx.fieldPx, "dimension"),
    font: t("{font.sans}"), placeholder: t("{color.text.secondary}", "color"), label: t("{color.text.primary}", "color"), hint: t("{color.text.secondary}", "color"),
    error: t("{color.danger-ink}", "color"), focus: t("{color.focus}", "color"), "focus-width": t("2px", "dimension"), gap: t("0.375rem", "dimension"),
    "fade-duration": t("{duration.fast}", "duration"), "fade-ease": t("{ease.standard}"), "textarea-min": t("6.5rem", "dimension"), "underline-width": t("2px", "dimension"), "bg-filled": t("{color.surface.sunken}", "color"), "label-width": t("10rem", "dimension"),
  };
  component.card = {
    bg: t("{color.surface.raised}", "color"), "bg-hover": t("{color.surface.sunken}", "color"), fg: t("{color.text.primary}", "color"), muted: t("{color.text.secondary}", "color"),
    border: t("{color.border.subtle}", "color"), "border-hover": t("{color.border.control}", "color"), radius: t("{radius.container}", "dimension"),
    padding: t(dx.cardPad, "dimension"), gap: t("0.75rem", "dimension"), font: t("{font.sans}"), focus: t("{color.focus}", "color"), "focus-width": t("2px", "dimension"),
    "fade-duration": t("{duration.fast}", "duration"), "fade-ease": t("{ease.standard}"), "zoom-duration": t("{duration.base}", "duration"), "zoom-scale": t("1.06", "number"),
    "media-ratio": t("16 / 10"), overlay: t("{color.surface.raised}", "color"), shadow: t("{elevation.2}"), "shadow-hover": t("{elevation.2}"), accent: t("{color.accent.ink}", "color"),
  };
  component.frm = {
    bg: t("{color.surface.raised}", "color"), fg: t("{color.text.primary}", "color"), accent: t("{color.danger-ink}", "color"), "border-width": t("4px", "dimension"),
    radius: t("{radius.container}", "dimension"), padding: t("1rem 1.25rem"), font: t("{font.sans}"), focus: t("{color.focus}", "color"), "focus-width": t("2px", "dimension"),
  };
  component.acc = {
    bg: t("{color.surface.raised}", "color"), "bg-hover": t("{color.surface.sunken}", "color"), fg: t("{color.text.primary}", "color"), muted: t("{color.text.secondary}", "color"),
    border: t("{color.border.subtle}", "color"), "outer-border": t("{color.border.subtle}", "color"), radius: t("{radius.container}", "dimension"), "padding-y": t(dx.accPy, "dimension"), "padding-x": t("1rem", "dimension"),
    font: t("{font.sans}"), focus: t("{color.focus}", "color"), "focus-width": t("2px", "dimension"), "fade-duration": t("{duration.fast}", "duration"), "fade-ease": t("{ease.standard}"),
    "expand-duration": t("{duration.quick}", "duration"), "expand-ease": t("{ease.out}"),
  };
  component.tab = {
    fg: t("{color.text.secondary}", "color"), "fg-active": t("{color.text.primary}", "color"), "bg-hover": t("{color.surface.sunken}", "color"), border: t("{color.border.subtle}", "color"),
    "list-bg": t("transparent"), indicator: t("{color.accent.ink}", "color"), "indicator-height": t("2px", "dimension"), radius: t("{radius.control}", "dimension"),
    height: t(dx.tabH, "dimension"), "padding-x": t("1rem", "dimension"), "panel-padding": t("1rem 0"), font: t("{font.sans}"), focus: t("{color.focus}", "color"), "focus-width": t("2px", "dimension"),
    "slide-duration": t("{duration.fast}", "duration"), "slide-ease": t("{ease.standard}"), "fade-duration": t("{duration.fast}", "duration"), "fade-ease": t("{ease.standard}"),
    "bg-active": t("{color.accent.DEFAULT}", "color"), "fg-on-active": t("{color.on-accent}", "color"), "capsule-bg": t("{color.surface.sunken}", "color"), raised: t("{color.surface.raised}", "color"), shadow: t("{elevation.1}"), "panel-border": t("{color.border.control}", "color"),
  };
  component.dlg = {
    bg: t("{color.surface.raised}", "color"), fg: t("{color.text.primary}", "color"), muted: t("{color.text.secondary}", "color"), border: t("{color.border.subtle}", "color"),
    radius: t("{radius.container}", "dimension"), shadow: t("{elevation.2}"), scrim: t("{color.scrim}", "color"), padding: t(dx.dlgPad, "dimension"), gap: t("0.75rem", "dimension"),
    width: t("min(32rem, calc(100vw - 2rem))"), font: t("{font.sans}"), focus: t("{color.focus}", "color"), "focus-width": t("2px", "dimension"), "close-bg-hover": t("{color.surface.sunken}", "color"), "trigger-border": t("{color.border.control}", "color"),
    z: t("{z.overlay}", "number"), "enter-duration": t("{duration.quick}", "duration"), "exit-duration": t("{duration.fast}", "duration"), ease: t("{ease.out}"),
    "sheet-width": t("min(40rem, 100vw)"), "side-width": t("min(26rem, 100vw)"), "alert-width": t("min(24rem, calc(100vw - 2rem))"), "wide-width": t("min(48rem, calc(100vw - 2rem))"),
  };
  component.menu = {
    bg: t("{color.surface.raised}", "color"), fg: t("{color.text.primary}", "color"), muted: t("{color.text.secondary}", "color"), border: t("{color.border.subtle}", "color"),
    radius: t("{radius.container}", "dimension"), "item-radius": t("{radius.control}", "dimension"), shadow: t("{elevation.2}"), padding: t("0.375rem", "dimension"),
    "item-height": t(dx.menuItemH, "dimension"), "item-padding-x": t("0.625rem", "dimension"), "bg-highlight": t("{color.accent.subtle}", "color"), "fg-highlight": t("{color.accent.ink}", "color"),
    danger: t("{color.danger-ink}", "color"), "min-width": t("12rem", "dimension"), "trigger-border": t("{color.border.control}", "color"), "bg-hover": t("{color.surface.sunken}", "color"), font: t("{font.sans}"), focus: t("{color.focus}", "color"), "focus-width": t("2px", "dimension"),
    z: t("{z.overlay}", "number"), "enter-duration": t("{duration.fast}", "duration"), "exit-duration": t("{duration.fast}", "duration"), ease: t("{ease.out}"),
  };
  component.nav = {
    fg: t("{color.text.primary}", "color"), "bg-hover": t("{color.accent.subtle}", "color"), "fg-hover": t("{color.accent.ink}", "color"),
    "bg-current": t("{color.accent.subtle}", "color"), "fg-current": t("{color.accent.ink}", "color"), indicator: t("{color.accent.ink}", "color"), "indicator-width": t("2px", "dimension"),
    radius: t("{radius.control}", "dimension"), height: t(dx.navH, "dimension"), "padding-x": t(dx.navPx, "dimension"), font: t("{font.sans}"), focus: t("{color.focus}", "color"),
    "focus-width": t("2px", "dimension"), "fade-duration": t("{duration.fast}", "duration"), "fade-ease": t("{ease.standard}"), "slide-duration": t("{duration.base}", "duration"),
    "panel-bg": t("{color.surface.raised}", "color"), "panel-border": t("{color.border.subtle}", "color"), "panel-radius": t("{radius.container}", "dimension"), "panel-shadow": t("{elevation.2}"),
    "panel-padding": t("0.5rem", "dimension"), "panel-min-width": t("14rem", "dimension"), "trigger-fg": t("{color.text.primary}", "color"), z: t("{z.sticky}", "number"),
    "skip-bg": t("{color.accent.DEFAULT}", "color"), "skip-fg": t("{color.on-accent}", "color"), "skip-z": t("{z.toast}", "number"),
    "crumb-fg": t("{color.accent.ink}", "color"), "crumb-current": t("{color.text.primary}", "color"), "crumb-sep": t("{color.text.secondary}", "color"), "crumb-gap": t("0.375rem", "dimension"),
    "header-bg": t("{color.surface.raised}", "color"), "header-border": t("{color.border.subtle}", "color"), "header-height": t(dx.hdrH, "dimension"), "header-shadow": t("{elevation.1}"),
    "header-z": t("{z.sticky}", "number"), "header-accent-bg": t("{color.accent.DEFAULT}", "color"), "header-accent-fg": t("{color.on-accent}", "color"), "header-accent-hover": t("{color.accent.hover}", "color"), "header-float-margin": t("0.75rem", "dimension"), "header-slide-duration": t("{duration.quick}", "duration"), "header-slide-ease": t("{ease.out}"),
    "mega-width": t("min(48rem, calc(100vw - 2rem))"), "mega-gap": t("1.5rem", "dimension"), "mega-heading": t("{color.text.secondary}", "color"),
    "drawer-bg": t("{color.surface.raised}", "color"), "drawer-fg": t("{color.text.primary}", "color"), "drawer-border": t("{color.border.subtle}", "color"), "drawer-width": t("min(20rem, 85vw)"),
    "drawer-shadow": t("{elevation.2}"), "drawer-scrim": t("{color.scrim}", "color"), "drawer-z": t("{z.overlay}", "number"),
    "drawer-enter-duration": t("{duration.base}", "duration"), "drawer-exit-duration": t("{duration.quick}", "duration"), "drawer-ease": t("{ease.out}"), "drawer-close-bg-hover": t("{color.surface.sunken}", "color"),
  };
  component.choice = {
    size: t("1.25rem", "dimension"), border: t("{color.border.control}", "color"), "border-width": t("2px", "dimension"), bg: t("{color.surface.raised}", "color"), "bg-checked": t("{color.accent.DEFAULT}", "color"),
    "fg-check": t("{color.on-accent}", "color"), radius: t("{radius.control}", "dimension"), gap: t("0.625rem", "dimension"), label: t("{color.text.primary}", "color"), hint: t("{color.text.secondary}", "color"),
    error: t("{color.danger-ink}", "color"), focus: t("{color.focus}", "color"), "focus-width": t("2px", "dimension"), font: t("{font.sans}"), "fade-duration": t("{duration.fast}", "duration"), "fade-ease": t("{ease.standard}"),
    "track-w": t("2.75rem", "dimension"), "track-h": t("1.5rem", "dimension"), "track-off": t("{color.border.control}", "color"), "track-on": t("{color.accent.DEFAULT}", "color"),
    thumb: t("{color.surface.raised}", "color"), "thumb-on": t("{color.on-accent}", "color"),
  };
  component.stat = {
    bg: t("{color.surface.raised}", "color"), fg: t("{color.text.primary}", "color"), muted: t("{color.text.secondary}", "color"), border: t("{color.border.subtle}", "color"), radius: t("{radius.container}", "dimension"),
    padding: t(dx.cardPad, "dimension"), gap: t("0.375rem", "dimension"), font: t("{font.sans}"), up: t("{color.success-ink}", "color"), down: t("{color.danger-ink}", "color"), flat: t("{color.text.secondary}", "color"),
  };
  component.pag = {
    radius: t("{radius.control}", "dimension"), height: t(dx.navH, "dimension"), "padding-x": t("0.625rem", "dimension"), fg: t("{color.text.primary}", "color"), border: t("{color.border.control}", "color"),
    "bg-hover": t("{color.accent.subtle}", "color"), "fg-hover": t("{color.accent.ink}", "color"), "bg-current": t("{color.accent.DEFAULT}", "color"), "fg-current": t("{color.on-accent}", "color"),
    ellipsis: t("{color.text.secondary}", "color"), gap: t("0.25rem", "dimension"), font: t("{font.sans}"), focus: t("{color.focus}", "color"), "focus-width": t("2px", "dimension"),
    "fade-duration": t("{duration.fast}", "duration"), "fade-ease": t("{ease.standard}"),
  };
  component.tbl = {
    bg: t("{color.surface.raised}", "color"), fg: t("{color.text.primary}", "color"), "header-bg": t("{color.surface.sunken}", "color"), border: t("{color.border.subtle}", "color"), stripe: t("{color.surface.sunken}", "color"),
    "row-hover": t("{color.surface.sunken}", "color"), "border-strong": t("{color.border.control}", "color"), "row-gap": t("0.5rem", "dimension"), rule: t("2px", "dimension"), muted: t("{color.text.secondary}", "color"), radius: t("{radius.container}", "dimension"), "padding-x": t("1rem", "dimension"), "padding-y": t(dx.tblPy, "dimension"),
    font: t("{font.sans}"), focus: t("{color.focus}", "color"), "focus-width": t("2px", "dimension"), "fade-duration": t("{duration.fast}", "duration"), "fade-ease": t("{ease.standard}"),
  };
  component.type = {
    "size-xs": t("{font-size.xs}", "dimension"), "size-sm": t("{font-size.sm}", "dimension"), "size-md": t("{font-size.md}", "dimension"), "size-lg": t("{font-size.lg}", "dimension"), "size-xl": t("{font-size.xl}", "dimension"),
    "size-2xl": t("{font-size.2xl}", "dimension"), "size-3xl": t("{font-size.3xl}", "dimension"), "size-4xl": t("{font-size.4xl}", "dimension"),
    "lh-tight": t("{line-height.tight}", "number"), "lh-snug": t("{line-height.snug}", "number"), "lh-normal": t("{line-height.normal}", "number"), "lh-relaxed": t("{line-height.relaxed}", "number"),
    "weight-regular": t("{font-weight.regular}", "number"), "weight-medium": t("{font-weight.medium}", "number"), "weight-semibold": t("{font-weight.semibold}", "number"), "weight-bold": t("{font-weight.bold}", "number"),
    "tracking-tight": t("{tracking.tight}", "dimension"), "tracking-wide": t("{tracking.wide}", "dimension"),
    font: t("{font.sans}"), display: t("{font.display}"), mono: t("{font.mono}"),
    heading: t("{color.text.primary}", "color"), text: t("{color.text.primary}", "color"), muted: t("{color.text.secondary}", "color"), link: t("{color.accent.ink}", "color"), "link-hover": t("{color.text.primary}", "color"),
    "bar": t("{color.accent.ink}", "color"), "rule": t("{color.border.control}", "color"), "code-bg": t("{color.surface.sunken}", "color"), "code-fg": t("{color.text.primary}", "color"),
    "kbd-bg": t("{color.surface.raised}", "color"), "kbd-border": t("{color.border.control}", "color"), radius: t("{radius.control}", "dimension"), focus: t("{color.focus}", "color"), "focus-width": t("2px", "dimension"),
    "fade-duration": t("{duration.fast}", "duration"), "fade-ease": t("{ease.standard}"),
  };
  component.icon = {
    "size-sm": t("1rem", "dimension"), "size-md": t("1.25rem", "dimension"), "size-lg": t("1.5rem", "dimension"), "size-xl": t("2rem", "dimension"), stroke: t(ICON_STROKE_VALUE[b.icons?.stroke ?? "regular"], "number"), cap: t(b.icons?.cap ?? "round"), join: t((b.icons?.cap ?? "round") === "round" ? "round" : "miter"),
    fg: t("{color.text.primary}", "color"), muted: t("{color.text.secondary}", "color"), accent: t("{color.accent.ink}", "color"), success: t("{color.success-ink}", "color"), danger: t("{color.danger-ink}", "color"),
  };
  component.badge = {
    height: t("1.5rem", "dimension"), "padding-x": t("0.5rem", "dimension"), radius: t("{radius.control}", "dimension"), font: t("{font.sans}"), size: t("{font-size.xs}", "dimension"), weight: t("{font-weight.semibold}", "number"),
    "neutral-bg": t("{color.surface.sunken}", "color"), "neutral-fg": t("{color.text.primary}", "color"), "neutral-solid-bg": t("{color.text.primary}", "color"), "neutral-solid-fg": t("{color.surface.base}", "color"), "neutral-line": t("{color.border.control}", "color"),
    "accent-bg": t("{color.accent.subtle}", "color"), "accent-fg": t("{color.accent.ink}", "color"), "accent-solid-bg": t("{color.accent.DEFAULT}", "color"), "accent-solid-fg": t("{color.on-accent}", "color"),
    "success-fg": t("{color.success-ink}", "color"), "success-solid-bg": t("{color.success}", "color"), "success-solid-fg": t("{color.on-success}", "color"),
    "danger-fg": t("{color.danger-ink}", "color"), "danger-solid-bg": t("{color.danger}", "color"), "danger-solid-fg": t("{color.on-danger}", "color"),
    "chip-height": t("2rem", "dimension"), "chip-bg": t("{color.surface.raised}", "color"), "chip-fg": t("{color.text.primary}", "color"), "chip-border": t("{color.border.control}", "color"), "chip-on-bg": t("{color.accent.DEFAULT}", "color"), "chip-on-fg": t("{color.on-accent}", "color"),
    "chip-hover": t("{color.surface.sunken}", "color"), focus: t("{color.focus}", "color"), "focus-width": t("2px", "dimension"), "fade-duration": t("{duration.fast}", "duration"), "fade-ease": t("{ease.standard}"),
  };
  component.sech = {
    fg: t("{color.text.primary}", "color"), muted: t("{color.text.secondary}", "color"), eyebrow: t("{color.accent.ink}", "color"), hl: t("{color.accent.ink}", "color"), "hl-to": t("{color.accent.ink}", "color"),
    font: t("{font.sans}"), display: t("{font.display}"), gap: t("0.875rem", "dimension"), measure: t("44rem", "dimension"), "split-gap": t("{space.12}", "dimension"),
    "eyebrow-size": t("{font-size.xs}", "dimension"), "eyebrow-weight": t("{font-weight.semibold}", "number"), "eyebrow-tracking": t("0.16em", "dimension"), "rule-length": t("1.125rem", "dimension"), "rule-width": t("1px", "dimension"),
    "title-min": t("{font-size.xl}", "dimension"), "title-max": t("{font-size.4xl}", "dimension"), "title-weight": t("{font-weight.bold}", "number"), "title-tracking": t("{tracking.tight}", "dimension"), "title-lh": t("{line-height.tight}", "number"),
    "lede-min": t("{font-size.sm}", "dimension"), "lede-max": t("{font-size.lg}", "dimension"), "lede-lh": t("{line-height.relaxed}", "number"),
  };
  component.rotw = {
    from: t("{color.accent.ink}", "color"), to: t("{color.accent.ink}", "color"), distance: t("0.875rem", "dimension"),
    "fade-duration": t("{duration.slow}", "duration"), "move-duration": t("{duration.slow}", "duration"), ease: t("{ease.out}"),
  };
  component.rvl = {
    distance: t("2rem", "dimension"), shift: t("0.625rem", "dimension"), "rise-scale": t("0.975", "number"), "pop-scale": t("0.94", "number"),
    "fade-duration": t("{duration.slow}", "duration"), "move-duration": t("{duration.slow}", "duration"), ease: t("{ease.out}"),
  };
  component.scp = {
    from: t("{color.accent.ink}", "color"), to: t("{color.accent.ink}", "color"), track: t("{color.border.subtle}", "color"),
    height: t("2px", "dimension"), "height-thick": t("6px", "dimension"), z: t("{z.overlay}", "number"), duration: t("{duration.fast}", "duration"), ease: t("linear"),
  };
  component.chat = {
    bg: t("{color.accent.DEFAULT}", "color"), fg: t("{color.on-accent}", "color"), size: t("3.375rem", "dimension"), radius: t("{radius.full}", "dimension"), "radius-box": t("{radius.control}", "dimension"),
    offset: t("{space.6}", "dimension"), z: t("{z.sticky}", "number"), shadow: t("{elevation.2}"), gap: t("{space.2}", "dimension"), "pad-x": t("{space.5}", "dimension"),
    "hover-scale": t("1.08", "number"), duration: t("{duration.quick}", "duration"), ease: t("{ease.out}"), "enter-duration": t("{duration.slow}", "duration"), "enter-delay": t("{duration.slow}", "duration"),
    focus: t("{color.focus}", "color"), "focus-width": t("2px", "dimension"), font: t("{font.sans}"),
  };
  component.bnd = {
    bg: t("{color.text.primary}", "color"), fg: t("{color.surface.base}", "color"), muted: t("{color.surface.sunken}", "color"), border: t("{color.border.strong}", "color"), radius: t("{radius.container}", "dimension"),
    "pad-y": t("{space.16}", "dimension"), pad: t("{space.10}", "dimension"), "pad-wide": t("{space.16}", "dimension"), gap: t("{space.8}", "dimension"), "gap-actions": t("{space.3}", "dimension"),
    max: t("47.5rem", "dimension"), "text-max": t("38.75rem", "dimension"), font: t("{font.sans}"), display: t("{font.display}"),
    "title-size": t("{font-size.3xl}", "dimension"), "text-size": t("{font-size.md}", "dimension"), "label-size": t("{font-size.xs}", "dimension"),
    "weight-bold": t("{font-weight.bold}", "number"), "weight-semibold": t("{font-weight.semibold}", "number"), "lh-tight": t("{line-height.tight}", "number"), "lh-relaxed": t("{line-height.relaxed}", "number"),
    "tracking-tight": t("{tracking.tight}", "dimension"), "tracking-wide": t("{tracking.wide}", "dimension"),
    "glow-a": t("color-mix(in oklch, {color.accent.DEFAULT} 40%, transparent)", "color"), "glow-b": t("color-mix(in oklch, {color.accent.DEFAULT} 18%, transparent)", "color"),
  };
  component.aud = {
    bg: t("{color.surface.raised}", "color"), fg: t("{color.text.primary}", "color"), muted: t("{color.text.secondary}", "color"), border: t("{color.border.subtle}", "color"), radius: t("{radius.container}", "dimension"),
    pad: t("{space.8}", "dimension"), "pad-wide": t("{space.12}", "dimension"), "gap-wide": t("{space.8}", "dimension"), font: t("{font.sans}"), display: t("{font.display}"),
    eyebrow: t("{color.accent.ink}", "color"), "title-size": t("{font-size.3xl}", "dimension"), "text-size": t("{font-size.md}", "dimension"), "note-size": t("{font-size.xs}", "dimension"), "label-size": t("{font-size.xs}", "dimension"),
    "weight-bold": t("{font-weight.bold}", "number"), "weight-semibold": t("{font-weight.semibold}", "number"), "lh-tight": t("{line-height.tight}", "number"), "lh-relaxed": t("{line-height.relaxed}", "number"),
    "tracking-tight": t("{tracking.tight}", "dimension"), "tracking-wide": t("{tracking.wide}", "dimension"),
    "hl-from": t("{color.accent.ink}", "color"), "hl-to": t("color-mix(in oklch, {color.accent.ink} 60%, {color.text.primary})", "color"),
    "glow-a": t("color-mix(in oklch, {color.accent.DEFAULT} 14%, transparent)", "color"), "glow-b": t("color-mix(in oklch, {color.accent.DEFAULT} 8%, transparent)", "color"),
    "ring-1": t("color-mix(in oklch, {color.accent.DEFAULT} 20%, transparent)", "color"), "ring-2": t("color-mix(in oklch, {color.accent.DEFAULT} 28%, transparent)", "color"), "ring-3": t("color-mix(in oklch, {color.accent.DEFAULT} 36%, transparent)", "color"),
    pulse: t("{color.accent.DEFAULT}", "color"), "pulse-duration": t("{duration.orbit}", "duration"), ease: t("{ease.out}"),
    "core-size": t("6.5rem", "dimension"), "core-from": t("{color.accent.DEFAULT}", "color"), "core-to": t("{color.accent.hover}", "color"), "core-fg": t("{color.on-accent}", "color"),
    "core-glow": t("color-mix(in oklch, {color.accent.DEFAULT} 45%, transparent)", "color"), "radar-max": t("21.25rem", "dimension"),
    "pill-bg": t("{color.surface.base}", "color"), "pill-fg": t("{color.text.primary}", "color"), "pill-border": t("{color.border.subtle}", "color"), "pill-radius": t("{radius.control}", "dimension"), "pill-dot": t("{color.accent.DEFAULT}", "color"),
  };
  component.ftr = {
    bg: t("{color.surface.sunken}", "color"), fg: t("{color.text.primary}", "color"), muted: t("{color.text.secondary}", "color"), border: t("{color.border.subtle}", "color"),
    radius: t("{radius.control}", "dimension"), font: t("{font.sans}"), gap: t("2.5rem", "dimension"), gutter: t("{space.4}", "dimension"), "padding-y": t("3.5rem", "dimension"),
    "max-width": t("80rem", "dimension"), "link-height": t("1.75rem", "dimension"), focus: t("{color.focus}", "color"), "focus-width": t("2px", "dimension"),
    sig: t("{color.text.primary}", "color"), "sig-strength": t("14%"), "sig-size": t("clamp(2.75rem, 17.4vw, 16rem)"),
    "fade-duration": t("{duration.fast}", "duration"), "fade-ease": t("{ease.standard}"),
  };
  component.prj = {
    bg: t("{color.surface.raised}", "color"), "bg-hover": t("{color.surface.raised}", "color"), fg: t("{color.text.primary}", "color"), muted: t("{color.text.secondary}", "color"),
    border: t("{color.border.subtle}", "color"), "border-hover": t("{color.border.control}", "color"), radius: t("{radius.container}", "dimension"), "chrome-corner": t("{radius.control}", "dimension"),
    padding: t(dx.cardPad, "dimension"), font: t("{font.sans}"), focus: t("{color.focus}", "color"), "focus-width": t("2px", "dimension"),
    "fade-duration": t("{duration.fast}", "duration"), "fade-ease": t("{ease.standard}"), "zoom-duration": t("{duration.base}", "duration"), "zoom-scale": t("1.04", "number"),
    lift: t("-2px", "dimension"), "shadow-hover": t("{elevation.2}"), "media-ratio": t("4 / 3"),
    "chip-bg": t("color-mix(in oklch, {color.surface.raised} 94%, transparent)", "color"), "chip-border": t("{color.border.subtle}", "color"), "chip-fg": t("{color.text.primary}", "color"), "chip-muted": t("{color.text.secondary}", "color"),
    "dot-1": t("{color.danger}", "color"), "dot-2": t("{color.accent.DEFAULT}", "color"), "dot-3": t("{color.success}", "color"),
    "url-bar": t("color-mix(in oklch, {color.text.primary} 6%, transparent)", "color"),
    accent: t("{color.accent.ink}", "color"), "accent-soft": t("{color.accent.subtle}", "color"), rule: t("{color.border.subtle}", "color"),
  };
  component.tsl = {
    bg: t("{color.surface.raised}", "color"), fg: t("{color.text.primary}", "color"), muted: t("{color.text.secondary}", "color"), border: t("{color.border.subtle}", "color"),
    radius: t("{radius.container}", "dimension"), padding: t(dx.cardPad, "dimension"), font: t("{font.sans}"),
    mark: t("{color.accent.ink}", "color"), "avatar-bg": t("{color.accent.subtle}", "color"), "avatar-fg": t("{color.accent.ink}", "color"),
    track: t("{color.border.control}", "color"), "track-height": t("0.25rem", "dimension"), fill: t("{color.accent.ink}", "color"),
    "btn-bg": t("{color.surface.raised}", "color"), "btn-bg-hover": t("{color.surface.sunken}", "color"), "btn-fg": t("{color.text.primary}", "color"), "btn-border": t("{color.border.control}", "color"), "btn-radius": t("{radius.control}", "dimension"),
    focus: t("{color.focus}", "color"), "focus-width": t("2px", "dimension"),
    "slide-duration": t("{duration.slow}", "duration"), "slide-ease": t("{ease.out}"), "fade-duration": t("{duration.fast}", "duration"), "fade-ease": t("{ease.standard}"),
  };
  component.ptl = {
    fg: t("{color.text.primary}", "color"), muted: t("{color.text.secondary}", "color"), font: t("{font.sans}"),
    "node-size": t("3rem", "dimension"), "node-bg": t("{color.surface.base}", "color"), "node-border": t("{color.border.control}", "color"), "node-fg": t("{color.text.secondary}", "color"),
    "node-border-on": t("{color.accent.ink}", "color"), "node-fg-on": t("{color.accent.ink}", "color"), "node-bg-current": t("{color.accent.subtle}", "color"), "node-fg-current": t("{color.accent.ink}", "color"),
    line: t("{color.border.subtle}", "color"), "line-width": t("2px", "dimension"), fill: t("{color.accent.ink}", "color"), head: t("{color.accent.ink}", "color"),
    gap: t("2.375rem", "dimension"), "col-gap": t("1.375rem", "dimension"), "text-max": t("32.5rem", "dimension"),
    "glide-duration": t("{duration.base}", "duration"), "glide-ease": t("{ease.out}"), "fade-duration": t("{duration.fast}", "duration"), "fade-ease": t("{ease.standard}"),
  };
  component.avt = {
    "size-sm": t("2rem", "dimension"), "size-md": t("2.5rem", "dimension"), "size-lg": t("3.5rem", "dimension"), "size-xl": t("5rem", "dimension"), radius: t("{radius.control}", "dimension"),
    bg: t("{color.accent.subtle}", "color"), fg: t("{color.accent.ink}", "color"), font: t("{font.sans}"), ring: t("{color.accent.ink}", "color"), "ring-width": t("2px", "dimension"), "ring-gap": t("2px", "dimension"), gap: t("{color.surface.base}", "color"),
  };
  component.lay = {
    rule: t("{color.border.control}", "color"), "rule-subtle": t("{color.border.subtle}", "color"), muted: t("{color.text.secondary}", "color"), font: t("{font.sans}"), "rule-width": t("1px", "dimension"), "rule-thick": t("3px", "dimension"),
    "container-sm": t("40rem", "dimension"), "container-md": t("48rem", "dimension"), "container-lg": t("64rem", "dimension"), "container-xl": t("80rem", "dimension"), "container-prose": t("42rem", "dimension"), gutter: t("{space.4}", "dimension"),
    "gap-1": t("{space.1}", "dimension"), "gap-2": t("{space.2}", "dimension"), "gap-3": t("{space.3}", "dimension"), "gap-4": t("{space.4}", "dimension"), "gap-6": t("{space.6}", "dimension"), "gap-8": t("{space.8}", "dimension"), "gap-12": t("{space.12}", "dimension"),
  };
  component.ldr = {
    "size-sm": t("1rem", "dimension"), "size-md": t("1.5rem", "dimension"), "size-lg": t("2.5rem", "dimension"), stroke: t("{color.accent.ink}", "color"), track: t("{color.border.subtle}", "color"), fg: t("{color.text.primary}", "color"), muted: t("{color.text.secondary}", "color"), font: t("{font.sans}"),
    "spin-duration": t("{duration.spin}", "duration"), "pulse-duration": t("{duration.slow}", "duration"), "bar-height": t("0.625rem", "dimension"), "bar-height-thin": t("0.25rem", "dimension"), "bar-track": t("{color.surface.sunken}", "color"), "bar-fill": t("{color.accent.ink}", "color"),
    "bar-border": t("{color.border.control}", "color"), "bar-gap": t("{color.surface.raised}", "color"), radius: t("{radius.control}", "dimension"), "fill-duration": t("{duration.base}", "duration"), "fill-ease": t("{ease.out}"), "slide-duration": t("{duration.orbit}", "duration"),
  };
  component.pop = {
    bg: t("{color.surface.raised}", "color"), fg: t("{color.text.primary}", "color"), muted: t("{color.text.secondary}", "color"), border: t("{color.border.subtle}", "color"),
    radius: t("{radius.container}", "dimension"), shadow: t("{elevation.2}"), padding: t("1rem", "dimension"), gap: t("0.5rem", "dimension"), width: t("min(20rem, calc(100vw - 2rem))"),
    font: t("{font.sans}"), focus: t("{color.focus}", "color"), "focus-width": t("2px", "dimension"), "trigger-border": t("{color.border.control}", "color"), "bg-hover": t("{color.surface.sunken}", "color"),
    z: t("{z.overlay}", "number"), "enter-duration": t("{duration.fast}", "duration"), "exit-duration": t("{duration.fast}", "duration"), ease: t("{ease.out}"),
  };
  component.tip = {
    bg: t("{color.text.primary}", "color"), fg: t("{color.surface.base}", "color"), radius: t("{radius.control}", "dimension"), padding: t("0.375rem 0.625rem"), "max-width": t("18rem", "dimension"),
    font: t("{font.sans}"), z: t("{z.toast}", "number"), "enter-duration": t("{duration.fast}", "duration"), ease: t("{ease.out}"),
    border: t("transparent"), "trigger-bg": t("{color.surface.raised}", "color"), "trigger-fg": t("{color.text.primary}", "color"), "trigger-border": t("{color.border.control}", "color"),
    focus: t("{color.focus}", "color"), "focus-width": t("2px", "dimension"),
  };
  component.tst = {
    bg: t("{color.surface.raised}", "color"), fg: t("{color.text.primary}", "color"), muted: t("{color.text.secondary}", "color"), border: t("{color.border.subtle}", "color"),
    radius: t("{radius.container}", "dimension"), shadow: t("{elevation.2}"), padding: t("0.875rem 1rem"), gap: t("0.625rem", "dimension"), width: t("min(24rem, calc(100vw - 2rem))"),
    "tone-info": t("{color.accent.ink}", "color"), "tone-success": t("{color.success-ink}", "color"), "tone-critical": t("{color.danger-ink}", "color"), "tone-width": t("4px", "dimension"),
    font: t("{font.sans}"), focus: t("{color.focus}", "color"), "focus-width": t("2px", "dimension"), "close-bg-hover": t("{color.surface.sunken}", "color"),
    z: t("{z.toast}", "number"), "enter-duration": t("{duration.quick}", "duration"), ease: t("{ease.out}"),
  };

  const built = { primitive, semanticLight: mode(false), semanticDark: mode(true), component };
  const applied = applyOverrides(built, b.overrides);
  return { ...built, report: contrastReport(built), seedStep, overridesApplied: applied };
}

type Trees = Pick<BrandTokens, "primitive" | "semanticLight" | "semanticDark" | "component">;

const isTok = (n: unknown): n is Tok => !!n && typeof n === "object" && "$value" in (n as object);
function getTok(tree: Tree, path: string): Tok | undefined {
  let cur: Tree | Tok | undefined = tree;
  for (const p of path.split(".")) {
    if (!cur || isTok(cur)) return undefined;
    cur = (cur as Tree)[p];
  }
  return isTok(cur) ? cur : undefined;
}

/**
 * T4 site overrides. Key = dotted token path, optionally prefixed `light:` / `dark:` for mode-specific
 * semantic tokens. Unknown paths are reported (never silently ignored). Returns the keys that were applied.
 */
export function applyOverrides(trees: Trees, overrides: Record<string, string>): { applied: string[]; unknown: string[] } {
  const applied: string[] = [], unknown: string[] = [];
  for (const [rawKey, value] of Object.entries(overrides)) {
    const m = /^(light|dark):(.+)$/.exec(rawKey);
    const path = m ? m[2]! : rawKey;
    const targets: Tree[] = m?.[1] === "light" ? [trees.semanticLight]
      : m?.[1] === "dark" ? [trees.semanticDark]
      : [trees.primitive, trees.semanticLight, trees.semanticDark, trees.component];
    let hit = false;
    for (const tree of targets) { const tok = getTok(tree, path); if (tok) { tok.$value = value; hit = true; } }
    (hit ? applied : unknown).push(rawKey);
  }
  return { applied, unknown };
}

const PAIRS: Array<[string, string, string, number]> = [
  ["text/surface", "color.text.primary", "color.surface.base", 4.5],
  ["text/surface-raised", "color.text.primary", "color.surface.raised", 4.5],
  ["text/surface-sunken", "color.text.primary", "color.surface.sunken", 4.5],
  ["text-secondary/surface", "color.text.secondary", "color.surface.base", 4.5],
  ["accent-ink/surface", "color.accent.ink", "color.surface.base", 4.5],
  ["on-accent/accent", "color.on-accent", "color.accent.DEFAULT", 4.5],
  ["on-accent/accent-hover", "color.on-accent", "color.accent.hover", 4.5],
  ["text-secondary/surface-raised", "color.text.secondary", "color.surface.raised", 4.5],
  ["text-secondary/surface-sunken", "color.text.secondary", "color.surface.sunken", 4.5],
  ["danger-ink/surface", "color.danger-ink", "color.surface.base", 4.5],
  ["danger-ink/surface-raised", "color.danger-ink", "color.surface.raised", 4.5],
  ["danger-ink/surface-sunken", "color.danger-ink", "color.surface.sunken", 4.5],
  ["success-ink/surface-raised", "color.success-ink", "color.surface.raised", 4.5],
  ["border-control/surface (non-text 3:1)", "color.border.control", "color.surface.base", 3],
  ["border-control/surface-raised (non-text 3:1)", "color.border.control", "color.surface.raised", 3],
  ["border-control/surface-sunken (non-text 3:1)", "color.border.control", "color.surface.sunken", 3],
  ["on-success/success", "color.on-success", "color.success", 4.5],
  ["on-danger/danger", "color.on-danger", "color.danger", 4.5],
  ["accent-ink/accent-subtle", "color.accent.ink", "color.accent.subtle", 4.5],
  ["accent-ink/surface-raised (text)", "color.accent.ink", "color.surface.raised", 4.5],
  ["accent-ink/surface-sunken (text)", "color.accent.ink", "color.surface.sunken", 4.5],
  ["success-ink/surface", "color.success-ink", "color.surface.base", 4.5],
  ["success-ink/surface-sunken", "color.success-ink", "color.surface.sunken", 4.5],
  ["accent-ink/surface-raised (non-text 3:1)", "color.accent.ink", "color.surface.raised", 3],
  ["accent-ink/surface-sunken (non-text 3:1)", "color.accent.ink", "color.surface.sunken", 3],
];

/** Contrast gate computed from the FINAL token values (after overrides), per mode. */
export function contrastReport(trees: Pick<BrandTokens, "semanticLight" | "semanticDark">): ContrastRow[] {
  const rows: ContrastRow[] = [];
  for (const [mode, tree] of [["light", trees.semanticLight], ["dark", trees.semanticDark]] as const) {
    for (const [name, fg, bg, min] of PAIRS) {
      const f = getTok(tree, fg)?.$value, g = getTok(tree, bg)?.$value;
      if (!f || !g) continue;
      const ratio = Math.round(contrast(f, g) * 100) / 100;
      rows.push({ pair: `${mode} ${name}`, ratio, min, ok: ratio >= min });
    }
  }
  return rows;
}
