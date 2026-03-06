# XP Leaderboard Brainstorm

**Date:** 2026-03-22
**Status:** Draft

## What We're Building

A public leaderboard at `/xp/leaderboard` showing all aliases who have earned XP in the project, ranked by total XP. The leaderboard combines XP from both enrolled contributors (local state) and former contributors who have claimed credentials (global state) into a single unified ranking.

Each row displays:
- **Rank** — position by total XP
- **Alias** — the contributor's on-chain alias
- **Total XP** — sum of XP earned from all ACCEPTED task assessments
- **Status badge** — whether the contributor is currently enrolled or has claimed credentials

## Why This Approach

### Data source: project endpoint only, no Koios

All XP data can be derived from `MergedProjectDetail` returned by the existing gateway API:
- `assessments[]` filtered by `decision === "ACCEPTED"` gives us every completed task per alias
- `tasks[]` provides XP reward amounts per `task_hash` (matching `policyId` to XP token)
- `contributors[]` tells us who is currently enrolled
- `credential_claims[]` tells us who has left the project

No wallet address resolution needed. We only care about aliases that have earned XP within this project, not wallet balances.

### Route: `/xp/leaderboard`

Groups naturally under the existing `/xp` tokenomics page. Public access — no authentication required. Fits the transparent reputation model of XP tokens.

## Key Decisions

1. **XP calculation is assessment-based, not wallet-based.** Total XP = sum of XP token rewards from all ACCEPTED assessments for that alias. This avoids the complexity of Koios queries and wallet-to-alias correlation.

2. **Public, no auth required.** XP is a reputation token — visibility is the point.

3. **Status shows engagement.** Badge indicates "Enrolled" (in `contributors[]`) vs "Claimed" (in `credential_claims[]`). An alias could also be neither if they earned XP on a task but haven't left yet and aren't currently enrolled (edge case to consider).

4. **Reuse existing patterns.** Use `AndamioTable` component and `XpBadge` for consistent styling. The admin manage-contributors page is the closest existing pattern.

## Resolved Questions

1. **Should aliases with 0 XP appear?** No — only show aliases who have actually earned XP. Keeps the leaderboard focused on achievement.

2. **Sorting ties.** Alphabetical by alias. Simple and predictable.
