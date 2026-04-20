---
status: ready
priority: p2
issue_id: "011"
tags: [code-review, reliability, rate-limiter, waitlist, pr-52]
dependencies: []
---

# Consume per-email rate limit only after Resend delivers

## Problem Statement

`/api/project-posting-waitlist` currently calls `checkRateLimit("email", hash)` *before* `resend.emails.send()`. If Resend returns a transient error (503, rate-limited upstream, quota blip), the handler returns 500 — but the per-email bucket has already been decremented. When Upstash is the backend, that means the submitter sees a 429 "This email was submitted recently" for the next hour even though no email was ever delivered.

Compounds with todo 004's removal of the user-confirmation email: the submitter has no signal the internal send actually worked, retries once, gets a 429, and concludes the whole flow is broken.

## Findings

- **Adversarial Reviewer** (P2, 0.90): concrete lockout sequence traced end-to-end.

## Proposed Solution

Move the per-email rate-limit consumption to AFTER the Resend send resolves successfully. Two shapes:

### Option A: Check twice (probe, then consume)

```ts
const emailKey = hashEmailForRateLimit(email);
const probe = await checkRateLimitProbe("email", emailKey); // NEW — doesn't consume
if (!probe.success) return 429;
// ... send ...
if (internal.error) return 500;
await checkRateLimit("email", emailKey); // consume on success
```

Requires adding a `probe` variant to `rate-limiter.ts`. Upstash's `Ratelimit.getRemaining()` exists for this.

### Option B: Reorder — send first, then check on retry

Skip the per-email check on the first attempt; enforce it only when the submitter retries within the window. Ugly; probably not worth pursuing.

### Option C: Revert on failure

Check (consume), send, revert on failure. Upstash doesn't expose a `revert` primitive — would require a manual `Ratelimit.limit()` reset, which is awkward.

## Recommended Action

**Option A.** Add `checkRateLimitProbe` alongside `checkRateLimit`. Call probe before the Resend send; consume only on success. Keeps the Upstash API usage idiomatic.

## Acceptance Criteria

- [ ] User can retry after a Resend 5xx without hitting a per-email 429.
- [ ] Abuse path (same email submitted twice successfully within 1h) still produces a 429.
- [ ] Unit/integration test covers both paths.

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-04-20 | Created from PR #52 autofix review | adv-001 |

## Resources

- PR: #52
- `src/app/api/project-posting-waitlist/route.ts:109-145`
- `src/lib/rate-limiter.ts`
