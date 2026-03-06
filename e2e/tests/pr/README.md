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
