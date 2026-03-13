---
title: Add Transaction Documentation & DX Improvements
type: docs
status: completed
date: 2026-03-13
issues: [33, 34]
---

# Add Transaction Documentation & DX Improvements

Combined plan for GitHub issues #33 and #34 — documentation and DX improvements for the transaction system.

## Overview

New developers need clear entry points for understanding transaction flow. This plan addresses two related tasks:
1. Add "How Transactions Work" section to README.md
2. Add inline phase comments to `use-transaction.ts`

## Acceptance Criteria

### Issue #33: README Section
- [x] Add "How Transactions Work" section after "Key Patterns" (line 130)
- [x] Include state machine diagrams (client + gateway layers)
- [x] Show `useTransaction` and `useTxStream` usage examples
- [x] Document the 7-step flow
- [x] Include key files table

### Issue #34: Phase Comments
- [x] Add PHASE 0: PREREQUISITES comment at line 170
- [x] Add PHASE 1: VALIDATION comment at line 176
- [x] Add PHASE 2: BUILD comment at line 187
- [x] Add PHASE 3: SIGN comment at line 227
- [x] Add PHASE 4: SUBMIT comment at line 231
- [x] Add PHASE 5: REGISTER comment at line 238
- [x] Add PHASE 6: SUCCESS comment at line 263

## Implementation

### README.md (Insert at line 130)

```markdown
### How Transactions Work

Andamio uses a two-layer state machine for Cardano transactions.

#### Client Layer (User-Facing)

```
idle → fetching → signing → submitting → success
         ↓           ↓           ↓
       error       error       error
```

The `useTransaction` hook manages this:

```typescript
const { execute, state, result } = useTransaction();

await execute({
  txType: "COURSE_STUDENT_ASSIGNMENT_COMMIT",
  params: { course_id, alias, slt_hash, ... }
});
// state: fetching → signing → submitting → success
```

#### Gateway Layer (Background Confirmation)

After submission, the gateway monitors the blockchain:

```
pending → confirmed → updated
            ↓
         failed/expired
```

Track confirmation with `useTxStream`:

```typescript
const { status, isSuccess } = useTxStream(result?.txHash);
// status.state: pending → confirmed → updated
```

#### Key Insight

**"confirmed" is NOT terminal.** The gateway updates the database ~30s after on-chain confirmation. Always wait for `updated` before refetching data:

```typescript
// WRONG - data will be stale
if (status.state === "confirmed") refetchData();

// CORRECT - wait for DB sync
if (status.state === "updated") refetchData();
```

#### The 7-Step Flow

1. **UI Action** → `useTransaction().execute({ txType, params })`
2. **Build** → POST to gateway, receive unsigned CBOR
3. **Sign** → Wallet signs with partial signing enabled
4. **Submit** → Wallet submits to blockchain, returns txHash
5. **Register** → POST `/api/v2/tx/register` starts gateway monitoring
6. **Monitor** → SSE stream (or polling) until terminal state
7. **Complete** → Toast fires, DB updated, UI refreshes

#### Key Files

| File | Purpose |
|------|---------|
| `hooks/tx/use-transaction.ts` | Execute transactions |
| `hooks/tx/use-tx-stream.ts` | SSE-based confirmation tracking |
| `stores/tx-watcher-store.ts` | Persistent TX monitoring |
| `config/transaction-ui.ts` | TX types and endpoints |
| `config/transaction-schemas.ts` | Zod validation |
```

### use-transaction.ts Phase Comments

Insert phase marker blocks at these locations:

```typescript
// Line 170 (before wallet check)
// =========================================================================
// PHASE 0: PREREQUISITES
// Check wallet connection before proceeding
// =========================================================================

// Line 176 (before setState("fetching"))
// =========================================================================
// PHASE 1: VALIDATION
// Validate params against Zod schema. Gateway will also validate.
// =========================================================================

// Line 187 (before const endpoint)
// =========================================================================
// PHASE 2: BUILD
// POST to gateway endpoint, receive unsigned CBOR
// =========================================================================

// Line 227 (before setState("signing"))
// =========================================================================
// PHASE 3: SIGN
// User signs with connected wallet. partialSign=true for V2 protocol.
// =========================================================================

// Line 231 (before setState("submitting"))
// =========================================================================
// PHASE 4: SUBMIT
// Submit signed transaction to Cardano blockchain. Point of no return.
// =========================================================================

// Line 238 (before const shouldRegister)
// =========================================================================
// PHASE 5: REGISTER
// Register with gateway + global store for tracking. Gateway handles DB sync.
// =========================================================================

// Line 263 (before setState("success"))
// =========================================================================
// PHASE 6: SUCCESS
// Update state, fire toasts, call callbacks
// =========================================================================
```

## Key Files

| File | Line | Action |
|------|------|--------|
| `README.md` | 130 | Insert new section after "Icons" |
| `src/hooks/tx/use-transaction.ts` | 170, 176, 187, 227, 231, 238, 263 | Insert phase comments |

## Why

- Makes the flow explicit for developers reading the code
- Connects to existing CEI pattern documentation
- Helps debugging ("which phase failed?")
- Gives new developers a clear entry point

## Sources

- Issue #33: https://github.com/andamio-platform/andamio-app-template/issues/33
- Issue #34: https://github.com/andamio-platform/andamio-app-template/issues/34
- Existing `/transactions` skill at `.claude/skills/transactions/SKILL.md`
- TxSM research documentation
