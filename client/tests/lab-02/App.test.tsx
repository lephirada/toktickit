import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as api from "../../src/api.js";
import App from "../../src/App.js";

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
];

describe("Issue 8 — App Integration Tests", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("toktickit_requester_id", "1");
    window.history.pushState({}, "", "/my-tickets");
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchRequesters").mockResolvedValue(mockRequesters);
    vi.spyOn(api, "fetchCategories").mockResolvedValue(mockCategories);
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      data: [],
      pagination: {
        page: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    });
  });

  it("renders SelectRequesterScreen when the Profile button is clicked in the header", async () => {
    render(<App />);

    // 1. Locate the Profile button in the header
    const profileBtn =
      (await screen.findByRole("button", { name: /profile/i })) ||
      screen.getByTestId("header-profile-btn");
    expect(profileBtn).toBeInTheDocument();

    // 2. Click the Profile button
    fireEvent.click(profileBtn);

    // 3. Verify that SelectRequesterScreen content is now visible in the DOM
    expect(
      await screen.findByRole("heading", { name: /select development requester/i })
    ).toBeInTheDocument();
    expect(screen.getByTestId("requester-dropdown")).toBeInTheDocument();
  });

  it("renders SelectRequesterScreen on launch when localStorage has no active requester", async () => {
    localStorage.clear();
    window.history.pushState({}, "", "/my-tickets");

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: /select development requester/i })
    ).toBeInTheDocument();
    expect(screen.getByTestId("select-requester-screen")).toBeInTheDocument();
    expect(screen.queryByTestId("my-tickets-section")).not.toBeInTheDocument();

    // Verify navigation links and profile button are hidden when no requester is active
    expect(screen.queryByRole("link", { name: /my tickets/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /\+ create ticket/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId("header-profile-button")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /toktickit home/i })).toBeInTheDocument();
  });

  it("selecting a requester and clicking Continue saves requester to localStorage and transitions to MyTicketsDashboard", async () => {
    localStorage.clear();
    window.history.pushState({}, "", "/my-tickets");

    render(<App />);

    await screen.findByRole("heading", { name: /select development requester/i });

    // Initially hidden
    expect(screen.queryByRole("link", { name: /my tickets/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /\+ create ticket/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId("header-profile-button")).not.toBeInTheDocument();

    const select = screen.getByTestId("requester-dropdown");
    fireEvent.change(select, { target: { value: "1" } });

    const continueBtn = screen.getByTestId("continue-button");
    fireEvent.click(continueBtn);

    expect(localStorage.getItem("toktickit_requester_id")).toBe("1");
    expect(await screen.findByTestId("my-tickets-section")).toBeInTheDocument();
    expect(screen.queryByTestId("select-requester-screen")).not.toBeInTheDocument();

    // Now navigation links and profile button are visible
    expect(await screen.findByRole("link", { name: /my tickets/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /\+ create ticket/i })).toBeInTheDocument();
    expect(screen.getByTestId("header-profile-button")).toBeInTheDocument();
  });

  it("clears success banner on manual dismissal and when navigating away from My Tickets", async () => {
    vi.spyOn(api, "fetchCategories").mockResolvedValue([
      { id: 1, name: "Hardware" },
    ]);
    vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue([
      { id: 10, name: "Laptop", categoryId: 1 },
    ]);
    vi.spyOn(api, "createTicket").mockResolvedValue({
      data: {
        id: 999,
        ticketNo: "TKT-2026-00999",
        summary: "Broken keyboard",
        description: "Keys sticking",
        priority: "P0_URGENT",
        status: "NEW",
        categoryId: 1,
        relatedSystemId: 10,
        requesterId: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        attachments: [],
      },
    });

    render(<App />);

    // Navigate to create ticket view
    const createNav = await screen.findByRole("link", { name: /\+ create ticket/i });
    fireEvent.click(createNav);

    expect(await screen.findByTestId("create-ticket-section")).toBeInTheDocument();

    // Fill out form
    const categorySelect = screen.getByLabelText(/Category/i);
    fireEvent.change(categorySelect, { target: { value: "1" } });

    const systemSelect = await screen.findByLabelText(/Related System/i);
    fireEvent.change(systemSelect, { target: { value: "10" } });

    fireEvent.change(screen.getByLabelText(/Summary/i), {
      target: { value: "Broken keyboard" },
    });
    fireEvent.change(screen.getByLabelText(/Description/i), {
      target: { value: "Keys sticking very badly" },
    });

    // Submit form
    fireEvent.click(screen.getByTestId("submit-ticket-btn"));

    await waitFor(() => {
      expect(api.createTicket).toHaveBeenCalled();
    });
    expect(screen.getByTestId("success-banner")).toBeInTheDocument();

    // Test navigating away clears the banner
    fireEvent.click(screen.getByRole("link", { name: /\+ create ticket/i }));
    expect(screen.queryByTestId("success-banner")).not.toBeInTheDocument();
  });
});
