/**
 * TX Loop 2: Earn a Credential - Enrollment Flow Exploration
 * Testing with "Intro to Drawing" course which has modules
 */
import { test, expect } from "@playwright/test";

const COURSE_WITH_MODULES = {
  id: "6021356002a5ae8b5240252f48e8105a6cc9a0c7231f0ec5cc22b75d",
  title: "Intro to Drawing",
  owner: "Kenny",
  module: "Introduction to Circles"
};

test.describe("Loop 2: Student Enrollment Flow", () => {

  test("explore course with modules - unauthenticated", async ({ page }) => {
    await page.goto(`/learn/${COURSE_WITH_MODULES.id}`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(3000);

    await page.screenshot({ path: "screenshots/loop2/enroll-01-course-unauth.png", fullPage: true });

    console.log("\n=== COURSE WITH MODULES (UNAUTHENTICATED) ===");

    const h1 = await page.locator("h1").textContent().catch(() => "N/A");
    console.log(`Course Title: ${h1}`);

    // Check for modules
    const moduleElements = await page.locator('[class*="module"], [data-testid*="module"], [class*="accordion"]').count();
    console.log(`Module elements: ${moduleElements}`);

    // Check for module titles
    const moduleText = await page.locator('text=/Introduction to Circles|Module|101/i').isVisible().catch(() => false);
    console.log(`Module text visible: ${moduleText}`);

    // Check for enrollment CTA
    const enrollCTA = await page.locator('button:has-text("Enroll"), button:has-text("Start"), button:has-text("Connect"), a:has-text("Enroll")').isVisible().catch(() => false);
    console.log(`Enrollment CTA visible: ${enrollCTA}`);

    // Check for wallet connect prompt
    const walletPrompt = await page.locator('text=/connect.*wallet|sign in/i').isVisible().catch(() => false);
    console.log(`Wallet connect prompt: ${walletPrompt}`);

    // Capture all buttons
    const buttons = await page.locator("button").allTextContents();
    console.log(`Buttons: ${buttons.filter(b => b.trim()).join(" | ")}`);

    // Capture main content
    const mainContent = await page.locator("main").textContent().catch(() => "N/A");
    console.log(`\n=== PAGE CONTENT ===\n${mainContent?.substring(0, 800)}`);
  });

  test("explore course module detail", async ({ page }) => {
    // Navigate to course
    await page.goto(`/learn/${COURSE_WITH_MODULES.id}`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);

    // Look for module link/accordion
    const moduleLink = page.locator('a[href*="module"], button:has-text("101"), [data-testid*="module"]').first();
    const hasModuleLink = await moduleLink.isVisible({ timeout: 3000 }).catch(() => false);

    console.log("\n=== MODULE NAVIGATION ===");
    console.log(`Module link found: ${hasModuleLink}`);

    if (hasModuleLink) {
      await moduleLink.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: "screenshots/loop2/enroll-02-module-detail.png", fullPage: true });

      const moduleTitle = await page.locator("h1, h2").first().textContent().catch(() => "N/A");
      console.log(`Module page title: ${moduleTitle}`);
    }

    // Check for assignment/SLT info
    const sltInfo = await page.locator('text=/SLT|learning target|can grab/i').isVisible().catch(() => false);
    console.log(`SLT info visible: ${sltInfo}`);
  });

  test("check what happens when clicking enroll/start", async ({ page }) => {
    await page.goto(`/learn/${COURSE_WITH_MODULES.id}`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);

    // Look for any actionable button
    const actionButton = page.locator('button:has-text("Start"), button:has-text("Enroll"), button:has-text("Begin"), button:has-text("Connect")').first();
    const hasAction = await actionButton.isVisible({ timeout: 3000 }).catch(() => false);

    console.log("\n=== ENROLLMENT ACTION ===");
    console.log(`Action button visible: ${hasAction}`);

    if (hasAction) {
      const buttonText = await actionButton.textContent();
      console.log(`Button text: ${buttonText}`);

      // Click and see what happens
      await actionButton.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: "screenshots/loop2/enroll-03-after-action.png", fullPage: true });

      // Check for modal/dialog
      const modal = await page.locator('[role="dialog"], [class*="modal"], [class*="Modal"]').isVisible().catch(() => false);
      console.log(`Modal appeared: ${modal}`);

      // Check for wallet selector
      const walletSelector = await page.locator('text=/wallet|Eternl|Nami|Lace/i').isVisible().catch(() => false);
      console.log(`Wallet selector: ${walletSelector}`);
    } else {
      console.log("No action button found - checking page state");
      const pageText = await page.locator("main").textContent().catch(() => "");
      console.log(`Page indicates: ${pageText?.includes("modules") ? "has modules" : "no modules"}`);
    }
  });

  test("full course catalog to enrollment attempt flow", async ({ page }) => {
    // Start from course catalog
    await page.goto("/learn", { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);

    console.log("\n=== FULL FLOW: CATALOG → COURSE → ENROLL ===");

    // Find and click "Intro to Drawing"
    const courseCard = page.locator(`a[href*="${COURSE_WITH_MODULES.id}"], text="${COURSE_WITH_MODULES.title}"`).first();
    const foundCourse = await courseCard.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`Found "Intro to Drawing" in catalog: ${foundCourse}`);

    if (foundCourse) {
      await courseCard.click();
      await page.waitForTimeout(3000);

      const url = page.url();
      console.log(`Navigated to: ${url}`);

      await page.screenshot({ path: "screenshots/loop2/enroll-04-full-flow.png", fullPage: true });

      // Document the enrollment path
      const h1 = await page.locator("h1").textContent().catch(() => "N/A");
      console.log(`Course page loaded: ${h1}`);

      // Check enrollment options
      const enrollOptions = await page.locator('button, a').filter({ hasText: /enroll|start|begin|commit/i }).count();
      console.log(`Enrollment-related elements: ${enrollOptions}`);

      // Check for module accordion/list
      const moduleList = await page.locator('[class*="accordion"], [class*="module-list"], ul, ol').count();
      console.log(`List/accordion elements: ${moduleList}`);
    }
  });
});
