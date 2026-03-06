---
title: XP Token Task Reward Integration
module: task-form, publishing, display, config
category: integration-issues
severity: enhancement
symptoms: >
  Tasks only paid ADA rewards. The native_assets field in ProjectData was always
  empty. No XP token awareness in the task form, publishing flow, or display layer.
  The tokenomics story (earn XP, build reputation, give to others) had no on-chain
  implementation.
root_cause: >
  The Andamio template's task system was designed for ADA-only rewards. The
  native_assets infrastructure existed (TaskToken type, ProjectData.native_assets
  field, computeTaskHash support) but was never wired up. No env var for the XP
  policy ID, no config for fixed ADA amount, no form field for XP quantity.
resolution_type: feature integration (config + form + publishing + display)
---

# XP Token Task Reward Integration

## Problem

The app's task system only handled ADA rewards. The `native_assets` field in `ProjectData` was always `[]`. Contributors couldn't see XP rewards, task creators couldn't set them, and the publishing/removal flows didn't handle native tokens.

## Solution

### Phase 1: Config & Environment

**`src/env.js`** — Added `NEXT_PUBLIC_XP_POLICY_ID: z.string().length(56)` as required.

**`src/config/cardano-xp.ts`** — Added XP token config and fixed ADA constant:
```typescript
xpToken: {
  policyId: env.NEXT_PUBLIC_XP_POLICY_ID,
  assetName: "5850", // hex-encoded "XP"
  displayName: "XP",
},
fixedAdaPerTask: 2_500_000, // 2.5 ADA in lovelace
```

**`src/lib/cardano-utils.ts`** — Added `formatXP()` utility (whole units, no decimal conversion).

### Phase 2: Task Form

**`src/components/studio/task-form.tsx`:**
- `TaskFormValues` gained `xpAmount: number`
- ADA input replaced with read-only "2.5 ADA" display (lovelace hardcoded from `CARDANO_XP.fixedAdaPerTask`)
- New XP input: integer, min 0, default 10
- Edit mode populates XP from `initialTask.tokens` by matching `CARDANO_XP.xpToken.policyId`

**API hooks** (`use-project-manager.ts`):
- `useCreateTask` and `useUpdateTask` accept optional `tokens` array
- Create/edit pages pass `[{ policy_id, asset_name, quantity }]` when `xpAmount > 0`

### Phase 3: Publishing & Treasury

**`manage-treasury/page.tsx`:**
- `tasksToAdd`: `native_assets` populated from `task.tokens` (was hardcoded `[]`)
- `tasksToRemove`: reconstructs `native_assets` from on-chain task tokens (was hardcoded `[]` — would have caused hash mismatch for XP tasks)
- Deposit calculation includes XP shortfall: `publishDepositValue` can contain both `["lovelace", amount]` and `["policyId.assetName", xpAmount]`

### Phase 4: Display

- **Task table** (`project/[projectid]/page.tsx`): gold XP badge alongside ADA badge
- **Stats bar**: shows available XP total with secondary color
- **Task detail** (`[taskhash]/page.tsx`): 4-column stats (ADA Reward, XP Reward, Expires, Created By)
- **Token rewards section**: renamed from "Additional Token Rewards" to "XP Reward", recognizes XP policy ID for branded display

## Key Discovery: Infrastructure Was Already There

The critical insight was that the Andamio template already had the native token infrastructure scaffolded:
- `TaskToken` type with `{ policyId, assetName, quantity }`
- `ProjectData.native_assets: ListValue` field
- `computeTaskHash` handling of native_assets tuples (splits on `.`, passes to Blake2b-256)
- Task detail page's "Additional Token Rewards" section (rendered if `task.tokens.length > 0`)
- Gateway API's `CreateTaskRequest.tokens` field (persists in draft tasks)

The work was wiring it up, not building it from scratch.

## Prevention Strategies

1. **Always reconstruct `native_assets` from task data for removals.** Never hardcode `[]` — it must match the on-chain datum exactly or the hash will mismatch.
2. **XP policy ID is required.** The env var is not optional. All environments need it set.
3. **Asset name is hex-encoded.** `"5850"` = hex for "XP". Must match the minting transaction.
4. **Fixed ADA is a constant, not a default.** `CARDANO_XP.fixedAdaPerTask` is the source of truth. Don't hardcode `2500000` elsewhere.

## Related Documents

- Implementation plan: `docs/plans/2026-03-15-feat-xp-token-task-rewards-plan.md`
- Tokenomics spec: `docs/tokenomics.md`
- Standalone identity: `docs/solutions/project-setup/template-to-standalone-product-identity.md`
- API spec: `~/projects/01-projects/andamio-api/openapi/specs/andamio-db-api.json` (CreateTaskRequest.tokens, ProjectTaskToken)

## Files Changed

| File | Change |
|------|--------|
| `src/env.js` | Added `NEXT_PUBLIC_XP_POLICY_ID` |
| `src/config/cardano-xp.ts` | Added `xpToken` config, `fixedAdaPerTask` |
| `src/lib/cardano-utils.ts` | Added `formatXP()` |
| `src/components/studio/task-form.tsx` | Locked ADA, added XP input, updated `TaskFormValues` |
| `src/hooks/api/project/use-project-manager.ts` | Added `tokens` to create/update mutations |
| `src/app/(studio)/.../draft-tasks/new/page.tsx` | Passes XP tokens to create API |
| `src/app/(studio)/.../draft-tasks/[taskindex]/page.tsx` | Passes XP tokens to update API |
| `src/app/(studio)/.../manage-treasury/page.tsx` | Wired `native_assets`, fixed removal, XP deposit calc |
| `src/app/(app)/project/[projectid]/page.tsx` | XP badges in table, XP stats |
| `src/app/(app)/project/[projectid]/[taskhash]/page.tsx` | XP stat card, renamed token section |
| `.env.example` | Documented `NEXT_PUBLIC_XP_POLICY_ID` |
