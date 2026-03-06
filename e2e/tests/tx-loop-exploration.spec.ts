/**
 * TX Loop Exploration - Loop 2: Earn a Credential
 *
 * This test explores the student enrollment flow to capture current UI state
 * and identify blockers for the transaction loop.
 */
import { test, expect } from "@playwright/test";

test.describe("Loop 2 Exploration: Student Enrollment Flow", () => {

  test("explore course catalog and enrollment UI", async ({ page }) => {
    // Step 1: Navigate to course catalog
    await page.goto("/learn", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "screenshots/loop2/01-course-catalog.png", fullPage: true });

    // Log what we see
    const courseCards = await page.locator('[data-testid="course-card"], [class*="course"], a[href*="/learn/"]').count();
    console.log(`\n=== COURSE CATALOG ===`);
    console.log(`Course cards found: ${courseCards}`);

    // Step 2: Click on first course to view details
    const firstCourse = page.locator('a[href*="/learn/"]').first();
    const courseExists = await firstCourse.isVisible({ timeout: 5000 }).catch(() => false);

    if (courseExists) {
      const courseHref = await firstCourse.getAttribute("href");
      console.log(`First course link: ${courseHref}`);
      await firstCourse.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: "screenshots/loop2/02-course-detail.png", fullPage: true });

      // Check for enroll button
      const enrollButton = page.locator('button:has-text("Enroll"), button:has-text("enroll"), [data-testid*="enroll"]');
      const hasEnrollButton = await enrollButton.isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`\n=== COURSE DETAIL PAGE ===`);
      console.log(`Enroll button visible: ${hasEnrollButton}`);

      // Check for modules
      const modules = await page.locator('[class*="module"], [data-testid*="module"]').count();
      console.log(`Module sections found: ${modules}`);

      // Check for assignments
      const assignments = await page.locator('a[href*="assignment"], button:has-text("Assignment"), [data-testid*="assignment"]').count();
      console.log(`Assignment links found: ${assignments}`);

      // Look for any action buttons
      const actionButtons = await page.locator('button').allTextContents();
      console.log(`Available buttons: ${actionButtons.filter(b => b.trim()).join(", ")}`);

    } else {
      console.log("No course links found in catalog");
    }
  });

  test("explore authenticated course view", async ({ page }) => {
    // Inject mock JWT to simulate authenticated state
    await page.goto("/");
    await page.evaluate(() => {
      const mockJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXIiLCJhbGlhcyI6InRlc3RlciIsImlhdCI6MTcwNjAwMDAwMH0.mock";
      localStorage.setItem("andamio_jwt", mockJwt);
      localStorage.setItem("andamio-user", JSON.stringify({
        address: "addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp",
        alias: "tester"
      }));
    });

    await page.goto("/learn", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "screenshots/loop2/03-course-catalog-auth.png", fullPage: true });

    console.log(`\n=== AUTHENTICATED COURSE VIEW ===`);

    // Click first course
    const firstCourse = page.locator('a[href*="/learn/"]').first();
    if (await firstCourse.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstCourse.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: "screenshots/loop2/04-course-detail-auth.png", fullPage: true });

      // Check for enrollment-related UI
      const enrollUI = page.locator('button:has-text("Enroll"), button:has-text("Start"), button:has-text("Begin"), [data-testid*="enroll"]');
      const hasEnrollUI = await enrollUI.isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`Enrollment UI visible: ${hasEnrollUI}`);

      // Check for "already enrolled" state
      const enrolledBadge = page.locator('text=/enrolled|student|learner/i');
      const isEnrolled = await enrolledBadge.isVisible({ timeout: 2000 }).catch(() => false);
      console.log(`Enrolled badge visible: ${isEnrolled}`);

      // Look for module navigation
      const moduleNav = page.locator('[class*="accordion"], [class*="collapsible"], [data-testid*="module"]');
      const moduleCount = await moduleNav.count();
      console.log(`Module navigation sections: ${moduleCount}`);

      // Check for assignment commit flow
      const commitButton = page.locator('button:has-text("Commit"), button:has-text("Submit"), button:has-text("Start Assignment")');
      const hasCommitUI = await commitButton.isVisible({ timeout: 2000 }).catch(() => false);
      console.log(`Assignment commit UI visible: ${hasCommitUI}`);
    }
  });

  test("explore dashboard for student features", async ({ page }) => {
    // Inject mock JWT
    await page.goto("/");
    await page.evaluate(() => {
      const mockJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXIiLCJhbGlhcyI6InRlc3RlciIsImlhdCI6MTcwNjAwMDAwMH0.mock";
      localStorage.setItem("andamio_jwt", mockJwt);
    });

    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "screenshots/loop2/05-dashboard-student.png", fullPage: true });

    console.log(`\n=== STUDENT DASHBOARD ===`);

    // Look for enrolled courses section
    const enrolledSection = page.locator('text=/enrolled|my courses|learning/i');
    const hasEnrolledSection = await enrolledSection.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`Enrolled courses section visible: ${hasEnrolledSection}`);

    // Look for credentials section
    const credentialsSection = page.locator('text=/credential|certificate|achievement/i');
    const hasCredentials = await credentialsSection.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`Credentials section visible: ${hasCredentials}`);

    // Look for pending assignments
    const pendingAssignments = page.locator('text=/pending|in progress|assignment/i');
    const hasPending = await pendingAssignments.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`Pending assignments visible: ${hasPending}`);

    // Capture all visible headings for structure analysis
    const headings = await page.locator('h1, h2, h3').allTextContents();
    console.log(`Dashboard headings: ${headings.join(" | ")}`);
  });
});
