---
title: "XP Leaderboard — Server-Side Attribution via Manager Commitments"
module: leaderboard, project-detail, xp-token, api-route
severity: high
tags:
  - data-join
  - server-side-api-route
  - public-page
  - token-matching
  - architecture-decision
  - grouped-tasks
  - attribution
date: 2026-03-22
last_updated: 2026-03-31
---

# XP Leaderboard — Server-Side Attribution via Manager Commitments

## Problem

The public XP leaderboard was computing XP attribution client-side by joining `submissions[]` to `assessments[]` via `taskHash`. When multiple contributors submitted the same task type (grouped tasks), ALL submitters got credited XP when any one was accepted — silently inflating XP totals. The public API lacks a `submitted_by` field on assessments, making client-side disambiguation impossible.

## Symptoms

- Leaderboard showed inflated XP for contributors who submitted popular/grouped tasks
- Contributors appeared to earn XP for tasks that were never individually assessed for them
- XP totals did not match actual accepted assessment count per contributor

## What Didn't Work

### V1: Client-Side taskHash Join (2026-03-22)

The original `computeLeaderboard()` function joined submissions to assessments by `taskHash` alone:

```typescript
// WRONG: many-to-many join — 3 submitters + 1 accepted = 3 credited
for (const sub of submissions) {
  if (acceptedTaskHashes.has(sub.taskHash)) {
    xpByAlias.set(sub.submittedBy, ...)
  }
}
```

This works when submissions are 1:1 per taskHash (common case) but fails for grouped tasks. The public `ProjectDetail` API was designed for overview display, not per-contributor attribution.

### Why Not Fix the Public API?

Adding `submitted_by` to `ProjectAssessment` in the Gateway would fix the join at the source but requires an upstream API change. The manager commitments endpoint already has the data — it just needed a server-side proxy.

## Solution

### Server-Side API Route with Manager Commitments

Created `/api/xp-leaderboard` (Next.js Route Handler) that calls the privileged manager commitments endpoint server-side with the app's API key, then computes attribution with per-submission accuracy.

**Architecture:**

```
Client (public, no auth)           Server (API key)
  ┌─────────────┐                    ┌──────────────────┐
  │ /xp/leader  │──GET──────────────▶│ /api/xp-leader   │
  │ board page  │◀──LeaderboardRes──│ board route       │
  └─────────────┘                    └────┬────────┬────┘
                                          │        │
                                    POST commitments  GET project
                                          │        │
                                          ▼        ▼
                                    ┌──────────────────┐
                                    │ Andamio Gateway   │
                                    └──────────────────┘
```

**Key difference from V1:** `ManagerCommitmentItem` binds `submitted_by` and `task_hash` on the same record, with `content.task_outcome` for assessment status. One commitment = one submitter = one outcome.

```typescript
// CORRECT: one-to-one attribution
for (const commitment of commitments) {
  if (commitment.content?.task_outcome === "ACCEPTED") {
    xpByAlias.set(commitment.submitted_by, ...)
  }
}
```

**Fallback:** When the commitments endpoint lacks `task_outcome` data, falls back to the old taskHash join with a warning log. This is the V1 behavior — known-inaccurate for grouped tasks but functional.

### Token Matching: policyId Only

The Gateway API returns decoded asset names (`"XP"`) while on-chain config uses hex (`"5850"`). Always match XP tokens on `policyId` only:

```typescript
// CORRECT
task.assets?.find((a) => a.policy_id === XP_POLICY_ID);

// WRONG — will silently match nothing
task.assets?.find((a) => a.policy_id === XP_POLICY_ID && a.name === "5850");
```

See: `docs/solutions/integration-issues/xp-token-hex-decoded-name-mismatch.md`

### Status Priority

When classifying contributors, check `claimed` (higher achievement) before `enrolled`:

```typescript
status: claimedSet.has(alias) ? "claimed"
      : enrolledSet.has(alias) ? "enrolled"
      : null
```

### Shared Types

`LeaderboardEntry` and `LeaderboardResponse` are defined once in `~/types/xp-leaderboard.ts` and imported by both the API route and the client component, preventing drift.

### Caching

- Server route: `revalidate = 300` (5-min ISR cache)
- Client: React Query with matching staleTime
- Server prefetch in page component for instant hydration

### Gateway Timeout

All gateway fetches use `AbortSignal.timeout(10_000)` to prevent hanging during ISR/SSR.

## Why This Works

The root cause is a data model limitation: the public API flattens on-chain UTxOs into arrays that share only `taskHash` as a join key. The manager commitments endpoint provides the missing join — `submitted_by` co-located with `task_outcome` on the same record. Moving computation server-side also keeps the privileged API key out of the browser.

## Prevention

1. **When joining two arrays, verify the join key produces one-to-one or many-to-one relationships.** If the key is not unique per entity, the join is wrong. In this case, `taskHash` is unique per task type but not per submission.
2. **Prefer server-side computation for attribution or scoring** — it enables access to richer API data and prevents client-side data shape limitations from corrupting results.
3. **Extract shared types between API routes and client components** into `~/types/` from the start, not after duplication is discovered.
4. **Wrap gateway fetches in a utility that enforces a default timeout** so individual call sites cannot forget.

## Files

- `src/app/api/xp-leaderboard/route.ts` — Server-side computation with gateway calls
- `src/app/(app)/xp/leaderboard/leaderboard-content.tsx` — Client component (fetches from API route)
- `src/app/(app)/xp/leaderboard/page.tsx` — Server prefetch wrapper
- `src/types/xp-leaderboard.ts` — Shared types
- `src/config/cardano-xp.ts` — XP token config

## Related

- `docs/solutions/integration-issues/xp-token-hex-decoded-name-mismatch.md` — policyId-only matching
- `docs/solutions/integration-issues/xp-token-task-reward-integration.md` — XP token config
- `docs/solutions/runtime-errors/tx-confirmed-state-timeout-and-error-recovery.md` — TX pipeline patterns
- `docs/brainstorms/2026-03-22-xp-leaderboard-brainstorm.md` — Original design decisions
- `docs/plans/2026-03-22-feat-xp-leaderboard-plan.md` — V1 implementation plan
- `docs/plans/2026-03-31-001-feat-mainnet-readiness-plan.md` — V2 server-side approach
