---
title: "fix: Remove COMMITTED and PENDING_TX_SUBMIT status values"
type: fix
status: completed
date: 2026-03-23
deepened: 2026-03-23
---

# fix: Remove COMMITTED and PENDING_TX_SUBMIT status values

## Enhancement Summary

**Deepened on:** 2026-03-23
**Agents used:** TypeScript reviewer, pattern recognition, architecture strategist, frontend races, code simplicity, performance oracle, git history analyzer, learnings researcher

### Corrections to Original Plan
1. **Lines with existing `|| "SUBMITTED"` checks** — remove the `COMMITTED` arm, don't replace it (creates tautology)
2. **Task detail COMMITTED copy block** (lines 517-521) — delete entirely, don't convert to second SUBMITTED block
3. **`draft-tasks/page.tsx` line 79** — remove `case "PENDING_TX_SUBMIT"`, don't rename to `PENDING_TX_COMMIT` (already exists on line 78)
4. **Generated types** — regenerate only, never hand-edit

### Follow-up Items (out of scope for this PR)
- Introduce `CommitmentStatus` union type for compiler safety
- Add normalization layer to manager hooks
- Centralize status constants into `src/lib/commitment-statuses.ts`

---

## Overview

The gateway API (`andamio-api#263`) now normalizes project task commitment statuses at read time. Two status values are no longer returned:

| Before | After | Reason |
|--------|-------|--------|
| `COMMITTED` | `SUBMITTED` | Same on-chain action (single redeemer) — states collapsed |
| `PENDING_TX_SUBMIT` | `PENDING_TX_COMMIT` | Submit pending state collapsed into commit pending |

**Valid statuses after change:** `DRAFT`, `SUBMITTED`, `ACCEPTED`, `REFUSED`, `REWARDED`, `ABANDONED`, `PENDING_TX_COMMIT`, `PENDING_TX_ASSESS`, `PENDING_TX_CLAIM`, `PENDING_TX_LEAVE`

**Semantic implication:** The "committed but not yet submitted evidence" state no longer exists. When a contributor joins a task, the API returns `SUBMITTED` immediately. The task lifecycle collapses commit+submit into one step.

## Problem Statement / Motivation

The codebase references `COMMITTED` and `PENDING_TX_SUBMIT` in ~20 locations across status maps, UI comparisons, and switch/case branches. These values will never arrive from the API, causing dead comparisons that silently hide commitments from manager and contributor views. Several entries already have "remove after migration confirmed" comments — inherited from the upstream template at fork time and never cleaned up.

This was already fixed in andamio-app-v2 (`Andamio-Platform/andamio-app-v2#461`). Apply the same pattern here.

## Prerequisite

**API must deploy first.** Gateway API change (`andamio-api#263`) must be live before this frontend change ships. If the frontend deploys first, `=== "SUBMITTED"` comparisons won't match `COMMITTED` values still coming from the old API, causing commitments to disappear from all views. The `format-status.ts` fallback handles display labels but does **not** protect comparison logic.

## Proposed Solution

### 1. Status Maps / Normalizers

#### `src/lib/format-status.ts`

Remove stale label entries (the new values already exist in this file):

- **Remove** line 8: `COMMITTED: "Committed"` (already have `SUBMITTED: "Submitted"` on line 9)
- **Remove** line 11: `PENDING_TX_SUBMIT: "Submitting..."` (already have `PENDING_TX_COMMIT: "Joining..."` on line 10)

#### `src/lib/assignment-status.ts`

- **Remove** line 27: `COMMITTED: "PENDING_APPROVAL"` — legacy entry. `SUBMITTED` already maps to `"PENDING_APPROVAL"` via existing mapping.

#### `src/hooks/api/course/use-student-assignment-commitments.ts`

- **Remove** line 67: `COMMITTED: "PENDING_APPROVAL"` from `STATUS_MAP`.

#### `src/hooks/api/course/use-assignment-commitment.ts`

- **Remove** line 133: `COMMITTED: "COMMITTED"` from `STATUS_MAP` — the API will send `SUBMITTED` which maps to `"PENDING_APPROVAL"` via existing entry.

#### `src/hooks/api/course/use-course-teacher.ts`

- **Remove** line 235: `COMMITTED: "COMMITTED"` from `TEACHER_STATUS_MAP`
- **Change** line 236: `AWAITING_SUBMISSION: "COMMITTED"` → `AWAITING_SUBMISSION: "AWAITING_SUBMISSION"` — pass through so `format-status.ts` can label it correctly ("Awaiting Submission", already mapped on line 7).

### 2. UI Component Comparisons

#### `src/app/(admin)/admin/project/page.tsx`

- **Line 89:** The existing code is `=== "SUBMITTED" || === "COMMITTED"`. **Remove the `|| === "COMMITTED"` arm entirely** — don't replace with `"SUBMITTED"` (that creates a tautology).

#### `src/app/(admin)/admin/project/draft-tasks/page.tsx`

- **Line 76:** Remove `case "COMMITTED":` — dead branch. `AWAITING_SUBMISSION` on line 77 still covers the `in_progress` lifecycle for the remaining equivalent states.
- **Line 79:** Remove `case "PENDING_TX_SUBMIT":` entirely — `case "PENDING_TX_COMMIT":` already exists on line 78. Renaming would create a duplicate switch case.

#### `src/app/(admin)/admin/project/commitments/page.tsx`

- **Line 110:** Remove `case "COMMITTED":` block from `getManagerStatusHint()` (already marked "Legacy").
- **Lines 282, 317:** The existing code is `=== "SUBMITTED" || === "COMMITTED"`. **Remove the `|| === "COMMITTED"` arm** from each filter.
- **Line 642:** Same pattern — **remove the `|| === "COMMITTED"` arm** if present, or replace `"COMMITTED"` with `"SUBMITTED"` if standalone.

#### `src/app/(app)/tasks/page.tsx`

- **Line 88:** `c.commitmentStatus === "COMMITTED"` → `c.commitmentStatus === "SUBMITTED"`
- **Line 91:** `c.commitmentStatus === "PENDING_TX_SUBMIT"` → `c.commitmentStatus === "PENDING_TX_COMMIT"`

#### `src/app/(app)/tasks/[taskhash]/page.tsx`

- **Line 126:** `!== "PENDING_TX_SUBMIT"` → `!== "PENDING_TX_COMMIT"`
- **Line 436:** `=== "PENDING_TX_SUBMIT"` → `=== "PENDING_TX_COMMIT"`
- **Line 497:** `=== "COMMITTED"` → `=== "SUBMITTED"`
- **Lines 517-521:** **Delete this entire block.** The copy reads "You've joined this task. Submit evidence when ready." — this describes the defunct COMMITTED state. The existing SUBMITTED block at lines 523-526 ("Evidence submitted. Waiting for manager review.") is the correct message for the collapsed lifecycle. Converting this to a second SUBMITTED block would render duplicate conflicting copy.

### 3. Clean Up

#### `src/hooks/api/project/use-project-contributor.ts`

- **Lines 166, 169:** Update JSDoc comment — remove `COMMITTED` and `PENDING_TX_SUBMIT` from DB value list.

#### `src/types/generated/gateway.ts`

- Run `npm run generate:types` to regenerate from the updated API spec. Do not hand-edit generated files.

### 4. Verification

After all changes, run a multi-pass search to catch any missed references:

```bash
# String literals
grep -rn '"COMMITTED"' src/ --include='*.ts' --include='*.tsx'
grep -rn '"PENDING_TX_SUBMIT"' src/ --include='*.ts' --include='*.tsx'

# Template literals and partial matches
grep -rn 'COMMITTED' src/ --include='*.ts' --include='*.tsx'
grep -rn 'PENDING_TX_SUBMIT' src/ --include='*.ts' --include='*.tsx'
```

Both searches should return zero results in source files (plan docs excluded).

Then: `npm run build` to confirm no type errors.

## Acceptance Criteria

- [x] Zero references to `"COMMITTED"` or `"PENDING_TX_SUBMIT"` in any `.ts`/`.tsx` source file
- [x] Task detail page COMMITTED copy block (lines 517-521) deleted — no duplicate SUBMITTED messaging
- [x] `npm run build` passes

## File Change Map

| File | Lines | Change |
|------|-------|--------|
| `src/lib/format-status.ts` | 8, 11 | Remove `COMMITTED` and `PENDING_TX_SUBMIT` labels |
| `src/lib/assignment-status.ts` | 27 | Remove `COMMITTED` alias |
| `src/hooks/api/course/use-student-assignment-commitments.ts` | 67 | Remove `COMMITTED` from STATUS_MAP |
| `src/hooks/api/course/use-assignment-commitment.ts` | 133 | Remove `COMMITTED` from STATUS_MAP |
| `src/hooks/api/course/use-course-teacher.ts` | 235-236 | Remove `COMMITTED`, change `AWAITING_SUBMISSION` output |
| `src/hooks/api/project/use-project-contributor.ts` | 166, 169 | Update JSDoc comments |
| `src/app/(admin)/admin/project/page.tsx` | 89 | Remove `COMMITTED` arm from OR expression |
| `src/app/(admin)/admin/project/draft-tasks/page.tsx` | 76, 79 | Remove both dead switch cases |
| `src/app/(admin)/admin/project/commitments/page.tsx` | 110, 282, 317, 642 | Remove `COMMITTED` arms and legacy case |
| `src/app/(app)/tasks/page.tsx` | 88, 91 | Replace both old statuses |
| `src/app/(app)/tasks/[taskhash]/page.tsx` | 126, 436, 497, 517-521 | Replace `PENDING_TX_SUBMIT`, replace `COMMITTED`, delete copy block |
| `src/types/generated/gateway.ts` | — | Regenerate via `npm run generate:types` |

## Sources & References

- **API PR:** Andamio-Platform/andamio-api#263
- **App v2 reference fix:** Andamio-Platform/andamio-app-v2#461
- **GitHub issue:** [workshop-maybe/cardano-xp#11](https://github.com/workshop-maybe/cardano-xp/issues/11)
- **Institutional learning:** `docs/solutions/integration-issues/route-path-mismatch-forked-template-migration.md` — multi-pass search verification to catch all string formats
