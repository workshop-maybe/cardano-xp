---
title: "fix: external link audit for issue #41"
type: fix
status: active
date: 2026-04-18
---

# fix: external link audit for issue #41

## Overview

Issue #41 reports a 404 on the GitHub repo link on the "Looking for a bug" / "Report a bug" page at `cardano-xp.io`. Git history shows commit `a5e109e` (2026-03-20) already rewrote every `Andamio-Platform/cardano-xp` URL to `workshop-maybe/cardano-xp` across `src/config/branding.ts`, `src/app/(app)/about/page.tsx`, and `src/app/(app)/andamio-access-token/page.tsx`. The repo is public at the new URL. So the reporter's 404 almost certainly came from a stale prod deploy, not current `main`.

This plan treats the issue as an **audit + communication task**, not new code. We verify every external link in current `main` still resolves, reference the fix commit in the issue comment, confirm prod has the corrected build, and close.

## Problem Frame

Reporter (njuguna, plus the xss-probe reporter) hit a broken GitHub link from the bug-report page. James wants:

1. Confirmation that every external link in current `main` resolves (not just the one reported).
2. If the fix already landed, link the commit in the issue so the community report shows the correction already happened.
3. A dedicated branch + PR only if the audit surfaces real regressions.

## Requirements Trace

- **R1.** Every external URL in `src/`, `docs/`, `config/`, and root-level markdown resolves (200 OK) or is a documented placeholder (`WHITE_LABEL_GUIDE.md` template strings).
- **R2.** Issue #41 receives a comment referencing the fix commit (`a5e109e`) and explaining the stale-deploy hypothesis.
- **R3.** If prod (`cardano-xp.io`) is still serving the old URL, prod gets redeployed off current `main`.
- **R4.** If audit finds any genuinely broken link, it lands in a branch + PR with no Claude Code attribution in commit or PR body.

## Scope Boundaries

- Not introducing a centralized `lib/links.ts` — `BRANDING.links` in `src/config/branding.ts` already serves that role for the three most-referenced URLs; do not refactor further.
- Not rewriting documentation URLs in `src/types/generated/gateway.ts` (generated file, upstream owns).
- Not touching `docs/WHITE_LABEL_GUIDE.md` placeholder URLs like `https://github.com/your-org` — those are intentional examples.
- Not rewriting the `feat/Andamio-Platform/andamio-app-v2/issues/323` references in `src/lib/*-error-messages.ts` — those point to a legitimate upstream issue, not this repo.

### Deferred to Separate Tasks

- Broader "centralize all external links into one module" refactor — low value; punt unless links rot again.
- Prod deploy verification and redeploy — operational, done outside the PR.

## Context & Research

### Relevant Code and Patterns

- `src/config/branding.ts` — `BRANDING.links.github`, `.docs`. Single source for the three most-referenced external URLs. Consumed by footer, nav, and error help copy.
- `src/app/(app)/about/page.tsx` — two inline GitHub links (`/issues/new`, `/tree/main/journal`, `workshop-maybe/cardano-xp`).
- `src/app/(app)/andamio-access-token/page.tsx` — one inline GitHub `/issues` link.
- `src/components/layout/app-footer.tsx` — reads `BRANDING.links.github`.
- `src/components/landing/landing-hero.tsx` — may include external links added in `a5e109e`.
- `src/lib/tx-error-messages.ts`, `src/lib/auth-error-messages.ts`, `src/lib/api-error-messages.ts` — reference `andamio-app-v2/issues/323` (upstream, not this repo; leave as-is).

### Institutional Learnings

- Commit `a5e109e` (2026-03-20) is the correction. It bundled tone-setting copy ("vibe-coded experiment") with the URL fix, so a reader scanning the log would see the copy change first.
- Commit `845bbfc` is a follow-up that pointed GitHub issue links at `/issues` instead of `/issues/new` (surface the existing issue list rather than push everyone to file new).

## Key Technical Decisions

- **Audit with a script, not a manual scan.** Use `rg` to enumerate every `http(s)://` URL in tracked files, dedupe, filter out placeholders and in-repo refs, then HEAD-check each one. Keeps the audit reproducible.
- **No link-centralization refactor.** `BRANDING.links` already covers the repeat offenders; adding a fourth abstraction layer would be the definition of premature generalization. If the audit finds stragglers, inline-fix them.
- **Issue comment over new code.** If current `main` passes audit, the PR-worthy artifact is the issue comment, not a code change. Close #41 by pointing at `a5e109e` and noting the prod rebuild.

## Open Questions

### Resolved During Planning

- *Is the "Looking for a bug" page the about page or the access-token page?* Both have a bug-reporter link. Audit confirms both point at `workshop-maybe/cardano-xp`.
- *Is the repo actually public?* Yes — `gh repo view` confirms `visibility: PUBLIC`.

### Deferred to Implementation

- Whether any non-GitHub external link (docs.andamio.io, wallet sites, CIP spec links in markdown) returns a 404 or redirect — audit will tell.
- Whether prod is running the pre-`a5e109e` build — check at audit time via `curl -s https://cardano-xp.io/about | grep -oE 'github.com/[^"]+'`.

## Implementation Units

- [ ] **Unit 1: External link audit**

**Goal:** Produce a list of every external URL referenced from tracked source and docs, and verify each resolves.

**Requirements:** R1

**Dependencies:** None

**Files:**
- Read-only sweep of: `src/**/*.{ts,tsx,md}`, `docs/**/*.md`, `README.md`, `CHANGELOG.md`, `src/config/branding.ts`

**Approach:**
- Use `rg -o 'https?://[^\s"\'\)>]+'` across tracked files.
- Dedupe, strip trailing punctuation, exclude: `github.com/andamio-platform/andamio-app-v2/issues/323` (upstream), `github.com/your-org` (template placeholder), `github.com/acacode/swagger-typescript-api` (generated file header).
- HEAD-check the remainder with `curl -sI -o /dev/null -w '%{http_code} %{url_effective}\n' <url>`.
- Flag any non-2xx (allow 3xx if it redirects to the expected domain).

**Patterns to follow:**
- No existing pattern — this is a one-off audit. Capture the command sequence in the PR body or issue comment so the community can replay it.

**Test scenarios:**
- Test expectation: none — this is a read-only audit; no behavior change to test.

**Verification:**
- A list of external URLs with their HTTP status is produced.
- Every URL either returns 2xx, redirects safely, or is explicitly exempted (placeholder / upstream / generated).

---

- [ ] **Unit 2: Fix any stragglers (conditional on Unit 1 findings)**

**Goal:** Fix any genuinely broken link the audit surfaces in a dedicated branch + PR.

**Requirements:** R1, R4

**Dependencies:** Unit 1 complete

**Files:**
- To be determined by audit. Most likely candidate if any: `src/config/branding.ts` (single-source fix propagates).

**Approach:**
- If audit passes clean, **skip this unit entirely.**
- If audit finds a real regression, create branch `fix/41-external-link-audit`, fix the minimum set of lines, open PR titled `fix: correct broken external link surfaced by #41`.
- Commit message and PR body must NOT include Claude Code attribution (per repo feedback memory).

**Patterns to follow:**
- Reference commit `a5e109e` for the pattern of rewriting `Andamio-Platform/cardano-xp` → `workshop-maybe/cardano-xp`.

**Test scenarios:**
- Happy path: the fixed link resolves to 2xx in a fresh `curl -I` check after the patch.

**Verification:**
- `npm run build` succeeds.
- Re-running the Unit 1 audit against the branch returns zero broken links.

---

- [ ] **Unit 3: Comment on issue #41**

**Goal:** Close the communication loop with the reporters and the community.

**Requirements:** R2, R3

**Dependencies:** Unit 1 complete (Unit 2 optional)

**Files:**
- None in-repo. Output is a GitHub comment via `gh issue comment 41`.

**Approach:**
- Comment body references commit `a5e109e` as the fix, explains it landed on 2026-03-20 (~1 month before the report), notes the reporter likely hit a stale prod build, and links the Unit 1 audit results.
- If prod was rebuilt as part of resolving this, state that explicitly so the reporter can re-verify.
- If Unit 2 produced a follow-up PR, link it.
- Close the issue once prod is confirmed correct.

**Patterns to follow:**
- Prior per-issue community reports (James's stated pattern): brief, factual, link the commit, thank the reporter.

**Test scenarios:**
- Test expectation: none — communication artifact.

**Verification:**
- Comment posted to issue #41.
- Issue closed (after prod confirmation).

## System-Wide Impact

- **Interaction graph:** None. This is a copy/config audit; no runtime behavior changes.
- **Error propagation:** N/A.
- **State lifecycle risks:** None.
- **API surface parity:** `BRANDING.links.github` is the single source the footer and help copy read from; no parity concern.
- **Integration coverage:** N/A — no behavior under test.
- **Unchanged invariants:** `BRANDING.links` shape, external link positions in the about and access-token pages.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Reporter hits the same 404 again because prod wasn't redeployed | Unit 3 includes explicit prod-verification step before closing |
| Audit misses a link because it's constructed via template literal | `rg` pattern catches `https?://` at the start; template-literal-assembled URLs are rare in this repo (spot-check `BRANDING` consumers) |
| A documentation link (e.g., to a CIP spec) has rotted since last touched | Flag in audit output; fix scope may expand — document expansion in the issue comment rather than silently broadening the PR |

## Documentation / Operational Notes

- Prod deploy platform: Vercel (per repo convention). If prod is stale, a redeploy from `main` is the operational fix.
- PR body template: brief summary, link to issue #41, link to fix commit `a5e109e`, audit output pasted inline.

## Sources & References

- **Origin issue:** [#41 — Broken GitHub repo link on "Looking for a bug" page](https://github.com/workshop-maybe/cardano-xp/issues/41)
- **Fix commit (already in `main`):** `a5e109e` — "Surface the vibe-coded experiment story and fix GitHub URLs" (2026-03-20)
- **Follow-up commit:** `845bbfc` — "fix: point GitHub issue links to /issues instead of /issues/new"
- Related files: `src/config/branding.ts`, `src/app/(app)/about/page.tsx`, `src/app/(app)/andamio-access-token/page.tsx`
