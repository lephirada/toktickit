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
});
