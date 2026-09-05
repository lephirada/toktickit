import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import { RequesterProvider, useRequester } from "../../src/context/RequesterContext.js";
import MyTicketsDashboard from "../../src/components/MyTicketsDashboard.js";
import SelectRequesterScreen from "../../src/components/SelectRequesterScreen.js";

const mockRequesters: api.RequesterUser[] = [
  {
    id: 1,
    email: "sarah.connor@toktickit.com",
    fullName: "Sarah Connor",
    department: "Engineering",
    isActive: true,
  },
  {
    id: 2,
    email: "john.doe@toktickit.com",
    fullName: "John Doe",
    department: "Finance",
    isActive: true,
  },
];

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

describe("Issue 8 — Frontend My Tickets Dashboard & Requester Selection Tests", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("toktickit_requester_id", "1");
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchRequesters").mockResolvedValue(mockRequesters);
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
      <RequesterProvider>
        <MyTicketsDashboard />
      </RequesterProvider>
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
      <RequesterProvider>
        <MyTicketsDashboard />
      </RequesterProvider>
    );

    await screen.findByTestId("ticket-search-input");
    const searchInput = screen.getByTestId("ticket-search-input");

    // Type query
    await user.type(searchInput, "MacBook");

    // Before 300ms debounce timeout, search param is not called yet
    expect(fetchTicketsSpy).not.toHaveBeenCalledWith(
      1,
      expect.objectContaining({ search: "MacBook" })
    );

    // Wait for 300ms debounce
    await waitFor(
      () => {
        expect(fetchTicketsSpy).toHaveBeenCalledWith(
          1,
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
      <RequesterProvider>
        <MyTicketsDashboard />
      </RequesterProvider>
    );

    await screen.findByTestId("category-filter-select");

    // 1. Select Category Hardware (id: 1)
    const categorySelect = screen.getByTestId("category-filter-select");
    await user.selectOptions(categorySelect, "1");

    await waitFor(() => {
      expect(fetchTicketsSpy).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ categoryId: 1, page: 1 })
      );
    });

    // 2. Select Priority P0 Urgent
    const prioritySelect = screen.getByTestId("priority-filter-select");
    await user.selectOptions(prioritySelect, "P0_URGENT");

    await waitFor(() => {
      expect(fetchTicketsSpy).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ categoryId: 1, priority: "P0_URGENT" })
      );
    });

    // 3. Select Status NEW
    const statusSelect = screen.getByTestId("status-filter-select");
    await user.selectOptions(statusSelect, "NEW");

    await waitFor(() => {
      expect(fetchTicketsSpy).toHaveBeenCalledWith(
        1,
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
      <RequesterProvider>
        <MyTicketsDashboard />
      </RequesterProvider>
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
        1,
        expect.not.objectContaining({ status: "RESOLVED" })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Pagination & Page Size
  // ---------------------------------------------------------------------------
  it("5. Pagination interactions request updated page and pageSize parameters", async () => {
    // Mock multi-page data (e.g. 25 total items, 3 pages)
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
      <RequesterProvider>
        <MyTicketsDashboard />
      </RequesterProvider>
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
        1,
        expect.objectContaining({ page: 2, pageSize: 10 })
      );
    });

    // Change Page Size to 20
    const pageSizeSelect = screen.getByTestId("page-size-select");
    await user.selectOptions(pageSizeSelect, "20");

    await waitFor(() => {
      expect(fetchTicketsSpy).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ page: 1, pageSize: 20 })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Empty State & No-Results State
  // ---------------------------------------------------------------------------
  it("6. Renders Empty State when no tickets exist, and No-Results State when filters match nothing", async () => {
    // Mock empty response
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
    const { rerender } = render(
      <RequesterProvider>
        <MyTicketsDashboard />
      </RequesterProvider>
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
  // 7. SelectRequesterScreen Component
  // ---------------------------------------------------------------------------
  it("7. SelectRequesterScreen renders active users, allows selection, updates localStorage, and calls onContinue", async () => {
    const onContinueMock = vi.fn();
    const onCancelMock = vi.fn();
    const user = userEvent.setup();

    render(
      <RequesterProvider>
        <SelectRequesterScreen onContinue={onContinueMock} onCancel={onCancelMock} />
      </RequesterProvider>
    );

    // Verify Screen Elements matching Mockup 8.1
    await screen.findByRole("heading", { name: /Select Development Requester/i });
    expect(screen.getByText(/Choose a development requester to simulate the current requester context/i)).toBeInTheDocument();
    expect(screen.getByText(/Authentication coming in Lab 3/i)).toBeInTheDocument();
    expect(screen.getByText(/Only active development requesters are shown/i)).toBeInTheDocument();

    // Verify Dropdown with active requesters
    const select = screen.getByTestId("requester-dropdown");
    expect(screen.getByText(/Sarah Connor \(Engineering\)/i)).toBeInTheDocument();
    expect(screen.getByText(/John Doe \(Finance\)/i)).toBeInTheDocument();

    // Switch to John Doe (id: 2)
    await user.selectOptions(select, "2");

    // Click Continue
    const continueBtn = screen.getByTestId("continue-button");
    await user.click(continueBtn);

    expect(localStorage.getItem("toktickit_requester_id")).toBe("2");
    expect(onContinueMock).toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // 8. Ticket Navigation to /tickets/:id
  // ---------------------------------------------------------------------------
  it("8. Clicking a ticket number or row triggers navigation to /tickets/:id with corresponding ticket ID", async () => {
    const onViewTicketMock = vi.fn();
    const user = userEvent.setup();

    render(
      <RequesterProvider>
        <MyTicketsDashboard onViewTicket={onViewTicketMock} />
      </RequesterProvider>
    );

    // Wait for table to render
    await screen.findByTestId("ticket-row-101");

    // 1. Verify clicking ticket number (ticketNo) link navigates to /tickets/101
    const ticketLink = screen.getByTestId("ticket-link-101");
    await user.click(ticketLink);

    expect(window.location.pathname).toBe("/tickets/101");
    expect(onViewTicketMock).toHaveBeenCalledWith(101);

    // Reset pathname
    window.history.pushState({}, "", "/my-tickets");

    // 2. Verify clicking ticket row navigates to /tickets/102
    const ticketRow = screen.getByTestId("ticket-row-102");
    await user.click(ticketRow);

    expect(window.location.pathname).toBe("/tickets/102");
    expect(onViewTicketMock).toHaveBeenCalledWith(102);
  });

  // ---------------------------------------------------------------------------
  // 9. Clear Previous Requester Tickets Immediately
  // ---------------------------------------------------------------------------
  it("9. Immediately clears tickets when switching requester so old tickets never linger", async () => {
    let resolveSecondCall: (val: any) => void;
    const secondCallPromise = new Promise((resolve) => {
      resolveSecondCall = resolve;
    });

    vi.spyOn(api, "fetchTickets").mockImplementation(async (reqId) => {
      if (reqId === 1) {
        return {
          data: mockTicketList,
          pagination: { page: 1, pageSize: 10, totalItems: 3, totalPages: 1, hasNext: false, hasPrev: false },
        };
      }
      // Delay response for Requester 2
      await secondCallPromise;
      return {
        data: [
          {
            id: 201,
            ticketNo: "TKT-2026-99999",
            summary: "Requester 2 ticket",
            priority: "P2_MEDIUM",
            status: "NEW",
            categoryId: 1,
            requesterId: 2,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            attachments: [],
          },
        ],
        pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1, hasNext: false, hasPrev: false },
      };
    });

    const user = userEvent.setup();

    function SwitcherTestComponent() {
      const { switchRequester } = useRequester();
      return (
        <div>
          <button data-testid="switch-to-2-btn" onClick={() => switchRequester(2)}>
            Switch to 2
          </button>
          <MyTicketsDashboard />
        </div>
      );
    }

    render(
      <RequesterProvider>
        <SwitcherTestComponent />
      </RequesterProvider>
    );

    // Initial tickets for Requester 1 are shown
    await screen.findByTestId("ticket-row-101");
    expect(screen.getAllByText("TKT-2026-00001").length).toBeGreaterThan(0);

    // Switch requester
    await user.click(screen.getByTestId("switch-to-2-btn"));

    // Immediately, old tickets must be cleared (ticket-row-101 must NOT be in DOM)
    expect(screen.queryByTestId("ticket-row-101")).not.toBeInTheDocument();

    // Now resolve the second API call
    resolveSecondCall!({});
    await screen.findByTestId("ticket-row-201");
    expect(screen.getAllByText("TKT-2026-99999").length).toBeGreaterThan(0);
  });
});
