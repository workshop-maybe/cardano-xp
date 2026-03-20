---
title: "feat: Standalone Identity and Landing Page"
type: feat
status: active
date: 2026-03-15
origin: docs/brainstorms/2026-03-15-standalone-identity-brainstorm.md
---

# feat: Standalone Identity and Landing Page

## Overview

Transform the Cardano XP landing page and branding from an Andamio template derivative into a standalone product. Single hero + CTA replaces the current icon strip + 3-card grid. All user-facing Andamio references become a "Powered by Andamio" footer badge. The app keeps Andamio hooks and API under the hood.

## Problem Statement

The current landing page and branding config still feel like a reskinned template. Footer links, metadata, social links, and marketing copy all point to andamio.io. The landing page layout (icon strip + 3 CTA cards) is generic. Cardano XP has its own identity, tagline, and domain — the UI should reflect that.

## Proposed Solution

Three phases, each independently shippable:

1. **Landing page redesign** — Replace hero content with bold headline + tagline + CTA
2. **Brand separation** — Update all config to point to Cardano XP, add "Powered by Andamio" badge
3. **Asset cleanup** — Remove template artifacts, add OG image

## Technical Approach

### Phase 1: Landing Page Redesign

**Files to change:**
- `src/components/landing/landing-hero.tsx` — gut the default state content
- `src/app/page.tsx` — update footer

**Landing hero default state** (replaces lines 132-238 of `landing-hero.tsx`):

```
┌─────────────────────────────────────┐
│                                     │
│     SUPPORT CARDANO DEVELOPMENT,    │  ← Space Grotesk, large
│          EARN REWARDS.              │
│                                     │
│    XP is a reputation token on      │  ← Inter, muted, 1-2 lines
│    Cardano. Earn by contributing,    │
│    give to recognize others.        │
│                                     │
│       [ Connect Wallet ]            │  ← Primary CTA, triggers handleEnter
│                                     │
│        Explore the course →         │  ← Subtle text link to /course/{id}
│                                     │
└─────────────────────────────────────┘
```

**Key implementation details:**
- The "Connect Wallet" button triggers `handleEnter` (existing flow) — not the MeshSDK picker directly. The RegistrationFlow card appears as it does today (see brainstorm: key decision on wallet UX).
- "Explore the course" text link preserves unauthenticated browse access to `/course/{courseId}`. Import the course ID from `src/config/cardano-xp.ts`.
- Remove the `xp-mesh-bg` class from the hero wrapper — clean + bold means no mesh gradient on the landing page. Save it for in-app.
- The three hero states (authenticating, V2 scanning, default) remain — only the default state content changes.
- Keep `h-dvh` single-viewport layout. No scroll content below.
- Typography: headline in `font-display` (Space Grotesk), weight 700, large size (suggest `text-5xl md:text-7xl`). Tagline in `font-sans` (Inter), `text-muted-foreground`.

**Footer update** (in `page.tsx`, lines 52-58):
- Add "Powered by Andamio" text link to `https://andamio.io` alongside network + version
- Style: `text-xs text-muted-foreground`, same row as existing footer content

### Phase 2: Brand Separation

**Files to change:**
- `src/config/branding.ts` — update links, support, metadataBase
- `src/config/marketing.ts` — remove Andamio references
- `src/app/layout.tsx` — metadataBase from env var

**branding.ts changes:**
- `links.website` → `process.env.NEXT_PUBLIC_SITE_URL || "https://cardano-xp.io"`
- `links.docs` → keep `docs.andamio.io` for now (no Cardano XP docs exist; these are used for transaction help)
- `links.github` → `https://github.com/andamio-platform/cardano-xp` (or the actual repo URL)
- `links.twitter` → remove or leave empty until Cardano XP has its own social presence
- `support.email` → leave as `support@andamio.io` (no separate support channel yet)

**marketing.ts changes:**
- Remove `secondaryCta` ("What is Andamio?" linking to andamio.io)
- Update `footer.links` — remove "Andamio Docs", "andamio.io", "Build Your Own". These are currently unused in the UI but should be cleaned up.
- Update any hardcoded copy to match the new tagline

**layout.tsx changes:**
- Add `NEXT_PUBLIC_SITE_URL` environment variable
- `metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://cardano-xp.io")`
- Update `title`, `description` in metadata to use new tagline

**Environment variable:**
- Add `NEXT_PUBLIC_SITE_URL` to `.env.example` / `.env.local`
- Default: `https://cardano-xp.io` in production
- Dev/preview: Vercel preview URL or localhost

### Phase 3: Asset Cleanup

**Files to remove:**
- `public/logos/andamio.png`
- `public/landing-page-icons/` (all 6 PNGs — only referenced in the hero code being replaced)

**Files to add:**
- `public/og-image.png` — 1200x630 PNG, dark background matching the Depth hue, Cardano XP logo, tagline. Can be generated or designed.

**Other cleanup:**
- Remove any dead imports in `landing-hero.tsx` after the icon strip code is removed
- Verify no other components import from `landing-page-icons/`

## Acceptance Criteria

- [x] Landing page shows bold headline ("Support Cardano development, earn rewards") with Space Grotesk at large scale
- [x] Single "Connect Wallet" CTA button triggers existing registration flow
- [x] "Explore the course" text link below CTA navigates to `/course/{courseId}` without auth
- [x] Footer shows "Powered by Andamio" linking to andamio.io, plus network and version
- [x] No Andamio branding visible anywhere except the "Powered by" badge
- [x] `metadataBase` reads from `NEXT_PUBLIC_SITE_URL` environment variable
- [x] `andamio.png` removed from `public/logos/`
- [x] Landing page icon PNGs removed from `public/landing-page-icons/`
- [ ] OG image exists at `public/og-image.png` (1200x630, branded)
- [x] All three hero states (authenticating, V2 scanning, default) still function correctly
- [x] Preprod warning still displays when on preprod network
- [ ] Dark mode and light mode both render correctly
- [x] No broken imports or dead code after cleanup

## Dependencies & Risks

**Low risk:** All changes are UI and config. No API, database, or on-chain changes. The wallet connection flow is preserved unchanged.

**Risk: Transaction doc links.** `BRANDING.docs.transactionPaths` still point to `docs.andamio.io`. These are user-facing when building transactions. Keeping them is the right call — there are no Cardano XP docs yet. But this means Andamio branding persists in the transaction help UI. Acceptable for now.

**Risk: Social links.** If `links.twitter` is emptied, any component rendering a Twitter link will need a null check. Trace consumers before removing.

**Dependency: OG image.** Needs to be created. Can be a simple branded graphic or generated with Next.js OG image generation (`next/og`). Not blocking for the landing page work.

## Sources & References

- **Origin brainstorm:** [docs/brainstorms/2026-03-15-standalone-identity-brainstorm.md](docs/brainstorms/2026-03-15-standalone-identity-brainstorm.md) — key decisions: single hero + CTA, "Powered by Andamio" positioning, clean + bold visual, wallet flow unchanged
- Theme system solution: `docs/solutions/ui-bugs/cardano-dapp-theme-system.md`
- Architecture solution: `docs/solutions/architecture/strip-template-to-single-course-app.md`
- Strategic context: `~/projects/02-areas/andamio/020-areas/strategy/xp-tokenomics-draft.md` (tagline, positioning)
- Key config files: `src/config/branding.ts`, `src/config/marketing.ts`, `src/config/theme.ts`
- Landing page: `src/app/page.tsx`, `src/components/landing/landing-hero.tsx`
