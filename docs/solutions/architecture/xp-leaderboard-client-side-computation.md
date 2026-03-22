---
title: "XP Leaderboard — Client-Side Computation from Public API"
module: leaderboard, project-detail, xp-token
severity: medium
tags:
  - data-join
  - client-side-computation
  - public-page
  - token-matching
  - architecture-decision
date: 2026-03-22
---

# XP Leaderboard — Client-Side Computation from Public API

## Problem

Build a public leaderboard ranking all aliases by XP earned. The Andamio Gateway API returns `submissions[]` and `assessments[]` as separate arrays in the project detail response, joined only by `taskHash`. Assessments carry `assessedBy` (the manager) but **not** `submittedBy` (the contributor), making it impossible to unambiguously attribute an accepted assessment to a specific submission when multiple contributors submit the same task type (grouped tasks).

The manager commitments endpoint (`POST /api/v2/project/manager/commitments/list`) has clean `submittedBy` + `commitmentStatus` pairs, but requires user-level JWT authentication — unusable for a public, unauthenticated page.

## Root Cause

The public `ProjectDetail` API was designed for project overview display, not for per-contributor attribution. The on-chain data model does link assessments to specific submissions (each is a separate UTxO), but the API flattens this into arrays that share only `taskHash` as a join key.

## Solution

Compute the leaderboard **client-side** using the existing `useProject()` hook (public, no auth). Join submissions to assessments by `taskHash` — accurate when submissions are 1:1 per taskHash, which is the common case.

### Core Algorithm

```typescript
function computeLeaderboard(project: ProjectDetail): LeaderboardEntry[] {
  const xpPolicyId = CARDANO_XP.xpToken.policyId;

  // Step 1: taskHash → XP reward (match on policyId only, not assetName)
  const taskXpMap = new Map<string, number>();
  for (const task of project.tasks ?? []) {
    if (taskXpMap.has(task.taskHash)) continue;
    const xpToken = task.tokens?.find((t) => t.policyId === xpPolicyId);
    if (xpToken) taskXpMap.set(task.taskHash, xpToken.quantity);
  }

  // Step 2: Which taskHashes have ACCEPTED assessments
  const acceptedHashes = new Set<string>();
  for (const a of project.assessments ?? []) {
    if (a.decision === "ACCEPTED") acceptedHashes.add(a.taskHash);
  }

  // Step 3: Credit each submitter whose taskHash was accepted
  const xpByAlias = new Map<string, number>();
  for (const sub of project.submissions ?? []) {
    if (!acceptedHashes.has(sub.taskHash)) continue;
    const reward = taskXpMap.get(sub.taskHash) ?? 0;
    if (reward > 0) {
      xpByAlias.set(sub.submittedBy, (xpByAlias.get(sub.submittedBy) ?? 0) + reward);
    }
  }

  // Step 4: Sort (XP desc, alias asc for ties), filter >0, assign ranks
  // Step 5: Derive status (enrolled > claimed > null) from contributors[] and credentialClaims[]
}
```

### Key Decision: Why Client-Side

| Factor | Client-Side | Server-Side (JWT) |
|--------|------------|------------------|
| Public access | No auth required | Requires JWT |
| Cache sharing | Same `useProject()` as /xp page | Separate endpoint |
| Implementation | Pure function, ~60 lines | API route + auth plumbing |
| Auditability | Anyone can verify the logic | Hidden server-side |

The `useProject()` response is already cached by React Query (5-min staleTime). If the user navigates from `/xp` to `/xp/leaderboard`, the data is already loaded — zero additional API calls.

### Key Decision: policyId-Only Token Matching

The Andamio Gateway API returns decoded asset names (`"XP"`) while the on-chain config uses hex (`"5850"`). Always match XP tokens on `policyId` only:

```typescript
// CORRECT
task.tokens?.find((t) => t.policyId === xpPolicyId);

// WRONG — will silently match nothing
task.tokens?.find((t) => t.policyId === xpPolicyId && t.assetName === "5850");
```

See: `docs/solutions/integration-issues/xp-token-hex-decoded-name-mismatch.md`

## Known Limitation

**Grouped tasks ambiguity:** If multiple contributors submit the same task type (same `taskHash`), all submitters are credited XP when any one is accepted. This is documented in the function's JSDoc.

**When this matters:** Only when a project uses grouped tasks (multiple UTxO instances with identical content hashes) AND different contributors submit to different instances of the same task type.

**Fix path:** Add `submitted_by` to `ProjectAssessment` in the Gateway API response. This would make the join unambiguous and require only a small refactor of `computeLeaderboard()` to iterate assessments instead of submissions.

## Prevention

1. **API improvement (recommended):** Request `submitted_by` field on assessments in the project detail endpoint. Eliminates ambiguity at the source.
2. **Defensive detection:** Count submissions per taskHash; if >1 with an ACCEPTED assessment, log a warning. Not implemented in v1 since the project currently uses unique task types.
3. **Process:** Encourage project managers to use distinct task content for different work items rather than duplicating identical tasks.

## Files

- `src/app/(app)/xp/leaderboard/page.tsx` — Leaderboard page with `computeLeaderboard()`
- `src/config/routes.ts` — `PUBLIC_ROUTES.leaderboard`
- `src/app/(app)/xp/page.tsx` — CTA link to leaderboard

## Related

- `docs/solutions/integration-issues/xp-token-hex-decoded-name-mismatch.md` — policyId-only matching pattern
- `docs/solutions/integration-issues/xp-token-task-reward-integration.md` — XP token config and task reward setup
- `docs/solutions/integration-issues/koios-wallet-transparency-integration.md` — Public page data fetching patterns
- `docs/brainstorms/2026-03-22-xp-leaderboard-brainstorm.md` — Design decisions
- `docs/plans/2026-03-22-feat-xp-leaderboard-plan.md` — Implementation plan
