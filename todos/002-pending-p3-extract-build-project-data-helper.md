---
status: complete
priority: p3
issue_id: "002"
tags: [code-review, quality, duplication]
dependencies: []
---

# Extract shared buildProjectData helper to reduce duplication

## Problem Statement

The `tasksToAdd` and `tasksToRemove` mapping blocks in `treasury/page.tsx` share identical `ProjectData` construction logic: expiration normalization, hex-encoding of asset names, and native asset tuple building. This is ~25 lines duplicated across both blocks. If the hex-encoding logic changes, it needs to change in two places.

## Findings

- **TypeScript Reviewer**: Both blocks produce the same `ProjectData` type with identical logic. A `buildProjectData(task: Task): ProjectData` helper would reduce drift risk.
- **Code Simplicity Reviewer**: Did not flag this — the duplication is immediately adjacent and readable.

## Proposed Solutions

### Option A: Extract a `buildProjectData` helper function
- **Pros**: Single place to maintain encoding/normalization logic; reduces future drift
- **Cons**: Adds indirection for a function used only twice in the same file
- **Effort**: Small
- **Risk**: Low

### Option B: Leave duplicated
- **Pros**: Both blocks are adjacent and visible; easy to compare
- **Cons**: Future changes need updating in two places
- **Effort**: None
- **Risk**: Low (drift risk is real but low)

## Recommended Action

Skip. Duplication is adjacent, readable, and low-risk for 2 uses in the same file.

## Technical Details

- **Affected files**: `src/app/(admin)/admin/project/treasury/page.tsx` lines 184-207, 216-249
- **Components**: Treasury page publish/removal builders

## Acceptance Criteria

- [ ] Single function produces `ProjectData` from a `Task`
- [ ] Both `tasksToAdd` and `tasksToRemove` use the shared function
- [ ] No behavioral change in task publishing or deletion

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-25 | Created from PR #15 code review | Follow-up improvement, not blocking |

## Resources

- PR: #15
