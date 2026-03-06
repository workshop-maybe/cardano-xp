---
title: "Fix COURSE_STUDENT_ASSIGNMENT_COMMIT 500 error from Atlas TX API"
date: 2026-03-22
category: runtime-errors
tags:
  - on-chain-tx
  - assignment-commit
  - atlas-tx-api
  - blake2b-hashing
  - andamio-gateway
  - andamioscan-indexer
  - initiator-data
severity: high
components:
  - src/components/learner/assignment-commitment.tsx
  - src/components/learner/assignment-commitment-shared.tsx
  - src/lib/hashing.ts
  - src/app/api/gateway/[...path]/route.ts
---

# Fix COURSE_STUDENT_ASSIGNMENT_COMMIT 500 Error

## Problem

The COURSE_STUDENT_ASSIGNMENT_COMMIT transaction consistently returned a 500 error from the Andamio Gateway's Atlas TX API, preventing learners from submitting feedback on-chain. The evidence payload was saved to the database successfully (200), but the on-chain TX build failed.

```
POST /api/gateway/api/v2/tx/course/student/assignment/commit 500
"Atlas TX API error: 500 Internal Server Error"
```

Three independent root causes were compounding into a single 500 error.

## Investigation Steps

1. **Traced the TX flow end-to-end:** UI component -> gateway proxy (`/api/gateway/`) -> Andamio Atlas API. Identified three layers where failure could originate.

2. **Compared assignment commit against working TX components:** Diffed `assignment-commitment.tsx` against known-working components (`credential-claim`, `task-commit`, `create-course`) to spot structural differences in how TX params were assembled.

3. **Audited hashing implementations:** Compared the local `hashNormalizedContent()` in `src/lib/hashing.ts` against `computeAssignmentInfoHash` from `@andamio/core/hashing`. Found divergent normalization (whitespace trimming) and encoding (`Buffer.from` vs `TextEncoder`), producing different hashes for identical input.

4. **Tested the API directly with curl:** Sent correctly-formed params to the Andamio Atlas API, bypassing the frontend entirely. Still received 500, confirming a backend issue existed independently of the frontend bugs.

5. **Escalated to ops:** Once curl reproduced the 500 with verified-correct params, escalated the backend indexer issue to the ops team for resolution.

## Root Causes

| # | Layer | Cause | Impact |
|---|-------|-------|--------|
| 1 | Frontend — Hashing | Local `hashNormalizedContent()` produced hashes that differed from `@andamio/core`'s `computeAssignmentInfoHash`. The local version skipped whitespace trimming and used `Buffer.from` instead of `TextEncoder`. | Hash verification failed because the submitted hash did not match what the validator expected. |
| 2 | Frontend — Missing wallet data | `COURSE_STUDENT_ASSIGNMENT_COMMIT` TX params omitted `initiator_data` (wallet addresses). The Zod schema marked it optional, but Atlas needs `used_addresses` and `change_address` to locate UTxOs for TX building. | Atlas API could not find the user's UTxOs, causing TX construction to fail. |
| 3 | Backend — Indexer | The Andamioscan indexer on preprod had a data issue for this specific course, preventing TX building even with correct params. | 500 error returned regardless of frontend correctness. |

## Fixes Applied

### Fix 1 — Replace local hashing with canonical implementation

Replaced all imports of `hashNormalizedContent` with `computeAssignmentInfoHash` from `@andamio/core/hashing`. Deleted `src/lib/hashing.ts` as dead code.

```typescript
// Before
import { hashNormalizedContent } from "~/lib/hashing";
const hash = hashNormalizedContent(localEvidenceContent);

// After
import { computeAssignmentInfoHash } from "@andamio/core/hashing";
const hash = computeAssignmentInfoHash(localEvidenceContent);
```

### Fix 2 — Add initiator_data to TX params

Added wallet address fetching via `useWallet()` and passed `initiator_data` to both commit and update TX params.

```typescript
const { wallet, connected } = useWallet();
const [initiatorData, setInitiatorData] = useState<{
  used_addresses: string[];
  change_address: string;
} | null>(null);

const fetchInitiatorData = useCallback(async () => {
  if (!connected || !wallet) return;
  const changeAddress = await wallet.getChangeAddressBech32();
  let usedAddresses: string[];
  try { usedAddresses = await wallet.getUsedAddressesBech32(); }
  catch { usedAddresses = [changeAddress]; }
  setInitiatorData({ used_addresses: usedAddresses, change_address: changeAddress });
}, [connected, wallet]);

useEffect(() => { void fetchInitiatorData(); }, [fetchInitiatorData]);

// In TX params
params: {
  ...otherParams,
  initiator_data: initiatorData ?? undefined,
},
```

### Fix 3 — Backend indexer (ops team)

No frontend change. The ops team resolved the Andamioscan indexer issue on preprod.

## Diagnosis Methodology

1. **Pattern comparison:** Diffing the broken component against working TX components revealed the missing `initiator_data` immediately.

2. **Layer isolation:** Testing each layer independently (frontend hashing in isolation, then curl to API bypassing frontend) separated three independent causes compounding into one 500.

3. **Canonical source principle:** The hashing discrepancy was caught by asking "why does this repo have its own hashing function when `@andamio/core` exports one?"

4. **Schema vs. practice divergence:** The Zod schema marked `initiator_data` as optional, but every working TX in practice included it. Schema optionality does not mean "safe to omit."

## Prevention Strategies

### Never duplicate core library functions

Always import hashing from `@andamio/core`. Any PR that imports `blakejs` or contains `blake2b` outside of `node_modules/@andamio/core` should be flagged for review. If `@andamio/core` doesn't expose the function you need, extend the core library upstream rather than writing a local shim.

### Use structural consistency across TX types

If a field like `initiator_data` is present in N-1 out of N transaction types, the one that omits it is almost certainly a bug. Consider a shared base Zod schema that all TX types extend, so removing a common field breaks everywhere at once.

### Isolate frontend from backend on any 500

The diagnostic sequence for any 500:
1. Copy the failing request as curl from DevTools
2. Run it from terminal — if 500 reproduces, the problem is backend
3. If backend, curl the underlying service directly (Andamioscan, Atlas) to narrow further
4. If frontend, diff the payload against a known-good TX type

### Log TX params in development

In dev mode, log the complete parameter object sent to the backend. When a 500 occurs, the first thing you need is "what exactly did I send?"

## Key Takeaway

| Cause | One-line prevention |
|---|---|
| Hash drift | Never implement hashing locally; always import from `@andamio/core` |
| Missing TX params | Use a shared base Zod schema that all TX types extend |
| Backend indexer bug | Curl the API directly as the first diagnostic step on any 500 |

## Commits

- `ec1753e` — Hash fix + initiator_data addition
- `e884217` — Dead code cleanup (deleted local hashing module)
