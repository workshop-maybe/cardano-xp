---
problem_type: integration-issue
module: Task publishing, treasury deposit, token matching
severity: high
date_solved: 2026-03-19
tags:
  - tokens
  - hex-encoding
  - andamio-api
  - atlas-tx
  - native-assets
---

# XP Token Hex vs Decoded Name Mismatch

## Problem

Three related failures when working with XP tokens in task creation and publishing:

1. **Task list showed 0 XP** for all tasks despite tokens being attached
2. **`computeTaskHash` threw "tokenName contains invalid hex characters"** when publishing tasks
3. **Atlas TX API returned `INSUFFICIENT_FUNDS`** for XP tokens that were already in the treasury

## Root Cause

The Andamio API returns **decoded** asset names (e.g., `"XP"`) while the on-chain system and `CARDANO_XP` config use **hex-encoded** names (e.g., `"5850"`). Three different code paths assumed the same encoding:

### 1. Token matching in task display

`getTaskXpReward()` compared `task.tokens[].assetName` against `CARDANO_XP.xpToken.assetName` (`"5850"`). But the API's `convertDBTokens` function maps `AssetNameDecoded` to the `name` field, so `task.tokens[].assetName` was `"XP"`. Never matched.

**Gateway code** (`andamio-api/internal/orchestration/project_orchestrator.go:1928`):
```go
assets[i] = api_types.Asset{
    PolicyId: getPointerString(t.PolicyId),
    Name:     getPointerString(t.AssetNameDecoded),  // ← decoded, not hex
    Amount:   getPointerString(t.Quantity),
}
```

### 2. Task hash computation

`native_assets` for `computeTaskHash` were built from `task.tokens[].assetName` (decoded `"XP"`). The Blake2b hash function expects hex-encoded token names. `"XP"` is not valid hex → runtime error.

### 3. Treasury deposit calculation

The publish flow always included XP in `publishDepositValue`, asking the user's wallet to supply XP tokens. But XP was already deposited in the treasury UTxO. The calculation didn't account for existing treasury XP balance.

## Solution

### Fix 1: Match on policyId only

Since there's only one asset under the XP policy, match on `policyId` alone:

```typescript
// BEFORE — never matches because "XP" !== "5850"
const xpToken = task.tokens?.find(
  (t) => t.policyId === CARDANO_XP.xpToken.policyId && t.assetName === CARDANO_XP.xpToken.assetName
);

// AFTER — matches on policyId only
const xpToken = task.tokens?.find(
  (t) => t.policyId === CARDANO_XP.xpToken.policyId
);
```

### Fix 2: Use hex name from config for on-chain operations

When building `native_assets` for hash computation and TX submission, use the hex name from config instead of the decoded name from the API:

```typescript
const nativeAssets: ListValue = (task.tokens ?? []).map((t) => {
  const hexName = t.policyId === CARDANO_XP.xpToken.policyId
    ? CARDANO_XP.xpToken.assetName  // "5850" (hex)
    : t.assetName;
  return [`${t.policyId}.${hexName}`, t.quantity];
});
```

### Fix 3: Subtract treasury XP from deposit requirement

```typescript
const treasuryXp = projectDetail?.treasuryAssets?.find(
  (t) => t.policyId === CARDANO_XP.xpToken.policyId
)?.quantity ?? 0;
const onChainXpCommitted = onChainTasks.reduce((sum, t) => {
  const xp = t.tokens?.find((tk) => tk.policyId === CARDANO_XP.xpToken.policyId);
  return sum + (xp?.quantity ?? 0);
}, 0);
const availableXp = treasuryXp - onChainXpCommitted;
const xpDepositNeeded = Math.max(0, addXp - availableXp);
```

## Also Fixed

- Added `treasuryAssets` field to `ProjectDetail` interface, mapped from `api.treasury_assets` — this was available from the API but never exposed to the frontend
- Removed `useTreasuryBalance` Blockfrost hook — treasury data now comes entirely from the Andamio API via `useProject()`

## Prevention

When working with Cardano native assets across API boundaries:
- **Always check encoding**: hex (`"5850"`) vs decoded (`"XP"`) — they look completely different
- **Match on policyId when possible**: there's usually one asset per policy, so the name comparison is unnecessary
- **Use config constants for on-chain operations**: never use API-returned names for hash computation or TX building
- **Test the full flow**: create task → list task (check display) → publish task (check TX) — each step can fail at a different encoding boundary

## Files Changed

- `src/app/(admin)/admin/project/draft-tasks/page.tsx` — `getTaskXpReward` match fix
- `src/app/(admin)/admin/project/treasury/page.tsx` — hex name fix, deposit calculation fix
- `src/hooks/api/project/use-project.ts` — added `treasuryAssets` mapping
- `src/app/(app)/xp/page.tsx` — switched from Blockfrost to Andamio API

## Related

- [Live treasury balance](../architecture/live-treasury-balance-blockfrost.md) — superseded by Andamio API approach
- [Remove dynamic routes](../architecture/remove-dynamic-routes-single-tenant.md) — same session
- GitHub issue: https://github.com/Andamio-Platform/andamio-db-api-go/issues/130
