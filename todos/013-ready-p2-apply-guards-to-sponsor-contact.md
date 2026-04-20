---
status: ready
priority: p2
issue_id: "013"
tags: [code-review, security, sponsor-contact, pr-52]
dependencies: []
---

# Apply waitlist guards (rate-limit + same-origin + honeypot) to sponsor-contact

## Problem Statement

After PR #52 landed, `/api/project-posting-waitlist` has:

- `isSameOrigin` cross-origin guard
- Per-IP + per-email rate limits (shared `src/lib/rate-limiter.ts`)
- Honeypot field on the form
- Resend `{ error }` inspection after send
- Structured `[RATE_LIMITER_FAIL_OPEN]` logging

`/api/sponsor-contact` has none of these. Both endpoints hit the same Resend account and both deliver mail to `CONTACT.internalEmail`. A bot that's been blocked from waitlist abuse can just pivot to sponsor-contact.

## Findings

- **Adversarial Reviewer** (P3, 0.85): explicit pivot scenario.
- Touched in PR #52 only for `CONTACT` import; full hardening was out of scope.

## Proposed Solution

Lift the shared guards into a small helper (`src/lib/form-guards.ts`) or inline the same four checks into `sponsor-contact/route.ts`:

```ts
// Pseudocode — same structure as waitlist
if (!isSameOrigin(request)) return 403;
if (!env.RESEND_API_KEY) return 503;
const ip = getClientIp(request);
if (!(await checkRateLimit("ip", ip)).success) return 429;
const result = waitlistSchema.safeParse(body);
if (!result.success) return 400;
if (data.honeypot?.trim().length > 0) return 200; // silent drop
// send…
if (send.error) return 500;
return 200;
```

Also update the sponsor-contact form to include a honeypot field (same pattern as the waitlist form).

## Acceptance Criteria

- [ ] `src/app/api/sponsor-contact/route.ts` runs the same four guards as the waitlist route.
- [ ] `src/app/(app)/sponsors/sponsor-contact-form.tsx` includes a honeypot field.
- [ ] Shared guards (if extracted) live in `src/lib/form-guards.ts` or similar.
- [ ] Manual preview test: 6× curl burst hits 429 on the 6th.

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-04-20 | Created from PR #52 autofix review | adv-006 |

## Resources

- `src/app/api/sponsor-contact/route.ts`
- `src/app/api/project-posting-waitlist/route.ts` (reference implementation)
- `src/lib/rate-limiter.ts`
