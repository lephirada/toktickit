import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as api from "../../src/api.js";
import { EditActionModal } from "../../src/components/EditActionModal.js";

const mockAction: api.ActionTakenItem = {
  id: 42,
  ticketId: 101,
  actionType: "REPAIR",
  timeSpentMinutes: 60,
  performedAt: "2026-02-01T11:00:00.000Z",
  performedById: 6,
  performedBy: {
    id: 6,
    fullName: "David Lee",
    email: "david.lee@toktickit.com",
    role: "IT_STAFF",
  },
  description: "Replaced faulty switch port module on rack 3.",
  result: "Port link restored to full 10Gbps throughput.",
  followUpRequired: true,
  followUpNote: "Check CRC error counts on next shift rotation.",
  attachmentNotes: "Switch log attached as evidence.",
  createdAt: "2026-02-01T11:30:00.000Z",
  updatedAt: "2026-02-01T11:30:00.000Z",
};

describe("EditActionModal Component (Lab 4 Issue #23 AC-23-04 & AC-23-05)", () => {
  const defaultProps = {
    isOpen: true,
    ticketId: 101,
    action: mockAction,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when isOpen is false", () => {
    render(<EditActionModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId("edit-action-modal")).toBeNull();
  });

  it("pre-fills form fields with existing action data", () => {
    render(<EditActionModal {...defaultProps} />);

    expect(screen.getByTestId("edit-action-modal")).toBeInTheDocument();
    expect(screen.getByLabelText(/Action Type/i)).toHaveValue("REPAIR");
    expect(screen.getByLabelText(/Time Spent/i)).toHaveValue(60);
    expect(screen.getByLabelText(/Technical Description/i)).toHaveValue(
      "Replaced faulty switch port module on rack 3."
    );
    expect(screen.getByLabelText(/Action Result/i)).toHaveValue(
      "Port link restored to full 10Gbps throughput."
    );
    expect(screen.getByLabelText(/Follow-Up Action Required\?/i)).toBeChecked();
    expect(screen.getByTestId("edit-followup-note")).toHaveValue(
      "Check CRC error counts on next shift rotation."
    );
    expect(screen.getByLabelText(/Attachment Notes/i)).toHaveValue(
      "Switch log attached as evidence."
    );
  });

  it("submits update with expectedUpdatedAt token for optimistic concurrency", async () => {
    const updateSpy = vi.spyOn(api, "updateTicketAction").mockResolvedValue({
      data: {
        ...mockAction,
        description: "Replaced faulty switch port module on rack 3 and cleaned optical connectors.",
        updatedAt: "2026-02-01T12:00:00.000Z",
      },
    });

    render(<EditActionModal {...defaultProps} />);

    const descInput = screen.getByLabelText(/Technical Description/i);
    fireEvent.change(descInput, {
      target: {
        value: "Replaced faulty switch port module on rack 3 and cleaned optical connectors.",
      },
    });

    fireEvent.click(screen.getByTestId("submit-edit-btn"));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledTimes(1);
    });

    expect(updateSpy).toHaveBeenCalledWith(
      101,
      42,
      expect.objectContaining({
        description: "Replaced faulty switch port module on rack 3 and cleaned optical connectors.",
        expectedUpdatedAt: "2026-02-01T11:30:00.000Z",
      })
    );

    expect(defaultProps.onSuccess).toHaveBeenCalledTimes(1);
  });

  it("triggers ConcurrencyConflictDialog on 409 STALE_ACTION_CONFLICT error", async () => {
    const conflictError = new api.ApiError(
      "The action record was modified by another user.",
      "STALE_ACTION_CONFLICT",
      undefined,
      409,
      {
        actionId: 42,
        providedUpdatedAt: "2026-02-01T11:30:00.000Z",
        currentUpdatedAt: "2026-02-01T11:45:00.000Z",
        currentRecord: {
          ...mockAction,
          description: "Server admin updated switch config remotely.",
          updatedAt: "2026-02-01T11:45:00.000Z",
        },
      }
    );

    vi.spyOn(api, "updateTicketAction").mockRejectedValue(conflictError);

    render(<EditActionModal {...defaultProps} />);

    fireEvent.change(screen.getByLabelText(/Technical Description/i), {
      target: { value: "My local unsaved edit description." },
    });

    fireEvent.click(screen.getByTestId("submit-edit-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("concurrency-conflict-dialog")).toBeInTheDocument();
    });

    // Side-by-side comparison is displayed
    expect(screen.getByText(/Concurrency Conflict Detected/i)).toBeInTheDocument();
    expect(screen.getByText(/Server admin updated switch config remotely\./i)).toBeInTheDocument();
  });

  it("displays server error alert for non-conflict API errors", async () => {
    vi.spyOn(api, "updateTicketAction").mockRejectedValue(
      new api.ApiError("Internal database error while updating action.", "INTERNAL_ERROR", undefined, 500)
    );

    render(<EditActionModal {...defaultProps} />);

    fireEvent.click(screen.getByTestId("submit-edit-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("edit-action-error")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Internal database error while updating action\./i)
    ).toBeInTheDocument();
  });
});
