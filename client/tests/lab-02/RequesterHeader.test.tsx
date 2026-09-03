import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import { RequesterProvider, useRequester } from "../../src/context/RequesterContext.js";
import Header from "../../src/components/Header.js";
import DirtyGuardModal from "../../src/components/DirtyGuardModal.js";

const mockRequesters: api.RequesterUser[] = [
  {
    id: 1,
    fullName: "Sarah Connor",
    email: "sarah.connor@toktickit.com",
    department: "Engineering",
    isActive: true,
  },
  {
    id: 2,
    fullName: "John Doe",
    email: "john.doe@toktickit.com",
    department: "Finance",
    isActive: true,
  },
  {
    id: 3,
    fullName: "Jennifer Anderson",
    email: "jennifer.anderson@toktickit.com",
    department: "Engineering",
    isActive: true,
  },
];

const mockTicketsByRequester: Record<number, api.TicketItem[]> = {
  1: [
    {
      id: 101,
      ticketNo: "TKT-2026-00001",
      summary: "VPN Connection Drop",
      priority: "P1_HIGH",
      status: "NEW",
      categoryId: 4,
      requesterId: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  2: [
    {
      id: 102,
      ticketNo: "TKT-2026-00002",
      summary: "Payroll Portal Access",
      priority: "P2_MEDIUM",
      status: "NEW",
      categoryId: 1,
      requesterId: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
};

function TestApp() {
  const { currentRequester, isFormDirty, setFormDirty, tickets, ticketsLoading } = useRequester();

  return (
    <div>
      <Header />
      <DirtyGuardModal />
      <div data-testid="current-requester-id">{currentRequester?.id}</div>
      <div data-testid="current-requester-name">{currentRequester?.fullName}</div>
      <div data-testid="is-dirty">{isFormDirty ? "dirty" : "clean"}</div>
      <button onClick={() => setFormDirty(true)}>Make Form Dirty</button>
      <button onClick={() => setFormDirty(false)}>Clean Form</button>

      <div data-testid="tickets-loading">{ticketsLoading ? "loading" : "idle"}</div>
      <ul data-testid="ticket-list">
        {tickets.map((t) => (
          <li key={t.id} data-testid={`ticket-${t.id}`}>
            {t.ticketNo} - {t.summary}
          </li>
        ))}
      </ul>
    </div>
  );
}

describe("Issue 6 — Requester Context & Header Component Tests", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("fetches active requesters and displays them in the header dropdown", async () => {
    vi.spyOn(api, "fetchRequesters").mockResolvedValue(mockRequesters);
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0, hasNext: false, hasPrev: false },
    });

    render(
      <RequesterProvider>
        <TestApp />
      </RequesterProvider>
    );

    // Wait for dropdown options to be populated
    await screen.findByRole("option", { name: /Sarah Connor/i });

    const selectElement = screen.getByRole("combobox", {
      name: /select active requester/i,
    });

    expect(selectElement).toBeInTheDocument();
    expect(screen.getByText("Sarah Connor (Engineering)")).toBeInTheDocument();
    expect(screen.getByText("John Doe (Finance)")).toBeInTheDocument();
    expect(screen.getByText("Jennifer Anderson (Engineering)")).toBeInTheDocument();

    expect(screen.getByTestId("current-requester-name")).toHaveTextContent("Sarah Connor");
    expect(localStorage.getItem("toktickit_requester_id")).toBe("1");
  });

  it("restores previously selected requester from localStorage", async () => {
    localStorage.setItem("toktickit_requester_id", "2");
    vi.spyOn(api, "fetchRequesters").mockResolvedValue(mockRequesters);
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0, hasNext: false, hasPrev: false },
    });

    render(
      <RequesterProvider>
        <TestApp />
      </RequesterProvider>
    );

    // Wait for option 2 to be rendered
    await screen.findByRole("option", { name: /John Doe/i });

    const selectElement = screen.getByRole("combobox", {
      name: /select active requester/i,
    });

    await waitFor(() => {
      expect(selectElement).toHaveValue("2");
      expect(screen.getByTestId("current-requester-name")).toHaveTextContent("John Doe");
    });
  });

  it("updates localStorage and active context when a new requester is selected", async () => {
    vi.spyOn(api, "fetchRequesters").mockResolvedValue(mockRequesters);
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0, hasNext: false, hasPrev: false },
    });
    const user = userEvent.setup();

    render(
      <RequesterProvider>
        <TestApp />
      </RequesterProvider>
    );

    // Wait for options to load before attempting selection
    await screen.findByRole("option", { name: /John Doe/i });

    const selectElement = screen.getByRole("combobox", {
      name: /select active requester/i,
    });

    await user.selectOptions(selectElement, "2");

    expect(screen.getByTestId("current-requester-name")).toHaveTextContent("John Doe");
    expect(localStorage.getItem("toktickit_requester_id")).toBe("2");
  });

  it("clears old state and reloads requester-specific tickets via api.fetchTickets when context changes", async () => {
    vi.spyOn(api, "fetchRequesters").mockResolvedValue(mockRequesters);
    const fetchTicketsSpy = vi.spyOn(api, "fetchTickets").mockImplementation(async (reqId) => {
      const items = mockTicketsByRequester[reqId || 1] || [];
      return {
        data: items,
        pagination: { page: 1, pageSize: 10, totalItems: items.length, totalPages: 1, hasNext: false, hasPrev: false },
      };
    });
    const user = userEvent.setup();

    render(
      <RequesterProvider>
        <TestApp />
      </RequesterProvider>
    );

    // Verify Requester 1 (Sarah) tickets loaded initially
    await screen.findByRole("option", { name: /Sarah Connor/i });
    await waitFor(() => {
      expect(screen.getByTestId("ticket-101")).toHaveTextContent("VPN Connection Drop");
    });
    expect(fetchTicketsSpy).toHaveBeenCalledWith(1);

    // Wait for option 2 to be present
    await screen.findByRole("option", { name: /John Doe/i });
    const selectElement = screen.getByRole("combobox", {
      name: /select active requester/i,
    });

    // Switch to Requester 2 (John)
    await user.selectOptions(selectElement, "2");

    // Verify Sarah's ticket cleared and John's ticket loaded
    await waitFor(() => {
      expect(screen.queryByTestId("ticket-101")).not.toBeInTheDocument();
      expect(screen.getByTestId("ticket-102")).toHaveTextContent("Payroll Portal Access");
    });
    expect(fetchTicketsSpy).toHaveBeenCalledWith(2);
  });

  it("intercepts requester switch with dirty guard modal and reloads tickets only upon confirming discard", async () => {
    vi.spyOn(api, "fetchRequesters").mockResolvedValue(mockRequesters);
    const fetchTicketsSpy = vi.spyOn(api, "fetchTickets").mockImplementation(async (reqId) => {
      const items = mockTicketsByRequester[reqId || 1] || [];
      return {
        data: items,
        pagination: { page: 1, pageSize: 10, totalItems: items.length, totalPages: 1, hasNext: false, hasPrev: false },
      };
    });
    const user = userEvent.setup();

    render(
      <RequesterProvider>
        <TestApp />
      </RequesterProvider>
    );

    await screen.findByRole("option", { name: /Sarah Connor/i });
    await waitFor(() => {
      expect(screen.getByTestId("ticket-101")).toHaveTextContent("VPN Connection Drop");
    });

    // Make form dirty
    await user.click(screen.getByRole("button", { name: /make form dirty/i }));
    expect(screen.getByTestId("is-dirty")).toHaveTextContent("dirty");

    // Wait for dropdown option 2
    await screen.findByRole("option", { name: /John Doe/i });
    const selectElement = screen.getByRole("combobox", {
      name: /select active requester/i,
    });

    // Attempt to switch to John Doe (ID: 2)
    await user.selectOptions(selectElement, "2");

    // Modal appears, requester and tickets must NOT switch yet
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("current-requester-name")).toHaveTextContent("Sarah Connor");
    expect(screen.getByTestId("ticket-101")).toBeInTheDocument();

    // Click "Cancel" (or "Cancel / Stay" per ui-spec)
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("current-requester-name")).toHaveTextContent("Sarah Connor");
    expect(screen.getByTestId("ticket-101")).toBeInTheDocument();
    expect(screen.getByTestId("is-dirty")).toHaveTextContent("dirty");

    // Attempt switch again and click "Discard Changes"
    await user.selectOptions(selectElement, "2");
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /discard changes/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("current-requester-name")).toHaveTextContent("John Doe");
    expect(screen.getByTestId("is-dirty")).toHaveTextContent("clean");
    expect(localStorage.getItem("toktickit_requester_id")).toBe("2");

    // Verify Sarah's ticket cleared and John's ticket reloaded
    await waitFor(() => {
      expect(screen.queryByTestId("ticket-101")).not.toBeInTheDocument();
      expect(screen.getByTestId("ticket-102")).toHaveTextContent("Payroll Portal Access");
    });
    expect(fetchTicketsSpy).toHaveBeenCalledWith(2);
  });
});
