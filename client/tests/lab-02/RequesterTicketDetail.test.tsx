import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import * as api from "../../src/api.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import TicketDetailScreen from "../../src/components/TicketDetailScreen.js";
import App from "../../src/App.js";

const mockAuthUser: api.AuthUser = {
  id: 1,
  fullName: "Sarah Connor",
  email: "sarah.connor@toktickit.com",
  role: "REQUESTER",
  mustChangePassword: false,
};

const mockTicketDetail: api.TicketDetailItem = {
  id: 42,
  ticketNo: "TKT-2026-00042",
  summary: "VPN connection drops every 10 minutes",
  description: "Whenever I connect to the corporate Cisco AnyConnect VPN, gateway drops connection.",
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
  category: {
    id: 4,
    name: "Network",
  },
  relatedSystem: {
    id: 102,
    name: "VPN Gateway",
  },
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
  ],
  activityTimeline: [
    {
      id: "ev-1",
      type: "TICKET_CREATED",
      action: "Ticket created",
      message: "Ticket TKT-2026-00042 created with status NEW.",
      timestamp: "2026-08-22T16:25:00.000Z",
      actor: "Sarah Connor",
    },
    {
      id: "ev-2",
      type: "ATTACHMENT_ADDED",
      action: "Attachment uploaded",
      message: "Attachment error_screenshot.png uploaded.",
      timestamp: "2026-08-22T16:25:00.000Z",
      actor: "Sarah Connor",
    },
  ],
  createdAt: "2026-08-22T16:25:00.000Z",
  updatedAt: "2026-08-22T17:00:00.000Z",
};

describe("Section 12 / Issue 9 — Requester Ticket Detail Component Tests (RequesterTicketDetail.test.tsx)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue(mockAuthUser);
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue(mockTicketDetail);
    vi.spyOn(api, "fetchPublicComments").mockResolvedValue({ data: [] });
    vi.spyOn(api, "fetchCategories").mockResolvedValue([{ id: 4, name: "Network" }]);
  });

  function renderWithAuth(ui: React.ReactElement) {
    return render(<AuthProvider>{ui}</AuthProvider>);
  }

  it("1. Renders ticket details, metadata badges, description, and timeline accurately", async () => {
    const onNavigate = vi.fn();
    renderWithAuth(<TicketDetailScreen ticketId={42} onNavigate={onNavigate} />);

    await waitFor(() => {
      expect(screen.getByTestId("ticket-number")).toHaveTextContent("TKT-2026-00042");
    });

    expect(screen.getByTestId("ticket-summary")).toHaveTextContent(
      "VPN connection drops every 10 minutes"
    );
    expect(screen.getByTestId("detail-status-badge")).toHaveTextContent("NEW");
    expect(screen.getByTestId("detail-priority-badge")).toHaveTextContent("P1 High");

    expect(screen.getByTestId("ticket-category")).toHaveTextContent("Network");
    expect(screen.getByTestId("ticket-system")).toHaveTextContent("VPN Gateway");
    expect(screen.getByTestId("ticket-requester-name")).toHaveTextContent("Sarah Connor");

    expect(screen.getByTestId("ticket-description")).toHaveTextContent(
      "Whenever I connect to the corporate Cisco AnyConnect VPN, gateway drops connection."
    );

    const timeline = screen.getByTestId("activity-timeline");
    expect(timeline).toBeInTheDocument();
    expect(timeline).toHaveTextContent("Ticket TKT-2026-00042 created with status NEW.");
    expect(timeline).toHaveTextContent("Attachment error_screenshot.png uploaded.");
  });

  it("2. Handles 404 / 403 errors cleanly and renders friendly error state", async () => {
    vi.spyOn(api, "fetchTicketDetail").mockRejectedValueOnce(
      new api.ApiError(
        "You are not authorized to view or access this ticket.",
        "FORBIDDEN_RESOURCE",
        undefined,
        403
      )
    );

    const onNavigate = vi.fn();
    renderWithAuth(<TicketDetailScreen ticketId={999} onNavigate={onNavigate} />);

    await waitFor(() => {
      expect(screen.getByTestId("ticket-detail-error")).toBeInTheDocument();
    });

    expect(screen.getByTestId("error-heading")).toHaveTextContent(
      "Ticket Not Found or Access Denied"
    );
    expect(
      screen.getByText(/You are not authorized to view or access this ticket/i)
    ).toBeInTheDocument();

    const backBtn = screen.getByTestId("error-back-btn");
    fireEvent.click(backBtn);
    expect(onNavigate).toHaveBeenCalledWith("my-tickets");
  });

  it("3. Breadcrumb navigation returns user to My Tickets", async () => {
    const onNavigate = vi.fn();
    renderWithAuth(<TicketDetailScreen ticketId={42} onNavigate={onNavigate} />);

    await waitFor(() => {
      expect(screen.getByTestId("breadcrumb-tickets-link")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("breadcrumb-tickets-link"));
    expect(onNavigate).toHaveBeenCalledWith("my-tickets");
  });

  it("4. App routing navigates to ticket-detail screen when clicking ticket in list", async () => {
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      data: [
        {
          id: 42,
          ticketNo: "TKT-2026-00042",
          summary: "VPN connection drops every 10 minutes",
          priority: "P1_HIGH",
          status: "NEW",
          createdAt: "2026-08-22T16:25:00.000Z",
          updatedAt: "2026-08-22T17:00:00.000Z",
          requesterId: 1,
          categoryId: 4,
          requester: {
            id: 1,
            fullName: "Sarah Connor",
            email: "sarah@toktickit.com",
            department: "Engineering",
            isActive: true,
          },
          category: { id: 4, name: "Network" },
          relatedSystem: { id: 102, name: "VPN Gateway" },
          attachments: [],
        },
      ],
      pagination: {
        page: 1,
        pageSize: 10,
        totalItems: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("ticket-link-42")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("ticket-link-42"));

    await waitFor(() => {
      expect(screen.getByTestId("ticket-detail-screen")).toBeInTheDocument();
      expect(screen.getByTestId("ticket-number")).toHaveTextContent("TKT-2026-00042");
    });
  });

  it("4. Rejects empty/whitespace comments and posts valid public comments", async () => {
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue(mockTicketDetail);
    const postCommentSpy = vi.spyOn(api, "postPublicComment").mockResolvedValue({
      data: {
        id: 1,
        ticketId: 42,
        authorId: 1,
        authorName: "Sarah Connor",
        authorRole: "REQUESTER",
        content: "Valid comment content",
        createdAt: new Date().toISOString(),
      },
    });

    renderWithAuth(<TicketDetailScreen ticketId={42} onNavigate={vi.fn()} />);

    expect(await screen.findByTestId("public-comment-form")).toBeInTheDocument();

    const input = screen.getByTestId("comment-input");
    const submitBtn = screen.getByTestId("comment-submit-btn");

    // 1. Empty string -> disabled
    fireEvent.change(input, { target: { value: "" } });
    expect(submitBtn).toBeDisabled();

    // 2. Whitespace only -> disabled
    fireEvent.change(input, { target: { value: "    " } });
    expect(submitBtn).toBeDisabled();

    // 3. Single character (1 char) -> enabled & accepted
    fireEvent.change(input, { target: { value: "A" } });
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(postCommentSpy).toHaveBeenCalledWith(42, "A");
    });

    // 4. Exactly 2,000 characters -> accepted
    const exactly2000Chars = "X".repeat(2000);
    fireEvent.change(input, { target: { value: exactly2000Chars } });
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(postCommentSpy).toHaveBeenCalledWith(42, exactly2000Chars);
    });

    // 5. Exceeding 2,000 characters (2,001 chars) -> rejected with validation error
    const exceedingChars = "Y".repeat(2001);
    fireEvent.change(input, { target: { value: exceedingChars } });
    fireEvent.submit(screen.getByTestId("public-comment-form"));
    expect(await screen.findByTestId("comment-error")).toHaveTextContent("Comment cannot exceed 2,000 characters.");
  });

  it("5. Hides comment form, shows notice, and hides attachment actions when requester does not own ticket", async () => {
    // Ticket owned by requesterId: 999, but logged in user is id: 1
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue({
      ...mockTicketDetail,
      requesterId: 999,
    });

    renderWithAuth(<TicketDetailScreen ticketId={42} onNavigate={vi.fn()} />);

    const notice = await screen.findByTestId("comment-permission-notice");
    expect(notice).toBeInTheDocument();
    expect(notice).toHaveTextContent(
      "Only the ticket requester, IT staff, and administrators can post comments to this discussion."
    );
    expect(screen.queryByTestId("public-comment-form")).not.toBeInTheDocument();

    // Non-owner requester cannot add or remove attachments
    expect(screen.queryByTestId("add-attachment-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("remove-btn-881")).not.toBeInTheDocument();
  });

  it("6. Problem Appears Resolved triggers modal and calls confirmation API", async () => {
    // Ticket in eligible status (IN_PROGRESS) owned by user id: 1
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue({
      ...mockTicketDetail,
      status: "IN_PROGRESS",
      requesterId: 1,
      resolutionIndicated: false,
    });
    const confirmSpy = vi.spyOn(api, "confirmProblemResolved").mockResolvedValue({
      data: {
        id: 42,
        ticketNo: "TKT-2026-00042",
        status: "RESOLVED",
        resolutionIndicated: true,
        message: "Problem resolved",
      },
    });

    renderWithAuth(<TicketDetailScreen ticketId={42} onNavigate={vi.fn()} />);

    const resolvedBtn = await screen.findByTestId("confirm-resolved-btn");
    fireEvent.click(resolvedBtn);

    expect(await screen.findByTestId("confirm-resolved-modal")).toBeInTheDocument();

    const feedbackInput = screen.getByTestId("confirm-resolved-feedback");
    fireEvent.change(feedbackInput, { target: { value: "Working now, thanks!" } });

    const submitBtn = screen.getByTestId("confirm-resolved-submit-btn");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledWith(42, "Working now, thanks!");
    });
  });

  it("7. IT Staff can view comment form, post public comments, and see attachment actions on any ticket", async () => {
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue({
      id: 50,
      fullName: "Alex Rivera",
      email: "alex.rivera@toktickit.com",
      role: "IT_STAFF",
      mustChangePassword: false,
    });
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue({
      ...mockTicketDetail,
      requesterId: 999, // IT staff does not own ticket
    });
    const postCommentSpy = vi.spyOn(api, "postPublicComment").mockResolvedValue({
      data: {
        id: 2,
        ticketId: 42,
        authorId: 50,
        authorName: "Alex Rivera",
        authorRole: "IT_STAFF",
        content: "We are investigating this issue.",
        createdAt: new Date().toISOString(),
      },
    });

    renderWithAuth(<TicketDetailScreen ticketId={42} onNavigate={vi.fn()} />);

    expect(await screen.findByTestId("public-comment-form")).toBeInTheDocument();
    expect(screen.queryByTestId("comment-permission-notice")).not.toBeInTheDocument();

    const input = screen.getByTestId("comment-input");
    fireEvent.change(input, { target: { value: "We are investigating this issue." } });
    fireEvent.click(screen.getByTestId("comment-submit-btn"));

    await waitFor(() => {
      expect(postCommentSpy).toHaveBeenCalledWith(42, "We are investigating this issue.");
    });

    expect(screen.getByTestId("add-attachment-button")).toBeInTheDocument();
    expect(screen.getByTestId("remove-btn-881")).toBeInTheDocument();
  });

  it("8. Administrator can view comment form, post public comments, and see attachment actions on any ticket", async () => {
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue({
      id: 100,
      fullName: "Admin User",
      email: "admin@toktickit.com",
      role: "ADMINISTRATOR",
      mustChangePassword: false,
    });
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue({
      ...mockTicketDetail,
      requesterId: 999, // Admin does not own ticket
    });
    const postCommentSpy = vi.spyOn(api, "postPublicComment").mockResolvedValue({
      data: {
        id: 3,
        ticketId: 42,
        authorId: 100,
        authorName: "Admin User",
        authorRole: "ADMINISTRATOR",
        content: "Admin note on this ticket.",
        createdAt: new Date().toISOString(),
      },
    });

    renderWithAuth(<TicketDetailScreen ticketId={42} onNavigate={vi.fn()} />);

    expect(await screen.findByTestId("public-comment-form")).toBeInTheDocument();
    expect(screen.queryByTestId("comment-permission-notice")).not.toBeInTheDocument();

    const input = screen.getByTestId("comment-input");
    fireEvent.change(input, { target: { value: "Admin note on this ticket." } });
    fireEvent.click(screen.getByTestId("comment-submit-btn"));

    await waitFor(() => {
      expect(postCommentSpy).toHaveBeenCalledWith(42, "Admin note on this ticket.");
    });

    expect(screen.getByTestId("add-attachment-button")).toBeInTheDocument();
    expect(screen.getByTestId("remove-btn-881")).toBeInTheDocument();
  });
});
