import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as api from "../../src/api.js";
import { ActionsTakenSection } from "../../src/components/ActionsTakenSection.js";

const mockActions: api.ActionTakenItem[] = [
  {
    id: 1,
    ticketId: 101,
    actionType: "INVESTIGATION",
    timeSpentMinutes: 45,
    performedAt: "2026-02-01T10:30:00.000Z",
    performedById: 6,
    performedBy: {
      id: 6,
      fullName: "David Lee",
      email: "david.lee@toktickit.com",
      role: "IT_STAFF",
    },
    description: "Inspected network logs and identified excessive database query spikes.",
    result: "Confirmed query loop in backend worker service.",
    followUpRequired: true,
    followUpNote: "Apply query optimization patch and verify connection pool metrics.",
    attachmentNotes: "Attached latency_spike.png screenshot to ticket.",
    createdAt: "2026-02-01T10:35:00.000Z",
    updatedAt: "2026-02-01T10:35:00.000Z",
  },
  {
    id: 2,
    ticketId: 101,
    actionType: "REPAIR",
    timeSpentMinutes: 90,
    performedAt: "2026-02-01T14:00:00.000Z",
    performedById: 7,
    performedBy: {
      id: 7,
      fullName: "Sarah Connor",
      email: "sarah.connor@toktickit.com",
      role: "IT_STAFF",
    },
    description: "Deployed hotfix for connection pooling and restarted affected replica instances.",
    result: "Replica latency returned to baseline < 5ms.",
    followUpRequired: false,
    followUpNote: null,
    attachmentNotes: null,
    createdAt: "2026-02-01T15:30:00.000Z",
    updatedAt: "2026-02-01T15:30:00.000Z",
  },
];

describe("ActionsTakenSection Component (Lab 4 Issue #23)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AC-23-01: renders actions timeline with formatted badges, details, and duration", async () => {
    vi.spyOn(api, "fetchTicketActions").mockResolvedValue({
      data: mockActions,
      totalDurationMinutes: 135,
    });

    render(
      <ActionsTakenSection
        ticketId={101}
        ticketStatus="IN_PROGRESS"
        isStaffOrAdmin={true}
      />
    );

    // Shows loading indicator initially
    expect(screen.getByTestId("actions-loading")).toBeInTheDocument();

    // Waits for actions to load
    await waitFor(() => {
      expect(screen.getByTestId("actions-taken-card")).toBeInTheDocument();
    });

    // Header count and total time
    expect(screen.getByText(/Actions Taken \(2\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Total logged: 2h 15m/i)).toBeInTheDocument();

    // Badges and types
    expect(screen.getByText("INVESTIGATION")).toBeInTheDocument();
    expect(screen.getByText("REPAIR")).toBeInTheDocument();

    // Duration badges
    expect(screen.getByText(/45m/)).toBeInTheDocument();
    expect(screen.getByText(/1h 30m/)).toBeInTheDocument();

    // Staff names
    expect(screen.getByText(/David Lee/i)).toBeInTheDocument();
    expect(screen.getByText(/Sarah Connor/i)).toBeInTheDocument();

    // Descriptions and results
    expect(
      screen.getByText(/Inspected network logs and identified excessive database query spikes./i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Confirmed query loop in backend worker service./i)).toBeInTheDocument();

    // Follow-up required badge and note
    expect(screen.getByText(/Follow-up Required/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Apply query optimization patch and verify connection pool metrics./i)
    ).toBeInTheDocument();

    // Attachment notes
    expect(screen.getByText(/Attached latency_spike.png screenshot to ticket./i)).toBeInTheDocument();
  });

  it("AC-23-01: renders empty well when no actions have been logged yet", async () => {
    vi.spyOn(api, "fetchTicketActions").mockResolvedValue({
      data: [],
      totalDurationMinutes: 0,
    });

    render(
      <ActionsTakenSection
        ticketId={101}
        ticketStatus="OPEN"
        isStaffOrAdmin={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("actions-empty-state")).toBeInTheDocument();
    });

    expect(screen.getByText(/No actions taken logged yet/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Document diagnostic steps, configurations, or repairs performed on this ticket./i)
    ).toBeInTheDocument();
  });

  it("AC-23-01: displays error message with retry button on API failure", async () => {
    vi.spyOn(api, "fetchTicketActions").mockRejectedValue(
      new api.ApiError("Failed to retrieve actions due to server outage.", "SERVER_ERROR", undefined, 500)
    );

    render(
      <ActionsTakenSection
        ticketId={101}
        ticketStatus="IN_PROGRESS"
        isStaffOrAdmin={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("actions-error-alert")).toBeInTheDocument();
    });

    expect(screen.getByText(/Failed to retrieve actions due to server outage./i)).toBeInTheDocument();

    // Retry functionality
    const retryBtn = screen.getByRole("button", { name: /Retry/i });
    expect(retryBtn).toBeInTheDocument();

    vi.spyOn(api, "fetchTicketActions").mockResolvedValue({
      data: mockActions,
      totalDurationMinutes: 135,
    });

    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText("INVESTIGATION")).toBeInTheDocument();
    });
  });

  it("AC-23-02: completely omits create and edit controls from DOM for Requester (role authorization)", async () => {
    vi.spyOn(api, "fetchTicketActions").mockResolvedValue({
      data: mockActions,
      totalDurationMinutes: 135,
    });

    render(
      <ActionsTakenSection
        ticketId={101}
        ticketStatus="IN_PROGRESS"
        isStaffOrAdmin={false} // REQUESTER role
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("actions-taken-card")).toBeInTheDocument();
    });

    // The timeline content IS visible to the requester
    expect(screen.getByText("INVESTIGATION")).toBeInTheDocument();
    expect(screen.getByText(/David Lee/i)).toBeInTheDocument();

    // Strict DOM omission: Log Action Taken button must NOT exist in the DOM
    expect(screen.queryByTestId("log-action-btn")).toBeNull();
    expect(screen.queryByRole("button", { name: /\+ log action taken/i })).toBeNull();

    // Strict DOM omission: Edit buttons on action items must NOT exist in the DOM
    expect(screen.queryAllByTestId("edit-action-btn")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: /^edit$/i })).toBeNull();
  });

  it("AC-23-02: renders Log Action and Edit buttons for Staff/Admin when ticket is active", async () => {
    vi.spyOn(api, "fetchTicketActions").mockResolvedValue({
      data: mockActions,
      totalDurationMinutes: 135,
    });

    render(
      <ActionsTakenSection
        ticketId={101}
        ticketStatus="IN_PROGRESS"
        isStaffOrAdmin={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("log-action-btn")).toBeInTheDocument();
    });

    const editBtns = screen.getAllByTestId("edit-action-btn");
    expect(editBtns).toHaveLength(2);
  });

  it("AC-23-02: disables/omits mutation controls when ticket status is terminal (CLOSED/CANCELLED)", async () => {
    vi.spyOn(api, "fetchTicketActions").mockResolvedValue({
      data: mockActions,
      totalDurationMinutes: 135,
    });

    render(
      <ActionsTakenSection
        ticketId={101}
        ticketStatus="CLOSED"
        isStaffOrAdmin={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("actions-taken-card")).toBeInTheDocument();
    });

    // Log Action button and Edit buttons are absent when terminal
    expect(screen.queryByTestId("log-action-btn")).toBeNull();
    expect(screen.queryAllByTestId("edit-action-btn")).toHaveLength(0);
    expect(screen.getByText(/Locked for closed\/cancelled tickets/i)).toBeInTheDocument();
  });

  it("AC-23-07: maintains responsive structure with word-wrap and responsive container classes", async () => {
    vi.spyOn(api, "fetchTicketActions").mockResolvedValue({
      data: mockActions,
      totalDurationMinutes: 135,
    });

    render(
      <ActionsTakenSection
        ticketId={101}
        ticketStatus="IN_PROGRESS"
        isStaffOrAdmin={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("actions-taken-card")).toBeInTheDocument();
    });

    const card = screen.getByTestId("actions-taken-card");
    expect(card).toHaveClass("card", "border", "shadow-sm", "rounded-4", "mb-4");

    const actionItems = screen.getAllByTestId(/^action-item-/);
    expect(actionItems).toHaveLength(2);
    actionItems.forEach((item) => {
      expect(item).toHaveClass("p-3", "p-md-4", "rounded-3", "border");
    });
  });
});
