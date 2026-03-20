# 009 — Access Token Page and Messaging Consolidation

**Date:** 2026-03-16
**Tags:** access-token, diataxis, messaging, cost-transparency, information-architecture

## What happened

Created a dedicated `/andamio-access-token` page as the canonical home for the access token story. Applied the Diataxis framework to structure it: explanation (what it is), reference (on-chain costs), how-to (wallet setup, collateral, minting), and an embedded registration flow.

Cleaned up every other surface. The landing page now says "A tiny experiment in giving feedback" with no token details. The about page focuses on the experiment. The XP page focuses on tokenomics. Each page does one job.

## Key decisions

- **Diataxis structure for the token page.** Explanation, reference, how-to sections in reading order. No tabs. The registration flow embeds directly on the page.
- **Cost transparency for a Cardano audience.** ~8 ADA mint, ~0.2-0.4 ADA tx fees, 2.5 ADA + XP earned per task, ~25 ADA recommended starting balance. These numbers are in a scannable table.
- **Collateral guidance.** Step 2 explains setting collateral: either set it in wallet settings, or send two UTxOs (20 + 5 ADA).
- **"Giving feedback" not "developer feedback."** The app collects feedback on: this app, Andamio, the vibe-code-a-node course, a treasury proposal, and more. The audience is broader than developers.
- **XP page stats grid simplified.** Removed "mint" language and bottom captions. Now reads: "100,000 XP / Tasks only / on Andamio / by Humans".
- **Cost is part of the experiment.** The page explicitly asks whether the economics feel right and links to a GitHub issue for cost feedback.

## Files changed

- `src/app/(app)/andamio-access-token/page.tsx` — new canonical page
- `src/components/landing/landing-hero.tsx` — clean hero, new CTAs
- `src/components/landing/registration-flow.tsx` — inline cost hints kept
- `src/app/(app)/about/page.tsx` — reverted to single-purpose
- `src/app/(app)/xp/page.tsx` — stats grid, audience framing, language
- `src/config/navigation.ts` — added Access Token nav item
- `src/config/marketing.ts` — costInfo replaces preprodWarning

## What's next

- Treasury proposal feedback tasks (thread in orch)
- Feedback tasks for the vibe-code-a-node course
- Review whether the about page should link to the access token page
