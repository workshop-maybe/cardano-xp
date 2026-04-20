---
status: ready
priority: p3
issue_id: "014"
tags: [code-review, api-contract, waitlist, pr-52]
dependencies: []
---

# Add a machine-readable discriminator to waitlist 429 responses

## Problem Statement

`/api/project-posting-waitlist` returns `429` with two different human-readable messages depending on which limit tripped:

- IP limit: `{ error: "Too many requests. Please try again in a minute." }`
- Email limit: `{ error: "This email was submitted recently. Please try again later." }`

Clients that want to treat the two differently (e.g., retry after 60s vs. guide the user to a different address) must regex the `error` string — brittle. No `Retry-After` header is sent either.

## Findings

- **API-Contract Reviewer** (P3, 0.72)
- **Agent-Native Reviewer** (positive observation)

## Proposed Solution

Add an optional `code` field to the 429 body and a `Retry-After` header:

```ts
return NextResponse.json(
  {
    error: "Too many requests. Please try again in a minute.",
    code: "rate_limit_ip",
  },
  { status: 429, headers: { "Retry-After": "60" } },
);

return NextResponse.json(
  {
    error: "This email was submitted recently. Please try again later.",
    code: "rate_limit_email",
  },
  { status: 429, headers: { "Retry-After": "3600" } },
);
```

Add a shared `WaitlistErrorResponse` type in `src/types/` so clients can discriminate at compile time.

## Acceptance Criteria

- [ ] Both 429 responses carry a `code` field and `Retry-After` header.
- [ ] `src/types/waitlist.ts` (or nearest sibling) exports the response union.
- [ ] Form consumer continues to render `data.error` verbatim (backward-compatible).

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-04-20 | Created from PR #52 autofix review | api-contract-1 |

## Resources

- `src/app/api/project-posting-waitlist/route.ts:96-118`
- PR: #52
