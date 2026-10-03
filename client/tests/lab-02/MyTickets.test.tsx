import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import MyTicketsDashboard from "../../src/components/MyTicketsDashboard.js";

const mockAuthUser: api.AuthUser = {
  id: 1,
  email: "sarah.connor@toktickit.com",
  fullName: "Sarah Connor",
  role: "REQUESTER",
  mustChangePassword: false,
};

const mockCategories: api.Category[] = [
  { id: 1, name: "Hardware" },
  { id: 2, name: "Network" },
  { id: 3, name: "Software" },
];

const mockTicketList: api.TicketItem[] = [
  {
    id: 101,
    ticketNo: "TKT-2026-00001",
    summary: "MacBook keyboard key sticking intermittently",
    description: "The spacebar fails to respond randomly.",
    priority: "P0_URGENT",
    status: "NEW",
    categoryId: 1,
    category: { id: 1, name: "Hardware" },
    relatedSystemId: 1,
    relatedSystem: { id: 1, name: "Corporate Laptop" },
    requesterId: 1,
    createdAt: "2026-08-20T10:00:00.000Z",
    updatedAt: "2026-08-20T10:00:00.000Z",
    attachments: [],
    attachmentCount: 0,
  },
  {
    id: 102,
    ticketNo: "TKT-2026-00002",
    summary: "VPN Connection Drop on home Wi-Fi",
    description: "Cannot stay connected to the internal VPN server.",
    priority: "P1_HIGH",
    status: "IN_PROGRESS",
    categoryId: 2,
    category: { id: 2, name: "Network" },
    relatedSystemId: 2,
    relatedSystem: { id: 2, name: "VPN" },
    requesterId: 1,
    createdAt: "2026-08-21T11:30:00.000Z",
    updatedAt: "2026-08-21T12:00:00.000Z",
    attachments: [],
    attachmentCount: 0,
  },
  {
    id: 103,
    ticketNo: "TKT-2026-00003",
    summary: "LEB2 session timeout error",
    description: "Portal keeps timing out after two minutes.",
    priority: "P2_MEDIUM",
    status: "RESOLVED",
    categoryId: 3,
    category: { id: 3, name: "Software" },
    relatedSystemId: null,
    relatedSystem: null,
    requesterId: 1,
    createdAt: "2026-08-22T08:15:00.000Z",
    updatedAt: "2026-08-22T09:00:00.000Z",
    attachments: [],
    attachmentCount: 0,
  },
];

describe("Issue 8 — Frontend My Tickets Dashboard Tests", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue(mockAuthUser);
    vi.spyOn(api, "fetchCategories").mockResolvedValue(mockCategories);
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      data: mockTicketList,
      pagination: {
        page: 1,
        pageSize: 10,
        limit: 10,
        totalItems: 3,
        totalCount: 3,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    });
  });

  // ---------------------------------------------------------------------------
  // 1. Desktop Table & Mobile Card Rendering
  // ---------------------------------------------------------------------------
  it("1. Renders ticket table on desktop and responsive card list on mobile", async () => {
    render(
      <AuthProvider>
        <MyTicketsDashboard />
      </AuthProvider>
    );

    // Desktop table checks
    await waitFor(() => {
      expect(screen.getByTestId("tickets-desktop-table")).toBeInTheDocument();
      expect(screen.getByTestId("tickets-mobile-list")).toBeInTheDocument();
    });

    // Check table headers and rows (present in both desktop table and mobile card)
    expect(screen.getAllByText("TKT-2026-00001").length).toBe(2);
    expect(screen.getAllByText("MacBook keyboard key sticking intermittently").length).toBe(2);
    expect(screen.getAllByText("TKT-2026-00002").length).toBe(2);
    expect(screen.getAllByText("TKT-2026-00003").length).toBe(2);

    // Check priority badge rendering
    const p0Badges = screen.getAllByText(/P0 Urgent/i);
    expect(p0Badges.length).toBeGreaterThan(0);
    const p1Badges = screen.getAllByText(/P1 High/i);
    expect(p1Badges.length).toBeGreaterThan(0);

    // Check mobile card view
    expect(screen.getByTestId("ticket-card-101")).toBeInTheDocument();
    expect(screen.getByTestId("ticket-card-102")).toBeInTheDocument();
    expect(screen.getByTestId("ticket-card-103")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // 2. Debounced Search Bar
  // ---------------------------------------------------------------------------
  it("2. Typing in search bar triggers debounced API call with search param", async () => {
    const fetchTicketsSpy = vi.spyOn(api, "fetchTickets");
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <MyTicketsDashboard />
      </AuthProvider>
    );

    await screen.findByTestId("ticket-search-input");
    const searchInput = screen.getByTestId("ticket-search-input");

    // Type query
    await user.type(searchInput, "MacBook");

    // Before 300ms debounce timeout, search param is not called yet
    expect(fetchTicketsSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ search: "MacBook" })
    );

    // Wait for 300ms debounce
    await waitFor(
      () => {
        expect(fetchTicketsSpy).toHaveBeenCalledWith(
          expect.objectContaining({ search: "MacBook", page: 1 })
        );
      },
      { timeout: 1000 }
    );
  });

  // ---------------------------------------------------------------------------
  // 3. Dropdown Filtering (Category, Priority, Status)
  // ---------------------------------------------------------------------------
  it("3. Selecting Category, Priority, or Status triggers filtered API calls", async () => {
    const fetchTicketsSpy = vi.spyOn(api, "fetchTickets");
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <MyTicketsDashboard />
      </AuthProvider>
    );

    await screen.findByTestId("category-filter-select");

    // 1. Select Category Hardware (id: 1)
    const categorySelect = screen.getByTestId("category-filter-select");
    await user.selectOptions(categorySelect, "1");

    await waitFor(() => {
      expect(fetchTicketsSpy).toHaveBeenCalledWith(
        expect.objectContaining({ categoryId: 1, page: 1 })
      );
    });

    // 2. Select Priority P0 Urgent
    const prioritySelect = screen.getByTestId("priority-filter-select");
    await user.selectOptions(prioritySelect, "P0_URGENT");

    await waitFor(() => {
      expect(fetchTicketsSpy).toHaveBeenCalledWith(
        expect.objectContaining({ categoryId: 1, priority: "P0_URGENT" })
      );
    });

    // 3. Select Status NEW
    const statusSelect = screen.getByTestId("status-filter-select");
    await user.selectOptions(statusSelect, "NEW");

    await waitFor(() => {
      expect(fetchTicketsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryId: 1,
          priority: "P0_URGENT",
          status: "NEW",
        })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Clear Filters
  // ---------------------------------------------------------------------------
  it("4. Clear Filters button resets all inputs and requests default ticket list", async () => {
    const fetchTicketsSpy = vi.spyOn(api, "fetchTickets");
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <MyTicketsDashboard />
      </AuthProvider>
    );

    await screen.findByTestId("category-filter-select");

    // Apply a filter
    const statusSelect = screen.getByTestId("status-filter-select");
    await user.selectOptions(statusSelect, "RESOLVED");

    // Wait for Clear Filters button to appear
    const clearBtn = await screen.findByTestId("clear-filters-btn");
    expect(clearBtn).toBeInTheDocument();

    // Click Clear Filters
    await user.click(clearBtn);

    await waitFor(() => {
      expect(statusSelect).toHaveValue("ALL");
      expect(screen.getByTestId("ticket-search-input")).toHaveValue("");
      expect(fetchTicketsSpy).toHaveBeenLastCalledWith(
        expect.not.objectContaining({ status: "RESOLVED" })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Pagination & Page Size
  // ---------------------------------------------------------------------------
  it("5. Pagination interactions request updated page and pageSize parameters", async () => {
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      data: mockTicketList,
      pagination: {
        page: 1,
        pageSize: 10,
        limit: 10,
        totalItems: 25,
        totalCount: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: false,
      },
    });

    const fetchTicketsSpy = vi.spyOn(api, "fetchTickets");
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <MyTicketsDashboard />
      </AuthProvider>
    );

    // Check pagination counter text
    await waitFor(() => {
      expect(screen.getByTestId("pagination-counter")).toHaveTextContent(
        "Showing 1 to 10 of 25 tickets"
      );
    });

    // Click Next page button
    const nextBtn = screen.getByTestId("pagination-next-btn");
    await user.click(nextBtn);

    await waitFor(() => {
      expect(fetchTicketsSpy).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, pageSize: 10 })
      );
    });

    // Change Page Size to 20
    const pageSizeSelect = screen.getByTestId("page-size-select");
    await user.selectOptions(pageSizeSelect, "20");

    await waitFor(() => {
      expect(fetchTicketsSpy).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, pageSize: 20 })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Empty State & No-Results State
  // ---------------------------------------------------------------------------
  it("6. Renders Empty State when no tickets exist, and No-Results State when filters match nothing", async () => {
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      data: [],
      pagination: {
        page: 1,
        pageSize: 10,
        limit: 10,
        totalItems: 0,
        totalCount: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    });

    const user = userEvent.setup();
    render(
      <AuthProvider>
        <MyTicketsDashboard />
      </AuthProvider>
    );

    // Initial Empty State (no active filters)
    await waitFor(() => {
      expect(screen.getByText(/No tickets found/i)).toBeInTheDocument();
      expect(
        screen.getByText(/You haven't submitted any IT support requests yet/i)
      ).toBeInTheDocument();
      expect(screen.getByTestId("create-first-ticket-btn")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Create Your First Ticket/i })).toBeInTheDocument();
    });

    // Now type into search input to simulate filter producing 0 matches
    const searchInput = screen.getByTestId("ticket-search-input");
    await user.type(searchInput, "NoMatchXYZ");

    // Wait for 300ms debounce
    await waitFor(
      () => {
        expect(screen.getByText(/No tickets match your filters/i)).toBeInTheDocument();
        expect(screen.getByTestId("clear-filters-empty-btn")).toBeInTheDocument();
      },
      { timeout: 1000 }
    );
  });

  // ---------------------------------------------------------------------------
  // 7. Error State & Separation from Empty State
  // ---------------------------------------------------------------------------
  it("7. Displays error alert with Retry button on API failure without showing empty state", async () => {
    vi.spyOn(api, "fetchTickets").mockRejectedValue(new Error("Unable to fetch tickets"));

    render(
      <AuthProvider>
        <MyTicketsDashboard />
      </AuthProvider>
    );

    expect(await screen.findByTestId("tickets-error-alert")).toBeInTheDocument();
    expect(screen.getByText("Failed to load tickets. Please try again.")).toBeInTheDocument();
    expect(screen.getByTestId("retry-tickets-btn")).toBeInTheDocument();

    // MUST NOT display empty-tickets-state when in error state
    expect(screen.queryByTestId("empty-tickets-state")).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // 8. Ticket Navigation to /tickets/:id
  // ---------------------------------------------------------------------------
  it("8. Clicking a ticket number or row triggers navigation to /tickets/:id with corresponding ticket ID", async () => {
    const onViewTicketMock = vi.fn();
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <MyTicketsDashboard onViewTicket={onViewTicketMock} />
      </AuthProvider>
    );

    await screen.findByTestId("ticket-link-101");

    // Click Ticket No link
    const link101 = screen.getByTestId("ticket-link-101");
    await user.click(link101);

    expect(onViewTicketMock).toHaveBeenCalledWith(101);

    // Click row 102
    const row102 = screen.getByTestId("ticket-row-102");
    await user.click(row102);

    expect(onViewTicketMock).toHaveBeenCalledWith(102);
  });

  // ---------------------------------------------------------------------------
  // 9. Sorting by Column
  // ---------------------------------------------------------------------------
  it("9. Clicking column headers toggles sort order and triggers sorted fetchTickets", async () => {
    const fetchTicketsSpy = vi.spyOn(api, "fetchTickets");
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <MyTicketsDashboard />
      </AuthProvider>
    );

    await screen.findByTestId("sort-ticket-no-btn");

    // Click sort by ticketNo
    await user.click(screen.getByTestId("sort-ticket-no-btn"));

    await waitFor(() => {
      expect(fetchTicketsSpy).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: "ticketNo", sortOrder: "desc" })
      );
    });

    // Click again to toggle asc
    await user.click(screen.getByTestId("sort-ticket-no-btn"));

    await waitFor(() => {
      expect(fetchTicketsSpy).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: "ticketNo", sortOrder: "asc" })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 10. Success Banner Auto-Dismiss Timer (5 seconds)
  // ---------------------------------------------------------------------------
  it("10. Success banner auto-dismisses after 5 seconds", async () => {
    vi.useFakeTimers();
    const onClearBanner = vi.fn();
    render(
      <AuthProvider>
        <MyTicketsDashboard
          successBanner="Ticket TKT-2026-00001 created successfully!"
          onClearBanner={onClearBanner}
        />
      </AuthProvider>
    );

    expect(screen.getByTestId("success-banner")).toBeInTheDocument();
    expect(screen.getByText("Ticket TKT-2026-00001 created successfully!")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.queryByTestId("success-banner")).not.toBeInTheDocument();
    expect(onClearBanner).toHaveBeenCalled();
    vi.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // 11. Success Banner Manual Dismissal
  // ---------------------------------------------------------------------------
  it("11. Success banner dismisses on user clicking close button", async () => {
    const onClearBanner = vi.fn();
    render(
      <AuthProvider>
        <MyTicketsDashboard
          successBanner="Ticket TKT-2026-00001 created successfully!"
          onClearBanner={onClearBanner}
        />
      </AuthProvider>
    );

    expect(await screen.findByTestId("ticket-row-101")).toBeInTheDocument();
    expect(screen.getByTestId("success-banner")).toBeInTheDocument();
    const closeBtn = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByTestId("success-banner")).not.toBeInTheDocument();
    expect(onClearBanner).toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // 12. Success Banner Dismissal on User Interaction
  // ---------------------------------------------------------------------------
  it("12. Success banner dismisses immediately on search input, filter change, or clear filters", async () => {
    const onClearBanner = vi.fn();
    const { rerender } = render(
      <AuthProvider>
        <MyTicketsDashboard
          successBanner="Ticket TKT-2026-00001 created successfully!"
          onClearBanner={onClearBanner}
        />
      </AuthProvider>
    );

    expect(await screen.findByTestId("ticket-row-101")).toBeInTheDocument();
    expect(screen.getByTestId("success-banner")).toBeInTheDocument();

    // 1. Changing search input dismisses banner
    const searchInput = screen.getByTestId("ticket-search-input");
    fireEvent.change(searchInput, { target: { value: "printer" } });

    expect(screen.queryByTestId("success-banner")).not.toBeInTheDocument();
    expect(onClearBanner).toHaveBeenCalled();

    // 2. Changing category dropdown dismisses banner
    onClearBanner.mockClear();
    rerender(
      <AuthProvider>
        <MyTicketsDashboard
          successBanner="Ticket TKT-2026-00002 created successfully!"
          onClearBanner={onClearBanner}
        />
      </AuthProvider>
    );
    expect(screen.getByTestId("success-banner")).toBeInTheDocument();

    const categorySelect = screen.getByTestId("category-filter-select");
    fireEvent.change(categorySelect, { target: { value: "1" } });

    expect(screen.queryByTestId("success-banner")).not.toBeInTheDocument();
    expect(onClearBanner).toHaveBeenCalled();

    // 3. Changing priority dropdown dismisses banner
    onClearBanner.mockClear();
    rerender(
      <AuthProvider>
        <MyTicketsDashboard
          successBanner="Ticket TKT-2026-00003 created successfully!"
          onClearBanner={onClearBanner}
        />
      </AuthProvider>
    );
    expect(screen.getByTestId("success-banner")).toBeInTheDocument();

    const prioritySelect = screen.getByTestId("priority-filter-select");
    fireEvent.change(prioritySelect, { target: { value: "P0_URGENT" } });

    expect(screen.queryByTestId("success-banner")).not.toBeInTheDocument();
    expect(onClearBanner).toHaveBeenCalled();

    // 4. Changing status dropdown dismisses banner
    onClearBanner.mockClear();
    rerender(
      <AuthProvider>
        <MyTicketsDashboard
          successBanner="Ticket TKT-2026-00004 created successfully!"
          onClearBanner={onClearBanner}
        />
      </AuthProvider>
    );
    expect(screen.getByTestId("success-banner")).toBeInTheDocument();

    const statusSelect = screen.getByTestId("status-filter-select");
    fireEvent.change(statusSelect, { target: { value: "NEW" } });

    expect(screen.queryByTestId("success-banner")).not.toBeInTheDocument();
    expect(onClearBanner).toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.queryByTestId("tickets-loading-spinner")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 13. Table Cell Wrapping & Text Truncation
  // ---------------------------------------------------------------------------
  it("13. Prevents table cell wrapping with whitespace-nowrap and truncates summary with title attribute", async () => {
    render(
      <AuthProvider>
        <MyTicketsDashboard />
      </AuthProvider>
    );

    await screen.findByTestId("ticket-row-101");

    const ticketLink = screen.getByTestId("ticket-link-101");
    expect(ticketLink).toHaveClass("whitespace-nowrap");
    const ticketNoCell = ticketLink.closest("td");
    expect(ticketNoCell).toHaveClass("whitespace-nowrap");

    const row = screen.getByTestId("ticket-row-101");
    const cells = row.querySelectorAll("td");
    expect(cells[0]).toHaveClass("whitespace-nowrap");
    expect(cells[1]).toHaveClass("whitespace-nowrap");
    expect(cells[3]).toHaveClass("whitespace-nowrap");
    expect(cells[4]).toHaveClass("whitespace-nowrap");
    expect(cells[5]).toHaveClass("whitespace-nowrap");
    expect(cells[6]).toHaveClass("whitespace-nowrap");
    expect(cells[7]).toHaveClass("whitespace-nowrap");

    const summaryCell = cells[2];
    expect(summaryCell).toHaveAttribute("title", mockTicketList[0].summary);
    const summaryDiv = summaryCell.querySelector("div");
    expect(summaryDiv).toHaveAttribute("title", mockTicketList[0].summary);
    expect(summaryDiv).toHaveClass("truncate");
    expect(summaryDiv).toHaveClass("font-medium");
    expect(summaryDiv).toHaveClass("max-w-[200px]");
  });
});
