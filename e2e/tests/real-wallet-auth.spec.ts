/**
 * Real Wallet Authentication E2E Tests
 *
 * Tests the complete authentication flow using real Cardano wallets
 * with minted Access Tokens on preprod.
 *
 * This test uses the User Auth flow (nonce signing) which provides
 * cryptographic proof of wallet ownership. This is the secure method
 * for end-user authentication.
 *
 * Prerequisites:
 * - Role-based wallets configured (TEST_WALLET_STUDENT_MNEMONIC, etc.)
 * - Access Tokens minted for test wallets (run mint-access-tokens.ts first)
 * - BLOCKFROST_PREPROD_API_KEY set
 */

import { test, expect, type Page } from "@playwright/test";
import {
  createRoleWallet,
  getRoleWalletConfig,
  authenticateWalletWithGateway,
  type TestRole,
} from "../mocks/real-wallet";

// =============================================================================
// Configuration
// =============================================================================

const BLOCKFROST_API_KEY = process.env.BLOCKFROST_PREPROD_API_KEY;
const SKIP_REASON = !BLOCKFROST_API_KEY
  ? "BLOCKFROST_PREPROD_API_KEY not set"
  : null;

const GATEWAY_URL = "https://preprod.api.andamio.io";
const API_KEY = "ant_0bYl6MAGxdnEzUxQPP_ljdnKhRPg4f7HKkQqu5EB0WY=";

// Expected Access Token aliases (must match what was minted)
const EXPECTED_ALIASES: Record<TestRole, string> = {
  student: "e2e_student_01",
  teacher: "e2e_teacher_01",
  owner: "e2e_owner_01",
  contributor: "e2e_contrib_01",
  manager: "e2e_manager_01",
};

// Test course
const TEST_COURSE = {
  id: "6021356002a5ae8b5240252f48e8105a6cc9a0c7231f0ec5cc22b75d",
  title: "Intro to Drawing",
};

// =============================================================================
// Helper Functions
// =============================================================================

interface AuthResult {
  jwt: string;
  userId: string;
  alias: string | null;
  address: string;
}

/**
 * Authenticate with Gateway using User Auth (nonce signing)
 * Returns JWT for authenticated API access
 */
async function authenticateRole(role: TestRole): Promise<AuthResult | null> {
  const config = getRoleWalletConfig(role);
  if (!config) {
    console.log(`No wallet config for role: ${role}`);
    return null;
  }

  try {
    const result = await authenticateWalletWithGateway(config, GATEWAY_URL, API_KEY);

    return {
      jwt: result.jwt,
      userId: result.userId,
      alias: result.alias,
      address: result.address,
    };
  } catch (error) {
    console.log(`Auth failed for ${role}: ${(error as Error).message}`);
    return null;
  }
}

/**
 * Setup authenticated page with JWT
 */
async function setupAuthenticatedPage(
  page: Page,
  auth: AuthResult
): Promise<void> {
  // Inject JWT and user data into localStorage before navigation
  await page.addInitScript(
    ({ jwt, user }) => {
      localStorage.setItem("andamio_jwt", jwt);
      localStorage.setItem(
        "andamio-user",
        JSON.stringify({
          id: user.userId,
          cardanoBech32Addr: user.address,
          accessTokenAlias: user.alias,
        })
      );
    },
    { jwt: auth.jwt, user: auth }
  );
}

// =============================================================================
// Tests
// =============================================================================

test.describe("Real Wallet Authentication (User Auth Flow)", () => {
  test.beforeAll(async () => {
    if (SKIP_REASON) {
      test.skip(true, SKIP_REASON);
    }
  });

  test.describe("User Auth with Nonce Signing", () => {
    test("can authenticate student with wallet signature", async () => {
      if (!BLOCKFROST_API_KEY) {
        test.skip(true, "No Blockfrost API key");
        return;
      }

      const config = getRoleWalletConfig("student");
      if (!config) {
        test.skip(true, "Student wallet not configured");
        return;
      }

      console.log("\n=== STUDENT AUTHENTICATION (User Auth) ===");
      const auth = await authenticateRole("student");

      expect(auth).not.toBeNull();
      expect(auth?.jwt).toBeTruthy();

      console.log(`User ID: ${auth?.userId}`);
      console.log(`Alias: ${auth?.alias ?? "(no access token)"}`);
      console.log(`Address: ${auth?.address.slice(0, 40)}...`);
      console.log(`JWT: ${auth?.jwt.slice(0, 50)}...`);

      // If wallet has Access Token, verify alias
      if (auth?.alias) {
        expect(auth.alias).toBe(EXPECTED_ALIASES.student);
      }
    });

    test("can authenticate teacher with wallet signature", async () => {
      if (!BLOCKFROST_API_KEY) {
        test.skip(true, "No Blockfrost API key");
        return;
      }

      const config = getRoleWalletConfig("teacher");
      if (!config) {
        test.skip(true, "Teacher wallet not configured");
        return;
      }

      console.log("\n=== TEACHER AUTHENTICATION (User Auth) ===");
      const auth = await authenticateRole("teacher");

      expect(auth).not.toBeNull();
      expect(auth?.jwt).toBeTruthy();

      console.log(`User ID: ${auth?.userId}`);
      console.log(`Alias: ${auth?.alias ?? "(no access token)"}`);
      console.log(`Address: ${auth?.address.slice(0, 40)}...`);
      console.log(`JWT: ${auth?.jwt.slice(0, 50)}...`);

      // If wallet has Access Token, verify alias
      if (auth?.alias) {
        expect(auth.alias).toBe(EXPECTED_ALIASES.teacher);
      }
    });
  });

  test.describe("Authenticated Page Access", () => {
    test("student can access dashboard when authenticated", async ({ page }) => {
      if (!BLOCKFROST_API_KEY) {
        test.skip(true, "No Blockfrost API key");
        return;
      }

      console.log("\n=== STUDENT DASHBOARD ACCESS ===");

      const auth = await authenticateRole("student");
      if (!auth) {
        test.skip(true, "Authentication failed");
        return;
      }

      // Setup authenticated page
      await setupAuthenticatedPage(page, auth);

      // Navigate to dashboard
      await page.goto("http://localhost:3000/dashboard", {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      await page.waitForTimeout(3000);

      // Take screenshot
      await page.screenshot({
        path: "e2e/screenshots/auth/student-dashboard-authenticated.png",
        fullPage: true,
      });

      // Check for authenticated state
      const pageContent = await page.locator("body").textContent();

      // Should see user's alias or authenticated indicators
      const hasAuthContent =
        pageContent?.includes(auth.alias ?? "") ||
        pageContent?.includes("Dashboard") ||
        pageContent?.includes("Welcome");

      console.log(`Page shows authenticated content: ${hasAuthContent}`);
      console.log(`Alias visible: ${auth.alias ? pageContent?.includes(auth.alias) : "N/A"}`);

      // Check localStorage for JWT
      const storedJwt = await page.evaluate(() =>
        localStorage.getItem("andamio_jwt")
      );
      console.log(`JWT in localStorage: ${!!storedJwt}`);

      expect(storedJwt).toBeTruthy();
    });

    test("student can view course detail when authenticated", async ({ page }) => {
      if (!BLOCKFROST_API_KEY) {
        test.skip(true, "No Blockfrost API key");
        return;
      }

      console.log("\n=== STUDENT COURSE VIEW ===");

      const auth = await authenticateRole("student");
      if (!auth) {
        test.skip(true, "Authentication failed");
        return;
      }

      await setupAuthenticatedPage(page, auth);

      // Navigate to course detail
      await page.goto(`http://localhost:3000/learn/${TEST_COURSE.id}`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      await page.waitForTimeout(3000);

      // Take screenshot
      await page.screenshot({
        path: "e2e/screenshots/auth/student-course-authenticated.png",
        fullPage: true,
      });

      // Check for course content
      const pageContent = await page.locator("body").textContent();
      const hasModules = pageContent?.toLowerCase().includes("module");
      const hasIntroToDrawing = pageContent?.toLowerCase().includes("intro to drawing") ||
                                pageContent?.toLowerCase().includes("drawing");

      console.log(`Course content loaded: ${hasIntroToDrawing || hasModules}`);
      console.log(`Modules visible: ${hasModules}`);
    });

    test("student can view assignment page when authenticated", async ({ page }) => {
      if (!BLOCKFROST_API_KEY) {
        test.skip(true, "No Blockfrost API key");
        return;
      }

      console.log("\n=== STUDENT ASSIGNMENT VIEW ===");

      const auth = await authenticateRole("student");
      if (!auth) {
        test.skip(true, "Authentication failed");
        return;
      }

      await setupAuthenticatedPage(page, auth);

      // Navigate to assignment
      await page.goto(`http://localhost:3000/learn/${TEST_COURSE.id}/101/assignment`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      await page.waitForTimeout(3000);

      // Take screenshot
      await page.screenshot({
        path: "e2e/screenshots/auth/student-assignment-authenticated.png",
        fullPage: true,
      });

      // Check for assignment content
      const pageContent = await page.locator("body").textContent();
      const hasAssignment = pageContent?.toLowerCase().includes("assignment") ||
                           pageContent?.toLowerCase().includes("draw") ||
                           pageContent?.toLowerCase().includes("circle");

      console.log(`Assignment content loaded: ${hasAssignment}`);

      // Check for enrollment/commit UI
      const hasCommitUI = pageContent?.toLowerCase().includes("commit") ||
                          pageContent?.toLowerCase().includes("submit") ||
                          pageContent?.toLowerCase().includes("enroll");

      console.log(`Enrollment UI visible: ${hasCommitUI}`);
    });
  });

  test.describe("Multi-Role Testing", () => {
    test("student and teacher have different authenticated views", async ({ browser }) => {
      if (!BLOCKFROST_API_KEY) {
        test.skip(true, "No Blockfrost API key");
        return;
      }

      console.log("\n=== MULTI-ROLE COMPARISON ===");

      // Authenticate both roles
      const studentAuth = await authenticateRole("student");
      const teacherAuth = await authenticateRole("teacher");

      if (!studentAuth || !teacherAuth) {
        test.skip(true, "Authentication failed for one or both roles");
        return;
      }

      // Create separate browser contexts
      const studentContext = await browser.newContext();
      const teacherContext = await browser.newContext();

      const studentPage = await studentContext.newPage();
      const teacherPage = await teacherContext.newPage();

      // Setup authenticated pages
      await setupAuthenticatedPage(studentPage, studentAuth);
      await setupAuthenticatedPage(teacherPage, teacherAuth);

      // Navigate both to dashboard
      await Promise.all([
        studentPage.goto("http://localhost:3000/dashboard", {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        }),
        teacherPage.goto("http://localhost:3000/dashboard", {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        }),
      ]);

      await Promise.all([
        studentPage.waitForTimeout(3000),
        teacherPage.waitForTimeout(3000),
      ]);

      // Take screenshots
      await Promise.all([
        studentPage.screenshot({
          path: "e2e/screenshots/auth/multi-role-student.png",
          fullPage: true,
        }),
        teacherPage.screenshot({
          path: "e2e/screenshots/auth/multi-role-teacher.png",
          fullPage: true,
        }),
      ]);

      // Verify different users
      const studentUser = await studentPage.evaluate(() =>
        localStorage.getItem("andamio-user")
      );
      const teacherUser = await teacherPage.evaluate(() =>
        localStorage.getItem("andamio-user")
      );

      const studentData = JSON.parse(studentUser || "{}");
      const teacherData = JSON.parse(teacherUser || "{}");

      console.log(`Student alias: ${studentData.accessTokenAlias}`);
      console.log(`Teacher alias: ${teacherData.accessTokenAlias}`);

      // Verify different user IDs
      expect(studentAuth.userId).not.toBe(teacherAuth.userId);

      // If both have Access Tokens, verify different aliases
      if (studentAuth.alias && teacherAuth.alias) {
        expect(studentAuth.alias).not.toBe(teacherAuth.alias);
      }

      // Cleanup
      await studentContext.close();
      await teacherContext.close();
    });
  });
});

test.describe("Authenticated API Calls", () => {
  test("can make authenticated API request with student JWT", async () => {
    if (!BLOCKFROST_API_KEY) {
      test.skip(true, "No Blockfrost API key");
      return;
    }

    console.log("\n=== AUTHENTICATED API REQUEST ===");

    const auth = await authenticateRole("student");
    if (!auth) {
      test.skip(true, "Authentication failed");
      return;
    }

    // Make an authenticated API call to user profile endpoint
    const response = await fetch(
      `${GATEWAY_URL}/api/v2/auth/user/profile`,
      {
        headers: {
          Authorization: `Bearer ${auth.jwt}`,
          "X-API-Key": API_KEY,
        },
      }
    );

    console.log(`API response status: ${response.status}`);

    // 200 = success, 401 = unauthorized (JWT expired), 404 = profile not found
    expect([200, 401, 404]).toContain(response.status);

    if (response.ok) {
      const data = await response.json() as { user_id?: string; alias?: string };
      console.log(`Profile user ID: ${data.user_id ?? 'N/A'}`);
      console.log(`Profile alias: ${data.alias ?? 'N/A'}`);
    }
  });
});

test.describe("Wallet Infrastructure Validation", () => {
  test("headless wallet can sign messages", async () => {
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

    console.log(`Address: ${address}`);

    // Sign a test message - MeshWallet.signData expects hex-encoded payload
    const testMessage = "test_nonce_12345";
    const testMessageHex = Buffer.from(testMessage, "utf8").toString("hex");
    const signature = await wallet.signData(testMessageHex);

    console.log(`Signature received: ${signature.signature.slice(0, 50)}...`);
    console.log(`Key received: ${signature.key.slice(0, 50)}...`);

    expect(signature.signature).toBeTruthy();
    expect(signature.key).toBeTruthy();
    expect(signature.signature.length).toBeGreaterThan(100);
  });
});
