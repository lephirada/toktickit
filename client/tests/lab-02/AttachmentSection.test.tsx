import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import { RequesterProvider } from "../../src/context/RequesterContext.js";
import TicketDetailScreen from "../../src/components/TicketDetailScreen.js";
import AttachmentRemovalModal from "../../src/components/AttachmentRemovalModal.js";

const mockRequesters: api.RequesterUser[] = [
  {
    id: 1,
    email: "sarah.connor@toktickit.com",
    fullName: "Sarah Connor",
    department: "Engineering",
    isActive: true,
  },
];

const mockTicketDetail: api.TicketDetailItem = {
  id: 42,
  ticketNo: "TKT-2026-00042",
  summary: "VPN connection drops every 10 minutes",
  description: "Detailed description for attachments testing.",
  priority: "P1_HIGH",
  status: "NEW",
  requesterId: 1,
  requester: {
    id: 1,
    fullName: "Sarah Connor",
    displayName: "Sarah Connor",
    email: "sarah.connor@toktickit.com",
    department: "Engineering",
  },
  category: { id: 4, name: "Network" },
  relatedSystem: { id: 102, name: "VPN Gateway" },
  attachments: [
    {
      id: 881,
      originalName: "error_screenshot.png",
      mimeType: "image/png",
      sizeBytes: 245890,
      status: "ACTIVE",
      isSoftDeleted: false,
      deletedAt: null,
      deletionReason: null,
      createdAt: "2026-08-22T16:25:00.000Z",
    },
    {
      id: 882,
      originalName: "old_passwords.txt",
      mimeType: "text/plain",
      sizeBytes: 1024,
      status: "REMOVED",
      isSoftDeleted: true,
      deletedAt: "2026-08-22T17:00:00.000Z",
      deletionReason: "Contains sensitive or confidential data",
      createdAt: "2026-08-22T16:25:00.000Z",
    },
  ],
  activityTimeline: [],
  createdAt: "2026-08-22T16:25:00.000Z",
  updatedAt: "2026-08-22T17:00:00.000Z",
};

describe("Section 12 / Issue 9 — Attachment Section & Lifecycle Component Tests (AttachmentSection.test.tsx)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem("toktickit_requester_id", "1");

    vi.spyOn(api, "fetchRequesters").mockResolvedValue(mockRequesters);
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue(mockTicketDetail);
    vi.spyOn(api, "downloadAttachment").mockResolvedValue();
    vi.spyOn(api, "addAttachmentToTicket").mockResolvedValue({
      id: 883,
      originalName: "new_network_log.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1048576,
      status: "ACTIVE",
      isSoftDeleted: false,
      createdAt: new Date().toISOString(),
    });
    vi.spyOn(api, "removeAttachment").mockResolvedValue({
      id: 881,
      originalName: "error_screenshot.png",
      mimeType: "image/png",
      sizeBytes: 245890,
      status: "REMOVED",
      isSoftDeleted: true,
      deletedAt: "2026-08-22T17:15:00.000Z",
      deletionReason: "Uploaded incorrect document / file",
      createdAt: "2026-08-22T16:25:00.000Z",
    });
  });

  function renderWithRequester(ui: React.ReactElement) {
    return render(<RequesterProvider>{ui}</RequesterProvider>);
  }

  it("1. Renders active and soft-removed attachments with correct status styles", async () => {
    renderWithRequester(<TicketDetailScreen ticketId={42} onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("attachments-card")).toBeInTheDocument();
    });

    const activeItem = screen.getByTestId("attachment-item-881");
    expect(activeItem).toHaveTextContent("error_screenshot.png");
    expect(screen.getByTestId("download-btn-881")).toBeInTheDocument();
    expect(screen.getByTestId("remove-btn-881")).toBeInTheDocument();

    const removedItem = screen.getByTestId("attachment-item-882");
    expect(removedItem).toHaveTextContent("old_passwords.txt");
    expect(screen.getByTestId("removed-badge")).toHaveTextContent("Removed");
    expect(screen.getByTestId("removal-reason")).toHaveTextContent(
      "Contains sensitive or confidential data"
    );
    expect(screen.queryByTestId("download-btn-882")).toBeNull();
    expect(screen.queryByTestId("remove-btn-882")).toBeNull();
  });

  it("2. Clicking 'Remove' on active attachment opens AttachmentRemovalModal", async () => {
    renderWithRequester(<TicketDetailScreen ticketId={42} onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("remove-btn-881")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("remove-btn-881"));

    await waitFor(() => {
      expect(screen.getByTestId("attachment-removal-modal")).toBeInTheDocument();
    });

    expect(screen.getByTestId("attachment-filename-label")).toHaveTextContent(
      "error_screenshot.png"
    );
  });

  it("3. Submitting removal modal with preset reason calls removeAttachment API", async () => {
    const user = userEvent.setup();
    renderWithRequester(<TicketDetailScreen ticketId={42} onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("remove-btn-881")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("remove-btn-881"));

    await waitFor(() => {
      expect(screen.getByTestId("attachment-removal-modal")).toBeInTheDocument();
    });

    const presetRadio = screen.getByTestId("preset-reason-uploaded");
    await user.click(presetRadio);

    const confirmBtn = screen.getByTestId("confirm-remove-btn");
    expect(confirmBtn).not.toBeDisabled();
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(api.removeAttachment).toHaveBeenCalledWith(
        881,
        { reason: "Uploaded incorrect document / file" },
        1
      );
    });
  });

  it("4. Custom removal reason requires at least 5 non-whitespace characters", async () => {
    const user = userEvent.setup();
    render(
      <AttachmentRemovalModal
        isOpen={true}
        attachment={{
          id: 881,
          originalName: "error_screenshot.png",
          mimeType: "image/png",
          sizeBytes: 245890,
          status: "ACTIVE",
          isSoftDeleted: false,
          createdAt: "2026-08-22T16:25:00.000Z",
        }}
        requesterId={1}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    const otherRadio = screen.getByTestId("preset-reason-other");
    await user.click(otherRadio);

    const textarea = screen.getByTestId("custom-reason-textarea");
    const confirmBtn = screen.getByTestId("confirm-remove-btn");
    expect(confirmBtn).toBeDisabled();

    await user.type(textarea, "abc");
    expect(confirmBtn).toBeDisabled();

    await user.type(textarea, "def");
    expect(confirmBtn).not.toBeDisabled();
  });

  it("4B. Submitting removal modal with 'Other' and valid customReason calls removeAttachment API", async () => {
    const user = userEvent.setup();
    renderWithRequester(<TicketDetailScreen ticketId={42} onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("remove-btn-881")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("remove-btn-881"));

    await waitFor(() => {
      expect(screen.getByTestId("attachment-removal-modal")).toBeInTheDocument();
    });

    const otherRadio = screen.getByTestId("preset-reason-other");
    await user.click(otherRadio);

    const textarea = screen.getByTestId("custom-reason-textarea");
    await user.type(textarea, "Confidential client credentials exposed in logs");

    const confirmBtn = screen.getByTestId("confirm-remove-btn");
    expect(confirmBtn).not.toBeDisabled();
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(api.removeAttachment).toHaveBeenCalledWith(
        881,
        {
          reason: "Other",
          customReason: "Confidential client credentials exposed in logs",
        },
        1
      );
    });
  });

  it("5. Download active attachment calls downloadAttachment API", async () => {
    renderWithRequester(<TicketDetailScreen ticketId={42} onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("download-btn-881")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("download-btn-881"));

    await waitFor(() => {
      expect(api.downloadAttachment).toHaveBeenCalledWith(
        881,
        "error_screenshot.png",
        1
      );
    });
  });

  it("6. Download of soft-deleted file displays friendly error alert", async () => {
    vi.spyOn(api, "downloadAttachment").mockRejectedValueOnce(
      new api.ApiError("Attachment has been removed", "ATTACHMENT_SOFT_DELETED", undefined, 410)
    );

    renderWithRequester(<TicketDetailScreen ticketId={42} onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("download-btn-881")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("download-btn-881"));

    await waitFor(() => {
      expect(screen.getByTestId("download-error-alert")).toBeInTheDocument();
      expect(screen.getByTestId("download-error-alert")).toHaveTextContent(
        "This attachment has been removed and can no longer be downloaded."
      );
    });
  });

  it("7. '+ Add Attachment' button triggers file upload and calls addAttachmentToTicket API", async () => {
    renderWithRequester(<TicketDetailScreen ticketId={42} onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("add-attachment-button")).toBeInTheDocument();
    });

    const fileInput = screen.getByTestId("add-attachment-input") as HTMLInputElement;
    const testFile = new File(["Network log binary payload"], "new_network_log.pdf", {
      type: "application/pdf",
    });

    fireEvent.change(fileInput, { target: { files: [testFile] } });

    await waitFor(() => {
      expect(api.addAttachmentToTicket).toHaveBeenCalledWith(42, testFile, 1);
    });
  });

  it("8. '+ Add Attachment' button is disabled when ticket reaches 5 active attachments", async () => {
    const fiveActiveTicket: api.TicketDetailItem = {
      ...mockTicketDetail,
      attachments: Array.from({ length: 5 }, (_, i) => ({
        id: 100 + i,
        originalName: `doc_${i + 1}.png`,
        mimeType: "image/png",
        sizeBytes: 50000,
        status: "ACTIVE",
        isSoftDeleted: false,
        createdAt: "2026-08-22T16:25:00.000Z",
      })),
    };

    vi.spyOn(api, "fetchTicketDetail").mockResolvedValueOnce(fiveActiveTicket);

    renderWithRequester(<TicketDetailScreen ticketId={42} onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("max-attachments-badge")).toBeInTheDocument();
    });

    const addBtn = screen.getByTestId("add-attachment-button");
    expect(addBtn).toBeDisabled();
    expect(screen.getByTestId("max-attachments-badge")).toHaveTextContent("5/5 Active (Max limit reached)");
  });
});
