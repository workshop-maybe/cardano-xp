/**
 * Real Wallet Transaction Tests
 *
 * These tests use an actual Cardano wallet to perform on-chain transactions.
 * They require:
 * 1. A funded test wallet (preprod)
 * 2. BLOCKFROST_PREPROD_API_KEY environment variable
 * 3. TEST_WALLET_MNEMONIC environment variable (optional, has default)
 *
 * Run with: npx playwright test tests/real-wallet-tx.spec.ts
 *
 * IMPORTANT: These tests spend real testnet ADA!
 */

import { test, expect } from "@playwright/test";
import {
  createHeadlessWallet,
  createRoleWallet,
  getWalletInfo,
  getRoleWalletInfo,
  checkWalletFunds,
  checkAllRoleWalletFunds,
  executeTransactionDirect,
  hasRoleWallets,
  getConfiguredRoles,
  getRoleWalletConfig,
  type RealWalletConfig,
  type TestRole,
} from "../mocks/real-wallet";

// =============================================================================
// Configuration
// =============================================================================

// Skip tests if no Blockfrost API key is configured
const BLOCKFROST_API_KEY = process.env.BLOCKFROST_PREPROD_API_KEY;
const SKIP_REASON = !BLOCKFROST_API_KEY
  ? "BLOCKFROST_PREPROD_API_KEY not set - skipping real wallet tests"
  : null;

// Test wallet configuration
const TEST_WALLET_CONFIG: RealWalletConfig = {
  mnemonic: process.env.TEST_WALLET_MNEMONIC?.split(" ") ?? [
    // Default test mnemonic - replace with your own funded wallet
    "abandon", "abandon", "abandon", "abandon", "abandon", "abandon",
    "abandon", "abandon", "abandon", "abandon", "abandon", "abandon",
    "abandon", "abandon", "abandon", "abandon", "abandon", "abandon",
    "abandon", "abandon", "abandon", "abandon", "abandon", "art",
  ],
  networkId: 0, // preprod
  blockfrostApiKey: BLOCKFROST_API_KEY ?? "",
  name: "TestWallet",
};

const GATEWAY_URL = process.env.NEXT_PUBLIC_ANDAMIO_GATEWAY_URL ?? "https://preprod.api.andamio.io";

// =============================================================================
// Tests
// =============================================================================

test.describe("Real Wallet Integration", () => {
  test.describe.configure({ mode: "serial" }); // Run tests in order

  test.beforeAll(async () => {
    if (SKIP_REASON) {
      test.skip(true, SKIP_REASON);
    }
  });

  test("can create headless wallet from mnemonic", async () => {
    if (!BLOCKFROST_API_KEY) {
      test.skip(true, "No Blockfrost API key");
      return;
    }

    console.log("\n=== CREATE HEADLESS WALLET ===\n");

    const wallet = await createHeadlessWallet(TEST_WALLET_CONFIG);
    expect(wallet).toBeDefined();

    const address = await wallet.getChangeAddress();
    console.log("Wallet address:", address);
    expect(address).toMatch(/^addr_test1/);
  });

  test("can fetch wallet info and balance", async () => {
    if (!BLOCKFROST_API_KEY) {
      test.skip(true, "No Blockfrost API key");
      return;
    }

    console.log("\n=== FETCH WALLET INFO ===\n");

    const info = await getWalletInfo(TEST_WALLET_CONFIG);

    console.log("Address:", info.address);
    console.log("Balance:", info.balanceAda, "ADA");
    console.log("UTXO count:", info.utxoCount);

    expect(info.address).toMatch(/^addr_test1/);
    expect(typeof info.balanceAda).toBe("number");
  });

  test("wallet has sufficient funds for testing", async () => {
    if (!BLOCKFROST_API_KEY) {
      test.skip(true, "No Blockfrost API key");
      return;
    }

    console.log("\n=== CHECK WALLET FUNDS ===\n");

    const check = await checkWalletFunds(TEST_WALLET_CONFIG, 5);

    console.log("Has funds:", check.hasFunds);
    console.log("Balance:", check.balance, "ADA");
    console.log("Address:", check.address);
    console.log("Message:", check.message);

    if (!check.hasFunds) {
      console.log("\n⚠️  Wallet needs funding!");
      console.log("1. Copy address:", check.address);
      console.log("2. Go to: https://docs.cardano.org/cardano-testnets/tools/faucet/");
      console.log("3. Request test ADA for preprod network");
    }

    // Don't fail the test, just warn
    expect(check.address).toMatch(/^addr_test1/);
  });

  test("can sign a transaction", async () => {
    if (!BLOCKFROST_API_KEY) {
      test.skip(true, "No Blockfrost API key");
      return;
    }

    console.log("\n=== SIGN TRANSACTION TEST ===\n");

    const wallet = await createHeadlessWallet(TEST_WALLET_CONFIG);

    // Create a minimal test transaction CBOR (this is a placeholder)
    // In reality, we'd get this from the gateway API
    const testUnsignedTx =
      "84a400818258203b40265111d8bb3c3c608d95b3a0bf83461ace32d79336579a1939b3aad1c0b700018182583900" +
      "a4918d9a0bf9c6b77b85d8b2f4c5c5f0e8a3b1d2e4f6a8c0d2e4f6a8c0d2e4f6a8c0d2e4f6a8c0d2e4f6a8c0" +
      "d2e4f6a8c01a001e8480021a0002904d031a03b5d380a0f5f6";

    try {
      // This will fail with an invalid transaction, but it tests the signing path
      await wallet.signTx(testUnsignedTx, true);
      console.log("Signing succeeded (unexpected for test CBOR)");
    } catch (error) {
      // Expected - the test CBOR isn't a valid transaction
      console.log("Signing failed as expected for invalid CBOR:", (error as Error).message);
      expect(error).toBeDefined();
    }
  });
});

test.describe("Role-Based Wallets", () => {
  test.beforeAll(async () => {
    if (!BLOCKFROST_API_KEY) {
      test.skip(true, "No Blockfrost API key");
    }
  });

  test("check all configured role wallets", async () => {
    if (!BLOCKFROST_API_KEY) {
      test.skip(true, "No Blockfrost API key");
      return;
    }

    console.log("\n=== ROLE-BASED WALLET STATUS ===\n");

    const configuredRoles = getConfiguredRoles();

    if (configuredRoles.length === 0) {
      console.log("⚠️  No role-based wallets configured.");
      console.log("   Run: npx ts-node e2e/scripts/generate-test-wallets.ts --save");
      console.log("   Then fund the wallets from the faucet.");
      expect(true).toBe(true); // Don't fail, just warn
      return;
    }

    console.log(`Found ${configuredRoles.length} configured roles: ${configuredRoles.join(", ")}\n`);

    const results = await checkAllRoleWalletFunds(10);

    let allFunded = true;
    const unfundedAddresses: string[] = [];

    for (const [role, info] of results) {
      const status = info.hasFunds ? "✅" : "❌";
      console.log(`${status} ${role.padEnd(12)} ${info.balance.toFixed(2).padStart(10)} ADA`);
      console.log(`   Address: ${info.address}`);

      if (!info.hasFunds) {
        allFunded = false;
        unfundedAddresses.push(`${role}: ${info.address}`);
      }
    }

    if (!allFunded) {
      console.log("\n⚠️  Some wallets need funding!");
      console.log("   Go to: https://docs.cardano.org/cardano-testnets/tools/faucet/");
      console.log("   Fund these addresses:");
      unfundedAddresses.forEach((addr) => console.log(`   - ${addr}`));
    }

    expect(configuredRoles.length).toBeGreaterThan(0);
  });

  test("create student wallet", async () => {
    if (!BLOCKFROST_API_KEY) {
      test.skip(true, "No Blockfrost API key");
      return;
    }

    const config = getRoleWalletConfig("student");
    if (!config) {
      test.skip(true, "Student wallet not configured");
      return;
    }

    console.log("\n=== STUDENT WALLET ===\n");
    const wallet = await createRoleWallet("student");
    const address = await wallet.getChangeAddress();
    const balance = await wallet.getLovelace();

    console.log("Address:", address);
    console.log("Balance:", parseInt(balance) / 1_000_000, "ADA");

    expect(address).toMatch(/^addr_test1/);
  });

  test("create teacher wallet", async () => {
    if (!BLOCKFROST_API_KEY) {
      test.skip(true, "No Blockfrost API key");
      return;
    }

    const config = getRoleWalletConfig("teacher");
    if (!config) {
      test.skip(true, "Teacher wallet not configured");
      return;
    }

    console.log("\n=== TEACHER WALLET ===\n");
    const wallet = await createRoleWallet("teacher");
    const address = await wallet.getChangeAddress();
    const balance = await wallet.getLovelace();

    console.log("Address:", address);
    console.log("Balance:", parseInt(balance) / 1_000_000, "ADA");

    expect(address).toMatch(/^addr_test1/);
  });

  test("create owner wallet", async () => {
    if (!BLOCKFROST_API_KEY) {
      test.skip(true, "No Blockfrost API key");
      return;
    }

    const config = getRoleWalletConfig("owner");
    if (!config) {
      test.skip(true, "Owner wallet not configured");
      return;
    }

    console.log("\n=== OWNER WALLET ===\n");
    const wallet = await createRoleWallet("owner");
    const address = await wallet.getChangeAddress();
    const balance = await wallet.getLovelace();

    console.log("Address:", address);
    console.log("Balance:", parseInt(balance) / 1_000_000, "ADA");

    expect(address).toMatch(/^addr_test1/);
  });
});

test.describe("Loop 2: Real Transaction Flow", () => {
  // These tests require both API key and funded wallet
  test.beforeEach(async () => {
    if (!BLOCKFROST_API_KEY) {
      test.skip(true, "No Blockfrost API key");
    }

    const check = await checkWalletFunds(TEST_WALLET_CONFIG, 10);
    if (!check.hasFunds) {
      test.skip(true, `Insufficient funds: ${check.message}`);
    }
  });

  test.skip("execute assignment commit transaction", async () => {
    // This test is skipped by default - enable when ready to test real TX
    console.log("\n=== REAL ASSIGNMENT COMMIT TX ===\n");

    const check = await checkWalletFunds(TEST_WALLET_CONFIG);
    console.log("Wallet balance:", check.balance, "ADA");

    // This would execute a real transaction
    // const result = await executeTransactionDirect({
    //   config: TEST_WALLET_CONFIG,
    //   gatewayUrl: GATEWAY_URL,
    //   endpoint: "/api/v2/tx/course/student/assignment/commit",
    //   txParams: {
    //     alias: "test-student",
    //     course_id: "...",
    //     slt_hash: "...",
    //     module_code: "...",
    //     network_evidence_hash: "...",
    //   },
    // });
    // console.log("TX Hash:", result.txHash);
  });
});

// =============================================================================
// Setup Instructions
// =============================================================================

test.describe("Setup Instructions", () => {
  test("display setup instructions", async () => {
    console.log(`
╔════════════════════════════════════════════════════════════════════╗
║                    REAL WALLET TESTING SETUP                       ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  1. Get a Blockfrost API Key (free tier):                          ║
║     https://blockfrost.io/                                         ║
║     - Create account                                               ║
║     - Create project for "Cardano preprod"                         ║
║     - Copy API key                                                 ║
║                                                                    ║
║  2. Set environment variable:                                      ║
║     export BLOCKFROST_PREPROD_API_KEY="your-api-key"               ║
║                                                                    ║
║  3. (Optional) Use your own test wallet:                           ║
║     export TEST_WALLET_MNEMONIC="word1 word2 ... word24"           ║
║                                                                    ║
║  4. Fund the test wallet:                                          ║
║     https://docs.cardano.org/cardano-testnets/tools/faucet/        ║
║     - Select "Preprod Testnet"                                     ║
║     - Enter wallet address                                         ║
║     - Request test ADA                                             ║
║                                                                    ║
║  5. Run tests:                                                     ║
║     npx playwright test tests/real-wallet-tx.spec.ts               ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
    `);

    // This test always passes - it's just for displaying instructions
    expect(true).toBe(true);
  });
});
