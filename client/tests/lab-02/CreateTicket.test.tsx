import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import { AuthProvider, useAuth } from "../../src/context/AuthContext.js";
import CreateTicketForm from "../../src/components/CreateTicketForm.js";
import App from "../../src/App.js";

const mockAuthUser: api.AuthUser = {
  id: 1,
  fullName: "Sarah Connor",
  email: "sarah.connor@toktickit.com",
  role: "REQUESTER",
  mustChangePassword: false,
};

const mockCategories: api.Category[] = [
  { id: 1, name: "Account and Access" },
  { id: 2, name: "Hardware" },
  { id: 4, name: "Network" },
];

const mockHardwareSystems: api.RelatedSystem[] = [
  { id: 101, name: "Corporate Laptop", categoryId: 2 },
];

const mockNetworkSystems: api.RelatedSystem[] = [
  { id: 102, name: "VPN Gateway", categoryId: 4 },
  { id: 103, name: "Campus Wi-Fi", categoryId: 4 },
];

function TestWrapper({
  onSuccess,
  onCancel,
}: {
  onSuccess?: (ticketNo: string) => void;
  onCancel?: () => void;
}) {
  const { isFormDirty } = useAuth();
  return (
    <div>
      <div data-testid="is-dirty-flag">{isFormDirty ? "dirty" : "clean"}</div>
      <CreateTicketForm onSuccess={onSuccess} onCancel={onCancel} />
    </div>
  );
}

describe("Issue 7 — Create Ticket Form Component Tests", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue(mockAuthUser);
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      data: [],
      pagination: {
        page: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    });
    vi.spyOn(api, "fetchCategories").mockResolvedValue(mockCategories);
    vi.spyOn(api, "fetchRelatedSystems").mockImplementation(async (catId) => {
      if (catId === 2) return mockHardwareSystems;
      if (catId === 4) return mockNetworkSystems;
      return [];
    });
  });

  it("1. Dynamic Dropdowns: Selecting a Category filters the Related Systems dropdown options", async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestWrapper />
      </AuthProvider>
    );

    // Wait for categories to load
    await screen.findByRole("option", { name: "Hardware" });

    const categorySelect = screen.getByLabelText(/Category/i);
    const systemSelect = screen.getByLabelText(/Related System/i);

    // Initially system dropdown is disabled
    expect(systemSelect).toBeDisabled();
    expect(screen.getByRole("option", { name: /Select a category first/i })).toBeInTheDocument();

    // Select "Hardware"
    await user.selectOptions(categorySelect, "2");

    // System select becomes enabled and populates Hardware systems
    await waitFor(() => {
      expect(systemSelect).not.toBeDisabled();
    });

    expect(screen.getByRole("option", { name: "Corporate Laptop" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "VPN Gateway" })).not.toBeInTheDocument();

    // Switch to "Network"
    await user.selectOptions(categorySelect, "4");

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "VPN Gateway" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Campus Wi-Fi" })).toBeInTheDocument();
      expect(screen.queryByRole("option", { name: "Corporate Laptop" })).not.toBeInTheDocument();
    });
  });

  it("2. Client Validation: Submitting with empty or short summary / description blocks submission and displays inline errors", async () => {
    const createTicketSpy = vi.spyOn(api, "createTicket");
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestWrapper />
      </AuthProvider>
    );

    await screen.findByRole("option", { name: "Hardware" });

    // Submit with completely blank form
    const submitBtn = screen.getByTestId("submit-ticket-btn");
    await user.click(submitBtn);

    // Verify error messages for empty submission
    expect(await screen.findByText("Summary is required.")).toBeInTheDocument();
    expect(screen.getByText("Description is required.")).toBeInTheDocument();
    expect(screen.getByText("Valid category is required.")).toBeInTheDocument();
    expect(createTicketSpy).not.toHaveBeenCalled();

    // Fill Category, but enter too short summary and description
    const categorySelect = screen.getByLabelText(/Category/i);
    await user.selectOptions(categorySelect, "2");

    const summaryInput = screen.getByLabelText(/Summary/i);
    const descriptionInput = screen.getByLabelText(/Description/i);

    await user.type(summaryInput, "1234"); // 4 chars < 5
    await user.type(descriptionInput, "123456789"); // 9 chars < 10

    await user.click(submitBtn);

    expect(
      screen.getByText("Summary must be at least 5 characters.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Description must be at least 10 characters.")
    ).toBeInTheDocument();
    expect(createTicketSpy).not.toHaveBeenCalled();
  });

  it("3. Pre-upload Attachment: Selecting a file triggers api.uploadAttachments, renders file chip, and marks form dirty", async () => {
    const uploadSpy = vi.spyOn(api, "uploadAttachments").mockResolvedValue({
      data: [
        {
          id: 501,
          originalName: "network_screenshot.png",
          mimeType: "image/png",
          sizeBytes: 2048,
          createdAt: new Date().toISOString(),
        },
      ],
    });

    render(
      <AuthProvider>
        <TestWrapper />
      </AuthProvider>
    );

    await screen.findByRole("option", { name: "Hardware" });

    // Initially form is clean
    expect(screen.getByTestId("is-dirty-flag")).toHaveTextContent("clean");

    const file = new File(["dummy content"], "network_screenshot.png", { type: "image/png" });
    const fileInput = document.getElementById("file-upload-input") as HTMLInputElement;

    await userEvent.upload(fileInput, file);

    // Verify uploadAttachments called
    await waitFor(() => {
      expect(uploadSpy).toHaveBeenCalledWith([file]);
    });

    // Verify attachment chip rendered
    expect(await screen.findByText("network_screenshot.png")).toBeInTheDocument();
    expect(screen.getByText(/2.0 KB/)).toBeInTheDocument();

    // Verify dirty flag set
    expect(screen.getByTestId("is-dirty-flag")).toHaveTextContent("dirty");
  });

  it("3b. Client MIME & Extension Validation: Rejects files with disallowed MIME types or extensions without calling api.uploadAttachments", async () => {
    const uploadSpy = vi.spyOn(api, "uploadAttachments");

    render(
      <AuthProvider>
        <TestWrapper />
      </AuthProvider>
    );

    await screen.findByRole("option", { name: "Hardware" });

    // Try disallowed .exe file
    const invalidFile = new File(["malicious"], "virus.exe", { type: "application/x-msdownload" });
    const fileInput = document.getElementById("file-upload-input") as HTMLInputElement;

    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    // Verify upload blocked
    expect(uploadSpy).not.toHaveBeenCalled();
    expect(
      await screen.findByText("Only JPG, PNG, WEBP, and PDF files are allowed.")
    ).toBeInTheDocument();
  });

  it("4. Successful Creation: Valid form submission calls api.createTicket, clears dirty flag, and redirects", async () => {
    const createTicketSpy = vi.spyOn(api, "createTicket").mockResolvedValue({
      data: {
        id: 42,
        ticketNo: "TKT-2026-00042",
        summary: "Cannot connect to corporate VPN",
        description: "Getting authentication error code 0x80070005 when connecting.",
        priority: "P1_HIGH",
        status: "NEW",
        categoryId: 4,
        relatedSystemId: 102,
        requesterId: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    vi.spyOn(api, "uploadAttachments").mockResolvedValue({
      data: [
        {
          id: 881,
          originalName: "document.pdf",
          mimeType: "application/pdf",
          sizeBytes: 1024,
          createdAt: new Date().toISOString(),
        },
      ],
    });

    const onSuccessMock = vi.fn();
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestWrapper onSuccess={onSuccessMock} />
      </AuthProvider>
    );

    await screen.findByRole("option", { name: "Network" });

    // Fill form
    const categorySelect = screen.getByLabelText(/Category/i);
    await user.selectOptions(categorySelect, "4");

    const systemSelect = screen.getByLabelText(/Related System/i);
    await waitFor(() => {
      expect(screen.getByRole("option", { name: "VPN Gateway" })).toBeInTheDocument();
    });
    await user.selectOptions(systemSelect, "102");

    // Select Priority P1 High
    const p1Pill = screen.getByRole("radio", { name: /P1 High/i });
    await user.click(p1Pill);

    // Fill Summary & Description
    const summaryInput = screen.getByLabelText(/Summary/i);
    const descriptionInput = screen.getByLabelText(/Description/i);
    await user.type(summaryInput, "Cannot connect to corporate VPN");
    await user.type(
      descriptionInput,
      "Getting authentication error code 0x80070005 when connecting."
    );

    // Upload attachment
    const file = new File(["pdf binary"], "document.pdf", { type: "application/pdf" });
    const fileInput = document.getElementById("file-upload-input") as HTMLInputElement;
    await userEvent.upload(fileInput, file);

    await screen.findByText("document.pdf");

    // Form must be dirty
    expect(screen.getByTestId("is-dirty-flag")).toHaveTextContent("dirty");

    // Submit form
    const submitBtn = screen.getByTestId("submit-ticket-btn");
    await user.click(submitBtn);

    // Verify createTicket called with payload
    await waitFor(() => {
      expect(createTicketSpy).toHaveBeenCalledWith({
        categoryId: 4,
        relatedSystemId: 102,
        priority: "P1_HIGH",
        summary: "Cannot connect to corporate VPN",
        description: "Getting authentication error code 0x80070005 when connecting.",
        attachmentIds: [881],
      });
    });

    // Verify success callback and dirty state cleared
    expect(onSuccessMock).toHaveBeenCalledWith("TKT-2026-00042");
    expect(screen.getByTestId("is-dirty-flag")).toHaveTextContent("clean");
  });

  it("5. Server Error Mapping: Displays 422 fieldErrors beneath corresponding form inputs", async () => {
    vi.spyOn(api, "createTicket").mockRejectedValue(
      new api.ApiError("Validation failed", "VALIDATION_FAILED", [
        {
          field: "summary",
          message: "Summary must be between 5 and 100 characters.",
        },
        {
          field: "relatedSystemId",
          message: "Selected system does not belong to the chosen category.",
        },
      ])
    );

    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestWrapper />
      </AuthProvider>
    );

    await screen.findByRole("option", { name: "Hardware" });

    // Fill minimum required fields
    const categorySelect = screen.getByLabelText(/Category/i);
    await user.selectOptions(categorySelect, "2");

    const summaryInput = screen.getByLabelText(/Summary/i);
    const descriptionInput = screen.getByLabelText(/Description/i);
    await user.type(summaryInput, "Valid summary text");
    await user.type(descriptionInput, "Valid description text with enough characters");

    // Submit form
    await user.click(screen.getByTestId("submit-ticket-btn"));

    // Verify server error message mapping
    await screen.findByText("Selected system does not belong to the chosen category.");
    expect(
      screen.getByText("Summary must be between 5 and 100 characters.")
    ).toBeInTheDocument();
  });

  it("6. Centralized Dirty Guard: Intercepts navigation when form is dirty; Cancel retains inputs, Discard resets and navigates", async () => {
    vi.spyOn(api, "fetchCategories").mockResolvedValue(mockCategories);
    vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue(mockNetworkSystems);
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1, hasNext: false, hasPrev: false },
    });

    const user = userEvent.setup();
    render(<App />);

    // Go to Create Ticket
    const createNavBtn = await screen.findByRole("link", { name: /\+ Create Ticket/i });
    await user.click(createNavBtn);

    // Type in Summary
    const summaryInput = await screen.findByLabelText(/Summary/i);
    await user.type(summaryInput, "Unsaved Network Issue");

    // Click My Tickets in navigation
    const myTicketsLink = screen.getByRole("link", { name: /My Tickets/i });
    await user.click(myTicketsLink);

    // Unsaved Changes modal must appear
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Unsaved Changes/i)).toBeInTheDocument();

    // Click Cancel on modal
    await user.click(screen.getByTestId("dirty-cancel-btn"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Form inputs must still be there
    expect(screen.getByLabelText(/Summary/i)).toHaveValue("Unsaved Network Issue");

    // Click My Tickets link again
    await user.click(myTicketsLink);

    // Modal appears again
    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    // Click Discard Changes
    await user.click(screen.getByTestId("dirty-discard-btn"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Screen must have navigated to My Tickets
    expect(await screen.findByTestId("my-tickets-section")).toBeInTheDocument();
  });
});
