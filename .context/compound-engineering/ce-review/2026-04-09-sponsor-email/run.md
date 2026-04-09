# Review Run: feat/sponsor-form-email

**Date:** 2026-04-09
**Mode:** autofix
**Verdict:** Ready with fixes

## Applied Fixes (safe_auto)

1. **Malformed JSON handling** — Wrapped `request.json()` in try/catch to return 400 on non-JSON requests instead of falling through to 500 handler. (correctness, kieran-typescript)
2. **Error detail leakage removed** — Removed `details` field from 400 and 500 error responses. Internal error messages and Zod schema structure no longer exposed to clients. Server-side logging preserved. (correctness, security, kieran-typescript)

## Residual Findings (not applied)

- P1 advisory: Hardcoded recipient email `james@andamio.io` — intentional per plan, not a code bug
- P1 advisory: RESEND_API_KEY optional vs required — intentional plan decision to avoid breaking builds
- P1 manual: No unit tests for API route — no unit test framework configured in project
- P2 gated_auto: URL field not validated as URL format — could break valid inputs like "my-project.com"
- P2 advisory: Form ref reset pattern — works correctly, formRef.reset() is cleaner but not required

## Coverage

- Reviewers: correctness, testing, kieran-typescript, security (all completed)
- Suppressed: email body formatting (intentional), CRLF injection (theoretical with Resend API)
