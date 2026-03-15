# 004 — Cardano XP Theme: Depth, Earned, Milestone

**Date:** 2026-03-15

## What happened

Replaced the generic orange/blue template theme with a distinctive Cardano-rooted visual identity. Used four expert agents in parallel (TypeScript, frontend animation, performance, security) to research and design the theme, then synthesized their findings into a single implementation.

### The palette

Three OKLCh hue families, each tied to a product concept:

- **Depth (indigo h248)** — primary. Says "this is Cardano" without cloning IOG's blue. Slightly desaturated, more refined.
- **Earned (gold h85)** — secondary / XP accent. Warm amber that says "achievement unlocked." Not the template's orange — a true gold.
- **Milestone (teal h175)** — success / progress. Cool complement that rounds out the triad.

Neutrals carry a subtle blue tint (h248) instead of the template's warm cream. Everything feels cohesive.

### Type-safe theme architecture

`src/config/theme.ts` is the single source of truth:
- Full OKLCh palette scales (50–950) for all three hue families
- Five XP semantic tokens: `xpEarned`, `xpStaked`, `xpMilestone`, `xpStreak`, `xpGiven` — named after tokenomics concepts
- Exhaustive component state types (`ProgressionState`, `XpDisplayState`, `ContributionStatus`) with `Record` color maps that fail at compile time if a state is missing
- Motion presets with `celebration` and `settle` easings for reward moments
- CSS generation helper for programmatic theme generation

### Typography

Added **Space Grotesk** as a display font for headings (h1–h3). Geometric, mathematical precision — fits Cardano's scientific identity. Loaded with `display: "optional"` so it never causes FOUT. Body remains Inter, now as a variable font (single file, ~150KB savings over 6 fixed weights).

### Visual effects

- **Glass nav bar** — `backdrop-blur-xl` with translucent background, sticky positioning
- **Mesh gradient** — 3-layer radial OKLCh gradient on the landing hero
- **Button press depth** — `scale(0.97) translateY(1px)` on `:active`
- **Page-enter animation** — 150ms CSS fade-up on route changes
- **XP card glow** — warm gold `box-shadow` on hover
- **Ambient hue drift** — `@property --xp-hue` animates between h248 and h265
- **`color-scheme` declarations** — native dark mode for scrollbars and form controls

### Network safety

Added a persistent Preprod/Mainnet badge to the auth status bar. Pulsing amber indicator with the network name. Only shows on non-mainnet — no one in the Cardano ecosystem does this well.

### Animation hooks

Two new hooks, both performance-first:
- `useScrollReveal` — IntersectionObserver + CSS transitions, one-shot unobserve, zero Framer Motion
- `useAnimatedProgress` — race-safe Framer Motion with `controlsRef.current?.stop()` before each new animation

### What the experts contributed

| Expert | Key insight |
|--------|------------|
| TypeScript Reviewer | Exhaustive `Record` types on state→color maps catch missing states at compile time |
| Frontend Races Reviewer | CSS-only page transitions — Framer Motion fights the App Router, don't use it for routes |
| Performance Oracle | `@property` hue drift costs nothing (compositor thread), mesh gradients are rasterized once |
| Security Sentinel | Network badge prevents testnet/mainnet confusion; primary orange failed WCAG AA on white |

### Files changed

9 files, +760 / -92 lines. New: `theme.ts`, `use-scroll-reveal.ts`, `use-animated-progress.ts`. Modified: `globals.css` (complete palette rewrite), `layout.tsx`, `app-nav-bar.tsx`, `auth-status-bar.tsx`, `app-layout.tsx`, `landing-hero.tsx`.

## Next steps

1. **Create on-chain course and project** — Use the Andamio platform to create the actual course and project that Cardano XP will point to
2. **Create API key** — Get an Andamio Gateway API key for the app
3. **Update env** — Set `NEXT_PUBLIC_COURSE_ID`, `NEXT_PUBLIC_PROJECT_ID`, `ANDAMIO_API_KEY`, and other env vars
4. **Run locally and tweak UX** — Boot the app with real data, test the theme with actual content, adjust colors and spacing as needed

## Reflection

The multi-expert approach worked well here. Each agent brought a perspective I wouldn't have prioritized on my own — the security reviewer caught the WCAG contrast issue and the missing network badge, the performance oracle ranked techniques by impact/cost ratio, and the races reviewer saved me from using Framer Motion for page transitions (which would have fought the router). Running them in parallel meant the research phase took ~4 minutes instead of ~15.

The theme now tells a story: blue for depth, gold for earning, teal for milestones. That narrative maps directly to the tokenomics — earn by doing, circulate by giving, snapshot into credentials. When we build the XP balance display and credential cards, the semantic tokens are already waiting.
