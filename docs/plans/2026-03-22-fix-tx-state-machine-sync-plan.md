---
title: "fix: Sync TX state machine improvements from app"
type: fix
status: active
date: 2026-03-22
origin: docs/brainstorms/2026-03-22-tx-state-machine-sync-brainstorm.md
---

# Sync TX State Machine Improvements from App

## Overview

The core TX state machine (useTransaction, useTxStream, tx-watcher-store) is identical between Cardano XP and Andamio App v2. But the app has accumulated 4 defensive improvements that XP is missing, plus a documentation gap. These gaps likely contribute to the "Database record not available" bug — if a TX gets stuck between "confirmed" and "updated", the gateway never syncs evidence to the DB.

## Problem Statement

1. **No confirmed-state timeout** — if the SSE `complete` event is missed, XP hangs indefinitely. The app has a 30s guard that treats stalled TXs as succeeded with a user prompt to refresh.
2. **Celebration triggers not wired** — the celebration store and component already exist in XP but are never triggered from the TX watcher. XP should have its own feedback-focused celebration ("You just gave feedback!").
3. **No task publication validation** — contributors can attempt to commit to unpublished tasks.
4. **Raw error messages** — `parseTxErrorMessage()` exists in XP but is never imported in the TX components.
5. **No TX state machine documentation** — app has a 258-line skill doc; XP has nothing.

(see brainstorm: docs/brainstorms/2026-03-22-tx-state-machine-sync-brainstorm.md)

## Acceptance Criteria

### Phase 1: Confirmed-state timeout + celebration wiring (tx-watcher-store.ts)

- [x] Add `CONFIRMED_TIMEOUT_MS = 30_000` constant
- [x] Add `MOMENTS_OF_COMMITMENT` constant (adapted for XP's TX types — includes `PROJECT_CONTRIBUTOR_TASK_COMMIT`)
- [x] Add `_confirmedTimeout` field to `WatchedTransaction` interface
- [x] In `handleTerminal`: clear timeout, trigger celebration for milestone TXs, add stalled TX toast
- [x] In `startWatching` state_change handler: start 30s timeout when TX reaches "confirmed"
- [x] In `register`, `unregister`, `cleanup`, `clearAll` actions: handle `_confirmedTimeout` lifecycle
- [x] Import `useCelebrationStore` from `~/stores/celebration-store`

### Phase 2: Task validation + error parsing (task-commit.tsx, task-action.tsx)

- [x] Add `taskStatus` prop to `TaskCommitProps` interface
- [x] Add `isTaskPublished` validation to `canCommit` guard
- [x] Add conditional warning message for unpublished tasks
- [x] Import and use `parseTxErrorMessage` in `task-commit.tsx` TransactionStatus error prop
- [x] Import and use `parseTxErrorMessage` in `task-action.tsx` TransactionStatus error prop

### Phase 3: Celebration UX (new implementation)

- [x] Update celebration store trigger config for XP-specific messaging
- [x] Celebration messages use each component's toastConfig (set at commit time). `MOMENTS_OF_COMMITMENT` includes `PROJECT_CONTRIBUTOR_TASK_COMMIT` for XP's feedback flow.

### Phase 4: Documentation

- [ ] Create `.skills/transactions/tx-state-machine.md` adapted from app's 258-line doc
- [ ] Document XP-specific TX types and flow

## Implementation

### Files to Modify

#### `src/stores/tx-watcher-store.ts` — 8 insertion points (~60 lines)

Copy from app repo at `/Users/james/projects/01-projects/andamio-platform/andamio-app-v2/src/stores/tx-watcher-store.ts`:

1. **Import** (top): Add `import { useCelebrationStore } from "./celebration-store";`
2. **Constants**: Add `CONFIRMED_TIMEOUT_MS` and `MOMENTS_OF_COMMITMENT`
3. **Interface**: Add `_confirmedTimeout: ReturnType<typeof setTimeout> | null` to `WatchedTransaction`
4. **handleTerminal**: Add timeout clearing, celebration trigger, stalled TX toast branch
5. **startWatching state_change**: Add 30s timeout setup after "confirmed" toast
6. **register**: Add `_confirmedTimeout: null` to initial entry
7. **unregister/cleanup**: Add `clearTimeout` before abort
8. **clearAll**: Add `clearTimeout` inside loop

#### `src/components/tx/task-commit.tsx` — 4 insertion points (~15 lines)

1. Add `taskStatus?: "DRAFT" | "PENDING_TX" | "ON_CHAIN"` to props interface
2. Destructure `taskStatus` in component
3. Add `isTaskPublished` to `canCommit` guard
4. Add conditional warning message for `!isTaskPublished`
5. Import `parseTxErrorMessage`, use in TransactionStatus error prop

#### `src/components/tx/task-action.tsx` — 2 line changes

1. Add `import { parseTxErrorMessage } from "~/lib/tx-error-messages";`
2. Change `error={error?.message ?? null}` to `error={parseTxErrorMessage(error?.message)}`

### Files to Create

#### `.skills/transactions/tx-state-machine.md`

Adapt from app's doc at `.claude/skills/audit-api-coverage/tx-state-machine.md`. Cover:
- Terminal state table
- TX flow diagram (BUILD → SIGN → SUBMIT → REGISTER → STREAM/POLL)
- Confirmed-state timeout behavior
- TX type handler mapping (XP-specific types)
- Frontend implementation patterns
- Common issues and fixes

### Celebration Messaging (XP-specific)

Instead of generic celebration titles, use feedback-focused copy:

| TX Type | Title | Description |
|---------|-------|-------------|
| `GLOBAL_GENERAL_ACCESS_TOKEN_MINT` | "Welcome aboard!" | "Your access token is minted. You're ready to contribute." |
| `PROJECT_CONTRIBUTOR_TASK_COMMIT` | "Feedback submitted!" | "Thanks for giving feedback. Your XP will arrive once it's reviewed." |
| `PROJECT_CONTRIBUTOR_CREDENTIAL_CLAIM` | "Credential claimed!" | "Your contribution is now permanently on-chain." |

Note: The `MOMENTS_OF_COMMITMENT` array should be adapted for XP's actual TX types. Check which TX types XP uses in the existing task-commit and task-action components.

## Dependencies & Risks

- **Celebration store already exists** in XP (`src/stores/celebration-store.ts` and `src/components/andamio/andamio-celebration.tsx`). No new dependencies needed.
- **`parseTxErrorMessage` already exists** in XP (`src/lib/tx-error-messages.ts`). Just needs importing.
- **`taskStatus` prop** needs the caller to pass it. Check where `TaskCommit` is rendered and whether task status is available there.
- **No package changes** — all code is already in the repo, just not wired up.

## Sources

- **Origin brainstorm:** [docs/brainstorms/2026-03-22-tx-state-machine-sync-brainstorm.md](docs/brainstorms/2026-03-22-tx-state-machine-sync-brainstorm.md) — Copy TX improvements from app, new celebration UX, document state machine
- **App reference:** `~/projects/01-projects/andamio-platform/andamio-app-v2/src/stores/tx-watcher-store.ts` — source of truth for timeout + celebration logic
- **App TX doc:** `~/projects/01-projects/andamio-platform/andamio-app-v2/.claude/skills/audit-api-coverage/tx-state-machine.md` — basis for XP documentation
- **TX error gotcha:** `docs/solutions/runtime-errors/assignment-commit-500-three-root-causes.md` — three-layer diagnostic pattern for TX failures
