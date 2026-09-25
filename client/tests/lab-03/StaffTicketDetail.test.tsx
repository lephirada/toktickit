import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as api from "../../src/api.js";
import { StaffTicketDetail } from "../../src/components/StaffTicketDetail.js";

const mockCurrentUser: api.AuthUser = {
  id: 6,
  email: "david.lee@toktickit.com",
  fullName: "David Lee",
  role: "IT_STAFF",
  mustChangePassword: false,
};

const mockStaffUsers: api.StaffUserItem[] = [
  { id: 6, fullName: "David Lee", email: "david.lee@toktickit.com", role: "IT_STAFF" },
  { id: 7, fullName: "Sarah Connor", email: "sarah.connor@toktickit.com", role: "IT_STAFF" },
  { id: 10, fullName: "System Administrator", email: "admin@toktickit.com", role: "ADMINISTRATOR" },
];

const mockTicketData: api.StaffTicketDetailData = {
  id: 101,
  ticketNo: "TKT-2026-00101",
  summary: "Database connection intermittent latency",
  description: "The primary database replica is experiencing occasional timeouts under heavy load.",
  priority: "P2_MEDIUM",
  requestedPriority: "P2_MEDIUM",
  itPriority: "P1_HIGH",
  status: "OPEN",
  resolutionIndicated: true,
  categoryId: 2,
  requesterId: 3,
  createdAt: "2026-02-01T09:15:00.000Z",
  updatedAt: "2026-02-01T10:00:00.000Z",
  requester: {
    id: 3,
    fullName: "Jennifer Anderson",
    email: "jennifer.anderson@toktickit.com",
    department: "Engineering",
  },
  category: { id: 2, name: "Hardware" },
  relatedSystem: { id: 1, name: "Database Server" },
  ownerId: 6,
  owner: { id: 6, fullName: "David Lee", email: "david.lee@toktickit.com", role: "IT_STAFF" },
  attachments: [
    {
      id: 1,
      originalName: "latency_graph.png",
      mimeType: "image/png",
      sizeBytes: 2048,
      createdAt: "2026-02-01T09:15:00.000Z",
      isSoftDeleted: false,
    },
  ],
  comments: [
    {
      id: 1,
      ticketId: 101,
      authorId: 3,
      authorName: "Jennifer Anderson",
      authorRole: "REQUESTER",
      content: "Please check between 2pm and 4pm.",
      createdAt: "2026-02-01T09:20:00.000Z",
    },
  ],
  activityTimeline: [
    {
      id: "act-1",
      type: "TICKET_CREATED",
      action: "Ticket created",
      message: "Ticket created by requester.",
      timestamp: "2026-02-01T09:15:00.000Z",
      actor: "Jennifer Anderson",
    },
  ],
};

const mockInternalNotes: api.InternalNoteItem[] = [
  {
    id: 10,
    ticketId: 101,
    authorId: 6,
    authorName: "David Lee",
    authorRole: "IT_STAFF",
    content: "Root cause found: connection pool exhaustion in backend microservice.",
    createdAt: "2026-02-01T11:00:00.000Z",
  },
];

describe("StaffTicketDetail Component (StaffTicketDetail.test.tsx)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(api, "fetchStaffTicketDetail").mockResolvedValue({ data: { ...mockTicketData } });
    vi.spyOn(api, "fetchStaffUsers").mockResolvedValue({ data: [...mockStaffUsers] });
    vi.spyOn(api, "fetchInternalNotes").mockResolvedValue({ data: [...mockInternalNotes] });
    vi.spyOn(api, "claimTicket").mockResolvedValue({ data: { ...mockTicketData, ownerId: 6 } });
    vi.spyOn(api, "reassignTicket").mockResolvedValue({ data: { ...mockTicketData, ownerId: 7 } });
    vi.spyOn(api, "updateTicketPriority").mockResolvedValue({ data: { ...mockTicketData, itPriority: "P0_URGENT" } });
    vi.spyOn(api, "updateTicketStatus").mockResolvedValue({ data: { ...mockTicketData, status: "IN_PROGRESS" } });
    vi.spyOn(api, "postPublicComment").mockResolvedValue({
      data: {
        id: 2,
        ticketId: 101,
        authorId: 6,
        authorName: "David Lee",
        authorRole: "IT_STAFF",
        body: "We are actively monitoring it.",
        content: "We are actively monitoring it.",
        createdAt: "2026-02-01T11:30:00.000Z",
      },
    });
    vi.spyOn(api, "postInternalNote").mockResolvedValue({
      data: {
        id: 11,
        ticketId: 101,
        authorId: 6,
        authorName: "David Lee",
        authorRole: "IT_STAFF",
        content: "Rebooting replica 2.",
        createdAt: "2026-02-01T11:45:00.000Z",
      },
    });
  });

  it("renders operational ticket details, metadata, and status badges", async () => {
    render(
      <StaffTicketDetail
        ticketId={101}
        currentUser={mockCurrentUser}
        onNavigateBack={vi.fn()}
      />
    );

    expect(screen.getByText("Loading staff ticket details...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-00101")).toBeInTheDocument();
      expect(screen.getByText("Database connection intermittent latency")).toBeInTheDocument();
      expect(screen.getByText("Jennifer Anderson")).toBeInTheDocument();
      expect(screen.getByText(/Requester Confirmed Resolved/i)).toBeInTheDocument();
      expect(screen.getByTestId("assigned-owner-display")).toHaveTextContent("David Lee (IT_STAFF)");
    });
  });

  it("shows 'Claim Ticket' button when ticket is unassigned and triggers claim API", async () => {
    vi.spyOn(api, "fetchStaffTicketDetail").mockResolvedValueOnce({
      data: { ...mockTicketData, ownerId: null, owner: null, status: "NEW" },
    });

    render(
      <StaffTicketDetail
        ticketId={101}
        currentUser={mockCurrentUser}
        onNavigateBack={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("(Unassigned)")).toBeInTheDocument();
    });

    const claimBtn = screen.getByRole("button", { name: /Claim Ticket/i });
    expect(claimBtn).toBeInTheDocument();

    fireEvent.click(claimBtn);

    await waitFor(() => {
      expect(api.claimTicket).toHaveBeenCalledWith(101);
    });
  });

  it("reassigns ticket owner when selecting new staff user from dropdown", async () => {
    render(
      <StaffTicketDetail
        ticketId={101}
        currentUser={mockCurrentUser}
        onNavigateBack={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Select new owner/i)).toBeInTheDocument();
    });

    const ownerSelect = screen.getByLabelText(/Select new owner/i);
    fireEvent.change(ownerSelect, { target: { value: "7" } });

    const reassignBtn = screen.getByRole("button", { name: "Reassign" });
    fireEvent.click(reassignBtn);

    await waitFor(() => {
      expect(api.reassignTicket).toHaveBeenCalledWith(101, 7);
    });
  });

  it("updates IT Priority when changing dropdown value", async () => {
    render(
      <StaffTicketDetail
        ticketId={101}
        currentUser={mockCurrentUser}
        onNavigateBack={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/IT PRIORITY/i)).toBeInTheDocument();
    });

    const prioritySelect = screen.getByLabelText(/IT PRIORITY/i);
    fireEvent.change(prioritySelect, { target: { value: "P0_URGENT" } });

    await waitFor(() => {
      expect(api.updateTicketPriority).toHaveBeenCalledWith(101, "P0_URGENT");
    });
  });

  it("opens StatusTransitionModal and validates reason fields on submission", async () => {
    render(
      <StaffTicketDetail
        ticketId={101}
        currentUser={mockCurrentUser}
        onNavigateBack={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("open-status-modal-button")).toBeInTheDocument();
    });

    const updateStatusBtn = screen.getByTestId("open-status-modal-button");
    fireEvent.click(updateStatusBtn);

    // Modal dialog is open
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Update Ticket Status")).toBeInTheDocument();

    // Select IN_PROGRESS and submit
    const statusSelect = screen.getByLabelText(/Select Next Status/i);
    fireEvent.change(statusSelect, { target: { value: "IN_PROGRESS" } });

    const submitBtn = screen.getByTestId("submit-status-button");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.updateTicketStatus).toHaveBeenCalledWith(101, { status: "IN_PROGRESS" });
    });
  });

  it("enforces mandatory reason length in StatusTransitionModal when target is CANCELLED", async () => {
    render(
      <StaffTicketDetail
        ticketId={101}
        currentUser={mockCurrentUser}
        onNavigateBack={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("open-status-modal-button")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("open-status-modal-button"));

    const statusSelect = screen.getByLabelText(/Select Next Status/i);
    fireEvent.change(statusSelect, { target: { value: "CANCELLED" } });

    // Try submit without reason
    const submitBtn = screen.getByTestId("submit-status-button");
    fireEvent.click(submitBtn);

    expect(
      screen.getByText(/Cancellation reason is required and must be between 10 and 500 characters/i)
    ).toBeInTheDocument();
    expect(api.updateTicketStatus).not.toHaveBeenCalled();

    // Provide valid reason
    const reasonInput = screen.getByLabelText(/Cancellation Reason/i);
    fireEvent.change(reasonInput, { target: { value: "Valid reason for ticket cancellation." } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.updateTicketStatus).toHaveBeenCalledWith(101, {
        status: "CANCELLED",
        cancellationReason: "Valid reason for ticket cancellation.",
      });
    });
  });

  it("renders Amber Internal Notes tab with Lock Icon and allows posting internal notes", async () => {
    render(
      <StaffTicketDetail
        ticketId={101}
        currentUser={mockCurrentUser}
        onNavigateBack={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Internal Notes \(1\)/i })).toBeInTheDocument();
    });

    const notesTab = screen.getByRole("button", { name: /Internal Notes \(1\)/i });
    fireEvent.click(notesTab);

    // Amber alert container & lock text
    expect(
      screen.getByText(/Private Note. Visible only to IT Staff and Administrators./i)
    ).toBeInTheDocument();

    // Existing note
    expect(
      screen.getByText(/Root cause found: connection pool exhaustion/i)
    ).toBeInTheDocument();

    // Post new note
    const noteTextarea = screen.getByPlaceholderText(/Type a confidential note for IT staff.../i);
    fireEvent.change(noteTextarea, { target: { value: "Rebooting replica 2." } });

    const addNoteBtn = screen.getByRole("button", { name: /Add Internal Note/i });
    fireEvent.click(addNoteBtn);

    await waitFor(() => {
      expect(api.postInternalNote).toHaveBeenCalledWith(101, "Rebooting replica 2.");
    });
  });

  it("renders Activity timeline tab with audit events", async () => {
    render(
      <StaffTicketDetail
        ticketId={101}
        currentUser={mockCurrentUser}
        onNavigateBack={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Activity \(1\)/i })).toBeInTheDocument();
    });

    const activityTab = screen.getByRole("button", { name: /Activity \(1\)/i });
    fireEvent.click(activityTab);

    expect(screen.getByText("Ticket created")).toBeInTheDocument();
    expect(screen.getByText("Ticket created by requester.")).toBeInTheDocument();
  });

  it("locks operational controls when ticket status is CLOSED or CANCELLED", async () => {
    vi.spyOn(api, "fetchStaffTicketDetail").mockResolvedValueOnce({
      data: { ...mockTicketData, status: "CLOSED" },
    });

    render(
      <StaffTicketDetail
        ticketId={101}
        currentUser={mockCurrentUser}
        onNavigateBack={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Ticket is closed. Operational updates are locked unless reopened./i)).toBeInTheDocument();
    });

    const prioritySelect = screen.getByLabelText(/IT PRIORITY/i);
    expect(prioritySelect).toBeDisabled();
  });
});
