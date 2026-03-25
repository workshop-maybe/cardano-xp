---
status: complete
priority: p3
issue_id: "001"
tags: [code-review, quality, simplicity]
dependencies: []
---

# Remove defensive console.warn for empty tokens in removal builder

## Problem Statement

The `console.warn` block added in PR #15 (lines 225-232 of `treasury/page.tsx`) fires for **all** ON_CHAIN tasks without tokens, including tasks that legitimately have no XP rewards. This creates false positive warnings in the console for zero-token tasks. The warning guards against a data source regression that the same PR already fixes at the source.

## Findings

- **Code Simplicity Reviewer**: The warning fires on valid zero-token tasks (false positives). The actual protection is the data source swap, not a downstream runtime warning.
- **TypeScript Reviewer**: Warning placement is fine in practice since it only fires for anomalous data. The conditional language ("may cause") is appropriate.
- **Agent-Native Reviewer**: Called it "well-placed" as a regression guard.

Reviewers disagree — this is a judgment call.

## Proposed Solutions

### Option A: Remove the console.warn entirely
- **Pros**: No false positives, 8 fewer lines, simpler code
- **Cons**: Loses early warning if data source regresses
- **Effort**: Small (delete 8 lines)
- **Risk**: Low

### Option B: Keep as-is
- **Pros**: Early warning catches future regressions
- **Cons**: False positives on legitimate zero-token tasks
- **Effort**: None
- **Risk**: None

### Option C: Tighten the condition
- **Pros**: Only warns when tokens are truly expected (e.g., if task was created with XP)
- **Cons**: Requires additional data to know if tokens were expected; over-engineering for a guard
- **Effort**: Medium
- **Risk**: Low

## Recommended Action

Option A: Remove. The data source swap is the real guard.

## Technical Details

- **Affected files**: `src/app/(admin)/admin/project/treasury/page.tsx` lines 225-232
- **Components**: Treasury page removal builder

## Acceptance Criteria

- [ ] No false positive console warnings for tasks without XP rewards
- [ ] Task deletion still works for both token and non-token tasks

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-25 | Created from PR #15 code review | Reviewers split on value of defensive warning |

## Resources

- PR: #15
- Related issue: #14
