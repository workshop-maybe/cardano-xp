---
date: 2026-03-28
topic: open-ideation
focus: open-ended
---

# Ideation: Open-Ended Cardano XP Improvements

## Codebase Context

**Project shape:** TypeScript/Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS v4, tRPC. Standalone Cardano feedback-for-XP-tokens app, forked from Andamio app template. Key deps: MeshJS SDK (Cardano wallets), Radix UI + shadcn, TipTap, Recharts, Zustand, React Query.

**Current state:** Template-to-product transformation essentially complete (7 solution docs chronicle this journey). Server-side prefetch architecture freshly established. Current branch: `refactor/data-loading-performance`. Build journal has 12 entries. 20 solution documents capture institutional knowledge across 6 themes.

**Key risk surfaces:**
- Token encoding boundaries (hex vs decoded) caused 3 HIGH-severity bugs
- Transaction state machine has timeout/error recovery but complex cleanup lifecycle
- Leaderboard grouped-task attribution is a documented limitation
- 100k fixed XP supply with no exhaustion protection
- Heavy template-origin dependency surface (35+ Radix primitives, 15 TipTap packages, dnd-kit, recharts)

**Past learnings themes:**
1. Template-to-product impedance mismatch (7 docs)
2. Cardano native asset encoding boundaries (4 docs)
3. Server-side prefetch + hydration architecture (2 docs)
4. Transaction state machine + error handling (2 docs)
5. Design system + visual identity (3 docs)
6. Blockchain integration patterns (2 docs)

## Ranked Ideas

### 1. CIP-68 Credential Datum with XP Snapshot
**Description:** Store the XP count at credential-claim time in the on-chain CIP-68 datum, making credentials independently verifiable with magnitude — not just binary "participated." Currently credentials prove participation but not scale: a 500 XP contributor and a 5 XP contributor mint identical tokens.
**Rationale:** The composability story ("other projects can set prerequisites based on your XP balance") depends on encoding how much XP was earned, not just that some was. Getting this right now, while few credentials exist, avoids a breaking migration later. The tokenomics doc explicitly specifies datum-embedded XP counts.
**Downsides:** Requires understanding CIP-68 datum construction with `@andamio/core`. May need gateway API changes if datum content isn't client-controlled.
**Confidence:** 80%
**Complexity:** Medium
**Status:** Unexplored

### 2. Supply Exhaustion Cliff Protection
**Description:** Add a pre-transaction treasury balance check before task commitment. When the 100k fixed supply runs low, prevent task creation/commitment that promises XP the treasury can't deliver.
**Rationale:** The only predictable failure mode of success. Without this, contributors commit work, submit feedback, get assessed as ACCEPTED, then the on-chain payout fails with INSUFFICIENT_FUNDS — after they already did the work. The hex encoding bugs (3 HIGH-severity incidents) prove token arithmetic is fragile in this codebase.
**Downsides:** Requires defining what "too low" means. Race condition if multiple tasks commit simultaneously.
**Confidence:** 85%
**Complexity:** Low
**Status:** Unexplored

### 3. Give Graph — Scoped to Transfer Flow
**Description:** Build the peer-to-peer XP transfer transaction (select alias, specify amount, sign). The tokenomics doc calls this "the differentiator" — where XP becomes a social signal rather than just a badge. Scope to the transfer mechanic first; visualization comes later.
**Rationale:** Without peer-to-peer giving, XP is functionally identical to every other task-completion badge. The transfer flow is what makes the 100k fixed supply interesting — it creates a secondary recognition economy. Zero implementation exists despite being the project's stated thesis.
**Downsides:** Requires a new transaction type in the gateway. Most ambitious idea on the list. Scope discipline is critical.
**Confidence:** 60%
**Complexity:** High
**Status:** Unexplored

### 4. Server-Side Leaderboard Attribution Fix
**Description:** Use the authenticated manager commitments endpoint server-side (via a service-level fetch with caching) to build accurate per-submission XP attribution, solving the grouped-task ambiguity documented in `leaderboard-content.tsx:48-50`.
**Rationale:** The leaderboard is the public face of the reputation system. The current client-side computation joins by `taskHash` alone, which credits all submitters of a grouped task when any one is accepted. The fix path is documented, the server prefetch infrastructure just landed, and the data source exists.
**Downsides:** May require a service JWT or API key for server-side access to the manager endpoint. Adds a server dependency for what's currently a pure client computation.
**Confidence:** 75%
**Complexity:** Medium
**Status:** Unexplored

### 5. Build Journal as First-Class App Route
**Description:** Render the 12 journal entries at `/journal` inside the app, not just as GitHub links. Each entry gets its own URL, linked from navigation.
**Rationale:** The project thesis is "the process IS the product." But the process currently lives on GitHub where only developers will find it. Surfacing it inside the app makes the reproducibility claim verifiable by the same audience being asked to give feedback. `markdown-it` is already a dependency, `@tailwindcss/typography` is installed, and Next.js MDX support makes this trivially achievable.
**Downsides:** Small audience. Developers comfortable reading markdown on GitHub may not see added value.
**Confidence:** 70%
**Complexity:** Low
**Status:** Unexplored

### 6. Transaction Pipeline Resilience (Two Fixes)
**Description:** (a) Add a maximum-wait timeout for the pending-to-confirmed phase in `tx-watcher-store.ts` — currently there's a 30s timeout for confirmed-to-updated but none for pending, creating a 15-minute silent poll. (b) Persist txHash to localStorage before `wallet.submitTx` in `use-transaction.ts` and reconcile on next load — currently a browser crash between submit and registerTransaction means the credential exists on-chain but is invisible to the app.
**Rationale:** Both are concrete gaps in the transaction lifecycle identified by tracing actual code paths. The SSE timeout fix was already applied for confirmed-to-updated after discovering infinite hangs — the same architectural insight applies to pending-to-confirmed.
**Downsides:** localStorage reconciliation requires detecting "orphaned" transactions and has its own edge cases.
**Confidence:** 80%
**Complexity:** Low-Medium
**Status:** Unexplored

### 7. Lazy-Load TipTap Editor
**Description:** Extract the 38-file, 15-package TipTap editor system behind a single `dynamic()` import boundary. Read-only content pages (90% of traffic) should never download the editor bundle.
**Rationale:** TipTap is the single largest dependency cluster. The editor is only used for admin content authoring and contributor evidence submission. Every other page pays the bundle cost for nothing. Next.js `dynamic()` is well-understood.
**Downsides:** Must ensure the read-only content renderer doesn't depend on TipTap's React editor. May need a lightweight HTML renderer for content display.
**Confidence:** 85%
**Complexity:** Low
**Status:** Unexplored

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | Branded types for token boundary | Scope too small for the ceremony; policyId-only matching already works |
| 2 | Kill template dependency bloat | Valid but generic housekeeping; subsumed by TipTap lazy-load (the biggest win) |
| 3 | Unit test harness for pure functions | Standard hygiene; not a product improvement |
| 5 | Documentation state machine | Overhead disguised as simplification; no user-visible benefit |
| 7 | Contributor page state machine | Page works; no documented bugs from the current useState approach |
| 8 | Interactive supply dynamics model | Gold-plated version of a problem with no user demand yet; supply cliff protection addresses the real risk |
| 9 | Critical patterns as executable enforcement | Too vague; conflates ESLint rules and branded types without specifics |
| 11 | Replay-verified build journal | Engineering vanity; no user benefits from deterministic build checks |
| 12 | Delete Andamio wrapper layer | 77 files, every page touched; high regression risk for zero user-visible benefit |
| 14 | Generate API client from OpenAPI spec | Migration cost understated; generated clients fight React Query patterns |
| 15 | Kill docs pipeline for git commits | Loses design rationale and "why not" reasoning that commits can't capture |
| 16 | AbortController-only tx cleanup | Refactoring for aesthetic consistency, not correctness |
| 17 | Auto-writing build journal via git hook | Produces changelogs, not journal entries; removes the human narrative that gives the journal value |
| 18 | Kill leaderboard, ship contribution graph | Depends on give graph which doesn't exist yet; two premature ideas stacked |
| 20 | Drop single-tenant assumption | Platform rewrite disguised as a feature; experiment hasn't validated the model yet |
| 21 | Transaction sponsorship as default | Still being prototyped at platform level; premature dependency |
| 22 | Credential as composable resume | Depends on CIP-68 datum being built first; sequence after idea #1 |
| 23 | Unified treasury/wallet page | Creates a mega-page, not clarity; three data sources don't merge cleanly |
| 24 | Extract shared transform layer | File reorganization with theoretical benefit; do it when a specific need arises |
| 25 | Solution docs as public knowledge base | Internal debugging notes aren't user-facing content |
| 27 | Adversarial leaderboard gaming via Sybil | Threat model for unbuilt feature (XP transfers don't exist yet) |
| 29 | Credential reputation amplification attack | Same — depends on give feature that hasn't been built |
| 30 | Dual data source failover | No second data source exists; building one isn't justified for preprod |
| 31 | Real-time on-chain event feed leaderboard | Conflates per-TX SSE with project-level events; different systems |
| 32 | Pre-assignment metadata for XP-gated tasks | Metadata without on-chain enforcement is false access control |

## Session Log
- 2026-03-28: Initial open-ended ideation — 48 raw ideas from 6 sub-agents, 33 unique after dedup, 7 survived adversarial filtering (2 critique passes: pragmatism/value + novelty/ambition)
