---
title: "Route Path Mismatch After Template Fork"
description: "App forked from Andamio template had ~45 files referencing old /course and /project paths while actual pages lived at /learn and /tasks, causing 404s and test failures. Template-literal paths were missed by initial search."
problem_type: integration-issues
severity: high
module:
  - nextjs-routes
  - test-suite
  - build-config
tags:
  - fork-migration
  - template-literal-paths
  - route-refactoring
  - test-maintenance
  - multi-agent-review
date_solved: "2026-03-17"
---

# Route Path Mismatch After Template Fork

## Problem

Cardano XP was forked from the Andamio app template. The Next.js page directories were renamed to `/learn` and `/tasks`, but `routes.ts`, ~20 components, and ~23 E2E test files still referenced the old template paths `/course` and `/project`. This caused:

- 404 errors on navigation links (course cards, lesson navigation, project cards)
- E2E test failures (navigating to non-existent routes)
- Stale landing page test selectors (UI content had changed)

## Root Cause

The page directories were renamed during the template stripping phase, but the component references were not updated at the same time. Two factors made this worse:

1. **Two string formats**: Double-quoted paths (`"/course"`) and template literals (`` `/course/${id}` ``) require different grep patterns
2. **Dead route config**: `routes.ts` defines typed route constants (`PUBLIC_ROUTES`, `STUDIO_ROUTES`) but no component imports them — every component hardcodes paths as string literals

## Solution

### Phase 1: Initial migration (caught double-quoted strings)

Updated `src/config/routes.ts` PUBLIC_ROUTES and ROUTE_METADATA, plus 10 dashboard/landing components and 16 E2E test files that used `"/course"` and `"/project"` string literals.

### Phase 2: Review-caught fixes (template literals)

A 6-agent code review (TypeScript, Security, Architecture, Pattern Recognition, Simplicity, Learnings) found **13 additional template-literal paths** missed by the initial pass:

**`/course/${id}` to `/learn/${id}` (9 references):**
- `src/components/courses/course-card.tsx`
- `src/components/courses/course-module-card.tsx`
- `src/components/courses/lesson-navigation.tsx` (3 links: prev, next, assignment)
- `src/components/auth/require-course-access.tsx`
- `src/app/(app)/credentials/page.tsx`
- `src/app/(studio)/studio/course/[coursenft]/page.tsx`

**`/project/${id}` to `/tasks/${id}` (4 references):**
- `src/components/projects/project-card.tsx`
- `src/components/auth/require-project-access.tsx`
- `src/app/(studio)/studio/project/[projectid]/page.tsx`
- `src/app/(studio)/studio/project/[projectid]/draft-tasks/page.tsx`

### Phase 3: Test fixes

- Landing page selectors: h1 changed from "Learn" to "Build new systems.", buttons changed
- Multi-role test: JWTs get cleared by app hydration; switched assertion to `andamio-user` localStorage
- tsconfig.json: excluded `e2e/reports` and `e2e/test-results` from type checking

## Key Lesson: Search Both String Formats

```bash
# Double-quoted strings
grep -r '"/course' src/ --include="*.tsx"

# Template literals (ALSO REQUIRED)
grep -r '`/course/' src/ --include="*.tsx"
```

The initial search only ran the first pattern. The 13 missed references were all template literals with `${interpolation}`.

## Prevention

1. **Search both patterns** when doing route migrations — double-quoted strings AND backtick template literals
2. **Multi-agent code review** as a safety net catches what grep misses
3. **Consider centralizing**: components should import from `routes.ts` or `CARDANO_XP.routes` instead of hardcoding paths — this was flagged but not yet implemented

## Verification

- `npm run compile` passes (TypeScript clean)
- 357 E2E tests pass, 0 failures
- All navigation links resolve to correct pages

## Related Documentation

- [Strip Template to Single-Course App](../architecture/strip-template-to-single-course-app.md) — original route restructuring
- [Template to Standalone Product Identity](../project-setup/template-to-standalone-product-identity.md) — fork independence strategy
- [Access Token Page Consolidation](../content-architecture/access-token-page-diataxis-consolidation.md) — prior route consolidation example

## Files Changed

45 files across src/config, src/components, src/app, e2e/tests, tsconfig.json
