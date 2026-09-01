import React, { useEffect, useState } from "react";
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

interface MockTicket {
  id: number;
  ticketNo: string;
  summary: string;
  requesterId: number;
}

const mockTicketsByRequester: Record<number, MockTicket[]> = {
  1: [{ id: 101, ticketNo: "TKT-2026-00001", summary: "VPN Connection Drop", requesterId: 1 }],
  2: [{ id: 102, ticketNo: "TKT-2026-00002", summary: "Payroll Portal Access", requesterId: 2 }],
};

// Component simulating requester-specific ticket reloading
function TicketDashboardApp() {
  const { currentRequester, isFormDirty, setFormDirty } = useRequester();
  const [tickets, setTickets] = useState<MockTicket[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentRequester) {
      setTickets([]);
      return;
    }

    // Step 1: Clear previous requester-specific ticket state immediately upon requester change
    setTickets([]);
    setLoading(true);

    // Step 2: Reload tickets for the newly selected requester
    const reqId = currentRequester.id;
    const timer = setTimeout(() => {
      setTickets(mockTicketsByRequester[reqId] || []);
      setLoading(false);
    }, 10);

    return () => clearTimeout(timer);
  }, [currentRequester?.id]);

  return (
    <div>
      <Header />
      <DirtyGuardModal />
      <div data-testid="current-requester-id">{currentRequester?.id}</div>
      <div data-testid="current-requester-name">{currentRequester?.fullName}</div>
      <div data-testid="is-dirty">{isFormDirty ? "dirty" : "clean"}</div>
      <button onClick={() => setFormDirty(true)}>Make Form Dirty</button>
      <button onClick={() => setFormDirty(false)}>Clean Form</button>

      <div data-testid="tickets-loading">{loading ? "loading" : "idle"}</div>
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

    render(
      <RequesterProvider>
        <TicketDashboardApp />
      </RequesterProvider>
    );

    const selectElement = await screen.findByRole("combobox", {
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

    render(
      <RequesterProvider>
        <TicketDashboardApp />
      </RequesterProvider>
    );

    const selectElement = await screen.findByRole("combobox", {
      name: /select active requester/i,
    });

    await waitFor(() => {
      expect(selectElement).toHaveValue("2");
      expect(screen.getByTestId("current-requester-name")).toHaveTextContent("John Doe");
    });
  });

  it("updates localStorage and active context when a new requester is selected", async () => {
    vi.spyOn(api, "fetchRequesters").mockResolvedValue(mockRequesters);
    const user = userEvent.setup();

    render(
      <RequesterProvider>
        <TicketDashboardApp />
      </RequesterProvider>
    );

    const selectElement = await screen.findByRole("combobox", {
      name: /select active requester/i,
    });

    await user.selectOptions(selectElement, "2");

    expect(screen.getByTestId("current-requester-name")).toHaveTextContent("John Doe");
    expect(localStorage.getItem("toktickit_requester_id")).toBe("2");
  });

  it("clears old state and reloads requester-specific tickets when context changes", async () => {
    vi.spyOn(api, "fetchRequesters").mockResolvedValue(mockRequesters);
    const user = userEvent.setup();

    render(
      <RequesterProvider>
        <TicketDashboardApp />
      </RequesterProvider>
    );

    const selectElement = await screen.findByRole("combobox", {
      name: /select active requester/i,
    });

    // Verify Requester 1 (Sarah) tickets loaded
    await waitFor(() => {
      expect(screen.getByTestId("ticket-101")).toHaveTextContent("VPN Connection Drop");
    });

    // Switch to Requester 2 (John)
    await user.selectOptions(selectElement, "2");

    // Sarah's ticket should be cleared and John's ticket reloaded
    await waitFor(() => {
      expect(screen.queryByTestId("ticket-101")).not.toBeInTheDocument();
      expect(screen.getByTestId("ticket-102")).toHaveTextContent("Payroll Portal Access");
    });
  });

  it("intercepts requester switch with dirty guard modal and reloads tickets only upon confirming discard", async () => {
    vi.spyOn(api, "fetchRequesters").mockResolvedValue(mockRequesters);
    const user = userEvent.setup();

    render(
      <RequesterProvider>
        <TicketDashboardApp />
      </RequesterProvider>
    );

    const selectElement = await screen.findByRole("combobox", {
      name: /select active requester/i,
    });

    await waitFor(() => {
      expect(screen.getByTestId("ticket-101")).toHaveTextContent("VPN Connection Drop");
    });

    // Make form dirty
    await user.click(screen.getByRole("button", { name: /make form dirty/i }));
    expect(screen.getByTestId("is-dirty")).toHaveTextContent("dirty");

    // Attempt to switch to John Doe (ID: 2)
    await user.selectOptions(selectElement, "2");

    // Modal appears, requester and tickets must NOT switch yet
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("current-requester-name")).toHaveTextContent("Sarah Connor");
    expect(screen.getByTestId("ticket-101")).toBeInTheDocument();

    // Click "Cancel / Stay"
    await user.click(screen.getByRole("button", { name: /cancel \/ stay/i }));
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
  });
});
