---
title: "feat: Contributor Commitment Dashboard"
type: feat
status: completed
date: 2026-03-26
deepened: 2026-03-26
---

# feat: Contributor Commitment Dashboard

## Enhancement Summary

**Deepened on:** 2026-03-26
**Agents used:** 16 (6 learnings analyzers, 7 code reviewers, 2 researchers, 1 frontend design)

### Key Improvements from Deepening

1. **Page-level TX mutex** — First surface hosting multiple concurrent TX components; must disable all TX buttons while any TX is in flight to prevent UTXO collisions
2. **Unified loading gate** — Do not render commitment cards until all three hooks resolve; partial joins show broken "0 XP" flash
3. **Defer ContentEditor mounting** — Only mount for active commitment after user clicks "Edit"; each Tiptap instance = 50-100ms init + ~2-5MB DOM
4. **`contributorStateId` guard** — Most likely prop to be forgotten or `undefined`; must come from `useProject()` and be guarded
5. **Extract `getCommitmentStatusVariant`** — Currently local to task detail page; extract to `~/lib/format-status.ts`
6. **Data source discipline** — Use `useProjectTasks` exclusively (not `project.tasks`) to ensure `tokens` field is populated; never fall back

### New Risks Discovered

- UTXO collision if contributor triggers two TXs simultaneously (e.g., resubmit + claim)
- Evidence draft loss when manager assessment changes commitment status during editing
- Stale `PENDING_TX` display when user navigates away and returns after TX confirms

---

## Overview

Build the `/contributor` route — an authenticated page where contributors see all of their commitments across every pipeline stage: awaiting review, accepted (reward claimable), refused (resubmittable), and credential claimed. The route stub already exists (`loading.tsx` at `src/app/(app)/contributor/`) but has no `page.tsx`.

## Problem Statement / Motivation

Contributors currently have no single view of their commitment status. The task detail page (`/tasks/[taskhash]`) shows the status of one commitment at a time, and the tasks page (`/tasks`) shows a small status bar, but neither provides a comprehensive dashboard. Contributors need to:

- See all their commitments at a glance
- Understand what action is required (resubmit evidence, claim reward, browse new tasks)
- Access the "Leave & Claim Credential" flow from one central location

The tasks page already links to `/contributor` from two places (header action button at line 173 and status bar at line 216), but the destination doesn't exist yet.

This work completes the route simplification explicitly deferred in the original single-tenant refactor (see `docs/plans/2026-03-19-refactor-remove-dynamic-route-params-plan.md`, lines 53 and 161).

## Proposed Solution

A single `page.tsx` at `src/app/(app)/contributor/page.tsx` that:

1. Gates on wallet connection via inline `if (!isAuthenticated)` early return with `ConnectWalletGate`
2. Guards on `user.accessTokenAlias` — a contributor without an access token cannot have commitments
3. Fetches commitments via the existing `useContributorCommitments(projectId)` hook
4. Joins commitment data with task data from `useProjectTasks(projectId)` for titles/rewards
5. Renders a flat commitment list ordered by recency with status-based content per card
6. Surfaces the appropriate TX components inline: `TaskAction` for resubmission, `ProjectCredentialClaim` for leaving
7. Links to `/tasks` for the "commit to new task" path (avoids duplicating the commit flow)

Also fix the route mismatch: `AUTH_ROUTES.contributor` currently generates `/tasks/${projectId}/contributor` but should return `/contributor` for this single-project app.

### Research Insights

**Auth gating pattern:** Use the credentials page pattern (`src/app/(app)/credentials/page.tsx:52-59`) — inline `if (!isAuthenticated)` check that returns `ConnectWalletGate` as a full-page replacement. Add a second guard for `!user?.accessTokenAlias` with a separate empty state. Do NOT use `ConnectWalletGate` as a wrapper — it does not accept children.

**Simplification:** Render commitments as a flat list ordered by recency, not split into "active" vs "historical" sections. The protocol enforces at most one active commitment — the status badge already communicates whether action is needed. A section header above a single historical row is visual noise. Add section splits later if data volume warrants it.

**XP stats deferred:** The leaderboard page already computes and displays per-contributor XP. This page's purpose is action routing ("what should I do next?"), not analytics. Defer summary stats to a future enhancement.

## Technical Considerations

### Data Flow

All hooks already exist and are production-tested:

- `useContributorCommitments(projectId)` — returns `ContributorCommitment[]` with normalized statuses
- `useProject(projectId)` — provides `credentialClaims`, `contributors`, `submissions`, `contributorStateId`
- `useProjectTasks(projectId)` — task metadata for joining with commitments (titles, rewards, tokens)
- `useAndamioAuth()` — auth state, `user.accessTokenAlias`

#### Research Insights: Unified Loading Gate

**Do not render commitment cards until all three hooks resolve.** If commitments arrive before tasks, the `useMemo` join produces commitments with no title and "0 XP". The user sees a flash of broken cards that snap into real values when tasks load.

```typescript
const isReady = !isCommitmentsLoading && !isTasksLoading && !isProjectLoading;
if (!isReady) return <AndamioPageLoading variant="detail" />;
```

#### Research Insights: Mount-Time Refetch

When the user navigates back to `/contributor` after a TX completed elsewhere, the page may show stale `PENDING_TX` status from the React Query cache. Refetch on mount:

```typescript
useEffect(() => { void refreshData(); }, []);
```

### Task-Commitment Join

Commitments contain `taskHash` but not task titles or reward amounts. Build a `Map<string, Task>` via `useMemo` (not a plain object — `Map.get()` returns `T | undefined` which forces proper null handling).

#### Research Insights: Data Source Discipline

**Use `useProjectTasks` exclusively. Never fall back to `project.tasks`.** The tasks page has `const allTasks = mergedTasks ?? project?.tasks ?? []` — do NOT replicate this fallback. The `project.tasks` source (from `GET /project/user/project/{id}`) does not populate the `tokens` field, which silently breaks XP display. This is the exact data source mismatch documented in `docs/solutions/integration-issues/task-deletion-empty-native-assets-datasource-mismatch.md`.

Add a "why" comment at the data source selection per the prevention rule:
```typescript
// Use useProjectTasks (merged endpoint) — NOT project.tasks.
// The project detail endpoint doesn't populate tokens/assets.
// See: docs/solutions/integration-issues/task-deletion-empty-native-assets-datasource-mismatch.md
const { data: tasks } = useProjectTasks(projectId);
```

**XP matching:** Use `policyId`-only matching (never `assetName`) per `docs/solutions/integration-issues/xp-token-task-reward-integration.md`. The API returns decoded names (`"XP"`) while on-chain config uses hex (`"5850"`).

#### Research Insights: Orphaned Commitments

Handle `taskLookup.get(commitment.taskHash)` returning `undefined`. Show the commitment with "Task no longer available" fallback title and 0 XP. Do not filter out orphaned commitments — the contributor should see their historical record.

### Status Normalization

The `normalizeProjectCommitmentStatus` function in `use-project-contributor.ts:181` maps legacy values. `DENIED` maps to `REFUSED` (line 178). Treat both identically — "Needs Revision" with resubmit option.

### Route Fix

`AUTH_ROUTES.contributor` at `src/config/routes.ts:48` changes from `(projectId: string) => /tasks/${projectId}/contributor` to a simple string `/contributor`.

#### Research Insights: Thorough Route Fix

**Exact call sites to update:**
1. `src/config/routes.ts:48` — change function to string constant
2. `src/components/dashboard/contributing-projects-summary.tsx:139` — drop function invocation
3. `src/app/(app)/tasks/page.tsx:173,216` — replace hardcoded `"/contributor"` with `AUTH_ROUTES.contributor`

**Verification:** Run `tsc --noEmit` after the change. TypeScript will catch any remaining function-call sites since the type changes from `(string) => string` to `string`.

**Search discipline (from documented learning):** Search for both `"/contributor"` (double-quoted) AND `` `/contributor` `` (template literal) patterns. The route-path-mismatch learning documents that template literals are routinely missed by single-pattern searches.

### Credential Claim State

A contributor who has already claimed appears in `project.credentialClaims`. After claiming, the page becomes a read-only historical view with a success banner and link to `/credentials`.

#### Research Insights: Optimistic Post-Claim State

After `ProjectCredentialClaim` succeeds, set a local `justClaimed` boolean and render the post-claim banner immediately. Do not rely solely on the refetch — the API may have a consistency window before the credential claim propagates.

### Page-Level TX Mutex (NEW — from race condition analysis)

**This is the first page that can host multiple concurrent TX components.** The task detail page only ever shows one. If a contributor triggers two TXs simultaneously (e.g., `TaskAction` resubmit + `ProjectCredentialClaim`), the second TX will fail because the UTXOs consumed by the first are no longer available. The user sees two spinners, waits 60 seconds, and one fails with a cryptic error.

**Guard:** Track a page-level `isTxInFlight` state. Disable all TX buttons on the page while any TX component is in a non-idle state. Pass this as a `disabled` prop to all mounted TX components.

### Evidence Draft Protection (NEW — from race condition analysis)

If a contributor is editing evidence and a manager accepts the commitment during editing, the status transition destroys the editor (conditional rendering switches from SUBMITTED to ACCEPTED). The evidence draft is lost silently.

**Guard:** Before transitioning out of the editor state, check if evidence state is non-null. If so, show a toast: "Your submission was accepted while you were editing" rather than silently discarding the draft.

## Acceptance Criteria

### Functional Requirements

- [x] Page renders at `/contributor` with wallet connection gate (inline early return pattern)
- [x] Guards on `user.accessTokenAlias` — shows "Access Token Required" empty state if missing
- [x] Shows all contributor commitments as a flat list ordered by recency
- [x] **SUBMITTED** commitments show: task name, XP reward, "Awaiting Review" badge, submission TX link, read-only evidence via `ContentViewer`, "Edit Evidence" button that reveals `ContentEditor` + `TaskAction`
- [x] **REFUSED** commitments show: task name, "Needs Revision" badge, alert banner, "Revise Evidence" button that reveals `ContentEditor` + `TaskAction`
- [x] **ACCEPTED** commitments show: task name, XP reward, "Accepted" badge, two CTAs — "Browse Tasks" (link to `/tasks`) and "Leave & Claim Credential" (reveals `ProjectCredentialClaim`)
- [x] **PENDING_TX_*** commitments show: "Confirming..." badge, pending TX link, debounced refresh button
- [x] Post-credential-claim state: read-only history, success banner, link to `/credentials`
- [x] Empty state for authenticated users with no commitments — explains what contributing is and links to `/tasks`
- [x] `AUTH_ROUTES.contributor` fixed to return `/contributor`; hardcoded links in tasks page also updated
- [x] Page-level TX mutex prevents concurrent TX submissions
- [x] Unified loading gate — no partial rendering while hooks are loading

### Non-Functional Requirements

- [x] Follows existing page patterns: `"use client"`, `CARDANO_XP.projectId`, loading/error/empty/data states
- [x] Uses Andamio component library exclusively (no raw HTML for UI elements)
- [x] Responsive: stacked layout on mobile, grid on desktop
- [x] XP token matching uses `policyId` only (not `assetName`)
- [x] `ContentEditor` deferred — only mounts after user clicks "Edit", not on page load
- [x] Error messages passed through `getErrorMessage()` from `~/lib/api-utils`

## Implementation Plan

### Phase 1: Route Fix and Page Shell

**Files to create/modify:**

- `src/config/routes.ts` — Fix `AUTH_ROUTES.contributor` to string constant `/contributor`
- `src/components/dashboard/contributing-projects-summary.tsx:139` — Drop function invocation
- `src/app/(app)/tasks/page.tsx:173,216` — Replace hardcoded strings with `AUTH_ROUTES.contributor`
- `src/lib/format-status.ts` — Extract `getCommitmentStatusVariant` from task detail page
- `src/app/(app)/contributor/page.tsx` — New page component

Steps:
1. Change `AUTH_ROUTES.contributor` from function to string constant
2. Update `contributing-projects-summary.tsx` and tasks page call sites
3. Run `tsc --noEmit` to verify no missed call sites
4. Extract `getCommitmentStatusVariant` into `~/lib/format-status.ts`
5. Create `page.tsx` with auth gate, access token guard, data fetching hooks, unified loading gate, and error state

### Phase 2: Commitment Display and Actions

Build the core commitment list with status-based rendering and inline TX components:

1. Create `taskLookup: Map<string, Task>` via `useMemo` — with "why" comment on data source choice
2. Derive `hasClaimed` from `project.credentialClaims`
3. Track page-level `isTxInFlight` state for TX mutex
4. Render commitment cards as a flat list with status-specific content:
   - Status badge via `formatCommitmentStatus` + extracted `getCommitmentStatusVariant`
   - Task name from `taskLookup` join (fallback: "Task no longer available")
   - XP reward from `policyId`-only matching
   - Submission TX link when available
   - Read-only evidence via `ContentViewer` (NOT `ContentEditor` on load)
5. Wire TX components for active commitment only:
   - **SUBMITTED/REFUSED**: "Edit Evidence" button reveals `ContentEditor` + `TaskAction`
   - **ACCEPTED**: Two-option card — "Browse Tasks" link + "Leave & Claim" revealing `ProjectCredentialClaim`
   - **PENDING_TX_***: Debounced refresh button with `queryClient.invalidateQueries`
6. Empty state via `AndamioEmptyState` with CTA to `/tasks`
7. Post-claim banner with optimistic `justClaimed` flag

### TX Component Props (explicit mapping)

**`TaskAction`** (for SUBMITTED/REFUSED):
| Prop | Source |
|------|--------|
| `projectNftPolicyId` | `CARDANO_XP.projectId` |
| `contributorStateId` | `project.contributorStateId` — guard against `undefined` |
| `taskHash` | `commitment.taskHash` |
| `taskCode` | `TASK_${taskLookup.get(commitment.taskHash)?.index}` |
| `taskTitle` | `taskLookup.get(commitment.taskHash)?.title` |
| `taskEvidence` | `ContentEditor` state or `commitment.evidence as JSONContent` |
| `onSuccess` | `refreshData` callback |

**`ProjectCredentialClaim`** (for ACCEPTED):
| Prop | Source |
|------|--------|
| `projectNftPolicyId` | `CARDANO_XP.projectId` |
| `contributorStateId` | `project.contributorStateId` — guard against `undefined` |
| `projectTitle` | `project.title` |
| `pendingRewardLovelace` | Task's `lovelaceAmount` from `taskLookup` |
| `onSuccess` | Set `justClaimed = true` + `refreshData` |

### `refreshData` Callback

Replicate the task detail page's pattern exactly:
```typescript
const refreshData = useCallback(async () => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: projectContributorKeys.all }),
    queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) }),
    queryClient.invalidateQueries({ queryKey: projectKeys.tasks(projectId) }),
  ]);
}, [queryClient, projectId]);
```

## Key Files

| Purpose | Path |
|---------|------|
| **New page** | `src/app/(app)/contributor/page.tsx` |
| **Route fix** | `src/config/routes.ts:48` |
| **Route fix call site** | `src/components/dashboard/contributing-projects-summary.tsx:139` |
| **Route fix call sites** | `src/app/(app)/tasks/page.tsx:173,216` |
| **Existing loading** | `src/app/(app)/contributor/loading.tsx` |
| **Status formatting (extract target)** | `src/lib/format-status.ts` |
| **Contributor hooks** | `src/hooks/api/project/use-project-contributor.ts` |
| **Project hooks** | `src/hooks/api/project/use-project.ts` |
| **Auth hook** | `src/hooks/auth/use-andamio-auth.ts` |
| **TX components** | `src/components/tx/task-action.tsx`, `src/components/tx/project-credential-claim.tsx` |
| **XP config** | `src/config/cardano-xp.ts` |
| **Error utility** | `src/lib/api-utils.ts` (`getErrorMessage`) |
| **Evidence display** | `src/components/editor` (`ContentViewer`, `ContentEditor`) |
| **Pattern reference** | `src/app/(app)/tasks/[taskhash]/page.tsx` (commitment lifecycle UI) |
| **Pattern reference** | `src/app/(app)/tasks/page.tsx` (status bar, XP computation) |
| **Pattern reference** | `src/app/(app)/credentials/page.tsx` (auth gate pattern) |

## Design Decisions

1. **No inline task picker** — "Continue Contributing" links to `/tasks` rather than duplicating the commit flow. The task detail page already handles the full commit lifecycle including evidence editing, prerequisite checks, and pre-assignment gating.

2. **Reuse existing TX components directly** — `TaskAction` and `ProjectCredentialClaim` are already production-tested. Mount them inline with the same props pattern used on the task detail page.

3. **Client-side task join** — Rather than a new API endpoint, join `commitments[].taskHash` with `tasks[]` via `Map<string, Task>` in a `useMemo`. Data is cached by React Query.

4. **Single active commitment assumption** — The Andamio protocol enforces at most one active commitment per contributor. Encode this as a typed derivation with fallback (take first non-resolved commitment), not a structural assumption.

5. **DENIED = REFUSED** — The status normalizer already collapses these. Single update point if the protocol adds permanent denial semantics.

6. **Deferred ContentEditor** — Only mount the heavy Tiptap editor (50-100ms init, ~2-5MB DOM) when the user clicks "Edit Evidence". Use `ContentViewer` for all read-only evidence display. This is the single most impactful performance decision.

7. **Flat commitment list** — Render all commitments in a single flat list ordered by recency. The protocol enforces at most one active commitment, so the "historical" section would almost always be 0-2 items. Add section splits when data volume warrants it.

8. **Page-level TX mutex** — Track `isTxInFlight` state to prevent concurrent UTXO-colliding transactions. First page in the app that can host multiple TX components simultaneously.

9. **No summary stats in MVP** — The leaderboard already shows per-contributor XP. This page focuses on action routing. Add analytics later.

## UI/UX Design Notes

**Tone: Utilitarian-refined.** This is a work dashboard, not a marketing page. The existing design language is austere — zero border radius, blue-tinted neutrals, gold as earned reward signal.

**XP visual tokens:** Apply the `xp-card-glow` CSS class and `text-xp-earned` color to the credential claim CTA. These are defined in `globals.css` but underused — this dashboard is where they earn their keep.

**Color discipline:**
- `xp-earned` (gold) — only on XP values and the credential claim CTA
- `primary` (indigo) — structural: badges, success states
- `destructive` (red) — only the refused banner, one element
- `muted` — everything else

**Motion:** Use `animate-in-fade` and `animate-in-slide-up` with staggered `animation-delay` (100ms, 200ms, 400ms) for page load cascade.

**Active commitment card:** Full-width `AndamioCard` with status-specific content. ACCEPTED state shows two action paths side-by-side: "Browse Tasks" (neutral card) and "Leave & Claim" (gold glow).

**Historical commitments:** Compact rows (not full cards) — task icon, title, status badge. Collapse beyond 5 items behind "Show all".

**Celebration:** When credential claim succeeds, the existing `AndamioCelebration` overlay fires automatically (TX type is in `MOMENTS_OF_COMMITMENT`). The gold-threaded particle burst is the payoff moment.

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Orphaned commitment (task deleted) | Show with "Task no longer available" title, 0 XP |
| Two TXs attempted simultaneously | Page-level TX mutex disables all TX buttons while any is in flight |
| Manager assessment during evidence editing | Toast warning, do not silently discard draft |
| User navigates away during pending TX, returns | Mount-time `refreshData()` effect catches up |
| No access token alias | Separate empty state before commitment fetch |
| `contributorStateId` undefined (project still loading) | Do not mount TX components until project data resolves |
| API returns stale data after credential claim | Optimistic `justClaimed` flag renders banner immediately |

## Sources & References

### Internal References

- Task detail page commitment lifecycle: `src/app/(app)/tasks/[taskhash]/page.tsx:322-721`
- Tasks page status bar: `src/app/(app)/tasks/page.tsx:78-100`
- Credentials page auth gate pattern: `src/app/(app)/credentials/page.tsx:52-59`
- Contributor hooks (all data fetching): `src/hooks/api/project/use-project-contributor.ts`
- Leaderboard XP computation: `src/app/(app)/xp/leaderboard/page.tsx:62-69` (taskXpMap)

### Documented Learnings Applied

- XP token matching (policyId only): `docs/solutions/integration-issues/xp-token-task-reward-integration.md`
- Data source mismatch (use merged endpoint): `docs/solutions/integration-issues/task-deletion-empty-native-assets-datasource-mismatch.md`
- Route path search discipline: `docs/solutions/integration-issues/route-path-mismatch-forked-template-migration.md`
- Single-tenant route pattern: `docs/solutions/architecture/remove-dynamic-routes-single-tenant.md`
- TX state timeout and recovery: `docs/solutions/runtime-errors/tx-confirmed-state-timeout-and-error-recovery.md`
- TX component wiring (initiator_data, contributorStateId): `docs/solutions/runtime-errors/assignment-commit-500-three-root-causes.md`
- Client-side XP computation: `docs/solutions/architecture/xp-leaderboard-client-side-computation.md`

### Cross-Repo References

- App repo contributor page: `andamio-app-v2/src/app/(app)/project/[projectid]/contributor/page.tsx`
- API commitment orchestrator: `andamio-api/internal/orchestration/project_orchestrator.go`
- CLI commitment commands: `andamio-cli/cmd/andamio/project_contributor.go`
- API commitment types: `andamio-api/internal/orchestration/types.go` (ContributorCommitmentItem)
