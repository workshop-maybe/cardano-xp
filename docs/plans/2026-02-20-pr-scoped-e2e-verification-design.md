# PR-Scoped E2E Verification — Design

## Goal

Every PR gets a dedicated Playwright spec that verifies its test plan items locally before push. Claude drafts the spec from the PR test plan, the developer approves it, and it runs as part of the Verify pipeline step.

## Problem

Today's dev pipeline (Step 8 — Verify) only runs `npm run typecheck`. PR test plans are prose bullet points in the PR body that are never executed automatically. The existing e2e infrastructure (Playwright, mocks, fixtures, selectors) is solid but underutilized — most specs use soft assertions (`.catch(() => false)`) and pass regardless of UI state.

## Architecture

```
Dev Pipeline (Step 8 — Verify):
  npm run typecheck              → type safety
  Claude drafts PR spec          → developer reviews/approves
  npm run test:e2e:pr            → Playwright runs PR spec
                                    ├── Mocked UI assertions (fast, ~15s)
                                    └── Live smoke tests (page loads, ~30s)
```

### File Structure

```
e2e/tests/pr/
  fix-post-claim-stale-ui.spec.ts      ← committed with PR
  feat-confirm-dialog-tx.spec.ts       ← committed with PR
  ...
```

PR specs ship with the PR, serving as both verification and documentation. Reviewers can see exactly what was tested.

## Test Spec Structure

Each PR spec has two tiers:

### Tier 1: Mocked UI Assertions (required)

Uses `gateway-mock.ts` to intercept API routes with specific state data representing post-action UI states. Hard `expect()` assertions verify the correct elements are visible/hidden.

```typescript
import { test, expect } from "../../fixtures/auth.fixture";
import { setupGatewayMock } from "../../mocks/gateway-mock";

test.describe("fix/post-claim-stale-ui", () => {
  test("contributor page shows 'Welcome Back' after claim", async ({ authenticatedPageWithToken }) => {
    await setupGatewayMock(authenticatedPageWithToken, {
      /* mock: credentialClaims with user alias, ACCEPTED commitment */
    });
    await authenticatedPageWithToken.goto("/project/{id}/contributor");
    await expect(authenticatedPageWithToken.getByText("Welcome Back")).toBeVisible();
    await expect(authenticatedPageWithToken.getByText("Choose your next step")).not.toBeVisible();
  });
});
```

### Tier 2: Live Smoke Tests (optional)

Navigates to real dev server pages (no mocking), checks that pages load without error alerts and basic structure is present. Catches server-side rendering issues and broken imports.

```typescript
test("contributor page loads without errors", async ({ authenticatedPageWithToken }) => {
  await authenticatedPageWithToken.goto("/project/{realProjectId}/contributor");
  await expect(authenticatedPageWithToken.locator('[data-testid="error-alert"]')).not.toBeVisible();
  await expect(authenticatedPageWithToken.getByText("My Contributions")).toBeVisible();
});
```

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Pipeline placement | Verify step (after Simplify + Review) | Tests verified, clean code |
| Test authorship | Claude drafts, developer approves | Quality control + speed |
| Assertion style | Hard `expect()` only | No soft assertions in PR specs |
| State presets | Inline first, extract when 3+ specs repeat | YAGNI |
| Real wallet tests | Deferred | Start simple, add later |
| Existing spec cleanup | Out of scope | New specs only |
| Evolution path | Per-PR specs → scenario library | Approach A then B |

## Evolution Path

**Phase 1 (now):** Per-PR spec files in `e2e/tests/pr/`. Each spec defines its own mock data inline. Claude drafts, developer approves.

**Phase 2 (when patterns emerge):** Extract repeated mock data into `e2e/mocks/state-presets.ts`. Extract repeated assertion patterns into `e2e/scenarios/`. Specs compose from shared modules.

**Phase 3 (later):** Add real-wallet test tier with `@wallet` tag. Wire into CI for PR checks.

## Infrastructure Changes

1. **New npm script:** `test:e2e:pr` — runs only specs in `e2e/tests/pr/`
2. **New directory:** `e2e/tests/pr/` — PR-scoped test specs
3. **Workflow update:** Verify step includes typecheck + e2e spec drafting + e2e run
4. **No changes to existing mocks, fixtures, or specs**

## Success Criteria

- PR test plan items are verifiable before push
- False positives eliminated (hard assertions only)
- Total verification time under 5 minutes (typecheck + e2e)
- Specs are readable by PR reviewers
- Infrastructure reusable across PRs
