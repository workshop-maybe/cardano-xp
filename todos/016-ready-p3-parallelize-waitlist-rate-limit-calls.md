---
status: ready
priority: p3
issue_id: "016"
tags: [code-review, performance, rate-limiter, waitlist, pr-52]
dependencies: ["011"]
---

# Parallelize the IP and email Upstash rate-limit calls

## Problem Statement

`/api/project-posting-waitlist` performs two sequential `await checkRateLimit(...)` calls: one on IP (line 72) and one on the hashed email (line 109-112). Upstash REST RTT is 50-200ms per call, so the happy-path submission pays 100-400ms of serialized network latency.

Both limits are keyed independently (`cxp:rl:ip` vs `cxp:rl:email`), so they can run in parallel via `Promise.all` with no data dependency. The current ordering does defeat the "rate-limit before body parse" optimization for the email check, which runs *after* parse + zod + honeypot anyway.

## Findings

- **Performance Reviewer** (P3, 0.72)
- **Reliability Reviewer** (P2, 0.85)

## Proposed Solution

Parallelize after zod + honeypot (so bot/malformed submissions don't consume rate-limit slots):

```ts
// After the honeypot short-circuit
const [ipCheck, emailCheck] = await Promise.all([
  checkRateLimit("ip", ip),
  checkRateLimit("email", hashEmailForRateLimit(email)),
]);
if (!ipCheck.success) return 429 /* ip message */;
if (!emailCheck.success) return 429 /* email message */;
```

Caveat: this pushes IP rate-limit consumption *after* body parse, which slightly changes the DoS profile — a flood of malformed JSON now burns zero rate-limit slots (was: burns per-IP budget). That's arguably an improvement.

Depends on todo 011 (the "consume after send" reorder) — these should land together to avoid reworking the same function twice.

## Acceptance Criteria

- [ ] Waitlist POST completes with a single Upstash round-trip's worth of latency instead of two.
- [ ] No regression in rate-limit enforcement (verified via the preview test checklist).
- [ ] Benchmark note in PR body showing latency delta.

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-04-20 | Created from PR #52 autofix review | perf-1, rel-1 |

## Resources

- `src/app/api/project-posting-waitlist/route.ts:72, 109-112`
- todo 011
- `@upstash/ratelimit` docs
