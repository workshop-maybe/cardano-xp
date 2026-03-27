---
title: "Onboarding UX overhaul: nav prompts, eligibility gating, copy cleanup"
date: "2026-03-27"
category: ui-bugs
module: onboarding-ux
problem_type: ui_bug
component: frontend_stimulus
symptoms:
  - "No prompt to mint access token after wallet connect"
  - "/learn page used multi-module jargon irrelevant to single-assignment onboarding"
  - "'on-chain' jargon scattered across 15+ user-facing files"
  - "Task details visible to users who hadn't completed prerequisites"
  - "Prerequisite list showed no assignment progress feedback"
  - "No CTA to claim credential after assignment accepted"
  - "XP Distributed stat hardcoded to 0"
  - "Stale data on tasks page after credential claim"
  - "sed -i '' syntax broke type generation on Linux"
  - "Overlapping status states in prerequisite list rendering"
root_cause: logic_error
resolution_type: code_fix
severity: medium
tags:
  - nextjs
  - onboarding
  - ux-copy
  - cardano-xp
  - nav-bar
  - prerequisite-gating
  - query-invalidation
  - sed-portability
  - eligibility
  - credential-claim
---

# Onboarding UX overhaul: nav prompts, eligibility gating, copy cleanup

## Problem

The Cardano XP app had a fragmented onboarding experience: new users who connected their wallet had no guidance toward minting an access token, the /learn page was generic and jargon-heavy, task eligibility was confusing, and several data display bugs undermined trust. A newcomer could not self-serve from wallet connect to first XP earn.

## Symptoms

- After wallet connect, no UI prompt to mint an access token — users hit a dead end
- /learn page showed technical language ("SLTs", "on-chain") and multi-module structure irrelevant to a single-assignment app
- "on-chain" jargon across 15+ files confused non-crypto-native users
- Authenticated users who hadn't completed prerequisites could see full task details they couldn't act on
- Prerequisite list showed no progress feedback — users couldn't tell if their assignment was pending, accepted, or refused
- Users with accepted assignments but unclaimed credentials had no call-to-action
- "XP Distributed" stat was hardcoded to 0 despite real distributions
- After claiming a credential on /learn, navigating to /tasks showed stale cached data
- `scripts/generate-types.sh` failed on Linux due to macOS-specific `sed -i ''` syntax
- Code review found overlapping status states, last-write-wins dedup bugs, and dead code

## What Didn't Work

N/A — this was greenfield UX work, not debugging a regression.

## Solution

### 1. sed portability fix (scripts/generate-types.sh)

```bash
# Before (macOS only):
sed -i '' 's/pattern/replacement/' file.ts

# After (Linux/GNU):
sed -i 's/pattern/replacement/' file.ts
```

### 2. Access token mint prompt (app-nav-bar.tsx, auth-status-bar.tsx)

Added conditional rendering when authenticated but missing alias:

```tsx
{isAuthenticated && user?.accessTokenAlias ? (
  <AliasDisplay />
) : isAuthenticated && !user?.accessTokenAlias ? (
  <Link href="/andamio-access-token">Mint Access Token</Link>
) : null}
```

### 3. /learn page rewrite

Replaced multi-module layout with single-assignment onboarding: "Complete this quick assignment and you can start giving feedback and earning XP." Added "How it works" explainer box. Removed stats counter, OnChainSltsBadge, and unused imports.

### 4. "on-chain" jargon removal (15+ files)

Systematic replacement: "on-chain" removed or replaced with "permanently recorded", "verified", or dropped. "Verified on-chain" became "Credential ID" with full non-truncated hash using `break-all`. (auto memory [claude]: never truncate hashes or policy IDs)

### 5. Task details gated by eligibility (tasks/page.tsx)

```tsx
{(!prerequisites.length || !isAuthenticated || eligibility?.eligible) && (
  <>
    <StatsBar />
    <TaskList />
    <CompletedTasks />
  </>
)}
```

Three cases: no prerequisites — show everything; anonymous — show everything (encourages sign-up); authenticated but ineligible — hide tasks, show only XP banner and prerequisite card.

### 6. Assignment status in prerequisite list (prerequisite-list.tsx)

Added `assignmentStatuses` prop computed via priority-based dedup:

```typescript
const grouped = groupCommitmentsByModule(studentCommitments, courseId);
const status = getModuleCommitmentStatus(moduleCommitments);
```

Single `displayStatus` priority chain prevents overlapping states:

```typescript
const displayStatus = isCompleted ? "completed"
  : assignmentStatus === "ASSIGNMENT_ACCEPTED" ? "accepted"
  : assignmentStatus === "PENDING_APPROVAL" ? "pending"
  : assignmentStatus === "ASSIGNMENT_REFUSED" ? "refused"
  : "not_started";
```

### 7. Claim credential CTA (tasks/page.tsx)

```tsx
const readyToClaimCredential = hasAcceptedAssignment && eligibility && !eligibility.eligible;

{readyToClaimCredential && (
  <Card>Your feedback was accepted — Claim Your Credential</Card>
)}
```

### 8. XP Distributed computation (tasks/page.tsx)

```typescript
const taskXpByHash = new Map(allTasks.map((t) => [t.taskHash, getTaskXp(t)]));
const distributedXp = submissions.reduce(
  (sum, s) => sum + (taskXpByHash.get(s.taskHash) ?? 0), 0
);
```

### 9. Query invalidation after credential claim (user-course-status.tsx)

```typescript
onSuccess={() => {
  void refetchStudent();
  void queryClient.invalidateQueries({ queryKey: studentCredentialKeys.all });
}}
```

### 10. Code review fixes

- **Overlapping status states**: Replaced independent booleans with single `displayStatus` priority chain
- **Last-write-wins dedup**: Switched from raw `Map.set()` to `getModuleCommitmentStatus()` priority logic
- **`router.push` → `<Link>`**: For prefetching and accessibility in auth-status-bar
- **Dead code**: Removed unused `credentialClaims`, `AlertIcon`, `CourseIcon`
- **Duplicated XP lookup**: Consolidated into `getTaskXp` helper

## Why This Works

The root cause was a gap between the app's technical infrastructure (multi-course, multi-project Andamio template) and the Cardano XP use case (one course, one project, one assignment). The onboarding UX assumed users understood the protocol mechanics. Each fix maps a specific user state to a clear next action:

- Connected, no token → "Mint Access Token" prompt
- Has token, no credential → /learn page with clear single assignment
- Assignment accepted → "Claim Your Credential" CTA
- Credential claimed → Full task access

The eligibility gating, status feedback, and query invalidation close the loops so users always know where they stand and what to do next.

## Prevention

1. **sed portability**: Use Node.js scripts for file transforms in Node-based projects, or add a CI check that flags `sed -i ''`
2. **Jargon creep**: Maintain a terminology guide — "never use 'on-chain' in user-facing copy; use 'verified' or 'permanently recorded'"
3. **Status state overlap**: Always model UI display states as a single discriminated union or priority chain, never independent booleans
4. **Dedup bugs**: When reducing a list to a Map, define an explicit conflict resolution strategy (priority ordering) rather than relying on insertion order
5. **Stale cache after mutations**: Every mutation's `onSuccess` should invalidate relevant query keys
6. **Missing CTAs**: Map every intermediate user state to a specific UI prompt — if a state has no CTA, the user is stuck
7. **Hash truncation**: Never truncate hashes or policy IDs — show full values with `break-all` CSS

## Related Issues

- [Access Token Page: Diataxis Consolidation](../content-architecture/access-token-page-diataxis-consolidation.md) — earlier pass at access token messaging and jargon cleanup
- [Strip Template to Single-Course App](../architecture/strip-template-to-single-course-app.md) — architectural foundation this overhaul builds on
- [Commitment Status Audit](../../commitment-status-audit.md) — comprehensive status normalization mapping referenced for prerequisite status display
- [Course Navigation Redesign Plan](../../plans/2026-02-13-course-navigation-redesign.md) — learn page simplification plan this work extends
- [XP Launch Messaging (Issue #13)](https://github.com/workshop-maybe/cardano-xp/issues/13) — messaging direction for XP copy
- `docs/user-notes.md` items 1, 3, 4, 5 — resolved by this overhaul (should be moved to "Resolved" section)
