# 008 — Credential-Focused Language

**Date:** 2026-03-16

## What happened

Removed educational terminology from the public-facing learn and tasks pages. No more "courses", "lessons", or "modules". The app now speaks in credentials and SLTs — the language of on-chain verification.

### The language shift

| Before | After |
|--------|-------|
| Course Outline | (removed entirely) |
| X Modules | X credentials |
| Learning Targets | SLTs |
| Earn Credential | Give Feedback |
| "Complete modules to earn credentials" | "Request access by giving quick feedback on each SLT" |

### The key insight

Cardano XP isn't a learning platform. It's a feedback verification system. People give feedback on SLTs, that feedback gets reviewed by humans, and they earn credentials. The credentials unlock task access. The tasks earn XP.

Framing this as "courses" and "lessons" implied passive consumption. The new framing — feedback on SLTs — emphasizes active contribution.

### What changed

**`/learn` page:**
- Removed CourseTeachersCard sidebar (single-column layout now)
- Removed "Course Outline" section header
- Changed stats from "X Modules, Y Learning Targets" to "X SLTs across Y credentials"
- Added feedback-first messaging: "Request access by giving quick feedback on each SLT. Feedback will be stored by Andamio. Learn more"

**`LearnModuleCard` component:**
- "Earn Credential" button → "Give Feedback"
- "Learning Targets" section label → "SLTs"

**`PrerequisiteList` component:**
- Already simplified to flat checklist in 007
- No terminology changes needed

**Tasks pages:**
- Unified onboarding copy across list and detail views
- Removed book icons, just show the checklist
- "This app is moderated by humans. It moves at the speed of people."

## Decisions

| Decision | Why |
|----------|-----|
| Keep "credentials" plural even for one | Users may earn multiple in the future. Doesn't hurt now. |
| "SLTs" not "Student Learning Targets" | Shorter, more technical, matches on-chain naming |
| "Give Feedback" not "Submit Assignment" | Feedback implies a conversation. Assignment implies a test. |
| Link "Learn more" to /about | Centralizes Andamio explanation in one place |
| Remove course team sidebar | Single-purpose app doesn't need instructor bios cluttering the flow |

## What's next

- The /about page should explain what Andamio does with feedback
- Consider renaming the `learn-module-card.tsx` file (it shows credentials now)
- Module detail pages need the same terminology update
