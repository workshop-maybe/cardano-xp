---
title: "feat: Send sponsor inquiry emails from /sponsors form"
type: feat
status: completed
date: 2026-04-09
---

# feat: Send sponsor inquiry emails from /sponsors form

## Overview

The "Become a listed sponsor" form at `/sponsors` currently constructs a `mailto:` link, which depends on the user having a configured email client. Replace this with a server-side email send via Resend so the form works reliably for all users.

## Problem Frame

The current sponsor contact form opens a `mailto:james@andamio.io` link on submit. This fails silently when users don't have a desktop email client configured (common on mobile, Chromebooks, and web-only setups). The form needs to send an actual email from the server.

## Requirements Trace

- R1. Form submission sends an email to `james@andamio.io` with the sponsor inquiry details
- R2. User sees clear success/error feedback after submission
- R3. Form fields and visual appearance remain unchanged
- R4. Email API key is server-only and validated at build time via `env.js`

## Scope Boundaries

- No form field changes (same 4 fields: name, listing name, URL, message)
- No database storage of submissions
- No auto-reply to the submitter
- No rate limiting (defer unless abuse appears)
- No react-hook-form upgrade — current useRef approach is fine for 4 fields

## Context & Research

### Relevant Code and Patterns

- `src/app/(app)/sponsors/sponsor-contact-form.tsx` — current form with mailto handler
- `src/app/(app)/sponsors/page.tsx` — sponsors page, imports the form
- `src/app/api/xp-leaderboard/route.ts` — cleanest standalone API route pattern (try/catch, NextResponse.json, typed responses)
- `src/env.js` — `@t3-oss/env-nextjs` schema, all new server env vars go here
- `.env.example` — document new env vars here
- Sonner toasts are globally mounted and used throughout the app for feedback

### Institutional Learnings

- No prior email implementation exists in this project — this is net-new
- External API keys follow the pattern: server-only env var, validated in `env.js`, never `NEXT_PUBLIC_`

## Key Technical Decisions

- **Resend over alternatives**: Resend has a simple REST API, generous free tier (100 emails/day, more than enough for sponsor inquiries), and minimal setup. No need for SMTP configuration or heavier SDKs like SendGrid. Single npm dependency (`resend`).
- **API route over tRPC**: A standalone API route at `src/app/api/sponsor-contact/route.ts` matches the existing xp-leaderboard pattern. tRPC would work but adds unnecessary indirection for one POST endpoint.
- **Keep useRef form approach**: The current 4-field form doesn't need react-hook-form. Change only the submit handler from `mailto:` to `fetch()` and add loading/toast states.

## Open Questions

### Resolved During Planning

- **Which email provider?** Resend — simple API, free tier covers this use case, no SMTP config needed.
- **API route or tRPC?** API route — simpler, matches existing patterns, no tRPC router setup.

### Deferred to Implementation

- **Email formatting**: Exact email body template will be determined during implementation. Plain text is sufficient.
- **Resend domain verification**: Resend can send from `onboarding@resend.dev` on the free tier without domain verification. If James wants a custom `from` address, that's a separate Resend dashboard step.

## Implementation Units

- [x] **Unit 1: Install Resend and configure env**

  **Goal:** Add the Resend dependency and wire up the API key as a validated server env var.

  **Requirements:** R4

  **Dependencies:** None

  **Files:**
  - Modify: `package.json`
  - Modify: `src/env.js`
  - Modify: `.env.example`

  **Approach:**
  - Install `resend` package
  - Add `RESEND_API_KEY` to the `server` schema in `env.js` as `z.string().min(1).optional()` — matches the pattern used by `WEB3_SDK_API_KEY`. The API route returns 503 if the key is absent at runtime.
  - Add to `runtimeEnv` mapping
  - Add documented entry to `.env.example`

  **Patterns to follow:**
  - `ANDAMIO_API_KEY` in `env.js` — same pattern for a required server-only key

  **Test expectation:** none — pure config, verified by build-time env validation

  **Verification:**
  - `npm run build` succeeds with or without `RESEND_API_KEY` (optional schema)
  - `resend` appears in `node_modules`

- [x] **Unit 2: Create sponsor contact API route**

  **Goal:** Add a POST endpoint that validates the form payload and sends an email via Resend.

  **Requirements:** R1

  **Dependencies:** Unit 1

  **Files:**
  - Create: `src/app/api/sponsor-contact/route.ts`

  **Approach:**
  - Export a `POST` handler following the xp-leaderboard route pattern
  - Parse and validate the JSON body with a Zod schema (name required with max 200 chars, listingName/url optional with max 200 chars, message optional with max 2000 chars)
  - Instantiate Resend client with `env.RESEND_API_KEY`
  - Send email to `james@andamio.io` with the form data formatted as the body
  - Return `{ success: true }` on success, structured error on failure

  **Patterns to follow:**
  - `src/app/api/xp-leaderboard/route.ts` — try/catch, NextResponse.json, typed responses

  **Test scenarios:**
  - Happy path: POST with valid `{ name: "Alice" }` → 200, `{ success: true }`
  - Happy path: POST with all fields populated → 200, email body includes all fields
  - Error path: POST with missing `name` → 400, validation error
  - Error path: POST with empty body → 400, validation error
  - Error path: Resend API failure → 500, structured error response

  **Verification:**
  - `curl -X POST /api/sponsor-contact` with valid JSON returns 200
  - Email arrives at `james@andamio.io`

- [x] **Unit 3: Update form to POST and show feedback**

  **Goal:** Replace the mailto handler with a fetch to the API route. Add loading state and toast feedback.

  **Requirements:** R2, R3

  **Dependencies:** Unit 2

  **Files:**
  - Modify: `src/app/(app)/sponsors/sponsor-contact-form.tsx`

  **Approach:**
  - Replace `handleSubmit` body: collect ref values, POST to `/api/sponsor-contact` as JSON
  - Add `useState` for loading/submitted state
  - Use `isLoading` prop on `AndamioButton` during request (disables and shows spinner automatically)
  - On success: show `toast.success()`, reset form fields, set submitted state
  - On error: show `toast.error()` with the error message
  - Change button label from "Send via email" to "Send message"
  - Keep all existing fields, labels, styling, and layout unchanged

  **Patterns to follow:**
  - Sonner toast usage throughout the TX components: `import { toast } from "sonner"`
  - `AndamioButton` supports `isLoading` prop which disables the button and shows a spinner automatically

  **Test scenarios:**
  - Happy path: fill name, submit → loading spinner shown on button → success toast → form resets
  - Happy path: fill all fields, submit → all fields included in request body
  - Error path: API returns error → error toast with message
  - Edge case: double-click submit → button disabled during request prevents duplicate

  **Verification:**
  - Form submits without opening email client
  - Success toast appears after submission
  - Email arrives at `james@andamio.io` with form content

## System-Wide Impact

- **Interaction graph:** Self-contained — new API route + form change. No callbacks, middleware, or observers affected.
- **Error propagation:** Resend API errors are caught in the route handler and returned as structured JSON. The form displays them via toast.
- **API surface parity:** No other interfaces need this change.
- **Unchanged invariants:** Sponsor list rendering, sponsor data model (`sponsors.json`), and all other sponsor page content remain untouched.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Resend API key not yet created | James needs to create a free Resend account and generate an API key. No code risk — just a setup step. |
| Resend free tier sends from `onboarding@resend.dev` | Acceptable for initial launch. Domain verification is a separate Resend dashboard step if a custom from address is wanted later. |

## Sources & References

- Current form: `src/app/(app)/sponsors/sponsor-contact-form.tsx`
- API route pattern: `src/app/api/xp-leaderboard/route.ts`
- Env validation: `src/env.js`
- Resend docs: https://resend.com/docs
