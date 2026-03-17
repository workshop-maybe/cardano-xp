/**
 * TX Loop 2: Full Enrollment Path Test
 * Testing: Course Catalog → Course → Module → Assignment → Commit UI
 */
import { test, expect } from "@playwright/test";

const COURSE_WITH_MODULES = {
  id: "6021356002a5ae8b5240252f48e8105a6cc9a0c7231f0ec5cc22b75d",
  title: "Intro to Drawing",
  owner: "Kenny",
  moduleCode: "101"
};

test.describe("Loop 2: Full Enrollment Path", () => {

  test("complete navigation path to assignment page", async ({ page }) => {
    console.log("\n=== FULL ENROLLMENT PATH TEST ===\n");

    // Step 1: Course Catalog
    console.log("Step 1: Navigate to course catalog");
    await page.goto("/learn", { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "screenshots/loop2/path-01-catalog.png", fullPage: true });

    // Find and click the course
    const courseLink = page.locator(`a[href*="${COURSE_WITH_MODULES.id}"]`).first();
    const hasCourseLink = await courseLink.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`Found course link: ${hasCourseLink}`);

    if (!hasCourseLink) {
      // Try clicking by text
      const courseByText = page.locator(`text="${COURSE_WITH_MODULES.title}"`).first();
      const foundByText = await courseByText.isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`Found course by text: ${foundByText}`);
      if (foundByText) await courseByText.click();
    } else {
      await courseLink.click();
    }

    // Step 2: Course Detail Page
    console.log("Step 2: Course detail page");
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "screenshots/loop2/path-02-course-detail.png", fullPage: true });

    const courseTitle = await page.locator("h1").textContent().catch(() => "N/A");
    console.log(`Course page title: ${courseTitle}`);

    // Step 3: Find and click the module
    console.log("Step 3: Find module link");

    // Look for module code 101 or Introduction to Circles
    const moduleLink = page.locator(`a[href*="${COURSE_WITH_MODULES.moduleCode}"], text=/101|Introduction to Circles/i`).first();
    const hasModuleLink = await moduleLink.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`Found module link: ${hasModuleLink}`);

    // Also try accordion trigger or clickable module
    const moduleAccordion = page.locator('[class*="accordion"], [data-state="closed"]').first();
    const hasAccordion = await moduleAccordion.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`Found accordion: ${hasAccordion}`);

    // Try direct navigation to module page
    console.log("Step 3b: Direct navigation to module");
    await page.goto(`/learn/${COURSE_WITH_MODULES.id}/${COURSE_WITH_MODULES.moduleCode}`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "screenshots/loop2/path-03-module.png", fullPage: true });

    const modulePageTitle = await page.locator("h1, h2").first().textContent().catch(() => "N/A");
    console.log(`Module page title: ${modulePageTitle}`);

    // Step 4: Navigate to assignment
    console.log("Step 4: Navigate to assignment page");
    await page.goto(`/learn/${COURSE_WITH_MODULES.id}/${COURSE_WITH_MODULES.moduleCode}/assignment`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "screenshots/loop2/path-04-assignment.png", fullPage: true });

    const assignmentTitle = await page.locator("h1").textContent().catch(() => "N/A");
    console.log(`Assignment page title: ${assignmentTitle}`);

    // Check for Learning Targets
    const learningTargets = await page.locator('text=/Learning Target|SLT|can grab/i').isVisible().catch(() => false);
    console.log(`Learning Targets visible: ${learningTargets}`);

    // Check for the AssignmentCommitment component
    const commitSection = await page.locator('text=/commit|submit|evidence|wallet/i').isVisible().catch(() => false);
    console.log(`Commit section visible: ${commitSection}`);

    // Check for any buttons
    const buttons = await page.locator("button").allTextContents();
    console.log(`Buttons on page: ${buttons.filter(b => b.trim()).join(" | ")}`);

    // Check for wallet connect prompt
    const walletPrompt = await page.locator('text=/connect.*wallet|sign in to/i').isVisible().catch(() => false);
    console.log(`Wallet connect prompt: ${walletPrompt}`);

    // Capture main content
    const mainContent = await page.locator("main").textContent().catch(() => "N/A");
    console.log(`\n=== PAGE CONTENT ===\n${mainContent?.substring(0, 1000)}`);
  });

  test("check AssignmentCommitment component state", async ({ page }) => {
    // Go directly to assignment page
    await page.goto(`/learn/${COURSE_WITH_MODULES.id}/${COURSE_WITH_MODULES.moduleCode}/assignment`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(3000);

    console.log("\n=== ASSIGNMENT COMMITMENT COMPONENT STATE ===\n");

    // Check for specific commitment-related elements
    const commitCard = await page.locator('[class*="card"]').filter({ hasText: /commit|evidence|submit/i }).count();
    console.log(`Commit-related cards: ${commitCard}`);

    // Check for evidence editor
    const evidenceEditor = await page.locator('[class*="editor"], textarea, [contenteditable]').count();
    console.log(`Evidence editors: ${evidenceEditor}`);

    // Check for any alert or info messages
    const alerts = await page.locator('[role="alert"], [class*="alert"]').allTextContents();
    console.log(`Alerts: ${alerts.join(" | ")}`);

    // Check for the specific "Connect wallet" or "Sign in" flow
    const authRequired = await page.locator('text=/sign in|connect wallet|authenticate/i').isVisible().catch(() => false);
    console.log(`Auth required message: ${authRequired}`);

    // Screenshot full page for analysis
    await page.screenshot({ path: "screenshots/loop2/path-05-assignment-detail.png", fullPage: true });
  });
});
