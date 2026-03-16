---
title: "Project Wallet Transparency Page — Koios API Integration"
problem_type: integration-issues
module: wallet-transparency, koios-proxy, config
severity: enhancement
tags:
  - koios-api
  - react-query
  - transaction-display
  - cardano-integration
  - code-review
date: 2026-03-16
---

# Project Wallet Transparency Page

## Problem

The project needed a public page showing a dedicated Cardano wallet address, its ADA balance, and a full transaction log — making project spending and community donations verifiable on-chain. No existing pattern for fetching and displaying arbitrary address data from Koios existed in the codebase.

## Solution

### Two-Phase Koios Fetch Pattern

The hook (`src/hooks/api/use-project-wallet.ts`) fetches transaction data in two sequential API calls, both POST requests routed through the existing `/api/koios` proxy:

**Phase 1 — `address_txs`:** Returns a flat list of `{ tx_hash, block_height }` for the wallet address. Lightweight — only references, not full transaction bodies. Results are sorted by `block_height` descending using `[...txList].sort(...)` and sliced to 20.

**Phase 2 — `tx_info`:** Takes the batch of tx hashes and fetches full details including `inputs`, `outputs`, and `tx_timestamp`. Results sorted by `tx_timestamp` descending before mapping to domain objects.

Balance is fetched separately via `address_info` in a parallel React Query call. Both queries use `staleTime: 30_000`.

### Transaction Classification Heuristic

`classifyTx()` compares how much of the wallet address appears in inputs vs outputs:

```typescript
inputSum  = sum of lovelace from inputs matching the address
outputSum = sum of lovelace from outputs matching the address
netLovelace = outputSum - inputSum
```

- `inputSum === 0` → **"received"** (wallet only appears in outputs)
- `outputSum === 0 || netLovelace < 0` → **"sent"** (wallet lost ADA)
- Otherwise → **"internal"** (self-transaction or UTxO consolidation)

### Safe Lovelace Parsing

```typescript
function safeParseLovelace(value: string): number {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}
```

Prevents `NaN` propagation if Koios returns unexpected data. Used for balance, input sums, and output sums.

### Page States

The wallet page handles four states for both balance and transactions:

1. **Loading** — pulse-animated skeleton placeholders
2. **Error** — human-readable message, rest of page still renders (address, donate instructions)
3. **Empty** — explanatory message for wallets with no activity yet
4. **Data** — table with date, direction (color-coded), signed ADA amount, CardanoScan link

## Review Findings Fixed

| Finding | Fix |
|---------|-----|
| `data[0]!` non-null assertion | Explicit guard: `const info = data[0]; if (!info) return 0;` |
| `Array.sort()` mutates in place | `[...arr].sort()` to avoid mutating React Query cache references |
| `parseInt` without NaN guard | Extracted `safeParseLovelace` helper |
| `hasMore` pagination flag unused | Removed — no pagination UI exists (YAGNI) |

## Files

| File | Role |
|------|------|
| `src/config/cardano-xp.ts` | `projectWallet.address` — public address constant |
| `src/hooks/api/use-project-wallet.ts` | Koios data fetching + classification hook |
| `src/app/(app)/wallet/page.tsx` | Wallet transparency page |
| `src/config/navigation.ts` | Added "Wallet" nav item |
| `src/config/routes.ts` | Added route metadata |

## Related

- `docs/solutions/integration-issues/xp-token-task-reward-integration.md` — config pattern for `CARDANO_XP` object
- `docs/solutions/architecture/strip-template-to-single-course-app.md` — navigation config pattern
- `docs/solutions/content-architecture/access-token-page-diataxis-consolidation.md` — on-chain cost transparency pattern

## Prevention

- Always use `[...arr].sort()` when sorting API response arrays — React Query may cache the reference
- Wrap `parseInt` on external API strings in a NaN-safe helper
- Don't build pagination infrastructure until pagination UI exists
- Use explicit null guards instead of TypeScript `!` assertions on array access
