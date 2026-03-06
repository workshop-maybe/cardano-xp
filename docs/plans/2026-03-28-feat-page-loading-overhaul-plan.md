---
title: "feat: Page Loading Overhaul"
type: feat
status: active
date: 2026-03-28
origin: docs/brainstorms/2026-03-28-page-loading-brainstorm.md
---

# feat: Page Loading Overhaul

## Overview

Comprehensive page loading overhaul for Cardano XP. Three layers: fix the provider waterfall and bundle config (quick wins), add server-side prefetching for data-heavy pages (architecture), then layer on contextual transaction/loading UX (polish). Bottom-up approach — each layer is independently shippable and builds on the previous one.

## Problem Statement

The app feels sluggish across the board. Every page hits a 6-step loading waterfall:

1. Server renders HTML shell + loading.tsx skeleton
2. Client hydrates, MeshProvider dynamic import starts
3. MeshProvider loads, AuthProvider dynamic import starts (**serial, not parallel**)
4. AuthProvider loads, JWT validation begins
5. Page component mounts, fires React Query hooks
6. API responses arrive, real content renders

Root causes:
- **Provider waterfall**: MeshProvider and AuthProvider use sequential `useEffect` + `import()` — two render ticks before any child has context
- **No server prefetching**: 25/28 pages are `"use client"` with zero SSR data fetching, despite tRPC server-side caller being scaffolded and ready
- **Bundle bloat**: No `optimizePackageImports` for 25+ Radix packages, 13 tiptap packages, recharts, framer-motion
- **Bare transaction UX**: 20-90s Cardano confirmation with only toast-based feedback, no contextual information

## Proposed Solution

Three ordered implementation phases, each independently shippable.

### Phase 1: Quick Wins (config + provider fix)

Low-risk changes that reduce JS shipped and eliminate the provider waterfall.

### Phase 2: Server-Side Prefetching

Convert `/tasks` and `/learn` pages to server components with React Query prefetching. Split monolithic client components into server shell + client islands.

### Phase 3: Loading UX

Enhance transaction wait experience with contextual information. Improve wallet connection feedback. Clean up loading states.

## Technical Approach

### Phase 1: Quick Wins

#### 1a. Parallelize Provider Imports

**Approach: Promise.all with ordered render** (see brainstorm: provider waterfall finding)

Create a single `CombinedProvider` that fires both dynamic imports in parallel via `Promise.all`, then renders them in the correct nesting order once both resolve. This collapses the waterfall from 3 render ticks to 2.

**File: `src/components/providers/combined-provider.tsx`** (new)

```
"use client"
// Single useEffect fires Promise.all([import("@meshsdk/react"), import("~/contexts/andamio-auth-context")])
// Once both resolve, render <MeshProvider><AuthProvider>{children}</AuthProvider></MeshProvider>
// Before both resolve, render <>{children}</> (same as current behavior during loading)
```

**Why Promise.all instead of independent parallel**: `AndamioAuthProvider` calls `useWallet()` from `@meshsdk/react` (line 149 of `andamio-auth-context.tsx`). If AuthProvider resolves and mounts before MeshProvider wraps it, `useWallet()` returns empty defaults and may not reactively pick up a late-mounting MeshProvider. Promise.all ensures both are ready before either renders.

**Update `src/app/layout.tsx`**: Replace `<MeshProvider><AuthProvider>` with `<CombinedProvider>`.

**Risk**: The comment in `mesh-provider.tsx` (line 38-39) notes that `@fabianbormann/cardano-peer-connect` throws during SSR with a "Cannot redefine property: chunk" error. The manual `useEffect` pattern exists to avoid this. The new CombinedProvider must preserve this SSR guard.

#### 1b. Add `optimizePackageImports`

**File: `src/next.config.js`** (edit)

Add `experimental.optimizePackageImports` for barrel-import packages:
- `@radix-ui/react-*` (list individually — no glob support)
- `recharts`
- `lucide-react`
- `@phosphor-icons/react`
- `date-fns`

**Exclude from the list**: `@meshsdk/react` (already dynamically imported at runtime — `optimizePackageImports` only affects static imports), `framer-motion` (handled separately in 1c), `tiptap` (uses subpath imports already).

**Validation**: Run `next build` and compare `.next/analyze` output before/after if bundle analyzer is available, or compare chunk sizes in build output.

#### 1c. Lazy-Load framer-motion

**Two boundaries** (see brainstorm: framer-motion finding):

1. **Celebration component** (`src/components/andamio/andamio-celebration.tsx`): Wrap with `next/dynamic({ ssr: false })` at its import site. Since celebrations are triggered 20-90s after page load (post-tx-confirmation), framer-motion will be loaded by then. Fallback: render nothing (celebration is fire-and-forget).

2. **Studio wizard**: Already isolated behind `(admin)/admin/course/[modulecode]` route. The 10 wizard files all import framer-motion directly. No change needed — Next.js code splitting already isolates this to admin routes. Only worth wrapping if bundle analysis shows the admin chunks leaking into the main app bundle.

3. **`use-animated-progress.ts`**: Check if this hook is used on any public-facing page. If so, replace `useMotionValue`/`animate` with CSS transitions or a lightweight alternative.

### Phase 2: Server-Side Prefetching

#### 2a. Server-Side Gateway Fetch Utility

**File: `src/lib/gateway-server.ts`** (new)

The client hooks use relative proxy URLs (`/api/gateway/api/v2/...`). Server-side code needs direct Gateway access.

```
// Uses env.NEXT_PUBLIC_ANDAMIO_GATEWAY_URL directly
// Attaches X-API-Key from env.ANDAMIO_API_KEY
// Returns typed, transformed data using the SAME transform functions from the hooks
// Pattern reference: src/app/api/gateway/[...path]/route.ts (proxy logic)
```

**Critical**: Server queryFns must apply the same transform functions (`transformProjectDetail`, `transformMergedTask`, etc.) as client hooks. If shapes differ, React Query will either serve wrong-shaped data or ignore the prefetch and re-fetch client-side.

**Transform imports from**:
- `src/hooks/api/project/use-project.ts` → extract `transformProjectDetail`, `transformMergedTask`
- `src/hooks/api/course/use-course.ts` → extract `transformCourseDetail`, `transformCourseModule`

These transforms may need to be extracted to shared files (e.g., `src/lib/transforms/project.ts`) so both server and client code can import them without pulling in React hooks.

#### 2b. Convert `/tasks` Page

**Current**: `src/app/(app)/tasks/page.tsx` — monolithic `"use client"` component, ~500 lines, 6 hooks (2 public + 4 auth-gated)

**Target architecture**:

```
src/app/(app)/tasks/
  page.tsx              ← server component: prefetches public data, renders shell
  tasks-content.tsx     ← "use client": receives prefetched data via HydrateClient,
                          handles auth-gated hooks, renders full page
```

**Server component** (`page.tsx`):
- Import `{ api, HydrateClient }` from `~/trpc/server` OR use direct `queryClient.prefetchQuery()`
- Prefetch `projectKeys.detail(projectId)` and `projectKeys.tasks(projectId)` using server-side Gateway utility
- projectId comes from static config (`CARDANO_XP.projectId`) — no dynamic params needed
- Wrap `<TasksContent />` in `<HydrateClient>`

**Client component** (`tasks-content.tsx`):
- `"use client"` — contains all current page logic
- `useProject()` and `useProjectTasks()` hydrate instantly from prefetched cache
- Auth-gated hooks (`useContributorCommitments`, `useStudentCompletionsForPrereqs`, `useStudentAssignmentCommitments`) fire client-side as before

**Hydration note**: The server renders the "unauthenticated" view (no contributor status, no "My Completed Tasks"). After client hydration + wallet connection (50-200ms), auth-dependent sections appear. This is acceptable — the core task list and page structure render instantly, and personal sections load progressively.

**Loading state changes**: Remove or simplify `src/app/(app)/loading.tsx` for the tasks route. The server-prefetched data means the page shell renders immediately. Auth-dependent sections can show inline loading states.

#### 2c. Convert `/learn` Page

**Current**: `src/app/(app)/learn/page.tsx` — `"use client"`, already has one Suspense boundary for `useSearchParams()`

**Target architecture**:

```
src/app/(app)/learn/
  page.tsx              ← server component: prefetches course + modules, reads searchParams
  learn-content.tsx     ← "use client": receives prefetched data, handles auth + preview mode
```

**Server component** (`page.tsx`):
- Receives `searchParams` prop (replaces `useSearchParams()` hook)
- Prefetches `courseKeys.detail(courseId)` and `courseKeys.modules(courseId)`
- Passes `preview` flag as prop to client component

**Client component** (`learn-content.tsx`):
- `"use client"` — hydrates from prefetched course/module data
- Auth-gated hooks fire client-side
- `preview` mode prop replaces `useSearchParams()` call

#### 2d. Suspense Boundaries

Add `<Suspense>` boundaries around auth-dependent client islands within the converted pages. Fallback: use existing `AndamioSectionLoading` for inline sections, not full-page `AndamioPageLoading`.

**Avoid double loading states**: When a page has Suspense boundaries, its `loading.tsx` route file should be removed or simplified to prevent the route-level loading.tsx rendering first, then the page rendering with its own Suspense fallbacks.

### Phase 3: Loading UX

#### 3a. Contextual Transaction Toasts

**Approach**: Enhance existing toast content rather than building new wait screen components. The `txWatcherStore` + Sonner toast system is robust and survives navigation. (see brainstorm: "Useful context" decision)

**File: `src/stores/tx-watcher-store.ts`** (edit) + **`src/hooks/tx/use-transaction.ts`** (edit)

Add a `txContext` field to the transaction registration:
```
{
  txHash: string,
  type: "COMMIT_TO_TASK" | "CLAIM_CREDENTIAL" | ...,
  description: string,     // "Committing to: Fix Login Bug"
  xpImpact?: string,       // "+50 XP on completion"
  tip?: string,             // "Cardano transactions confirm in ~20-60 seconds"
}
```

Toast content during confirmation phase:
- **Title**: Transaction type in plain language ("Committing to Task")
- **Description**: What the tx does ("Fix Login Bug — 50 XP reward")
- **Progress**: "Submitted → Confirming on Cardano..."
- **Tip**: Rotate helpful context ("Cardano processes blocks every 20 seconds", "Your XP will update once the transaction confirms")

**Design principle**: The toast is already the right container. It persists across navigation, has loading/success/error states, and users are trained to look at it. Don't fight the architecture — enhance the content.

#### 3b. Wallet Connection Feedback

**File: `src/components/wallet/connect-wallet-button.tsx`** (edit)

During the MeshProvider loading period (before wallet button can render), show a skeleton placeholder matching the button dimensions. After provider loads, the current flow handles the rest well.

Improve the "Signing In..." state with a pulsing indicator and "Please check your wallet extension" hint after 5 seconds.

#### 3c. Loading State Cleanup

After Phase 2, audit remaining `loading.tsx` files:
- **Remove**: `src/app/(app)/loading.tsx` (replaced by server-prefetched /tasks)
- **Keep**: `src/app/(app)/credentials/loading.tsx` (fully auth-gated, no server prefetch)
- **Keep**: `src/app/(app)/contributor/loading.tsx` (mostly auth-gated)
- **Keep**: `src/app/(app)/editor/loading.tsx` (custom editor skeleton)
- **Keep**: `src/app/(admin)/admin/course/loading.tsx`, `src/app/(admin)/admin/project/loading.tsx` (admin routes)
- **Evaluate**: `src/app/(app)/dashboard/loading.tsx` — dashboard is just a redirect, may not need a loading state

## System-Wide Impact

### Interaction Graph

- Phase 1 (CombinedProvider) touches the root layout → affects every page's initial render
- Phase 1 (optimizePackageImports) affects build output → all chunks may change
- Phase 2 (server prefetch) adds server-side Gateway calls → new network dependency at SSR time
- Phase 2 (component splits) changes the React component tree for /tasks and /learn → affects any component that imports from these pages
- Phase 3 (toast enhancement) modifies txWatcherStore → affects all 18 transaction component files

### Error Propagation

- Server-side prefetch failures should NOT block page render. If the Gateway is unreachable during SSR, the page should render without prefetched data and fall back to client-side fetching (current behavior).
- CombinedProvider import failure should render children without context (same as current fallback behavior).

### State Lifecycle Risks

- React Query hydration: if server prefetches data at time T but the client renders at T+5min (e.g., CDN cached HTML), the data is immediately stale. This is handled by React Query's staleTime (5min) — it will background-refetch.
- No orphaned state risk — all changes are additive or replacement, no new persistent state.

### API Surface Parity

- `src/lib/gateway-server.ts` (new) provides server-side access to the same Gateway endpoints the client hooks use. Must return identical data shapes.
- Transform functions become shared between hooks and server utility — extracting to `src/lib/transforms/` ensures parity.

## Acceptance Criteria

### Functional Requirements

- [ ] Provider imports fire in parallel (verify with performance timeline or console timing)
- [ ] `/tasks` page renders with data on initial server response (no client-side loading spinner for task list)
- [ ] `/learn` page renders with course/module data on initial server response
- [ ] Auth-dependent sections load progressively after wallet connection without layout shift
- [ ] Transaction toasts show contextual information (type, description, XP impact)
- [ ] All existing functionality works unchanged (no regressions in tx flow, wallet connection, navigation)

### Non-Functional Requirements

- [ ] `next build` succeeds with no new warnings
- [ ] Bundle size for main app routes does not increase (should decrease with optimizePackageImports)
- [ ] Server-side prefetch adds < 200ms to TTFB (Gateway call latency)
- [ ] If Gateway is unreachable during SSR, pages fall back to client-side fetching gracefully

### Quality Gates

- [ ] Manual test: fresh page load on /tasks shows content without spinner
- [ ] Manual test: navigate /tasks → /learn → /tasks, data loads from cache
- [ ] Manual test: submit a transaction, observe contextual toast content
- [ ] Manual test: disconnect wallet mid-session, reconnect — no stale auth state

## Dependencies & Prerequisites

- `@meshsdk/react` v2 beta must support reactive context updates (verify `useWallet()` picks up a late-mounting MeshProvider)
- Gateway API must be accessible from the Next.js server at build/SSR time (env vars `NEXT_PUBLIC_ANDAMIO_GATEWAY_URL` and `ANDAMIO_API_KEY` must be set)
- No changes needed to the Gateway API itself — all changes are client/SSR side

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| MeshSDK v2 useWallet() doesn't react to late provider | Low | High | Test in isolation first. Fallback: keep current serial pattern, just add Promise.all for parallel download |
| Server prefetch returns wrong data shape | Medium | Medium | Share transform functions. Add type assertions in server utility |
| Hydration mismatch flash (auth/unauth content) | High | Low | Acceptable tradeoff — core content renders fast, personal sections load progressively |
| optimizePackageImports breaks a Radix component | Low | Low | Test build + manual spot-check UI components. Easy to revert |
| Gateway unreachable during SSR in prod | Low | Medium | Graceful fallback to client-side fetching. Add try/catch around prefetch calls |

## Implementation Order

```
Phase 1a → 1b → 1c (quick wins, each independently shippable)
  ↓
Phase 2a (server Gateway utility — prerequisite for 2b/2c)
  ↓
Phase 2b + 2c (can be parallel — /tasks and /learn are independent)
  ↓
Phase 2d (Suspense boundaries — after page conversions)
  ↓
Phase 3a → 3b → 3c (UX layer, after architecture is stable)
```

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-28-page-loading-brainstorm.md](docs/brainstorms/2026-03-28-page-loading-brainstorm.md) — Key decisions: bottom-up approach, contextual tx waits over progress animations, data-heavy pages as priority targets

### Internal References

- Provider waterfall: `src/components/providers/mesh-provider.tsx`, `src/components/providers/auth-provider.tsx`
- Auth context: `src/contexts/andamio-auth-context.tsx:149` (useWallet dependency)
- Root layout: `src/app/layout.tsx` (provider chain)
- next.config: `next.config.js` (missing optimizePackageImports)
- tRPC server caller: `src/trpc/server.ts` (HydrateClient exported, never used)
- Query client config: `src/trpc/query-client.ts` (dehydrate/hydrate with SuperJSON)
- Gateway proxy: `src/app/api/gateway/[...path]/route.ts`
- Tasks page: `src/app/(app)/tasks/page.tsx`
- Learn page: `src/app/(app)/learn/page.tsx`
- Transaction hook: `src/hooks/tx/use-transaction.ts`
- TX watcher store: `src/stores/tx-watcher-store.ts`
- Celebration: `src/components/andamio/andamio-celebration.tsx`

### Institutional Learnings

- TX confirmed-state timeout: `docs/solutions/runtime-errors/tx-confirmed-state-timeout-and-error-recovery.md`
- Koios two-phase fetch pattern: `docs/solutions/integration-issues/koios-wallet-transparency-integration.md`
- Onboarding UX query invalidation: `docs/solutions/ui-bugs/onboarding-ux-overhaul-nav-gating-copy-cleanup-2026-03-27.md`
- Single-tenant route simplification: `docs/solutions/architecture/remove-dynamic-routes-single-tenant.md`
