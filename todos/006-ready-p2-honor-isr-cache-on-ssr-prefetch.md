---
status: ready
priority: p2
issue_id: "006"
tags: [code-review, performance, reliability, caching, pr-50]
dependencies: []
---

# Honor the ISR cache on SSR prefetch for xp-activity

## Problem Statement

`/api/xp-activity` sets `export const revalidate = 300` to cache the route handler for 5 minutes. Both `src/app/page.tsx` and `src/app/(app)/xp/activity/page.tsx` call `computeActivityStats()` **directly** in their async server components — bypassing the route handler and therefore bypassing the ISR cache. Every fresh SSR request runs two gateway roundtrips (commitments + project detail), even though a cached response from the same 5-minute window is sitting right there.

Related: on a slow gateway the 10s `AbortSignal.timeout` blocks TTFB for up to 10s before the `try/catch` falls through.

## Findings

- **Performance Reviewer** (0.85): "The cache the PR added is unreachable from the primary consumers."
- **Reliability Reviewer**: Related SSR 10s-TTFB on gateway stress.

## Proposed Solutions

### Option A (recommended): Wrap with `unstable_cache`

```ts
// src/lib/xp-activity.ts
import { unstable_cache } from "next/cache";

export const getCachedActivityStats = unstable_cache(
  computeActivityStats,
  ["xp-activity"],
  { revalidate: 300 },
);
```

Use `getCachedActivityStats` in both `page.tsx` and `activity/page.tsx` prefetch calls, and in `/api/xp-activity/route.ts`. One gateway hit every 5 min, shared across surfaces.

- **Effort**: ~15 lines across three files.
- **Risk**: Low. Can be invalidated on demand with `revalidateTag` later if needed.

### Option B: Have SSR pages fetch the API route instead of calling the function

- **Pros**: The route's own `revalidate` handles caching.
- **Cons**: Adds an internal HTTP hop in SSR; harder to reason about.
- **Effort**: Small but surprising.

### Option C (orthogonal): Shorten SSR-only gateway timeout

```ts
await Promise.race([
  queryClient.prefetchQuery({...}),
  new Promise((_, reject) => setTimeout(() => reject(new Error("SSR timeout")), 3000)),
]);
```

so landing TTFB is bounded at ~3s even if the gateway hangs. Combine with Option A.

## Recommended Action

Option A + Option C. Small, tested, bounds landing TTFB under gateway stress while making the ISR actually effective.

## Acceptance Criteria

- [ ] `computeActivityStats` result is cached for 300s globally and shared between landing + activity pages.
- [ ] `/api/xp-activity` route handler reads from the same cache.
- [ ] Cold SSR after 5min cache miss completes within gateway-latency + negligible overhead.
- [ ] Slow-gateway SSR falls through to client refetch within ~3s (bounded TTFB).
- [ ] Manual check: add a log at the start of `computeActivityStats`, load `/` twice within 5min on preview, confirm only one invocation.

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-04-20 | Created from PR #50 review | ISR `revalidate` on route handlers is bypassed by direct function calls from server components |

## Resources

- PR: #50
- Next.js docs: `unstable_cache`, route-segment `revalidate`
