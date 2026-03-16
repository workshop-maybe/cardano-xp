---
title: "feat: Project wallet transparency page"
type: feat
status: active
date: 2026-03-16
---

# Project Wallet Transparency Page

## Overview

A public `/wallet` page that displays a dedicated Cardano wallet address, its ADA balance, a donate button, and a full transaction log. The wallet is a public record of what the project costs and what the community contributes back.

## Motivation

Transparency builds trust. Instead of asking people to take our word for how funds are used, the wallet page makes it verifiable. Anyone can see ADA in, ADA out, and check the explorer.

## Proposed Solution

Three vertical slices, each independently shippable:

1. **Address + Balance** — display the project wallet address with copy-to-clipboard, current ADA balance, and summary stats (total received, total spent)
2. **Donate CTA** — a prominent button that copies the address for donors to send ADA from their own wallet
3. **Transaction Log** — a table of all transactions in/out, labeled as "Received" or "Sent", with amounts, dates, and explorer links

## Technical Approach

### Config

Add the project wallet address to `src/config/cardano-xp.ts`:

```typescript
// src/config/cardano-xp.ts
projectWallet: {
  address: "addr_test1...", // or mainnet addr1...
},
```

Hardcoded constant, not an env var — this address is public and won't change per deployment. Add it to the existing `CARDANO_XP` object.

### Data Fetching

Use the existing Koios proxy at `/api/koios/[...path]`. No new API routes needed.

**Endpoints:**

| Koios Endpoint | Method | Purpose |
|---|---|---|
| `/address_info` | POST `{"_addresses": ["addr..."]}` | Current ADA balance |
| `/address_txs` | POST `{"_addresses": ["addr..."], "_after_block_height": 0}` | Transaction hash list |
| `/tx_info` | POST `{"_tx_hashes": ["hash1", ...]}` | Full tx details (inputs/outputs/timestamps) |

**New hook:** `src/hooks/api/use-project-wallet.ts`

- Fetches `address_info` for balance on mount
- Fetches `address_txs` then `tx_info` for the 20 most recent transactions
- Classifies each tx: if project address is in inputs → "Sent"; if only in outputs → "Received"
- Returns `{ balance, transactions, isLoading, error }`
- Net ADA per tx: sum outputs to/from the project address minus sum inputs from/to the project address

### Transaction Classification

Heuristic approach:

- **Received**: project address appears in outputs but NOT in inputs
- **Sent**: project address appears in inputs (net outflow shown)
- **Self-tx / change**: project address in both — show net movement, label as "Internal"

This is imperfect for complex multi-input transactions but correct for the common case and honest about what it shows.

### Page Structure

New file: `src/app/(app)/wallet/page.tsx` — client component (`"use client"`)

Follow the existing page pattern:

```
Header:    font-mono label + h1 + description
Stats:     3-stat grid (Balance / Total Received / Total Spent)
Donate:    CopyId with project address + AndamioButton "Copy Address"
Tx Log:    Table with columns: Date | Direction | Amount | Tx Hash
Empty:     "No transactions yet" state for fresh wallets
Loading:   Skeleton states while Koios responds
Error:     Graceful message if Koios is unreachable
```

### Navigation

Add to `src/config/navigation.ts`:

```typescript
{ name: "Wallet", href: "/wallet" }
```

Position: after the existing nav items.

### Explorer Links

Link tx hashes to CardanoScan, network-aware:

- Preprod: `https://preprod.cardanoscan.io/transaction/{txHash}`
- Mainnet: `https://cardanoscan.io/transaction/{txHash}`

### Components Reused

- `CopyId` — address display with copy-to-clipboard (existing)
- `AndamioButton` — donate CTA (existing)
- `formatLovelace()` / `formatAda()` — ADA formatting (existing in `~/lib/cardano-utils`)
- `AndamioSkeleton` — loading states (existing)

## Acceptance Criteria

- [x] Project wallet address stored in `src/config/cardano-xp.ts`
- [x] `/wallet` page renders with address, balance, and donate button
- [x] `CopyId` displays the address with click-to-copy
- [x] Balance fetched from Koios `address_info` via existing proxy
- [x] Transaction log shows 20 most recent transactions
- [x] Each transaction shows: date, direction (Received/Sent), ADA amount, tx hash link
- [x] Tx hash links to CardanoScan (network-aware)
- [x] Loading skeleton while data fetches
- [x] Error state if Koios is unreachable
- [x] Empty state for wallets with no transactions
- [x] "Wallet" appears in app navigation
- [x] Page follows existing layout conventions (hero header, sections, spacing)

## Edge Cases

- **Zero transactions**: show empty state with explanation
- **Koios down**: show error message, address and donate button still visible (static config)
- **Self-transactions**: label as "Internal", show net movement
- **Pagination**: "Load more" button fetches next 20 if more exist
- **Minimum UTXO**: no need to mention on the page — donors who use Cardano already know this

## Files to Create/Modify

| File | Action |
|---|---|
| `src/config/cardano-xp.ts` | Add `projectWallet.address` |
| `src/hooks/api/use-project-wallet.ts` | New — Koios data fetching hook |
| `src/app/(app)/wallet/page.tsx` | New — wallet transparency page |
| `src/config/navigation.ts` | Add Wallet nav item |

## What This Is Not

- Not an in-app donation flow (no tx building, no wallet connection required)
- Not a token tracker (ADA only, not XP or other native tokens)
- Not auto-refreshing (fetch on mount, manual refresh for V1)
