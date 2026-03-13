---
name: transactions
description: How Cardano transactions work in Andamio — state machine, APIs, and hooks.
---

# Transactions

Build, submit, and track Cardano transactions in Andamio apps.

**Docs**: [docs.andamio.io](https://docs.andamio.io) | **API**: [preprod.api.andamio.io](https://preprod.api.andamio.io)

## The State Machine

```
BUILD → SIGN → SUBMIT → REGISTER → WATCH
  │       │       │         │         │
  │       │       │         │         └─ SSE stream or poll until "updated"
  │       │       │         └─ POST /api/v2/tx/register
  │       │       └─ wallet.submitTx(signed) → txHash
  │       └─ wallet.signTx(cbor, true)
  └─ POST to /api/v2/tx/* → unsigned CBOR
```

| State | Terminal? | What it means |
|-------|-----------|---------------|
| `pending` | No | TX submitted, waiting for blockchain |
| `confirmed` | **No** | On-chain, Gateway still processing |
| `updated` | **Yes** | DB updated — safe to fetch data |
| `failed` | **Yes** | TX failed after retries |
| `expired` | **Yes** | TX exceeded 2-hour TTL |

## Try It: Explore TX Code in This Repo

### 1. Read the hooks

```bash
# The main TX execution hook
cat src/hooks/tx/use-transaction.ts

# Real-time SSE tracking (preferred)
cat src/hooks/tx/use-tx-stream.ts

# Polling fallback
cat src/hooks/tx/use-tx-watcher.ts
```

### 2. See TX types and endpoints

```bash
# All TX types (access_token_mint, course_create, etc.)
cat src/config/transaction-ui.ts

# Zod schemas for validation
cat src/config/transaction-schemas.ts
```

### 3. Find existing TX implementations

Search for components that use transactions:

```bash
# Find usages of the TX hook
grep -r "useTransaction" src/

# Find TX stream usage
grep -r "useTxStream" src/
```

## Using the Hooks

### useTxStream (Preferred)

Real-time updates via Server-Sent Events:

```typescript
import { useTxStream } from "~/hooks/tx/use-tx-stream";

const { status, isSuccess, isFailed } = useTxStream(txHash);

// isSuccess = true when state === "updated" (DB is ready)
```

### useTxWatcher (Fallback)

Polling every 15 seconds:

```typescript
import { useTxWatcher } from "~/hooks/tx/use-tx-watcher";

const { status, isSuccess } = useTxWatcher(txHash, {
  onComplete: (status) => {
    if (status.state === "updated") {
      toast.success("Transaction complete!");
      void refetchData(); // Now safe to fetch
    }
  },
});
```

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v2/tx/register` | POST | Register TX after wallet submit |
| `/api/v2/tx/status/{hash}` | GET | Poll TX status |
| `/api/v2/tx/stream/{hash}` | GET (SSE) | Real-time state updates |
| `/api/v2/tx/pending` | GET | User's pending TXs |

## TX Types

| Action | tx_type |
|--------|---------|
| Mint access token | `access_token_mint` |
| Create course | `course_create` |
| Submit assignment | `assignment_submit` |
| Assess assignment | `assessment_assess` |
| Claim credential | `credential_claim` |
| Create project | `project_create` |
| Commit to task | `project_join` |
| Submit task work | `task_submit` |
| Assess task | `task_assess` |
| Fund treasury | `treasury_fund` |

## What to Build Next

| Challenge | Description |
|-----------|-------------|
| `/tx-challenge` | 4 progressive challenges — from status display to full TX flow |
| `/task-lifecycle` | Walk through commit → submit → assess on preprod |

## Key Files

| File | Purpose |
|------|---------|
| `~/hooks/tx/use-tx-stream.ts` | SSE-based TX tracking |
| `~/hooks/tx/use-tx-watcher.ts` | Polling-based TX tracking |
| `~/hooks/tx/use-transaction.ts` | TX execution hook |
| `~/config/transaction-schemas.ts` | Zod validation |
| `~/config/transaction-ui.ts` | TX types and endpoints |

---

## Key Insights

### "confirmed" is NOT terminal

The Gateway updates the database ~30 seconds after on-chain confirmation. If you fetch data at "confirmed", you'll get stale results.

```typescript
// WRONG - data will be stale
if (status.state === "confirmed") { refetchData(); }

// CORRECT - wait for DB update
if (status.state === "updated") { refetchData(); }
```

### Don't call confirm-tx endpoints directly

The Gateway handles DB updates automatically. Just wait for `"updated"` status.

### SSE connections can drop

The `useTxStream` hook handles reconnection, but if you're building custom TX tracking, implement fallback to polling via `useTxWatcher`.

---

**Last Updated**: March 2026
