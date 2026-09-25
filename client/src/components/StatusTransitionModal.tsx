import React, { useState } from "react";
import { UpdateStatusPayload } from "../api";

import { ALLOWED_STATUS_TRANSITIONS, TicketStatus } from "../../../shared/ticketStateMachine.js";
export { ALLOWED_STATUS_TRANSITIONS };


export const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  WAITING_FOR_REQUESTER: "Waiting for Requester",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  REOPENED: "Reopened",
  CANCELLED: "Cancelled",
};

interface StatusTransitionModalProps {
  currentStatus: string;
  hasOwner: boolean;
  onClose: () => void;
  onSubmit: (payload: UpdateStatusPayload) => Promise<void>;
}

export const StatusTransitionModal: React.FC<StatusTransitionModalProps> = ({
  currentStatus,
  hasOwner,
  onClose,
  onSubmit,
}) => {
  const allowed: string[] = (ALLOWED_STATUS_TRANSITIONS as Record<string, string[]>)[currentStatus] || [];
  const [selectedStatus, setSelectedStatus] = useState<string>(allowed[0] || "");
  const [resolutionSummary, setResolutionSummary] = useState<string>("");
  const [cancellationReason, setCancellationReason] = useState<string>("");
  const [reopenReason, setReopenReason] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedStatus) {
      setError("Please select a target status.");
      return;
    }

    if (currentStatus === "NEW" && selectedStatus === "OPEN" && !hasOwner) {
      setError("Cannot transition to OPEN without an assigned owner. Please claim or assign the ticket first.");
      return;
    }

    const payload: UpdateStatusPayload = { status: selectedStatus };

    if (selectedStatus === "RESOLVED") {
      const trimmed = resolutionSummary.trim();
      if (trimmed.length < 10 || trimmed.length > 1000) {
        setError("Resolution summary is required and must be between 10 and 1,000 characters.");
        return;
      }
      payload.resolutionSummary = trimmed;
    } else if (selectedStatus === "CANCELLED") {
      const trimmed = cancellationReason.trim();
      if (trimmed.length < 10 || trimmed.length > 500) {
        setError("Cancellation reason is required and must be between 10 and 500 characters.");
        return;
      }
      payload.cancellationReason = trimmed;
    } else if (selectedStatus === "REOPENED") {
      const trimmed = reopenReason.trim();
      if (trimmed.length < 10 || trimmed.length > 500) {
        setError("Reopen reason is required and must be between 10 and 500 characters.");
        return;
      }
      payload.reopenReason = trimmed;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to update ticket status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="zg-modal-backdrop"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(17, 24, 39, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1050,
        padding: "16px",
        pointerEvents: "auto",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="transition-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        className="zg-modal-card"
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "520px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          border: "1px solid #e5e7eb",
          padding: "24px",
          pointerEvents: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 id="transition-modal-title" style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, color: "#111827" }}>
            Update Ticket Status
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.5rem",
              lineHeight: 1,
              cursor: "pointer",
              color: "#6b7280",
            }}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        <div style={{ marginBottom: "16px", fontSize: "0.875rem", color: "#4b5563" }}>
          Current Status: <strong style={{ color: "#111827" }}>{STATUS_LABELS[currentStatus] || currentStatus}</strong>
        </div>

        {allowed.length === 0 ? (
          <div style={{ padding: "12px", backgroundColor: "#f3f4f6", borderRadius: "8px", color: "#4b5563" }}>
            No status transitions are allowed from {STATUS_LABELS[currentStatus] || currentStatus}. This status is terminal.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div
                role="alert"
                style={{
                  padding: "10px 14px",
                  backgroundColor: "#fef2f2",
                  color: "#991b1b",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  fontSize: "0.875rem",
                  marginBottom: "16px",
                }}
              >
                {error}
              </div>
            )}

            <div style={{ marginBottom: "16px" }}>
              <label htmlFor="target-status-select" style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#374151", marginBottom: "8px" }}>
                Select Next Status <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <select
                id="target-status-select"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "0.95rem",
                  backgroundColor: "#ffffff",
                  color: "#111827",
                  boxSizing: "border-box",
                }}
              >
                {allowed.map((st) => (
                  <option key={st} value={st}>
                    {STATUS_LABELS[st] || st}
                  </option>
                ))}
              </select>
            </div>

            {selectedStatus === "RESOLVED" && (
              <div style={{ marginBottom: "16px" }}>
                <label
                  htmlFor="resolution-summary-input"
                  style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#374151", marginBottom: "6px" }}
                >
                  Resolution Summary <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "6px" }}>
                  Provide detailed summary of steps taken to resolve the issue (10–1,000 characters).
                </div>
                <textarea
                  id="resolution-summary-input"
                  value={resolutionSummary}
                  onChange={(e) => setResolutionSummary(e.target.value)}
                  rows={4}
                  maxLength={1000}
                  placeholder="Describe how the issue was resolved..."
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "0.875rem",
                    boxSizing: "border-box",
                  }}
                />
                <div style={{ fontSize: "0.75rem", color: resolutionSummary.trim().length < 10 ? "#dc2626" : "#6b7280", textAlign: "right" }}>
                  {resolutionSummary.trim().length} / 1,000 (minimum 10 characters)
                </div>
              </div>
            )}

            {selectedStatus === "CANCELLED" && (
              <div style={{ marginBottom: "16px" }}>
                <label
                  htmlFor="cancellation-reason-input"
                  style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#374151", marginBottom: "6px" }}
                >
                  Cancellation Reason <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "6px" }}>
                  Explain why this ticket is being cancelled (10–500 characters).
                </div>
                <textarea
                  id="cancellation-reason-input"
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  rows={4}
                  maxLength={500}
                  placeholder="Reason for cancellation..."
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "0.875rem",
                    boxSizing: "border-box",
                  }}
                />
                <div style={{ fontSize: "0.75rem", color: cancellationReason.trim().length < 10 ? "#dc2626" : "#6b7280", textAlign: "right" }}>
                  {cancellationReason.trim().length} / 500 (minimum 10 characters)
                </div>
              </div>
            )}

            {selectedStatus === "REOPENED" && (
              <div style={{ marginBottom: "16px" }}>
                <label
                  htmlFor="reopen-reason-input"
                  style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#374151", marginBottom: "6px" }}
                >
                  Reopen Reason <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "6px" }}>
                  Explain why this ticket is being reopened (10–500 characters).
                </div>
                <textarea
                  id="reopen-reason-input"
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  rows={4}
                  maxLength={500}
                  placeholder="Reason for reopening ticket..."
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "0.875rem",
                    boxSizing: "border-box",
                  }}
                />
                <div style={{ fontSize: "0.75rem", color: reopenReason.trim().length < 10 ? "#dc2626" : "#6b7280", textAlign: "right" }}>
                  {reopenReason.trim().length} / 500 (minimum 10 characters)
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                style={{
                  padding: "9px 16px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  backgroundColor: "#ffffff",
                  color: "#374151",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                data-testid="submit-status-button"
                disabled={isSubmitting}
                style={{
                  padding: "9px 18px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "#0b7a46",
                  color: "#ffffff",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  opacity: isSubmitting ? 0.7 : 1,
                }}
              >
                {isSubmitting ? "Updating..." : "Confirm Status Update"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
