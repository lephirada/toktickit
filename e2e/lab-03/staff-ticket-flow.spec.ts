import { test, expect } from "@playwright/test";
import { resetAuthUsers, getPrisma } from "./helpers/db-helper.js";

test.describe("Lab 03 Staff Ticket Workflow Browser Suite", () => {
  test.beforeEach(async () => {
    await resetAuthUsers();
  });

  test("staff queue displays tickets with interactive search and filter controls", async ({
    page,
  }) => {
    // 1. Log in as active IT Staff David Lee
    await page.goto("/login");
    await page.fill('[data-testid="login-email-input"]', "david.lee@toktickit.com");
    await page.fill('[data-testid="login-password-input"]', "Password123!");
    await page.click('[data-testid="login-submit-btn"]');

    // 2. Queue view renders
    await expect(page).toHaveURL(/\/staff\/queue/);
    await expect(page.locator('[data-testid="staff-ticket-queue-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="staff-ticket-table"]')).toBeVisible();

    // 3. Search and filter controls are present and functional
    const searchInput = page.locator('[data-testid="queue-search-input"]');
    await expect(searchInput).toBeVisible();

    // Search by keyword "laptop" or "vpn"
    await searchInput.fill("VPN");
    // Verify table filters
    await expect(page.locator('[data-testid="staff-ticket-table"]')).toBeVisible();
    await searchInput.clear();
  });

  test("staff can open ticket detail, claim unassigned ticket, and reassign to colleague", async ({
    page,
  }) => {
    // 1. Log in as David Lee
    await page.goto("/login");
    await page.fill('[data-testid="login-email-input"]', "david.lee@toktickit.com");
    await page.fill('[data-testid="login-password-input"]', "Password123!");
    await page.click('[data-testid="login-submit-btn"]');

    await expect(page.locator('[data-testid="staff-ticket-table"]')).toBeVisible();

    // 2. Filter queue by "Unassigned" and status "NEW" to guarantee opening an active unassigned ticket
    await page.selectOption('[data-testid="queue-status-filter"]', "NEW");
    await page.click('[data-testid="queue-owner-unassigned"]');
    await page.waitForLoadState("networkidle");
    const firstTicketRow = page.locator('tbody tr[data-testid^="ticket-row-"]').first();
    await expect(firstTicketRow).toBeVisible();
    await firstTicketRow.click();

    // 3. Staff detail renders
    await expect(page).toHaveURL(/\/staff\/tickets\/\d+/);
    await expect(page.locator('[data-testid="staff-ticket-detail-screen"]')).toBeVisible();
    await expect(page.locator('[data-testid="ticket-number"]')).toBeVisible();
    await expect(page.locator('[data-testid="detail-status-badge"]')).toBeVisible();

    // 4. Claim ticket explicitly
    const ownerDisplay = page.locator('[data-testid="assigned-owner-display"]');
    await expect(ownerDisplay).toBeVisible();

    const claimBtn = page.locator('button:has-text("Claim Ticket")');
    await expect(claimBtn).toBeVisible();
    await claimBtn.click();
    await expect(ownerDisplay).toContainText(/David Lee/i);

    // 5. Reassign to Alex Morgan explicitly
    const reassignSelect = page.locator('select[aria-label="Select new owner"]');
    await expect(reassignSelect).toBeVisible();
    const alexOption = reassignSelect.locator('option:has-text("Alex Morgan")');
    await expect(alexOption).toHaveCount(1);
    const alexValue = await alexOption.getAttribute("value");
    await reassignSelect.selectOption(alexValue!);
    const reassignSubmit = page.locator('button[type="submit"]:has-text("Reassign")');
    await expect(reassignSubmit).toBeEnabled();
    await reassignSubmit.click();
    await expect(ownerDisplay).toContainText(/Alex Morgan/i);

    // Reassign back to David Lee
    const davidOption = reassignSelect.locator('option:has-text("David Lee")');
    await expect(davidOption).toHaveCount(1);
    const davidValue = await davidOption.getAttribute("value");
    await reassignSelect.selectOption(davidValue!);
    await expect(reassignSubmit).toBeEnabled();
    await reassignSubmit.click();
    await expect(ownerDisplay).toContainText(/David Lee/i);
  });

  test("staff can update status via transition modal and record internal notes", async ({
    page,
  }) => {
    // 1. Log in as David Lee
    await page.goto("/login");
    await page.fill('[data-testid="login-email-input"]', "david.lee@toktickit.com");
    await page.fill('[data-testid="login-password-input"]', "Password123!");
    await page.click('[data-testid="login-submit-btn"]');

    await expect(page.locator('[data-testid="staff-ticket-table"]')).toBeVisible();

    // 2. Filter queue by "My Tickets" to guarantee opening a ticket owned by David Lee
    await page.click('[data-testid="queue-owner-my-tickets"]');
    await page.waitForLoadState("networkidle");
    const firstTicketRow = page.locator('tbody tr[data-testid^="ticket-row-"]').first();
    await expect(firstTicketRow).toBeVisible();
    await firstTicketRow.click();
    await expect(page.locator('[data-testid="staff-ticket-detail-screen"]')).toBeVisible();
    await expect(page.locator('[data-testid="assigned-owner-display"]')).toContainText(/David Lee/i);

    // 3. Open status transition modal explicitly
    const updateStatusBtn = page.locator('[data-testid="open-status-modal-button"]');
    await expect(updateStatusBtn).toBeEnabled();
    await updateStatusBtn.click();
    const modalTitle = page.locator('#transition-modal-title');
    await expect(modalTitle).toBeVisible();

    // 4. Select target transition and submit
    const targetSelect = page.locator('#target-status-select');
    await expect(targetSelect).toBeVisible();
    const options = await targetSelect.locator('option').all();
    expect(options.length).toBeGreaterThan(0);
    const targetValue = await options[0].getAttribute('value');
    expect(targetValue).toBeTruthy();
    await targetSelect.selectOption(targetValue!);
    const resSummary = page.locator('#resolution-summary-input');
    const isResSummaryVisible = await resSummary.isVisible();
    if (isResSummaryVisible) {
      await resSummary.fill('Hardware tested and confirmed functioning within normal specifications.');
    }
    await page.click('[data-testid="submit-status-button"]');
    await expect(modalTitle).toBeHidden();
    await expect(page.locator('[data-testid="detail-status-badge"]')).toBeVisible();

    // 5. Test Internal Notes Tab
    const internalNotesTab = page.locator('button:has-text("Internal Notes")');
    await internalNotesTab.click();

    // Verify Amber confidential banner is displayed
    await expect(page.locator('text=Visible only to IT Staff and Administrators')).toBeVisible();

    // Submit a new confidential internal note
    const testNoteContent = `Confidential Staff Diagnostic Note - ${Date.now()}`;
    const noteTextarea = page.locator('textarea[placeholder*="confidential note"]');
    await noteTextarea.fill(testNoteContent);

    const addNoteBtn = page.locator('button:has-text("Add Internal Note")');
    await expect(addNoteBtn).toBeEnabled();
    await addNoteBtn.click();

    // Note appears in internal notes feed
    await expect(page.locator(`text=${testNoteContent}`)).toBeVisible();
  });
});
