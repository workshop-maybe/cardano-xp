---
title: "feat: Mainnet Readiness — TipTap lazy-load, leaderboard fix, TX resilience, credential celebration"
type: feat
status: completed
date: 2026-03-31
---

# Mainnet Readiness

## Overview

Four work items to bring Cardano XP to mainnet quality: lazy-load the TipTap editor to reduce bundle size on read-only pages, fix leaderboard attribution for grouped tasks, add crash recovery to the transaction pipeline, and build a credential celebration experience.

## Problem Frame

The app is functionally complete but has four gaps that affect mainnet user experience:
1. **Performance**: ContentEditor (15 TipTap packages + lowlight) loads on every page that displays content, even read-only views
2. **Data accuracy**: Leaderboard credits all submitters of a grouped task when any one is accepted — wrong when multiple contributors submit the same task type
3. **Reliability**: If the browser tab closes during the 20-90s Cardano confirmation window, all in-flight TX state is lost — the user has no idea their TX succeeded
4. **Visibility**: Credentials page shows only completed courses — no project credentials, no on-chain data, no celebration moment

## Requirements Trace

- R1. ContentEditor must be lazy-loaded; ContentViewer (read-only) stays static
- R2. Leaderboard must attribute XP only to the specific submitter whose submission was accepted
- R3. In-flight transactions must survive browser refresh/crash and resume monitoring on app load
- R4. Credentials page must show project credentials, on-chain TX hashes, and celebrate the achievement
- R5. No regressions to existing functionality — editor still works in studio/wizard, TX pipeline still functions, leaderboard still renders

## Scope Boundaries

- No upstream API changes (work within existing Gateway responses)
- No unit test framework introduction (Playwright e2e only)
- No supply exhaustion protection (explicitly ruled out)
- Credential celebration is Andamio protocol UX, not CIP-68 datum construction

## Context & Research

### Relevant Code and Patterns

- **Dynamic imports**: `CombinedProvider` uses `Promise.all` + `import()` for concurrent lazy loading. `wallet-address.ts` uses `await import("@meshsdk/core")` to avoid SSR. No `next/dynamic` usage exists yet.
- **Leaderboard**: `src/app/(app)/xp/leaderboard/leaderboard-content.tsx` — `computeLeaderboard()` joins by `taskHash` alone (lines 71-87). `ManagerCommitmentItem` has `submitted_by` + `task_hash` composite key.
- **TX pipeline**: `tx-watcher-store.ts` is vanilla Zustand, module-level. No localStorage persistence. `WatchedTransaction` has `_confirmedTimeout` timer pattern. `handleTerminal()` is the single cleanup path.
- **Credentials**: `src/app/(app)/credentials/page.tsx` shows only course credentials. `CredentialClaim` type has `{alias, tx}`. `ProjectDetail.credentialClaims` is available.
- **API proxy**: `src/app/api/gateway/[...path]/route.ts` — catch-all proxy injecting `X-API-Key`. Pattern for server-side API routes.
- **Server prefetch**: `gateway-server.ts` pattern with `fetchQuery` + `safePath()` sanitization.

### Institutional Learnings

- **Provider waterfall fix**: Never chain dynamic imports through sequential `useEffect` — use `Promise.all` (saves ~70-170ms)
- **MeshSDK SSR**: `"use client"` does NOT prevent server-side evaluation — always `await import()` for WASM libs
- **Leaderboard XP attribution**: Known limitation documented in solution `xp-leaderboard-client-side-computation.md`. Fix path: use manager commitments data which has `submitted_by` per commitment
- **TX confirmed timeout**: Must live in Zustand store (not React hook) to avoid split-brain. Timer cleanup checklist: `handleTerminal`, `unregister`, `cleanup`, `clearAll`
- **SSR hydration**: Never read localStorage during render — use `useState(null)` + `useEffect`
- **Gateway abandoned TX recovery**: Server-side reconcilers handle the gateway side; client-side crash recovery is the gap

## Key Technical Decisions

- **`next/dynamic` for ContentEditor**: Use `next/dynamic({ ssr: false })` rather than raw `import()` + `React.lazy()`. Next.js dynamic is the idiomatic pattern for this, handles SSR avoidance, and supports a loading placeholder. ContentViewer stays statically imported.
- **Leaderboard: server-side API route**: Create `/api/xp-leaderboard` that calls the manager commitments endpoint with the app's API key. Returns pre-computed leaderboard data. This avoids the grouped-task ambiguity because `ManagerCommitmentItem` has per-submission `submitted_by`. The leaderboard page (public, no auth) fetches from this route instead of computing client-side from `ProjectDetail`.
- **TX crash recovery: localStorage + store rehydration**: Persist `{txHash, txType, toastConfig, registeredAt}` to localStorage after `register()`. On app load, `TxWatcherBridge` reads localStorage entries and re-registers them. Clean up on terminal state. Expire entries older than 1 hour (Cardano TTL).
- **Credential celebration: enhance existing page**: Extend the existing credentials page to also show project credential claims from `ProjectDetail.credentialClaims`. Add on-chain TX hash display and explorer links. The celebration moment comes from the existing `MOMENTS_OF_COMMITMENT` wiring in `tx-watcher-store.ts` — `PROJECT_CONTRIBUTOR_CREDENTIAL_CLAIM` already triggers it.

## Open Questions

### Resolved During Planning

- **Does the manager commitments endpoint return all commitments or just pending?** — The hook comment says "pending submissions awaiting assessment" but the `ManagerCommitmentItem` includes `commitment_status` and `task_outcome` fields, suggesting it returns all statuses. The leaderboard API route will filter to accepted outcomes.
- **Does the credentials page need global datum display?** — Not in this iteration. The memory says "show global datum + celebrate credentials" but global datum visualization requires discovery work on what the Andamio API exposes. Credentials celebration is the priority. Global datum display can follow.

### Deferred to Implementation

- **Exact manager commitments filter parameters**: May need to pass status filters or handle pagination. Implementation will verify the response shape.
- **ContentEditor dynamic import — which wrapper pattern**: Whether to create a `dynamic.tsx` barrel export or inline `dynamic()` at each import site. Will decide based on how many sites need the editor vs viewer.

## Implementation Units

- [ ] **Unit 1: ContentEditor dynamic wrapper**

  **Goal:** Create a lazy-loaded wrapper for ContentEditor that removes 15 TipTap packages from the initial bundle on read-only pages.

  **Requirements:** R1, R5

  **Dependencies:** None

  **Files:**
  - Create: `src/components/editor/components/ContentEditor/dynamic.tsx`
  - Modify: `src/app/(app)/contributor/page.tsx`
  - Modify: `src/app/(app)/tasks/[taskhash]/task-detail-content.tsx`
  - Modify: `src/app/(app)/learn/[modulecode]/[moduleindex]/lesson-content.tsx`
  - Modify: `src/app/(app)/learn/[modulecode]/assignment/page.tsx`
  - Modify: `src/components/learner/assignment-commitment-shared.tsx`
  - Modify: `src/components/content-display.tsx`

  **Approach:**
  - Create `dynamic.tsx` exporting `ContentEditorDynamic` using `next/dynamic(() => import('./index'), { ssr: false, loading: () => <EditorSkeleton /> })`
  - Loading skeleton: simple animated placeholder matching editor height
  - Replace `ContentEditor` imports with `ContentEditorDynamic` in read-only contexts (lesson view, task detail, contributor page, content-display)
  - Keep static `ContentEditor` imports in editing contexts (studio wizard steps, task-form, editor demo page)
  - ContentViewer remains statically imported everywhere

  **Patterns to follow:**
  - `CombinedProvider` lazy-loading pattern for the loading state approach
  - `wallet-address.ts` for SSR avoidance with dynamic imports

  **Test scenarios:**
  - Read-only pages (lesson, task detail) render content without loading the full editor bundle
  - Studio wizard steps still load the full editor synchronously for editing
  - Loading skeleton appears briefly during chunk load
  - No hydration mismatches

  **Verification:**
  - `npm run check` passes (lint + typecheck)
  - Read-only pages render correctly with content
  - Editor pages still function for editing

- [ ] **Unit 2: Leaderboard server-side API route**

  **Goal:** Create a server-side API route that computes leaderboard data using manager commitments (which have per-submission attribution), replacing the ambiguous client-side join.

  **Requirements:** R2, R5

  **Dependencies:** None (parallel with Unit 1)

  **Files:**
  - Create: `src/app/api/xp-leaderboard/route.ts`
  - Modify: `src/app/(app)/xp/leaderboard/leaderboard-content.tsx`
  - Modify: `src/hooks/api/project/use-project.ts` (if query key export needed)

  **Approach:**
  - Server route: POST handler that calls the gateway's manager commitments endpoint (`/api/v2/project/manager/commitments/list`) with the server-side API key (same pattern as `gateway/[...path]/route.ts`)
  - Filter commitments where `task_outcome` indicates acceptance
  - Compute XP per alias using `submitted_by` from each commitment + task assets for XP amount
  - Also fetch project detail for contributor enrollment status and credential claims
  - Return `{ entries: LeaderboardEntry[], stats: { totalXp, uniqueContributors } }`
  - Client: Replace `computeLeaderboard(project)` with a fetch to `/api/xp-leaderboard`. Use React Query with the existing prefetch pattern.
  - Add server prefetch in the leaderboard page wrapper for instant load

  **Patterns to follow:**
  - `src/app/api/gateway/[...path]/route.ts` for API key injection pattern
  - `src/lib/gateway-server.ts` for server-side fetch with `safePath()`
  - Existing `computeLeaderboard` logic for the XP computation approach (policyId-only matching)

  **Test scenarios:**
  - Grouped task (same taskHash, 2 submitters): only the accepted submitter gets XP
  - Single submitter per task: same result as before (regression check)
  - Missing task assets: submitter gets 0 XP, not an error
  - Empty commitments: returns empty leaderboard

  **Verification:**
  - Leaderboard renders with correct per-contributor XP
  - No duplicate crediting for grouped tasks
  - `npm run check` passes

- [ ] **Unit 3: Transaction crash recovery**

  **Goal:** Persist in-flight transactions to localStorage so they survive browser refresh/crash and resume monitoring on app load.

  **Requirements:** R3, R5

  **Dependencies:** None (parallel with Units 1-2)

  **Files:**
  - Modify: `src/stores/tx-watcher-store.ts`
  - Modify: `src/components/providers/tx-watcher-provider.tsx` (TxWatcherBridge)

  **Approach:**
  - **Persist on register**: After `register()` adds a TX to the in-memory map, also write `{txHash, txType, toastConfig, registeredAt}` to localStorage under a key like `tx-watcher:${txHash}`
  - **Clean up on terminal**: In `handleTerminal()`, remove the localStorage entry alongside the in-memory cleanup
  - **Rehydrate on load**: In `TxWatcherBridge` (already runs on mount), scan localStorage for `tx-watcher:*` keys. For each non-expired entry (< 1 hour old), call `store.register()` to resume SSE/polling
  - **SSR safety**: All localStorage access in `useEffect` only — never during render (per hydration mismatch learnings)
  - **Timer cleanup checklist**: Any new localStorage operations follow the same paths as `_confirmedTimeout`: `handleTerminal`, `unregister`, `cleanup`, `clearAll`

  **Patterns to follow:**
  - `src/lib/andamio-auth.ts` for localStorage read/write patterns
  - `src/components/dashboard/post-mint-auth-prompt.tsx` for flag-based localStorage usage
  - `tx-watcher-store.ts` existing `_confirmedTimeout` timer lifecycle for cleanup path alignment

  **Test scenarios:**
  - Submit TX → close tab → reopen → TX is recovered and monitoring resumes
  - TX reaches terminal state → localStorage entry is cleaned up
  - Expired entries (>1 hour) are ignored on rehydration and cleaned up
  - Multiple in-flight TXs are all recovered
  - No hydration mismatches from localStorage reads

  **Verification:**
  - localStorage entries appear after TX submission
  - App reload recovers in-flight TXs
  - Terminal TXs are cleaned from localStorage
  - `npm run check` passes

- [ ] **Unit 4: Credential celebration — project credentials + on-chain data**

  **Goal:** Extend the credentials page to show project credential claims with on-chain TX hashes and explorer links.

  **Requirements:** R4, R5

  **Dependencies:** None (parallel with Units 1-3)

  **Files:**
  - Modify: `src/app/(app)/credentials/page.tsx`
  - Modify: `src/hooks/api/project/use-project.ts` (if `CredentialClaim` type needs enrichment)

  **Approach:**
  - Fetch project detail via `useProject(CARDANO_XP.projectId)` to get `credentialClaims`
  - Check if the authenticated user's alias is in the credential claims list
  - If claimed: show a celebration card with the on-chain TX hash, explorer link (CardanoScan), claim date context, and XP total from the leaderboard
  - Add a "Project Credentials" section alongside the existing "Course Credentials" grid
  - Explorer link format: `https://cardanoscan.io/transaction/${tx}` (or preprod equivalent based on network config)
  - The celebration trigger on claim is already wired — `PROJECT_CONTRIBUTOR_CREDENTIAL_CLAIM` is in `MOMENTS_OF_COMMITMENT`

  **Patterns to follow:**
  - Existing credential card layout in `credentials/page.tsx`
  - `AndamioCard`, `AndamioBadge`, `AndamioCardIconHeader` component patterns
  - `AchievementIcon` from `~/components/icons` for credential celebration
  - `src/components/tx/pending-tx-list.tsx` for TX hash display with explorer links

  **Test scenarios:**
  - User with project credential claim: sees celebration card with TX hash and explorer link
  - User without credential claim: sees empty state for project credentials section
  - TX hash links to correct explorer (preprod vs mainnet)
  - Course credentials section unchanged

  **Verification:**
  - Credentials page shows both course and project credential sections
  - On-chain TX hash is displayed (not truncated — per user preference)
  - Explorer link works
  - `npm run check` passes

## System-Wide Impact

- **Interaction graph:** Unit 1 touches ContentEditor imports across ~7 files but is purely an import swap — no behavior change. Unit 2 adds a new API route but replaces (not duplicates) existing computation. Unit 3 modifies the global TX store — all TX-related hooks and components are affected. Unit 4 adds data to the credentials page only.
- **Error propagation:** Unit 2's server route must handle gateway errors gracefully and return structured JSON errors. Unit 3's localStorage failures should be silent (degraded but functional — no crash recovery, same as today).
- **State lifecycle risks:** Unit 3 introduces localStorage state that must stay in sync with the Zustand store. The cleanup paths are the critical surface: `handleTerminal`, `unregister`, `cleanup`, `clearAll`.
- **API surface parity:** Unit 2 creates a new public API route (`/api/xp-leaderboard`) — no auth required, rate limiting inherited from Next.js defaults.
- **Integration coverage:** Unit 2 depends on the manager commitments endpoint returning all commitment statuses (not just pending). If it only returns pending, the approach needs adjustment.

## Risks & Dependencies

- **Manager commitments endpoint scope**: If the endpoint only returns pending (unassessed) commitments, Unit 2 cannot compute historical XP. Mitigation: verify the response during implementation and fall back to the existing `taskHash` join with a defensive warning log if needed.
- **localStorage quota**: TX entries are small (~200 bytes each) and expire after 1 hour. No risk of quota issues.
- **ContentEditor prop compatibility**: The dynamic wrapper must forward all props. If ContentEditor uses refs, `next/dynamic` handles this with `forwardRef` support.

## Sources & References

- Solution: `docs/solutions/architecture/xp-leaderboard-client-side-computation.md`
- Solution: `docs/solutions/runtime-errors/tx-confirmed-state-timeout-and-error-recovery.md`
- Solution: `docs/solutions/performance-issues/page-loading-provider-waterfall-prefetch-overhaul.md`
- Solution: `docs/solutions/ui-bugs/ssr-hydration-mismatch-sessionstorage-render.md`
- Upstream: `andamio-api/docs/solutions/architecture-patterns/abandoned-tx-recovery-in-reconcilers.md`
