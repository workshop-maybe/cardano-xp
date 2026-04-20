# PR #50 Branch Exercises — todo 005

**Target branch:** `chore/resolve-pr50-todos` — merged as PR #52 (commit `39003b9`)
**Target URL:** https://www.cardano-xp.io (prod, post-merge)
**Runner:** Claude (agent), delegated by jdunseith@gimbalabs.io
**Date run:** 2026-04-20 (API exercises 1–2 only; 3–5 pending browser tooling)

Five branch-coverage exercises that never fire during normal use. Each
maps to a code path that regressed silently in PR #50's review and is
still only exercised by forcing it. Run them against the preview deploy
for this branch before merge. Any failure blocks merge until fixed or
the failure is explicitly accepted with a new follow-up todo.

## 1. Rate-limit 429 boundary

**What:** Rapid 6-request burst to `/api/project-posting-waitlist` from
one origin, then window rollover.

**How:**

```js
// In browser devtools console on the preview URL:
for (let i = 0; i < 6; i++) {
  fetch("/api/project-posting-waitlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: `t${i}@test.com`, company: "" }),
  }).then((r) => console.log(i, r.status));
}
```

**Expect (Upstash path, env vars set on preview):** 5× `200`, 1× `429`.
After ~65s, one more submission → `200`.

**Expect (in-memory fallback, env vars unset):** same behavior, though
scaling to multiple instances weakens the guarantee. Note which path
was exercised.

**Result:** ✅ **pass** — ran via curl from a single source against
https://www.cardano-xp.io/api/project-posting-waitlist:

```
req 1-5: HTTP 200  {"success":true}
req 6:   HTTP 429  {"error":"Too many requests. Please try again in a minute."}
```

After ~70s sleep, one more submission returned `HTTP 200 {"success":true}`
(window rolled off cleanly). Backend in use unknown to the runner — at
minimum the in-memory fallback is working; if Upstash is also wired, the
429 may have come from there.

---

## 2. Honeypot branch

**What:** POST with `company` populated. Endpoint must return 200
without sending any email.

**How:**

```js
await fetch("/api/project-posting-waitlist", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "t@test.com", company: "bot" }),
}).then((r) => r.status);
```

**Expect:** `200`. No mail arrives at `CONTACT.internalEmail`
(`james@andamio.io`). After this batch landed, **no mail is ever sent to
the submitter address** even on the happy path — so the "honeypot sends
nothing to the submitter" property is automatically true.

**Result:** ✅ **pass (code path)** — ran via curl:

```
HTTP 200  {"success":true}
```

The route's honeypot guard at `project-posting-waitlist/route.ts` early-returns
before `resend.emails.send` runs, so a 200 here implies no internal email was
triggered. The runner cannot verify james@andamio.io's inbox directly; the
inbox check is a manual follow-up if desired.

---

## 3. `computeActivityStats` fallback path

**What:** When commitments lack `task_outcome`, stats derive from the
submissions × assessments join. Preprod upstream always includes
`task_outcome`, so this branch is dead by default.

**How:** Devtools request interception on the preview's
`/api/xp-activity` response. Either:

- **Override the upstream response:** use Chrome devtools Network →
  right-click the `/api/xp-activity` request → "Override response".
  Strip `task_outcome` from every entry in the mocked payload (or set
  each entry's `content.task_outcome` to an empty string).
- **Or** add a short-lived preview-only query-param flag in
  `computeActivityStats` that drops `task_outcome`, then revert before
  merge.

**Expect:** `/xp/activity` renders stats with non-zero values derived
from submissions joined against accepted assessments. No hard error in
the console. Numbers may differ from the primary path — document the
difference.

**Result:** ⬜ pass / ⬜ fail / ⬜ skipped — _notes_

---

## 4. Zero-activity rendering

**What:** Landing strip and `/xp/activity` render gracefully when there
is no accepted activity yet. Preprod data is already non-zero, so force
the empty state via response override.

**How:** Devtools network override on `/api/xp-activity` returning:

```json
{
  "contributors": 0,
  "tasksCompleted": 0,
  "xpReleased": 0,
  "xpTotalSupply": 100000,
  "pendingReviews": 0,
  "recentAccepted": []
}
```

Load `/` and `/xp/activity`.

**Expect:**

- Landing strip shows `Contributors 0`, `Tasks completed 0`, `XP 0 of 100,000 released` — all with neutral (non-success) styling, not success green.
- `/xp/activity` shows the `AndamioEmptyState` with the "Be the first — give feedback on the current assignment and earn your first XP." copy and an **Open tasks** action link to `/tasks`.
- No layout breakage on mobile (375px) or desktop widths.

**Result:** ⬜ pass / ⬜ fail / ⬜ skipped — _notes_

---

## 5. Hostile on-chain alias rendering

**What:** On-chain aliases are untrusted. The table must render them
safely regardless of content.

**How:** Devtools network override on `/api/xp-activity` injecting three
rows into `recentAccepted` with adversarial aliases:

```json
{
  "recentAccepted": [
    {
      "alias": "<img src=x onerror=alert(1)>",
      "xpEarned": 100,
      "slot": 150000000,
      "date": "2026-04-19T12:00:00.000Z",
      "taskHash": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    },
    {
      "alias": "\u202Eevil",
      "xpEarned": 200,
      "slot": 150000001,
      "date": "2026-04-19T12:01:00.000Z",
      "taskHash": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    },
    {
      "alias": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      "xpEarned": 300,
      "slot": 150000002,
      "date": "2026-04-19T12:02:00.000Z",
      "taskHash": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
    }
  ]
}
```

Load `/xp/activity`.

**Expect:**

- No script execution, no alert dialog.
- The `<img>` alias renders as literal text `<img src=x onerror=alert(1)>`.
- The RTL-override alias renders without escaping its container
  (surrounding layout isn't reversed).
- The 200-char alias wraps or truncates visually per CSS; the row stays
  inside the table container.
- Browser console: no duplicate-key warnings (the React key now includes
  `taskHash`).

**Result:** ⬜ pass / ⬜ fail / ⬜ skipped — _notes_

---

## Summary

| # | Exercise | Result |
|---|----------|--------|
| 1 | Rate-limit 429 | ✅ pass |
| 2 | Honeypot | ✅ pass (code path) |
| 3 | `computeActivityStats` fallback | ⬜ deferred (browser response-override required) |
| 4 | Zero-activity rendering | ⬜ deferred (browser response-override required) |
| 5 | Hostile alias | ⬜ deferred (browser response-override required) |

Gate status: 2/5 run post-merge against prod. Exercises 3–5 require
devtools Network → Override or an equivalent browser automation with
response interception. Ran after merge rather than before — the gate
described in the original todo ("before merge") was bypassed.

## Reference

- PR under test: [#52](https://github.com/workshop-maybe/cardano-xp/pull/52) (merged as commit `39003b9`)
- Plan: `docs/plans/2026-04-20-001-chore-resolve-pr50-review-todos-plan.md`
- Todo: `todos/005-ready-p1-extend-preview-test-checklist.md`
- Origin PR: [#50](https://github.com/workshop-maybe/cardano-xp/pull/50)
