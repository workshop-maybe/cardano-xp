# XP Activity Dashboard — Requirements

**Date:** 2026-04-18
**Status:** Ready for planning
**Origin issue:** [#43 — Public dashboard showing XP projects, contributors, and contribution activity](https://github.com/workshop-maybe/cardano-xp/issues/43)
**Reporter:** dcm (via XP feedback)

## Terminology

- **Dashboard** — the v1 surface as a whole. Comprises the landing-section strip on `/` plus the dedicated `/xp/activity` page.
- **Activity page** — the dedicated route at `/xp/activity`.
- **Landing section** — the strip + form rendered on `/`.

## Problem Frame

Cardano XP is invisible from outside. A new visitor lands on the site and sees a sign-up flow but no sense of where this is going or why it matters. The reporter's framing (dcm) asked for "projects, contributors, and activity" in plural — a multi-project visibility picture.

Cardano XP is single-project today, but the product vision is multi-project: contributors earn XP through Assignment 1 (giving first feedback), then a future Assignment 2 (a how-to guide on posting a project) unlocks the ability to mint a project token and launch their own project on Cardano XP. This PR is the first place that trajectory is told publicly.

**v1's job is to declare trajectory, not to signal current-momentum.** Current activity numbers are a supporting signal that something real is happening, not the load-bearing claim — the load-bearing claim is "this is where XP is going, and you can get on board." Social proof of today's momentum is a downstream effect that compounds as activity grows; it is not the precondition for v1 to work.

**Reporter-framing check:** dcm's request used plural language ("projects, contributors"). v1 intentionally reframes this as a single-project-today, multi-project-vision story. Confirming the reframe with dcm before shipping is a named acceptance step (not a hard blocker — dcm is unlikely to push back on a trajectory-focused delivery, but the check closes the loop).

## Key Decisions

### 1. Placement — landing strip + dedicated activity page

A small live-stats section on `/` (where first-time visitors land) plus a dedicated `/xp/activity` page with the fuller view. The landing section teases and links; the activity page tells the whole story.

### 2. Future narrative — named mechanism, no numbers, "notify me when it goes live" form

Tell the story at the level of mechanism, not specifics:

- Assignment 1 (exists today): giving first feedback → earn XP.
- Assignment 2 (coming soon): a how-to guide on posting a project. Prerequisite is having earned enough XP via Assignment 1.
- Posting a project: Assignment 2 completion + minting a project token to launch.

The copy **does not commit to specific numbers** — neither the XP threshold for Assignment 2 nor the ADA cost for minting a project token. Both are still internally undecided; leaving them vague in v1 means the copy doesn't rot when they land.

### 3. Email capture — email-only, reuses Resend pattern

The "notify me" form collects email only. Submission emails `james@andamio.io` via Resend, same pattern as the existing `/api/sponsor-contact` endpoint. Submitter also receives a confirmation email ("You're on the list — we'll email when project posting ships") to keep the relationship warm between signup and launch. No database persistence in v1 — when the feature ships, James exports emails manually from his inbox.

### 4. Architectural pattern — async server components, matching `/xp`

`src/app/page.tsx` becomes an async server component; existing client logic moves into `src/app/page-content.tsx`. Activity data prefetches server-side, hydrates via `HydrateClient` — identical pattern to `src/app/(app)/xp/page.tsx` + `xp-content.tsx`. Same treatment on `/xp/activity`.

## Requirements

### Landing section (on `/`)

- **R1.** Renders three live metrics — **contributors** (distinct aliases who have earned XP through accepted assessments), **tasks completed** (count of accepted assessments), **XP released** (sum of XP rewards for accepted assessments) out of the 100,000 fixed supply. All metrics render gracefully at near-zero values — zero contributors, zero assessments, or zero XP released must look intentional, not broken. No empty placeholders, no loading spinners on first paint.
- **R2.** Includes a tagline naming the future mechanism: a one- or two-sentence copy block (exact wording drafted in the PR and tuned on review, following the pattern used on #40). Names Assignment 2 and the project-posting unlock *without naming any numbers* (no XP threshold, no ADA cost).
- **R3.** Includes a primary "Notify me" CTA that reveals the email-capture form inline (no modal), plus a "See all activity →" secondary link to `/xp/activity`.

### Activity page (`/xp/activity`)

- **R4.** A new public route `/xp/activity` exists, discoverable via the same nav surfaces that expose `/xp/leaderboard`, and structurally a sibling to the leaderboard (same auth-free, public-data pattern).
- **R5.** The page surfaces: a hero narrative block (copy deferred to PR); current-activity metrics — the same three numbers from R1 plus a **pending-reviews count** (assessments whose `decision` value does not start with `ACCEPT` after upper-casing, matching the leaderboard's existing inclusion logic inverted); a short list of recent accepted assessments sorted by on-chain `slot` descending, showing alias · task · XP earned for the most recent 5–10 entries; a "What's next" block describing the Assignment 1 → XP → Assignment 2 → project-token mechanism in plain English; and the email-capture form (same component as landing, per R7). All on-chain-sourced strings (aliases, task names) must be treated as untrusted per the pattern established in `src/lib/alias-validation.ts` and PR #48 — render via React JSX interpolation only, never via `dangerouslySetInnerHTML`, never as the whole of an `href`, and use `encodeURIComponent` for any query-string uses. Near-zero states render the same way as R1 — intentional, not broken.

### Backend — `/api/project-posting-waitlist`

- **R6.** A new API route at `/api/project-posting-waitlist` accepts POST requests with an email-only body, zod-validated. On success, sends two emails via Resend: (a) a notification to `james@andamio.io` with subject "Cardano XP — project-posting waitlist" containing the submitter's email, and (b) a confirmation email to the submitter with subject "You're on the list" and short body ("We'll email you when project posting opens on Cardano XP."). Returns `{ success: true }` on success and a 4xx JSON error on validation/infrastructure failure.

  Operational requirements on this endpoint:
  - **Per-IP rate limit.** 5 requests/minute minimum. Implementation mechanism (middleware, edge function, or library) is a planning decision; the rate-limit ceiling is the requirement.
  - **Bot honeypot.** A hidden form field that real users never fill; submissions with a non-empty honeypot are silently discarded (200 response, no email sent) so bots get no signal.
  - **Resend-key guard.** If `env.RESEND_API_KEY` is absent, return 503 with a clear error body (matches `src/app/api/sponsor-contact/route.ts`).
  - **Privacy disclosure.** The form UI includes a one-line note near the submit button: "Your email is used only to notify you when project posting launches. Email `james@andamio.io` to request deletion." The endpoint does not persist emails beyond the inbox; retention policy is informally capped at 12 months or until the announcement is sent, whichever comes first.

### Shared components & data

- **R7.** The email-capture form is a single shared component used on both landing and activity surfaces — same validation, same submit path, same visual treatment, same interaction states: **idle** (collapsed on landing, expanded on activity), **typing** (client-side email-format check preview), **submitting** (disabled input + button, inline spinner), **success** (form replaced by "Thanks — check your inbox for confirmation" affirmation, no visible re-submit path in the same browser session; use `sessionStorage` to suppress re-render for the same user-session), **error — network or server** (inline error + retry button), **error — invalid email** (inline field-level error, no submit). Mobile layout: form fields and button stack vertically below `sm` breakpoint; inline reveal on landing moves keyboard focus to the email input.
- **R8.** All aggregation runs server-side. `src/app/page.tsx` converts to an async server component; existing client logic moves to `src/app/page-content.tsx`. Activity data prefetches via a new server-only module (sibling to `src/lib/xp-leaderboard.ts` — likely `src/lib/xp-activity.ts`) and hydrates via `HydrateClient`. Same pattern on `/xp/activity`. No client-side loading spinner on first paint for public data.
- **R9.** The PR follows the established workflow: single branch, single PR, no Claude Code attribution in commits or PR body. Before merge, a one-line DM to dcm confirming the single-project-for-now framing is an acceptance step.

## Scope Boundaries

- **Not v1:** time-series charts, per-task drill-downs, per-contributor history pages.
- **Not v1:** the actual Assignment 2 content or the project-token mint flow. This PR only tells the story of what's coming.
- **Not v1:** database persistence for waitlist emails. Inbox-based list management is acceptable until volume demands otherwise.
- **Not v1:** automated bulk announcement when the project-posting feature ships (i.e., programmatic send to everyone on the list). The per-submission confirmation email is in scope — this non-goal is the later bulk send.
- **Not v1:** verified Resend sending domain (SPF/DKIM aligned with `cardano-xp.io`). Flagged in planning as a follow-up before any outbound community-facing email at volume.
- **Not v1:** internationalization or alternate-copy variants.
- **Not v1:** moderating or differentiating spam-flagged contributions on the activity feed.

### Deferred to Separate Tasks

- **Assignment 2 content (the how-to guide):** James's next product build. Unblocks "coming soon" messaging but scoped to its own iteration.
- **Project-token mint flow:** Separate technical track once Assignment 2 is ready.
- **Automated bulk mail-send to waitlist:** If the list grows meaningfully, migrate to a managed list (Buttondown, Substack, Loops, etc.) in a follow-up PR.
- **XP-threshold decision + project-token mint ADA cost:** Product decisions that affect Assignment 2 gating and tokenomics, not this PR's copy.
- **Verified Resend sender domain:** ~15-min infra task; should land before any community-facing email at volume.

## Data Sources

All metrics come from `MergedProjectDetail` via the existing Andamio gateway v2 API. The existing `src/lib/xp-leaderboard.ts` module already fetches and parses this response; the new dashboard module follows the same pattern (likely `src/lib/xp-activity.ts`, sibling).

| Metric | Source |
|---|---|
| Contributor count | Distinct aliases who have earned XP > 0. Mirrors the leaderboard's `xp > 0` filter after computing per-alias totals — submitters on accepted assessments (not `assessed_by`). |
| Tasks completed | Count of `assessments[]` where `decision.toUpperCase().startsWith("ACCEPT")`. |
| XP released | Sum of XP rewards across accepted assessments; total supply (100,000) is a config constant. |
| Pending-reviews count (activity page only) | Count of `assessments[]` where `decision` is falsy or does not start with "ACCEPT" after upper-casing. |
| Recent accepted assessments | Last 5–10 accepted assessments sorted by on-chain `slot` descending. `accepted_at` does not exist on `ProjectAssessmentOnChain` — use `slot` as the ordering key. For display, either render `slot` raw (internal/compact) or convert via the Shelley-era slot→date helper already in `src/lib/cardano-utils.ts`. |

New server-only module lives at `src/lib/xp-activity.ts` (sibling to `xp-leaderboard.ts`).

## Success Criteria

- A first-time visitor to `cardano-xp.io` sees the trajectory narrative + current activity numbers within one scroll of the hero on `/`.
- The trajectory story ("contribute now → post later") is legible to someone who's never used an Andamio app before, without any numbers that could rot.
- A visitor curious enough to want notified can submit their email in one click-and-type from either surface, and immediately receives a confirmation email.
- No regression on existing `/` or `/xp/*` page load performance — landing strip prefetches server-side, no new loading spinner on first paint.
- When Assignment 2 ships, James has a list of interested emails to announce to (manual export from inbox is acceptable for the initial list size).
- dcm confirms the single-project-for-now framing before merge.

## Open Questions

### Resolved During Brainstorm

- *Where does v1 live — landing section, dedicated page, or both?* **Both.** Landing for trajectory declaration + interest capture, dedicated page for the full story.
- *How explicit is the future mechanism in v1 copy?* **Named mechanism, no threshold number, no ADA price, with a "notify me" form + confirmation email.**
- *What does the capture form collect?* **Email only.**
- *Do we persist the email list?* **Not in v1 — inbox-based via Resend, same as sponsor-contact. Per-submission confirmation keeps the relationship warm.**
- *Does the dashboard try to handle multi-project data?* **No — single-project today. The multi-project vision is narrative only.**
- *What is v1's actual job — social proof or trajectory declaration?* **Trajectory declaration.** Social proof is a downstream effect that compounds as activity grows; it is not the precondition for v1 to work.
- *How do we resolve the `"use client"` conflict on `/`?* **Split `page.tsx` into async server component + `page-content.tsx`, mirroring the `/xp` pattern.**
- *Should we commit to 150 ADA for the project-token mint in public copy?* **No — remove entirely. Mechanism described without a number, matching how the XP threshold is handled.**

### Deferred to Planning

- Exact placement of the landing section relative to the existing hero (above, below, interleaved).
- Whether the email form lives as a standalone shared component or extends an existing form primitive.
- Whether `xp-activity.ts` is a new module or an extension of `xp-leaderboard.ts`.
- Rate-limit implementation mechanism (middleware, edge, library — e.g. `@upstash/ratelimit`).
- Whether the "recent assessments" list shows human-readable timestamps (via slot conversion) or raw slot numbers.

### Deferred to Future Work

- XP threshold for Assignment 2 eligibility.
- Project-token mint ADA cost.
- Assignment 2 itself.
- Project-token mint flow.
- Automated bulk announcement pipeline.
- Verified Resend sender domain.

## Sources & References

- **Origin issue:** [#43](https://github.com/workshop-maybe/cardano-xp/issues/43)
- **Related brainstorms:** `docs/brainstorms/2026-03-22-xp-leaderboard-brainstorm.md` (established the "reputation token, visibility is the point" framing this extends).
- **Established security pattern:** PR #48 + `src/lib/alias-validation.ts` (on-chain strings are untrusted).
- **Relevant code:**
  - `src/lib/xp-leaderboard.ts` — server-only aggregation pattern to mirror.
  - `src/app/(app)/xp/page.tsx` + `xp-content.tsx` — async-server-wrapper + client-content split pattern for `page.tsx` conversion.
  - `src/app/(app)/xp/leaderboard/` — public-route + HydrateClient pattern.
  - `src/app/api/sponsor-contact/route.ts` — Resend-email-on-submit pattern.
  - `src/lib/cardano-utils.ts` — `slotToDate` helper for the recent-assessments list.
  - `src/app/page.tsx` — landing surface requiring the client/server restructure.
