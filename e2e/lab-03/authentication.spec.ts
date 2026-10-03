import { test, expect } from "@playwright/test";
import { resetAuthUsers } from "./helpers/db-helper.js";

test.describe("Lab 03 Authentication & Authorization Browser Suite", () => {
  test.beforeEach(async () => {
    await resetAuthUsers();
  });

  test("unauthenticated visitor is redirected to /login when attempting to access protected routes", async ({
    page,
  }) => {
    // 1. Attempt /my-tickets
    await page.goto("/my-tickets");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('[data-testid="login-screen"]')).toBeVisible();

    // 2. Attempt /staff/queue
    await page.goto("/staff/queue");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('[data-testid="login-screen"]')).toBeVisible();

    // 3. Attempt /admin/users
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('[data-testid="login-screen"]')).toBeVisible();
  });

  test("rejects invalid credentials with an informative error banner", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('[data-testid="login-screen"]')).toBeVisible();

    await page.fill('[data-testid="login-email-input"]', "jennifer.anderson@toktickit.com");
    await page.fill('[data-testid="login-password-input"]', "WrongPassword999!");
    await page.click('[data-testid="login-submit-btn"]');

    const errorBanner = page.locator('[data-testid="login-error-banner"]');
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText(/invalid/i);
    await expect(page).toHaveURL(/\/login/);
  });

  test("blocks inactive user with error message", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('[data-testid="login-screen"]')).toBeVisible();

    // Kyle Reese is inactive in seed data
    await page.fill('[data-testid="login-email-input"]', "kyle.reese@toktickit.com");
    await page.fill('[data-testid="login-password-input"]', "Password123!");
    await page.click('[data-testid="login-submit-btn"]');

    const errorBanner = page.locator('[data-testid="login-error-banner"]');
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText(/invalid email or password/i);
    await expect(page).toHaveURL(/\/login/);
  });

  test("enforces mandatory first-login password change gate and prevents bypass", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page.locator('[data-testid="login-screen"]')).toBeVisible();

    // Sarah Connor has mustChangePassword: true
    await page.fill('[data-testid="login-email-input"]', "sarah.connor@toktickit.com");
    await page.fill('[data-testid="login-password-input"]', "Password123!");
    await page.click('[data-testid="login-submit-btn"]');

    // Must be redirected to /change-password
    await expect(page).toHaveURL(/\/change-password/);
    await expect(page.locator('[data-testid="change-password-screen"]')).toBeVisible();
    await expect(page.locator('[data-testid="change-password-notice"]')).toBeVisible();

    // Attempting to bypass by navigating directly to /my-tickets must be blocked and redirected back
    await page.goto("/my-tickets");
    await expect(page).toHaveURL(/\/change-password/);
    await expect(page.locator('[data-testid="change-password-screen"]')).toBeVisible();

    // Validate password policy: submit button disabled until criteria met
    const submitBtn = page.locator('[data-testid="change-password-submit-btn"]');
    await expect(submitBtn).toBeDisabled();

    await page.fill('[data-testid="current-password-input"]', "Password123!");
    await page.fill('[data-testid="new-password-input"]', "short");
    await page.fill('[data-testid="confirm-password-input"]', "short");
    await expect(submitBtn).toBeDisabled();

    // Enter compliant new password
    const newPass = "NewCompliantPassword123!";
    await page.fill('[data-testid="new-password-input"]', newPass);
    await page.fill('[data-testid="confirm-password-input"]', newPass);
    await expect(submitBtn).toBeEnabled();

    // Submit password change
    await submitBtn.click();

    // Successful change navigates into the application
    await expect(page).toHaveURL(/\/my-tickets/, { timeout: 10000 });
    await expect(page.locator('[data-testid="my-tickets-section"]')).toBeVisible();
  });

  test("valid staff login, role-specific nav separation, session persistence, and logout", async ({
    page,
  }) => {
    await page.goto("/login");

    // Login as IT Staff David Lee
    await page.fill('[data-testid="login-email-input"]', "david.lee@toktickit.com");
    await page.fill('[data-testid="login-password-input"]', "Password123!");
    await page.click('[data-testid="login-submit-btn"]');

    // Land on staff queue
    await expect(page).toHaveURL(/\/staff\/queue/);
    await expect(page.locator('[data-testid="staff-ticket-queue-view"]')).toBeVisible();

    // Role-specific navigation assertions:
    // IT Staff has staff queue nav, but not Requester create-ticket nav
    await expect(page.locator('[data-testid="nav-staff-queue"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-create-ticket"]')).toBeHidden();
    await expect(page.locator('[data-testid="nav-admin-users"]')).toBeHidden();

    // Session persistence through HTTP-only cookie on page reload
    await page.reload();
    await expect(page).toHaveURL(/\/staff\/queue/);
    await expect(page.locator('[data-testid="staff-ticket-queue-view"]')).toBeVisible();

    // Logout flow through UI
    await page.click('[data-testid="header-profile-button"]');
    await expect(page.locator('[data-testid="header-logout-btn"]')).toBeVisible();
    await page.click('[data-testid="header-logout-btn"]');

    // Redirected to login
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('[data-testid="login-screen"]')).toBeVisible();

    // Verify session terminated: accessing protected route redirects to login
    await page.goto("/staff/queue");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('[data-testid="login-screen"]')).toBeVisible();
  });
});
