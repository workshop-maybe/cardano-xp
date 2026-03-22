---
title: "TX State Machine: Confirmed-State Timeout and Error Recovery"
module: tx-watcher-store, task-commit, task-action
severity: high
tags:
  - transaction
  - state-machine
  - timeout
  - celebration
  - error-parsing
  - sse-streaming
date: 2026-03-22
---

# TX State Machine: Confirmed-State Timeout and Error Recovery

## Problem

Cardano XP's `tx-watcher-store` was missing defensive improvements from the Andamio App v2 sister repo. When the SSE `complete` event was missed (network issues), transactions hung indefinitely in "confirmed" state — the gateway never synced evidence to the DB, and users saw an infinite spinner with no recourse.

Symptom: "Database record not available" on the commitment reviews page — the on-chain TX confirmed but the DB record was never created because the gateway sync stalled.

## Root Cause

The TX state machine flow is: BUILD → SIGN → SUBMIT → REGISTER → STREAM (SSE) → terminal state. When the SSE stream drops between "confirmed" (on-chain) and "updated" (DB synced), there was no timeout fallback. The TX stayed in "confirmed" state forever.

Both repos (XP and App v2) rely on the gateway to handle DB updates automatically after TX reaches "updated". Neither explicitly saves evidence to the DB — the gateway extracts it from transaction metadata. When the SSE event is missed, the gateway never processes the update.

## Solution

Synced 4 proven improvements from App v2:

### 1. Confirmed-state timeout (30s)

When a TX reaches "confirmed", start a 30s timer. If "updated" doesn't arrive, treat as stalled:

```typescript
const CONFIRMED_TIMEOUT_MS = 30_000;

// In state_change handler, after "confirmed" toast:
const confirmedEntry = get().transactions.get(txHash);
if (confirmedEntry && !confirmedEntry._confirmedTimeout) {
  const timeoutId = setTimeout(() => {
    const tx = get().transactions.get(txHash);
    if (!tx || tx.isTerminal) return;
    const stalledStatus = toTxStatus(txHash, "confirmed", {
      ...tx.status,
      last_error: "Transaction confirmed on-chain but the platform update timed out.",
    });
    handleTerminal(txHash, stalledStatus, get, set);
  }, CONFIRMED_TIMEOUT_MS);
  updateTxEntry(get, set, txHash, { _confirmedTimeout: timeoutId });
}
```

The timer is cleaned up in every teardown path: `handleTerminal`, `unregister`, `cleanup`, `clearAll`.

### 2. Celebration triggers

The celebration store and UI component already existed but were never wired to TX completion:

```typescript
const MOMENTS_OF_COMMITMENT = [
  "GLOBAL_GENERAL_ACCESS_TOKEN_MINT",
  "PROJECT_CONTRIBUTOR_TASK_COMMIT",
  "PROJECT_CONTRIBUTOR_CREDENTIAL_CLAIM",
  // ... other milestone TX types
] as const;

// In handleTerminal, after success:
if (finalStatus.state === "updated" &&
    MOMENTS_OF_COMMITMENT.includes(entry.txType)) {
  useCelebrationStore.getState().trigger({
    title: entry.toastConfig.successTitle,
    description: entry.toastConfig.successDescription,
  });
}
```

### 3. Human-readable error parsing

`parseTxErrorMessage()` existed in `~/lib/tx-error-messages.ts` but was never imported:

```typescript
// Before: raw contract errors
error={error?.message ?? null}

// After: human-readable
error={parseTxErrorMessage(error?.message)}
```

### 4. Task publication validation

Optional `taskStatus` prop on `TaskCommit` prevents commits to unpublished tasks:

```typescript
const isTaskPublished = taskStatus === undefined || taskStatus === "ON_CHAIN";
const canCommit = hasAccessToken && hasEvidence && hasValidTaskHash && isTaskPublished;
```

## Prevention

1. **Keep TX components in sync with App v2.** The TX state machine is a shared system — improvements in one repo should propagate to the other.
2. **Timer lifecycle checklist.** Any new field on `WatchedTransaction` that holds a timer or resource must be cleaned up in: `handleTerminal`, `unregister`, `cleanup`, `clearAll`.
3. **Wire existing utilities.** Before building new error handling or UI effects, check if `~/lib/tx-error-messages.ts` or `~/stores/celebration-store.ts` already have what you need.

## Files

- `src/stores/tx-watcher-store.ts` — timeout lifecycle, celebration wiring, stalled TX toast
- `src/components/tx/task-commit.tsx` — taskStatus validation, parseTxErrorMessage
- `src/components/tx/task-action.tsx` — parseTxErrorMessage

## Related

- `docs/solutions/runtime-errors/assignment-commit-500-three-root-causes.md` — TX build failure diagnosis (complementary: that doc covers build errors, this covers confirmation stalls)
- `docs/brainstorms/2026-03-22-tx-state-machine-sync-brainstorm.md` — design decisions
- App v2 source: `~/projects/01-projects/andamio-platform/andamio-app-v2/src/stores/tx-watcher-store.ts`
