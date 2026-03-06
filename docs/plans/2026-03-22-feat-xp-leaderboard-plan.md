---
title: "feat: XP Leaderboard"
type: feat
status: active
date: 2026-03-22
origin: docs/brainstorms/2026-03-22-xp-leaderboard-brainstorm.md
---

# XP Leaderboard

## Overview

Public leaderboard at `/xp/leaderboard` ranking all aliases who have earned XP, combining local state (enrolled contributors) and global state (credential claimers) into a single view.

## Problem Statement

XP is a reputation token — visibility is the point. Currently there's no way to see who has earned XP or how contributors compare. The manage-contributors admin page shows contributor stats but is auth-gated and doesn't show XP amounts.

## Proposed Solution

A new public page that computes XP per alias from commitment data and displays a ranked table with status badges. Uses the manage-contributors page as the reference pattern.

### Data Strategy: Commitments over Assessment Joins

The public `ProjectDetail` has separate `assessments[]` and `submissions[]` arrays that share only `taskHash` as a join key. When multiple contributors submit the same task type (grouped tasks), this join is ambiguous — assessments don't carry `submittedBy`.

**Solution:** Use the manager commitments endpoint (`/api/v2/project/manager/commitments/list`), which returns `ManagerCommitment` objects with both `submittedBy` and `commitmentStatus` already resolved. Since this endpoint requires auth, create a **server-side API route** (`/api/xp-leaderboard`) that calls the gateway with the app's API key and returns computed leaderboard data. The client page fetches from this route — no end-user auth needed.

(see brainstorm: docs/brainstorms/2026-03-22-xp-leaderboard-brainstorm.md)

## Technical Considerations

### Token Matching Gotcha

Match XP tokens on `policyId` only, not `assetName`. The Andamio Gateway API returns decoded asset names (`"XP"`) while on-chain uses hex (`"5850"`). Comparing names will silently fail.

(from: docs/solutions/integration-issues/xp-token-hex-decoded-name-mismatch.md)

### Architecture: Server-Side Computation

```
Client Page (/xp/leaderboard)
  → useQuery("/api/xp-leaderboard")
    → Next.js API Route (/api/xp-leaderboard/route.ts)
      → Gateway API (manager/commitments/list + project detail)
      → Compute XP per alias
      → Return LeaderboardEntry[]
```

This keeps the computation server-side, avoids auth requirements on the client, and avoids the assessment-to-submission join ambiguity.

### Existing Patterns to Reuse

- **Page layout**: Follow `/xp/page.tsx` pattern — `"use client"`, hero header, content sections
- **Table**: `AndamioTable*` components from `~/components/andamio`
- **XP display**: `XpBadge` component for XP amounts
- **Status badges**: `AndamioBadge` with `status` prop for enrolled/claimed
- **Loading/error**: `AndamioPageLoading` + `AndamioErrorAlert`
- **Icons**: `AchievementIcon` (trophy) for header, `XPIcon` for stats

## Acceptance Criteria

- [x] ~~**`/api/xp-leaderboard/route.ts`**~~ — Simplified: XP computed client-side with `useProject()` (manager commitments endpoint requires user auth, not just API key)
- [x] **`/xp/leaderboard/page.tsx`** — Public page displaying ranked table
- [x] Table columns: Rank, Alias, Total XP (using `XpBadge`), Status badge
- [x] Sorted by XP descending, ties broken alphabetically by alias
- [x] Only aliases with >0 XP appear
- [x] Status badge: "Enrolled" (in `contributors[]`), "Claimed" (in `credentialClaims[]`), no badge if in neither
- [x] If alias is in BOTH arrays (re-enrolled after claim), show "Enrolled" (current state wins)
- [x] Empty state when no one has earned XP yet
- [x] Loading and error states using existing Andamio components
- [x] Route added to `PUBLIC_ROUTES` in `routes.ts`
- [x] Link added to `/xp` page to navigate to leaderboard

## Implementation

### Files to Create

#### `src/app/api/xp-leaderboard/route.ts`

Server-side API route:

1. Fetch project detail (for `contributors`, `credentialClaims`, `tasks`)
2. Fetch manager commitments (for `submittedBy` + `commitmentStatus` per task)
3. For each commitment with `commitmentStatus === "ACCEPTED"`:
   - Look up the task by `taskHash` in `project.tasks`
   - Find XP token: `task.tokens?.find(t => t.policyId === xpPolicyId)` (match on policyId only)
   - Add `quantity` to the alias's running total
4. Build `LeaderboardEntry[]`: `{ rank, alias, totalXp, status }`
   - Status: check `contributors[]` first (Enrolled), then `credentialClaims[]` (Claimed), else null
5. Sort by `totalXp` desc, then `alias` asc for ties
6. Filter out entries with `totalXp === 0`
7. Assign ranks (1-indexed)
8. Return JSON with appropriate cache headers (60s stale, matching existing patterns)

```typescript
interface LeaderboardEntry {
  rank: number;
  alias: string;
  totalXp: number;
  status: "enrolled" | "claimed" | null;
}
```

#### `src/app/(app)/xp/leaderboard/page.tsx`

Client page:

1. Fetch from `/api/xp-leaderboard` via `useQuery`
2. Render hero header with `AchievementIcon`
3. Summary stats: total participants, total XP distributed
4. `AndamioTable` with Rank, Alias, XP (`XpBadge`), Status (`AndamioBadge`)
5. Empty state, loading state, error state
6. Mobile: hide Status column on small screens (`hidden md:table-cell`)

### Files to Modify

#### `src/config/routes.ts`

Add to `PUBLIC_ROUTES`:
```typescript
/** XP leaderboard */
leaderboard: "/xp/leaderboard",
```

#### `src/app/(app)/xp/page.tsx`

Add a link to the leaderboard in the treasury section or as a standalone section:
```tsx
<a href="/xp/leaderboard">View Leaderboard →</a>
```

### Files to Create for Data Fetching

#### `src/hooks/api/use-xp-leaderboard.ts` (optional)

Thin hook wrapping `useQuery` for `/api/xp-leaderboard`. Could also inline this in the page component since it's the only consumer.

## Dependencies & Risks

- **Gateway API availability**: The server-side route depends on the gateway API being accessible. Use the existing `NEXT_PUBLIC_ANDAMIO_GATEWAY_URL` and `ANDAMIO_GATEWAY_API_KEY` env vars already used by the gateway proxy.
- **Manager commitments access**: The server-side route calls the manager commitments endpoint. This endpoint may require user-level auth beyond the app API key. If so, fall back to the public project data (assessments + submissions join) with a defensive check for taskHash ambiguity.
- **Cache timing**: 60s cache on the API route means the leaderboard is at most 60s stale. Acceptable for a reputation display.

## Sources

- **Origin brainstorm:** [docs/brainstorms/2026-03-22-xp-leaderboard-brainstorm.md](docs/brainstorms/2026-03-22-xp-leaderboard-brainstorm.md) — Key decisions: assessment-based XP calculation, public access, status badges, omit 0 XP aliases, alphabetical tiebreaking
- **Reference pattern:** `src/app/(admin)/admin/project/manage-contributors/page.tsx` — closest existing UI pattern
- **Token matching gotcha:** `docs/solutions/integration-issues/xp-token-hex-decoded-name-mismatch.md` — match on policyId only
- **XP config:** `src/config/cardano-xp.ts` — token policy ID and asset name
- **Table components:** `src/components/andamio/andamio-table.tsx`
- **XpBadge:** `src/components/xp-badge.tsx`
