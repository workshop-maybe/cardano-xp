/**
 * Cardano XP — Type-Safe Theme Configuration
 *
 * Colors use OKLCh for perceptual uniformity. Three hue families:
 *   Depth (indigo-blue h248) — "this is Cardano"
 *   Earned (amber-gold h85) — "achievement unlocked"
 *   Milestone (teal h175) — "progress made"
 *
 * @see src/styles/globals.css — CSS custom property definitions
 * @see docs/tokenomics.md — XP token design informing semantic naming
 */

// ---------------------------------------------------------------------------
// OKLCh Color Primitive
// ---------------------------------------------------------------------------

interface OklchColor {
  readonly l: number;
  readonly c: number;
  readonly h: number;
}

function oklch({ l, c, h }: OklchColor): string {
  return `oklch(${l} ${c} ${h})`;
}

function color(l: number, c: number, h: number): OklchColor {
  return { l, c, h } as const;
}

// ---------------------------------------------------------------------------
// Color Palette
// ---------------------------------------------------------------------------

const PALETTE = {
  /** Cardano Blue — anchor hue. Slightly desaturated from IOG blue. */
  depth: {
    50: color(0.97, 0.008, 248),
    100: color(0.93, 0.018, 248),
    200: color(0.87, 0.035, 248),
    300: color(0.78, 0.065, 248),
    400: color(0.67, 0.105, 248),
    500: color(0.55, 0.145, 248),
    600: color(0.45, 0.155, 248),
    700: color(0.37, 0.14, 248),
    800: color(0.29, 0.11, 248),
    900: color(0.22, 0.075, 248),
    950: color(0.14, 0.012, 248),
  },

  /** Earned Gold — warm amber for achievement. */
  earned: {
    50: color(0.98, 0.012, 85),
    100: color(0.95, 0.035, 85),
    200: color(0.9, 0.075, 85),
    300: color(0.84, 0.12, 85),
    400: color(0.78, 0.155, 85),
    500: color(0.72, 0.17, 85),
    600: color(0.64, 0.16, 85),
    700: color(0.54, 0.135, 85),
    800: color(0.44, 0.105, 85),
    900: color(0.34, 0.07, 85),
    950: color(0.24, 0.04, 85),
  },

  /** Milestone Teal — cool complement for progress and completion. */
  milestone: {
    50: color(0.97, 0.01, 175),
    100: color(0.93, 0.025, 175),
    200: color(0.87, 0.055, 175),
    300: color(0.79, 0.095, 175),
    400: color(0.7, 0.125, 175),
    500: color(0.6, 0.14, 175),
    600: color(0.5, 0.13, 175),
    700: color(0.42, 0.11, 175),
    800: color(0.34, 0.085, 175),
    900: color(0.26, 0.06, 175),
    950: color(0.18, 0.035, 175),
  },

  /** Neutral — blue-tinted grays for surfaces and text. */
  neutral: {
    50: color(0.98, 0.003, 248),
    100: color(0.96, 0.005, 248),
    200: color(0.92, 0.008, 248),
    300: color(0.87, 0.012, 248),
    400: color(0.71, 0.015, 248),
    500: color(0.55, 0.018, 248),
    600: color(0.45, 0.016, 248),
    700: color(0.37, 0.014, 248),
    800: color(0.27, 0.013, 248),
    900: color(0.2, 0.013, 248),
    950: color(0.14, 0.012, 248),
  },

  /** Signal Red — destructive actions and errors only. */
  signal: {
    400: color(0.7, 0.185, 25),
    500: color(0.6, 0.22, 25),
    600: color(0.52, 0.21, 25),
  },
} as const;

// ---------------------------------------------------------------------------
// Semantic Token Types
// ---------------------------------------------------------------------------

interface ColorPair {
  readonly base: string;
  readonly foreground: string;
}

interface SemanticTokens {
  readonly background: string;
  readonly foreground: string;
  readonly card: ColorPair;
  readonly popover: ColorPair;
  readonly muted: ColorPair;

  readonly primary: ColorPair;
  readonly secondary: ColorPair;
  readonly accent: ColorPair;

  // XP-specific semantic tokens
  readonly xpEarned: ColorPair;
  readonly xpStaked: ColorPair;
  readonly xpMilestone: ColorPair;
  readonly xpStreak: ColorPair;
  readonly xpGiven: ColorPair;

  readonly destructive: string;
  readonly success: ColorPair;
  readonly warning: ColorPair;
  readonly info: ColorPair;

  readonly border: string;
  readonly input: string;
  readonly ring: string;

  readonly chart1: string;
  readonly chart2: string;
  readonly chart3: string;
  readonly chart4: string;
  readonly chart5: string;
}

// ---------------------------------------------------------------------------
// Semantic Token Definitions
// ---------------------------------------------------------------------------

const LIGHT_TOKENS: SemanticTokens = {
  background: oklch(PALETTE.neutral[50]),
  foreground: oklch(PALETTE.neutral[950]),

  card: { base: "oklch(1 0 0)", foreground: oklch(PALETTE.neutral[950]) },
  popover: { base: "oklch(1 0 0)", foreground: oklch(PALETTE.neutral[950]) },
  muted: {
    base: oklch(PALETTE.neutral[100]),
    foreground: oklch(PALETTE.neutral[500]),
  },

  primary: { base: oklch(PALETTE.depth[600]), foreground: "oklch(1 0 0)" },
  secondary: {
    base: oklch(PALETTE.earned[500]),
    foreground: oklch(PALETTE.neutral[950]),
  },
  accent: {
    base: oklch(PALETTE.neutral[100]),
    foreground: oklch(PALETTE.neutral[950]),
  },

  xpEarned: {
    base: oklch(PALETTE.earned[500]),
    foreground: oklch(PALETTE.neutral[950]),
  },
  xpStaked: { base: oklch(PALETTE.depth[500]), foreground: "oklch(1 0 0)" },
  xpMilestone: {
    base: oklch(PALETTE.milestone[500]),
    foreground: "oklch(1 0 0)",
  },
  xpStreak: {
    base: oklch(PALETTE.earned[400]),
    foreground: oklch(PALETTE.neutral[950]),
  },
  xpGiven: {
    base: oklch(PALETTE.milestone[400]),
    foreground: oklch(PALETTE.neutral[950]),
  },

  destructive: oklch(PALETTE.signal[500]),
  success: { base: oklch(PALETTE.milestone[600]), foreground: "oklch(1 0 0)" },
  warning: {
    base: oklch(PALETTE.earned[400]),
    foreground: oklch(PALETTE.neutral[950]),
  },
  info: { base: oklch(PALETTE.depth[500]), foreground: "oklch(1 0 0)" },

  border: oklch(PALETTE.neutral[200]),
  input: oklch(PALETTE.neutral[200]),
  ring: oklch(PALETTE.depth[500]),

  chart1: oklch(PALETTE.depth[500]),
  chart2: oklch(PALETTE.earned[500]),
  chart3: oklch(PALETTE.milestone[500]),
  chart4: oklch(PALETTE.depth[400]),
  chart5: oklch(PALETTE.earned[400]),
};

const DARK_TOKENS: SemanticTokens = {
  background: oklch(PALETTE.neutral[950]),
  foreground: oklch(PALETTE.neutral[100]),

  card: {
    base: oklch(PALETTE.neutral[900]),
    foreground: oklch(PALETTE.neutral[100]),
  },
  popover: {
    base: oklch(PALETTE.neutral[900]),
    foreground: oklch(PALETTE.neutral[100]),
  },
  muted: {
    base: oklch(PALETTE.neutral[900]),
    foreground: oklch(PALETTE.neutral[400]),
  },

  primary: {
    base: oklch(PALETTE.depth[400]),
    foreground: oklch(PALETTE.neutral[950]),
  },
  secondary: {
    base: oklch(PALETTE.earned[400]),
    foreground: oklch(PALETTE.neutral[950]),
  },
  accent: {
    base: oklch(PALETTE.neutral[800]),
    foreground: oklch(PALETTE.neutral[100]),
  },

  xpEarned: {
    base: oklch(PALETTE.earned[400]),
    foreground: oklch(PALETTE.neutral[950]),
  },
  xpStaked: {
    base: oklch(PALETTE.depth[400]),
    foreground: oklch(PALETTE.neutral[950]),
  },
  xpMilestone: {
    base: oklch(PALETTE.milestone[400]),
    foreground: oklch(PALETTE.neutral[950]),
  },
  xpStreak: {
    base: oklch(PALETTE.earned[300]),
    foreground: oklch(PALETTE.neutral[950]),
  },
  xpGiven: {
    base: oklch(PALETTE.milestone[300]),
    foreground: oklch(PALETTE.neutral[950]),
  },

  destructive: oklch(PALETTE.signal[400]),
  success: {
    base: oklch(PALETTE.milestone[400]),
    foreground: oklch(PALETTE.neutral[950]),
  },
  warning: {
    base: oklch(PALETTE.earned[300]),
    foreground: oklch(PALETTE.neutral[950]),
  },
  info: {
    base: oklch(PALETTE.depth[400]),
    foreground: oklch(PALETTE.neutral[950]),
  },

  border: oklch(PALETTE.neutral[800]),
  input: oklch(PALETTE.neutral[800]),
  ring: oklch(PALETTE.depth[400]),

  chart1: oklch(PALETTE.depth[400]),
  chart2: oklch(PALETTE.earned[400]),
  chart3: oklch(PALETTE.milestone[400]),
  chart4: oklch(PALETTE.depth[300]),
  chart5: oklch(PALETTE.earned[300]),
};

// ---------------------------------------------------------------------------
// Motion & Animation Tokens
// ---------------------------------------------------------------------------

const EASING = {
  productive: "cubic-bezier(0.4, 0, 0.2, 1)",
  emphasized: "cubic-bezier(0.83, 0, 0.17, 1)",
  enter: "cubic-bezier(0, 0, 0.2, 1)",
  exit: "cubic-bezier(0.4, 0, 1, 1)",
  celebration: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  settle: "cubic-bezier(0.22, 1.3, 0.36, 1)",
} as const;

const DURATION = {
  instant: "100ms",
  quick: "150ms",
  standard: "250ms",
  deliberate: "400ms",
  dramatic: "600ms",
  countUp: "1200ms",
  celebrationBurst: "800ms",
} as const;

const ANIMATION_PRESETS = {
  xpCountUp: { duration: DURATION.countUp, easing: EASING.settle },
  credentialReveal: { duration: DURATION.dramatic, easing: EASING.celebration },
  progressAdvance: { duration: DURATION.deliberate, easing: EASING.settle },
  notificationEnter: { duration: DURATION.standard, easing: EASING.enter },
  notificationExit: { duration: DURATION.quick, easing: EASING.exit },
  balancePulse: { duration: DURATION.standard, easing: EASING.celebration },
  cardHover: { duration: DURATION.quick, easing: EASING.productive },
  pageEnter: { duration: DURATION.deliberate, easing: EASING.enter },
} as const;

// ---------------------------------------------------------------------------
// Component Variant Types — XP Progression States
// ---------------------------------------------------------------------------

type ProgressionState =
  | "locked"
  | "available"
  | "in-progress"
  | "submitted"
  | "completed"
  | "mastered";

type XpDisplayState =
  | "idle"
  | "earning"
  | "giving"
  | "staked"
  | "snapshot";

type ContributionStatus =
  | "open"
  | "committed"
  | "in-review"
  | "accepted"
  | "revision"
  | "denied";

const PROGRESSION_COLOR_MAP: Record<ProgressionState, keyof SemanticTokens> = {
  locked: "muted",
  available: "accent",
  "in-progress": "info",
  submitted: "warning",
  completed: "success",
  mastered: "xpMilestone",
} as const;

const XP_DISPLAY_COLOR_MAP: Record<XpDisplayState, keyof SemanticTokens> = {
  idle: "xpEarned",
  earning: "xpEarned",
  giving: "xpGiven",
  staked: "xpStaked",
  snapshot: "xpMilestone",
} as const;

const CONTRIBUTION_COLOR_MAP: Record<
  ContributionStatus,
  keyof SemanticTokens
> = {
  open: "accent",
  committed: "info",
  "in-review": "warning",
  accepted: "success",
  revision: "xpStreak",
  denied: "destructive" as keyof SemanticTokens,
} as const;

// ---------------------------------------------------------------------------
// Exported Theme Object
// ---------------------------------------------------------------------------

export const THEME = {
  palette: PALETTE,
  tokens: { light: LIGHT_TOKENS, dark: DARK_TOKENS },
  motion: { easing: EASING, duration: DURATION, presets: ANIMATION_PRESETS },
  colorMaps: {
    progression: PROGRESSION_COLOR_MAP,
    xpDisplay: XP_DISPLAY_COLOR_MAP,
    contribution: CONTRIBUTION_COLOR_MAP,
  },
} as const;

// ---------------------------------------------------------------------------
// Exported Types
// ---------------------------------------------------------------------------

export type { OklchColor, ColorPair, SemanticTokens };
export type { ProgressionState, XpDisplayState, ContributionStatus };

export type ThemeMode = "light" | "dark";
export type PaletteScale = keyof typeof PALETTE;
export type EasingToken = keyof typeof EASING;
export type DurationToken = keyof typeof DURATION;
export type AnimationPreset = keyof typeof ANIMATION_PRESETS;

export type ColorPairToken = {
  [K in keyof SemanticTokens]: SemanticTokens[K] extends ColorPair ? K : never;
}[keyof SemanticTokens];

export type PlainColorToken = {
  [K in keyof SemanticTokens]: SemanticTokens[K] extends string ? K : never;
}[keyof SemanticTokens];

// ---------------------------------------------------------------------------
// CSS Generation Helper
// ---------------------------------------------------------------------------

export function generateCssVariables(tokens: SemanticTokens): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(tokens)) {
    const cssKey = key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

    if (typeof value === "string") {
      lines.push(`  --${cssKey}: ${value};`);
    } else if (
      typeof value === "object" &&
      value !== null &&
      "base" in value &&
      "foreground" in value
    ) {
      const pair = value as ColorPair;
      lines.push(`  --${cssKey}: ${pair.base};`);
      lines.push(`  --${cssKey}-foreground: ${pair.foreground};`);
    }
  }

  return lines.join("\n");
}
