---
status: ready
priority: p2
issue_id: "012"
tags: [code-review, security, agent-parity, waitlist, pr-52]
dependencies: []
---

# Decide the `isSameOrigin` policy when the Origin header is missing

## Problem Statement

`isSameOrigin()` in `/api/project-posting-waitlist/route.ts` returns `true` when the `Origin` header is absent. That is deliberate (preserves scriptable access for agents and testing tools), but it also means a bot running `curl -X POST` with no `Origin` header bypasses the check. Combined with the Upstash-optional posture, the weakest guard is the 5/min per-IP limit.

PR #52 closed the email-bombing reflector (internal-only send), so the worst case degrades from "victim inbox-flooded with Cardano XP mail" to "`james@andamio.io` inbox flooded with attacker-supplied email strings." Lower severity, but still a vector that deserves a product call.

## Findings

- **Adversarial Reviewer** (P2, 0.90): documented the `curl` bypass.
- **Agent-Native Reviewer** (positive observation): deliberately allows this for skill/agent scripts.

## Proposed Solutions

### Option A: Keep current behavior — "missing Origin is allowed"

- **Pros**: Agent parity preserved; skills like `/xp-watch` can POST without friction.
- **Cons**: Bot bypass.

### Option B: Require Origin — reject if missing

- **Pros**: Tightens CSRF surface.
- **Cons**: Breaks direct-HTTP agent scripts. Incompatible with `.env.example`'s "stays scriptable" comment.

### Option C: HMAC-signed header for scripted access

- **Pros**: Both agents and humans can use the endpoint; bots without the secret can't.
- **Cons**: Another secret to rotate; skill files need the key; ~30 LOC.

### Option D: Require Origin for form-type submissions; allow missing only on paths with no mutation

- Not applicable here (the route is a mutation).

## Recommended Action

**Option A + rate-limiter strengthening** is the pragmatic call for v0.0.2's low-volume waitlist. The abuse surface is bounded to flooding `james@andamio.io` at 5/min/IP — manageable with inbox filters. Revisit if actual abuse surfaces.

Follow-up: if Option C is chosen later, co-ordinate with the skill catalog so agent scripts receive the HMAC secret.

## Acceptance Criteria

- [ ] Document the chosen policy in the route handler's JSDoc.
- [ ] If Option B or C: update skills (`/xp-watch`) that POST to the endpoint.
- [ ] Note the decision in the PR body for v0.0.3.

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-04-20 | Created from PR #52 autofix review | adv-005 |

## Resources

- `src/app/api/project-posting-waitlist/route.ts:35-52`
- PR: #52
