---
title: "Strip Andamio Template to Single-Course Single-Project App"
date: "2026-03-15"
problem_type: architecture_refactor
severity: medium
component: ["navigation", "layout", "config", "routing", "branding"]
tags: ["next.js", "navigation", "sidebar", "top-nav", "single-purpose-app", "andamio-template"]
time_to_solve: "single session"
symptoms:
  - "Multi-course/project navigation inappropriate for single-purpose app"
  - "Sidebar takes up space unnecessarily for 3 nav items"
  - "Generic Andamio branding instead of Cardano XP identity"
root_cause: "Template designed for general-purpose multi-tenant use; Cardano XP needs focused single-purpose UX"
---

## Problem

Cardano XP was forked from the Andamio app template, which is designed as a general-purpose multi-course, multi-project platform with sidebar navigation for browsing across courses and projects. For a single-purpose dApp focused on one course and one project, this architecture introduced unnecessary complexity and wasted screen real estate. The sidebar navigation pattern, built to accommodate dozens of navigable items, was overkill for the three top-level routes Cardano XP actually needs. The refactor replaced the sidebar with a streamlined top navigation bar, converted multi-item browse pages into direct redirects to the single course and project, and re-branded the UI from generic Andamio template identity to Cardano XP.

## Solution

### Approach

Delete-first: remove the entire sidebar system (6 files, ~700 lines), then replace it with a minimal horizontal nav, redirect listing pages to their single-resource targets, and rewrite all config/copy to reflect a single-purpose "Cardano XP" identity. No API hooks, stores, detail pages, auth flows, or transaction logic were touched.

### What Changed

**Deleted (6 files, ~700 lines):**
- `src/components/layout/app-sidebar.tsx`
- `src/components/layout/mobile-nav.tsx`
- `src/components/layout/sidebar-header.tsx`
- `src/components/layout/sidebar-nav-section.tsx`
- `src/components/layout/sidebar-user-section.tsx`
- `src/config/sidebar.ts`

**Created (3 files):**
- `src/components/layout/app-nav-bar.tsx` — Horizontal top nav
- `src/config/wallet-utils.ts` — `truncateWalletAddress()` extracted from deleted sidebar
- `src/config/cardano-xp.ts` — Route helpers added

**Config rewrites (4 files):** `branding.ts`, `marketing.ts`, `navigation.ts`, `index.ts`
**Layout updates (3 files):** `app-layout.tsx`, `auth-status-bar.tsx`, `studio-layout.tsx`
**Page redirects (3 files, ~600 lines removed):** `course/page.tsx`, `project/page.tsx`, `dashboard/page.tsx`
**Back-link fixes (8 files):** All `/dashboard` references updated
**Teacher → Editor rename (3 files):** Display labels only, API unchanged

**Net: -1,671 lines deleted, +157 lines added (32 files changed)**

### Key Implementation Details

#### 1. Centralized Route Config

All routes derive from a single config object so nothing is hardcoded:

```ts
// src/config/cardano-xp.ts
export const CARDANO_XP = {
  courseId: env.NEXT_PUBLIC_COURSE_ID,
  projectId: env.NEXT_PUBLIC_PROJECT_ID,
  routes: {
    course: `/course/${env.NEXT_PUBLIC_COURSE_ID}`,
    project: `/project/${env.NEXT_PUBLIC_PROJECT_ID}`,
  },
} as const;
```

#### 2. AppNavBar Component

Flat horizontal nav with conditional Studio link for authenticated users:

```tsx
// src/components/layout/app-nav-bar.tsx
export function AppNavBar() {
  const pathname = usePathname();
  const { isAuthenticated } = useAndamioAuth();

  return (
    <nav className="border-b border-border bg-background">
      <div className="flex h-10 items-center gap-1 px-3 sm:px-4">
        <Link href="/" className="mr-4 text-sm font-semibold">
          {BRANDING.name}
        </Link>
        {APP_NAVIGATION.map((item) => (
          <Link key={item.name} href={item.href}
            className={cn("rounded-md px-3 py-1.5 text-xs font-medium",
              isNavItemActive(pathname, item.href)
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50"
            )}>
            {item.name}
          </Link>
        ))}
        {isAuthenticated && (
          <Link href="/studio" className={cn(/* same pattern */)}>Studio</Link>
        )}
      </div>
    </nav>
  );
}
```

#### 3. Redirect Pattern for Listing Pages

Each listing page (~200 lines of grid/card UI) replaced with a single redirect:

```tsx
// src/app/(app)/course/page.tsx
import { redirect } from "next/navigation";
import { CARDANO_XP } from "~/config";

export default function CoursePage() {
  redirect(CARDANO_XP.routes.course);
}
```

Same pattern for `project/page.tsx` and `dashboard/page.tsx`.

#### 4. Flat Navigation Config

```ts
// src/config/navigation.ts
export const APP_NAVIGATION = [
  { name: "Learn", href: CARDANO_XP.routes.course },
  { name: "Contribute", href: CARDANO_XP.routes.project },
  { name: "Credentials", href: "/credentials" },
] as const;
```

### What Was Preserved

- All API hooks (tRPC queries/mutations for courses, projects, credentials, transactions)
- All Zustand stores (wallet, course, project, user state)
- All detail pages (`/course/[id]`, `/project/[id]`, lesson views, module views)
- Auth flow (wallet connect, role detection, session management)
- Transaction logic (on-chain operations, Lucid integration)
- Studio/admin pages (course editing, project management)
- Credential system (minting, viewing, on-chain proof)

## Prevention & Best Practices

### Safe Template Stripping

1. **Map the dependency graph before deleting.** Trace every import of a component before removing it. Remove imports first, then the file.
2. **Create a route map constant first.** Define `CARDANO_XP.routes` before changing any navigation so all consumers follow a single source of truth.
3. **No redirect chains.** Each old route should redirect directly to the final destination. Never chain `/dashboard` → `/` → `/course/[id]`.
4. **Grep checklist before/after:**

```bash
# Before deleting — find all consumers
grep -rn "from.*sidebar\|from.*mobile-nav\|from.*app-sidebar" src/

# After deleting — verify no ghosts
grep -rn '"/dashboard' src/
grep -rn "redirect(\|router\.push(" src/
```

### Display Label vs API Term Pattern

The API uses `Teacher` — the UI shows `Editor`. Keep these cleanly separated:

- **API/type layer:** canonical domain term (never rename)
- **UI layer:** display labels reference a mapping, not raw strings
- Future renames are single-point changes

### Verification Checklist

```
[ ] Route map constant created/updated with all canonical paths
[ ] Every redirect() call verified — no chains, no loops
[ ] npm run build passes with zero errors
[ ] No remaining imports of deleted files (grep confirmed)
[ ] No hardcoded path strings bypassing the route constant
[ ] Auth flows still work (login redirect targets updated)
[ ] Mobile and desktop layouts verified
[ ] API types unchanged — only UI labels remapped
```

## Related Documentation

- [Project Inception](../project-setup/cardano-xp-inception.md) — founding decisions and non-code outputs
- [WHITE_LABEL_GUIDE.md](../../WHITE_LABEL_GUIDE.md) — template customization points (branding, marketing, features)
- [Template Independence Plan](../../plans/2026-03-06-refactor-template-independence-plan.md) — prior work removing structural ties to andamio-app-v2
- [Course Navigation Redesign](../../plans/2026-02-13-course-navigation-redesign.md) — SLT hierarchy and single-course UX model
