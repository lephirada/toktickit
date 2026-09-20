import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import * as api from "../../src/api.js";
import App from "../../src/App.js";

const mockAuthUser: api.AuthUser = {
  id: 1,
  email: "sarah@test.com",
  fullName: "Sarah Connor",
  role: "REQUESTER",
  mustChangePassword: false,
};

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.history.pushState({}, "", "/my-tickets");
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue(mockAuthUser);
    vi.spyOn(api, "fetchCategories").mockResolvedValue([{ id: 1, name: "Hardware" }]);
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1, hasNext: false, hasPrev: false },
    });
  });

  it("renders the TokTickIT heading", async () => {
    render(<App />);
    await screen.findByTestId("header-brand-link");
    expect(screen.getAllByText(/TokTickIT/i).length).toBeGreaterThan(0);
  });

  it("shows Online and the categories returned by the API on success", async () => {
    vi.spyOn(api, "checkSystem").mockResolvedValue({
      online: true,
      categories: [
        { id: 99, name: "Test Category" },
        { id: 100, name: "Special Request" },
      ],
    });

    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: /check system/i }));

    expect(await screen.findByText(/System Status: Online/i)).toBeInTheDocument();
    expect(screen.getByText("Supported Request Categories")).toBeInTheDocument();
    expect(screen.getByText("Test Category")).toBeInTheDocument();
    expect(screen.getByText("Special Request")).toBeInTheDocument();
  });

  it("shows an Offline error message when the API is unavailable", async () => {
    vi.spyOn(api, "checkSystem").mockRejectedValue(
      new Error("Unable to connect to TokTickIT API")
    );

    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: /check system/i }));

    expect(await screen.findByText(/System Status: Offline/i)).toBeInTheDocument();
    expect(screen.getByText(/Unable to connect to TokTickIT API/i)).toBeInTheDocument();
  });

  it("clicking the Profile button in Header displays user profile menu", async () => {
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1, hasNext: false, hasPrev: false },
    });

    render(<App />);

    const profileBtn = await screen.findByTestId("header-profile-button");
    fireEvent.click(profileBtn);

    expect(await screen.findByTestId("header-user-dropdown")).toBeInTheDocument();
    expect(screen.getByText("sarah@test.com")).toBeInTheDocument();
  });

  it("clicking a ticket number navigates to /tickets/:id and transitions to ticket detail view", async () => {
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      data: [
        {
          id: 101,
          ticketNo: "TKT-2026-00001",
          summary: "MacBook keyboard issue",
          priority: "P0_URGENT",
          status: "NEW",
          categoryId: 1,
          requesterId: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          attachments: [],
        },
      ],
      pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1, hasNext: false, hasPrev: false },
    });

    render(<App />);

    const ticketLink = await screen.findByTestId("ticket-link-101");
    fireEvent.click(ticketLink);

    expect(window.location.pathname).toBe("/tickets/101");
    expect(await screen.findByTestId("ticket-detail-section")).toBeInTheDocument();
    expect(screen.getByTestId("ticket-detail-id")).toHaveTextContent("Ticket ID: 101");
  });
});
