---
title: "Server-side prefetch expansion — eliminate loading spinners on remaining public pages"
date: 2026-03-28
module:
  - src/app/(app)/xp/page.tsx
  - src/app/(app)/xp/leaderboard/page.tsx
  - src/app/(app)/tasks/[taskhash]/page.tsx
  - src/app/(app)/tasks/page.tsx
  - src/app/(app)/learn/[modulecode]/page.tsx
  - src/app/(app)/learn/[modulecode]/[moduleindex]/page.tsx
  - src/lib/gateway-server.ts
severity: medium
category: performance-issues
tags:
  - server-side-rendering
  - react-query-hydration
  - prefetch
  - loading-spinners
  - path-traversal
  - duplicate-api-calls
  - error-handling
  - next.js-server-components
  - gateway-api
symptoms:
  - "5 public pages showed loading spinners while fetching public data client-side"
  - "Route params interpolated into API paths without validation (path traversal risk)"
  - "Duplicate API calls — fetchCourseModules + fetchCourseModule hit same endpoint"
  - "XPContent had no error handling — silent failure on fetch error"
root_cause: "Pages were monolithic 'use client' components that fetched all data via React Query on mount. No server-side prefetch meant every page load showed a spinner for public data that could have been ready before HTML left the server."
resolution_summary: "Split each page into server wrapper (prefetch) + client content (interactivity). Server seeds React Query cache; client hydrates instantly. Added safePath validation, eliminated duplicate API calls via setQueryData, added missing error handling."
---

# Server-Side Prefetch Expansion

Extends the server-prefetch + hydration pattern (established in [the page loading overhaul](./page-loading-provider-waterfall-prefetch-overhaul.md)) to the remaining 5 public pages, eliminating loading spinners for public data across the entire app.

## Problem

After the initial page loading overhaul (PR #18), only `/learn` and `/tasks` used server-side prefetching. The remaining public pages — `/xp`, `/xp/leaderboard`, `/learn/[modulecode]`, `/learn/[modulecode]/[moduleindex]`, `/tasks/[taskhash]` — were still monolithic `"use client"` components that fetched all data client-side.

On every navigation to these pages:
1. Server renders an empty HTML shell
2. Client hydrates, providers load
3. Page component mounts and fires React Query hooks
4. API responses arrive; content finally renders

Public data (project detail, tasks, course modules, SLTs, lessons) identical for every visitor was behind loading spinners.

## Investigation

Two elements were already in place:
- **`src/trpc/server.ts`** exported `HydrateClient` and a `cache()`-wrapped `getQueryClient` — the infrastructure was wired but only used by 2 pages.
- **Client-side hooks** had well-defined query key factories and transform functions — the hydration contract was ready.

What was missing:
- No server-side fetch functions for SLTs, lessons, or single modules
- Every affected `page.tsx` was `"use client"` — no server component to run prefetch logic
- No input validation on route params interpolated into API paths
- No error handling in the XP page's extracted content component

## Solution

### Pattern: Server wrapper + client content

Each page is split into two files:

**Server wrapper** (`page.tsx`) — async RSC that prefetches public data:

```tsx
// Simple case: /xp/page.tsx — one prefetch
export default async function XPPage() {
  const queryClient = getQueryClient();

  try {
    await queryClient.prefetchQuery({
      queryKey: projectKeys.detail(projectId),
      queryFn: () => fetchProjectDetail(projectId),
    });
  } catch (err) {
    console.error("[XPPage] Server prefetch failed, falling back to client:", err);
  }

  return (
    <HydrateClient>
      <Suspense fallback={<AndamioPageLoading variant="detail" />}>
        <XPContent />
      </Suspense>
    </HydrateClient>
  );
}
```

**Client content** (`xp-content.tsx`) — the original page code with `"use client"`, unchanged business logic, and proper error handling.

### Eliminating duplicate API calls with `setQueryData`

The client hook `useCourseModule(courseId, moduleCode)` has its own query key (`courseModuleKeys.detail`), separate from the module list key (`courseModuleKeys.list`). Both hit the same API endpoint. Naively prefetching both means two identical HTTP requests.

Solution: Use `fetchQuery` (returns the value) for the list, then seed the detail cache:

```tsx
const [, modules] = await Promise.all([
  queryClient.prefetchQuery({ queryKey: courseKeys.detail(courseId), ... }),
  queryClient.fetchQuery({    // fetchQuery, not prefetchQuery — returns the value
    queryKey: courseModuleKeys.list(courseId),
    queryFn: () => fetchCourseModules(courseId),
  }),
  queryClient.prefetchQuery({ queryKey: sltKeys.list(courseId, moduleCode), ... }),
]);

// Seed detail cache from the list — no duplicate API call
const targetModule = modules?.find((m) => m.moduleCode === moduleCode) ?? null;
queryClient.setQueryData(courseModuleKeys.detail(courseId, moduleCode), targetModule);
```

### Route param sanitization

User-supplied URL segments are validated before interpolation into API paths:

```tsx
function safePath(segment: string): string {
  if (!/^[a-zA-Z0-9_\-\.]+$/.test(segment)) {
    throw new Error(`Invalid path segment: ${segment}`);
  }
  return segment;
}

// Usage
const response = await gatewayFetch(
  `/course/user/slts/${safePath(courseId)}/${safePath(moduleCode)}`
);
```

Additionally, `fetchLesson` validates `sltIndex` is a finite non-negative number before making the request.

### New server-side fetch functions

Added to `gateway-server.ts`:
- `fetchSLTs(courseId, moduleCode)` — mirrors `useSLTs` hook
- `fetchLesson(courseId, moduleCode, sltIndex)` — mirrors `useLesson` hook

Both use the same transform functions as client hooks for hydration compatibility.

## Key Decisions

**No `loading.tsx` files for converted pages.** The `<Suspense fallback={...}>` in each server wrapper serves the same purpose. Having both is redundant — the existing `/learn` and `/tasks` pages established the convention of relying on explicit Suspense only.

**`fetchCourseModule` (singular) was removed.** Instead of a dedicated function that duplicates the list fetch, the module detail cache is seeded from the list via `setQueryData`. One API call serves both cache entries.

**Shared transforms, not duplicated.** `gateway-server.ts` imports `transformSLT`, `transformLesson`, etc. directly from client hook files. This guarantees hydration parity. The tradeoff is cross-boundary coupling — extracting to `src/lib/transforms/` is a future improvement noted for when the transform layer grows.

**All server prefetches wrapped in try/catch.** Gateway failures fall back gracefully to client-side fetching. A Gateway outage never breaks a page.

## Pages Converted

| Page | Data prefetched | Queries |
|------|----------------|---------|
| `/xp` | Project detail (treasury) | 1 |
| `/xp/leaderboard` | Project detail (submissions, assessments) | 1 |
| `/learn/[modulecode]` | Course + modules + SLTs (detail seeded from list) | 3 + setQueryData |
| `/learn/[modulecode]/[moduleindex]` | Course + modules + SLTs + lesson (detail seeded) | 4 + setQueryData |
| `/tasks/[taskhash]` | Project detail + tasks list | 2 |
| `/tasks` (existing) | Added Suspense boundary | 0 (already prefetched) |

## Prevention: Checklist for New Pages

When adding a new page:

1. **Classify every data source** — public (prefetch on server) vs auth-gated (client-only) vs action-triggered (client-only)
2. **Create server/client split** if public data exists — `page.tsx` (server) + `*-content.tsx` (client)
3. **Match query keys exactly** — import from shared key factories, never construct inline
4. **Use shared transforms** — import from hook files, never duplicate
5. **Wrap prefetch in try/catch** — Gateway failures must not break pages
6. **Sanitize route params with `safePath`** — any value from `params`/`searchParams` interpolated into a URL path
7. **Handle loading/error in client component** — the component must work both with and without prefetched cache
8. **Add `<Suspense>` around client component** — do not also add a `loading.tsx` (redundant)
9. **Avoid duplicate fetches** — if list and detail hit the same endpoint, use `fetchQuery` + `setQueryData`

## Common Pitfalls

- **Redundant `loading.tsx` alongside `<Suspense>`** — pick one per route, not both
- **Forgetting `safePath` on route params** — config constants are safe, `params` values are not
- **Breaking the query key contract** — if a key factory changes, search both client hooks AND `gateway-server.ts` / server pages
- **Missing error handling after extraction** — the client component must still guard `isLoading`/`error`
- **Overlapping endpoints** — verify that two prefetches don't fetch the same data before adding both

## Related Documentation

- [Page Loading: Provider Waterfall + Server Prefetch Overhaul](./page-loading-provider-waterfall-prefetch-overhaul.md) — the original solution that established this pattern (PR #18)
- [Remove Dynamic Routes: Single-Tenant Config](../architecture/remove-dynamic-routes-single-tenant.md) — enabled server prefetch by replacing dynamic route params with static config
- [TX Confirmed State Timeout and Error Recovery](../runtime-errors/tx-confirmed-state-timeout-and-error-recovery.md) — TX state machine patterns used alongside server-prefetched data
- [Koios Wallet Transparency Integration](../integration-issues/koios-wallet-transparency-integration.md) — established the two-phase React Query fetch pattern generalized here
- [Onboarding UX Overhaul](../ui-bugs/onboarding-ux-overhaul-nav-gating-copy-cleanup-2026-03-27.md) — query invalidation patterns that coexist with server-prefetched data
- Plan: `docs/plans/2026-03-28-feat-page-loading-overhaul-plan.md`
- Brainstorm: `docs/brainstorms/2026-03-28-page-loading-brainstorm.md`
