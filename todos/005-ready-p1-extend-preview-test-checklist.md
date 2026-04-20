---
status: ready
priority: p1
issue_id: "005"
tags: [code-review, testing, preview, pr-50]
dependencies: []
---

# Extend PR #50 preview-test checklist with five branch exercises

## Problem Statement

The PR body's test plan lists happy-path preview checks. The testing reviewer flagged five code branches that are never exercised by normal preview use and would silently regress:

1. **Rate-limit 429 boundary** — 6th submission within 60s should return 429. 60s window-rollover should let the 6th succeed.
2. **Honeypot branch** — submission with `company` populated returns 200 without calling Resend.
3. **`computeActivityStats` fallback path** — when commitments lack `task_outcome`, stats derive from `submissions × assessments` join (different semantics for multi-submitter tasks).
4. **Near-zero / empty-state rendering** — landing-strip at all-zeros + `/xp/activity` "No accepted submissions yet" state.
5. **Hostile on-chain alias** — alias containing `<script>`, RTL override `\u202E`, 200+ chars, zero-width joiners. Plan calls out a response-shim for this but it's not evidenced as done.

Without running these exercises on preview before merge, a change in the endpoint behavior or the empty-state layout would land unnoticed.

## Findings

- **Testing Reviewer** (P1, 0.85-0.90): Enumerated all five.
- **Adversarial Reviewer**: Separately called out the hostile-alias case.

## Proposed Solution

Do the manual exercises on Vercel preview before merge. Record results in the PR body. Rough sketch:

1. **Rate limit**: devtools console → run `for (let i=0;i<6;i++) fetch('/api/project-posting-waitlist', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({email:'t@test.com'})}).then(r=>console.log(r.status))`. Expect 5×200, 1×429. Wait 61s, submit 1 more, expect 200.
2. **Honeypot**: one POST with `{email:'t@test.com', company:'bot'}`. Expect 200, confirm no Resend mail in james@andamio.io or test inbox.
3. **Fallback path**: temporary devtools response-override (or a feature-flagged `?forceFallback=1`) that strips `task_outcome` from the commitments response. Confirm stats still render non-zero.
4. **Empty state**: devtools response-override returning `{contributors:0,tasksCompleted:0,xpReleased:0,xpTotalSupply:100000,pendingReviews:0,recentAccepted:[]}`. Confirm landing and `/xp/activity` render gracefully; "Be the first" CTA links to `/tasks`.
5. **Hostile alias**: devtools response-override with one `recentAccepted` entry whose `alias` is `<img src=x onerror=alert(1)>` and another with `\u202Eevil` and one of length 200. Confirm all render as escaped text, no script execution, no table-column overflow.

## Acceptance Criteria

- [ ] All five exercises run on Vercel preview deploy for PR #50.
- [ ] Results (pass/fail + screenshots where relevant) captured in the PR description before merge.
- [ ] Any regression found during exercise fixed in the same PR.

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-04-20 | Created from PR #50 review | Manual preview is the only coverage; branch enumeration must be explicit |

## Resources

- PR: #50
