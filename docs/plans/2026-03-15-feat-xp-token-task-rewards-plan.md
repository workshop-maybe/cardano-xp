---
title: "feat: XP Token Task Rewards"
type: feat
status: active
date: 2026-03-15
---

# feat: XP Token Task Rewards

## Overview

Wire XP tokens into the task reward system. Every task pays 2.5 ADA (fixed, locked in UI) + N XP (variable, set by task creator). XP tokens are pre-minted with asset name "XP" (hex `5850`) and deposited into the project treasury. The existing Andamio transaction flow handles the rest.

## Problem Statement

The app has task infrastructure but no XP token awareness. Tasks only pay ADA. The `native_assets` field in `ProjectData` is always `[]`. Treasury only shows ADA balance. Contributors can't see XP rewards. The whole tokenomics story — earn XP, build reputation, give to others — has no on-chain implementation.

## Proposed Solution

Four phases:

1. **Config & env** — Add XP policy ID, asset name, fixed ADA amount
2. **Task form** — Lock ADA at 2.5, add XP input
3. **Publishing & treasury** — Wire XP into `native_assets`, enable XP treasury funding, fix deposit calculation and removal path
4. **Display** — Show XP rewards prominently across task table, task detail, stats bar, treasury card

## Technical Approach

### Phase 1: Config & Environment

**`src/env.js`** — Add required env var:
```typescript
NEXT_PUBLIC_XP_POLICY_ID: z.string().length(56),
```
Add to `runtimeEnv` mapping. Required — app won't build without it.

**`src/config/cardano-xp.ts`** — Add XP token config:
```typescript
export const CARDANO_XP = {
  // ...existing
  xpToken: {
    policyId: env.NEXT_PUBLIC_XP_POLICY_ID,
    assetName: "5850", // hex-encoded "XP"
    displayName: "XP",
  },
  fixedAdaPerTask: 2_500_000, // 2.5 ADA in lovelace
} as const;
```

**`.env.example`** — Add:
```
NEXT_PUBLIC_XP_POLICY_ID="your-xp-token-policy-id-56-chars"
```

**`src/lib/cardano-utils.ts`** — Add `formatXP()`:
```typescript
export function formatXP(quantity: number | string): string {
  const num = typeof quantity === "string" ? parseInt(quantity, 10) : quantity;
  if (isNaN(num)) return "0 XP";
  return `${num.toLocaleString()} XP`;
}
```

### Phase 2: Task Form

**`src/components/studio/task-form.tsx`:**

Update `TaskFormValues`:
```typescript
export interface TaskFormValues {
  title: string;
  content: string;
  lovelaceAmount: string;   // locked at 2_500_000
  xpAmount: string;         // NEW — integer, XP token quantity
  expirationTime: string;
  contentJson: JSONContent | null;
  preAssignedAlias: string | null;
}
```

UI changes:
- ADA input: replace with read-only display showing "2.5 ADA" — not an input field. Set `lovelaceAmount` to `"2500000"` in state, don't let users change it.
- XP input: new numeric input field. Integer only, minimum 0 (0 = ADA-only task). Default to a reasonable value (e.g., 10).
- Validation: `xpAmount` must be a non-negative integer. No upper bound enforced in form (treasury balance is the natural limit).
- `handleSubmit`: include `xpAmount` in the returned values.

When creating the task via API, pass tokens:
```typescript
tokens: xpAmount > 0 ? [{
  policy_id: CARDANO_XP.xpToken.policyId,
  asset_name: CARDANO_XP.xpToken.assetName,
  quantity: xpAmount.toString(),
}] : undefined
```

### Phase 3: Publishing & Treasury

**`src/app/(studio)/studio/project/[projectid]/manage-treasury/page.tsx`:**

Wire `native_assets` when building `ProjectData` (currently line 242):
```typescript
native_assets: task.tokens?.length
  ? task.tokens.map(t => [`${t.policyId}.${t.assetName}`, t.quantity])
  : [],
```

Update deposit calculation to include XP shortfall:
- Sum XP needed for all tasks being published
- Query treasury XP balance (parse `treasury_fundings[].assets` or API `treasuryBalance` if it includes assets)
- Calculate XP deposit needed from manager's wallet
- Add XP to `deposit_value`: `[["lovelace", adaDeposit], ["<policyId>.<assetName>", xpDeposit]]`

Fix removal path (currently hardcodes `native_assets: []`):
- For on-chain tasks being removed, reconstruct `native_assets` from `task.tokens`
- Same mapping as publish: `task.tokens.map(t => [policyId.assetName, qty])`

**Treasury XP funding:**
- The `TreasuryAddFunds` component needs to support depositing XP alongside ADA
- Add XP amount input to the treasury funding form
- Update `deposit_value` to include both `["lovelace", adaAmount]` and `["policyId.assetName", xpAmount]`

**`src/components/tx/tasks-manage.tsx`:**
- Keep `ProjectData` interface in sync with manage-treasury
- `computeTaskHash` already handles `native_assets` — no changes needed
- Update confirmation dialog text to mention XP amounts

### Phase 4: Display

**`src/app/(app)/project/[projectid]/page.tsx` — Task table:**
- Reward column: show two badges side-by-side: ADA badge + XP badge (if tokens present)
- Stats bar: add "Available XP" stat alongside "Available Rewards" (ADA)
- Use `formatXP()` for XP display, recognize XP policy ID from `CARDANO_XP.xpToken.policyId`

**`src/app/(app)/project/[projectid]/[taskhash]/page.tsx` — Task detail:**
- Add XP stat card in the stats row alongside the ADA "Reward" stat
- Rename "Additional Token Rewards" section to "XP Reward" (this is a single-purpose app)
- Show XP with gold secondary color for visual emphasis

**`src/components/studio/treasury-balance-card.tsx`:**
- Parse `TreasuryFunding.assets` to extract XP balance
- Display XP balance below ADA balance
- Type `TreasuryFunding.assets` properly in `use-project.ts` (currently `unknown`)

**`src/hooks/api/project/use-project.ts`:**
- Type `TreasuryFunding.assets` as `Array<{ policy_id: string; name: string; amount: number }>` (or similar)

## Acceptance Criteria

- [ ] `NEXT_PUBLIC_XP_POLICY_ID` env var required, validated as 56-char hex string
- [ ] `CARDANO_XP.xpToken` config provides policyId, assetName, displayName
- [ ] Task form: ADA locked at 2.5 (read-only display), XP amount input (integer, min 0)
- [ ] Task form: XP amount passed to API when creating/editing draft tasks
- [ ] Publishing: `native_assets` populated with XP token data for tasks with XP > 0
- [ ] Publishing: deposit calculation includes XP shortfall from treasury
- [ ] Removal: `native_assets` reconstructed from on-chain task tokens (not hardcoded `[]`)
- [ ] Treasury funding: can deposit both ADA and XP tokens
- [ ] Task table: shows XP reward badge alongside ADA badge
- [ ] Task detail: XP stat card in stats row, XP reward section with branding
- [ ] Stats bar: shows aggregate available XP
- [ ] Treasury card: shows XP balance alongside ADA
- [ ] Backward compatibility: tasks without tokens still display correctly
- [ ] Build passes with XP policy ID set in env

## Dependencies & Risks

**Risk: Gateway API token persistence.** The plan assumes `CreateTaskRequest.tokens` persists token data in draft tasks and returns it in task list/detail responses. If the Gateway only populates `task.tokens` from on-chain data, draft tasks won't show XP amounts. Verify this before implementing Phase 2.

**Risk: Treasury asset balance query.** The current API may not return native asset balances for the treasury in a clean format. If `TreasuryFunding.assets` is empty or malformed, the deposit calculation and treasury card will need a different data source (e.g., direct chain query via Blockfrost).

**Risk: Asset name encoding.** Using hex `5850` for "XP". Must match the minting transaction exactly. Verify by inspecting the minted token on-chain before deploying.

**Dependency: XP tokens must be minted before this feature is usable.** The app will build and display the UI, but tasks can't actually pay XP until tokens exist and are funded into the treasury.

## Sources & References

- Tokenomics spec: `docs/tokenomics.md`
- Task form: `src/components/studio/task-form.tsx`
- Task publishing: `src/app/(studio)/studio/project/[projectid]/manage-treasury/page.tsx`
- Tasks manage TX: `src/components/tx/tasks-manage.tsx`
- Project page: `src/app/(app)/project/[projectid]/page.tsx`
- Task detail: `src/app/(app)/project/[projectid]/[taskhash]/page.tsx`
- Treasury card: `src/components/studio/treasury-balance-card.tsx`
- API types: `src/hooks/api/project/use-project.ts`
- XP config: `src/config/cardano-xp.ts`
- Env schema: `src/env.js`
- Cardano utils: `src/lib/cardano-utils.ts`
