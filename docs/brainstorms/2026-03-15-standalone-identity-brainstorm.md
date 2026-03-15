# Cardano XP: Standalone Identity

**Date:** 2026-03-15
**Status:** Brainstorm complete

## What We're Building

Transform Cardano XP from an Andamio template derivative into a distinct, standalone product with its own identity, landing page, and brand voice. The app still uses Andamio's hooks and API under the hood, but nothing in the user experience should feel like a template.

## Core Identity

**XP adventure + open experiment.** Gamified reputation building done as a public, build-in-the-open project. Playful and rewarding, but also transparent and collaborative. Not a serious enterprise tool. Not a DeFi project. An invitation to participate.

**Tagline:** "Support Cardano development, earn rewards"

**NOT:** learn-to-earn, financial token, Andamio marketing vehicle

## Key Decisions

### 1. Landing Page: Single Hero + CTA

One powerful screen. Headline, one-liner, Connect Wallet button. Minimal and confident. Everything else lives inside the app.

- No scroll story, no feature grid, no icon strip
- The current 3-column CTA grid and landing page icons go away
- Space Grotesk headline dominates the viewport
- Clean + bold aesthetic: bright, high contrast, big typography, minimal decoration
- Let the words and the button do the work

### 2. Andamio Positioning: "Powered by Andamio"

- Small "Powered by Andamio" badge in the footer
- All primary links, socials, and metadata point to cardano-xp.io
- Andamio is infrastructure, not brand
- Remove current footer links to andamio.io, docs.andamio.io
- Update `metadataBase` from andamio.io to cardano-xp.io
- Clean up `andamio.png` from logos directory

### 3. Brand Voice

The landing page is the destination the video sends people to. It should be inviting, not confrontational. The reckoning narrative (Catalyst critique, accountability) lives in the video series and Substack — not in the app UI.

The app itself should feel like: "you're here, let's go."

### 4. Visual Direction: Clean + Bold

- Dark mode default is already set via the theme
- But the landing page should be high contrast, not ambient
- Space Grotesk headlines at large scale
- The gold XP color (Earned hue) as the primary accent on the landing page
- Mesh gradients and glass effects are available but used sparingly on the hero — save the ambient feel for inside the app
- Motion tokens reserved for in-app moments (XP counting up, credential reveals), not the landing page

## What Changes

### Remove / Replace
- Landing page icon strip (black/white PNGs)
- 3-column CTA grid (Get Started / Learn / Contribute)
- Footer links to andamio.io, docs.andamio.io
- `andamio.png` from `/public/logos/`
- `metadataBase` pointing to andamio.io
- `BRANDING.links` pointing to Andamio socials

### Add
- Bold hero headline with tagline
- Single CTA (Connect Wallet)
- "Powered by Andamio" footer badge
- Cardano XP-specific social links (when ready)
- OG image for cardano-xp.io

### Keep
- Three-hue color system (Depth/Earned/Milestone)
- Space Grotesk + Inter typography
- XP-specific CSS tokens and motion presets
- Glass nav, mesh gradient (for in-app use)
- Stripped-down single-course/single-project architecture
- All Andamio hooks and API usage under the hood

## Open Questions

_None — all key decisions resolved during brainstorm._

## Next Steps

Run `/workflows:plan` to turn this into implementation tasks.
