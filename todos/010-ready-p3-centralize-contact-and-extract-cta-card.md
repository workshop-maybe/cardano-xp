---
status: ready
priority: p3
issue_id: "010"
tags: [code-review, maintainability, dry, pr-50]
dependencies: []
---

# Centralize contact email constants; extract CrossLinkCard

## Problem Statement

Two small DRY wins surfaced in PR #50 review.

**10a**: `james@andamio.io` is hardcoded in three places — the waitlist form's privacy-disclosure copy, `sponsor-contact/route.ts`, and `project-posting-waitlist/route.ts` `INTERNAL_RECIPIENT`. `FROM_ADDRESS = "Cardano XP <onboarding@resend.dev>"` is duplicated across the two API routes. Changing the contact address or sender means three or four simultaneous edits.

**10b**: `src/app/(app)/xp/xp-content.tsx:141-174` has two near-identical CTA cards (Leaderboard + Activity). Identical wrapper, hover transition, arrow — only href/title/subtitle differ.

## Findings

- **Maintainability Reviewer** (0.88, 0.65).

## Proposed Solution

### 10a: `src/config/contact.ts`

```ts
export const CONTACT = {
  internalEmail: "james@andamio.io",
  fromAddress: "Cardano XP <onboarding@resend.dev>",
} as const;
```

Import from both API routes and the form copy.

### 10b: File-local `CrossLinkCard` in `xp-content.tsx`

```tsx
function CrossLinkCard({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} className="group flex items-center justify-between rounded-xl border border-secondary/30 bg-secondary/5 p-6 transition-colors hover:bg-secondary/10">
      <div className="space-y-1">
        <p className="font-display font-bold text-lg text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <span className="text-secondary text-2xl transition-transform group-hover:translate-x-1">→</span>
    </Link>
  );
}
```

(Or upgrade to `AndamioText` per todo #009 at the same time.)

## Acceptance Criteria

- [ ] `james@andamio.io` literal appears only in `src/config/contact.ts` (or equivalent).
- [ ] `FROM_ADDRESS` literal appears only in one place.
- [ ] Two Leaderboard/Activity CTA cards in `xp-content.tsx` share one file-local component.

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-04-20 | Created from PR #50 review | Small DRY wins compound when routes multiply |

## Resources

- PR: #50
