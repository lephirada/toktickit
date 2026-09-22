import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import * as api from "../../src/api.js";
import StaffTicketQueue from "../../src/components/StaffTicketQueue.js";

const mockCategories: api.Category[] = [
  { id: 1, name: "Account and Access" },
  { id: 2, name: "Hardware" },
  { id: 3, name: "Software" },
  { id: 4, name: "Network" },
];

const mockTickets: api.StaffTicketItem[] = [
  {
    id: 1,
    ticketNo: "TKT-2026-00001",
    summary: "MacBook Pro keyboard key sticking intermittently",
    requestedPriority: "P2_MEDIUM",
    itPriority: "P1_HIGH",
    status: "OPEN",
    resolutionIndicated: true,
    createdAt: "2026-02-01T09:15:00.000Z",
    updatedAt: "2026-02-01T10:00:00.000Z",
    requester: {
      id: 3,
      fullName: "Jennifer Anderson",
      email: "jennifer.anderson@toktickit.com",
    },
    category: { id: 2, name: "Hardware" },
    relatedSystem: { id: 1, name: "Corporate Laptop" },
    owner: { id: 6, fullName: "David Lee", email: "david.lee@toktickit.com" },
  },
  {
    id: 2,
    ticketNo: "TKT-2026-00002",
    summary: "Cannot connect to Campus Wi-Fi in Building 3",
    requestedPriority: "P1_HIGH",
    itPriority: null,
    status: "NEW",
    resolutionIndicated: false,
    createdAt: "2026-02-03T10:30:00.000Z",
    updatedAt: "2026-02-03T10:30:00.000Z",
    requester: {
      id: 2,
      fullName: "John Doe",
      email: "john.doe@toktickit.com",
    },
    category: { id: 4, name: "Network" },
    relatedSystem: null,
    owner: null,
  },
  {
    id: 3,
    ticketNo: "TKT-2026-00003",
    summary: "VPN authentication failure with valid credentials",
    requestedPriority: "P0_URGENT",
    itPriority: "P0_URGENT",
    status: "WAITING_FOR_REQUESTER",
    resolutionIndicated: false,
    createdAt: "2026-02-05T08:00:00.000Z",
    updatedAt: "2026-02-05T08:45:00.000Z",
    requester: {
      id: 1,
      fullName: "Sarah Connor",
      email: "sarah.connor@toktickit.com",
    },
    category: { id: 4, name: "Network" },
    relatedSystem: { id: 3, name: "VPN" },
    owner: { id: 7, fullName: "Alex Morgan" },
  },
];

const mockPagination: api.PaginationMeta = {
  page: 1,
  pageSize: 10,
  totalItems: 3,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
};

describe("Issue 14 — StaffTicketQueue Component Tests (StaffTicketQueue.test.tsx)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchCategories").mockResolvedValue(mockCategories);
    vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
      data: mockTickets,
      pagination: mockPagination,
    });
  });

  // 1. table columns rendering (all 11 required fields present)
  it("Scenario 1: renders all 11 required columns in desktop table view", async () => {
    render(<StaffTicketQueue />);

    await waitFor(() => {
      expect(screen.getByTestId("staff-ticket-table")).toBeInTheDocument();
    });

    expect(screen.getByTestId("col-ticket-no")).toHaveTextContent("Ticket No");
    expect(screen.getByTestId("col-summary")).toHaveTextContent("Summary");
    expect(screen.getByTestId("col-requester")).toHaveTextContent("Requester");
    expect(screen.getByTestId("col-category")).toHaveTextContent("Category");
    expect(screen.getByTestId("col-system")).toHaveTextContent("Related System");
    expect(screen.getByTestId("col-req-priority")).toHaveTextContent("Req Priority");
    expect(screen.getByTestId("sort-column-itPriority")).toHaveTextContent("IT Priority");
    expect(screen.getByTestId("sort-column-status")).toHaveTextContent("Status");
    expect(screen.getByTestId("col-owner")).toHaveTextContent("Assigned Owner");
    expect(screen.getByTestId("sort-column-createdAt")).toHaveTextContent("Created Date");
    expect(screen.getByTestId("sort-column-updatedAt")).toHaveTextContent("Updated Date");
  });

  // 2. status badges rendering for all valid Lab 3 statuses
  it("Scenario 2: renders status badges with correct Lab 3 status classes and text", async () => {
    render(<StaffTicketQueue />);

    await waitFor(() => {
      expect(screen.getByTestId("ticket-row-1")).toBeInTheDocument();
    });

    const row1 = screen.getByTestId("ticket-row-1");
    expect(row1.querySelector(".zg-status-open")).toHaveTextContent("OPEN");

    const row2 = screen.getByTestId("ticket-row-2");
    expect(row2.querySelector(".zg-status-new")).toHaveTextContent("NEW");

    const row3 = screen.getByTestId("ticket-row-3");
    expect(row3.querySelector(".zg-status-waiting")).toHaveTextContent("WAITING FOR REQUESTER");
  });

  // 3. priority display (both requested priority and IT priority)
  it("Scenario 3: renders both requested priority and IT priority clearly", async () => {
    render(<StaffTicketQueue />);

    await waitFor(() => {
      expect(screen.getByTestId("ticket-row-1")).toBeInTheDocument();
    });

    const row1 = screen.getByTestId("ticket-row-1");
    expect(row1.querySelector('[data-testid="queue-req-priority"]')).toHaveTextContent("P2 Medium");
    expect(row1.querySelector('[data-testid="queue-it-priority"]')).toHaveTextContent("P1 High");

    const row2 = screen.getByTestId("ticket-row-2");
    expect(row2.querySelector('[data-testid="queue-it-priority"]')).toHaveTextContent("Not Set");
  });

  // 4. requester and assigned owner display (including unassigned dash)
  it("Scenario 4: renders requester details and assigned owner or unassigned badge", async () => {
    render(<StaffTicketQueue />);

    await waitFor(() => {
      expect(screen.getByTestId("ticket-row-1")).toBeInTheDocument();
    });

    const row1 = screen.getByTestId("ticket-row-1");
    expect(row1.querySelector('[data-testid="queue-requester"]')).toHaveTextContent("Jennifer Anderson");
    expect(row1.querySelector('[data-testid="queue-owner"]')).toHaveTextContent("David Lee");

    const row2 = screen.getByTestId("ticket-row-2");
    expect(row2.querySelector('[data-testid="queue-owner"]')).toHaveTextContent("Unassigned");
  });

  // 5. search input typing and value reflection
  it("Scenario 5: updates search input value synchronously as user types", async () => {
    render(<StaffTicketQueue />);

    const searchInput = screen.getByTestId("queue-search-input") as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: "keyboard" } });
    expect(searchInput.value).toBe("keyboard");
  });

  // 6. debounce behavior (does not trigger API call on every keystroke)
  it("Scenario 6: debounces search input without triggering fetch on every keystroke", async () => {
    const fetchSpy = vi.spyOn(api, "fetchStaffTickets");
    render(<StaffTicketQueue />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    const searchInput = screen.getByTestId("queue-search-input");
    fireEvent.change(searchInput, { target: { value: "k" } });
    fireEvent.change(searchInput, { target: { value: "ke" } });
    fireEvent.change(searchInput, { target: { value: "key" } });

    // Should NOT have triggered additional calls immediately
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  // 7. query execution on debounce completion
  it("Scenario 7: executes API query after debounce timer expires", async () => {
    const fetchSpy = vi.spyOn(api, "fetchStaffTickets");
    render(<StaffTicketQueue />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    const searchInput = screen.getByTestId("queue-search-input");
    fireEvent.change(searchInput, { target: { value: "MacBook" } });

    await waitFor(
      () => {
        expect(fetchSpy).toHaveBeenCalledWith(
          expect.objectContaining({ search: "MacBook", page: 1 })
        );
      },
      { timeout: 1000 }
    );
  });

  // 8. filter toolbar rendering (Category, Req Priority, IT Priority, Status, Owner)
  it("Scenario 8: renders all required filter controls in the toolbar", async () => {
    render(<StaffTicketQueue />);

    expect(screen.getByTestId("queue-search-input")).toBeInTheDocument();
    expect(screen.getByTestId("queue-category-filter")).toBeInTheDocument();
    expect(screen.getByTestId("queue-status-filter")).toBeInTheDocument();
    expect(screen.getByTestId("queue-it-priority-filter")).toBeInTheDocument();
    expect(screen.getByTestId("queue-req-priority-filter")).toBeInTheDocument();
    expect(screen.getByTestId("queue-owner-all")).toBeInTheDocument();
    expect(screen.getByTestId("queue-owner-unassigned")).toBeInTheDocument();
    expect(screen.getByTestId("queue-owner-my-tickets")).toBeInTheDocument();
  });

  // 9. filter changes trigger API query and reset page to 1
  it("Scenario 9: triggers API query with reset to page 1 when filter changes", async () => {
    const fetchSpy = vi.spyOn(api, "fetchStaffTickets");
    render(<StaffTicketQueue />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    const statusSelect = screen.getByTestId("queue-status-filter");
    fireEvent.change(statusSelect, { target: { value: "OPEN" } });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ status: "OPEN", page: 1 })
      );
    });

    const ownerUnassignedBtn = screen.getByTestId("queue-owner-unassigned");
    fireEvent.click(ownerUnassignedBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ owner: "UNASSIGNED", page: 1 })
      );
    });
  });

  // 10. clear / reset filters restores defaults
  it("Scenario 10: restores default filter parameters when Reset Filters is clicked", async () => {
    const fetchSpy = vi.spyOn(api, "fetchStaffTickets");
    render(<StaffTicketQueue />);

    await waitFor(() => {
      expect(screen.getByTestId("staff-ticket-table")).toBeInTheDocument();
    });

    const statusSelect = screen.getByTestId("queue-status-filter");
    fireEvent.change(statusSelect, { target: { value: "OPEN" } });

    await waitFor(() => {
      expect(screen.getByTestId("queue-clear-filters-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("queue-clear-filters-btn"));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          search: undefined,
          categoryId: undefined,
          status: undefined,
          owner: undefined,
          page: 1,
        })
      );
    });
  });

  // 11. pagination controls render page range, size selector, and prev/next buttons
  it("Scenario 11: renders pagination controls with accurate text and disabled states", async () => {
    render(<StaffTicketQueue />);

    await waitFor(() => {
      expect(screen.getByTestId("queue-pagination-footer")).toBeInTheDocument();
    });

    expect(screen.getByTestId("pagination-range-text")).toHaveTextContent("Showing 1 to 3 of 3 tickets");
    expect(screen.getByTestId("page-size-select")).toHaveValue("10");
    expect(screen.getByTestId("prev-page-btn")).toBeDisabled();
    expect(screen.getByTestId("next-page-btn")).toBeDisabled();
  });

  // 12. loading state renders skeleton placeholder rows
  it("Scenario 12: renders skeleton placeholder rows during loading state", async () => {
    vi.spyOn(api, "fetchStaffTickets").mockImplementation(
      () => new Promise(() => {}) // never resolves
    );

    render(<StaffTicketQueue />);
    expect(screen.getByTestId("queue-loading-skeleton")).toBeInTheDocument();
  });

  // 13. empty state displays friendly message when queue is empty
  it("Scenario 13: renders empty queue illustration and message when totalItems is 0 and no filters active", async () => {
    vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
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

    render(<StaffTicketQueue />);

    await waitFor(() => {
      expect(screen.getByTestId("queue-empty-state")).toBeInTheDocument();
    });

    expect(screen.getByText("No tickets in the queue")).toBeInTheDocument();
  });

  // 14. no-results state displays message and Clear Filters button when filters yield 0 rows
  it("Scenario 14: renders no-results message and Clear Filters button when filters match 0 tickets", async () => {
    vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
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

    render(<StaffTicketQueue />);

    const searchInput = screen.getByTestId("queue-search-input");
    fireEvent.change(searchInput, { target: { value: "NonExistent" } });

    await waitFor(() => {
      expect(screen.getByTestId("queue-no-results-state")).toBeInTheDocument();
    });

    expect(screen.getByText("No matching tickets found")).toBeInTheDocument();
    expect(screen.getByTestId("queue-no-results-reset-btn")).toBeInTheDocument();
  });

  // 15. API error state displays alert and retry button
  it("Scenario 15: renders error alert banner with retry button on API failure", async () => {
    vi.spyOn(api, "fetchStaffTickets").mockRejectedValue(new Error("Database connection lost"));

    render(<StaffTicketQueue />);

    await waitFor(() => {
      expect(screen.getByTestId("queue-error-alert")).toBeInTheDocument();
    });

    expect(screen.getByText("Database connection lost")).toBeInTheDocument();
    expect(screen.getByTestId("queue-retry-btn")).toBeInTheDocument();
  });

  // 16. mobile card rendering exposes all 11 required fields on small viewports
  it("Scenario 16: renders mobile cards exposing all required fields", async () => {
    render(<StaffTicketQueue />);

    await waitFor(() => {
      expect(screen.getByTestId("staff-ticket-cards")).toBeInTheDocument();
    });

    const cards = screen.getAllByTestId("mobile-ticket-card");
    expect(cards.length).toBe(3);

    // First card checks
    expect(cards[0]).toHaveTextContent("TKT-2026-00001");
    expect(cards[0]).toHaveTextContent("MacBook Pro keyboard key sticking intermittently");
    expect(cards[0]).toHaveTextContent("Jennifer Anderson");
    expect(cards[0]).toHaveTextContent("Hardware");
    expect(cards[0]).toHaveTextContent("Corporate Laptop");
    expect(cards[0]).toHaveTextContent("IT: P1 High");
    expect(cards[0]).toHaveTextContent("Req: P2 Medium");
    expect(cards[0]).toHaveTextContent("OPEN");
    expect(cards[0]).toHaveTextContent("David Lee");
    expect(cards[0]).toHaveTextContent("Requester Confirmed Resolved");

    // Second card checks (with null relatedSystem and unassigned owner)
    expect(cards[1]).toHaveTextContent("TKT-2026-00002");
    expect(cards[1]).toHaveTextContent("System: —");
    expect(cards[1]).toHaveTextContent("Unassigned");
  });

  // 17. no duplicate navigation or filter controls
  it("Scenario 17: does not render duplicate filter bars or navigation items", async () => {
    render(<StaffTicketQueue />);

    await waitFor(() => {
      expect(screen.getByTestId("staff-ticket-queue-view")).toBeInTheDocument();
    });

    expect(screen.getAllByTestId("queue-search-input").length).toBe(1);
    expect(screen.getAllByTestId("queue-category-filter").length).toBe(1);
    expect(screen.getAllByTestId("queue-status-filter").length).toBe(1);
  });

  // 18. important accessibility attributes (table headers, aria-labels, test IDs)
  it("Scenario 18: includes proper accessible headers, test IDs, and labels", async () => {
    render(<StaffTicketQueue />);

    await waitFor(() => {
      expect(screen.getByTestId("staff-ticket-table")).toBeInTheDocument();
    });

    const thElements = screen.getAllByRole("columnheader");
    expect(thElements.length).toBe(11);

    expect(screen.getByLabelText("Search Tickets")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Ticket Owner Scope" })).toBeInTheDocument();
  });

  // 19. collapsible filter drawer toggle and active filter count badge
  it("Scenario 19: toggles collapsible filter drawer and displays active filter count badge", async () => {
    render(<StaffTicketQueue />);

    await waitFor(() => {
      expect(screen.getByTestId("queue-filter-drawer-toggle")).toBeInTheDocument();
    });

    const toggleBtn = screen.getByTestId("queue-filter-drawer-toggle");
    expect(toggleBtn).toHaveAttribute("aria-expanded", "false");
    expect(toggleBtn).toHaveTextContent("Filters (4)");
    expect(screen.queryByTestId("queue-filter-active-count")).not.toBeInTheDocument();

    // Toggle open
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute("aria-expanded", "true");

    // Select category filter
    const categorySelect = screen.getByTestId("queue-category-filter");
    fireEvent.change(categorySelect, { target: { value: "1" } });

    // Active count badge should show 1
    await waitFor(() => {
      expect(screen.getByTestId("queue-filter-active-count")).toHaveTextContent("1");
    });

    // Toggle closed
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute("aria-expanded", "false");
  });
});
