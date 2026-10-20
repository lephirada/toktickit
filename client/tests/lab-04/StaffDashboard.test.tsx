import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import * as api from "../../src/api.js";
import StaffDashboard from "../../src/components/StaffDashboard.js";

const mockStaffUser: api.AuthUser = {
  id: 6,
  fullName: "David Lee",
  email: "david.lee@toktickit.com",
  role: "IT_STAFF",
  mustChangePassword: false,
};

const mockAdminUser: api.AuthUser = {
  id: 10,
  fullName: "System Admin",
  email: "admin@toktickit.com",
  role: "ADMINISTRATOR",
  mustChangePassword: false,
};

const mockDashboardResponse: api.DashboardResponse = {
  data: {
    metrics: {
      totalOpen: 12,
      inProgress: 5,
      waitingForRequester: 3,
      recentlyResolved: 8,
      unassignedCount: 4,
      totalTimeSpentMinutes: 645, // 10h 45m
    },
    categoryBreakdown: [
      {
        categoryId: 1,
        categoryName: "Account & Access",
        ticketCount: 6,
        totalTimeSpentMinutes: 180,
      },
      {
        categoryId: 2,
        categoryName: "Hardware",
        ticketCount: 4,
        totalTimeSpentMinutes: 240,
      },
      {
        categoryId: 3,
        categoryName: "Software",
        ticketCount: 3,
        totalTimeSpentMinutes: 150,
      },
      {
        categoryId: 4,
        categoryName: "Network",
        ticketCount: 2,
        totalTimeSpentMinutes: 75,
      },
    ],
    priorityBreakdown: {
      P0_URGENT: 2,
      P1_HIGH: 4,
      P2_MEDIUM: 6,
      P3_LOW: 3,
    },
    meta: {
      calculationTimestamp: "2026-10-18T10:00:00.000Z",
      recentlyResolvedWindowDays: 7,
      recentlyResolvedWindowStart: "2026-10-11T10:00:00.000Z",
    },
  },
};

const mockRecentStaffTickets: api.StaffTicketItem[] = [
  {
    id: 101,
    ticketNo: "TCK-101",
    summary: "Production server latency spike",
    requestedPriority: "P0_URGENT",
    itPriority: "P0_URGENT",
    status: "IN_PROGRESS",
    resolutionIndicated: false,
    createdAt: "2026-10-18T09:00:00.000Z",
    updatedAt: "2026-10-18T09:30:00.000Z",
    requester: { id: 3, fullName: "Jennifer Anderson", email: "jennifer@toktickit.com" },
    category: { id: 4, name: "Network" },
    owner: { id: 6, fullName: "David Lee" },
  },
  {
    id: 102,
    ticketNo: "TCK-102",
    summary: "New employee laptop setup",
    requestedPriority: "P2_MEDIUM",
    itPriority: null,
    status: "OPEN",
    resolutionIndicated: false,
    createdAt: "2026-10-18T08:00:00.000Z",
    updatedAt: "2026-10-18T08:00:00.000Z",
    requester: { id: 2, fullName: "John Doe", email: "john@toktickit.com" },
    category: { id: 2, name: "Hardware" },
    owner: null,
  },
];

const mockAdminUsersList: api.AdminUserItem[] = [
  {
    id: 1,
    fullName: "System Admin",
    email: "admin@toktickit.com",
    role: "ADMINISTRATOR",
    isActive: true,
    mustChangePassword: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: 6,
    fullName: "David Lee",
    email: "david.lee@toktickit.com",
    role: "IT_STAFF",
    isActive: true,
    mustChangePassword: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: 7,
    fullName: "Sarah Connor",
    email: "sarah.connor@toktickit.com",
    role: "IT_STAFF",
    isActive: false,
    mustChangePassword: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: 3,
    fullName: "Jennifer Anderson",
    email: "jennifer@toktickit.com",
    role: "REQUESTER",
    isActive: true,
    mustChangePassword: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("StaffDashboard Component (Lab 4 Issue #24)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("DSH-UI-02: renders all 7 KPI cards with accurate backend metrics and labor hours", async () => {
    vi.spyOn(api, "fetchStaffDashboard").mockResolvedValue(mockDashboardResponse);
    vi.spyOn(api, "fetchStaffTickets").mockImplementation(async (params) => {
      if (params?.owner === "MY_TICKETS") {
        return {
          data: [],
          pagination: {
            page: 1,
            pageSize: 1,
            totalItems: 7,
            totalPages: 7,
            hasNext: true,
            hasPrev: false,
          },
        };
      }
      return {
        data: mockRecentStaffTickets,
        pagination: {
          page: 1,
          pageSize: 5,
          totalItems: 2,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };
    });

    render(<StaffDashboard currentUser={mockStaffUser} />);

    await waitFor(() => {
      expect(screen.getByTestId("staff-dashboard-container")).toBeInTheDocument();
    });

    // 1. Unassigned
    expect(screen.getByTestId("kpi-card-unassigned")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-count-unassigned")).toHaveTextContent("4");

    // 2. My Assigned Tickets
    expect(screen.getByTestId("kpi-card-my-assigned")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-count-my-assigned")).toHaveTextContent("7");

    // 3. In Progress
    expect(screen.getByTestId("kpi-card-in-progress")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-count-in-progress")).toHaveTextContent("5");

    // 4. Waiting for Requester
    expect(screen.getByTestId("kpi-card-waiting-requester")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-count-waiting-requester")).toHaveTextContent("3");

    // 5. Total Open
    expect(screen.getByTestId("kpi-card-total-open")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-count-total-open")).toHaveTextContent("12");

    // 6. Recently Resolved
    expect(screen.getByTestId("kpi-card-recently-resolved")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-count-recently-resolved")).toHaveTextContent("8");
    expect(screen.getByText("Rolling 7-day window →")).toBeInTheDocument();

    // 7. Total Labor (645 min -> 10h 45m)
    expect(screen.getByTestId("kpi-card-total-time")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-count-total-time")).toHaveTextContent("10h 45m");
  });

  it("DSH-UI-02: metric cards trigger queue drill-down navigation with expected filter parameters", async () => {
    const handleNavigateQueue = vi.fn();

    vi.spyOn(api, "fetchStaffDashboard").mockResolvedValue(mockDashboardResponse);
    vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
      data: mockRecentStaffTickets,
      pagination: {
        page: 1,
        pageSize: 5,
        totalItems: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    });

    render(
      <StaffDashboard
        currentUser={mockStaffUser}
        onNavigateQueue={handleNavigateQueue}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("staff-dashboard-container")).toBeInTheDocument();
    });

    // Click Unassigned card
    fireEvent.click(screen.getByTestId("kpi-card-unassigned"));
    expect(handleNavigateQueue).toHaveBeenCalledWith({ owner: "UNASSIGNED" });

    // Click My Assigned card
    fireEvent.click(screen.getByTestId("kpi-card-my-assigned"));
    expect(handleNavigateQueue).toHaveBeenCalledWith({ owner: "MY_TICKETS" });

    // Click In Progress card
    fireEvent.click(screen.getByTestId("kpi-card-in-progress"));
    expect(handleNavigateQueue).toHaveBeenCalledWith({ status: "IN_PROGRESS" });

    // Click Waiting Req card
    fireEvent.click(screen.getByTestId("kpi-card-waiting-requester"));
    expect(handleNavigateQueue).toHaveBeenCalledWith({ status: "WAITING_FOR_REQUESTER" });

    // Click Total Open card (must drill down into both NEW and OPEN tickets)
    fireEvent.click(screen.getByTestId("kpi-card-total-open"));
    expect(handleNavigateQueue).toHaveBeenCalledWith({ status: "NEW,OPEN" });

    // Click Recently Resolved card (must limit results to rolling 7-day window)
    fireEvent.click(screen.getByTestId("kpi-card-recently-resolved"));
    expect(handleNavigateQueue).toHaveBeenCalledWith({ status: "RESOLVED", resolvedWithinDays: "7" });
  });

  it("DSH-UI-02: category and priority workload distributions render and trigger filtered queue drill-down", async () => {
    const handleNavigateQueue = vi.fn();

    vi.spyOn(api, "fetchStaffDashboard").mockResolvedValue(mockDashboardResponse);
    vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
      data: mockRecentStaffTickets,
      pagination: {
        page: 1,
        pageSize: 5,
        totalItems: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    });

    render(
      <StaffDashboard
        currentUser={mockStaffUser}
        onNavigateQueue={handleNavigateQueue}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("category-breakdown-card")).toBeInTheDocument();
      expect(screen.getByTestId("priority-breakdown-card")).toBeInTheDocument();
    });

    // Check category values
    expect(screen.getByText("Account & Access")).toBeInTheDocument();
    expect(screen.getByText("3.0 hrs")).toBeInTheDocument(); // 180m / 60

    // Click category drill-down
    fireEvent.click(screen.getByTestId("category-drilldown-1"));
    expect(handleNavigateQueue).toHaveBeenCalledWith({ categoryId: "1" });

    // Click priority drill-down
    fireEvent.click(screen.getByTestId("priority-drilldown-P0_URGENT"));
    expect(handleNavigateQueue).toHaveBeenCalledWith({ requestedPriority: "P0_URGENT" });
  });

  it("DSH-UI-02: renders recent queue activity table and opens ticket detail on click", async () => {
    const handleViewTicket = vi.fn();

    vi.spyOn(api, "fetchStaffDashboard").mockResolvedValue(mockDashboardResponse);
    vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
      data: mockRecentStaffTickets,
      pagination: {
        page: 1,
        pageSize: 5,
        totalItems: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    });

    render(
      <StaffDashboard
        currentUser={mockStaffUser}
        onViewTicket={handleViewTicket}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("staff-recent-tickets-table")).toBeInTheDocument();
    });

    const recentTable = screen.getByTestId("staff-recent-tickets-table");
    expect(within(recentTable).getByText("TCK-101")).toBeInTheDocument();
    expect(within(recentTable).getByText("Production server latency spike")).toBeInTheDocument();
    expect(within(recentTable).getByText("Jennifer Anderson")).toBeInTheDocument();

    // Click row
    fireEvent.click(screen.getByTestId("staff-ticket-row-101"));
    expect(handleViewTicket).toHaveBeenCalledWith(101);

    // Click open button
    fireEvent.click(screen.getByTestId("view-staff-ticket-btn-102"));
    expect(handleViewTicket).toHaveBeenCalledWith(102);
  });

  it("DSH-UI-02: renders P0 urgent attention section with urgent tickets and triggers actions", async () => {
    const handleViewTicket = vi.fn();
    const handleNavigateQueue = vi.fn();

    vi.spyOn(api, "fetchStaffDashboard").mockResolvedValue(mockDashboardResponse);
    vi.spyOn(api, "fetchStaffTickets").mockImplementation(async (params) => {
      if (params?.requestedPriority === "P0_URGENT") {
        return {
          data: [mockRecentStaffTickets[0]], // TCK-101 is P0_URGENT
          pagination: {
            page: 1,
            pageSize: 5,
            totalItems: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        };
      }
      return {
        data: [mockRecentStaffTickets[1]],
        pagination: {
          page: 1,
          pageSize: 5,
          totalItems: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };
    });

    render(
      <StaffDashboard
        currentUser={mockStaffUser}
        onViewTicket={handleViewTicket}
        onNavigateQueue={handleNavigateQueue}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("staff-urgent-tickets-card")).toBeInTheDocument();
    });

    expect(screen.getByTestId("urgent-tickets-count-badge")).toHaveTextContent("1");
    expect(screen.getByTestId("staff-urgent-tickets-table")).toBeInTheDocument();

    const urgentTable = screen.getByTestId("staff-urgent-tickets-table");
    expect(within(urgentTable).getByText("TCK-101")).toBeInTheDocument();
    expect(within(urgentTable).getByText("Production server latency spike")).toBeInTheDocument();

    // Click "View all urgent in queue ->" link
    fireEvent.click(screen.getByTestId("see-all-urgent-link"));
    expect(handleNavigateQueue).toHaveBeenCalledWith({ requestedPriority: "P0_URGENT" });

    // Click open urgent ticket button
    fireEvent.click(screen.getByTestId("view-urgent-ticket-btn-101"));
    expect(handleViewTicket).toHaveBeenCalledWith(101);
  });

  it("DSH-UI-02: renders accessible empty state when no P0 urgent tickets require attention", async () => {
    vi.spyOn(api, "fetchStaffDashboard").mockResolvedValue(mockDashboardResponse);
    vi.spyOn(api, "fetchStaffTickets").mockImplementation(async (params) => {
      if (params?.requestedPriority === "P0_URGENT") {
        return {
          data: [],
          pagination: {
            page: 1,
            pageSize: 5,
            totalItems: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
        };
      }
      return {
        data: mockRecentStaffTickets,
        pagination: {
          page: 1,
          pageSize: 5,
          totalItems: 2,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };
    });

    render(<StaffDashboard currentUser={mockStaffUser} />);

    await waitFor(() => {
      expect(screen.getByTestId("staff-empty-urgent-tickets")).toBeInTheDocument();
    });

    expect(screen.getByTestId("staff-empty-urgent-tickets")).toHaveTextContent(
      "No urgent P0 tickets currently requiring immediate attention."
    );
    expect(screen.queryByTestId("staff-urgent-tickets-table")).toBeNull();
  });

  it("DSH-UI-03: renders User Accounts Summary card for ADMINISTRATOR with accurate user stats", async () => {
    const handleNavigateUsers = vi.fn();

    vi.spyOn(api, "fetchStaffDashboard").mockResolvedValue(mockDashboardResponse);
    vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
      data: mockRecentStaffTickets,
      pagination: {
        page: 1,
        pageSize: 5,
        totalItems: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    });
    vi.spyOn(api, "fetchAdminUsers").mockResolvedValue({
      data: mockAdminUsersList,
    });

    render(
      <StaffDashboard
        currentUser={mockAdminUser}
        onNavigateUsers={handleNavigateUsers}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("admin-user-summary-card")).toBeInTheDocument();
    });

    expect(screen.getByTestId("admin-stat-total-users")).toHaveTextContent("4");
    expect(screen.getByTestId("admin-stat-staff")).toHaveTextContent("1"); // 1 active IT Staff
    expect(screen.getByTestId("admin-stat-admins")).toHaveTextContent("1");
    expect(screen.getByTestId("admin-stat-requesters")).toHaveTextContent("1");
    expect(screen.getByTestId("admin-stat-pwd-reset")).toHaveTextContent("1");

    // Click manage users CTA
    fireEvent.click(screen.getByTestId("admin-manage-users-btn"));
    expect(handleNavigateUsers).toHaveBeenCalledTimes(1);
  });

  it("DSH-UI-03: User Accounts Summary card is completely absent from DOM for IT_STAFF", async () => {
    vi.spyOn(api, "fetchStaffDashboard").mockResolvedValue(mockDashboardResponse);
    vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
      data: mockRecentStaffTickets,
      pagination: {
        page: 1,
        pageSize: 5,
        totalItems: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    });
    const fetchAdminUsersSpy = vi.spyOn(api, "fetchAdminUsers");

    render(<StaffDashboard currentUser={mockStaffUser} />);

    await waitFor(() => {
      expect(screen.getByTestId("staff-dashboard-container")).toBeInTheDocument();
    });

    // Asserts card is completely absent from DOM
    expect(screen.queryByTestId("admin-user-summary-card")).toBeNull();
    expect(fetchAdminUsersSpy).not.toHaveBeenCalled();
  });

  it("DSH-UI-02: displays error alert and retry button on API failure, then recovers cleanly", async () => {
    let shouldFail = true;
    vi.spyOn(api, "fetchStaffDashboard").mockImplementation(async () => {
      if (shouldFail) {
        throw new Error("Operational service offline");
      }
      return mockDashboardResponse;
    });
    vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
      data: mockRecentStaffTickets,
      pagination: {
        page: 1,
        pageSize: 5,
        totalItems: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    });

    render(<StaffDashboard currentUser={mockStaffUser} />);

    await waitFor(() => {
      expect(screen.getByTestId("staff-dashboard-error-alert")).toBeInTheDocument();
    });
    expect(screen.getByText("Operational service offline")).toBeInTheDocument();

    // Trigger retry
    shouldFail = false;
    fireEvent.click(screen.getByTestId("staff-dashboard-error-retry"));

    await waitFor(() => {
      expect(screen.getByTestId("staff-dashboard-container")).toBeInTheDocument();
    });
    expect(screen.getByTestId("kpi-count-total-open")).toHaveTextContent("12");
  });
});
