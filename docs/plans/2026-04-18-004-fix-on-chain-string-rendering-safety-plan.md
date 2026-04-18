---
title: "fix: defensive rendering for on-chain strings + shared alias validation"
type: fix
status: active
date: 2026-04-18
---

# fix: defensive rendering for on-chain strings + shared alias validation

## Overview

Issue #44 reports that username validation is bypassable via a proxy: the frontend enforces `[a-zA-Z0-9_]+` via an inline regex, but the Andamio gateway backend only rejects angle brackets. A motivated user can mint an access token with an alias containing quotes, `=`, `onload=`, or other attribute-injection characters. Angle brackets are blocked upstream, so the concrete exploit today is limited — but from the frontend's perspective, any on-chain string should be treated as potentially hostile, because the protocol does not enforce the character set.

This PR does **not** add backend validation (out of scope per issue triage). It locks down the frontend against the assumption that on-chain strings are hostile:

1. Consolidate the duplicated `ALIAS_PATTERN` into a shared validation module so UX hints are consistent.
2. Audit every site where on-chain strings (alias, `accessTokenAlias`, other chain-sourced names) render in the frontend. Document the audit.
3. Fix any rendering sites that bypass React's default escaping (e.g., `dangerouslySetInnerHTML`, unescaped URL concatenation, unsafe attribute injection). The pre-plan sweep suggests there are **zero** today, but the audit is the deliverable.
4. Document the "on-chain data is untrusted" threat model in-code so future devs don't lose track.

## Problem Frame

Reporter (`'"name123'' onload='alert()'`) filed a security-adjacent bug: they minted an access token with a username containing quotes, whitespace, and what looks like an XSS payload. Angle brackets were blocked by the gateway (403), so the full HTML-tag form didn't land — but characters like `'`, `"`, `=`, space are all currently allowed on-chain.

Why this matters for the frontend:

- The on-chain alias is authoritative. The DB and the UI will render whatever the chain says.
- Any future Andamio-ecosystem app that reads this token has the same surface.
- Even if the gateway tightens validation tomorrow, historical on-chain usernames remain and must still render safely.

## Requirements Trace

- **R1.** A single shared validation module exports `ALIAS_PATTERN` and `isValidAlias(string): boolean`. Both existing frontend call sites import from this module.
- **R2.** Every place where an on-chain-sourced string flows into the DOM is audited for safety. The audit is captured in the PR body with file-level findings.
- **R3.** Any audit finding that lets a malicious on-chain string break out of text-content (unsafe attribute, URL injection, `dangerouslySetInnerHTML`, unsafe third-party render) is fixed in the same PR.
- **R4.** A short threat-model note is added to the shared module so a future dev reading it understands why the regex exists and what the frontend must assume about on-chain strings.
- **R5.** Branch + PR per issue. No Claude Code attribution in commits or PR body.
- **R6.** The original-reporter literal string (`'"name123'' onload='alert()'`) is used as a test fixture to verify the fix rather than a synthetic example.

## Scope Boundaries

- Not adding backend / gateway validation. Per issue triage: the frontend must assume on-chain data is hostile regardless of what the backend does.
- Not changing the allowed character set for new mints. The existing `[a-zA-Z0-9_]+` regex stays — that's a product decision, not a security decision.
- Not retroactively rewriting existing on-chain usernames. We can't; they're on-chain.
- Not building a general-purpose XSS-sanitizer library. React's default escaping does the heavy lifting; we only need helpers where that escaping doesn't apply.

### Deferred to Separate Tasks

- Escalating the character-set question to the Andamio gateway team so they can align backend validation with the frontend allow-list. Filed as a separate issue in the Andamio API repo.

## Context & Research

### Relevant Code and Patterns

- **Existing duplicated regex:**
  - `src/components/landing/registration-flow.tsx:28-32` — `ALIAS_PATTERN = /^[a-zA-Z0-9_]+$/`, `isValidAlias(alias)`.
  - `src/components/tx/mint-access-token.tsx:100-104` — identical regex, identical function.
- **Correctly-encoded URL site (keep as-is):**
  - `src/app/(admin)/admin/course/page.tsx:1194` — uses `encodeURIComponent(commitment.studentAlias)` in a template-literal href. Good pattern; reference it in the threat-model comment.
  - `src/components/tx/alias-list-input.tsx:93` — uses `encodeURIComponent(alias)` in an API URL path.
- **`dangerouslySetInnerHTML` audit:**
  - `src/components/ui/chart.tsx:83` — the only occurrence. Content is `THEMES` object keys (constants) + `useId()` (React-generated) + `colorConfig` (component props). No on-chain data. Safe.
- **High-volume text-content rendering (safe by React default):**
  - 70 files render alias or `accessTokenAlias` in JSX text content via `{alias}`. React escapes all of these. No changes needed unless the audit surfaces something.

### Institutional Learnings

- No prior solution in `docs/solutions/` about XSS or on-chain string safety. This is the first place we're codifying the threat model for the repo.

### External References

- React's default `{}` interpolation escapes `<`, `>`, `&`, `"`, `'` — documented behavior, safe for text content and most attributes.
- Unsafe sinks in React that bypass default escaping: `dangerouslySetInnerHTML`, `href`/`src` with `javascript:` or `data:` URIs, `style` with CSS expressions (legacy IE), DOM refs manipulated directly.

## Key Technical Decisions

- **Shared module lives in `src/lib/validation/alias.ts`.** Matches the existing `src/lib/` pattern used by `wallet-network.ts`, `cardano-utils.ts`, etc. `lib/validation/` namespace leaves room for future validators (project name, credential name, etc.) without cluttering the `lib/` root.
- **Export both the regex and the predicate.** The regex is useful for form `pattern=` attributes; the predicate is what imperative code needs. Export both, document both.
- **No sanitization helper in this PR.** A `sanitizeAliasForDisplay()` that strips quotes/control-chars would be defense-in-depth, but if we don't have any unsafe sinks (the audit so far says we don't), adding one creates a false sense of safety and a footgun (devs might call it on *already-safe* data and then pass un-sanitized data elsewhere thinking they covered it). React escapes. Don't bolt on what isn't needed.
- **Threat-model note lives in the validation module.** One JSDoc paragraph at the top of `alias.ts` explaining: on-chain strings are untrusted, this regex governs *new* aliases at mint time for UX, and React's default escaping covers rendering. Future devs read this when they touch the file.
- **Audit is documented in the PR body, not a separate file.** This repo isn't big enough to justify a dedicated "security audit" doc tree. The audit methodology is reproducible from the plan; the findings belong in the PR that took the action.

## Open Questions

### Resolved During Planning

- *Should we block historical on-chain aliases that contain bad chars?* No. We can't — they're on-chain and they're real users. The frontend must render them safely regardless.
- *Should `isValidAlias` also enforce a length limit?* Not in this PR. Length is a separate policy question; changing it is out of scope.
- *Should the shared module also export the error message ("Alias can only contain...")?* Yes — centralize the error text so both callers stay in sync. One string constant next to the regex.

### Deferred to Implementation

- Whether the audit needs to extend to `studentAlias`, `teacherAlias`, or other chain-sourced names beyond the access-token alias. The sweep suggests these render in the same safe way, but verification happens during Unit 3.

## Implementation Units

- [ ] **Unit 1: Create shared alias-validation module**

**Goal:** Single source of truth for alias regex, predicate, error message, and threat-model note.

**Requirements:** R1, R4

**Dependencies:** None

**Files:**
- Create: `src/lib/validation/alias.ts`

**Approach:**
- Export `ALIAS_PATTERN` (the regex).
- Export `isValidAlias(alias: string): boolean`.
- Export `ALIAS_ERROR_MESSAGE` so UX hints stay in sync.
- Add a JSDoc at the top of the module explaining:
  1. What this governs (new aliases at mint time).
  2. What the frontend must assume (on-chain strings are untrusted; historical aliases may contain anything the protocol allows).
  3. How rendering stays safe (React's default JSX escaping; use `encodeURIComponent` for URL params — reference the `admin/course/page.tsx` site as the example pattern).

**Patterns to follow:**
- `src/lib/wallet-network.ts` — typed exports with a JSDoc header explaining the module's role.

**Test scenarios:**
- Test expectation: none — no test framework in the repo (known gap; documented in prior PRs). Helper is trivially inspectable.

**Verification:**
- `npm run typecheck` passes.
- Both existing callers can import and consume the new exports (verified in Unit 2).

---

- [ ] **Unit 2: Replace duplicated regex in the two existing call sites**

**Goal:** Remove the duplication surfaced by the audit. Both UX flows now share the same allow-list, error message, and behavior.

**Requirements:** R1

**Dependencies:** Unit 1

**Files:**
- Modify: `src/components/landing/registration-flow.tsx` (lines 28-32 + consumer at line 102)
- Modify: `src/components/tx/mint-access-token.tsx` (lines 100-104 + consumer around line 293)

**Approach:**
- Delete the inline `ALIAS_PATTERN` constant and `isValidAlias` function in each file.
- Import both from `~/lib/validation/alias`.
- Replace any hardcoded error strings ("Alias can only contain letters, numbers, and underscores") with `ALIAS_ERROR_MESSAGE` from the module.

**Patterns to follow:**
- Match the import-path style used elsewhere in these files (`~/lib/...`).

**Test scenarios:**
- Happy path: valid alias (`workshop_maybe`, `alice123`) still passes `isValidAlias`.
- Error path: invalid alias (`'"name123'' onload='alert()'` — the literal reporter string) still fails `isValidAlias` with the same error message as before.
- Edge case: empty string still fails.

**Verification:**
- `npm run typecheck` passes.
- Manually verify on a preview deploy: the registration flow and the mint flow both reject the reporter's literal fixture with the expected error copy.

---

- [ ] **Unit 3: Audit on-chain-string render sites**

**Goal:** Walk every site where on-chain-sourced strings (alias, accessTokenAlias, studentAlias, other chain names) flow into the DOM, and confirm each path is safe. Document findings for the PR body.

**Requirements:** R2

**Dependencies:** None (can run in parallel with Unit 1/2)

**Files:**
- Read-only across `src/` — focus on grep results from the plan-ing phase (see Context above).

**Approach:**

Audit checklist for each unique render pattern:

1. **Text-content `{alias}`** — safe by React default. Spot-check 3-5 representative sites and confirm no special handling is needed.
2. **`href={...}` with alias** — must use `encodeURIComponent` when embedded in URL path/query, and must never concatenate alias as the *whole* href (would allow `javascript:` injection if an attacker controlled the string). Audit target: `src/app/(admin)/admin/course/page.tsx:1194`, `src/components/tx/alias-list-input.tsx:93`, and any others the sweep missed.
3. **`src`, `srcSet`, `poster`, `data`** — sweep confirms zero sites use alias here. Recheck.
4. **`style={...}` with alias** — sweep confirms zero. Recheck.
5. **`dangerouslySetInnerHTML`** — only site (`src/components/ui/chart.tsx:83`) confirmed not to touch on-chain data. Document.
6. **DOM refs / imperative DOM** — grep for `innerHTML =`, `.innerText =`, `document.write`. Should be zero.
7. **Third-party renderers** — any Markdown renderer, rich-text component, or HTML-parsing lib that receives an alias? Check for `react-markdown`, `remark`, `DOMPurify`, etc. in imports.
8. **CSV / JSON export paths** — alias flowing into a downloaded file? Out of scope for XSS but worth noting if it exists.

Capture each check with a pass/fail and a one-line rationale. Output formatted as a table for the PR body.

**Patterns to follow:**
- The link-audit methodology from the #41 PR (`docs/plans/2026-04-18-001-fix-external-link-audit-plan.md`) — reproducible commands, results in a table.

**Test scenarios:**
- Test expectation: none — read-only audit, no behavior change.

**Verification:**
- PR body includes an audit table with every on-chain-string render surface and its disposition.
- If any check fails, Unit 4 becomes non-optional.

---

- [ ] **Unit 4: Fix any genuinely unsafe render sites (conditional on Unit 3 findings)**

**Goal:** If the audit surfaces any site where an on-chain string can break out of text content, fix it.

**Requirements:** R3

**Dependencies:** Unit 3

**Files:**
- To be determined by audit. Likely none based on pre-plan sweep.

**Approach:**
- If audit passes with no findings, skip this unit entirely and note it in the PR.
- If a finding exists, apply the minimal fix:
  - URL concatenation without encoding → wrap in `encodeURIComponent`.
  - `dangerouslySetInnerHTML` receiving on-chain data → remove and render via JSX children.
  - Unsafe attribute injection → relocate the alias into text content or a safely-encoded attribute.

**Test scenarios:**
- Happy path: valid alias still renders correctly after the fix.
- Error path: the reporter's literal fixture (`'"name123'' onload='alert()'`) renders as escaped text, not as executable markup.

**Verification:**
- Unit 3 audit table re-runs and shows all green.

## System-Wide Impact

- **Interaction graph:** None. The validation module is leaf-node utility code. No callbacks, no effects, no cross-component state.
- **Error propagation:** `isValidAlias` returns boolean; existing callers already handle false correctly.
- **State lifecycle risks:** None.
- **API surface parity:** The two UX flows (registration, mint) now share the same validation path. No other flows currently validate aliases — they render them.
- **Unchanged invariants:** The allowed character set for *new* aliases is unchanged. Existing on-chain aliases are unchanged. The gateway's `<>` block is unchanged (not our code).

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Audit misses a rendering site because grep patterns didn't cover it | Unit 3 checks multiple greps (text content, href, src, srcSet, style, innerHTML) and spot-checks known representative files. Use the reporter's literal fixture in a manual preview test. |
| A future third-party component is introduced that doesn't escape by default | The threat-model note in `alias.ts` explicitly warns future devs to use `encodeURIComponent` / JSX children for on-chain data. Code review catches the rest. |
| Consolidating the regex breaks a subtle difference between the two sites | The current regex and function body are byte-identical; the diff is mechanical. Manual test verifies both flows still reject the same inputs. |
| Someone interprets "no sanitizer in this PR" as "never add a sanitizer" | The plan explicitly says "not needed today"; the threat-model note in `alias.ts` makes the reasoning visible for the future. |

## Documentation / Operational Notes

- PR body must contain the Unit 3 audit table so the community can see exactly what was checked.
- Issue #44 gets a close-out comment summarizing the outcome: "Frontend now treats on-chain strings as untrusted. Regex consolidated. Audit shows no unsafe render sites today. Backend validation is a separate concern tracked in the gateway repo."
- The Andamio API / gateway team should be notified that the frontend has formalized the "on-chain is untrusted" assumption. Filed as a follow-up (see Scope Boundaries).

## Sources & References

- **Origin issue:** [#44 — Username character filter is frontend-only and bypassable via proxy](https://github.com/workshop-maybe/cardano-xp/issues/44)
- Related files: `src/components/landing/registration-flow.tsx`, `src/components/tx/mint-access-token.tsx`, `src/app/(admin)/admin/course/page.tsx`, `src/components/tx/alias-list-input.tsx`, `src/components/ui/chart.tsx`
- Related prior work: PRs #45, #46, #47 (same branch-per-issue / no-attribution workflow; #45 established the audit-in-PR-body pattern).
