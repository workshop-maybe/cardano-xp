---
status: ready
priority: p2
issue_id: "007"
tags: [code-review, ssr, hydration, ux, pr-50]
dependencies: []
---

# Hydration-safe relative-time rendering on /xp/activity

## Problem Statement

`formatActivityDate` in `src/app/(app)/xp/activity/activity-content.tsx` calls `Date.now()` at render time. During SSR the server's clock produces strings like "59m ago"; during hydration the client's clock can produce "1h ago" (or "just now" → "1m ago" for very-recent rows). React logs a hydration mismatch warning and tears down the subtree for client-rerender. Cosmetic now; will show up in dev-console hygiene and Core Web Vitals.

## Findings

- **Correctness Reviewer** (0.82): Concrete scenario at minute/hour thresholds.
- **Julik (frontend-races) Reviewer** (0.72): Same pattern; "twelve lines, no new dependency."
- **Adversarial Reviewer** (0.80): Repro via devtools clock-skew.

## Proposed Solution

Render an absolute date during SSR, upgrade to relative after mount.

```tsx
function RelativeTime({ date }: { date: string | null }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  if (!date) return <>—</>;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return <>—</>;
  if (now === null) {
    return <>{d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</>;
  }
  // ...existing relative-time logic using `now` instead of Date.now()
}
```

- **Effort**: ~25 lines. Replace the call site in the table cell with `<RelativeTime date={entry.date} />`.
- **Risk**: Low. Self-updating every 30s is a minor nicety.

## Acceptance Criteria

- [ ] No hydration mismatch warnings in browser console on `/xp/activity`.
- [ ] First-paint shows an absolute "Apr 18" style date; after mount it flips to the relative form.
- [ ] Table rows auto-update their relative string every 30s while the page is mounted.

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-04-20 | Created from PR #50 review | Relative-time-in-render is a classic hydration hazard |

## Resources

- PR: #50
