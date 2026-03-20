---
title: "Distinctive Cardano XP Theme Design with OKLCh Palette and Glass UI"
slug: "cardano-xp-theme-oklch-glass-ui"
category: "ui-bugs"
tags:
  - "theming"
  - "oklch"
  - "tailwind"
  - "cardano"
  - "branding"
  - "animations"
  - "accessibility"
  - "design-tokens"
severity: "enhancement"
component: "src/config/theme.ts"
symptoms:
  - "Generic orange/blue color scheme inherited from Andamio app template"
  - "Indistinguishable from other shadcn/crypto template projects"
  - "No semantic design tokens tied to XP domain concepts"
  - "Missing visual identity for Cardano ecosystem membership"
root_cause: "Project forked from a general-purpose template with default branding, lacking a purpose-built color palette, typography, and interaction design aligned with the XP token concept and Cardano ecosystem identity"
solved_date: "2026-03-15"
applies_to: "cardano-xp"
---

## Problem

Cardano XP, a dApp built on the Andamio app template, shipped with the template's default shadcn orange/blue theme. Every page looked like a generic crypto dashboard. The project needed a visual identity that immediately communicated "Cardano ecosystem" while standing apart from the standard IOG blue, and it needed domain-specific design tokens for XP (experience points), progression states, and achievement feedback.

## Investigation (the multi-expert approach)

Four specialized expert agents were run in parallel, each analyzing the problem from a different angle:

1. **TypeScript Reviewer** -- Designed a type-safe theme architecture with OKLCh color scales, XP-specific semantic tokens (`xpEarned`, `xpStaked`, `xpMilestone`, `xpStreak`, `xpGiven`), exhaustive component state types, and a CSS generation helper.

2. **Frontend Races Reviewer** -- Designed race-condition-free animation patterns: celebration state machine with generation IDs, CSS-only page transitions (no Framer Motion fighting the router), forward-only card state transitions, ambient gradient drift.

3. **Performance Oracle** -- Rated visual techniques by impact-to-cost ratio. Top picks: mesh gradient backgrounds (5/1), `@property` hue drift (4/1), glass nav bar (4/2), button press depth (3/0). Recommended variable Inter font (~150KB savings).

4. **Security Sentinel** -- Identified missing security headers, the need for a Preprod/Mainnet network badge, WCAG contrast risks with orange-on-white, and transaction signing UX patterns.

The four reports were synthesized into a unified implementation plan.

## Root Cause

The template's `globals.css` used hardcoded HSL values from shadcn's default palette with no semantic connection to the product domain. There was no type-safe theme layer, no XP-specific tokens, and no motion design system. The fonts were the template defaults with no display face for headings.

## Solution

### 1. Type-safe theme config with OKLCh palettes

`src/config/theme.ts` defines three palette scales and five XP semantic tokens:

```typescript
const PALETTE = {
  /** Cardano Blue -- anchor hue. Slightly desaturated from IOG blue. */
  depth: {
    600: color(0.45, 0.155, 248),  // light mode primary
    // ... full 50-950 scale
  },
  /** Earned Gold -- warm amber for achievement. */
  earned: {
    500: color(0.72, 0.17, 85),    // light mode secondary
  },
  /** Milestone Teal -- cool complement for progress and completion. */
  milestone: {
    500: color(0.6, 0.14, 175),
  },
  /** Neutral -- blue-tinted grays (subtle blue cast, not warm cream). */
  neutral: {
    50: color(0.98, 0.003, 248),
  },
} as const;
```

Component variant types provide exhaustive color maps:

```typescript
type ProgressionState = "locked" | "available" | "in-progress" | "submitted" | "completed" | "mastered";

const PROGRESSION_COLOR_MAP: Record<ProgressionState, keyof SemanticTokens> = {
  locked: "muted",
  available: "accent",
  "in-progress": "info",
  submitted: "warning",
  completed: "success",
  mastered: "xpMilestone",
} as const;
```

### 2. Complete CSS palette replacement

`src/styles/globals.css` wires OKLCh values into CSS custom properties with `@property` for animatable hue drift:

```css
@property --xp-hue {
  syntax: "<number>";
  initial-value: 248;
  inherits: false;
}
```

XP semantic tokens registered for Tailwind via `@theme inline`:

```css
@theme inline {
  --color-xp-earned: var(--xp-earned);
  --color-xp-milestone: var(--xp-milestone);
  --color-xp-staked: var(--xp-staked);
  --color-xp-streak: var(--xp-streak);
  --color-xp-given: var(--xp-given);
}
```

Surface effects -- mesh gradient and glassmorphism:

```css
.xp-mesh-bg {
  background:
    radial-gradient(ellipse 80% 50% at 20% 40%, oklch(0.45 0.155 248 / 0.08), transparent),
    radial-gradient(ellipse 60% 70% at 80% 20%, oklch(0.72 0.17 85 / 0.06), transparent),
    radial-gradient(ellipse 50% 60% at 50% 80%, oklch(0.6 0.14 175 / 0.05), transparent);
}

.xp-glass {
  background: oklch(1 0 0 / 0.7);
  backdrop-filter: blur(12px) saturate(1.2);
}
```

### 3. Typography with display font

Variable Inter (single file, no weight array) + Space Grotesk for headings:

```typescript
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"], variable: "--font-display", display: "optional", weight: ["500", "700"],
});
```

### 4. Glass nav bar

```tsx
<nav className="sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-xl backdrop-saturate-150">
```

### 5. Network environment badge

Preprod/Mainnet indicator in the auth status bar:

```tsx
{env.NEXT_PUBLIC_CARDANO_NETWORK !== "mainnet" && (
  <div className="flex items-center gap-1.5 rounded-sm bg-warning/90 px-2 py-0.5 text-warning-foreground">
    <span className="h-1.5 w-1.5 rounded-full bg-warning-foreground/60 animate-pulse" />
    <span className="text-[10px] font-semibold uppercase tracking-wider">
      {env.NEXT_PUBLIC_CARDANO_NETWORK}
    </span>
  </div>
)}
```

### 6. Animation hooks

- **`useScrollReveal`** -- IntersectionObserver + CSS transitions, zero Framer Motion overhead, one-shot unobserve.
- **`useAnimatedProgress`** -- Race-safe Framer Motion with `controlsRef.current?.stop()` before each new animation.

## Verification

- `npx tsc --noEmit` -- zero type errors
- `SKIP_ENV_VALIDATION=1 npx next build` -- clean build, all routes compile
- Exhaustive `Record` types on `ProgressionState`, `XpDisplayState`, `ContributionStatus` mean adding a new state without a color mapping is a compile error
- `prefers-reduced-motion: reduce` block kills all animations globally
- `color-scheme` declarations set on both `:root` and `.dark`
- XP tokens usable as first-class Tailwind classes: `bg-xp-earned`, `text-xp-milestone-foreground`, etc.

## Prevention Strategies

### Theme drift (CSS vs TypeScript)
Treat `theme.ts` as the single source of truth. Every color change must update both `theme.ts` and `globals.css` in the same commit. A future improvement would be a build-time script generating CSS from TypeScript.

### Color contrast regressions
Document expected foreground/background pairings for every semantic token. Never use semantic accent colors for body text -- reserve for badges, indicators, and large display elements. Check contrast when changing any OKLCh lightness value.

### Animation performance
CSS-first rule: if it can be done with `transition`, `@keyframes`, or `@property`, do not use Framer Motion. Only use Framer Motion for layout animations, gesture interactions, and orchestrated staggers. Prefer `transform` and `opacity` exclusively.

### Font loading
Keep `display: "optional"` for Space Grotesk. Never set critical UI dimensions based on Space Grotesk metrics. If the font must always load, use `preload` rather than changing the display strategy.

### Incomplete state coverage
When adding a new `ProgressionState`, the PR must include a visual example. Never map a new state to an existing token "just to make it compile" -- if no token fits, define a new one in both files.

## Test Cases

- [ ] Same color values appear in both `theme.ts` and `globals.css`
- [ ] Contrast ratios meet WCAG AA (4.5:1 text, 3:1 large text)
- [ ] Both light and dark mode values updated for any change
- [ ] `npm run build` completes without errors
- [ ] No TypeScript errors in exhaustive color maps
- [ ] CSS-only alternatives considered before Framer Motion
- [ ] No animations on `width`/`height` -- only `transform` and `opacity`
- [ ] Page layout doesn't break when Space Grotesk fails to load
- [ ] `display: "optional"` preserved for Space Grotesk

## Related Documentation

- [Tokenomics](../../tokenomics.md) -- XP semantic tokens (`xpEarned`, `xpStaked`, `xpGiven`) map directly to tokenomics concepts (earn by doing, circulate by giving, snapshot into credentials)
- [Strip Template to Single-Course App](../architecture/strip-template-to-single-course-app.md) -- The preceding UI overhaul that replaced the sidebar with the top nav bar this theme now styles
- [Project Inception](../project-setup/cardano-xp-inception.md) -- Founding decisions and the five non-code outputs
- [About Andamio](../../about-andamio.md) -- Platform context for the template origin

## Files Changed

| File | Change |
|------|--------|
| `src/config/theme.ts` | New -- type-safe theme config |
| `src/styles/globals.css` | Rewritten -- new palette, XP tokens, effects |
| `src/app/layout.tsx` | Variable Inter + Space Grotesk display font |
| `src/components/layout/app-nav-bar.tsx` | Glass effect |
| `src/components/layout/auth-status-bar.tsx` | Network environment badge |
| `src/components/layout/app-layout.tsx` | Page-enter animation |
| `src/components/landing/landing-hero.tsx` | Mesh gradient background |
| `src/hooks/ui/use-scroll-reveal.ts` | New -- IntersectionObserver hook |
| `src/hooks/ui/use-animated-progress.ts` | New -- race-safe progress animation |
