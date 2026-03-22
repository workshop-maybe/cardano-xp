# Cardano XP User Notes

In this doc I take notes on how Cardano XP works.

1. Need to update the "Connect Your Wallet" message. 
    - Your access token
    - Wallet tip
    - Do not use the phrase "on-chain identity" - find something better

2. The module code says feedback. Would be better if this was a 1 digit number I think. But will consider options. Easyiest solution: just hide it. Possible: name the levels of participation and make them earn-able. This could be neat for leveling up and gamification

3. At https://www.cardano-xp.io/learn/feedback, "Student Learning Targets & Lessons" and the "On-chain" badge are not aligned on the same horizontal axis. This should be fixed, but it might be irrelevant: we can reconsider what this heading says. To the Cardano XP user, it's about learning, their own journey - we should find a heading that highlights that

4. learn/76bab08586cbd53003bfec0e63bc3165fd73afb99cbfa9f4e8157742/feedback/1 is a broken link (this comes from the "Open lesson" button at /learn/feedback

5. The assignment CTA "Ready to demonstrate your learning?
Complete the assignment to show your understanding of this module’s learning targets and earn your credential." needs to be reimagined entirely.

6. At /learn/feedback/assignment, remimagine the andamio language. Leave behind the Andamio template layout + make this something new. I'd like to make the text entry experience as featured as possible. "Submit your Work" should be changed to "submit your feedback".

7. 500 error on assignment submission tx.
20a551d20d69757d.js?dpl=dpl_DfyKNTMPRV6jFMZ6WvxXaJ84Cir7:3 [COURSE_STUDENT_ASSIGNMENT_COMMIT] Transaction failed: Error: Transaction API error: 500 - {
    "error": {
        "code": "INTERNAL_SERVER_ERROR",
        "message": "Internal Server Error: An unexpected error occurred.",
        "details": "Atlas TX API error: 500 Internal Server Error"
    }
}

    at Object.execute (20a551d20d69757d.js?dpl=dpl_DfyKNTMPRV6jFMZ6WvxXaJ84Cir7:3:8115)
    at async onExecuteTx (8868948d1a7855f4.js?dpl=dpl_DfyKNTMPRV6jFMZ6WvxXaJ84Cir7:1:61384)
    at async onClick (8868948d1a7855f4.js?dpl=dpl_DfyKNTMPRV6jFMZ6WvxXaJ84Cir7:1:51466)


{
    "alias": "manager-001",
    "course_id": "76bab08586cbd53003bfec0e63bc3165fd73afb99cbfa9f4e8157742",
    "slt_hash": "77547ab066d5fe38038879b785551f6efae17ba38a0d6dc8475cb015e848b42b",
    "assignment_info": "03f2cd22da8faab487da259f302e8c7634acba73a4cbb8f2006e0eedf88ce363"
}

{
    "error": "Gateway API error: 500 Internal Server Error",
    "details": "{\n    \"error\": {\n        \"code\": \"INTERNAL_SERVER_ERROR\",\n        \"message\": \"Internal Server Error: An unexpected error occurred.\",\n        \"details\": \"Atlas TX API error: 500 Internal Server Error\"\n    }\n}\n"
}
