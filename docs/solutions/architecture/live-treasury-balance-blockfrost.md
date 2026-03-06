---
problem_type: architecture
module: Treasury balance display, Blockfrost integration
severity: low
date_solved: 2026-03-19
tags:
  - blockfrost
  - treasury
  - on-chain-data
  - react-query
---

# Live Treasury Balance via Blockfrost

## Problem

The treasury balance card showed a hardcoded "100,000 XP" value. After minting XP tokens and depositing them to the project wallet, the UI didn't reflect the actual on-chain balance. Needed live ADA + XP balance from the blockchain.

## Solution

Created a `useTreasuryBalance` hook that queries Blockfrost's address endpoint directly from the client. Used in two places: the admin treasury page and the public `/xp` tokenomics page.

### Hook: `src/hooks/use-treasury-balance.ts`

```typescript
const BLOCKFROST_BASE =
  `https://cardano-${env.NEXT_PUBLIC_CARDANO_NETWORK ?? "preprod"}.blockfrost.io/api/v0`;

async function fetchTreasuryBalance(): Promise<TreasuryBalance> {
  const key = env.NEXT_PUBLIC_BLOCKFROST_PROJECT_ID;
  if (!key) throw new Error("Blockfrost key not configured");

  const res = await fetch(
    `${BLOCKFROST_BASE}/addresses/${CARDANO_XP.projectWallet.address}`,
    { headers: { project_id: key } },
  );

  if (!res.ok) {
    if (res.status === 404) return { ada: 0, xp: 0 };
    throw new Error(`Blockfrost ${res.status}`);
  }

  const data = await res.json();
  const lovelace = data.amount.find((a) => a.unit === "lovelace");
  const xp = data.amount.find((a) => a.unit === XP_UNIT);

  return {
    ada: lovelace ? Number(lovelace.quantity) / 1_000_000 : 0,
    xp: xp ? Number(xp.quantity) : 0,
  };
}
```

Key decisions:
- **Direct `fetch` instead of `BlockfrostProvider`**: The Mesh SDK's provider doesn't expose a simple address balance query. Raw fetch is simpler for this read-only use case.
- **Network-aware URL**: Derives from `NEXT_PUBLIC_CARDANO_NETWORK` env var, not hardcoded to preprod.
- **60s stale/refetch**: Balance updates are not time-critical. 60s keeps Blockfrost rate usage low.
- **404 → zero balance**: Unfunded addresses return 404 from Blockfrost; treat as empty.

### XP Unit Construction

The XP asset unit is `policyId + assetName` (hex concatenated):

```typescript
const XP_UNIT = CARDANO_XP.xpToken.policyId + CARDANO_XP.xpToken.assetName;
// "722c475bebb106799b109fc95301c9b796e1a37b6afc601359d54a04" + "5850"
```

This matches Blockfrost's `unit` field format for native assets.

## Gotchas

1. **Blockfrost key is client-side** (`NEXT_PUBLIC_`). This is acceptable for read-only queries on a free-tier key with rate limiting. The same pattern is used by the wallet config.

2. **Initial version hardcoded `cardano-preprod`** in the URL. Caught in code review — would silently query wrong network on mainnet. Fixed by deriving from env var.

3. **`TreasuryBalanceCard` initially accepted a `treasuryAddress` prop** that always fell back to the same config constant. Removed the prop to eliminate dead logic.

## Files

- `src/hooks/use-treasury-balance.ts` — the hook
- `src/components/studio/treasury-balance-card.tsx` — card showing XP + ADA
- `src/app/(app)/xp/page.tsx` — public tokenomics page with live balance
- `src/app/(admin)/admin/project/treasury/page.tsx` — admin treasury page

## Related

- [Remove dynamic routes](remove-dynamic-routes-single-tenant.md) — the route refactor this was part of
- XP policy ID: `722c475bebb106799b109fc95301c9b796e1a37b6afc601359d54a04`
- Blockfrost API docs: address endpoint returns `amount[]` with `unit` + `quantity`
