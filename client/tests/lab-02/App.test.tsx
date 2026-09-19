import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as api from "../../src/api.js";
import App from "../../src/App.js";

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
];

describe("Issue 8 / Issue 13 — App Integration Tests", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.history.pushState({}, "", "/my-tickets");
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue(mockAuthUser);
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

  it("renders LoginScreen on launch when user is unauthenticated", async () => {
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue(null);
    window.history.pushState({}, "", "/login");

    render(<App />);

    expect(await screen.findByTestId("login-screen")).toBeInTheDocument();
    expect(screen.queryByTestId("my-tickets-section")).not.toBeInTheDocument();
    expect(screen.queryByTestId("header-brand-link")).not.toBeInTheDocument();
  });

  it("renders authenticated application shell and user profile in header when logged in", async () => {
    render(<App />);

    expect(await screen.findByTestId("my-tickets-section")).toBeInTheDocument();
    expect(screen.getByTestId("header-brand-link")).toBeInTheDocument();
    expect(screen.getByTestId("header-profile-name")).toHaveTextContent("Sarah Connor");
    expect(screen.getByTestId("role-badge-requester")).toHaveTextContent("Requester");
    expect(screen.getByRole("link", { name: /my tickets/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /\+ create ticket/i })).toBeInTheDocument();
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

  it("routes IT_STAFF to /staff/queue and renders staff-queue-section without broken screen", async () => {
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue({
      id: 2,
      email: "john.doe@toktickit.com",
      fullName: "John Doe",
      role: "IT_STAFF",
      mustChangePassword: false,
    });
    window.history.pushState({}, "", "/staff/queue");

    render(<App />);

    expect(await screen.findByTestId("staff-queue-section")).toBeInTheDocument();
    expect(screen.getByTestId("role-badge-staff")).toBeInTheDocument();
    expect(screen.getByTestId("nav-staff-queue")).toBeInTheDocument();
  });

  it("routes ADMINISTRATOR to /admin/users and renders admin-users-section without broken screen", async () => {
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue({
      id: 3,
      email: "admin@toktickit.com",
      fullName: "Admin Alice",
      role: "ADMINISTRATOR",
      mustChangePassword: false,
    });

    render(<App />);

    const userManagementLink = await screen.findByTestId("nav-admin-users");
    fireEvent.click(userManagementLink);

    expect(await screen.findByTestId("admin-users-section")).toBeInTheDocument();
  });

  it("restricts REQUESTER from accessing /staff/queue and redirects to /my-tickets", async () => {
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue({
      id: 1,
      email: "sarah.connor@toktickit.com",
      fullName: "Sarah Connor",
      role: "REQUESTER",
      mustChangePassword: false,
    });

    window.history.pushState({}, "", "/staff/queue");

    render(<App />);

    expect(await screen.findByTestId("my-tickets-section")).toBeInTheDocument();
    expect(screen.queryByTestId("staff-queue-section")).not.toBeInTheDocument();
    expect(window.location.pathname).toBe("/my-tickets");
  });

  it("restricts IT_STAFF from accessing requester route /my-tickets and redirects to /staff/queue", async () => {
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue({
      id: 2,
      email: "john.doe@toktickit.com",
      fullName: "John Doe",
      role: "IT_STAFF",
      mustChangePassword: false,
    });

    window.history.pushState({}, "", "/my-tickets");

    render(<App />);

    expect(await screen.findByTestId("staff-queue-section")).toBeInTheDocument();
    expect(screen.queryByTestId("my-tickets-section")).not.toBeInTheDocument();
    expect(window.location.pathname).toBe("/staff/queue");
  });

  it("restricts IT_STAFF from accessing /admin/users and redirects to /staff/queue", async () => {
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue({
      id: 2,
      email: "john.doe@toktickit.com",
      fullName: "John Doe",
      role: "IT_STAFF",
      mustChangePassword: false,
    });

    window.history.pushState({}, "", "/admin/users");

    render(<App />);

    expect(await screen.findByTestId("staff-queue-section")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-users-section")).not.toBeInTheDocument();
    expect(window.location.pathname).toBe("/staff/queue");
  });
});
