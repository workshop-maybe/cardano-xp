# E2E Testing Guide

End-to-end testing infrastructure for the Andamio App using Playwright.

## Quick Start

```bash
# Run all E2E tests (mock wallet)
npm run test:e2e

# Run specific test file
npx playwright test tests/auth/wallet-connect.spec.ts

# Run with UI mode (visual debugging)
npx playwright test --ui

# Run headed (see browser)
npx playwright test --headed
```

## Architecture Overview

```
e2e/
├── fixtures/           # Playwright test fixtures
│   ├── auth.fixture.ts       # JWT authentication fixture
│   └── multi-role.fixture.ts # Multi-role (Student/Teacher) fixtures
├── mocks/              # Wallet mocking infrastructure
│   ├── mesh-wallet-mock.ts   # Mock wallet (no real TX)
│   ├── ledger-wallet-mock.ts # Mock ledger for UTXO tracking
│   ├── cbor-validator.ts     # Transaction CBOR validation
│   └── real-wallet.ts        # Real wallet (actual on-chain TX)
├── tests/              # Test files
│   ├── auth/                 # Authentication tests
│   ├── courses/              # Course browsing tests
│   ├── projects/             # Project tests
│   ├── transactions/         # Transaction flow tests
│   └── tx-*.spec.ts          # Transaction loop tests
└── playwright.config.ts      # Playwright configuration
```

## Testing Modes

### 1. Mock Wallet (Default)

Uses simulated wallet responses. Fast, no real transactions, no funds needed.

```bash
npm run test:e2e
```

**Use for:**
- CI/CD pipelines
- UI flow validation
- Navigation testing
- Component rendering

### 2. Real Wallet (On-Chain)

Uses actual Cardano wallet for real transactions on preprod testnet.

```bash
BLOCKFROST_PREPROD_API_KEY="your-key" npx playwright test tests/real-wallet-tx.spec.ts
```

**Use for:**
- Transaction validation
- On-chain integration testing
- Full Loop 2 (Earn Credential) testing

---

## Setup Guide

### Prerequisites

- Node.js 18+
- npm or pnpm
- Chrome/Chromium (Playwright will install if needed)

### Step 1: Install Dependencies

```bash
npm install
npx playwright install
```

### Step 2: Environment Variables

Copy `.env.example` to `.env` if you haven't already:

```bash
cp .env.example .env
```

Required for basic tests:
```env
NEXT_PUBLIC_ANDAMIO_GATEWAY_URL="https://preprod.api.andamio.io"
NEXT_PUBLIC_CARDANO_NETWORK="preprod"
```

### Step 3: Run Basic Tests

```bash
npm run test:e2e
```

---

## Real Wallet Setup (Optional)

For testing actual on-chain transactions, you need additional setup.

### Step 1: Get Blockfrost API Key

1. Go to [blockfrost.io](https://blockfrost.io/)
2. Create a free account
3. Create a new project:
   - Network: **Cardano preprod**
   - Name: `andamio-e2e-testing`
4. Copy the **Project ID** (starts with `preprod...`)

### Step 2: Add to Environment

```bash
echo 'BLOCKFROST_PREPROD_API_KEY="preprodXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"' >> .env
```

### Step 3: Fund Test Wallet (if needed)

The default test mnemonic may already have funds. Check with:

```bash
BLOCKFROST_PREPROD_API_KEY="your-key" npx playwright test tests/real-wallet-tx.spec.ts --grep "wallet has sufficient funds"
```

If funds are needed:
1. Get the wallet address from test output
2. Go to [Cardano Testnet Faucet](https://docs.cardano.org/cardano-testnets/tools/faucet/)
3. Select **Preprod Testnet**
4. Enter the wallet address
5. Request test ADA

### Step 4: Generate Role-Based Wallets (Recommended)

For isolated testing with separate wallets for each role:

```bash
# Generate fresh wallets for student, teacher, owner, contributor, manager
npx ts-node e2e/scripts/generate-test-wallets.ts --save
```

This creates `.env.test.local` with unique mnemonics for each role.

### Step 5: Fund the Wallets

**Option A: Fund one wallet, distribute to others (Recommended)**

1. Go to [Cardano Testnet Faucet](https://docs.cardano.org/cardano-testnets/tools/faucet/)
2. Select "Preprod Testnet"
3. Fund only the **student** wallet with 100+ ADA
4. Wait 1-2 minutes for confirmation
5. Run the distribution script:
   ```bash
   source .env.test.local
   BLOCKFROST_PREPROD_API_KEY="your-key" npx ts-node e2e/scripts/fund-test-wallets.ts
   ```

This will send 20 ADA to each other wallet (teacher, owner, contributor, manager).

**Option B: Fund each wallet individually**

1. Go to [Cardano Testnet Faucet](https://docs.cardano.org/cardano-testnets/tools/faucet/)
2. Select "Preprod Testnet"
3. Fund each address from Step 4 output
4. Recommended: 50+ ADA per wallet

**Verify wallet balances:**
```bash
source .env.test.local
BLOCKFROST_PREPROD_API_KEY="your-key" \
npx playwright test tests/real-wallet-tx.spec.ts --grep "check all configured"
```

### Step 6: Export Environment Variables

```bash
# Load from .env.test.local
source .env.test.local

# Or export manually:
export TEST_WALLET_STUDENT_MNEMONIC="word1 word2 ... word24"
export TEST_WALLET_TEACHER_MNEMONIC="word1 word2 ... word24"
export TEST_WALLET_OWNER_MNEMONIC="word1 word2 ... word24"
```

**⚠️ NEVER use mainnet wallet mnemonics!**

### Step 7: Run Real Wallet Tests

```bash
# With role-based wallets
source .env.test.local
BLOCKFROST_PREPROD_API_KEY="your-key" npx playwright test tests/real-wallet-tx.spec.ts

# Check wallet balances
npx playwright test tests/real-wallet-tx.spec.ts --grep "check all configured"
```

---

## Test Categories

### Authentication Tests (`tests/auth/`)

| Test File | Description |
|-----------|-------------|
| `wallet-connect.spec.ts` | Wallet connection flow |
| `jwt-session.spec.ts` | JWT session management |
| `authenticated-flows.spec.ts` | Authenticated user flows |

### Transaction Loop Tests (`tests/tx-*.spec.ts`)

| Test File | Loop | Description |
|-----------|------|-------------|
| `tx-flow-credential.spec.ts` | Loop 2 | Full credential earning flow |
| `tx-loop-enrollment.spec.ts` | Loop 2 | Student enrollment path |
| `tx-loop-exploration.spec.ts` | Loop 2 | UI state exploration |

### Course Tests (`tests/courses/`)

| Test File | Description |
|-----------|-------------|
| `browse-catalog.spec.ts` | Course catalog browsing |
| `enroll-flow.spec.ts` | Course enrollment flow |

---

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from "@playwright/test";

test.describe("Feature Name", () => {
  test("should do something", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("h1")).toBeVisible();
  });
});
```

### Using Auth Fixture

```typescript
import { test, expect } from "../fixtures/auth.fixture";

test("authenticated test", async ({ authenticatedPage }) => {
  // Page already has JWT injected
  await authenticatedPage.goto("/dashboard");
});
```

### Using Multi-Role Fixture

```typescript
import { test, expect } from "../fixtures/multi-role.fixture";

test("multi-role test", async ({ studentPage, teacherPage, ledger }) => {
  // Student and Teacher have separate browser contexts
  // Ledger tracks UTXO state across both

  await studentPage.goto("/course/123");
  await teacherPage.goto("/studio/course/123");

  console.log("Student balance:", ledger.getBalance("student"));
});
```

### Using Real Wallet

```typescript
import { createHeadlessWallet, checkWalletFunds } from "../mocks/real-wallet";

test("real transaction", async () => {
  const wallet = await createHeadlessWallet();
  const address = await wallet.getChangeAddress();

  // Sign and submit real transactions
  const signedTx = await wallet.signTx(unsignedCbor, true);
  const txHash = await wallet.submitTx(signedTx);
});
```

---

## Debugging

### Visual Debugging

```bash
# UI mode - interactive test runner
npx playwright test --ui

# Headed mode - watch browser
npx playwright test --headed

# Slow motion
npx playwright test --headed --slow-mo=500
```

### Screenshots & Traces

Failed tests automatically capture:
- Screenshots: `e2e/test-results/*/test-failed-*.png`
- Traces: `e2e/test-results/*/trace.zip`

View trace:
```bash
npx playwright show-trace e2e/test-results/*/trace.zip
```

### Console Logs

Tests log useful info to console:
```
=== STUDENT: Navigate to Assignment ===
JWT present: true
Wallet balance: 50002000000 lovelace
```

---

## Configuration

### Playwright Config (`playwright.config.ts`)

Key settings:
```typescript
{
  timeout: 60000,           // Test timeout (60s)
  expect: { timeout: 10000 }, // Assertion timeout (10s)
  retries: 1,               // Retry failed tests once
  workers: 2,               // Parallel workers
}
```

### Test Fixtures

| Fixture | Purpose |
|---------|---------|
| `page` | Default Playwright page |
| `authenticatedPage` | Page with JWT injected |
| `connectedPage` | Page with mock wallet connected |
| `studentPage` | Student role context |
| `teacherPage` | Teacher role context |
| `ledger` | MockLedger for UTXO tracking |

---

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run E2E Tests
  run: npm run test:e2e
  env:
    NEXT_PUBLIC_ANDAMIO_GATEWAY_URL: ${{ secrets.GATEWAY_URL }}
    NEXT_PUBLIC_CARDANO_NETWORK: preprod
```

### For Real Transaction Tests in CI

```yaml
- name: Run Real Wallet Tests
  run: npx playwright test tests/real-wallet-tx.spec.ts
  env:
    BLOCKFROST_PREPROD_API_KEY: ${{ secrets.BLOCKFROST_PREPROD_API_KEY }}
    TEST_WALLET_MNEMONIC: ${{ secrets.TEST_WALLET_MNEMONIC }}
```

---

## Troubleshooting

### Tests Hang on `networkidle`

Use `domcontentloaded` instead:
```typescript
await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
```

### Wallet Not Connected

Check that JWT is injected before navigation:
```typescript
await page.addInitScript(() => {
  localStorage.setItem("andamio_jwt", "...");
});
```

### Real Wallet Tests Skipped

Ensure environment variable is set:
```bash
echo $BLOCKFROST_PREPROD_API_KEY
```

### Insufficient Funds

Check balance and fund from faucet:
```bash
npx playwright test tests/real-wallet-tx.spec.ts --grep "sufficient funds"
```

---

## Claude Code Integration

If using Claude Code, the `/test-wallet-setup` skill can guide you through wallet setup interactively:

```
/test-wallet-setup
```

This skill provides step-by-step guidance for:
- Setting up Blockfrost API keys
- Generating role-based wallets
- Funding wallets from faucet
- Distributing ADA between wallets
- Troubleshooting common issues

---

## Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Mesh SDK Documentation](https://meshjs.dev/)
- [Blockfrost](https://blockfrost.io/)
- [Cardano Testnet Faucet](https://docs.cardano.org/cardano-testnets/tools/faucet/)
- [Andamio Docs](https://docs.andamio.io)
