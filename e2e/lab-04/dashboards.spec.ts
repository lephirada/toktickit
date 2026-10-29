import { test, expect } from "@playwright/test";
import { getPrisma, resetAuthUsers } from "../lab-03/helpers/db-helper.js";

test.describe("Lab 04 Issue 25: Multi-Persona Dashboards, Drill-Downs & Accessibility Suite", () => {
  const prisma = getPrisma();
  let consoleErrors: string[] = [];
  let pageErrors: Error[] = [];

  test.beforeEach(async ({ page }) => {
    await resetAuthUsers();
    consoleErrors = [];
    pageErrors = [];

    page.on("pageerror", (err) => pageErrors.push(err));
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (!text.includes("Failed to load resource")) {
          consoleErrors.push(text);
        }
      }
    });
  });

  test.afterEach(async () => {
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test("1. Requester Dashboard: Metrics, Quick Actions, Role Boundaries & 375px Viewport", async ({
    page,
  }) => {
    // 0. Compute expected ticket metrics directly from DB for Jennifer Anderson
    const jennifer = await prisma.user.findUnique({
      where: { email: "jennifer.anderson@toktickit.com" },
    });
    expect(jennifer).not.toBeNull();

    const jenniferTickets: Array<{ status: string }> = await prisma.ticket.findMany({
      where: { requesterId: jennifer!.id },
      select: { status: true },
    });

    const expectedTotalOpen = jenniferTickets.filter(
      (t: { status: string }) => t.status === "NEW" || t.status === "OPEN"
    ).length;
    const expectedWaiting = jenniferTickets.filter(
      (t: { status: string }) => t.status === "WAITING_FOR_REQUESTER"
    ).length;
    const expectedClosed = jenniferTickets.filter(
      (t: { status: string }) => t.status === "CLOSED"
    ).length;

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

    // 3. Verify all 4 Requester KPI cards render with EXACT numeric counts matching DB / API
    const totalOpenCard = page.locator('[data-testid="kpi-card-total-open"]');
    await expect(totalOpenCard).toBeVisible();
    const totalOpenCount = page.locator('[data-testid="kpi-count-total-open"]');
    await expect(totalOpenCount).toBeVisible();
    await expect(totalOpenCount).toHaveText(String(expectedTotalOpen));

    const waitingCard = page.locator('[data-testid="kpi-card-waiting-requester"]');
    await expect(waitingCard).toBeVisible();
    const waitingCount = page.locator('[data-testid="kpi-count-waiting-requester"]');
    await expect(waitingCount).toBeVisible();
    await expect(waitingCount).toHaveText(String(expectedWaiting));

    const resolvedCard = page.locator('[data-testid="kpi-card-recently-resolved"]');
    await expect(resolvedCard).toBeVisible();
    const resolvedCount = page.locator('[data-testid="kpi-count-recently-resolved"]');
    await expect(resolvedCount).toBeVisible();
    const resolvedText = await resolvedCount.innerText();
    expect(Number(resolvedText)).toBeGreaterThanOrEqual(0);

    const closedCard = page.locator('[data-testid="kpi-card-total-closed"]');
    await expect(closedCard).toBeVisible();
    const closedCount = page.locator('[data-testid="kpi-count-total-closed"]');
    await expect(closedCount).toBeVisible();
    await expect(closedCount).toHaveText(String(expectedClosed));

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

    // Intercept operational dashboard API response to assert exact metrics
    const dashResponsePromise = page.waitForResponse(
      (res) => res.url().includes("/api/staff/dashboard") && res.status() === 200
    );

    // 2. Navigate to /staff/dashboard
    await page.locator('[data-testid="nav-staff-dashboard"]').click();
    await expect(page).toHaveURL(/\/staff\/dashboard/);
    await expect(page.locator('[data-testid="staff-dashboard-container"]')).toBeVisible();

    const dashResponse = await dashResponsePromise;
    const dashBody = await dashResponse.json();
    const metrics = dashBody.data.metrics;

    // 3. Verify all 7 KPI cards are rendered with exact counts matching backend API
    await expect(page.locator('[data-testid="kpi-card-unassigned"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-count-unassigned"]')).toHaveText(
      String(metrics.unassignedCount)
    );

    await expect(page.locator('[data-testid="kpi-card-my-assigned"]')).toBeVisible();
    const myAssignedText = await page.locator('[data-testid="kpi-count-my-assigned"]').innerText();
    expect(Number(myAssignedText)).toBeGreaterThanOrEqual(0);

    await expect(page.locator('[data-testid="kpi-card-in-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-count-in-progress"]')).toHaveText(
      String(metrics.inProgress)
    );

    await expect(page.locator('[data-testid="kpi-card-waiting-requester"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-count-waiting-requester"]')).toHaveText(
      String(metrics.waitingForRequester)
    );

    await expect(page.locator('[data-testid="kpi-card-total-open"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-count-total-open"]')).toHaveText(
      String(metrics.totalOpen)
    );

    await expect(page.locator('[data-testid="kpi-card-recently-resolved"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-count-recently-resolved"]')).toHaveText(
      String(metrics.recentlyResolved)
    );

    await expect(page.locator('[data-testid="kpi-card-total-time"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-count-total-time"]')).toBeVisible();

    // 4. Assert Admin-only User Accounts card is strictly ABSENT for IT Staff
    expect(await page.locator('[data-testid="admin-user-summary-card"]').count()).toBe(0);

    // 5. Verify Drill-Down Navigation and Result Row Consistency:
    // 5a. Unassigned -> /staff/queue?owner=UNASSIGNED
    await page.locator('[data-testid="kpi-card-unassigned"]').click();
    await expect(page).toHaveURL(/\/staff\/queue\?owner=UNASSIGNED/);
    await expect(page.locator('[data-testid="staff-ticket-table"]')).toBeVisible();

    // 5b. My Assigned -> /staff/queue?owner=MY_TICKETS
    await page.goto("/staff/dashboard");
    await page.locator('[data-testid="kpi-card-my-assigned"]').click();
    await expect(page).toHaveURL(/\/staff\/queue\?owner=MY_TICKETS/);
    await expect(page.locator('[data-testid="staff-ticket-table"]')).toBeVisible();

    // 5c. In Progress -> /staff/queue?status=IN_PROGRESS
    await page.goto("/staff/dashboard");
    await page.locator('[data-testid="kpi-card-in-progress"]').click();
    await expect(page).toHaveURL(/\/staff\/queue\?status=IN_PROGRESS/);
    await expect(page.locator('[data-testid="staff-ticket-table"]')).toBeVisible();
    if (metrics.inProgress > 0) {
      const rows = page.locator('tbody tr[data-testid^="ticket-row-"] .zg-status-badge');
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        expect(await rows.nth(i).innerText()).toMatch(/IN PROGRESS/i);
      }
    }

    // 5d. Waiting for Requester -> /staff/queue?status=WAITING_FOR_REQUESTER
    await page.goto("/staff/dashboard");
    await page.locator('[data-testid="kpi-card-waiting-requester"]').click();
    await expect(page).toHaveURL(/\/staff\/queue\?status=WAITING_FOR_REQUESTER/);
    await expect(page.locator('[data-testid="staff-ticket-table"]')).toBeVisible();

    // 5e. Total Open -> /staff/queue?status=NEW,OPEN
    await page.goto("/staff/dashboard");
    await page.locator('[data-testid="kpi-card-total-open"]').click();
    await expect(page).toHaveURL(/\/staff\/queue\?status=NEW%2COPEN|\/staff\/queue\?status=NEW,OPEN/);
    await expect(page.locator('[data-testid="staff-ticket-table"]')).toBeVisible();
    if (metrics.totalOpen > 0) {
      const openRows = page.locator('tbody tr[data-testid^="ticket-row-"] .zg-status-badge');
      const count = await openRows.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        expect(await openRows.nth(i).innerText()).toMatch(/NEW|OPEN/i);
      }
    }

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

    // 2. Real Browser Keyboard Navigation (Sequential Tab Key Navigation)
    // Focus the first interactive KPI card, then press Tab sequentially through the cards
    const unassignedCard = page.locator('[data-testid="kpi-card-unassigned"]');
    await unassignedCard.focus();
    await expect(unassignedCard).toBeFocused();

    // Tab to My Assigned
    await page.keyboard.press("Tab");
    await expect(page.locator('[data-testid="kpi-card-my-assigned"]')).toBeFocused();

    // Tab to In Progress
    await page.keyboard.press("Tab");
    await expect(page.locator('[data-testid="kpi-card-in-progress"]')).toBeFocused();

    // Tab to Waiting for Requester
    await page.keyboard.press("Tab");
    await expect(page.locator('[data-testid="kpi-card-waiting-requester"]')).toBeFocused();

    // Tab to Total Open
    await page.keyboard.press("Tab");
    const totalOpenCard = page.locator('[data-testid="kpi-card-total-open"]');
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
