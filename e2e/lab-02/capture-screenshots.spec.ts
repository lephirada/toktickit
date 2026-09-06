import { test, expect } from "@playwright/test";
import { Buffer } from "node:buffer";
import * as path from "node:path";
import * as fs from "node:fs";

const SCREENSHOTS_DIR = path.resolve(process.cwd(), "artifacts/lab-02/screenshots");
const CREATE_DIR = path.join(SCREENSHOTS_DIR, "create-ticket");
const DASHBOARD_DIR = path.join(SCREENSHOTS_DIR, "my-tickets");
const DETAIL_DIR = path.join(SCREENSHOTS_DIR, "ticket-detail");

// Ensure destination directories exist
fs.mkdirSync(CREATE_DIR, { recursive: true });
fs.mkdirSync(DASHBOARD_DIR, { recursive: true });
fs.mkdirSync(DETAIL_DIR, { recursive: true });

test.describe("Lab 2 Report Evidence Capture", () => {
  test.describe.configure({ mode: "serial" });

  test("captures comprehensive visual evidence across all required workflows and viewports", async ({
    page,
  }) => {
    test.setTimeout(120000);
    // -------------------------------------------------------------------------
    // Set standard desktop viewport
    // -------------------------------------------------------------------------
    await page.setViewportSize({ width: 1280, height: 800 });

    // =========================================================================
    // Part A: Create Ticket & Requester Selection
    // =========================================================================

    // A.1: Desktop view of Development Requester Selection screen
    await page.addInitScript(() => {
      localStorage.clear();
    });
    await page.goto("/");
    const selectScreen = page.getByTestId("select-requester-screen");
    await expect(selectScreen).toBeVisible();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(CREATE_DIR, "01-requester-select.png"),
      fullPage: true,
    });

    // Select Sarah Connor (Engineering) and continue
    const requesterSelect = page.getByTestId("requester-dropdown");
    await expect(requesterSelect).toBeVisible();
    await requesterSelect.selectOption({ label: "Sarah Connor (Engineering)" });
    await page.getByTestId("continue-button").click();
    await expect(page.getByTestId("my-tickets-section")).toBeVisible();

    // A.2: Desktop Create Ticket screen with loaded reference data
    const createNavBtn = page.getByRole("link", { name: "+ Create Ticket" });
    await createNavBtn.click();
    await expect(page.getByTestId("create-ticket-section")).toBeVisible();

    // Select Category "Network" so related systems populate
    const categorySelect = page.locator("#category-select");
    await categorySelect.selectOption({ label: "Network" });
    const systemSelect = page.locator("#related-system-select");
    await expect(systemSelect).toBeEnabled();
    const systemOptions = await systemSelect.locator("option").all();
    if (systemOptions.length > 1) {
      await systemSelect.selectOption({ index: 1 });
    }
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(CREATE_DIR, "02-create-form-initial.png"),
      fullPage: true,
    });

    // A.3: Attempt invalid form submit; capture field-level error messages
    const submitBtn = page.locator('button[type="submit"]:has-text("Submit Ticket")');
    await submitBtn.click();
    await expect(page.locator("text=Summary is required.")).toBeVisible();
    await expect(page.locator("text=Description is required.")).toBeVisible();
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(CREATE_DIR, "03-validation-errors.png"),
      fullPage: true,
    });

    // A.4: Select an invalid file or oversized file (>5MB)
    const fileInput = page.locator("#file-upload-input");
    await fileInput.setInputFiles({
      name: "invalid_script.sh",
      mimeType: "text/x-shellscript",
      buffer: Buffer.from("#!/bin/bash\necho 'unsupported'"),
    });
    await expect(
      page.locator("text=Only JPG, PNG, WEBP, and PDF files are allowed.")
    ).toBeVisible();
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(CREATE_DIR, "04-invalid-attachment.png"),
      fullPage: true,
    });

    // A.6: Simulate network failure/mock 500 on submit; capture safe error alert with form values preserved
    const summaryInput = page.locator("#summary-input");
    const uniqueSummary = `VPN Gateway Failure — Automated Test ${Date.now()}`;
    await summaryInput.fill(uniqueSummary);

    // Ensure category is selected
    await categorySelect.selectOption({ label: "Network" });

    const p1Pill = page.locator("button.zg-priority-pill", { hasText: "P1 High" });
    await p1Pill.click();

    const descTextarea = page.locator("#description-textarea");
    const testDesc =
      "AnyConnect VPN client disconnects every 10 minutes when connecting to corporate gateway. Requires urgent triage.";
    await descTextarea.fill(testDesc);

    // Mock 500 on POST /api/tickets
    await page.route("**/api/tickets", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            error: {
              message: "Internal server error: Database cluster unavailable.",
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await submitBtn.click();
    await expect(
      page.locator("text=Internal server error: Database cluster unavailable.")
    ).toBeVisible();
    // Verify values remain in fields
    await expect(summaryInput).toHaveValue(uniqueSummary);
    await expect(descTextarea).toHaveValue(testDesc);
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(CREATE_DIR, "06-api-failure-state.png"),
      fullPage: true,
    });

    // Remove mock
    await page.unroute("**/api/tickets");

    // A.5: Fill valid ticket data, submit, and capture success state / official ticket number
    // Upload valid attachment
    await fileInput.setInputFiles({
      name: "vpn_gateway_error.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64"
      ),
    });
    await expect(page.locator("text=vpn_gateway_error.png")).toBeVisible();

    await submitBtn.click();
    await expect(page.getByTestId("my-tickets-section")).toBeVisible();
    const successBanner = page.getByTestId("success-banner");
    await expect(successBanner).toBeVisible();

    const bannerText = await successBanner.innerText();
    const match = bannerText.match(/TKT-\d{4}-\d{5}/);
    expect(match).not.toBeNull();
    const createdTicketNo = match![0];

    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(CREATE_DIR, "05-create-success.png"),
      fullPage: true,
    });

    // =========================================================================
    // Part B: My Tickets Dashboard
    // =========================================================================

    // B.1: Dashboard showing tickets for Requester A (Sarah Connor)
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(DASHBOARD_DIR, "01-requester-a-tickets.png"),
      fullPage: true,
    });

    // B.2: Switch to Requester B (Jennifer Anderson) showing isolation
    await page.getByTestId("header-profile-button").click();
    await expect(page.getByTestId("select-requester-screen")).toBeVisible();
    await page
      .getByTestId("requester-dropdown")
      .selectOption({ label: "Jennifer Anderson (Engineering)" });
    await page.getByTestId("continue-button").click();
    await expect(page.getByTestId("my-tickets-section")).toBeVisible();
    await expect(page.getByTestId("header-profile-name")).toContainText("Jennifer Anderson");
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(DASHBOARD_DIR, "02-requester-b-isolation.png"),
      fullPage: true,
    });

    // Switch back to Sarah Connor
    await page.getByTestId("header-profile-button").click();
    await expect(page.getByTestId("select-requester-screen")).toBeVisible();
    await page
      .getByTestId("requester-dropdown")
      .selectOption({ label: "Sarah Connor (Engineering)" });
    await page.getByTestId("continue-button").click();
    await expect(page.getByTestId("my-tickets-section")).toBeVisible();
    await expect(page.getByTestId("header-profile-name")).toContainText("Sarah Connor");

    // B.3: Filter / search applied on dashboard table
    const searchInput = page.getByTestId("ticket-search-input");
    await searchInput.fill("VPN");
    await page.getByTestId("priority-filter-select").selectOption({ value: "P1_HIGH" });
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(DASHBOARD_DIR, "03-search-and-filter.png"),
      fullPage: true,
    });

    // B.4: Search for non-existent keyword showing clean "No tickets found" state
    await searchInput.fill("ZZZ_NON_EXISTENT_KEYWORD_QUERY");
    await page.waitForTimeout(600);
    await expect(page.getByTestId("empty-tickets-state")).toBeVisible();
    await page.screenshot({
      path: path.join(DASHBOARD_DIR, "04-no-results-state.png"),
      fullPage: true,
    });

    // Reset filters and search
    await searchInput.fill("");
    await page.getByTestId("priority-filter-select").selectOption({ value: "ALL" });
    await page.waitForTimeout(600);

    // B.5: Bottom pagination controls and per-page selector
    const paginationControls = page.getByTestId("pagination-controls");
    if (await paginationControls.isVisible()) {
      await paginationControls.scrollIntoViewIfNeeded();
    }
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(DASHBOARD_DIR, "05-pagination.png"),
      fullPage: true,
    });

    // =========================================================================
    // Part C: Ticket Detail & Attachments
    // =========================================================================

    // Scroll back to top and click the created ticket
    await page.evaluate(() => window.scrollTo(0, 0));
    const ticketLink = page.locator(`button:has-text('${createdTicketNo}')`).first();
    await expect(ticketLink).toBeVisible();
    await ticketLink.click();

    // C.1: Read-only ticket detail view with metadata and attachment list
    await expect(page.getByTestId("ticket-detail-screen")).toBeVisible();
    await expect(page.getByTestId("ticket-number")).toHaveText(createdTicketNo);
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(DETAIL_DIR, "01-detail-view-readonly.png"),
      fullPage: true,
    });

    const currentTicketUrl = page.url();

    // C.2: State after uploading a new attachment via "+ Add Attachment"
    const addAttachmentInput = page.locator('[data-testid="add-attachment-input"]');
    await addAttachmentInput.setInputFiles({
      name: "system_architecture_diagram.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 sample pdf content %%EOF"),
    });
    await expect(
      page
        .getByTestId("attachment-name")
        .filter({ hasText: "system_architecture_diagram.pdf" })
    ).toBeVisible();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(DETAIL_DIR, "02-add-attachment.png"),
      fullPage: true,
    });

    // C.3: Open AttachmentRemovalModal showing preset reasons
    const removeBtn = page.getByRole("button", { name: /Remove/i }).first();
    await removeBtn.click();
    const removalModal = page.getByTestId("attachment-removal-modal");
    await expect(removalModal).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(DETAIL_DIR, "03-removal-modal.png"),
      fullPage: true,
    });

    // C.4: Ticket detail view showing soft-removed attachment
    const presetRadio = page.locator('input[value="Uploaded incorrect document / file"]');
    await presetRadio.click();
    await page.getByTestId("confirm-remove-btn").click();
    await expect(removalModal).not.toBeVisible();
    await expect(page.getByTestId("removed-badge").first()).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(DETAIL_DIR, "04-removed-attachment-state.png"),
      fullPage: true,
    });

    // C.5: Full activity timeline card showing audit logs
    const timelineCard = page.getByTestId("timeline-card");
    await timelineCard.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(DETAIL_DIR, "05-activity-timeline.png"),
      fullPage: true,
    });

    const ticketPath = new URL(currentTicketUrl).pathname;

    const navigateTo = async (targetPath: string) => {
      await page.evaluate((p) => {
        window.history.pushState({}, "", p);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }, targetPath);
    };

    // C.6: Attempting direct access to another requester's ticket ID showing 403/404 Access Denied screen
    // Switch requester context to Jennifer Anderson while attempting to view Sarah's ticket
    await page.getByTestId("header-profile-button").click();
    await expect(page.getByTestId("select-requester-screen")).toBeVisible();
    await page
      .getByTestId("requester-dropdown")
      .selectOption({ label: "Jennifer Anderson (Engineering)" });
    await page.getByTestId("continue-button").click();
    await expect(page.getByTestId("my-tickets-section")).toBeVisible();

    // Now navigate directly to Sarah's ticket while in Jennifer's context
    await navigateTo(ticketPath);
    await expect(page.getByTestId("ticket-detail-error")).toBeVisible();
    await expect(page.getByTestId("error-heading")).toHaveText(
      "Ticket Not Found or Access Denied"
    );
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(DETAIL_DIR, "06-cross-requester-denied.png"),
      fullPage: true,
    });

    // =========================================================================
    // Part D: Responsive Viewports (Tablet & Mobile)
    // =========================================================================

    // Switch back to Sarah Connor
    await page.getByTestId("header-profile-button").click();
    await expect(page.getByTestId("select-requester-screen")).toBeVisible();
    await page
      .getByTestId("requester-dropdown")
      .selectOption({ label: "Sarah Connor (Engineering)" });
    await page.getByTestId("continue-button").click();
    await expect(page.getByTestId("my-tickets-section")).toBeVisible();

    // --- Tablet Viewport ({ width: 768, height: 1024 }) ---
    await page.setViewportSize({ width: 768, height: 1024 });

    // D.Tablet 1: Create Ticket
    await navigateTo("/create-ticket");
    await expect(page.getByTestId("create-ticket-section")).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(CREATE_DIR, "responsive-tablet.png"),
      fullPage: true,
    });

    // D.Tablet 2: My Tickets Dashboard
    await navigateTo("/my-tickets");
    await expect(page.getByTestId("my-tickets-section")).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(DASHBOARD_DIR, "responsive-tablet.png"),
      fullPage: true,
    });

    // D.Tablet 3: Ticket Detail
    await navigateTo(ticketPath);
    await expect(page.getByTestId("ticket-detail-screen")).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(DETAIL_DIR, "responsive-tablet.png"),
      fullPage: true,
    });

    // --- Mobile Viewport ({ width: 375, height: 667 }) ---
    await page.setViewportSize({ width: 375, height: 667 });

    // D.Mobile 1: Create Ticket
    await navigateTo("/create-ticket");
    await expect(page.getByTestId("create-ticket-section")).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(CREATE_DIR, "responsive-mobile.png"),
      fullPage: true,
    });

    // D.Mobile 2: My Tickets Dashboard (stacked cards view)
    await navigateTo("/my-tickets");
    await expect(page.getByTestId("my-tickets-section")).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(DASHBOARD_DIR, "responsive-mobile.png"),
      fullPage: true,
    });

    // D.Mobile 3: Ticket Detail
    await navigateTo(ticketPath);
    await expect(page.getByTestId("ticket-detail-screen")).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(DETAIL_DIR, "responsive-mobile.png"),
      fullPage: true,
    });
  });
});
