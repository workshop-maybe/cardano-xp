/**
 * Multi-Role Test Example
 *
 * Demonstrates how to use the multi-role fixture for testing
 * cross-role workflows like the credential earning flow.
 */

import { test, expect } from "../fixtures/multi-role.fixture";

test.describe("Multi-Role: Credential Earning Flow", () => {
  test("student and teacher can complete assignment flow", async ({
    studentPage,
    teacherPage,
    mockLedger,
    getRoleConfig,
  }) => {
    const studentConfig = getRoleConfig("student");
    const teacherConfig = getRoleConfig("teacher");

    // Log initial ledger state
    console.log("\n=== INITIAL LEDGER STATE ===");
    console.log(`Student balance: ${mockLedger.getWalletBalance(studentConfig.address)} lovelace`);
    console.log(`Teacher balance: ${mockLedger.getWalletBalance(teacherConfig.address)} lovelace`);
    console.log(`Student assets: ${JSON.stringify(mockLedger.getWalletAssets(studentConfig.address))}`);

    // Student: Navigate to course catalog
    console.log("\n=== STUDENT: Browsing courses ===");
    await studentPage.goto("/learn", { waitUntil: "domcontentloaded" });
    await studentPage.waitForTimeout(2000);

    const courseCards = await studentPage.locator('a[href*="/learn/"]').count();
    console.log(`Courses visible to student: ${courseCards}`);

    // Teacher: Navigate to dashboard
    console.log("\n=== TEACHER: Checking dashboard ===");
    await teacherPage.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await teacherPage.waitForTimeout(2000);

    const dashboardHeading = await teacherPage.locator("h1").textContent().catch(() => "N/A");
    console.log(`Teacher dashboard heading: ${dashboardHeading}`);

    // Verify different auth states via user data
    // (JWTs may be cleared by app hydration, but andamio-user persists)
    const studentUser = await studentPage.evaluate(() => localStorage.getItem("andamio-user"));
    const teacherUser = await teacherPage.evaluate(() => localStorage.getItem("andamio-user"));

    console.log("\n=== AUTH STATE ===");
    console.log(`Student has user data: ${!!studentUser}`);
    console.log(`Teacher has user data: ${!!teacherUser}`);

    expect(studentUser).toBeTruthy();
    expect(teacherUser).toBeTruthy();
    expect(studentUser).not.toBe(teacherUser);
  });

  test("owner can access studio features", async ({ ownerPage, getRoleConfig }) => {
    const ownerConfig = getRoleConfig("owner");

    console.log("\n=== OWNER: Checking studio access ===");
    console.log(`Owner alias: ${ownerConfig.alias}`);
    console.log(`Owner address: ${ownerConfig.address.substring(0, 30)}...`);

    // Navigate to studio (course creation area)
    await ownerPage.goto("/studio", { waitUntil: "domcontentloaded" });
    await ownerPage.waitForTimeout(2000);

    // Check for owner-specific UI elements
    const studioContent = await ownerPage.locator("main").textContent().catch(() => "") ?? "";
    console.log(`Studio page loaded: ${studioContent.length > 0}`);

    // Verify owner is authenticated with access token
    const userDataRaw = await ownerPage.evaluate(() => localStorage.getItem("andamio-user"));
    const userData = userDataRaw ? JSON.parse(userDataRaw) : null;

    console.log(`Owner has access token alias: ${userData?.accessTokenAlias}`);
    expect(userData?.accessTokenAlias).toBe(ownerConfig.alias);
  });

  test("createRolePage helper creates custom roles", async ({ createRolePage, mockLedger }) => {
    // Create a custom student with specific alias
    const customStudent = await createRolePage("student", {
      alias: "CustomStudent123",
    });

    await customStudent.goto("/", { waitUntil: "domcontentloaded" });
    await customStudent.waitForTimeout(1000);

    const userDataRaw = await customStudent.evaluate(() => localStorage.getItem("andamio-user"));
    const userData = userDataRaw ? JSON.parse(userDataRaw) : null;

    console.log("\n=== CUSTOM ROLE ===");
    console.log(`Custom student alias: ${userData?.alias}`);

    expect(userData?.alias).toBe("CustomStudent123");
  });

  test("switchRole helper changes localStorage state", async ({
    createRolePage,
    switchRole,
    getRoleConfig,
  }) => {
    // Create a page with student role (using createRolePage for isolated context)
    const page = await createRolePage("student");

    // Start as student
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    let userDataRaw = await page.evaluate(() => localStorage.getItem("andamio-user"));
    let userData = userDataRaw ? JSON.parse(userDataRaw) : null;

    console.log("\n=== ROLE SWITCH ===");
    console.log(`Initial role alias: ${userData?.alias}`);
    expect(userData?.alias).toBe(getRoleConfig("student").alias);

    // Switch to teacher - this updates localStorage
    // NOTE: addInitScript persists, so navigation will re-run it and overwrite localStorage.
    // For true role switching between navigations, use createRolePage for each role instead.
    await switchRole(page, "teacher");

    // Check localStorage was updated (before any navigation)
    userDataRaw = await page.evaluate(() => localStorage.getItem("andamio-user"));
    userData = userDataRaw ? JSON.parse(userDataRaw) : null;

    console.log(`After switch alias: ${userData?.alias}`);
    expect(userData?.alias).toBe(getRoleConfig("teacher").alias);

    // Switch to unauthenticated
    await switchRole(page, "unauthenticated");

    const jwt = await page.evaluate(() => localStorage.getItem("andamio_jwt"));
    console.log(`After logout JWT: ${jwt}`);
    expect(jwt).toBeNull();
  });

  test("for persistent role changes, use createRolePage", async ({
    createRolePage,
    getRoleConfig,
  }) => {
    // This demonstrates the recommended approach for multi-role testing:
    // Create separate pages for each role instead of switching mid-test

    console.log("\n=== SEPARATE PAGES FOR ROLES ===");

    // Create student page
    const studentPage = await createRolePage("student");
    await studentPage.goto("/dashboard", { waitUntil: "domcontentloaded" });

    let userData = await studentPage.evaluate(() => {
      const data = localStorage.getItem("andamio-user");
      return data ? JSON.parse(data) : null;
    });
    console.log(`Student page alias: ${userData?.alias}`);
    expect(userData?.alias).toBe(getRoleConfig("student").alias);

    // Create teacher page (separate context, separate auth state)
    const teacherPage = await createRolePage("teacher");
    await teacherPage.goto("/dashboard", { waitUntil: "domcontentloaded" });

    userData = await teacherPage.evaluate(() => {
      const data = localStorage.getItem("andamio-user");
      return data ? JSON.parse(data) : null;
    });
    console.log(`Teacher page alias: ${userData?.alias}`);
    expect(userData?.alias).toBe(getRoleConfig("teacher").alias);

    // Both pages maintain their respective auth states
    // This is the recommended pattern for multi-role E2E testing
  });

  test("mockLedger tracks UTXO state across transactions", async ({
    studentPage,
    mockLedger,
    getRoleConfig,
  }) => {
    const studentConfig = getRoleConfig("student");

    // Navigate student page to trigger any setup
    await studentPage.goto("/", { waitUntil: "domcontentloaded" });

    console.log("\n=== LEDGER OPERATIONS ===");

    // Check initial state (initialized by studentPage fixture)
    const initialBalance = mockLedger.getWalletBalance(studentConfig.address);
    const initialUtxos = mockLedger.getWalletUtxos(studentConfig.address);
    console.log(`Initial balance: ${initialBalance} lovelace`);
    console.log(`Initial UTXO count: ${initialUtxos.length}`);

    // Simulate a transaction (e.g., sending ADA)
    const firstUtxo = initialUtxos[0]!;
    const result = mockLedger.submitTransaction({
      inputs: [
        {
          txHash: firstUtxo.input.txHash,
          outputIndex: firstUtxo.input.outputIndex,
        },
      ],
      outputs: [
        {
          address: studentConfig.address,
          amount: [{ unit: "lovelace", quantity: "40000000000" }], // 40,000 ADA back
        },
        {
          address: "addr_test1_some_other_address",
          amount: [{ unit: "lovelace", quantity: "9800000000" }], // ~9,800 ADA sent
        },
      ],
      fee: "200000000", // 200 ADA fee (for demo)
    });

    console.log(`Transaction submitted: ${result.success}`);
    console.log(`Transaction hash: ${result.txHash}`);

    // Verify state changed
    const newBalance = mockLedger.getWalletBalance(studentConfig.address);
    const newUtxos = mockLedger.getWalletUtxos(studentConfig.address);
    console.log(`New balance: ${newBalance} lovelace`);
    console.log(`New UTXO count: ${newUtxos.length}`);

    expect(result.success).toBe(true);
    // New balance includes: 40B change output + 2M from the access token UTXO (not consumed)
    expect(newBalance).toBe("40002000000");
    expect(mockLedger.getTransactionHistory().length).toBe(1);
  });
});

test.describe("Multi-Role: Error Scenarios", () => {
  test("handles unauthenticated state correctly", async ({ createRolePage }) => {
    const unauthPage = await createRolePage("unauthenticated");

    await unauthPage.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await unauthPage.waitForTimeout(1000);

    const jwt = await unauthPage.evaluate(() => localStorage.getItem("andamio_jwt"));
    expect(jwt).toBeNull();

    console.log("\n=== UNAUTHENTICATED STATE ===");
    console.log(`JWT present: ${!!jwt}`);

    // Should show login prompt or redirect
    const pageContent = await unauthPage.locator("body").textContent() ?? "";
    console.log(`Page has content: ${pageContent.length > 0}`);
  });
});
