---
title: "Access token page: Diataxis consolidation"
date: "2026-03-16"
category: content-architecture
tags:
  - access-token
  - messaging
  - diataxis
  - information-architecture
  - onboarding
  - cost-transparency
files_changed:
  - src/app/(app)/andamio-access-token/page.tsx
  - src/components/landing/landing-hero.tsx
  - src/components/landing/registration-flow.tsx
  - src/app/(app)/about/page.tsx
  - src/app/(app)/xp/page.tsx
  - src/config/navigation.ts
  - src/config/marketing.ts
related:
  - journal/008-credential-focused-language.md
  - journal/005-standalone-identity.md
  - journal/007-simplified-routes-and-footer.md
  - docs/tokenomics.md
  - docs/project-context.md
---

## Problem

Access token information was scattered across the landing page, about page, XP page, and registration flow. A new user arriving at any of these surfaces got fragments of the token story but never the complete picture. The copy also used "developer feedback" framing that excluded non-developer Cardano users. On-chain cost details (~8 ADA mint, tx fees, 25 ADA recommended funding) were either missing or buried.

For a Cardano-savvy audience that expects on-chain specifics, this was a gap.

## Root Cause

Information architecture, not copywriting. The access token concept touches multiple pages (landing, registration, about, tokenomics) and had no single canonical home. Each page tried to explain part of the story inline, leading to duplication, inconsistency, and none of them telling the complete story.

## Solution

Created a dedicated `/andamio-access-token` page structured with the Diataxis documentation framework, then cleaned each other surface so it does exactly one job.

### The new page (`/andamio-access-token`)

Structured into clear sections:

1. **Explanation** ("What it is"): NFT identity, alias as unique identifier, self-sovereign ownership
2. **Reference** ("What happens on chain"): ~8 ADA mint cost, UTXO mechanics, tx fees (~0.2-0.4 ADA), cost summary table
3. **How-to** ("How to get one"): Wallet setup, funding with ~25 ADA, collateral setup (set in wallet or send two UTxOs of 20 + 5), connect and mint
4. **Embedded registration flow**: The actual `RegistrationFlow` component renders on the page (or shows "you already have one" for authenticated users)
5. **Cost feedback CTA**: Explicitly frames cost as part of the experiment and asks for feedback

### Other surfaces cleaned up

| Page | Now does | No longer does |
|------|----------|----------------|
| Landing hero | Orients with "A tiny experiment in giving feedback" + 3 CTAs | Explain token costs or wallet setup |
| About page | Explains the experiment and feedback process | Duplicate token context |
| XP/Tokenomics | Token design and audience framing | Inline cost details |
| Registration flow | Shows cost at decision point (~8 ADA, wallet tip) | Try to be a reference page |
| Navigation | Surfaces "Access Token" as top-level nav item | N/A |

### Key decisions

- **Landing page stays clean.** Three CTAs: "Connect Wallet" (returning users), "Get an Access Token" (newcomers), "What is this?" (curious). No cost details.
- **Cost info at the decision point.** The registration flow still shows ~8 ADA and the wallet tip because users need that context when they're about to spend money.
- **Broadened from "developer feedback" to "giving feedback."** The app accepts feedback on the app itself, Andamio, the vibe-code-a-node course, a treasury proposal, and more.
- **XP page stats grid simplified.** Removed "mint" language, removed bottom captions, changed to "Distribution: Tasks only", "Credentials: on Andamio", "Moderation: by Humans".

## Prevention Strategies

**Single source of truth rule:** Every distinct concept (access token, XP token, credentials) should have exactly one canonical page. Other pages link to it rather than restating details. If a fact changes, only one file needs editing.

**Three-reference threshold:** When a concept is referenced on three or more pages, that is the signal to extract it into its own canonical page. The access token hitting landing, about, XP, and registration was exactly this pattern.

**Page responsibility statements:** Each page component should have a clear purpose. If new copy doesn't fit that purpose, it belongs elsewhere. The landing page orients; the about page explains the experiment; the access token page owns the token story.

## Cross-References

- [Journal 005](../../journal/005-standalone-identity.md): Brand separation, "Deep dive on minting access tokens" listed as next step
- [Journal 008](../../journal/008-credential-focused-language.md): Credential-focused language shift
- [Tokenomics](../../docs/tokenomics.md): XP token spec, "not learn-to-earn" positioning
- [Project context](../../docs/project-context.md): Strategic framing, first feedback targets
