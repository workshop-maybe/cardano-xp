# Course Navigation Redesign

## Problem

The course interface has three UX issues:

1. **"Start First Module" CTA skips SLTs and lessons**, sending users directly to the assignment page
2. **Lessons don't look clickable** in the module table and lack inter-lesson navigation
3. **SLTs are secondary** to lessons visually, despite being the primary learning structure (backward design)

## Design Principles

- **SLTs are the primary hierarchy** — lessons are optional supporting material
- **Clear path with flexibility** — students see a clear SLT-first flow but can skip to the assessment at any time
- **No gating** — all modules are accessible regardless of order or enrollment
- **Wallet connection is deferred** — only prompted at assignment submission, all content is publicly browsable

## Changes

### 1. Module Page: SLT Accordion

Replace the current table (`slt-lesson-table.tsx`) with an accordion list:

- Each SLT is a collapsible row showing index, learning target text, and on-chain verification status
- Expanding an SLT reveals its lesson (if one exists) as a compact card with title, description snippet, media badges, and "Open Lesson" button
- SLTs without lessons show "(no lesson available)" when expanded, or don't expand
- Assignment CTA card stays at the bottom, always accessible
- Uses shadcn `Accordion` component

### 2. Course Overview: Simplified Entry

Remove the "Start First Module" CTA from `user-course-status.tsx`. Simplify the progress section copy:

- **Not enrolled** (regardless of auth state): "Click on any module to get started"
- **Enrolled, in progress**: Progress bar (X of Y modules complete)
- **Completed**: "Course Complete!" with credential link

No locked modules. No wallet prompts on the overview. All module cards link to the module page.

### 3. Lesson Page: Prev/Next Navigation

Add a `LessonNavigation` component at the bottom of the lesson page (`[moduleindex]/page.tsx`):

- Prev/next buttons cycle through SLTs that have lessons within the same module
- Each button shows the destination lesson title as a subtitle
- First lesson: no previous button
- Last lesson: "Next" becomes "Go to Assignment"
- Navigation data comes from the module's SLT list (already available via course data hooks)

## Implementation Scope

**Files to modify** (~3):
- `src/components/courses/slt-lesson-table.tsx` — replace with SLT accordion
- `src/components/learner/user-course-status.tsx` — simplify copy, remove "Start First Module" CTA
- `src/app/(app)/course/[coursenft]/[modulecode]/[moduleindex]/page.tsx` — add prev/next navigation

**Files to create** (~1):
- `src/components/courses/lesson-navigation.tsx` — prev/next bar component

**No changes to**:
- Route structure
- Assignment page
- Course module cards
- Data hooks or API calls

All frontend-only. No new API calls or data models.
