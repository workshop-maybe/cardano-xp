---
title: "Next.js 16 page loading overhaul — provider parallelization, server prefetch, transaction UX"
module: "app-shell"
severity: "high"
problem_type: "performance"
tags:
  - next-js-16
  - react-19
  - hydration
  - server-prefetch
  - meshjs
  - cardano-wallet
  - dynamic-import
  - barrel-imports
  - transaction-ux
  - loading-waterfall
---

# Page Loading: Provider Waterfall + Server Prefetch Overhaul

## Symptom

6-step serial loading waterfall on every page:

1. Server renders HTML shell + loading.tsx skeleton
2. Client hydrates, MeshProvider dynamic import starts
3. MeshProvider loads, AuthProvider dynamic import starts (serial, not parallel)
4. AuthProvider loads, JWT validation begins
5. Page component mounts, fires React Query hooks
6. API responses arrive, real content renders

25 of 28 pages were fully `"use client"` with zero server-side prefetching. Transaction confirmations (20-90s on Cardano) showed only generic "Waiting for confirmation..." with no contextual feedback.

## Root Cause

Three independent issues:

**Provider waterfall.** `MeshProvider` and `AuthProvider` each used `useState` + `useEffect` + dynamic `import()`. Since AuthProvider's `AndamioAuthProvider` calls `useWallet()` from `@meshsdk/react`, it could not mount until MeshProvider resolved. But the *imports* themselves could run in parallel — the nesting constraint only affects rendering, not downloading.

**Client-side data fetching for public data.** Pages like `/tasks` and `/learn` fetched project/course data client-side behind loading spinners, even though this data is public (no auth required) and could be prefetched on the server.

**Bundle bloat.** Barrel imports for `@phosphor-icons/react` (6,000+ icons), `lucide-react` (1,000+ icons), `recharts`, and `date-fns` were not optimized by the bundler.

## Solution

### Phase 1: Parallel Provider Imports

**File: `src/components/providers/combined-provider.tsx`**

Single `CombinedProvider` fires `Promise.all` for both dynamic imports, then renders in correct nesting order once both resolve:

```tsx
useEffect(() => {
  void Promise.all([
    import("@meshsdk/react"),
    import("~/contexts/andamio-auth-context"),
  ]).then(([meshMod, authMod]) => {
    setProviders({
      Mesh: meshMod.MeshProvider,
      Auth: authMod.AndamioAuthProvider,
    });
  }).catch((err) => {
    console.error("[CombinedProvider] Failed to load providers:", err);
  });
}, []);
```

Collapses the waterfall from `T(mesh) + T(auth)` to `max(T(mesh), T(auth))` — saves ~70-170ms.

### Phase 2: Server-Side Prefetching

**File: `src/lib/gateway-server.ts`** — server-only utility that calls the Gateway API directly (bypassing the Next.js proxy), using the same transform functions as client hooks for hydration parity.

**File: `src/app/(app)/tasks/page.tsx`** — server component that prefetches public data:

```tsx
export default async function TasksPage() {
  const queryClient = getQueryClient();
  try {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: projectKeys.detail(projectId),
        queryFn: () => fetchProjectDetail(projectId),
      }),
      queryClient.prefetchQuery({
        queryKey: projectKeys.tasks(projectId),
        queryFn: () => fetchProjectTasks(projectId),
      }),
    ]);
  } catch (err) {
    console.error("[TasksPage] Server prefetch failed, falling back to client:", err);
  }
  return (
    <HydrateClient>
      <TasksContent />
    </HydrateClient>
  );
}
```

Client component (`TasksContent`) calls the same hooks with the same query keys — React Query finds data already in cache. No loading spinner for public data.

### Phase 3: Bundle Optimization + Transaction UX

- `optimizePackageImports` for `@phosphor-icons/react`, `lucide-react`, `recharts`, `date-fns`
- Removed `andamio-celebration` from barrel export to prevent framer-motion from entering main bundle
- Added `waitDescription` and `successDescription` to `TransactionUIConfig` for contextual toast content

## Gotchas

### Server prefetch MUST be wrapped in try/catch

Without it, a Gateway outage breaks the entire page instead of falling back to client-side fetching.

### Transform functions must be shared, not duplicated

`gateway-server.ts` imports `transformProjectDetail`, `transformMergedTask`, etc. directly from the client-side hook files. If these diverge, the server-prefetched data shape won't match what client hooks expect, causing cache misses or hydration errors.

**Future improvement:** Extract transforms to `src/lib/transforms/` so both server and client import from a shared location without the fragile cross-boundary coupling.

### Query key factories are the hydration contract

Server and client must use identical query keys. Both import from the same key factories (`projectKeys`, `courseKeys`, `courseModuleKeys`). If a server component uses a different key shape, prefetched data sits unused.

### `getQueryClient` must be `cache()`-wrapped

React's `cache()` ensures the same QueryClient instance is shared within a single request. Without it, the prefetch and `HydrateClient` dehydration would use different instances.

### `import "server-only"` is a build-time guard

`gateway-server.ts` accesses `env.ANDAMIO_API_KEY` (server secret). The `import "server-only"` prevents accidental client bundling.

### Avoid redundant `useSearchParams` after server conversion

When converting a page to a server component, read `searchParams` from the page props instead of `useSearchParams()` in the client component. This eliminates a Suspense requirement and removes a redundant data source.

## Prevention

### Avoid re-introducing serial provider waterfalls

- Never chain dynamic imports through sequential `useEffect` hooks
- Audit any new `useEffect` that calls `import()` — use `Promise.all` for concurrent loads
- If every page needs a provider, consider static import instead of dynamic

### When to use server-side prefetching

| Server-side prefetch | Client-only fetch |
|---|---|
| Data needed for initial render | Data triggered by user action |
| Same for every visitor | Depends on wallet/auth state |
| API response < 500ms | Endpoint requires browser-only auth |

### Maintaining hydration parity

1. Query keys: import from shared factory, never construct inline
2. Transforms: import same function on both sides
3. Serialization: keep query return types JSON-safe (SuperJSON handles Date/Map/Set)

### New transaction types

Always include `waitDescription` (contextual message during 20-90s wait) and `successDescription` (meaningful success message). Generic "Transaction confirmed" is not acceptable.

### Adding packages to `optimizePackageImports`

Add barrel-export packages that you only partially import. Skip packages with granular `exports` in `package.json` (already optimized) or packages under 5KB.

## Related

- [TX confirmed-state timeout](../runtime-errors/tx-confirmed-state-timeout-and-error-recovery.md) — error recovery patterns used in transaction toast system
- [Koios wallet transparency](../integration-issues/koios-wallet-transparency-integration.md) — two-phase React Query fetch pattern
- [Onboarding UX overhaul](../ui-bugs/onboarding-ux-overhaul-nav-gating-copy-cleanup-2026-03-27.md) — query invalidation after mutations
- [Remove dynamic routes](../architecture/remove-dynamic-routes-single-tenant.md) — single-tenant config patterns
- PR: [#18](https://github.com/workshop-maybe/cardano-xp/pull/18) — implementation PR
- Plan: [docs/plans/2026-03-28-feat-page-loading-overhaul-plan.md](../plans/../../plans/2026-03-28-feat-page-loading-overhaul-plan.md)
- Brainstorm: [docs/brainstorms/2026-03-28-page-loading-brainstorm.md](../brainstorms/../../brainstorms/2026-03-28-page-loading-brainstorm.md)
