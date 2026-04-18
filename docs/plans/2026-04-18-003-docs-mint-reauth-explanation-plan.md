---
title: "docs: explain the post-mint re-sign in the access-token ceremony"
type: docs
status: active
date: 2026-04-18
---

# docs: explain the post-mint re-sign in the access-token ceremony

## Overview

Issue #40 reports the access-token flow as a bug: "the app doesn't recognize the minted token until I log out and log back in." The code is working as designed — the JWT is bound to wallet state at sign-in time, so after a mint the user genuinely does need to sign in again to have the token reflected in their session. This PR **doesn't change behavior**; it adds the missing copy so users understand what they're doing and why.

Target surfaces: the `celebration` and `reconnecting` states of the post-mint ceremony in `src/components/tx/mint-access-token.tsx`.

## Problem Frame

Reporter (toneDeaf_NFTs) experienced the two-signature pattern as broken. From the user's seat:

1. Connect wallet. Sign in. "OK, I'm signed in."
2. Mint access token. Tx confirms. Success toast.
3. "Now it says I need to sign in *again*. Why? Wasn't I already signed in?"

The existing ceremony already forces a logout after tx confirm and routes to a re-sign screen — the orchestration is correct. But the reconnecting-state UI says "Connect your wallet to authenticate with your new access token" without explaining why a second signature is necessary. Without context, users conclude the app is broken.

The current celebration state reads "Welcome to Andamio! Now you can authenticate to Andamio with your Access Token." That's also fine as a celebration, but doesn't explain the mechanism.

## Requirements Trace

- **R1.** The `celebration` state explains, in one or two sentences, that a second sign-in is required because sign-in is when Andamio reads the wallet, and the wallet's contents just changed.
- **R2.** The `reconnecting` state frames the re-sign as a normal pattern ("signing in is a fresh signature on every session across any Andamio app"), not an error or a one-off.
- **R3.** Tone is friendly and educational, not apologetic. Doesn't explain JWTs. Doesn't imply anything was broken.
- **R4.** No behavior change. No new state, no new effect, no new context field. Pure copy edits.
- **R5.** Branch + PR per issue. No Claude Code attribution in commits or PR body.

## Scope Boundaries

- Not changing the ceremony state machine.
- Not adding an "onboarding tooltip" or a modal dialog. The copy lives inline in the existing cards.
- Not writing docs in `docs/`. The fix is entirely in the component the user sees at the moment of confusion.
- Not touching the `authenticating` or `welcome` states — their copy is fine.

### Deferred to Separate Tasks

- A broader "How Andamio sign-in works" explainer page or About-page addition — worth doing, but belongs in a different PR.

## Context & Research

### Relevant Code and Patterns

- `src/components/tx/mint-access-token.tsx`
  - `celebration` state (around line 432) — title: "Access Token Created!", body: "Welcome to Andamio! Now you can authenticate to Andamio with your Access Token."
  - `reconnecting` state (around line 397) — title: "Sign In as {alias}", description: "Connect your wallet to authenticate with your new access token.", existing info box (line 420): "Once connected, you'll be signed in automatically with your new access token."
  - Re-auth orchestration (line 198-209) — on tx confirm + DB update, calls `logout()` then transitions to `celebration`. The forcing-logout logic is explicit and commented.

### Institutional Learnings

- No prior solution in `docs/solutions/` about onboarding copy. This is the first place we're surfacing "sign-in is how Andamio reads the wallet" as a user-facing pattern.

## Key Technical Decisions

- **Keep the text short.** Users in the celebration state are riding a dopamine wave; a wall of text kills it. Two sentences max on the mechanism, then the Sign In button.
- **Lead with what changed, not with mechanism.** "Your token is in your wallet now — one more signature and your session will reflect it" beats "JWTs are issued at sign-in time and are immutable for the session duration."
- **Frame the re-sign as a pattern, not a one-off.** The reconnecting state mentions "any Andamio app" so users start to internalize this as how the Andamio ecosystem works, not as a cardano-xp quirk.

## Open Questions

### Resolved During Planning

- *Should we auto-click the Sign In button for them?* No. The existing flow asks the user to press the button, which is the right behavior — they need to see their wallet prompt them for a signature. Auto-click would just make the wallet pop up with no warning.
- *Celebration emojis stay?* Yes. The existing 🎉✨🎊⭐ make the celebration feel celebratory. Don't touch.

### Deferred to Implementation

- Exact wording will go through review — James asked to draft the copy in-PR and tune on review (option "a"). The plan proposes a starting point, but wording choices surface best against a real preview deploy.

## Implementation Units

- [ ] **Unit 1: Add mechanism explanation to the `celebration` state**

**Goal:** Insert a short, friendly explanation between the "Welcome to Andamio!" message and the "Sign In with Your Access Token" button so the user understands why they're signing in again.

**Requirements:** R1, R3, R4

**Dependencies:** None

**Files:**
- Modify: `src/components/tx/mint-access-token.tsx` (celebration state block)

**Approach:**
- Replace the current "Now you can authenticate to Andamio with your Access Token." message with a two-part message:
  - First sentence: what changed (your token is now in your wallet).
  - Second sentence: what to do and why (sign in again so your session sees the new token).
- Keep the existing card chrome, icon, and button. No layout changes.

**Proposed copy (for review on the PR):**

> **Welcome to Andamio!**
>
> Your access token is in your wallet now. Sign in one more time and your session will include it — you'll be ready to go.

**Patterns to follow:**
- Match the tone of the surrounding copy in this file (friendly, short sentences, no jargon).
- Use `AndamioText variant="muted"` for the explanation line, matching the existing body style.

**Test scenarios:**
- Test expectation: none — pure copy change in JSX, no behavior.

**Verification:**
- Preview deploy renders the celebration card with the new copy.
- The sentence fits on one line on desktop, wraps cleanly on mobile.

---

- [ ] **Unit 2: Refine the `reconnecting` state info box to frame the re-sign as a pattern**

**Goal:** Replace the existing info-box copy on the reconnecting card so the user sees the re-sign as "how Andamio works" rather than a one-time workaround.

**Requirements:** R2, R3, R4

**Dependencies:** None (can land with Unit 1 in the same commit)

**Files:**
- Modify: `src/components/tx/mint-access-token.tsx` (reconnecting state block, around line 420-425)

**Approach:**
- Replace the line "Once connected, you'll be signed in automatically with your new access token." with copy that:
  - Reassures the user this is the expected flow.
  - Frames sign-in as a fresh signature at the start of each session.
  - Briefly anchors this as an Andamio pattern, not a cardano-xp thing.

**Proposed copy (for review on the PR):**

> In Andamio, each sign-in is a fresh signature. Your next sign-in sees your new access token — and the same pattern works across every app built on Andamio.

**Patterns to follow:**
- Keep the existing `InfoIcon` + muted-text layout exactly as-is. Only the string changes.

**Test scenarios:**
- Test expectation: none — pure copy change.

**Verification:**
- Preview deploy shows the refined info box in the reconnecting card.
- Copy reads cleanly on both desktop and mobile widths.

## System-Wide Impact

- **Interaction graph:** None. No state machines, effects, or callbacks touched.
- **Unchanged invariants:** The entire ceremony state machine (`celebration → reconnecting → authenticating → welcome`), the `logout()` + `setCeremonyState("celebration")` orchestration, and the 3s auto-redirect from welcome.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Copy sounds preachy or explains too much | James reviews the PR and tunes wording; both strings are short enough to iterate on in one round |
| A future protocol change removes the two-signature pattern | Low probability; copy would need updating but the mechanism explanation is generic enough that it'd age gracefully |

## Documentation / Operational Notes

- PR body should include screenshots of both states (celebration + reconnecting) so reviewers can read the copy in context.
- Issue #40 gets a close-out comment framing the resolution: "The two-signature flow is by design — we've added copy so users understand what's happening."

## Sources & References

- **Origin issue:** [#40 — Membership token not visible until logout/login after mint](https://github.com/workshop-maybe/cardano-xp/issues/40)
- Related files: `src/components/tx/mint-access-token.tsx`, `src/contexts/andamio-auth-context.tsx` (`refreshAuth`, `logout`)
- Related prior work: PR #45 (#41 audit), PR #46 (#42 network detection) — same branch-per-issue / no-attribution workflow.
