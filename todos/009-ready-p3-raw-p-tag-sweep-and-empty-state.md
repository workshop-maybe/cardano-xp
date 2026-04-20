---
status: ready
priority: p3
issue_id: "009"
tags: [code-review, design-system, consistency, pr-50]
dependencies: []
---

# Sweep raw `<p>` tags to AndamioText; use AndamioEmptyState on /xp/activity

## Problem Statement

`AGENTS.md` line 30 says: "Use AndamioText for paragraphs, not raw `<p>` tags." PR #50 introduced six new raw `<p>` tags (in `activity-content.tsx` at lines 99, 106, 212, 224, 236 and `page-content.tsx` at line 85). The rule is drift widely across the codebase already (~122 pre-existing occurrences), so this is a standing inconsistency, not a PR #50-specific miss.

Also in `activity-content.tsx:152-170`, the "No accepted submissions yet" state is a hand-built `<div>` tree rather than the existing `AndamioEmptyState` primitive.

## Findings

- **Project-Standards Reviewer** (P2/P3, 0.62-0.82): All three.

## Proposed Solution

Two separate bits of work, can be done independently:

### 9a: Swap raw `<p>` → AndamioText in PR #50 files (quick win)

Just the six new occurrences. Not the full codebase sweep — that's a bigger task best done when the pattern can be enforced via lint (todo ideas: a minimal eslint custom rule or `scripts/audit-raw-p.sh` in the style of `audit-unsafe-sinks.sh`).

### 9b: Replace empty-state with AndamioEmptyState

```tsx
<AndamioEmptyState
  icon={AchievementIcon}
  title="No accepted submissions yet"
  description={
    <>
      Be the first — give feedback on the current assignment and earn your
      first XP. <Link href={PUBLIC_ROUTES.projects} className="text-primary hover:underline">Open tasks</Link>
    </>
  }
/>
```

### 9c (stretch): Codebase-wide sweep

Only if 9a lands cleanly and the pattern is worth enforcing. Add `scripts/audit-raw-p.sh` to CI.

## Acceptance Criteria

- [ ] No raw `<p>` tags in files added by PR #50.
- [ ] `AndamioEmptyState` used on `/xp/activity` empty state.
- [ ] (Stretch) Codebase-wide sweep + CI check.

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-04-20 | Created from PR #50 review | AGENTS.md rule is not currently enforced anywhere |

## Resources

- PR: #50
- AGENTS.md lines 27-32 (Styling)
- `src/components/andamio/andamio-empty-state.tsx`
