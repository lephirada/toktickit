import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as api from "../../src/api.js";
import { LogActionModal } from "../../src/components/LogActionModal.js";

describe("LogActionModal Component (Lab 4 Issue #23 AC-23-03)", () => {
  const defaultProps = {
    isOpen: true,
    ticketId: 101,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when isOpen is false", () => {
    render(<LogActionModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId("log-action-modal")).toBeNull();
  });

  it("renders with correct defaults: INVESTIGATION type and quick preset buttons", () => {
    render(<LogActionModal {...defaultProps} />);

    expect(screen.getByTestId("log-action-modal")).toBeInTheDocument();
    expect(screen.getByLabelText(/Action Type/i)).toHaveValue("INVESTIGATION");

    // Quick-preset duration buttons
    expect(screen.getByTestId("preset-15m")).toBeInTheDocument();
    expect(screen.getByTestId("preset-30m")).toBeInTheDocument();
    expect(screen.getByTestId("preset-45m")).toBeInTheDocument();
    expect(screen.getByTestId("preset-1h")).toBeInTheDocument();
    expect(screen.getByTestId("preset-2h")).toBeInTheDocument();

    const timeInput = screen.getByLabelText(/Time Spent/i);
    expect(timeInput).toHaveValue(30);

    // Clicking 1h preset updates value to 60
    fireEvent.click(screen.getByTestId("preset-1h"));
    expect(timeInput).toHaveValue(60);
  });

  it("dynamically shows and validates followUpNote only when followUpRequired is checked", () => {
    render(<LogActionModal {...defaultProps} />);

    // Initially follow-up note textarea is NOT visible
    expect(screen.queryByTestId("action-followup-note")).toBeNull();

    // Check the Follow-up required checkbox
    const followUpCheckbox = screen.getByLabelText(/Follow-Up Action Required\?/i);
    fireEvent.click(followUpCheckbox);

    // Follow-up note textarea is now present
    expect(screen.getByTestId("action-followup-note")).toBeInTheDocument();

    // Unchecking hides it again
    fireEvent.click(followUpCheckbox);
    expect(screen.queryByTestId("action-followup-note")).toBeNull();
  });

  it("shows client-side validation errors when description or result is too short", async () => {
    render(<LogActionModal {...defaultProps} />);

    const descInput = screen.getByLabelText(/Technical Description/i);
    const resultInput = screen.getByLabelText(/Action Result/i);
    const submitBtn = screen.getByTestId("submit-action-btn");

    // Enter description < 10 characters
    fireEvent.change(descInput, { target: { value: "Too short" } });
    fireEvent.change(resultInput, { target: { value: "" } });

    fireEvent.click(submitBtn);

    expect(
      screen.getAllByText(/Description must be between 10 and 2000 characters\./i).length
    ).toBeGreaterThanOrEqual(1);
  });

  it("rejects future performedAt timestamp with clear validation message", async () => {
    render(<LogActionModal {...defaultProps} />);

    const descInput = screen.getByLabelText(/Technical Description/i);
    const resultInput = screen.getByLabelText(/Action Result/i);
    const performedAtInput = screen.getByLabelText(/Performed At/i);
    const submitBtn = screen.getByTestId("submit-action-btn");

    fireEvent.change(descInput, { target: { value: "Replaced faulty RAM module in node." } });
    fireEvent.change(resultInput, { target: { value: "Server boot loop resolved." } });

    // Set future date: year 2099
    fireEvent.change(performedAtInput, { target: { value: "2099-01-01T12:00" } });

    fireEvent.click(submitBtn);

    expect(screen.getByText(/Action cannot be logged in the future\./i)).toBeInTheDocument();
  });

  it("validates that followUpNote has at least 3 characters when follow-up is required", async () => {
    render(<LogActionModal {...defaultProps} />);

    const descInput = screen.getByLabelText(/Technical Description/i);
    const resultInput = screen.getByLabelText(/Action Result/i);
    const followUpCheckbox = screen.getByLabelText(/Follow-Up Action Required\?/i);
    const submitBtn = screen.getByTestId("submit-action-btn");

    fireEvent.change(descInput, { target: { value: "Diagnosed overheating GPU sensor." } });
    fireEvent.change(resultInput, { target: { value: "Temporary fan speed curve applied." } });
    fireEvent.click(followUpCheckbox);

    const followUpNoteInput = screen.getByTestId("action-followup-note");
    fireEvent.change(followUpNoteInput, { target: { value: "no" } }); // < 3 characters

    fireEvent.click(submitBtn);

    expect(
      screen.getAllByText(/Follow-up note must be at least 3 characters\./i).length
    ).toBeGreaterThanOrEqual(1);
  });

  it("submits valid form data and triggers onSuccess upon successful API response", async () => {
    const createSpy = vi.spyOn(api, "createTicketAction").mockResolvedValue({
      data: {
        id: 3,
        ticketId: 101,
        actionType: "CONFIGURATION",
        timeSpentMinutes: 45,
        performedAt: "2026-02-01T10:00:00.000Z",
        performedById: 6,
        description: "Updated memory limits in docker-compose manifest.",
        result: "Containers running without OOM errors.",
        followUpRequired: true,
        followUpNote: "Monitor memory consumption over 24h peak window.",
        attachmentNotes: "See attached telemetry dashboard export.",
        createdAt: "2026-02-01T10:15:00.000Z",
        updatedAt: "2026-02-01T10:15:00.000Z",
        performedBy: {
          id: 6,
          fullName: "David Lee",
          email: "david.lee@toktickit.com",
          role: "IT_STAFF",
        },
      },
    });

    render(<LogActionModal {...defaultProps} />);

    // Select type
    fireEvent.change(screen.getByLabelText(/Action Type/i), {
      target: { value: "CONFIGURATION" },
    });

    // Preset
    fireEvent.click(screen.getByTestId("preset-45m"));

    // Description & Result
    fireEvent.change(screen.getByLabelText(/Technical Description/i), {
      target: { value: "Updated memory limits in docker-compose manifest." },
    });
    fireEvent.change(screen.getByLabelText(/Action Result/i), {
      target: { value: "Containers running without OOM errors." },
    });

    // Follow-up
    fireEvent.click(screen.getByLabelText(/Follow-Up Action Required\?/i));
    fireEvent.change(screen.getByTestId("action-followup-note"), {
      target: { value: "Monitor memory consumption over 24h peak window." },
    });

    // Attachment notes
    fireEvent.change(screen.getByLabelText(/Attachment Notes/i), {
      target: { value: "See attached telemetry dashboard export." },
    });

    // Submit
    fireEvent.click(screen.getByTestId("submit-action-btn"));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledTimes(1);
    });

    expect(createSpy).toHaveBeenCalledWith(
      101,
      expect.objectContaining({
        actionType: "CONFIGURATION",
        timeSpentMinutes: 45,
        description: "Updated memory limits in docker-compose manifest.",
        result: "Containers running without OOM errors.",
        followUpRequired: true,
        followUpNote: "Monitor memory consumption over 24h peak window.",
        attachmentNotes: "See attached telemetry dashboard export.",
      })
    );

    expect(defaultProps.onSuccess).toHaveBeenCalledTimes(1);
  });

  it("displays server error alert when creation API fails", async () => {
    vi.spyOn(api, "createTicketAction").mockRejectedValue(
      new api.ApiError("Database lock contention during action creation.", "LOCK_ERROR", undefined, 500)
    );

    render(<LogActionModal {...defaultProps} />);

    fireEvent.change(screen.getByLabelText(/Technical Description/i), {
      target: { value: "Restarted primary gateway service." },
    });
    fireEvent.change(screen.getByLabelText(/Action Result/i), {
      target: { value: "All ping probes responded normally." },
    });

    fireEvent.click(screen.getByTestId("submit-action-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("log-action-error")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Database lock contention during action creation\./i)
    ).toBeInTheDocument();
  });
});
