# TX State Machine Sync + Celebration UX

**Date:** 2026-03-22
**Status:** Draft

## What We're Building

Sync 5 missing TX state machine improvements from the Andamio app repo to Cardano XP, plus create a new feedback-focused celebration UX.

## Why This Approach

### The core TX state machine is identical between repos

Both use the same BUILD → SIGN → SUBMIT → REGISTER → STREAM/POLL flow via `useTransaction`, `useTxStream`, and `tx-watcher-store`. Both rely on the gateway to handle DB updates. The app repo has accumulated defensive programming and UX polish that XP should inherit.

### The evidence bug is gateway-side, but the timeout gap may contribute

The "Database record not available" issue is caused by the gateway failing to sync TX metadata to the DB. XP can't fix this directly, but the missing confirmed-state timeout means XP can't even detect when this happens — it just hangs.

## Key Decisions

1. **Copy the TX state machine improvements from app.** The system is well-established. Match the app's implementation to keep parity and benefit from proven patterns.

2. **New celebration UX for XP.** Don't copy app's celebration store directly. Create something simple, direct, and welcoming — "You just gave feedback!" tone. XP is about recognizing contribution, not generic confetti.

3. **All 5 gaps addressed:**
   - Confirmed-state timeout (30s guard against stalled TXs)
   - Celebration triggers for milestone TXs
   - Task publication status validation in TaskCommit
   - `parseTxErrorMessage()` for human-readable errors in TaskAction
   - TX state machine documentation for XP docs

4. **Document the TX state machine in XP docs.** App has a 258-line skill doc. XP needs its own version.

## Resolved Questions

1. **Copy vs adapt?** Copy the TX state machine improvements (it's a well-established system), but create a new celebration implementation specific to XP's feedback-first identity.

2. **Evidence save timing?** After TX success (recommended). But since the gateway handles DB updates automatically and neither repo explicitly saves evidence, the real fix for the evidence bug is the confirmed-state timeout ensuring TXs reach "updated" state.

3. **Scope?** Both TaskCommit and TaskAction — both submit evidence and both need the improvements.
