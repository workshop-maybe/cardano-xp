# 012 — XP Token Mint, Route Migration, E2E Testing

**Date:** 2026-03-17
**Tags:** xp-token, minting, preprod, routes, testing, e2e, code-review, template-fork

## What happened

Three major milestones in one session: minted 100k XP tokens on preprod, migrated all routes from template paths to app-specific URLs, and got the full E2E test suite passing at 357/357.

### XP Token Mint

Fixed the minting script's tx fee calculation — it was missing `--witness-override 4` for the 3-of-3 multisig + payment key. Minted 100,000 XP tokens on preprod. Policy ID: `6281b1ac8e6e76541500c6d821c35d08ea759d0aea066471a2e18b89`. CIP-25 metadata and IPFS image confirmed working. Updated `.env` with real policy ID.

### Route Migration

This app was forked from the Andamio template but it's never going back — it's its own thing now. The Next.js pages already lived at `/learn` and `/tasks`, but ~45 files still referenced the template's `/course` and `/project` paths.

First pass caught double-quoted string paths. Then a 6-agent code review (TypeScript, Security, Architecture, Pattern Recognition, Simplicity, Learnings) found 13 more template-literal paths like `` `/course/${id}` `` that the initial grep missed. Fixed all of them.

Also fixed: landing page test selectors, multi-role test JWT assertion (hydration clears JWTs), tsconfig excluding Playwright artifacts from type checking.

### XP Token Logo

Added the XP token logo (blue circle with "XP" text) to the wallet/treasury page header.

## Key decisions

- **Routes are `/learn` and `/tasks`** — more intuitive for users than generic `/course` and `/project`. Studio routes keep `/studio/course` and `/studio/project` since they describe admin concepts.
- **Template literals need separate grep** — `"/course"` and `` `/course/${id}` `` are different search patterns. Multi-agent review catches what grep alone misses.
- **`routes.ts` is dead code** — all 5 reviewers flagged that the typed route constants are exported but never imported by any component. Components hardcode paths. This is tech debt to address later.

### Route Centralization (tech debt)

All 5 reviewers flagged that `routes.ts` defined typed route constants that no component imported. Fixed: 52 components now import `PUBLIC_ROUTES`, `AUTH_ROUTES`, or `STUDIO_ROUTES` from `routes.ts`. Deleted dead code (`ROUTE_METADATA`, utility functions). `CARDANO_XP.routes` derives from `PUBLIC_ROUTES`.

A second 4-agent review then caught that route builder functions generated URLs with `courseId`/`projectId` segments that don't exist in the filesystem. Fixed the signatures to match reality: `module(moduleCode)`, `lesson(moduleCode, index)`, `task(taskHash)`.

## What's next

- Continue with testing on preprod now that XP tokens are minted
- API types regenerated for gateway v2.1.0 — ready for new features

## Commits

- `e2cea3d` — fix tx fee calculation by setting witness-override to 4
- `7dba9fa` — migrate routes from template paths to app-specific URLs
- `36d44df` — add solution doc and journal entry
- `f41aade` — wire all components to import from routes.ts
- `d33b555` — fix route builders to match actual filesystem structure
