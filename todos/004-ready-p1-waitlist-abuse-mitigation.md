---
status: ready
priority: p1
issue_id: "004"
tags: [code-review, security, abuse, waitlist, pr-50]
dependencies: []
---

# Mitigate email-bombing abuse surface on /api/project-posting-waitlist

## Problem Statement

The waitlist endpoint sends a Cardano XP-branded confirmation email to any address a submitter provides, with no proof-of-possession. Combined with the shared Resend sandbox sender (`onboarding@resend.dev`), per-instance in-memory rate limiter, and the forkable-template nature of this repo, it functions as a ready-made email-bombing reflector. A single attacker can flood a victim's inbox and damage the shared sender's reputation (which also affects `/api/sponsor-contact`).

PR #50 review (correctness, security, adversarial — all high confidence) flagged this as P1. The initial defense (`Origin`/`Referer` check) has landed in the PR; the structural mitigation below is still open.

## Findings

- **Security Reviewer** (0.85): "An attacker can weaponize this endpoint to flood a victim's inbox with Cardano XP-branded mail." Suggests double opt-in, per-email throttle, or dropping the confirmation.
- **Adversarial Reviewer** (0.90): "Shared Resend sandbox sender means reputation damage spills onto every Resend project using it. 5/min × N warm instances × trivial XFF spoofing = effectively unbounded."
- **Reliability Reviewer**: Called out that the confirmation send is not the primary value — the internal notification is. Inverting priority (internal always, user-confirmation optionally) reduces blast radius.

## Proposed Solutions

### Option A (recommended for v0.0.2): Drop user confirmation, keep only internal notification

- **Pros**: Eliminates the reflector surface entirely. The on-page success state already reassures the user ("You're on the list — check your inbox"). Internal notification still captures the signal.
- **Cons**: Subscribers don't get a provable trail in their inbox.
- **Effort**: ~10 lines — remove the second `resend.emails.send`, adjust copy to match. Update the success-state component copy if it implies "check your inbox for confirmation."
- **Risk**: Low.

### Option B: Double opt-in — confirmation link the user must click before recording

- **Pros**: Proves email ownership, preserves confirmation UX, industry-standard for newsletter signups.
- **Cons**: Requires HMAC-signed token + stateless verify endpoint or a KV-backed pending-confirmations store. Adds ~100 lines.
- **Effort**: Medium.
- **Risk**: Low with careful token design.

### Option C: Per-email-address rate limit (KV-backed)

- **Pros**: Caps one email per N minutes per address regardless of source IP.
- **Cons**: Requires shared state (Vercel KV / Upstash) — same dependency as todo #006 below.
- **Effort**: Medium, blocked on KV infrastructure.

### Option D: Move off shared `onboarding@resend.dev` to a verified `cardano-xp.io` sender

- **Pros**: Isolates reputation damage. Plan already flags this as a deferred item.
- **Cons**: ~15min infra task, SPF/DKIM/DMARC setup.
- **Effort**: Small.
- **Risk**: Low.

## Recommended Action

Ship **Option A** now (cheapest, closes the reflector surface). Couple it with **Option D** before any volume. Option B is the long-term right answer but not required for v0.0.2's low-volume waitlist.

## Technical Details

- **Affected files**:
  - `src/app/api/project-posting-waitlist/route.ts` lines 112-139 (`resend.emails.send` pair)
  - `src/components/xp/project-posting-waitlist-form.tsx` lines 103-113 (success-state copy)
- **Origin check is already landed** in this PR as defense-in-depth.

## Acceptance Criteria

- [ ] `/api/project-posting-waitlist` sends at most one email per successful submission, and that email is the internal notification.
- [ ] Success-state copy does not promise a confirmation email the user won't receive.
- [ ] Manual preview test: submit valid email, confirm `james@andamio.io` receives the notification, confirm the submitted address receives no mail.
- [ ] Before launch: verified `cardano-xp.io` sender domain configured in Resend + used as `FROM_ADDRESS` in both waitlist and sponsor-contact routes.

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-04-20 | Created from PR #50 review | Email-bombing reflector pattern; Origin check landed, structural fix still open |

## Resources

- PR: #50
- Related: `docs/plans/2026-04-18-006-feat-xp-activity-dashboard-plan.md` (deferred verified sender item)
