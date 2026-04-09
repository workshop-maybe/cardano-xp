---
title: "Backport commitment improvements to assignment route"
type: feat
status: completed
date: 2026-04-08
---

# Backport commitment improvements to assignment route

## Enhancement Summary

**Deepened on:** 2026-04-08
**Sections enhanced:** 4 (acceptance criteria, context, MVP, edge cases)
**Review agents used:** TypeScript reviewer, frontend races reviewer, pattern recognition specialist, code simplicity reviewer
**Learnings applied:** 3 (tx-confirmed-state-timeout, tx-crash-recovery, assignment-commit-500)

### Key Improvements
1. Added missing `isFailed` destructuring — without it, gateway spinner hangs forever on TX failure
2. Refined duplicate evidence check location — keep in `handleLockRevision` (early feedback) but always compare against on-chain hash
3. Established `parseTxErrorMessage` at source strategy — wrap in `setTxError()`, not at display site

### Future Work (out of scope)
- Refactor `useTxStream` to expose normalized callbacks (`onSuccess`/`onStalled`/`onFailed`) to eliminate per-component stalled-state checks
- Extract `isStalledSuccess(status)` utility if pattern spreads to more TX components

---

Commit `1877a6f` added three patterns to `TaskCommit` that the assignment route lacks:

1. **Stalled-state handling** — `TaskCommit.onComplete` treats `confirmed + last_error` (gateway DB sync stuck) as success with a degraded message. The assignment route's two `useTxStream` callbacks (`commitTx`, `updateTx`) only check `"updated"`, so a stalled TX shows as stuck forever.
2. **Duplicate evidence blocking** — `TaskCommit` compares `computedHash === previousEvidenceHash` and toasts "Evidence unchanged" before executing. The assignment revision flow (`ASSIGNMENT_REFUSED` branch) has no equivalent guard — a student can resubmit identical work.
3. **`parseTxErrorMessage`** — `TaskCommit` wraps raw error messages through `parseTxErrorMessage()` for user-friendly display. Assignment route shows raw error strings.
4. **Missing `isFailed` destructuring** (discovered by pattern recognition review) — `assignment-commitment.tsx` never destructures `isFailed` from either `useTxStream` call. The gateway confirmation spinner has no failure exit path — it will spin indefinitely on TX failure.

The infrastructure changes (retry with backoff, localStorage persistence, recovery bridge) are in shared hooks and already apply to the assignment route.

## Acceptance Criteria

- [x] `assignment-commitment.tsx`: `commitTx` `useTxStream` destructures `isFailed` and uses it to show failure state
- [x] `assignment-commitment.tsx`: `commitTx` `onComplete` handles stalled state (`confirmed + last_error`) with degraded success message + toast
- [x] `assignment-commitment.tsx`: `updateTx` `useTxStream` destructures `isFailed` and uses it to show failure state
- [x] `assignment-commitment.tsx`: `updateTx` `onComplete` handles stalled state identically
- [x] `assignment-commitment.tsx`: revision flow (`handleLockRevision`) checks computed hash against `commitment.networkEvidenceHash` and blocks identical resubmission with toast
- [x] `assignment-commitment.tsx`: error display uses `parseTxErrorMessage()` at source (`setTxError` calls)
- [x] `assignment-update.tsx`: `onComplete` handles stalled state with degraded success message
- [x] `assignment-update.tsx`: add `previousEvidenceHash` prop and block identical resubmission before executing TX
- [x] `assignment-update.tsx`: error display uses `parseTxErrorMessage()` instead of raw strings

## Context

### Files to modify

| File | Change |
|------|--------|
| `src/components/learner/assignment-commitment.tsx:119` | Destructure `isFailed: commitTxFailed` from `useTxStream` |
| `src/components/learner/assignment-commitment.tsx:119-141` | Add stalled-state handling in `commitTx` `onComplete` |
| `src/components/learner/assignment-commitment.tsx:144` | Destructure `isFailed: updateTxFailed` from `useTxStream` |
| `src/components/learner/assignment-commitment.tsx:144-160` | Add stalled-state handling in `updateTx` `onComplete` |
| `src/components/learner/assignment-commitment.tsx:249-281` | Add duplicate evidence check in `handleLockRevision` |
| `src/components/learner/assignment-commitment.tsx:312` | Use `parseTxErrorMessage()` at source in `setTxError` calls |
| `src/components/tx/assignment-update.tsx:113-131` | Add stalled-state handling in `onComplete` |
| `src/components/tx/assignment-update.tsx:146-149` | Add `previousEvidenceHash` check before executing TX |
| `src/components/tx/assignment-update.tsx:39-75` | Add `previousEvidenceHash` to props interface |
| `src/components/tx/assignment-update.tsx:296` | Use `parseTxErrorMessage()` for error display |

### Pattern reference

The stalled-state pattern from `task-commit.tsx:162-170`:

```tsx
const isStalled = status.state === "confirmed" && !!status.last_error;

if (status.state === "updated" || isStalled) {
  if (isStalled) {
    successTitle = "Confirmed On-Chain!";
    successDescription = "Confirmed on-chain. Gateway sync pending — your data will update shortly.";
  } else {
    // normal success
  }
}
```

The duplicate evidence pattern from `task-commit.tsx:220-225`:

```tsx
if (previousEvidenceHash && computedHash === previousEvidenceHash) {
  toast.error("Evidence unchanged", {
    description: "Update your submission before resubmitting.",
  });
  return;
}
```

### Research Insights

**From institutional learnings:**

- `docs/solutions/runtime-errors/tx-confirmed-state-timeout-and-error-recovery.md` — Prevention strategy #1: "Keep TX components in sync with App v2." Prevention strategy #3: "Wire existing utilities — check if `~/lib/tx-error-messages.ts` already has what you need."
- `docs/solutions/runtime-errors/assignment-commit-500-three-root-causes.md` — Prevention: "Use structural consistency across TX types. If a field is present in N-1 out of N transaction types, the one that omits it is almost certainly a bug."

**From review agents:**

- **TypeScript reviewer:** `useTxStream` already derives `isSuccess` correctly for stalled state (`use-tx-stream.ts:152`). The UI banners keyed on `txConfirmed` (which maps to `isSuccess`) will work correctly without additional changes. The `onComplete` changes are specifically for toast messaging differentiation.
- **Frontend races reviewer:** No race conditions. The stale `commitment` in the evidence check closure is actually correct — you want to compare against the last-submitted hash. Two `useTxStream` hooks are mutually exclusive by construction. Unmount is safe by design (Zustand store subscription cleanup).
- **Pattern recognition:** Missing `isFailed` is a real bug — spinner hangs on failure. `ConfirmDialog` guard is missing but the two-step finalize flow compensates.
- **Code simplicity:** `previousEvidenceHash` prop is unnecessary for `assignment-commitment.tsx` initial commit flow (lock/finalize prevents it). Only needed in REFUSED revision path (compare against `commitment.networkEvidenceHash`) and in `assignment-update.tsx` (prop from parent).

**Error handling strategy (from TypeScript reviewer):**

Wrap `parseTxErrorMessage` at the **source** (`setTxError` calls), not at the display site. Reason: `displayError` in `assignment-commitment.tsx` also includes `commitmentError.message` from the query hook, which should NOT be parsed through `parseTxErrorMessage`. Wrapping at source means the shared `UpdateTxStatusSection` component needs no changes.

```tsx
// At source — correct
onError: (err) => setTxError(parseTxErrorMessage(err.message)),

// NOT at display — would also parse query errors
const displayError = parseTxErrorMessage(txError ?? commitmentError?.message); // wrong
```

### Edge Cases

- **Stale hash on re-finalize:** The REFUSED revision flow allows unlock/re-lock cycles. The duplicate evidence check must always compare against `commitment.networkEvidenceHash` (on-chain truth), never against a locally cached hash from a previous finalize attempt.
- **`isFailed` spinner escape:** Both commit and update TX confirmation spinners in `assignment-commitment.tsx` need `isFailed` to show an error state. Without it, a failed TX leaves the user staring at "Confirming on blockchain..." forever.
- **`parseTxErrorMessage` import:** Must be added to both `assignment-commitment.tsx` and `assignment-update.tsx`. Import from `~/lib/tx-error-messages`.

## MVP

### assignment-commitment.tsx — add imports

```tsx
import { parseTxErrorMessage } from "~/lib/tx-error-messages";
```

### assignment-commitment.tsx — destructure isFailed + stalled state in commitTx onComplete

```tsx
// Destructure isFailed from useTxStream (line ~119)
const { status: commitTxStatus, isSuccess: commitTxConfirmed, isFailed: commitTxFailed } = useTxStream(
  commitTx.result?.requiresDBUpdate ? commitTx.result.txHash : null,
  {
    onComplete: (status) => {
      const isStalled = status.state === "confirmed" && !!status.last_error;

      if (status.state === "updated" || isStalled) {
        if (!wasEnrolledBeforeTx) {
          toast.success("You're enrolled!", {
            description: "You are now enrolled in this course.",
          });
        }
        triggerSuccess(
          isStalled
            ? "Confirmed on-chain. Gateway sync pending — your data will update shortly."
            : "Assignment committed to blockchain!"
        );
        void refetchCommitment();
        void queryClient.invalidateQueries({ queryKey: courseStudentKeys.all });
      } else if (status.state === "failed" || status.state === "expired") {
        setTxError(parseTxErrorMessage(status.last_error ?? "Transaction failed. Please try again."));
      }
    },
  }
);
```

### assignment-commitment.tsx — destructure isFailed + stalled state in updateTx onComplete

```tsx
// Destructure isFailed from useTxStream (line ~144)
const { status: updateTxStatus, isSuccess: updateTxConfirmed, isFailed: updateTxFailed } = useTxStream(
  updateTx.result?.requiresDBUpdate ? updateTx.result.txHash : null,
  {
    onComplete: (status) => {
      const isStalled = status.state === "confirmed" && !!status.last_error;

      if (status.state === "updated" || isStalled) {
        triggerSuccess(
          isStalled
            ? "Confirmed on-chain. Gateway sync pending — your data will update shortly."
            : "Assignment updated on blockchain!"
        );
        void refetchCommitment();
        void queryClient.invalidateQueries({ queryKey: courseStudentKeys.commitments() });
      } else if (status.state === "failed" || status.state === "expired") {
        setTxError(parseTxErrorMessage(status.last_error ?? "Transaction failed. Please try again."));
      }
    },
  }
);
```

### assignment-commitment.tsx — use isFailed in gateway confirmation UI

Add failure exit to both commit and update spinner blocks. Find the two gateway confirmation status blocks and add `isFailed` conditions:

```tsx
{/* Commit TX: add failure handling alongside existing spinner */}
{commitTxFailed && (
  <AndamioAlert variant="destructive">
    <AlertIcon className="h-4 w-4" />
    <AndamioAlertDescription>
      Transaction failed on-chain. Please try again.
    </AndamioAlertDescription>
  </AndamioAlert>
)}

{/* Update TX: same pattern */}
{updateTxFailed && (
  <AndamioAlert variant="destructive">
    <AlertIcon className="h-4 w-4" />
    <AndamioAlertDescription>
      Transaction failed on-chain. Please try again.
    </AndamioAlertDescription>
  </AndamioAlert>
)}
```

### assignment-commitment.tsx — duplicate evidence check in handleLockRevision

```tsx
const handleLockRevision = async () => {
  if (!localEvidenceContent || !sltHash) return;
  const hash = computeAssignmentInfoHash(localEvidenceContent);

  // Block resubmission of identical evidence (compare against on-chain hash)
  if (commitment?.networkEvidenceHash && hash === commitment.networkEvidenceHash) {
    toast.error("Evidence unchanged", {
      description: "Update your submission before resubmitting.",
    });
    return;
  }

  // ... rest of existing logic (DB save, lock state)
};
```

### assignment-commitment.tsx — parseTxErrorMessage at source

```tsx
// In handleUpdateTxExecute onError callback:
onError: (err) => setTxError(parseTxErrorMessage(err.message)),

// In the PENDING_TX_COMMIT branch commitTx.execute onError callback:
onError: (err) => setTxError(parseTxErrorMessage(err.message)),
```

### assignment-update.tsx — add imports + previousEvidenceHash prop

```tsx
import { parseTxErrorMessage } from "~/lib/tx-error-messages";

// Add to AssignmentUpdateProps interface:
/**
 * Evidence hash from a previous submission.
 * When provided, compared against the current computed hash to
 * prevent resubmission of identical evidence.
 */
previousEvidenceHash?: string;

// Destructure in component:
export function AssignmentUpdate({
  // ... existing props
  previousEvidenceHash,
  // ...
}: AssignmentUpdateProps) {
```

### assignment-update.tsx — stalled state in onComplete

```tsx
onComplete: (status) => {
  const isStalled = status.state === "confirmed" && !!status.last_error;

  if (status.state === "updated" || isStalled) {
    const actionText = isNewCommitment ? "committed" : "updated";
    toast.success(
      isStalled ? "Confirmed On-Chain!" : "Submission Recorded!",
      {
        description: isStalled
          ? "Confirmed on-chain. Gateway sync pending — your data will update shortly."
          : `Your evidence has been ${actionText} on-chain`,
      },
    );
    void onSuccess?.();
  } else if (status.state === "failed" || status.state === "expired") {
    toast.error("Submission Failed", {
      description: parseTxErrorMessage(status.last_error ?? "Please try again or contact support."),
    });
  }
},
```

### assignment-update.tsx — duplicate evidence check + error parsing

```tsx
// At top of handleSubmit, after computing hash:
if (previousEvidenceHash && computedHash === previousEvidenceHash) {
  toast.error("Evidence unchanged", {
    description: "Update your submission before resubmitting.",
  });
  return;
}

// Line ~296 — replace raw error with parsed:
error={parseTxErrorMessage(error?.message)}
```

## Sources

- Commit `1877a6f` — the task commitment improvements being backported
- `src/components/tx/task-commit.tsx` — reference implementation
- `src/hooks/tx/use-tx-stream.ts:139-157` — `isStalled`/`isSuccess` derivation already in shared hook
- `docs/solutions/runtime-errors/tx-confirmed-state-timeout-and-error-recovery.md` — stalled-state pattern origin
- `docs/solutions/runtime-errors/tx-crash-recovery-localstorage-persistence.md` — infrastructure already shared
- `docs/solutions/runtime-errors/assignment-commit-500-three-root-causes.md` — structural consistency principle
