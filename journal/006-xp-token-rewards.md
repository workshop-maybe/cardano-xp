# 006 — XP Token Rewards: Wiring the Tokenomics Into Tasks

**Date:** 2026-03-15

## What happened

Integrated XP tokens into the task reward system. Every task now pays 2.5 ADA (fixed) + N XP (variable, set by task creator). This is the first on-chain implementation of the tokenomics spec — the feedback loop is real now.

### The key insight

The Andamio template already had the infrastructure. `TaskToken` type, `ProjectData.native_assets` field, `computeTaskHash` handling of native assets, the "Additional Token Rewards" display section, even the Gateway API's `CreateTaskRequest.tokens` field — all scaffolded, never wired up. The work was connecting the dots, not building from scratch.

### What we built

**Config layer:**
- `NEXT_PUBLIC_XP_POLICY_ID` env var (required, 56-char hex)
- `CARDANO_XP.xpToken` — policy ID, asset name (`5850` = hex "XP"), display name
- `CARDANO_XP.fixedAdaPerTask` = 2,500,000 lovelace (2.5 ADA)
- `formatXP()` utility for display

**Task form:**
- ADA locked at 2.5 — read-only display, not an input. Task creators can't change it.
- New XP amount input — integer, default 10. This is what task creators control.
- Edit mode populates XP from existing task tokens by matching the XP policy ID.

**Publishing flow:**
- `native_assets` populated from `task.tokens` when publishing (was always `[]`)
- Removal path reconstructed from on-chain task tokens (was hardcoded `[]` — would have broken for XP tasks)
- Deposit calculation includes XP shortfall alongside ADA

**Display:**
- Task table: gold XP badge next to ADA badge
- Stats bar: available XP total with secondary color
- Task detail: 4-column stats including XP Reward
- Token section renamed to "XP Reward" with branded display

### The API verification

Before building, we checked the Andamio API spec (in the `api` repo) and confirmed:
- `CreateTaskRequest.tokens` persists token data in draft tasks
- `UpdateTaskRequest.tokens` allows updating tokens on drafts
- Responses include enriched token metadata (`asset_name_decoded`, `ticker`, `decimals`)
- On-chain layer uses `"policyId.tokenName"` format — matches `computeTaskHash`

This meant we could safely pass tokens from the form through the full lifecycle: create draft → edit draft → publish on-chain → display → remove.

### The removal bug we prevented

The existing removal code hardcoded `native_assets: []` for all tasks. This works for ADA-only tasks, but after XP integration, on-chain tasks have non-empty `native_assets`. The removal hash must match the on-chain datum exactly — wrong `native_assets` = hash mismatch = silent failure. We fixed this before it could cause problems.

## What changed

- `src/env.js` — `NEXT_PUBLIC_XP_POLICY_ID`
- `src/config/cardano-xp.ts` — `xpToken`, `fixedAdaPerTask`
- `src/lib/cardano-utils.ts` — `formatXP()`
- `src/components/studio/task-form.tsx` — locked ADA, XP input, `TaskFormValues.xpAmount`
- `src/hooks/api/project/use-project-manager.ts` — `tokens` in create/update
- `src/app/(studio)/.../draft-tasks/new/page.tsx` — passes XP tokens
- `src/app/(studio)/.../draft-tasks/[taskindex]/page.tsx` — passes XP tokens
- `src/app/(studio)/.../manage-treasury/page.tsx` — `native_assets`, deposit calc, removal fix
- `src/app/(app)/project/[projectid]/page.tsx` — XP badges, stats
- `src/app/(app)/project/[projectid]/[taskhash]/page.tsx` — XP stat, renamed section
- `.env.example` — documented XP policy ID

## Decisions

| Decision | Why |
|----------|-----|
| Fixed 2.5 ADA per task | Keeps pricing simple. All tasks cost the same in ADA. XP is the variable signal. |
| ADA is read-only, not hidden | Task creators should see what the ADA reward is, they just can't change it. |
| XP default is 10 | Reasonable starting point. No enforced maximum — treasury balance is the natural limit. |
| Asset name `5850` (hex "XP") | Standard Cardano hex encoding for native token names. Must match minting transaction. |
| Required env var | This is a single-purpose XP app. No point making it optional. |

## What's next

- Mint XP tokens and fund the project treasury
- Treasury balance card should show XP alongside ADA
- `TreasuryAddFunds` needs native asset deposit capability
- Live earning dashboard (from tokenomics spec)
- Give flow (user-to-user XP transfers)
