import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as api from "../../src/api.js";
import RequesterDashboard from "../../src/components/RequesterDashboard.js";

const now = new Date();
const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();
const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();

const mockTicketsPage1: api.TicketItem[] = [
  {
    id: 1,
    ticketNo: "TCK-1001",
    summary: "Cannot access VPN network",
    description: "VPN client reports authorization failure",
    requestedPriority: "P1_HIGH",
    priority: "P1_HIGH",
    status: "NEW",
    categoryId: 4,
    requesterId: 3,
    createdAt: oneDayAgo,
    updatedAt: oneDayAgo,
    category: { id: 4, name: "Network" },
  },
  {
    id: 2,
    ticketNo: "TCK-1002",
    summary: "Requesting second monitor for workstation",
    description: "Dual monitor setup required",
    requestedPriority: "P3_LOW",
    priority: "P3_LOW",
    status: "WAITING_FOR_REQUESTER",
    categoryId: 2,
    requesterId: 3,
    createdAt: threeDaysAgo,
    updatedAt: threeDaysAgo,
    category: { id: 2, name: "Hardware" },
  },
  {
    id: 3,
    ticketNo: "TCK-1003",
    summary: "Password reset for corporate account",
    description: "Account locked after three attempts",
    requestedPriority: "P0_URGENT",
    priority: "P0_URGENT",
    status: "RESOLVED",
    categoryId: 1,
    requesterId: 3,
    createdAt: threeDaysAgo,
    updatedAt: threeDaysAgo, // within rolling 7-day window
    category: { id: 1, name: "Account & Access" },
  },
  {
    id: 4,
    ticketNo: "TCK-1004",
    summary: "Old resolved request from last month",
    description: "Fixed long ago",
    requestedPriority: "P2_MEDIUM",
    priority: "P2_MEDIUM",
    status: "RESOLVED",
    categoryId: 1,
    requesterId: 3,
    createdAt: tenDaysAgo,
    updatedAt: tenDaysAgo, // older than 7 days -> Stale Resolved
    category: { id: 1, name: "Account & Access" },
  },
  {
    id: 5,
    ticketNo: "TCK-1005",
    summary: "Replaced faulty wireless mouse",
    description: "Device returned and closed",
    requestedPriority: "P3_LOW",
    priority: "P3_LOW",
    status: "CLOSED",
    categoryId: 2,
    requesterId: 3,
    createdAt: tenDaysAgo,
    updatedAt: tenDaysAgo,
    category: { id: 2, name: "Hardware" },
  },
];

describe("RequesterDashboard Component (Lab 4 Issue #24)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("DSH-UI-01: renders 4 KPI summary cards with authentic counts and 7-day rolling window cutoff", async () => {
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      data: mockTicketsPage1,
      pagination: {
        page: 1,
        pageSize: 10,
        totalItems: mockTicketsPage1.length,
        totalCount: mockTicketsPage1.length,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    });

    render(<RequesterDashboard />);

    // Wait for data load
    await waitFor(() => {
      expect(screen.getByTestId("requester-dashboard-container")).toBeInTheDocument();
    });

    // Verify 4 KPI cards
    expect(screen.getByTestId("kpi-card-total-open")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-count-total-open")).toHaveTextContent("1"); // TCK-1001 (NEW)

    expect(screen.getByTestId("kpi-card-waiting-requester")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-count-waiting-requester")).toHaveTextContent("1"); // TCK-1002 (WAITING_FOR_REQUESTER)

    expect(screen.getByTestId("kpi-card-recently-resolved")).toBeInTheDocument();
    // TCK-1003 is 3 days old (included), TCK-1004 is 10 days old (excluded as stale resolved)
    expect(screen.getByTestId("kpi-count-recently-resolved")).toHaveTextContent("1");
    expect(screen.getByText("Rolling 7-day window")).toBeInTheDocument();

    expect(screen.getByTestId("kpi-card-total-closed")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-count-total-closed")).toHaveTextContent("1"); // TCK-1005 (CLOSED)
  });

  it("DSH-UI-01: multi-page assembling handles incomplete initial page by fetching remaining pages", async () => {
    const page2Ticket: api.TicketItem = {
      id: 6,
      ticketNo: "TCK-1006",
      summary: "Second page open ticket",
      requestedPriority: "P2_MEDIUM",
      priority: "P2_MEDIUM",
      status: "OPEN",
      categoryId: 3,
      requesterId: 3,
      createdAt: oneDayAgo,
      updatedAt: oneDayAgo,
      category: { id: 3, name: "Software" },
    };

    const fetchTicketsSpy = vi.spyOn(api, "fetchTickets");
    fetchTicketsSpy.mockImplementation(async (params) => {
      if (params?.page === 2) {
        return {
          data: [page2Ticket],
          pagination: {
            page: 2,
            pageSize: 5,
            totalItems: 6,
            totalCount: 6,
            totalPages: 2,
            hasNext: false,
            hasPrev: true,
          },
        };
      }
      return {
        data: mockTicketsPage1,
        pagination: {
          page: 1,
          pageSize: 5,
          totalItems: 6,
          totalCount: 6,
          totalPages: 2,
          hasNext: true,
          hasPrev: false,
        },
      };
    });

    render(<RequesterDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId("requester-dashboard-container")).toBeInTheDocument();
    });

    // Total open should be 2 (TCK-1001 NEW from page 1 + TCK-1006 OPEN from page 2)
    expect(screen.getByTestId("kpi-count-total-open")).toHaveTextContent("2");
    expect(fetchTicketsSpy).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }));
    expect(fetchTicketsSpy).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }));
  });

  it("DSH-UI-01: later-page request failure displays error alert and prevents partial totals, then recovers on retry", async () => {
    let callCount = 0;
    const fetchTicketsSpy = vi.spyOn(api, "fetchTickets");
    fetchTicketsSpy.mockImplementation(async (params) => {
      callCount++;
      if (params?.page === 2) {
        if (callCount <= 2) {
          throw new Error("Network timeout on page 2");
        }
        return {
          data: [
            {
              id: 99,
              ticketNo: "TCK-1099",
              summary: "Recovered page 2 ticket",
              requestedPriority: "P1_HIGH",
              priority: "P1_HIGH",
              status: "OPEN",
              categoryId: 1,
              requesterId: 3,
              createdAt: oneDayAgo,
              updatedAt: oneDayAgo,
            },
          ],
          pagination: {
            page: 2,
            pageSize: 5,
            totalItems: 6,
            totalCount: 6,
            totalPages: 2,
            hasNext: false,
            hasPrev: true,
          },
        };
      }
      return {
        data: mockTicketsPage1,
        pagination: {
          page: 1,
          pageSize: 5,
          totalItems: 6,
          totalCount: 6,
          totalPages: 2,
          hasNext: true,
          hasPrev: false,
        },
      };
    });

    render(<RequesterDashboard />);

    // Verify error state appears and no partial KPI cards are shown
    await waitFor(() => {
      expect(screen.getByTestId("dashboard-error-alert")).toBeInTheDocument();
    });
    expect(screen.getByText("Network timeout on page 2")).toBeInTheDocument();
    expect(screen.queryByTestId("requester-kpi-row")).not.toBeInTheDocument();

    // Click retry
    const retryBtn = screen.getByTestId("dashboard-error-retry");
    fireEvent.click(retryBtn);

    // Verify full recovery
    await waitFor(() => {
      expect(screen.getByTestId("requester-dashboard-container")).toBeInTheDocument();
    });
    expect(screen.getByTestId("kpi-count-total-open")).toHaveTextContent("2");
  });

  it("DSH-UI-01: renders recent tickets table, badges, and navigates to ticket detail on row or button click", async () => {
    const handleViewTicket = vi.fn();
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      data: mockTicketsPage1,
      pagination: {
        page: 1,
        pageSize: 10,
        totalItems: mockTicketsPage1.length,
        totalCount: mockTicketsPage1.length,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    });

    render(<RequesterDashboard onViewTicket={handleViewTicket} />);

    await waitFor(() => {
      expect(screen.getByTestId("recent-tickets-table")).toBeInTheDocument();
    });

    expect(screen.getByText("TCK-1001")).toBeInTheDocument();
    expect(screen.getByText("Cannot access VPN network")).toBeInTheDocument();
    expect(screen.getByText("WAITING FOR YOU")).toBeInTheDocument();

    // Click ticket row
    const row = screen.getByTestId("ticket-row-1");
    fireEvent.click(row);
    expect(handleViewTicket).toHaveBeenCalledWith(1);

    // Click explicit view button
    const viewBtn = screen.getByTestId("view-ticket-btn-2");
    fireEvent.click(viewBtn);
    expect(handleViewTicket).toHaveBeenCalledWith(2);
  });

  it("DSH-UI-01: triggers onCreateTicket and onViewMyTickets callbacks from header action buttons", async () => {
    const handleCreate = vi.fn();
    const handleViewAll = vi.fn();

    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      data: mockTicketsPage1,
      pagination: {
        page: 1,
        pageSize: 10,
        totalItems: mockTicketsPage1.length,
        totalCount: mockTicketsPage1.length,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    });

    render(
      <RequesterDashboard
        onCreateTicket={handleCreate}
        onViewMyTickets={handleViewAll}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("requester-dash-create-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("requester-dash-create-btn"));
    expect(handleCreate).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId("requester-dash-view-all-btn"));
    expect(handleViewAll).toHaveBeenCalledTimes(1);
  });

  it("DSH-UI-01: displays empty state card with CTA when ticket list is empty", async () => {
    const handleCreate = vi.fn();
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      data: [],
      pagination: {
        page: 1,
        pageSize: 10,
        totalItems: 0,
        totalCount: 0,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    });

    render(<RequesterDashboard onCreateTicket={handleCreate} />);

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-empty-state")).toBeInTheDocument();
    });

    expect(screen.getByText("No Tickets Found")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-count-total-open")).toHaveTextContent("0");
    expect(screen.getByTestId("kpi-count-waiting-requester")).toHaveTextContent("0");
    expect(screen.getByTestId("kpi-count-recently-resolved")).toHaveTextContent("0");
    expect(screen.getByTestId("kpi-count-total-closed")).toHaveTextContent("0");

    const emptyCta = screen.getByTestId("empty-create-ticket-btn");
    fireEvent.click(emptyCta);
    expect(handleCreate).toHaveBeenCalledTimes(1);
  });
});
