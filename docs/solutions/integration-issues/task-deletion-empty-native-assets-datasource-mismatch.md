---
title: Task deletion fails with empty native_assets — API endpoint data source mismatch
date_discovered: 2026-03-25
date_resolved: 2026-03-25
severity: HIGH
module:
  - treasury-page
  - admin-project-page
  - draft-tasks-page
  - use-project-manager
  - use-project
tags:
  - native-assets
  - data-source-mismatch
  - xp-token
  - task-management
  - tx-api
  - hash-mismatch
related_issues:
  - "14"
---

# Task deletion fails with empty native_assets — API endpoint data source mismatch

## Symptom

Deleting on-chain tasks with XP token rewards fails with a **422 Unprocessable Entity** from the TX API. The error shows `native_assets = ListValue []` when the on-chain datum includes XP tokens:

```
Transaction API error: 422 - {
  "error": {
    "code": "UNPROCESSABLE_ENTITY",
    "message": "Atlas TX API error",
    "details": "{\"error_code\":\"STATE_ERROR\",\"message\":\"Task to delete does not exist: TaskData {
      project_content = ShortText140 {unShortText140 = \\\"Mobile Experience\\\"},
      expiration_posix = 1780272000000,
      lovelace_amount = 2500000,
      native_assets = ListValue []}\"}"
  }
}
```

The hash computed from the request (with empty assets) differs from the on-chain hash (with XP tokens), so the TX API can't find the task to delete.

**Secondary symptom:** XP deposit calculation (`onChainXpCommitted`) was `0` even with XP tasks on-chain, understating the deposit needed for publishing new tasks.

## Root Cause

The treasury page sourced on-chain task data from **two different API endpoints** for its create vs. delete flows:

| Flow | Hook | Endpoint | Populates `assets`? |
|---|---|---|---|
| Publish (add) | `useManagerTasks` | `POST /project/manager/tasks/list` | Yes |
| Delete (remove) | `useProject` | `GET /project/user/project/{id}` | No |

Both endpoints return task objects with an `assets?: Asset[]` field in their TypeScript types, but the project detail endpoint **doesn't populate it** on embedded tasks. The transform function handles this correctly:

```typescript
// transformOnChainTask — use-project.ts:403
tokens: api.assets ? transformAssets(api.assets) : undefined,
```

When `api.assets` is undefined, `task.tokens` stays undefined. The deletion builder then evaluates `(task.tokens ?? [])` as `[]`, producing empty `native_assets`.

## Solution

**Data source swap.** Switch all on-chain task derivations across admin pages to use `useManagerTasks` (filtered by `taskStatus === "ON_CHAIN"`) instead of `projectDetail?.tasks`. Both hooks were already called on these pages — no new fetches needed.

### Treasury page (`treasury/page.tsx`)

```typescript
// Before — sources from project detail (missing assets)
const onChainTasks: Task[] = useMemo(() => {
  const raw = (projectDetail?.tasks ?? []).filter(t => t.taskStatus === "ON_CHAIN");
  // ...
}, [projectDetail?.tasks]);

// After — sources from useManagerTasks (has assets)
// Comment explains WHY this data source is used
const onChainTasks: Task[] = useMemo(() => {
  const raw = (tasks ?? []).filter((t) => t.taskStatus === "ON_CHAIN");
  const seen = new Set<string>();
  return raw.filter((t) => {
    if (!t.taskHash || seen.has(t.taskHash)) return false;
    seen.add(t.taskHash);
    return true;
  });
}, [tasks]);
```

### Project dashboard (`page.tsx`)

```typescript
// Before
const onChainTaskCount = projectDetail?.tasks?.filter(t => t.taskStatus === "ON_CHAIN").length ?? 0;

// After
const onChainTaskCount = tasks.filter(t => t.taskStatus === "ON_CHAIN").length;
```

### Draft tasks page (`draft-tasks/page.tsx`)

```typescript
// Before — onChainTaskHashes from projectDetail
const onChainTaskHashes = useMemo(() => new Set(
  (projectDetail?.tasks ?? []).filter(t => t.taskStatus === "ON_CHAIN")
    .map(t => t.taskHash).filter(Boolean)
), [projectDetail?.tasks]);

// After — onChainTaskHashes from useManagerTasks
const onChainTaskHashes = useMemo(() => new Set(
  (tasks ?? []).filter(t => t.taskStatus === "ON_CHAIN")
    .map(t => t.taskHash).filter(Boolean)
), [tasks]);
```

## What This Fixed

1. **Task deletion** — `native_assets` now includes XP tokens, hash matches on-chain datum
2. **XP deposit calculation** — `onChainXpCommitted` correctly sums committed XP
3. **XP badge display** — removal table shows correct XP amounts (was showing 0)
4. **Data source consistency** — all three admin pages now use the same source for on-chain tasks

## Prevention: Data Source Mismatch Bugs

This is an instance of a broader pattern: **two API endpoints returning the same type with different field populations**.

### Rules

1. **Document which endpoint populates which fields.** The TypeScript types (`ProjectTaskOnChain` and `MergedTaskListItem`) both declare `assets?: Asset[]`, but only one endpoint actually populates it. Types don't tell you what the API returns — runtime behavior does.

2. **Use one data source for related operations.** If create, delete, and calculate all work with on-chain tasks, source them all from the same hook. Don't mix endpoints for different operations on the same entity.

3. **Leave a "why" comment at the data source.** The next developer will see `tasks` (from `useManagerTasks`) and wonder why not `projectDetail.tasks` (which looks simpler). A comment explaining the endpoint's field limitation prevents the bug from being reintroduced.

4. **Test the full admin flow end-to-end.** Display, publishing, and deletion each use different code paths and can fail independently. The bug only appeared when deleting (step 3), not when creating (step 2).

### Detection Checklist

When reviewing admin pages that consume task data:

- [ ] Which hook provides the data for each operation?
- [ ] Does that endpoint populate all fields the operation needs?
- [ ] Are calculations (deposits, counts) using the same source as the operations they support?
- [ ] Is there a comment explaining the data source choice?

## Related

- [xp-token-hex-decoded-name-mismatch.md](xp-token-hex-decoded-name-mismatch.md) — Encoding boundary gotchas (hex vs decoded asset names)
- [xp-token-task-reward-integration.md](xp-token-task-reward-integration.md) — Native asset wiring patterns
- [assignment-commit-500-three-root-causes.md](../runtime-errors/assignment-commit-500-three-root-causes.md) — TX API hash/request debugging patterns
- GitHub issue: [#14](https://github.com/workshop-maybe/cardano-xp/issues/14)
- PR: [#15](https://github.com/workshop-maybe/cardano-xp/pull/15)
- Related upstream: [andamioscan#49](https://github.com/Andamio-Platform/andamioscan/issues/49)
