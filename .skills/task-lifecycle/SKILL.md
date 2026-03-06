---
name: task-lifecycle
description: Walk through the full task lifecycle — commit, submit, review, assess — with a working preprod example.
---

# Task Lifecycle

Hands-on walkthrough of the Andamio task state machine. By the end, you'll have executed (or understood) every transaction in the task flow.

## The Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TASK LIFECYCLE                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐       │
│  │  COMMIT  │───▶│  SUBMIT  │───▶│  REVIEW  │───▶│  ASSESS  │       │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘       │
│       │               │               │               │              │
│       ▼               ▼               ▼               ▼              │
│   Contributor     Contributor      Manager        Manager            │
│   locks stake     submits work     reviews        approves/rejects   │
│   to task         (hash on-chain)  (off-chain)    (triggers payout)  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Instructions

### 1. Check Prerequisites

Before running transactions on preprod, verify:

```bash
# Check environment
echo $NEXT_PUBLIC_CARDANO_NETWORK  # Should be "preprod"
```

The developer needs:
- Wallet connected with preprod ADA
- Access token minted (run `/getting-started` first if not)
- A project with open tasks (check `/project` page)

### 2. Understand the State Machine

Each transaction moves the task through states:

| Transaction | tx_type | From State | To State | Who |
|-------------|---------|------------|----------|-----|
| Commit | `project_join` | open | committed | Contributor |
| Submit | `task_submit` | committed | committed | Contributor |
| Assess (accept) | `task_assess` | committed | accepted | Manager |
| Assess (refuse) | `task_assess` | committed | refused | Manager |
| Assess (deny) | `task_assess` | committed | denied | Manager |

### 3. Walk Through the Code

Show the developer the key files:

**Transaction Hooks** (`src/hooks/api/project/`):
- `use-project-contributor.ts` — commit and submit transactions
- `use-project-manager.ts` — assess transactions

**State Tracking** (`src/stores/`):
- `tx-watcher-store.ts` — global transaction watcher

**Types** (`src/types/`):
- `transaction.ts` — state machine types

### 4. Try It (Demo Mode)

If they want to run a real transaction:

1. Navigate to `/project` and find a project with open tasks
2. Click on a task to view details
3. Click "Commit to Task" — this builds and submits the commit TX
4. Watch the TX state machine: `pending → confirmed → updated`
5. Once `updated`, the task shows as "committed" in their dashboard

**Key insight**: "confirmed" means on-chain, but `updated` means the DB synced. Always wait for `updated` before refetching data.

### 5. Explain What Happened

After the commit transaction:

```
1. Frontend called POST /api/v2/tx/project/commit
2. Gateway built unsigned CBOR with contributor's stake locked
3. Wallet signed the transaction
4. Wallet submitted to blockchain
5. Frontend registered TX with POST /api/v2/tx/register
6. SSE stream or polling watched for confirmation
7. Gateway updated database ~30s after on-chain confirmation
8. UI received "updated" state and refreshed
```

### 6. Continue the Flow (Optional)

If they want to complete the full lifecycle:

**Submit work:**
```
/project/{projectId}/{taskHash} → "Submit Work" button
```

**Assess (requires manager role):**
```
/studio/project/{projectId}/commitments → Review pending submissions
```

## Key Files

| File | Purpose |
|------|---------|
| `src/hooks/api/project/use-project-contributor.ts` | Contributor transactions |
| `src/hooks/api/project/use-project-manager.ts` | Manager transactions |
| `src/hooks/tx/use-tx-stream.ts` | SSE-based TX tracking |
| `src/stores/tx-watcher-store.ts` | Global TX state management |
| `src/types/transaction.ts` | Transaction state types |

## Common Issues

### "Confirmed but data is stale"

You're checking for `confirmed` instead of `updated`. The database syncs ~30s after on-chain confirmation.

```typescript
// Wrong
if (status.state === "confirmed") { refetchData(); }

// Right
if (status.state === "updated") { refetchData(); }
```

### "Transaction expired"

Cardano transactions have a 2-hour TTL. If the user waits too long to sign, rebuild the transaction.

### "Not eligible for task"

The contributor is missing required SLTs. Check the task's `requiredCredentials` against the user's credentials.

## Next Steps

- `/transactions` — deeper dive into TX state machine internals
- `/design-system` — understand the UI patterns used in task pages
- Check `e2e/tests/projects/task-commitment-flow.spec.ts` for automated test coverage

---

**Last Updated**: April 2026
