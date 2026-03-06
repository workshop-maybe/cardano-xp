---
title: "TX Crash Recovery — localStorage Persistence for In-Flight Transactions"
module: tx-watcher-store, tx-watcher-provider
severity: high
tags:
  - transaction-pipeline
  - crash-recovery
  - localStorage
  - zustand
  - state-persistence
  - rehydration
date: 2026-03-31
---

# TX Crash Recovery — localStorage Persistence for In-Flight Transactions

## Problem

The Zustand TX watcher store was purely in-memory. If a user closed their browser tab during the 20-90 second Cardano confirmation window, all transaction state was lost — the user had no feedback on whether their transaction succeeded or failed, and no way to know if retrying was safe.

## Symptoms

- User submits a transaction, closes tab, reopens — no toast, no status, no indication the TX existed
- Users unsure whether to retry (risking double-spend) or wait
- TX reaches terminal state on-chain but the user never sees it

## What Didn't Work

The existing TX pipeline (SSE + polling fallback + confirmed-state timeout) handles all failure modes **while the app is open**. But it has no persistence — `txWatcherStore` is a vanilla Zustand store at module level, which survives React component unmounts but not browser tab closure.

## Solution

### localStorage Persistence Layer

Four operations added to `tx-watcher-store.ts`:

- **`persistTx()`** — writes `{txHash, txType, toastConfig, registeredAt}` to `localStorage` under key `tx-watcher:${txHash}`. Called inside `register()`.
- **`removeTxFromStorage()`** — deletes the localStorage entry. Called in every cleanup path.
- **`getPersistedTxs()`** — scans localStorage for `tx-watcher:*` keys, filters out entries older than `MAX_AGE_MS` (1 hour, Cardano TTL), removes expired entries, returns valid ones.
- **`clearAllTxStorage()`** — removes all `tx-watcher:*` keys. Called from `clearAll()`.

All helpers are wrapped in try/catch — localStorage failures (quota exceeded, private browsing) degrade silently to pre-existing behavior (no crash recovery, no errors).

### Cleanup Path Checklist

Every cleanup path must remove persisted state. This follows the same pattern as `_confirmedTimeout` timer cleanup:

| Path | When | Removes from localStorage |
|------|------|--------------------------|
| `handleTerminal()` | TX reaches success/failure/expired | Yes |
| `unregister()` | TX manually removed from watch list | Yes |
| `cleanup()` | Periodic stale entry cleanup | Yes |
| `clearAll()` | User logout | Yes (all keys) |

Missing any one path creates a localStorage leak.

### Rehydration

In `TxWatcherBridge` component (runs on mount), a `useEffect` with `[]` deps:

```typescript
useEffect(() => {
  const persisted = getPersistedTxs();
  for (const tx of persisted) {
    store.register(tx.txHash, tx.txType, tx.toastConfig, tx.registeredAt);
  }
}, []);
```

- `register()` is idempotent — skips if the TX is already tracked
- `originalRegisteredAt` is passed through to preserve the original timestamp

### TTL Reset Bug

Initial implementation had `register()` set `registeredAt: Date.now()` unconditionally. On rehydration after a crash, this reset the TTL clock — repeated crashes within the 1-hour window made the TX immortal, never expiring.

Fix: `register()` accepts an optional `originalRegisteredAt` parameter. Rehydration passes the persisted timestamp:

```typescript
const registeredAt = originalRegisteredAt ?? Date.now();
```

### SSR Safety

All localStorage reads happen inside `useEffect`, never during render. Per institutional learnings: `typeof window !== "undefined"` does NOT prevent hydration mismatch — `useEffect` is the only safe way to defer browser API access.

## Why This Works

localStorage survives tab close and browser restart. The 1-hour TTL (matching Cardano's maximum transaction TTL) ensures entries don't persist forever. The idempotent `register()` prevents duplicates on rehydration. Defensive try/catch on all localStorage operations means the feature degrades gracefully — worst case is the pre-existing behavior (no crash recovery).

## Prevention

1. **Any state that must survive navigation or tab close needs explicit persistence.** Zustand's in-memory store survives component unmounts but not browser closure.
2. **When rehydrating timestamps, preserve the original value.** Never overwrite with `Date.now()` — time-based expiry must use the original time.
3. **Enumerate every cleanup path and verify each removes persisted state.** Use the same checklist pattern as existing timers/resources.
4. **All localStorage access must be in `useEffect`, never during render** — SSR hydration mismatch otherwise.

## Known Limitations (from code review)

- **JWT race:** Rehydration may fire before JWT is available, causing SSE connections without auth. Polling fallback eventually picks up the JWT.
- **No user scoping:** localStorage keys lack wallet/alias prefix — a different user on the same browser could see another's TXs.
- **Strict Mode double-invoke:** React Strict Mode (dev only) double-invokes the rehydration effect, potentially orphaning SSE connections from the first invocation.

## Files

- `src/stores/tx-watcher-store.ts` — Persistence helpers + store action wiring
- `src/components/providers/tx-watcher-provider.tsx` — Rehydration in TxWatcherBridge

## Related

- `docs/solutions/runtime-errors/tx-confirmed-state-timeout-and-error-recovery.md` — Complementary: handles SSE drop while app is open (same pipeline, different failure mode)
- `docs/solutions/ui-bugs/ssr-hydration-mismatch-sessionstorage-render.md` — SSR safety pattern for browser APIs
- `docs/plans/2026-03-31-001-feat-mainnet-readiness-plan.md` — Implementation plan
