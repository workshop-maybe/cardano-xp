---
status: complete
priority: p2
issue_id: "008"
tags: [code-review, security, abuse, infra, pr-50]
dependencies: ["004"]
---

# Migrate /api/project-posting-waitlist rate limiter to Vercel KV or Upstash

## Problem Statement

The current in-memory `Map<string, number[]>` rate limiter is acknowledged in the source as best-effort. Real limits are:

1. **Per-instance isolation**: Vercel autoscales; effective rate = 5/min × N warm instances.
2. **XFF trust**: attacker-controlled on non-Vercel deploys and brittle on Vercel itself.
3. **Unbounded map growth**: entries are never deleted; memory creeps on long-lived instances.

The plan explicitly named this as deferred. PR #50 review reconfirmed — combined with the abuse surface (todo #004), per-instance is the wrong threat model.

## Findings

- **Security, Reliability, Performance, Adversarial Reviewers**: Multiple confirmations; all point to the same structural fix.

## Proposed Solution

Adopt `@upstash/ratelimit` + Upstash Redis (or Vercel KV). Stateless serverless-friendly, shared across all instances and regions.

```ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  analytics: true,
});

const { success } = await ratelimit.limit(ip);
if (!success) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
```

Also add per-email-address limit as a separate key (e.g. `waitlist:email:${hash}`) with a looser window (1 per hour) to stop email-bombing from a single source even if IP is rotated.

## Acceptance Criteria

- [ ] Rate limiter uses a shared backend (Upstash Redis or Vercel KV).
- [ ] Per-IP and per-email limits both enforced.
- [ ] In-memory `submissionTimestamps` Map removed.
- [ ] `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` (or KV equivalents) added to `.env.example` and Vercel project env.

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-04-20 | Created from PR #50 review | In-memory rate limits on serverless are cosmetic at scale |

## Resources

- PR: #50
- `@upstash/ratelimit` docs
- Related: todo #004 (waitlist abuse mitigation)
