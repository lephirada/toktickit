import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as api from "../../src/api.js";
import { ConcurrencyConflictDialog } from "../../src/components/ConcurrencyConflictDialog.js";

const mockServerRecord: api.ActionTakenItem = {
  id: 42,
  ticketId: 101,
  actionType: "REPAIR",
  timeSpentMinutes: 90,
  performedAt: "2026-02-01T11:00:00.000Z",
  performedById: 7,
  performedBy: {
    id: 7,
    fullName: "Sarah Connor",
    email: "sarah.connor@toktickit.com",
    role: "IT_STAFF",
  },
  description: "Server admin updated switch port firmware and cleared error logs.",
  result: "Port link restored and stabilized.",
  followUpRequired: false,
  followUpNote: null,
  attachmentNotes: null,
  createdAt: "2026-02-01T11:30:00.000Z",
  updatedAt: "2026-02-01T11:55:00.000Z",
};

const mockLocalDraft: api.UpdateActionPayload = {
  actionType: "CONFIGURATION",
  timeSpentMinutes: 60,
  performedAt: "2026-02-01T11:00:00.000Z",
  description: "My local draft: Reconfigured VLAN tagging on switch port.",
  result: "My local draft: VLAN routing verified.",
  followUpRequired: true,
  followUpNote: "My local follow-up: Check gateway ping latency.",
  attachmentNotes: "My local attachment notes.",
  expectedUpdatedAt: "2026-02-01T11:30:00.000Z",
};

describe("ConcurrencyConflictDialog Component (Lab 4 Issue #23 AC-23-06)", () => {
  const defaultProps = {
    isOpen: true,
    serverRecord: mockServerRecord,
    serverUpdatedAt: "2026-02-01T11:55:00.000Z",
    localDraft: mockLocalDraft,
    onReloadLatest: vi.fn(),
    onClose: vi.fn(),
  };

  const originalClipboard = navigator.clipboard;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: originalClipboard,
      writable: true,
      configurable: true,
    });
  });

  it("does not render when isOpen is false", () => {
    render(<ConcurrencyConflictDialog {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId("concurrency-conflict-dialog")).toBeNull();
  });

  it("renders side-by-side comparison between server version and unsaved draft", () => {
    render(<ConcurrencyConflictDialog {...defaultProps} />);

    expect(screen.getByTestId("concurrency-conflict-dialog")).toBeInTheDocument();
    expect(screen.getByText(/Concurrency Conflict Detected/i)).toBeInTheDocument();

    // Server column content
    expect(
      screen.getByText(/Server admin updated switch port firmware and cleared error logs\./i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Port link restored and stabilized\./i)).toBeInTheDocument();
    expect(screen.getByText(/Sarah Connor/i)).toBeInTheDocument();

    // Local draft column content
    expect(
      screen.getByText(/My local draft: Reconfigured VLAN tagging on switch port\./i)
    ).toBeInTheDocument();
    expect(screen.getByText(/My local draft: VLAN routing verified\./i)).toBeInTheDocument();
    expect(
      screen.getByText(/My local follow-up: Check gateway ping latency\./i)
    ).toBeInTheDocument();
  });

  it("calls onReloadLatest when Reload Latest Version button is clicked", () => {
    render(<ConcurrencyConflictDialog {...defaultProps} />);

    const reloadBtn = screen.getByRole("button", { name: /Reload Latest Version/i });
    fireEvent.click(reloadBtn);

    expect(defaultProps.onReloadLatest).toHaveBeenCalledTimes(1);
  });

  it("handles successful Copy My Changes via Clipboard API without false failures", async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });

    render(<ConcurrencyConflictDialog {...defaultProps} />);

    const copyBtn = screen.getByRole("button", { name: /Copy My Changes/i });
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledTimes(1);
    });

    expect(mockWriteText).toHaveBeenCalledWith(
      expect.stringContaining("My local draft: Reconfigured VLAN tagging on switch port.")
    );

    // Shows success message
    expect(screen.getByText(/Copied draft to clipboard!/i)).toBeInTheDocument();
  });

  it("handles Clipboard API failure safely WITHOUT displaying false success message", async () => {
    const mockWriteText = vi.fn().mockRejectedValue(new Error("Permission denied"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });

    render(<ConcurrencyConflictDialog {...defaultProps} />);

    const copyBtn = screen.getByRole("button", { name: /Copy My Changes/i });
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledTimes(1);
    });

    // CRITICAL: MUST NOT show false success message
    expect(screen.queryByText(/Copied draft to clipboard!/i)).toBeNull();

    // Must show failure notice and fallback textarea for manual copying
    await waitFor(() => {
      expect(
        screen.getByText(/Could not access clipboard directly\./i)
      ).toBeInTheDocument();
      const fallbackTextarea = screen.getByTestId("manual-copy-fallback") as HTMLTextAreaElement;
      expect(fallbackTextarea).toBeInTheDocument();
      expect(fallbackTextarea.value).toContain(
        "My local draft: Reconfigured VLAN tagging on switch port."
      );
    });
  });

  it("calls onClose when Cancel button is clicked", () => {
    render(<ConcurrencyConflictDialog {...defaultProps} />);

    const cancelBtn = screen.getByRole("button", { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });
});
