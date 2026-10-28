import { test, expect } from "@playwright/test";
import { getPrisma, resetAuthUsers } from "../lab-03/helpers/db-helper.js";

test.describe("Lab 04 Issue 25: Actions Taken Flow & Concurrency E2E Suite", () => {
  const prisma = getPrisma();

  test.beforeEach(async () => {
    await resetAuthUsers();
  });

  test.afterAll(async () => {
    // Targeted non-destructive cleanup: remove only test-created action records
    try {
      await prisma.actionTaken.deleteMany({
        where: {
          description: {
            contains: "[E2E-",
          },
        },
      });
    } catch {
      // Ignore cleanup error if DB is busy
    }
  });

  test("1. IT Staff creates an Action Taken and verifies it appears in the timeline", async ({
    page,
  }) => {
    // 1. Log in as active IT Staff David Lee
    await page.goto("/login");
    await page.fill('[data-testid="login-email-input"]', "david.lee@toktickit.com");
    await page.fill('[data-testid="login-password-input"]', "Password123!");
    await page.click('[data-testid="login-submit-btn"]');

    await expect(page).toHaveURL(/\/staff\/queue/);
    await expect(page.locator('[data-testid="staff-ticket-table"]')).toBeVisible();

    // 2. Open active ticket TKT-2026-00014 (assigned to David Lee, IN_PROGRESS)
    const searchInput = page.locator('[data-testid="queue-search-input"]');
    await searchInput.fill("00014");
    const targetRow = page.locator('tbody tr[data-testid^="ticket-row-"]').first();
    await expect(targetRow).toBeVisible();
    await targetRow.click();

    await expect(page).toHaveURL(/\/staff\/tickets\/\d+/);
    await expect(page.locator('[data-testid="staff-ticket-detail-screen"]')).toBeVisible();

    // 3. Open Log Action Modal
    const actionsCard = page.locator('[data-testid="actions-taken-card"]');
    await expect(actionsCard).toBeVisible();

    const logBtn = page.locator('[data-testid="log-action-btn"]');
    await expect(logBtn).toBeVisible();
    await logBtn.click();

    const logModal = page.locator('[data-testid="log-action-modal"]');
    await expect(logModal).toBeVisible();

    // 4. Fill form fields
    const testDesc = "[E2E-ACTION-CREATE] Performed hardware diagnostics and thermal load testing.";
    const testResult = "Thermal throttling threshold stabilized at 72C.";

    await page.selectOption("#log-action-type", "INVESTIGATION");
    await page.fill("#log-time-spent", "35");
    await page.fill("#log-description", testDesc);
    await page.fill("#log-result", testResult);

    // 5. Submit action
    const submitBtn = page.locator('[data-testid="submit-action-btn"]');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Modal should close
    await expect(logModal).not.toBeVisible();

    // 6. Verify action appears in timeline
    const timelineList = page.locator('[data-testid="actions-timeline-list"]');
    await expect(timelineList).toBeVisible();
    await expect(timelineList).toContainText(testDesc);
    await expect(timelineList).toContainText(testResult);
    await expect(timelineList).toContainText("35m");
    await expect(timelineList).toContainText("David Lee");
  });

  test("2. IT Staff edits an existing action and verifies persisted changes across reload", async ({
    page,
  }) => {
    // 1. Log in as David Lee
    await page.goto("/login");
    await page.fill('[data-testid="login-email-input"]', "david.lee@toktickit.com");
    await page.fill('[data-testid="login-password-input"]', "Password123!");
    await page.click('[data-testid="login-submit-btn"]');

    await expect(page).toHaveURL(/\/staff\/queue/);

    // 2. Open TKT-2026-00014
    const searchInput = page.locator('[data-testid="queue-search-input"]');
    await searchInput.fill("00014");
    const targetRow = page.locator('tbody tr[data-testid^="ticket-row-"]').first();
    await expect(targetRow).toBeVisible();
    await targetRow.click();

    await expect(page.locator('[data-testid="staff-ticket-detail-screen"]')).toBeVisible();

    // 3. Click Edit on the first action in timeline
    const editBtn = page.locator('[data-testid="edit-action-btn"]').first();
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    const editModal = page.locator('[data-testid="edit-action-modal"]');
    await expect(editModal).toBeVisible();

    // 4. Update description and result
    const updatedDesc = "[E2E-ACTION-EDIT] Updated diagnostic findings with thermal re-paste results.";
    const updatedResult = "Idle CPU temperature reduced from 65C to 41C.";

    await page.fill("#edit-description", updatedDesc);
    await page.fill("#edit-result", updatedResult);

    const submitEditBtn = page.locator('[data-testid="submit-edit-btn"]');
    await expect(submitEditBtn).toBeEnabled();
    await submitEditBtn.click();

    await expect(editModal).not.toBeVisible();

    // 5. Verify updated text in timeline
    const timelineList = page.locator('[data-testid="actions-timeline-list"]');
    await expect(timelineList).toContainText(updatedDesc);
    await expect(timelineList).toContainText(updatedResult);

    // 6. Reload page and assert persistence
    await page.reload();
    await expect(page.locator('[data-testid="staff-ticket-detail-screen"]')).toBeVisible();
    await expect(timelineList).toContainText(updatedDesc);
    await expect(timelineList).toContainText(updatedResult);
  });

  test("3. Stale expectedUpdatedAt update triggers real backend HTTP 409 and conflict dialog", async ({
    page,
  }) => {
    // 1. Prepare an isolated test action record in DB with known initial state
    const ticket = await prisma.ticket.findUnique({
      where: { ticketNo: "TKT-2026-00014" },
    });
    expect(ticket).not.toBeNull();

    const david = await prisma.user.findUnique({
      where: { email: "david.lee@toktickit.com" },
    });
    expect(david).not.toBeNull();

    const initialText = "[E2E-CONCURRENCY-TEST] Initial baseline action recorded by David Lee";
    const testAction = await prisma.actionTaken.create({
      data: {
        ticketId: ticket!.id,
        performedById: david!.id,
        description: initialText,
        result: "Baseline hardware state recorded.",
        actionType: "INVESTIGATION",
        timeSpentMinutes: 30,
        performedAt: new Date(),
      },
    });

    // 2. Log in as David Lee and navigate to TKT-2026-00014
    await page.goto("/login");
    await page.fill('[data-testid="login-email-input"]', "david.lee@toktickit.com");
    await page.fill('[data-testid="login-password-input"]', "Password123!");
    await page.click('[data-testid="login-submit-btn"]');

    await expect(page).toHaveURL(/\/staff\/queue/);

    // 2. Open active ticket TKT-2026-00014
    await page.goto(`/staff/tickets/${ticket.id}`);
    await expect(page.locator('[data-testid="staff-ticket-detail-screen"]')).toBeVisible();

    // 3. Find our created test action card and click its Edit button
    const testActionItem = page.locator(`[data-testid="action-item-${testAction.id}"]`);
    await expect(testActionItem).toBeVisible();

    const editBtn = testActionItem.locator('[data-testid="edit-action-btn"]');
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // Edit modal is now open; it captured testAction.updatedAt as expectedUpdatedAt
    const editModal = page.locator('[data-testid="edit-action-modal"]');
    await expect(editModal).toBeVisible();

    // 4. Concurrently update this action in the DB (advancing its updatedAt timestamp)
    const concurrentText = "[E2E-CONCURRENCY-TEST] Concurrent modification by Alex Morgan in DB";
    await prisma.actionTaken.update({
      where: { id: testAction.id },
      data: {
        description: concurrentText,
        result: "Updated concurrently via background task.",
        updatedAt: new Date(Date.now() + 2000),
      },
    });

    // 5. David Lee makes changes in the modal and submits with his stale expectedUpdatedAt
    await page.fill("#edit-description", "[E2E-CONCURRENCY-TEST] David's unsaved draft edit");

    // Intercept network call to assert the ACTUAL backend response status is 409
    const putResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes(`/actions/${testAction.id}`) && resp.request().method() === "PUT"
    );

    await page.locator('[data-testid="submit-edit-btn"]').click();

    const putResponse = await putResponsePromise;
    expect(putResponse.status()).toBe(409);

    const responseBody = await putResponse.json();
    expect(responseBody.error?.code).toBe("STALE_ACTION_CONFLICT");

    // 6. Assert Concurrency Conflict Dialog is rendered
    const conflictDialog = page.locator('[data-testid="concurrency-conflict-dialog"]');
    await expect(conflictDialog).toBeVisible();
    await expect(conflictDialog).toContainText(/conflict/i);
    await expect(conflictDialog).toContainText(concurrentText);

    // 7. Click "Reload Latest Version"
    const reloadBtn = conflictDialog.locator('button:has-text("Reload Latest Version")');
    await expect(reloadBtn).toBeVisible();
    await reloadBtn.click();

    // Conflict dialog closes and edit modal receives reloaded server text
    await expect(conflictDialog).not.toBeVisible();
    await expect(editModal).toBeVisible();

    const currentDescValue = await page.inputValue("#edit-description");
    expect(currentDescValue).toBe(concurrentText);

    // Close edit modal
    await editModal.locator('button:has-text("Cancel")').click();
    await expect(editModal).not.toBeVisible();
  });
});
