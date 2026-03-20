# PR-Scoped E2E Verification — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add per-PR Playwright test specs to the Verify pipeline step so PR test plans are runnable before push.

**Architecture:** New `e2e/tests/pr/` directory with hard-assertion specs. Each PR gets a dedicated spec file that uses the existing `gateway-mock.ts` for API interception, `auth.fixture.ts` for auth state, and `selectors.ts` for semantic selectors. A new npm script `test:e2e:pr` runs only PR specs.

**Tech Stack:** Playwright, TypeScript, existing e2e mock infrastructure

**Design doc:** `docs/plans/2026-02-20-pr-scoped-e2e-verification-design.md`

---

### Task 1: Add `test:e2e:pr` npm script

**Files:**
- Modify: `package.json:20-26` (add new script in the test:e2e block)

**Step 1: Add the npm script**

In `package.json`, after the existing `test:e2e:report` line, add:

```json
"test:e2e:pr": "playwright test --config=e2e/playwright.config.ts --project=chromium e2e/tests/pr/"
```

The full test script block should look like:

```json
"test:e2e": "playwright test --config=e2e/playwright.config.ts",
"test:e2e:ui": "playwright test --config=e2e/playwright.config.ts --ui",
"test:e2e:debug": "playwright test --config=e2e/playwright.config.ts --debug",
"test:e2e:chromium": "playwright test --config=e2e/playwright.config.ts --project=chromium",
"test:e2e:mobile": "playwright test --config=e2e/playwright.config.ts --project=mobile",
"test:e2e:a11y": "playwright test --config=e2e/playwright.config.ts --project=accessibility",
"test:e2e:report": "playwright show-report e2e/reports/html",
"test:e2e:pr": "playwright test --config=e2e/playwright.config.ts --project=chromium e2e/tests/pr/"
```

**Step 2: Create the `e2e/tests/pr/` directory with a README**

Create `e2e/tests/pr/README.md`:

```markdown
# PR-Scoped Test Specs

Each file in this directory verifies a specific PR's test plan.

## Naming convention

`<branch-name>.spec.ts` — e.g., `fix-post-claim-stale-ui.spec.ts`

## Running

```bash
npm run test:e2e:pr        # Run all PR specs
npx playwright test --config=e2e/playwright.config.ts e2e/tests/pr/fix-post-claim-stale-ui.spec.ts  # Run one
```

## Writing specs

- Import `test` and `expect` from `../../fixtures/auth.fixture`
- Use `setupGatewayMock` with `customHandlers` to mock specific API responses
- Use hard `expect()` assertions — no `.catch(() => false)` soft patterns
- Two tiers: mocked UI assertions (required) + live smoke tests (optional)
```

**Step 3: Verify npm script works (expect no tests found yet)**

Run: `npm run test:e2e:pr 2>&1 || true`

Expected: Playwright reports "no tests found" (directory is empty except README). This confirms the script is wired correctly.

**Step 4: Commit**

```bash
git add package.json e2e/tests/pr/README.md
git commit -m "feat: add test:e2e:pr npm script and PR spec directory"
```

---

### Task 2: Write the first PR spec — `fix-post-claim-stale-ui`

This is the reference pattern for all future PR specs.

**Files:**
- Create: `e2e/tests/pr/fix-post-claim-stale-ui.spec.ts`

**Context:** The `fix/post-claim-stale-ui` PR fixes a bug where after a Leave & Claim transaction, stale UI elements persist. The fix uses `hasClaimed` cross-reference against `project.credentialClaims`. The PR test plan items are:

1. After claim, project page should NOT show "Task Accepted" banner
2. After claim, contributor page shows "Welcome Back" status and correct stats
3. Task detail page shows "Rewards Claimed" state, not decision cards
4. Treasury "Remove" task TX triggers UI refresh (not testable with mocks — skip)
5. `npm run typecheck` passes (already in pipeline — skip)

**How the app fetches data:**
- All API calls go through Next.js proxy at `/api/gateway/api/v2/...`
- `useProject(projectId)` → `GET /api/gateway/api/v2/project/user/project/{id}`
- `useProjectTasks(projectId)` → `POST /api/gateway/api/v2/project/user/tasks/list` with `{ project_id }`
- `useContributorCommitments(projectId)` → `POST /api/gateway/api/v2/project/contributor/commitments/list`
- `useContributorCommitment(projectId, taskHash)` → `POST /api/gateway/api/v2/project/contributor/commitment/get`

**The mock intercept pattern:** `setupGatewayMock` intercepts `**/api/**`. Use `customHandlers` to override specific routes with mock data representing the post-claim state.

**Step 1: Write the spec file**

Create `e2e/tests/pr/fix-post-claim-stale-ui.spec.ts`:

```typescript
/**
 * PR Verification: fix/post-claim-stale-ui
 *
 * After a Leave & Claim TX, the gateway may still report commitmentStatus "ACCEPTED".
 * The fix cross-references credentialClaims to detect the post-claim state.
 *
 * Test plan:
 * 1. Project page hides "Task Accepted" banner when user has claimed
 * 2. Contributor page shows "Welcome Back" and correct stats after claim
 * 3. Task detail page shows "Rewards Claimed" instead of decision cards
 */

import { test, expect } from "../../fixtures/auth.fixture";
import { setupGatewayMock } from "../../mocks/gateway-mock";
import type { Page, Route } from "@playwright/test";

// ── Mock Data: Post-Claim State ──────────────────────────────────────────────
// Represents a user who has completed Leave & Claim but the gateway still
// reports commitmentStatus "ACCEPTED" (the bug this PR fixes).

const PROJECT_ID = "mock-project-post-claim-test";
const TASK_HASH = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
const USER_ALIAS = "TestAlias";

const mockProject = {
  id: PROJECT_ID,
  title: "Test Project (Post-Claim)",
  description: "A project for testing post-claim UI state",
  policyId: PROJECT_ID,
  contributorStateId: "contributor-state-" + PROJECT_ID,
  treasuryAddress: "addr_test1mock",
  treasuryBalance: 100000000,
  treasuryFundings: [],
  prerequisites: [],
  // Key: user has a credential claim (they already claimed)
  credentialClaims: [
    { alias: USER_ALIAS, txHash: "claimed-tx-hash-123" },
  ],
  // Key: user is still listed as a contributor (gateway hasn't cleaned up)
  contributors: [
    { alias: USER_ALIAS },
  ],
  // One submission exists (the claimed task)
  submissions: [
    { taskHash: TASK_HASH, alias: USER_ALIAS },
  ],
  // No assessments relevant for this test
  assessments: [],
  tasks: [
    {
      taskHash: TASK_HASH,
      title: "Test Task Alpha",
      description: "A test task",
      lovelaceAmount: "5000000",
      taskStatus: "ON_CHAIN",
      expirationTime: "1800000000000",
      index: 0,
    },
  ],
};

const mockCommitments = [
  {
    taskHash: TASK_HASH,
    commitmentStatus: "ACCEPTED", // Gateway still says ACCEPTED (the bug)
    evidence: null,
    submissionTx: "submission-tx-hash-456",
    pendingTxHash: null,
  },
];

const mockTasks = [
  {
    taskHash: TASK_HASH,
    title: "Test Task Alpha",
    description: "A test task",
    lovelaceAmount: "5000000",
    taskStatus: "ON_CHAIN",
    expirationTime: "1800000000000",
    index: 0,
    contentJson: null,
    onChainContent: null,
    createdByAlias: "owner-alias",
    contributorStateId: "contributor-state-" + PROJECT_ID,
  },
  // Add 2 more available tasks (not submitted to) for the available task count
  {
    taskHash: "available-task-hash-001",
    title: "Available Task 1",
    description: "An available task",
    lovelaceAmount: "3000000",
    taskStatus: "ON_CHAIN",
    expirationTime: "1800000000000",
    index: 1,
  },
  {
    taskHash: "available-task-hash-002",
    title: "Available Task 2",
    description: "Another available task",
    lovelaceAmount: "4000000",
    taskStatus: "ON_CHAIN",
    expirationTime: "1800000000000",
    index: 2,
  },
];

/**
 * Install custom API handlers that return post-claim mock data.
 * Uses the gateway-mock's customHandlers to override specific routes
 * while keeping default handlers for auth and other endpoints.
 */
async function setupPostClaimMocks(page: Page): Promise<void> {
  await setupGatewayMock(page, {
    customHandlers: {
      // Project detail
      [`project/user/project/${PROJECT_ID}`]: async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockProject),
        });
      },
      // Project detail (also match without specific ID for broader patterns)
      "project/user/project/mock-project": async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockProject),
        });
      },
      // Tasks list
      "project/user/tasks/list": async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockTasks),
        });
      },
      // Contributor commitments list
      "project/contributor/commitments/list": async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockCommitments),
        });
      },
      // Single commitment detail
      "project/contributor/commitment/get": async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockCommitments[0]),
        });
      },
    },
  });
}

// ── Tier 1: Mocked UI State Assertions ───────────────────────────────────────

test.describe("fix/post-claim-stale-ui — Mocked UI State", () => {
  test("project page hides contributor status banner after claim", async ({
    authenticatedPageWithToken,
  }) => {
    await setupPostClaimMocks(authenticatedPageWithToken);
    await authenticatedPageWithToken.goto(`/project/${PROJECT_ID}`);
    await authenticatedPageWithToken.waitForLoadState("domcontentloaded");

    // The stale "Task Accepted" or "You're contributing" banner should NOT appear
    await expect(
      authenticatedPageWithToken.getByText("Task Accepted", { exact: false }),
    ).not.toBeVisible({ timeout: 5000 });

    await expect(
      authenticatedPageWithToken.getByText("contributing to this project", { exact: false }),
    ).not.toBeVisible({ timeout: 5000 });
  });

  test("contributor page shows 'Welcome Back' after claim", async ({
    authenticatedPageWithToken,
  }) => {
    await setupPostClaimMocks(authenticatedPageWithToken);
    await authenticatedPageWithToken.goto(`/project/${PROJECT_ID}/contributor`);
    await authenticatedPageWithToken.waitForLoadState("domcontentloaded");

    // Status should be "Welcome Back", not "Task Accepted"
    await expect(
      authenticatedPageWithToken.getByText("Welcome Back"),
    ).toBeVisible({ timeout: 10000 });

    await expect(
      authenticatedPageWithToken.getByText("Task Accepted"),
    ).not.toBeVisible({ timeout: 3000 });
  });

  test("contributor page hides decision cards after claim", async ({
    authenticatedPageWithToken,
  }) => {
    await setupPostClaimMocks(authenticatedPageWithToken);
    await authenticatedPageWithToken.goto(`/project/${PROJECT_ID}/contributor`);
    await authenticatedPageWithToken.waitForLoadState("domcontentloaded");

    // "Choose your next step" and the two option cards should NOT appear
    await expect(
      authenticatedPageWithToken.getByText("Choose your next step"),
    ).not.toBeVisible({ timeout: 5000 });

    await expect(
      authenticatedPageWithToken.getByText("Continue Contributing"),
    ).not.toBeVisible({ timeout: 3000 });

    await expect(
      authenticatedPageWithToken.getByText("Leave & Claim"),
    ).not.toBeVisible({ timeout: 3000 });
  });

  test("contributor page shows correct earned rewards", async ({
    authenticatedPageWithToken,
  }) => {
    await setupPostClaimMocks(authenticatedPageWithToken);
    await authenticatedPageWithToken.goto(`/project/${PROJECT_ID}/contributor`);
    await authenticatedPageWithToken.waitForLoadState("domcontentloaded");

    // After claim, earned rewards should include the claimed task's reward (5 ADA)
    // formatLovelace("5000000") = "5 ADA"
    await expect(
      authenticatedPageWithToken.getByText("5 ADA"),
    ).toBeVisible({ timeout: 10000 });
  });

  test("task detail page shows 'Rewards Claimed' after claim", async ({
    authenticatedPageWithToken,
  }) => {
    await setupPostClaimMocks(authenticatedPageWithToken);
    await authenticatedPageWithToken.goto(`/project/${PROJECT_ID}/${TASK_HASH}`);
    await authenticatedPageWithToken.waitForLoadState("domcontentloaded");

    // Should show "Rewards Claimed" state
    await expect(
      authenticatedPageWithToken.getByText("Rewards Claimed"),
    ).toBeVisible({ timeout: 10000 });

    // Decision cards should NOT appear
    await expect(
      authenticatedPageWithToken.getByText("Choose your next step"),
    ).not.toBeVisible({ timeout: 3000 });
  });
});

// ── Tier 2: Live Smoke Tests ─────────────────────────────────────────────────
// These hit the real dev server (no mocking). They verify pages load without
// errors. They use a real project ID if available, otherwise skip gracefully.

test.describe("fix/post-claim-stale-ui — Live Smoke", () => {
  // Skip if dev server is not running or project doesn't exist
  test.skip(
    !process.env.PLAYWRIGHT_BASE_URL && !process.env.CI,
    "Skipping live smoke tests — set PLAYWRIGHT_BASE_URL or run in CI",
  );

  test("project page loads without error", async ({ authenticatedPageWithToken }) => {
    // Use a known project ID from the dev environment if available
    const projectId = process.env.E2E_PROJECT_ID ?? "095b0bac55305cbc106305ebd2e5dbc9300842fc7ae96084c761deb0";
    await authenticatedPageWithToken.goto(`/project/${projectId}`);
    await authenticatedPageWithToken.waitForLoadState("domcontentloaded");

    // No error alert visible
    const errorAlert = authenticatedPageWithToken.locator('[role="alert"]');
    await expect(errorAlert).not.toBeVisible({ timeout: 10000 });
  });

  test("contributor page loads without error", async ({ authenticatedPageWithToken }) => {
    const projectId = process.env.E2E_PROJECT_ID ?? "095b0bac55305cbc106305ebd2e5dbc9300842fc7ae96084c761deb0";
    await authenticatedPageWithToken.goto(`/project/${projectId}/contributor`);
    await authenticatedPageWithToken.waitForLoadState("domcontentloaded");

    // Page should show either content or "Connect your wallet" gate — not an error
    const errorAlert = authenticatedPageWithToken.locator('[role="alert"]');
    await expect(errorAlert).not.toBeVisible({ timeout: 10000 });
  });
});
```

**Step 2: Run the spec to verify it executes**

Run: `npm run test:e2e:pr`

Expected: Playwright starts, runs the tests. Mocked tier tests should pass (they test against mock data). Live smoke tests may skip or fail depending on whether the dev server is running.

If the dev server is running locally: `npm run dev` in a separate terminal, then `npm run test:e2e:pr`.

**Step 3: Fix any assertion failures**

If tests fail, the mock data shape may not match what the app expects. Common issues:
- The Next.js proxy path may need adjustment in `customHandlers`
- The mock data may be missing required fields that the hooks expect
- The page may need more time to render (increase timeout)

Iterate until all mocked tier tests pass.

**Step 4: Commit**

```bash
git add e2e/tests/pr/fix-post-claim-stale-ui.spec.ts
git commit -m "test: add PR verification spec for fix/post-claim-stale-ui

Verifies post-claim UI state:
- Project page hides stale 'Task Accepted' banner
- Contributor page shows 'Welcome Back' with correct rewards
- Task detail shows 'Rewards Claimed' instead of decision cards
- Live smoke tests verify pages load without errors"
```

---

### Task 3: Update workflow memory with new Verify sub-steps

**Files:**
- Modify: `/Users/robertom/.claude/projects/-Users-robertom-Documents-Workspace-Projects-andamio-app-v2/memory/workflow.md`

**Step 1: Update the pipeline definition**

Change step 8 from:

```
8. **Verify** — `superpowers:verification-before-completion` before claiming done
```

To:

```
8. **Verify** — `superpowers:verification-before-completion`:
   - `npm run typecheck` — type safety gate
   - Claude drafts PR test spec in `e2e/tests/pr/<branch>.spec.ts` — developer approves
   - `npm run test:e2e:pr` — runs PR spec (mocked UI assertions + live smoke)
```

**Step 2: Commit**

```bash
git add /Users/robertom/.claude/projects/-Users-robertom-Documents-Workspace-Projects-andamio-app-v2/memory/workflow.md
git commit -m "docs: update workflow with PR spec verification in Verify step"
```

---

### Task 4: Run full verification and push

**Step 1: Run typecheck**

Run: `npm run typecheck`
Expected: Clean pass (no errors).

**Step 2: Run the PR spec**

Run: `npm run test:e2e:pr`
Expected: All mocked tier tests pass. Live smoke tests pass if dev server is running.

**Step 3: Push and create PR**

```bash
git push -u origin feat/pr-scoped-e2e-verification
gh pr create --title "Add PR-scoped E2E verification to dev pipeline" --body "..."
```

---

## Verification Checklist

After implementation:

1. `npm run test:e2e:pr` runs without errors
2. Mocked tests verify post-claim UI state correctly
3. The spec file serves as documentation of what was tested
4. The npm script is discoverable via `npm run` (shows in script list)
5. Workflow memory reflects the new Verify sub-steps
