# Cardano XP User Notes

In this doc I take notes on how Cardano XP works.

## Open

1. Need to update the "Connect Your Wallet" message. Your access token, wallet tip, and do not use the phrase "on-chain identity" - find something better

2. The module code says feedback. Would be better if this was a 1 digit number I think. But will consider options. Easiest solution: just hide it. Possible: name the levels of participation and make them earn-able. This could be neat for leveling up and gamification

3. At /learn/feedback, "Student Learning Targets & Lessons" and the "On-chain" badge are not aligned on the same horizontal axis. This should be fixed, but it might be irrelevant: we can reconsider what this heading says. To the Cardano XP user, it's about learning, their own journey - we should find a heading that highlights that

4. The assignment CTA "Ready to demonstrate your learning? Complete the assignment to show your understanding of this module's learning targets and earn your credential." needs to be reimagined entirely.

5. At /learn/feedback/assignment, reimagine the andamio language. Leave behind the Andamio template layout + make this something new. I'd like to make the text entry experience as featured as possible. "Submit your Work" should be changed to "submit your feedback".

6. Remove all web3 login and tx sponsorship. This is a cardano native demo of Andamio that doesn't need the extra features.

---

## Resolved

**2026-03-22 — Broken lesson link**
"Open lesson" button at /learn/feedback linked to /learn/{courseId}/{moduleCode}/{index} which didn't match any route. Fixed by removing courseId from the URL path (single-course app). Commit: ec1753e

**2026-03-22 — 500 error on assignment submission**
Three issues combined: (1) local hash function didn't trim whitespace — switched to computeAssignmentInfoHash from @andamio/core. (2) Missing initiator_data (wallet addresses) in TX params. (3) Andamioscan indexer issue on preprod — fixed by ops. Frontend fixes in ec1753e.
