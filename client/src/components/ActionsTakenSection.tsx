import React, { useState, useEffect, useCallback } from "react";
import { ActionTakenItem, fetchTicketActions, ApiError } from "../api.js";
import { LogActionModal } from "./LogActionModal.js";
import { EditActionModal } from "./EditActionModal.js";

interface ActionsTakenSectionProps {
  ticketId: number;
  ticketStatus?: string;
  isStaffOrAdmin: boolean;
}

const ACTION_TYPE_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  INVESTIGATION: { bg: "#EFF8FF", color: "#175CD3", border: "#B2DDFF" },
  CONFIGURATION: { bg: "#F4F3FF", color: "#5925DC", border: "#D9D6FE" },
  REPAIR: { bg: "#ECFDF3", color: "#027A48", border: "#A6F4C5" },
  COMMUNICATION: { bg: "#FEF6EE", color: "#B54708", border: "#F9DBAF" },
  OTHER: { bg: "#F8F9FA", color: "#344054", border: "#EAECF0" },
};

export const ActionsTakenSection: React.FC<ActionsTakenSectionProps> = ({
  ticketId,
  ticketStatus,
  isStaffOrAdmin,
}) => {
  const [actions, setActions] = useState<ActionTakenItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isLogModalOpen, setIsLogModalOpen] = useState<boolean>(false);
  const [editingAction, setEditingAction] = useState<ActionTakenItem | null>(null);

  const isTerminal = ticketStatus === "CLOSED" || ticketStatus === "CANCELLED";
  const canMutate = isStaffOrAdmin && !isTerminal;

  const loadActions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchTicketActions(ticketId);
      setActions(res.data || []);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || "Failed to load actions taken.");
      } else {
        setError("Failed to load actions taken. Please check your connection.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    loadActions();
  }, [loadActions]);

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  const totalMinutes = actions.reduce((acc, a) => acc + (a.timeSpentMinutes || 0), 0);
  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  return (
    <>
      <div
        className="card border shadow-sm rounded-4 mb-4 bg-white overflow-hidden w-100"
        style={{
          borderRadius: "16px",
          borderColor: "#EAECF0",
          boxShadow: "0 1px 3px rgba(16, 24, 40, 0.08), 0 1px 2px rgba(16, 24, 40, 0.04)",
          maxWidth: "100%",
        }}
        data-testid="actions-taken-card"
      >
        {/* Card Header */}
        <div
          className="d-flex align-items-center justify-content-between p-3 px-4 border-bottom flex-wrap gap-2"
          style={{ backgroundColor: "#F9FAFB", borderColor: "#EAECF0" }}
        >
          <div className="d-flex align-items-center flex-wrap gap-2">
            <span className="fs-5" aria-hidden="true">🛠️</span>
            <h5 className="fw-bold m-0 text-dark" style={{ fontSize: "1.05rem" }}>
              Actions Taken ({actions.length})
            </h5>
            {actions.length > 0 && (
              <span className="badge bg-light text-secondary border ms-1">
                Total logged: {formatDuration(totalMinutes)}
              </span>
            )}
          </div>

          {/* Mutation Button: Rendered ONLY for Staff/Admin when not in terminal state */}
          {canMutate && (
            <button
              type="button"
              className="btn btn-sm btn-primary text-white fw-semibold px-3 py-1 d-inline-flex align-items-center gap-1"
              style={{
                backgroundColor: "var(--zg-primary, #006B3C)",
                borderColor: "var(--zg-primary, #006B3C)",
                borderRadius: "8px",
              }}
              onClick={() => setIsLogModalOpen(true)}
              data-testid="log-action-btn"
            >
              <span>+</span>
              <span>Log Action Taken</span>
            </button>
          )}

          {isTerminal && isStaffOrAdmin && (
            <span className="small text-muted fst-italic">
              Locked for closed/cancelled tickets
            </span>
          )}
        </div>

        {/* Card Body */}
        <div className="p-3 p-md-4">
          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-4" data-testid="actions-loading">
              <div className="spinner-border spinner-border-sm text-success me-2" role="status" />
              <span className="text-muted small">Loading actions taken history...</span>
            </div>
          )}

          {/* Error State */}
          {!isLoading && error && (
            <div className="alert alert-danger py-3 px-4 d-flex align-items-center justify-content-between flex-wrap gap-2 mb-0" role="alert" data-testid="actions-error-alert">
              <span className="small">{error}</span>
              <button
                type="button"
                className="btn btn-outline-danger btn-sm py-1 px-3"
                onClick={loadActions}
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty State (0 Actions) */}
          {!isLoading && !error && actions.length === 0 && (
            <div
              className="text-center py-5 px-3 rounded-3"
              style={{
                backgroundColor: "#F9FAFB",
                border: "1px dashed #D0D5DD",
              }}
              data-testid="actions-empty-state"
            >
              <div
                className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3 text-secondary"
                style={{ width: "48px", height: "48px", backgroundColor: "#F2F4F7" }}
                aria-hidden="true"
              >
                📋
              </div>
              <h6 className="fw-bold text-dark mb-1" style={{ fontSize: "1rem" }}>
                No actions taken logged yet
              </h6>
              <p className="text-secondary small mb-3 mx-auto" style={{ maxWidth: "480px" }}>
                Document diagnostic steps, configurations, or repairs performed on this ticket.
              </p>
              {canMutate && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-success fw-semibold px-3 py-1"
                  style={{
                    color: "var(--zg-primary, #006B3C)",
                    borderColor: "var(--zg-primary, #006B3C)",
                    borderRadius: "8px",
                  }}
                  onClick={() => setIsLogModalOpen(true)}
                  data-testid="empty-log-first-action-btn"
                >
                  + Log First Action
                </button>
              )}
            </div>
          )}

          {/* Populated Actions Timeline */}
          {!isLoading && !error && actions.length > 0 && (
            <div className="d-flex flex-column gap-3" data-testid="actions-timeline-list">
              {actions.map((act) => {
                const typeStyle = ACTION_TYPE_STYLES[act.actionType] || ACTION_TYPE_STYLES.OTHER;
                return (
                  <div
                    key={act.id}
                    className="card border p-3 p-md-4 rounded-3 bg-white"
                    style={{
                      borderColor: "#EAECF0",
                      boxShadow: "0 1px 2px rgba(16, 24, 40, 0.04)",
                    }}
                    data-testid={`action-item-${act.id}`}
                  >
                    {/* Action Meta Bar */}
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2 pb-2 border-bottom" style={{ borderColor: "#F2F4F7" }}>
                      <div className="d-flex align-items-center flex-wrap gap-2">
                        {/* Type Badge */}
                        <span
                          className="badge px-2 py-1 fw-bold text-uppercase"
                          style={{
                            backgroundColor: typeStyle.bg,
                            color: typeStyle.color,
                            border: `1px solid ${typeStyle.border}`,
                            fontSize: "0.75rem",
                          }}
                        >
                          {act.actionType}
                        </span>

                        {/* Duration Badge */}
                        <span
                          className="badge bg-light text-dark border px-2 py-1 fw-medium"
                          style={{ fontSize: "0.75rem", borderColor: "#D0D5DD" }}
                        >
                          ⏱️ {formatDuration(act.timeSpentMinutes)}
                        </span>

                        <span className="text-muted small">•</span>

                        {/* Formatted Timestamp */}
                        <span className="text-secondary small fw-medium">
                          {formatTimestamp(act.performedAt || act.actionDateTime)}
                        </span>

                        <span className="text-muted small">•</span>

                        {/* Performer Name */}
                        <span className="text-dark small fw-semibold">
                          {act.performedBy?.fullName || "Staff Member"}
                        </span>
                      </div>

                      {/* Edit Button: strictly Staff/Admin and workable status */}
                      {canMutate && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary py-0 px-2 fw-medium"
                          style={{ fontSize: "0.8rem", borderRadius: "6px" }}
                          onClick={() => setEditingAction(act)}
                          data-testid="edit-action-btn"
                        >
                          Edit
                        </button>
                      )}
                    </div>

                    {/* Technical Description */}
                    <div className="text-dark mb-2" style={{ fontSize: "0.9rem", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                      {act.description}
                    </div>

                    {/* Result Callout */}
                    <div
                      className="p-2 px-3 rounded mb-2"
                      style={{
                        backgroundColor: "#F8F9FA",
                        borderLeft: "3px solid var(--zg-primary, #006B3C)",
                        fontSize: "0.85rem",
                      }}
                    >
                      <strong className="text-dark">Outcome:</strong>{" "}
                      <span className="text-secondary">{act.result}</span>
                    </div>

                    {/* Follow-up Note */}
                    {act.followUpRequired && (
                      <div
                        className="p-2 px-3 rounded mb-2 d-flex align-items-start gap-2"
                        style={{
                          backgroundColor: "#FEF6EE",
                          border: "1px solid #F9DBAF",
                          fontSize: "0.85rem",
                        }}
                      >
                        <span className="badge bg-warning text-dark flex-shrink-0" style={{ fontSize: "0.7rem" }}>
                          FOLLOW-UP REQUIRED
                        </span>
                        <span className="text-dark">{act.followUpNote || "Follow-up indicated."}</span>
                      </div>
                    )}

                    {/* Attachment Notes */}
                    {act.attachmentNotes && (
                      <div className="small text-muted fst-italic">
                        📎 <strong>Attachment Notes:</strong> {act.attachmentNotes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Log Action Modal */}
      {isStaffOrAdmin && isLogModalOpen && (
        <LogActionModal
          isOpen={isLogModalOpen}
          ticketId={ticketId}
          onClose={() => setIsLogModalOpen(false)}
          onSuccess={loadActions}
        />
      )}

      {/* Edit Action Modal */}
      {isStaffOrAdmin && editingAction !== null && (
        <EditActionModal
          isOpen={editingAction !== null}
          ticketId={ticketId}
          action={editingAction}
          onClose={() => setEditingAction(null)}
          onSuccess={loadActions}
        />
      )}
    </>
  );
};
