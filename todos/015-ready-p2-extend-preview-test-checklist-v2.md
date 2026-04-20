---
status: ready
priority: p2
issue_id: "015"
tags: [code-review, testing, preview, pr-52]
dependencies: ["005"]
---

# Extend the PR #52 preview-test checklist with six additional exercises

## Problem Statement

`docs/feedback/reports/2026-04-20-pr50-branch-exercises.md` (todo 005) was written for PR #52's scope pre-autofix. The autofix round added new code paths that the current checklist doesn't exercise. Reviewers flagged six additions:

1. **Rate-limiter backend probe.** Record whether preview uses Upstash or in-memory at the top of exercise #1 (both branches have different semantics).
2. **Per-email 429 (Upstash only).** Submit same email twice within 1h from two sessions/IPs. Expect 200 then 429 with `"This email was submitted recently"`.
3. **Happy-path single-send verification.** One submission produces exactly one email at `CONTACT.internalEmail`, zero at the submitter's address. Prevents regression that re-adds a second send.
4. **Hydration warnings check.** Hard-reload `/xp/activity` with devtools open; expect zero `"Text content did not match"` warnings on English and non-English (fr-FR) locales.
5. **Cache-hit verification.** Two `/api/xp-activity` requests within 5 min produce exactly one upstream gateway call. Requires a temporary `console.log` in `computeActivityStats`.
6. **Upstash fail-open.** Point `UPSTASH_REDIS_REST_URL` at an invalid host on a preview deploy; submit; expect 200 and `[RATE_LIMITER_FAIL_OPEN]` log line.

## Findings

- **Testing Reviewer** (P2, 0.85-0.90): all six enumerated with runner-friendly steps.

## Proposed Solution

Append these exercises to `docs/feedback/reports/2026-04-20-pr50-branch-exercises.md` (or create a sibling report for the autofix round). Each follows the existing format: what, how, expect, result (⬜ pass / ⬜ fail / ⬜ skipped).

## Acceptance Criteria

- [ ] Six new exercises added to the report file.
- [ ] All nine+ exercises run against the Vercel preview deploy before merge.
- [ ] Failures become new todos or are resolved in this PR.

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-04-20 | Created from PR #52 autofix review | testing reviewer findings 1-7 |

## Resources

- `docs/feedback/reports/2026-04-20-pr50-branch-exercises.md`
- todo 005 (parent)
