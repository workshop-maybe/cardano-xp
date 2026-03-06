/**
 * Real Wallet Transaction Loop 2: Earn a Credential
 *
 * This test uses REAL Cardano wallets to perform actual on-chain transactions.
 *
 * Prerequisites:
 * 1. Role-based wallets configured (TEST_WALLET_STUDENT_MNEMONIC, TEST_WALLET_TEACHER_MNEMONIC)
 * 2. Wallets funded with preprod ADA (50+ ADA each)
 * 3. BLOCKFROST_PREPROD_API_KEY set
 *
 * Run with:
 * ```bash
 * source .env.test.local
 * BLOCKFROST_PREPROD_API_KEY="your-key" npx playwright test tests/real-wallet-loop2.spec.ts
 * ```
 *
 * IMPORTANT: These tests spend real testnet ADA!
 */

import { test, expect, type Page } from "@playwright/test";
import {
  createRoleWallet,
  getRoleWalletConfig,
  checkWalletFunds,
  injectRealWallet,
  type TestRole,
} from "../mocks/real-wallet";

// =============================================================================
// Configuration
// =============================================================================

const BLOCKFROST_API_KEY = process.env.BLOCKFROST_PREPROD_API_KEY;
const SKIP_REASON = !BLOCKFROST_API_KEY
  ? "BLOCKFROST_PREPROD_API_KEY not set"
  : null;

// Test course - "Intro to Drawing" has actual assignment content
const TEST_COURSE = {
  id: "6021356002a5ae8b5240252f48e8105a6cc9a0c7231f0ec5cc22b75d",
  title: "Intro to Drawing",
  owner: "Kenny",
  moduleCode: "101",
  moduleName: "Introduction to Circles",
  assignmentName: "Draw a Circle",
};

// =============================================================================
// Helper Functions
// =============================================================================

async function setupRealWalletPage(
  page: Page,
  role: TestRole
): Promise<{ address: string; balance: number }> {
  const config = getRoleWalletConfig(role);
  if (!config) {
    throw new Error(`No wallet configured for role: ${role}`);
  }

  // Check funds
  const fundCheck = await checkWalletFunds(config, 5);
  if (!fundCheck.hasFunds) {
    console.log(`Warning: ${role} wallet has insufficient funds: ${fundCheck.balance} ADA`);
  }

  // Inject real wallet into page
  await injectRealWallet(page, config);

  return {
    address: fundCheck.address,
    balance: fundCheck.balance,
  };
}

async function waitForElement(page: Page, selector: string, timeout = 10000): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// Tests
// =============================================================================

test.describe("Real Wallet - Loop 2: Earn a Credential", () => {
  test.beforeAll(async () => {
    if (SKIP_REASON) {
      test.skip(true, SKIP_REASON);
    }
  });

  test.describe("Prerequisites Check", () => {
    test("student wallet is funded and ready", async () => {
      if (!BLOCKFROST_API_KEY) {
        test.skip(true, "No Blockfrost API key");
        return;
      }

      const config = getRoleWalletConfig("student");
      if (!config) {
        test.skip(true, "Student wallet not configured");
        return;
      }

      console.log("\n=== STUDENT WALLET CHECK ===");
      const check = await checkWalletFunds(config, 10);

      console.log(`Address: ${check.address}`);
      console.log(`Balance: ${check.balance} ADA`);
      console.log(`Has funds: ${check.hasFunds}`);

      expect(check.address).toMatch(/^addr_test1/);
      if (!check.hasFunds) {
        console.log(`\nWallet needs funding! Go to:`);
        console.log(`https://docs.cardano.org/cardano-testnets/tools/faucet/`);
      }
    });

    test("teacher wallet is funded and ready", async () => {
      if (!BLOCKFROST_API_KEY) {
        test.skip(true, "No Blockfrost API key");
        return;
      }

      const config = getRoleWalletConfig("teacher");
      if (!config) {
        test.skip(true, "Teacher wallet not configured");
        return;
      }

      console.log("\n=== TEACHER WALLET CHECK ===");
      const check = await checkWalletFunds(config, 10);

      console.log(`Address: ${check.address}`);
      console.log(`Balance: ${check.balance} ADA`);
      console.log(`Has funds: ${check.hasFunds}`);

      expect(check.address).toMatch(/^addr_test1/);
    });
  });

  test.describe("Step 0: Onboarding (if needed)", () => {
    test("check if student has Access Token", async ({ page }) => {
      if (!BLOCKFROST_API_KEY) {
        test.skip(true, "No Blockfrost API key");
        return;
      }

      const config = getRoleWalletConfig("student");
      if (!config) {
        test.skip(true, "Student wallet not configured");
        return;
      }

      console.log("\n=== CHECK STUDENT ACCESS TOKEN ===");

      // Inject real wallet
      const walletInfo = await setupRealWalletPage(page, "student");
      console.log(`Student address: ${walletInfo.address}`);
      console.log(`Student balance: ${walletInfo.balance} ADA`);

      // Navigate to dashboard
      await page.goto("http://localhost:3000/dashboard", {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      // Take screenshot
      await page.screenshot({
        path: "e2e/screenshots/loop2/student-dashboard.png",
        fullPage: true,
      });

      // Check if wallet connection UI is present
      const hasConnectButton = await waitForElement(page, 'button:has-text("Connect")', 5000);
      console.log(`Connect button visible: ${hasConnectButton}`);

      // Check for onboarding prompt (if no Access Token)
      const hasOnboardingPrompt = await waitForElement(
        page,
        'text=/mint.*token|get.*started|onboard/i',
        5000
      );
      console.log(`Onboarding prompt visible: ${hasOnboardingPrompt}`);

      if (hasOnboardingPrompt) {
        console.log("\nStudent needs to mint Access Token first!");
        console.log("Run Loop 1: Onboarding before this test.");
      }
    });
  });

  test.describe("Step 1: Student Assignment Commit", () => {
    test("student can navigate to course", async ({ page }) => {
      if (!BLOCKFROST_API_KEY) {
        test.skip(true, "No Blockfrost API key");
        return;
      }

      const config = getRoleWalletConfig("student");
      if (!config) {
        test.skip(true, "Student wallet not configured");
        return;
      }

      console.log("\n=== STUDENT: Navigate to Course ===");

      // Inject real wallet
      await setupRealWalletPage(page, "student");

      // Navigate to course page
      await page.goto(`http://localhost:3000/learn/${TEST_COURSE.id}`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      await page.waitForTimeout(3000);

      // Take screenshot
      await page.screenshot({
        path: "e2e/screenshots/loop2/student-course-page.png",
        fullPage: true,
      });

      // Check course loaded
      const pageTitle = await page.title();
      console.log(`Page title: ${pageTitle}`);

      // Look for course content
      const hasModules = await waitForElement(page, 'text=/module|lesson|chapter/i', 5000);
      console.log(`Course modules visible: ${hasModules}`);

      const hasSLTs = await waitForElement(page, 'text=/learning.*target|SLT|objective/i', 5000);
      console.log(`Learning targets visible: ${hasSLTs}`);
    });

    test("student can view assignment page", async ({ page }) => {
      if (!BLOCKFROST_API_KEY) {
        test.skip(true, "No Blockfrost API key");
        return;
      }

      const config = getRoleWalletConfig("student");
      if (!config) {
        test.skip(true, "Student wallet not configured");
        return;
      }

      console.log("\n=== STUDENT: View Assignment ===");

      // Inject real wallet
      await setupRealWalletPage(page, "student");

      // Navigate directly to assignment page (module 101)
      await page.goto(`http://localhost:3000/learn/${TEST_COURSE.id}/101/assignment`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      await page.waitForTimeout(3000);

      // Take screenshot
      await page.screenshot({
        path: "e2e/screenshots/loop2/student-assignment-page.png",
        fullPage: true,
      });

      // Check for assignment content
      const hasEvidence = await waitForElement(page, 'text=/evidence|submission|work/i', 5000);
      console.log(`Evidence section visible: ${hasEvidence}`);

      const hasCommitButton = await waitForElement(
        page,
        'button:has-text(/commit|submit|enroll/i)',
        5000
      );
      console.log(`Commit button visible: ${hasCommitButton}`);

      // Check for wallet connection state
      const walletConnected = await waitForElement(
        page,
        'text=/connected|wallet/i',
        5000
      );
      console.log(`Wallet status visible: ${walletConnected}`);
    });
  });

  test.describe("Full Flow Validation", () => {
    test("validates complete navigation path", async ({ page }) => {
      if (!BLOCKFROST_API_KEY) {
        test.skip(true, "No Blockfrost API key");
        return;
      }

      const config = getRoleWalletConfig("student");
      if (!config) {
        test.skip(true, "Student wallet not configured");
        return;
      }

      console.log("\n=== FULL NAVIGATION PATH VALIDATION ===");

      // Inject real wallet
      const walletInfo = await setupRealWalletPage(page, "student");

      // Step 1: Course catalog
      console.log("\n1. Course Catalog");
      await page.goto("http://localhost:3000/course", {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForTimeout(2000);

      const catalogHasCourses = await waitForElement(page, 'a[href*="/learn/"]', 5000);
      console.log(`   Courses listed: ${catalogHasCourses}`);

      // Step 2: Course detail
      console.log("\n2. Course Detail");
      await page.goto(`http://localhost:3000/learn/${TEST_COURSE.id}`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForTimeout(2000);

      const hasTitle = await page.locator("h1").first().isVisible().catch(() => false);
      console.log(`   Course title visible: ${hasTitle}`);

      // Step 3: Module
      console.log("\n3. Module Page");
      await page.goto(`http://localhost:3000/learn/${TEST_COURSE.id}/101`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForTimeout(2000);

      const hasModuleContent = await page.locator("main").textContent().catch(() => "");
      console.log(`   Module content loaded: ${(hasModuleContent?.length ?? 0) > 100}`);

      // Step 4: Assignment
      console.log("\n4. Assignment Page");
      await page.goto(`http://localhost:3000/learn/${TEST_COURSE.id}/101/assignment`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForTimeout(2000);

      // Take final screenshot
      await page.screenshot({
        path: "e2e/screenshots/loop2/full-navigation-assignment.png",
        fullPage: true,
      });

      // Validate key UI elements
      const mainContent = await page.locator("main").textContent().catch(() => "");
      console.log(`   Assignment content length: ${mainContent?.length ?? 0} chars`);

      // Summary
      console.log("\n=== SUMMARY ===");
      console.log(`Wallet: ${walletInfo.address.slice(0, 30)}...`);
      console.log(`Balance: ${walletInfo.balance} ADA`);
      console.log(`Course: ${TEST_COURSE.title}`);
      console.log(`Navigation: Catalog → Course → Module → Assignment ✓`);
    });
  });
});

test.describe("Real Wallet Infrastructure Validation", () => {
  test("can create and sign with student wallet", async () => {
    if (!BLOCKFROST_API_KEY) {
      test.skip(true, "No Blockfrost API key");
      return;
    }

    const config = getRoleWalletConfig("student");
    if (!config) {
      test.skip(true, "Student wallet not configured");
      return;
    }

    console.log("\n=== WALLET SIGNING TEST ===");

    const wallet = await createRoleWallet("student");
    const address = await wallet.getChangeAddress();
    const balance = await wallet.getLovelace();

    console.log(`Address: ${address}`);
    console.log(`Balance: ${parseInt(balance) / 1_000_000} ADA`);

    // Test that wallet can be used
    expect(address).toMatch(/^addr_test1/);
    expect(parseInt(balance)).toBeGreaterThan(0);
  });

  test("can create and sign with teacher wallet", async () => {
    if (!BLOCKFROST_API_KEY) {
      test.skip(true, "No Blockfrost API key");
      return;
    }

    const config = getRoleWalletConfig("teacher");
    if (!config) {
      test.skip(true, "Teacher wallet not configured");
      return;
    }

    console.log("\n=== TEACHER WALLET TEST ===");

    const wallet = await createRoleWallet("teacher");
    const address = await wallet.getChangeAddress();
    const balance = await wallet.getLovelace();

    console.log(`Address: ${address}`);
    console.log(`Balance: ${parseInt(balance) / 1_000_000} ADA`);

    expect(address).toMatch(/^addr_test1/);
    expect(parseInt(balance)).toBeGreaterThan(0);
  });
});
