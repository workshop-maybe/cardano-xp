---
title: "fix: Review findings — user-scoped localStorage, direct prefetch, JWT-gated rehydration"
type: fix
status: completed
date: 2026-03-31
---

# Review Findings Hardening

## Overview

Three fixes from the mainnet readiness code review: scope localStorage TX persistence by user alias, eliminate the fragile self-fetch in leaderboard server prefetch, and gate TX rehydration on JWT availability.

## Requirements Trace

- R1. localStorage TX keys must be scoped to the current wallet/user alias
- R2. Leaderboard server prefetch must call computation directly, not via HTTP self-fetch
- R3. TX rehydration must wait for JWT before re-registering persisted transactions

## Scope Boundaries

- No new features — these are hardening fixes for existing behavior
- No upstream API changes

## Key Technical Decisions

- **User scoping via alias**: Use `accessTokenAlias` from the auth context as the scope key. This is the on-chain identifier — stable, unique per wallet. Key format: `tx-watcher:${alias}:${txHash}`. On logout (alias changes), `clearAll()` already removes all entries.
- **Direct function extraction**: Extract the leaderboard computation from `route.ts` into `src/lib/xp-leaderboard.ts`. Both the API route handler and the page server component call this function directly. Eliminates the self-fetch URL construction entirely.
- **JWT gate via dependency**: Add `jwt` to the rehydration effect's dependency array and guard with `if (!jwt) return`. When JWT becomes available (auth resolves), the effect re-runs and rehydrates. This is simpler than merging effects.

## Implementation Units

- [ ] **Unit 1: User-scoped localStorage keys**

  **Goal:** Scope TX persistence keys by user alias so different wallets on the same browser don't see each other's transactions.

  **Requirements:** R1

  **Dependencies:** None

  **Files:**
  - Modify: `src/stores/tx-watcher-store.ts`
  - Modify: `src/components/providers/tx-watcher-provider.tsx`

  **Approach:**
  - Change `persistTx()` to accept `alias` parameter, write to `tx-watcher:${alias}:${txHash}`
  - Change `removeTxFromStorage()` to accept `alias` parameter
  - Change `getPersistedTxs()` to accept `alias` parameter, only scan keys matching `tx-watcher:${alias}:`
  - Change `clearAllTxStorage()` to clear all `tx-watcher:` keys (any alias) — on logout, clean everything
  - In `register()`, pass the current user alias from the store (need to add alias to store state or pass as parameter)
  - In `TxWatcherBridge`, pass the user's `accessTokenAlias` when calling rehydration and register
  - The store already has JWT in state — add alias alongside it via a new `updateAlias()` action, called from TxWatcherBridge when auth changes

  **Patterns to follow:**
  - `src/lib/andamio-auth.ts` for localStorage key patterns
  - Existing `updateJwt()` pattern for adding `updateAlias()`

  **Verification:**
  - localStorage keys include alias: `tx-watcher:myalias:txhash123`
  - `getPersistedTxs("alias1")` does not return entries for `alias2`
  - `npm run check` passes

- [ ] **Unit 2: Direct prefetch function for leaderboard**

  **Goal:** Extract leaderboard computation into a shared function callable by both the API route and the server prefetch, eliminating the self-fetch.

  **Requirements:** R2

  **Dependencies:** None (parallel with Unit 1)

  **Files:**
  - Create: `src/lib/xp-leaderboard.ts`
  - Modify: `src/app/api/xp-leaderboard/route.ts`
  - Modify: `src/app/(app)/xp/leaderboard/page.tsx`

  **Approach:**
  - Move the gateway fetch + computation logic from `route.ts` into `src/lib/xp-leaderboard.ts` as an exported async function `computeLeaderboard()` that returns `LeaderboardResponse`
  - Add `import "server-only"` guard (this function uses server-side env vars)
  - `route.ts` becomes a thin handler: calls `computeLeaderboard()`, wraps in `NextResponse.json()`
  - `page.tsx` prefetch calls `computeLeaderboard()` directly instead of `fetch(localhost/api/...)`
  - Remove the `NEXT_PUBLIC_VERCEL_URL` / localhost URL construction entirely

  **Patterns to follow:**
  - `src/lib/gateway-server.ts` for server-only utility pattern with `import "server-only"`
  - Existing `fetchProjectDetail()` in `gateway-server.ts` for the function shape

  **Verification:**
  - Leaderboard page renders correctly (prefetch works without self-fetch)
  - API route still works for client-side fetches
  - No `NEXT_PUBLIC_VERCEL_URL` or `localhost` references in leaderboard code
  - `npm run check` passes

- [ ] **Unit 3: JWT-gated rehydration**

  **Goal:** Prevent TX rehydration from firing before JWT is available, ensuring SSE connections have proper auth.

  **Requirements:** R3

  **Dependencies:** Unit 1 (needs alias in the rehydration call)

  **Files:**
  - Modify: `src/components/providers/tx-watcher-provider.tsx`

  **Approach:**
  - Change the rehydration `useEffect` dependency array from `[]` to `[jwt]`
  - Add guard: `if (!jwt) return` — skip rehydration when JWT is not yet available
  - When JWT becomes available (auth resolves from localStorage), the effect re-runs and rehydrates
  - This also naturally prevents rehydration during SSR (jwt is always null server-side)
  - Combine with Unit 1: pass the user alias to `getPersistedTxs()` and `register()`

  **Patterns to follow:**
  - Existing JWT sync effect pattern in the same file

  **Verification:**
  - Rehydration does not fire until JWT is available
  - After auth resolves, persisted TXs are recovered correctly
  - `npm run check` passes

## Risks & Dependencies

- Unit 1 changes the localStorage key format — existing persisted entries from before this change won't be found (old format `tx-watcher:${txHash}` vs new `tx-watcher:${alias}:${txHash}`). This is acceptable: entries expire after 1 hour anyway, and the app is not yet on mainnet.

## Sources & References

- Review findings from `docs/plans/2026-03-31-001-feat-mainnet-readiness-plan.md` review
- Solution doc: `docs/solutions/runtime-errors/tx-crash-recovery-localstorage-persistence.md`
