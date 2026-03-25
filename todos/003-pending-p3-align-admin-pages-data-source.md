---
status: complete
priority: p3
issue_id: "003"
tags: [code-review, architecture, consistency]
dependencies: []
---

# Align all admin pages to source on-chain tasks from useManagerTasks

## Problem Statement

Two other admin pages still read `projectDetail.tasks` (from the endpoint that doesn't populate assets):

1. `admin/project/page.tsx:134` — counts ON_CHAIN tasks for a badge
2. `admin/project/draft-tasks/page.tsx:198-203` — builds `onChainTaskHashes` to exclude published tasks from draft list

Both are currently safe (they only read `taskHash` and counts, not `tokens`), but they create a consistency risk: if the two endpoints ever disagree on which tasks are on-chain, the UI would show conflicting information across pages.

## Findings

- **Agent-Native Reviewer**: These are not broken today, but represent a consistency risk. Recommends migrating to derive from `useManagerTasks` across all admin pages.
- **Agent-Native Reviewer**: Also suggests extracting a shared `useOnChainTasks(projectId)` hook to eliminate the risk entirely.

## Proposed Solutions

### Option A: Migrate both pages to use useManagerTasks
- **Pros**: Single source of truth for on-chain tasks across all admin pages
- **Cons**: Both pages already fetch `useManagerTasks` — just need to use it for on-chain task derivation
- **Effort**: Small (same pattern as PR #15)
- **Risk**: Low

### Option B: Extract a shared useOnChainTasks hook
- **Pros**: Reusable, consistent, single place to maintain dedup logic
- **Cons**: Additional abstraction for 3 consumers
- **Effort**: Medium
- **Risk**: Low

### Option C: Leave as-is
- **Pros**: No change risk; both pages work correctly today
- **Cons**: Consistency risk if endpoints diverge
- **Effort**: None
- **Risk**: Low

## Recommended Action

Option A: Migrate both pages inline. Same pattern as PR #15, small effort.

## Technical Details

- **Affected files**:
  - `src/app/(admin)/admin/project/page.tsx:134`
  - `src/app/(admin)/admin/project/draft-tasks/page.tsx:198-203`
- **Components**: Admin project overview, draft tasks page

## Acceptance Criteria

- [ ] All admin pages derive on-chain task lists from the same data source
- [ ] Draft task filtering still correctly excludes published tasks
- [ ] On-chain task count badge remains accurate

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-25 | Created from PR #15 code review | Consistency improvement, not blocking |

## Resources

- PR: #15
- Related issue: #14
