# Task Pre-Assignment MVP Design

**Date:** 2026-02-19
**Status:** Approved
**Target:** Intersect deployment, before March 1 2026
**Scope:** Pre-assignment gate only (no CSV bulk upload)

## Problem

Intersect needs the ability to reserve tasks for specific contributors. Currently, any contributor with an access token can commit to any task. There is no way to restrict a task to a specific person.

## Solution

A frontend-only (Web2) pre-assignment feature that:
1. Lets managers assign a task to a contributor's `accessTokenAlias` during creation/editing
2. Blocks other contributors from committing to pre-assigned tasks

This is enforced in the UI only, not on-chain.

## Approach: contentJson._metadata

Store pre-assignment data in the task's existing `contentJson` field using a `_metadata` key that Tiptap's renderer ignores.

### Data Shape

```json
{
  "type": "doc",
  "content": [],
  "_metadata": {
    "preAssignment": {
      "alias": "alice123"
    }
  }
}
```

- When a task has no rich content and needs pre-assignment, create a minimal doc with `_metadata`
- When a task is not pre-assigned, `contentJson` is either null or has no `_metadata.preAssignment`
- Zero backend API changes required

### Why This Works

- The Gateway API stores `content_json` as an opaque JSON blob and returns it as-is
- Tiptap only processes `type`, `content`, `marks`, `text`, `attrs` — it ignores `_metadata`
- All users who fetch the task see the same `contentJson`, so the gate works for everyone

## Components

### 1. task-metadata.ts (new helper module)

```typescript
// src/lib/task-metadata.ts

function getPreAssignedAlias(contentJson: unknown): string | null
function setPreAssignment(contentJson: JSONContent | null, alias: string | null): JSONContent | null
function getTiptapContent(contentJson: unknown): JSONContent | null
```

### 2. TaskForm Changes

Reuse the existing `<AliasListInput>` component (from `~/components/tx/alias-list-input`) capped at 1 alias:
- Same "Verify & Add" UX as manager/teacher flows
- Uses `GET /api/v2/user/exists/{alias}` for on-chain verification (200 = exists, 404 = not found)
- Populated from `initialTask.preAssignedAlias` in edit mode
- Remove badge to clear the pre-assignment

`TaskFormValues` gains: `preAssignedAlias: string | null`

### 3. Task Type Extension

```typescript
// in use-project.ts
export interface Task {
  // ...existing fields...
  preAssignedAlias: string | null;
}
```

`transformMergedTask()` extracts `preAssignedAlias` from `content_json._metadata.preAssignment.alias`.

### 4. Commitment Gate

On the task detail page, before the "Commit to This Task" button:

```
Is task pre-assigned?
  NO  -> Current flow (unchanged)
  YES -> Does user.accessTokenAlias === task.preAssignedAlias?
    YES -> Current flow (unchanged)
    NO  -> Button disabled, show: "This task is reserved for @{alias}."
```

Blocked users see an informative message with a link back to the project page.

## Files

### Create (1)
- `src/lib/task-metadata.ts`

### Modify (5)
| File | Change |
|------|--------|
| `src/components/studio/task-form.tsx` | Add preAssignedAlias field, embed in contentJson |
| `src/hooks/api/project/use-project.ts` | Add preAssignedAlias to Task type, extract in transform |
| `src/app/(app)/project/[projectid]/[taskhash]/page.tsx` | Add commitment gate |
| `src/app/(studio)/studio/project/[projectid]/draft-tasks/new/page.tsx` | Pass preAssignedAlias through |
| `src/app/(studio)/studio/project/[projectid]/draft-tasks/[taskindex]/page.tsx` | Pass preAssignedAlias through |

### Not Touched
- `use-project-manager.ts` — mutations already pass contentJson through
- `task-commit.tsx` — gate is in the parent page
- Generated types — content_json is already `unknown`

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Storage mechanism | contentJson._metadata | Zero backend changes, API stores/returns it |
| Alias validation | `GET /api/v2/user/exists/{alias}` via `<AliasListInput>` | Same endpoint used by manager/teacher flows — works correctly (GH #272 is a different endpoint) |
| Commitment enforcement | Frontend gate only | Web2-only, not on-chain |
| Public badge | Deferred | MVP scope — gate only |
| Autocomplete | Deferred | Requires working alias API |

## Known Limitations

- **Not enforced on-chain**: A contributor could bypass the gate by calling the Gateway API directly
- **Alias validated at input time**: Uses `GET /api/v2/user/exists/{alias}` (same as manager/teacher flows)
- **No public badge**: Other contributors don't see that a task is pre-assigned (until they try to commit)
- **contentJson coupling**: Pre-assignment metadata lives alongside rich content

## Future Enhancements

When GH #272 is fixed:
- Add alias autocomplete/validation in TaskForm
- Add public "Pre-assigned to @alias" badge on task cards and detail pages
- Add filter for pre-assigned tasks in task lists

When backend support is added:
- Move pre-assignment to a dedicated DB field
- Enable on-chain enforcement
