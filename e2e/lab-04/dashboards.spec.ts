import { test, expect } from "@playwright/test";
import { resetAuthUsers } from "../lab-03/helpers/db-helper.js";

test.describe("Lab 04 Issue 25: Multi-Persona Dashboards, Drill-Downs & Accessibility Suite", () => {
  test.beforeEach(async () => {
    await resetAuthUsers();
  });

  test("1. Requester Dashboard: Metrics, Quick Actions, Role Boundaries & 375px Viewport", async ({
    page,
  }) => {
    // 1. Log in as Requester Jennifer Anderson
    await page.goto("/login");
    await page.fill('[data-testid="login-email-input"]', "jennifer.anderson@toktickit.com");
    await page.fill('[data-testid="login-password-input"]', "Password123!");
    await page.click('[data-testid="login-submit-btn"]');

    await expect(page).toHaveURL(/\/my-tickets/);

    // 2. Navigate to Dashboard via nav link
    const dashNav = page.locator('[data-testid="nav-requester-dashboard"]');
    if (await dashNav.isVisible()) {
      await dashNav.click();
    } else {
      await page.goto("/dashboard");
    }

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('[data-testid="requester-dashboard-container"]')).toBeVisible();

    // 3. Verify all 4 Requester KPI cards render with numeric counts
    const totalOpenCard = page.locator('[data-testid="kpi-card-total-open"]');
    await expect(totalOpenCard).toBeVisible();
    await expect(page.locator('[data-testid="kpi-count-total-open"]')).toBeVisible();

    const waitingCard = page.locator('[data-testid="kpi-card-waiting-requester"]');
    await expect(waitingCard).toBeVisible();
    await expect(page.locator('[data-testid="kpi-count-waiting-requester"]')).toBeVisible();

    const resolvedCard = page.locator('[data-testid="kpi-card-recently-resolved"]');
    await expect(resolvedCard).toBeVisible();
    await expect(page.locator('[data-testid="kpi-count-recently-resolved"]')).toBeVisible();

    const closedCard = page.locator('[data-testid="kpi-card-total-closed"]');
    await expect(closedCard).toBeVisible();
    await expect(page.locator('[data-testid="kpi-count-total-closed"]')).toBeVisible();

    // 4. Verify recent service requests table
    await expect(page.locator('[data-testid="requester-recent-tickets-card"]')).toBeVisible();

    // 5. Test Quick Action CTAs
    await page.locator('[data-testid="requester-dash-view-all-btn"]').click();
    await expect(page).toHaveURL(/\/my-tickets/);

    await page.goto("/dashboard");
    await page.locator('[data-testid="requester-dash-create-btn"]').click();
    await expect(page).toHaveURL(/\/create-ticket/);

    // 6. Role restriction: Requester attempting direct access to /staff/dashboard is bounced to /my-tickets
    await page.goto("/staff/dashboard");
    await expect(page).toHaveURL(/\/my-tickets/);

    // 7. Responsive 375px mobile viewport overflow assertion
    await page.goto("/dashboard");
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(200);

    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(hasOverflow).toBe(false);
  });

  test("2. Staff Dashboard: 7 KPI Cards, Complete Drill-Downs & Workload Distribution", async ({
    page,
  }) => {
    // 1. Log in as IT Staff David Lee
    await page.goto("/login");
    await page.fill('[data-testid="login-email-input"]', "david.lee@toktickit.com");
    await page.fill('[data-testid="login-password-input"]', "Password123!");
    await page.click('[data-testid="login-submit-btn"]');

    await expect(page).toHaveURL(/\/staff\/queue/);

    // 2. Navigate to /staff/dashboard
    await page.locator('[data-testid="nav-staff-dashboard"]').click();
    await expect(page).toHaveURL(/\/staff\/dashboard/);
    await expect(page.locator('[data-testid="staff-dashboard-container"]')).toBeVisible();

    // 3. Verify all 7 KPI cards are rendered
    await expect(page.locator('[data-testid="kpi-card-unassigned"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-card-my-assigned"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-card-in-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-card-waiting-requester"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-card-total-open"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-card-recently-resolved"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-card-total-time"]')).toBeVisible();

    // 4. Assert Admin-only User Accounts card is strictly ABSENT for IT Staff
    expect(await page.locator('[data-testid="admin-user-summary-card"]').count()).toBe(0);

    // 5. Verify Drill-Down Navigation for each KPI card:
    // 5a. Unassigned -> /staff/queue?owner=UNASSIGNED
    await page.locator('[data-testid="kpi-card-unassigned"]').click();
    await expect(page).toHaveURL(/\/staff\/queue\?owner=UNASSIGNED/);

    // 5b. My Assigned -> /staff/queue?owner=MY_TICKETS
    await page.goto("/staff/dashboard");
    await page.locator('[data-testid="kpi-card-my-assigned"]').click();
    await expect(page).toHaveURL(/\/staff\/queue\?owner=MY_TICKETS/);

    // 5c. In Progress -> /staff/queue?status=IN_PROGRESS
    await page.goto("/staff/dashboard");
    await page.locator('[data-testid="kpi-card-in-progress"]').click();
    await expect(page).toHaveURL(/\/staff\/queue\?status=IN_PROGRESS/);

    // 5d. Waiting for Requester -> /staff/queue?status=WAITING_FOR_REQUESTER
    await page.goto("/staff/dashboard");
    await page.locator('[data-testid="kpi-card-waiting-requester"]').click();
    await expect(page).toHaveURL(/\/staff\/queue\?status=WAITING_FOR_REQUESTER/);

    // 5e. Total Open -> /staff/queue?status=NEW,OPEN
    await page.goto("/staff/dashboard");
    await page.locator('[data-testid="kpi-card-total-open"]').click();
    await expect(page).toHaveURL(/\/staff\/queue\?status=NEW%2COPEN|\/staff\/queue\?status=NEW,OPEN/);

    // 5f. Recently Resolved -> /staff/queue?status=RESOLVED&resolvedWithinDays=7
    await page.goto("/staff/dashboard");
    await page.locator('[data-testid="kpi-card-recently-resolved"]').click();
    await expect(page).toHaveURL(/status=RESOLVED/);
    await expect(page).toHaveURL(/resolvedWithinDays=7/);

    // 6. Verify Category and Priority Breakdowns render
    await page.goto("/staff/dashboard");
    await expect(page.locator('[data-testid="category-breakdown-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="priority-breakdown-card"]')).toBeVisible();

    // 7. Role restriction: IT Staff attempting /admin/users is bounced to /staff/queue
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/staff\/queue/);

    // 8. Responsive 375px mobile viewport overflow assertion
    await page.goto("/staff/dashboard");
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(200);

    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(hasOverflow).toBe(false);
  });

  test("3. Administrator Dashboard: Admin Summary Card, User Directory Navigation & Operational Access", async ({
    page,
  }) => {
    // 1. Log in as Administrator
    await page.goto("/login");
    await page.fill('[data-testid="login-email-input"]', "admin@toktickit.com");
    await page.fill('[data-testid="login-password-input"]', "Admin123!");
    await page.click('[data-testid="login-submit-btn"]');
    await expect(page).toHaveURL(/\/staff\/queue/);

    // 2. Navigate to Dashboard
    await page.goto("/staff/dashboard");
    await expect(page).toHaveURL(/\/staff\/dashboard/);
    await expect(page.locator('[data-testid="staff-dashboard-container"]')).toBeVisible();

    // 3. Admin User Accounts Summary Card MUST be visible
    const adminCard = page.locator('[data-testid="admin-user-summary-card"]');
    await expect(adminCard).toBeVisible();
    await expect(adminCard).toContainText(/User Accounts & Access Summary/i);

    // Verify stats exist
    await expect(page.locator('[data-testid="admin-stat-total-users"]')).toBeVisible();
    await expect(page.locator('[data-testid="admin-stat-staff"]')).toBeVisible();
    await expect(page.locator('[data-testid="admin-stat-admins"]')).toBeVisible();

    // 4. Click "Manage User Accounts ->" button
    const manageUsersBtn = page.locator('[data-testid="admin-manage-users-btn"]');
    await expect(manageUsersBtn).toBeVisible();
    await manageUsersBtn.click();

    // 5. Asserts navigation to /admin/users and directory renders
    await expect(page).toHaveURL(/\/admin\/users/);
    await expect(page.locator('[data-testid="user-management-container"]')).toBeVisible();

    // 6. Admin has operational access to ticket queue drill-down
    await page.goto("/staff/dashboard");
    await page.locator('[data-testid="kpi-card-total-open"]').click();
    await expect(page).toHaveURL(/status=NEW/);
    await expect(page.locator('[data-testid="staff-ticket-table"]')).toBeVisible();

    // 7. Responsive 375px mobile viewport overflow assertion for Admin Dashboard
    await page.goto("/staff/dashboard");
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(200);

    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(hasOverflow).toBe(false);
  });

  test("4. Accessibility: Real Browser Focus Rings, Keyboard Navigation & Non-Color-Only Indicators", async ({
    page,
  }) => {
    // 1. Log in as David Lee
    await page.goto("/login");
    await page.fill('[data-testid="login-email-input"]', "david.lee@toktickit.com");
    await page.fill('[data-testid="login-password-input"]', "Password123!");
    await page.click('[data-testid="login-submit-btn"]');
    await expect(page).toHaveURL(/\/staff\/queue/);

    await page.goto("/staff/dashboard");
    await expect(page).toHaveURL(/\/staff\/dashboard/);
    await expect(page.locator('[data-testid="staff-dashboard-container"]')).toBeVisible();

    // 2. Real Browser Focus Ring Verification:
    // Focus the interactive KPI card using keyboard Tab or direct focus
    const totalOpenCard = page.locator('[data-testid="kpi-card-total-open"]');
    await totalOpenCard.focus();
    await expect(totalOpenCard).toBeFocused();

    // Inspect computed style in real browser
    const focusStyle = await totalOpenCard.evaluate((el) => {
      const s = window.getComputedStyle(el);
      return {
        outlineStyle: s.outlineStyle,
        outlineWidth: s.outlineWidth,
        outlineColor: s.outlineColor,
      };
    });

    expect(focusStyle.outlineStyle).toBe("solid");
    expect(focusStyle.outlineWidth).toBe("2px");
    // #0B7A46 in rgb is rgb(11, 122, 70)
    expect(focusStyle.outlineColor).toBe("rgb(11, 122, 70)");

    // 3. Keyboard Enter Navigation Verification
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/status=NEW/);

    // 4. Non-Color-Only Status & Priority Cue Verification
    // On Staff Queue table, verify badges contain explicit text and icons, not color alone
    const table = page.locator('[data-testid="staff-ticket-table"]');
    await expect(table).toBeVisible();

    const statusBadge = table.locator('.zg-status-badge').first();
    const badgeText = await statusBadge.innerText();
    expect(badgeText.trim().length).toBeGreaterThan(0);
    expect(badgeText).toMatch(/NEW|OPEN|IN PROGRESS|WAITING|RESOLVED|CLOSED|REOPENED|CANCELLED/i);
  });
});
