---
problem_type: architecture
module: Admin routes (formerly Studio), layout, page components
severity: medium
date_solved: 2026-03-19
updated: 2026-03-19
tags:
  - route-migration
  - template-fork
  - single-tenant
  - admin
  - next-js
---

# Remove Dynamic Route Parameters from Single-Tenant App

## Problem

The Cardano XP app was forked from the Andamio app template, a multi-tenant platform supporting many courses and projects. The template used dynamic route segments (`[coursenft]`, `[projectid]`) throughout the studio URL tree. Since Cardano XP serves exactly one course and one project, these dynamic parameters were unnecessary complexity:

- Every link threaded courseId/projectId through route builder functions
- The studio layout fetched lists of courses and projects to populate a sidebar picker
- A `StudioContext` provider managed create-mode state for switching between courses/projects
- Breadcrumbs parsed URL segments to extract IDs that never varied

## Root Cause

Template-to-product impedance mismatch. The fork preserved multi-tenant URL patterns in a single-tenant app because the initial template stripping (journal 003) deliberately deferred studio route simplification: "changing paths is higher risk for low reward." As the app matured, the complexity became a real cost.

## Solution

### 1. Flatten routes.ts

Converted all `STUDIO_ROUTES` from functions to static strings. Only `moduleWizard(moduleCode)` and `editTask(taskIndex)` remain as functions since those represent genuine runtime variability.

```ts
// BEFORE
courseEditor: (courseId: string) => `/studio/course/${courseId}`,
projectDashboard: (projectId: string) => `/studio/project/${projectId}`,
treasury: (projectId: string) => `/studio/project/${projectId}/manage-treasury`,

// AFTER
courseEditor: "/studio/course",
projectDashboard: "/studio/project",
// treasury moved to ADMIN_ROUTES.project: "/admin/project"
```

Running `tsc --noEmit` after this step produces errors at every call site that passes arguments to now-static routes — a complete checklist.

### 2. Restructure filesystem

Moved all page files out of `[coursenft]/` and `[projectid]/` directories up one level:

```
src/app/(studio)/studio/course/[coursenft]/page.tsx → course/page.tsx
src/app/(studio)/studio/course/[coursenft]/teacher/ → course/teacher/
src/app/(studio)/studio/course/[coursenft]/[modulecode]/ → course/[modulecode]/
src/app/(studio)/studio/project/[projectid]/page.tsx → project/page.tsx
src/app/(studio)/studio/project/[projectid]/draft-tasks/ → project/draft-tasks/
```

Deleted `manage-treasury/` (replaced by `/admin/project`).

### 3. Replace params with config

Every page that read `params.coursenft` or `params.projectid` now reads from `CARDANO_XP`:

```ts
// BEFORE
const params = useParams();
const courseId = params.coursenft as string;

// AFTER
import { CARDANO_XP } from "~/config/cardano-xp";
const courseId = CARDANO_XP.courseId;
```

### 4. Simplify studio layout

Replaced a 470-line layout (data-fetching sidebar with search, course/project lists, create buttons, `StudioProvider`) with a 115-line layout containing a static 3-link nav: Course, Project, Treasury.

### 5. Replace hub page with redirect

The 645-line studio hub (setup wizard, create flows, stats) became a 3-line redirect to `/studio/course`.

### 6. Update ~20 component call sites

Mechanical changes: `STUDIO_ROUTES.courseEditor(courseId)` → `STUDIO_ROUTES.courseEditor`, etc.

### 7. Fix breadcrumb segment indices

With `[coursenft]` removed, URL segment indices shifted by one. `/studio/course/teacher` has `segments[2] = "teacher"` instead of `segments[3]`.

## Gotchas

1. **Route group conflict**: `src/app/(app)/studio/project/page.tsx` existed as a redirect. With `/studio/project` now a real page in `(studio)`, Next.js errored: "You cannot have two parallel pages that resolve to the same path." Fix: delete the old redirect.

2. **Breadcrumb off-by-one**: The breadcrumb generator used raw index access (`segments[3]`). Removing one dynamic segment shifted all indices. Easy to miss since wizard pages override breadcrumbs via `useStudioHeader`.

3. **Duplicate imports from parallel editing**: When a subagent added `CARDANO_XP` imports to files that already had them, TypeScript caught the duplicates at build time.

4. **Duplicate UI blocks**: A copy-paste "Teaching Team" section appeared twice in the course editor's Teacher tab. Found during code review, not related to the route refactor but fixed alongside it.

## Verification

```bash
# No dynamic segments remain
find src/app -type d -name '[coursenft]' -o -name '[projectid]'

# No stale param reads
grep -r 'params.coursenft\|params.projectid' src/ --include="*.tsx"

# No old route references (both string formats)
grep -r '"/studio/course/' src/ --include="*.tsx"
grep -r '`/studio/course/' src/ --include="*.tsx"

# No references to deleted code
grep -r 'use-course-params\|StudioProvider\|useStudioContext' src/

# TypeScript and build pass
npx tsc --noEmit
npm run build
```

## Prevention

### Fork Audit Protocol

Before writing feature code in a forked template:
1. List all `page.tsx` files to get the route tree
2. Search for every path segment across all `.ts`/`.tsx` files
3. Document mismatches between template semantics (multi-tenant) and target semantics (single-tenant)
4. Centralize all path references into `routes.ts` BEFORE renaming anything

### Two-Pass Search Discipline

Route strings appear in two syntactic forms. Always run both:
- Quoted: `"/course"`, `'/project'`
- Template literals: `` `/course/${id}` ``

A single grep misses one form. The prior migration missed 13 template-literal references.

### Reliable Sequence

1. Wire every component to import from `routes.ts` (no path changes yet)
2. Rename paths in `routes.ts` and filesystem together
3. Compile — errors point directly at import sites

## Follow-Up: Studio → Admin Rename

After removing dynamic params, a second pass renamed all `/studio` routes to `/admin`:

- `STUDIO_ROUTES` merged into `ADMIN_ROUTES` — single route object
- Filesystem moved from `src/app/(studio)/studio/` to `src/app/(admin)/admin/`
- "Studio" removed from public top nav entirely
- Treasury moved from `/admin/project` to `/admin/project/treasury`
- All user-facing "Studio" labels updated to "Admin"

**Gotcha**: Internal component names (`StudioHeader`, `StudioLayout`, `StudioEditorPane`) were intentionally left as-is — they're internal identifiers, not user-facing. Renaming them is a separate, lower-priority refactor.

**Gotcha**: The deprecated `STUDIO_ROUTES` alias must be removed from `routes.ts` AND `config/index.ts` — easy to miss the barrel re-export.

## Stats

- Phase 1 (dynamic params): 42 files, ~1,600 insertions, ~7,900 deletions
- Phase 2 (studio→admin): 40 files, route rename + filesystem move

## Related

- [Strip template to single-course app](strip-template-to-single-course-app.md) — the public-side route simplification this continues
- [Route path mismatch after template fork](../integration-issues/route-path-mismatch-forked-template-migration.md) — the two-format grep lesson
- [Template to standalone product identity](../project-setup/template-to-standalone-product-identity.md) — branding/identity separation
- Plan: `docs/plans/2026-03-19-refactor-remove-dynamic-route-params-plan.md`
