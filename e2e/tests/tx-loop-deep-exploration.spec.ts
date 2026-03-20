/**
 * Deep exploration of the student enrollment flow
 * Focus on identifying why courses aren't rendering
 */
import { test, expect } from "@playwright/test";

test.describe("Deep Exploration: Course Catalog Issues", () => {

  test("wait for courses to load and capture any errors", async ({ page }) => {
    // Capture console errors
    const consoleErrors: string[] = [];
    const networkErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    page.on("requestfailed", (request) => {
      networkErrors.push(`${request.url()} - ${request.failure()?.errorText}`);
    });

    // Navigate and wait longer
    await page.goto("/learn", { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(5000); // Extra wait for any async rendering

    await page.screenshot({ path: "screenshots/loop2/deep-01-course-page-loaded.png", fullPage: true });

    // Log findings
    console.log("\n=== CONSOLE ERRORS ===");
    consoleErrors.forEach(e => console.log(`  - ${e}`));

    console.log("\n=== NETWORK ERRORS ===");
    networkErrors.forEach(e => console.log(`  - ${e}`));

    // Check for loading states
    const skeletons = await page.locator('[class*="skeleton"], [class*="Skeleton"]').count();
    console.log(`\n=== UI STATE ===`);
    console.log(`Skeleton loaders visible: ${skeletons}`);

    // Check for error messages
    const errorMessages = await page.locator('text=/error|failed|unable/i').count();
    console.log(`Error messages visible: ${errorMessages}`);

    // Check for empty state
    const emptyState = await page.locator('text=/no courses|empty|nothing/i').count();
    console.log(`Empty state visible: ${emptyState}`);

    // Look for actual course content
    const courseContent = await page.locator('[class*="course"], [data-testid*="course"]').count();
    console.log(`Course-related elements: ${courseContent}`);

    // Check page HTML for debugging
    const pageTitle = await page.title();
    console.log(`Page title: ${pageTitle}`);

    // Look for any cards or list items
    const cards = await page.locator('[class*="card"], [class*="Card"]').count();
    console.log(`Card elements: ${cards}`);

    // Get page content for debugging
    const mainContent = await page.locator("main").textContent().catch(() => "N/A");
    console.log(`\n=== MAIN CONTENT ===`);
    console.log(mainContent?.substring(0, 500));
  });

  test("check if API calls are being made", async ({ page }) => {
    const apiCalls: string[] = [];

    page.on("request", (request) => {
      if (request.url().includes("api") || request.url().includes("andamio")) {
        apiCalls.push(`${request.method()} ${request.url()}`);
      }
    });

    page.on("response", (response) => {
      if (response.url().includes("api") || response.url().includes("andamio")) {
        console.log(`Response: ${response.status()} ${response.url()}`);
      }
    });

    await page.goto("/learn", { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(3000);

    console.log("\n=== API CALLS MADE ===");
    apiCalls.forEach(c => console.log(`  - ${c}`));
  });

  test("explore a public course directly", async ({ page }) => {
    // Try navigating directly to a known public course
    // Course: "Getting Started with Andamio" - course_id: ed1bf7e5917e1b8a59a26eaaaa6011353bff5fac5d8de9e083e3b737
    const courseId = "ed1bf7e5917e1b8a59a26eaaaa6011353bff5fac5d8de9e083e3b737";

    await page.goto(`/learn/${courseId}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);

    await page.screenshot({ path: "screenshots/loop2/deep-02-course-detail-direct.png", fullPage: true });

    console.log("\n=== DIRECT COURSE ACCESS ===");
    const pageUrl = page.url();
    console.log(`URL: ${pageUrl}`);

    // Check what's on the page
    const h1 = await page.locator("h1").textContent().catch(() => "N/A");
    console.log(`H1: ${h1}`);

    const h2s = await page.locator("h2").allTextContents();
    console.log(`H2s: ${h2s.join(", ")}`);

    // Check for enrollment UI
    const buttons = await page.locator("button").allTextContents();
    console.log(`Buttons: ${buttons.filter(b => b.trim()).join(", ")}`);

    // Check for modules
    const moduleContent = await page.locator('[class*="module"], [class*="Module"]').count();
    console.log(`Module elements: ${moduleContent}`);

    // Check for any action items
    const actions = await page.locator('button:visible, a:has-text("Start"), a:has-text("Enroll"), a:has-text("Begin")').count();
    console.log(`Action buttons/links: ${actions}`);
  });
});
