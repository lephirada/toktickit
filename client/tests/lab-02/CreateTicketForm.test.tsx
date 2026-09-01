import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import { RequesterProvider, useRequester } from "../../src/context/RequesterContext.js";
import CreateTicketForm from "../../src/components/CreateTicketForm.js";

const mockRequesters: api.RequesterUser[] = [
  {
    id: 1,
    fullName: "Sarah Connor",
    email: "sarah.connor@toktickit.com",
    department: "Engineering",
    isActive: true,
  },
];

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
  const { isFormDirty } = useRequester();
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
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchRequesters").mockResolvedValue(mockRequesters);
    vi.spyOn(api, "fetchTickets").mockResolvedValue([]);
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
      <RequesterProvider>
        <TestWrapper />
      </RequesterProvider>
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
      expect(screen.getByRole("option", { name: "Corporate Laptop" })).toBeInTheDocument();
    });

    // Select "Network"
    await user.selectOptions(categorySelect, "4");

    // System select updates to Network systems
    await waitFor(() => {
      expect(screen.queryByRole("option", { name: "Corporate Laptop" })).not.toBeInTheDocument();
      expect(screen.getByRole("option", { name: "VPN Gateway" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Campus Wi-Fi" })).toBeInTheDocument();
    });
  });

  it("2. Client Validation: Submitting with empty or short summary / description blocks submission and displays inline errors", async () => {
    const createTicketSpy = vi.spyOn(api, "createTicket");
    const user = userEvent.setup();

    render(
      <RequesterProvider>
        <TestWrapper />
      </RequesterProvider>
    );

    await screen.findByRole("option", { name: "Hardware" });

    // Click submit immediately on empty form
    const submitBtn = screen.getByTestId("submit-ticket-btn");
    await user.click(submitBtn);

    // Verify error messages
    expect(
      screen.getByText("Summary must be between 5 and 100 characters.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Description must be between 10 and 2000 characters.")
    ).toBeInTheDocument();
    expect(screen.getByText("Valid category is required.")).toBeInTheDocument();
    expect(createTicketSpy).not.toHaveBeenCalled();

    // Type short values
    const summaryInput = screen.getByLabelText(/Summary/i);
    const descriptionInput = screen.getByLabelText(/Description/i);

    await user.type(summaryInput, "VPN");
    await user.type(descriptionInput, "Too short");
    await user.click(submitBtn);

    expect(
      screen.getByText("Summary must be between 5 and 100 characters.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Description must be between 10 and 2000 characters.")
    ).toBeInTheDocument();
    expect(createTicketSpy).not.toHaveBeenCalled();
  });

  it("3. Pre-upload Attachment: Selecting a file triggers api.uploadAttachments, renders file chip, and marks form dirty", async () => {
    const uploadSpy = vi.spyOn(api, "uploadAttachments").mockResolvedValue({
      data: [
        {
          id: 881,
          originalName: "error_screen.png",
          mimeType: "image/png",
          sizeBytes: 245890,
          createdAt: new Date().toISOString(),
        },
      ],
    });

    render(
      <RequesterProvider>
        <TestWrapper />
      </RequesterProvider>
    );

    await screen.findByRole("option", { name: "Hardware" });

    const file = new File(["fake content"], "error_screen.png", { type: "image/png" });
    const fileInput = document.getElementById("file-upload-input") as HTMLInputElement;

    // Trigger file upload
    await userEvent.upload(fileInput, file);

    // Verify upload function called with active requester ID (1)
    await waitFor(() => {
      expect(uploadSpy).toHaveBeenCalledWith([file], 1);
    });

    // Verify attachment chip rendered
    await screen.findByText("error_screen.png");
    expect(screen.getByTestId("attachment-chip-881")).toBeInTheDocument();
    expect(screen.getByTestId("is-dirty-flag")).toHaveTextContent("dirty");

    // Click remove button
    const removeBtn = screen.getByRole("button", { name: /Remove error_screen.png/i });
    await userEvent.click(removeBtn);

    expect(screen.queryByTestId("attachment-chip-881")).not.toBeInTheDocument();
  });

  it("4. Successful Creation: Valid form submission calls api.createTicket with X-Requester-Id, clears dirty flag, and redirects", async () => {
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
          originalName: "log.txt",
          mimeType: "text/plain",
          sizeBytes: 1024,
          createdAt: new Date().toISOString(),
        },
      ],
    });

    const onSuccessMock = vi.fn();
    const user = userEvent.setup();

    render(
      <RequesterProvider>
        <TestWrapper onSuccess={onSuccessMock} />
      </RequesterProvider>
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
    const file = new File(["log text"], "log.txt", { type: "text/plain" });
    const fileInput = document.getElementById("file-upload-input") as HTMLInputElement;
    await userEvent.upload(fileInput, file);

    await screen.findByText("log.txt");

    // Form must be dirty
    expect(screen.getByTestId("is-dirty-flag")).toHaveTextContent("dirty");

    // Submit form
    const submitBtn = screen.getByTestId("submit-ticket-btn");
    await user.click(submitBtn);

    // Verify createTicket called with payload
    await waitFor(() => {
      expect(createTicketSpy).toHaveBeenCalledWith(
        {
          categoryId: 4,
          relatedSystemId: 102,
          priority: "P1_HIGH",
          summary: "Cannot connect to corporate VPN",
          description: "Getting authentication error code 0x80070005 when connecting.",
          attachmentIds: [881],
        },
        1
      );
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
      <RequesterProvider>
        <TestWrapper />
      </RequesterProvider>
    );

    await screen.findByRole("option", { name: "Network" });

    // Fill valid category, summary, description
    await user.selectOptions(screen.getByLabelText(/Category/i), "4");
    await user.type(screen.getByLabelText(/Summary/i), "Valid Summary VPN");
    await user.type(screen.getByLabelText(/Description/i), "Valid Description for testing 422.");

    // Submit form
    await user.click(screen.getByTestId("submit-ticket-btn"));

    // Verify server error message mapping
    await screen.findByText("Selected system does not belong to the chosen category.");
    expect(
      screen.getByText("Summary must be between 5 and 100 characters.")
    ).toBeInTheDocument();
  });
});
