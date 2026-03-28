# Page Loading Investigation

**Date:** 2026-03-28
**Status:** Brainstorm complete
**Approach:** Bottom-up optimization with full UX pass

## What We're Building

A comprehensive page loading overhaul that fixes fundamental performance issues and then layers on an engaging loading/transaction UX. The app currently feels sluggish across the board — initial page loads, wallet connection, transaction waits, and data-heavy pages all have room to improve.

## Why This Approach

Bottom-up optimization first because:
- The provider waterfall (MeshProvider → AuthProvider serial dynamic imports) adds unnecessary serial delay to every page load
- 25/28 pages are client components with zero server-side prefetching, despite tRPC being scaffolded for it
- Fixing fundamentals first means some loading states become unnecessary — no point polishing a skeleton that gets eliminated by prefetching
- Each step is independently shippable and testable

## Current State (Research Findings)

### The 6-Step Loading Waterfall
1. Server renders HTML shell + loading.tsx skeleton
2. Client hydrates, MeshProvider dynamic import starts
3. MeshProvider loads, AuthProvider dynamic import starts (serial, not parallel)
4. AuthProvider loads, JWT validation begins
5. Page component mounts, fires React Query hooks
6. API responses arrive, real content renders

### What's Already Good
- Unified skeleton system: `AndamioPageLoading` with 5 variants, `AndamioStudioLoading` with 3 variants
- 7 loading.tsx files covering key routes
- React Query configured with sensible defaults (5min stale, 30min GC)
- CSS page-enter animation (150ms fade-up) already in place

### What Needs Work
- MeshProvider/AuthProvider dynamic imports are serial (waterfall)
- No `optimizePackageImports` for heavy deps (25+ Radix packages, 13 tiptap packages, recharts, framer-motion)
- Zero server-side prefetching — `HydrateClient` is exported but never used
- No Suspense boundaries for streaming partial content
- Mesh SDK loads on every page via root layout even when wallet not needed
- Transaction wait UX is bare — no contextual information shown during confirmation
- framer-motion bundled globally but only used in studio wizard

## Key Decisions

1. **Bottom-up approach**: Fix provider waterfall and config first, then server components, then UX
2. **Full UX pass**: Not just perf — also build engaging loading and transaction experiences
3. **Contextual tx waits**: Show useful info during transaction confirmation (what the tx does, XP impact, Cardano context) rather than just progress animations
4. **Data-heavy pages priority**: Dashboard, task lists, and credentials are where improvements will be felt most

## Implementation Layers (ordered)

### Layer 1: Quick Wins (config + provider fix)
- Parallelize MeshProvider + AuthProvider dynamic imports
- Add `optimizePackageImports` to next.config for Radix, tiptap, recharts
- Dynamic import framer-motion where used (studio wizard only)

### Layer 2: Server-Side Prefetching
- Convert data-heavy pages to server components where possible
- Use tRPC server-side caller + HydrateClient for prefetching
- Add Suspense boundaries for streaming partial content
- Keep wallet-dependent sections as client component islands

### Layer 3: Loading UX
- Richer skeletons that match actual content layout more closely
- Contextual transaction wait screens showing: what's happening, XP impact, tips
- Better wallet connection flow feedback

## Open Questions

None — all resolved through dialogue.

## Success Criteria

- Measurably faster time-to-interactive on data-heavy pages
- No blank/spinner states longer than necessary
- Transaction waits show useful, contextual information
- Provider waterfall eliminated as a bottleneck
