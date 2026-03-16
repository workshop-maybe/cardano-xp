# 010 — About Page: Feedback Focus

**Date:** 2026-03-16
**Tags:** about, feedback, copy, footer, collaboration

## What happened

Rewrote the about page to center on feedback instead of tokenomics. The old page led with "100,000 XP tokens" and minting rules. The new page leads with "We need your feedback" and lists four things people can review: apps, Andamio, courses, and proposals.

Also tuned the footer — bumped gray text opacity so labels are actually readable, and gave "cardano" and "andamio" the same foreground treatment as "prototype" so the proper nouns stand out.

## Key decisions

- **Feedback is the headline, not tokens.** XP is mentioned as a reward, not as the subject. The page is about what needs feedback and why it matters.
- **Four feedback targets.** Apps (devs post them here), Andamio (the platform), Courses (examples coming soon), Proposals (Andamio / Gimbalabs / Cardano Treasury).
- **Voice: casual and direct.** "This app was vibe coded on a Sunday afternoon. Devs are gonna dev — but the way we build connections is through feedback."
- **Footer readability.** Labels went from `/40` to `/70` opacity, base text from `/60` to `/80`. Proper nouns ("cardano", "andamio") match value text at `text-foreground/70`.

## Files changed

- `src/app/(app)/about/page.tsx` — full rewrite of content sections
- `src/components/layout/app-footer.tsx` — opacity and color adjustments

## What's next

- Link feedback targets to actual tasks or external resources
- Add the treasury proposal link once it's ready
- Course examples for the "Courses" card
