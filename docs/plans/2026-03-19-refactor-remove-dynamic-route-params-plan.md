---
title: Remove dynamic course/project route params
type: refactor
status: completed
date: 2026-03-19
---

# Remove dynamic course/project route params

## Overview

Strip all dynamic `[coursenft]` and `[projectid]` URL segments from studio routes. This is a single-course, single-project app — every page should read IDs from `CARDANO_XP` config, not URL params. Also remove browse/list pages and create flows inherited from the multi-tenant Andamio template.

## Problem Statement

The studio section still uses multi-tenant URL patterns (`/studio/course/[coursenft]/...`, `/studio/project/[projectid]/...`) even though the app only serves one course and one project. The sidebar lists multiple courses/projects, the hub page has "Create Course" and "Create Project" buttons, and ~20 components pass dynamic IDs to route functions. This is confusing for users and unnecessary complexity.

## Proposed Solution

1. Convert all `STUDIO_ROUTES` functions to static strings
2. Move page files out of `[coursenft]/` and `[projectid]/` directories
3. Replace all `useParams()` reads with `CARDANO_XP` config imports
4. Simplify the studio sidebar to a static two-item nav
5. Remove create flows and browse pages
6. Point all treasury links to `/admin/project`

### New URL Structure

| Current | New |
|---------|-----|
| `/studio` (hub with create flows) | `/studio` → redirect to `/studio/course` |
| `/studio/course` (browse list) | `/studio/course` (single course editor) |
| `/studio/course/[coursenft]` | `/studio/course` |
| `/studio/course/[coursenft]/[modulecode]` | `/studio/course/[modulecode]` |
| `/studio/course/[coursenft]/teacher` | `/studio/course/teacher` |
| `/studio/course/[coursenft]/manage-learners` | `/studio/course/manage-learners` |
| `/studio/project` (browse list) | `/studio/project` (single project dashboard) |
| `/studio/project/[projectid]` | `/studio/project` |
| `/studio/project/[projectid]/draft-tasks` | `/studio/project/draft-tasks` |
| `/studio/project/[projectid]/draft-tasks/new` | `/studio/project/draft-tasks/new` |
| `/studio/project/[projectid]/draft-tasks/[taskindex]` | `/studio/project/draft-tasks/[taskindex]` |
| `/studio/project/[projectid]/commitments` | `/studio/project/commitments` |
| `/studio/project/[projectid]/manage-contributors` | `/studio/project/manage-contributors` |
| `/studio/project/[projectid]/manage-treasury` | **removed** — use `/admin/project` |

### Key Decisions

- **Treasury**: `/admin/project` is the single treasury management page. Remove the studio treasury route. All `STUDIO_ROUTES.treasury()` calls → `ADMIN_ROUTES.project`.
- **Studio hub**: `/studio` redirects to `/studio/course`. No landing page needed.
- **Sidebar**: Replace dynamic course/project list with static nav: "Course" and "Project" links. Remove search, create buttons, and `StudioContext`.
- **Create flows**: Remove entirely — `CreateCoursePanel`, `CreateProjectPanel`, `create-course-dialog.tsx`, `create-project.tsx`, `studio-context.tsx`. The single course and project are pre-provisioned via Andamio.
- **`useCourseParams` hook**: Delete. Consumers import `CARDANO_XP.courseId` directly and read `modulecode` from `useParams()` where needed.
- **`AUTH_ROUTES.contributor`**: Out of scope — keep dynamic for now.
- **No old URL redirects**: Pre-launch project, no external users.

## Acceptance Criteria

- [x] No `[coursenft]` or `[projectid]` directory segments in `src/app/`
- [x] `STUDIO_ROUTES` in `routes.ts` are all static strings (except `moduleWizard` and `editTask` which retain their single param)
- [x] No page component reads `params.coursenft` or `params.projectid`
- [x] No browse/list pages for courses or projects
- [x] No "Create Course" or "Create Project" UI
- [x] Studio sidebar shows static nav with Course and Project links
- [x] `/studio` redirects to `/studio/course`
- [x] All treasury links point to `/admin/project`
- [x] `tsc --noEmit` passes
- [x] `next build` succeeds

## Implementation Phases

### Phase 1: Update routes.ts (creates compile errors as a checklist)

**`src/config/routes.ts`**

```ts
export const STUDIO_ROUTES = {
  hub: "/studio",
  courseEditor: "/studio/course",
  moduleWizard: (moduleCode: string) => `/studio/course/${moduleCode}`,
  teacherDashboard: "/studio/course/teacher",
  manageLearners: "/studio/course/manage-learners",
  projectDashboard: "/studio/project",
  draftTasks: "/studio/project/draft-tasks",
  newTask: "/studio/project/draft-tasks/new",
  editTask: (taskIndex: number) => `/studio/project/draft-tasks/${taskIndex}`,
  commitments: "/studio/project/commitments",
  manageContributors: "/studio/project/manage-contributors",
} as const;
```

Remove: `courses`, `projects`, `treasury`, `projectManager`.

Run `tsc --noEmit` to get the full list of call sites that need updating.

### Phase 2: Restructure filesystem

Move pages out of dynamic directories:

```
# Course pages
mv src/app/(studio)/studio/course/[coursenft]/page.tsx → src/app/(studio)/studio/course/page.tsx
mv src/app/(studio)/studio/course/[coursenft]/teacher/ → src/app/(studio)/studio/course/teacher/
mv src/app/(studio)/studio/course/[coursenft]/manage-learners/ → src/app/(studio)/studio/course/manage-learners/
mv src/app/(studio)/studio/course/[coursenft]/[modulecode]/ → src/app/(studio)/studio/course/[modulecode]/
mv src/app/(studio)/studio/course/[coursenft]/error.tsx → src/app/(studio)/studio/course/error.tsx
mv src/app/(studio)/studio/course/[coursenft]/loading.tsx → src/app/(studio)/studio/course/loading.tsx

# Project pages
mv src/app/(studio)/studio/project/[projectid]/page.tsx → src/app/(studio)/studio/project/page.tsx
mv src/app/(studio)/studio/project/[projectid]/draft-tasks/ → src/app/(studio)/studio/project/draft-tasks/
mv src/app/(studio)/studio/project/[projectid]/commitments/ → src/app/(studio)/studio/project/commitments/
mv src/app/(studio)/studio/project/[projectid]/manage-contributors/ → src/app/(studio)/studio/project/manage-contributors/
mv src/app/(studio)/studio/project/[projectid]/loading.tsx → src/app/(studio)/studio/project/loading.tsx

# Delete
rm -rf src/app/(studio)/studio/course/[coursenft]/
rm -rf src/app/(studio)/studio/project/[projectid]/
```

**Important**: After moving, verify `/studio/course/teacher` and `/studio/course/manage-learners` are static folders (Next.js resolves static routes before `[modulecode]` dynamic segments — this is correct behavior).

### Phase 3: Replace params reads with CARDANO_XP config

**Course pages** (replace `params.coursenft` → `CARDANO_XP.courseId`):
- `src/app/(studio)/studio/course/page.tsx`
- `src/app/(studio)/studio/course/[modulecode]/page.tsx`
- `src/app/(studio)/studio/course/teacher/page.tsx`
- `src/app/(studio)/studio/course/manage-learners/page.tsx`

**Project pages** (replace `params.projectid` → `CARDANO_XP.projectId`):
- `src/app/(studio)/studio/project/page.tsx`
- `src/app/(studio)/studio/project/draft-tasks/page.tsx`
- `src/app/(studio)/studio/project/draft-tasks/new/page.tsx`
- `src/app/(studio)/studio/project/draft-tasks/[taskindex]/page.tsx`
- `src/app/(studio)/studio/project/commitments/page.tsx`
- `src/app/(studio)/studio/project/manage-contributors/page.tsx`

**Delete hook**: `src/hooks/use-course-params.ts` — replace all imports with direct `CARDANO_XP.courseId` + `useParams()` for modulecode where needed.

### Phase 4: Simplify studio layout and hub

**`src/app/(studio)/studio/layout.tsx`**:
- Remove `useTeacherCourses()`, `useOwnerProjects()`, `useManagerProjects()` fetches
- Remove searchable course/project list rendering
- Remove `StudioContext` import and create buttons
- Replace sidebar content with static nav: two links to `/studio/course` and `/studio/project`, plus `/admin/project` for treasury
- Update `isWizardMode` regex: `/\/studio\/course\/([^/]+)/` excluding `teacher` and `manage-learners`
- Remove `selectedCourseId` / `selectedProjectId` URL parsing

**`src/app/(studio)/studio/page.tsx`**:
- Replace entire page with a redirect: `redirect(STUDIO_ROUTES.courseEditor)`

### Phase 5: Update component call sites

**Dashboard components** (change route function calls to static strings):
- `src/components/dashboard/pending-assessments-summary.tsx` — `STUDIO_ROUTES.projectDashboard`
- `src/components/dashboard/managing-projects-summary.tsx` — `STUDIO_ROUTES.projectDashboard`
- `src/components/dashboard/pending-reviews-summary.tsx` — `STUDIO_ROUTES.teacherDashboard`
- `src/components/dashboard/owned-courses-summary.tsx` — `STUDIO_ROUTES.courseEditor`
- `src/components/dashboard/welcome-hero.tsx` — remove `STUDIO_ROUTES.courses` link
- `src/components/dashboard/contributing-projects-summary.tsx` — keep `AUTH_ROUTES.contributor` as-is (out of scope)

**Studio components** (update route references):
- `src/components/layout/studio-header.tsx` — fix breadcrumb segment indices (shift by 1)
- `src/components/studio/studio-module-card.tsx` — `STUDIO_ROUTES.moduleWizard(moduleCode)` (1 param instead of 2)
- `src/components/studio/wizard/steps/step-review.tsx` — `STUDIO_ROUTES.courseEditor`
- `src/components/studio/wizard/steps/step-credential.tsx` — `STUDIO_ROUTES.moduleWizard(newCode)`
- `src/components/courses/course-breadcrumb.tsx` — remove `STUDIO_ROUTES.courses` reference
- `src/components/auth/require-project-access.tsx` — `router.push(STUDIO_ROUTES.projectDashboard)`
- `src/components/auth/require-course-access.tsx` — `router.push(STUDIO_ROUTES.courseEditor)`

**Evaluate for removal** (may be multi-tenant artifacts):
- `src/components/courses/course-table-view.tsx` — lists multiple courses with studio links
- `src/components/courses/course-ui.tsx` — links to dynamic courseEditor
- `src/components/courses/create-course-dialog.tsx` — create course flow
- `src/components/tx/create-project.tsx` — create project flow

### Phase 6: Cleanup

- Delete `src/hooks/use-course-params.ts`
- Delete `src/app/(app)/task/[taskId]/` (orphan route — only has loading.tsx, no page.tsx)
- Delete create flow components if confirmed unused
- Remove `STUDIO_ROUTES.treasury` references — all point to `ADMIN_ROUTES.project`
- Grep both `'"/studio'` and `` '`/studio' `` for any hardcoded paths (lesson from `docs/solutions/integration-issues/route-path-mismatch-forked-template-migration.md`)

### Verification

```bash
# No dynamic course/project segments remain
find src/app -type d -name '[coursenft]' -o -name '[projectid]'

# No params reads for removed segments
grep -r 'params.coursenft\|params.projectid' src/ --include="*.tsx"

# No hardcoded old-style paths (check both string formats)
grep -r '"/studio/course/' src/ --include="*.tsx"
grep -r '`/studio/course/' src/ --include="*.tsx"
grep -r '"/studio/project/' src/ --include="*.tsx"
grep -r '`/studio/project/' src/ --include="*.tsx"

# Build passes
npm run build
```

## Sources

- Prior refactor: `docs/solutions/architecture/strip-template-to-single-course-app.md`
- Route mismatch lesson: `docs/solutions/integration-issues/route-path-mismatch-forked-template-migration.md`
- Config: `src/config/cardano-xp.ts`, `src/config/routes.ts`
