# Task Pre-Assignment MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let project managers pre-assign tasks to specific contributors by alias, blocking others from committing.

**Architecture:** Store pre-assignment alias in `contentJson._metadata.preAssignment` (Tiptap ignores unknown keys). Extract it in the transform layer as `task.preAssignedAlias`. Gate commitment on the task detail page. Validate aliases on input using `GET /api/v2/user/exists/{alias}` via the existing `<AliasListInput>` component.

**Tech Stack:** Next.js 15, React Query, Tiptap JSONContent, shadcn/ui, TypeScript

**Design doc:** `docs/plans/2026-02-19-task-pre-assignment-design.md`

---

### Task 1: Create task-metadata.ts helper module

**Files:**
- Create: `src/lib/task-metadata.ts`

**Step 1: Create the helper module**

```typescript
// src/lib/task-metadata.ts
import type { JSONContent } from "@tiptap/core";

/**
 * Metadata embedded in contentJson._metadata
 * Tiptap ignores unknown top-level keys, so this is safe.
 */
interface TaskMetadata {
  preAssignment?: {
    alias: string;
  };
}

/**
 * Extract pre-assigned alias from a task's contentJson.
 * Returns null if not pre-assigned.
 */
export function getPreAssignedAlias(contentJson: unknown): string | null {
  if (!contentJson || typeof contentJson !== "object") return null;
  const metadata = (contentJson as Record<string, unknown>)
    ._metadata as TaskMetadata | undefined;
  return metadata?.preAssignment?.alias ?? null;
}

/**
 * Set or remove pre-assignment on contentJson.
 * - If alias is provided: embeds _metadata.preAssignment
 * - If alias is null/empty: removes _metadata.preAssignment
 * - If contentJson is null: creates a minimal doc wrapper
 */
export function setPreAssignment(
  contentJson: JSONContent | null,
  alias: string | null,
): JSONContent | null {
  const trimmed = alias?.trim() || null;

  // If no alias AND no existing content, return null (no contentJson needed)
  if (!trimmed && !contentJson) return null;

  // Start from existing content or create minimal doc
  const doc: JSONContent & { _metadata?: TaskMetadata } = contentJson
    ? { ...contentJson }
    : { type: "doc", content: [] };

  if (trimmed) {
    doc._metadata = {
      ...(doc._metadata as TaskMetadata | undefined),
      preAssignment: { alias: trimmed },
    };
  } else {
    // Remove pre-assignment
    if (doc._metadata) {
      const { preAssignment: _, ...rest } = doc._metadata as TaskMetadata &
        Record<string, unknown>;
      if (Object.keys(rest).length > 0) {
        doc._metadata = rest as TaskMetadata;
      } else {
        delete doc._metadata;
      }
    }
    // If the doc was only created for metadata and has no content, return null
    if (!contentJson && (!doc.content || doc.content.length === 0)) {
      return null;
    }
  }

  return doc;
}
```

**Step 2: Verify types compile**

Run: `npm run typecheck`
Expected: No new errors

**Step 3: Commit**

```bash
git add src/lib/task-metadata.ts
git commit -m "feat: add task-metadata.ts helper for pre-assignment storage"
```

---

### Task 2: Add preAssignedAlias to Task type and transform

**Files:**
- Modify: `src/hooks/api/project/use-project.ts`
  - Task interface (line 99-129)
  - transformMergedTask (line 424-457)
  - transformOnChainTask (line 364-399)

**Step 1: Add import**

At the top of `use-project.ts`, after the existing imports (around line 40), add:

```typescript
import { getPreAssignedAlias } from "~/lib/task-metadata";
```

**Step 2: Add field to Task interface**

In the `Task` interface, after `contributorStateId?: string;` (line 128), add:

```typescript
  // Pre-assignment (Web2 only, stored in contentJson._metadata)
  preAssignedAlias: string | null;
```

**Step 3: Extract in transformMergedTask**

In `transformMergedTask()`, in the return object after `contentJson: api.content?.content_json,` (line 444), add:

```typescript
    preAssignedAlias: getPreAssignedAlias(api.content?.content_json),
```

**Step 4: Add null value in transformOnChainTask**

In `transformOnChainTask()`, in the return object after `taskStatus: "ON_CHAIN",` (line 398), add:

```typescript
    preAssignedAlias: null, // On-chain-only tasks don't carry DB metadata
```

**Step 5: Verify types compile**

Run: `npm run typecheck`
Expected: No new errors

**Step 6: Commit**

```bash
git add src/hooks/api/project/use-project.ts
git commit -m "feat: add preAssignedAlias to Task type and transform layer"
```

---

### Task 3: Add pre-assignment field to TaskForm

**Files:**
- Modify: `src/components/studio/task-form.tsx`

**Step 1: Add imports**

At the top of `task-form.tsx`, add:

```typescript
import { setPreAssignment, getPreAssignedAlias } from "~/lib/task-metadata";
import { AliasListInput } from "~/components/tx/alias-list-input";
```

**Step 2: Add preAssignedAlias to TaskFormValues**

Update the `TaskFormValues` interface (lines 38-44) to add the new field:

```typescript
export interface TaskFormValues {
  title: string;
  content: string;
  lovelaceAmount: string;
  expirationTime: string;
  contentJson: JSONContent | null;
  preAssignedAlias: string | null;
}
```

**Step 3: Add form state**

After the existing state declarations (around line 81), add:

```typescript
  const [preAssignedAliases, setPreAssignedAliases] = useState<string[]>([]);
```

Note: `AliasListInput` expects a string array. We cap it at 1 item.

**Step 4: Populate from initialTask in edit mode**

In the `useEffect` that populates form from initialTask (around line 84-92), after `setContentJson(...)` add:

```typescript
    const existingAlias = initialTask.preAssignedAlias;
    setPreAssignedAliases(existingAlias ? [existingAlias] : []);
```

**Step 5: Update handleSubmit**

Replace the `handleSubmit` function (lines 119-128) with:

```typescript
  const handleSubmit = () => {
    if (!isValid) return;
    const alias = preAssignedAliases[0] ?? null;
    const finalContentJson = setPreAssignment(contentJson, alias);
    void onSubmit({
      title: title.trim(),
      content: content.trim(),
      lovelaceAmount: lovelace,
      expirationTime,
      contentJson: finalContentJson,
      preAssignedAlias: alias,
    });
  };
```

**Step 6: Add the AliasListInput to the JSX**

After the closing `</div>` of the Reward & Expiration two-column grid (after line 219), and before the Content section separator, add:

```tsx
          {/* Pre-assignment (Optional) */}
          <div className="space-y-2">
            <AliasListInput
              value={preAssignedAliases}
              onChange={(aliases) => {
                // Cap at 1 alias
                if (aliases.length > 1) {
                  setPreAssignedAliases([aliases[aliases.length - 1]!]);
                } else {
                  setPreAssignedAliases(aliases);
                }
              }}
              label="Pre-assign to (Optional)"
              placeholder="Enter contributor alias"
              disabled={preAssignedAliases.length >= 1}
              helperText={
                preAssignedAliases.length > 0
                  ? `Only @${preAssignedAliases[0]} will be able to commit to this task`
                  : "Leave empty to allow any contributor. Alias is verified on-chain."
              }
            />
          </div>
```

**Step 7: Verify types compile**

Run: `npm run typecheck`
Expected: No new errors (or minor ones in create/edit pages that we fix in Task 4)

**Step 8: Commit**

```bash
git add src/components/studio/task-form.tsx
git commit -m "feat: add verified pre-assignment field to TaskForm"
```

---

### Task 4: Verify create and edit pages pass contentJson through

**Files:**
- Read: `src/app/(studio)/studio/project/[projectid]/draft-tasks/new/page.tsx`
- Read: `src/app/(studio)/studio/project/[projectid]/draft-tasks/[taskindex]/page.tsx`

**Step 1: Check new task page**

In `new/page.tsx`, line 63: `contentJson: values.contentJson` — this already passes the contentJson (which now includes `_metadata.preAssignment`) through to `useCreateTask`. No change needed.

**Step 2: Check edit task page**

In `[taskindex]/page.tsx`, line 71: `contentJson: values.contentJson` — same, no change needed.

**Step 3: Verify types compile**

Run: `npm run typecheck`
Expected: PASS — contentJson flows through unchanged, carrying the embedded metadata.

**Step 4: Commit (only if changes were needed)**

If no changes: skip. Otherwise:
```bash
git add "src/app/(studio)/studio/project/[projectid]/draft-tasks/"
git commit -m "feat: wire pre-assignment through create/edit task pages"
```

---

### Task 5: Add commitment gate on task detail page

**Files:**
- Modify: `src/app/(app)/project/[projectid]/[taskhash]/page.tsx`

**Step 1: Add pre-assignment check variables**

After the `activeCommitment` and `commitmentStatus` derivation (around line 184), add:

```typescript
  // Pre-assignment gate: check if task is reserved for a specific contributor
  const preAssignedAlias = task?.preAssignedAlias ?? null;
  const isPreAssigned = !!preAssignedAlias;
  const isAssignedToCurrentUser =
    isPreAssigned && user?.accessTokenAlias === preAssignedAlias;
  const isBlockedByPreAssignment =
    isPreAssigned && isAuthenticated && !isAssignedToCurrentUser;
```

**Step 2: Add blocked state before the "No commitment" section**

Find the existing ternary chain in the commitment card. Currently around line 601 there's this condition:

```tsx
          ) : (
            /* ── No commitment — Commit to This Task ────────── */
```

Insert a new branch BEFORE that final `:` clause:

```tsx
          ) : isBlockedByPreAssignment ? (
            /* ── Pre-assigned to someone else — blocked ────── */
            <div className="text-center py-6 space-y-4">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-muted mx-auto">
                <AlertIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <AndamioText className="font-medium">
                  This task is reserved
                </AndamioText>
                <AndamioText variant="muted">
                  Pre-assigned to{" "}
                  <span className="font-medium">@{preAssignedAlias}</span>.
                  Only they can commit to this task.
                </AndamioText>
              </div>
              <Link href={`/project/${projectId}`}>
                <AndamioButton
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                >
                  Browse other tasks
                </AndamioButton>
              </Link>
            </div>
          ) : (
            /* ── No commitment — Commit to This Task ────────── */
```

**Step 3: Gate the evidence editor section**

Find the evidence editor section (around line 629). Change the condition from:

```tsx
      {isAuthenticated && !activeCommitment && isEditingEvidence && (
```

to:

```tsx
      {isAuthenticated && !activeCommitment && !isBlockedByPreAssignment && isEditingEvidence && (
```

**Step 4: Verify types compile**

Run: `npm run typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add "src/app/(app)/project/[projectid]/[taskhash]/page.tsx"
git commit -m "feat: add pre-assignment commitment gate on task detail page"
```

---

### Task 6: Manual verification

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Test create task with pre-assignment**

1. Navigate to `/studio/project/<any-project>/draft-tasks/new`
2. Fill in task title, reward, expiration
3. Type a valid alias in "Pre-assign to" field → click "Verify & Add"
4. Should see checkmark badge if alias exists on-chain
5. Click "Create Task"
6. Verify task is created successfully

**Step 3: Test edit task preserves pre-assignment**

1. Navigate to the draft task you just created
2. Verify the pre-assigned alias appears as a badge
3. Remove the badge (click ×) and add a different alias
4. Save and verify the change persists

**Step 4: Test invalid alias rejection**

1. Type a non-existent alias in the "Pre-assign to" field
2. Click "Verify & Add"
3. Should see error: "not found. Make sure the alias has an Access Token on-chain."

**Step 5: Test commitment gate**

1. Log in as a different user (not the pre-assigned alias)
2. Navigate to the pre-assigned task's detail page
3. Verify you see "This task is reserved" message
4. Verify "Commit to This Task" button is NOT shown

**Step 6: Test assigned user can commit**

1. Log in as the pre-assigned user
2. Navigate to the same task
3. Verify you see the normal "Commit to This Task" flow

**Step 7: Test non-pre-assigned tasks unchanged**

1. Navigate to a task with no pre-assignment
2. Verify the normal commitment flow works as before

---

### Task 7: Final typecheck and commit

**Step 1: Full typecheck**

Run: `npm run typecheck`
Expected: PASS with zero errors

**Step 2: Verify git status**

Run: `git status`
Expected: Only the files from this plan are modified

**Step 3: Final commit if needed**

If any fixes were made during manual testing, commit them:
```bash
git add -A
git commit -m "fix: address pre-assignment review feedback"
```
