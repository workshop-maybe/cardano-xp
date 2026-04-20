---
title: "chore: resolve the seven carry-over todos from PR #50 review"
type: refactor
status: active
date: 2026-04-20
origin: ./todos/004-ready-p1-waitlist-abuse-mitigation.md, ./todos/005-ready-p1-extend-preview-test-checklist.md, ./todos/006-ready-p2-honor-isr-cache-on-ssr-prefetch.md, ./todos/007-ready-p2-hydration-safe-relative-time.md, ./todos/008-ready-p2-kv-backed-rate-limiter.md, ./todos/009-ready-p3-raw-p-tag-sweep-and-empty-state.md, ./todos/010-ready-p3-centralize-contact-and-extract-cta-card.md
---

# chore: resolve the seven carry-over todos from PR #50 review

## Overview

PR #50 (XP activity dashboard, shipped in v0.0.2) generated seven `ready`
todos from the code-review pass — two P1, three P2, two P3. Each todo is
self-contained with problem statement, proposed solutions, and acceptance
criteria. This plan sequences them into one executable batch, resolves the
strategic choices that span multiple todos, and keeps verification
lightweight.

Because every todo is pre-triaged, the plan's job is decisions + sequencing,
not re-derivation.

## Problem Frame

Shipping v0.0.2 with the `ready` todos still open leaves known sharp edges in
production:

- **Abuse surface** on `/api/project-posting-waitlist` — attacker-supplied
  email gets a Cardano XP-branded confirmation from a shared Resend sandbox
  sender, with only a best-effort per-instance rate limiter in front. (P1)
- **Latent hydration and caching inefficiencies** on `/xp/activity` —
  relative-time strings mismatch across SSR/client; the ISR cache on the
  API route is unreachable from the server pages that call
  `computeActivityStats` directly. (P2)
- **Per-instance rate limiter** in the forkable-template code is cosmetic
  at scale. (P2)
- **Codebase drift** — raw `<p>` tags, duplicated contact constants, and
  near-identical CTA cards. (P3)
- **Branch-coverage gaps** in the preview test checklist — five code paths
  ship without exercise unless forced. (P1, verification-only)

Nothing here is a customer-visible regression *today* under normal use.
Everything here is a regression waiting to happen the first time someone
deliberately pokes at it.

## Requirements Trace

Pulled from the seven todo files (see each todo for acceptance criteria):

- **R4 (todo 004, P1).** `/api/project-posting-waitlist` no longer sends a
  Cardano XP-branded email to an attacker-supplied address. Chosen
  mitigation: **drop the user-confirmation send entirely**; keep only the
  internal notification. Form copy updated to match.
- **R5 (todo 005, P1).** Five preview-test exercises run against a
  pre-merge preview of the `chore/resolve-pr50-todos` branch, with results
  captured in `docs/feedback/reports/` or an adjacent verification log.
  Exercises: rate-limit 429, honeypot, `computeActivityStats` fallback
  path, zero-activity-state rendering, hostile on-chain alias rendering.
- **R6 (todo 006, P2).** `computeActivityStats` is cached globally for
  300s (shared across landing, `/xp/activity`, and the API route), and
  the SSR prefetch path is bounded at ≤3s TTFB under gateway stress.
- **R7 (todo 007, P2).** `/xp/activity`'s recent-submissions table shows
  no hydration-mismatch warnings; rows auto-update relative time every
  30s while mounted.
- **R8 (todo 008, P2).** The waitlist rate limiter uses a shared backend
  when one is provisioned (Upstash Redis or Vercel KV, detected via env
  vars) and falls back to the existing in-memory implementation when not.
  Adds a per-email-hash secondary key. Env vars documented in
  `.env.example`.
- **R9 (todo 009, P3).** The six raw `<p>` tags introduced by PR #50 are
  replaced with `AndamioText`; the `/xp/activity` empty state uses
  `AndamioEmptyState`.
- **R10 (todo 010, P3).** `james@andamio.io` and the Resend `FROM_ADDRESS`
  are each defined exactly once; the Leaderboard/Activity CTA cards in
  `xp-content.tsx` share one file-local component.

## Scope Boundaries

- **Out** per user: screenshots, video walkthroughs, test-browser runs.
- **Out** (deferred follow-ups): double opt-in flow (todo 004 Option B),
  verified `cardano-xp.io` Resend sender domain (todo 004 Option D),
  codebase-wide `<p>` sweep with CI audit (todo 009c), rename
  `package.json` from `andamio-app-template` to `cardano-xp`.
- **Out**: provisioning Upstash Redis or Vercel KV itself — the code is
  env-var-gated so it ships "off" until infra lands.

### Deferred to Separate Tasks

- Upstash/KV provisioning: infrastructure task, tracked as a non-blocking
  follow-up in the todo 008 body. Code ships ready-to-use.
- Verified Resend sender domain (SPF/DKIM/DMARC for `cardano-xp.io`):
  ~15-min infra task, stays on todo 004 after this batch resolves the
  code side.
- Introducing a unit-test framework for pure helpers like
  `computeActivityStats`, `formatActivityDate`, `isRateLimited`: called
  out in multiple reviews as a standing opportunity. Out of scope here.

## Context & Research

### Relevant Code and Patterns

- `src/app/api/project-posting-waitlist/route.ts` — target of todos 004,
  008, 010. Origin check + Resend result inspection already landed in
  PR #50's review commit.
- `src/app/api/sponsor-contact/route.ts` — shares the same Resend
  `FROM_ADDRESS` duplication (todo 010a) and has `INTERNAL_RECIPIENT`
  hardcoded.
- `src/components/xp/project-posting-waitlist-form.tsx` — success-state
  copy must change to match todo 004 (no confirmation email).
- `src/lib/xp-activity.ts` — target of todo 006 (cache wrap).
- `src/lib/xp-activity-client.ts` — shared query helper, no change
  expected.
- `src/app/page.tsx`, `src/app/(app)/xp/activity/page.tsx` — both prefetch
  via `computeActivityStats`; both gain the race-timeout for SSR (todo
  006).
- `src/app/api/xp-activity/route.ts` — currently sets `revalidate = 300`;
  becomes a consumer of the cached function so ISR actually caches
  (todo 006).
- `src/app/(app)/xp/activity/activity-content.tsx` — target of todos 007
  (RelativeTime), 009 (raw `<p>` + empty state).
- `src/app/page-content.tsx` — target of todo 009 (one raw `<p>`).
- `src/app/(app)/xp/xp-content.tsx` — target of todo 010b (CrossLinkCard
  extraction).
- `src/config/` — existing directory; new `contact.ts` lands here for
  todo 010a. Pattern matches `src/config/routes.ts`, `cardano-xp.ts`,
  etc.
- `src/components/andamio/andamio-empty-state.tsx` — exists; todo 009b is
  a drop-in swap.
- `src/components/andamio/andamio-text.tsx` — exists; todo 009a is a
  drop-in swap.

### Institutional Learnings

- `docs/solutions/performance-issues/page-loading-provider-waterfall-prefetch-overhaul.md`
  — origin of the `HydrateClient` + prefetch pattern. The `unstable_cache`
  wrap in todo 006 is the natural extension.
- `docs/solutions/performance-issues/server-prefetch-hydration-expansion-dedup-sanitization.md`
  — reinforces "sanitize at trust boundaries" thinking.
- `docs/solutions/architecture/xp-leaderboard-client-side-computation.md`
  — same 10s gateway timeout lives in `xp-leaderboard.ts` and will
  eventually want the same SSR-side race cap (noted, not in scope).

### External References

None. All patterns are local or cited in the individual todo files.

## Key Technical Decisions

- **Todo 004 strategy: drop the user confirmation (Option A).** Closes the
  reflector surface entirely. The on-page success state is sufficient user
  feedback; internal notification still captures the signal. Double opt-in
  (Option B) is strictly better long-term but adds ~100 lines + token
  infrastructure and delivers diminishing marginal value for a low-volume
  v0.0.2 waitlist.
- **Todo 008 strategy: env-var-gated rate limiter with graceful fallback.**
  Ship the KV-backed path *and* keep the in-memory path as a fallback
  triggered when `UPSTASH_REDIS_REST_URL`/`KV_REST_API_URL` is unset. This
  decouples the code landing from the infrastructure landing. In dev
  environments with no env vars, the existing behavior is preserved.
  Preferred backend: **Upstash Redis via `@upstash/ratelimit`** — slightly
  more Cardano/Vercel-ecosystem-idiomatic than `@vercel/kv`, offers a
  documented `Ratelimit.slidingWindow` primitive, and is the specific SDK
  called out in todo 008's recommended action.
- **Todo 006 SSR timeout: `Promise.race` at the page level, 3s.** Leaves
  the 10s `AbortSignal.timeout(10_000)` inside `gatewayFetch` for the API
  route path, which can afford the fuller latency budget. Pages are
  user-TTFB-sensitive; API routes are not. Single knob, small diff.
- **Todo 007 relative-time: client-only render via mount-gated `now`.**
  Absolute date (`toLocaleDateString`) during SSR, relative string after
  mount, re-render every 30s via `setInterval`. Per-row `<RelativeTime>`
  component; state lives once per cell.
- **Todo 010a config location: `src/config/contact.ts`.** Matches the
  existing `src/config/` convention (`cardano-xp.ts`, `routes.ts`,
  `branding.ts`). Exports an `as const` object, not magic strings.
- **Todo 010b component scope: file-local.** `CrossLinkCard` lives inside
  `xp-content.tsx`; no new file. If a third caller emerges, promote to
  `src/components/`. Rule-of-three.
- **Batching: one branch, commits-per-todo, then one PR.** User invoked
  `/compound-engineering:lfg "fix all"` — the intent is throughput.
  Landing seven PRs would be review-overhead out of proportion with the
  work. Single PR is reviewable in one pass; individual commits preserve
  traceability if we ever need to cherry-pick or revert one todo.
- **Verification posture: typecheck + preview test exercises.** Repo has
  no unit test framework. All feature-bearing units verify via
  `npm run typecheck` plus the todo 005 preview exercises. No new tests
  introduced in this batch.

## Open Questions

### Resolved During Planning

- *Which todo 004 option?* **Option A** (drop user-confirmation). See Key
  Technical Decisions above.
- *Upstash vs Vercel KV for todo 008?* **Upstash Redis via
  `@upstash/ratelimit`**. Matches todo 008's recommended SDK; fallback
  path means dev-env behavior unchanged when env vars are absent.
- *Where does `activityKeys` live?* Already extracted to
  `src/lib/xp-activity-client.ts` in PR #50's review fix commit. No
  further move needed.
- *Is 005 blocking?* It's a P1 verification todo but requires a preview
  deploy of the code changes from 004/006/007/008/009/010. It runs last,
  on the same branch, before merge. If any exercise fails, the branch
  doesn't ship.
- *One PR or seven?* **One PR** with per-todo commits. User intent from
  `lfg fix all` is batched resolution.
- *New dependencies?* Yes, two: `@upstash/ratelimit` and `@upstash/redis`
  (peer). Both are devDependencies-light, production-supported, and
  documented in the `.env.example` update.

### Deferred to Implementation

- Exact `AndamioEmptyState` prop shape for the "Be the first" CTA with
  embedded `<Link>`. The component signature may or may not accept a
  JSX `description` prop; implementer reads it at the swap site and
  adjusts copy if needed.
- Exact wording of the form success-state copy after dropping the
  confirmation email. The current line says "check your inbox for
  confirmation" — that must change, but the replacement wording can be
  tuned on review.
- Whether the `submissionTimestamps` in-memory fallback in the waitlist
  route stays colocated with the rate-limiter module or moves into a
  shared `src/lib/rate-limiter.ts` module. Implementer decides based on
  whether the shared module shape reads cleanly.
- Whether todo 005 exercises require a feature-flagged `?zero=1` /
  `?forceFallback=1` query-param path, or can be driven purely by
  devtools response-override. Decide at execution time based on
  response-override ergonomics.

## High-Level Technical Design

> *Directional guidance for review, not implementation specification.*

Batching and dependency flow across the seven todos:

```
Phase A — pure refactor, zero behavior change
├── todo 010a  →  src/config/contact.ts + rewire 2 API routes + form copy
├── todo 010b  →  CrossLinkCard extraction in xp-content.tsx
└── todo 009   →  raw <p>→AndamioText (6 sites) + AndamioEmptyState swap

Phase B — P1 abuse mitigation
└── todo 004   →  drop user-confirmation Resend send + update form copy
                   (depends on 010a for FROM_ADDRESS/INTERNAL_RECIPIENT
                    having moved to src/config/contact.ts)

Phase C — P2 reliability / perf / UX
├── todo 008   →  shared rate-limiter module (Upstash + in-memory fallback)
│                  + per-email key (hash)
├── todo 006   →  unstable_cache wrap + SSR-side Promise.race(3s)
└── todo 007   →  <RelativeTime> component; replace formatActivityDate call

Phase D — verification
└── todo 005   →  5 preview-test exercises against chore/resolve-pr50-todos
                   preview deploy; log results; only merge if all pass
```

Env-var-gated rate-limiter selection (todo 008):

```
POST /api/project-posting-waitlist
        │
        ▼
getRateLimiter() singleton
        │
        ├── env.UPSTASH_REDIS_REST_URL set? ──── yes ──►  Upstash-backed
        │                                                  (per-IP + per-email)
        └── no ──►  in-memory Map (current behavior)
```

## Implementation Units

- [ ] **Unit 1: Centralize contact constants (todo 010a)**

**Goal:** Remove duplicate references to `james@andamio.io` and the Resend
`FROM_ADDRESS` string by introducing a single source of truth.

**Requirements:** R10

**Dependencies:** None

**Files:**
- Create: `src/config/contact.ts`
- Modify: `src/app/api/sponsor-contact/route.ts`
- Modify: `src/app/api/project-posting-waitlist/route.ts`
- Modify: `src/components/xp/project-posting-waitlist-form.tsx`

**Approach:**
- New file exports `CONTACT = { internalEmail, fromAddress } as const`.
- Replace `INTERNAL_RECIPIENT`, `FROM_ADDRESS`, and the `"james@andamio.io"`
  literal in the form's privacy-disclosure copy with `CONTACT.*`
  references.
- No behavior change; same values.

**Patterns to follow:**
- `src/config/routes.ts`, `src/config/cardano-xp.ts` — same `as const`
  object pattern at the same directory level.

**Test scenarios:**
- `npm run typecheck` passes.
- `grep -n "james@andamio.io" src/` returns only
  `src/config/contact.ts`.
- `grep -n "onboarding@resend.dev" src/` returns only
  `src/config/contact.ts`.

**Verification:**
- Waitlist form's privacy-disclosure copy still renders the email
  address correctly on preview.
- Both API routes still send from/to the correct addresses (preview
  preview deploy).

---

- [ ] **Unit 2: Extract CrossLinkCard (todo 010b)**

**Goal:** DRY the two near-identical Leaderboard/Activity CTA cards in
`xp-content.tsx` into a single file-local component.

**Requirements:** R10

**Dependencies:** None

**Files:**
- Modify: `src/app/(app)/xp/xp-content.tsx`

**Approach:**
- Declare `function CrossLinkCard({ href, title, description })` inside
  `xp-content.tsx` (not a new file — rule-of-three).
- Replace both card instances with `<CrossLinkCard ... />`.

**Patterns to follow:**
- The existing JSX block at `xp-content.tsx:141-174` (pre-PR #50) is the
  template.

**Test scenarios:**
- `npm run typecheck` passes.
- `/xp` page still renders two visually identical CTA cards.

**Verification:**
- Preview deploy of `/xp` shows the Leaderboard and Activity CTA cards
  with no visual regression.

---

- [ ] **Unit 3: Raw `<p>` sweep + AndamioEmptyState (todo 009)**

**Goal:** Comply with `AGENTS.md` line 30 ("Use AndamioText for
paragraphs") for the six new raw `<p>` tags introduced by PR #50, and use
the existing `AndamioEmptyState` primitive on the activity empty state.

**Requirements:** R9

**Dependencies:** None

**Files:**
- Modify: `src/app/(app)/xp/activity/activity-content.tsx` (5 `<p>` tags +
  empty-state block at lines 152-170)
- Modify: `src/app/page-content.tsx` (1 `<p>` tag at line 85)

**Approach:**
- Replace each `<p>` with `<AndamioText>` choosing `variant="muted"`,
  `variant="small"`, or default based on existing styling.
- Replace the empty-state `<div>` tree at `activity-content.tsx:152-170`
  with `<AndamioEmptyState>` — inspect the component's prop signature at
  swap time and adjust copy-shape if needed (see Deferred to
  Implementation).
- No class/style simplification beyond the swap.

**Patterns to follow:**
- `src/components/andamio/andamio-text.tsx` — variants.
- `src/components/andamio/andamio-empty-state.tsx` — props + usage
  examples in its docstring.

**Test scenarios:**
- `npm run typecheck` passes.
- Landing and `/xp/activity` render with the same visual weight as
  before.
- `grep -n "^\s*<p " src/app/(app)/xp/activity/activity-content.tsx
  src/app/page-content.tsx` returns no matches (excluding any
  pre-existing `<p>` tags unrelated to PR #50 — none expected).

**Verification:**
- Preview deploy: both pages render; empty-state renders when the
  activity stats have no recent submissions (simulate via devtools
  response-override).

---

- [ ] **Unit 4: Drop user-confirmation email (todo 004)**

**Goal:** Close the email-bombing reflector by removing the Resend send
addressed to the submitter. Keep only the internal notification. Update
form copy so users aren't promised a confirmation they won't receive.

**Requirements:** R4

**Dependencies:** Unit 1 (CONTACT constants) — the edit touches the same
code region; landing 1 first avoids merge-conflict churn.

**Files:**
- Modify: `src/app/api/project-posting-waitlist/route.ts`
- Modify: `src/components/xp/project-posting-waitlist-form.tsx`
  (success-state copy)

**Approach:**
- Remove the second `resend.emails.send(...)` call (the confirmation to
  the submitter) and collapse `Promise.all` to a single `await`.
- Keep the `{ data, error }` result inspection on the remaining internal
  send.
- Update form's success-state copy: today's message references
  "check your inbox for confirmation." Replace with wording that
  confirms the submission without promising an email (exact wording
  deferred to implementation).
- Leave the `Origin`/`Referer` same-origin check in place — it landed in
  PR #50 review and is still load-bearing defense-in-depth.

**Patterns to follow:**
- `src/app/api/sponsor-contact/route.ts` — single internal send pattern.

**Test scenarios:**
- Preview: successful submission → exactly one email at `CONTACT.internalEmail`,
  zero emails at the submitter address.
- Form still transitions to success state on 200.
- Honeypot path still returns 200 without calling Resend.
- Rate-limit path still returns 429.

**Verification:**
- Manual preview submit with a throwaway inbox: internal mail arrives,
  submitter inbox stays empty.
- Typecheck clean.

---

- [ ] **Unit 5: Shared rate-limiter with Upstash fallback (todo 008)**

**Goal:** Replace the per-instance in-memory rate limiter with a shared
backend when env vars are present; otherwise fall back to the existing
in-memory behavior. Add per-email-hash secondary key.

**Requirements:** R8

**Dependencies:** Unit 1, Unit 4 (sequencing to reduce conflict surface)

**Files:**
- Create: `src/lib/rate-limiter.ts` (new shared module)
- Modify: `src/app/api/project-posting-waitlist/route.ts` (use shared
  module)
- Modify: `.env.example` (document `UPSTASH_REDIS_REST_URL`,
  `UPSTASH_REDIS_REST_TOKEN`)
- Modify: `package.json` (add `@upstash/ratelimit`, `@upstash/redis`)

**Approach:**
- `src/lib/rate-limiter.ts` exports `checkRateLimit({ key, kind })` where
  `kind` is `"ip"` or `"email"`. Module-local singleton selects backend
  on first use:
  - If `process.env.UPSTASH_REDIS_REST_URL` and
    `process.env.UPSTASH_REDIS_REST_TOKEN` are both set, instantiate
    Upstash `Ratelimit.slidingWindow(5, "1 m")` for IP and
    `Ratelimit.slidingWindow(1, "1 h")` for email.
  - Otherwise fall back to the current `Map<string, number[]>` sliding-
    window logic (extract verbatim from
    `project-posting-waitlist/route.ts`).
- Route calls `checkRateLimit({ kind: "ip", key: ip })` first, then
  `checkRateLimit({ kind: "email", key: sha256(email) })` after zod
  validation. Either limit tripping returns 429.
- Hash the email before using as a rate-limit key so we don't store raw
  PII in Upstash keys.
- Delete the stale module-level `submissionTimestamps` Map from the
  route once it's lifted into the shared module.

**Patterns to follow:**
- `@upstash/ratelimit` README for `Ratelimit.slidingWindow` + Redis
  client init.

**Test scenarios:**
- Upstash env vars unset → in-memory fallback produces the same 5/min/IP
  behavior as today.
- Upstash env vars set → Upstash is called; `Ratelimit.limit(ip)` gates
  the request.
- Email already submitted once within the last hour → 429 on second
  attempt regardless of IP (Upstash path only).
- Honeypot path still returns 200 without consuming either limit key
  (check the order of the honeypot check vs rate-limit consumption).

**Verification:**
- `npm run typecheck` passes.
- `grep -n "submissionTimestamps" src/` returns no matches after the
  move.
- `.env.example` documents the new env vars with a "leave blank to use
  in-memory fallback" comment.

---

- [ ] **Unit 6: `unstable_cache` wrap + SSR timeout (todo 006)**

**Goal:** Honor the existing `revalidate = 300` on `/api/xp-activity` by
routing both server pages through a cached wrapper of
`computeActivityStats`. Bound SSR TTFB at 3s under gateway stress.

**Requirements:** R6

**Dependencies:** None (independent of the other phases)

**Files:**
- Modify: `src/lib/xp-activity.ts` — add
  `getCachedActivityStats = unstable_cache(computeActivityStats,
  ["xp-activity"], { revalidate: 300 })`
- Modify: `src/app/api/xp-activity/route.ts` — call `getCachedActivityStats`
- Modify: `src/app/page.tsx` — prefetch via `getCachedActivityStats`;
  wrap in `Promise.race(prefetch, timeout(3_000))` so gateway stress
  doesn't stretch TTFB
- Modify: `src/app/(app)/xp/activity/page.tsx` — same pattern as
  `page.tsx`

**Approach:**
- Keep `computeActivityStats` exported (used by tests/scripts later).
- The cached wrapper is the new default entry point for callers.
- The SSR `Promise.race` at the page level rejects fast on timeout; the
  `try/catch` already in place swallows the rejection and falls through
  to the client fetch, which then hits the ISR-cached API route.
- The in-process `unstable_cache` provides the true global cache; ISR on
  the API route still works because the API route reads from the same
  cached function.

**Patterns to follow:**
- Next.js docs: `unstable_cache`. Upstream `revalidate` on the route
  handler stays as-is.

**Test scenarios:**
- Cold SSR of `/` after 5-min cache miss: one call to
  `computeActivityStats`. A second SSR within 5 min: zero calls
  (verified via a single `console.log` at the top of
  `computeActivityStats` during preview).
- Simulated slow gateway (devtools network throttle → custom handler
  delay on a local proxy, or a `setTimeout` injected at the top of
  `computeActivityStats` for a one-off preview): SSR returns within
  ~3s, not 10s.
- `/xp/activity` server-prefetched on first visit; no client loading
  spinner on first paint.

**Verification:**
- `npm run typecheck` passes.
- Preview: add a temporary log line in `computeActivityStats`, hit `/`
  twice within 5 min, confirm single invocation.
- Remove the log line before merge.

---

- [ ] **Unit 7: `<RelativeTime>` component (todo 007)**

**Goal:** Replace `formatActivityDate` with a hydration-safe component
that renders an absolute date on SSR and upgrades to a self-ticking
relative string on the client.

**Requirements:** R7

**Dependencies:** None

**Files:**
- Create: `src/components/xp/relative-time.tsx`
- Modify: `src/app/(app)/xp/activity/activity-content.tsx` — remove
  `formatActivityDate`; render `<RelativeTime date={entry.date} />` in
  the table cell.

**Approach:**
- New `"use client"` component with props `{ date: string | null }`.
- Internal state `now: number | null` starts `null`; `useEffect` on mount
  sets `Date.now()` and installs a `setInterval(() => setNow(Date.now()),
  30_000)` with cleanup on unmount.
- Render branches:
  - `date === null` → `—`
  - `now === null` (SSR + first client render) → absolute date via
    `date.toLocaleDateString(undefined, { month: "short", day: "numeric" })`
  - `now !== null` → relative string using the same thresholds as the
    retired `formatActivityDate`.
- Delete the old `formatActivityDate` function once unused.
- Don't memoize; per-row re-render every 30s is negligible cost.

**Patterns to follow:**
- The existing `formatActivityDate` threshold logic translates
  line-for-line; only the `Date.now()` call moves behind the mount
  gate.

**Test scenarios:**
- Open `/xp/activity` in browser devtools → no hydration-mismatch
  warnings in the console.
- First paint of a recent row shows an absolute date like "Apr 20".
- After a tick (~30s), the cell flips to "1m ago".
- Near-threshold rows (e.g., slot ≈ 59 minutes ago) don't flicker
  between renders at the same `now`.

**Verification:**
- `npm run typecheck` passes.
- Browser console on preview: no "Text content did not match" warnings.

---

- [ ] **Unit 8: Preview test exercises (todo 005)**

**Goal:** Run the five previously-unexercised branch tests against the
preview deploy of the `chore/resolve-pr50-todos` branch. Capture results
in a log file. Do not merge if any exercise fails.

**Requirements:** R5

**Dependencies:** Units 1–7 merged to the branch + Vercel preview deploy
available.

**Files:**
- Create: `docs/feedback/reports/2026-04-20-pr50-branch-exercises.md`
  (or nearest-sibling path; align with existing `reports/` naming)

**Approach:**

For each exercise below, run against the preview URL, capture
pass/fail + notes. None of these exercises require new code.

1. **Rate-limit 429**:
   - Devtools console: rapid 6-request burst to
     `/api/project-posting-waitlist` with a valid email.
   - Expect: 5× 200, 1× 429.
   - Wait ~65s, submit once more, expect 200.
   - If Upstash env vars are set on preview: confirms the Upstash path.
     If not: confirms the in-memory fallback.

2. **Honeypot**:
   - One POST with `{ email: "t@test.com", company: "bot" }`.
   - Expect 200; confirm no mail at `CONTACT.internalEmail` (james@…)
     and no mail at `t@test.com`.

3. **`computeActivityStats` fallback path**:
   - Devtools response-override on `/api/xp-activity` to remove
     `task_outcome` from every commitment in the upstream response,
     OR preview-only env flag temporarily stubbing the commitments
     fetch to return empty.
   - Expect: stats still non-zero; values derived from
     `submissions × assessments` join.

4. **Zero-activity state**:
   - Devtools response-override on `/api/xp-activity` returning
     `{ contributors: 0, tasksCompleted: 0, xpReleased: 0,
     xpTotalSupply: 100000, pendingReviews: 0, recentAccepted: [] }`.
   - Expect: landing strip shows three "0" stats without broken
     styling; `/xp/activity` shows `AndamioEmptyState` with the
     "Be the first" CTA linking to `/tasks`.

5. **Hostile on-chain alias**:
   - Devtools response-override on `/api/xp-activity` injecting three
     recentAccepted entries with aliases:
     - `<img src=x onerror=alert(1)>`
     - RTL override `\u202Eevil`
     - 200-character alphanumeric string
   - Expect: no script execution, no table-column overflow (200-char
     alias wraps or truncates visually per CSS), React key stays
     unique (no duplicate-key warning in console).

**Patterns to follow:**
- Prior XP feedback reports: `docs/feedback/reports/2026-04-18-0654.md`.

**Test scenarios:**
- (N/A — this unit *is* the test scenario.)

**Verification:**
- All five exercises pass on preview.
- Report file committed to the branch before merge.
- Any failure: open a follow-up issue, decide whether to fix in this
  batch or defer to a new todo.

---

## System-Wide Impact

- **Interaction graph:** `CONTACT` constants now flow into two API
  routes + one form component. `checkRateLimit` becomes a shared
  primitive that any future API route can reuse. `getCachedActivityStats`
  replaces `computeActivityStats` at two page prefetch sites + one API
  route.
- **Error propagation:** Unit 4 removes one failure mode
  (confirmation-email-send-fails) from the waitlist endpoint. Unit 6's
  SSR `Promise.race` adds an explicit timeout rejection path, swallowed
  by the existing `try/catch`. Unit 5's Upstash calls can fail
  (network) — the rate-limiter module should treat Upstash errors as
  "allow the request through" (fail-open) because failing-closed on
  Redis downtime would make every form submission a 429.
- **State lifecycle risks:** Unit 5's email-hash keys persist in Upstash
  for the duration of the sliding window (1h). Upstash TTL handles
  expiry. No PII leak — SHA-256 of the email is used, not the raw
  string.
- **API surface parity:** `/api/sponsor-contact` shares the `FROM_ADDRESS`
  and `INTERNAL_RECIPIENT` updates via `CONTACT` (Unit 1) but otherwise
  stays unchanged. No new public endpoints.
- **Integration coverage:** Unit 8 is the integration coverage. Each of
  the five exercises is explicitly called out in the acceptance
  criteria.

## Risks & Dependencies

- **Upstash provisioning gap (Unit 5).** If env vars are never set on
  Vercel, the rate limiter silently stays in-memory. Documented, but
  worth noting in the PR body so ops knows the toggle exists.
- **Form copy churn (Unit 4).** Dropping the confirmation-email promise
  changes user-facing copy. If copy lands wrong on first review, the PR
  gets a revision round — low risk.
- **Cache-wrap behavior in dev (Unit 6).** `unstable_cache` may behave
  differently under `next dev` vs Vercel production. Preview verifies.
- **Hostile-alias exercise dependency (Unit 8).** The exercise requires
  devtools response-override comfort or a preview env flag. Mitigation:
  the user has previously demonstrated this capability; if blocked,
  surface immediately rather than ship.
- **New dependencies (Unit 5).** `@upstash/ratelimit` +
  `@upstash/redis` are small, well-maintained, and widely used with
  Vercel. Bundle-size impact is server-only — no client bundle
  regression.

## Documentation / Operational Notes

- PR body should list the seven todos by number and link the todo file
  for each, making it easy for a reviewer to cross-reference scope.
- `.env.example` gets the Upstash vars (Unit 5) with a comment that
  omission is OK — in-memory fallback applies.
- After merge, mark each todo's `status: ready` → `status: complete` in
  the frontmatter. Keep the file on disk for historical trace.
- Follow-ups remaining after this batch:
  - Verified Resend sender domain (todo 004 Option D) — infra task.
  - Upstash Redis provisioning (todo 008) — infra task.
  - Codebase-wide `<p>` sweep (todo 009c) — worth revisiting once a
    light lint rule is established.

## Sources & References

- **Todos (origin):**
  [004](../../todos/004-ready-p1-waitlist-abuse-mitigation.md),
  [005](../../todos/005-ready-p1-extend-preview-test-checklist.md),
  [006](../../todos/006-ready-p2-honor-isr-cache-on-ssr-prefetch.md),
  [007](../../todos/007-ready-p2-hydration-safe-relative-time.md),
  [008](../../todos/008-ready-p2-kv-backed-rate-limiter.md),
  [009](../../todos/009-ready-p3-raw-p-tag-sweep-and-empty-state.md),
  [010](../../todos/010-ready-p3-centralize-contact-and-extract-cta-card.md)
- **Related release:** `v0.0.2` ([release notes](https://github.com/workshop-maybe/cardano-xp/releases/tag/v0.0.2))
- **Related PR:** [#50](https://github.com/workshop-maybe/cardano-xp/pull/50) —
  originating review pass
- **Related PR:** [#51](https://github.com/workshop-maybe/cardano-xp/pull/51) —
  v0.0.2 release prep (CHANGELOG + copy)
- **External SDK:** [`@upstash/ratelimit`](https://github.com/upstash/ratelimit-js)
  (Unit 5)
- **Next.js:** `unstable_cache` (Unit 6), `revalidate` segment config
  (unchanged)
