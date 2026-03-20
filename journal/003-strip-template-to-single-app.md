# 003 — Strip Template to Single-Course, Single-Project App

**Date:** 2026-03-15

## What happened

Stripped the Andamio app template down from a multi-course, multi-project platform to a focused single-purpose Cardano XP app. This was the biggest structural refactor so far: 32 files changed, net -1,514 lines.

### Sidebar removed, top nav added

Deleted the entire sidebar system (6 files, ~700 lines): `app-sidebar.tsx`, `mobile-nav.tsx`, `sidebar-header.tsx`, `sidebar-nav-section.tsx`, `sidebar-user-section.tsx`, and `config/sidebar.ts`. Replaced with a single `AppNavBar` component — a horizontal bar showing **Learn | Contribute | Credentials** (plus **Studio** for authenticated users). Three items fit on mobile natively, so no hamburger menu needed.

### Browse pages became redirects

The course listing page (~136 lines), project catalog page (~327 lines), and dashboard page (~154 lines) were each replaced with a 3-line server component that redirects to the single resource:

```tsx
import { redirect } from "next/navigation";
import { CARDANO_XP } from "~/config";
export default function CoursePage() { redirect(CARDANO_XP.routes.course); }
```

### Centralized route config

Added a `routes` object to `CARDANO_XP` config so no component hardcodes paths:

```ts
export const CARDANO_XP = {
  courseId: env.NEXT_PUBLIC_COURSE_ID,
  projectId: env.NEXT_PUBLIC_PROJECT_ID,
  routes: {
    course: `/course/${env.NEXT_PUBLIC_COURSE_ID}`,
    project: `/project/${env.NEXT_PUBLIC_PROJECT_ID}`,
  },
} as const;
```

### Branding and copy

- "Andamio App Template" rebranded to "Cardano XP" across `branding.ts` and `marketing.ts`
- Landing hero CTAs updated: Browse → Learn, Launch → Contribute
- "Welcome to Andamio" → "Welcome to Cardano XP" in onboarding flow
- Andamio onboarding links added to footer for people who want to build their own

### Dashboard links rewired

All `router.push("/dashboard")` and `href="/dashboard"` calls across 8 files now point to `CARDANO_XP.routes.course` or `/`. "Back to Projects" → "Back to Home". "Browse Courses" → "Start Learning".

### Teacher → Editor (UI labels only)

Renamed "Teachers" to "Editors" in `course-teachers-card.tsx`, added `EditorIcon` alias in `entity-icons.ts`, and updated the breadcrumb label. API types stay as `Teacher` — this is display-only.

### What stayed untouched

All API hooks, Zustand stores, course/project detail pages, auth system, transaction components, studio pages, and credential system.

## Decisions

- No hamburger menu — 3 nav items fit on any screen width
- Dashboard redirects to the course (not a dead end) since all onboarding now flows from the landing page
- `truncateWalletAddress()` moved to `config/wallet-utils.ts` rather than deleted, in case anything needs it later
- Studio link shown conditionally in the nav bar based on auth state, not in the config array
- URL paths for teacher routes kept unchanged (`/studio/course/[id]/teacher/`) — changing paths is higher risk for low reward

## What's next

- Verify with `npm run dev` once dependencies are installed
- Deploy to preprod and test full onboarding flow from landing page
- Create the actual course content ("How to Use Cardano XP")
- Load first feedback tasks into the project
- Update landing page visuals for Cardano XP (logo, OG image)

## Artifacts

- `docs/solutions/architecture/strip-template-to-single-course-app.md` — full solution documentation with prevention checklist
