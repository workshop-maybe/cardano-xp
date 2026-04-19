---
title: "feat: XP activity dashboard — landing strip + /xp/activity page + waitlist"
type: feat
status: active
date: 2026-04-18
origin: docs/brainstorms/2026-04-18-xp-activity-dashboard-requirements.md
---

# feat: XP activity dashboard — landing strip + /xp/activity page + waitlist

## Overview

Ship the public XP Activity Dashboard for issue #43. Two user-facing surfaces — a landing strip on `/` and a dedicated `/xp/activity` page — surface current activity (contributors, tasks completed, XP released, pending reviews, recent accepted assessments) and tell the multi-project trajectory story (Assignment 1 → earn XP → Assignment 2 → mint a project token to launch). A shared email-capture form collects "notify me when project posting opens" interest.

v1's job is **trajectory declaration**, not social-proof-of-current-momentum (see origin: `docs/brainstorms/2026-04-18-xp-activity-dashboard-requirements.md` — Problem Frame). Current activity metrics are a supporting signal; the declared future is the load-bearing claim.

## Problem Frame

Cardano XP is invisible from outside. A new visitor sees a sign-up flow with no sense of where the product is going. The reporter (dcm) asked for "projects, contributors, activity" — the dashboard reframes this single-project-today as the first step of the multi-project vision and captures interest in the future mechanism via an email waitlist.

Full context, problem statement, reporter-framing reconciliation, and the "trajectory not momentum" reframe are in the origin requirements document.

## Requirements Trace

Direct map from the origin document:

- **R1** — Landing strip: 3 live metrics (contributors, tasks completed, XP released / 100k), graceful near-zero states (see origin: R1).
- **R2** — Landing tagline naming the future mechanism without numbers (see origin: R2).
- **R3** — Primary "Notify me" inline-reveal CTA + secondary "See all activity →" link (see origin: R3).
- **R4** — New public route `/xp/activity` sibling to `/xp/leaderboard` (see origin: R4).
- **R5** — Activity page: hero narrative + metrics (same 3 + pending-reviews) + recent-accepted-assessments list (last 5–10 by slot desc) + "What's next" mechanism block + form. On-chain-untrusted rendering per `src/lib/alias-validation.ts` (see origin: R5).
- **R6** — API route `/api/project-posting-waitlist`: email-only zod-validated POST, two Resend emails (james notification + submitter confirmation), per-IP rate limit, bot honeypot, Resend-key guard, privacy disclosure text in the UI (see origin: R6).
- **R7** — Single shared form component across both surfaces with explicit interaction states (idle/typing/submitting/success/error-network/error-invalid/already-submitted via sessionStorage) + mobile stack (see origin: R7).
- **R8** — Server-side prefetch + `HydrateClient`. `src/app/page.tsx` converts to async server component with `src/app/page-content.tsx` holding the existing client logic. Matches `/xp/page.tsx + xp-content.tsx` pattern (see origin: R8).
- **R9** — Single branch + PR, no Claude Code attribution. Pre-merge: one-line DM to dcm confirming single-project framing (see origin: R9).

## Scope Boundaries

Carried directly from the origin document:

- No time-series charts, per-task drill-downs, or per-contributor history pages.
- No Assignment 2 content, project-token mint flow, or related mechanism implementation — the PR only *tells the story*.
- No database persistence of waitlist emails — inbox-based via Resend.
- No automated bulk announcement pipeline when the feature ships — v1 supports only per-submission confirmation.
- No verified Resend sender domain — flagged for pre-volume follow-up.
- No i18n / alternate copy variants.
- No moderation/spam-flagging on the activity feed.

### Deferred to Separate Tasks

- **Assignment 2 content:** separate iteration.
- **Project-token mint flow:** separate technical track.
- **Automated bulk waitlist announcement:** follow-up PR if list grows.
- **XP threshold + project-token ADA cost decisions:** separate product decisions.
- **Verified Resend sender domain (cardano-xp.io SPF/DKIM):** ~15-min infra task; do before community-facing email at volume.
- **Upgraded rate-limit mechanism (Vercel KV or `@upstash/ratelimit`):** follow-up if in-memory per-instance rate limit proves insufficient under abuse.

## Context & Research

### Relevant Code and Patterns

**Server-side aggregation pattern (to mirror):**
- `src/lib/xp-leaderboard.ts` — `computeLeaderboard()` fetches `MergedProjectDetail` via `gatewayFetch`, aggregates per-alias XP totals. Includes `server-only` import, gateway fetch with 10s timeout, accepted-assessment filter via `decision.toUpperCase().startsWith("ACCEPT")`.
- `gatewayFetch` helper inside `xp-leaderboard.ts` — if a second caller emerges in this plan, extract to a shared `src/lib/gateway-server.ts` (already exists for `safePath`) — evaluate at execution time.

**Async-server-wrapper + client-content split pattern (to mirror for `page.tsx` restructure):**
- `src/app/(app)/xp/page.tsx` — async default export, prefetches via `queryClient.prefetchQuery` in try/catch, wraps render in `<HydrateClient>`, imports `XPContent` from `./xp-content.tsx`.
- `src/app/(app)/xp/xp-content.tsx` — `"use client"`, uses `useProject` hook against the prefetched cache.

**Resend-email-on-submit pattern (to mirror for waitlist API):**
- `src/app/api/sponsor-contact/route.ts` — zod schema, `env.RESEND_API_KEY` guard (returns 503 when missing), `resend.emails.send()`, returns `{ success: true }` on success. Sends from `Cardano XP <onboarding@resend.dev>` to `james@andamio.io`.

**Client form component pattern (reference, not strict mirror):**
- `src/app/(app)/sponsors/sponsor-contact-form.tsx` — the shape of a fetch-post + state-machine + success/error UI form component. The new form is simpler (one field, one checkbox honeypot).

**Untrusted on-chain rendering:**
- `src/lib/alias-validation.ts` — JSDoc threat model; React JSX interpolation only, `encodeURIComponent` for URL params, never `dangerouslySetInnerHTML`.
- `src/components/ui/chart.tsx` — the one allowed `dangerouslySetInnerHTML` site, allowlisted in `scripts/audit-unsafe-sinks.sh`.

**Public-route auth-free precedent:**
- `src/app/(app)/xp/leaderboard/` — public, no `ConnectWalletGate`.
- `src/app/(app)/project-wallet/` — public, no `ConnectWalletGate`.

**Slot-to-date conversion:**
- `src/lib/cardano-utils.ts` — `slotToDate(slot, network)` with Shelley-era genesis map for mainnet/preprod/preview. Use for human-readable "recent assessments" timestamps.

**Design system components (all existing, prefer these over inline Tailwind):**
- `AndamioCard`, `AndamioCardContent`, `AndamioCardHeader`, `AndamioCardTitle`, `AndamioCardDescription` — card layout.
- `AndamioDashboardStat` — used on leaderboard for stat displays; likely the right component for the three landing numbers.
- `AndamioPageLoading`, `AndamioErrorAlert`, `AndamioPageHeader`, `AndamioText`, `AndamioBadge`, `AndamioButton`, `AndamioInput`, `AndamioLabel`, `AndamioAlert`, `AndamioAlertDescription` — standard primitives.

**Routes config:**
- `src/config/routes.ts` — `PUBLIC_ROUTES` constant; add `activity` entry pointing at `/xp/activity`.

**Nav surface:**
- `src/components/layout/app-nav-bar.tsx` — likely needs the `/xp/activity` entry. If the leaderboard has a direct nav link, mirror it. If leaderboard is only linked from `/xp`, add the activity link there instead (decide at execution time by reading the nav structure).

### Institutional Learnings

- `docs/solutions/performance-issues/page-loading-provider-waterfall-prefetch-overhaul.md` — the `HydrateClient` + server-prefetch pattern documented here; follow for Units 3 and 4.
- `docs/solutions/performance-issues/server-prefetch-hydration-expansion-dedup-sanitization.md` — establishes `safePath` for server-side path sanitization; reinforces the "untrusted input" thinking already codified in `alias-validation.ts`.
- `docs/brainstorms/2026-03-22-xp-leaderboard-brainstorm.md` — the "reputation token, visibility is the point" framing this feature extends.

### External References

None. Patterns all local.

## Key Technical Decisions

- **New module `src/lib/xp-activity.ts`** rather than extending `xp-leaderboard.ts`. Output shape differs (stats block + recent-assessments list vs ranked-rows leaderboard); sharing via the same module would require conditional branches for different callers. Small duplication of gateway-fetch + accepted-filter logic is acceptable; extract to a shared helper only if a third caller emerges.
- **Email form is a standalone component**, not a generalized primitive. It collects one field and calls one endpoint. Premature abstraction would cost more than the duplication it saves. Name mirrors its use-case: `src/components/xp/project-posting-waitlist-form.tsx`.
- **Landing placement: below the hero, inside a new scroll region.** `src/app/page.tsx` today is `h-dvh overflow-y-auto` centering a single panel. The landing strip changes this: the page becomes legitimately scrollable (hero → activity strip → optional future sections → footer). This is a layout change, not an additive one — the implementer must touch the page container, not just append.
- **Rate limit: in-memory per-instance best-effort.** Vercel serverless isolates memory per instance; in-memory rate limiting is not globally consistent. v1 treats rate limiting as defense-in-depth against casual abuse (most bots hit one IP repeatedly; honeypot catches cross-IP automation). Documented clearly. Upgrade to Vercel KV or `@upstash/ratelimit` is a deferred follow-up if abuse happens.
- **Recent assessments timestamp format: human-readable via `slotToDate`.** Raw slot numbers are unintelligible to visitors. Format: relative ("2 hours ago") or absolute ("Apr 18") — pick one at execution time; a simple `Intl.RelativeTimeFormat` call is low-cost.
- **Shared form sessionStorage key** prevents re-submission in the same browser session: `sessionStorage.setItem("xp_waitlist_submitted", "1")` on success, form renders the success state on mount if present. Not a hard dedup — user can clear storage or use a different browser — but prevents accidental double-submits. Matches the R7 "already-submitted" state.
- **No new dependency.** Everything uses existing packages: `resend` (installed for sponsor-contact), `zod`, `@tanstack/react-query`, `next/server`.

## Open Questions

### Resolved During Planning

All "Deferred to Planning" items from the origin document:

- *Exact placement of landing section:* below the hero, new scroll region.
- *Form component shape:* standalone at `src/components/xp/project-posting-waitlist-form.tsx`.
- *Data module split:* new module `src/lib/xp-activity.ts`.
- *Rate limit mechanism:* in-memory per-instance with sliding window; documented as best-effort.
- *Timestamp format:* human-readable via `slotToDate`.

### Deferred to Implementation

- Exact copy for R2 (landing tagline) and R5 (hero narrative, "What's next" block). Drafted in the PR body and tuned on review, per the pattern used on PR #47 (#40).
- Whether "relative time" ("2 hours ago") vs "absolute date" ("Apr 18") is the right recent-assessment timestamp format — implementer picks based on how the list looks with real data.
- Whether nav entry for `/xp/activity` goes in the top nav, on the `/xp` page only, or both — decide by reading the current nav structure.
- Whether `gatewayFetch` moves out of `xp-leaderboard.ts` into a shared `src/lib/gateway-server.ts` helper, or the new `xp-activity.ts` duplicates it. Three-caller threshold; decide at execution time.
- Exact sliding-window implementation for the rate limiter. A simple `Map<string, number[]>` is sufficient; any cleanup/eviction detail is implementation, not design.

## Output Structure

New files created by this plan (modifications to existing files not shown):

```
src/
├── app/
│   ├── (app)/
│   │   └── xp/
│   │       └── activity/
│   │           ├── page.tsx              (new, async server component)
│   │           └── activity-content.tsx  (new, client component)
│   ├── api/
│   │   └── project-posting-waitlist/
│   │       └── route.ts                  (new)
│   ├── page.tsx                          (modified — becomes async server)
│   └── page-content.tsx                  (new — holds existing client logic)
├── components/
│   └── xp/
│       └── project-posting-waitlist-form.tsx  (new)
└── lib/
    └── xp-activity.ts                    (new, server-only)
```

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

Data + rendering flow:

```
                    Andamio Gateway (v2 API)
                            │
                            ▼
              src/lib/xp-activity.ts       ← server-only aggregation
                (computeActivityStats)
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
  src/app/page.tsx                 src/app/(app)/xp/activity/page.tsx
  (async server — prefetch)        (async server — prefetch)
              │                           │
              ▼                           ▼
        HydrateClient                HydrateClient
              │                           │
              ▼                           ▼
  page-content.tsx                 activity-content.tsx
  (client — existing logic         (client — renders stats
   + new landing strip)             + recent list + narrative)
              │                           │
              └──────── both embed ──────┘
                            │
                            ▼
   src/components/xp/project-posting-waitlist-form.tsx
                            │
                            ▼ POST (email-only + honeypot)
                            │
   src/app/api/project-posting-waitlist/route.ts
   (zod validation → honeypot → rate limit → Resend × 2)
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
    james@andamio.io             submitter@their-email.com
    (internal notification)      (confirmation)
```

## Implementation Units

- [ ] **Unit 1: Server-only data module `src/lib/xp-activity.ts`**

**Goal:** Encapsulate all activity-data aggregation. Exports a single function that returns the stats and recent-assessments list both surfaces need.

**Requirements:** R1, R5, R8

**Dependencies:** None

**Files:**
- Create: `src/lib/xp-activity.ts`
- Test: None — no test framework installed in repo. Verification via typecheck + preview deploy, following the pattern established in PRs #46–#48.

**Approach:**
- Follow the structure of `src/lib/xp-leaderboard.ts` exactly: `"server-only"` import, `GATEWAY_URL` / `API_KEY` / `PROJECT_ID` / `XP_POLICY_ID` constants from `env`, `gatewayFetch` helper with 10s timeout.
- Export `computeActivityStats(): Promise<ActivityStats>` where `ActivityStats` contains:
  - `contributors: number` — distinct aliases with total XP > 0 (same filter the leaderboard applies).
  - `tasksCompleted: number` — count of `assessments[]` where `decision.toUpperCase().startsWith("ACCEPT")`.
  - `xpReleased: number` — sum of XP rewards across accepted assessments.
  - `xpTotalSupply: number` — hardcoded 100_000 (matches `docs/tokenomics.md`).
  - `pendingReviews: number` — count of `assessments[]` where `decision` is falsy OR does not start with "ACCEPT" after upper-casing.
  - `recentAssessments: RecentAssessment[]` — the last 5–10 accepted assessments, sorted by `slot` descending. Each entry: `{ alias: string; taskName: string; xpEarned: number; slot: number; date: Date | null }` where `date` is derived via `slotToDate(slot, NEXT_PUBLIC_CARDANO_NETWORK)`.
- Reuse the leaderboard's normalization patterns: `?? []` defensive fallbacks for every array access, `decision?.toUpperCase().startsWith("ACCEPT")` for the accepted filter.
- Throw on errors — callers wrap via React Query `try/catch` at the page level (leaderboard does this).

**Patterns to follow:**
- `src/lib/xp-leaderboard.ts` — entire file structure, auth, fetch helpers, error behavior.

**Test scenarios:**
- Test expectation: none — no unit test framework in repo. Pure-function shape is inspectable; scenarios below are for manual preview verification.
- Happy path: function called with real gateway data returns all 6 stat fields + list of 5–10 recent assessments, each with a non-null `date` on mainnet/preprod/preview.
- Edge case: near-zero data (empty `assessments[]`, empty `contributors[]`) returns `contributors: 0, tasksCompleted: 0, xpReleased: 0, pendingReviews: 0, recentAssessments: []`. No throws, no undefined fields.
- Edge case: `MergedProjectDetail` missing optional fields (assessments undefined) returns zeros via `?? []` defaults.
- Error path: gateway timeout (10s) rethrows with original error message; callers convert to user-visible error state.
- Edge case: slot conversion returns `null` for unsupported network — `date` field is `null`, list entry still renders (caller formats "—" or similar).

**Verification:**
- `npm run typecheck` passes.
- A one-off probe (e.g., a `scripts/` file or tRPC route during development) invokes `computeActivityStats` against the preprod gateway and logs the result; the shape matches the declared return type.

---

- [ ] **Unit 2: Shared waitlist form component + `/api/project-posting-waitlist` route**

**Goal:** One form component reused on both surfaces + its backing endpoint. Submitting emails James + confirms to the submitter.

**Requirements:** R3, R6, R7

**Dependencies:** None

**Files:**
- Create: `src/components/xp/project-posting-waitlist-form.tsx`
- Create: `src/app/api/project-posting-waitlist/route.ts`
- Modify: none yet (consumers added in Units 3 and 4)

**Approach:**

Component (`project-posting-waitlist-form.tsx`):
- `"use client"`.
- Accepts optional props: `variant?: "inline" | "expanded"` (landing uses `inline` — initially collapsed, expands on "Notify me" click; activity page uses `expanded` — always visible).
- Internal state: `email`, `honeypot`, `status: "idle" | "submitting" | "success" | "error"`, `errorType: "network" | "validation" | null`.
- On mount, read `sessionStorage.getItem("xp_waitlist_submitted")` — if "1", render success state (suppresses re-submission).
- On submit: client-side email-format check → POST to `/api/project-posting-waitlist` → on success, `sessionStorage.setItem("xp_waitlist_submitted", "1")` and transition to success state → on 4xx/5xx, transition to error state.
- Privacy disclosure as a small muted-text line below the submit button: "Your email is used only to notify you when project posting launches. Email `james@andamio.io` to request deletion." Keep it one line; exact wording can be tuned on review.
- Honeypot: hidden input with a plausible name (e.g., `company`) wrapped in a visually-hidden container; bots fill it, humans don't. If populated on submit, skip the POST entirely and transition straight to the success state (so bots see no signal).
- Visual states per R7: idle (collapsed/expanded per variant), typing (client-side format preview), submitting (disabled + spinner), success ("Thanks — check your inbox for confirmation"), error-network (inline error + retry button), error-invalid (inline field-level error).
- Mobile: fields and button stack vertically below `sm:` breakpoint. Inline-variant reveal on landing focuses the email input programmatically.
- Copy strings are tunable: draft reasonable defaults in the PR, refine on review.

API route (`project-posting-waitlist/route.ts`):
- POST only; GET returns 405.
- Body parsed with zod: `{ email: z.string().email().max(200), honeypot: z.string().optional() }`.
- If honeypot is non-empty → return 200 `{ success: true }` without sending emails (silent bot rejection).
- Rate limit: in-memory `Map<string, number[]>` keyed by IP (from `x-forwarded-for` or `request.headers` fallback). Sliding 60-second window, max 5 requests. On exceed, return 429. Note clearly in a code comment that this is best-effort per-instance; an abuse scenario should trigger the deferred Vercel KV / Upstash upgrade.
- Resend-key guard: if `!env.RESEND_API_KEY`, return 503 (matches sponsor-contact).
- On valid input: send two Resend emails in parallel (`Promise.all`):
  1. Internal notification: from `Cardano XP <onboarding@resend.dev>`, to `james@andamio.io`, subject `"Cardano XP — project-posting waitlist"`, text body `Email: ${email}\nSubmitted: ${new Date().toISOString()}`.
  2. Submitter confirmation: from `Cardano XP <onboarding@resend.dev>`, to the submitted email, subject `"You're on the list"`, text body something like `"You're on the list for Cardano XP project posting.\n\nWe'll email you when it opens. Want to start earning XP now? https://cardano-xp.io\n\n— Cardano XP"` (final wording tuned on review).
- If either email fails, log and return a 500 with `{ error: string }`; the component falls into error-network state.
- Returns `{ success: true }` on full success.

**Patterns to follow:**
- `src/app/api/sponsor-contact/route.ts` — entire structure (zod schema, env guard, Resend send, error handling, response shape).
- `src/app/(app)/sponsors/sponsor-contact-form.tsx` — general form shape and state-machine approach.

**Test scenarios:**
- Test expectation: none — no unit test framework. Scenarios below are for manual preview verification.
- Happy path: real email entered → form shows submitting → success state; james@andamio.io receives internal email; submitter inbox receives confirmation.
- Edge case: honeypot filled by simulated bot (DOM injection via devtools) → endpoint returns 200, no emails sent, form shows success (no signal to bot).
- Edge case: rate limit — 6 rapid submissions from the same IP → sixth returns 429, form shows network error + retry button.
- Edge case: `RESEND_API_KEY` missing in env → endpoint returns 503, form shows network error.
- Error path: invalid email format ("foo@" or "") → zod rejects → 400 → form shows field-level validation error.
- Error path: Resend outbound failure on either email → endpoint returns 500 → form shows network error.
- Integration: after successful submit, refresh the page → form renders in success state (sessionStorage suppression).
- Integration: landing variant shows collapsed state until "Notify me" is clicked; clicking focuses the email input. Activity-page variant shows expanded always.
- Edge case: mobile viewport (375px) — fields stack vertically; submit button is full-width; inline reveal on landing doesn't push "See all activity →" out of viewport.

**Verification:**
- `npm run typecheck` passes.
- Manual preview: full happy-path + one error path + rate-limit test.
- `james@andamio.io` receives a real email; a test submission to a throwaway inbox receives a confirmation.

---

- [ ] **Unit 3: `/xp/activity` public page**

**Goal:** The dedicated activity page. Server-prefetched, hydrates instantly. Renders stats + recent-list + "What's next" narrative + form.

**Requirements:** R4, R5, R8

**Dependencies:** Unit 1, Unit 2

**Files:**
- Create: `src/app/(app)/xp/activity/page.tsx`
- Create: `src/app/(app)/xp/activity/activity-content.tsx`
- Test: None.

**Approach:**

Server page (`page.tsx`):
- `async function ActivityPage()`, mirrors `src/app/(app)/xp/page.tsx` line-by-line in structure.
- Calls `computeActivityStats()` from Unit 1 inside `try/catch`; on failure, logs and falls through (client will retry).
- `queryClient.prefetchQuery({ queryKey: activityKeys.stats(), queryFn: () => computeActivityStats() })`.
- Returns `<HydrateClient><ActivityContent /></HydrateClient>`.
- New `activityKeys` constant at the top of the file or in `src/lib/xp-activity.ts`: `{ stats: ["xp-activity"] as const }`.

Client content (`activity-content.tsx`):
- `"use client"`.
- `useQuery({ queryKey: activityKeys.stats(), queryFn: () => fetch("/api/xp-activity").then(r => r.json()) })` — OR reads from the prefetched cache directly via `useSuspenseQuery` or equivalent. Leaderboard pattern uses `useQuery`; follow the same.
- Wait — the leaderboard uses `/api/xp-leaderboard`. That implies a client-callable API endpoint wrapping the server function. Decision: follow the same pattern and add `src/app/api/xp-activity/route.ts` as a thin GET wrapper calling `computeActivityStats()`. This keeps the client/server boundary consistent with the leaderboard.
  - **Add to Files:** Create `src/app/api/xp-activity/route.ts` — minimal GET handler that calls `computeActivityStats()` and returns JSON. Matches `src/app/api/xp-leaderboard/route.ts` (read at implementation time to confirm shape).
- Render sections (structure, not copy):
  1. `AndamioPageHeader` with title "Activity" and a short subtitle.
  2. Hero narrative block — prose `AndamioText` or `AndamioCard`. Copy drafted in the PR.
  3. Stats strip — 4 `AndamioDashboardStat` cards (contributors / tasks / XP released / pending reviews). Near-zero values render as "0" with intentional styling.
  4. Recent assessments — `AndamioTable` (leaderboard pattern) with columns Alias · Task · XP · When. Alias cell renders `{entry.alias}` (React-escaped). When cell uses `slotToDate(entry.slot)` + `Intl.RelativeTimeFormat` or `Intl.DateTimeFormat`. If empty, render a short "No assessments yet — be the first" line instead of an empty table.
  5. "What's next" block — stepper-style layout (Step 1 → Step 2 → Step 3) describing Assignment 1 → earn XP → Assignment 2 (coming soon) → project-token mint. No numbers (no XP threshold, no ADA cost). Tunable copy.
  6. Embedded `<ProjectPostingWaitlistForm variant="expanded" />`.
- All on-chain strings rendered via JSX interpolation only — per R5 and `src/lib/alias-validation.ts`. No `dangerouslySetInnerHTML`; no concatenation into `href`.

**Patterns to follow:**
- `src/app/(app)/xp/page.tsx` + `src/app/(app)/xp/xp-content.tsx` — server + client split.
- `src/app/(app)/xp/leaderboard/page.tsx` + `leaderboard-content.tsx` — public route + prefetch + hydrate + table rendering + internal back-nav link (if leaderboard has one).
- `src/app/api/xp-leaderboard/route.ts` — thin GET wrapper.

**Test scenarios:**
- Test expectation: none (no unit test framework).
- Happy path: first paint on `/xp/activity` shows hero + stats + table + narrative + form simultaneously — no loading spinner (prefetched data hydrates instantly).
- Edge case: near-zero activity — all 4 stat cards show "0", recent-assessments list renders "No assessments yet — be the first", rest of page still visually intentional.
- Error path: `computeActivityStats` throws server-side → server falls through silently; client's `useQuery` triggers; on client failure, render an `AndamioErrorAlert` with retry.
- Integration: form submission from this page triggers the waitlist endpoint and transitions through the same states as on the landing. Success state persists across page navigation within the session (sessionStorage).
- Integration: on-chain alias containing non-alphanumeric characters (e.g., the reporter's literal fixture `'"name123'' onload='alert()'` if such an alias ever exists on chain) renders as escaped text — no script execution, no attribute breakout. Manually verify by modifying a local response shim if no such alias exists on preprod.
- Integration: recent-assessments slot conversion shows human-readable relative or absolute time per the network's Shelley genesis.

**Verification:**
- `npm run typecheck` passes.
- Manual preview: `/xp/activity` loads cleanly, all sections render, form works, no console errors.
- View source of server-rendered HTML confirms the stats numbers are baked in (not client-side populated).

---

- [ ] **Unit 4: Landing section + `src/app/page.tsx` restructure**

**Goal:** Convert the root page to an async server component, extract existing client logic to a sibling, and add the landing activity strip below the hero.

**Requirements:** R1, R2, R3, R8

**Dependencies:** Unit 1, Unit 2

**Files:**
- Modify: `src/app/page.tsx` — becomes async server component.
- Create: `src/app/page-content.tsx` — existing client logic moves here.
- Test: None.

**Approach:**

Server `page.tsx`:
- Convert to `export default async function Page()`.
- Prefetch `computeActivityStats` into React Query (same key as Unit 3 — shared cache benefits).
- Wrap in `<HydrateClient>`, render `<PageContent />` (the ported existing logic) followed by a new `<LandingActivityStrip />` section.
- The `LandingActivityStrip` can live inline in `page-content.tsx` (same client boundary) or as a sibling component — implementer's call. If inline, simpler; if sibling, more testable.

Client `page-content.tsx`:
- Take the entire body of the current `src/app/page.tsx` verbatim: the `useState<MintedInfo | null>` hook, the `FirstLoginCard` vs `LandingHero` conditional, `onMinted` handler, layout wrapper.
- Change the layout wrapper: the current centered panel (`h-dvh overflow-y-auto` with flex-1 centered) becomes a scroll container that hosts multiple sections. Hero is section 1 (retains its centered visual weight within its own region — e.g., `min-h-dvh flex items-center`), landing activity strip is section 2.
- Landing activity strip contents:
  1. A `max-w-6xl` centered container.
  2. Three `AndamioDashboardStat` cards (contributors / tasks completed / XP released — *no* pending reviews; that's activity-page only per R1).
  3. Tagline block — `AndamioText` with the future-mechanism copy (drafted in PR).
  4. Primary button: `<AndamioButton variant="primary">Notify me</AndamioButton>` that toggles the form's visibility inline (component's `variant="inline"` handles this).
  5. Secondary link: `<Link href="/xp/activity">See all activity →</Link>` styled via `AndamioButton variant="ghost"` or plain text.
  6. Inline-revealed `<ProjectPostingWaitlistForm variant="inline" />`.
- Mobile: stats cards stack, tagline wraps, buttons stack below `sm:` breakpoint.
- Near-zero states per R1: stats show "0" with intentional styling — no broken-looking empty strips.

**Patterns to follow:**
- `src/app/(app)/xp/page.tsx` + `xp-content.tsx` — exact async-server + client-content split pattern.
- Leaderboard stat-card styling for the three landing numbers.

**Test scenarios:**
- Test expectation: none (no unit test framework).
- Happy path: `/` loads with hero centered in viewport, scrolls down to reveal activity strip + form, form reveals inline on "Notify me" click.
- Edge case: near-zero activity — three landing stat cards show "0" without looking broken; page scrolls correctly.
- Edge case: existing `FirstLoginCard` flow (post-mint user lands back on `/`) still works — the activity strip is visible below the celebration card after mint.
- Integration: submitting the form from landing triggers the same endpoint + states as on the activity page. Success persists via sessionStorage.
- Integration: clicking "See all activity →" navigates to `/xp/activity`; browser-back returns to the exact scroll position on `/`.
- Edge case: mobile viewport (375px) — hero fills the viewport height, scroll reveals activity strip with vertically-stacked content; inline form reveal doesn't push the "See all activity →" link out of the viewport.

**Verification:**
- `npm run typecheck` passes.
- Manual preview: `/` loads, the two sections visually distinct, scroll works, form works, existing mint-then-redirect flow unbroken.
- No regression on landing-page performance (Lighthouse / DevTools Network — no new client-side blocking fetches for initial data since stats are server-prefetched).

---

- [ ] **Unit 5: Nav integration + routes config**

**Goal:** `/xp/activity` is discoverable via `PUBLIC_ROUTES` and whatever navigation surface makes sense (top nav, `/xp` page's internal links, or both).

**Requirements:** R4

**Dependencies:** Unit 3

**Files:**
- Modify: `src/config/routes.ts` — add `activity: "/xp/activity"` (or equivalent key) to `PUBLIC_ROUTES`.
- Modify: `src/components/layout/app-nav-bar.tsx` — add nav entry if the leaderboard has one; otherwise skip.
- Possibly modify: `src/app/(app)/xp/xp-content.tsx` and `src/app/(app)/xp/leaderboard/leaderboard-content.tsx` — add a cross-link to `/xp/activity` if those pages already link to siblings.

**Approach:**
- Read `src/config/routes.ts` — determine the exact `PUBLIC_ROUTES` entry style. Add the new route following the same key/value convention (e.g., `activity: "/xp/activity"`).
- Read `src/components/layout/app-nav-bar.tsx` — if a direct nav entry exists for `/xp/leaderboard`, add one for `/xp/activity` in the same group. If the leaderboard is only linked from `/xp` (not in the top nav), don't add a top-nav entry; instead, add an internal cross-link on `/xp` (and possibly in `activity-content.tsx` back to `/xp`).
- Keep all route references via `PUBLIC_ROUTES.activity` — never hardcoded "/xp/activity" in consuming components.

**Patterns to follow:**
- Whatever the leaderboard does for its nav + `/xp` cross-link. Mirror that.

**Test scenarios:**
- Test expectation: none (pure config + nav change).
- Happy path: navigating via whatever nav surface was added lands on `/xp/activity`.
- Integration: existing nav links (leaderboard, project-wallet, etc.) still work.

**Verification:**
- `npm run typecheck` passes.
- Manual preview: navigate from top nav / `/xp` page to `/xp/activity` and back. No broken links.

## System-Wide Impact

- **Interaction graph:** The shared `xp-activity` query key means both surfaces read from the same cache. If one surface mutates (form submission doesn't touch the data), it's fine; if a future change adds mutation, use `queryClient.invalidateQueries({ queryKey: activityKeys.stats() })` after the mutation.
- **Error propagation:** `computeActivityStats` throws → server `try/catch` silences (client retries via `useQuery`) → client `useQuery` error → `AndamioErrorAlert` renders. Form errors are component-local.
- **State lifecycle risks:** In-memory rate-limit `Map` grows unboundedly without cleanup. Include a sliding-window cleanup pass that evicts IP entries with zero timestamps in the active window. Not strictly a correctness issue (small memory footprint per instance) but worth noting.
- **API surface parity:** The new `/api/xp-activity` GET is the public data path for activity stats — client-callable, cacheable via React Query. No breaking changes to `/api/xp-leaderboard` or other existing routes. The new `/api/project-posting-waitlist` POST follows the same shape as `/api/sponsor-contact`.
- **Integration coverage:** The form's sessionStorage behavior, the in-memory rate limiter's per-instance nature, and the Resend two-email flow are the most integration-dependent pieces. Manual preview testing is the only coverage; document this in the PR body.
- **Unchanged invariants:** `src/lib/xp-leaderboard.ts`, `src/app/(app)/xp/leaderboard/`, `src/app/(app)/xp/page.tsx`, `src/app/api/sponsor-contact/route.ts`, `src/app/(app)/sponsors/`, `src/components/ui/chart.tsx`, and `scripts/audit-unsafe-sinks.sh` all stay unchanged. The established "on-chain strings are untrusted" principle from PR #48 is reinforced, not modified.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| `page.tsx` restructure breaks the existing mint-to-landing redirect flow (`FirstLoginCard` conditional) | Move the entire existing body verbatim to `page-content.tsx`; change only the outer container. Manual preview-test the full mint-redirect flow after restructuring. |
| In-memory rate limiter provides no cross-instance protection in serverless | Documented explicitly in code comment. Best-effort; honeypot is the primary bot defense. Upgrade path (Vercel KV / `@upstash/ratelimit`) is a named follow-up. |
| Resend shared-sender domain (`onboarding@resend.dev`) triggers spam filters for submitter confirmations | Flagged in Deferred section. Before any scaled launch, verify a custom sending domain aligned with cardano-xp.io. For v1 low-volume waitlist, shared sender is acceptable. |
| Hostile on-chain alias breaks activity-page rendering | R5 requires JSX-only rendering. Reinforced by the audit-unsafe-sinks.sh script from PR #48. Any new `dangerouslySetInnerHTML` outside the allowlist trips CI. |
| The 4–5 file restructure (new server pages, new module, new component, page.tsx split) introduces multiple blast radii | Land as a single coherent PR; review catches any regression before merge. Preview deploy exercises both `/` and `/xp/activity` plus the waitlist endpoint. |
| Near-zero activity makes landing numbers look unimpressive | The declared reframe (trajectory, not momentum) defuses this. Copy of the tagline + "What's next" block carries the weight; numbers are supporting. Still verify during PR preview that the landing strip doesn't feel broken at zero values. |
| Resend-key missing in local dev env breaks local testing | Endpoint returns 503 cleanly; form shows network error. Documented in the component. `.env.example` already lists `RESEND_API_KEY` as optional. |
| dcm pushes back on single-project scope post-merge | Named as a pre-merge acceptance step in R9. One-line DM is cheap; resolves the risk upfront. |

## Documentation / Operational Notes

- PR body should include screenshots of landing (full-page scrolled) + `/xp/activity` (full-page) + form-in-each-state (idle/submitting/success/error). Visual evidence for the release notes in v0.0.2.
- Mention in the PR body that this is v0.0.2's capstone feature per the release plan.
- After merge, verify Resend is delivering both emails (internal + confirmation) by doing one real test submission.
- Operational: Cardano XP mainnet deploy needs `RESEND_API_KEY` set — confirm on release.
- Operational: rate limiter is best-effort; add a follow-up to the release plan's "confirm on release" checklist to monitor `james@andamio.io` for unusual submission rates in the first few days.

## Sources & References

- **Origin document:** [docs/brainstorms/2026-04-18-xp-activity-dashboard-requirements.md](../brainstorms/2026-04-18-xp-activity-dashboard-requirements.md)
- **Related issue:** [#43](https://github.com/workshop-maybe/cardano-xp/issues/43)
- **Related prior work:** PR #45 (link audit pattern), PR #46 (auth context + network detection + sign-message timeout), PR #47 (mint-reauth copy), PR #48 (shared alias validation + on-chain-untrusted principle + `scripts/audit-unsafe-sinks.sh`).
- **Related release plan:** `docs/plans/2026-04-18-005-release-v0-0-2-plan.md` — this feature is the v0.0.2 capstone.
- **Reference code:**
  - `src/lib/xp-leaderboard.ts` — server aggregation pattern.
  - `src/app/(app)/xp/page.tsx` + `xp-content.tsx` — async server + client split.
  - `src/app/api/sponsor-contact/route.ts` — Resend-on-submit.
  - `src/app/(app)/sponsors/sponsor-contact-form.tsx` — client form state-machine shape.
  - `src/lib/cardano-utils.ts` — `slotToDate` helper.
  - `src/lib/alias-validation.ts` — on-chain-untrusted threat model.
  - `scripts/audit-unsafe-sinks.sh` — CI regression guard for `dangerouslySetInnerHTML`.
