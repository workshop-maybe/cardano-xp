---
title: "fix: Task deletion fails for tasks with native assets"
type: fix
status: completed
date: 2026-03-25
---

# fix: Task deletion fails for tasks with native assets

## Overview

Deleting on-chain tasks that include XP token rewards fails with a 422 TX API error. The deletion flow sends `native_assets: []` instead of the actual token data, causing a hash mismatch against the on-chain datum. The creation flow works correctly because it sources from a different API endpoint that includes asset data.

## Problem Statement

The treasury page has two task management flows that source data from **different API endpoints**:

| Flow | Hook | Endpoint | Returns `assets`? |
|---|---|---|---|
| Publish (add) | `useManagerTasks` | `POST /project/manager/tasks/list` | Yes |
| Remove (delete) | `useProject` → `projectDetail.tasks` | `GET /project/user/project/{id}` | No |

The deletion code correctly maps `task.tokens` to `native_assets`, but `task.tokens` is `undefined` because the project detail endpoint doesn't populate `assets` on embedded tasks. So `(task.tokens ?? [])` evaluates to `[]`, and the TX API can't match the resulting hash to any on-chain task.

**Secondary bug:** The same `onChainTasks` variable feeds the XP deposit calculation (lines 260-264). With empty tokens, `onChainXpCommitted` is `0`, making `availableXp` equal to full `treasuryXp` — the publish flow could understate the XP deposit needed.

## Proposed Solution

Switch the `onChainTasks` variable on `treasury/page.tsx` to derive from `useManagerTasks` (filtered by `taskStatus === "ON_CHAIN"`) instead of `projectDetail?.tasks`. Both hooks are already called on this page, so this is a data source swap, not a new fetch.

This fixes both the deletion flow (correct `native_assets` in `ProjectData`) and the deposit calculation (correct `onChainXpCommitted`).

## Technical Considerations

**Data source differences between `transformMergedTask` and `transformOnChainTask`:**

- `title`: Merged uses DB title; on-chain-only hex-decodes. For the deletion `ProjectData`, `onChainContent` is the primary field (not `title`), so this doesn't affect the hash.
- `description`, `index`, `contentJson`: Differ but aren't used in `ProjectData` construction.
- `tokens`: Merged populates from `api.assets`; on-chain transform also would, but the API doesn't return them. This is the fix target.

**Authentication:** `useManagerTasks` requires auth (`enabled: !!projectId && isAuthenticated`). The treasury page already gates on auth (line 152-158), so no regression.

**Deduplication:** Current `onChainTasks` memo deduplicates by `taskHash` (lines 99-105). The replacement must preserve this dedup logic.

**`onChainTaskHashes` filter (line 174):** Used to exclude already-published tasks from the draft list. Keep deriving this from the same `onChainTasks` variable — both data sources agree on on-chain status.

**Encoding boundaries (from [xp-token-hex-decoded-name-mismatch.md](../solutions/integration-issues/xp-token-hex-decoded-name-mismatch.md)):**
- Always use hex-encoded asset names from config for on-chain operations
- Match on `policyId` alone where possible
- The existing hex swap logic on line 224-229 is correct and doesn't change

## Acceptance Criteria

- [x] `onChainTasks` in `treasury/page.tsx` sources from `useManagerTasks` filtered to `ON_CHAIN` status
- [x] Dedup-by-`taskHash` logic preserved in the new `onChainTasks` memo
- [x] Deletion of a task with XP tokens sends correct `native_assets` (not empty `[]`)
- [x] Deletion of a task without native assets still works (no regression)
- [x] XP deposit calculation (`onChainXpCommitted`) reflects actual on-chain XP
- [x] XP reward badges display correctly in the removal table
- [x] Add defensive `console.warn` when building `tasksToRemove` if `task.tokens` is empty for an ON_CHAIN task
- [x] Code comment explaining why `useManagerTasks` is used for on-chain tasks instead of `projectDetail.tasks`

## MVP

### `src/app/(admin)/admin/project/treasury/page.tsx`

Replace the `onChainTasks` memo (~lines 97-106) to source from `useManagerTasks`:

```typescript
// treasury/page.tsx — onChainTasks derivation
// Source from useManagerTasks instead of projectDetail.tasks
// because the project detail endpoint doesn't populate assets
// on embedded tasks, causing native_assets to be empty in deletion requests.
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

Add defensive warning in the removal `ProjectData` builder (~line 224):

```typescript
// Inside the tasksToRemove map
if ((!task.tokens || task.tokens.length === 0) && task.taskStatus === "ON_CHAIN") {
  console.warn(
    `[treasury] ON_CHAIN task "${task.title}" has no tokens — native_assets will be empty. ` +
    `This may cause a hash mismatch if the on-chain datum includes native assets.`
  );
}
```

## Test Plan

1. **Create a task with XP reward** — verify it publishes successfully (existing flow, sanity check)
2. **Delete a task with XP reward** — verify `native_assets` in the TX request body includes the XP token (primary fix)
3. **Delete a task without XP reward** — verify `native_assets: []` is sent and deletion succeeds (no regression)
4. **Check XP deposit calculation** — with XP tasks on-chain, verify `onChainXpCommitted` is non-zero and `xpDepositNeeded` reflects the correct shortfall
5. **Check XP badges in removal table** — verify token rewards display correctly for on-chain tasks
6. **Check draft task filtering** — verify `onChainTaskHashes` correctly excludes published tasks from the draft list

## Sources

- Issue: [#14](https://github.com/workshop-maybe/cardano-xp/issues/14)
- Related: [andamioscan#49](https://github.com/Andamio-Platform/andamioscan/issues/49) — hash computation breaks with native assets
- Prior solution: [xp-token-hex-decoded-name-mismatch.md](../solutions/integration-issues/xp-token-hex-decoded-name-mismatch.md) — encoding boundary gotchas
- Prior solution: [xp-token-task-reward-integration.md](../solutions/integration-issues/xp-token-task-reward-integration.md) — native asset wiring patterns

### Key Files

| File | Lines | Purpose |
|---|---|---|
| `src/app/(admin)/admin/project/treasury/page.tsx` | 97-106, 213-236, 260-264 | Bug location: `onChainTasks` derivation, removal `ProjectData` builder, XP deposit calc |
| `src/hooks/api/project/use-project-manager.ts` | 414-459 | `useManagerTasks` — correct data source with populated assets |
| `src/hooks/api/project/use-project.ts` | 372-408, 530 | `transformOnChainTask`, `transformProjectDetail` — current (buggy) data source path |
| `src/components/tx/tasks-manage.tsx` | 161 | `TasksManage` — receives `tasksToRemove` and sends to Atlas TX API |
| `src/config/cardano-xp.ts` | — | XP token config (policyId, assetName `"5850"`) |
