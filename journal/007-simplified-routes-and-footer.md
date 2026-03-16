# 007 — Simplified Routes and Shared Footer

**Date:** 2026-03-16

## What happened

Streamlined the public-facing routes and unified the footer across all pages. Since Cardano XP has exactly one course and one project, there's no reason to expose IDs in URLs. The app now feels like a single-purpose tool, not a multi-tenant platform.

### Route simplification

| Before | After |
|--------|-------|
| `/project/{projectId}` | `/tasks` |
| `/project/{projectId}/{taskHash}` | `/tasks/{taskHash}` |
| `/course/{courseId}` | `/learn` |
| `/course/{courseId}/{moduleCode}` | `/learn/{moduleCode}` |
| `/course/{courseId}/{moduleCode}/{index}` | `/learn/{moduleCode}/{index}` |
| `/course/{courseId}/{moduleCode}/assignment` | `/learn/{moduleCode}/assignment` |

The course and project IDs now come from `CARDANO_XP.courseId` and `CARDANO_XP.projectId` config — users never see them.

### Shared footer

Created `AppFooter` component (`src/components/layout/app-footer.tsx`) and added it to `AppLayout`. Every app page now shows:

- Network (preprod/mainnet)
- Status (prototype)
- Version (0.0.1)
- Agent status (ready for feedback)
- "built on cardano"
- "powered by andamio" (link)

Border visibility fix: changed from `border-border` (invisible in dark mode) to `border-muted-foreground/30`.

### Prerequisites → Onboarding

Removed the word "Prerequisites" from the UI. Instead of gatekeeping language, the tasks page now shows:

> **Get Started as a Feedback Provider**
> Complete a quick onboarding to start earning XP

Same functionality, friendlier framing.

## What changed

**New files:**
- `src/components/layout/app-footer.tsx` — shared footer component
- `src/app/(app)/tasks/page.tsx` — public tasks list
- `src/app/(app)/tasks/[taskhash]/page.tsx` — task detail
- `src/app/(app)/learn/page.tsx` — course overview
- `src/app/(app)/learn/[modulecode]/page.tsx` — module detail
- `src/app/(app)/learn/[modulecode]/[moduleindex]/page.tsx` — lesson
- `src/app/(app)/learn/[modulecode]/assignment/page.tsx` — assignment
- `src/components/courses/learn-module-card.tsx` — module card for /learn
- `src/components/courses/learn-lesson-navigation.tsx` — lesson nav for /learn
- `src/hooks/use-learn-params.ts` — params hook using config course ID

**Deleted:**
- `src/app/(app)/project/` — entire route tree
- `src/app/(app)/course/` — entire route tree

**Modified:**
- `src/config/cardano-xp.ts` — routes now `/tasks` and `/learn`
- `src/components/layout/app-layout.tsx` — includes AppFooter
- `src/components/courses/slt-lesson-table.tsx` — added basePath prop

## Decisions

| Decision | Why |
|----------|-----|
| Keep Studio routes with IDs | Managers may work with multiple projects — generic routes make sense there |
| Use "feedback provider" language | Aligns with XP's positioning as a feedback tool, not a generic contribution platform |
| Footer border at 30% opacity | Visible enough without being distracting; full opacity was too heavy |
| Onboarding CTA links to /learn | Clear path forward rather than listing modules inline |

## What's next

- Journal discipline complete for this session
- Treasury and contributor dashboard could use similar route simplification
- "My XP" page at /credentials could become a personalized dashboard
