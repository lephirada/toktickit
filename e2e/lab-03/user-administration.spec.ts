import { test, expect } from "@playwright/test";
import { resetAuthUsers, getPrisma } from "./helpers/db-helper.js";

test.describe("Lab 03 Administrator User Management Browser Suite", () => {
  test.beforeEach(async () => {
    await resetAuthUsers();
  });

  test("admin user directory displays users with search and role filtering", async ({
    page,
  }) => {
    // 1. Log in as System Admin
    await page.goto("/login");
    await page.fill('[data-testid="login-email-input"]', "admin@toktickit.com");
    await page.fill('[data-testid="login-password-input"]', "Admin123!");
    await page.click('[data-testid="login-submit-btn"]');
    await expect(page.locator('[data-testid="app-header"]')).toBeVisible();

    // 2. Navigate to User Management
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/admin\/users/);
    await expect(page.locator('[data-testid="user-management-container"]')).toBeVisible();
    await expect(page.locator('[data-testid="admin-users-table"]')).toBeVisible();

    // 3. Test Role Filter
    const roleFilter = page.locator('[data-testid="admin-users-role-filter"]');
    await roleFilter.selectOption("IT_STAFF");
    await expect(page.locator('tbody tr')).toHaveCount(4); // 4 IT Staff seeded

    await roleFilter.selectOption("ALL");

    // 4. Test Search
    const searchInput = page.locator('[data-testid="admin-users-search-input"]');
    await searchInput.fill("Sarah");
    await expect(
      page.locator('[data-testid="admin-users-table"]').locator('text=sarah.connor@toktickit.com')
    ).toBeVisible();
    await searchInput.clear();
  });

  test("create user flow and verifies initial password change enforcement contract", async ({
    page,
  }) => {
    // 1. Log in as System Admin
    await page.goto("/login");
    await page.fill('[data-testid="login-email-input"]', "admin@toktickit.com");
    await page.fill('[data-testid="login-password-input"]', "Admin123!");
    await page.click('[data-testid="login-submit-btn"]');
    await expect(page.locator('[data-testid="app-header"]')).toBeVisible();

    await page.goto("/admin/users");
    await expect(page.locator('[data-testid="admin-users-table"]')).toBeVisible();

    // 2. Open Create User Modal
    await page.click('[data-testid="create-user-button"]');
    await expect(page.locator('[data-testid="create-user-modal"]')).toBeVisible();

    // 3. Fill and Submit form
    const uniqueEmail = `e2e_test_${Date.now()}@toktickit.com`;
    await page.fill('[data-testid="create-user-fullname-input"]', "E2E Test Account");
    await page.fill('[data-testid="create-user-email-input"]', uniqueEmail);
    await page.selectOption('[data-testid="create-user-role-select"]', "REQUESTER");
    await page.fill('[data-testid="create-user-password-input"]', "TempPassword123!");
    await page.click('[data-testid="create-user-submit-btn"]');

    // 4. Modal closes and user appears in table
    await expect(page.locator('[data-testid="create-user-modal"]')).toBeHidden();
    await expect(
      page.locator('[data-testid="admin-users-table"]').locator(`text=${uniqueEmail}`)
    ).toBeVisible();

    // 5. Verify database contract: new user has mustChangePassword=true and isActive=true
    const prisma = getPrisma();
    const created = await prisma.user.findUnique({ where: { email: uniqueEmail } });
    expect(created).not.toBeNull();
    expect(created.mustChangePassword).toBe(true);
    expect(created.isActive).toBe(true);
    expect(created.role).toBe("REQUESTER");
  });

  test("edit user flow allows updating profile details", async ({ page }) => {
    // 1. Log in as System Admin
    await page.goto("/login");
    await page.fill('[data-testid="login-email-input"]', "admin@toktickit.com");
    await page.fill('[data-testid="login-password-input"]', "Admin123!");
    await page.click('[data-testid="login-submit-btn"]');
    await expect(page.locator('[data-testid="app-header"]')).toBeVisible();

    await page.goto("/admin/users");
    await expect(page.locator('[data-testid="admin-users-table"]')).toBeVisible();

    // 2. Open edit modal for John Doe
    const johnRow = page.locator('tr:has-text("john.doe@toktickit.com")');
    await expect(johnRow).toBeVisible();
    await johnRow.locator('button[data-testid^="edit-user-btn-"]').click();

    await expect(page.locator('[data-testid="edit-user-modal"]')).toBeVisible();

    // 3. Update full name and save
    const updatedName = "John Doe (Verified)";
    await page.fill('[data-testid="edit-user-fullname-input"]', updatedName);
    await page.click('[data-testid="edit-user-save-btn"]');

    await expect(page.locator('[data-testid="edit-user-modal"]')).toBeHidden();
    await expect(
      page.locator('[data-testid="admin-users-table"]').locator(`text=${updatedName}`)
    ).toBeVisible();
  });

  test("enforces safety guardrails: blocks self-deactivation and demotion of last administrator", async ({
    page,
  }) => {
    // 1. Log in as System Admin
    await page.goto("/login");
    await page.fill('[data-testid="login-email-input"]', "admin@toktickit.com");
    await page.fill('[data-testid="login-password-input"]', "Admin123!");
    await page.click('[data-testid="login-submit-btn"]');
    await expect(page.locator('[data-testid="app-header"]')).toBeVisible();

    await page.goto("/admin/users");
    await expect(page.locator('[data-testid="admin-users-table"]')).toBeVisible();

    // 2. Edit Admin's own account
    const adminRow = page.locator('tr:has-text("admin@toktickit.com")');
    await adminRow.locator('button[data-testid^="edit-user-btn-"]').click();
    await expect(page.locator('[data-testid="edit-user-modal"]')).toBeVisible();

    // 3. Safety Guardrail 1: Self-deactivation warning
    await page.click('[data-testid="edit-user-active-toggle"]');
    const safetyDialog = page.locator('[data-testid="safety-alert-dialog"]');
    await expect(safetyDialog).toBeVisible();
    await expect(page.locator('[data-testid="safety-dialog-message"]')).toContainText(/cannot deactivate/i);
    await page.click('[data-testid="safety-dialog-ok-btn"]');
    await expect(safetyDialog).toBeHidden();

    // Ensure active toggle is checked so demotion check tests role change, not deactivation
    const activeToggle = page.locator('[data-testid="edit-user-active-toggle"]');
    await activeToggle.setChecked(true);

    // 4. Safety Guardrail 2: Last administrator demotion protection
    await page.selectOption('[data-testid="edit-user-role-select"]', "IT_STAFF");
    await page.click('[data-testid="edit-user-save-btn"]');
    await expect(safetyDialog).toBeVisible();
    await expect(page.locator('[data-testid="safety-dialog-message"]')).toContainText(/last active administrator|demoted/i);
    await page.click('[data-testid="safety-dialog-ok-btn"]');
    await expect(safetyDialog).toBeHidden();

    // 5. Cancel and verify state untouched
    await page.click('[data-testid="edit-user-cancel-btn"]');
    await expect(page.locator('[data-testid="edit-user-modal"]')).toBeHidden();

    // Verify Admin remains an active Administrator in the database
    const prisma = getPrisma();
    const admin = await prisma.user.findUnique({ where: { email: "admin@toktickit.com" } });
    expect(admin.role).toBe("ADMINISTRATOR");
    expect(admin.isActive).toBe(true);
  });
});
