# 005 — Standalone Identity: Landing Page, Nav, Content Pages

**Date:** 2026-03-15

## What happened

Transformed Cardano XP from a reskinned Andamio template into its own product. This was the biggest single session — landing page, nav bar, two new content pages, six rounds of copy iteration, and full brand separation from Andamio.

### The brainstorm

Started with `/workflows:brainstorm` to decide identity, landing page structure, and visual direction. Key decisions:

- **Identity:** XP adventure + open experiment. Playful and transparent.
- **Landing page:** Single hero + CTA. No scroll story, no feature grid.
- **Andamio positioning:** "Powered by Andamio" badge in footer. Everything else is Cardano XP.
- **Visual:** Clean + bold. High contrast, big typography, minimal decoration.

### Landing page

Gutted the template landing page (icon strip + 3 CTA cards) and replaced it with:

- Custom brand mark — gold "XP" square + "Cardano XP" in display font. No SVG logo dependency.
- Bold headline with gold accent highlight
- Single "Connect Wallet" button with breathing gold glow animation
- Secondary links to "What is this?" and "Tokenomics"
- Four-layer background: grid overlay → deep mesh gradient → gold glow spot → vignette

The wallet connection flow is unchanged — the button triggers the existing `handleEnter` → `RegistrationFlow` card.

### Unified nav bar

Replaced the two-bar template layout (AuthStatusBar + AppNavBar) with a single frosted-glass nav bar used everywhere — landing page and all app routes. Contains brand mark, nav links, network badge, user alias, theme toggle, and auth action.

Navigation labels: About | Contribute | Tokenomics | My XP (+ Studio for authenticated users).

### Brand separation

- `metadataBase` reads from `NEXT_PUBLIC_SITE_URL` env var (defaults to `cardano-xp.io`)
- Removed Andamio social links, footer links, `andamio.png`
- Transaction UI strings: "Andamio protocol" → "Cardano XP"
- `BRANDING.links.website` → env var
- Footer: network + "Powered by Andamio" (subtle, intentional)

### Visual identity

- **`--radius: 0`** — sharp corners everywhere from one CSS variable change
- **DM Sans** display font — strong, geometric, doesn't draw attention. Replaced Space Grotesk.
- **Layered backgrounds** on all routes (grid + mesh gradient via app layout)
- New CSS utilities: `xp-mesh-deep`, `xp-grid`, `xp-vignette`, `xp-glow-spot`, `xp-pulse-glow`

### Tokenomics page (`/xp`)

Full content page explaining the XP token design:

- "Let's try something different with tokens."
- Three-step mechanism: Earn XP → Build reputation → Let others earn it too
- Stats grid: 100k supply, tasks only, on-chain credentials, permissionless
- The problem (Catalyst indictment, devs have git but non-devs have nothing)
- The loop, what this is not, supply exhaustion answer, permissionless section

### About page (`/about`)

The project story:

- Built in ~3 hours of vibe coding on a Sunday afternoon. Forgive the AI slop.
- Three things you can do: give feedback, earn XP, build your track record
- Why this exists: "We have a public ledger. We should use it."
- CTA: Connect Wallet, View Tasks, Read Tokenomics

### Copy iterations

The headline went through six rounds:

1. "Support Cardano development, earn rewards" — too trite
2. "Put your track record on-chain" — too narrow
3. "Build new systems, don't recreate legacy ones" — closer
4. **"Build new systems."** — final

Subtext: "It's time to start doing real experiments with how we use Cardano. Not DeFi. Not trading. Actual work, tracked on-chain, reputation you own."

The orch workspace strategic notes ("five years of Catalyst, nothing on-chain," "we refuse to use it," "passive income is just extraction with better branding") informed the tokenomics and about page copy but were kept out of the landing page. The landing page is an invitation, not a reckoning.

## What changed

- `src/app/page.tsx` — layered background, unified nav, removed SVG logo
- `src/components/landing/landing-hero.tsx` — brand mark, headline, glow CTA
- `src/components/layout/app-nav-bar.tsx` — unified glass nav bar
- `src/components/layout/app-layout.tsx` — removed AuthStatusBar, added mesh background
- `src/components/layout/studio-layout.tsx` — removed AuthStatusBar
- `src/config/branding.ts` — links, tagline, description for Cardano XP
- `src/config/marketing.ts` — copy, footer, Andamio references removed
- `src/config/navigation.ts` — About, Contribute, Tokenomics, My XP
- `src/config/transaction-ui.ts` — "Andamio" → "Cardano XP"
- `src/styles/globals.css` — `--radius: 0`, background utilities, pulse glow
- `src/app/layout.tsx` — DM Sans font, metadataBase from env var
- `src/app/(app)/xp/page.tsx` — new tokenomics page
- `src/app/(app)/about/page.tsx` — new about page
- `.env.example` — added `NEXT_PUBLIC_SITE_URL`
- Removed: `public/logos/andamio.png`, `public/landing-page-icons/` (6 PNGs)

## Decisions and rationale

| Decision | Why |
|----------|-----|
| Single nav bar everywhere | Template had two bars. One unified glass bar is cleaner and makes the landing page consistent with the app. |
| "Powered by Andamio" in footer only | Andamio is infrastructure. Users don't need to know about it except as attribution. |
| `--radius: 0` | Sharp corners are the visual signature. One variable change transforms every component. |
| DM Sans over Space Grotesk | Space Grotesk was too distinctive/design-forward. DM Sans is strong and simple — doesn't draw attention. |
| No "Course" language | This isn't a course platform. "About" and "Start exploring" replace "Learn" and "Explore the course." |
| "My XP" not "Credentials" | Speaks the product's language, not the protocol's. |
| Copy keeps reckoning out of landing page | The Catalyst critique and accountability narrative lives in the video series and Substack. The app is an invitation: "Build new systems." |

## What's next

- OG image for social sharing
- Deep dive on minting access tokens (onboarding for Cardano people new to Andamio)
- UX for handling XP tokens after minting (balance display, give flow, credential snapshot)
- Rename `package.json` from `andamio-app-template` to `cardano-xp`
